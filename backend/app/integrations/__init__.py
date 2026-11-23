"""Third-party service integrations that are called outbound over HTTP.

Each integration gets its own subpackage holding three layers, mirroring
``app/tracking``: payload builders, a client that owns authentication and the
HTTP call, and a narrow error type whose ``permanent`` flag tells
``app/worker.py`` whether the delivery is worth retrying.
"""
