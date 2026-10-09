---
name: deployment
description: Deploy Cloudflare Worker application with D1 database binding.
---

# Cloudflare Deployment Skill

## Purpose

Deploy full-stack MVP to Cloudflare Workers and Workers Builds.

## Pre-requisites

- `wrangler.jsonc` configured with Worker name, static assets directory (`dist`), and D1 database binding (`DB`).

## Steps

1. Run build and tests locally:
   ```bash
   yarn build
   yarn test
   ```
2. Apply D1 migrations to remote database:
   ```bash
   npx wrangler d1 migrations apply DB --remote
   ```
3. Deploy Worker:
   ```bash
   npx wrangler deploy
   ```
4. Verify deployment output URL.
