output "api_gateway_url" {
  value       = aws_apigatewayv2_stage.api.invoke_url
  description = "Base URL for all API calls"
}

output "cloudfront_url" {
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
  description = "URL to access the frontend"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.frontend.bucket
  description = "S3 bucket to sync the built frontend into"
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.frontend.id
  description = "Used to invalidate the CloudFront cache after deploying frontend"
}
