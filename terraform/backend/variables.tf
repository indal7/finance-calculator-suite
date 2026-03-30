variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name used as a prefix for all resources"
  type        = string
  default     = "finance-calculator"
}

variable "lambda_runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "python3.11"
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_memory_size" {
  description = "Lambda function memory in MB"
  type        = number
  default     = 256
}

variable "cors_allowed_origins" {
  description = "List of allowed origins for CORS on the API Gateway (use specific frontend domain(s) in production)"
  type        = list(string)
  default     = ["*"]
}

variable "contact_notify_email" {
  description = "Email address to receive contact form notifications (must be SES-verified)"
  type        = string
  default     = ""
}

variable "contact_ses_from_email" {
  description = "Verified SES sender email for notifications"
  type        = string
  default     = ""
}
