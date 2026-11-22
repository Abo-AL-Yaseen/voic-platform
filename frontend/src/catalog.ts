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

export const products: Product[] = [
  {
    id: "ghazal-butter",
    slug: "ghazal-butter",
    name: "الغزال بنكهة الزبدة",
    englishName: "Al-Ghazal Butter Flavor",
    brand: "الغزال",
    brandEn: "Al-Ghazal",
    category: "سمن نباتي",
    categoryKey: "vegetable-ghee",
    description: "سمن نباتي بنكهة الزبدة لتحضير الحلويات والطبخ المنزلي، بعبوة 455 غم.",
    descriptionEn: "Butter-flavored vegetable ghee for desserts and home cooking, in a 455 g tin.",
    sizes: ["455 غم"],
    uses: ["الطبخ", "الحلويات"],
    useKeys: ["cooking", "desserts"],
    image: assets.butter,
    packaging: ["455 غم"],
    ingredientsAr: "مزيج من زيوت النخيل، نكهة السمن، بيتا كاروتين، فيتامينا أ ود.",
    ingredientsEn: "A blend of palm oils, ghee flavouring, beta-carotene, and vitamins A and D.",
    aliases: ["Butter Flavor"],
  },
  {
    id: "nabateen",
    slug: "nabateen",
    name: "النباتين",
    englishName: "Al-Nabatin",
    brand: "النباتين",
    brandEn: "Al-Nabatin",
    category: "سمن نباتي",
    categoryKey: "vegetable-ghee",
    description:
      "سمن نباتي للطبخ والحلويات الشرقية والغربية والمخبوزات، بأحجام صغيرة وعبوة مهنية 15 كغم.",
    descriptionEn:
      "Vegetable ghee for cooking, Eastern and Western desserts and baking, in small packs and a 15 kg professional format.",
    sizes: ["850 غم", "1.7 كغم", "15 كغم"],
    uses: ["الطبخ", "الحلويات الشرقية", "المخبوزات"],
    useKeys: ["cooking", "oriental-sweets", "desserts", "baking"],
    image: assets.nabateen,
    packaging: ["850 غم", "1.7 كغم", "15 كغم"],
    aliases: ["Nabateen", "Nabatin", "نباتين"],
  },
  {
    id: "kawakeb",
    slug: "kawakeb",
    name: "الكواكب",
    englishName: "Al-Kawakib",
    brand: "الكواكب",
    brandEn: "Al-Kawakib",
    category: "سمن نباتي",
    categoryKey: "vegetable-ghee",
    description:
      "سمن نباتي للطبخ والحلويات الشرقية، يرتبط بمذاق الكنافة النابلسية ويتوفر بخيارات تعبئة منزلية ومهنية.",
    descriptionEn:
      "Vegetable ghee for cooking and traditional sweets, associated with Nabulsi kunafa and offered in household and professional pack formats.",
    sizes: ["2 كغم", "15 كغم"],
    uses: ["الطبخ", "الحلويات الشرقية", "الكنافة"],
    useKeys: ["cooking", "oriental-sweets", "kunafa"],
    image: assets.kawakeb,
    packaging: ["2 كغم — تنك", "15 كغم — تنك", "15 كغم — برميل"],
    ingredientsAr: "مزيج من زيوت النخيل، نكهة الكواكب، بيتا كاروتين، فيتامينا أ ود.",
    ingredientsEn:
      "A blend of palm oils, Al-Kawakib flavouring, beta-carotene, and vitamins A and D.",
    aliases: ["Kawakeb"],
  },
  {
    id: "ghazal",
    slug: "ghazal",
    name: "الغزال",
    englishName: "Al-Ghazal",
    brand: "الغزال",
    brandEn: "Al-Ghazal",
    category: "سمن نباتي",
    categoryKey: "vegetable-ghee",
    description:
      "سمن نباتي للطبخ وتحضير الحلويات والمخبوزات، بأحجام تناسب استخدامات المطبخ المنزلي.",
    descriptionEn:
      "Vegetable ghee for cooking, sweets and baking, with pack sizes suited to home kitchens.",
    sizes: ["1 لتر", "2 كغم"],
    uses: ["الطبخ", "الحلويات", "المخبوزات"],
    useKeys: ["cooking", "oriental-sweets", "baking"],
    image: assets.ghazal,
    packaging: ["1 لتر", "2 كغم"],
    ingredientsAr: "زيت نخيل، فيتامينا أ ود3، نكهة، بيتا كاروتين.",
    ingredientsEn: "Palm oil, vitamins A and D3, flavouring, and beta-carotene.",
  },
  {
    id: "balqa",
    slug: "balqa",
    name: "البلقاء",
    englishName: "Al-Balqa",
    brand: "البلقاء",
    brandEn: "Al-Balqa",
    category: "سمن نباتي",
    categoryKey: "vegetable-ghee",
    description: "سمن نباتي للطبخ والحلويات الشرقية، بعبوة 15 كغم تناسب التحضير بكميات كبيرة.",
    descriptionEn:
      "Vegetable ghee for cooking and traditional sweets, in a 15 kg pack for larger-batch preparation.",
    sizes: ["15 كغم"],
    uses: ["الطبخ", "الحلويات الشرقية"],
    useKeys: ["cooking", "oriental-sweets"],
    image: assets.balqa,
    ingredientsAr: "مزيج من زيوت النخيل، نكهة السمن، بيتا كاروتين، فيتامينا أ ود.",
    ingredientsEn: "A blend of palm oils, ghee flavouring, beta-carotene, and vitamins A and D.",
  },
  {
    id: "mumtaz",
    slug: "mumtaz",
    name: "الممتاز",
    englishName: "Al-Mumtaz",
    brand: "الممتاز",
    brandEn: "Al-Mumtaz",
    category: "سمن نباتي",
    categoryKey: "vegetable-ghee",
    description:
      "سمن نباتي للطبخ وتحضير الحلويات، بخيار تعبئة 15 كغم للمطابخ المهنية والتحضير بكميات كبيرة.",
    descriptionEn:
      "Vegetable ghee for cooking and sweets, with a 15 kg tin for professional kitchens and larger batches.",
    sizes: ["15 كغم"],
    uses: ["الطبخ", "الحلويات"],
    useKeys: ["cooking", "desserts"],
    image: assets.mumtaz,
    packaging: ["15 كغم — تنك"],
    ingredientsAr: "زيت نخيل، فيتامينا أ ود، نكهة الممتاز، بيتا كاروتين.",
    ingredientsEn: "Palm oil, vitamins A and D, Al-Mumtaz flavouring, and beta-carotene.",
  },
  {
    id: "aseel",
    slug: "aseel",
    name: "الأصيل",
    englishName: "Al-Aseel",
    brand: "الأصيل",
    brandEn: "Al-Aseel",
    category: "سمن نباتي",
    categoryKey: "vegetable-ghee",
    description: "سمن نباتي للطبخ والحلويات والخبز والكعك والبسكويت، بخيارات تعبئة 10 و12.5 كغم.",
    descriptionEn:
      "Vegetable ghee for cooking, sweets, bread, cakes and biscuits, in 10 kg and 12.5 kg cartons.",
    sizes: ["10 كغم", "12.5 كغم"],
    uses: ["الطبخ", "الحلويات", "المخبوزات"],
    useKeys: ["cooking", "desserts", "baking"],
    image: assets.aseel,
    packaging: ["10 كغم — كرتون", "12.5 كغم — كرتون"],
    ingredientsAr: "زيت نخيل، فيتامينا أ ود.",
    ingredientsEn: "Palm oil and vitamins A and D.",
  },
  {
    id: "kawkab-soybean-oil",
    slug: "kawkab-soybean-oil",
    name: "الكوكب — زيت صويا",
    englishName: "Al-Kawkab Soybean Oil",
    brand: "الكوكب",
    brandEn: "Al-Kawkab",
    category: "زيت صويا",
    categoryKey: "soybean-oil",
    description: "زيت صويا للقلي والطبخ، موجّه أيضًا لاستخدامات الصناعات الغذائية، بعبوة 16 كغم.",
    descriptionEn:
      "Soybean oil for frying and cooking, also intended for food-industry use, in a 16 kg PET pack.",
    sizes: ["16 كغم"],
    uses: ["الطبخ", "القلي", "الاستخدام المهني"],
    useKeys: ["cooking", "frying", "food-industry"],
    image: assets.kawkabOil,
    packaging: ["16 كغم — PET"],
    ingredientsAr: "زيت فول الصويا، فيتامينا أ ود.",
    ingredientsEn: "Soybean oil and vitamins A and D.",
    aliases: ["Kawkab Oil", "Soybean Oil"],
  },
  {
    id: "ghazalein-corn-oil",
    slug: "ghazalein-corn-oil",
    name: "الغزالين — زيت ذرة",
    englishName: "Al-Ghazalein Corn Oil",
    brand: "الغزالين",
    brandEn: "Al-Ghazalein",
    category: "زيت ذرة",
    categoryKey: "corn-oil",
    description:
      "زيت ذرة للطبخ والقلي وتحضير السلطات والمعجنات، من مجموعة الزيوت النباتية السائلة.",
    descriptionEn:
      "Corn oil for cooking, frying, salad dressings and pastries, from the liquid vegetable oil range.",
    sizes: [],
    uses: ["الطبخ", "القلي", "السلطات", "المعجنات"],
    useKeys: ["cooking", "frying", "salads", "pastry"],
    image: assets.ghazaleinOil,
    aliases: ["Corn Oil"],
  },
  {
    id: "reem-sunflower-oil",
    slug: "reem-sunflower-oil",
    name: "ريم — زيت دوار الشمس",
    englishName: "Reem Sunflower Oil",
    brand: "ريم",
    brandEn: "Reem",
    category: "زيت دوار الشمس",
    categoryKey: "sunflower-oil",
    description:
      "زيت دوار الشمس للطبخ والقلي وتحضير الحلويات، وللوصفات اليومية مثل القدرة والشيشبرك.",
    descriptionEn:
      "Sunflower oil for cooking, frying and sweets, including everyday dishes such as qidra and shishbarak.",
    sizes: [],
    uses: ["الطبخ", "القلي", "الحلويات"],
    useKeys: ["cooking", "frying", "desserts"],
    image: assets.reemOil,
    aliases: ["Sunflower Oil"],
  },
  {
    id: "sun-gold-sunflower-oil",
    slug: "sun-gold-sunflower-oil",
    name: "صن غولد — زيت دوار الشمس",
    englishName: "Sun Gold Sunflower Oil",
    brand: "صن غولد",
    brandEn: "Sun Gold",
    category: "زيت دوار الشمس",
    categoryKey: "sunflower-oil",
    description: "زيت دوار الشمس من علامة صن غولد، ضمن مجموعة الزيوت النباتية السائلة.",
    descriptionEn:
      "Sunflower oil under the Sun Gold brand, part of the liquid vegetable oil range.",
    sizes: [],
    uses: [],
    useKeys: [],
    aliases: ["Sungold", "صن جولد"],
  },
];

