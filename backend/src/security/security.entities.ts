import { Column, Entity, PrimaryColumn } from "typeorm";
@Entity("staff_mfa_factors")
export class StaffFactor {
  @PrimaryColumn({ type: "varchar", length: 36 }) userId!: string;
  @Column({ type: "text", nullable: true, select: false }) secret!: string | null;
  @Column({ type: "datetime", nullable: true }) confirmedAt!: Date | null;
  @Column({ type: "bigint", nullable: true }) lastStep!: string | null;
  @Column({ type: "text", nullable: true, select: false }) pending!: string | null;
  @Column({ type: "varchar", length: 64, nullable: true, select: false }) pendingSession!:
    | string
    | null;
  @Column({ type: "datetime", nullable: true }) pendingUntil!: Date | null;
  @Column({ type: "int", default: 0 }) failures!: number;
  @Column({ type: "datetime", nullable: true }) windowStarted!: Date | null;
}
@Entity("staff_recovery_codes")
export class StaffRecovery {
  @PrimaryColumn({ type: "varchar", length: 36 }) userId!: string;
  @PrimaryColumn({ type: "varchar", length: 64 }) hash!: string;
  @Column({ type: "datetime", nullable: true }) consumedAt!: Date | null;
}
@Entity("staff_invitations")
export class StaffInvitation {
  @PrimaryColumn({ type: "varchar", length: 36 }) id!: string;
  @Column({ type: "varchar", length: 64, unique: true, select: false }) tokenHash!: string;
  @Column({ type: "varchar", length: 254 }) email!: string;
  @Column({ type: "varchar", length: 24 }) role!: "administrator" | "sales" | "content_editor";
  @Column({ type: "varchar", length: 36 }) createdBy!: string;
  @Column({ type: "datetime" }) createdAt!: Date;
  @Column({ type: "datetime" }) expiresAt!: Date;
  @Column({ type: "datetime", nullable: true }) consumedAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) revokedAt!: Date | null;
}
@Entity("staff_audit_events")
export class StaffAudit {
  @PrimaryColumn({ type: "varchar", length: 36 }) id!: string;
  @Column({ type: "varchar", length: 36, nullable: true }) actorId!: string | null;
  @Column({ type: "varchar", length: 24 }) actorRole!: string;
  @Column({ type: "varchar", length: 80 }) action!: string;
  @Column({ type: "varchar", length: 120 }) target!: string;
  @Column({ type: "varchar", length: 36 }) requestId!: string;
  @Column({ type: "varchar", length: 36, nullable: true }) requestKey!: string | null;
  @Column({ type: "varchar", length: 64, nullable: true, select: false }) fingerprint!:
    | string
    | null;
  @Column({ type: "json" }) changes!: Record<string, string | number | boolean | null>;
  @Column({ type: "datetime", precision: 3 }) createdAt!: Date;
}
@Entity("staff_administration_lock")
export class StaffAdministrationLock {
  @PrimaryColumn({ type: "int" }) id!: number;
}
export const securityEntities = [
  StaffFactor,
  StaffRecovery,
  StaffInvitation,
  StaffAudit,
  StaffAdministrationLock,
];
