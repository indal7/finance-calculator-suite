"""
AWS Lambda handler – SIP Calculator
POST /sip

Request body:
{
  "monthlyInvestment": 5000,   // monthly SIP amount in INR
  "annualRate": 12,            // expected annual return in %
  "years": 10,                 // investment tenure in years
  "stepUpRate": 5              // (optional) annual step-up % (0, 5, 10, etc.)
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

from utils import calculate_sip, make_calculator_handler

handler = make_calculator_handler(
    name="sip",
    required_fields=("monthlyInvestment", "annualRate", "years"),
    calculate_fn=calculate_sip,
    extract_kwargs=lambda body: {
        "monthly_investment": float(body["monthlyInvestment"]),
        "annual_rate":        float(body["annualRate"]),
        "years":              float(body["years"]),
        "step_up_rate":       float(body.get("stepUpRate", 0)),  # optional, defaults to 0
    },
)
