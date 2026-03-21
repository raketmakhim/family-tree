# Family Tree Web App

## Overview
A web app to create and display a family tree. Viewable by others, editable by authorised users.

## Features
- View the family tree (public, behind a view password)
- Add and connect people in the tree (behind an edit password)

## Auth
- Two global credential sets (no per-user accounts):
  - **Viewer** — username + password to view the tree
  - **Editor** — username + password to add/edit people and connections

## People
Each person stores:
- Name
- Date of birth

> Designed to be extensible — additional fields can be added later without major rework.

## Relationships
Supported connection types:
- Parent
- Sibling

These two are sufficient to infer cousins, grandparents, etc. from the displayed tree.

## Infrastructure (AWS Serverless)
| Component | Service | Purpose |
|---|---|---|
| Frontend | React SPA | UI and tree visualisation |
| Hosting | S3 + CloudFront | Store and serve frontend globally |
| API | AWS Lambda | Backend logic |
| Database | DynamoDB | Store people and relationships |

### Why S3 + CloudFront?
- S3 stores the built React app files
- CloudFront serves them from edge locations worldwide (fast, HTTPS, cheap)
- Effective cost: ~$0/month at low traffic

### Tree Visualisation
Using `react-d3-tree` — purpose-built React library for rendering family/hierarchy trees.

## DynamoDB Data Model

People and relationships are **global** (shared facts across all trees). Trees are named collections of people.

### `Trees` table
| Attribute | Type | Notes |
|---|---|---|
| `treeId` (PK) | String (UUID) | Required |
| `name` | String | Optional |
| `createdAt` | String | ISO timestamp |

### `TreeMembers` table
| Attribute | Type | Notes |
|---|---|---|
| `treeId` (PK) | String | |
| `personId` (SK) | String | |

### `People` table
| Attribute | Type | Notes |
|---|---|---|
| `personId` (PK) | String (UUID) | Required |
| `name` | String | Optional |
| `dob` | String | Optional, ISO format `YYYY-MM-DD` |
| `createdAt` | String | ISO timestamp |

### `Relationships` table
| Attribute | Type | Notes |
|---|---|---|
| `fromPersonId` (PK) | String | |
| `toPersonId` (SK) | String | |
| `type` | String | `PARENT` or `SIBLING` |

### Relationship rules
- `PARENT` is directed: `fromPersonId` is the parent of `toPersonId`
- `SIBLING` is symmetric: both directions are stored (A→B and B→A)
- Relationships are global — they appear in any tree that contains both people

### Example data
```
Trees:
treeId   name
tree-1   Smith Family
tree-2   Jones Family

TreeMembers:
treeId   personId
tree-1   uuid-1
tree-1   uuid-2
tree-2   uuid-1      ← Alice appears in both trees
tree-2   uuid-3

People:
personId  name     dob
uuid-1    Alice    1960-05-01
uuid-2    Bob      1985-03-12
uuid-3    Charlie  1988-07-22

Relationships:
fromPersonId  toPersonId  type
uuid-1        uuid-2      PARENT      ← Alice is parent of Bob
uuid-1        uuid-3      PARENT      ← Alice is parent of Charlie
uuid-2        uuid-3      SIBLING
uuid-3        uuid-2      SIBLING
```

### Loading a tree
1. Get all `TreeMembers` for the treeId
2. Fetch those people from `People`
3. Scan `Relationships`, filter to members only
Tree is built client-side.

## Auth

### Credentials
Stored in SSM Parameter Store (SecureString):
```
/family-tree/viewer-username
/family-tree/viewer-password
/family-tree/editor-username
/family-tree/editor-password
/family-tree/jwt-secret
```

### Flow
1. User POSTs credentials to `POST /auth/login`
2. Lambda fetches credentials from SSM and compares
3. Returns a signed JWT with role: `viewer` or `editor`
4. Frontend stores JWT, sends as `Authorization: Bearer <token>` on all requests
5. Each Lambda validates JWT and checks role before proceeding

## Lambda API Endpoints

Single Lambda function with internal routing. Triggered via API Gateway.

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Exchange credentials for JWT |
| `GET` | `/trees` | Viewer | List all trees |
| `POST` | `/trees` | Editor | Create a tree |
| `GET` | `/trees/{treeId}` | Viewer | Get tree + members + relationships (single call to render tree) |
| `PUT` | `/trees/{treeId}` | Editor | Update tree name |
| `DELETE` | `/trees/{treeId}` | Editor | Delete tree |
| `POST` | `/trees/{treeId}/members/{personId}` | Editor | Add existing person to tree |
| `DELETE` | `/trees/{treeId}/members/{personId}` | Editor | Remove person from tree |
| `GET` | `/people` | Viewer | List all people (global) |
| `POST` | `/people` | Editor | Create a person |
| `PUT` | `/people/{personId}` | Editor | Update person details |
| `DELETE` | `/people/{personId}` | Editor | Delete person |
| `POST` | `/relationships` | Editor | Add relationship |
| `DELETE` | `/relationships` | Editor | Remove relationship (body: `{ fromPersonId, toPersonId, type }`) |

