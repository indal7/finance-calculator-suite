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

from utils import calculate_fd, make_calculator_handler

handler = make_calculator_handler(
    name="fd",
    required_fields=("principal", "annualRate", "years", "compoundingFrequency"),
    calculate_fn=calculate_fd,
    extract_kwargs=lambda body: {
        "principal":              float(body["principal"]),
        "annual_rate":            float(body["annualRate"]),
        "years":                  float(body["years"]),
        "compounding_frequency":  int(float(body["compoundingFrequency"])),
    },
)
