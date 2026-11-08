# Vitalize Maroc — AI Coder Handoff

This folder is the implementation brief for the first release of the DTC store at `https://vitalizemaroc.shop`. The launch market is **Morocco**. Build a branded, Arabic-first, mobile-first COD storefront, with the backend at `https://api.vitalizemaroc.shop`.

## Read in this order

1. [Brand, market, and ICP](./01-brand-market-icp.md)
2. [Products, pricing, and launch decisions](./02-products-pricing.md)
3. [Store map, CRO, and copy requirements](./03-storefront-cro.md)
4. [Design system and responsive behavior](./04-design-system.md)
5. [Frontend implementation](./05-frontend.md)
6. [Backend, data model, and order lifecycle](./06-backend.md)
7. [Pixels, CAPI, privacy, and security](./07-tracking-privacy-security.md)
8. [Google Sheets integration](./08-google-sheets.md)
9. [Deployment, testing, and launch gates](./09-deployment-qa.md)
10. [Copy-ready AI coder prompt](./10-ai-coder-prompt.md)

Additional handoff assets:

- [Google Apps Script webhook](./integrations/google-sheets/Code.gs)
- [Google Sheet CSV header template](./templates/orders-template.csv)
- [Frontend environment template](./templates/frontend.env.example)
- [Backend environment template](./templates/backend.env.example)

## Precedence and source of truth

- These docs capture the latest owner request and supersede conflicting values and unsupported claims in the older `VITALIZE_*` planning files at the workspace root.
- The final owner-approved prices are product-specific. See the table below and [product pricing](./02-products-pricing.md) for all tiers and quantity grouping behavior.
- Only information provided by the owner or backed by supplier/regulatory documentation may be published as fact. Never invent reviews, customers, certifications, medical/scientific outcomes, stock limits, countdown urgency, shipping times, or company credentials. Owner-approved facts (free delivery, inspection on delivery, 30-day defect guarantee, Immunity Shield composition) are recorded in `02-products-pricing.md`.
- No production credentials were provided for these files. Never copy secrets from chat or commit real `.env` files.

## Approved quantity pricing

| Product | 1 unit | 2 units | 3 units |
|---|---:|---:|---:|
| Vitality Gummies | 280 MAD | 499 MAD | 690 MAD |
| Immunity Shield | 240 MAD | 440 MAD | 620 MAD |
| Endurance Power | 350 MAD | 640 MAD | 690 MAD |

The owner explicitly selected the 690 MAD three-unit Endurance option. Prices are implemented in the backend catalog and mirrored by the frontend display catalog; the API quote is authoritative. When quantity is greater than three, price complete groups of three plus the remaining one or two units using that product's approved tiers.

## Code status

The repository now includes `frontend/` and `backend/` application scaffolds with the approved pricing, COD order flow, PostgreSQL persistence, migrations, tests, and Docker setup. Checkout requires `DELIVERY_FEE_MAD` (set to `0` = approved free delivery) and the business confirming the delivery/address workflow.

The Apps Script and CSV are handoff templates. Configure and test them in a separate test Sheet before production.
