from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    api_public_base_url: str = "http://localhost:8000"
    site_public_url: str = "https://vitalizemaroc.shop"
    frontend_origins: str = "http://localhost:3000"
    database_url: str = "sqlite:///./vitalize.db"
    order_token_secret: str = "development-only-change-this-secret"
    google_sheets_webhook_url: str = ""
    google_sheets_hmac_secret: str = ""
    delivery_fee_mad: int | None = Field(default=None, ge=0)
    upsell_seconds: int = Field(default=15, ge=10, le=15)
    run_worker_in_api: bool = True
    trusted_proxy_count: int = Field(default=1, ge=0, le=5)
    log_level: str = "INFO"

    meta_pixel_id: str = ""
    meta_capi_access_token: str = ""
    meta_test_event_code: str = ""
    meta_graph_version: str = "v21.0"

    tiktok_pixel_id: str = ""
    tiktok_events_api_access_token: str = ""
    tiktok_test_event_code: str = ""

    snap_pixel_id: str = ""
    snap_capi_access_token: str = ""
    snap_capi_validate_only: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_ignore_empty=True)

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        # Easypanel exposes postgres:// URLs; SQLAlchemy needs the psycopg driver name.
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix):]
        return value

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
