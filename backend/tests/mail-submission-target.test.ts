/**
 * Where mail goes and how it gets there.
 *
 * **This file is not decoration.** Every assertion in it guards a regression
 * whose symptom is a credential on the wire, or a message sent somewhere it
 * was not meant to go — and every one of them would pass every other test in
 * this suite. A transport that silently stopped requiring STARTTLS still
 * sends mail, still returns a message id, and still satisfies a subscriber.
 *
 * Nothing here opens a socket. `SmtpSender` takes a transport factory for
 * exactly this reason, so the options it builds are inspected rather than
 * inferred from a connection that would have to exist.
 */

import { describe, expect, it } from "vitest";

import { ConfigError } from "../src/config/env";
import { SMTP_ENVIRONMENT_VARIABLES, readSmtpRuntimeConfig } from "../src/config/runtime";
import { SmtpSender, type SmtpOptions } from "../src/notifications/smtp";

const OPTIONS: SmtpOptions = {
  host: "mail.example.test",
  port: 587,
  username: "mail-user",
  password: "mail-password",
  fromName: "Lousy Deal",
  envelopeFrom: "orders@example.test",
};

/** A complete environment. No value here guards anything anywhere. */
const CONFIGURED: Record<string, string> = {
  SMTP_HOST: "mail.example.test",
  SMTP_PORT: "587",
  SMTP_USERNAME: "mail-user",
  SMTP_PASSWORD: "mail-password",
  SMTP_FROM_NAME: "Lousy Deal",
  SMTP_ENVELOPE_FROM: "orders@example.test",
};

/** Records what was handed to `sendMail`, and answers as a transport would. */
function recordingSender(options: SmtpOptions = OPTIONS) {
  const sent: Record<string, unknown>[] = [];
  const sender = new SmtpSender(options, () => ({
    sendMail: async (message: Record<string, unknown>) => {
      sent.push(message);
      return { messageId: "<sent@example.test>" } as never;
    },
  }));
  return { sender, sent };
}

describe("the transport", () => {
  const { sender } = recordingSender();

  it("requires STARTTLS rather than attempting it", () => {
    // Without `requireTLS`, a server that does not offer STARTTLS is handed
    // the credentials anyway, in the clear, and nothing reports it.
    expect(sender.transportOptions.requireTLS).toBe(true);
    // `secure: false` with `requireTLS` is STARTTLS on the submission port.
    // `secure: true` is implicit TLS on 465 and would simply not connect.
    expect(sender.transportOptions.secure).toBe(false);
    expect(sender.transportOptions.port).toBe(587);
  });

  it("validates the certificate, and will not speak an obsolete protocol", () => {
    expect(sender.transportOptions.tls.rejectUnauthorized).toBe(true);
    expect(sender.transportOptions.tls.minVersion).toBe("TLSv1.2");
  });

  it("carries a TLS servername only when one was configured", () => {
    expect("servername" in sender.transportOptions.tls).toBe(false);

    const named = new SmtpSender({ ...OPTIONS, host: "192.0.2.25", tlsServername: "mail.example.test" }, () => ({
      sendMail: async () => ({}) as never,
    }));
    expect(named.transportOptions.tls.servername).toBe("mail.example.test");
  });

  it("sends to one recipient with an explicit envelope, not to whatever a header says", () => {
    // The envelope is what a server routes on. Leaving it to be derived from
    // the headers is how a `to:` a caller did not control becomes a delivery.
    const { sender: recorder, sent } = recordingSender();

    return recorder
      .send({ to: "buyer@example.test", subject: "s", text: "t", html: "<p>t</p>" })
      .then((result) => {
        expect(sent).toHaveLength(1);
        expect(sent[0]?.envelope).toEqual({ from: "orders@example.test", to: "buyer@example.test" });
        expect(sent[0]?.from).toEqual({ name: "Lousy Deal", address: "orders@example.test" });
        expect(result.id).toBe("<sent@example.test>");
      });
  });

  it("says mail did not go without repeating what the server said", () => {
    // A transport failure's message routinely quotes the server's response,
    // which on an authentication failure can include the username -- and this
    // error reaches a subscriber that logs it.
    const failing = new SmtpSender(OPTIONS, () => ({
      sendMail: async () => {
        throw new Error("535 5.7.8 Authentication failed for mail-user");
      },
    }));

    return expect(
      failing.send({ to: "b@example.test", subject: "s", text: "t", html: "<p>t</p>" }),
    ).rejects.toThrow(/^Unable to send email notification$/);
  });

  it("does not put the password anywhere but the auth block", () => {
    // Asserted rather than assumed: the options object is logged by nodemailer
    // under debug, and a password copied into `tls` or a header would travel
    // with it.
    const serialised = JSON.stringify({ ...sender.transportOptions, auth: undefined });
    expect(serialised).not.toContain("mail-password");
    expect(sender.transportOptions.auth).toEqual({ user: "mail-user", pass: "mail-password" });
  });
});