const featuredIds = ["ghazal-butter", "nabateen", "kawakeb", "ghazal"];
export const featuredProducts = featuredIds.map((id) =>
  products.find((product) => product.id === id)!,
);

export type FilterKey = "brand" | "category" | "usage" | "size";
export type FilterGroup = {
  key: FilterKey;
  title: string;
  choices: string[];
  sections?: { title: string; choices: string[] }[];
};

const allSizes = unique(products.flatMap((product) => product.sizes));
const weightSizes = allSizes.filter(isWeight).sort((a, b) => weightInGrams(a) - weightInGrams(b));
const volumeSizes = allSizes.filter((size) => !isWeight(size)).sort(numericSizeSort);

export const filterGroups: FilterGroup[] = [
  { key: "category", title: "الفئة", choices: unique(products.map((p) => p.category)) },
  { key: "brand", title: "العلامة التجارية", choices: unique(products.map((p) => p.brand)) },
  { key: "usage", title: "الاستخدام", choices: unique(products.flatMap((p) => p.uses)) },
  {
    key: "size",
    title: "حجم العبوة",
    choices: [...weightSizes, ...volumeSizes],
    sections: [
      { title: "الوزن", choices: weightSizes },
      { title: "الحجم", choices: volumeSizes },
    ].filter((section) => section.choices.length),
  },
];

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

