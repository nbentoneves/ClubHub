---
name: AI MVP factory
description: >
	Guidance for building small, vendor-neutral AI MVPs with React, Cloudflare Workers, and D1.
	Prefer simple modular architecture, validated APIs, automated tests, and reusable workflows.
tools: [execute, read, edit, search, web]
---

# AI MVP Factory

## Purpose

Reusable, vendor-neutral starter for small AI-assisted MVPs. Shared project rules live here. Reusable workflows live in `.agents/skills/`.

## Target architecture

- Frontend: React, Vite, TypeScript, yarn.
- Backend / API: Cloudflare Workers (TypeScript).
- Database: Cloudflare D1 with SQL migrations.
- File / Object Storage: Cloudflare R2 (when required).
- Configuration / Cache: Cloudflare KV (when required).
- Async Processing: Cloudflare Queues (when required).
- Scheduled Jobs: Cloudflare Cron Triggers (when required).
- Deployment & CI/CD: Cloudflare Workers Builds, GitHub Actions.

Use a modular monolith. Keep application code independent of coding CLI.

## Engineering & AI principles

1. This repository is designed for small MVPs.
2. Prefer simple solutions.
3. Do not over-engineer.
4. Do not create microservices.
5. Do not introduce infrastructure without a concrete requirement.
6. Prefer Cloudflare-native services.
7. Prefer D1 for relational data.
8. Prefer R2 for object storage.
9. Use KV only for appropriate key/value use cases.
10. Use Queues only when asynchronous processing is required.
11. Use Cron Triggers for scheduled processing.
12. Keep Workers modular.
13. Keep route handlers thin.
14. Keep business logic testable.
15. Validate all external input.
16. Never commit secrets.
17. Do not expose Worker secrets to the frontend.
18. Use database migrations.
19. Run tests before considering a feature complete.
20. Do not optimise for hypothetical scale.
21. Implement only the functionality required by the MVP.
22. Keep the architecture easy to understand and easy for another AI agent to modify.
23. Avoid unnecessary dependencies.
24. Prefer existing platform capabilities over introducing another external service.

## Backend / API Rules

- Use TypeScript for Cloudflare Workers.
- Organise worker logic as: `HTTP request -> validation -> service -> repository -> D1`.
- Keep Worker route handlers thin.
- Use DTO-like TypeScript types for API boundaries.
- Return consistent HTTP responses and error structures.

## Frontend Rules

- Use Yarn 4.x, pinned by `packageManager`, for dependencies and scripts. Commit `yarn.lock`.
- Deploy frontend static assets through Cloudflare Workers.
- Environment variables exposed to the browser must be public.
- Keep API integration separate from presentation via `src/api/client.ts`.

## Quality & Security

- Maintain automated unit, integration, and UI tests using Vitest.
- Run `yarn test` and `yarn build` after architectural changes.
- Never commit secrets. Use Wrangler environment secrets (`wrangler secret put <KEY>`).

## Portable Agent Setup

- `AGENTS.md` is shared project guidance.
- `.agents/skills/` contains portable workflows.
- `GEMINI.md` and `CLAUDE.md` are thin adapters only; do not duplicate policy in them.

## Requirements Workflow

- This repository is a runnable GitHub template. Reuse `src/` and the existing toolchain; do not scaffold another app.
- Read the user-specified requirements Markdown files, or `REQUIREMENTS.md` by default, before implementing product features.
- Treat filled-in requirements and acceptance criteria as scope. Empty headings are not requirements; ask for missing product details.
- Implement the smallest complete user flow, including relevant loading, empty, error, and success states.
- Keep UI in `src/`, API calls in `src/api/client.ts`, shared contracts in `src/shared/`, and backend code in `src/worker/`.
- The health endpoint is deliberately simple. Add service and repository layers only when product logic or persistence requires them.
- Add D1, migrations, bindings, or other Cloudflare services only when a requirement needs them.
- Replace the starter connection screen with the requested product UI. Do not rebuild the starter tooling.
- Add focused tests for acceptance criteria. Run `yarn test` and `yarn build` before completion; report anything unverified.