describe("reading the mail configuration", () => {
  it("answers null when nothing is set, so a deployment without mail still boots", () => {
    // C10 and C11 are the rows that give both environments something to send
    // through. A required `SMTP_HOST` here would take two running deployments
    // down for the length of three pull requests.
    expect(readSmtpRuntimeConfig({})).toBeNull();
  });

  it("refuses a half-configured deployment, and names what is missing", () => {
    // The realistic mistake, and the one that must not be mistaken for "no
    // mail configured" -- that reading would swallow it exactly where it costs
    // a buyer their § 55 confirmation.
    for (const omitted of SMTP_ENVIRONMENT_VARIABLES) {
      const partial = { ...CONFIGURED };
      delete partial[omitted];

      expect(() => readSmtpRuntimeConfig(partial), omitted).toThrow(ConfigError);
      expect(() => readSmtpRuntimeConfig(partial), omitted).toThrow(new RegExp(omitted));
    }
  });

  it("takes port 587 and nothing else", () => {
    // 25 is relay and 465 is implicit TLS, which `secure: false` +
    // `requireTLS: true` cannot speak. Either would connect and then behave
    // differently from what `smtp.ts` documents.
    expect(readSmtpRuntimeConfig(CONFIGURED)?.port).toBe(587);
    for (const port of ["25", "465", "2525", "587 ", "0"]) {
      const wrong = { ...CONFIGURED, SMTP_PORT: port };
      if (port.trim() === "587") continue;
      expect(() => readSmtpRuntimeConfig(wrong), port).toThrow(/exactly 587/);
    }
  });

  it("requires a TLS servername when the host is an IP address", () => {
    // `rejectUnauthorized: true` has nothing to match a certificate against
    // otherwise -- and the next reader would turn it off to make it work.
    expect(() => readSmtpRuntimeConfig({ ...CONFIGURED, SMTP_HOST: "192.0.2.25" })).toThrow(/SMTP_TLS_SERVERNAME/);
    expect(() => readSmtpRuntimeConfig({ ...CONFIGURED, SMTP_HOST: "2001:db8::25" })).toThrow(/SMTP_TLS_SERVERNAME/);

    const byIp = readSmtpRuntimeConfig({
      ...CONFIGURED,
      SMTP_HOST: "192.0.2.25",
      SMTP_TLS_SERVERNAME: "mail.example.test",
    });
    expect(byIp?.tlsServername).toBe("mail.example.test");
  });

  it("reads every value from the environment rather than defaulting any of them", () => {
    // Loading under a second environment sharing no value with the first is
    // what separates "read from the environment" from "a literal that happens
    // to match" -- the same instrument `medusa-config.test.ts` uses.
    const other = {
      SMTP_HOST: "mail.elsewhere.test",
      SMTP_PORT: "587",
      SMTP_USERNAME: "other-user",
      SMTP_PASSWORD: "other-password",
      SMTP_FROM_NAME: "Other Name",
      SMTP_ENVELOPE_FROM: "other@elsewhere.test",
    };

    expect(readSmtpRuntimeConfig(CONFIGURED)).toEqual({
      host: "mail.example.test",
      port: 587,
      username: "mail-user",
      password: "mail-password",
      fromName: "Lousy Deal",
      envelopeFrom: "orders@example.test",
    });
    expect(readSmtpRuntimeConfig(other)).toEqual({
      host: "mail.elsewhere.test",
      port: 587,
      username: "other-user",
      password: "other-password",
      fromName: "Other Name",
      envelopeFrom: "other@elsewhere.test",
    });
  });
});
