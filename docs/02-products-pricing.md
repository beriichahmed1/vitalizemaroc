# 2. Products, Pricing, and Launch Decisions

## Owner-provided catalog

Use the following names and descriptions as working catalog data. Verify exact supplier SKU, pack size, ingredients, label, usage instructions, warnings, stock, shipping dimensions, and allowed claims against the actual product listing and package before publishing.

| Slug | Arabic working name | English working name | Owner-provided details | Stated normal price |
|---|---|---|---|---:|
| `vitality-gummies` | فيتاليتي غوميز – علكات الطاقة والتركيز | Vitality Gummies | Energy and focus gummies; exact formula and claims unverified | 280 MAD |
| `immunity-shield` | إيمونيتي شيلد – درع المناعة | Immunity Shield | Vitamin C and spirulina; formula, amount, and claims unverified | 240 MAD |
| `endurance-power` | إندورانس باور – مسحوق الطاقة والبروتين | Endurance Power | Powder for energy, sport, and endurance; ingredients and claims unverified | 350 MAD |

These are owner-provided working names, not proof of the products' medical efficacy, regulatory status, or manufacturer identity.

## Final approved quantity prices

The owner approved these product-specific totals:

| Product | 1 unit | 2 units | 3 units |
|---|---:|---:|---:|
| Vitality Gummies | 280 MAD | 499 MAD | 690 MAD |
| Immunity Shield | 240 MAD | 440 MAD | 620 MAD |
| Endurance Power | 350 MAD | 640 MAD | 690 MAD |

The owner explicitly selected **690 MAD** for three Endurance units from the offered 920/690 alternatives. This approved table replaces the earlier common 280 / 499 / 690 proposal and resolves the price conflict.

Do not implement mixed-SKU bundles as a quantity offer. In a mixed cart, compute each SKU's quantity total independently, then add those totals. Keep all prices in the backend catalog; the frontend only displays them and requests authoritative quotes.

For quantities above three, apply complete groups of three plus the remaining one or two units at that product's approved tier. Examples:

| Product | 4 units | 5 units | 6 units |
|---|---:|---:|---:|
| Vitality Gummies | 970 MAD | 1,189 MAD | 1,380 MAD |
| Immunity Shield | 860 MAD | 1,060 MAD | 1,240 MAD |
| Endurance Power | 1,040 MAD | 1,330 MAD | 1,380 MAD |

The owner-approved 3-unit Endurance total is a deep reduction from three single units. Do not revise it in code. The owner should review contribution margin against actual supplier, fulfillment, advertising, and refusal/return costs before scaling campaigns.

## Offer UX after approval

- Each product page has a clear 1 / 2 / 3 quantity choice with the exact product-specific total and per-item equivalent, if useful.
- Show the quantity totals as approved bundle prices. A "save X MAD" badge is allowed only when measured against buying the same number of single units at the store's real single-unit price (the storefront does this); no other crossed-out reference prices or discount percentages unless the basis is real, owner-approved, and legally reviewed.
- Do not preselect a larger quantity or add products without a clear user action.
- Cart quantity changes must re-run the server-authoritative quote, applying tiers independently per SKU.
- Show delivery fee separately; never silently fold an unverified fee into the product price.
- There is one permitted special discount: a relevant, optional, single-item **99 MAD** post-form offer, shown after valid checkout details are submitted. It is not a permanent catalog price, is not cumulative with quantity offers, and must not be pre-applied.
- The 10–15 second offer period must be server-timed. Use 15 seconds by default only after the owner confirms. Do not fake the expiry or restart it on refresh.

## Launch configuration gate (not a product-price blocker)

The approved product prices are ready in code. **Free delivery is now owner-approved**: prices are all-inclusive for all Moroccan cities, so `DELIVERY_FEE_MAD=0` (explicit; an unset value still disables order intake). Delivery-time promises are not published because no delivery SLA was provided.

## Verified product facts (owner-supplied, 2026-11)

- Delivery: free, all-inclusive price; courier allows inspection on delivery (Déballage) before payment.
- Guarantee: 30-day return/exchange for packaging or manufacturing defects only.
- **Immunity Shield:** vitamin C 500 mg, spirulina 300 mg, zinc 15 mg; 60 capsules per box = one month. Confirm with the supplier whether amounts are per capsule or per daily dose before ads mention dosing. No lab certificate exists, so use "complete and transparent formula" wording; never claim lab-tested/certified.
- Gummies and Endurance: composition not yet supplied; the product page points to the label. Add them to `frontend/lib/product-content.ts` once verified.
- Health wording stays at "contributes to / supports" (vitamin C and zinc: normal immune function; vitamin C: reduction of tiredness; zinc: cell protection from oxidative stress). No cure/treat/prevent claims.
- Reviews: `frontend/lib/reviews.ts` is empty by design; the proof section appears only when real, consented reviews are added. No scarcity counters until real stock numbers exist.
- WhatsApp: set `NEXT_PUBLIC_WHATSAPP_NUMBER` (build arg). Without it every WhatsApp button is hidden.

## Claims and product proof register

Before creating product-page claims, obtain and review:

- Supplier product listing and stable SKU/variant ID.
- Photos of all label panels and package contents.
- Complete ingredient list and quantity per serving, where applicable.
- Manufacturer identity and origin, where available.
- Directions, warnings, contraindications, storage, and expiry.
- Product batch/quality documents and any certification documents, including scope, issuer, and validity.
- Applicable authorization, import, labelling, and advertising requirements for Morocco.
- Evidence supporting each exact claim used in ads and on the site.

The existing root planning documents contain unsupported health claims, review counts, endorsements, certifications, and testimonials. They are **not evidence** and must not be copied into the storefront.
