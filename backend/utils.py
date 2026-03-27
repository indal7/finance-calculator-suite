"""
utils.py – Shared validation helpers, financial formulas, structured logging,
           in-memory caching, and standardized API responses for
           Finance Calculator Lambda functions.
"""

from __future__ import annotations
import json
import math
import time
import uuid
import logging
from functools import lru_cache
from typing import Any


# ──────────────────────────────────────────────────────────────────────────────
# Structured JSON logging
# ──────────────────────────────────────────────────────────────────────────────

# Standard LogRecord attribute names – used to filter out framework internals
# so only application-level `extra={}` keys are forwarded to the JSON payload.
_LOG_RECORD_BUILTINS: frozenset[str] = frozenset({
    "name", "msg", "args", "created", "filename", "funcName", "levelname",
    "levelno", "lineno", "message", "module", "msecs", "pathname", "process",
    "processName", "relativeCreated", "stack_info", "thread", "threadName",
    "exc_info", "exc_text", "taskName",
})


class _JsonFormatter(logging.Formatter):
    """Emit log records as single-line JSON for CloudWatch Logs Insights."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S.%f"),
            "level":     record.levelname,
            "logger":    record.name,
            "message":   record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        # Merge any extra fields attached via logger.info("...", extra={...})
        for key, value in record.__dict__.items():
            if key not in _LOG_RECORD_BUILTINS and not key.startswith("_"):
                payload[key] = value
        return json.dumps(payload, default=str)


def get_logger(name: str = "finance-calculator") -> logging.Logger:
    """Return a module-level logger configured with JSON formatting."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(_JsonFormatter())
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    return logger


logger = get_logger()


# ──────────────────────────────────────────────────────────────────────────────
# HTTP helpers
# ──────────────────────────────────────────────────────────────────────────────

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def ok(data: dict, request_id: str | None = None) -> dict:
    """Return a standardised 200 API Gateway response: {status, data}."""
    response_body: dict[str, Any] = {"status": "success", "data": data}
    if request_id:
        response_body["requestId"] = request_id
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps(response_body)}


def bad_request(message: str, request_id: str | None = None) -> dict:
    """Return a standardised 400 API Gateway response: {status, error}."""
    response_body: dict[str, Any] = {"status": "error", "error": message}
    if request_id:
        response_body["requestId"] = request_id
    return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps(response_body)}


def server_error(message: str, request_id: str | None = None) -> dict:
    """Return a standardised 500 API Gateway response: {status, error}."""
    response_body: dict[str, Any] = {"status": "error", "error": message}
    if request_id:
        response_body["requestId"] = request_id
    return {"statusCode": 500, "headers": CORS_HEADERS, "body": json.dumps(response_body)}


def parse_body(event: dict) -> dict:
    """Safely parse the request body from an API Gateway event."""
    raw = event.get("body", "{}")
    if isinstance(raw, str):
        return json.loads(raw)
    if isinstance(raw, dict):
        return raw
    return {}


def get_request_id(event: dict) -> str:
    """Extract or generate a unique request identifier."""
    # API Gateway v2 HTTP API
    rid = event.get("requestContext", {}).get("requestId")
    if rid:
        return rid
    # API Gateway v1
    rid = event.get("requestContext", {}).get("extendedRequestId")
    if rid:
        return rid
    return str(uuid.uuid4())


def log_request(request_id: str, handler: str, params: dict, source_ip: str | None = None) -> None:
    """Emit a structured JSON log entry for an incoming Lambda request."""
    logger.info(
        "Request received",
        extra={
            "requestId": request_id,
            "handler":   handler,
            "params":    params,
            "sourceIp":  source_ip,
        },
    )


def log_response(request_id: str, handler: str, duration_ms: float, cached: bool = False) -> None:
    """Emit a structured JSON log entry for an outgoing Lambda response."""
    logger.info(
        "Request completed",
        extra={
            "requestId":  request_id,
            "handler":    handler,
            "durationMs": round(duration_ms, 2),
            "cached":     cached,
        },
    )


