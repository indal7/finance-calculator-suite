"""
track_visit/handler.py – Lambda handler for POST /track-visit

Stores anonymous page-visit data in DynamoDB for analytics.
Designed for high throughput with minimal latency — fire-and-forget from the frontend.
"""

from __future__ import annotations

import hashlib
import html
import os
import re
import uuid
from datetime import datetime, timezone, timedelta

import boto3

from utils import (
    CORS_HEADERS,
    bad_request,
    get_request_id,
    logger,
    ok,
    parse_body,
    server_error,
)

# ── Clients (reused across warm invocations) ─────────────────────────────────
_dynamodb = boto3.resource("dynamodb")
_table = _dynamodb.Table(os.environ["VISITS_TABLE_NAME"])

# ── Validation constants ─────────────────────────────────────────────────────
_MAX_URL_LEN = 2048
_MAX_REFERRER_LEN = 2048
_MAX_UA_LEN = 512
_MAX_SESSION_LEN = 64
_SAFE_URL_RE = re.compile(r"^https?://", re.IGNORECASE)


def handler(event: dict, context: object) -> dict:
    """POST /track-visit — Record an anonymous page visit."""
    request_id = get_request_id(event)

    # ── OPTIONS preflight ────────────────────────────────────────────────
    method = event.get("requestContext", {}).get("http", {}).get("method", "")
    if method == "OPTIONS":
        return {"statusCode": 204, "headers": CORS_HEADERS, "body": ""}

    try:
        body = parse_body(event)
    except Exception:
        return bad_request("Invalid JSON body", request_id)

    # ── Validate input ───────────────────────────────────────────────────
    page_url = (body.get("page_url") or "").strip()
    if not page_url or len(page_url) > _MAX_URL_LEN:
        return bad_request("page_url is required (max 2048 chars)", request_id)

    referrer = (body.get("referrer") or "")[:_MAX_REFERRER_LEN].strip()
    user_agent = (body.get("user_agent") or "")[:_MAX_UA_LEN].strip()
    session_id = (body.get("session_id") or "")[:_MAX_SESSION_LEN].strip()

    # ── Extract IP from API Gateway context ──────────────────────────────
    source_ip = (
        event.get("requestContext", {}).get("http", {}).get("sourceIp", "")
    )

    # Hash the IP for privacy — we never store raw IPs
    ip_hash = ""
    if source_ip:
        ip_hash = hashlib.sha256(source_ip.encode()).hexdigest()[:16]

    # ── Derive a visitor fingerprint for unique-user approximation ───────
    # Combines hashed-IP + user-agent into a short deterministic ID.
    # Not perfect (shared IPs, UA changes), but good enough for analytics
    # without cookies or PII.
    raw_fp = f"{ip_hash}:{user_agent}"
    visitor_id = hashlib.sha256(raw_fp.encode()).hexdigest()[:16]

    # ── Build DynamoDB item ──────────────────────────────────────────────
    IST = timezone(timedelta(hours=5, minutes=30))
    now = datetime.now(IST)
    visit_id = str(uuid.uuid4())

    item: dict = {
        "visit_id": visit_id,
        "visitor_id": visitor_id,
        "page_url": html.escape(page_url),
        "timestamp": now.isoformat(),
        "date": now.strftime("%Y-%m-%d"),  # partition-friendly date key (IST)
        "ip_address": source_ip or None,
        "user_agent": html.escape(user_agent) if user_agent else None,
        "ip_hash": ip_hash or None,
        "referrer": html.escape(referrer) if referrer else None,
        "session_id": session_id or None,
    }

    # Remove None values so DynamoDB doesn't store empty attributes
    item = {k: v for k, v in item.items() if v is not None}

    # ── Write to DynamoDB ────────────────────────────────────────────────
    try:
        _table.put_item(Item=item)
    except Exception as exc:
        logger.error(
            "DynamoDB PutItem failed",
            extra={"error": str(exc), "visit_id": visit_id, "request_id": request_id},
        )
        return server_error("Failed to record visit", request_id)

    logger.info(
        "Visit recorded",
        extra={
            "visit_id": visit_id,
            "visitor_id": visitor_id,
            "page_url": page_url,
            "request_id": request_id,
        },
    )

    return ok({"visit_id": visit_id}, request_id)
