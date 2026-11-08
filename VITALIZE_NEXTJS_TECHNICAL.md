# VITALIZE / فيتاليز: WEBSITE-ONLY TECHNICAL AND CONVERSION BRIEF

## 1. Goal and scope

Build a fast, mobile-first Moroccan e-commerce website for three products. The entire purchase journey stays on the website: discover products, add them to a cart drawer, review cross-sells, complete a short checkout popup, optionally accept one timed offer, and see an order confirmation and more products on the thank-you page. Send the final accepted order through a server-side webhook to a Google Sheet.

**In scope:** home, collection, three product pages, cart drawer, checkout popup, one timed post-form upsell, thank-you page, contact, policies, header, footer, and the order webhook.

**Out of scope for now:** subscriptions, quiz, WhatsApp, SMS, messaging automation, email capture or confirmations, accounts, blog, separate cart or checkout pages, payment gateway, fulfillment integrations, and unrelated campaigns or systems. Do not include links, fields, buttons, dependencies, or setup instructions for these.

This brief supersedes conflicting website features and example claims in the older strategy and roadmap documents. Do not invent business details, product benefits, ratings, testimonials, prices, delivery promises, or legal terms.

## 2. Storefront structure

| Route | Purpose |
| --- | --- |
| `/` | Home page |
| `/collections/all` | Collection with all three products |
| `/products/vitality-gummies` | VITALITY GUMMIES |
| `/products/immunity-shield` | IMMUNITY SHIELD |
| `/products/endurance-power` | ENDURANCE POWER |
| Cart drawer | Shared drawer available across the website; no separate cart route |
| `/thank-you` | Successful order confirmation and recommendations |
| `/contact` | Contact information |
| `/policies/privacy` | Privacy policy |
| `/policies/shipping` | Shipping and delivery policy |
| `/policies/returns` | Returns and refunds policy |
| `/policies/terms` | Terms of service |

Use the existing project if one is available; otherwise use Next.js App Router, TypeScript, and Tailwind CSS. Use a shared product catalog and reusable product cards, cart logic, price formatting, header, and footer. Only three active products and their corresponding pages are in scope. Extra policy pages may be added if legally required, but do not add unrelated marketing pages.

### Product data

The existing product names are working names to confirm. The approved normal prices are:

| Product | Normal price per item |
| --- | ---: |
| VITALITY GUMMIES | 219 DH |
| IMMUNITY SHIELD | 169 DH |
| ENDURANCE POWER | 329 DH |

Confirm names, SKUs, availability, images, ingredients, usage instructions, and compliant product copy before launch. The catalog is the single source of truth for product IDs, slugs, normal prices, images, availability, and cross-sell relationships. Do not display placeholder reviews or unverified health, medical, performance, or delivery claims.

### Standard quantity offers

The following discounts apply to **any mix of the three products**, including multiple units of the same product:

| Number of regular items | Discount on normal prices |
| ---: | ---: |
| 1 | 0 DH |
| 2 | 20 DH |
| 3 | 50 DH |

For more than three regular items, apply 50 DH off for each complete group of three, then 20 DH off if exactly two items remain. A single remaining item gets no discount. For quantity `n`, discount = `50 * floor(n / 3) + (n % 3 === 2 ? 20 : 0)` DH. Since the discount depends only on item count, no product grouping or allocation is necessary. For example, two Immunity cost 318 DH; Gummies + Immunity cost 368 DH; one of each costs 667 DH; four items get 50 DH off, five get 70 DH off, and six get 100 DH off. Apply the same calculation on client and server; the server is authoritative. Use integer DH amounts. The confirmed 65 DH is an internal fulfillment cost **per order**, including orders with three items; it is not automatically a customer delivery charge. The customer-facing delivery fee remains subject to verified delivery rules.

Every ordinary product recommendation, cross-sell, and upsell throughout the site, including on the thank-you page, displays that product's normal catalog price, not a special recommendation discount. Clearly explain that adding items may change the cart's overall quantity-offer total; show the bundle savings at order level, not a misleading fixed discounted unit price. The **only additional special product discount** is the optional, single 99 DH offer after checkout form validation, limited to Gummies or Immunity. That item is separate from the regular quantity offers and does not count towards their item threshold.

## 3. Shared layout and experience

