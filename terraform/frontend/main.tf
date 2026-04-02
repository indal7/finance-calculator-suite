locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  s3_origin_id = "${var.project_name}-frontend-${var.environment}"

  root_domain = "myinvestmentcalculator.in"
  www_domain  = "www.myinvestmentcalculator.in"
}

terraform {
  backend "s3" {
    bucket         = "finance-calculator-terraform-state"
    key            = "frontend/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}

# ──────────────────────────────────────────────────────────────────────────────
# S3 Bucket – static website hosting
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project_name}-frontend-${var.environment}"

  tags = local.common_tags
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ──────────────────────────────────────────────────────────────────────────────
# CloudFront Origin Access Control
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.project_name}-frontend-oac-${var.environment}"
  description                       = "OAC for Finance Calculator Suite frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ──────────────────────────────────────────────────────────────────────────────
# S3 Bucket Policy – allow CloudFront OAC to read objects
# ──────────────────────────────────────────────────────────────────────────────

data "aws_iam_policy_document" "s3_cloudfront_read" {
  statement {
    sid    = "AllowCloudFrontRead"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.s3_cloudfront_read.json

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

# ──────────────────────────────────────────────────────────────────────────────
# CloudFront Function – redirect bare root domain → www
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_cloudfront_function" "www_redirect" {
  name    = "${var.project_name}-www-redirect-${var.environment}"
  runtime = "cloudfront-js-1.0"
  comment = "Redirect myinvestmentcalculator.in to www.myinvestmentcalculator.in"
  publish = true

  code = <<-EOT
    function handler(event) {
      var request = event.request;
      // request.uri contains the path only; query string is forwarded automatically
      var host = request.headers.host ? request.headers.host.value : '';

      if (host === '${local.root_domain}') {
        return {
          statusCode: 301,
          statusDescription: 'Moved Permanently',
          headers: {
            location: { value: 'https://${local.www_domain}' + request.uri }
          }
        };
      }

      return request;
    }
  EOT
}

# ──────────────────────────────────────────────────────────────────────────────
# CloudFront Distribution
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "Finance Calculator Suite – ${var.environment}"
  price_class         = "PriceClass_All"

  aliases = [
    local.root_domain,
    local.www_domain
  ]

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    # AWS managed CachingOptimized policy
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.www_redirect.arn
    }
  }

  # SPA routing – return index.html for Angular client-side routes
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = local.common_tags
}

# ──────────────────────────────────────────────────────────────────────────────
# Route 53 – hosted zone and DNS records
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_route53_zone" "main" {
  name = local.root_domain
  tags = local.common_tags
}

# Root domain ALIAS → CloudFront
resource "aws_route53_record" "root" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.root_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

# www ALIAS → CloudFront
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.www_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}
