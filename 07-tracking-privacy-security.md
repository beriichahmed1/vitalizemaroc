# 7. Pixels, CAPI, Privacy, and Security

## Implementation status (this repository)

- **Browser:** `frontend/lib/tracking/` loads Meta, TikTok and Snap pixels only after the visitor accepts the consent banner (`NEXT_PUBLIC_REQUIRE_TRACKING_CONSENT=true`). The pixel stubs are installed immediately so events queue, while the vendor scripts are injected after `load` + idle time (deferred, non-blocking). Meta `autoConfig` is disabled so no form field is read automatically. No name/phone/city is ever passed to a pixel.
- **Events:** `ViewContent`, `AddToCart`, `InitiateCheckout` (browser only) and `Purchase` (browser + server). Event names per platform are defined once in `frontend/lib/tracking/events.ts` and `backend/app/tracking/capi.py`; a test asserts the Purchase names match.
- **Deduplication:** the **order id** is the shared identifier: Meta `eventID`/`event_id`, TikTok `event_id`, Snap `transaction_id`/`event_id`. The thank-you page fires the browser Purchase once per order (session guard); the platforms also deduplicate repeats within 48 hours.
- **Server (CAPI):** created by the worker from a `tracking_outbox` table only when (a) the visitor consented, and (b) both the platform id and token are configured. Retries use backoff; permanent 4xx errors stop retrying. Click ids/cookies and the IP/user-agent are stored on the order only with consent and are erased once all sends finish.
- **Hashing (server only, SHA-256 lowercase hex):**

| Platform | Phone input `+212612345678` is hashed as | Other identifiers |
|---|---|---|
| Meta | `212612345678` (digits, country code, no `+`, no leading zeros) – matches Meta's documented example vector in tests | `ct` (lowercase, no spaces/punctuation) and `country=ma` hashed; `client_ip_address`, `client_user_agent`, `fbp`, `fbc` **not** hashed |
| TikTok | `+212612345678` (E.164 **with** `+`) | `ttclid`, `ttp`, `ip`, `user_agent` not hashed |
| Snap | `212612345678` (country code, no `+`) per Snap's best-practices page | `sc_click_id`, `sc_cookie1`, IP, user-agent not hashed |

- **Verification status:** the Meta and Snap rules were confirmed against their current official pages. TikTok's official developer page could not be retrieved by the tooling here; the `+` E.164 rule comes from secondary sources, so confirm it in TikTok Events Manager → *Test events* before relying on it. Nothing has been sent to any live platform from this repo; use `META_TEST_EVENT_CODE`, `TIKTOK_TEST_EVENT_CODE` and `SNAP_CAPI_VALIDATE_ONLY=true` first.
- **TikTok event name:** `CompletePayment` is used for both pixel and API. If your Events Manager prefers `Purchase`, change it in both files together (otherwise deduplication breaks).
- **Turn off automatic advanced matching** for TikTok in Events Manager (it scans form fields such as the phone input) unless you have approved that.
- COD caveat: `Purchase` fires when the order form is accepted, not when cash is collected. Treat reported revenue accordingly, and consider sending only confirmed/delivered orders later.

## Measurement design

Implement consent-aware, environment-configurable integrations for:

- Meta Pixel + Conversions API.
- TikTok Pixel + Events API.
- Snap Pixel + Conversions API.

Start with first-party event definitions and adapters, not three unrelated tracking implementations. Use platform-specific mappings and validation; do not assume event names or payloads are interchangeable.


### Suggested first-party event flow

| Store action | First-party event | Notes |
|---|---|---|
| Product page viewed | `ViewContent` | Include product ID and MAD value only when consent permits |
| Cart item added | `AddToCart` | Fire once per deliberate action |
| Checkout opened | `InitiateCheckout` | Not a purchase |
| Valid order form accepted | `OrderSubmitted` / platform-approved lead event | COD order submitted is not delivered/paid |
| Order confirmed/delivered | Separate status event when reliable status is available | Do not call an unconfirmed COD lead a paid sale |

The owner wants to optimize delivered/confirmed orders, not merely form submissions. Keep order lifecycle stages in PostgreSQL so a future, verified delivery status can be sent server-side. Do not report `Purchase` as paid revenue until the event definition is explicitly approved and matches the actual COD milestone. If the courier has no delivery-status integration, document this as a manual/operational gap.

## Deferred loading and consent

- Keep ad tags out of the initial render and critical path. Load asynchronously after the applicable consent decision, preferably after hydration/idle time; don't delay page interaction or block rendering.
- Respect applicable Moroccan privacy rules and current platform requirements. Do not assume that `defer` alone makes a tracker compliant.
- No pixel, cookie, or server event may bypass a consent/opt-out decision if consent is required. Record consent state/version and enforce it on both browser and backend event dispatch.
- Provide clear cookie/tracking disclosure and user controls where required. Have a Moroccan privacy/legal professional review the final implementation.
- Store pixel IDs as public configuration only; access tokens and CAPI credentials are server-only secrets.

