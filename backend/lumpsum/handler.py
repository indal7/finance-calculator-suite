"""
AWS Lambda handler – Lumpsum Calculator
POST /lumpsum

Request body:
{
  "principal": 100000,         // one-time investment amount in INR
  "annualRate": 12,            // expected annual return in %
  "years": 10                  // investment tenure in years
}

Response:
{
  "status": "success",
  "data": {
    "totalInvested": 100000,
    "estimatedReturns": 210585,
    "totalValue": 310585
  },
  "requestId": "<uuid>"
}
"""

from utils import calculate_lumpsum, make_calculator_handler

handler = make_calculator_handler(
    name="lumpsum",
    required_fields=("principal", "annualRate", "years"),
    calculate_fn=calculate_lumpsum,
    extract_kwargs=lambda body: {
        "principal":    float(body["principal"]),
        "annual_rate":  float(body["annualRate"]),
        "years":        float(body["years"]),
    },
)
