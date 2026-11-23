import type { MigrationInterface, QueryRunner } from "typeorm";
export class CustomerInquiries1795521600000 implements MigrationInterface {
  transaction = false;
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE customer_inquiries (
      id varchar(36) NOT NULL PRIMARY KEY, userId varchar(36) NOT NULL, creationKey varchar(36) NOT NULL,
      reference varchar(32) NOT NULL, status varchar(24) NOT NULL, revision int NOT NULL,
      lang varchar(2) NOT NULL, fields json NOT NULL, contactEmail varchar(254) NOT NULL,
      submissionKey varchar(36) NULL, submittedRevision int NULL,
      createdAt datetime(3) NOT NULL, updatedAt datetime(3) NOT NULL, submittedAt datetime(3) NULL,
      UNIQUE KEY inquiry_reference(reference), UNIQUE KEY inquiry_creation(userId, creationKey),
      UNIQUE KEY inquiry_submission(userId, submissionKey), KEY inquiry_owner_date(userId, createdAt, id),
      CONSTRAINT inquiry_owner FOREIGN KEY(userId) REFERENCES auth_users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await q.query(`CREATE TABLE customer_inquiry_lines (
      id varchar(36) NOT NULL PRIMARY KEY, inquiryId varchar(36) NOT NULL, position int NOT NULL,
      productId varchar(64) NOT NULL, packageId varchar(80) NULL, quantity decimal(12,3) NULL,
      unit varchar(12) NULL, requirements varchar(1000) NOT NULL, snapshot json NULL,
      UNIQUE KEY inquiry_position(inquiryId, position),
      CONSTRAINT inquiry_line_parent FOREIGN KEY(inquiryId) REFERENCES customer_inquiries(id) ON DELETE CASCADE,
      CONSTRAINT inquiry_line_product FOREIGN KEY(productId) REFERENCES catalog_products(id) ON DELETE RESTRICT,
      CONSTRAINT inquiry_line_package FOREIGN KEY(packageId) REFERENCES catalog_packages(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await q.query(`CREATE TABLE customer_inquiry_history (
      id varchar(36) NOT NULL PRIMARY KEY, inquiryId varchar(36) NOT NULL, status varchar(24) NOT NULL,
      occurredAt datetime(3) NOT NULL, UNIQUE KEY inquiry_initial_event(inquiryId, status),
      CONSTRAINT inquiry_history_parent FOREIGN KEY(inquiryId) REFERENCES customer_inquiries(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await q.query(`CREATE TABLE inquiry_notifications (
      id varchar(36) NOT NULL PRIMARY KEY, inquiryId varchar(36) NOT NULL, audience varchar(12) NOT NULL,
      recipient varchar(254) NOT NULL, state varchar(16) NOT NULL, attempts int NOT NULL,
      nextAttemptAt datetime(3) NOT NULL, UNIQUE KEY inquiry_audience(inquiryId, audience),
      KEY notification_due(state, nextAttemptAt),
      CONSTRAINT notification_parent FOREIGN KEY(inquiryId) REFERENCES customer_inquiries(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  async down(q: QueryRunner) {
    for (const table of [
      "inquiry_notifications",
      "customer_inquiry_history",
      "customer_inquiry_lines",
      "customer_inquiries",
    ])
      await q.query(`DROP TABLE ${table}`);
  }
}