## Deduplication

When the same conversion is sent through a browser pixel and CAPI, generate one unique first-party event ID and pass the exact same ID and matching event name on both paths. Keep the event ID stable across retries for that conversion, but unique across separate actions/orders. Verify deduplication in each platform's test/events tool.

- Meta recommends `event_id` + matching event name for browser/server deduplication.
- TikTok requires matching `event_id` when the same event is sent via Pixel and Events API.
- Snap requires matching event identifiers across Pixel and CAPI; for Snap Pixel, match the relevant client dedup ID/event ID as its current docs specify.

Do not deduplicate unrelated event types with one ID. Do not re-send a new Purchase event on thank-you-page refresh.

## Customer data and hashing

- Never put name, phone, city, address, email, raw phone, or hashed phone into browser pixel event payloads, URLs, or client logs.
- Hashing is not a substitute for consent, lawful basis, minimization, access control, or retention limits.
- Hash only server-side, only for an approved event/purpose, only after the applicable consent/legal checks, using each platform's current normalization and SHA-256 rules.
- Use each platform's official field names and payload schema; send no unused fields.
- Morocco phone normalization for the store and platform matching are separate concerns. Canonical store form can be `+212...`; platform-specific match-key transformation must follow the platform's current official guidance.

### Current platform notes (verify at implementation time)

- **Meta:** official CAPI customer-information docs distinguish identifiers and their normalization/hashing requirements. The browser Pixel and server event need the same `event_id` and event name for recommended deduplication. Never treat a server hash as consent.
- **TikTok:** official Events API guidance recommends Pixel + Events API with deduplication; its matching-events guidance states email and phone matching keys require hashing. Its exact accepted normalization and payload schema must be checked in the current Events Manager/API docs before coding. Do not guess whether `+` is retained in a given hashed field.
- **Snap:** official best-practice guidance says normalize phone with country code, strip non-digits including `+`, remove a leading local zero after adding the country code, then SHA-256 to lowercase hex. Match event IDs across Snap Pixel/CAPI for deduplication.

Because platform requirements change, the implementer must verify the live official docs and test payloads rather than copy an old example blindly.

## Attribution and event delivery

- Capture permitted click IDs/first-party cookies at landing and keep them only as long as needed for approved attribution.
- Do not claim perfect attribution; browsers and privacy controls can limit measurement.
- Server-side CAPI events should originate from durable order/status outboxes, be idempotent, and have safe retry/alert behavior.
- Do not send customer phone to platforms merely because it improves match rate. Obtain legal/privacy approval and make consent and purpose explicit.
- Use the same event ID on client and server for overlapping events. Track event delivery status without logging payload PII.

## Security checklist

- Never expose database URL/password, Google Sheet secret, webhook HMAC secret, CAPI access token, or admin credential in Git, frontend bundles, source maps, logs, URLs, or screenshots.
- Rotate the database password disclosed in chat before production; use a new least-privilege credential.
- Use HTTPS for `vitalizemaroc.shop` and `api.vitalizemaroc.shop`, secure cookies where used, strict CORS, rate limits, input validation, and CSRF protection if cookie-based auth is introduced.
- Protect order status/upsell endpoints with short-lived, order-scoped opaque tokens; do not expose sequential IDs.
- Sanitize all customer text destined for Sheets against CSV/formula injection.
- Keep dependency lockfiles and run vulnerability/dependency checks before release.

## Official references

- [Meta CAPI customer information parameters](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters)
- [Meta Pixel and CAPI deduplication](https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events)
- [TikTok Events API overview](https://ads.tiktok.com/resources/help/article/events-api)
- [TikTok matching events with Events API](https://ads.tiktok.com/help/article/how-to-set-up-matching-events-with-events-api?lang=en)
- [TikTok event deduplication](https://ads.tiktok.com/help/article/event-deduplication?lang=en)
- [Snap Conversions API parameters](https://developers.snap.com/marketing-api/Conversions-API/Parameters)
- [Snap Conversions API best practices](https://developers.snap.com/marketing-api/Conversions-API/BestPractices)
- [Morocco CNDP laws and texts](https://www.cndp.ma/textes-et-lois/)

These references are technical sources, not legal advice. The CNDP lists Moroccan Law 09-08 on personal-data protection and Law 31-08 on consumer protection; the owner must review applicability, declarations/authorizations, cross-border transfers, and storefront disclosures with qualified counsel.
