# 8. Google Sheets Order Webhook

## Data flow

1. PostgreSQL stores the final order and a durable outbox record.
2. Backend sends the JSON envelope below to the Apps Script web app over HTTPS.
3. Apps Script verifies an HMAC signature, checks the order ID for idempotency, and appends exactly one row.
4. Apps Script returns a small JSON result. Backend marks the outbox item delivered only after a valid `{ "ok": true }` response.

The database remains the source of truth. A Sheet write failure must be retried from the backend outbox; do not lose an order or present a false success.

## Sheet template and columns

Create a Google Sheet with one tab named `Orders`, using [orders-template.csv](./templates/orders-template.csv) as the header row. The included script can initialize an empty tab with these headers. Restrict Sheet access because it contains customer personal data.

Column order:

1. order_id
2. created_at_utc
3. order_status
4. customer_name
5. customer_phone
6. customer_city
7. currency
8. payment_method
9. items_json
10. regular_subtotal_mad
11. quantity_offer_savings_mad
12. post_form_offer_mad
13. delivery_fee_mad
14. total_mad
15. attribution_json
16. webhook_received_at_utc

Use JSON in the items/attribution cells to preserve all order lines and permitted attribution fields without adding variable columns. Do not put raw phone numbers or names in attribution JSON.

## Signed request

Backend serializes the final order payload as compact UTF-8 JSON, then sends:

```json
{
  "payload_b64": "BASE64_OF_EXACT_UTF8_JSON_BYTES",
  "signature_hex": "LOWERCASE_HEX_HMAC_SHA256_OF_THE_DECODED_JSON_BYTES"
}
```

Both backend and Apps Script use the same high-entropy secret configured separately in Easypanel and Apps Script Script Properties. The signature is over the exact decoded payload bytes. Do not pass the secret in a URL or send it from the browser.

Example payload shape (use test data only):

```json
{
  "order_id": "opaque-order-reference",
  "created_at_utc": "2026-01-01T12:00:00Z",
  "order_status": "submitted",
  "customer": {
    "name": "Test Customer",
    "phone": "+212600000000",
    "city": "Test City"
  },
  "currency": "MAD",
  "payment_method": "cash_on_delivery",
  "items": [
    {
      "sku": "test-sku",
      "name": "Test product",
      "quantity": 1,
      "unit_price_mad": 280,
      "line_total_mad": 280,
      "item_kind": "regular"
    }
  ],
  "regular_subtotal_mad": 280,
  "quantity_offer_savings_mad": 0,
  "post_form_offer_mad": 0,
  "delivery_fee_mad": 0,
  "total_mad": 280,
  "attribution": {}
}
```

The zero delivery fee above is only test data; it does not assert free shipping. Replace every amount with the approved backend quote. Never use real customer records in examples.

## Apps Script setup

1. Create a test Google Sheet and an `Orders` tab.
2. Open **Extensions → Apps Script**, copy [Code.gs](./integrations/google-sheets/Code.gs), and save it.
3. In **Project Settings → Script Properties**, set:
   - `ORDERS_SHEET_ID` — test Sheet ID.
   - `ORDERS_SHEET_NAME` — `Orders`.
   - `WEBHOOK_HMAC_SECRET` — a new random secret, not the database password.
4. Deploy as a Web App. Select the execution/access mode needed for a server-to-server POST, restrict access as far as the deployment model permits, and test the signed-body authentication. Do not assume the script URL itself is secret authentication.
5. Copy the deployed URL to backend `GOOGLE_SHEETS_WEBHOOK_URL`; configure the same HMAC secret in backend `GOOGLE_SHEETS_HMAC_SECRET`.
6. Send a test order, inspect the row, retry the same order ID and verify no duplicate, then send a changed/invalid signature and confirm rejection.
7. Use a separate production Sheet, script properties, and webhook deployment only after end-to-end verification.

Apps Script web apps expose `doPost(e)` and request body through `e.postData.contents`; the script therefore authenticates the signed body rather than relying on an undocumented custom-header field. See [Google Apps Script web apps](https://developers.google.com/apps-script/guides/web).

## Failure handling

- Apps Script returns JSON `{ "ok": true, "order_id": "..." }` for a new or already-written order.
- Invalid body/signature, schema errors, missing properties, or Sheet errors return `{ "ok": false, "error": "..." }` without customer PII.
- Backend retries network/5xx/transient errors with bounded backoff and retains the outbox item. Permanent validation errors alert an operator.
- A duplicate `order_id` must not append another row. Do not treat an HTTP 200 response as success unless JSON parses and `ok === true`.
- Do not log request bodies, secrets, customer fields, or raw signatures.

## Privacy and retention

Limit Sheet access to staff who need it. Keep a documented retention period, avoid sharing public links, and do not use the Sheet as a public analytics export. Review the data transfer and retention with the business owner/legal adviser.
