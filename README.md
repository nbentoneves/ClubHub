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
