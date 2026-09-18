# Modern Mutual-First Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dated mode-based interface with a modern mutual-first dashboard and unified chat-style expense composer.

**Architecture:** Preserve the current repositories, D1 schema, and Worker APIs. Recompose the React UI around focused capture components, mutual-first dashboard selectors, a modern navigation hierarchy, and one responsive design system.

**Tech Stack:** React 19, TypeScript, React Router, TanStack Query, CSS, Lucide React, Vite, OpenAI Sites

---

### Task 1: Shared modern shell and navigation

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `src/app/BottomNav.tsx`, `src/app/router.tsx`, `src/app/styles.css`
- Create: `src/features/more/MorePage.tsx`

- [ ] Install `lucide-react`.
- [ ] Replace Unicode navigation with Home, Expenses, Add, Budgets, and More using outline icons and a prominent center Add action.
- [ ] Route More to settlements, categories, currency selection, and settings links.
- [ ] Replace the beige/serif styling with the approved modern fintech tokens, responsive shell, focus states, motion, and reduced-motion behavior.

### Task 2: Mutual-first dashboard

**Files:**
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Modify: `src/app/styles.css`

- [ ] Derive mutual spend, mutual limit, remaining amount, total household spend, mutual category progress, personal summaries, and debt from the existing query data.
- [ ] Render the dark mutual hero first, followed by total spend, mutual categories, mutual recent expenses, compact personal cards, and slim settlement card.
- [ ] Use a single-column phone layout and balanced wide layout.

### Task 3: Unified chat expense composer

**Files:**
- Create: `src/features/capture/ExpenseComposer.tsx`
- Create: `src/features/capture/ParsedExpenseCard.tsx`
- Modify: `src/features/capture/AddExpensePage.tsx`
- Modify: `src/features/capture/VoiceCapture.tsx`, `src/features/capture/ReceiptCapture.tsx`
- Modify: `src/app/styles.css`

- [ ] Replace capture tabs with one fixed composer containing photo, text, microphone, and send controls.
- [ ] Show the submitted text, receipt thumbnail, or recording state as the user message and parsing as an assistant state.
- [ ] Show the result as one editable card backed by the existing `ExpenseDraftForm` data model.
- [ ] Keep inline warnings, duplicate confirmation, Retry, Fill manually, and one-tap Save.
- [ ] After save, show confirmation and reset the current conversation instead of navigating away.

### Task 4: Verification and publication

**Files:**
- Modify only files required by compile or lint errors.

- [ ] Run `npm run build` and `npm run lint`; do not run additional test or review-agent workflows per owner instruction.
- [ ] Commit and push the feature branch.
- [ ] Package and publish the private Sites version.
