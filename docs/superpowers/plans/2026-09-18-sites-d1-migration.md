# Sites D1 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Supabase with Sites-native identity, D1 persistence, Worker APIs, and server-side OpenAI capture.

**Architecture:** Keep the React SPA and its domain models, but replace Supabase-shaped repositories with a small same-origin HTTP client. Expand the Sites Worker into an authenticated API backed by the logical `DB` binding, and route non-API requests to the existing static application.

**Tech Stack:** React 19, TypeScript, Vite, Cloudflare Worker runtime, Sites D1/SQLite, OpenAI HTTP API, Zod

---

### Task 1: Declare D1 and schema

**Files:**
- Modify: `.openai/hosting.json`
- Create: `db/schema.ts`
- Create: `drizzle/0000_sites_d1.sql`

- [ ] Set the logical D1 binding to `DB` and keep R2 disabled.
- [ ] Define the complete SQLite schema, query-driven indexes, and default categories.
- [ ] Keep each runtime prepared statement to one SQL statement.
- [ ] Commit the persistence layer.

### Task 2: Build the authenticated Worker API

**Files:**
- Modify: `sites/worker.js`

- [ ] Read and verify Sites authenticated-user headers against the two-person allowlist.
- [ ] Initialize D1 idempotently before application queries.
- [ ] Implement JSON routes for session, categories, expenses, budgets, settlements, and rates.
- [ ] Implement category merge and merchant-rule memory transactionally where D1 batching is sufficient.
- [ ] Fetch exact-date currency data from the keyless primary and fallback endpoints and cache it.
- [ ] Implement text, voice, and receipt capture against OpenAI with strict output normalization.
- [ ] Preserve the SPA asset fallback for non-API GET requests.
- [ ] Commit the Worker API.

### Task 3: Replace browser-side Supabase access

**Files:**
- Create: `src/lib/api.ts`
- Modify: `src/app/providers.tsx`
- Modify: `src/features/auth/AuthGate.tsx`
- Modify: `src/features/auth/householdRepository.ts`
- Modify: `src/features/categories/categoryRepository.ts`
- Modify: `src/features/expenses/expenseRepository.ts`
- Modify: `src/features/budgets/budgetRepository.ts`
- Modify: `src/features/settlements/settlementRepository.ts`
- Modify: `src/features/capture/captureClient.ts`
- Modify: `src/lib/displayCurrency.tsx`
- Modify: all pages that construct repositories
- Delete: `src/lib/supabase.ts`
- Delete: `src/lib/database.types.ts`

- [ ] Add a typed same-origin fetch helper with consistent Russian errors.
- [ ] Make session loading rely on `/api/session` and remove the email OTP form.
- [ ] Convert every repository to the corresponding Worker API while preserving its public types.
- [ ] Route capture and historical exchange rates through same-origin APIs.
- [ ] Remove Supabase imports and client construction from page components.
- [ ] Commit the client migration.

### Task 4: Remove Supabase operations

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Modify: `docs/operations.md`
- Delete: `supabase/`

- [ ] Remove the Supabase SDK dependency and browser environment variables.
- [ ] Delete obsolete functions, migrations, and Supabase-only tests.
- [ ] Rewrite operations as the short Sites-only setup: OpenAI key, Masha email, private invite, publish.
- [ ] Commit the cleanup.

### Task 5: Compile and publish

**Files:**
- Modify only files required to resolve build or lint errors.

- [ ] Run `npm run build` and fix compilation failures.
- [ ] Run `npm run lint` and fix lint failures.
- [ ] Do not run unit, integration, browser, or review-agent QA per the owner's instruction.
- [ ] Push `feature/thailand-expense-tracker` to GitHub.
- [ ] Publish a new private Sites version and wait for deployment success.
