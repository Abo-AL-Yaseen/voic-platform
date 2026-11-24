import type { MigrationInterface, QueryRunner } from "typeorm";
export class StaffInquiryWorkflow1795525200000 implements MigrationInterface {
  transaction = false;
  async up(q: QueryRunner) {
    await q.query(
      `ALTER TABLE customer_inquiry_history DROP INDEX inquiry_initial_event, ADD INDEX inquiry_history_date(inquiryId,occurredAt,id)`,
    );
    await q.query(
      `ALTER TABLE inquiry_notifications ADD eventId varchar(36) NOT NULL DEFAULT 'submission', ADD kind varchar(24) NOT NULL DEFAULT 'submission', DROP INDEX inquiry_audience, ADD UNIQUE KEY inquiry_event_audience(inquiryId,eventId,audience)`,
    );
    await q.query(`CREATE TABLE inquiry_actions (
      id varchar(36) NOT NULL PRIMARY KEY,inquiryId varchar(36) NOT NULL,actorId varchar(36) NOT NULL,
      \`key\` varchar(36) NOT NULL,fingerprint varchar(64) NOT NULL,type varchar(16) NOT NULL,revision int NOT NULL,createdAt datetime(3) NOT NULL,
      UNIQUE KEY inquiry_actor_key(actorId,\`key\`),KEY inquiry_action_parent(inquiryId),
      CONSTRAINT action_inquiry FOREIGN KEY(inquiryId) REFERENCES customer_inquiries(id) ON DELETE RESTRICT,
      CONSTRAINT action_actor FOREIGN KEY(actorId) REFERENCES auth_users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    for (const [table, extra] of [
      ["inquiry_messages", "sender varchar(12) NOT NULL,"],
      ["inquiry_internal_notes", ""],
    ])
      await q.query(`CREATE TABLE ${table} (
        id varchar(36) NOT NULL PRIMARY KEY,inquiryId varchar(36) NOT NULL,actionId varchar(36) NOT NULL,
        ${extra} text text NOT NULL,createdAt datetime(3) NOT NULL,
        UNIQUE KEY action_once(actionId),KEY parent_date(inquiryId,createdAt,id),
        FOREIGN KEY(inquiryId) REFERENCES customer_inquiries(id) ON DELETE RESTRICT,
        FOREIGN KEY(actionId) REFERENCES inquiry_actions(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await q.query(`CREATE TABLE inquiry_audit_events (
      id varchar(36) NOT NULL PRIMARY KEY,inquiryId varchar(36) NOT NULL,actionId varchar(36) NOT NULL,
      actorId varchar(36) NOT NULL,actorRole varchar(24) NOT NULL,action varchar(24) NOT NULL,metadata json NOT NULL,createdAt datetime(3) NOT NULL,
      UNIQUE KEY audit_action(actionId),KEY audit_parent(inquiryId,createdAt,id),
      FOREIGN KEY(inquiryId) REFERENCES customer_inquiries(id) ON DELETE RESTRICT,
      FOREIGN KEY(actionId) REFERENCES inquiry_actions(id) ON DELETE RESTRICT,
      FOREIGN KEY(actorId) REFERENCES auth_users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  async down(q: QueryRunner) {
    // Refuse to discard real workflow history. This rollback is only safe before any action.
    const [row] = await q.query("SELECT COUNT(*) n FROM inquiry_actions");
    if (Number(row.n)) throw new Error("Workflow history exists; rollback is not safe");
    for (const table of [
      "inquiry_audit_events",
      "inquiry_internal_notes",
      "inquiry_messages",
      "inquiry_actions",
    ])
      await q.query(`DROP TABLE ${table}`);
    await q.query(
      `ALTER TABLE inquiry_notifications DROP INDEX inquiry_event_audience, DROP COLUMN eventId, DROP COLUMN kind, ADD UNIQUE KEY inquiry_audience(inquiryId,audience)`,
    );
    await q.query(
      `ALTER TABLE customer_inquiry_history DROP INDEX inquiry_history_date, ADD UNIQUE KEY inquiry_initial_event(inquiryId,status)`,
    );
  }
}
