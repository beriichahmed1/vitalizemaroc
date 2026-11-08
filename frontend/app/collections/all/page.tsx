import type { Metadata } from "next";
import Link from "next/link";
import { AddToCartButton } from "@/components/purchase";
import { formatMad, products } from "@/lib/catalog";

export const metadata: Metadata = { title: "المنتجات" };

export default function CollectionPage() {
  return (
    <main className="container">
      <header className="page-heading">
        <p className="muted">Vitalize Maroc</p>
        <h1>المنتجات</h1>
        <p className="muted">تفاصيل كل منتج والأثمنة حسب الكمية.</p>
      </header>
      <section className="product-grid section">
        {products.map((product) => (
          <article className="product-card" key={product.sku}>
            <Link href={`/products/${product.slug}`} className="product-art" aria-label={`عرض ${product.nameAr}`}>صورة المنتج</Link>
            <h2>{product.nameAr}</h2>
            <p className="muted">{product.description}</p>
            <p className="price">{formatMad(product.unitPrice)}</p>
            <p className="muted small">قطعتين {formatMad(product.tiers[1])} · 3 قطع {formatMad(product.tiers[2])}</p>
            <div className="actions">
              <Link className="button secondary" href={`/products/${product.slug}`}>شوف التفاصيل</Link>
              <AddToCartButton sku={product.sku}>زيد وحدة للسلة</AddToCartButton>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
