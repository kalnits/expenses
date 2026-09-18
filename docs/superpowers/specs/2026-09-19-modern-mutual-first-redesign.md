# Modern Mutual-First Redesign

## Goal

Redesign the expense tracker as a modern, mobile-native household finance app. Adding an expense must feel as immediate as sending a message, while the dashboard must make the mutual budget the clear center of the product. Personal budgets remain available but visually secondary.

## Product hierarchy

The first screen answers two questions immediately:

1. How much have we spent from the mutual budget this month?
2. How much have we spent in total this month, including personal expenses?

Mutual budget progress, mutual category limits, and recent mutual expenses occupy the primary visual hierarchy. Ilya and Masha's personal budgets appear as compact, expandable secondary cards below the mutual content. The current debt remains visible as a slim secondary settlement card.

## Chat-style expense capture

The add-expense page removes the separate Text, Voice, Receipt, and Manual mode tabs. It uses one unified conversation surface with a fixed bottom composer containing:

- a text input;
- a photo/receipt action;
- a microphone action;
- a send action.

Typed text, a receipt thumbnail, or a voice waveform is shown as the user's message. While recognition runs, an assistant bubble shows a lightweight processing state. The parsed result then appears as one editable expense card containing amount, merchant, category, date, budget owner, payment account, and mutual split.

The mutual budget and mutual account are the initial defaults. A large `Save expense` action is the primary control. Tapping a parsed value opens inline editing or a compact bottom sheet. Recognition warnings stay attached to the relevant value rather than appearing as detached notices.

The screen contains only the current expense flow, not historical conversation. After saving, it shows a brief success confirmation and resets to an empty composer. If recognition fails, the same card can be completed manually through a clear `Fill manually` action. Duplicate detection stays in the flow as an inline confirmation state.

## Dashboard

The dashboard contains these sections in order:

1. A dark mutual-budget hero with the current month, amount spent, mutual limit, remaining amount, and an animated progress visualization.
2. A compact total-household-spending line that includes mutual and personal expenses.
3. Mutual category progress, prioritizing categories closest to their limits.
4. Recent mutual expenses.
5. Compact expandable cards for Ilya and Masha's personal budgets.
6. A slim `Who owes whom` settlement card.

The layout is single-column and thumb-friendly on phones. Wider screens use a balanced two-column composition while preserving the same information order.

## Navigation

The bottom navigation becomes:

- Home
- Expenses
- Add
- Budgets
- More

`Add` is the prominent center action. `More` contains settlements, category management, settings, and the currency selector. Real outline icons replace Unicode symbols. Existing routes may remain as implementation details, but navigation labels and hierarchy follow this model.

## Visual system

The selected direction is modern native fintech:

- cool near-white canvas;
- graphite text;
- deep teal primary surfaces;
- one bright mint accent;
- large tabular money numerals;
- compact supporting labels;
- 20–24px card radii;
- thin borders and restrained soft shadows;
- a subtle gradient only on the mutual hero;
- 150–220ms interaction transitions.

The design avoids ornamental glass effects, beige paper styling, serif display typography, and text-character icons. Controls have at least 44px touch targets, visible focus states, sufficient contrast, and reduced-motion support.

## State and feedback

- Loading uses content-shaped skeletons rather than a blank page or generic status text.
- Voice capture shows recording duration and waveform feedback.
- Receipt capture shows the selected thumbnail before processing.
- Parsing failures remain inside the chat flow with Retry and Fill manually actions.
- Save shows a short confirmation before the composer resets.
- API and D1 behavior remain unchanged unless a small response-shape adjustment is required to support the new interface.

## Scope

This redesign changes the React interface, interaction state, navigation presentation, and CSS design system. It preserves the existing expense, budget, settlement, currency, authentication, D1, and OpenAI backend behavior.

Functional QA remains with the owner. Implementation verification is limited to a production build and lint, matching the owner's earlier instruction.
