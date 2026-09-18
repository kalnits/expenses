# Thailand Expense Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish an installable Russian-language household expense tracker for Ilya and Masha with personal and mutual budgets, debt settlement, historical currency display, and previewed text, voice, and Thai-receipt capture.

**Architecture:** A React/TypeScript progressive web app is hosted with OpenAI Sites. Supabase provides email-code authentication, PostgreSQL, row-level security, and Edge Functions; OpenAI APIs are called only from Edge Functions. All accounting is canonical in THB, while cached date-specific rates provide USD and NIS presentation.

**Tech Stack:** React 19, TypeScript, Vite, React Router, TanStack Query, Zod, Supabase JS/CLI, Vitest, Testing Library, Playwright, vite-plugin-pwa, OpenAI HTTP APIs, Open Exchange Rates historical API.

---

## File map

Create these focused units. Keep domain code free of React and Supabase so its accounting rules remain fast and deterministic to test.

```text
package.json                         scripts and dependencies
vite.config.ts                      Vite, Vitest, and PWA configuration
playwright.config.ts                mobile browser test configuration
src/app/                            app bootstrap, router, providers, navigation
src/domain/                         expense, debt, budget, settlement, money rules
src/lib/                             Supabase client, dates, display currency
src/features/auth/                  email-code sign-in and session gate
src/features/dashboard/             monthly summary and debt display
src/features/expenses/              manual form, preview, list, edit, delete
src/features/budgets/               monthly total/category limit editing
src/features/settlements/           repayment form and history
src/features/categories/            editable categories and merchant rules
src/features/capture/               text, voice, receipt capture and shared draft
supabase/migrations/                schema, constraints, triggers, and RLS
supabase/functions/_shared/         auth, CORS, OpenAI, validation, and rates helpers
supabase/functions/parse-text/      Russian text-to-expense draft
supabase/functions/transcribe/      Russian audio-to-text-to-draft
supabase/functions/parse-receipt/   Thai receipt-to-expense draft
supabase/functions/exchange-rate/   exact-date THB/USD/NIS rate retrieval
e2e/                                Playwright mobile user journeys
```

## Increment A — Manual ledger, budgets, and settlement