# ──────────────────────────────────────────────────────────────────────────────
# Validation helpers
# ──────────────────────────────────────────────────────────────────────────────

def require_positive(data: dict, *keys: str, min_val: float = 0.0001) -> str | None:
    """Return an error message if any key is missing or not a positive number."""
    for key in keys:
        value = data.get(key)
        if value is None:
            return f"'{key}' is required."
        try:
            num = float(value)
        except (TypeError, ValueError):
            return f"'{key}' must be a number."
        if num < min_val:
            return f"'{key}' must be greater than {min_val}."
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Financial formulas with in-memory caching
# ──────────────────────────────────────────────────────────────────────────────
#
# Each function is decorated with @lru_cache(maxsize=256) so that repeated
# identical requests (common during user re-calculations) are served from
# memory without rerunning floating-point arithmetic.
#
# NOTE: lru_cache requires hashable arguments; all params here are immutable
#       primitives (float, int) so this is safe.  The returned dicts must
#       not be mutated by callers — they share the cached object.

@lru_cache(maxsize=256)
def calculate_sip(monthly_investment: float, annual_rate: float, years: float) -> dict:
    """
    SIP Future Value formula:
        FV = P × ((1+r)^n − 1) / r × (1+r)

    Where r = monthly rate, n = total months.
    Results are cached in-memory for repeated identical inputs.
    """
    r = annual_rate / 100 / 12
    n = int(years * 12)
    if r == 0:
        fv = monthly_investment * n
    else:
        fv = monthly_investment * ((math.pow(1 + r, n) - 1) / r) * (1 + r)

    total_invested    = round(monthly_investment * n, 2)
    total_value       = round(fv, 2)
    estimated_returns = round(total_value - total_invested, 2)

    return {
        "totalInvested":    total_invested,
        "estimatedReturns": estimated_returns,
        "totalValue":       total_value,
    }


@lru_cache(maxsize=256)
def calculate_emi(principal: float, annual_rate: float, years: float) -> dict:
    """
    EMI formula:
        EMI = P × r × (1+r)^n / ((1+r)^n − 1)

    Where r = monthly rate, n = total months.
    Results are cached in-memory for repeated identical inputs.
    """
    r = annual_rate / 100 / 12
    n = int(years * 12)
    if r == 0:
        emi = principal / n
    else:
        emi = (principal * r * math.pow(1 + r, n)) / (math.pow(1 + r, n) - 1)

    total_payment  = round(emi * n, 2)
    total_interest = round(total_payment - principal, 2)

    return {
        "emi":           round(emi, 2),
        "totalPayment":  total_payment,
        "totalInterest": total_interest,
    }


@lru_cache(maxsize=256)
def calculate_fd(principal: float, annual_rate: float, years: float,
                 compounding_frequency: int) -> dict:
    """
    Compound Interest / FD formula:
        A = P × (1 + r/n)^(n*t)

    Where n = compounding frequency per year, t = years.
    Results are cached in-memory for repeated identical inputs.
    """
    r = annual_rate / 100
    n = compounding_frequency
    t = years
    maturity_amount = round(principal * math.pow(1 + r / n, n * t), 2)
    total_interest  = round(maturity_amount - principal, 2)

    return {
        "principal":      round(principal, 2),
        "maturityAmount": maturity_amount,
        "totalInterest":  total_interest,
    }


@lru_cache(maxsize=256)
def calculate_cagr(beginning_value: float, ending_value: float, years: float) -> dict:
    """
    CAGR formula:
        CAGR = (Ending Value / Beginning Value)^(1/n) − 1

    Returns the CAGR as a percentage.
    Results are cached in-memory for repeated identical inputs.
    """
    cagr            = (math.pow(ending_value / beginning_value, 1 / years) - 1) * 100
    absolute_return = ((ending_value - beginning_value) / beginning_value) * 100
    total_gain      = ending_value - beginning_value

    return {
        "cagr":           round(cagr, 4),
        "absoluteReturn": round(absolute_return, 4),
        "totalGain":      round(total_gain, 2),
    }