export function filterProducts(params: URLSearchParams) {
  const query = normalize(params.get("q") || "");
  return products
    .filter(
      (product) =>
        normalize(
          `${product.name} ${product.englishName} ${product.brand} ${product.brandEn} ${product.category} ${product.description} ${product.descriptionEn} ${(product.aliases || []).join(" ")}`,
        ).includes(query) &&
        filterGroups.every(({ key }) => {
          const values = params.getAll(key);
          const actual =
            key === "brand"
              ? [product.brand]
              : key === "category"
                ? [product.category]
                : key === "usage"
                  ? product.uses
                  : product.sizes;
          return !values.length || values.some((value) => actual.includes(value));
        }),
    )
    .sort((a, b) => {
      const order = a.name.localeCompare(b.name, "ar");
      return params.get("sort") === "desc" ? -order : order;
    });
}

function isWeight(value: string) {
  return /(?:غم|كغم)$/.test(value);
}

function weightInGrams(value: string) {
  const amount = Number.parseFloat(value);
  return value.endsWith("كغم") ? amount * 1000 : amount;
}

function numericSizeSort(a: string, b: string) {
  return Number.parseFloat(a) - Number.parseFloat(b);
}

function unique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "ar"));
}

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .trim()
    .toLocaleLowerCase("ar");
}