### Task 1: Scaffold the tested PWA

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/App.test.tsx`
- Create: `src/app/styles.css`
- Create: `public/icon.svg`

- [ ] **Step 1: Create the package and TypeScript configuration**

Use scripts that work in CI without watch mode:

```json
{
  "name": "thailand-expense-tracker",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint . --max-warnings=0"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.57.0",
    "@tanstack/react-query": "^5.87.0",
    "date-fns": "^4.1.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.8.0",
    "zod": "^4.1.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.35.0",
    "@playwright/test": "^1.55.0",
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^5.0.0",
    "eslint": "^9.35.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "jsdom": "^26.1.0",
    "typescript": "~5.8.0",
    "typescript-eslint": "^8.42.0",
    "vite": "^7.1.0",
    "vite-plugin-pwa": "^1.0.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: exit code 0 and a new `package-lock.json`.

- [ ] **Step 3: Write the failing application-shell test**

```tsx
// src/app/App.test.tsx
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

it('renders the Russian app shell', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Расходы в Таиланде' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Добавить расход' })).toBeVisible();
});
```

- [ ] **Step 4: Run the test and verify the red state**

Run: `npm test -- src/app/App.test.tsx`

Expected: FAIL because `src/app/App.tsx` does not exist.

- [ ] **Step 5: Add the minimal shell and PWA configuration**

```tsx
// src/app/App.tsx
export function App() {
  return (
    <main className="app-shell">
      <h1>Расходы в Таиланде</h1>
      <button type="button">Добавить расход</button>
    </main>
  );
}
```

Configure `vite.config.ts` with React, jsdom tests, and `VitePWA({ registerType: 'autoUpdate', manifest: { name: 'Расходы в Таиланде', short_name: 'Расходы', lang: 'ru', display: 'standalone', theme_color: '#12372a', background_color: '#f6f2e8', icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }] } })`. Bootstrap `<App />` from `src/main.tsx` and import `styles.css`.

- [ ] **Step 6: Verify the baseline**

Run: `npm test && npm run build`

Expected: all tests PASS and Vite produces `dist/`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html public src
git commit -m "chore: scaffold expense tracker pwa"
```

### Task 2: Implement canonical money and debt rules

**Files:**
- Create: `src/domain/expense.ts`
- Create: `src/domain/debt.ts`
- Create: `src/domain/debt.test.ts`
- Create: `src/domain/money.ts`
- Create: `src/domain/money.test.ts`

- [ ] **Step 1: Write the debt-table tests**

```ts
// src/domain/debt.test.ts
import { describe, expect, it } from 'vitest';
import { debtEffect } from './debt';

describe('debtEffect', () => {
  it.each([
    ['mutual', 'mutual', 0],
    ['mutual', 'ilya', 4000],
    ['mutual', 'masha', -6000],
    ['ilya', 'ilya', 0],
    ['ilya', 'masha', -10000],
    ['masha', 'masha', 0],
    ['masha', 'ilya', 10000],
    ['ilya', 'mutual', -5000],
    ['masha', 'mutual', 5000]
  ] as const)('%s expense paid by %s', (owner, paidFrom, expected) => {
    expect(debtEffect({ owner, paidFrom, amountSatang: 10000, ilyaShareBps: 6000 })).toBe(expected);
  });
});
```

The signed convention is positive when Masha owes Ilya and negative when Ilya owes Masha.

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- src/domain/debt.test.ts`

Expected: FAIL because `debtEffect` is missing.

- [ ] **Step 3: Implement the pure debt function**

```ts
// src/domain/expense.ts
export type Person = 'ilya' | 'masha';
export type BudgetOwner = Person | 'mutual';
export type PaymentSource = Person | 'mutual';

export interface DebtInput {
  owner: BudgetOwner;
  paidFrom: PaymentSource;
  amountSatang: number;
  ilyaShareBps: number;
}
```

```ts
// src/domain/debt.ts
import type { DebtInput } from './expense';

export function debtEffect(input: DebtInput): number {
  const { owner, paidFrom, amountSatang, ilyaShareBps } = input;
  if (owner === 'mutual') {
    if (paidFrom === 'mutual') return 0;
    const ilyaShare = Math.round(amountSatang * ilyaShareBps / 10_000);
    return paidFrom === 'ilya' ? amountSatang - ilyaShare : -ilyaShare;
  }
  if (owner === paidFrom) return 0;
  if (paidFrom === 'mutual') return owner === 'masha' ? amountSatang / 2 : -amountSatang / 2;
  return paidFrom === 'ilya' ? amountSatang : -amountSatang;
}
```

- [ ] **Step 4: Add money parsing and formatting tests, then implement integer-satang storage**

Test that `parseThb('1250.50')` equals `125050`, invalid or non-positive input throws, and `formatMoney(125050, 'THB', 1)` equals a Russian-locale currency string. Implement `parseThb`, `convertSatang`, and `formatMoney` in `money.ts`; round only at the display boundary.

- [ ] **Step 5: Run the domain suite**

Run: `npm test -- src/domain`

Expected: PASS, including all nine debt-table cases.

- [ ] **Step 6: Commit**

```bash
git add src/domain
git commit -m "feat: add canonical money and debt rules"
```

### Task 3: Implement monthly budget and settlement calculations

**Files:**
- Create: `src/domain/budget.ts`
- Create: `src/domain/budget.test.ts`
- Create: `src/domain/settlement.ts`
- Create: `src/domain/settlement.test.ts`

- [ ] **Step 1: Write failing budget tests**

Cover these exact behaviors:

```ts
expect(copyLimits(previous, '2026-10')).toEqual({
  month: '2026-10', owner: 'mutual', totalLimitSatang: 3000000,
  categoryLimits: [{ categoryId: 'food', limitSatang: 900000 }]
});
expect(spentByCategory(expenses, '2026-09', 'mutual')).toEqual({ food: 420000 });
```

Include an expense dated in August and verify it does not enter September usage. Use `Asia/Bangkok` month keys generated by `monthKey()`.

- [ ] **Step 2: Verify the red state**

Run: `npm test -- src/domain/budget.test.ts`

Expected: FAIL because the budget functions are missing.

- [ ] **Step 3: Implement budget copying and aggregation**

Define `MonthlyBudget`, `CategoryLimit`, and `ExpenseSummary` types. `copyLimits` must copy limits but no expense state. `spentByCategory` must filter by month and owner and reduce integer satang amounts.

- [ ] **Step 4: Test and implement settlement netting**

Use positive settlement amounts when Masha pays Ilya and negative amounts when Ilya pays Masha. Assert `netBalance([4000, -1000], [1500]) === 1500`, where the first array contains expense debt effects and the second contains settlement effects that reduce the balance.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/domain`

Expected: PASS.

```bash
git add src/domain
git commit -m "feat: add budget and settlement calculations"
```

### Task 4: Create the Supabase schema, constraints, and RLS

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/202609180001_initial_schema.sql`
- Create: `supabase/tests/database.sql`
- Create: `src/lib/database.types.ts`

- [ ] **Step 1: Write database assertions first**

In `supabase/tests/database.sql`, use a transaction and SQL assertions to prove:

- a mutual split other than 10,000 basis points is rejected;
- a negative amount is rejected;
- a third authenticated user cannot select or insert household rows;
- Ilya and Masha can read the same household expense;
- deleting a referenced category is rejected until it is merged.

- [ ] **Step 2: Run the assertions in the empty database**

Run: `npx supabase start && npx supabase db reset && psql "$LOCAL_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/database.sql`

Expected: FAIL because tables do not exist.

- [ ] **Step 3: Add the schema**

Create enums `budget_owner`, `payment_source`, and `capture_method`; then create these tables with UUID primary keys and `created_at timestamptz`:

```sql
households(id, name, timezone)
profiles(id references auth.users, display_name)
household_members(household_id, user_id, person_key check in ('ilya','masha'))
household_invitations(id, household_id, email, person_key check in ('masha'), accepted_at)
categories(id, household_id, name, normalized_name, is_active)
merchant_rules(id, household_id, normalized_merchant, category_id, updated_at)
monthly_budgets(id, household_id, month date, owner, total_limit_satang)
budget_category_limits(id, monthly_budget_id, category_id, limit_satang)
expenses(id, household_id, amount_satang, expense_date, merchant, normalized_merchant,
         notes, category_id, owner, paid_from, ilya_share_bps, capture_method,
         usd_per_thb, ils_per_thb, duplicate_confirmed, created_by)
settlements(id, household_id, settlement_date, from_person, to_person, amount_satang, created_by)
exchange_rates(rate_date, usd_per_thb, ils_per_thb, fetched_at)
```

Use database checks for positive amounts, months normalized to the first day, distinct settlement parties, and mutual split bounds. Add unique constraints for household membership person keys, budget owner/month, category names, merchant rules, and rate dates.

- [ ] **Step 4: Add household-member RLS policies**

Create `is_household_member(target uuid)` as a `security definer` SQL function with an empty `search_path`. Enable RLS on every household table and add `select`, `insert`, `update`, and `delete` policies that check both membership and foreign-key ownership. Exchange rates are readable by authenticated users and writable only by the service role.

- [ ] **Step 5: Seed only household-independent defaults through a bootstrap function**

Create `bootstrap_household(household_name text, invited_email text)` that permits a signed-in user with no membership to create one household, their Ilya membership, the pending Masha invitation, and Russian default categories. Payment sources remain the fixed enum values `ilya`, `masha`, and `mutual`; no account-balance rows are created. The invited user is attached as Masha only after her authenticated email matches the stored invitation.

- [ ] **Step 6: Regenerate types and run database assertions**

Run: `npx supabase db reset && psql "$LOCAL_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/database.sql && npx supabase gen types typescript --local --output src/lib/database.types.ts`

Expected: all assertions complete and generated types contain `expenses`, `monthly_budgets`, and `settlements`.

- [ ] **Step 7: Commit**

```bash
git add supabase src/lib/database.types.ts
git commit -m "feat: add household database and access policies"
```

### Task 5: Add email-code authentication and typed repositories

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/features/auth/AuthGate.tsx`
- Create: `src/features/auth/SignInForm.tsx`
- Create: `src/features/auth/SignInForm.test.tsx`
- Create: `src/features/expenses/expenseRepository.ts`
- Create: `src/features/budgets/budgetRepository.ts`
- Create: `src/features/settlements/settlementRepository.ts`

- [ ] **Step 1: Write a failing email-code sign-in test**

Render `SignInForm` with an injected `sendOtp` spy, enter `ilya@example.com`, submit, and assert `sendOtp('ilya@example.com')` plus the Russian confirmation “Проверьте почту”.

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- src/features/auth/SignInForm.test.tsx`

Expected: FAIL because `SignInForm` is missing.

- [ ] **Step 3: Implement the auth boundary**

Create the browser client from validated `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `AuthGate` listens to `onAuthStateChange`, renders `SignInForm` without a session, and renders children with a session. Use `signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: window.location.origin } })` so only invited accounts can enter.

- [ ] **Step 4: Add repositories with explicit select lists**

Repositories accept a Supabase client dependency and return Zod-validated domain records. Never use `select('*')`. Add repository tests with a chainable fake client proving that expense create/edit/delete, budget upsert, and settlement insert pass `household_id` and propagate database errors.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/features/auth src/features/expenses src/features/budgets src/features/settlements`

