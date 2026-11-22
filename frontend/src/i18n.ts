import type { Product, UseKey } from "./catalog";

export type Lang = "ar" | "en" | "de";

export function pick(lang: Lang, ar: string, en: string) {
  if (lang === "ar") return ar;
  if (lang === "de") return deText[en] || en;
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
  de: {
    products: "Produkte",
    chooser: "Produkthilfe",
    recipes: "Aus unserer Küche",
    about: "Unsere Geschichte",
    business: "Für Geschäftskunden",
    contact: "Kontakt",
    home: "Startseite",
    details: "Produktdetails",
    fullProduct: "Zur Produktseite",
    compare: "Zum Vergleich",
    inquiry: "Für Lieferanfrage auswählen",
    emailHint: "Fügt das Produkt einer Lieferanfrage hinzu",
    back: "Zurück",
    next: "Weiter",
    reset: "Neu beginnen",
  },
} as const;

const categories: Record<Product["categoryKey"], [string, string, string]> = {
  "vegetable-ghee": ["سمن نباتي", "Vegetable ghee", "Pflanzliches Ghee"],
  "soybean-oil": ["زيت صويا", "Soybean oil", "Sojaöl"],
  "corn-oil": ["زيت ذرة", "Corn oil", "Maisöl"],
  "sunflower-oil": ["زيت دوار الشمس", "Sunflower oil", "Sonnenblumenöl"],
};

const uses: Record<UseKey, [string, string, string]> = {
  cooking: ["الطبخ", "Cooking", "Kochen"],
  frying: ["القلي", "Frying", "Frittieren"],
  "oriental-sweets": ["الحلويات الشرقية", "Traditional sweets", "Orientalische Süßspeisen"],
  kunafa: ["الكنافة", "Kunafa", "Kunafa"],
  desserts: ["الحلويات", "Desserts", "Desserts"],
  baking: ["المخبوزات", "Baking & pastries", "Backwaren und Gebäck"],
  "food-industry": ["الاستخدام المهني", "Food-industry use", "Lebensmittelherstellung"],
  salads: ["السلطات", "Salads", "Salate"],
  pastry: ["المعجنات", "Pastries", "Gebäck"],
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
  return categories[product.categoryKey][lang === "ar" ? 0 : lang === "de" ? 2 : 1];
}

export function useLabel(key: UseKey, lang: Lang) {
  return uses[key][lang === "ar" ? 0 : lang === "de" ? 2 : 1];
}

export function formatSize(size: string, lang: Lang) {
  if (lang === "ar") return size;
  return size.replace("كغم", "kg").replace("غم", "g").replace("لتر", "L");
}

