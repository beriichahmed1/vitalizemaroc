# 10. Prompt for the AI Coder

Copy the prompt below into your coding agent after opening the project root and giving it access to the full `docs/` folder.

---

You are the implementation engineer for **Vitalize Maroc**, a branded, Arabic-first Moroccan COD ecommerce store. Read all documents in `docs/` before coding, especially `docs/02-products-pricing.md`, `docs/06-backend.md`, `docs/07-tracking-privacy-security.md`, and `docs/09-deployment-qa.md`. These docs are the source of truth for this implementation.

## Deliverables

Build a working repository with:

1. `frontend/`: responsive Next.js App Router + React + TypeScript + Tailwind store.
2. `backend/`: Python FastAPI service, PostgreSQL persistence, Alembic migrations, durable order/outbox handling, and tests.
3. `docs/integrations/google-sheets/Code.gs`: keep or improve the provided Apps Script, preserving signed-body authentication, formula-injection protection, and idempotent writes.
4. `docs/templates/orders-template.csv`, `frontend/.env.example`, and `backend/.env.example`.
5. Dockerfiles, `.dockerignore`, local development compose configuration, production/deployment instructions, and automated tests.

Implement the complete experience: home, collection, three product pages, about, contact, policy pages, product galleries with replaceable neutral placeholders, product CTA, cart drawer with optional cross-sells, checkout dialog with only name/phone/city, COD order summary, optional server-timed 99 MAD upsell for 10–15 seconds, durable order finalization, thank-you page, and Google Sheets webhook. Use Arabic RTL and Moroccan copy as specified. The site domain is `vitalizemaroc.shop`; API domain is `api.vitalizemaroc.shop`.

## Mandatory safety/correctness rules

- Do not copy any database credentials from chat or old files. They were disclosed and must be rotated. Use placeholders in examples.
- Do not invent reviews, stars, customer counts, health/science results, medical endorsements, certifications, stock scarcity, shipping times, guarantees, business credentials, or legal terms. Older root planning documents contain unsupported statements; do not reuse them.
- Do not imply Vitalize manufactures products. Verify all product facts against actual supplier labels/docs before publishing.
- Use the final approved per-product quantity totals exactly: Gummies 280 / 499 / 690 MAD; Immunity 240 / 440 / 620 MAD; Endurance 350 / 640 / 690 MAD for quantities 1 / 2 / 3. The owner chose 690 MAD for three Endurance units. For quantities >3, apply complete groups of 3 plus the remainder; in mixed carts, calculate each SKU independently. Add tests for these totals and keep backend pricing authoritative.
- Do not show crossed-out savings or discount percentages unless the reference-price basis is real and legally reviewed. The normal single-item catalog prices are 280 / 240 / 350 MAD respectively.
- Production checkout requires `DELIVERY_FEE_MAD` to be set; the owner approved free delivery, so use `0`. Do not publish delivery-time promises.
- Keep delivery fee, address collection, legal/product approval, and requested circular N monogram as explicit launch decisions, not guesses.
- The backend is authoritative for catalog, prices, quantity offers, availability, delivery charge, order totals, expiry, order state, and final order IDs.
- Do not send raw or hashed personal data from browser pixels. Only server-side hash platform matching fields when legally approved and consented to; verify each platform's current official normalization/schema.
- Defer/lazy-load marketing scripts without blocking rendering and obey consent requirements. Deduplicate overlapping Pixel/CAPI events with the same event name and exact event ID.
- A COD order form submission is not delivery or payment. Do not overstate Purchase/revenue reporting.
- Google Sheets is an operational copy; PostgreSQL is the source of truth. Use an outbox and idempotent retries.
- Migration on startup/deploy must be serialized; no destructive database reset.

## Engineering expectations

Inspect the existing workspace before editing and preserve unrelated files. Follow the docs and keep implementation minimal, typed, accessible, secure, and production-oriented. Use explicit error states, no broad silent catches, no success-shaped fallbacks, and no PII in logs or URLs. Add unit tests for pricing, phone normalization, order state/idempotency, HMAC verification, and event mapping, plus end-to-end tests for the principal customer journey. Run formatting, lint, type checks, tests, and production builds; report commands and results.

First report only truly blocking owner decisions if they prevent safe production behavior. The price matrix is approved; do not ask the owner to approve it again. You may continue implementing non-blocked work with feature flags or disabled checkout. At completion, summarize what is implemented, what still requires owner verification, exact environment variables, deployment steps, and test results.

---

## Owner inputs to collect before production

The owner has approved price tiers per SKU. Still provide real supplier product pages/labels/images, delivery fees/coverage and address workflow, business/contact details, policy decisions, valid support channel, tracking consent/legal review, and confirmation of the N monogram. Do not put secrets in the repository; enter them directly into Easypanel secret settings.
