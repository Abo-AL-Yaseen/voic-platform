# VOIC — SINGLE MASTER EXECUTION PROMPT

Continue inside THIS EXISTING VOIC Figma AI / Code Layer project. This is one complete assignment: finish the existing interfaces and implement all remaining agreed website pages as one connected, working design. Work through the phases below without stopping after each page. At the end, provide an honest completion report and stop for our review. Do not publish or deploy externally.

The current website and its approved visual identity are the starting point. DO NOT create a new Figma file, reset the project, replace the homepage, migrate frameworks, or import a replacement app. Inspect the current source and reuse the working components, assets, routing, product records, local fonts, filters, dialogs and comparison logic.

## 1. Product purpose and public voice

This is the proposed replacement corporate website for Vegetable Oil Industries Co. (VOIC), Nablus, Palestine. It introduces the company and helps home users, professional kitchens, distributors and prospective importers, including visitors in Germany, understand products and make commercial inquiries.

It is NOT a research report and NOT a supermarket. Do not show source lists, catalog page numbers, provenance badges, source conflicts, developer notes, uncertainty-status labels, invented availability badges, or mock implementation explanations to visitors. Retain provenance and unresolved questions ONLY in internal documents/data. Do not turn unknown facts into positive claims when hiding notes.

No public prices, cart, checkout, payment, invented minimum orders, lead times, shipping prices, Incoterms, German offices, import approvals, retailer logos, customer counts, reviews, health claims or sustainability certifications. A request for information is not an order. Germany is an audience, not evidence of established German distribution or approval.

Finish the website interfaces using the content bank included below. A finished interface does not mean the company's remaining commercial or formulation questions have been answered. Do not invent answers to make a page look full.

## 2. Existing baseline to preserve

The existing `/` and `/products` have been implemented. The catalog now contains 11 records. Preserve their actual IDs, existing query-param links, product image associations, and the four featured homepage products in their current order. The historically known IDs include `ghazal`, `kawakeb`, `nabateen`, and `ghazal-butter`; inspect the actual current IDs rather than replacing them with bank keys.

The existing /products page already supports search, category/brand/usage/size filters, sorting, chips/reset, details dialogs, and comparison of at most three products. Keep these behaviors. Current project reports say Alexandria fonts are hosted locally and the homepage bakery image is a catalog croissant photo; verify and retain these fixes instead of redoing them unnecessarily.

The latest screenshots show a cream-and-olive Arabic product presentation with a product-specific email inquiry CTA and no public research notes. Preserve that direction. Text in the bank is new editorial copy; do not restore removed research content.

## 3. First inspect, then execute

Inspect package.json, configuration, dependencies, route handling, App.tsx, ProductsPage.tsx, catalog.ts, Modal/shared components, stylesheets, public/assets, public/fonts and internal docs before editing. Use the actual package manager and existing scripts. Do not assume that generated design-reference code is the application source.

Keep a baseline copy/checkpoint of files being changed. Extract shared UI only as needed to support new pages. No framework migration, broad stylesheet rewrite, unnecessary dependency installation, or replacement of existing product IDs. Adapt the content bank to the current schema.

Implement in this dependency order: (1) reconcile content/assets and shared navigation, (2) finish homepage/catalog and full product template, (3) chooser, (4) business/contact, (5) about/quality, (6) recipes/detail template, (7) English localization and integration checks. This is an internal execution sequence, not a requirement to ask for approval between phases.

## 4. Visual system

Use existing actual tokens first. Reference palette: cream #FAF7E8, deep olive #4B5B35, muted olive #92985B, gold #D8B64C, pink #D75B91, ink #292624. Gold and pink are accents; packaging retains original colors. Keep original logo proportions and label artwork.

Use existing locally hosted Alexandria faces, `font-display: swap`, and the included font license. Do not reintroduce broken remote font dependencies or certificate-error workarounds. Preserve Arabic glyphs and the intended font weights.

Maintain editorial food-brand layouts: generous whitespace, strong hierarchy, authentic food/factory imagery, consistent container widths and buttons, restrained motifs. New pages should belong to the same system without making every section a card grid. About can be an image-led timeline; business an editorial overview plus inquiry; recipes food-led; chooser focused steps. Avoid excessive shadows, enormous empty cards, random gradients and disruptive motion.

Keep accessible contrast, semantic headings, visible keyboard focus, sensible reading order, reduced-motion behavior, descriptive image alternatives and non-color-only states.

Product photos: `object-fit: contain`, consistent visual slots, preserve transparency, no cropping or stretching labels. Food photos: `object-fit: cover` with intentional focal points. Never generate logo, packaging, certification or factory images. Reuse existing assets first; supplemental original URLs and asset references are in the bank. Recipe banners are original wide images: crop via layout/object positioning to emphasize the food on the right instead of importing their old banner text as new interface labels. Never use a screenshot of an existing page as the new page implementation.

Desktop at actual page widths 1280 and 1440 is primary. A narrower embedded Figma preview may show two columns; actual desktop catalog should show three when space supports it. Preserve functional narrower layouts without a separate mobile-app redesign. No horizontal document overflow.

## 5. Sitemap and navigation — complete every route

| Route                | Deliverable                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| `/`                  | Finish/preserve the approved homepage                                     |
| `/products`          | Complete the existing interactive catalog                                 |
| `/products/:slug`    | Shared full product-detail template covering all 11 records               |
| `/find-your-product` | Help Me Choose guided selection                                           |
| `/recipes`           | From Our Kitchen recipe collection                                        |
| `/recipes/:slug`     | Shared complete recipe-detail template covering the four supplied recipes |
| `/business`          | Professional kitchens, distribution and commercial inquiry                |
| `/about`             | Company story, timeline and quality approach                              |
| `/contact`           | Verified contact information and email preparation form                   |

Also provide an elegant not-found state and unknown-product/recipe handling. Do not add new investor portals, news feeds, recruitment portals, account systems or legal-policy pages with invented content.

Arabic default; implement a genuinely working EN/AR language switch on every completed route. Translate the supplied Arabic editorial text faithfully into clear business English, with no additional facts. Product English names/descriptions are already supplied. Set `lang` and RTL/LTR correctly, and preserve route, selected product and meaningful state when switching. Reuse the project's locale strategy; if none exists, a consistent `lang=en` query with shared translations is sufficient. Do not invent German translation or add a nonfunctional DE control.

Keep the header uncluttered: products, help me choose, recipes, our story, business, with a prominent contact CTA and language control. Original logo returns home. Active state must follow the route. Use a sensible compact navigation at reduced widths. Footer groups can hold the full sitemap, verified social links and contact details. Replace a research-catalog footer link with a product-navigation link; do not present raw research catalogs or the old website as authorities the visitor must consult.

Every visible CTA has a real destination or action. Preserve native links for navigation; support back/forward, refresh and deep links using the current navigation architecture. Do not add dead buttons or `href="#"` placeholders. Do not publish or change production domains.

## 6. Homepage

Preserve the existing hero, imagery, layout and four featured products. Keep headline `من نابلس، نكهات بتجمعنا` and heritage reference `منذ 1953`. This is editorial website copy, not a claim that it is the company's registered slogan.

