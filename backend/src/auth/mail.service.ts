import { Inject, Injectable } from "@nestjs/common";
import nodemailer from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { AUTH_CONFIG, safeReturnPath, type AuthConfig } from "./auth.config.js";

@Injectable()
export class MailService {
  constructor(@Inject(AUTH_CONFIG) private readonly config: AuthConfig) {}
  async send(
    to: string,
    purpose: "verify" | "reset",
    token: string,
    lang = "ar",
    returnTo?: string,
  ) {
    const link = new URL(
      purpose === "verify" ? "/verify-email" : "/reset-password",
      this.config.appUrl,
    );
    link.searchParams.set("lang", lang === "en" ? "en" : "ar");
    link.searchParams.set("returnTo", safeReturnPath(returnTo));
    link.hash = new URLSearchParams({ token }).toString();
    const ar = lang !== "en";
    const subject =
      purpose === "verify"
        ? ar
          ? "VOIC: تأكيد البريد الإلكتروني"
          : "VOIC: verify your email"
        : ar
          ? "VOIC: استعادة كلمة المرور"
          : "VOIC: reset your password";
    const message = {
      from: this.config.from,
      to,
      subject,
      text: `${subject}\n${link.href}\n${ar ? "إذا لم تطلب هذه الرسالة فتجاهلها." : "If you did not request this message, ignore it."}`,
    };
    try {
      if (this.config.mode === "capture") {
        const result = await nodemailer.createTransport({ jsonTransport: true }).sendMail(message);
        await mkdir(this.config.captureDir, { recursive: true });
        await writeFile(`${this.config.captureDir}/${randomUUID()}.json`, result.message, {
          mode: 0o600,
          flag: "wx",
        });
      } else {
        const transport = nodemailer.createTransport({
          host: this.config.smtpHost,
          port: this.config.smtpPort,
          secure: this.config.smtpSecure,
          requireTLS: !this.config.smtpSecure,
          auth: this.config.smtpUser
            ? { user: this.config.smtpUser, pass: this.config.smtpPassword }
            : undefined,
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 10000,
          logger: false,
          debug: false,
        });
        try {
          await transport.sendMail(message);
        } finally {
          transport.close();
        }
      }
    } catch {
      // Delivery failures do not disclose account existence or tokens. Resend remains available.
      process.stderr.write('{"event":"auth_mail_failed"}\n');
    }
  }
}
