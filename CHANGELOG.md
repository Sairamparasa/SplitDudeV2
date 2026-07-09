# Changelog

All notable changes to the SplitDude project will be documented in this file.

---

## [1.0.0] - 2026-07-09

This is the initial production-ready open-source release of SplitDude.

### Major Features
* **Authentication**: Seamless email/password credentials authentication powered by Supabase Auth.
* **Groups Management**: Create expense groups with custom titles, descriptions, icons, and real-time member management.
* **Smart Expense Tracker**: Log multi-currency expenses inside groups with support for equal, exact, or percentage-based splits.
* **Settlements Logging**: Record direct payments between members to clear debts with full settlement logs.
* **Command Palette Search**: Global Command Palette search (press `Ctrl+K` or click search bar) to jump between groups, friends, and pages.

### AWS Receipt OCR Integration
* **Serverless OCR**: Scan receipts using AWS API Gateway proxying base64 data to AWS Lambda and Amazon Textract.
* **Smart Pre-fill**: Autodetects merchant title, total amount, and billing date from receipt layouts, auto-populating new expense forms.
* **Temporary Storage**: Integrates S3 with automatic 1-day object expiration for privacy and cost control.

### Performance & UI Enhancements
* **In-Memory Autocomplete**: Added instant search suggestions on keystroke when adding friends to groups.
* **React Query Caching**: Implemented automatic cache invalidation patterns across group page edits, dashboard details, and friendship changes to eliminate stale UI state.
* **Hardware-Accelerated Animation**: Smooth transitions and shimmer loading states using Framer Motion and Tailwind.