Wire primary hero CTA to `/products`, secondary to `/find-your-product`. Usage cards lead to the matching catalog filters using the actual current filter vocabulary. Story CTA opens `/about`; business CTA `/business`; contact CTA `/contact`. Featured card quick views/deep links remain compatible. The recipe page is discoverable from navigation/footer without adding large new homepage sections that change its approved composition.

Check bakery imagery: use the original croissant asset, not kunafa. Do not increase featured cards when the catalog dataset grows. English homepage should preserve the composition while accommodating English text lengths.

## 7. Catalog and product details

Keep all 11 records. Bank `key` values are matching hints, NOT replacement IDs. Match by current ID/name/brand and preserve existing links. Add stable slugs as a separate field if needed. Each record has a public subset and private research metadata.

Cards: packshot or deliberate restrained branded image fallback, Arabic name, secondary English name in Arabic mode, product type, concise useful description, known sizes, details/quick view and comparison selector. Do not repeat verification badges. A missing-image fallback must not claim a future delivery date or imitate a real packshot. Unknown sizes/ingredients/storage/nutrition sections are simply absent, not displayed as “غير موثّق”.

Preserve search/filter behavior; search both languages and reasonable aliases. Normalize Arabic diacritics/tatweel and alef variants without conflating brands. Generate options from actual data, deduplicate, combine groups correctly, and update counts/chips/reset/sort live. Sort weights numerically across grams and kilograms; group volumes separately and NEVER convert L to kg. Unknown data must not be guessed from photographs. Handle invalid URL filters and product IDs gracefully.

Preserve details dialogs as quick views. Add a subtle `عرض صفحة المنتج` link within each dialog to the new full route. Do not silently replace the existing modal with navigation. `/products?product=<existing-id>` must continue opening the correct quick view.

Full product template: breadcrumb; product name/type; large packshot; about; supported uses; sizes and known packaging variants; supplied non-null ingredient text; optional verified storage/nutrition only if actually present; relevant related products/recipes; product-specific inquiry CTA. Omit unsupported sections rather than rendering empty tables. Keep liters as volume and kilograms/grams as weight in both languages. A 15 kg pack offered in two packaging formats is two variants of one product, not two unrelated cards.

Use the existing modal focus behavior, accessible naming, Escape closing and focus restoration. Make the modal header and close control accessible when content scrolls; do not clip the title or hide the close control above the viewport. Avoid unnecessary scrolling when content fits.

Comparison: maximum three unique records, selections survive filters. Compare name, type, supported uses, known sizes and packaging. Unknown values can be a neutral dash within a comparison table, not an invented value. No rankings, percentages or health comparisons. Reuse the same comparison component from chooser results if feasible.

Ingredient wording in the bank is editorial normalization of company materials, not a destination-market legal specification. Only use explicitly supplied non-null ingredient text; never infer allergens, vegan status, real dairy butter content, halal status or nutrition from a product name or flavor. Do not add generic “100% pure” claims from contradictory old copy. If an existing approved ingredient conflicts with the supplied field, leave it unrendered and record the issue internally.

## 8. Help Me Choose — `/find-your-product`

Create a polished deterministic three-step flow, not a chatbot and not an AI model/API.

Title: `خلّينا نساعدك تختار`
Subtitle: `احكيلنا عن استخدامك وحجم العبوة اللي بناسبك، وشوف الخيارات الأقرب لاحتياجك.`

Step 1: `بتختار للبيت ولا للشغل؟` — options `للبيت` and `لقطاع الأعمال`. This sets language/context, not a claim that products are exclusive to one audience.
Step 2: `شو الاستخدام الأساسي؟` — choices derived from the explicit product use tags in the bank: cooking, frying, traditional sweets/kunafa, baking/pastries, food-industry use where supported. Explain choices with short labels, not unsupported benefits. Do not add dietary or medical questions.
Step 3: `أي حجم عبوة بناسبك؟` — offer relevant exact known sizes or `ما عندي تفضيل` / `ساعدوني بخيارات التوريد`. Present only sizes of products matching the selected use. Distinguish weight from volume.

Show step number, selected state, back/next controls and progress. Next disabled until a required choice is made; changing an earlier choice invalidates an incompatible later size. “No preference” is a valid explicit choice. Support reset and editing answers from results.

Matching: filter by documented use first, then exact known size if selected. Use audience only as presentation context unless there is actual supporting data for a rule. Do not infer a product's use from oil type alone. Sun Gold has no established use tags and should not be recommended for an invented use. Do not claim “best”, guaranteed performance or suitability for allergies.

Results: product cards, supplied packshots, known sizes, short human reason such as `مناسب لتحضير الحلويات الشرقية، وبحجم 15 كغم الذي اخترته.` Reasons reference facts and the user's choices, never “the catalog says”. Provide quick view/full details, compare, and commercial inquiry for business users. For no exact matches show `ما لقينا تطابقًا لكل اختياراتك` with edit answers, view catalog and contact actions; do not silently relax criteria and present a false match. Any broader alternatives must be explicitly labeled.

## 9. Business — `/business`

Hero title: `منتجات تناسب حجم شغلك`
Intro: `خيارات من السمن والزيوت النباتية للمطاعم ومحلات الحلويات والمخابز والموزعين. تعرّف على المنتجات وأحجام التعبئة، وتواصل معنا لمناقشة احتياجات التوريد.`

Audience paths: restaurants/professional kitchens; sweet shops; bakeries; distributors/importers. These are intended customer pathways, not claims of existing customer relationships.

Use actual eligible product data to show professional packs and use-based links. Examples supported by known sizes: Al-Kawakib 15 kg tin/drum; Nabatin 15 kg tin; Balqa 15 kg without a disputed format label; Mumtaz 15 kg tin; Aseel 10/12.5 kg cartons; Kawkab soybean oil 16 kg PET. Do not invent pallet counts, container loads, case packs or custom/private-label services.

Inquiry section heading: `خلّينا نتعرّف على احتياجك`
Copy: `شاركنا المنتجات والأحجام والكميات التقريبية وبلد الوجهة، لبدء التواصل مع فريق الشركة.`

Provide a real, accessible inquiry-preparation form (no cart): name, company, email, country/destination, business type, product(s), desired known size or free-text need, estimated quantity with unit, and notes. Allow product selections to be prefilled from a product or chooser link. Do not set an invented minimum quantity. Required fields should be reasonable: contact name/email, company for business, destination and at least one product/topic. Estimated quantity can be optional.

Default submission action is `جهّز رسالة الاستفسار`, opening a correctly URL-encoded email to info@voic.ps with the collected details. Clearly state `يفتح تطبيق البريد لإرسال استفسارك`. Provide a copy-message fallback; report “copied” only after clipboard success. No fake HTTP submission, success toast claiming delivery, account registration or external form endpoint. A genuine supplied backend may be used only after inspection; never invent one.

FAQ:

