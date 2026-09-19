# Mobile, Multi-Currency, and Budget Exceptions Design

## Goal

Make the installed mobile app stay in standalone mode, accept THB/ILS/USD expenses while preserving their original amounts, improve automatic expense metadata, and support a reusable default mutual budget with month-specific overrides.

## Mobile experience

The PWA manifest will define a standalone display override, start URL, scope, portrait-friendly orientation, and existing colors. Apple mobile-web-app metadata and `viewport-fit=cover` will let a Home Screen launch occupy the available screen and respect notches and home indicators. A normal browser tab cannot suppress Safari or Chrome controls; fullscreen behavior applies when the site is installed to the Home Screen.

## Multi-currency expenses

THB remains the default input currency. Manual and parsed expense cards offer THB, ILS, and USD. Each expense stores its original minor-unit amount and currency. The server converts foreign inputs to canonical THB satang using the exchange rate for the expense date, stores both day rates on the expense, and continues using canonical THB for budgets, debt, duplicate-safe accounting, and display-currency conversion.

Existing expenses migrate as original THB amounts. Text, voice, and receipt extraction return the explicitly stated currency; when none is stated, they return THB.

## Recognition quality

The signed-in person is included in extraction context so phrases such as “I paid” resolve to that person. Mutual ownership and mutual payment remain safe defaults when the prompt is silent. The extraction instructions distinguish expense title, budget owner, payment source, and category, with Russian examples. Deterministic category hints cover every configured category and override uncertain model classifications. Existing saved merchant-category corrections remain highest priority, and subsequent manual category corrections continue to be remembered.

## Budget defaults and exceptions

The 10,000 ILS mutual budget becomes the application default rather than a prior-month copy. A month without an override displays this default. Saving edited limits creates that month’s override; a 50% action proportionally scales the total and every category. September 2026 is seeded as a 50% override totaling 5,000 ILS. Later months resolve to the full default instead of inheriting September’s exception.

Personal budgets retain their existing explicit monthly behavior and remain secondary.

## Compatibility and errors

Rate lookup failure blocks saving a foreign-currency expense with a clear retryable message; THB saves remain immediate. Existing API records remain readable after migration. The dashboard and budget page resolve exact monthly overrides before falling back to the mutual default.
