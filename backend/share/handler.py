"""
AWS Lambda handler – Share Calculator Results
POST /share   → Save calculator inputs, return short share ID
GET  /share/{id} → Retrieve saved inputs by share ID

Request body (POST):
{
  "calculator": "sip",
  "inputs": {
    "monthlyInvestment": 5000,
    "annualRate": 12,
    "years": 10
  }
}

Response (POST 201):
{
  "status": "success",
  "data": { "id": "aB3x_9Kz" }
}

Response (GET 200):
{
  "status": "success",
  "data": {
    "id": "aB3x_9Kz",
    "calculator": "sip",
    "inputs": { "monthlyInvestment": 5000, "annualRate": 12, "years": 10 }
  }
}
"""

from __future__ import annotations

import json
import os
import secrets
import time
from datetime import datetime, timezone, timedelta
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

from utils import (
    CORS_HEADERS,
    bad_request,
    get_request_id,
    logger,
    ok,
    parse_body,
    server_error,
)

# ── DynamoDB client (reused across warm invocations) ─────────────────────────

_TABLE_NAME = os.environ.get("SHARE_TABLE_NAME", "shared-results")
_dynamodb = boto3.resource("dynamodb")
_table = _dynamodb.Table(_TABLE_NAME)

# ── CORS headers that also allow GET ────────────────────────────────────────

