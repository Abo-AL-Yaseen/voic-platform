export type Ingredient = {
  amount?: number;
  unitAr?: string;
  unitEn?: string;
  nameAr: string;
  nameEn: string;
};

export type Recipe = {
  publishedRevision?: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  category: "sweets-baking" | "main-dishes";
  descriptionAr: string;
  descriptionEn: string;
  productIds: string[];
  image: string;
  ingredients: Ingredient[];
  stepsAr: string[];
  stepsEn: string[];
  knownTimeAr?: string;
  knownTimeEn?: string;
  temperatureC?: number;
};
