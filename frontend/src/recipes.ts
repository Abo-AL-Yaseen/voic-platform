export type Ingredient = {
  amount?: number;
  unitAr?: string;
  unitEn?: string;
  nameAr: string;
  nameEn: string;
};

export type Recipe = {
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

const i = (
  amount: number | undefined,
  unitAr: string,
  unitEn: string,
  nameAr: string,
  nameEn: string,
): Ingredient => ({ amount, unitAr, unitEn, nameAr, nameEn });

export const recipes: Recipe[] = [
  {
    slug: "semolina-maamoul",
    titleAr: "معمول السميد بالتمر",
    titleEn: "Date-filled Semolina Maamoul",
    category: "sweets-baking",
    descriptionAr: "معمول بحشوة التمر ولمسة المحلب، مع سمن النباتين.",
    descriptionEn: "Semolina maamoul with date filling, mahlab and Al-Nabatin ghee.",
    productIds: ["nabateen"],
    image: "/assets/site/recipe-maamoul.jpg",
    ingredients: [
      i(1, "كغم", "kg", "سميد ناعم", "fine semolina"),
      i(2, "ملعقة كبيرة", "tbsp", "محلب مطحون", "ground mahlab"),
      i(3, "أكواب", "cups", "سمن النباتين", "Al-Nabatin ghee"),
      i(1, "ملعقة كبيرة", "tbsp", "خميرة فورية", "instant yeast"),
      i(1, "كوب", "cup", "حليب كامل الدسم دافئ", "warm whole milk"),
      i(400, "غم", "g", "تمر مهروس", "mashed dates"),
      i(2, "ملعقة صغيرة", "tsp", "جوزة الطيب", "nutmeg"),
      i(1, "ملعقة كبيرة", "tbsp", "قرفة", "cinnamon"),
      i(undefined, "", "", "زيت زيتون للحشوة حسب الحاجة", "olive oil for the filling, as needed"),
      i(undefined, "", "", "سكر بودرة للتقديم حسب الرغبة", "icing sugar to serve, if desired"),
    ],
    stepsAr: [
      "افرك السميد بالمحلب والسمن، ثم غطّه واتركه أربع ساعات.",
      "أضف الخميرة والحليب بالتدريج واعجن حتى تتكوّن عجينة طرية.",
      "حضّر حشوة التمر مع القرفة وجوزة الطيب وقليل من الزيت.",
      "قسّم العجين واحشه بالتمر، وشكّل الحبات بالقالب. اتركها ترتاح 15 دقيقة.",
      "اخبز على 175°م لمدة 15–20 دقيقة مع متابعة اللون، ثم برّد الحبات وقدّمها مع السكر حسب الرغبة.",
    ],
    stepsEn: [
      "Rub the semolina with the mahlab and ghee, then cover and leave for four hours.",
      "Add the yeast and milk gradually and knead until a soft dough forms.",
      "Prepare the date filling with cinnamon, nutmeg and a little oil.",
      "Divide the dough, fill with dates and shape in a mould. Rest for 15 minutes.",
      "Bake at 175°C for 15–20 minutes, watching the colour. Cool and serve with sugar if desired.",
    ],
    knownTimeAr: "راحة العجين: 4 ساعات، ثم 15 دقيقة بعد التشكيل. الخبز: 15–20 دقيقة.",
    knownTimeEn: "Dough rest: 4 hours, then 15 minutes after shaping. Baking: 15–20 minutes.",
    temperatureC: 175,
  },
  {
    slug: "qidra-with-lamb",
    titleAr: "القدرة باللحم",
    titleEn: "Qidra with Lamb",
    category: "main-dishes",
    descriptionAr: "أرز ولحم وحمص، مع زيت نباتي وسمن النباتين.",
    descriptionEn: "Rice, lamb and chickpeas prepared with vegetable oil and Al-Nabatin ghee.",
    productIds: ["nabateen", "reem-sunflower-oil", "ghazalein-corn-oil"],
    image: "/assets/site/recipe-qidra-lamb.jpg",
    ingredients: [
      i(2, "كوب", "cups", "أرز بسمتي", "basmati rice"),
      i(1, "كغم", "kg", "لحم", "lamb"),
      i(1, "كوب", "cup", "حمص مسلوق", "cooked chickpeas"),
      i(0.5, "كوب", "cup", "زيت ريم أو الغزالين", "Reem or Al-Ghazalein oil"),
      i(1, "ملعقة كبيرة", "tbsp", "سمن النباتين", "Al-Nabatin ghee"),
      i(2, "لتر", "L", "ماء", "water"),
      i(2, "", "", "بصلة مفرومة", "onions, chopped"),
      i(2, "", "", "بصلة شرائح", "onions, sliced"),
      i(3, "ملاعق كبيرة", "tbsp", "ثوم مهروس", "crushed garlic"),
      i(1, "", "", "مكعب مرق دجاج", "chicken stock cube"),
      i(2, "", "", "ورقة غار", "bay leaves"),
      i(0.5, "ملعقة صغيرة", "tsp", "كمون", "cumin"),
      i(1, "ملعقة صغيرة", "tsp", "كركم", "turmeric"),
      i(1, "ملعقة صغيرة", "tsp", "حب هال", "cardamom pods"),
      i(1, "ملعقة كبيرة", "tbsp", "هال مطحون", "ground cardamom"),
      i(undefined, "", "", "ملح وفلفل أسود حسب الذوق", "salt and black pepper to taste"),
    ],
    stepsAr: [
      "شوّح البصل المفروم بنصف الزيت، وأضف اللحم والغار وحب الهال. اسكب الماء واترك اللحم حتى ينضج، ثم احفظ المرق.",
      "حمّر شرائح البصل ببقية الزيت وقلّب معها الحمص والكمون والفلفل.",
      "تبّل الأرز بالثوم والكركم والهال المطحون والملح. رتّب نصفه ثم خليط الحمص ثم بقية الأرز.",
      "أضف مكعب المرق وأربعة أكواب من مرق اللحم المصفّى. ابدأ بالغليان ثم خفّف النار حتى ينضج الأرز.",
      "وزّع السمن فوق الأرز وغطّه ليذوب، ثم قدّم الأرز مع اللحم.",
    ],
    stepsEn: [
      "Sauté the chopped onion in half the oil. Add the lamb, bay leaves and cardamom pods. Add the water and cook until tender, reserving the stock.",
      "Brown the sliced onions in the remaining oil, then stir in the chickpeas, cumin and pepper.",
      "Season the rice with garlic, turmeric, ground cardamom and salt. Layer half the rice, the chickpea mixture, then the remaining rice.",
      "Add the stock cube and four cups of strained lamb stock. Bring to a boil, then reduce the heat until the rice is cooked.",
      "Spread the ghee over the rice and cover until it melts, then serve with the lamb.",
    ],
  },
  {
    slug: "shishbarak-with-yogurt",
    titleAr: "شيشبرك باللبن",
    titleEn: "Shishbarak with Yogurt",
    category: "main-dishes",
    descriptionAr: "عجينة محشوة باللحم، تُقدّم مع اللبن والثوم والكزبرة.",
    descriptionEn: "Meat-filled dumplings served with yogurt, garlic and coriander.",
    productIds: ["reem-sunflower-oil"],
    image: "/assets/site/recipe-shishbarak.jpg",
    ingredients: [
      i(500, "غم", "g", "لحم مفروم", "minced meat"),
      i(2, "كوب", "cups", "دقيق منخول", "sifted flour"),
      i(1, "", "", "بصلة صغيرة مفرومة", "small onion, chopped"),
      i(2, "ملعقة كبيرة", "tbsp", "زيت ريم للحشوة", "Reem oil for the filling"),
      i(0.5, "ملعقة كبيرة", "tbsp", "زيت للثوم والكزبرة", "oil for the garlic and coriander"),
      i(1, "ملعقة صغيرة", "tsp", "جوزة الطيب", "nutmeg"),
      i(undefined, "", "", "ملح وبهارات حسب الذوق", "salt and spices to taste"),
      i(1, "كغم", "kg", "لبن", "yogurt"),
      i(2, "ملعقة كبيرة", "tbsp", "كزبرة مفرومة", "chopped coriander"),
      i(1, "فص", "clove", "ثوم مفروم", "chopped garlic"),
      i(3, "ملاعق كبيرة", "tbsp", "نشا", "starch"),
      i(0.5, "كوب", "cup", "ماء لإذابة النشا", "water to dissolve the starch"),
      i(undefined, "", "", "ماء للعجين حسب الحاجة", "water for the dough, as needed"),
    ],
    stepsAr: [
      "اعجن الدقيق والملح بماء يضاف تدريجيًا. غطّ العجين وبرّده 30 دقيقة.",
      "قلّب البصل في الزيت، ثم أضف اللحم والبهارات وجوزة الطيب واطبخ الحشوة حتى تنضج.",
      "افرد العجين وقطّعه دوائر، واحشها وأغلقها بشكل الشيشبرك.",
      "رتّبها على صينية مدهونة قليلًا، واخبز عند 180°م نحو 10 دقائق مع متابعة التحمير.",
      "حرّك اللبن مع النشا على نار متوسطة حتى يثخن. قلّب الثوم والكزبرة بالزيت وأضفهما إلى اللبن، ثم قدّم مع الشيشبرك.",
    ],
    stepsEn: [
      "Knead the flour and salt with water added gradually. Cover and chill the dough for 30 minutes.",
      "Sauté the onion in oil, add the meat, spices and nutmeg, and cook the filling through.",
      "Roll out the dough, cut into circles, fill and close into shishbarak shapes.",
      "Arrange on a lightly greased tray and bake at 180°C for about 10 minutes, watching the browning.",
      "Stir the yogurt with the starch over medium heat until thick. Sauté the garlic and coriander in oil, add to the yogurt and serve with the shishbarak.",
    ],
    knownTimeAr: "تبريد العجين: 30 دقيقة. خبز الحبات: نحو 10 دقائق.",
    knownTimeEn: "Chilling the dough: 30 minutes. Baking the dumplings: about 10 minutes.",
    temperatureC: 180,
  },
  {
    slug: "fish-with-vegetables",
    titleAr: "صينية سمك بالخضروات",
    titleEn: "Baked Fish with Vegetables",
    category: "main-dishes",
    descriptionAr: "سمك بالفرن مع الخضروات والليمون والثوم والبهارات.",
    descriptionEn: "Oven-baked fish with vegetables, lemon, garlic and spices.",
    productIds: [],
    image: "/assets/site/recipe-fish.jpg",
    ingredients: [
      i(4, "", "", "سمكات متوسطة", "medium fish"),
      i(
        1,
        "كوب",
        "cup",
        "بقدونس مفروم، وقليل للتزيين",
        "chopped parsley, plus a little to garnish",
      ),
      i(0.25, "كوب", "cup", "عصير ليمون", "lemon juice"),
      i(2, "ملعقة كبيرة", "tbsp", "زيت زيتون", "olive oil"),
      i(6, "فصوص", "cloves", "ثوم مهروس", "crushed garlic"),
      i(
        1,
        "ملعقة صغيرة",
        "tsp each",
        "كركم وكمون وبابريكا وملح",
        "turmeric, cumin, paprika and salt",
      ),
      i(0.5, "ملعقة صغيرة", "tsp", "زعفران", "saffron"),
      i(0.5, "ملعقة صغيرة", "tsp", "فلفل أسود", "black pepper"),
      i(1, "", "", "قرن فلفل حار شرائح", "hot pepper, sliced"),
      i(3, "", "", "حبات جزر كبيرة شرائح", "large carrots, sliced"),
      i(4, "", "", "أوراق غار", "bay leaves"),
      i(1, "", "", "ليمونة شرائح", "lemon, sliced"),
      i(1, "", "", "بصلة شرائح", "onion, sliced"),
      i(2, "", "", "فلفل أخضر حلو مكعبات", "green sweet peppers, diced"),
      i(1, "", "", "طماطم مقشرة ومفرومة", "tomato, peeled and chopped"),
    ],
    stepsAr: [
      "حضّر السمك ونظّفه وصفّه. اخلط العصير والزيت والثوم والبقدونس والتوابل.",
      "تبّل السمك من الداخل والخارج، وضع ورقة غار داخل كل سمكة.",
      "وزّع جزءًا من الخضروات والليمون في الصينية، ثم السمك وبقية الخضروات والطماطم والتتبيلة.",
      "غطّ الصينية بورق الألمنيوم واخبزها على 190°م نحو 60 دقيقة حتى النضج، ثم اكشفها للتحمير وقدّمها ساخنة.",
    ],
    stepsEn: [
      "Prepare, clean and drain the fish. Mix the lemon juice, oil, garlic, parsley and spices.",
      "Season the fish inside and out, placing one bay leaf inside each fish.",
      "Spread some vegetables and lemon in the tray, then add the fish, remaining vegetables, tomato and marinade.",
      "Cover with foil and bake at 190°C for about 60 minutes until cooked, then uncover to brown and serve hot.",
    ],
    knownTimeAr: "الخبز: نحو 60 دقيقة، ثم التحمير.",
    knownTimeEn: "Baking: about 60 minutes, followed by browning.",
    temperatureC: 190,
  },
];
