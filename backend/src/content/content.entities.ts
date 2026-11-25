import { Column, Entity, PrimaryColumn } from "typeorm";
export const contentKinds = ["products", "categories", "uses", "recipes", "pages"] as const;
export type ContentKind = (typeof contentKinds)[number];
export type ContentBody = Record<string, any>;
@Entity("content_documents")
export class ContentDocument {
  @PrimaryColumn({ type: "varchar", length: 100 }) key!: string;
  @Column({ type: "varchar", length: 16 }) kind!: ContentKind;
  @Column({ type: "varchar", length: 64 }) id!: string;
  @Column({ type: "varchar", length: 64 }) slug!: string;
  @Column({ type: "int" }) version!: number;
  @Column({ type: "varchar", length: 36 }) draftId!: string;
  @Column({ type: "varchar", length: 36, nullable: true }) publishedId!: string | null;
  @Column({ type: "varchar", length: 36, nullable: true }) reviewId!: string | null;
  @Column({ type: "varchar", length: 36, nullable: true }) approvedBy!: string | null;
  @Column({ type: "varchar", length: 24 }) approvalScope!: "development" | "approved";
  @Column({ type: "boolean" }) archived!: boolean;
  @Column({ type: "datetime", precision: 3 }) updatedAt!: Date;
}
@Entity("content_revisions")
export class ContentRevision {
  @PrimaryColumn({ type: "varchar", length: 36 }) id!: string;
  @Column({ type: "varchar", length: 100 }) documentKey!: string;
  @Column({ type: "int" }) number!: number;
  @Column({ type: "json" }) body!: ContentBody;
  @Column({ type: "varchar", length: 36, nullable: true }) actorId!: string | null;
  @Column({ type: "datetime", precision: 3 }) createdAt!: Date;
}
@Entity("content_media")
export class ContentMedia {
  @PrimaryColumn({ type: "varchar", length: 80 }) id!: string;
  @Column({ type: "varchar", length: 255 }) url!: string;
  @Column({ type: "varchar", length: 80, nullable: true }) filename!: string | null;
  @Column({ type: "varchar", length: 12 }) source!: "original" | "upload";
  @Column({ type: "varchar", length: 300 }) altAr!: string;
  @Column({ type: "varchar", length: 300 }) altEn!: string;
  @Column({ type: "int" }) version!: number;
  @Column({ type: "boolean" }) archived!: boolean;
  @Column({ type: "datetime", precision: 3 }) createdAt!: Date;
}
@Entity("content_media_usage")
export class ContentMediaUsage {
  @PrimaryColumn({ type: "varchar", length: 80 }) mediaId!: string;
  @PrimaryColumn({ type: "varchar", length: 36 }) revisionId!: string;
  @Column({ type: "varchar", length: 100 }) documentKey!: string;
}
@Entity("staff_editorial_events")
export class EditorialEvent {
  @PrimaryColumn({ type: "varchar", length: 36 }) id!: string;
  @Column({ type: "varchar", length: 36 }) actorId!: string;
  @Column({ type: "varchar", length: 24 }) actorRole!: string;
  @Column({ type: "varchar", length: 36 }) requestKey!: string;
  @Column({ type: "varchar", length: 64 }) fingerprint!: string;
  @Column({ type: "varchar", length: 100 }) target!: string;
  @Column({ type: "varchar", length: 24 }) action!: string;
  @Column({ type: "int" }) version!: number;
  @Column({ type: "varchar", length: 36, nullable: true }) revisionId!: string | null;
  @Column({ type: "datetime", precision: 3 }) createdAt!: Date;
}
@Entity("content_write_lock")
export class ContentWriteLock {
  @PrimaryColumn({ type: "int" }) id!: number;
}
export const contentEntities = [
  ContentDocument,
  ContentRevision,
  ContentMedia,
  ContentMediaUsage,
  EditorialEvent,
  ContentWriteLock,
];