Expected: PASS.

```bash
git add src/lib src/features/auth src/features/expenses/expenseRepository.ts src/features/budgets/budgetRepository.ts src/features/settlements/settlementRepository.ts
git commit -m "feat: add authentication and data repositories"
```

### Task 6: Build the app shell, manual preview, and dashboard

**Files:**
- Create: `src/app/router.tsx`
- Create: `src/app/providers.tsx`
- Create: `src/app/BottomNav.tsx`
- Create: `src/features/expenses/ExpenseDraftForm.tsx`
- Create: `src/features/expenses/ExpensePreview.tsx`
- Create: `src/features/expenses/ExpensePreview.test.tsx`
- Create: `src/features/dashboard/DashboardPage.tsx`
- Create: `src/features/dashboard/DashboardPage.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/styles.css`

- [ ] **Step 1: Write the failing preview test**

Populate amount `450`, merchant `Lotus's`, owner `mutual`, payer `ilya`, category `Продукты`, and a 50/50 split. Assert the preview shows those values, calculates “Маша должна Илье ฿225”, and does not call `saveExpense` until “Сохранить” is clicked.

- [ ] **Step 2: Verify the red state**

Run: `npm test -- src/features/expenses/ExpensePreview.test.tsx`

Expected: FAIL because the components are missing.

