import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Tajawal } from "next/font/google";
import { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { StoreProvider } from "@/components/store-provider";
import { CookieSettingsButton, TrackingBootstrap } from "@/components/tracking-bootstrap";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  display: "swap",
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: { default: "فيتالايز المغرب | Vitalize Maroc", template: "%s | فيتالايز المغرب" },
  description: "منتجات مختارة بعناية وتجربة شراء واضحة فالمغرب. الدفع عند الاستلام.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://vitalizemaroc.shop"),
  openGraph: { siteName: "Vitalize Maroc", locale: "ar_MA", type: "website" },
};

export const viewport: Viewport = { themeColor: "#154d3a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar-MA" dir="rtl" className={tajawal.variable}>
      <body>
        <StoreProvider>
          <TrackingBootstrap />
          <SiteHeader />
          {children}
          <footer className="site-footer">
            <div className="container footer-row">
              <div>
                <strong>فيتالايز المغرب</strong>
                <p className="muted">Vitalize Maroc — منتجات مختارة، الدفع عند الاستلام.</p>
              </div>
              <nav className="footer-links" aria-label="روابط أسفل الصفحة">
                <Link href="/collections/all">المنتجات</Link>
                <Link href="/about">قصتنا</Link>
                <Link href="/contact">تواصل معنا</Link>
                <Link href="/policies/privacy">الخصوصية</Link>
                <Link href="/policies/shipping">التوصيل</Link>
                <Link href="/policies/returns">الإرجاع</Link>
                <Link href="/policies/terms">الشروط</Link>
                <CookieSettingsButton />
              </nav>
            </div>
          </footer>
        </StoreProvider>
      </body>
    </html>
  );
}