- **Header:** VITALIZE / فيتاليز brand/logo linking home, collection link, and cart icon with item count. Provide a compact accessible mobile menu; keep the cart visible.
- **Footer:** links to home, collection, contact, and every policy; show only verified business/contact details. No subscription form or messaging links.
- **Design:** polished, trustworthy, consistent brand identity; clear visual hierarchy, quality product imagery, prominent CTAs, readable typography, generous spacing, and responsive layouts.
- **Accessibility:** semantic links and buttons, visible focus states, usable keyboard navigation, descriptive labels and alt text, sufficient contrast, and reduced-motion support. Keep the primary action easy to reach on mobile without covering important content.
- **Language and currency:** use approved customer-facing language consistently and display prices in MAD. If Arabic is used, support RTL layout. Do not assume translations or business claims are approved.

## 4. Pages and conversion flow

### Home

Present a clear value proposition, a main CTA to the collection, the three featured products with prices and links to their details, and concise trust and delivery information backed by real business facts. Use genuine reviews only when available and authorized. Make contact and policies easy to find.

### Collection

Show all three products with image, name, normal price, a product-detail link, and an explicit **Add to cart** or **Buy** button. Clicking the purchase CTA adds one unit and opens the cart drawer, where cross-sells are visible. A separate detail link opens the product page without adding anything. Repeated intentional clicks add the selected quantity rather than creating duplicate line items.

### Product pages

Each product page includes verified product images, name, normal price, quantity offers, description, relevant details and usage, clear delivery/payment information, and a quantity selector with a prominent purchase CTA. Clicking it adds the chosen quantity and opens the cart drawer.

At the bottom, show relevant cross-sells from the other active products, with image, name, normal catalog price, product link, and an explicit add-to-cart action that opens or updates the drawer. Never add anything without a customer action. Respect availability; do not recommend unavailable products. Use factual, approved product information only.

### Cart drawer

- Open the drawer from the header cart icon and after a purchase CTA. It overlays the current page; there is no cart page. Include a visible close button, Escape support, focus containment and restoration, and a mobile-friendly layout.
- Show each item, image, name, normal unit price, quantity, remove control, regular subtotal at catalog prices, quantity-offer savings, resulting merchandise subtotal, delivery fee, and total in DH. Customers can update quantities or remove items; totals update immediately. Do not present an arbitrary allocation of a mixed bundle discount as a product's fixed sale price.
- Persist the cart across navigation and refresh. Validate quantities and re-check product availability, pricing, and delivery fees on the server at checkout; client-side totals are estimates until confirmed.
- Show relevant cross-sells from other active products not already in the cart, each at its normal catalog price, with an explicit add button. Adding one updates the cart and quantity-offer totals without opening checkout. If all products are already in the cart, omit the section.
- If empty, show a clear empty state and link to the collection; disable or hide checkout.
- The main checkout CTA opens the checkout popup over the current page, not a separate checkout page. Do not automatically add any products or fees. Coordinate drawer and popup focus so only the active overlay traps focus.

### Checkout popup

Use an accessible modal dialog: focus moves into it when opened, is contained while open, and returns to the checkout button when closed. Provide a visible close button and Escape support, preserve entered values when closing and reopening, and make the layout usable on small screens.

Display a compact order summary with each item, quantity, normal unit price, regular subtotal, quantity-offer savings, merchandise subtotal, delivery fee, total payable, and payment method. Allow the customer to close the popup and edit the cart. The total must match the server-confirmed order before submission; if pricing or availability has changed, show the changes and require the customer to review and submit again.

Collect **exactly three required fields**:

1. **Name**: trim whitespace; require a meaningful non-empty name.
2. **Phone**: Moroccan mobile number starting with `0`. Show the example `0612345678` below the field. Accept common spaces or hyphens, normalize them, then validate exactly 10 digits matching `^0[67][0-9]{8}$`. Show an actionable inline error for invalid values. Validate on both client and server; use `type="tel"` and a mobile-friendly numeric keyboard.
3. **City**: require a non-empty city; offer autocomplete only if a verified city list is available. Do not require email, street address, or any fourth field.

Display the actual agreed delivery fee and an honest delivery estimate when configured. Explain the payment method and any real next steps in plain language. Link to the privacy policy and relevant order policies without adding a subscription or unnecessary checkbox. Use a clear CTA such as **Confirm order** and explain that one optional offer will appear next; clicking commits the customer to the displayed base order, regardless of whether they accept that offer. Show submission progress and disable repeated submissions while a request is in flight. Report errors near the form without losing entered information.

