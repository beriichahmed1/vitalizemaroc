"""SpaceSeller (COD logistics) integration.

Public surface:

    client.SpaceSellerClient   push leads, read leads/orders
    payloads.build_lead_payload  order -> lead body
    errors.SpaceSellerError    base error, carries ``code`` and ``permanent``
    probe.run                  authenticated connectivity check

Configuration lives in ``app.settings`` (``SPACESELLER_*``); the integration is
inert until a base URL and a token are set.
"""

from app.integrations.spaceseller.client import LeadSubmission, SpaceSellerClient
from app.integrations.spaceseller.errors import (
    SpaceSellerAuthError,
    SpaceSellerConfigurationError,
    SpaceSellerConflictError,
    SpaceSellerError,
    SpaceSellerNetworkError,
    SpaceSellerNotFoundError,
    SpaceSellerRateLimitError,
    SpaceSellerResponseError,
    SpaceSellerServerError,
    SpaceSellerTimeoutError,
    SpaceSellerValidationError,
)
from app.integrations.spaceseller.payloads import build_lead_payload

__all__ = [
    "LeadSubmission",
    "SpaceSellerClient",
    "SpaceSellerAuthError",
    "SpaceSellerConfigurationError",
    "SpaceSellerConflictError",
    "SpaceSellerError",
    "SpaceSellerNetworkError",
    "SpaceSellerNotFoundError",
    "SpaceSellerRateLimitError",
    "SpaceSellerResponseError",
    "SpaceSellerServerError",
    "SpaceSellerTimeoutError",
    "SpaceSellerValidationError",
    "build_lead_payload",
]
