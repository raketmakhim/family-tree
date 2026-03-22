import { Tree, Person, Relationship, TreeData } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL as string;

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; role: string }>("POST", "/auth/login", { username, password }),

  getTrees: () => request<Tree[]>("GET", "/trees"),
  createTree: (name?: string) => request<Tree>("POST", "/trees", { name }),
  updateTree: (treeId: string, name: string) => request<void>("PUT", `/trees/${treeId}`, { name }),
  deleteTree: (treeId: string) => request<void>("DELETE", `/trees/${treeId}`),
  getTree: (treeId: string) => request<TreeData>("GET", `/trees/${treeId}`),

  addMember: (treeId: string, personId: string) =>
    request<void>("POST", `/trees/${treeId}/members/${personId}`),
  removeMember: (treeId: string, personId: string) =>
    request<void>("DELETE", `/trees/${treeId}/members/${personId}`),

  getPeople: () => request<Person[]>("GET", "/people"),
  createPerson: (data: { name?: string; dob?: string }) =>
    request<Person>("POST", "/people", data),
  updatePerson: (personId: string, data: { name?: string; dob?: string }) =>
    request<void>("PUT", `/people/${personId}`, data),
  deletePerson: (personId: string) => request<void>("DELETE", `/people/${personId}`),

  addRelationship: (fromPersonId: string, toPersonId: string, type: "PARENT" | "SIBLING" | "SPOUSE") =>
    request<Relationship[]>("POST", "/relationships", { fromPersonId, toPersonId, type }),
  removeRelationship: (fromPersonId: string, toPersonId: string, type: "PARENT" | "SIBLING" | "SPOUSE") =>
    request<void>("DELETE", "/relationships", { fromPersonId, toPersonId, type }),

  backupTree: (treeId: string) =>
    request<{ lastBackupDate: string }>("POST", `/trees/${treeId}/backup`),
  restoreTree: (treeId: string, payload: object) =>
    request<void>("POST", `/trees/${treeId}/restore`, payload),
};
