resource "aws_ssm_parameter" "viewer_username" {
  name  = "/family-tree/viewer-username"
  type  = "String"
  value = var.viewer_username
  lifecycle { ignore_changes = [value] }
}

resource "aws_ssm_parameter" "viewer_password" {
  name  = "/family-tree/viewer-password"
  type  = "SecureString"
  value = var.viewer_password
  lifecycle { ignore_changes = [value] }
}

resource "aws_ssm_parameter" "editor_username" {
  name  = "/family-tree/editor-username"
  type  = "String"
  value = var.editor_username
  lifecycle { ignore_changes = [value] }
}

resource "aws_ssm_parameter" "editor_password" {
  name  = "/family-tree/editor-password"
  type  = "SecureString"
  value = var.editor_password
  lifecycle { ignore_changes = [value] }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/family-tree/jwt-secret"
  type  = "SecureString"
  value = var.jwt_secret
  lifecycle { ignore_changes = [value] }
}