Cash on delivery is the proposed payment method from the earlier brief; confirm it before launch. If a street address is needed for delivery, arrange its collection through a separately approved operational process; do not silently add an address field or promise fulfillment without a workable process.

### Timed post-form offer

After the three fields and cart pass server validation and the base order is durably recorded, show **one** eligible available product for **99 DH** as an optional extra, with its image, name, actual normal catalog price, 99 DH offer price, and revised total including delivery. Only VITALITY GUMMIES and IMMUNITY SHIELD are eligible; never offer ENDURANCE POWER at 99 DH. This is the only special discounted product offer on the site; it is not shown in ordinary cross-sells or applied automatically.

Choose the single most relevant eligible product based on the cart using an explicitly configured product-affinity ranking and deterministic tie-breaker. Prefer an eligible product not already in the cart; if both eligible products are present, choose the highest-ranked available eligible product. This is a rule-based recommendation, not a claim about a customer's actual purchase probability. If no eligible product is available, skip the offer and finalize the base order.

Use a **15-second** offer window, measured against a server-issued deadline. Present a visible countdown, **Add for 99 DH**, and **No thanks, complete my order**. Accepting adds exactly one unit at 99 DH, separate from the regular quantity offers. Declining, closing the offer, or expiry finalizes the original order without the extra item; no additional confirmation click is required. If the customer leaves or loses connection, a durable scheduled worker finalizes the base order after the deadline, so an order is not lost just because the browser disappears. Refresh must resume the same attempt and remaining time, never restart the countdown. The server enforces the deadline and resolves an accept/expiry race atomically; an expired or unavailable offer is not added. Do not show a false success if finalization or webhook delivery is still pending.

The offer summary must show any delivery fee change before acceptance. If the fee or offer eligibility changes, do not silently charge more: show the revised details and request review where still possible, otherwise finalize the base order.

### Thank-you page

Only show an order as placed after the server confirms the webhook receiver accepted it. Show a clear confirmation, order reference, ordered items, quantities, regular quantity-offer savings, any explicitly accepted 99 DH item, delivery fee, final total and payment method, and truthful next steps and delivery estimate. Avoid claiming the order was delivered or paid. No personal data in the URL or analytics.

Show the **delivery fee/rate** and estimated delivery time if verified and configured. If "delivery rate" means a successful-delivery percentage, show it only when measured and verifiable; otherwise omit the percentage. Do not invent a delivery fee, percentage, or timeframe.

Below the confirmation, recommend other available products with images, normal catalog prices, product links, and explicit add-to-cart buttons. These buttons start a **new cart/order**, open the cart drawer, and use the standard quantity offers; they never modify the order just placed or submit another order automatically. Do not repeat the 99 DH offer on this page. If there are no eligible recommendations, omit the section.

The confirmation should survive a refresh without exposing another customer's details: use a short-lived, high-entropy receipt token or equivalent server-side authorization. Do not put customer name or phone in the URL. If the receipt cannot be retrieved, show a neutral message with a contact link, not a fabricated confirmation.

## 5. Ordering, webhook, and Google Sheet

### Server-side order flow

1. On checkout confirmation, the browser sends name, phone, city, product IDs, quantities, the total the customer reviewed, and a unique idempotency key to `POST /api/orders`. The reviewed total is only for comparison and is never trusted for pricing.
2. The server validates the fields, cart, positive integer quantities, product availability, and configured delivery rules. Look up prices in the server-controlled catalog and calculate the best standard quantity-offer total and delivery fee. Reject unknown products and invalid or empty carts. If the confirmed cart or total differs from what the customer reviewed, request review before creating a committed order.
3. Assign a unique order reference and persist the validated base order, price snapshots, idempotency key, offer choice, deadline, and secure status/receipt access token in durable storage. The order is committed but not yet sent to the sheet. Do not rely on in-memory state in a serverless deployment. A durable scheduled job must be able to finalize expired offers even if the customer leaves. If no eligible offer exists, proceed directly to finalization.
4. On explicit acceptance before the deadline, atomically add exactly the offered product at 99 DH and finalize. On decline, close, or expiry, atomically finalize the base order unchanged. Record the decision and final totals before dispatching the webhook. Concurrent or repeated accept/decline/expiry requests must resolve to one final state. Make the authorized status endpoint recoverable after a refresh or interruption.
5. Send the **final** order from the server to the configured webhook receiver, including any accepted 99 DH item, quantity-offer savings, and final total. The receiver writes one row per order to the Google Sheet, including the stable order reference and item details. Never expose the webhook URL or its secret to the browser. The receiver must authenticate requests, validate the payload, deduplicate by order reference, and return success only after the row is saved.
6. Mark the order accepted only after the receiver confirms success. Return the reference and authorized receipt, clear the purchased cart, and navigate to `/thank-you`. Keep the cart and entered form values intact while finalization or delivery is pending or fails; ensure a pending committed order cannot be submitted again as a new order.