- `كيف أطلب عرض سعر؟` → `حدّد المنتجات والأحجام والكميات التقريبية وبلد الوجهة، ثم تواصل مع فريق الشركة لمناقشة طلبك.`
- `هل يمكن الاستفسار عن التوريد إلى ألمانيا؟` → `يمكنك ذكر ألمانيا أو أي وجهة مطلوبة في استفسارك، ومناقشة إمكانية التوريد ومتطلباته مباشرة مع الشركة.`
- `هل أستطيع الشراء مباشرة من الموقع؟` → `الموقع يعرّفك بمنتجاتنا ويساعدك على الاختيار. يتم التواصل بشأن الأسعار وشروط التوريد مباشرة مع الشركة.`
- `كيف أحصل على تفاصيل التعبئة والمواصفات؟` → `اذكر اسم المنتج والحجم المطلوب في استفسارك، وأضف المعلومات الفنية التي تحتاجها.`

These answers must not imply guaranteed shipping, regulatory approval, a fixed quote response time or a completed sale.

## 10. About and Quality — `/about`

Use real factory/archive images and a restrained timeline. No stock-factory images, invented employee numbers, client counters or current production-capacity claims.

Title: `حكاية بدأت من نابلس`
Body: `تأسست شركة مصانع الزيوت النباتية عام 1953 في المنطقة الصناعية الشرقية بمدينة نابلس. بدأت مسيرتها بتكرير زيت الزيتون وتعبئته، ثم توسعت إلى إنتاج السمن النباتي وتكرير الزيوت النباتية السائلة. واليوم تضم مجموعتها علامات للسمن وزيوت الصويا والذرة ودوار الشمس.`

Three primary milestones:

- 1953: `تأسيس الشركة في نابلس، وبداية العمل في تكرير زيت الزيتون وتعبئته.`
- 1961: `بدء إنتاج السمن النباتي وتطوير الخبرات الفنية بالتعاون مع خبراء هولنديين.`
- 1985: `التوسع في تكرير الزيوت النباتية السائلة وتحديث تجهيزات المصنع.`

Vision: `نكهة أصيلة ومنتجات نعتزّ بها.`
Mission paragraph: `نعمل على تقديم السمن والزيوت النباتية وتطوير عملياتنا وبناء علاقات طويلة الأمد مع عملائنا، والمساهمة في الصناعة والاقتصاد الفلسطيني.`
These are editorial summaries of the company's stated direction, not invented exact quotations or legal slogans.

Quality heading: `الجودة في صميم عملنا`
Body: `نعتمد إدارة الجودة أساسًا لتطوير أعمالنا الفنية والإدارية ومتابعة جودة منتجاتنا، مع استمرار العمل على تحسين العمليات.`
CTA: `استفسر عن المواصفات ووثائق الجودة` → contact/business inquiry with quality-documents topic.

Default: do not display certification/award badges or validity dates. Historical materials and a company LinkedIn update reference ISO and taste awards, but complete current certificates with scope and dates were not supplied for publication. Do not use an FDA/HACCP/ISO/halal/EU badge as a generic marketing ornament. Do not publish withdrawn/expired/current-status accusations based on search snippets either. Record the need for current company-approved documentation internally.

## 11. Recipes — `/recipes` and `/recipes/:slug`

Title: `من مطبخنا`
Intro: `وصفات تجمعنا حول المائدة، من الحلويات إلى الأطباق اليومية.`

Build a complete initial recipe collection using the FOUR supplied records below. No lorem ipsum, fabricated kunafa recipe, fake chef, reviews or invented timings. The source company website has additional recipes, but some have missing quantities and contradictory instructions; do not fill them in speculatively.

Listing: real food imagery, title, category, short intro, relevant product tag only where the recipe explicitly uses it, search/category filters and working detail links. Avoid empty sections and invented “new” dates.

Detail: breadcrumb, title, food hero, intro, grouped ingredient checklist, numbered steps, only explicitly known time/rest/temperature facts, related product(s) where genuinely used, print action and related recipes. Recipe count/ingredient quantities are not serving counts. No serving yield is supplied: omit servings and total-time badges instead of guessing.

Implement an optional `الكمية الأساسية / نصف الكمية / ضعف الكمية` multiplier on numeric ingredient amounts, labeled as recipe quantity, NOT servings. Scale only quantified ingredients; preserve “حسب الحاجة/الذوق”, units, oven temperature and cooking/rest guidance. Do not convert cups to grams or assume a cup volume. Support reset to original quantities and readable print layout. A multiplier is not a guarantee that unchanged cooking time fits every batch.

Recipes include their specific product associations in the bank. The fish recipe uses olive oil but no named product from the 11-record catalog: do not fabricate a VOIC olive-oil record or label Reem as its original recipe ingredient. Hide the “product used” block for that recipe and offer a generic catalog link if useful.

Keep sources/recipe editorial notes internal. Public text should be the clean recipe edition, not a copied old page with author tags and publication metadata. Translate faithfully into English when switching languages.

## 12. Contact — `/contact`

Title: `خلّينا على تواصل`
Intro: `عندك سؤال عن منتج أو حاب تناقش احتياجات التوريد؟ تواصل معنا عبر القنوات التالية.`

Use verified details in the bank. Display telephone numbers/email with correct LTR isolation, `tel:`/`mailto:` links and matching accessible labels. Address is the eastern industrial area, Nablus, Palestine; do not invent office hours, sales representatives, additional branches, WhatsApp numbers or map coordinates.

Use a map-search link based on the company name/address rather than inventing a precise pin. A live embedded map is not required. Reuse the email-preparation form with consumer/business/general inquiry topics, optional company for consumers, and prefilled product context. User can inspect/edit text before opening their email application. No fake “message sent” confirmation.

Public contacts:

- `info@voic.ps`
- `+970 9 2324011`
- `+970 9 2324010`
- `المنطقة الصناعية الشرقية، نابلس، فلسطين`
- `صندوق بريد 95`
  Fax +970 9 2325036 can appear as secondary contact information, not the main CTA.

## 13. Interaction, performance and completion criteria

Use current architecture and small shared components. Route-specific titles, semantic main/sections, breadcrumbs and sensible focus movement are required. Preserve filters/modal query params and ensure refresh/back/forward work in the actual hosting environment. Unknown slugs show a useful not-found state, not a silently substituted product.

Reuse a shared inquiry builder and product lookup so copy/size edits propagate consistently. Do not duplicate the product catalog inside chooser/business/recipe components. Keep recipe numeric quantities as structured data. Do not hardcode recommendation result lists independent of supplied tags.

Use local static assets, proper dimensions, lazy loading below the fold, and sensible image sizes. No temporary Figma asset URLs in runtime code, no remote font failures, no certificate ignoring, no unnecessary animation or network-dependent hero. Missing assets must not break layout.

Run scripts that actually exist for formatting, type-checking and production build. Add only useful tests for newly introduced behavior. Verify in a real browser if available, especially:

