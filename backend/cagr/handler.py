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

from utils import calculate_cagr, make_calculator_handler

handler = make_calculator_handler(
    name="cagr",
    required_fields=("beginningValue", "endingValue", "years"),
    calculate_fn=calculate_cagr,
    extract_kwargs=lambda body: {
        "beginning_value": float(body["beginningValue"]),
        "ending_value":    float(body["endingValue"]),
        "years":           float(body["years"]),
    },
)
