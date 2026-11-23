import { BadRequestException } from "@nestjs/common";

export function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .trim()
    .toLocaleLowerCase("ar");
}

export type CatalogQuery = {
  lang: "ar" | "en";
  q: string;
  sort: "asc" | "desc" | "reference";
  page: number;
  pageSize: number;
  category: string[];
  brand: string[];
  usage: string[];
  size: string[];
  use: string[];
  ids: string[];
};
export function parseCatalogQuery(raw: Record<string, unknown>, allowed: string[]): CatalogQuery {
  if (Object.keys(raw).some((key) => !allowed.includes(key))) throw new BadRequestException();
  const many = (key: string, limit = 20, length = 100): string[] => {
    const value = raw[key];
    if (value === undefined) return [];
    const values = Array.isArray(value) ? value : [value];
    if (
      values.length > limit ||
      values.some((v) => typeof v !== "string" || !v || v.length > length)
    )
      throw new BadRequestException();
    return [...new Set(values as string[])];
  };
  const one = (key: string, fallback: string, length = 200): string => {
    if (raw[key] === undefined) return fallback;
    if (typeof raw[key] !== "string" || (raw[key] as string).length > length)
      throw new BadRequestException();
    return raw[key] as string;
  };
  const integer = (key: string, fallback: number, max: number) => {
    const value = one(key, String(fallback));
    if (!/^[1-9]\d*$/.test(value) || Number(value) > max) throw new BadRequestException();
    return Number(value);
  };
  const sort = one("sort", "asc");
  if (!["asc", "desc", "reference"].includes(sort)) throw new BadRequestException();
  const ids = many("ids", 50, 64);
  if (ids.some((id) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))) throw new BadRequestException();
  return {
    lang: one("lang", "ar", 16) === "en" ? "en" : "ar",
    q: normalize(one("q", "")),
    sort: sort as CatalogQuery["sort"],
    page: integer("page", 1, 10000),
    pageSize: integer("pageSize", 6, 50),
    category: many("category"),
    brand: many("brand"),
    usage: many("usage"),
    size: many("size"),
    use: many("use"),
    ids,
  };
}
