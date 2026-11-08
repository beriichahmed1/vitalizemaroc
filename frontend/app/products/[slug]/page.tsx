import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductViewTracker } from "@/components/product-view-tracker";
import { AddToCartButton, ProductPurchase } from "@/components/purchase";
import { formatMad, getProduct, products } from "@/lib/catalog";
import { productContent, themeStyle } from "@/lib/product-content";
import { reviews } from "@/lib/reviews";
import { whatsappUrl } from "@/lib/site";

const BADGES = [
  { icon: "🚚", title: "Livraison incluse", text: "التوصيل شامل فالثمن لجميع مدن المغرب" },
  { icon: "💵", title: "Paiement à la livraison", text: "الدفع عند الاستلام، ما كتخلص والو دابا" },
  { icon: "🔍", title: "Vérification à la livraison", text: "الفحص قبل الدفع" },
  { icon: "🛡️", title: "Garantie 30 jours", text: "استرجاع أو استبدال فحالة عيب" },
];

const FAQ = [
  { q: "كيفاش نخلص؟", a: "الدفع نقداً عند الاستلام، وتقدر تفحص الطلب قبل ما تخلص." },
  { q: "واش التوصيل شامل فالثمن؟", a: "نعم. السعر النهائي شامل التوصيل لجميع مدن المغرب." },
  { q: "شنو يوقع إذا كان عيب فالمنتج؟", a: "عندك 30 يوماً للاسترجاع أو الاستبدال فحالة عيب فالتغليف أو التصنيع." },
  { q: "واش كتصلو بيا قبل الإرسال؟", a: "نعم، كنتواصلو معاك لتأكيد الطلب. خلي هاتفك قريب بعد الطلب." },
  { q: "شنو الفرق بين العروض؟", a: "كل ما زدتي قطع من نفس المنتج، ثمن القطعة كيهبط. الثمن الإجمالي كيبان قبل الإضافة للسلة." },
];

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  return product ? { title: product.nameAr, description: product.description } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const content = productContent[product.sku];
  const waUrl = whatsappUrl(`السلام، بغيت نستفسر على ${product.nameAr}`);

  return (
    <main className="container themed" style={themeStyle(product.sku)}>
      <ProductViewTracker sku={product.sku} />
      <section className="product-layout" id="order">
        <div>
          <p className="chip-line"><span className="best-chip">🚚 Livraison incluse · التوصيل شامل فالثمن</span></p>
          <p className="product-name"><span className="fr" dir="ltr">{product.nameFr}</span><span className="ar">{product.nameAr}</span></p>
          <h1 className="product-headline">{content.headline}</h1>
          <p className="lead">{content.subheadline}</p>
          <ul className="check-list">
            {content.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
          </ul>
          <p className="price">ابتداءً من {formatMad(product.unitPrice)} <small className="muted">· السعر النهائي شامل التوصيل</small></p>
          <ProductPurchase sku={product.sku} />
        </div>
        <div className="product-art" role="img" aria-label={`صورة توضيحية مؤقتة لـ ${product.nameAr}`}>
          <div><strong>{product.nameEn}</strong><br /><span className="muted">صورة مؤقتة — عوضها بصور المنتج الفعلية</span></div>
        </div>
      </section>

      <section className="trust-badges" aria-label="ضمانات الطلب">
        {BADGES.map((badge) => (
          <div className="trust-item" key={badge.title}><strong>{badge.icon} {badge.title}</strong><span className="muted">{badge.text}</span></div>
        ))}
      </section>

      <section className="section split">
        <div>
          <h2>{content.painTitle}</h2>
          <ul className="check-list pain">
            {content.painPoints.map((point) => <li key={point}>{point}</li>)}
          </ul>
          <p>{product.nameAr} مصمم باش يكون جزء بسيط من روتينك اليومي، بتركيبة واضحة وثمن واضح.</p>
        </div>
        <div className="product-art" role="img" aria-label="صورة مؤقتة"><div><span className="muted">صورة نمط الحياة (مؤقتة)</span></div></div>
      </section>

      <section className="section split flip" id="ingredients">
        <div className="product-art" role="img" aria-label="صورة مؤقتة للمكونات"><div><span className="muted">صورة المكونات / العلبة (مؤقتة)</span></div></div>
        <div>
          <h2>التركيبة كاملة وشفافة</h2>
          {content.ingredients ? (
            <>
              <p className="muted">{content.ingredientsIntro}</p>
              <div className="ingredient-list">
                {content.ingredients.map((item) => (
                  <div className="ingredient" key={item.name}>
                    <div className="ingredient-head"><strong>{item.name}</strong><span className="best-chip" dir="ltr">{item.amount}</span></div>
                    <p className="muted small">{item.role}</p>
                  </div>
                ))}
              </div>
              {content.facts && <ul className="check-list">{content.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>}
            </>
          ) : (
            <p className="muted">كل المكونات والكميات وطريقة الاستعمال مكتوبة على ملصق العلبة. ما كاين والو مخبي: اقرأ الملصق عند الاستلام وقبل الدفع.</p>
          )}
          <p className="notice small">هاد المنتج مكمل غذائي وماشي دواء، ولا يعوض نظاماً غذائياً متوازناً. استشر طبيبك إذا كنتي حامل، مرضعة، كتاخد دوا، أو عندك مرض مزمن. اتبع طريقة الاستعمال المكتوبة على العلبة.</p>
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="section">
          <h2>آراء الزبناء</h2>
          <div className="product-grid">
            {reviews.map((review) => (
              <article className="panel" key={`${review.name}-${review.text}`}>
                <p>“{review.text}”</p>
                <strong>{review.name}</strong> <span className="muted">· {review.city}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="section split">
        <div>
          <h2>ضمان 30 يوماً: جرب بلا قلق</h2>
          <p>إذا كان عندك أي عيب فالتغليف أو التصنيع، عندك 30 يوماً للاسترجاع أو الاستبدال.</p>
          <ul className="check-list">
            <li>الفحص عند الاستلام (Déballage) قبل ما تخلص</li>
            <li>استبدال أو استرجاع فحالة عيب التغليف أو التصنيع</li>
            <li>تواصل معنا وغادي نعاونوك حتى تتحل المشكلة</li>
          </ul>
          <p><Link href="/policies/returns" className="text-button">شروط الاسترجاع والاستبدال</Link></p>
        </div>
        <div className="product-art" role="img" aria-label="ضمان 30 يوماً"><div><strong>ضمان 30 يوماً</strong><br /><span className="muted">عيب تغليف أو تصنيع</span></div></div>
      </section>

      <section className="section split flip">
        <div className="panel price-panel">
          <h3>العروض ({product.nameEn})</h3>
          {product.tiers.map((tierPrice, index) => (
            <div className="total-row" key={tierPrice}>
              <span>{index === 0 ? "قطعة وحدة" : index === 1 ? "قطعتين" : "3 قطع"}</span>
              <strong>{formatMad(tierPrice)}</strong>
            </div>
          ))}
        </div>
        <div>
          <h2>سعر واضح وبلا مفاجآت</h2>
          <p><strong>السعر النهائي شامل التوصيل لجميع مدن المغرب.</strong> ما كاين حتى رسوم مخفية، وكتخلص غير ملي كتستلم وتفحص الطلب.</p>
          <p className="muted">بعد ما تطلب، فريقنا كيتواصل معاك لتأكيد المعلومات قبل الإرسال، فخلي هاتفك قريب.</p>
          <a className="button cta" href="#order">اطلب الآن والدفع عند الاستلام</a>
        </div>
      </section>

      <section className="section prose">
        <h2>أسئلة شائعة</h2>
        {FAQ.map((item) => (
          <details className="faq" key={item.q}><summary>{item.q}</summary><p className="muted">{item.a}</p></details>
        ))}
        {waUrl && <p><a className="button secondary" href={waUrl} target="_blank" rel="noopener noreferrer">عندك سؤال؟ تواصل معنا فالواتساب</a></p>}
      </section>

      <section className="section">
        <h2>منتجات أخرى</h2>
        <div className="product-grid">
          {products.filter((item) => item.sku !== product.sku).map((item) => (
            <article className="product-card" key={item.sku}>
              <Link href={`/products/${item.slug}`} className="product-art">صورة المنتج</Link>
              <h3><span dir="ltr" className="fr-name">{item.nameFr}</span><small className="muted">{item.nameAr}</small></h3>
              <p className="price">{formatMad(item.unitPrice)}</p>
              <AddToCartButton sku={item.sku}>زيد للسلة</AddToCartButton>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
