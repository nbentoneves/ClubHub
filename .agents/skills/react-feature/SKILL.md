---
name: react-feature
description: Implement a focused React and TypeScript feature with API integration, accessible states, and frontend tests.
---

# React Feature

## Use when

Adding or changing a page, component, form, client-side interaction, or API-backed UI flow.

## Workflow

1. Inspect routes, component patterns, state management, API client, and test conventions.
2. Define smallest user-visible flow that satisfies requirement.
3. Reuse components and styling patterns before adding abstractions.
4. Keep network calls and data transformation separate from presentational components where practical.
5. Implement loading, empty, error, and successful states relevant to flow.
6. Validate user input before requests and render API validation errors clearly.
7. Add focused component or flow tests for critical behaviour.
8. Run relevant frontend checks and tests with Yarn (for example, `yarn test`). Fix failures caused by change.

## Boundaries

- Use TypeScript; avoid `any` unless existing code requires it.
- Use Yarn only for frontend dependency management and scripts. Do not add npm or pnpm lockfiles or commands.
- Never include credentials or private environment values in browser code.
- Do not add global state, a UI library, or routing framework unless current requirement needs it.
- Keep accessibility semantics and keyboard use intact.

## Complete when

User flow works, async states are clear, critical behaviour is tested, and relevant checks pass.
