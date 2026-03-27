output "s3_bucket_name" {
  description = "Name of the S3 bucket hosting the frontend"
  value       = aws_s3_bucket.frontend.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.frontend.arn
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "frontend_url" {
  description = "Public URL of the frontend application"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "route53_name_servers" {
  description = "Route 53 name servers – update these four values in GoDaddy (Nameservers) to activate AWS DNS"
  value       = aws_route53_zone.main.name_servers
}

output "route53_zone_id" {
  description = "Route 53 hosted zone ID for myinvestmentcalculator.in"
  value       = aws_route53_zone.main.zone_id
}
