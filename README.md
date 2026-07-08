# SplitDude 🚗🏠

SplitDude is a cloud-native, serverless expense collaboration platform built around privacy-first identity (no phone numbers), lightning-fast expense splits, modern glassmorphism UI, and deep AWS cloud integrations.

Primary Promise: **"Split expenses in under 30 seconds."**

---

## 🏗 System Architecture

```
Client (Next.js 15)
   │
   ├───► Supabase Auth (Email / Password only)
   │
   ├───► Supabase PostgreSQL (Direct read/write with strict Row Level Security)
   │
   └───► Next.js API Routes (Proxy layer)
            │
            └───► Amazon API Gateway (AWS-managed entry point)
                     │
                     └───► AWS Lambda
                              │
                              ├───► Amazon S3 (Receipt image storage)
                              ├───► Amazon Textract (OCR expense field parsing)
                              └───► Amazon SNS (Notification triggers)
```

---

## 📂 Project Structure

- `database/`: SQL migration files (`supabase-schema.sql`) and seeding scripts (`seed.sql`).
- `backend/lambdas/receipt-processor/`: AWS Lambda code for uploading files to S3 and executing OCR analysis using Amazon Textract.
- `src/app/`: Next.js App Router layout structure.
  - `(auth)/`: Glassmorphic signup, login, and forgot password pages.
  - `(dashboard)/`: Widget-based dashboard, groups ledger, friends lists, notification inbox, profile settings.
  - `api/`: Route handlers to proxy receipt scanning to the AWS Gateway.
- `src/components/`: Reusable Tailwind v4 atomic UI components, graphs, and split calculations.
- `src/lib/`: Unified Supabase client/server connections and debt-simplification algorithms.

---

## 🛠 Setup Guide

### 1. Database Initialization
1. Go to your **Supabase Dashboard** -> **SQL Editor**.
2. Copy and execute the contents of [`supabase-schema.sql`](supabase-schema.sql) to initialize the tables (`profiles`, `friends`, `friend_requests`, `groups`, `group_members`, `expenses`, `expense_splits`, `settlements`, `notifications`, `activity_logs`), triggers, indexes, and Row Level Security (RLS) policies.
3. Paste the contents of [`database/seed.sql`](database/seed.sql) to populate mock data for testing.

### 2. Environment Configuration
Create a `.env.local` file at the root of the project using the template provided in [`.env.example`](.env.example):
```ini
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

AWS_REGION=us-east-1
AWS_S3_BUCKET=splitdude-receipts-2026-sairamparasa
AWS_API_GATEWAY_URL=your_api_gateway_url
AWS_SNS_TOPIC_ARN=your_sns_topic_arn
```

### 3. Local Development
Install dependencies and launch the dev server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application locally.

---

## 🚀 Deployment Guide

### AWS Lambda Handler Deployment
1. Navigate to `backend/lambdas/receipt-processor/`.
2. Compress `index.mjs` into a zip file:
   ```bash
   zip -r receipt-processor.zip index.mjs
   ```
3. Upload the zip package to your existing AWS Lambda function.
4. Set the following environment variables in the Lambda configuration:
   - `AWS_S3_BUCKET`: `splitdude-receipts-2026-sairamparasa`
   - `AWS_REGION`: `us-east-1`
5. Attach the standard AWS permissions `AmazonS3FullAccess` and `AmazonTextractFullAccess` to the Lambda IAM execution role.

---

## 🧪 Testing Scaffold & Verification

### 1. Verification Checklist
- **Auth**: Test signing up with a new email. Verify the database auto-generates a unique `SPDXXXXXX` profile code.
- **Friends**: Search by friend ID code, dispatch friend request, approve the inbound pending request.
- **Groups**: Create a group, add friends, record a shared expense.
- **OCR Scan**: Select a receipt file in the upload zone. Verify the progress indicator is displayed, and fields are prefilled automatically with highlight animations once extraction is done.

### 2. Manual OCR Verification curl
To check if the Next.js analysis endpoint is active:
```bash
curl -X POST -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "file=@/path/to/receipt.jpg" \
  http://localhost:3000/api/receipts/analyze
```
