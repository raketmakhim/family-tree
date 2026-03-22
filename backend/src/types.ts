export interface Tree {
  treeId: string;
  name?: string;
  createdAt: string;
  lastBackupDate?: string;
}

export interface Person {
  personId: string;
  name?: string;
  dob?: string;
  marriedIn?: boolean;
  createdAt: string;
}

export interface TreeMember {
  treeId: string;
  personId: string;
}

export interface Relationship {
  fromPersonId: string;
  toPersonId: string;
  type: "PARENT" | "SIBLING" | "SPOUSE";
}

export type Role = "viewer" | "editor";

export interface JwtPayload {
  role: Role;
}

export interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}
