import Link from "next/link";
import { AddToCartButton } from "@/components/purchase";
import { formatMad, products } from "@/lib/catalog";

const TRUST = [
  { title: "Livraison incluse dans le prix", text: "التوصيل شامل فالثمن لجميع مدن المغرب." },
  { title: "Paiement & vérification à la livraison", text: "الدفع والفحص عند الاستلام." },
  { title: "Garantie 30 jours", text: "ضمان 30 يوماً: استرجاع أو استبدال فحالة عيب." },
];

const FAQ = [
  { q: "كيفاش كنخلص؟", a: "الدفع نقداً عند الاستلام، وتقدر تفحص الطلب قبل ما تخلص." },
  { q: "واش التوصيل شامل فالثمن؟", a: "نعم، السعر النهائي شامل التوصيل لجميع مدن المغرب." },
  { q: "كيفاش نعرف المكونات وطريقة الاستعمال؟", a: "كل منتج عندو صفحة بالتفاصيل، والمعلومات الرسمية كتكون على ملصق المنتج." },
  { q: "شنو الفرق بين العروض؟", a: "كل ما زدتي قطع من نفس المنتج، الثمن ديال القطعة كيهبط. الثمن الإجمالي كيبان قبل الإضافة للسلة." },
];

export default function HomePage() {
  return (
    <main>
      <section className="container hero">
        <div>
          <p className="muted">VITALIZE MAROC · فيتالايز المغرب</p>
          <h1><span className="hero-title">رجّع ليك طاقتك ونشاطك كل نهار.</span></h1>
          <p>تركيبة واضحة، ثمن شامل التوصيل، والدفع عند الاستلام.</p>
          <div className="actions"><Link className="button cta" href="/collections/all">تسوق المنتجات</Link></div>
        </div>
        <div className="hero-art" role="img" aria-label="مساحة مخصصة لصورة حقيقية للمنتجات">
          <div><strong>صورة المتجر</strong><br /><span className="muted">استبدل هاد المساحة بصور المنتجات الحقيقية</span></div>
        </div>
      </section>

      <section className="container trust-strip" aria-label="مميزات الطلب">
        {TRUST.map((item) => (
          <div className="trust-item" key={item.title}><strong>{item.title}</strong><span className="muted">{item.text}</span></div>
        ))}
      </section>

      <section className="container section">
        <h2>اكتشف المنتجات</h2>
        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.sku}>
              <Link href={`/products/${product.slug}`} className="product-art" aria-label={`تفاصيل ${product.nameAr}`}>صورة المنتج</Link>
              <h3><span dir="ltr" className="fr-name">{product.nameFr}</span><small className="muted">{product.nameAr}</small></h3>
              <p className="muted">{product.description}</p>
              <p className="price">{formatMad(product.unitPrice)}</p>
              <p className="muted small">عرض قطعتين {formatMad(product.tiers[1])} · 3 قطع {formatMad(product.tiers[2])}</p>
              <div className="actions">
                <Link className="button secondary" href={`/products/${product.slug}`}>التفاصيل والعروض</Link>
                <AddToCartButton sku={product.sku}>زيد للسلة</AddToCartButton>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="container section">
        <h2>كيفاش كتطلب؟</h2>
        <ol className="steps">
          <li><strong>1. اختار المنتج والكمية</strong><p className="muted">شوف الأثمنة بوضوح قبل ما تزيد للسلة.</p></li>
          <li><strong>2. عمر 3 معلومات</strong><p className="muted">الاسم، رقم الهاتف، والمدينة.</p></li>
          <li><strong>3. الأداء عند الاستلام</strong><p className="muted">كتخلص نقداً ملي توصلك الطلبية.</p></li>
        </ol>
      </section>

      <section className="container section prose">
        <h2>أسئلة كتعاود</h2>
        {FAQ.map((item) => (
          <details className="faq" key={item.q}><summary>{item.q}</summary><p className="muted">{item.a}</p></details>
        ))}
      </section>
    </main>
  );
}
