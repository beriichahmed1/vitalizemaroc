import { formatMad, type Tiers } from "./pricing.ts";

export { formatMad };

export type Product = {
  sku: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  nameFr: string;
  description: string;
  unitPrice: number;
  tiers: Tiers;
  category: string;
};

// Display mirror of backend/app/pricing.py; the API quote is always authoritative.
export const products: Product[] = [
  {
    sku: "vitality-gummies",
    slug: "vitality-gummies",
    nameAr: "فيتاليتي غوميز – علكات الطاقة والتركيز",
    nameEn: "Vitality Gummies",
    nameFr: "Vitality Gummies – Gommes énergie & concentration",
    description: "علكات الطاقة والتركيز. راجع ملصق المنتج لمعرفة المكونات وطريقة الاستعمال.",
    unitPrice: 280,
    tiers: [280, 499, 690],
    category: "الطاقة والتركيز",
  },
  {
    sku: "immunity-shield",
    slug: "immunity-shield",
    nameAr: "إيمونيتي شيلد – درع المناعة",
    nameEn: "Immunity Shield",
    nameFr: "Immunity Shield – Bouclier immunité",
    description: "فيتامين C 500mg وسبيرولينا 300mg وزنك 15mg. علبة من 60 كبسولة تكفي شهراً كاملاً.",
    unitPrice: 240,
    tiers: [240, 440, 620],
    category: "الصحة والعافية",
  },
  {
    sku: "endurance-power",
    slug: "endurance-power",
    nameAr: "إندورانس باور – مسحوق الطاقة والبروتين",
    nameEn: "Endurance Power",
    nameFr: "Endurance Power – Poudre énergie & protéines",
    description: "مسحوق للطاقة والرياضة والتحمل حسب وصف المنتج؛ تحقق من الملصق للمكونات وطريقة الاستعمال.",
    unitPrice: 350,
    tiers: [350, 640, 690],
    category: "الرياضة واللياقة",
  },
];

export const MAX_QUANTITY = 99;

export function getProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

