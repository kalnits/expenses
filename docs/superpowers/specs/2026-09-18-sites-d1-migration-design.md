# Sites D1 Migration Design

## Goal

Run the Thailand expense tracker entirely on OpenAI Sites infrastructure so Ilya and Masha only need OpenAI accounts to use it. Remove Supabase and its separate account, database, authentication, and deployment setup.

## Chosen architecture

The existing React interface remains unchanged in appearance and behavior. Its repositories call same-origin `/api/*` endpoints instead of the Supabase browser SDK. The Sites Worker owns authorization, validation, D1 queries, exchange-rate fetching, and OpenAI calls.

Sites provides the signed-in visitor through `oai-authenticated-user-id` and `oai-authenticated-user-email`. The Worker maps the two allowed emails to `ilya` or `masha`, rejects every other API caller, and attributes writes to the stable Sites user id. The Site itself remains private and Ilya and Masha are the only invited viewers.

## Persistence

One Sites-managed D1 binding named `DB` stores categories, merchant rules, monthly budgets, category limits, expenses, settlements, and cached exchange rates. The schema uses integer satang values, ISO dates, foreign keys, checks, unique constraints, and indexes for the list queries used by the interface. Runtime initialization is idempotent and seeds sensible Russian category defaults.

Receipt and voice files are processed immediately and are not retained, so R2 is not required.

## APIs

- `GET /api/session` returns the current household membership.
- `/api/categories`, `/api/expenses`, `/api/budgets`, and `/api/settlements` implement the existing ledger workflows.
- `GET /api/rates?date=YYYY-MM-DD` fetches and caches exact-date THB→USD and THB→ILS values from the keyless currency API, using its documented fallback host. It never silently substitutes another date.
- `/api/capture/text`, `/api/capture/voice`, and `/api/capture/receipt` call OpenAI from the Worker and return the editable preview format already used by the client.

All API failures return Russian user-facing messages. Missing hosted configuration disables only the affected AI capture action; manual expense tracking remains available.

## Configuration and operations

The only service secret is `OPENAI_API_KEY`. Optional model variables keep sensible defaults. `ILYA_EMAIL` defaults to the Site owner's known email; `MASHA_EMAIL` is set when Masha's invite address is supplied. No Supabase project, database migration, SMTP, or app-owned login is required.

## Validation

Following the owner's instruction for this first version, validation is limited to a production build and lint. Functional QA is left to the owner.
