# Finance Calculator Suite

A production-grade **Finance Calculator Web App** for Indian investors — live at [**www.myinvestmentcalculator.in**](https://www.myinvestmentcalculator.in).

Built with **Angular 19 (SSR + Prerendering)** frontend, **Python AWS Lambda** backend, fully automated **CI/CD via GitHub Actions**, and infrastructure-as-code with **Terraform**.

---

## Live Calculators

| Calculator | Route | Description |
|------------|-------|-------------|
| SIP Calculator | `/sip-calculator` | Systematic Investment Plan returns |
| EMI Calculator | `/emi-calculator` | Loan Equated Monthly Instalment |
| FD Calculator | `/fd-calculator` | Fixed Deposit maturity amount |
| CAGR Calculator | `/cagr-calculator` | Compound Annual Growth Rate |
| PPF Calculator | `/ppf-calculator` | Public Provident Fund returns |
| Lumpsum Calculator | `/lumpsum-calculator` | One-time investment returns |
| Income Tax Calculator | `/income-tax-calculator` | New vs Old tax regime (FY 2026-27) |

## Blog & SEO Content

| Article | Route |
|---------|-------|
| SIP vs FD Comparison | `/blog/sip-vs-fd` |
| ₹5,000 SIP Per Month | `/blog/sip-5000-per-month` |
| ₹1,000 SIP Per Month | `/blog/sip-1000-per-month` |
| EMI Calculation Guide | `/blog/emi-calculation-guide` |
| ₹50 Lakh Home Loan EMI | `/blog/50-lakh-home-loan-emi` |
| ₹10 Lakh FD Interest | `/blog/10-lakh-fd-interest` |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 19 (standalone components, SSR, prerendering) |
| Charts | Chart.js 4 (doughnut + growth area charts) |
| Testing (FE) | Vitest + jsdom |
| Backend | Python 3.11 on AWS Lambda |
| Testing (BE) | pytest + pytest-cov |
| API | AWS API Gateway (HTTP API v2) |
| Database | DynamoDB (contact submissions + visit analytics) |
| CDN | CloudFront + S3 (OAC) |
| DNS | Route 53 |
| IaC | Terraform (~5.0) |
| CI/CD | GitHub Actions (3 workflows) |
| Auth | OIDC (GitHub → AWS) |

---

## Project Structure

```
finance-calculator-suite/
├── .github/workflows/
│   ├── frontend-ci.yml           # Frontend CI — build + Vitest
│   ├── backend-ci.yml            # Backend CI — pytest + coverage
│   └── cd.yml                    # CD — test gate → Terraform → deploy
│
├── frontend/                     # Angular 19 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── home/                   # Landing page
│   │   │   │   ├── sip-calculator/         # SIP calculator
│   │   │   │   ├── emi-calculator/         # EMI calculator
│   │   │   │   ├── fd-calculator/          # FD calculator
│   │   │   │   ├── cagr-calculator/        # CAGR calculator
│   │   │   │   ├── ppf-calculator/         # PPF calculator
│   │   │   │   ├── lumpsum-calculator/     # Lumpsum calculator
│   │   │   │   ├── income-tax-calculator/  # Income Tax calculator
│   │   │   │   ├── blog/                   # 6 blog articles + list page
│   │   │   │   ├── header/                 # Global header/navbar
│   │   │   │   ├── footer/                 # Global footer
│   │   │   │   ├── about-us/
│   │   │   │   ├── contact-us/
│   │   │   │   ├── privacy-policy/
│   │   │   │   └── terms-conditions/
│   │   │   ├── services/
│   │   │   │   ├── calculator.ts           # Shared HTTP + local calc service
│   │   │   │   └── seo.service.ts          # SEO, JSON-LD, meta tags
│   │   │   ├── app.routes.ts               # 19 lazy-loaded routes
│   │   │   ├── app.routes.server.ts        # 19 prerendered server routes
│   │   │   └── app.config.ts               # Application providers
│   │   ├── environments/
│   │   │   ├── environment.ts              # Dev API URL
│   │   │   └── environment.prod.ts         # Prod API URL (injected by CD)
│   │   ├── assets/
│   │   │   ├── sitemap.xml                 # SEO sitemap
│   │   │   └── robots.txt
│   │   ├── index.html                      # SEO meta, favicon, structured data
│   │   └── styles.css                      # Global shared styles (~1900 lines)
│   ├── angular.json
│   ├── vitest.config.ts
│   └── package.json
│
├── backend/                      # AWS Lambda functions (Python 3.11)
│   ├── utils.py                  # Shared validation, formulas, response helpers
│   ├── sip/handler.py            # POST /sip
│   ├── emi/handler.py            # POST /emi
│   ├── fd/handler.py             # POST /fd
│   ├── cagr/handler.py           # POST /cagr
│   ├── contact/handler.py        # POST /contact — DynamoDB + SES notification
│   ├── track_visit/handler.py    # POST /track-visit — anonymous analytics
│   └── tests/
│       ├── test_utils.py         # Core formula tests
│       └── test_new_features.py  # Response format, logging, request ID tests
│
└── terraform/
    ├── backend/                  # Lambda, API Gateway, DynamoDB, IAM, CloudWatch
    │   ├── main.tf
    │   ├── variables.tf
    │   ├── outputs.tf
    │   └── providers.tf
    └── frontend/                 # S3, CloudFront, Route 53, OAC, www-redirect
        ├── main.tf
        ├── variables.tf
        ├── outputs.tf
        └── providers.tf
```

---

## CI/CD Pipeline

Three GitHub Actions workflows:

### 1. Frontend CI (`frontend-ci.yml`)

- **Triggers:** Push/PR to `main` or `develop` affecting `frontend/`
- **Steps:** Checkout → Node.js 20 → `npm ci` → `npm run build` → `vitest`
- **Artifact:** Uploads `dist/` on `main` branch pushes

### 2. Backend CI (`backend-ci.yml`)

- **Triggers:** Push/PR to `main` or `develop` affecting `backend/`
- **Steps:** Checkout → Python 3.11 → `pip install` → `pytest` with coverage

### 3. CD Pipeline (`cd.yml`)

- **Triggers:** Push to `main` affecting `backend/`, `frontend/`, `terraform/`, or manual dispatch

**Pipeline flow:**

```
push to main
    │
    ├─── backend-test (pytest)
    │         │
    ├─── frontend-test (vitest)
    │         │
    │    (BOTH must pass)
    │         │
    ▼         ▼
terraform-backend ──→ terraform-frontend ──→ deploy-frontend
  (Lambda, API GW,       (S3, CloudFront,       (npm build,
   DynamoDB, IAM)         Route 53, OAC)        S3 sync, CF invalidation)
```

Each Terraform job runs: `init → validate → plan → apply`

### Required GitHub Configuration

| Type | Name | Description |
|------|------|-------------|
| Secret | `AWS_GITHUB_ACTIONS_ROLE_ARN` | IAM role ARN for OIDC assumption |
| Variable | `AWS_DEPLOY_REGION` | AWS region (defaults to `us-east-1`, set `ap-south-1` for Mumbai) |

---

## AWS Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Route 53  │────▶│  CloudFront  │────▶│  S3 Bucket   │
│  (DNS)      │     │  (CDN + SSL) │     │  (Static)    │
└─────────────┘     └──────────────┘     └──────────────┘
                          │
       www-redirect function (root → www)

┌──────────────────┐     ┌──────────────────────────────────────┐
│  API Gateway     │────▶│  Lambda Functions                     │
│  (HTTP API v2)   │     │  sip / emi / fd / cagr               │
│                  │     │  contact (→ DynamoDB + SES)           │
│  POST /{calc}    │     │  track-visit (→ DynamoDB)             │
│  POST /contact   │     └──────────────────────────────────────┘
│  POST /track-visit│                    │
└──────────────────┘           ┌─────────┴──────────┐
                               │    DynamoDB         │
                               │  contact-submissions│
                               │  user-visits        │
                               └────────────────────┘
```

### Terraform State

- **S3 bucket:** `finance-calculator-terraform-state`
- **DynamoDB lock table:** `terraform-locks`
- **State keys:** `backend/terraform.tfstate`, `frontend/terraform.tfstate`

---

## Frontend

### Key Features

- **Angular 19** standalone components with `OnPush` change detection
- **SSR + Prerendering** — 19 routes statically prerendered for SEO
- **Chart.js 4** — interactive doughnut charts (investment vs returns) + growth area charts
- **Reactive Forms** with real-time validation and slider inputs
- **Dual calculation** — instant frontend calculation + optional backend API verification
- **SEO optimised** — per-page titles, meta descriptions, JSON-LD structured data, Open Graph tags
- **Mobile-first responsive CSS** — no external UI libraries
- **Smart Insights** — contextual financial tips per calculator
- **Collapsible year-by-year tables** with Indian number formatting (L/Cr)
- **Dark theme** with premium Groww/Zerodha-inspired design

### Financial Formulas

| Calculator | Formula |
|------------|---------|
| SIP | $FV = P \times \frac{(1+r)^n - 1}{r} \times (1+r)$ |
| EMI | $EMI = P \times \frac{r \times (1+r)^n}{(1+r)^n - 1}$ |
| FD | $A = P \times (1 + \frac{r}{n})^{n \times t}$ |
| CAGR | $CAGR = (\frac{EV}{BV})^{\frac{1}{n}} - 1$ |
| Lumpsum | $FV = P \times (1 + r)^t$ |

### Local Development

```bash
cd frontend
npm install
npm start             # http://localhost:4200
npm run test          # Vitest
npm run build         # Production build (19 prerendered routes)
```

---

## Backend

### Lambda Functions

| Function | Route | Description |
|----------|-------|-------------|
| SIP | `POST /sip` | SIP return calculation |
| EMI | `POST /emi` | Loan EMI breakdown |
| FD | `POST /fd` | FD maturity with compounding |
| CAGR | `POST /cagr` | Growth rate calculation |
| Contact | `POST /contact` | Saves to DynamoDB + optional SES email |
| Track Visit | `POST /track-visit` | Anonymous page visit analytics |

### API Response Format

All responses follow a standardised structure:

```json
// Success (200)
{
  "status": "success",
  "data": { ... },
  "requestId": "abc-123"
}

// Error (400)
{
  "status": "error",
  "error": "'annualRate' is required.",
  "requestId": "abc-123"
}
```

### Example — POST /sip

```json
// Request
{ "monthlyInvestment": 5000, "annualRate": 12, "years": 10 }

// Response
{
  "status": "success",
  "data": {
    "totalInvested": 600000,
    "estimatedReturns": 561695.36,
    "totalValue": 1161695.36
  }
}
```

### Local Testing

```bash
cd backend
pip install -r requirements.txt
python -m pytest tests/ -v --tb=short --cov=. --cov-report=term-missing
```

---

## Deployment

### First-Time Setup

1. **Create Terraform state resources** (one-time, manual):
   ```bash
   aws s3 mb s3://finance-calculator-terraform-state --region us-east-1
   aws dynamodb create-table \
     --table-name terraform-locks \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST
   ```

2. **Create OIDC IAM role** for GitHub Actions and add as repo secret:
   - Secret name: `AWS_GITHUB_ACTIONS_ROLE_ARN`

3. **ACM certificate** — must be in `us-east-1` (CloudFront requirement). Update `TF_VAR_acm_certificate_arn` if using a new account.

4. **Push to `main`** — the CD pipeline handles everything else automatically.

### Region Migration (us-east-1 → ap-south-1)

To move Lambda, API Gateway, and DynamoDB to Mumbai:

1. Set GitHub repo Variable: `AWS_DEPLOY_REGION` = `ap-south-1`
2. Create Terraform state bucket in Mumbai (or keep in us-east-1)
3. Create new ACM certificate in `us-east-1` and set `TF_VAR_acm_certificate_arn`
4. Create OIDC role in new account, update `AWS_GITHUB_ACTIONS_ROLE_ARN`
5. Push — Terraform creates all resources fresh in `ap-south-1`

> **Note:** CloudFront, Route 53, and ACM certificates always remain in `us-east-1` — this is an AWS requirement.

---

## All Routes (19 prerendered)

| # | Route | Page |
|---|-------|------|
| 1 | `/` | Home |
| 2 | `/sip-calculator` | SIP Calculator |
| 3 | `/emi-calculator` | EMI Calculator |
| 4 | `/fd-calculator` | FD Calculator |
| 5 | `/cagr-calculator` | CAGR Calculator |
| 6 | `/ppf-calculator` | PPF Calculator |
| 7 | `/lumpsum-calculator` | Lumpsum Calculator |
| 8 | `/income-tax-calculator` | Income Tax Calculator |
| 9 | `/blog` | Blog List |
| 10 | `/blog/sip-vs-fd` | SIP vs FD |
| 11 | `/blog/sip-5000-per-month` | ₹5,000 SIP Returns |
| 12 | `/blog/sip-1000-per-month` | ₹1,000 SIP Returns |
| 13 | `/blog/emi-calculation-guide` | EMI Guide |
| 14 | `/blog/50-lakh-home-loan-emi` | ₹50L Home Loan EMI |
| 15 | `/blog/10-lakh-fd-interest` | ₹10L FD Interest |
| 16 | `/about-us` | About Us |
| 17 | `/contact-us` | Contact Us |
| 18 | `/privacy-policy` | Privacy Policy |
| 19 | `/terms-and-conditions` | Terms & Conditions |

---

## License

Private — All rights reserved.
