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
  createdAt: string;
}

export interface Relationship {
  fromPersonId: string;
  toPersonId: string;
  type: "PARENT" | "SIBLING" | "SPOUSE";
}

export interface TreeData {
  tree: Tree;
  people: Person[];
  relationships: Relationship[];
}

export type Role = "viewer" | "editor";
