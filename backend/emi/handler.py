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
  "status": "success",
  "data": {
    "emi": 10253,
    "totalPayment": 615180,
    "totalInterest": 115180
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
    calculate_emi, get_request_id, log_request, log_response,
)


def handler(event: dict, context) -> dict:
    request_id = get_request_id(event)
    start_time = time.time()

    if event.get("httpMethod") == "OPTIONS":
        from utils import CORS_HEADERS
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        body = parse_body(event)
    except Exception:
        return bad_request("Invalid JSON body.", request_id)

    error = require_positive(body, "principal", "annualRate", "years")
    if error:
        return bad_request(error, request_id)

    params = {
        "principal": body["principal"],
        "annualRate": body["annualRate"],
        "years": body["years"],
    }
    source_ip = event.get("requestContext", {}).get("http", {}).get("sourceIp")
    log_request(request_id, "emi", params, source_ip)

    try:
        result = calculate_emi(
            principal=float(body["principal"]),
            annual_rate=float(body["annualRate"]),
            years=float(body["years"]),
        )
    except Exception as exc:
        log_response(request_id, "emi", (time.time() - start_time) * 1000)
        return server_error(str(exc), request_id)

    duration_ms = (time.time() - start_time) * 1000
    log_response(request_id, "emi", duration_ms)
    return ok(result, request_id)
