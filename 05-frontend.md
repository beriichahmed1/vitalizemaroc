# 5. Frontend Implementation Brief

## Recommended stack

- Next.js App Router with React and TypeScript (current supported stable release at implementation time).
- Tailwind CSS for design tokens and responsive utility styling.
- Zod for shared request/response validation where it helps; React Hook Form is optional for the checkout form.
- Use native platform APIs and small focused components; avoid a large UI kit unless it materially improves accessibility and consistency.
- Use a maintained Arabic-capable font package or local font files with verified licensing.
- Use Vitest/Testing Library for unit/component tests and Playwright for end-to-end flows.

Pin dependencies and commit the lockfile. Do not add a package just to wrap a small helper. Keep secrets out of client bundles.

## Suggested structure

```text
frontend/
  app/
    [locale]/ (optional only if a second reviewed locale is implemented)
    page.tsx
    collections/all/page.tsx
    products/[slug]/page.tsx
    about/page.tsx
    contact/page.tsx
    policies/[slug]/page.tsx
    thank-you/page.tsx
    layout.tsx
    globals.css
  components/
    site-header.tsx
    site-footer.tsx
    product-card.tsx
    product-gallery.tsx
    quantity-offer-selector.tsx
    cart-drawer.tsx
    checkout-dialog.tsx
    timed-upsell.tsx
    consent-controls.tsx
  lib/
    api-client.ts
    cart-store.ts
    catalog.ts
    currency.ts
    tracking/
  public/
    images/placeholders/
  tests/
  Dockerfile
  .dockerignore
  .env.example
  package.json
```

Keep components small, typed, keyboard-operable, and focused. Use server components by default; add client components only for cart, forms, dialogs, consent, and events.

## Catalog and pricing

- Keep product facts keyed by stable SKU/slug. The current display tiers in `frontend/lib/catalog.ts` must match the approved tiers in `backend/app/pricing.py`.
- The backend is authoritative for SKU, offer total, stock, shipping, and final total; frontend quote logic is for display only.
- Approved price tiers: Gummies 280 / 499 / 690 MAD; Immunity 240 / 440 / 620 MAD; Endurance 350 / 640 / 690 MAD.
- For quantity >3, use complete groups of 3 plus the tier for the remainder. For mixed carts, calculate each SKU independently.
- Use the exact integer MAD totals; test frontend labels against `POST /v1/quotes`.
- Handle unavailable products and stale cart prices visibly; never silently change quantities or totals.
- Use integer MAD values, not floating-point money.

## Cart behavior

- Shared cart drawer available throughout the site.
- Persist only non-sensitive cart data in browser storage: product/variant IDs and quantities. Never store name, phone, city, order secrets, or auth tokens in local storage.
- On hydration, reconcile with the backend catalog/quote. Handle unavailable or repriced items with a clear prompt.
- Explicit click adds selected quantity and opens the drawer. Cross-sell requires an explicit add action.
- Cart updates are accessible and announce changed item counts/totals.

## Checkout and upsell client states

Model explicit states: `cart`, `checkout_form`, `submitting`, `upsell_pending`, `finalizing`, `order_received`, and `recoverable_error`.

- Submit only name, phone, city, cart lines, and an idempotency key.
- Server validates and creates a durable pending order, then returns an opaque, short-lived, order-scoped token and expiry time.
- Show an upsell only when the server says it is eligible. Button actions call accept/decline endpoints; client countdown never determines order state.
- If timer expires or page closes, backend finalizes base order on schedule. On return, use a safe status endpoint/token to resume without duplicate order or leaked personal data.
- Redirect to a thank-you route that validates an opaque reference server-side. Do not embed PII in the URL.
- Errors must be explicit, accessible, and retryable; never display a success screen for a failed or unknown order state.

## Images and performance

- Use Next/Image with explicit dimensions/aspect ratios and responsive sources.
- Hero image may be prioritized; defer below-fold images.
- Avoid loading full-size images on mobile, layout shift, autoplay video, and large client bundles.
- Use production build analysis and Lighthouse/Web Vitals as checks; do not load marketing pixels until the consent/performance strategy allows them.

## Environment

Copy the safe placeholders from `docs/templates/frontend.env.example` into `frontend/.env.example` in the generated app. Public pixel IDs may use the framework public prefix; API/webhook secrets must never use it. Document every environment variable and fail clearly for missing required production config.

## Frontend acceptance

- Arabic RTL layout works on mobile and desktop.
- Header, menu, collection, product pages, cross-sells, cart, checkout, timed upsell, policy links, and thank-you flow work with keyboard and touch.
- Price calculations display the backend quote and show the approved product-specific tiers.
- Price cards display the approved tiers, and the quote endpoint is the source of truth.
- Invalid Moroccan numbers cannot submit; server revalidates.
- A double click, refresh, browser close, network timeout, or retry cannot produce an incorrect duplicate order.
- No PII appears in URLs, client analytics payloads, or browser storage.
