# Production operations

The application runs entirely on OpenAI Sites. Sites provides the private viewer identity, the `DB` D1 binding, static hosting, and the Worker runtime. Receipt images and voice recordings are processed in request memory and are never retained.

## Hosted configuration

Configure these runtime values through Sites; do not commit real secrets or Masha's address:

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | For AI capture | Server-only key for text, voice, and receipt recognition |
| `MASHA_EMAIL` | Yes | Exact lowercase email on Masha's OpenAI account |
| `ILYA_EMAIL` | No | Defaults to `kalnit2308@gmail.com` |
| `OPENAI_STRUCTURED_MODEL` | No | Overrides the structured extraction model |
| `OPENAI_TRANSCRIBE_MODEL` | No | Overrides the Russian transcription model |

Manual expenses, budgets, settlements, categories, and cached currency rates continue to work if `OPENAI_API_KEY` is absent. The three AI capture actions show a Russian configuration error and keep the manual-entry fallback available.

## Access and publish

1. Keep the Site private. Invite only Ilya's OpenAI account and Masha's OpenAI account in the Sites access policy.
2. Set `MASHA_EMAIL` to the same normalized email used for Masha's invite. If Ilya uses a different account, set `ILYA_EMAIL` too.
3. Confirm `.openai/hosting.json` retains the existing `project_id`, declares `"d1": "DB"`, and leaves `r2` as `null`.
4. Run `npm run build`. The artifact must include the Worker at `dist/server/index.js`, static Vite assets, hosting metadata, and `dist/.openai/drizzle/0000_sites_d1.sql`.
5. Save and privately deploy the validated commit through the Sites hosting workflow. Sites applies the checked-in D1 migration and injects the logical `DB` binding.

No separate database project, SMTP provider, application login, exchange-rate key, or backend deployment is required. Historical THB rates come from the date-pinned fawazahmed0 currency dataset through its primary CDN and documented fallback.

## Production smoke test

1. Open the private Site as Ilya. Confirm the dashboard loads and an uninvited OpenAI account is denied by the Site access policy and Worker allowlist.
2. Add a manual mutual expense for 100 THB, paid by Ilya with a 50/50 split. Confirm Masha owes Ilya 50 THB.
3. Open the same Site as Masha and confirm the expense and debt are shared.
4. Switch THB to USD and ILS and confirm the exact-date values load.
5. With `OPENAI_API_KEY` configured, send one Russian text expense, one short voice expense, and one non-sensitive Thai receipt. Confirm each stops at an editable preview and no media is stored.
6. Delete the smoke expense and confirm the balance returns to its previous value.

## Secret rotation and data removal

Create a replacement OpenAI key, update `OPENAI_API_KEY` in Sites, repeat the three capture checks, and only then revoke the old key. To remove all household data, export any records that must be retained, then delete the Sites-managed D1 database or the Site through the Sites control plane. Removing the Site or D1 database is destructive and is intentionally not automated by this repository.
