import type { MigrationInterface, QueryRunner } from "typeorm";

export class PublicCatalog1795435200000 implements MigrationInterface {
  name = "PublicCatalog1795435200000";
  transaction = false;
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE catalog_products (
      id VARCHAR(64) NOT NULL PRIMARY KEY, slug VARCHAR(64) NOT NULL UNIQUE,
      categoryKey VARCHAR(64) NOT NULL, brandKey VARCHAR(64) NOT NULL,
      useKeys JSON NOT NULL, displayUseKeys JSON NOT NULL,
      referenceOrder INT NOT NULL, featuredOrder INT NULL,
      published TINYINT NOT NULL DEFAULT 0, approvalScope VARCHAR(24) NOT NULL DEFAULT 'development',
      image VARCHAR(255) NULL, imagePublished TINYINT NOT NULL DEFAULT 0, privateNotes TEXT NULL,
      INDEX catalog_publication (published, approvalScope, referenceOrder)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await runner.query(`CREATE TABLE catalog_translations (
      productId VARCHAR(64) NOT NULL, locale VARCHAR(2) NOT NULL, published TINYINT NOT NULL DEFAULT 0,
      fields JSON NOT NULL, PRIMARY KEY(productId, locale),
      CONSTRAINT catalog_translation_product FOREIGN KEY(productId) REFERENCES catalog_products(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await runner.query(`CREATE TABLE catalog_terms (
      kind VARCHAR(16) NOT NULL, id VARCHAR(64) NOT NULL, ar VARCHAR(100) NOT NULL, en VARCHAR(100) NOT NULL,
      published TINYINT NOT NULL DEFAULT 0, PRIMARY KEY(kind, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await runner.query(`CREATE TABLE catalog_packages (
      id VARCHAR(80) NOT NULL PRIMARY KEY, productId VARCHAR(64) NOT NULL, position INT NOT NULL,
      sizeKey VARCHAR(64) NOT NULL, amount DECIMAL(10,3) NULL, unit VARCHAR(8) NULL,
      sizeAr VARCHAR(100) NOT NULL, sizeEn VARCHAR(100) NOT NULL,
      packagingAr VARCHAR(150) NULL, packagingEn VARCHAR(150) NULL,
      published TINYINT NOT NULL DEFAULT 0, packagingPublished TINYINT NOT NULL DEFAULT 0,
      INDEX catalog_package_product (productId, position),
      CONSTRAINT catalog_package_product_fk FOREIGN KEY(productId) REFERENCES catalog_products(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  async down(runner: QueryRunner): Promise<void> {
    for (const table of [
      "catalog_packages",
      "catalog_translations",
      "catalog_terms",
      "catalog_products",
    ])
      await runner.query(`DROP TABLE ${table}`);
  }
}
