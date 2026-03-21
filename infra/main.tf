terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    # Replace with the bucket name output from infra/bootstrap
    bucket         = "family-tree-terraform-state-522814717404"
    key            = "family-tree/terraform.tfstate"
    region         = "eu-west-2"
    dynamodb_table = "family-tree-terraform-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}
