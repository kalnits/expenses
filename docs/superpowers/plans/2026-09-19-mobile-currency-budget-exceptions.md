# Mobile, Multi-Currency, and Budget Exceptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver standalone mobile behavior, THB/ILS/USD expense capture, better expense inference, and a default mutual budget with September’s half-month override.

**Architecture:** Expenses keep a canonical THB amount for all existing calculations and add original amount/currency fields. The Worker owns exchange-rate conversion and extraction defaults. Mutual budget defaults live in the domain layer, while exact monthly rows are overrides.

**Tech Stack:** React 19, TypeScript, Vite PWA, Cloudflare Worker/Sites D1, OpenAI Responses API, Vitest.

---

### Task 1: Standalone mobile shell

**Files:**
- Modify: `index.html`
- Modify: `vite.config.ts`
- Modify: `src/app/styles.css`

- [ ] Add `viewport-fit=cover`, Apple standalone metadata, manifest `start_url`, `scope`, `display_override`, and orientation.
- [ ] Replace fixed `100vh` shell sizing with dynamic viewport units plus a safe fallback and safe-area padding.
- [ ] Run `npm run build`; expect TypeScript and Vite build success.

### Task 2: Preserve and convert original expense currencies

**Files:**
- Create: `drizzle/0002_expense_currencies_and_september_override.sql`
- Modify: `sites/worker.js`
- Modify: `db/schema.ts`
- Modify: `src/domain/expense.ts`
- Modify: `src/features/expenses/expenseRepository.ts`
- Modify: `src/features/expenses/ExpenseDraftForm.tsx`
- Modify: `src/features/expenses/ExpensePreview.tsx`
- Modify: `src/features/expenses/ExpensesPage.tsx`
- Modify: `src/features/capture/captureClient.ts`
- Modify: `src/features/capture/ParsedExpenseCard.tsx`
- Modify: `src/features/capture/AddExpensePage.tsx`

- [ ] Add `original_currency` and `original_amount_minor` columns, backfill existing rows as THB, and expose both fields through the Worker and client schemas.
- [ ] Change draft input to `amountMinor` plus `currency`, defaulting to THB, while records retain canonical `amountSatang`.
- [ ] Convert ILS/USD to THB at save time using the exact expense-date rate and persist both exchange rates.
- [ ] Add currency selectors to manual and parsed cards and preserve currency through editing and previews.
- [ ] Make capture JSON return the original currency and minor-unit amount.
- [ ] Run `npm run build`; expect TypeScript and Vite build success.

### Task 3: Improve title, category, owner, and payer inference

**Files:**
- Modify: `sites/worker.js`
- Modify: `src/features/capture/AddExpensePage.tsx`

- [ ] Pass the authenticated person into capture extraction and explicitly resolve first-person payer phrases against that identity.
- [ ] Expand deterministic keyword mappings for all configured categories, keeping saved merchant rules first.
- [ ] Strengthen instructions and examples for concise Russian titles, mutual/personal ownership, and common/personal payment sources.
- [ ] Continue remembering a corrected merchant-category choice after save.
- [ ] Run `npm run build`; expect TypeScript and Vite build success.

### Task 4: Default budget and monthly overrides

**Files:**
- Modify: `src/domain/budget.ts`
- Modify: `src/features/budgets/BudgetsPage.tsx`
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Modify: `drizzle/0002_expense_currencies_and_september_override.sql`

- [ ] Define the full 10,000 ILS mutual template with the existing category IDs and a resolver that prefers an exact month.
- [ ] Stop copying the prior month into future mutual months; show the default template with an “unsaved standard” notice.
- [ ] Add a 50% action that scales the total and every category before saving the monthly override.
- [ ] Seed September 2026 as an exact 5,000 ILS override with every category halved.
- [ ] Use the same exact-or-default resolver on the dashboard.
- [ ] Run `npm run build`; expect TypeScript and Vite build success.

### Task 5: Release

**Files:**
- Modify generated `dist/` through the existing build script.

- [ ] Run `npm run build` as the requested compile-only verification; expect exit code 0.
- [ ] Commit the focused changes and push the feature branch.
- [ ] Deploy the built artifact with the existing Sites project and apply the new D1 migration.