- [ ] **Step 3: Implement the shared draft and preview**

Define one `ExpenseDraftSchema` with `amountSatang`, `expenseDate`, `merchant`, `notes`, `categoryId`, `owner`, `paidFrom`, and `ilyaShareBps`. The manual form parses its decimal THB field into integer satang before creating the draft. The preview validates it, shows the debt effect, and calls the repository only after confirmation.

- [ ] **Step 4: Write and implement the dashboard aggregation test**

Given three expenses and three budgets, assert the page shows separate Илья, Маша, and Общие cards; total spent/limit; category progress; and one net debt sentence. Use TanStack Query hooks whose data functions are injected in tests.

- [ ] **Step 5: Add routing and mobile navigation**

Routes are `/`, `/expenses`, `/budgets`, `/settlements`, `/settings`, and `/add`. The bottom navigation exposes the first five, while `/add` is opened by the dashboard action. Use semantic buttons, visible focus, 44px minimum targets, and safe-area padding.

- [ ] **Step 6: Verify and commit**

Run: `npm test && npm run build`

Expected: PASS and a successful production build.

```bash
git add src
git commit -m "feat: add manual expense preview and dashboard"
```

### Task 7: Add expenses, budgets, settlements, and category management

**Files:**
- Create: `src/features/expenses/ExpensesPage.tsx`
- Create: `src/features/expenses/ExpensesPage.test.tsx`
- Create: `src/features/budgets/BudgetsPage.tsx`
- Create: `src/features/budgets/BudgetsPage.test.tsx`
- Create: `src/features/settlements/SettlementsPage.tsx`
- Create: `src/features/settlements/SettlementsPage.test.tsx`
- Create: `src/features/categories/CategoriesPage.tsx`
- Create: `src/features/categories/categoryRepository.ts`
- Create: `supabase/migrations/202609180002_category_merge.sql`
- Modify: `src/app/router.tsx`

- [ ] **Step 1: Test expense filtering and destructive confirmation**

Assert filters for month, owner, category, and payment source compose together. Assert delete opens a Russian confirmation and only then calls `deleteExpense(id)`; editing an amount refreshes dashboard, budget, and debt query keys.

- [ ] **Step 2: Implement the expenses page and verify**

Run: `npm test -- src/features/expenses/ExpensesPage.test.tsx`

