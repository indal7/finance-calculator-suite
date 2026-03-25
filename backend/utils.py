"""
utils.py – Shared validation helpers and financial formulas for
           Finance Calculator Lambda functions.
"""

from __future__ import annotations
import json
import math
from typing import Any


# ──────────────────────────────────────────────────────────────────────────────
# HTTP helpers
# ──────────────────────────────────────────────────────────────────────────────

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def ok(body: dict) -> dict:
    """Return a 200 API Gateway response."""
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps(body)}


def bad_request(message: str) -> dict:
    """Return a 400 API Gateway response."""
    return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": message})}


def parse_body(event: dict) -> dict:
    """Safely parse the request body from an API Gateway event."""
    raw = event.get("body", "{}")
    if isinstance(raw, str):
        return json.loads(raw)
    if isinstance(raw, dict):
        return raw
    return {}


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
# Financial formulas
# ──────────────────────────────────────────────────────────────────────────────

def calculate_sip(monthly_investment: float, annual_rate: float, years: int) -> dict:
    """
    SIP Future Value formula:
        FV = P × ((1+r)^n − 1) / r × (1+r)

    Where r = monthly rate, n = total months.
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


def calculate_emi(principal: float, annual_rate: float, years: float) -> dict:
    """
    EMI formula:
        EMI = P × r × (1+r)^n / ((1+r)^n − 1)

    Where r = monthly rate, n = total months.
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


def calculate_fd(principal: float, annual_rate: float, years: float,
                 compounding_frequency: int) -> dict:
    """
    Compound Interest / FD formula:
        A = P × (1 + r/n)^(n*t)

    Where n = compounding frequency per year, t = years.
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


def calculate_cagr(beginning_value: float, ending_value: float, years: float) -> dict:
    """
    CAGR formula:
        CAGR = (Ending Value / Beginning Value)^(1/n) − 1

    Returns the CAGR as a percentage.
    """
    cagr            = (math.pow(ending_value / beginning_value, 1 / years) - 1) * 100
    absolute_return = ((ending_value - beginning_value) / beginning_value) * 100
    total_gain      = ending_value - beginning_value

    return {
        "cagr":           round(cagr, 4),
        "absoluteReturn": round(absolute_return, 4),
        "totalGain":      round(total_gain, 2),
    }
