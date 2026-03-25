"""
AWS Lambda handler – CAGR Calculator
POST /cagr

Request body:
{
  "beginningValue": 50000,    // initial investment value
  "endingValue": 100000,      // final investment value
  "years": 5                  // investment period in years
}

Response:
{
  "cagr": 14.8698,
  "absoluteReturn": 100.0,
  "totalGain": 50000
}
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils import ok, bad_request, parse_body, require_positive, calculate_cagr


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        from utils import CORS_HEADERS
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        body = parse_body(event)
    except Exception:
        return bad_request("Invalid JSON body.")

    error = require_positive(body, "beginningValue", "endingValue", "years")
    if error:
        return bad_request(error)

    result = calculate_cagr(
        beginning_value=float(body["beginningValue"]),
        ending_value=float(body["endingValue"]),
        years=float(body["years"]),
    )
    return ok(result)
