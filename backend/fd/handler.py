"""
AWS Lambda handler – FD Calculator
POST /fd

Request body:
{
  "principal": 100000,           // deposit amount in INR
  "annualRate": 7,               // annual interest rate in %
  "years": 3,                    // tenure in years
  "compoundingFrequency": 4      // 1=annual, 2=semi-annual, 4=quarterly, 12=monthly
}

Response:
{
  "principal": 100000,
  "maturityAmount": 123145,
  "totalInterest": 23145
}
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils import ok, bad_request, parse_body, require_positive, calculate_fd


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        from utils import CORS_HEADERS
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        body = parse_body(event)
    except Exception:
        return bad_request("Invalid JSON body.")

    error = require_positive(body, "principal", "annualRate", "years", "compoundingFrequency")
    if error:
        return bad_request(error)

    compounding_freq = int(float(body["compoundingFrequency"]))
    if compounding_freq < 1:
        return bad_request("'compoundingFrequency' must be at least 1.")

    result = calculate_fd(
        principal=float(body["principal"]),
        annual_rate=float(body["annualRate"]),
        years=float(body["years"]),
        compounding_frequency=compounding_freq,
    )
    return ok(result)
