import { PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { db, tables } from "../db/client";
import { Relationship } from "../types";

export async function addRelationship(body: string | null): Promise<Relationship[]> {
  if (!body) throw { status: 400, message: "Missing request body" };
  const { fromPersonId, toPersonId, type } = JSON.parse(body);

  if (!fromPersonId || !toPersonId) throw { status: 400, message: "Missing fromPersonId or toPersonId" };
  if (type !== "PARENT" && type !== "SIBLING" && type !== "SPOUSE") throw { status: 400, message: "type must be PARENT, SIBLING, or SPOUSE" };
  if (fromPersonId === toPersonId) throw { status: 400, message: "fromPersonId and toPersonId must differ" };

  const created: Relationship[] = [{ fromPersonId, toPersonId, type }];

  await db.send(
    new PutCommand({ TableName: tables.relationships, Item: { fromPersonId, toPersonId, type } })
  );

  // Siblings and spouses are symmetric — store both directions
  if (type === "SIBLING" || type === "SPOUSE") {
    await db.send(
      new PutCommand({
        TableName: tables.relationships,
        Item: { fromPersonId: toPersonId, toPersonId: fromPersonId, type },
      })
    );
    created.push({ fromPersonId: toPersonId, toPersonId: fromPersonId, type });
  }

  return created;
}

export async function removeRelationship(body: string | null): Promise<void> {
  if (!body) throw { status: 400, message: "Missing request body" };
  const { fromPersonId, toPersonId, type } = JSON.parse(body);

  if (!fromPersonId || !toPersonId) throw { status: 400, message: "Missing fromPersonId or toPersonId" };
  if (type !== "PARENT" && type !== "SIBLING" && type !== "SPOUSE") throw { status: 400, message: "type must be PARENT, SIBLING, or SPOUSE" };

  await db.send(
    new DeleteCommand({
      TableName: tables.relationships,
      Key: { fromPersonId, toPersonId },
    })
  );

  // Siblings and spouses are symmetric — delete both directions
  if (type === "SIBLING" || type === "SPOUSE") {
    await db.send(
      new DeleteCommand({
        TableName: tables.relationships,
        Key: { fromPersonId: toPersonId, toPersonId: fromPersonId },
      })
    );
  }
}
