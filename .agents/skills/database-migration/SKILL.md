---
name: database-migration
description: Create and apply Cloudflare D1 SQL database migrations safely.
---

# Cloudflare D1 Database Migration Skill

## Purpose

Safely add or modify D1 relational database schema using SQLite-compatible SQL migrations.

## Workflow

1. Inspect existing migration files in `migrations/` (e.g. `0001_initial.sql`).
2. Create next numbered migration file: `migrations/000X_<descriptive_name>.sql`.
3. Use SQLite SQL syntax:
   - Use `TEXT` for UUID primary keys or dates.
   - Use `INTEGER` for integer values, `REAL` for floating point numbers.
   - Use `CREATE TABLE IF NOT EXISTS` or `ALTER TABLE`.
4. Apply migration locally to verify:
   ```bash
   npx wrangler d1 migrations apply DB --local
   ```
5. Run tests to verify model compatibility:
   ```bash
   npm test
   ```
