# Production operations

This runbook keeps the three release surfaces separate: Supabase owns authentication, data, and Edge Functions; OpenAI Sites owns the static web application; GitHub remains source control only. Never commit real emails, tokens, API keys, or local environment files.

## Required configuration

The browser build has only these public values:

| Variable | Used by | Source |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser | Supabase legacy anon key |

Set them in the build environment or an ignored `.env.production.local` before `npm run build`. They are embedded in the static bundle and are safe for a browser only because row-level security is enabled. Never put a service-role or secret key in a `VITE_*` variable.

Supabase Edge Functions require:

| Variable | Functions |
| --- | --- |
| `APP_ORIGIN` | all four; exact production Sites origin, such as `https://example.invalid`, with no trailing slash |
| `SUPABASE_URL` | all four |
| `SUPABASE_ANON_KEY` | all four |
| `SUPABASE_SERVICE_ROLE_KEY` | `exchange-rate` only |
| `OPENAI_API_KEY` | `parse-text`, `transcribe`, `parse-receipt` |
| `OPENAI_STRUCTURED_MODEL` | `parse-text`, `transcribe`, `parse-receipt` |
| `OPENAI_TRANSCRIBE_MODEL` | `transcribe` only |
| `OPENEXCHANGERATES_APP_ID` | `exchange-rate` only |

Hosted Supabase Functions inject `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` by default. Verify that those legacy names are present because the current functions read them; do not copy them into source control. Set the remaining values with the Dashboard's Edge Function Secrets page or from an ignored file:

```bash
supabase secrets set --project-ref "$SUPABASE_PROJECT_REF" --env-file ./supabase/functions/.env.production
supabase secrets list --project-ref "$SUPABASE_PROJECT_REF"
```

The ignored file contains `APP_ORIGIN`, `OPENAI_API_KEY`, both OpenAI model names, and `OPENEXCHANGERATES_APP_ID`. `APP_ORIGIN` must be updated if the production Sites origin changes.

## Create and prepare Supabase

1. Create a production project in the Supabase Dashboard and record its project ref, database password, project URL, anon key, and service-role key in the team's secret manager.
2. Authenticate and link this checkout:

   ```bash
   supabase login
   supabase link --project-ref "$SUPABASE_PROJECT_REF"
   ```

3. Preview and apply both checked-in migrations, in order:

   ```bash
   supabase db push --dry-run
   supabase db push
   supabase migration list
   ```

   Confirm `202609180001_initial_schema.sql` and `202609180002_category_merge.sql` appear as applied remotely.
4. In Authentication settings, configure the production Sites origin as the Site URL and an allowed redirect URL. Keep email OTP enabled.

## Provision Ilya and Masha

Choose the two production email addresses once, normalize them to lowercase, and use those exact strings in Auth and household setup. The browser calls `signInWithOtp` with `shouldCreateUser: false`, so sign-in cannot create a missing user.

1. In Supabase Dashboard, open **Authentication → Users → Add user → Send invitation** and invite Ilya's exact email. Repeat for Masha's exact email. Do not test OTP sign-in until both rows exist in `auth.users`.
2. In the SQL editor, replace only the two placeholder emails and run this once. It uses the same application functions as the authenticated onboarding flow:

   ```sql
   begin;

   select set_config(
     'request.jwt.claim.sub',
     (select id::text from auth.users where lower(email) = lower('<ILYA_EMAIL>')),
     true
   );
   select set_config('request.jwt.claim.email', lower('<ILYA_EMAIL>'), true);
   select public.bootstrap_household('Thailand household', lower('<MASHA_EMAIL>'));

   select set_config(
     'request.jwt.claim.sub',
     (select id::text from auth.users where lower(email) = lower('<MASHA_EMAIL>')),
     true
   );
   select set_config('request.jwt.claim.email', lower('<MASHA_EMAIL>'), true);
   select public.accept_household_invitation();

   commit;
   ```

3. Verify one `ilya` and one `masha` membership exist for the new household. If either email lookup returns no row, roll back and create that Auth user before retrying.

## Deploy Supabase Functions

Set the custom function secrets after the production Sites origin is known. Then deploy each function explicitly; keep this separate from the Sites release:

