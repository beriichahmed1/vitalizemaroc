export type ProductTheme = { accent: string; dark: string; tint: string };

export const productThemes: Record<string, ProductTheme> = {
  "vitality-gummies": { accent: "#e07a10", dark: "#b45f08", tint: "#fff3e3" },
  "immunity-shield": { accent: "#0e7490", dark: "#0a5a70", tint: "#e4f4f8" },
  "endurance-power": { accent: "#c0283c", dark: "#9b1e2f", tint: "#fdebed" },
};

export const defaultTheme: ProductTheme = { accent: "#154d3a", dark: "#103b2d", tint: "#e7f3ec" };

export function themeStyle(sku: string): Record<string, string> {
  // One brand color across the whole flow (home, product, cart, upsell) to look consistent.
  const theme = defaultTheme;
  void sku;
  return { "--accent": theme.accent, "--accent-dark": theme.dark, "--accent-tint": theme.tint };
}

export type Ingredient = { name: string; amount: string; role: string };

export type ProductContent = {
  headline: string;
  subheadline: string;
  bullets: string[];
  painTitle: string;
  painPoints: string[];
  ingredients?: Ingredient[];
  ingredientsIntro?: string;
  facts?: string[];
  unitDuration?: string;
};

// Only facts supplied by the owner appear here. Health wording stays at "supports/contributes to".
export const productContent: Record<string, ProductContent> = {
  "vitality-gummies": {
    headline: "تعبتي من الطاقة اللي كتسالي مع الظهر؟",
    subheadline: "علكات سهلة فالاستعمال، مصممة لدعم نشاطك وتركيزك فالنهار — للرجال والنساء.",
    bullets: ["علكات سهلة الاستعمال", "مناسبة للرجال والنساء", "التركيبة كاملة على ملصق العلبة"],
    painTitle: "واش هادشي كيوقع ليك؟",
    painPoints: ["كتحس بالتعب قبل ما يسالي نهارك", "صعيب عليك تركز فالخدمة أو الدراسة", "كتعتمد على القهوة باش تكمل نهارك"],
  },
  "immunity-shield": {
    headline: "كل برد أو شتا كيوقفك على خدمتك؟",
    subheadline: "فيتامين C وسبيرولينا وزنك فعلبة وحدة، لدعم الجهاز المناعي ونشاطك اليومي — للرجال والنساء.",
    bullets: ["فيتامين C 500mg · سبيرولينا 300mg · زنك 15mg", "60 كبسولة = شهر كامل من الاستعمال", "تركيبة كاملة وشفافة"],
    painTitle: "واش هادشي كيوقع ليك؟",
    painPoints: ["كتحس بالإرهاق فتبدال الفصول", "كتعاود تمرض أكثر من الناس اللي حواليك", "مابغيتيش تعتمد غير على الأكل باش تغطي حاجياتك"],
    ingredientsIntro: "هادي المكونات كما هي مكتوبة على العلبة. كل مكون معروف فعالم المكملات الغذائية.",
    ingredients: [
      { name: "فيتامين C", amount: "500 mg", role: "كيساهم فالأداء الطبيعي للجهاز المناعي وفتقليل التعب والإرهاق." },
      { name: "سبيرولينا", amount: "300 mg", role: "طحلب طبيعي كيدخل فتركيبة المكملات الغذائية كمصدر لعناصر غذائية." },
      { name: "زنك (Zinc)", amount: "15 mg", role: "كيساهم فالأداء الطبيعي للجهاز المناعي وفحماية الخلايا من الإجهاد التأكسدي." },
    ],
    facts: ["كل علبة = 60 كبسولة", "تكفي شهر كامل من الاستعمال"],
    unitDuration: "شهر",
  },
  "endurance-power": {
    headline: "التمرين كيبدا بحماس وكيسالي بتعب؟",
    subheadline: "مسحوق للطاقة والرياضة والتحمل، سهل التحضير ويتناسب مع روتينك — للرجال والنساء.",
    bullets: ["مسحوق سهل التحضير", "للطاقة والرياضة والتحمل", "التركيبة كاملة على ملصق العلبة"],
    painTitle: "واش هادشي كيوقع ليك؟",
    painPoints: ["كتبدا التمرين وكتسالي بسرعة", "الطاقة كتنقص فنص الحصة", "بغيتي مكمل واضح التركيبة فروتينك الرياضي"],
  },
};
