import { Column, Entity, PrimaryColumn } from "typeorm";

export type InquiryFields = {
  kind: "individual" | "company";
  name: string;
  company: string;
  destination: string;
  phone: string;
  notes: string;
};
export type InquiryLineInput = {
  productId: string;
  packageId: string | null;
  quantity: number | null;
  unit: "packages" | "kg" | "L" | null;
  requirements: string;
};
export type LineSnapshot = { name: string; description: string; package: string | null };
@Entity("customer_inquiries")
export class CustomerInquiry {
  @PrimaryColumn({ type: "varchar", length: 36 }) id!: string;
  @Column({ type: "varchar", length: 36 }) userId!: string;
  @Column({ type: "varchar", length: 36 }) creationKey!: string;
  @Column({ type: "varchar", length: 32, unique: true }) reference!: string;
  @Column({ type: "varchar", length: 24 }) status!: "draft" | "submitted";
  @Column({ type: "int" }) revision!: number;
  @Column({ type: "varchar", length: 2 }) lang!: "ar" | "en";
  @Column({ type: "json" }) fields!: InquiryFields;
  @Column({ type: "varchar", length: 254 }) contactEmail!: string;
  @Column({ type: "varchar", length: 36, nullable: true }) submissionKey!: string | null;
  @Column({ type: "int", nullable: true }) submittedRevision!: number | null;
  @Column({ type: "datetime", precision: 3 }) createdAt!: Date;
  @Column({ type: "datetime", precision: 3 }) updatedAt!: Date;
  @Column({ type: "datetime", precision: 3, nullable: true }) submittedAt!: Date | null;
}
@Entity("customer_inquiry_lines")
export class InquiryLine {
  @PrimaryColumn({ type: "varchar", length: 36 }) id!: string;
  @Column({ type: "varchar", length: 36 }) inquiryId!: string;
  @Column({ type: "int" }) position!: number;
  @Column({ type: "varchar", length: 64 }) productId!: string;
  @Column({ type: "varchar", length: 80, nullable: true }) packageId!: string | null;
  @Column({ type: "decimal", precision: 12, scale: 3, nullable: true }) quantity!: string | null;
  @Column({ type: "varchar", length: 12, nullable: true }) unit!: "packages" | "kg" | "L" | null;
  @Column({ type: "varchar", length: 1000 }) requirements!: string;
  @Column({ type: "json", nullable: true }) snapshot!: LineSnapshot | null;
}
@Entity("customer_inquiry_history")
export class InquiryHistory {
  @PrimaryColumn({ type: "varchar", length: 36 }) id!: string;
  @Column({ type: "varchar", length: 36 }) inquiryId!: string;
  @Column({ type: "varchar", length: 24 }) status!: "submitted";
  @Column({ type: "datetime", precision: 3 }) occurredAt!: Date;
}
@Entity("inquiry_notifications")
export class InquiryNotification {
  @PrimaryColumn({ type: "varchar", length: 36 }) id!: string;
  @Column({ type: "varchar", length: 36 }) inquiryId!: string;
  @Column({ type: "varchar", length: 12 }) audience!: "customer" | "company";
  @Column({ type: "varchar", length: 254 }) recipient!: string;
  @Column({ type: "varchar", length: 16 }) state!:
    | "pending"
    | "sending"
    | "captured"
    | "sent"
    | "failed";
  @Column({ type: "int" }) attempts!: number;
  @Column({ type: "datetime", precision: 3 }) nextAttemptAt!: Date;
}
export const inquiryEntities = [CustomerInquiry, InquiryLine, InquiryHistory, InquiryNotification];
