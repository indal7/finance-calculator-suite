"""
AWS Lambda handler – SIP Calculator
POST /sip

Request body:
{
  "monthlyInvestment": 5000,   // monthly SIP amount in INR
  "annualRate": 12,            // expected annual return in %
  "years": 10                  // investment tenure in years
}

Response:
{
  "totalInvested": 600000,
  "estimatedReturns": 561695,
  "totalValue": 1161695
}
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils import ok, bad_request, parse_body, require_positive, calculate_sip


def handler(event: dict, context) -> dict:
    # Handle CORS preflight
    if event.get("httpMethod") == "OPTIONS":
        from utils import CORS_HEADERS
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        body = parse_body(event)
    except Exception:
        return bad_request("Invalid JSON body.")

    error = require_positive(body, "monthlyInvestment", "annualRate", "years")
    if error:
        return bad_request(error)

    result = calculate_sip(
        monthly_investment=float(body["monthlyInvestment"]),
        annual_rate=float(body["annualRate"]),
        years=float(body["years"]),
    )
    return ok(result)
