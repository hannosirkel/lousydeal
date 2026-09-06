/**
 * The Medusa-facing half of the mail provider: what it accepts, what it
 * refuses, and whether it is registered at all.
 *
 * The transport's own rules are `tests/mail-submission-target.test.ts`. This
 * is the seam between Medusa's notification module and `SmtpSender` — a
 * provider that accepted a notification with no subject would send a blank
 * message that still looks like it came from us, which is worse than a failure
 * that says so.
 */

import { join } from "node:path";

import type { ConfigModule } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { describe, expect, it, vi } from "vitest";

import { NOTIFICATION_PROVIDER_PATH, notificationModule } from "../src/config/notification";
import SmtpNotificationProvider, { SMTP_NOTIFICATION_PROVIDER_ID, SmtpSender, type SmtpOptions } from "../src/notifications/smtp";
import notificationProviderModule from "../src/notifications";

const OPTIONS: SmtpOptions = {
  host: "mail.example.test",
  port: 587,
  username: "mail-user",
  password: "mail-password",
  fromName: "Lousy Deal",
  envelopeFrom: "orders@example.test",
};

/** A provider whose sender records rather than sends. */
function provider() {
  const sent: unknown[] = [];
  const sender = new SmtpSender(OPTIONS, () => ({
    sendMail: async (message: unknown) => {
      sent.push(message);
      return { messageId: "<id@example.test>" } as never;
    },
  }));
  return { instance: new SmtpNotificationProvider({}, OPTIONS, sender), sent };
}

describe("the provider", () => {
  it("sends an email notification through to the transport", async () => {
    const { instance, sent } = provider();

    const result = await instance.send({
      to: "buyer@example.test",
      channel: "email",
      template: "order-confirmation",
      content: { subject: "Your order", text: "plain", html: "<p>plain</p>" },
    } as never);

    expect(sent).toHaveLength(1);
    expect(result.id).toBe("<id@example.test>");
  });

  it("refuses a notification with no subject rather than sending a blank one", async () => {
    // A confirmation with no subject still arrives, still looks like it came
    // from us, and still counts as the § 55 confirmation having been
    // attempted.
    const { instance, sent } = provider();

    await expect(
      instance.send({ to: "b@example.test", channel: "email", content: { text: "t", html: "<p>t</p>" } } as never),
    ).rejects.toThrow(/requires a subject/);
    await expect(
      instance.send({ to: "b@example.test", channel: "email", content: { subject: "", text: "t" } } as never),
    ).rejects.toThrow(/requires a subject/);
    expect(sent).toHaveLength(0);
  });

  it("refuses a channel it does not serve, and a notification with no content", async () => {
    const { instance, sent } = provider();

    await expect(
      instance.send({ to: "b@example.test", channel: "sms", content: { subject: "s" } } as never),
    ).rejects.toThrow(/requires email content/);
    await expect(instance.send({ to: "b@example.test", channel: "email" } as never)).rejects.toThrow(
      /requires email content/,
    );
    expect(sent).toHaveLength(0);
  });

  it("builds its own sender when none is injected, without opening anything", () => {
    // The production path. `nodemailer.createTransport` does not connect --
    // it builds a pool that connects on the first `sendMail` -- so this
    // exercises the constructor without a socket.
    const built = new SmtpNotificationProvider({}, OPTIONS);
    expect(built).toBeInstanceOf(SmtpNotificationProvider);
  });
});

