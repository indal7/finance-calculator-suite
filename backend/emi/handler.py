"""
AWS Lambda handler – EMI Calculator
POST /emi

Request body:
{
  "principal": 500000,    // loan amount in INR
  "annualRate": 8.5,      // annual interest rate in %
  "years": 5              // loan tenure in years
}

Response:
{
  "emi": 10253,
  "totalPayment": 615180,
  "totalInterest": 115180
}
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils import ok, bad_request, parse_body, require_positive, calculate_emi


def handler(event: dict, context) -> dict:
    ip = event.get("requestContext", {}).get("http", {}).get("sourceIp")
    print(f"Request received from IP: {ip}")
    if event.get("httpMethod") == "OPTIONS":
        from utils import CORS_HEADERS
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        body = parse_body(event)
    except Exception:
        return bad_request("Invalid JSON body.")

    error = require_positive(body, "principal", "annualRate", "years")
    if error:
        return bad_request(error)

    result = calculate_emi(
        principal=float(body["principal"]),
        annual_rate=float(body["annualRate"]),
        years=float(body["years"]),
    )
    return ok(result)
