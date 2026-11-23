import { Column, Entity, PrimaryColumn } from "typeorm";

export type Locale = "ar" | "en";
export type PublicField = { value: string | null; published: boolean };
export type TranslationFields = {
  name: PublicField;
  description: PublicField;
  ingredients: PublicField;
  aliases: { value: string[]; published: boolean };
};

@Entity("catalog_products")
export class CatalogProduct {
  @PrimaryColumn({ type: "varchar", length: 64 }) id!: string;
  @Column({ type: "varchar", length: 64, unique: true }) slug!: string;
  @Column({ type: "varchar", length: 64 }) categoryKey!: string;
  @Column({ type: "varchar", length: 64 }) brandKey!: string;
  @Column({ type: "json" }) useKeys!: string[];
  @Column({ type: "json" }) displayUseKeys!: string[];
  @Column({ type: "int" }) referenceOrder!: number;
  @Column({ type: "int", nullable: true }) featuredOrder!: number | null;
  @Column({ type: "boolean", default: false }) published!: boolean;
  @Column({ type: "varchar", length: 24, default: "development" }) approvalScope!:
    | "development"
    | "approved";
  @Column({ type: "varchar", length: 255, nullable: true }) image!: string | null;
  @Column({ type: "boolean", default: false }) imagePublished!: boolean;
  @Column({ type: "text", nullable: true, select: false }) privateNotes!: string | null;
}

@Entity("catalog_translations")
export class CatalogTranslation {
  @PrimaryColumn({ type: "varchar", length: 64 }) productId!: string;
  @PrimaryColumn({ type: "varchar", length: 2 }) locale!: Locale;
  @Column({ type: "boolean", default: false }) published!: boolean;
  @Column({ type: "json" }) fields!: TranslationFields;
}

@Entity("catalog_terms")
export class CatalogTerm {
  @PrimaryColumn({ type: "varchar", length: 16 }) kind!: "category" | "brand" | "usage";
  @PrimaryColumn({ type: "varchar", length: 64 }) id!: string;
  @Column({ type: "varchar", length: 100 }) ar!: string;
  @Column({ type: "varchar", length: 100 }) en!: string;
  @Column({ type: "boolean", default: false }) published!: boolean;
}

@Entity("catalog_packages")
export class CatalogPackage {
  @PrimaryColumn({ type: "varchar", length: 80 }) id!: string;
  @Column({ type: "varchar", length: 64 }) productId!: string;
  @Column({ type: "int" }) position!: number;
  @Column({ type: "varchar", length: 64 }) sizeKey!: string;
  @Column({ type: "decimal", precision: 10, scale: 3, nullable: true }) amount!: string | null;
  @Column({ type: "varchar", length: 8, nullable: true }) unit!: string | null;
  @Column({ type: "varchar", length: 100 }) sizeAr!: string;
  @Column({ type: "varchar", length: 100 }) sizeEn!: string;
  @Column({ type: "varchar", length: 150, nullable: true }) packagingAr!: string | null;
  @Column({ type: "varchar", length: 150, nullable: true }) packagingEn!: string | null;
  @Column({ type: "boolean", default: false }) published!: boolean;
  @Column({ type: "boolean", default: false }) packagingPublished!: boolean;
}

export const catalogEntities = [CatalogProduct, CatalogTranslation, CatalogTerm, CatalogPackage];
