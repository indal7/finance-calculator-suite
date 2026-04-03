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

from utils import calculate_emi, make_calculator_handler

handler = make_calculator_handler(
    name="emi",
    required_fields=("principal", "annualRate", "years"),
    calculate_fn=calculate_emi,
    extract_kwargs=lambda body: {
        "principal":    float(body["principal"]),
        "annual_rate":  float(body["annualRate"]),
        "years":        float(body["years"]),
    },
)
