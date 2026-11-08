import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

const titles: Record<string, string> = {
  privacy: "سياسة الخصوصية",
  shipping: "التوصيل",
  returns: "الإرجاع والاسترجاع",
  terms: "الشروط والأحكام",
};

export function generateStaticParams() {
  return Object.keys(titles).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return titles[slug] ? { title: titles[slug] } : {};
}

const WHATSAPP_NOTE = "للتواصل معنا فالواتساب، شوف صفحة تواصل معنا.";

const BODY: Record<string, ReactNode> = {
  shipping: (
    <>
      <p><strong>التوصيل مجاني لجميع مدن المغرب.</strong> السعر المعروض فالموقع هو السعر النهائي، بلا رسوم إضافية.</p>
      <ul>
        <li>الدفع نقداً عند الاستلام.</li>
        <li>كتقدر تفحص الطلب (Déballage) قبل الدفع، حسب خدمة شركة التوصيل.</li>
        <li>بعد الطلب كنتواصلو معاك لتأكيد المعلومات قبل الإرسال.</li>
      </ul>
      <p className="muted">{WHATSAPP_NOTE}</p>
    </>
  ),
  returns: (
    <>
      <p><strong>ضمان 30 يوماً</strong> للاسترجاع أو الاستبدال فحالة وجود عيب فالتغليف أو التصنيع.</p>
      <ul>
        <li>تفحص الطلب عند الاستلام قبل ما تخلص.</li>
        <li>إذا لاحظتي عيباً فالتغليف أو التصنيع، تواصل معنا فخلال 30 يوماً من الاستلام.</li>
        <li>غادي نقترحو عليك الاستبدال أو الاسترجاع حسب الحالة.</li>
      </ul>
      <p className="muted">{WHATSAPP_NOTE}</p>
    </>
  ),
};

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = titles[slug];
  if (!title) notFound();
  return (
    <main className="container">
      <header className="page-heading"><h1>{title}</h1></header>
      <section className="prose panel">
        {BODY[slug] ?? (
          <>
            <p>هاد الصفحة مسودة وماشي نص قانوني نهائي. خاص صاحب المتجر يضيف الشروط الحقيقية ويراجعها قانونياً قبل الإطلاق.</p>
            <p className="muted">ما كايناش حالياً معلومات مؤكدة على عنوان الشركة أو مدة الاحتفاظ بالبيانات.</p>
          </>
        )}
      </section>
    </main>
  );
}
