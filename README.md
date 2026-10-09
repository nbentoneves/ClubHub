# AI MVP Factory

A runnable GitHub template for AI-assisted MVPs. React, Vite, TypeScript, and Cloudflare Workers are already wired together so an agent can focus on your Markdown requirements instead of scaffolding.

## Start a Project

1. Enable **Template repository** in this repository's GitHub settings.
2. Select **Use this template** to create a repository for your app.
3. Clone the new repository. Use Node.js 22.12+ and enable Corepack.
4. Rename `name` in `package.json` and `wrangler.jsonc` for your app. Run `yarn install` to update the lockfile after renaming.
5. Fill in `REQUIREMENTS.md`, or add your own requirements Markdown files.

```sh
corepack enable
yarn install
yarn dev
```

Vite prints the local URL. The frontend and Worker API run together, with no separate API server or CORS configuration.

## Give the Agent a Task

For example:

```text
Follow AGENTS.md. Implement REQUIREMENTS.md using the existing template.
Keep the scope to the acceptance criteria, add focused tests, and run
yarn test and yarn build. Report any unmet criteria or setup still needed.
```

You can name multiple requirements files in your prompt. Markdown describes the work; your coding agent implements it. There is no generator script or runtime AI dependency.

Shared guidance is in `AGENTS.md`; `CLAUDE.md` and `GEMINI.md` are thin adapters. Load only relevant workflows from `.agents/skills/` to keep context small.

## Structure

```text
src/
       main.tsx                 React entry point
       App.tsx                  Starter connection screen; replace with product UI
       styles.css               Starter styles
       api/client.ts            Same-origin API client
       shared/api.ts            API response contracts
       worker/index.ts          Worker entry point and health route
       __tests__/               React tests
       api/__tests__/           Client tests
       worker/__tests__/        Worker tests
       test/setup.ts            Frontend test setup
REQUIREMENTS.md             Product scope and acceptance criteria
vite.config.ts              React + Cloudflare local development and builds
vitest.config.ts            Browser and Worker test environments
wrangler.jsonc              Cloudflare deployment configuration
```

`GET /api/v1/health` returns `{ "status": "ok" }`. API errors use `{ "error": { "code": "...", "message": "..." } }`. Unknown API routes return JSON 404s rather than the SPA fallback.

No database, authentication, AI provider, or storage is provisioned. Add these only when the product requires them; use D1 SQL migrations for relational persistence.

## Commands

| Command | Purpose |
| --- | --- |
| `yarn dev` | Vite frontend and local Worker |
| `yarn test` | Vitest frontend, API client, and Worker tests |
| `yarn test:watch` | Watch tests |
| `yarn typecheck` | TypeScript checks |
| `yarn build` | Typecheck and build frontend + Worker |
| `yarn preview` | Build and run the production app locally in Wrangler |
| `yarn deploy` | Build and deploy to Cloudflare |

Yarn 4.9.2 is pinned in `package.json`. The `node-modules` linker is configured in `.yarnrc.yml`. Commit `yarn.lock`; CI installs with `yarn install --immutable`, then tests and builds. Do not use npm or pnpm lockfiles.

## Deploy

Set your unique Worker name in `wrangler.jsonc`, then authenticate and deploy:

```sh
yarn wrangler login
yarn deploy
```

The frontend static assets and `/api/*` routes deploy through one Worker. For Workers Builds, use `yarn install --immutable`, `yarn build`, and `yarn wrangler deploy` as the install, build, and deploy commands respectively.

Keep local Worker secrets in an ignored `.dev.vars` file and production secrets in `yarn wrangler secret put <KEY>`. Browser `VITE_*` variables are public, never secrets. Add Cloudflare resource bindings only when required.

# ClubHub

ClubHub is a responsive club operations app for membership, groups, sessions, bookings, attendance, announcements, manual payment records, and a member/guardian portal. It uses React, Cloudflare Workers, D1, Better Auth, and Resend.

## Local Setup

Requirements: Node.js 22.12+ and Yarn 4.9.2.

1. Install dependencies with `corepack enable` and `yarn install`.
2. Authenticate with Cloudflare, then create a D1 database: `yarn wrangler d1 create clubhub`.
3. Copy the database ID from Wrangler into `d1_databases[0].database_id` in `wrangler.jsonc`. The checked-in all-zero ID is a placeholder and must be replaced.
4. Apply the schema locally: `yarn wrangler d1 migrations apply clubhub --local`.
5. Create an ignored `.dev.vars` file with the values below. Use a Resend sender address from a verified domain.
6. Start the app with `yarn dev`.

```dotenv
BETTER_AUTH_SECRET=replace-with-at-least-32-random-characters
BETTER_AUTH_URL=http://localhost:5173
RESEND_API_KEY=re_replace-with-your-key
RESEND_FROM_EMAIL=ClubHub <hello@your-verified-domain.example>
```

`BETTER_AUTH_URL` must match the browser origin exactly. Account registration and password recovery send email, so those flows need valid Resend configuration. No secret belongs in browser code or source control.

## Features

- Account sign-up, email verification, sign-in, sessions, and password recovery email.
- Club creation and editable club details, with owner membership and multi-club context.
- Member records, membership status changes, duplicate-email protection, emergency contacts, guardian links, and CSV export.
- Groups with capacity and member assignment.
- Scheduled activities with group, capacity, price, booking deadline, recurrence metadata, and cancellation.
- Capacity-limited bookings, duplicate booking prevention, cancellation, and attendance recording.
- Club-wide announcements with group-audience filtering in member views.
- Manual payment and amount-due records.
- Member/guardian views for linked profiles, eligible activities, bookings, attendance, payment history, and announcements.
- Server-side membership, role, profile ownership, and tenant checks.

## Checks

```sh
yarn test
yarn typecheck
yarn build
```

The D1 integration tests execute the migration and booking/guardian queries against SQLite. Node may print an experimental warning for its built-in SQLite module.

## Cloudflare Deployment

Set the real D1 ID and production `BETTER_AUTH_URL` in the deployment configuration. Add secrets using Wrangler:

```sh
yarn wrangler secret put BETTER_AUTH_SECRET
yarn wrangler secret put RESEND_API_KEY
yarn wrangler d1 migrations apply clubhub --remote
yarn deploy
```

Configure `RESEND_FROM_EMAIL` as a Worker variable or secret. The Worker name and database ID must be unique to the Cloudflare account. Deployment has not been run from this workspace.

## Backup and Recovery

Create an access-controlled SQL export before production schema changes and on the club's chosen backup schedule:

```sh
yarn wrangler d1 export clubhub --remote --output ./clubhub-backup.sql
```

Keep exports encrypted outside the application repository and restrict access because they contain personal information. To restore into the configured database, review the target carefully, then run `yarn wrangler d1 execute clubhub --remote --file ./clubhub-backup.sql`. Verify restored club, member, and booking counts before reopening service. Restore testing and automated backups are operational tasks that still need to be scheduled.

## Current MVP Boundaries

The app is a working foundation, not full completion of every requirement in `REQUIREMENTS.md`. Invitations and expiry/revocation, notification delivery/retry tracking, self-service profile editing/deletion, consent declarations, recurring occurrence generation, waiting lists, group-targeted/scheduled announcement authoring, membership plans, payment corrections/reconciliation, and attendance/payment report exports remain to be implemented. Member CSV import is also not included. Email currently covers account verification and password recovery only. These are explicit follow-up slices; no payment provider is connected and a manual payment is not verified by a provider.
