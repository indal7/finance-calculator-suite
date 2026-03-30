
terraform {
  backend "s3" {
    bucket         = "finance-calculator-terraform-state"
    key            = "backend/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}
# ──────────────────────────────────────────────────────────────────────────────
# IAM – Lambda execution role
# ──────────────────────────────────────────────────────────────────────────────

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name               = "${var.project_name}-lambda-exec-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ──────────────────────────────────────────────────────────────────────────────
# Lambda deployment packages (zip archives from source directories)
# ──────────────────────────────────────────────────────────────────────────────

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  calculators = ["sip", "emi", "fd", "cagr"]
}

data "archive_file" "lambda_zip" {
  for_each    = toset(local.calculators)
  type        = "zip"
  output_path = "${path.module}/../../backend/${each.key}/lambda_${each.key}.zip"

  source {
    content  = file("${path.module}/../../backend/utils.py")
    filename = "utils.py"
  }
  source {
    content  = file("${path.module}/../../backend/${each.key}/handler.py")
    filename = "handler.py"
  }
}

# ──────────────────────────────────────────────────────────────────────────────
# Lambda Functions
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_lambda_function" "calculator" {
  for_each = toset(local.calculators)

  function_name = "${var.project_name}-${each.key}-${var.environment}"
  description   = "Finance Calculator Suite – ${upper(each.key)} calculator"
  role          = aws_iam_role.lambda_exec.arn
  runtime       = var.lambda_runtime
  handler       = "handler.handler"
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = data.archive_file.lambda_zip[each.key].output_path
  source_code_hash = data.archive_file.lambda_zip[each.key].output_base64sha256

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "lambda_logs" {
  for_each = toset(local.calculators)

  name              = "/aws/lambda/${aws_lambda_function.calculator[each.key].function_name}"
  retention_in_days = 14

  tags = local.common_tags
}

# ──────────────────────────────────────────────────────────────────────────────
# API Gateway (HTTP API v2)
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-api-${var.environment}"
  protocol_type = "HTTP"
  description   = "Finance Calculator Suite HTTP API"

  cors_configuration {
    allow_origins = var.cors_allowed_origins
    allow_methods = ["POST", "OPTIONS"]
    allow_headers = ["Content-Type"]
    max_age       = 300
  }

  tags = local.common_tags
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 20
    throttling_rate_limit  = 10
  }

  route_settings {
    route_key              = "POST /contact"
    throttling_burst_limit = 5
    throttling_rate_limit  = 2
  }

  route_settings {
    route_key              = "POST /track-visit"
    throttling_burst_limit = 50
    throttling_rate_limit  = 30
  }

  tags = local.common_tags
}

# Lambda integrations
resource "aws_apigatewayv2_integration" "calculator" {
  for_each = toset(local.calculators)

  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.calculator[each.key].invoke_arn
  payload_format_version = "2.0"
}

# Routes: POST /{calculator}
resource "aws_apigatewayv2_route" "calculator" {
  for_each = toset(local.calculators)

  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /${each.key}"
  target    = "integrations/${aws_apigatewayv2_integration.calculator[each.key].id}"
}

# Lambda permission for API Gateway to invoke each function
resource "aws_lambda_permission" "api_gateway" {
  for_each = toset(local.calculators)

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.calculator[each.key].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# ──────────────────────────────────────────────────────────────────────────────
# DynamoDB – Contact Submissions Table
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_dynamodb_table" "contact_submissions" {
  name         = "${var.project_name}-contact-submissions-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  # GSI: Query submissions by email (for duplicate detection / admin lookup)
  global_secondary_index {
    name            = "email-created_at-index"
    hash_key        = "email"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = local.common_tags
}

# ──────────────────────────────────────────────────────────────────────────────
# IAM – DynamoDB write policy for contact Lambda
# ──────────────────────────────────────────────────────────────────────────────

data "aws_iam_policy_document" "contact_dynamodb" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:Query",
    ]
    resources = [
      aws_dynamodb_table.contact_submissions.arn,
      "${aws_dynamodb_table.contact_submissions.arn}/index/*",
    ]
  }
}

resource "aws_iam_policy" "contact_dynamodb" {
  name   = "${var.project_name}-contact-dynamodb-${var.environment}"
  policy = data.aws_iam_policy_document.contact_dynamodb.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "contact_dynamodb" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.contact_dynamodb.arn
}

