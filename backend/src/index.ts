import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { requireEditor, requireViewer } from "./middleware/auth";
import { login } from "./routes/auth";
import { listTrees, createTree, getTree, updateTree, deleteTree, addMember, removeMember } from "./routes/trees";
import { listPeople, createPerson, updatePerson, deletePerson } from "./routes/people";
import { addRelationship, removeRelationship } from "./routes/relationships";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function response(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.rawPath;
  const parts = path.split("/").filter(Boolean);
  const auth = event.headers?.authorization ?? event.headers?.Authorization;

  try {
    // CORS preflight
    if (method === "OPTIONS") {
      return { statusCode: 200, headers: CORS_HEADERS, body: "" };
    }

    // POST /auth/login
    if (method === "POST" && parts[0] === "auth" && parts[1] === "login") {
      return response(200, await login(event.body ?? null));
    }

    // GET /trees
    if (method === "GET" && parts[0] === "trees" && parts.length === 1) {
      await requireViewer(auth);
      return response(200, await listTrees());
    }

    // POST /trees
    if (method === "POST" && parts[0] === "trees" && parts.length === 1) {
      await requireEditor(auth);
      return response(201, await createTree(event.body ?? null));
    }

    // GET /trees/{treeId}
    if (method === "GET" && parts[0] === "trees" && parts.length === 2) {
      await requireViewer(auth);
      return response(200, await getTree(parts[1]));
    }

    // PUT /trees/{treeId}
    if (method === "PUT" && parts[0] === "trees" && parts.length === 2) {
      await requireEditor(auth);
      await updateTree(parts[1], event.body ?? null);
      return response(200, { message: "Updated" });
    }

    // DELETE /trees/{treeId}
    if (method === "DELETE" && parts[0] === "trees" && parts.length === 2) {
      await requireEditor(auth);
      await deleteTree(parts[1]);
      return response(200, { message: "Deleted" });
    }

    // POST /trees/{treeId}/members/{personId}
    if (method === "POST" && parts[0] === "trees" && parts[2] === "members" && parts.length === 4) {
      await requireEditor(auth);
      await addMember(parts[1], parts[3]);
      return response(201, { message: "Member added" });
    }

    // DELETE /trees/{treeId}/members/{personId}
    if (method === "DELETE" && parts[0] === "trees" && parts[2] === "members" && parts.length === 4) {
      await requireEditor(auth);
      await removeMember(parts[1], parts[3]);
      return response(200, { message: "Member removed" });
    }

    // GET /people
    if (method === "GET" && parts[0] === "people" && parts.length === 1) {
      await requireViewer(auth);
      return response(200, await listPeople());
    }

    // POST /people
    if (method === "POST" && parts[0] === "people" && parts.length === 1) {
      await requireEditor(auth);
      return response(201, await createPerson(event.body ?? null));
    }

    // PUT /people/{personId}
    if (method === "PUT" && parts[0] === "people" && parts.length === 2) {
      await requireEditor(auth);
      await updatePerson(parts[1], event.body ?? null);
      return response(200, { message: "Updated" });
    }

    // DELETE /people/{personId}
    if (method === "DELETE" && parts[0] === "people" && parts.length === 2) {
      await requireEditor(auth);
      await deletePerson(parts[1]);
      return response(200, { message: "Deleted" });
    }

    // POST /relationships
    if (method === "POST" && parts[0] === "relationships" && parts.length === 1) {
      await requireEditor(auth);
      return response(201, await addRelationship(event.body ?? null));
    }

    // DELETE /relationships
    if (method === "DELETE" && parts[0] === "relationships" && parts.length === 1) {
      await requireEditor(auth);
      await removeRelationship(event.body ?? null);
      return response(200, { message: "Deleted" });
    }

    return response(404, { error: "Not found" });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status) return response(e.status, { error: e.message });
    console.error(err);
    return response(500, { error: "Internal server error" });
  }
};