describe("its registration", () => {
  it("registers under the id nothing else writes twice", () => {
    expect(SMTP_NOTIFICATION_PROVIDER_ID).toBe("lousydeal-smtp");
    expect(SmtpNotificationProvider.identifier).toBe(SMTP_NOTIFICATION_PROVIDER_ID);
  });

  it("is exported as a notification provider module for Medusa to load", () => {
    expect(notificationProviderModule.services).toContain(SmtpNotificationProvider);
  });

  it("takes the email channel, which is what Medusa routes on", () => {
    const wired = notificationModule({ ...OPTIONS });

    expect(wired?.resolve).toBe("@medusajs/medusa/notification");
    expect(wired?.options.providers[0]).toMatchObject({
      resolve: NOTIFICATION_PROVIDER_PATH,
      id: SMTP_NOTIFICATION_PROVIDER_ID,
    });
    expect(wired?.options.providers[0]?.options.channels).toEqual(["email"]);
  });

  /**
   * Loads `medusa-config.ts` under `environment`.
   *
   * `process.chdir` for the reason `medusa-config.test.ts` gives at its own
   * head: `defineConfig` resolves the local Lousy Deal module against
   * `process.cwd()`, which is `backend/` when Medusa runs and the repository
   * root when Vitest does.
   */
  async function loadConfig(environment: Record<string, string>): Promise<ConfigModule> {
    const cwd = process.cwd();
    const original = { ...process.env };
    try {
      for (const name of Object.keys(process.env)) delete process.env[name];
      Object.assign(process.env, environment);
      process.chdir(join(__dirname, ".."));
      vi.resetModules();
      const imported = (await import("../medusa-config.js")) as unknown as { default: ConfigModule };
      return imported.default;
    } finally {
      for (const name of Object.keys(process.env)) delete process.env[name];
      Object.assign(process.env, original);
      process.chdir(cwd);
      vi.resetModules();
    }
  }

  /** Everything the backend requires, with no mail. */
  const WITHOUT_MAIL: Record<string, string> = {
    JWT_SECRET: "j",
    COOKIE_SECRET: "c",
    DATABASE_HOST: "db",
    DATABASE_PORT: "5432",
    DATABASE_NAME: "n",
    DATABASE_USER: "u",
    DATABASE_PASSWORD: "p",
    REDIS_HOST: "r",
    REDIS_PORT: "6379",
    REDIS_PASSWORD: "rp",
    STRIPE_SECRET_KEY: "sk",
    STRIPE_WEBHOOK_SECRET: "wh",
  };

  it("reaches Medusa's assembled configuration when mail is configured", async () => {
    // **Without this, the whole row could be dead code.**
    // `medusa-config.test.ts` asserts exactly five customised modules, and it
    // passes either way because its environment sets no mail -- so nothing
    // else in this suite would notice the notification module never being
    // registered at all.
    const config = await loadConfig({
      ...WITHOUT_MAIL,
      SMTP_HOST: "mail.example.test",
      SMTP_PORT: "587",
      SMTP_USERNAME: "mail-user",
      SMTP_PASSWORD: "mail-password",
      SMTP_FROM_NAME: "Lousy Deal",
      SMTP_ENVELOPE_FROM: "orders@example.test",
    });

    const registered = config.modules?.[Modules.NOTIFICATION];
    expect(registered).toEqual(
      notificationModule({
        host: "mail.example.test",
        port: 587,
        username: "mail-user",
        password: "mail-password",
        fromName: "Lousy Deal",
        envelopeFrom: "orders@example.test",
      }),
    );
  });

  it("leaves Medusa's own default in place when mail is not configured", async () => {
    // Not "absent": `defineConfig` merges Medusa's defaults, so the key is
    // there either way. What must not be there is *this* provider.
    const config = await loadConfig(WITHOUT_MAIL);
    const registered = JSON.stringify(config.modules?.[Modules.NOTIFICATION] ?? {});

    expect(registered).not.toContain(SMTP_NOTIFICATION_PROVIDER_ID);
    expect(registered).not.toContain(NOTIFICATION_PROVIDER_PATH);
  });

  it("is not registered at all where a deployment has no mail configured", async () => {
    // The whole reason `smtp` is nullable. A module registered with no
    // credentials would fail on the first send rather than at boot, and it
    // would fail for every order rather than once.
    expect(notificationModule(null)).toBeNull();

    const original = { ...process.env };
    try {
      for (const name of Object.keys(process.env)) delete process.env[name];
      Object.assign(process.env, {
        JWT_SECRET: "j",
        COOKIE_SECRET: "c",
        DATABASE_HOST: "db",
        DATABASE_PORT: "5432",
        DATABASE_NAME: "n",
        DATABASE_USER: "u",
        DATABASE_PASSWORD: "p",
        REDIS_HOST: "r",
        REDIS_PORT: "6379",
        REDIS_PASSWORD: "rp",
        STRIPE_SECRET_KEY: "sk",
        STRIPE_WEBHOOK_SECRET: "wh",
      });
      vi.resetModules();

      // `medusa-config.ts` filters the null out rather than carrying a hole,
      // so an unconfigured deployment assembles a config Medusa can load.
      // `.js`, because a dynamic import is an ECMAScript import and this
      // workspace is `moduleResolution: node16` -- the same spelling
      // `medusa-config.test.ts` uses for the same reason.
      const { readBackendRuntimeConfig } = await import("../src/config/runtime.js");
      expect(readBackendRuntimeConfig(process.env).smtp).toBeNull();
      expect(notificationModule(readBackendRuntimeConfig(process.env).smtp)).toBeNull();
    } finally {
      for (const name of Object.keys(process.env)) delete process.env[name];
      Object.assign(process.env, original);
      vi.resetModules();
    }
  });
});
