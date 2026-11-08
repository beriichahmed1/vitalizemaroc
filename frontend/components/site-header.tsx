"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/components/store-provider";

export function SiteHeader() {
  const store = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="container header-row">
        <Link href="/" className="brand" aria-label="Vitalize Maroc الصفحة الرئيسية">
          <span className="brand-mark" aria-hidden="true">N</span>
          <span className="brand-copy">
            <strong>فيتالايز المغرب</strong>
            <small>Vitalize Maroc</small>
          </span>
        </Link>
        <nav className="nav-links" aria-label="القائمة الرئيسية">
          <Link href="/">الرئيسية</Link>
          <Link href="/collections/all">المنتجات</Link>
          <Link href="/about">قصتنا</Link>
          <Link href="/contact">تواصل معنا</Link>
        </nav>
        <button className="mobile-menu-button" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen((open) => !open)}>
          القائمة
        </button>
        <button className="cart-trigger" onClick={store.openCart} aria-label={`فتح السلة، فيها ${store.cartCount} منتجات`}>
          السلة ({store.cartCount})
        </button>
      </div>
      {menuOpen && <nav className="mobile-menu container" id="mobile-menu" aria-label="القائمة الرئيسية">
        <Link href="/" onClick={() => setMenuOpen(false)}>الرئيسية</Link>
        <Link href="/collections/all" onClick={() => setMenuOpen(false)}>المنتجات</Link>
        <Link href="/about" onClick={() => setMenuOpen(false)}>قصتنا</Link>
        <Link href="/contact" onClick={() => setMenuOpen(false)}>تواصل معنا</Link>
      </nav>}
    </header>
  );
}
