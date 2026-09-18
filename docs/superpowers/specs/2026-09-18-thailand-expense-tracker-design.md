# Thailand Household Expense Tracker — Design Specification

Date: 2026-09-18  
Status: Approved design

## 1. Product goal

Build a simple, installable, Russian-language web app for Ilya and Masha to record and understand household spending in Thailand. The app must make expense entry fast through text, voice, receipt photos, or a manual form while keeping every AI-generated result reviewable before it affects the records.

The app maintains separate personal budgets for Ilya and Masha and a mutual budget. Both users can see all expenses and budgets. It also calculates who owes whom when an expense is paid from a payment source that does not match its ownership.

## 2. First-release scope

The first release includes:

- An installable, mobile-first progressive web app hosted with OpenAI Sites.
- A Russian user interface.
- Two invited users, Ilya and Masha, who sign in with an email one-time code.
- Shared visibility of all household data.
- Expense entry through Russian text, Russian voice, a Thai receipt photo, or a manual form.
- An editable confirmation preview before any captured expense is saved.
- Automatic category detection with editable default categories.
- Merchant-to-category learning based on user corrections.
- Separate Ilya, Masha, and Mutual monthly budgets.
- A total limit and category limits within each of the three budgets.
- Payment-source tracking and a net balance showing who owes whom.
- Settlement records that reduce the net balance without counting as spending.
- THB as the accounting currency, with a global THB/NIS/USD display switch.
- Monthly expense history and budget-versus-actual summaries.

The following are explicitly deferred:

- Telegram bot entry. It will be added after the web app and reuse the same backend workflows.
- Bank synchronization, account balances, or transaction imports.
- Receipt line-item storage.
- Income tracking.
- Push notifications.
- Additional households, household members, interface languages, or currencies.

## 3. Architecture

### 3.1 Client

The client is a mobile-first progressive web app designed primarily for iPhone and Android browsers. It can be installed to the home screen and is delivered through OpenAI Sites.

The client is responsible for:

- Russian-language presentation and navigation.
- Capturing text, microphone input, and camera or photo-library input.
- Showing editable expense drafts.
- Displaying dashboards, budgets, expenses, and settlements.
- Applying the selected display currency throughout the interface.

### 3.2 Backend and data

Supabase provides email-code authentication and PostgreSQL storage. Database row-level security restricts the household data to the two invited members. Authorization is enforced in the backend and is not dependent on hidden interface controls.

The backend stores:

- Users and household membership.
- Expenses and their accounting attributes.
- Monthly budget limits and category allocations.
- Categories and remembered merchant-category rules.
- Payment sources.
- Settlements.
- Historical exchange rates keyed by date.

Voice recordings and receipt images are not durable records and are never stored with an expense.

### 3.3 Server functions and AI

Server-side functions keep credentials private and coordinate:

- Russian voice transcription.
- Russian natural-language expense parsing.
- Thai receipt understanding.
- Category inference.
- Exchange-rate retrieval and caching.
- Structured response validation before a draft reaches the client.

OpenAI services provide voice transcription and structured multimodal understanding. A later Telegram bot will call the same capture and expense services rather than implement separate business logic.

## 4. Primary screens

### 4.1 Dashboard

The dashboard presents the selected month and includes:

- Summary cards for Ilya, Masha, and Mutual spending.
- Total-budget and category-budget progress.
- The current net balance indicating who owes whom.
- A global THB/NIS/USD display-currency switch.
- A prominent Add expense action.

### 4.2 Add expense

The entry screen offers text, voice, receipt photo, and manual modes. Text and voice understand Russian. Receipt understanding targets Thai receipts.

All AI-assisted modes produce the same editable preview with:

- Amount.
- Merchant.
- Expense date.
- Category.
- Budget owner: Ilya, Masha, or Mutual.
- Payment source: Ilya personal, Masha personal, or mutual account.
- Notes.
- For mutual expenses, Ilya's and Masha's shares, defaulting to 50/50.

No expense is saved until the user confirms the preview.

### 4.3 Expenses

The expenses screen provides a monthly list with search and filters for budget owner, category, and payment source. A saved expense can be opened, edited, or deleted. Edits recalculate budget usage and the net debt balance.

### 4.4 Budgets

For each month, Ilya, Masha, and Mutual each have:

- One total spending limit.
- Zero or more category limits.

A new month copies the preceding month's limits and category allocations. Its spending starts at zero. Unused budget never rolls over. Prior months remain available for historical comparison.

### 4.5 Settlements and settings

The settlement view displays the current net debt and settlement history. A settlement records a repayment from one person to the other and reduces or clears the net balance. It is not an expense and does not use a budget.

Settings allow users to manage categories and merchant-category rules. The three fixed payment sources are Ilya's personal account, Masha's personal account, and the mutual account. They identify the source of payment only; the app does not track their balances.

## 5. Accounting model

### 5.1 Expense record

Every saved expense includes:

