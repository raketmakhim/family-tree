import { SSMClient, GetParametersCommand } from "@aws-sdk/client-ssm";
import jwt from "jsonwebtoken";
import { JwtPayload, Role } from "../types";

const ssm = new SSMClient({});

// Cached across warm Lambda invocations
let cachedCreds: {
  viewerUsername: string;
  viewerPassword: string;
  editorUsername: string;
  editorPassword: string;
  jwtSecret: string;
} | null = null;

export async function getCredentials() {
  if (cachedCreds) return cachedCreds;

  const result = await ssm.send(
    new GetParametersCommand({
      Names: [
        "/family-tree/viewer-username",
        "/family-tree/viewer-password",
        "/family-tree/editor-username",
        "/family-tree/editor-password",
        "/family-tree/jwt-secret",
      ],
      WithDecryption: true,
    })
  );

  const params = Object.fromEntries(
    (result.Parameters ?? []).map((p) => [p.Name!, p.Value!])
  );

  cachedCreds = {
    viewerUsername: params["/family-tree/viewer-username"],
    viewerPassword: params["/family-tree/viewer-password"],
    editorUsername: params["/family-tree/editor-username"],
    editorPassword: params["/family-tree/editor-password"],
    jwtSecret: params["/family-tree/jwt-secret"],
  };

  return cachedCreds;
}

export async function verifyToken(authHeader: string | undefined): Promise<JwtPayload> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw { status: 401, message: "Unauthorized" };
  }

  const token = authHeader.slice(7);
  const { jwtSecret } = await getCredentials();

  try {
    return jwt.verify(token, jwtSecret) as JwtPayload;
  } catch {
    throw { status: 401, message: "Unauthorized" };
  }
}

export async function requireViewer(authHeader: string | undefined): Promise<void> {
  await verifyToken(authHeader);
}

export async function requireEditor(authHeader: string | undefined): Promise<void> {
  const payload = await verifyToken(authHeader);
  if (payload.role !== "editor") {
    throw { status: 403, message: "Forbidden" };
  }
}
