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
