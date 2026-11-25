import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { validateContent } from "../src/content/content.validation.js";
import { LocalMediaStorage } from "../src/content/media.service.js";
const recipe = {
  id: "test-recipe",
  slug: "test-recipe",
  titleAr: "Test Arabic",
  titleEn: "Test English",
  category: "sweets-baking",
  descriptionAr: "Arabic text",
  descriptionEn: "English text",
  productIds: [],
  image: "/assets/site/recipe-maamoul.jpg",
  ingredients: [{ nameAr: "Ingredient", nameEn: "Ingredient" }],
  stepsAr: ["Step"],
  stepsEn: ["Step"],
};
test("editorial publication requires both locales, keeps unknown quantities optional, and rejects hidden fields and unsafe structured links", () => {
  assert.doesNotThrow(() => validateContent("recipes", recipe, true));
  assert.throws(() => validateContent("recipes", { ...recipe, titleEn: "" }, true));
  assert.throws(() => validateContent("recipes", { ...recipe, stepsEn: [""] }, true));
  assert.throws(() => validateContent("recipes", { ...recipe, actorId: "injection" }));
  assert.throws(() =>
    validateContent("recipes", { ...recipe, image: "https://remote.invalid/image.png" }),
  );
  assert.throws(() => validateContent("recipes", null as never));
  const page = {
    id: "contact",
    slug: "contact",
    texts: { intro: { ar: "Text", en: "Text" } },
    images: {},
    rows: [],
    featuredProductIds: [],
    links: { site: "javascript:alert(1)" },
  };
  assert.throws(() => validateContent("pages", page));
  assert.doesNotThrow(() =>
    validateContent("pages", { ...page, links: { site: "https://voic.test/path" } }),
  );
});
test("media decoding re-encodes supported signatures, strips metadata and rejects executable/path/dimension inputs", async () => {
  const storage = new LocalMediaStorage();
  const png = await sharp({ create: { width: 32, height: 16, channels: 4, background: "#8a9b57" } })
    .png()
    .toBuffer();
  const input = {
    key: "00000000-0000-4000-8000-000000000000",
    filename: "image.png",
    data: png.toString("base64"),
    altAr: "Test image",
    altEn: "Test image",
  };
  const result = await storage.process(input),
    metadata = await sharp(result).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 32);
  assert.equal(metadata.exif, undefined);
  await assert.rejects(storage.process({ ...input, filename: "../image.png" }));
  await assert.rejects(
    storage.process({
      ...input,
      data: Buffer.from('<svg onload="alert(1)"></svg>').toString("base64"),
    }),
  );
  await assert.rejects(
    storage.process({ ...input, data: Buffer.from("not an image").toString("base64") }),
  );
  const huge = await sharp({ create: { width: 6001, height: 1, channels: 3, background: "white" } })
    .png()
    .toBuffer();
  await assert.rejects(storage.process({ ...input, data: huge.toString("base64") }));
});