Use the same idempotency key for retries of the same submitted order. On a timeout or ambiguous receiver response, keep the order in a pending/unknown state and retry or reconcile with the receiver using the same order reference; the receiver's deduplication must prevent duplicate sheet rows. Do not claim failure or success if the outcome is unknown: explain that confirmation is pending, prevent an uncontrolled new submission, and provide a safe status/retry path and contact details. If the order contents change, treat the revised submission as a new attempt only after the earlier outcome is resolved. Log operational failures without logging personal information or webhook secrets. Provide an operator-visible way to identify and resolve stuck orders.

The webhook receiver and durable order store are required deployment components, not assumed built-in Google Sheets features. Configure and test the receiver (for example, a secured service or automation connected to the sheet) before launch. Do not store service credentials or webhook secrets in source control.

### Example webhook payload

This example shows two regular items plus an accepted 99 DH offer. Names and the delivery fee are illustrative, not approved catalog or delivery data:

```json
{
  "orderReference": "VIT-example",
  "createdAt": "2026-01-01T12:00:00Z",
  "customer": {
    "name": "Example Customer",
    "phone": "0612345678",
    "city": "Casablanca"
  },
  "items": [
    {
      "productId": "vitality-gummies",
      "name": "VITALITY GUMMIES",
      "quantity": 1,
      "unitPriceMad": 219,
      "lineTotalMad": 219,
      "pricingType": "regular"
    },
    {
      "productId": "endurance-power",
      "name": "ENDURANCE POWER",
      "quantity": 1,
      "unitPriceMad": 329,
      "lineTotalMad": 329,
      "pricingType": "regular"
    },
    {
      "productId": "immunity-shield",
      "name": "IMMUNITY SHIELD",
      "quantity": 1,
      "unitPriceMad": 99,
      "lineTotalMad": 99,
      "pricingType": "post_form_offer"
    }
  ],
  "regularSubtotalMad": 548,
  "quantityOfferSavingsMad": 20,
  "regularTotalMad": 528,
  "postFormOfferTotalMad": 99,
  "subtotalMad": 627,
  "deliveryFeeMad": 0,
  "totalMad": 627,
  "paymentMethod": "cash_on_delivery"
}
```

The example's zero fee does not imply free delivery. If the offer is declined or expires, omit the offer item, set its total to zero, and send the base order only. Configure the real fee and payment method before taking orders. The sheet should include the order reference, timestamp, customer fields, item details and pricing type, regular subtotal, quantity-offer savings, any accepted offer, merchandise subtotal, delivery fee, final total, and payment method. Restrict sheet access and follow an approved retention policy.

## 6. Contact, policies, and trust

- Contact page: publish verified business identity, available contact method(s), and support hours or response expectations. Do not offer WhatsApp or SMS. A contact form is not required.
- Privacy: explain the three fields collected, order processing, webhook/Google Sheet data sharing, retention, customer rights, and how to contact the business. Include analytics/cookie disclosures only if applicable.
- Shipping: state actual service areas, delivery fees, estimated times, and how delivery details are obtained.
- Returns/refunds: state the actual eligibility, process, deadlines, and any product-specific conditions.
- Terms: cover the actual ordering, payment, pricing, and cancellation terms.
- Have the business owner review and approve policy text and applicable Moroccan legal requirements before launch. No invented guarantees, review counts, or delivery statistics. The timed offer countdown must reflect its actual enforced deadline, not fabricated scarcity.

## 7. Implementation and security

Suggested structure:

```text
app/
  page.tsx
  collections/all/page.tsx
  products/[slug]/page.tsx
  thank-you/page.tsx
  contact/page.tsx
  policies/[slug]/page.tsx
  api/orders/route.ts
  api/orders/status/route.ts
  api/orders/offer/route.ts
components/
  Header.tsx
  Footer.tsx
  ProductCard.tsx
  CrossSellSection.tsx
  CartDrawer.tsx
  CheckoutModal.tsx
  TimedOffer.tsx
lib/
  products.ts
  cart.ts
  orders.ts
  webhook.ts
  validation.ts
```

