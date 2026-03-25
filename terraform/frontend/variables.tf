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

variable "domain_name" {
  description = "Custom domain name for the frontend (leave empty to use the CloudFront URL)"
  type        = string
  default     = ""
}
