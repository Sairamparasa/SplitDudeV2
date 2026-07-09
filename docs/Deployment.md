# Production Deployment Guide

This guide details instructions for deploying SplitDude to **Vercel** (Next.js frontend) and configuring **AWS** + **Supabase** for production.

---

## 1. Supabase (Database Setup)

1. Create a new project in the [Supabase Dashboard](https://supabase.com).
2. Open the **SQL Editor** in Supabase.
3. Copy the contents of `supabase-schema.sql` (found in the repository root) and paste them into the SQL editor, then click **Run**. This will create the database tables, RLS policies, unique code generator, and signup sync triggers.
4. Go to **Project Settings > API** and copy the **Project URL** and **anon public API Key**.

---

## 2. AWS Setup (API Gateway & Lambda)

1. **S3 Bucket**:
   * Create a bucket named `splitdude-receipts` (or a custom name).
   * In Bucket Properties, configure a **Lifecycle rule** to transition all objects to delete after 1 day.
2. **Lambda**:
   * Create a Lambda function named `splitdude-api` with a **Python 3.12** runtime.
   * Paste the code from `docs/AWS.md` into the inline editor.
   * Add the environment variable `RECEIPTS_BUCKET_NAME` set to your bucket name.
   * In **Configuration > Permissions**, click the execution role name. Attach the inline policy from `docs/AWS.md` to grant Textract and S3 access.
3. **API Gateway**:
   * Create an **HTTP API** in API Gateway.
   * Add a `POST /receipts/analyze` route.
   * Integrate it with the `splitdude-api` Lambda.
   * Deploy the API to the `dev` stage and copy the base invoke URL (e.g. `https://y6kkpw389a.execute-api.us-east-1.amazonaws.com/dev`).

---

## 3. Frontend Deployment (Vercel)

1. Import your SplitDude repository into [Vercel](https://vercel.com).
2. In **Environment Variables**, add the following keys:

| Environment Variable | Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-proj.supabase.co` | Supabase endpoint URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Supabase anon API Key |
| `AWS_API_GATEWAY_URL` | `https://xyz.execute-api.us-east-1.amazonaws.com/dev` | AWS API Gateway stage URL |

3. Click **Deploy**. Vercel will build the Next.js application and serve it globally!
