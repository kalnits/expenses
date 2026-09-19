# Native NIS Budgets

## Goal

Allow each monthly household or personal budget to be created in THB or NIS while keeping existing THB budgets unchanged.

## Data model

- Add `currency` (`THB` or `ILS`) to each monthly budget, defaulting existing rows to `THB`.
- Store total and category limits as integer minor units: satang for THB and agorot for ILS.
- All limits within one monthly budget use that budget's currency.

## Spending comparison

- THB budgets compare directly with expense amounts in satang.
- ILS budgets convert every expense using that expense date's stored `ilsPerThb` rate, then sum the resulting agorot.
- Expenses without an available same-day rate are not silently treated as zero; the interface shows a warning that the comparison is incomplete.

## Interface

- Add a THB/NIS selector to the budget editor.
- Labels and inputs use the selected budget currency.
- Existing budgets open in their stored currency; old budgets open as THB.
- The dashboard and budget summaries continue to honor the global THB/NIS/USD display preference. A native NIS limit is converted through the selected month's reference rate when it must be displayed in another currency.
- Mutual remains the primary and default budget.

## API and migration

- Extend the D1 budget table and budget API payloads with the currency field.
- Preserve the current routes and budget ownership model.
- Copying the previous month's limits also copies its currency.

## Validation

- Currency must be `THB` or `ILS`.
- Amounts remain non-negative safe integers.
- Run the existing deployment build and lint checks only, per the requested lightweight QA process.
