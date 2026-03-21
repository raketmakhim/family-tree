variable "aws_region" {
  type    = string
  default = "eu-west-2"
}

variable "viewer_username" {
  type      = string
  sensitive = true
  default   = "CHANGE_ME"
}

variable "viewer_password" {
  type      = string
  sensitive = true
  default   = "CHANGE_ME"
}

variable "editor_username" {
  type      = string
  sensitive = true
  default   = "CHANGE_ME"
}

variable "editor_password" {
  type      = string
  sensitive = true
  default   = "CHANGE_ME"
}

variable "jwt_secret" {
  type        = string
  sensitive   = true
  default     = "CHANGE_ME"
  description = "Long random string used to sign JWTs. Generate with: openssl rand -hex 32"
}
