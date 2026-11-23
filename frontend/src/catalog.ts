export const assets = {
  logo: "/assets/18972.png",
  kunafa: "/assets/25cf4.png",
  ghazal: "/assets/a9248.png",
  baking: "/assets/catalog/croissants.png",
  cooking: "/assets/d46b4.png",
  butter: "/assets/c43cd.png",
  nabateen: "/assets/1e269.png",
  kawakeb: "/assets/fe634.png",
  factory: "/assets/3bfa2.png",
  balqa: "/assets/catalog/balqa.png",
  mumtaz: "/assets/catalog/mumtaz.png",
  aseel: "/assets/catalog/aseel-home.png",
  kawkabOil: "/assets/catalog/kawkab-oil.png",
  ghazaleinOil: "/assets/catalog/ghazalein-corn-oil.png",
  reemOil: "/assets/catalog/reem-sunflower-oil.png",
};

export type Product = {
  translationAvailable?: boolean;
  availableLocales?: ("ar" | "en")[];
  categoryLabel?: string;
  useLabels?: Record<string, string>;
  sizeLabels?: Record<string, string>;
  packagingLabels?: Record<string, string>;
  packageOptions?: { id: string; label: string }[];
  id: string;
  slug: string;
  name: string;
  englishName: string;
  brand: string;
  brandEn: string;
  category: string;
  categoryKey: "vegetable-ghee" | "soybean-oil" | "corn-oil" | "sunflower-oil";
  description: string;
  descriptionEn: string;
  sizes: string[];
  uses: string[];
  useKeys: UseKey[];
  image?: string;
  packaging?: string[];
  ingredientsAr?: string;
  ingredientsEn?: string;
  aliases?: string[];
};

export type UseKey =
  | "cooking"
  | "frying"
  | "oriental-sweets"
  | "kunafa"
  | "desserts"
  | "baking"
  | "food-industry"
  | "salads"
  | "pastry";

export const usageCards = [
  { title: "للطبخ", filter: "الطبخ", text: "لأطباق كل يوم", image: assets.cooking },
  {
    title: "للحلويات الشرقية",
    filter: "الحلويات الشرقية",
    text: "من الكنافة إلى معمول العيد",
    image: assets.kunafa,
  },
  { title: "للمخبوزات", filter: "المخبوزات", text: "وصفات تستحق التجربة", image: assets.baking },
];
