output "api_gateway_url" {
  description = "Base URL of the API Gateway endpoint"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "lambda_function_names" {
  description = "Names of the deployed Lambda functions"
  value       = { for k, v in aws_lambda_function.calculator : k => v.function_name }
}

output "lambda_function_arns" {
  description = "ARNs of the deployed Lambda functions"
  value       = { for k, v in aws_lambda_function.calculator : k => v.arn }
}

output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = aws_apigatewayv2_api.main.id
}

output "calculator_endpoints" {
  description = "Full URLs for each calculator endpoint"
  value = {
    for calc in local.calculators :
    calc => "${aws_apigatewayv2_stage.default.invoke_url}/${calc}"
  }
}

output "contact_endpoint" {
  description = "Full URL for the contact form endpoint"
  value       = "${aws_apigatewayv2_stage.default.invoke_url}/contact"
}

output "contact_table_name" {
  description = "DynamoDB table name for contact submissions"
  value       = aws_dynamodb_table.contact_submissions.name
}

output "contact_lambda_name" {
  description = "Contact Lambda function name"
  value       = aws_lambda_function.contact.function_name
}

output "track_visit_endpoint" {
  description = "Full URL for the visit tracking endpoint"
  value       = "${aws_apigatewayv2_stage.default.invoke_url}/track-visit"
}

output "visits_table_name" {
  description = "DynamoDB table name for user visits"
  value       = aws_dynamodb_table.user_visits.name
}

output "track_visit_lambda_name" {
  description = "Track visit Lambda function name"
  value       = aws_lambda_function.track_visit.function_name
}

output "share_post_endpoint" {
  description = "Full URL for creating shared results"
  value       = "${aws_apigatewayv2_stage.default.invoke_url}/share"
}

output "share_get_endpoint" {
  description = "URL pattern for retrieving shared results"
  value       = "${aws_apigatewayv2_stage.default.invoke_url}/share/{id}"
}

output "shared_results_table_name" {
  description = "DynamoDB table name for shared calculator results"
  value       = aws_dynamodb_table.shared_results.name
}

output "share_lambda_name" {
  description = "Share Lambda function name"
  value       = aws_lambda_function.share.function_name
}
