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

    # SpaceSeller (logistics / COD fulfilment). Left blank until the account is provisioned;
    # every SpaceSeller call is skipped while `spaceseller_configured` is False.
    spaceseller_base_url: str = ""
    spaceseller_api_token: str = ""
    spaceseller_api_key: str = ""
    spaceseller_auth_scheme: str = "Bearer"
    spaceseller_leads_path: str = "/api/v1/leads"
    spaceseller_orders_path: str = "/api/v1/orders"
    spaceseller_health_path: str = "/api/v1/ping"
    spaceseller_timeout_seconds: float = Field(default=15.0, gt=0, le=60)
    spaceseller_max_retries: int = Field(default=3, ge=0, le=5)
    spaceseller_user_agent: str = "VitalizeMaroc/1.0"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_ignore_empty=True)

    @field_validator("spaceseller_base_url")
    @classmethod
    def normalize_spaceseller_base_url(cls, value: str) -> str:
        return value.strip().rstrip("/")

    @property
    def spaceseller_configured(self) -> bool:
        """True only when a base URL and at least one credential are present."""
        return bool(self.spaceseller_base_url) and bool(
            self.spaceseller_api_token or self.spaceseller_api_key
        )

    def spaceseller_auth_header_value(self) -> str:
        if not self.spaceseller_api_token:
            return ""
        scheme = self.spaceseller_auth_scheme.strip()
        token = self.spaceseller_api_token.strip()
        return f"{scheme} {token}".strip() if scheme else token

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