```bash
supabase functions deploy parse-text --project-ref "$SUPABASE_PROJECT_REF"
supabase functions deploy transcribe --project-ref "$SUPABASE_PROJECT_REF"
supabase functions deploy parse-receipt --project-ref "$SUPABASE_PROJECT_REF"
supabase functions deploy exchange-rate --project-ref "$SUPABASE_PROJECT_REF"
```

Do not use `--no-verify-jwt`. The functions also validate the caller and household membership themselves.

## Build and publish the Site

1. Supply `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the production build and run `npm run build`.
2. Use the Sites controller to create the Site. It must write the returned `project_id` into `.openai/hosting.json`; the checked-in `{}` intentionally contains no invented ID or bindings.
3. Package and publish the same validated commit with the Sites hosting workflow. The build artifact contains `dist/server/index.js`, Vite assets, and `dist/.openai/hosting.json`.
4. Set `APP_ORIGIN` to the exact deployed HTTPS origin. Secret updates are immediately available to Supabase Functions; redeploy the four functions when function code changes.

## Production smoke test

Use real production emails but no sensitive receipt or voice content.

1. Open the production URL in a private window, request an OTP for Ilya's exact pre-created email, complete sign-in, and confirm the dashboard loads without a “family not found” message.
2. Add a manual expense dated today: merchant `Release smoke`, category `Прочее`, amount `100.00` THB, owner `Общие`, paid from `Илья`, split `50%`. Save it. Confirm the expense list shows `฿100.00` and the balance says Masha owes Ilya `฿50.00`.
3. Enter text `Заплатил 120 бат за обед в Release Text с личной карты, это общее`. Confirm `parse-text` produces an editable 120 THB preview, then cancel without saving.
4. Record `Заплатил сто тридцать бат за такси, общий расход`. Confirm `transcribe` produces an editable preview, then cancel without saving.
5. Photograph a non-sensitive Thai receipt. Confirm `parse-receipt` produces an editable preview, then cancel without saving. Confirm neither audio nor receipt media appears in Supabase Storage.
6. Switch the saved expense display to USD and NIS. Confirm both show positive converted values for today's date; this exercises `exchange-rate`.
7. In a separate private window, sign in as Masha and confirm the `Release smoke` expense and the same `฿50.00` debt are visible. Confirm a non-precreated outsider email cannot complete sign-in.
8. As Ilya, delete `Release smoke`, accept the confirmation, and verify it disappears and the smoke-test debt returns to its prior value.

## Rotate keys and models

1. Create the replacement credential at its provider and store it in the secret manager.
2. For OpenAI, Open Exchange Rates, model-name, or `APP_ORIGIN` changes, update the Supabase function secret and repeat the applicable smoke steps before revoking the old credential.
3. For the public Supabase anon key, update both `VITE_SUPABASE_ANON_KEY` and the function runtime's corresponding injected/default key, rebuild the Site, publish it, and verify sign-in plus one authenticated read before disabling the old key.
4. For the Supabase service-role key, ensure the hosted `SUPABASE_SERVICE_ROLE_KEY` value used only by `exchange-rate` has changed, verify currency lookup and database update, then disable the old key. Never place this value in Sites, GitHub, logs, or browser configuration.
5. Rotate leaked credentials immediately, review provider and Supabase logs, and invalidate active sessions when an Auth signing key may have been exposed.

## Delete the household

Take a database backup first. In the SQL editor, replace `<ILYA_EMAIL>`, verify that the selected household is the intended one, and delete it in a transaction:

```sql
begin;

select h.id, h.name, array_agg(u.email order by hm.person_key) as members
from public.households h
join public.household_members hm on hm.household_id = h.id
join auth.users u on u.id = hm.user_id
where h.id = (
  select hm2.household_id
  from public.household_members hm2
  join auth.users u2 on u2.id = hm2.user_id
  where lower(u2.email) = lower('<ILYA_EMAIL>')
)
group by h.id, h.name;

delete from public.households
where id = (
  select hm.household_id
  from public.household_members hm
  join auth.users u on u.id = hm.user_id
  where lower(u.email) = lower('<ILYA_EMAIL>')
);

commit;
```

Deleting the household cascades its memberships, invitations, categories, budgets, expenses, merchant rules, and settlements. It does not delete Ilya's or Masha's Auth users or profiles; remove those users separately from **Authentication → Users** only when the accounts must also be destroyed. Retain or remove backups according to the data-retention policy.
