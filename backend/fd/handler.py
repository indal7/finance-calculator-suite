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
  "status": "success",
  "data": {
    "principal": 100000,
    "maturityAmount": 123145,
    "totalInterest": 23145
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
    calculate_fd, get_request_id, log_request, log_response,
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

    error = require_positive(body, "principal", "annualRate", "years", "compoundingFrequency")
    if error:
        return bad_request(error, request_id)

    compounding_freq = int(float(body["compoundingFrequency"]))
    if compounding_freq < 1:
        return bad_request("'compoundingFrequency' must be at least 1.", request_id)

    params = {
        "principal": body["principal"],
        "annualRate": body["annualRate"],
        "years": body["years"],
        "compoundingFrequency": compounding_freq,
    }
    source_ip = event.get("requestContext", {}).get("http", {}).get("sourceIp")
    log_request(request_id, "fd", params, source_ip)

    try:
        result = calculate_fd(
            principal=float(body["principal"]),
            annual_rate=float(body["annualRate"]),
            years=float(body["years"]),
            compounding_frequency=compounding_freq,
        )
    except Exception as exc:
        log_response(request_id, "fd", (time.time() - start_time) * 1000)
        return server_error(str(exc), request_id)

    duration_ms = (time.time() - start_time) * 1000
    log_response(request_id, "fd", duration_ms)
    return ok(result, request_id)
