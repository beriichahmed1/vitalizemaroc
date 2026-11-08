import { whatsappDisplay, whatsappUrl } from "@/lib/site";

export const metadata = { title: "تواصل معنا" };

export default function ContactPage() {
  const url = whatsappUrl("السلام، بغيت نستفسر");
  const display = whatsappDisplay();
  return (
    <main className="container">
      <header className="page-heading"><h1>تواصل معنا</h1></header>
      <section className="prose panel">
        {url ? (
          <>
            <p>خدمة العملاء كتجاوبك عبر الواتساب: <strong dir="ltr">{display}</strong></p>
            <p><a className="button cta" href={url} target="_blank" rel="noopener noreferrer">تواصل معنا فالواتساب</a></p>
          </>
        ) : (
          <p className="muted">رقم الواتساب غادي يتنشر هنا قريباً.</p>
        )}
        <p className="muted">أي مشكل فالطلب أو عيب فالمنتج؟ كتب لينا فالواتساب وغنعاونوك فإطار ضمان 30 يوماً.</p>
      </section>
    </main>
  );
}