- Homepage composition/four-card order, correct bakery imagery and CTA routes.
- Catalog 11 records, Arabic/English search, combined filters/counts, reset, numeric sizes, empty states.
- Old product query deep links and all new full-product routes.
- Comparison max three and state persistence through filtering.
- Dialog keyboard containment, Escape, focus restoration, close-button visibility and back behavior.
- Chooser every branch, exact size match, previous/reset, empty result and no unsupported recommendations.
- Business/contact prefill, required-field errors, mailto recipient/subject/body encoding, copy fallback and no fake send state.
- Recipe routes, real images, ingredient checklist, multipliers, print and no invented total times/yields.
- EN/AR on EVERY completed page, layout direction, no untranslated action labels, numeric/email isolation.
- 1280px and 1440px actual viewport plus a basic narrow-width smoke check. No clipped modals, overflow or unreadable long English names.
- Font files actually loaded and correct Arabic rendering, local images and console/network health.

If browser/build/assets are inaccessible, report exactly which verification failed or was not run. Do not claim all checks passed merely because code compiled.

Finish ALL routes above. If a resource is unavailable, finish the route with graceful omission of that optional data and list the blocker internally; do not stop at a plan or leave placeholder routes. Then provide: completed routes, changed files, content/assets added, checks actually run, any remaining company-data questions and any technical limitations. Do not deploy, publish, send emails or submit real inquiries.

---

# CONTENT BANK — PUBLIC DATA AND INTERNAL RESEARCH METADATA

Everything marked `internal`, `internalSource`, `internalNotes`, or source mapping is for development only. DO NOT render those fields or expose the research documents through the visitor navigation. Public Arabic and English descriptions are supplied editorial drafts grounded in the company materials, not invented company quotations.

Bank keys are logical matching references. Match them to current IDs; do not overwrite current IDs or blindly append duplicates. Bank omissions are deliberate: preserve already approved data only when there is exact supporting evidence; record unresolved discrepancies internally.

## PRODUCT RECORDS

