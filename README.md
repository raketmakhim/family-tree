# Family Tree

A serverless web app for building and viewing family trees, hosted on AWS.

## Live URL

https://d2rwlzutj4jlnw.cloudfront.net

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript (Vite), react-d3-tree |
| Backend | Node.js Lambda (TypeScript, bundled with esbuild) |
| API | AWS API Gateway (HTTP API) |
| Database | DynamoDB |
| Hosting | S3 + CloudFront |
| Auth | JWT, credentials in SSM Parameter Store |
| IaC | Terraform |

## Project Structure

```
family-tree/
├── frontend/       # React SPA
├── backend/        # Lambda function
├── infra/          # Terraform
│   └── bootstrap/  # One-time state bucket setup
└── project-plan.md
```

## Local Development

### Backend
```bash
cd backend
npm install
npm run build        # bundles to dist/index.js via esbuild
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env # set VITE_API_URL
npm run dev
```

## Deployment

### First time
```bash
# 1. Bootstrap Terraform state
cd infra/bootstrap && terraform init && terraform apply

# 2. Copy the bucket name into infra/main.tf backend block, then:
cd ../infra && terraform init && terraform apply

# 3. Set credentials in AWS SSM (all default to "CHANGE_ME")
aws ssm put-parameter --name /family-tree/viewer-username --value "..." --type String --overwrite
aws ssm put-parameter --name /family-tree/viewer-password --value "..." --type SecureString --overwrite
aws ssm put-parameter --name /family-tree/editor-username --value "..." --type String --overwrite
aws ssm put-parameter --name /family-tree/editor-password --value "..." --type SecureString --overwrite
aws ssm put-parameter --name /family-tree/jwt-secret --value "$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" --type SecureString --overwrite
```

### Subsequent deploys
```bash
# Backend changes
cd backend && npm run build
cd ../infra && terraform apply

# Frontend changes
cd frontend && npm run build
aws s3 sync dist s3://family-tree-frontend-522814717404 --delete
aws cloudfront create-invalidation --distribution-id E39U1THBDUELHX --paths "/*"
```

## Auth

Two global credential sets:
- **Viewer** — can browse trees
- **Editor** — can create/edit people, relationships, and trees

Credentials are stored in SSM Parameter Store and never hardcoded. The Lambda caches them in memory for the lifetime of its container.
