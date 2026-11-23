import type { Product, UseKey } from "../catalog";
import { formatPackaging, formatSize, useLabel, type Lang } from "../i18n";
export const sizeLabel = (p: Product, value: string, lang: Lang) =>
  p.sizeLabels?.[value] ?? formatSize(value, lang);
export const packageLabel = (p: Product, value: string, lang: Lang) =>
  p.packagingLabels?.[value] ?? p.sizeLabels?.[value] ?? formatPackaging(value, lang);
export const productUseLabel = (p: Product, key: UseKey, lang: Lang) =>
  p.useLabels?.[key] ?? useLabel(key, lang);
