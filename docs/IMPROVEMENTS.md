# Project Improvements and Technical Roadmap

## Overview

This document outlines a set of improvements aimed at increasing code quality, maintainability, developer experience, and product reliability across the backend, frontend, and shared platform layers.

## 1. Project Setup and Developer Experience

- Add environment files, coverage output, TypeScript build artifacts, and local database files (e.g. `backend/prisma/dev.db`) to the ignore list.
- Remove tracked files that should remain local-only, notably `backend/prisma/dev.db` — it's a binary SQLite snapshot that causes noisy diffs/merge conflicts on every local change, and duplicates what migrations already define as the schema source of truth.
- Add a `prisma/seed.ts` script to initialize the database with sample data, replacing the current practice of committing `dev.db` directly.

## 2. Backend Improvements

- Split route handlers into layers: keep Express routes thin (just HTTP in/out), and move validation + Prisma calls into separate service/controller functions — right now `index.ts` mixes all three in every handler (e.g. the `/leads` POST route).
- Add shared input validation for lead endpoints, replacing scattered inline checks like `if (!name || !lastName || !email)`.
- Standardize success/error response shapes and error handling across all endpoints, instead of each route formatting its own response ad hoc.
- Move the hardcoded Temporal address (`localhost:7233`, duplicated in `index.ts` and `worker.ts`) into a shared env-based config, and reuse a single Temporal `Client` instead of connecting on every request.
- Validate `countryCode` on backend bulk import too, not just in the frontend CSV parser — the same free-text value is accepted server-side with no format check.
- Validate `id` route params before querying — `GET/PATCH/DELETE /leads/:id` pass `Number(id)` straight into Prisma with no check for `NaN` if a non-numeric id is supplied.
- Process leads concurrently (with a bounded batch size) instead of sequentially in `for` loops when calling Temporal workflows — bulk verify-emails/enrich-phones/generate-messages currently await one lead at a time, so a batch of 100 takes 100 sequential round-trips.

## 3. Frontend Improvements

- Consider adopting a modern framework like Next.js for routing and app structure.
- Use design tokens instead of hardcoded Tailwind brand values.
- Introduce a branded design system to improve consistency and scalability.
- Improve loading, error, and empty states across the UI.

## 4. User Interface and Interaction Enhancements

- Gate the "Guess Gender" button behind a feature flag instead of always showing it.
- Ensure the “Enrich” action behaves correctly when users click outside the related UI area.
- Display loading state after verify email or phone number
- Improve mobile usability for header menus and navigation controls.
- Add pagination or infinite scrolling for large lead lists.
- Introduce a confirmation modal for destructive actions such as deletion.
- Add sorting support with an additional column for email validation status.
- Introduce a third-party rich-text editorin the message composer to improve message quality and support reusable variable placeholders.
- Detect CSV duplicates by email too, not just firstName+lastName — `CsvImportModal.tsx`'s duplicate check currently only keys on name, so it can wrongly skip two different people who share a name, or miss true duplicates entered under a different name spelling.

## 5. Observability and Reliability

- Add OpenTelemetry traces and metrics for HTTP requests, Prisma operations, and Temporal workflows.
- Track latency, retry behavior, failures, and rate-limit responses for external integrations.
- Introduce basic rate limiting and caching, starting with an in-memory approach and considering Redis later.

## 6. AI and Workflow Experience

- Align the AI-driven flow with reusable skills and clearer interaction patterns.
- Ensure the AI workflow remains predictable and easier to maintain as new capabilities are added.

## 7. Testing and Quality Assurance

- Add integration tests for key lead API and UI flows.
- Add basic quality checks such as linting, formatting, and coverage targets.
- Improve test coverage around critical user journeys and backend workflows.

## 8. Shared Architecture Principles

- Create a shared package for common types and API models.
- Align frontend and backend contracts so request and response types remain consistent.
- Centralize shared validation schemas and reusable domain helpers in a common layer.
- Keep runtime-specific code isolated from shared business logic.

## 9. Security

- Restrict CORS to known frontend origins instead of `Access-Control-Allow-Origin: *` in `index.ts`.
- Address the 118 Dependabot vulnerabilities currently flagged on the repo (3 critical, 57 high).
- Add authentication/authorization — there is currently no access control on any API endpoint.

## Recommended Priorities

1. Improve reliability and error handling in the current user flows.
2. Refactor the frontend into more modular and reusable components.
3. Strengthen testing and observability before adding further complexity.
4. Introduce shared contracts and utilities to reduce duplication over time.