## Custom Domain / Sharing Trees

To share a specific tree (e.g. `smith-family.com`):
- Use a DNS redirect pointing to the app URL `/trees/{treeId}`
- The React SPA loads and fetches tree data silently via API calls
- Users never interact with API URLs directly

## IaC — Terraform

All AWS infrastructure defined in Terraform.

### State backend
Remote state stored in an S3 bucket (+ DynamoDB table for state locking).
Requires a one-time manual bootstrap before `terraform init`.

### Terraform resources
- 4 DynamoDB tables (Trees, TreeMembers, People, Relationships)
- Lambda function (Node.js/TypeScript)
- API Gateway (HTTP API)
- S3 bucket (React frontend)
- CloudFront distribution
- SSM Parameters (credentials + JWT secret)
- IAM role + policies for Lambda

### Project structure
```
family-tree/
├── frontend/           # React app
│   ├── src/
│   └── package.json
├── backend/            # Lambda (Node.js/TypeScript)
│   ├── src/
│   └── package.json
├── infra/              # Terraform
│   ├── main.tf         # Provider + backend config
│   ├── variables.tf
│   ├── outputs.tf
│   ├── dynamodb.tf
│   ├── lambda.tf
│   ├── api-gateway.tf
│   ├── s3.tf
│   ├── cloudfront.tf
│   └── ssm.tf
└── project-plan.md
```

## Deployment

Manual for now. Deploy steps:
1. `terraform apply` — update infrastructure
2. `npm run build` in `frontend/` → sync to S3 → invalidate CloudFront cache
3. Deploy Lambda zip from `backend/` via Terraform or AWS CLI

## Build Checklist

### Infrastructure
- [x] Bootstrap Terraform state (S3 bucket + DynamoDB lock table)
- [x] Terraform: DynamoDB tables (Trees, TreeMembers, People, Relationships)
- [x] Terraform: SSM parameters (viewer/editor credentials + JWT secret)
- [x] Terraform: IAM role + policies for Lambda
- [x] Terraform: Lambda function
- [x] Terraform: API Gateway (HTTP API)
- [x] Terraform: S3 bucket for frontend
- [x] Terraform: CloudFront distribution

cd infra/bootstrap && terraform init && terraform apply — note the bucket name output
Update the bucket value in infra/main.tf
Copy terraform.tfvars.example → terraform.tfvars and fill in credentials
cd infra && terraform init && terraform apply

### Backend
- [x] Project setup (Node.js/TypeScript, tsconfig, package.json)
- [x] Lambda handler + internal router
- [x] Auth: `POST /auth/login`
- [x] Trees: GET all, POST, GET by id, PUT, DELETE
- [x] Tree members: POST, DELETE
- [x] People: GET all, POST, PUT, DELETE
- [x] Relationships: POST, DELETE

### Frontend
- [x] React project setup (Vite + TypeScript)
- [x] Routing (react-router)
- [x] Login page (viewer/editor credentials)
- [x] Trees list page
- [x] Tree view page (react-d3-tree visualisation)
- [x] Add/edit person form
- [x] Add relationship form
- [x] Add person to tree

### Deploy
- [x] Build frontend + sync to S3
- [x] Invalidate CloudFront cache
- [ ] Smoke test live environment

## Future: User Accounts + Tree Sharing

Replace the two global credential sets with per-user accounts, and allow tree owners to invite others.

### Invite delivery
Decision needed: **email invites** (requires AWS SES, DNS setup) vs **shareable invite links** (simpler, no email infrastructure).

### What changes

#### Backend
- [ ] New `Users` table (userId, username, passwordHash, createdAt)
- [ ] New `TreeAccess` table (treeId, userId, role: viewer | editor)
- [ ] `POST /auth/register` — create account (bcrypt password hash)
- [ ] Update `POST /auth/login` — look up user in Users table, JWT contains userId + role
- [ ] Add `ownerId` to Trees table
- [ ] Update all tree endpoints to check per-user access (TreeAccess) instead of global role
- [ ] `POST /trees/{treeId}/invite` — generate invite token (or send email via SES)
- [ ] `POST /auth/accept-invite` — validate token, write TreeAccess row
- [ ] If email: AWS SES setup, DNS records, invite email template

#### Frontend
- [ ] Registration page
- [ ] Invite UI on tree view page (owner only)
- [ ] Manage tree members / access UI
