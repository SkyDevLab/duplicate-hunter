# Privacy & Data Retention Policy

Duplicate Hunter respects maintainer privacy and complies with modern data protection standards (GDPR, CCPA).

## 1. Data Accessed & Stored

| Data Category | Accessed? | Stored? | Purpose |
| :--- | :--- | :--- | :--- |
| **Issue Titles & Bodies** | Yes | Normalized tokens & embeddings | Comparing incoming issues with past reports |
| **Labels & Milestones** | Yes | Yes (in memory/DB) | Enhancing signal overlap |
| **User Logins** | Yes | Yes (author handle) | Distinguishing reporting authors |
| **Source Code Repository Files** | **No** | **No** | Duplicate Hunter does NOT crawl code |
| **Git Commit History** | **No** | **No** | Not accessed |
| **Billing / Private Organization Data** | **No** | **No** | Not accessed |

## 2. External AI Provider Data Transmission

- **Default (Local Provider):** 100% of text normalization, feature hashing, signal extraction, and similarity computation happens locally on your server or container. **Zero data leaves your infrastructure.**
- **Third-Party Providers (OpenAI, etc.):** If explicitly enabled by the repository maintainer in `.github/duplicate-hunter.yml`, sanitized text excerpts are sent via HTTPS to generate embeddings.
- Issue text is **never** used to train public or private foundation models.

## 3. Data Deletion Mechanism

Maintainers retain absolute ownership over their data:
- **API Endpoint:** `DELETE /api/repositories/:id/data`
- **Dashboard Action:** A single click on the "Delete Repository Data" button in the Privacy & Security tab permanently purges all issue indexes, embeddings, detections, and maintainer reviews.
- **Uninstalling:** When the GitHub App is uninstalled, an `installation.deleted` webhook fires, automatically triggering repository data removal.