# Optional: SES send-email permission
data "aws_iam_policy_document" "contact_ses" {
  statement {
    effect    = "Allow"
    actions   = ["ses:SendEmail"]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "contact_ses" {
  name   = "${var.project_name}-contact-ses-${var.environment}"
  policy = data.aws_iam_policy_document.contact_ses.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "contact_ses" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.contact_ses.arn
}

# ──────────────────────────────────────────────────────────────────────────────
# Lambda – Contact Form Handler
# ──────────────────────────────────────────────────────────────────────────────

data "archive_file" "contact_zip" {
  type        = "zip"
  output_path = "${path.module}/../../backend/contact/lambda_contact.zip"

  source {
    content  = file("${path.module}/../../backend/utils.py")
    filename = "utils.py"
  }
  source {
    content  = file("${path.module}/../../backend/contact/handler.py")
    filename = "handler.py"
  }
}

resource "aws_lambda_function" "contact" {
  function_name = "${var.project_name}-contact-${var.environment}"
  description   = "Finance Calculator Suite – Contact form handler"
  role          = aws_iam_role.lambda_exec.arn
  runtime       = var.lambda_runtime
  handler       = "handler.handler"
  timeout       = 10
  memory_size   = 128

  filename         = data.archive_file.contact_zip.output_path
  source_code_hash = data.archive_file.contact_zip.output_base64sha256

  environment {
    variables = {
      CONTACT_TABLE_NAME = aws_dynamodb_table.contact_submissions.name
      NOTIFY_EMAIL       = var.contact_notify_email
      SES_FROM_EMAIL     = var.contact_ses_from_email
    }
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "contact_logs" {
  name              = "/aws/lambda/${aws_lambda_function.contact.function_name}"
  retention_in_days = 30

  tags = local.common_tags
}

# ──────────────────────────────────────────────────────────────────────────────
# API Gateway – Contact route with throttling
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_integration" "contact" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.contact.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "contact" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /contact"
  target    = "integrations/${aws_apigatewayv2_integration.contact.id}"
}

resource "aws_lambda_permission" "contact_api_gateway" {
  statement_id  = "AllowAPIGatewayInvokeContact"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.contact.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# ──────────────────────────────────────────────────────────────────────────────
# DynamoDB – User Visits Table (Analytics)
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_dynamodb_table" "user_visits" {
  name         = "${var.project_name}-user-visits-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "visit_id"

  attribute {
    name = "visit_id"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  attribute {
    name = "visitor_id"
    type = "S"
  }

  attribute {
    name = "page_url"
    type = "S"
  }

  # GSI-1: Query visits by date (daily analytics, page views per day)
  global_secondary_index {
    name            = "date-timestamp-index"
    hash_key        = "date"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  # GSI-2: Query visits by visitor (unique vs returning users)
  global_secondary_index {
    name            = "visitor_id-timestamp-index"
    hash_key        = "visitor_id"
    range_key       = "timestamp"
    projection_type = "KEYS_ONLY"
  }

  # GSI-3: Query visits by page URL (popular pages analytics)
  global_secondary_index {
    name            = "page_url-timestamp-index"
    hash_key        = "page_url"
    range_key       = "timestamp"
    projection_type = "KEYS_ONLY"
  }

  # TTL: auto-expire old visit records after retention period
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = local.common_tags
}

# ──────────────────────────────────────────────────────────────────────────────
# IAM – DynamoDB write policy for track-visit Lambda
# ──────────────────────────────────────────────────────────────────────────────

data "aws_iam_policy_document" "track_visit_dynamodb" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
    ]
    resources = [
      aws_dynamodb_table.user_visits.arn,
    ]
  }
}

resource "aws_iam_policy" "track_visit_dynamodb" {
  name   = "${var.project_name}-track-visit-dynamodb-${var.environment}"
  policy = data.aws_iam_policy_document.track_visit_dynamodb.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "track_visit_dynamodb" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.track_visit_dynamodb.arn
}

# ──────────────────────────────────────────────────────────────────────────────
# Lambda – Track Visit Handler
# ──────────────────────────────────────────────────────────────────────────────

data "archive_file" "track_visit_zip" {
  type        = "zip"
  output_path = "${path.module}/../../backend/track_visit/lambda_track_visit.zip"

  source {
    content  = file("${path.module}/../../backend/utils.py")
    filename = "utils.py"
  }
  source {
    content  = file("${path.module}/../../backend/track_visit/handler.py")
    filename = "handler.py"
  }
}

resource "aws_lambda_function" "track_visit" {
  function_name = "${var.project_name}-track-visit-${var.environment}"
  description   = "Finance Calculator Suite – Anonymous visit tracker"
  role          = aws_iam_role.lambda_exec.arn
  runtime       = var.lambda_runtime
  handler       = "handler.handler"
  timeout       = 5
  memory_size   = 128

  filename         = data.archive_file.track_visit_zip.output_path
  source_code_hash = data.archive_file.track_visit_zip.output_base64sha256

  environment {
    variables = {
      VISITS_TABLE_NAME = aws_dynamodb_table.user_visits.name
    }
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "track_visit_logs" {
  name              = "/aws/lambda/${aws_lambda_function.track_visit.function_name}"
  retention_in_days = 14

  tags = local.common_tags
}

# ──────────────────────────────────────────────────────────────────────────────
# API Gateway – Track Visit route
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_integration" "track_visit" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.track_visit.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "track_visit" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /track-visit"
  target    = "integrations/${aws_apigatewayv2_integration.track_visit.id}"
}

resource "aws_lambda_permission" "track_visit_api_gateway" {
  statement_id  = "AllowAPIGatewayInvokeTrackVisit"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.track_visit.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
