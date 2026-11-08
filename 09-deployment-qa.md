# 9. Deployment, QA, and Launch Gates

## Deployment targets

- Frontend: Dockerized Next.js app at `vitalizemaroc.shop`.
- Backend: Dockerized FastAPI app at `api.vitalizemaroc.shop`.
- Database: PostgreSQL already available inside Easypanel. Use the internal service hostname and a rotated, least-privilege password in Easypanel environment settings; never hard-code the connection string.
- DNS/TLS: configure both hostnames, HTTPS certificates, reverse proxy, health checks, and correct forwarded headers.
- Google Sheets: Apps Script webhook URL and HMAC secret in backend-only environment variables.

The code includes the store/order/pricing flow, Sheets outbox worker, and consent-gated Meta/TikTok/Snap pixels plus server-side conversion APIs (see `07-tracking-privacy-security.md`). Platform ids/tokens stay blank until you configure them; none of the platform calls have been exercised against live accounts from this repository.

Build and run each container independently. Provide `compose.yaml` for local development without production credentials and with a disposable local PostgreSQL service, if practical. Pin image base versions and dependencies; use non-root users, health checks, and `.dockerignore`.

## Environment variables

The examples under `templates/` contain placeholders only. The AI coder must deliver copies as `frontend/.env.example` and `backend/.env.example`, document each variable, and ensure the production process fails clearly for missing required values.

Frontend values may include public canonical site URL, backend base URL, and public platform pixel IDs. They must not include DB credentials, Apps Script HMAC secrets, webhook tokens, or CAPI access tokens.

Backend values include database connection, CORS origin, Sheets webhook URL/HMAC secret, platform CAPI credentials, order-token/signing keys, environment, logging level, and allowed hosts. All production secrets belong in Easypanel secret/environment settings.

## Startup and migrations

Run Alembic migrations as a controlled startup/release step before traffic is routed. Serialize migrations so concurrent containers do not race. Run app readiness only after DB connectivity and compatible schema are established. Never drop/recreate production data at startup.

## Observability

- Structured logs with request/order reference and safe error codes, never PII or secrets.
- Health/readiness endpoints without exposing config or database contents.
- Alerts for DB outage, failed migrations, stuck upsell finalization, outbox retry exhaustion, repeated Sheet failures, and CAPI failures.
- Track funnel metrics: product views, add-to-cart rate, checkout started, valid orders submitted, confirmed orders, delivered orders, refused/returned orders, average order value, attach rate, and contribution margin. Distinguish orders from delivered revenue.

## Acceptance tests

### Storefront

- All routes render correctly in Arabic RTL on desktop and common phone widths.
- Header/menu/cart work by touch and keyboard; focus is visible.
- Product card and PDP add the chosen quantity and open the drawer.
- Cross-sells require an explicit click and never modify a submitted order.
- Cart shows exact line items, offer math, delivery fee, and total; backend quote is authoritative.
- Checkout requires name, valid Moroccan mobile, and city; field errors are clear and accessible.
- No payment card fields or payment gateway appear; COD is explicit.

### Pricing and order flow

- Approved pricing tests: Gummies 280 / 499 / 690; Immunity 240 / 440 / 620; Endurance 350 / 640 / 690 MAD for quantities 1 / 2 / 3.
- For quantities >3, verify complete groups of 3 plus the remainder: Gummies 4/5/6 = 970/1,189/1,380; Immunity = 860/1,060/1,240; Endurance = 1,040/1,330/1,380 MAD.
- Test mixed-cart totals as the sum of each SKU's independently calculated tier total, delivery fee configuration, post-form 99 MAD add-on, rounding, out-of-stock, and changed quote.
- An unset delivery fee disables order submission; setting `DELIVERY_FEE_MAD=0` explicitly means the owner has approved free delivery.
- Test valid local/international phone formats, invalid prefixes/country codes/lengths, Unicode names/cities, and harmless spaces/hyphens.
- Double submission, retries, refresh, expired offer, accept/expire race, and browser close create no duplicate or lost orders.
- Base order is saved even if the upsell is declined or expires; only accepted offers add one line at 99 MAD.
- Thank-you page never states COD order was delivered or paid.

### Webhook and security

- HMAC valid/invalid tests; duplicate order ID creates one row; Sheets outage retries from outbox.
- Test formula-injection strings beginning with `=`, `+`, `-`, and `@`; cells remain text.
- Confirm PII absent from URLs, client pixels, frontend logs, and routine backend logs.
- Confirm no secrets in Git history, Docker layers, source maps, or browser bundles.
- Verify consent gating and event deduplication in each platform's test tool before enabling live campaigns.
- Restore a database backup in a non-production environment.

### Required owner approvals before launch

- Final per-product 1/2/3 offer matrix and any reference prices.
- Real product SKU, photos, labels, ingredients, instructions, warnings, stock, legal status, and claim substantiation.
- Business identity, support channels, service hours, delivery coverage, delivery fee, delivery estimate, cancellation and return policy.
- Whether a courier can fulfill using only name, mobile, and city; if a street address is required, the owner must decide whether to add a field or collect it later through an approved secure process.
- Moroccan legal/privacy review, applicable CNDP steps, product/import/label/advertising review, policy text, and ad platform consent configuration.
- Logo mark "N" confirmation (or replace with V/ف).
- Real testimonials/reviews and permission, if any will be shown.

Do not launch ads or accept paid traffic until all blocking approvals are recorded and the full order-to-Sheet test succeeds.
