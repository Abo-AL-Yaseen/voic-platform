import type { Product, UseKey } from "./catalog";

export type Lang = "ar" | "en";

export function resolveLang(requestedLang: string | null): Lang {
  return requestedLang === "en" ? "en" : "ar";
}

export function pick(lang: Lang, ar: string, en: string) {
  if (lang === "ar") return ar;
  return en;
}

export const ui = {
  ar: {
    products: "منتجاتنا",
    chooser: "ساعدني أختار",
    recipes: "من مطبخنا",
    about: "حكايتنا",
    business: "لقطاع الأعمال",
    contact: "تواصل معنا",
    home: "الرئيسية",
    details: "تفاصيل المنتج",
    fullProduct: "عرض صفحة المنتج",
    compare: "أضف للمقارنة",
    inquiry: "استفسر عن هذا المنتج",
    emailHint: "يفتح تطبيق البريد لإرسال استفسارك",
    back: "رجوع",
    next: "التالي",
    reset: "ابدأ من جديد",
  },
  en: {
    products: "Products",
    chooser: "Help Me Choose",
    recipes: "From Our Kitchen",
    about: "Our Story",
    business: "For Business",
    contact: "Contact Us",
    home: "Home",
    details: "Product details",
    fullProduct: "View product page",
    compare: "Add to comparison",
    inquiry: "Inquire about this product",
    emailHint: "Opens your email app to send your inquiry",
    back: "Back",
    next: "Next",
    reset: "Start over",
  },
} as const;

const categories: Record<Product["categoryKey"], [string, string]> = {
  "vegetable-ghee": ["سمن نباتي", "Vegetable ghee"],
  "soybean-oil": ["زيت صويا", "Soybean oil"],
  "corn-oil": ["زيت ذرة", "Corn oil"],
  "sunflower-oil": ["زيت دوار الشمس", "Sunflower oil"],
};

const uses: Record<UseKey, [string, string]> = {
  cooking: ["الطبخ", "Cooking"],
  frying: ["القلي", "Frying"],
  "oriental-sweets": ["الحلويات الشرقية", "Traditional sweets"],
  kunafa: ["الكنافة", "Kunafa"],
  desserts: ["الحلويات", "Desserts"],
  baking: ["المخبوزات", "Baking & pastries"],
  "food-industry": ["الاستخدام المهني", "Food-industry use"],
  salads: ["السلطات", "Salads"],
  pastry: ["المعجنات", "Pastries"],
};

export function productName(product: Product, lang: Lang) {
  return lang === "ar" ? product.name : product.englishName;
}

export function secondaryProductName(product: Product, lang: Lang) {
  return lang === "ar" ? product.englishName : product.name;
}

export function productDescription(product: Product, lang: Lang) {
  return pick(lang, product.description, product.descriptionEn);
}

export function categoryLabel(product: Product, lang: Lang) {
  return categories[product.categoryKey][lang === "ar" ? 0 : 1];
}

export function useLabel(key: UseKey, lang: Lang) {
  return uses[key][lang === "ar" ? 0 : 1];
}

export function formatSize(size: string, lang: Lang) {
  if (lang === "ar") return size;
  return size.replace("كغم", "kg").replace("غم", "g").replace("لتر", "L");
}

export function formatPackaging(value: string, lang: Lang) {
  if (lang === "ar") return value;
  return formatSize(value, lang)
    .replace("تنك", "tin")
    .replace("برميل", "drum")
    .replace("كرتون", "carton");
}

export function withLang(path: string, lang: Lang) {
  const url = new URL(path, window.location.origin);
  if (lang !== "ar") url.searchParams.set("lang", lang);
  else url.searchParams.delete("lang");
  return `${url.pathname}${url.search}${url.hash}`;
}

export const localeName: Record<Lang, string> = {
  ar: "العربية",
  en: "English",
};

export function direction(lang: Lang) {
  return lang === "ar" ? "rtl" : "ltr";
}

export function arrow(lang: Lang, direction: "forward" | "back" = "forward") {
  const forward = lang === "ar" ? "←" : "→";
  return direction === "forward" ? forward : lang === "ar" ? "→" : "←";
}

export function msg(lang: Lang, values: Record<Lang, string>) {
  return values[lang];
}
