# Project Improvements and Technical Roadmap

## Overview

This document outlines a set of improvements aimed at increasing code quality, maintainability, developer experience, and product reliability across the backend, frontend, and shared platform layers.

## 1. Project Setup and Developer Experience

- `backend/prisma/dev.db` is still committed to git and still missing from `.gitignore` — it's a binary SQLite snapshot that causes noisy diffs/merge conflicts on every local change and duplicates what migrations already define. Remove it from tracking (`git rm --cached`) and add it to `.gitignore`.
- Add a `prisma/seed.ts` script to initialize the database with sample data, replacing the current practice of committing `dev.db` directly.
- Add ESLint to the `backend` package too — only `frontend` has a `lint` script today; `backend/package.json` has no ESLint dependency or script.

## 2. Backend Improvements

- Split route handlers into layers: keep Express routes thin (just HTTP in/out), and move validation + Prisma calls into separate service/controller functions — `index.ts` still mixes all three in every handler (e.g. the `/leads` POST route).
- Add shared input validation for lead endpoints, replacing scattered inline checks like `if (!name || !lastName || !email)`.
- Standardize success/error response shapes and error handling across all endpoints, instead of each route formatting its own response ad hoc.
- Move the hardcoded Temporal address (`localhost:7233`, duplicated in `index.ts` and `worker.ts`) into a shared env-based config, and reuse a single Temporal `Client` instead of opening a new `Connection` on every `/verify-emails` and `/enrich-phones` request.
- Validate `countryCode` on the backend bulk import too, not just in the frontend CSV parser — `POST /leads/bulk` still stores it as free text (`lead.countryCode.trim()`) with no format check, so API/bulk-import callers that bypass the UI can write invalid codes.
- Validate `id` route params before querying — `GET/PATCH/DELETE /leads/:id` still pass `Number(id)` straight into Prisma with no check for `NaN` if a non-numeric id is supplied.
- Process leads concurrently (with a bounded batch size) instead of sequentially in `for` loops when calling Temporal workflows — bulk verify-emails/enrich-phones/generate-messages/import still await one lead at a time, so a batch of 100 takes 100 sequential round-trips.
- Detect duplicates by email too, not just `firstName`+`lastName`, in `POST /leads/bulk` — the existing-lead lookup and in-batch dedupe both key on `${firstName}_${lastName}` only, so it can wrongly skip two different people who share a name or miss true duplicates entered under a different spelling.

## 3. Frontend Improvements

- Consider adopting a modern framework like Next.js for routing and app structure.
- Use design tokens instead of hardcoded Tailwind brand values.
- Introduce a branded design system to improve consistency and scalability.
- Improve loading, error, and empty states across the UI.
- Detect CSV duplicates by email too, not just `firstName`+`lastName` — `CsvImportModal.tsx`'s in-file duplicate check has the same name-only key as the backend bulk import, so it can wrongly flag or miss duplicates independently of the backend fix above.

## 4. User Interface and Interaction Enhancements

- The "Guess Gender" option is still always shown in the Enrich dropdown; clicking it just shows a "not yet implemented" toast. Either gate it behind a feature flag/hide it until the feature exists, or remove it from the menu.
- Add a confirmation modal before `handleDeleteSelected` runs — deleting selected leads currently fires `deleteLeadsMutation.mutate` immediately with no "Are you sure?" step.
- Improve mobile usability for header menus and navigation controls.
- Add pagination or infinite scrolling for large lead lists — `GET /leads` and the `LeadsList` table still fetch/render the full result set at once.
- Add sorting support with an additional column for email validation status.
- Introduce a third-party rich-text editor in the message composer to improve message quality and support reusable variable placeholders.

## 5. Observability and Reliability

- Add OpenTelemetry traces and metrics for HTTP requests, Prisma operations, and Temporal workflows.
- The phone-enrichment providers now have per-provider retry/timeout policies and an in-memory rate limiter, but there's still no metrics/dashboarding around latency, retry counts, or rate-limit waits — only workflow-level try/catch.
- The in-memory `RateLimiter` (`activities/rateLimiter.ts`) is explicitly process-local; move to a shared store (e.g. Redis) once the worker runs with more than one instance.

## 6. AI and Workflow Experience

- Align the AI-driven flow with reusable skills and clearer interaction patterns.
- Ensure the AI workflow remains predictable and easier to maintain as new capabilities are added.

## 7. Testing and Quality Assurance

- Add integration tests for key lead API and UI flows — current tests (`csvParser.test.ts`, `messageGenerator.test.ts`, `phoneProviders.test.ts`) are unit-level only, nothing exercises the Express routes or React components end-to-end.
- Add a `lint` script + ESLint config to `backend` and wire coverage thresholds into CI for both packages (`test:coverage` scripts exist but nothing enforces a minimum).
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

## 10. Production Readiness

- Migrate off SQLite (`backend/prisma/schema.prisma` currently uses `provider = "sqlite"` with a local `dev.db` file) to a production-grade database such as PostgreSQL — SQLite doesn't support concurrent writes across multiple app instances and can't be hosted as a separately scalable service.
- Move configuration (database URL, Temporal address, ports) into environment variables validated at startup, instead of hardcoded values like `localhost:7233` in `index.ts`/`worker.ts`.
- Add a health-check endpoint (e.g. `GET /health`) that verifies DB and Temporal connectivity, for use by load balancers/orchestrators.
- Handle graceful shutdown (`SIGTERM`/`SIGINT`) — close the Prisma client and Temporal connections cleanly instead of relying on process exit.
- Containerize the backend and frontend (Dockerfiles + a compose file for local Temporal/Postgres) for consistent, repeatable deployments.
- Set up a CI/CD pipeline that runs lint/tests/build and applies Prisma migrations automatically before deploying.

## Recommended Priorities

1. Improve reliability and error handling in the current user flows (id/countryCode validation, concurrent batch processing, response standardization).
2. Refactor the frontend into more modular and reusable components, and add the missing delete-confirmation modal.
3. Strengthen testing (integration-level) and observability before adding further complexity.
4. Introduce shared contracts and utilities to reduce duplication over time.
