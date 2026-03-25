
terraform {
  backend "s3" {
    bucket         = "finance-calculator-terraform-state"
    key            = "backend/terraform.tfstate"
    region         = "ap-south-1"
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