```json
[
  {
    "key": "ghazal",
    "nameAr": "الغزال",
    "nameEn": "Al-Ghazal",
    "category": "vegetable-ghee",
    "descriptionAr": "سمن نباتي للطبخ وتحضير الحلويات والمخبوزات، بأحجام تناسب استخدامات المطبخ المنزلي.",
    "descriptionEn": "Vegetable ghee for cooking, sweets and baking, with pack sizes suited to home kitchens.",
    "uses": ["cooking", "oriental-sweets", "baking"],
    "sizes": [
      {
        "value": 1,
        "unit": "L"
      },
      {
        "value": 2,
        "unit": "kg"
      }
    ],
    "packaging": [
      {
        "size": "1 L",
        "type": "tin"
      },
      {
        "size": "2 kg",
        "type": "tin"
      }
    ],
    "ingredientsAr": "زيت نخيل، فيتامينا أ ود3، نكهة، بيتا كاروتين.",
    "storage": null,
    "shelfLife": null,
    "nutrition": null,
    "internal": {
      "sources": [
        {
          "document": "EN Catalog 4.pdf",
          "page": 3
        },
        {
          "document": "catalouge 71 years final 2025.pdf",
          "page": 5
        },
        {
          "url": "https://voic.ps/index.php/en/products/ghee/al-gazal"
        }
      ],
      "notes": [
        "Normalize the catalog ingredient wording without claiming 100% finished-product palm-oil purity. The old website additionally lists 1,2,7,15 kg tins and 20 kg carton; do not combine as current sizes. Vitamin D3 is from 2025 catalog. No vegan/dairy-free/trans-fat-free claims."
      ],
      "availability": "No current stock or production guarantee; do not render research status publicly.",
      "ingredientDisplayPolicy": "Display supplied concise ingredients only under المكونات, without purity %, health/allergen claims or nutritional completeness; exact destination-market label/specification requires company approval. If existing approved data conflicts, keep the field hidden and flag internally."
    }
  },
  {
    "key": "kawakeb",
    "nameAr": "الكواكب",
    "nameEn": "Al-Kawakib",
    "category": "vegetable-ghee",
    "descriptionAr": "سمن نباتي للطبخ والحلويات الشرقية، يرتبط بمذاق الكنافة النابلسية ويتوفر بخيارات تعبئة منزلية ومهنية.",
    "descriptionEn": "Vegetable ghee for cooking and traditional sweets, associated with Nabulsi kunafa and offered in household and professional pack formats.",
    "uses": ["cooking", "oriental-sweets", "kunafa"],
    "sizes": [
      {
        "value": 2,
        "unit": "kg"
      },
      {
        "value": 15,
        "unit": "kg"
      }
    ],
    "packaging": [
      {
        "size": "2 kg",
        "type": "tin"
      },
      {
        "size": "15 kg",
        "type": "tin"
      },
      {
        "size": "15 kg",
        "type": "drum"
      }
    ],
    "ingredientsAr": "مزيج من زيوت النخيل، نكهة الكواكب، بيتا كاروتين، فيتامينا أ ود.",
    "storage": null,
    "shelfLife": null,
    "nutrition": null,
    "internal": {
      "sources": [
        {
          "document": "EN Catalog 4.pdf",
          "page": 4
        },
        {
          "document": "catalouge 71 years final 2025.pdf",
          "page": 7
        },
        {
          "url": "https://voic.ps/index.php/en/products/ghee/product-alkawakeb"
        }
      ],
      "notes": [
        "2025 page shows only 15 kg formats; English catalog and website support 2 kg tin. Do not confuse with soybean oil."
      ],
      "availability": "No current stock or production guarantee; do not render research status publicly.",
      "ingredientDisplayPolicy": "Display supplied concise ingredients only under المكونات, without purity %, health/allergen claims or nutritional completeness; exact destination-market label/specification requires company approval. If existing approved data conflicts, keep the field hidden and flag internally."
    }
  },
  {
    "key": "nabateen",
    "nameAr": "النباتين",
    "nameEn": "Al-Nabatin",
    "category": "vegetable-ghee",
    "descriptionAr": "سمن نباتي للطبخ والحلويات الشرقية والغربية والمخبوزات، بأحجام صغيرة وعبوة مهنية 15 كغم.",
    "descriptionEn": "Vegetable ghee for cooking, Eastern and Western desserts and baking, in small packs and a 15 kg professional format.",
    "uses": ["cooking", "oriental-sweets", "western-desserts", "baking"],
    "sizes": [
      {
        "value": 850,
        "unit": "g"
      },
      {
        "value": 1.7,
        "unit": "kg"
      },
      {
        "value": 15,
        "unit": "kg"
      }
    ],
    "packaging": [
      {
        "size": "850 g",
        "type": "tin"
      },
      {
        "size": "1.7 kg",
        "type": "tin"
      },
      {
        "size": "15 kg",
        "type": "tin"
      }
    ],
    "ingredientsAr": null,
    "storage": null,
    "shelfLife": null,
    "nutrition": null,
    "internal": {
      "sources": [
        {
          "document": "EN Catalog 4.pdf",
          "page": 5
        },
        {
          "document": "catalouge 71 years final 2025.pdf",
          "page": 6
        },
        {
          "url": "https://voic.ps/index.php/en/products/ghee/product-nabateen"
        }
      ],
      "notes": [
        "Alias نباتين, Nabateen, Nabatin. 2025 lists a variable oil blend including palm, coconut, sunflower and sometimes cottonseed plus A/D and an ambiguous Vegetarian Butter phrase. Keep full formulation internal pending company approval. Old website adds 21 kg carton+PE; not in public size set. Baking is supported by website and catalog imagery; no assertion of identical results to dairy butter."
      ],
      "availability": "No current stock or production guarantee; do not render research status publicly.",
      "ingredientDisplayPolicy": "Display supplied concise ingredients only under المكونات, without purity %, health/allergen claims or nutritional completeness; exact destination-market label/specification requires company approval. If existing approved data conflicts, keep the field hidden and flag internally."
    }
  },
  {
    "key": "balqa",
    "nameAr": "البلقاء",
    "nameEn": "Al-Balqa",
    "category": "vegetable-ghee",
    "descriptionAr": "سمن نباتي للطبخ والحلويات الشرقية، بعبوة 15 كغم تناسب التحضير بكميات كبيرة.",
    "descriptionEn": "Vegetable ghee for cooking and traditional sweets, in a 15 kg pack for larger-batch preparation.",
    "uses": ["cooking", "oriental-sweets"],
    "sizes": [
      {
        "value": 15,
        "unit": "kg"
      }
    ],
    "packaging": [],
    "ingredientsAr": "مزيج من زيوت النخيل، نكهة السمن، بيتا كاروتين، فيتامينا أ ود.",
    "storage": null,
    "shelfLife": null,
    "nutrition": null,
    "internal": {
      "sources": [
        {
          "document": "EN Catalog 4.pdf",
          "page": 6
        },
        {
          "document": "catalouge 71 years final 2025.pdf",
          "page": 8
        },
        {
          "url": "https://voic.ps/index.php/en/products/ghee/albalka"
        }
      ],
      "notes": [
        "Omit exact packaging descriptor: catalog says barrel; website tin. Ingredients describe a ghee flavor, not confirmed dairy content. The source mentions Al-Haloub flavor; do not infer milk-free/vegan status."
      ],
      "availability": "No current stock or production guarantee; do not render research status publicly.",
      "ingredientDisplayPolicy": "Display supplied concise ingredients only under المكونات, without purity %, health/allergen claims or nutritional completeness; exact destination-market label/specification requires company approval. If existing approved data conflicts, keep the field hidden and flag internally."
    }
  },
  {
    "key": "ghazal-butter",
    "nameAr": "الغزال بنكهة الزبدة",
    "nameEn": "Al-Ghazal Butter Flavor",
    "category": "vegetable-ghee",
    "descriptionAr": "سمن نباتي بنكهة الزبدة لتحضير الحلويات والطبخ المنزلي، بعبوة 455 غم.",
    "descriptionEn": "Butter-flavored vegetable ghee for desserts and home cooking, in a 455 g tin.",
    "uses": ["cooking", "desserts"],
    "sizes": [
      {
        "value": 455,
        "unit": "g"
      }
    ],
    "packaging": [
      {
        "size": "455 g",
        "type": "tin"
      }
    ],
    "ingredientsAr": "مزيج من زيوت النخيل، نكهة السمن، بيتا كاروتين، فيتامينا أ ود.",
    "storage": null,
    "shelfLife": null,
    "nutrition": null,
    "internal": {
      "sources": [
        {
          "document": "EN Catalog 4.pdf",
          "page": 7
        },
        {
          "document": "catalouge 71 years final 2025.pdf",
          "page": 9
        }
      ],
      "notes": [
        "Preserve approved existing Butter Flavor name. The older catalog/packshot uses wording referring to animal-ghee flavor; do not claim real butter, vegan, dairy-free or lactose-free. Same Al-Ghazal brand, separate flavor record."
      ],
      "availability": "No current stock or production guarantee; do not render research status publicly.",
      "ingredientDisplayPolicy": "Display supplied concise ingredients only under المكونات, without purity %, health/allergen claims or nutritional completeness; exact destination-market label/specification requires company approval. If existing approved data conflicts, keep the field hidden and flag internally."
    }
  },
  {
    "key": "mumtaz",
    "nameAr": "الممتاز",
    "nameEn": "Al-Mumtaz",
    "category": "vegetable-ghee",
    "descriptionAr": "سمن نباتي للطبخ وتحضير الحلويات، بخيار تعبئة 15 كغم للمطابخ المهنية والتحضير بكميات كبيرة.",
    "descriptionEn": "Vegetable ghee for cooking and sweets, with a 15 kg tin for professional kitchens and larger batches.",
    "uses": ["cooking", "desserts"],
    "sizes": [
      {
        "value": 15,
        "unit": "kg"
      }
    ],
    "packaging": [
      {
        "size": "15 kg",
        "type": "tin"
      }
    ],
    "ingredientsAr": "زيت نخيل، فيتامينا أ ود، نكهة الممتاز، بيتا كاروتين.",
    "storage": null,
    "shelfLife": null,
    "nutrition": null,
    "internal": {
      "sources": [
        {
          "url": "https://voic.ps/index.php/en/products/ghee/product-mumtaz"
        }
      ],
      "notes": [],
      "availability": "No current stock or production guarantee; do not render research status publicly.",
      "ingredientDisplayPolicy": "Display supplied concise ingredients only under المكونات, without purity %, health/allergen claims or nutritional completeness; exact destination-market label/specification requires company approval. If existing approved data conflicts, keep the field hidden and flag internally."
    }
  },
  {
    "key": "aseel",
    "nameAr": "الأصيل",
    "nameEn": "Al-Aseel",
    "category": "vegetable-ghee",
    "descriptionAr": "سمن نباتي للطبخ والحلويات والخبز والكعك والبسكويت، بخيارات تعبئة 10 و12.5 كغم.",
    "descriptionEn": "Vegetable ghee for cooking, sweets, bread, cakes and biscuits, in 10 kg and 12.5 kg cartons.",
    "uses": ["cooking", "desserts", "baking"],
    "sizes": [
      {
        "value": 10,
        "unit": "kg"
      },
      {
        "value": 12.5,
        "unit": "kg"
      }
    ],
    "packaging": [
      {
        "size": "10 kg",
        "type": "carton"
      },
      {
        "size": "12.5 kg",
        "type": "carton"
      }
    ],
    "ingredientsAr": "زيت نخيل، فيتامينا أ ود.",
    "storage": null,
    "shelfLife": null,
    "nutrition": null,
    "internal": {
      "sources": [
        {
          "url": "https://voic.ps/index.php/en/products/ghee/product-alaseel"
        },
        {
          "url": "https://www.voic.ps/index.php/ar/"
        }
      ],
      "notes": [
        "Do not infer that this is an olive oil from the inconsistent Arabic navigation. The current catalog record is ghee/shortening."
      ],
      "availability": "No current stock or production guarantee; do not render research status publicly.",
      "ingredientDisplayPolicy": "Display supplied concise ingredients only under المكونات, without purity %, health/allergen claims or nutritional completeness; exact destination-market label/specification requires company approval. If existing approved data conflicts, keep the field hidden and flag internally."
    }
  },
  {
    "key": "kawkab-soybean",
    "nameAr": "الكوكب — زيت صويا",
    "nameEn": "Al-Kawkab Soybean Oil",
    "category": "soybean-oil",
    "descriptionAr": "زيت صويا للقلي والطبخ، موجّه أيضًا لاستخدامات الصناعات الغذائية، بعبوة 16 كغم.",
    "descriptionEn": "Soybean oil for frying and cooking, also intended for food-industry use, in a 16 kg PET pack.",
    "uses": ["cooking", "frying", "food-industry"],
    "sizes": [
      {
        "value": 16,
        "unit": "kg"
      }
    ],
    "packaging": [
      {
        "size": "16 kg",
        "type": "PET"
      }
    ],
    "ingredientsAr": "زيت فول الصويا، فيتامينا أ ود.",
    "storage": null,
    "shelfLife": null,
    "nutrition": null,
    "internal": {
      "sources": [
        {
          "url": "https://voic.ps/index.php/en/products/soya-oil/product-alkawakeb-oil"
        }
      ],
      "notes": [
        "Weight is 16 kg, not 16 L. Image filename kawakeb.png is misleading but actual image is yellow jerrycan matching this oil."
      ],
      "availability": "No current stock or production guarantee; do not render research status publicly.",
      "ingredientDisplayPolicy": "Display supplied concise ingredients only under المكونات, without purity %, health/allergen claims or nutritional completeness; exact destination-market label/specification requires company approval. If existing approved data conflicts, keep the field hidden and flag internally."
    }
  },
  {
    "key": "ghazalein-corn",
    "nameAr": "الغزالين — زيت ذرة",
    "nameEn": "Al-Ghazalein Corn Oil",
    "category": "corn-oil",
    "descriptionAr": "زيت ذرة للطبخ والقلي وتحضير السلطات والمعجنات، من مجموعة الزيوت النباتية السائلة.",
    "descriptionEn": "Corn oil for cooking, frying, salad dressings and pastries, from the liquid vegetable oil range.",
    "uses": ["cooking", "frying", "salads", "pastry"],
    "sizes": [],
    "packaging": [],
    "ingredientsAr": null,
    "storage": null,
    "shelfLife": null,
    "nutrition": null,
    "internal": {
      "sources": [
        {
          "url": "https://voic.ps/index.php/en/"
        },
        {
          "url": "https://www.voic.ps/index.php/ar/recipes/152-2018-05-19-12-27-00"
        }
      ],
      "notes": [
        "Detail page redirects; do not infer pack sizes from photograph or a competitor. Uses are explicitly on company homepage; recipe confirms culinary use."
      ],
      "availability": "No current stock or production guarantee; do not render research status publicly.",
      "ingredientDisplayPolicy": "Display supplied concise ingredients only under المكونات, without purity %, health/allergen claims or nutritional completeness; exact destination-market label/specification requires company approval. If existing approved data conflicts, keep the field hidden and flag internally."
    }
  },
  {
    "key": "reem-sunflower",
    "nameAr": "ريم — زيت دوار الشمس",
    "nameEn": "Reem Sunflower Oil",
    "category": "sunflower-oil",
    "descriptionAr": "زيت دوار الشمس للطبخ والقلي وتحضير الحلويات، وللوصفات اليومية مثل القدرة والشيشبرك.",
    "descriptionEn": "Sunflower oil for cooking, frying and sweets, including everyday dishes such as qidra and shishbarak.",
    "uses": ["cooking", "frying", "desserts"],
    "sizes": [],
    "packaging": [],
    "ingredientsAr": null,
    "storage": null,
    "shelfLife": null,
    "nutrition": null,
    "internal": {
      "sources": [
        {
          "url": "https://voic.ps/index.php/en/"
        },
        {
          "url": "https://voic.ps/index.php/en/products/sunflower-oil/product-reem"
        },
        {
          "url": "https://www.voic.ps/index.php/ar/recipes/155-2018-05-27-09-20-09"
        }
      ],
      "notes": [
        "Earlier accessible company page listed 1,3,5,16 L PET, but current detail page redirects. Keep these as research candidates, do not silently override the current omission without company/accessible exact evidence. Do not read sizes from packshot."
      ],
      "availability": "No current stock or production guarantee; do not render research status publicly.",
      "ingredientDisplayPolicy": "Display supplied concise ingredients only under المكونات, without purity %, health/allergen claims or nutritional completeness; exact destination-market label/specification requires company approval. If existing approved data conflicts, keep the field hidden and flag internally."
    }
  },
  {
    "key": "sun-gold-sunflower",
    "nameAr": "صن غولد — زيت دوار الشمس",
    "nameEn": "Sun Gold Sunflower Oil",
    "category": "sunflower-oil",
    "descriptionAr": "زيت دوار الشمس من علامة صن غولد، ضمن مجموعة الزيوت النباتية السائلة.",
    "descriptionEn": "Sunflower oil under the Sun Gold brand, part of the liquid vegetable oil range.",
    "uses": [],
    "sizes": [],
    "packaging": [],
    "ingredientsAr": null,
    "storage": null,
    "shelfLife": null,
    "nutrition": null,
    "internal": {
      "sources": [
        {
          "url": "https://voic.ps/index.php/en/products/sunflower-oil/sungold"
        }
      ],
      "notes": [
        "Aliases صن جولد, Sun Gold, Sungold. No original packshot recovered. Old size text 1, is incomplete; do not infer 1 L. No usage recommendation rule until a specific supported use is supplied."
      ],
      "availability": "No current stock or production guarantee; do not render research status publicly.",
      "ingredientDisplayPolicy": "Display supplied concise ingredients only under المكونات, without purity %, health/allergen claims or nutritional completeness; exact destination-market label/specification requires company approval. If existing approved data conflicts, keep the field hidden and flag internally."
    }
  }
]
```

