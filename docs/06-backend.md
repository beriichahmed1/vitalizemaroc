# 6. Backend, Data Model, and Order Lifecycle

## Recommended stack

- Python with FastAPI and Pydantic.
- PostgreSQL on the owner's Easypanel service.
- SQLAlchemy 2.x and Alembic migrations; pin compatible dependencies.
- Uvicorn/Gunicorn deployment appropriate to the selected container and replica model.
- Pytest and an isolated test database.

The owner's friendly database label is **Vitalize Maroc**. The intended PostgreSQL database name in the shared connection string is `vitalizemaroc`. Do not put the provided connection string or its password in source, docs, logs, images, GitHub, or example files. The password was disclosed in chat and must be rotated before production.

## Suggested structure

```text
backend/
  app/
    main.py
    api/
      routes/
        catalog.py
        quotes.py
        orders.py
        order_status.py
        health.py
    core/
      config.py
      security.py
      logging.py
    db/
      session.py
      models.py
      migrations/
    schemas/
    services/
      pricing.py
      order_service.py
      upsell_service.py
      webhook_outbox.py
      tracking.py
  tests/
  alembic.ini
  pyproject.toml
  Dockerfile
  .dockerignore
  .env.example
```

## API outline

Exact routes may change if the same contract is preserved and documented.

- `GET /health/live` — process liveness only; no secret/config leakage.
- `GET /health/ready` — readiness, including DB connectivity.
- `GET /v1/products` — only active/available public catalog fields.
- `POST /v1/quotes` — validate product IDs and quantities, return server-computed item/offer/delivery totals.
- `POST /v1/orders` — validate checkout details, idempotency key, catalog availability and quote; create durable pending order.
- `POST /v1/orders/{opaque_token}/upsell` — accept or decline the single allowed offer before expiry.
- `GET /v1/orders/{opaque_token}/status` — minimal status required to resume/thank the customer.

Use HTTPS, strict request schemas, request-size limits, rate limits, CORS allow-list for the storefront domain, and generic public errors. Never trust a submitted price, total, product name, discount, stock state, or payment status.

## Moroccan phone validation

Normalize on the server and share test vectors with the frontend. Accept Moroccan mobile numbers in a clearly defined format, initially local `06xxxxxxxx` / `07xxxxxxxx` and international `+2126xxxxxxx` / `+2127xxxxxxx`; strip approved spacing/hyphens, then normalize to `+212...`. Reject unsupported country codes, invalid length/prefix, extension text, and non-numeric junk. Confirm the current numbering rules and carrier requirements before launch. Do not claim that syntax validation proves the number is reachable.

## Price and quote rules

- Store money as integer MAD minor units (1 MAD = 100 centimes; whole-MAD values are okay for this catalog).
- The backend quote service owns quantity-offer logic, delivery fee, and final total.
- Implement the approved matrix in `backend/app/pricing.py`: Gummies 280 / 499 / 690 MAD; Immunity 240 / 440 / 620 MAD; Endurance 350 / 640 / 690 MAD for quantities 1 / 2 / 3.
- For quantities above three, compute `groups_of_3 * tier_3 + tier_(remainder)` for each SKU. A remainder of zero adds no extra amount. For mixed carts, calculate each SKU independently and sum.
- Keep the frontend display catalog synchronized, but never accept client-supplied prices as authoritative.
- Recalculate at order submission. If stock/price changed, return a quote-changed response and require customer review.
- Add the 99 MAD optional offer as a distinct line-item type. It does not silently alter the regular product offer tier.
- Maintain a price/quote snapshot on each order for auditability.
- `DELIVERY_FEE_MAD` is required for order submission (owner-approved value: `0`, free delivery). If unset, quotes may show item totals but must mark checkout unavailable.

## PostgreSQL entities in the current scaffold

- `orders`: UUID/order reference, idempotency key and request digest, order status, customer fields, currency, totals, upsell state, and timestamps.
- `order_items`: product snapshot, SKU, quantity, unit/line amounts, item kind (`regular` or `post_form_offer`).
- `webhook_outbox`: order ID, signed-delivery payload, attempts, next retry, delivery state, and safe error code.
- `order_events`: order lifecycle audit events without unnecessary customer data.
- `tracking_outbox`: one row per order and ad platform (only for consented orders), with attempts, backoff and a safe error code. `orders.tracking_context` holds click ids/IP/user-agent until all sends finish, then is cleared.

The public product catalog and approved prices currently live in version-controlled backend configuration (`app/pricing.py`); the frontend has a display mirror. If owner-operated catalog/price editing is added, move these records into versioned database tables and migrations. Consent records and platform-event outboxes are not active until tracking consent and the applicable legal basis are approved.

Add unique constraints for order idempotency key, order reference, outbox event ID, and one upsell decision per order. Use transactions and row-level locking where needed.

## Order lifecycle

1. Client sends the validated cart and three required customer fields.
2. Backend validates phone, price version, stock, delivery settings, idempotency, and order total; creates an order in a pending-upsell state within a DB transaction.
3. Backend returns an opaque signed token and absolute `expires_at`; do not expose the database ID or PII.
4. If eligible, show the optional single 99 MAD offer for 10–15 seconds (default 15s after owner approval). Accept/decline endpoints enforce the server deadline and are idempotent.
5. If accepted, add exactly one eligible line item. If declined, expired, unavailable, or no longer eligible, finalize the base order only.
6. A durable worker finalizes expired offers even if the shopper closes the browser, then writes an outbox event in the same DB transaction.
7. A retrying worker posts the signed order payload to the Google Apps Script webhook, records success/failure, and retries transient failures with bounded exponential backoff and alerting. The database is the order system of record; the Sheet is an operational copy.
8. Thank-you page shows only the final order state and appropriate next-step wording. COD submission is not proof of confirmation, shipment, delivery, or payment.

Never rely only on a browser timer, in-memory background task, or webhook request made directly from the browser. Do not falsely tell the customer an order succeeded if the durable DB write failed.

## Migrations and startup

Include Alembic migrations and run them during deployment/startup as requested, but avoid multiple replicas racing to migrate. Use a one-shot release/migration command or a database advisory lock and a single migration leader before app workers accept traffic. The app should fail readiness if the schema is incompatible. Do not delete data or auto-reset the database on startup.

## Data protection and operations

- Store only fields required for COD delivery and support; encrypt transport and use host/database encryption at rest where available.
- Restrict admin/database/Sheet access; never put customer data in routine logs, error traces, URLs, analytics, or screenshots.
- Apply a documented retention/deletion policy; owner/legal review required.
- Sanitize spreadsheet text values against formula injection before creating the webhook payload/row.
- Keep HMAC/API secrets in Easypanel environment variables, rotate compromised credentials, and redact them from logs.
- Use idempotent retries and safe error messages. Alert on persistent webhook failures and orders stuck in pending/outbox states.
