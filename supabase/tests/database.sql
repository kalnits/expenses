begin;

-- This script is intended for `supabase test db`.  It deliberately fails on
-- any policy or constraint regression rather than only reporting a count.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ilya@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'masha@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.email', 'ilya@example.test', true);
select public.bootstrap_household('Test household', 'masha@example.test');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claim.email', 'masha@example.test', true);
select public.accept_household_invitation();
reset role;

insert into public.expenses (
  household_id, amount_satang, expense_date, merchant, normalized_merchant,
  category_id, owner, paid_from, ilya_share_bps, capture_method, created_by
)
select
  h.id, 10000, current_date, 'Market', 'market', c.id,
  'mutual', 'ilya', 5000, 'manual', '10000000-0000-0000-0000-000000000001'
from public.households h
join public.categories c on c.household_id = h.id
where h.name = 'Test household'
order by c.name
limit 1;

do $$
begin
  begin
    insert into public.expenses (
      household_id, amount_satang, expense_date, merchant, normalized_merchant,
      category_id, owner, paid_from, ilya_share_bps, capture_method, created_by
    ) values (
      (select id from public.households where name = 'Test household'), 100, current_date, 'Broken split', 'broken split',
      (select id from public.categories where household_id = (select id from public.households where name = 'Test household') limit 1),
      'mutual', 'ilya', 10001, 'manual', '10000000-0000-0000-0000-000000000001'
    );
    raise exception 'expected invalid mutual split to be rejected';
  exception when check_violation then null;
  end;

  begin
    insert into public.expenses (
      household_id, amount_satang, expense_date, merchant, normalized_merchant,
      category_id, owner, paid_from, ilya_share_bps, capture_method, created_by
    ) values (
      (select id from public.households where name = 'Test household'), -1, current_date, 'Negative', 'negative',
      (select id from public.categories where household_id = (select id from public.households where name = 'Test household') limit 1),
      'ilya', 'ilya', 10000, 'manual', '10000000-0000-0000-0000-000000000001'
    );
    raise exception 'expected negative expense amount to be rejected';
  exception when check_violation then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
do $$
begin
  if (select count(*) from public.expenses) <> 1 then
    raise exception 'Ilya could not read the shared expense';
  end if;
end;
$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
do $$
begin
  if (select count(*) from public.expenses) <> 1 then
    raise exception 'Masha could not read the shared expense';
  end if;
end;
$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
do $$
declare
  inserted boolean := false;
begin
  if (select count(*) from public.expenses) <> 0 then
    raise exception 'outsider can select household rows';
  end if;

  begin
    insert into public.categories (household_id, name, normalized_name)
    values ((select id from public.households where name = 'Test household'), 'Outsider', 'outsider');
    inserted := true;
  exception when insufficient_privilege or check_violation or not_null_violation then null;
  end;
  if inserted then raise exception 'outsider can insert household rows'; end if;

  begin
    insert into public.exchange_rates (rate_date, usd_per_thb, ils_per_thb)
    values (current_date, 30, 10);
    raise exception 'normal authenticated user can write exchange rates';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

do $$
declare
  referenced_category uuid;
begin
  select category_id into referenced_category
  from public.expenses
  where household_id = (select id from public.households where name = 'Test household')
  limit 1;

  begin
    delete from public.categories where id = referenced_category;
    raise exception 'referenced category can be hard-deleted';
  exception when foreign_key_violation then null;
  end;
end;
$$;

rollback;
