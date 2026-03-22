import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
  UpdateCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { db, tables } from "../db/client";
import { Person } from "../types";

const toTitleCase = (s: string) =>
  s.trim().replace(/\s+/g, " ").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export async function listPeople(): Promise<Person[]> {
  const result = await db.send(new ScanCommand({ TableName: tables.people }));
  return (result.Items ?? []) as Person[];
}

export async function createPerson(body: string | null): Promise<Person> {
  if (!body) throw { status: 400, message: "Missing request body" };
  const { name, dob } = JSON.parse(body);

  const person: Person = {
    personId: uuidv4(),
    createdAt: new Date().toISOString(),
    ...(name !== undefined && { name: toTitleCase(name) }),
    ...(dob !== undefined && { dob }),
  };

  await db.send(new PutCommand({ TableName: tables.people, Item: person }));
  return person;
}

export async function updatePerson(personId: string, body: string | null): Promise<void> {
  if (!body) throw { status: 400, message: "Missing request body" };
  const { name, dob, birthOrder, marriedIn } = JSON.parse(body);

  const setExpressions: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  if (name !== undefined) {
    setExpressions.push("#name = :name");
    names["#name"] = "name";
    values[":name"] = toTitleCase(name);
  }
  if (dob !== undefined) {
    setExpressions.push("dob = :dob");
    values[":dob"] = dob;
  }
  if (birthOrder !== undefined) {
    setExpressions.push("birthOrder = :birthOrder");
    values[":birthOrder"] = birthOrder;
  }
  if (marriedIn !== undefined) {
    setExpressions.push("marriedIn = :marriedIn");
    values[":marriedIn"] = marriedIn;
  }
  if (setExpressions.length === 0) throw { status: 400, message: "Nothing to update" };

  await db.send(
    new UpdateCommand({
      TableName: tables.people,
      Key: { personId },
      UpdateExpression: `SET ${setExpressions.join(", ")}`,
      ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
      ExpressionAttributeValues: values,
      ConditionExpression: "attribute_exists(personId)",
    })
  );
}

export async function deletePerson(personId: string): Promise<void> {
  // Remove from all trees
  const treeMembersResult = await db.send(
    new ScanCommand({
      TableName: tables.treeMembers,
      FilterExpression: "personId = :personId",
      ExpressionAttributeValues: { ":personId": personId },
    })
  );
  const memberItems = treeMembersResult.Items ?? [];
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

  // Remove all relationships involving this person
  const relResult = await db.send(new ScanCommand({ TableName: tables.relationships }));
  const relItems = (relResult.Items ?? []).filter(
    (r) => r.fromPersonId === personId || r.toPersonId === personId
  );
  if (relItems.length > 0) {
    await db.send(
      new BatchWriteCommand({
        RequestItems: {
          [tables.relationships]: relItems.map((r) => ({
            DeleteRequest: { Key: { fromPersonId: r.fromPersonId, toPersonId: r.toPersonId } },
          })),
        },
      })
    );
  }

  await db.send(new DeleteCommand({ TableName: tables.people, Key: { personId } }));
}
