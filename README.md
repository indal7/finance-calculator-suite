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

## CI/CD Pipelines (GitHub Actions)

This repo uses three separate pipelines:

1. **Frontend CI** (`.github/workflows/frontend-ci.yml`)
  - Triggers on frontend changes
  - Runs Angular install, build, and tests

2. **Backend CI** (`.github/workflows/backend-ci.yml`)
  - Triggers on backend changes
  - Runs Python tests with coverage

3. **CD Pipeline** (`.github/workflows/cd.yml`)
  - Triggers on `main` (or manual dispatch)
  - Applies Terraform for backend first, then frontend
  - Builds and uploads frontend assets to S3
  - Invalidates CloudFront cache

### When are AWS resources created?

AWS resources are created/updated **during the CD pipeline**, specifically in these steps:

1. `terraform apply` in `terraform/backend` creates/updates IAM roles, Lambda functions, CloudWatch log groups, API Gateway, and permissions.
2. `terraform apply` in `terraform/frontend` creates/updates S3 bucket, CloudFront OAC, bucket policy, and CloudFront distribution.

So the order is: **CI pass -> merge to main -> CD runs -> Terraform provisions resources -> app deploys**.

### Required GitHub secret for CD

Add this repository secret:

- `AWS_GITHUB_ACTIONS_ROLE_ARN`: IAM role ARN assumed by GitHub Actions via OIDC.

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

## DNS & Domain Configuration

The site is reachable at **https://www.myinvestmentcalculator.in** and the root
domain **myinvestmentcalculator.in** automatically redirects there.

### How it works

| Layer | Resource | Purpose |
|-------|----------|---------|
| DNS | Route 53 hosted zone | Authoritative DNS for `myinvestmentcalculator.in` |
| DNS | Route 53 A (ALIAS) – `@` | Points root domain to CloudFront |
| DNS | Route 53 A (ALIAS) – `www` | Points www to CloudFront |
| Edge | CloudFront Function `www_redirect` | 301-redirects bare root requests to `https://www.…` |
| TLS | ACM certificate | Covers both `myinvestmentcalculator.in` and `www.myinvestmentcalculator.in` |

### Step 1 – Apply Terraform

```bash
cd terraform/frontend
terraform init
terraform apply
```

After a successful apply, grab the four Route 53 name servers from the output:

```bash
terraform output route53_name_servers
# Example output:
# [
#   "ns-123.awsdns-45.com",
#   "ns-678.awsdns-90.net",
#   "ns-111.awsdns-22.co.uk",
#   "ns-333.awsdns-44.org",
# ]
```

### Step 2 – Update GoDaddy name servers

1. Log in to **GoDaddy → My Products → DNS → Manage** for `myinvestmentcalculator.in`.
2. Click **Change** next to "Nameservers".
3. Select **"Enter my own nameservers (advanced)"**.
4. Replace the existing name servers with the four values from `terraform output route53_name_servers`.
5. Save – propagation typically takes 0–48 hours.

> **Note:** Once you point GoDaddy to Route 53, all DNS for the domain is managed
> by Terraform. Do **not** add conflicting A / CNAME records in GoDaddy.

### ACM certificate – verify both SANs are present

The Terraform configuration references a pre-issued ACM certificate:

```
arn:aws:acm:us-east-1:492661377251:certificate/679e1c55-24cd-4cf7-a646-e0420d6a6491
```

Confirm it covers **both** SANs in the AWS Console
(*ACM → Certificates → select cert → Domains*):

| Domain | Status |
|--------|--------|
| `myinvestmentcalculator.in` | Issued |
| `www.myinvestmentcalculator.in` | Issued |

If either SAN is missing, re-issue (or add a SAN to) the certificate before
applying Terraform, then update the `acm_certificate_arn` value in
`terraform/frontend/main.tf`.

### Verifying the redirect

Once DNS has propagated:

```bash
# Root domain should return HTTP 301 → www
curl -I http://myinvestmentcalculator.in
# HTTP/1.1 301 Moved Permanently
# Location: https://www.myinvestmentcalculator.in/

# www should return HTTP 200
curl -I https://www.myinvestmentcalculator.in
# HTTP/2 200
```

### Google AdSense verification

AdSense requires the domain it verifies to resolve correctly. After completing
the steps above:

1. Both `myinvestmentcalculator.in` and `www.myinvestmentcalculator.in` will
   return valid HTTPS responses (root redirects to www).
2. Submit `https://www.myinvestmentcalculator.in` as the site URL in AdSense.
3. Add the AdSense meta-tag or `ads.txt` file to the Angular app's `src/` folder
   so it is included in the S3/CloudFront deployment.

---

Each calculator page includes:
- Unique `<title>` set via Angular `Title` service
- `<meta name="description">` and `<meta name="keywords">` via Angular `Meta` service
- Semantic HTML: `<h1>` page title, `<h2>` section headings
- Example calculations for rich content

---

## License

MIT
