# Vitalize Maroc

Arabic-first Moroccan COD ecommerce store. Start with [`docs/README.md`](./docs/README.md).

```text
frontend/   Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4
backend/    FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL
docs/       strategy, pricing, tracking, Google Sheets script, deployment notes
```

## Run locally (Docker)

```bash
docker compose up --build        # DELIVERY_FEE_MAD defaults to 0 (free delivery, owner-approved)
```

Open `http://localhost:3000`. API readiness: `http://localhost:8000/health/ready`. Migrations run automatically when the backend container starts (a PostgreSQL advisory lock prevents concurrent starts from racing).

## Run without Docker

```bash
# backend (Python 3.12)
cd backend && python -m venv .venv && .venv/Scripts/activate   # Linux/macOS: source .venv/bin/activate
pip install -e ".[test]"
cp .env.example .env            # set DATABASE_URL, DELIVERY_FEE_MAD, APP_ENV=development
alembic upgrade head && uvicorn app.main:app --reload
pytest

# frontend (Node 22+)
cd frontend && cp .env.example .env.local
npm ci && npm run typecheck && npm run lint && npm test && npm run build
```

## Approved quantity prices

| Product | 1 | 2 | 3 |
|---|---:|---:|---:|
| Gummies | 280 MAD | 499 MAD | 690 MAD |
| Immunity | 240 MAD | 440 MAD | 620 MAD |
| Endurance | 350 MAD | 640 MAD | 690 MAD |

The backend catalog (`backend/app/pricing.py`) is the pricing authority; `frontend/lib/catalog.ts` is a display mirror covered by tests.

## Deploying on Easypanel

1. **Backend** service from `backend/` (Dockerfile). Set the variables from `backend/.env.example`. Use your internal Postgres URL as-is (`postgres://…?sslmode=disable`); the scheme is rewritten automatically. `ORDER_TOKEN_SECRET` and `GOOGLE_SHEETS_HMAC_SECRET` must be random 32+ character values.
2. **Frontend** service from `frontend/` (Dockerfile). `NEXT_PUBLIC_*` values are inlined at build time, so add them as **Build Arguments** (see `frontend/.env.example`), then rebuild whenever they change.
3. Domains: `vitalizemaroc.shop` → frontend (port 3000), `api.vitalizemaroc.shop` → backend (port 8000), HTTPS on both.
4. By default the API process also runs the worker (upsell expiry, Sheets, conversion APIs). Set `RUN_WORKER_IN_API=false` and add a second service with container argument `worker` if you prefer separate processes.

## Before production

Rotate the DB password that was shared in chat; set `DELIVERY_FEE_MAD=0` (free delivery is owner-approved) and the `NEXT_PUBLIC_WHATSAPP_NUMBER` build arg; replace placeholder images and policy text; deploy the Apps Script from `docs/` and test it with a separate test Sheet; review consent/legal requirements before enabling any pixel; verify CAPI events in each platform's test tool (see `docs/07-tracking-privacy-security.md`).