- Provide a durable scheduled worker or queue to finalize expired offers and dispatch webhooks, including after a browser closes. This is a required deployment component, not a browser timer or an assumed Next.js feature.
- Store secrets in server-only environment variables, such as `ORDER_WEBHOOK_URL`, `ORDER_WEBHOOK_SECRET`, and the durable order-store connection string. Never use a `NEXT_PUBLIC_` prefix for secrets.
- Use HTTPS, validate and limit request sizes, rate-limit order submission, and sanitize data before inserting it into a sheet to prevent spreadsheet formula injection. Restrict operational access to customer data.
- Use a unique database constraint for the idempotency key and order reference; make state changes and retry handling safe under concurrent requests. Configure webhook timeouts, bounded retries, and operational alerts. The status/receipt endpoint must authorize access with a secure token and return only the information needed for that order.
- Avoid unnecessary dependencies and external services. If analytics is enabled, respect applicable consent requirements, do not send customer details, and fire purchase events only after confirmed acceptance, deduplicated by order reference.
- Optimize product images, page metadata, performance, and mobile loading. Use responsive layouts and test keyboard and screen-reader access.

## 8. Acceptance and launch checklist

- [ ] Home, collection, exactly three product pages, cart drawer, contact, policies, and thank-you page work on mobile and desktop; header and footer links work. No separate cart page exists.
- [ ] Collection and product purchase CTAs add the correct quantity and open the drawer. Product-page and drawer cross-sells add only when clicked; cart quantities, removals, persistence, and totals work.
- [ ] Regular unit prices are 219 / 169 / 329 DH. Quantity discounts for 1, 2, 3, 4, 5, and 6 items are 0 / 20 / 50 / 50 / 70 / 100 DH respectively. Two Immunity total 318 DH, Gummies + Immunity total 368 DH, and one of each totals 667 DH before delivery. Normal recommendations show each product's normal catalog price and bundle savings are accurately disclosed.
- [ ] Empty cart cannot check out. Popup opens from the drawer, works with keyboard and touch, closes and restores focus, and retains entered values.
- [ ] Only name, Moroccan mobile phone, and city are required. `0612345678` and `0712345678` pass; empty fields, `+212612345678`, wrong prefixes, and wrong lengths fail. Spaces and hyphens normalize consistently on client and server.
- [ ] Unknown products, unavailable products, invalid quantities, manipulated prices, and changed totals are rejected or require explicit review as described above.
- [ ] Only one eligible, cart-relevant offer appears after valid form submission, for 99 DH and for 15 seconds. Only Gummies or Immunity can be offered; Endurance is never eligible. Acceptance adds exactly one separate offer item; decline, close, expiry, no eligible product, and leaving the browser finalize only the base order. Refresh does not restart the deadline. Accept/expiry races and unavailable offers cannot add extra items or create duplicate orders.
- [ ] Successful finalization produces one correct sheet row, a unique reference, an authorized receipt, a cleared purchased cart, and the correct thank-you summary, with the 99 DH item only when accepted. A refresh does not duplicate the order.
- [ ] Double-clicks, retries, concurrent requests, webhook errors, and timeouts cannot create duplicate orders or sheet rows. Unknown outcomes remain pending and recoverable; no false success is shown.
- [ ] Thank-you recommendations show the normal price and create a new cart only on click; they do not alter the confirmed order or repeat the 99 DH offer.
- [ ] Delivery fee, delivery estimate, product content, policies, payment method, and contact details are verified before launch. Any delivery-success percentage or reviews displayed are real and supportable.
- [ ] Webhook secrets remain server-side, sheet access is restricted, personal data is not exposed in URLs or logs, and privacy/retention practices are approved.

Run the relevant existing tests, lint, type-check, and production build. Exercise the webhook against a test receiver and test sheet, including a simulated timeout after a successful sheet write, before enabling real orders.

## 9. Locked brand and domain

- **Brand name:** VITALIZE
- **Arabic equivalent:** فيتاليز
- **Official domain:** `vitalizemaroc.shop` (purchased by the owner).
- **Vitalize Maroc / فيتاليز المغرب** may be used as a Morocco-specific descriptor or account handle, but the primary brand name remains **VITALIZE / فيتاليز**.

Use the chosen brand consistently across the website, logo, page titles, policies, and customer-facing copy. Configure the purchased domain and HTTPS for the deployment. Domain ownership does not establish trademark rights; verify those separately.
