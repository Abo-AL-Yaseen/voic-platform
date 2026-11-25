import { Column, Entity, PrimaryColumn } from "typeorm";

export type Role = "customer" | "administrator" | "sales" | "content_editor";
@Entity("auth_users")
export class AuthUser {
  @PrimaryColumn({ type: "varchar", length: 36 }) id!: string;
  @Column({ type: "varchar", length: 254, unique: true }) email!: string;
  @Column({ type: "varchar", length: 255, select: false }) passwordHash!: string;
  @Column({ type: "varchar", length: 24, default: "customer" }) role!: Role;
  @Column({ type: "varchar", length: 16 }) kind!: "individual" | "company";
  @Column({ type: "varchar", length: 100 }) name!: string;
  @Column({ type: "varchar", length: 150, nullable: true }) company!: string | null;
  @Column({ type: "varchar", length: 100 }) country!: string;
  @Column({ type: "varchar", length: 40, nullable: true }) phone!: string | null;
  @Column({ type: "datetime", nullable: true }) emailVerifiedAt!: Date | null;
  @Column({ type: "int", default: 0, select: false }) securityVersion!: number;
  @Column({ type: "datetime" }) createdAt!: Date;
  @Column({ type: "datetime", nullable: true }) suspendedAt!: Date | null;
  @Column({ type: "int", default: 0 }) staffRevision!: number;
}
@Entity("auth_sessions")
export class AuthSession {
  @PrimaryColumn({ type: "varchar", length: 64 }) tokenHash!: string;
  @Column({ type: "varchar", length: 36, nullable: true }) userId!: string | null;
  @Column({ type: "int" }) securityVersion!: number;
  @Column({ type: "datetime" }) expiresAt!: Date;
  @Column({ type: "varchar", length: 16, default: "password" }) assurance!:
    | "anonymous"
    | "password"
    | "mfa";
  @Column({ type: "datetime", nullable: true }) authenticatedAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) mfaAt!: Date | null;
  @Column({ type: "int", default: 0 }) attempts!: number;
}
@Entity("auth_action_tokens")
export class AuthActionToken {
  @PrimaryColumn({ type: "varchar", length: 64 }) tokenHash!: string;
  @Column({ type: "varchar", length: 36 }) userId!: string;
  @Column({ type: "varchar", length: 16 }) purpose!: "verify" | "reset";
  @Column({ type: "datetime" }) expiresAt!: Date;
  @Column({ type: "datetime", nullable: true }) consumedAt!: Date | null;
}
export const authEntities = [AuthUser, AuthSession, AuthActionToken];