Expected: PASS with search, filters, edit, and delete covered.

- [ ] **Step 3: Test monthly budget behavior**

Given September limits and no October row, assert October offers copied values for all three owners, saves a total plus category limits, and never copies spending. Show overspend progress above 100% without clamping the numeric label.

- [ ] **Step 4: Implement budgets and verify**

Run: `npm test -- src/features/budgets/BudgetsPage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Test and implement settlements**

Cover Ilya-to-Masha and Masha-to-Ilya repayments, partial settlement, cleared balance, history, and validation that repayment cannot exceed the absolute current balance without a warning and explicit confirmation.

- [ ] **Step 6: Test and implement editable categories**

Allow create, rename, deactivate, and merge. Merging updates existing expenses and merchant rules in one database RPC transaction before deactivating the source category. Prevent deactivation of the final active category.

- [ ] **Step 7: Run the full suite and commit**

Run: `npm test && npm run build`

Expected: PASS.

```bash
git add src/features src/app/router.tsx supabase/migrations
git commit -m "feat: add ledger budget settlement and category screens"
```

## Increment B — Currency and AI-assisted capture

### Task 8: Add exact-date exchange rates and the global currency switch

**Files:**
- Create: `supabase/functions/_shared/http.ts`
- Create: `supabase/functions/exchange-rate/index.ts`
- Create: `supabase/functions/exchange-rate/index.test.ts`
- Create: `src/lib/displayCurrency.tsx`
- Create: `src/lib/displayCurrency.test.tsx`
- Modify: `src/features/expenses/expenseRepository.ts`
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Modify: `src/features/expenses/ExpensesPage.tsx`
- Modify: `src/features/budgets/BudgetsPage.tsx`
- Modify: `src/features/settlements/SettlementsPage.tsx`

- [ ] **Step 1: Write the failing rate-function tests**

Mock Open Exchange Rates and assert that USD-base rates derive `usdPerThb = 1 / rates.THB` and `ilsPerThb = rates.ILS / rates.THB`. Reject a response whose timestamp resolves to a different requested UTC date. Assert cached rows avoid a second provider call.

- [ ] **Step 2: Verify the red state**

Run: `deno test --allow-env supabase/functions/exchange-rate/index.test.ts`

Expected: FAIL because the handler is missing.

- [ ] **Step 3: Implement the authenticated function**

The function accepts `{ date: 'YYYY-MM-DD', expenseId?: string }`, checks the caller JWT, queries `exchange_rates`, and otherwise requests `https://openexchangerates.org/api/historical/<date>.json?app_id=<secret>&symbols=THB,ILS,USD`. Validate the JSON with Zod, require the returned date to match, and upsert the derived rates with the service-role client. When `expenseId` is present, require that the caller belongs to the expense household and that `expense_date` equals `date`, then update that expense's `usd_per_thb` and `ils_per_thb`. Return `{ rateDate, usdPerThb, ilsPerThb }`.

After an expense insert succeeds, `expenseRepository` invokes this function with its ID and date. A rate outage never blocks saving THB; the query retries later for expenses whose rate columns remain null.

- [ ] **Step 4: Test and implement the global display store**

Persist `'THB' | 'USD' | 'ILS'` in local storage. A hook returns `convertSatang` and `formatMoney`. Tests switch currency once and assert Dashboard, Expenses, Budgets, and Settlements all rerender with the same selected currency. Expense and settlement history use each record's own date; a monthly budget limit uses the first calendar day of its month; the live net-debt card uses today's Bangkok date. Percent-used calculations remain canonical THB calculations. Missing historical rates display “Курс недоступен” rather than a substituted value.

- [ ] **Step 5: Verify and commit**

Run: `deno test --allow-env supabase/functions/exchange-rate/index.test.ts && npm test && npm run build`

Expected: PASS.

```bash
git add supabase/functions/exchange-rate supabase/functions/_shared src
git commit -m "feat: add historical currency display"
```

### Task 9: Define and secure the shared AI draft contract

**Files:**
- Create: `supabase/functions/_shared/expenseDraft.ts`
- Create: `supabase/functions/_shared/openai.ts`
- Create: `supabase/functions/_shared/auth.ts`
- Create: `supabase/functions/_shared/cors.ts`
- Create: `supabase/functions/_shared/expenseDraft.test.ts`
- Create: `src/features/capture/captureClient.ts`
- Create: `src/features/capture/captureClient.test.ts`

