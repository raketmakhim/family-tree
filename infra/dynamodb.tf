resource "aws_dynamodb_table" "trees" {
  name         = "family-tree-trees"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "treeId"

  attribute {
    name = "treeId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "tree_members" {
  name         = "family-tree-tree-members"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "treeId"
  range_key    = "personId"

  attribute {
    name = "treeId"
    type = "S"
  }

  attribute {
    name = "personId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "people" {
  name         = "family-tree-people"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "personId"

  attribute {
    name = "personId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "relationships" {
  name         = "family-tree-relationships"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "fromPersonId"
  range_key    = "toPersonId"

  attribute {
    name = "fromPersonId"
    type = "S"
  }

  attribute {
    name = "toPersonId"
    type = "S"
  }
}
