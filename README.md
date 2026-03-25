# Finance Calculator Suite

A production-ready **Finance Calculator Web App** featuring four financial calculators:

| Calculator | Route | Description |
|------------|-------|-------------|
| SIP Calculator  | `/sip-calculator`  | Systematic Investment Plan returns |
| EMI Calculator  | `/emi-calculator`  | Loan Equated Monthly Instalment |
| FD Calculator   | `/fd-calculator`   | Fixed Deposit maturity amount |
| CAGR Calculator | `/cagr-calculator` | Compound Annual Growth Rate |

---

## Project Structure

```
finance-calculator-suite/
├── frontend/                         # Angular 19 web application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── sip-calculator/   # SIP calculator component
│   │   │   │   ├── emi-calculator/   # EMI calculator component
│   │   │   │   ├── fd-calculator/    # FD calculator component
│   │   │   │   └── cagr-calculator/  # CAGR calculator component
│   │   │   ├── services/
│   │   │   │   └── calculator.ts     # Shared HTTP service for API calls
│   │   │   ├── app.ts                # Root component (navbar + layout)
│   │   │   ├── app.routes.ts         # Angular lazy-loaded routes
│   │   │   └── app.config.ts         # Application providers
│   │   ├── environments/             # environment.ts / environment.prod.ts
│   │   ├── index.html                # SEO meta tags
│   │   └── styles.css                # Shared component styles
│   ├── angular.json
│   └── package.json
│
└── backend/                          # AWS Lambda functions (Python 3.10+)
    ├── utils.py                      # Shared validation + financial formulas
    ├── sip/handler.py                # POST /sip
    ├── emi/handler.py                # POST /emi
    ├── fd/handler.py                 # POST /fd
    ├── cagr/handler.py               # POST /cagr
    └── tests/test_utils.py           # pytest unit tests
```

---

## Frontend (Angular)

### Features
- **Standalone components** (Angular 19+)
- **Reactive Forms** with validation
- **Lazy-loaded routes** for each calculator
- **Dual calculation** – instant frontend result + async API verification
- **SEO optimised** – per-page `<title>`, `<meta description>`, `<meta keywords>`, structured H1/H2
- **Mobile-responsive** CSS (no external UI libraries)
- **CORS-safe** API integration

### Development

```bash
cd frontend
npm install
ng serve          # http://localhost:4200
```

### Production Build

```bash
ng build --configuration production
# Output: dist/frontend/
```

### Update API Base URL

Edit `src/environments/environment.ts` (dev) and `environment.prod.ts` (prod):

```ts
export const environment = {
  production: false,
  apiBase: 'https://<api-id>.execute-api.us-east-1.amazonaws.com/prod'
};
```

---

## Backend (AWS Lambda – Python)

### Formulas

| Calculator | Formula |
|------------|---------|
| SIP  | `FV = P × ((1+r)ⁿ − 1) / r × (1+r)` |
| EMI  | `EMI = P × r × (1+r)ⁿ / ((1+r)ⁿ − 1)` |
| FD   | `A = P × (1 + r/n)^(n×t)` |
| CAGR | `CAGR = (EV/BV)^(1/n) − 1` |

### Running Tests Locally

```bash
cd backend
pip install pytest
python -m pytest tests/ -v
```

### API Request / Response Examples

#### POST /sip

```json
// Request
{
  "monthlyInvestment": 5000,
  "annualRate": 12,
  "years": 10
}

// Response 200
{
  "totalInvested": 600000,
  "estimatedReturns": 561695.36,
  "totalValue": 1161695.36
}
```

#### POST /emi

```json
// Request
{
  "principal": 500000,
  "annualRate": 8.5,
  "years": 5
}

// Response 200
{
  "emi": 10253.38,
  "totalPayment": 615202.97,
  "totalInterest": 115202.97
}
```

#### POST /fd

```json
// Request
{
  "principal": 100000,
  "annualRate": 7,
  "years": 3,
  "compoundingFrequency": 4
}

// Response 200
{
  "principal": 100000,
  "maturityAmount": 123143.97,
  "totalInterest": 23143.97
}
```

#### POST /cagr

```json
// Request
{
  "beginningValue": 50000,
  "endingValue": 100000,
  "years": 5
}

// Response 200
{
  "cagr": 14.8698,
  "absoluteReturn": 100.0,
  "totalGain": 50000
}
```

#### Error Response (400)

```json
{
  "error": "'annualRate' is required."
}
```

---

## AWS Deployment

### 1. Deploy Lambda Functions

Each Lambda function is independent. Deploy each `handler.py` along with `utils.py`.

```bash
# Example for SIP function
cd backend

# Package SIP function
mkdir -p /tmp/sip-package
cp utils.py /tmp/sip-package/
cp sip/handler.py /tmp/sip-package/
cd /tmp/sip-package && zip -r sip-function.zip .

# Create Lambda function
aws lambda create-function \
  --function-name sip-calculator \
  --runtime python3.12 \
  --role arn:aws:iam::<ACCOUNT_ID>:role/lambda-execution-role \
  --handler handler.handler \
  --zip-file fileb://sip-function.zip \
  --timeout 10 \
  --memory-size 128

# Or update existing
aws lambda update-function-code \
  --function-name sip-calculator \
  --zip-file fileb://sip-function.zip
```

Repeat for `emi-calculator`, `fd-calculator`, and `cagr-calculator`.

### 2. Create API Gateway

```bash
# Create REST API
aws apigateway create-rest-api --name "finance-calculator-api"

# For each calculator, create a resource and POST method,
# then integrate with the corresponding Lambda function.
# Use Lambda Proxy Integration for automatic request/response mapping.
```

### 3. Enable CORS

Each Lambda handler already returns CORS headers:

```python
CORS_HEADERS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}
```

In API Gateway:
1. Enable CORS on each resource (Actions → Enable CORS)
2. Deploy to a stage (e.g., `prod`)
3. Update `environment.ts` with the generated invoke URL

### 4. Lambda IAM Role (minimum permissions)

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
    "Resource": "arn:aws:logs:*:*:*"
  }]
}
```

---

## SEO

Each calculator page includes:
- Unique `<title>` set via Angular `Title` service
- `<meta name="description">` and `<meta name="keywords">` via Angular `Meta` service
- Semantic HTML: `<h1>` page title, `<h2>` section headings
- Example calculations for rich content

---

## License

MIT
