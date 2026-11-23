"""Authenticated connectivity check for the SpaceSeller credentials.

Run from ``backend/``:

    python -m app.integrations.spaceseller.probe

It answers the two questions that block every other step:
    1. Is the base URL + token accepted at all?
    2. Which of the configured endpoint paths actually exist?

The probe only issues GETs, so it is safe against production. It never prints
the token — only an id/length fingerprint, and every detail line is redacted.
"""

from __future__ import annotations

import argparse
import logging
import sys

from app.integrations.spaceseller.auth import describe_token, redact
from app.integrations.spaceseller.client import SpaceSellerClient
from app.integrations.spaceseller.errors import (
    SpaceSellerAuthError,
    SpaceSellerConfigurationError,
    SpaceSellerError,
    SpaceSellerNotFoundError,
)
from app.settings import Settings, get_settings

OUTCOME_OK = "accepted"
OUTCOME_AUTH = "rejected (401/403)"
OUTCOME_MISSING = "path not found (404)"
OUTCOME_ERROR = "error"

EXIT_OK = 0
EXIT_UNREACHABLE = 1
EXIT_NOT_CONFIGURED = 2


def probe_path(client: SpaceSellerClient, path: str, settings: Settings) -> tuple[str, str]:
    """GET a path and return ``(outcome, detail)`` without raising."""
    try:
        body = client.transport.request("GET", path, retry_safe=True)
    except SpaceSellerConfigurationError as error:
        return OUTCOME_ERROR, error.code
    except SpaceSellerAuthError as error:
        return OUTCOME_AUTH, error.code
    except SpaceSellerNotFoundError:
        return OUTCOME_MISSING, "spaceseller_http_404"
    except SpaceSellerError as error:
        return OUTCOME_ERROR, error.code

    if isinstance(body, dict):
        keys = ", ".join(sorted(body)[:6])
        return OUTCOME_OK, f"keys: {keys or '(none)'}"
    if isinstance(body, list):
        return OUTCOME_OK, f"list of {len(body)}"
    return OUTCOME_OK, redact(settings, f"body type: {type(body).__name__}")


def run(settings: Settings, *, verbose: bool = False) -> int:
    """Probe the configured endpoints and return a process exit code."""
    if not settings.spaceseller_base_url or not settings.spaceseller_api_token:
        print("SPACESELLER_BASE_URL and SPACESELLER_API_TOKEN must both be set.")
        return EXIT_NOT_CONFIGURED

    print(f"base url   : {settings.spaceseller_base_url}")
    print(f"credential : {describe_token(settings)}")
    print(f"auth scheme: {settings.spaceseller_auth_scheme}")
    print(
        f"timeout    : {settings.spaceseller_timeout_seconds}s, "
        f"retries {settings.spaceseller_max_retries}"
    )
    print()

    targets = (
        ("health", settings.spaceseller_health_path),
        ("leads", settings.spaceseller_leads_path),
        ("orders", settings.spaceseller_orders_path),
    )

    outcomes: list[str] = []
    with SpaceSellerClient(settings) as client:
        for label, path in targets:
            outcome, detail = probe_path(client, path, settings)
            outcomes.append(outcome)
            print(f"{label:<7} GET {path:<28} {outcome:<20} {detail}")
            if verbose and outcome != OUTCOME_OK:
                print(f"        detail: {detail}")

    print()
    if OUTCOME_OK in outcomes:
        accepted = sum(1 for outcome in outcomes if outcome == OUTCOME_OK)
        print(f"{accepted}/{len(outcomes)} endpoints answered 2xx: the token is valid.")
        return EXIT_OK
    if OUTCOME_AUTH in outcomes:
        print("Credentials rejected. Ask the account manager to reissue the token.")
    else:
        print("No endpoint answered 2xx. Confirm the base URL and paths with SpaceSeller.")
    return EXIT_UNREACHABLE


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Verify SpaceSeller credentials and endpoint paths."
    )
    parser.add_argument("--verbose", action="store_true", help="print extra detail on failures")
    parser.add_argument("--log-level", default="WARNING", help="python logging level")
    args = parser.parse_args(argv)

    logging.basicConfig(level=args.log_level)
    return run(get_settings(), verbose=args.verbose)


if __name__ == "__main__":
    sys.exit(main())
