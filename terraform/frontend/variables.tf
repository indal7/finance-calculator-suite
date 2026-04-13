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

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for CloudFront (must be in us-east-1). Set via TF_VAR_acm_certificate_arn or -var flag."
  type        = string
  default     = "arn:aws:acm:us-east-1:492661377251:certificate/ff925500-b91f-4354-af0f-47c12fa68922"
}