- [ ] **Step 1: Write schema rejection tests**

Reject zero/negative amounts, unknown owner/source values, a mutual split not totaling 10,000 basis points, unknown category IDs, and unparseable dates. Accept nullable merchant and low-confidence fields. Require a confidence value from 0 to 1 for amount, merchant, date, category, owner, and payment source.

- [ ] **Step 2: Verify the red state**

Run: `deno test supabase/functions/_shared/expenseDraft.test.ts`

Expected: FAIL because the contract is missing.

- [ ] **Step 3: Implement one cross-boundary schema**

Define the JSON response as `{ draft, confidence, transcript?, categoryEvidence?, warnings[] }`. The server validates every OpenAI result before returning it. The browser validates the same response again before putting it into `ExpensePreview`.

- [ ] **Step 4: Implement authenticated OpenAI calls**

`requireUser(req)` validates the Supabase JWT and returns user plus household membership. `structuredOpenAI()` reads required secrets `OPENAI_API_KEY` and `OPENAI_STRUCTURED_MODEL`, sends a JSON-schema response-format request, applies a 30-second abort timeout, and never logs request media or extracted content. CORS permits only `APP_ORIGIN`.

- [ ] **Step 5: Test the browser client**

Mock `supabase.functions.invoke`; assert JWT-authenticated invocation, schema validation, Russian error mapping, and no automatic persistence. A successful capture returns an `ExpenseDraft`, not a saved expense.

- [ ] **Step 6: Verify and commit**

Run: `deno test supabase/functions/_shared/expenseDraft.test.ts && npm test -- src/features/capture`

Expected: PASS.

```bash
git add supabase/functions/_shared src/features/capture
git commit -m "feat: add validated ai expense draft contract"
```

### Task 10: Add Russian text capture and learned categorization

**Files:**
- Create: `supabase/functions/parse-text/index.ts`
- Create: `supabase/functions/parse-text/index.test.ts`
- Create: `src/features/capture/TextCapture.tsx`
- Create: `src/features/capture/TextCapture.test.tsx`
- Modify: `src/features/expenses/ExpensePreview.tsx`
- Modify: `src/features/categories/categoryRepository.ts`

- [ ] **Step 1: Write the failing parser test**

For “Заплатил 850 бат за ужин в Savoey с личной карты, это общее”, mock the OpenAI response and assert an 85000-satang mutual draft, Ilya payment source, 50/50 split, restaurant category, and Russian evidence. Assert a known `savoey -> restaurants` rule is supplied before the model call and wins over model category output.

- [ ] **Step 2: Verify the red state**

Run: `deno test --allow-env supabase/functions/parse-text/index.test.ts`

Expected: FAIL because the handler is missing.

- [ ] **Step 3: Implement text parsing**

Load the household's active categories and normalized merchant rules. Prompt for Russian input, THB unless explicitly stated otherwise, Asia/Bangkok dates, and no invented merchant/date/category. Apply a matching merchant rule after structured validation and return the draft without inserting it.

- [ ] **Step 4: Test and implement the text UI**

The page accepts Russian text, shows loading/cancel states, then opens the shared editable preview. Low-confidence fields receive an accessible “Проверьте значение” marker. Saving a changed category upserts the normalized merchant rule only when a merchant exists.

- [ ] **Step 5: Verify and commit**

Run: `deno test --allow-env supabase/functions/parse-text/index.test.ts && npm test -- src/features/capture/TextCapture.test.tsx`

Expected: PASS.

```bash
git add supabase/functions/parse-text src/features/capture src/features/expenses/ExpensePreview.tsx src/features/categories/categoryRepository.ts
git commit -m "feat: add Russian text expense capture"
```

### Task 11: Add Russian voice and Thai receipt capture

**Files:**
- Create: `supabase/functions/transcribe/index.ts`
- Create: `supabase/functions/transcribe/index.test.ts`
- Create: `supabase/functions/parse-receipt/index.ts`
- Create: `supabase/functions/parse-receipt/index.test.ts`
- Create: `src/features/capture/VoiceCapture.tsx`
- Create: `src/features/capture/VoiceCapture.test.tsx`
- Create: `src/features/capture/ReceiptCapture.tsx`
- Create: `src/features/capture/ReceiptCapture.test.tsx`
- Create: `src/features/capture/AddExpensePage.tsx`
- Modify: `src/app/router.tsx`

