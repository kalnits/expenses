# Native NIS Budgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support native THB or ILS monthly budgets and seed the requested 10,000 ₪ mutual budget and category limits.

**Architecture:** Persist a currency code beside each budget while retaining integer minor-unit columns. Convert expenses into a budget's native units for progress calculations, and convert native budget values through the monthly exchange rate for the global display currency.

**Tech Stack:** React 19, TypeScript, TanStack Query, Cloudflare Worker, D1/SQLite, Vite.

---

### Task 1: Persist budget currency and seed defaults

**Files:**
- Create: `drizzle/0001_native_nis_budgets.sql`
- Modify: `sites/worker.js`

- [ ] Add an `ILS`/`THB` currency column with a `THB` default, insert the sixteen requested categories, deactivate only the original generic seed categories, and upsert the current-month mutual budget plus category limits in migration `0001`.
- [ ] Extend the Worker's create-table SQL, budget validation, SELECT mapping, and PUT upsert to preserve `currency`.

### Task 2: Add native-budget currency utilities

**Files:**
- Modify: `src/domain/budget.ts`
- Modify: `src/features/budgets/budgetRepository.ts`
- Modify: `src/lib/displayCurrency.tsx`

- [ ] Add `BudgetCurrency = 'THB' | 'ILS'`, store currency on `MonthlyBudget`, and copy it between months.
- [ ] Add helpers to convert THB expense satang into a budget's minor units and render budget-native amounts in the global display currency.
- [ ] Validate the API currency field and send it on budget saves.

### Task 3: Update budget and dashboard interfaces

**Files:**
- Modify: `src/features/budgets/BudgetsPage.tsx`
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Modify: `src/app/styles.css`

- [ ] Add a THB/NIS selector to the budget editor and label all limit inputs with the selected symbol.
- [ ] Calculate spent, remaining, progress, and category totals in the budget's native currency using each expense's stored same-day rate.
- [ ] Show a concise warning when an ILS comparison excludes expenses whose rate is unavailable.
- [ ] Keep global THB/NIS/USD display behavior for dashboard totals and budget limits.

### Task 4: Validate and publish

**Files:**
- Generated: `dist/**`

- [ ] Run `npm run build` and expect exit code 0.
- [ ] Run `npm run lint` and expect exit code 0 with no warnings.
- [ ] Run `git diff --check`, commit the exact validated source, push the GitHub feature branch, and publish the resulting Sites version.
