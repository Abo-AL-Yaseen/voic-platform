import {
  Inject,
  Injectable,
  type BeforeApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import { type DataSource, In, LessThanOrEqual } from "typeorm";
import { DATABASE_SOURCE } from "../database/database.service.js";
import { MailService } from "../auth/mail.service.js";
import { AUTH_CONFIG, type AuthConfig } from "../auth/auth.config.js";
import { CustomerInquiry, InquiryLine, InquiryNotification } from "./inquiry.entities.js";

@Injectable()
export class InquiryNotifications implements OnModuleInit, BeforeApplicationShutdown {
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private stopping = false;
  constructor(
    @Inject(DATABASE_SOURCE) private readonly source: DataSource,
    private readonly mail: MailService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick();
    }, 10000);
    this.timer.unref();
  }
  async beforeApplicationShutdown() {
    this.stopping = true;
    clearInterval(this.timer);
    await this.running;
  }
  // One bounded batch per tick; database claims allow multiple API processes safely.
  tick(): Promise<void> {
    if (this.stopping || !this.source.isInitialized) return Promise.resolve();
    if (this.running) return this.running;
    this.running = this.batch()
      .catch(() => {
        /* No SQL, message or recipient logging. */
      })
      .finally(() => {
        this.running = undefined;
      });
    return this.running;
  }
  private async batch() {
    for (let count = 0; count < 4 && !this.stopping; count++) {
      const job = await this.source.transaction(async (m) => {
        const n = await m.getRepository(InquiryNotification).findOne({
          where: { state: In(["pending", "sending"]), nextAttemptAt: LessThanOrEqual(new Date()) },
          order: { nextAttemptAt: "ASC", id: "ASC" },
          lock: { mode: "pessimistic_write", onLocked: "skip_locked" },
        });
        if (!n) return null;
        if (n.attempts >= 5) {
          n.state = "failed";
          await m.save(n);
          return null;
        }
        n.state = "sending";
        n.attempts++;
        n.nextAttemptAt = new Date(Date.now() + 10 * 60_000);
        await m.save(n);
        return n;
      });
      if (!job) break;
      try {
        const i = await this.source
          .getRepository(CustomerInquiry)
          .findOneByOrFail({ id: job.inquiryId });
        const lines = await this.source
          .getRepository(InquiryLine)
          .find({ where: { inquiryId: i.id }, order: { position: "ASC" } });
        const ar = i.lang === "ar",
          link = new URL(`/account/inquiries/${i.id}`, this.config.appUrl);
        link.searchParams.set("lang", i.lang);
        const subject = ar
          ? `VOIC: استفسار توريد ${i.reference}`
          : `VOIC: supply inquiry ${i.reference}`;
        const text = [
          subject,
          ar
            ? "حُفظ استفسارك للمراجعة. هذا ليس طلب شراء مقبولًا."
            : "Your inquiry is saved for review. This is not an accepted order.",
          `${i.fields.name}\n${i.fields.company}\n${i.fields.destination}\n${i.fields.phone}\n${i.fields.notes}`,
          ...lines.map(
            (l) =>
              `${l.snapshot?.name}\n${l.snapshot?.package || (ar ? "مناقشة التعبئة مع المبيعات" : "Discuss packaging with sales")}\n${l.quantity ?? ""} ${l.unit === "packages" ? (ar ? "عبوة" : "packages") : l.unit === "kg" ? (ar ? "كيلوغرام" : "kg") : l.unit === "L" ? (ar ? "لتر" : "L") : ""}\n${l.requirements}`,
          ),
          link.href,
        ].join("\n\n");
        const state = await this.mail.deliver({
          to: job.recipient,
          subject,
          text,
          messageId: `<inquiry-${job.id}@voic.local>`,
        });
        await this.source
          .getRepository(InquiryNotification)
          .update({ id: job.id, state: "sending", attempts: job.attempts }, { state });
      } catch {
        await this.source.getRepository(InquiryNotification).update(
          { id: job.id, state: "sending", attempts: job.attempts },
          {
            state: job.attempts >= 5 ? "failed" : "pending",
            nextAttemptAt: new Date(Date.now() + Math.min(3600, 30 * 2 ** job.attempts) * 1000),
          },
        );
      }
    }
  }
}