- [ ] **Step 1: Write voice handler tests**

Pass a small in-memory audio `File`, mock OpenAI transcription to Russian text, then mock structured parsing. Assert the response contains both transcript and draft. Reject files above 15 MB or MIME types outside `audio/webm`, `audio/mp4`, `audio/mpeg`, and `audio/wav`. Assert no storage API is called.

- [ ] **Step 2: Implement voice capture without durable uploads**

The browser records with `MediaRecorder`, constructs a multipart function request, and releases the Blob after the response. The Edge Function reads bytes only in request memory, sends them to the model selected by required secret `OPENAI_TRANSCRIBE_MODEL`, then passes the Russian transcript through the same structured draft pipeline as text.

- [ ] **Step 3: Write receipt handler tests**

Use a fixture image under 10 MB. Mock Thai receipt extraction and assert only total, merchant, date, and category evidence survive; line items and image bytes are absent from the response and database. Reject non-image MIME types and over-limit images. Assert known merchant rules take precedence.

- [ ] **Step 4: Implement receipt capture without durable uploads**

Accept `image/jpeg`, `image/png`, and `image/webp`. Downscale on-device to a maximum 2048px edge before multipart upload. The Edge Function passes an in-memory base64 data URL to the structured multimodal request, validates the draft, and drops all byte references before returning. Do not call Supabase Storage.

- [ ] **Step 5: Test and implement the combined add page**

Provide four Russian tabs: Текст, Голос, Чек, Вручную. Camera input uses `accept="image/*" capture="environment"`. Every mode reaches the same `ExpensePreview`. A failed call retains the transcript or manually recoverable fields and offers “Заполнить вручную”.

- [ ] **Step 6: Verify and commit**

Run: `deno test --allow-env supabase/functions/transcribe/index.test.ts supabase/functions/parse-receipt/index.test.ts && npm test -- src/features/capture && npm run build`

Expected: PASS; source search finds no Supabase Storage call in either media handler.

```bash
git add supabase/functions/transcribe supabase/functions/parse-receipt src/features/capture src/app/router.tsx
git commit -m "feat: add voice and receipt expense capture"
```

### Task 12: Add duplicate detection and correction learning

**Files:**
- Create: `src/features/expenses/duplicate.ts`
- Create: `src/features/expenses/duplicate.test.ts`
- Modify: `src/features/expenses/ExpensePreview.tsx`
- Modify: `src/features/expenses/expenseRepository.ts`
- Modify: `src/features/categories/categoryRepository.ts`

- [ ] **Step 1: Write duplicate tests**

Match candidates only when household, Bangkok expense date, normalized merchant, and amount are equal. Do not match different amounts or dates. For a blank merchant, do not issue an automatic duplicate warning.

- [ ] **Step 2: Implement duplicate lookup and preview warning**

Before save, query only matching date and amount, normalize merchant in the client and database, and show the existing expense in a warning. “Сохранить всё равно” is an explicit second action and sets the expense column `duplicate_confirmed` to `true`.

- [ ] **Step 3: Test correction learning**

