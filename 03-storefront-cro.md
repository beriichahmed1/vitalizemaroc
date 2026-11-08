# 3. Store Map, CRO, and Content

## Information architecture

- `/` — home
- `/collections/all` — all available products
- `/products/vitality-gummies`
- `/products/immunity-shield`
- `/products/endurance-power`
- `/about` — what Vitalize Maroc is and what it does/does not do
- `/contact` — verified contact and support expectations
- `/policies/privacy`
- `/policies/shipping`
- `/policies/returns`
- `/policies/terms`
- `/thank-you` — order-received state, reachable only with a valid order reference/token

Use a persistent cart drawer, not a separate cart page, unless implementation needs a graceful fallback route.

## Header and footer

Header order in RTL: rightmost circular monogram, Arabic brand name with smaller English descriptor, menu links, then cart. Keep the cart easy to reach on mobile. Show a count badge only when the cart has items.

Menu: الرئيسية، المنتجات، قصتنا، تواصل معنا. Keep policy links in the footer. Publish only verified address, phone, email, service hours, or social profiles.

Footer: brand lockup, short truthful description, collection/about/contact links, shipping/returns/privacy/terms links, COD note, and verified support details. Do not show payment logos other than COD.

## Home page order

1. **Hero:** clear category-neutral value proposition, one primary CTA to the collection, one supporting trust fact only if verified. Use a genuine brand/product image or clearly marked temporary image.
2. **Featured products:** three product cards, exact name, verified image, approved price, short factual description, details CTA.
3. **Why shop with Vitalize:** explain the real shopping experience (clear product information, COD, support) without unverified claims.
4. **How ordering works:** choose product/quantity → enter name, phone, city → receive the order status and COD delivery. Do not promise delivery duration before supplier/carrier confirmation.
5. **Product education:** short, factual information linking to the full product details.
6. **Proof section:** use verified supplier documents, real product packaging, or genuine customer feedback only. Hide this section if no approved proof exists; never fill it with fabricated logos/stars.
7. **FAQ:** pricing/quantity, product facts, COD, delivery fee/time, cancellation, returns, contact.
8. **Final CTA:** browse products.

Avoid crowded urgency bars, fake counters, auto-playing sound, popups on first paint, and sticky elements that obstruct mobile content.

## Collection page

Show only available products. Each card includes product photo, Arabic product name, concise fact-based subtitle, current approved price/quantity offer, details link, and a distinct add-to-cart action. Add-to-cart adds only the selected quantity and opens the cart drawer. Do not use a card-level review rating unless it comes from verified reviews.

## Product page conversion structure

Above the fold:

- Product title and concise, verified subtitle.
- Product image/gallery and accessible alt text.
- Price/quantity selector with total for each tier.
- Delivery/COD facts only when verified.
- One primary CTA: **زيد للسلة وكمل الطلب**.
- A transparent note that order completion is COD and any delivery charge will be shown before submission.
- No unsubstantiated star rating, stock countdown, "best seller", doctor endorsement, or guaranteed result.

Below the fold, use alternating image/text sections on desktop; stack cleanly on mobile:

1. What the product is and what's included.
2. Key product details/ingredients, only from the actual label.
3. How to use and important warnings, copied accurately from the manufacturer label.
4. What evidence supports any displayed claim; link/reference the source when appropriate.
5. Real product/package imagery or a clearly identified supplier-provided demonstration.
6. FAQ specific to this SKU.
7. Genuine review/testimonial block only after review collection and permission; show date/context and do not edit meaning.
8. Related-product cross-sells with normal, approved catalog prices and explicit add buttons.
9. Repeated CTA with chosen quantity and correct total.

The user must select a quantity and click to add. A product-page CTA adds the selected quantity and opens the cart. Product cross-sells are optional and never auto-added.

## Cart drawer and cross-sells

The drawer opens after an add-to-cart click or cart-icon click. Display:

- Item name, quantity controls, remove, and unit price.
- Per-product quantity offer, its math, and discount only when approved.
- Merchandise subtotal, applicable savings, delivery fee, and final total.
- Relevant items not already in the cart, each at normal approved price.
- A CTA to open the checkout popup.

Never use an unchecked opt-in, preselect cross-sells, hide a fee, or change the cart silently.

## Checkout popup

Three required fields only: name, Moroccan mobile number, city. Validate inline; accept only Moroccan mobile formats approved by backend validation (local `06...`/`07...` and international `+2126...`/`+2127...`, normalized consistently). Do not rely on client validation alone.

Before the submit button, show the order summary, selected quantity, exact prices, delivery fee if known, COD method, and final total. Include a short privacy notice with a link to the privacy policy. Do not put the phone number or other PII in URL parameters or analytics events.

After server validation, present the optional 99 MAD upsell for 15 seconds (configurable within 10–15 seconds) only if a relevant eligible product is available. The customer may accept or decline. The base order must still be preserved if they close the tab, decline, or let the timer expire. The backend decides expiry; browser countdown is display-only.

## Order-received page

Say the order was received, not that it was delivered or paid. Show a unique order reference, the final accepted items/total, and clear COD next steps. Do not reveal raw PII in the URL or page HTML. A thank-you cross-sell is a new, explicit cart action and cannot change the submitted order.

## Copy principles

- Use natural Moroccan Darija in short promotional copy and clear Arabic in legal/product facts.
- Explain the product before pushing urgency.
- State no performance, immunity, disease-prevention, treatment, or body-transformation outcome unless the exact claim is substantiated and approved for Morocco.
- Support every trust badge, review, rating, "popular" label, scarcity message, delivery estimate, and guarantee with real records.
- Never create fake urgency. If a sale or stock counter is used, it must reflect a real, enforced offer or current inventory.

## Cross-sell selection

Use a small, curated product relation in the shared catalog. Prefer relevant, complementary products; avoid medical recommendations. Cross-sells should not obstruct checkout and should be dismissible. Record impression and add actions for measurement, subject to consent.
