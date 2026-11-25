import type { MigrationInterface, QueryRunner } from "typeorm";
export class ContentWorkspace1795532400000 implements MigrationInterface {
  transaction = false;
  async up(q: QueryRunner) {
    await q.query(
      `CREATE TABLE content_write_lock (id int PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    await q.query(`INSERT INTO content_write_lock VALUES (1)`);
    await q.query(`CREATE TABLE content_documents (
   \`key\` varchar(100) PRIMARY KEY,kind varchar(16) NOT NULL,id varchar(64) NOT NULL,slug varchar(64) NOT NULL,
   version int NOT NULL,draftId varchar(36) NOT NULL,publishedId varchar(36) NULL,reviewId varchar(36) NULL,
   approvedBy varchar(36) NULL,approvalScope varchar(24) NOT NULL,archived boolean NOT NULL,updatedAt datetime(3) NOT NULL,
   UNIQUE KEY content_kind_id(kind,id),UNIQUE KEY content_kind_slug(kind,slug),KEY content_list(kind,updatedAt,\`key\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await q.query(`CREATE TABLE content_revisions (
   id varchar(36) PRIMARY KEY,documentKey varchar(100) NOT NULL,number int NOT NULL,body json NOT NULL,
   actorId varchar(36) NULL,createdAt datetime(3) NOT NULL,UNIQUE KEY document_revision(documentKey,number),
   FOREIGN KEY(documentKey) REFERENCES content_documents(\`key\`) ON DELETE RESTRICT,
   FOREIGN KEY(actorId) REFERENCES auth_users(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await q.query(`CREATE TABLE content_media (
   id varchar(80) PRIMARY KEY,url varchar(255) NOT NULL,filename varchar(80) NULL,source varchar(12) NOT NULL,
   altAr varchar(300) NOT NULL,altEn varchar(300) NOT NULL,version int NOT NULL,archived boolean NOT NULL,createdAt datetime(3) NOT NULL,
   UNIQUE KEY media_url(url),UNIQUE KEY media_filename(filename)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await q.query(`CREATE TABLE content_media_usage (
   mediaId varchar(80) NOT NULL,revisionId varchar(36) NOT NULL,documentKey varchar(100) NOT NULL,
   PRIMARY KEY(mediaId,revisionId),FOREIGN KEY(mediaId) REFERENCES content_media(id) ON DELETE RESTRICT,
   FOREIGN KEY(revisionId) REFERENCES content_revisions(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await q.query(`CREATE TABLE staff_editorial_events (
   id varchar(36) PRIMARY KEY,actorId varchar(36) NOT NULL,actorRole varchar(24) NOT NULL,requestKey varchar(36) NOT NULL,
   fingerprint varchar(64) NOT NULL,target varchar(100) NOT NULL,action varchar(24) NOT NULL,version int NOT NULL,
   revisionId varchar(36) NULL,createdAt datetime(3) NOT NULL,UNIQUE KEY editorial_receipt(actorId,requestKey),
   FOREIGN KEY(actorId) REFERENCES auth_users(id) ON DELETE RESTRICT,KEY editorial_target(target,createdAt,id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  async down(q: QueryRunner) {
    for (const t of ["content_documents", "content_media", "staff_editorial_events"]) {
      const [r] = await q.query(`SELECT COUNT(*) n FROM ${t}`);
      if (Number(r.n)) throw new Error("Content exists; use reviewed forward recovery");
    }
    for (const t of [
      "content_media_usage",
      "staff_editorial_events",
      "content_revisions",
      "content_documents",
      "content_media",
      "content_write_lock",
    ])
      await q.query(`DROP TABLE ${t}`);
  }
}
