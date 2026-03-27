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
  "status": "success",
  "data": {
    "cagr": 14.8698,
    "absoluteReturn": 100.0,
    "totalGain": 50000
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
    calculate_cagr, get_request_id, log_request, log_response,
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

    error = require_positive(body, "beginningValue", "endingValue", "years")
    if error:
        return bad_request(error, request_id)

    params = {
        "beginningValue": body["beginningValue"],
        "endingValue": body["endingValue"],
        "years": body["years"],
    }
    source_ip = event.get("requestContext", {}).get("http", {}).get("sourceIp")
    log_request(request_id, "cagr", params, source_ip)

    try:
        result = calculate_cagr(
            beginning_value=float(body["beginningValue"]),
            ending_value=float(body["endingValue"]),
            years=float(body["years"]),
        )
    except Exception as exc:
        log_response(request_id, "cagr", (time.time() - start_time) * 1000)
        return server_error(str(exc), request_id)

    duration_ms = (time.time() - start_time) * 1000
    log_response(request_id, "cagr", duration_ms)
    return ok(result, request_id)