When detected category differs from the confirmed category and merchant is nonblank, assert a merchant-rule upsert occurs after expense save. If expense save fails, the rule must not change. Manual category edits later do not rewrite a rule unless the user checks “Запомнить для этого магазина”.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/features/expenses src/features/categories`

Expected: PASS.

```bash
git add src/features/expenses src/features/categories
git commit -m "feat: add duplicate warnings and category learning"
```

## Increment C — Release hardening and publication

### Task 13: Add mobile end-to-end journeys and accessibility checks

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/fixtures.ts`
- Create: `e2e/manual-expense.spec.ts`
- Create: `e2e/budgets-settlement.spec.ts`
- Create: `e2e/ai-capture.spec.ts`
- Create: `e2e/auth-boundary.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Configure mobile projects**

Use Playwright's iPhone 14 and Pixel 7 device presets. Start `npm run dev -- --host 127.0.0.1` as the web server. Seed a deterministic local household through a test-only service-role fixture and delete it after each file.

- [ ] **Step 2: Write the manual accounting journey**

Sign in as Ilya, create one personal and two mutual expenses using different payment sources, verify the three budget cards and net debt, edit one amount, delete one expense with confirmation, record a partial settlement, and verify the recalculated balance.

- [ ] **Step 3: Write the budget and currency journey**

Set September total and category limits, move to October, accept copied limits, verify zero October spending, and switch THB to USD to NIS. Assert dashboard, expense list, budget limits, and settlement values all change currency together.

- [ ] **Step 4: Write mocked AI journeys**

Intercept each Edge Function: test Russian text, microphone fixture, and Thai receipt fixture. Verify uncertain values are highlighted, corrected category learning occurs, duplicate confirmation is required, and no expense exists before preview confirmation.

- [ ] **Step 5: Add accessibility assertions**

For every primary page, assert a single level-one heading, labelled controls, keyboard-visible focus, no horizontal overflow at 320px, and touch targets at least 44px. Add `@axe-core/playwright` and fail on serious or critical violations.

- [ ] **Step 6: Run and commit**

Run: `npm test && npm run build && npm run test:e2e`

Expected: unit, integration, build, and both mobile browser projects PASS.

```bash
git add package.json package-lock.json playwright.config.ts e2e
git commit -m "test: cover mobile household expense journeys"
```

### Task 14: Verify privacy, configure production, and publish with Sites

**Files:**
- Create: `.env.example`
- Create: `docs/operations.md`
- Modify: `supabase/config.toml`
- Modify: `src/app/styles.css`
- Create through Sites hosting workflow: `.openai/hosting.json`

- [ ] **Step 1: Document exact required configuration**

`.env.example` lists only public browser values:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`docs/operations.md` identifies server-only Supabase secrets: `OPENAI_API_KEY`, `OPENAI_STRUCTURED_MODEL`, `OPENAI_TRANSCRIBE_MODEL`, `OPENEXCHANGERATES_APP_ID`, `APP_ORIGIN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. It also documents inviting the two emails, applying migrations, deploying four functions, rotating keys, and deleting a household.

- [ ] **Step 2: Run the privacy audit**

Run:

```bash
rg -n "OPENAI_API_KEY|SERVICE_ROLE|OPENEXCHANGERATES_APP_ID" src public dist
rg -n "storage\.from|receipt.*insert|audio.*insert" supabase/functions src
```

Expected: the first command finds no secret names in browser or build output; the second finds no durable media write path.

- [ ] **Step 3: Run the database access audit**

With local Supabase, authenticate as Ilya, Masha, and an outsider. Run `supabase/tests/database.sql` and confirm only the two household members can select, insert, update, or delete household records. Confirm the anon key cannot invoke AI functions without a valid user JWT.

- [ ] **Step 4: Run the complete release gate**

Run: `npm test && npm run build && npm run test:e2e && deno test --allow-env supabase/functions/**/*.test.ts`

Expected: every command exits 0.

- [ ] **Step 5: Publish the production build**

Invoke the `sites:sites-building` skill to validate the production artifact, then the required `sites:sites-hosting` skill to create the current supported `.openai/hosting.json` and publish `dist/`. Configure `APP_ORIGIN` to the resulting HTTPS origin, redeploy Edge Functions, and rerun the sign-in plus manual-expense smoke test against production.

- [ ] **Step 6: Commit the release configuration**

```bash
git add .env.example .openai/hosting.json docs/operations.md supabase/config.toml src/app/styles.css
git commit -m "chore: prepare expense tracker production release"
```

## Final acceptance checklist

- [ ] Both invited emails can sign in; an outsider cannot access household rows or functions.
- [ ] Manual, Russian text, Russian voice, and Thai receipt inputs all stop at an editable preview.
- [ ] Receipt images and audio recordings are not stored after their request finishes.
- [ ] Every budget-owner/payment-source combination produces the approved debt effect.
- [ ] Total and category budgets are separate for Ilya, Masha, and Mutual.
- [ ] A new month copies limits and starts spending at zero.
- [ ] Settlements reduce debt without affecting spending.
- [ ] THB remains canonical and the global THB/USD/NIS switch changes every monetary view.
- [ ] Category corrections can create remembered merchant rules.
- [ ] Duplicate candidates require explicit confirmation.
- [ ] Unit, database, Edge Function, build, and mobile end-to-end gates pass.
- [ ] The installable production site loads over HTTPS and completes the smoke test.