export function formatPackaging(value: string, lang: Lang) {
  if (lang === "ar") return value;
  return formatSize(value, lang)
    .replace("تنك", lang === "de" ? "Dose" : "tin")
    .replace("برميل", lang === "de" ? "Fass" : "drum")
    .replace("كرتون", lang === "de" ? "Karton" : "carton");
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
  de: "Deutsch",
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

const deText: Record<string, string> = {
  Home: "Startseite",
  "Page not found": "Seite nicht gefunden",
  "Made in Palestine • From Nablus to your table since 1953":
    "Hergestellt in Palästina • Seit 1953 aus Nablus auf Ihren Tisch",
  "Main navigation": "Hauptnavigation",
  "Open menu": "Menü öffnen",
  "Close menu": "Menü schließen",
  "From Nablus, since 1953": "Aus Nablus, seit 1953",
  "From Nablus,": "Aus Nablus,",
  "flavours that bring us together": "Geschmack, der uns verbindet",
  "For the dishes we love and the sweets that bring us together. Explore products for cooking, sweets and baking.":
    "Für vertraute Gerichte und Süßspeisen, die Menschen zusammenbringen. Entdecken Sie Produkte zum Kochen, für Süßspeisen und zum Backen.",
  "Explore our products": "Produkte entdecken",
  "Familiar products and flavours generations grew up with":
    "Vertraute Produkte und Geschmack, mit dem Generationen aufgewachsen sind",
  "What are you making?": "Was möchten Sie zubereiten?",
  "Start with your favourite recipe": "Beginnen Sie mit Ihrem Lieblingsrezept",
  Cooking: "Kochen",
  "Traditional sweets": "Orientalische Süßspeisen",
  Baking: "Backen",
  "For everyday dishes": "Für Gerichte des Alltags",
  "From kunafa to festive sweets": "Von Kunafa bis zu Festtagsgebäck",
  "Recipes worth trying": "Rezepte zum Ausprobieren",
  "Familiar names, varied options": "Vertraute Marken, vielfältige Auswahl",
  "Explore our range and choose the pack size that suits you.":
    "Entdecken Sie unser Sortiment und wählen Sie die passende Packungsgröße.",
  "Browse all products →": "Alle Produkte ansehen →",
  "Explore product →": "Produkt entdecken →",
  "Palestinian roots. An ongoing story.": "Palästinensische Wurzeln. Eine fortlaufende Geschichte.",
  "A story that began in Nablus": "Eine Geschichte, die in Nablus begann",
  "Since the company was founded in 1953, we have continued developing vegetable oil and ghee products for home and professional kitchens.":
    "Seit der Gründung im Jahr 1953 entwickeln wir pflanzliche Öle und Ghee für private und professionelle Küchen weiter.",
  "Discover our story": "Unsere Geschichte entdecken",
  "Products sized for your business": "Produkte für den Bedarf Ihres Unternehmens",
  "Explore business options": "Geschäftskunden-Angebot entdecken",
  "From our Nablus factory to your kitchen.": "Von unserem Werk in Nablus in Ihre Küche.",
  Explore: "Entdecken",
  "Follow our story": "Folgen Sie unserer Geschichte",
  "Nablus, Palestine": "Nablus, Palästina",
  "A product for every recipe": "Das passende Produkt für jedes Rezept",
  "Explore our products and choose what suits your use.":
    "Entdecken Sie unsere Produkte und wählen Sie das passende für Ihren Einsatz.",
  "Vegetable ghee and oils": "Pflanzliches Ghee und Öle",
  "Browse products and pack sizes, then contact us for commercial inquiries.":
    "Entdecken Sie Produkte und Packungsgrößen und starten Sie anschließend eine Lieferanfrage.",
  "Search products": "Produkte suchen",
  "Search products...": "Produkte suchen …",
  "Sort products": "Produkte sortieren",
  "Alphabetical: A–Z": "Alphabetisch: A–Z",
  "Alphabetical: Z–A": "Alphabetisch: Z–A",
  "Clear filters": "Filter zurücksetzen",
  "Filter products": "Produkte filtern",
  "Choose what suits you": "Passende Auswahl finden",
  Category: "Kategorie",
  Brand: "Marke",
  Use: "Verwendung",
  "Pack size": "Packungsgröße",
  "No products match your search": "Keine Produkte entsprechen Ihrer Suche",
  "Try changing the search term or filters.": "Ändern Sie den Suchbegriff oder die Filter.",
  "Product comparison": "Produktvergleich",
  "Compare products": "Produkte vergleichen",
  "Product comparison table": "Tabelle zum Produktvergleich",
  Product: "Produkt",
  "Other name": "Weitere Bezeichnung",
  "Product type": "Produkttyp",
  Uses: "Verwendung",
  "Sizes and packaging": "Größen und Verpackung",
  "Original image unavailable": "Originalbild nicht verfügbar",
  "About the product": "Über das Produkt",
  Ingredients: "Zutaten",
  "Related products": "Ähnliche Produkte",
  "Recipes using this product": "Rezepte mit diesem Produkt",
  "A simple guided choice": "Eine einfache Produkthilfe",
  "Let us help you choose": "Wir helfen Ihnen bei der Auswahl",
  "Tell us how you plan to use the product and which pack size suits you, then see the closest options.":
    "Nennen Sie Verwendung und gewünschte Packungsgröße und sehen Sie passende Optionen.",
  Progress: "Fortschritt",
  "Are you choosing for home or business?": "Suchen Sie für zuhause oder für Ihr Unternehmen?",
  "For home": "Für zuhause",
  "For business": "Für Unternehmen",
  "What is the main use?": "Was ist die Hauptverwendung?",
  "Which pack size suits you?": "Welche Packungsgröße passt?",
  "No preference": "Keine Präferenz",
  "Help me with supply options": "Beratung zu Lieferoptionen",
  "See results": "Ergebnisse anzeigen",
  "Your results": "Ihre Ergebnisse",
  "Options matching your choices": "Passende Optionen",
  "No exact match for all your choices": "Keine genaue Übereinstimmung gefunden",
  "Edit answers": "Antworten bearbeiten",
  "Start a business inquiry": "Lieferanfrage beginnen",
  "For kitchens, bakeries and distributors": "Für Gastronomie, Bäckereien und Handel",
  "Paths for your business": "Wege zu Ihrem Bedarf",
  "Known professional formats": "Bekannte Großgebinde",
  "Options for preparation and supply": "Optionen für Zubereitung und Belieferung",
  "Commercial inquiry": "Lieferanfrage",
  "Tell us about your needs": "Beschreiben Sie Ihren Bedarf",
  "Frequently asked questions": "Häufig gestellte Fragen",
  "Since 1953": "Seit 1953",
  "Our vision": "Unsere Vision",
  "Our mission": "Unsere Mission",
  "Our quality approach": "Unser Qualitätsansatz",
  "Quality at the heart of our work": "Qualität im Mittelpunkt unserer Arbeit",
  "Let's stay in touch": "Bleiben wir in Kontakt",
  Email: "E-Mail",
  Telephone: "Telefon",
  Address: "Adresse",
  "Eastern Industrial Area, Nablus, Palestine": "Östliches Industriegebiet, Nablus, Palästina",
  "P.O. Box 95": "Postfach 95",
  "Search for the location on the map": "Standort auf der Karte suchen",
  Fax: "Fax",
  "Prepare a message": "Nachricht vorbereiten",
  "Recipes from our kitchen": "Rezepte aus unserer Küche",
  "From Our Kitchen": "Aus unserer Küche",
  "Recipes that bring us around the table, from sweets to everyday dishes.":
    "Rezepte, die am Tisch zusammenbringen – von Süßspeisen bis zu Gerichten des Alltags.",
  "Search recipes": "Rezepte suchen",
  "Recipe name...": "Rezeptname …",
  "All recipes": "Alle Rezepte",
  "Sweets & baking": "Süßspeisen und Backwaren",
  "Main dishes": "Hauptgerichte",
  "View recipe": "Rezept ansehen",
  "No recipes match your search": "Keine Rezepte entsprechen Ihrer Suche",
  "Clear search": "Suche zurücksetzen",
  Method: "Zubereitung",
  "Print recipe": "Rezept drucken",
  "Recipe quantity": "Rezeptmenge",
  Half: "Halbe Menge",
  Original: "Grundmenge",
  Double: "Doppelte Menge",
  "Products used in this recipe": "Im Rezept verwendete Produkte",
  "Related recipes": "Ähnliche Rezepte",
  "The page you opened is unavailable. Return home or browse our products.":
    "Die aufgerufene Seite ist nicht verfügbar. Kehren Sie zur Startseite zurück oder entdecken Sie unsere Produkte.",
  "Butter-flavored vegetable ghee for desserts and home cooking, in a 455 g tin.":
    "Pflanzliches Ghee mit Butteraroma für Desserts und die Küche zuhause, in einer 455-g-Dose.",
  "Vegetable ghee for cooking, Eastern and Western desserts and baking, in small packs and a 15 kg professional format.":
    "Pflanzliches Ghee zum Kochen, Backen sowie für orientalische und westliche Süßspeisen, in kleinen Packungen und als 15-kg-Großgebinde.",
  "Vegetable ghee for cooking and traditional sweets, associated with Nabulsi kunafa and offered in household and professional pack formats.":
    "Pflanzliches Ghee zum Kochen und für traditionelle Süßspeisen, bekannt für Nabulsi-Kunafa, in Haushalts- und Großgebinden.",
  "Vegetable ghee for cooking, sweets and baking, with pack sizes suited to home kitchens.":
    "Pflanzliches Ghee zum Kochen, für Süßspeisen und Backwaren in Größen für die Küche zuhause.",
  "Vegetable ghee for cooking and traditional sweets, in a 15 kg pack for larger-batch preparation.":
    "Pflanzliches Ghee zum Kochen und für traditionelle Süßspeisen, als 15-kg-Gebinde für größere Mengen.",
  "Vegetable ghee for cooking and sweets, with a 15 kg tin for professional kitchens and larger batches.":
    "Pflanzliches Ghee zum Kochen und für Süßspeisen, als 15-kg-Dose für professionelle Küchen.",
  "Vegetable ghee for cooking, sweets, bread, cakes and biscuits, in 10 kg and 12.5 kg cartons.":
    "Pflanzliches Ghee zum Kochen und für Süßspeisen, Brot, Kuchen und Gebäck, in 10-kg- und 12,5-kg-Kartons.",
  "Soybean oil for frying and cooking, also intended for food-industry use, in a 16 kg PET pack.":
    "Sojaöl zum Frittieren und Kochen sowie für die Lebensmittelherstellung, im 16-kg-PET-Gebinde.",
  "Corn oil for cooking, frying, salad dressings and pastries, from the liquid vegetable oil range.":
    "Maisöl zum Kochen, Frittieren sowie für Salate und Gebäck.",
  "Sunflower oil for cooking, frying and sweets, including everyday dishes such as qidra and shishbarak.":
    "Sonnenblumenöl zum Kochen, Frittieren und für Süßspeisen, auch für Alltagsgerichte wie Qidra und Shishbarak.",
  "Sunflower oil under the Sun Gold brand, part of the liquid vegetable oil range.":
    "Sonnenblumenöl der Marke Sun Gold aus dem Sortiment flüssiger Pflanzenöle.",
  "Date-filled Semolina Maamoul": "Grieß-Maamoul mit Dattelfüllung",
  "Qidra with Lamb": "Qidra mit Lamm",
  "Shishbarak with Yogurt": "Shishbarak mit Joghurt",
  "Baked Fish with Vegetables": "Ofenfisch mit Gemüse",
  "Semolina maamoul with date filling, mahlab and Al-Nabatin ghee.":
    "Grieß-Maamoul mit Dattelfüllung, Mahlab und Al-Nabatin-Ghee.",
  "Rice, lamb and chickpeas prepared with vegetable oil and Al-Nabatin ghee.":
    "Reis, Lamm und Kichererbsen mit Pflanzenöl und Al-Nabatin-Ghee.",
  "Meat-filled dumplings served with yogurt, garlic and coriander.":
    "Mit Fleisch gefüllte Teigtaschen mit Joghurt, Knoblauch und Koriander.",
  "Oven-baked fish with vegetables, lemon, garlic and spices.":
    "Ofenfisch mit Gemüse, Zitrone, Knoblauch und Gewürzen.",
  "A flavour for your recipes": "Geschmack für Ihre Rezepte",
  "Al-Ghazal vegetable ghee pack": "Al-Ghazal-Packung pflanzliches Ghee",
  "Al-Kawakib professional packs": "Al-Kawakib-Großgebinde",
  Contact: "Kontakt",
  "Explore business pack formats and contact us to discuss your needs.":
    "Entdecken Sie Großgebinde und sprechen Sie mit uns über Ihren Bedarf.",
  "For restaurants • sweet shops • bakeries • distributors":
    "Für Restaurants • Süßwarengeschäfte • Bäckereien • Händler",
  "Kunafa and Al-Ghazal pack": "Kunafa und Al-Ghazal-Packung",
  "Nabulsi kunafa with pistachios": "Nabulsi-Kunafa mit Pistazien",
  "Since 1953 / Vegetable Oil Industries Co.": "Seit 1953 / Vegetable Oil Industries Co.",
  "VOIC factory in Nablus": "VOIC-Werk in Nablus",
  "Vegetable Oil Industries Co.": "Vegetable Oil Industries Co.",
  "Add to inquiry": "Zur Anfrage hinzufügen",
  "Added to inquiry": "Zur Anfrage hinzugefügt",
  "Ask about specifications and quality documents":
    "Spezifikationen und Qualitätsunterlagen anfragen",
  Breadcrumb: "Brotkrümelnavigation",
  "Choose products → create and verify an account → review the inquiry → track the company response":
    "Produkte auswählen → Konto erstellen und bestätigen → Anfrage prüfen → Antwort des Unternehmens verfolgen",
  "Company facilities": "Unternehmensanlagen",
  "Contact by email instead": "Alternativ per E-Mail kontaktieren",
  "Edit the use or size, browse the full catalog, or contact us to discuss your need.":
    "Ändern Sie Verwendung oder Größe, sehen Sie den gesamten Katalog an oder kontaktieren Sie uns.",
  "Explore our vegetable ghee and oil range.":
    "Entdecken Sie unser Sortiment an pflanzlichem Ghee und Ölen.",
  "Have a product question or want to discuss supply needs? Contact us through the following channels.":
    "Haben Sie eine Produktfrage oder möchten Sie Ihren Lieferbedarf besprechen? Kontaktieren Sie uns über die folgenden Wege.",
  Milestones: "Meilensteine",
  "Quality and specification documents": "Qualitäts- und Spezifikationsunterlagen",
  "Share the products, sizes, approximate quantities and destination country to begin a conversation with our team.":
    "Nennen Sie Produkte, Größen, ungefähre Mengen und Zielland, um das Gespräch mit unserem Team zu beginnen.",
  "Uses:": "Verwendet:",
  "Vegetable Oil Industries Co. was established in 1953 in Nablus's Eastern Industrial Area. It began by refining and packing olive oil, then expanded into vegetable ghee and liquid vegetable-oil refining. Today its range includes ghee, soybean, corn and sunflower oil brands.":
    "Vegetable Oil Industries Co. wurde 1953 im östlichen Industriegebiet von Nablus gegründet. Das Unternehmen begann mit der Raffination und Abfüllung von Olivenöl und erweiterte seine Tätigkeit später um pflanzliches Ghee und flüssige Pflanzenöle. Heute umfasst das Sortiment Ghee sowie Soja-, Mais- und Sonnenblumenölmarken.",
  "Vegetable ghee and oil options for restaurants, sweet shops, bakeries and distributors. Explore products and pack sizes, then contact us to discuss supply needs.":
    "Pflanzliches Ghee und Öle für Restaurants, Süßwarengeschäfte, Bäckereien und Händler. Entdecken Sie Produkte und Packungsgrößen und besprechen Sie anschließend Ihren Lieferbedarf mit uns.",
  "We use quality management as a basis for developing our technical and administrative work, monitoring product quality and continuously improving our processes.":
    "Qualitätsmanagement bildet die Grundlage für die Weiterentwicklung unserer technischen und administrativen Arbeit, die Produktkontrolle und die fortlaufende Verbesserung unserer Prozesse.",
  "We work to provide vegetable ghee and oils, develop our operations, build long-term customer relationships, and contribute to Palestinian industry and the economy.":
    "Wir bieten pflanzliches Ghee und Öle, entwickeln unsere Abläufe weiter, bauen langfristige Kundenbeziehungen auf und leisten einen Beitrag zur palästinensischen Industrie und Wirtschaft.",
  "You can compare up to three products.": "Sie können bis zu drei Produkte vergleichen.",
  "Active filters": "Aktive Filter",
  "Clear selection": "Auswahl löschen",
  "Compare product type, uses and pack formats to choose what suits your needs.":
    "Vergleichen Sie Produkttyp, Verwendung und Packungsformate, um die passende Option zu finden.",
  "Continue inquiry": "Anfrage fortsetzen",
  "Inquiry selection is not limited to three products.":
    "Die Produktauswahl einer Anfrage ist nicht auf drei Produkte begrenzt.",
  "Products selected for comparison": "Für den Vergleich ausgewählte Produkte",
  "Search:": "Suche:",
  "You can compare up to three products. Remove one before adding another.":
    "Sie können bis zu drei Produkte vergleichen. Entfernen Sie ein Produkt, bevor Sie ein weiteres hinzufügen.",
  kg: "kg",
  g: "g",
  L: "l",
  cup: "Tasse",
  cups: "Tassen",
  tbsp: "EL",
  tsp: "TL",
  "tsp each": "je TL",
  clove: "Zehe",
  cloves: "Zehen",
  "fine semolina": "feiner Grieß",
  "ground mahlab": "gemahlener Mahlab",
  "Al-Nabatin ghee": "Al-Nabatin-Ghee",
  "instant yeast": "Instanthefe",
  "warm whole milk": "warme Vollmilch",
  "mashed dates": "zerdrückte Datteln",
  nutmeg: "Muskatnuss",
  cinnamon: "Zimt",
  "olive oil for the filling, as needed": "Olivenöl für die Füllung nach Bedarf",
  "icing sugar to serve, if desired": "Puderzucker zum Servieren nach Wunsch",
  "Rub the semolina with the mahlab and ghee, then cover and leave for four hours.":
    "Grieß mit Mahlab und Ghee verreiben, abdecken und vier Stunden ruhen lassen.",
  "Add the yeast and milk gradually and knead until a soft dough forms.":
    "Hefe und Milch nach und nach zugeben und zu einem weichen Teig kneten.",
  "Prepare the date filling with cinnamon, nutmeg and a little oil.":
    "Die Dattelfüllung mit Zimt, Muskatnuss und etwas Öl zubereiten.",
  "Divide the dough, fill with dates and shape in a mould. Rest for 15 minutes.":
    "Den Teig teilen, mit Datteln füllen und in einer Form gestalten. 15 Minuten ruhen lassen.",
  "Bake at 175°C for 15–20 minutes, watching the colour. Cool and serve with sugar if desired.":
    "Bei 175 °C 15–20 Minuten backen und die Bräunung beobachten. Abkühlen lassen und nach Wunsch mit Zucker servieren.",
  "Dough rest: 4 hours, then 15 minutes after shaping. Baking: 15–20 minutes.":
    "Teigruhe: 4 Stunden, danach 15 Minuten nach dem Formen. Backzeit: 15–20 Minuten.",
  "basmati rice": "Basmatireis",
  lamb: "Lammfleisch",
  "cooked chickpeas": "gekochte Kichererbsen",
  "Reem or Al-Ghazalein oil": "Reem- oder Al-Ghazalein-Öl",
  water: "Wasser",
  "onions, chopped": "gehackte Zwiebeln",
  "onions, sliced": "Zwiebeln in Scheiben",
  "crushed garlic": "zerdrückter Knoblauch",
  "chicken stock cube": "Hühnerbrühwürfel",
  "bay leaves": "Lorbeerblätter",
  cumin: "Kreuzkümmel",
  turmeric: "Kurkuma",
  "cardamom pods": "Kardamomkapseln",
  "ground cardamom": "gemahlener Kardamom",
  "salt and black pepper to taste": "Salz und schwarzer Pfeffer nach Geschmack",
  "Sauté the chopped onion in half the oil. Add the lamb, bay leaves and cardamom pods. Add the water and cook until tender, reserving the stock.":
    "Die gehackte Zwiebel in der Hälfte des Öls anbraten. Lamm, Lorbeer und Kardamom zugeben. Wasser angießen, garen und die Brühe aufbewahren.",
  "Brown the sliced onions in the remaining oil, then stir in the chickpeas, cumin and pepper.":
    "Zwiebelscheiben im restlichen Öl bräunen, dann Kichererbsen, Kreuzkümmel und Pfeffer einrühren.",
  "Season the rice with garlic, turmeric, ground cardamom and salt. Layer half the rice, the chickpea mixture, then the remaining rice.":
    "Reis mit Knoblauch, Kurkuma, gemahlenem Kardamom und Salz würzen. Die Hälfte des Reises, die Kichererbsenmischung und den restlichen Reis schichten.",
  "Add the stock cube and four cups of strained lamb stock. Bring to a boil, then reduce the heat until the rice is cooked.":
    "Brühwürfel und vier Tassen abgesiebte Lammbrühe zugeben. Aufkochen und bei niedriger Hitze garen, bis der Reis fertig ist.",
  "Spread the ghee over the rice and cover until it melts, then serve with the lamb.":
    "Ghee auf dem Reis verteilen und abgedeckt schmelzen lassen, anschließend mit dem Lamm servieren.",
  "minced meat": "Hackfleisch",
  "sifted flour": "gesiebtes Mehl",
  "small onion, chopped": "kleine gehackte Zwiebel",
  "Reem oil for the filling": "Reem-Öl für die Füllung",
  "oil for the garlic and coriander": "Öl für Knoblauch und Koriander",
  "salt and spices to taste": "Salz und Gewürze nach Geschmack",
  yogurt: "Joghurt",
  "chopped coriander": "gehackter Koriander",
  "chopped garlic": "gehackter Knoblauch",
  starch: "Stärke",
  "water to dissolve the starch": "Wasser zum Auflösen der Stärke",
  "water for the dough, as needed": "Wasser für den Teig nach Bedarf",
  "Knead the flour and salt with water added gradually. Cover and chill the dough for 30 minutes.":
    "Mehl und Salz kneten und dabei nach und nach Wasser zugeben. Den Teig abdecken und 30 Minuten kühlen.",
  "Sauté the onion in oil, add the meat, spices and nutmeg, and cook the filling through.":
    "Die Zwiebel in Öl anbraten, Fleisch, Gewürze und Muskat zugeben und die Füllung durchgaren.",
  "Roll out the dough, cut into circles, fill and close into shishbarak shapes.":
    "Den Teig ausrollen, Kreise ausstechen, füllen und zu Shishbarak formen.",
  "Arrange on a lightly greased tray and bake at 180°C for about 10 minutes, watching the browning.":
    "Auf einem leicht gefetteten Blech anordnen und bei 180 °C etwa 10 Minuten backen, dabei die Bräunung beobachten.",
  "Stir the yogurt with the starch over medium heat until thick. Sauté the garlic and coriander in oil, add to the yogurt and serve with the shishbarak.":
    "Joghurt und Stärke bei mittlerer Hitze rühren, bis die Mischung eindickt. Knoblauch und Koriander in Öl anbraten, zum Joghurt geben und mit den Shishbarak servieren.",
  "Chilling the dough: 30 minutes. Baking the dumplings: about 10 minutes.":
    "Teigkühlung: 30 Minuten. Backzeit der Teigtaschen: etwa 10 Minuten.",
  "medium fish": "mittelgroße Fische",
  "chopped parsley, plus a little to garnish": "gehackte Petersilie und etwas zum Garnieren",
  "lemon juice": "Zitronensaft",
  "olive oil": "Olivenöl",
  "turmeric, cumin, paprika and salt": "Kurkuma, Kreuzkümmel, Paprika und Salz",
  saffron: "Safran",
  "black pepper": "schwarzer Pfeffer",
  "hot pepper, sliced": "scharfe Paprika in Scheiben",
  "large carrots, sliced": "große Karotten in Scheiben",
  "lemon, sliced": "Zitrone in Scheiben",
  "onion, sliced": "Zwiebel in Scheiben",
  "green sweet peppers, diced": "grüne Paprika, gewürfelt",
  "tomato, peeled and chopped": "geschälte, gehackte Tomate",
  "Prepare, clean and drain the fish. Mix the lemon juice, oil, garlic, parsley and spices.":
    "Den Fisch vorbereiten, säubern und abtropfen lassen. Zitronensaft, Öl, Knoblauch, Petersilie und Gewürze mischen.",
  "Season the fish inside and out, placing one bay leaf inside each fish.":
    "Den Fisch innen und außen würzen und jeweils ein Lorbeerblatt hineinlegen.",
  "Spread some vegetables and lemon in the tray, then add the fish, remaining vegetables, tomato and marinade.":
    "Etwas Gemüse und Zitrone in der Form verteilen, dann Fisch, restliches Gemüse, Tomate und Marinade zugeben.",
  "Cover with foil and bake at 190°C for about 60 minutes until cooked, then uncover to brown and serve hot.":
    "Mit Folie abdecken und bei 190 °C etwa 60 Minuten garen. Danach zum Bräunen aufdecken und heiß servieren.",
  "Baking: about 60 minutes, followed by browning.":
    "Backzeit: etwa 60 Minuten, anschließend bräunen.",
  "A blend of palm oils, ghee flavouring, beta-carotene, and vitamins A and D.":
    "Mischung aus Palmölen, Ghee-Aroma, Beta-Carotin sowie den Vitaminen A und D.",
  "A blend of palm oils, Al-Kawakib flavouring, beta-carotene, and vitamins A and D.":
    "Mischung aus Palmölen, Al-Kawakib-Aroma, Beta-Carotin sowie den Vitaminen A und D.",
  "Palm oil, vitamins A and D3, flavouring, and beta-carotene.":
    "Palmöl, Vitamine A und D3, Aroma und Beta-Carotin.",
  "Palm oil, vitamins A and D, Al-Mumtaz flavouring, and beta-carotene.":
    "Palmöl, Vitamine A und D, Al-Mumtaz-Aroma und Beta-Carotin.",
  "Palm oil and vitamins A and D.": "Palmöl und die Vitamine A und D.",
  "Soybean oil and vitamins A and D.": "Sojaöl und die Vitamine A und D.",
  "VOIC was established in Nablus, beginning with olive-oil refining and packing.":
    "VOIC wurde in Nablus gegründet und begann mit der Raffination und Abfüllung von Olivenöl.",
  "Vegetable ghee production began, with technical expertise developed in cooperation with Dutch experts.":
    "Die Produktion von pflanzlichem Ghee begann; technisches Fachwissen wurde in Zusammenarbeit mit niederländischen Experten aufgebaut.",
  "The company expanded into liquid vegetable-oil refining and modernised factory equipment.":
    "Das Unternehmen erweiterte seine Tätigkeit um die Raffination flüssiger Pflanzenöle und modernisierte die Werksausstattung.",
  "Authentic flavour and products we are proud of.":
    "Authentischer Geschmack und Produkte, auf die wir stolz sind.",
  "Restaurants & professional kitchens": "Restaurants und professionelle Küchen",
  "Sweet shops": "Süßwarengeschäfte",
  Bakeries: "Bäckereien",
  "Distributors & importers": "Händler und Importeure",
  "How do I request a quotation?": "Wie fordere ich ein Angebot an?",
  "Specify products, sizes, approximate quantities and destination country, then contact the company team to discuss your request.":
    "Nennen Sie Produkte, Größen, ungefähre Mengen und Zielland und besprechen Sie Ihre Anfrage anschließend mit dem Unternehmen.",
  "Can I inquire about supply to Germany?": "Kann ich eine Lieferung nach Deutschland anfragen?",
  "You can name Germany or any requested destination in your inquiry and discuss supply feasibility and requirements directly with the company.":
    "Sie können Deutschland oder ein anderes gewünschtes Zielland angeben und Machbarkeit sowie Anforderungen direkt mit dem Unternehmen besprechen.",
  "Can I buy directly from the website?": "Kann ich direkt über die Website kaufen?",
  "The website introduces our products and helps you choose. Pricing and supply terms are discussed directly with the company.":
    "Die Website stellt die Produkte vor und unterstützt bei der Auswahl. Preise und Lieferbedingungen werden direkt mit dem Unternehmen besprochen.",
  "How do I obtain packaging and specification details?":
    "Wie erhalte ich Angaben zu Verpackung und Spezifikationen?",
  "Include the product name, required size and the technical information you need in your inquiry.":
    "Nennen Sie Produktname, gewünschte Größe und die benötigten technischen Angaben in Ihrer Anfrage.",
};
