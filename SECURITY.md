# Security Policy

We take security seriously at SplitDude. This document describes our supported versions, vulnerability reporting guidelines, and general security posture.

## Supported Versions

Only the latest release version receives active security updates and patches.

| Version | Supported |
| :--- | :---: |
| v1.0.0 |  |

---

## Reporting a Vulnerability

If you discover a potential security vulnerability (e.g. data isolation leak, authentication bypass, or AWS proxy exploitation), please do **NOT** open a public issue on GitHub. Instead, report it privately to our team:

1. Send an email to **sairamparasa@gmail.com** containing details of the vulnerability.
2. Provide a clear description, reproduction steps, or proof-of-concept.
3. We will acknowledge your report within 48 hours and work with you to analyze and patch the issue before making it public.

---

## Best Security Practices for Deployment

When deploying your own instance of SplitDude, please ensure:
* **Row-Level Security (RLS)** is enabled on all tables in Supabase.
* AWS API Gateway uses explicit **CORS** allowed origin lists mapping to your front-end domain (avoid wildcard `*` allowed origins in production).
* S3 Bucket lifecycle rules are set to expire and **auto-delete objects** regularly to avoid storing sensitive user receipt images permanently.