## RECIPE RECORDS

```json
[
  {
    "slug": "semolina-maamoul",
    "titleAr": "معمول السميد بالتمر",
    "titleEn": "Date-filled Semolina Maamoul",
    "category": "sweets-baking",
    "descriptionAr": "معمول بحشوة التمر ولمسة المحلب، مع سمن النباتين.",
    "productKeys": ["nabateen"],
    "image": "assets/recipe-maamoul.jpg",
    "ingredientsAr": [
      "1 كغم سميد ناعم",
      "2 ملعقة كبيرة محلب مطحون",
      "3 أكواب سمن النباتين",
      "1 ملعقة كبيرة خميرة فورية",
      "1 كوب حليب كامل الدسم دافئ",
      "400 غم تمر مهروس",
      "2 ملعقة صغيرة جوزة الطيب",
      "1 ملعقة كبيرة قرفة",
      "زيت زيتون للحشوة حسب الحاجة",
      "سكر بودرة للتقديم حسب الرغبة"
    ],
    "stepsAr": [
      "افرك السميد بالمحلب والسمن، ثم غطّه واتركه أربع ساعات.",
      "أضف الخميرة والحليب بالتدريج واعجن حتى تتكوّن عجينة طرية.",
      "حضّر حشوة التمر مع القرفة وجوزة الطيب وقليل من الزيت.",
      "قسّم العجين واحشه بالتمر، وشكّل الحبات بالقالب. اتركها ترتاح 15 دقيقة.",
      "اخبز على 175°م لمدة 15–20 دقيقة مع متابعة اللون، ثم برّد الحبات وقدّمها مع السكر حسب الرغبة."
    ],
    "knownTimeAr": "راحة العجين: 4 ساعات، ثم 15 دقيقة بعد التشكيل. الخبز: 15–20 دقيقة.",
    "temperatureC": 175,
    "yield": null,
    "internalSource": "https://www.voic.ps/index.php/ar/recipes/159-2018-06-12-19-02-40",
    "internalNotes": [
      "A concise date-filling variant of the company recipe; original also offers walnut filling. Ingredient list says ghee while one instruction says butter; this edition follows the explicit three-cup Nabateen ingredient. Source does not specify output servings, cup volume or total prep time."
    ]
  },
  {
    "slug": "qidra-with-lamb",
    "titleAr": "القدرة باللحم",
    "titleEn": "Qidra with Lamb",
    "category": "main-dishes",
    "descriptionAr": "أرز ولحم وحمص، مع زيت نباتي وسمن النباتين.",
    "productKeys": ["nabateen", "reem-sunflower", "ghazalein-corn"],
    "image": "assets/recipe-qidra-lamb.jpg",
    "ingredientsAr": [
      "2 كوب أرز بسمتي",
      "1 كغم لحم",
      "1 كوب حمص مسلوق",
      "½ كوب زيت ريم أو الغزالين",
      "1 ملعقة كبيرة سمن النباتين",
      "2 لتر ماء",
      "2 بصلة مفرومة و2 بصلة شرائح",
      "3 ملاعق كبيرة ثوم مهروس",
      "1 مكعب مرق دجاج",
      "2 ورقة غار",
      "½ ملعقة صغيرة كمون",
      "1 ملعقة صغيرة كركم و1 ملعقة صغيرة حب هال",
      "1 ملعقة كبيرة هال مطحون",
      "ملح وفلفل أسود حسب الذوق"
    ],
    "stepsAr": [
      "شوّح البصل المفروم بنصف الزيت، وأضف اللحم والغار وحب الهال. اسكب الماء واترك اللحم حتى ينضج، ثم احفظ المرق.",
      "حمّر شرائح البصل ببقية الزيت وقلّب معها الحمص والكمون والفلفل.",
      "تبّل الأرز بالثوم والكركم والهال المطحون والملح. رتّب نصفه ثم خليط الحمص ثم بقية الأرز.",
      "أضف مكعب المرق وأربعة أكواب من مرق اللحم المصفّى. ابدأ بالغليان ثم خفّف النار حتى ينضج الأرز.",
      "وزّع السمن فوق الأرز وغطّه ليذوب، ثم قدّم الأرز مع اللحم."
    ],
    "knownTimeAr": null,
    "temperatureC": null,
    "yield": null,
    "internalSource": "https://www.voic.ps/index.php/ar/recipes/152-2018-05-19-12-27-00",
    "internalNotes": [
      "Use this specific lamb recipe, not the separate chicken/qidra page whose image filename says bulgur. Serving yield and total cooking time are not supplied. Optional garnish omitted because source did not quantify it."
    ]
  },
  {
    "slug": "shishbarak-with-yogurt",
    "titleAr": "شيشبرك باللبن",
    "titleEn": "Shishbarak with Yogurt",
    "category": "main-dishes",
    "descriptionAr": "عجينة محشوة باللحم، تُقدّم مع اللبن والثوم والكزبرة.",
    "productKeys": ["reem-sunflower"],
    "image": "assets/recipe-shishbarak.jpg",
    "ingredientsAr": [
      "500 غم لحم مفروم",
      "2 كوب دقيق منخول",
      "1 بصلة صغيرة مفرومة",
      "2 ملعقة كبيرة زيت ريم للحشوة",
      "½ ملعقة كبيرة زيت للثوم والكزبرة",
      "1 ملعقة صغيرة جوزة الطيب",
      "ملح وبهارات حسب الذوق",
      "1 كغم لبن",
      "2 ملعقة كبيرة كزبرة مفرومة",
      "1 فص ثوم مفروم",
      "3 ملاعق كبيرة نشا مذابة في ½ كوب ماء",
      "ماء للعجين حسب الحاجة"
    ],
    "stepsAr": [
      "اعجن الدقيق والملح بماء يضاف تدريجيًا. غطّ العجين وبرّده 30 دقيقة.",
      "قلّب البصل في الزيت، ثم أضف اللحم والبهارات وجوزة الطيب واطبخ الحشوة حتى تنضج.",
      "افرد العجين وقطّعه دوائر، واحشها وأغلقها بشكل الشيشبرك.",
      "رتّبها على صينية مدهونة قليلًا، واخبز عند 180°م نحو 10 دقائق مع متابعة التحمير.",
      "حرّك اللبن مع النشا على نار متوسطة حتى يثخن. قلّب الثوم والكزبرة بالزيت وأضفهما إلى اللبن، ثم قدّم مع الشيشبرك."
    ],
    "knownTimeAr": "تبريد العجين: 30 دقيقة. خبز الحبات: نحو 10 دقائق.",
    "temperatureC": 180,
    "yield": null,
    "internalSource": "https://www.voic.ps/index.php/ar/recipes/155-2018-05-27-09-20-09",
    "internalNotes": [
      "The source separately adds half a tablespoon of oil for aromatics; keep it explicit instead of silently counting it within the two tablespoons. Do not present bake time as total preparation time."
    ]
  },
  {
    "slug": "fish-with-vegetables",
    "titleAr": "صينية سمك بالخضروات",
    "titleEn": "Baked Fish with Vegetables",
    "category": "main-dishes",
    "descriptionAr": "سمك بالفرن مع الخضروات والليمون والثوم والبهارات.",
    "productKeys": [],
    "image": "assets/recipe-fish.jpg",
    "ingredientsAr": [
      "4 سمكات متوسطة",
      "1 كوب بقدونس مفروم، وقليل للتزيين",
      "¼ كوب عصير ليمون",
      "2 ملعقة كبيرة زيت زيتون",
      "6 فصوص ثوم مهروس",
      "1 ملعقة صغيرة من كل من الكركم والكمون والبابريكا والملح",
      "½ ملعقة صغيرة زعفران و½ ملعقة صغيرة فلفل أسود",
      "1 قرن فلفل حار شرائح",
      "3 حبات جزر كبيرة شرائح",
      "4 أوراق غار",
      "1 ليمونة شرائح",
      "1 بصلة شرائح",
      "2 فلفل أخضر حلو مكعبات",
      "1 طماطم مقشرة ومفرومة"
    ],
    "stepsAr": [
      "حضّر السمك ونظّفه وصفّه. اخلط العصير والزيت والثوم والبقدونس والتوابل.",
      "تبّل السمك من الداخل والخارج، وضع ورقة غار داخل كل سمكة.",
      "وزّع جزءًا من الخضروات والليمون في الصينية، ثم السمك وبقية الخضروات والطماطم والتتبيلة.",
      "غطّ الصينية بورق الألمنيوم واخبزها على 190°م نحو 60 دقيقة حتى النضج، ثم اكشفها للتحمير وقدّمها ساخنة."
    ],
    "knownTimeAr": "الخبز: نحو 60 دقيقة، ثم التحمير.",
    "temperatureC": 190,
    "yield": null,
    "internalSource": "https://www.voic.ps/index.php/ar/recipes/157-2018-06-04-22-51-13",
    "internalNotes": [
      "Original recipe uses olive oil and names no VOIC product. Do not substitute a product or invent an olive-oil product. Omit the recipe-used-product block; a general product browsing CTA is acceptable. Fish count is not a verified serving yield."
    ]
  }
]
```

