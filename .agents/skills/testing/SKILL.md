---
name: testing
description: Add or update focused MVP tests using Vitest for Worker engine logic and React UI components.
---

# Testing

## Use when

Adding business-critical behaviour, fixing regression, changing validation, or verifying database-backed flow.

## Workflow

1. Identify observable behaviour and failure cases from requirement or regression.
2. Reuse repository test conventions and fixtures.
3. Add unit tests for isolated business rules (Worker engine: `src/worker/engine/__tests__/`).
4. Add component/integration tests for React UI (`src/__tests__/`).
5. Use Vitest for all tests.
6. Run narrow tests first, then relevant suite. Fix failures caused by change.

## Boundaries

- Test behaviour, not private implementation details.
- Keep fixtures minimal and deterministic.
- Do not add broad end-to-end infrastructure for narrow regression.

## Complete when

Critical success and failure cases are covered and relevant tests pass.