_SHARE_CORS = {
    **CORS_HEADERS,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

# ── Validation constants ────────────────────────────────────────────────────

_VALID_CALCULATORS = {"sip", "emi", "fd", "cagr", "lumpsum"}

_CALCULATOR_FIELDS: dict[str, set[str]] = {
    "sip":     {"monthlyInvestment", "annualRate", "years"},
    "emi":     {"principal", "annualRate", "years"},
    "fd":      {"principal", "annualRate", "years", "compoundingFrequency"},
    "cagr":    {"beginningValue", "endingValue", "years"},
    "lumpsum": {"principal", "annualRate", "years"},
}

# Optional fields that are allowed but not required
_OPTIONAL_FIELDS: dict[str, set[str]] = {
    "sip":     {"stepUpRate"},
    "emi":     set(),
    "fd":      set(),
    "cagr":    set(),
    "lumpsum": set(),
}

_MAX_INPUT_VALUE = 1_000_000_000  # 100 crore — sanity ceiling
_TTL_DAYS = 90
_ID_LENGTH = 6  # secrets.token_urlsafe(6) → 8 chars


# ── Helpers ──────────────────────────────────────────────────────────────────

def _generate_id() -> str:
    """Generate a URL-safe short ID (8 characters)."""
    return secrets.token_urlsafe(_ID_LENGTH)


def _validate_post(body: dict) -> str | None:
    """Validate POST /share request body. Returns error message or None."""
    calculator = body.get("calculator")
    if not calculator or calculator not in _VALID_CALCULATORS:
        return f"'calculator' must be one of: {', '.join(sorted(_VALID_CALCULATORS))}"

    inputs = body.get("inputs")
    if not inputs or not isinstance(inputs, dict):
        return "'inputs' must be a non-empty object."

    expected_fields = _CALCULATOR_FIELDS[calculator]
    optional_fields = _OPTIONAL_FIELDS.get(calculator, set())
    provided_fields = set(inputs.keys())

    missing = expected_fields - provided_fields
    if missing:
        return f"Missing input fields: {', '.join(sorted(missing))}"

    extra = provided_fields - expected_fields - optional_fields
    if extra:
        return f"Unexpected input fields: {', '.join(sorted(extra))}"

    for field, value in inputs.items():
        try:
            num = float(value)
        except (TypeError, ValueError):
            return f"'{field}' must be a number."
        if num < 0:
            return f"'{field}' must not be negative."
        if field in optional_fields and num == 0:
            continue  # optional fields can be zero (e.g. stepUpRate=0)
        if num <= 0:
            return f"'{field}' must be positive."
        if num > _MAX_INPUT_VALUE:
            return f"'{field}' exceeds maximum allowed value."

    return None


def _convert_decimals(obj: dict) -> dict:
    """Convert Decimal values from DynamoDB to int/float for JSON serialisation."""
    result = {}
    for k, v in obj.items():
        if isinstance(v, Decimal):
            result[k] = int(v) if v == int(v) else float(v)
        elif isinstance(v, dict):
            result[k] = _convert_decimals(v)
        else:
            result[k] = v
    return result


# ── Lambda handler ───────────────────────────────────────────────────────────

def handler(event: dict, context: object) -> dict:
    request_id = get_request_id(event)

    # Determine HTTP method
    method = (
        event.get("requestContext", {}).get("http", {}).get("method", "")
        or event.get("httpMethod", "")
    )

    if method == "OPTIONS":
        return {"statusCode": 204, "headers": _SHARE_CORS, "body": ""}

    if method == "POST":
        return _handle_post(event, request_id)
    elif method == "GET":
        return _handle_get(event, request_id)
    else:
        body = json.dumps({"status": "error", "error": "Method not allowed"})
        return {"statusCode": 405, "headers": _SHARE_CORS, "body": body}


def _handle_post(event: dict, request_id: str) -> dict:
    """Save calculator inputs and return a share ID."""
    try:
        body = parse_body(event)
    except Exception:
        resp = bad_request("Invalid JSON body.", request_id)
        resp["headers"] = _SHARE_CORS
        return resp

    error = _validate_post(body)
    if error:
        resp = bad_request(error, request_id)
        resp["headers"] = _SHARE_CORS
        return resp

    calculator = body["calculator"]
    inputs = body["inputs"]

    share_id = _generate_id()
    IST = timezone(timedelta(hours=5, minutes=30))
    now = datetime.now(IST)
    ttl_epoch = int((now + timedelta(days=_TTL_DAYS)).timestamp())

    item = {
        "id":         share_id,
        "calculator": calculator,
        "inputs":     {k: Decimal(str(v)) for k, v in inputs.items()},
        "created_at": now.isoformat(),
        "ttl":        ttl_epoch,
    }

    try:
        _table.put_item(Item=item)
    except ClientError as exc:
        logger.error(
            "DynamoDB PutItem failed",
            extra={"error": str(exc), "share_id": share_id, "request_id": request_id},
        )
        resp = server_error("Failed to save share link. Please try again.", request_id)
        resp["headers"] = _SHARE_CORS
        return resp

    logger.info(
        "Share link created",
        extra={
            "share_id": share_id,
            "calculator": calculator,
            "request_id": request_id,
        },
    )

    response_body: dict = {
        "status": "success",
        "data": {"id": share_id},
    }
    if request_id:
        response_body["requestId"] = request_id

    return {
        "statusCode": 201,
        "headers": _SHARE_CORS,
        "body": json.dumps(response_body),
    }


def _handle_get(event: dict, request_id: str) -> dict:
    """Retrieve stored calculator inputs by share ID."""
    # Extract ID from path: /share/{id}
    raw_path = event.get("rawPath", "") or event.get("path", "")
    path_params = event.get("pathParameters") or {}
    share_id = path_params.get("id", "")

    if not share_id:
        # Fallback: parse from raw path
        parts = raw_path.rstrip("/").split("/")
        share_id = parts[-1] if parts else ""

    if not share_id or len(share_id) > 20:
        resp = bad_request("Invalid share ID.", request_id)
        resp["headers"] = _SHARE_CORS
        return resp

    try:
        response = _table.get_item(Key={"id": share_id})
    except ClientError as exc:
        logger.error(
            "DynamoDB GetItem failed",
            extra={"error": str(exc), "share_id": share_id, "request_id": request_id},
        )
        resp = server_error("Failed to retrieve share link.", request_id)
        resp["headers"] = _SHARE_CORS
        return resp

    item = response.get("Item")
    if not item:
        body = json.dumps({
            "status": "error",
            "error": "Share link not found or has expired.",
        })
        return {"statusCode": 404, "headers": _SHARE_CORS, "body": body}

    data = _convert_decimals(item)

    response_body: dict = {
        "status": "success",
        "data": {
            "id":         data["id"],
            "calculator": data["calculator"],
            "inputs":     data["inputs"],
        },
    }
    if request_id:
        response_body["requestId"] = request_id

    return {
        "statusCode": 200,
        "headers": _SHARE_CORS,
        "body": json.dumps(response_body),
    }
