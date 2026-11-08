import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.db import SessionLocal
from app.orders import router
from app.settings import get_settings

settings = get_settings()
logging.basicConfig(level=settings.log_level)
# httpx logs full request URLs, which include CAPI access tokens in query strings.
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.app_env == "production":
        weak = ("REPLACE_WITH", "CHANGE_ME", "development-only")
        if len(settings.order_token_secret) < 32 or any(w in settings.order_token_secret for w in weak):
            raise RuntimeError("ORDER_TOKEN_SECRET must be a random value of at least 32 characters in production")
        if settings.google_sheets_webhook_url and (
            len(settings.google_sheets_hmac_secret) < 32 or any(w in settings.google_sheets_hmac_secret for w in weak)
        ):
            raise RuntimeError("GOOGLE_SHEETS_HMAC_SECRET must be a random value of at least 32 characters")

    task = None
    if settings.run_worker_in_api:
        from app.worker import run

        task = asyncio.create_task(run())
    try:
        yield
    finally:
        if task:
            task.cancel()


app = FastAPI(title="Vitalize Maroc API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(router)


@app.get("/health/live")
def live():
    return {"status": "ok"}


@app.get("/health/ready")
def ready():
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {"status": "ready"}
