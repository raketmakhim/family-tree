import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
  BatchGetCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { db, tables } from "../db/client";
import { Tree } from "../types";

export async function listTrees(): Promise<Tree[]> {
  const result = await db.send(new ScanCommand({ TableName: tables.trees }));
  return (result.Items ?? []) as Tree[];
}

export async function createTree(body: string | null): Promise<Tree> {
  if (!body) throw { status: 400, message: "Missing request body" };
  const { name } = JSON.parse(body);

  const tree: Tree = {
    treeId: uuidv4(),
    createdAt: new Date().toISOString(),
    ...(name !== undefined && { name }),
  };

  await db.send(new PutCommand({ TableName: tables.trees, Item: tree }));
  return tree;
}

export async function getTree(treeId: string) {
  // 1. Get tree metadata
  const treeResult = await db.send(
    new GetCommand({ TableName: tables.trees, Key: { treeId } })
  );
  if (!treeResult.Item) throw { status: 404, message: "Tree not found" };

  // 2. Get all tree members
  const membersResult = await db.send(
    new QueryCommand({
      TableName: tables.treeMembers,
      KeyConditionExpression: "treeId = :treeId",
      ExpressionAttributeValues: { ":treeId": treeId },
    })
  );
  const memberIds = (membersResult.Items ?? []).map((m) => m.personId as string);

  // 3. Batch get people records
  let people: Record<string, unknown>[] = [];
  if (memberIds.length > 0) {
    const batchResult = await db.send(
      new BatchGetCommand({
        RequestItems: {
          [tables.people]: {
            Keys: memberIds.map((id) => ({ personId: id })),
          },
        },
      })
    );
    people = (batchResult.Responses?.[tables.people] ?? []) as Record<string, unknown>[];
  }

  // 4. Scan all relationships and filter to tree members only
  const memberSet = new Set(memberIds);
  const relResult = await db.send(new ScanCommand({ TableName: tables.relationships }));
  const relationships = (relResult.Items ?? []).filter(
    (r) => memberSet.has(r.fromPersonId as string) && memberSet.has(r.toPersonId as string)
  );

  return { tree: treeResult.Item, people, relationships };
}

export async function updateTree(treeId: string, body: string | null): Promise<void> {
  if (!body) throw { status: 400, message: "Missing request body" };
  const { name } = JSON.parse(body);
  if (name === undefined) throw { status: 400, message: "Nothing to update" };

  await db.send(
    new UpdateCommand({
      TableName: tables.trees,
      Key: { treeId },
      UpdateExpression: "SET #name = :name",
      ExpressionAttributeNames: { "#name": "name" },
      ExpressionAttributeValues: { ":name": name },
      ConditionExpression: "attribute_exists(treeId)",
    })
  );
}

export async function deleteTree(treeId: string): Promise<void> {
  // Remove all tree members first
  const membersResult = await db.send(
    new QueryCommand({
      TableName: tables.treeMembers,
      KeyConditionExpression: "treeId = :treeId",
      ExpressionAttributeValues: { ":treeId": treeId },
    })
  );

  const memberItems = membersResult.Items ?? [];
  if (memberItems.length > 0) {
    await db.send(
      new BatchWriteCommand({
        RequestItems: {
          [tables.treeMembers]: memberItems.map((m) => ({
            DeleteRequest: { Key: { treeId: m.treeId, personId: m.personId } },
          })),
        },
      })
    );
  }

  await db.send(new DeleteCommand({ TableName: tables.trees, Key: { treeId } }));
}

export async function addMember(treeId: string, personId: string): Promise<void> {
  // Verify both exist
  const [treeResult, personResult] = await Promise.all([
    db.send(new GetCommand({ TableName: tables.trees, Key: { treeId } })),
    db.send(new GetCommand({ TableName: tables.people, Key: { personId } })),
  ]);
  if (!treeResult.Item) throw { status: 404, message: "Tree not found" };
  if (!personResult.Item) throw { status: 404, message: "Person not found" };

  await db.send(
    new PutCommand({ TableName: tables.treeMembers, Item: { treeId, personId } })
  );
}

export async function removeMember(treeId: string, personId: string): Promise<void> {
  await db.send(
    new DeleteCommand({
      TableName: tables.treeMembers,
      Key: { treeId, personId },
    })
  );
}
