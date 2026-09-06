/**
 * The one way mail leaves this application.
 *
 * Ported from the reference project's `backend/src/notifications/smtp.ts`,
 * which is the shape a Medusa notification provider takes, with its transport
 * rules kept because each of them prevents a specific failure rather than
 * expressing a preference.
 *
 * **The transport refuses to be plaintext.** `requireTLS` makes STARTTLS a
 * condition rather than an attempt: without it, a server that does not offer
 * STARTTLS gets the credentials anyway, in the clear, and nothing anywhere
 * reports it. `rejectUnauthorized` and `minVersion` are the other two halves
 * of the same sentence. `tests/mail-submission-target.test.ts` asserts all
 * three, because a regression here is a credential on the wire and would pass
 * every other test in the suite.
 *
 * **The sender is separable from the provider.** `SmtpSender` takes a
 * transport factory, so a test drives the whole path — options, envelope,
 * error handling — without opening a socket, and the provider takes a sender,
 * so the Medusa-facing half is testable without a transport at all.
 */

import type { NotificationTypes } from "@medusajs/framework/types";
import { AbstractNotificationProviderService } from "@medusajs/framework/utils";
import nodemailer, { type Transporter } from "nodemailer";

/** The id this provider registers under. `src/config/notification.ts` uses it; nothing writes it twice. */
export const SMTP_NOTIFICATION_PROVIDER_ID = "lousydeal-smtp";

export interface SmtpOptions {
  readonly host: string;
  /** Submission, and only submission. See `config/runtime.ts` for why it is not a range. */
  readonly port: 587;
  /** Required when `host` is an IP address: certificate validation has nothing to match otherwise. */
  readonly tlsServername?: string;
  readonly username: string;
  readonly password: string;
  readonly fromName: string;
  readonly envelopeFrom: string;
}

export interface MailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

type TransportFactory = (options: SmtpSender["transportOptions"]) => Pick<Transporter, "sendMail">;

export class SmtpSender {
  readonly transportOptions;
  readonly #transport: Pick<Transporter, "sendMail">;
  readonly #fromName: string;
  readonly #envelopeFrom: string;

  constructor(options: SmtpOptions, transportFactory: TransportFactory = nodemailer.createTransport) {
    this.transportOptions = {
      host: options.host,
      port: options.port,
      // `secure: false` with `requireTLS: true` is STARTTLS on the submission
      // port, which is what 587 is for. `secure: true` would be implicit TLS
      // on 465 and would simply not connect here.
      secure: false,
      requireTLS: true,
      auth: { user: options.username, pass: options.password },
      tls: {
        rejectUnauthorized: true,
        minVersion: "TLSv1.2",
        ...(options.tlsServername ? { servername: options.tlsServername } : {}),
      },
    } as const;
    this.#transport = transportFactory(this.transportOptions);
    this.#fromName = options.fromName;
    this.#envelopeFrom = options.envelopeFrom;
  }

  /**
   * Sends one message.
   *
   * **The thrown error carries nothing from the original.** A transport
   * failure's message routinely quotes the server's response, which on an
   * authentication failure can include the username — and this error reaches a
   * subscriber that logs it. What a reader needs is that mail did not go; what
   * they must not get is a credential in a log line.
   */
  async send(message: MailMessage): Promise<{ id?: string }> {
    try {
      const result = await this.#transport.sendMail({
        from: { name: this.#fromName, address: this.#envelopeFrom },
        envelope: { from: this.#envelopeFrom, to: message.to },
        ...message,
      });
      return { id: typeof result.messageId === "string" ? result.messageId : undefined };
    } catch {
      throw new Error("Unable to send email notification");
    }
  }
}

export default class SmtpNotificationProvider extends AbstractNotificationProviderService {
  static identifier = SMTP_NOTIFICATION_PROVIDER_ID;
  readonly #sender: SmtpSender;

  constructor(_container: Record<string, unknown>, options: SmtpOptions, sender?: SmtpSender) {
    super();
    this.#sender = sender ?? new SmtpSender(options);
  }

  async send(notification: NotificationTypes.ProviderSendNotificationDTO): Promise<{ id?: string }> {
    // Refused rather than sent empty. A confirmation with no subject and no
    // body still arrives, still looks like it came from us, and still counts
    // as the § 55 confirmation having been attempted -- so an incomplete one
    // is worse than a failure that says so.
    if (notification.channel !== "email" || !notification.content) {
      throw new Error("SMTP notification requires email content");
    }
    if (typeof notification.content.subject !== "string" || notification.content.subject.length === 0) {
      throw new Error("SMTP notification requires a subject");
    }

    return await this.#sender.send({
      to: notification.to,
      subject: notification.content.subject,
      text: notification.content.text ?? "",
      html: notification.content.html ?? "",
    });
  }
}