## CONTACT RECORD

```json
{
  "email": "info@voic.ps",
  "phones": ["+97092324011", "+97092324010"],
  "fax": "+97092325036",
  "addressAr": "المنطقة الصناعية الشرقية، نابلس، فلسطين",
  "addressEn": "Eastern Industrial Area, Nablus, Palestine",
  "poBox": "95",
  "social": {
    "Facebook": "https://www.facebook.com/voic.ltd/",
    "Instagram": "https://www.instagram.com/voic.ltd",
    "LinkedIn": "https://www.linkedin.com/company/voic.ltd",
    "YouTube": "https://www.youtube.com/channel/UC8e5D0aCpBfFB66q-_xRp3A",
    "X": "https://twitter.com/voicLtd",
    "Telegram": "https://t.me/voicltd",
    "TikTok": "https://tiktok.com/@voic.ltd"
  }
}
```

## ORIGINAL ASSET MAP — INTERNAL

```json
[
  {
    "file": "assets/recipe-maamoul.jpg",
    "url": "https://www.voic.ps/images/Recipes/معمول.jpg",
    "dimensions": [1589, 579],
    "status": "downloaded"
  },
  {
    "file": "assets/recipe-shishbarak.jpg",
    "url": "https://www.voic.ps/images/Recipes/ششبرك.jpg",
    "dimensions": [1589, 579],
    "status": "downloaded"
  },
  {
    "file": "assets/recipe-qidra-lamb.jpg",
    "url": "https://www.voic.ps/images/Recipes/اليوم_الثالث_-_قدرة.jpg",
    "dimensions": [1589, 579],
    "status": "downloaded"
  },
  {
    "file": "assets/recipe-fish.jpg",
    "url": "https://www.voic.ps/images/Recipes/سمك.jpg",
    "dimensions": [1589, 579],
    "status": "downloaded"
  },
  {
    "file": "assets/history-1954.jpg",
    "url": "https://voic.ps/images/history/1954.jpg",
    "dimensions": [674, 676],
    "status": "downloaded"
  },
  {
    "file": "assets/history-1961.jpg",
    "url": "https://voic.ps/images/history/1961.jpg",
    "dimensions": [676, 676],
    "status": "downloaded"
  },
  {
    "file": "assets/history-2016.jpg",
    "url": "https://voic.ps/images/history/2016.jpg",
    "dimensions": [500, 500],
    "status": "downloaded"
  },
  {
    "file": "assets/product-aseel.png",
    "url": "https://voic.ps/images/virtuemart/product/aseel6.png",
    "dimensions": [500, 334],
    "status": "downloaded"
  },
  {
    "file": "assets/product-mumtaz.png",
    "url": "https://voic.ps/images/virtuemart/product/mumtaz.png",
    "dimensions": [1187, 1187],
    "status": "downloaded"
  },
  {
    "file": "assets/product-kawkab.png",
    "url": "https://voic.ps/images/virtuemart/product/kawakeb.png",
    "dimensions": [1187, 1187],
    "status": "downloaded"
  },
  {
    "file": "assets/product-ghazalein.png",
    "url": "https://voic.ps/images/ghazaleen_oil.png",
    "dimensions": [800, 800],
    "status": "downloaded"
  },
  {
    "file": "assets/product-reem.png",
    "url": "https://voic.ps/images/reem_oil.png",
    "dimensions": [1426, 1341],
    "status": "downloaded"
  },
  {
    "file": "assets/ghazal-packshot.png",
    "sourceDocument": "EN Catalog 4.pdf",
    "page": 3,
    "pdfImageXref": 178,
    "dimensions": [676, 650],
    "softMaskPreserved": true,
    "status": "extracted"
  },
  {
    "file": "assets/kawakib-packshot.png",
    "sourceDocument": "EN Catalog 4.pdf",
    "page": 4,
    "pdfImageXref": 189,
    "dimensions": [1424, 1050],
    "softMaskPreserved": false,
    "status": "extracted"
  },
  {
    "file": "assets/nabatin-packshot.png",
    "sourceDocument": "EN Catalog 4.pdf",
    "page": 5,
    "pdfImageXref": 195,
    "dimensions": [582, 562],
    "softMaskPreserved": true,
    "status": "extracted"
  },
  {
    "file": "assets/balqa-packshot.png",
    "sourceDocument": "EN Catalog 4.pdf",
    "page": 6,
    "pdfImageXref": 204,
    "dimensions": [650, 637],
    "softMaskPreserved": true,
    "status": "extracted"
  },
  {
    "file": "assets/butter-flavor-packshot.png",
    "sourceDocument": "EN Catalog 4.pdf",
    "page": 7,
    "pdfImageXref": 209,
    "dimensions": [690, 538],
    "softMaskPreserved": true,
    "status": "extracted"
  },
  {
    "file": "assets/bakery-croissant.png",
    "sourceDocument": "catalouge 71 years final 2025.pdf",
    "page": 2,
    "pdfImageXref": 4385,
    "dimensions": [1177, 785],
    "softMaskPreserved": false,
    "status": "extracted"
  },
  {
    "file": "assets/factory-panorama.png",
    "sourceDocument": "catalouge 71 years final 2025.pdf",
    "page": 4,
    "pdfImageXref": 4389,
    "dimensions": [3508, 1047],
    "softMaskPreserved": false,
    "status": "extracted"
  },
  {
    "file": "assets/kunafa-food.png",
    "sourceDocument": "EN Catalog 4.pdf",
    "page": 3,
    "pdfImageXref": 179,
    "dimensions": [1035, 1424],
    "softMaskPreserved": false,
    "status": "extracted"
  },
  {
    "file": "assets/maamoul-food.png",
    "sourceDocument": "EN Catalog 4.pdf",
    "page": 5,
    "pdfImageXref": 197,
    "dimensions": [421, 582],
    "softMaskPreserved": true,
    "status": "extracted"
  },
  {
    "file": "assets/baklava-food.png",
    "sourceDocument": "EN Catalog 4.pdf",
    "page": 6,
    "pdfImageXref": 202,
    "dimensions": [472, 591],
    "softMaskPreserved": true,
    "status": "extracted"
  }
]
```

## FINAL EXECUTION REMINDER

Implement all requested routes inside this existing project. Use the content bank above, not public audit labels. Preserve current IDs and working behavior. Keep research notes internal. Import supplied images only when needed; do not reference nonexistent files. Complete and test the experience, then report actual results and outstanding data separately.
