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
  "status": "success",
  "data": {
    "totalInvested": 600000,
    "estimatedReturns": 561695,
    "totalValue": 1161695
  },
  "requestId": "<uuid>"
}
"""

import sys
import os
import time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils import (
    ok, bad_request, server_error, parse_body, require_positive,
    calculate_sip, get_request_id, log_request, log_response,
)


def handler(event: dict, context) -> dict:
    request_id = get_request_id(event)
    start_time = time.time()

    # Handle CORS preflight
    if event.get("httpMethod") == "OPTIONS":
        from utils import CORS_HEADERS
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        body = parse_body(event)
    except Exception:
        return bad_request("Invalid JSON body.", request_id)

    error = require_positive(body, "monthlyInvestment", "annualRate", "years")
    if error:
        return bad_request(error, request_id)

    params = {
        "monthlyInvestment": body["monthlyInvestment"],
        "annualRate": body["annualRate"],
        "years": body["years"],
    }
    source_ip = event.get("requestContext", {}).get("http", {}).get("sourceIp")
    log_request(request_id, "sip", params, source_ip)

    try:
        result = calculate_sip(
            monthly_investment=float(body["monthlyInvestment"]),
            annual_rate=float(body["annualRate"]),
            years=float(body["years"]),
        )
    except Exception as exc:
        log_response(request_id, "sip", (time.time() - start_time) * 1000)
        return server_error(str(exc), request_id)

    duration_ms = (time.time() - start_time) * 1000
    log_response(request_id, "sip", duration_ms)
    return ok(result, request_id)
