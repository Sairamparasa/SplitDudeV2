# Contributing to SplitDude

We are excited that you want to contribute to SplitDude! To ensure a smooth collaboration, please follow the guidelines outlined below.

---

## 🚀 Setup & Local Workflow

1. **Fork** the repository and **clone** your fork locally.
2. Initialize and configure your local environment:
   * Copy `.env.example` to `.env.local`
   * Populate Supabase and AWS variables.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the local development server:
   ```bash
   npm run dev
   ```

---

## 🌿 Branch Naming Conventions

Always create a descriptive branch for your changes:

* **Features**: `feature/your-feature-name` (e.g. `feature/dark-mode`)
* **Bug Fixes**: `bugfix/issue-description` (e.g. `bugfix/receipt-scan-timeout`)
* **Documentation**: `docs/update-description` (e.g. `docs/api-guide`)
* **Refactoring**: `refactor/change-description` (e.g. `refactor/debt-algorithm`)

---

## 📝 Commit Message Guidelines

We follow the **Conventional Commits** specification. Commit messages should look like this:

```
<type>(<scope>): <short summary description>

[optional body details]
```

### Supported Types:
* `feat`: A new user-facing feature.
* `fix`: A bug fix.
* `docs`: Documentation changes only.
* `style`: Styling changes (whitespace, formatting, missing semi-colons).
* `refactor`: A code change that neither fixes a bug nor adds a feature.
* `perf`: A code change that improves performance.
* `chore`: Maintenance tasks, package configuration updates, or dependency updates.

### Examples:
* `feat(groups): add autocomplete name search for group members`
* `fix(receipts): expose raw API Gateway error status to user interface`
* `docs(readme): add system architecture Mermaid sequence diagram`

---

## 📬 Pull Request Process

1. Verify that your branch compiles without issues:
   ```bash
   npm run build
   ```
2. Run ESLint to ensure code matches standard styling conventions:
   ```bash
   npm run lint
   ```
3. Commit and push your changes to your fork.
4. Open a Pull Request against the `main` branch of the official repository.
5. Fill out the provided **PR Template** in detail.
6. A maintainer will review your code. Once approved and verified, it will be merged!
