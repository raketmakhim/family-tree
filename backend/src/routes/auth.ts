import jwt from "jsonwebtoken";
import { getCredentials } from "../middleware/auth";
import { Role } from "../types";

export async function login(body: string | null): Promise<{ token: string; role: Role }> {
  if (!body) throw { status: 400, message: "Missing request body" };

  const { username, password } = JSON.parse(body);
  if (!username || !password) throw { status: 400, message: "Missing username or password" };

  const creds = await getCredentials();

  let role: Role | null = null;
  if (username === creds.editorUsername && password === creds.editorPassword) {
    role = "editor";
  } else if (username === creds.viewerUsername && password === creds.viewerPassword) {
    role = "viewer";
  }

  if (!role) throw { status: 401, message: "Invalid credentials" };

  const token = jwt.sign({ role }, creds.jwtSecret, { expiresIn: "24h" });
  return { token, role };
}