- A positive THB amount.
- Expense date interpreted in the Asia/Bangkok timezone.
- Merchant, optional notes, and category.
- Budget owner: Ilya, Masha, or Mutual.
- Payment source: Ilya personal, Masha personal, or mutual account.
- Capture method: manual, text, voice, or receipt.
- Historical THB-to-USD and THB-to-NIS rates for the expense date once available.
- For a mutual expense, each person's percentage share; the two shares must total 100% and default to 50/50.

Budgets, debts, settlements, and reports are calculated in THB. Switching display currency changes presentation only and never rewrites stored accounting amounts.

### 5.2 Debt rules

The mutual account is treated as owned equally by Ilya and Masha. Expense obligations are:

| Budget owner | Payment source | Debt effect |
| --- | --- | --- |
| Mutual | Mutual account | None |
| Mutual | Ilya personal | Masha owes Ilya Masha's configured share |
| Mutual | Masha personal | Ilya owes Masha Ilya's configured share |
| Ilya | Ilya personal | None |
| Ilya | Masha personal | Ilya owes Masha the full amount |
| Masha | Masha personal | None |
| Masha | Ilya personal | Masha owes Ilya the full amount |
| Ilya | Mutual account | Ilya owes Masha half the amount |
| Masha | Mutual account | Masha owes Ilya half the amount |

Individual obligations and settlements are aggregated into one signed household balance. The interface expresses the sign as a human-readable statement such as “Masha owes Ilya ฿1,250.” A zero balance is displayed as settled.

### 5.3 Exchange rates

THB is the canonical currency. Daily exchange rates convert totals and individual amounts for display in NIS or USD. The selected display currency applies consistently to the dashboard, budgets, reports, settlements, and expense list.

Rates are cached by calendar date. If a rate for the expense date is temporarily unavailable, THB remains fully usable and the converted value is marked unavailable until the exact-date rate is fetched. The system does not silently substitute a different date's rate.

## 6. Capture and categorization flow

All capture methods converge on one expense-draft contract:

1. The user enters text, records voice, selects a receipt photo, or fills the manual form.
2. The input is sent securely to a server function.
3. The service returns structured fields and field-level confidence indicators.
4. Server-side validation rejects malformed output and the client highlights missing or uncertain values.
5. The client displays the editable Russian preview.
6. The user confirms, then the backend validates and saves the final expense.

For receipt photos, the model extracts the total, merchant, date when present, and item clues needed for category inference. Individual receipt items are not persisted. The original photo is deleted immediately after processing, including on a failed extraction.

For voice entry, the recording is deleted immediately after transcription, including on failure.

Category selection follows this order:

1. An existing remembered rule for a normalized merchant.
2. AI inference from the merchant, place name, receipt item clues, and the editable category list.
3. An explicit uncategorized state if confidence is insufficient.

When a user corrects the category, the app creates or updates the merchant-category rule for future expenses. The user can create, rename, and merge categories. Initial defaults include groceries, restaurants and cafes, transport, housing and utilities, health, shopping, entertainment, travel, subscriptions, and other.

## 7. Validation, failures, and privacy

- AI output is always treated as a draft, never as authorization to create an expense.
- Amounts must be positive and all referenced categories, budgets, users, and payment sources must belong to the household.
- Mutual shares must total 100%.
- A candidate with the same date, normalized merchant, and amount as an existing expense triggers a duplicate warning but can still be confirmed.
- Failed AI requests return the user to an editable manual draft where possible.
- Receipt images and voice recordings are transient and are not placed in durable object storage.
- Secrets for OpenAI, exchange-rate services, and Supabase administration remain server-side.
- Database policies allow only authenticated members of the single household to read or mutate its records.
- Destructive edits require confirmation and cause all derived budget and debt values to be recalculated.

## 8. Testing strategy

### 8.1 Unit tests

Unit tests cover:

- Every budget-owner and payment-source combination in the debt table.
- Custom mutual splits.
- Settlement netting, partial settlements, and zero balance.
- Monthly budget copying with no spending rollover.
- THB canonical calculations and display conversion.
- Merchant normalization and category-rule precedence.
- Expense-draft validation and duplicate detection.

### 8.2 Integration tests

Integration tests cover:

- Email-code authentication and household access policies.
- Expense creation, editing, deletion, and recalculation.
- Month creation and previous-limit copying.
- Settlement creation and balance updates.
- Exchange-rate retrieval, exact-date caching, and unavailable-rate behavior.
- Validation of structured AI responses.
- Confirmed deletion of transient receipt and audio inputs on both success and failure.

### 8.3 End-to-end tests

Mobile-sized browser tests cover the complete text, voice, receipt, and manual entry flows; confirmation and correction of AI drafts; budget setup; currency switching; filtering; and settlement. Tests must verify that no AI-generated expense is saved without explicit confirmation.

## 9. Success criteria

The first release is successful when both users can install and sign in to the site, add and correct expenses from all four entry methods, see synchronized monthly personal and mutual budgets, switch every monetary view among THB/NIS/USD, and trust the displayed debt balance for all supported payment-source combinations. No receipt image or voice recording remains after its processing request finishes.
