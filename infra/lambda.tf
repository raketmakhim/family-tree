# --- IAM Role ---

resource "aws_iam_role" "lambda" {
  name = "family-tree-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "lambda" {
  name = "family-tree-lambda-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # CloudWatch Logs
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        # DynamoDB — all 4 tables
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.trees.arn,
          aws_dynamodb_table.tree_members.arn,
          aws_dynamodb_table.people.arn,
          aws_dynamodb_table.relationships.arn
        ]
      },
      {
        # SSM — read credentials and JWT secret
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters"]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/family-tree/*"
      }
    ]
  })
}

# --- Lambda package ---

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/dist"
  output_path = "${path.module}/../backend/lambda.zip"
}

# --- Lambda function ---

resource "aws_lambda_function" "api" {
  function_name    = "family-tree-api"
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      TREES_TABLE        = aws_dynamodb_table.trees.name
      TREE_MEMBERS_TABLE = aws_dynamodb_table.tree_members.name
      PEOPLE_TABLE       = aws_dynamodb_table.people.name
      RELATIONSHIPS_TABLE = aws_dynamodb_table.relationships.name
      AWS_ACCOUNT_REGION = var.aws_region
    }
  }
}

# Allow API Gateway to invoke the Lambda
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
