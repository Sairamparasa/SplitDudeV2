# Security Policy & Architecture

SplitDude prioritizes secure design across both frontend (Next.js server-side / middleware) and backend (Supabase database and AWS serverless environment).

---

## 1. Authentication & Session Management

Authentication is managed via **Supabase Auth**.

* **Session Storage**: Access tokens (JWT) are stored in cookies securely managed on the client browser.
* **Server-Side Authorization**: The Next.js API proxy routes verify the user's active session using Supabase SSR (`createClient()` helper) before allowing any processing.
* **Unauthorized Interceptor**: If the user is unauthenticated or the session has expired, the route handler returns a `401 Unauthorized` JSON block immediately without calling subsequent external services or database queries.

---

## 2. Supabase Row-Level Security (RLS)

All database operations are governed by Postgres RLS rules. RLS prevents unauthorized data access between users even if they bypass the frontend UI.

* **Friendship Privacy**: A user can only see friendships containing their own UUID:
  ```sql
  create policy "Users can view their own friendships"
    on public.friends
    for select
    using (auth.uid() = user_id_1 or auth.uid() = user_id_2);
  ```
* **Group Isolation**: A user can only view, insert, or delete expenses/settlements for a group if they are an active member in the `group_members` table for that `group_id`.

---

## 3. AWS Security & CORS Policies

The integration with AWS API Gateway is locked down to avoid resource abuse.

* **Server-to-Server Proxy**: The browser never communicates with the AWS API Gateway directly (to prevent exposure of the API Gateway URL or direct invocation). All OCR requests are proxied securely through the Next.js `/api/receipts/analyze` backend endpoint.
* **CORS Settings**: AWS API Gateway is configured with explicit CORS allowed origins. Only our registered Vercel custom domains are allowed to communicate, blocking arbitrary cross-origin requests.
* **IAM Least Privilege**: The Lambda execution role has permissions strictly confined to the OCR processing bucket and the specific Amazon Textract `AnalyzeExpense` action.

---

## 4. Secrets Management

* **Zero Hardcoded Secrets**: Access keys, Supabase credentials, and API Gateway endpoints are strictly fetched from process environment variables (`.env`).
* **Environment Separation**: The local setup uses `.env.local` (which is excluded from Git commits via `.gitignore`), while Vercel handles production variables inside the Vercel dashboard.
