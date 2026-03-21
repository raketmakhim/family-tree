import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
export const db = DynamoDBDocumentClient.from(client);

export const tables = {
  trees: process.env.TREES_TABLE!,
  treeMembers: process.env.TREE_MEMBERS_TABLE!,
  people: process.env.PEOPLE_TABLE!,
  relationships: process.env.RELATIONSHIPS_TABLE!,
};
