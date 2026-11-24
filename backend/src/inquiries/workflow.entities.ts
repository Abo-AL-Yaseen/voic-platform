import { Column, Entity, PrimaryColumn } from "typeorm";
export const submittedStatuses = [
  "submitted",
  "under_review",
  "awaiting_customer",
  "responded",
  "closed",
  "cancelled",
] as const;
export type SubmittedStatus = (typeof submittedStatuses)[number];
export type InquiryStatus = "draft" | SubmittedStatus;
@Entity("inquiry_actions")
export class InquiryAction {
  @PrimaryColumn({ type: "varchar", length: 36 }) id!: string;
  @Column({ type: "varchar", length: 36 }) inquiryId!: string;
  @Column({ type: "varchar", length: 36 }) actorId!: string;
  @Column({ type: "varchar", length: 36 }) key!: string;
  @Column({ type: "varchar", length: 64 }) fingerprint!: string;
  @Column({ type: "varchar", length: 16 }) type!: "status" | "message" | "note" | "reply";
  @Column({ type: "int" }) revision!: number;
  @Column({ type: "datetime", precision: 3 }) createdAt!: Date;
}
@Entity("inquiry_messages")
export class InquiryMessage {
  @PrimaryColumn({ type: "varchar", length: 36 }) id!: string;
  @Column({ type: "varchar", length: 36 }) inquiryId!: string;
  @Column({ type: "varchar", length: 36 }) actionId!: string;
  @Column({ type: "varchar", length: 12 }) sender!: "customer" | "staff";
  @Column({ type: "text" }) text!: string;
  @Column({ type: "datetime", precision: 3 }) createdAt!: Date;
}
@Entity("inquiry_internal_notes")
export class InquiryInternalNote {
  @PrimaryColumn({ type: "varchar", length: 36 }) id!: string;
  @Column({ type: "varchar", length: 36 }) inquiryId!: string;
  @Column({ type: "varchar", length: 36 }) actionId!: string;
  @Column({ type: "text" }) text!: string;
  @Column({ type: "datetime", precision: 3 }) createdAt!: Date;
}
@Entity("inquiry_audit_events")
export class InquiryAudit {
  @PrimaryColumn({ type: "varchar", length: 36 }) id!: string;
  @Column({ type: "varchar", length: 36 }) inquiryId!: string;
  @Column({ type: "varchar", length: 36 }) actionId!: string;
  @Column({ type: "varchar", length: 36 }) actorId!: string;
  @Column({ type: "varchar", length: 24 }) actorRole!: string;
  @Column({ type: "varchar", length: 24 }) action!: string;
  @Column({ type: "json" }) metadata!: { from: InquiryStatus; to: InquiryStatus; revision: number };
  @Column({ type: "datetime", precision: 3 }) createdAt!: Date;
}
export const workflowEntities = [InquiryAction, InquiryMessage, InquiryInternalNote, InquiryAudit];
