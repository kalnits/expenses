create extension if not exists pgcrypto;

create type public.budget_owner as enum ('ilya', 'masha', 'mutual');
create type public.payment_source as enum ('ilya', 'masha', 'mutual');
create type public.capture_method as enum ('manual', 'text', 'voice', 'receipt');

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  timezone text not null default 'Asia/Bangkok' check (btrim(timezone) <> ''),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (btrim(display_name) <> ''),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  person_key public.budget_owner not null check (person_key in ('ilya', 'masha')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (household_id, person_key)
);

create table public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null unique check (email = lower(btrim(email)) and btrim(email) <> ''),
  person_key public.budget_owner not null default 'masha' check (person_key = 'masha'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  normalized_name text not null check (normalized_name = lower(btrim(normalized_name)) and btrim(normalized_name) <> ''),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index categories_active_name_per_household_key
  on public.categories (household_id, normalized_name)
  where is_active;

create table public.merchant_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  normalized_merchant text not null check (normalized_merchant = lower(btrim(normalized_merchant)) and btrim(normalized_merchant) <> ''),
  category_id uuid not null references public.categories(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, normalized_merchant)
);

create table public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  month date not null check (month = date_trunc('month', month)::date),
  owner public.budget_owner not null,
  total_limit_satang integer not null check (total_limit_satang >= 0),
  created_at timestamptz not null default now(),
  unique (household_id, month, owner)
);

create table public.budget_category_limits (
  id uuid primary key default gen_random_uuid(),
  monthly_budget_id uuid not null references public.monthly_budgets(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  limit_satang integer not null check (limit_satang >= 0),
  created_at timestamptz not null default now(),
  unique (monthly_budget_id, category_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  amount_satang integer not null check (amount_satang > 0),
  expense_date date not null,
  merchant text not null check (btrim(merchant) <> ''),
  normalized_merchant text not null check (normalized_merchant = lower(btrim(normalized_merchant)) and btrim(normalized_merchant) <> ''),
  notes text,
  category_id uuid not null references public.categories(id) on delete restrict,
  owner public.budget_owner not null,
  paid_from public.payment_source not null,
  ilya_share_bps integer not null check (ilya_share_bps between 0 and 10000),
  capture_method public.capture_method not null default 'manual',
  usd_per_thb numeric,
  ils_per_thb numeric,
  duplicate_confirmed boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (
    (owner = 'mutual')
    or (owner = 'ilya' and ilya_share_bps = 10000)
    or (owner = 'masha' and ilya_share_bps = 0)
  ),
  check (usd_per_thb is null or (usd_per_thb > 0 and usd_per_thb < 'Infinity'::numeric)),
  check (ils_per_thb is null or (ils_per_thb > 0 and ils_per_thb < 'Infinity'::numeric))
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  settlement_date date not null,
  from_person public.budget_owner not null check (from_person in ('ilya', 'masha')),
  to_person public.budget_owner not null check (to_person in ('ilya', 'masha')),
  amount_satang integer not null check (amount_satang > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (from_person <> to_person)
);

create table public.exchange_rates (
  rate_date date primary key,
  usd_per_thb numeric not null check (usd_per_thb > 0 and usd_per_thb < 'Infinity'::numeric),
  ils_per_thb numeric not null check (ils_per_thb > 0 and ils_per_thb < 'Infinity'::numeric),
  fetched_at timestamptz not null default now()
);

create index household_members_user_id_idx on public.household_members (user_id);
create index household_invitations_household_id_idx on public.household_invitations (household_id);
create index categories_household_id_idx on public.categories (household_id);
create index merchant_rules_household_category_idx on public.merchant_rules (household_id, category_id);
create index monthly_budgets_household_month_idx on public.monthly_budgets (household_id, month);
create index budget_category_limits_category_id_idx on public.budget_category_limits (category_id);
create index expenses_household_date_idx on public.expenses (household_id, expense_date desc);
create index expenses_household_category_date_idx on public.expenses (household_id, category_id, expense_date desc);
create index settlements_household_date_idx on public.settlements (household_id, settlement_date desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger merchant_rules_set_updated_at
before update on public.merchant_rules
for each row execute function public.set_updated_at();

create function public.validate_household_foreign_keys()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'merchant_rules' and not exists (
    select 1 from public.categories c where c.id = new.category_id and c.household_id = new.household_id
  ) then
    raise exception 'merchant rule category must belong to its household';
  end if;

  if tg_table_name = 'expenses' and not exists (
    select 1 from public.categories c where c.id = new.category_id and c.household_id = new.household_id
  ) then
    raise exception 'expense category must belong to its household';
  end if;

  if tg_table_name = 'budget_category_limits' and not exists (
    select 1
    from public.monthly_budgets b
    join public.categories c on c.id = new.category_id
    where b.id = new.monthly_budget_id and c.household_id = b.household_id
  ) then
    raise exception 'budget category must belong to the budget household';
  end if;

  return new;
end;
$$;

create trigger merchant_rules_validate_household_foreign_keys
before insert or update on public.merchant_rules
for each row execute function public.validate_household_foreign_keys();

create trigger expenses_validate_household_foreign_keys
before insert or update on public.expenses
for each row execute function public.validate_household_foreign_keys();

create trigger budget_category_limits_validate_household_foreign_keys
before insert or update on public.budget_category_limits
for each row execute function public.validate_household_foreign_keys();

create function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.household_members as member
    where member.household_id = target_household_id
      and member.user_id = auth.uid()
  );
$$;

revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;

alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invitations enable row level security;
alter table public.categories enable row level security;
alter table public.merchant_rules enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.budget_category_limits enable row level security;
alter table public.expenses enable row level security;
alter table public.settlements enable row level security;
alter table public.exchange_rates enable row level security;

create policy households_select_member on public.households
for select to authenticated using (public.is_household_member(id));
create policy households_update_member on public.households
for update to authenticated using (public.is_household_member(id)) with check (public.is_household_member(id));

create policy profiles_select_cohousehold on public.profiles
for select to authenticated using (
  id = auth.uid() or exists (
    select 1
    from public.household_members as target_member
    where target_member.user_id = profiles.id
      and public.is_household_member(target_member.household_id)
  )
);
create policy profiles_insert_self on public.profiles
for insert to authenticated with check (id = auth.uid());
create policy profiles_update_self on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy household_members_select_member on public.household_members
for select to authenticated using (public.is_household_member(household_id));

create policy household_invitations_select_member on public.household_invitations
for select to authenticated using (public.is_household_member(household_id));

create policy categories_member_access on public.categories
for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy merchant_rules_member_access on public.merchant_rules
for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy monthly_budgets_member_access on public.monthly_budgets
for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy budget_category_limits_member_access on public.budget_category_limits
for all to authenticated using (
  exists (select 1 from public.monthly_budgets b where b.id = monthly_budget_id and public.is_household_member(b.household_id))
) with check (
  exists (select 1 from public.monthly_budgets b where b.id = monthly_budget_id and public.is_household_member(b.household_id))
);
create policy expenses_select_member on public.expenses
for select to authenticated using (public.is_household_member(household_id));
create policy expenses_insert_member on public.expenses
for insert to authenticated with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy expenses_update_member on public.expenses
for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy expenses_delete_member on public.expenses
for delete to authenticated using (public.is_household_member(household_id));
create policy settlements_member_access on public.settlements
for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy exchange_rates_select_authenticated on public.exchange_rates
for select to authenticated using (true);

revoke all on table public.households, public.profiles, public.household_members,
  public.household_invitations, public.categories, public.merchant_rules,
  public.monthly_budgets, public.budget_category_limits, public.expenses,
  public.settlements, public.exchange_rates from anon;
grant select, insert, update, delete on table public.households, public.profiles,
  public.household_members, public.household_invitations, public.categories,
  public.merchant_rules, public.monthly_budgets, public.budget_category_limits,
  public.expenses, public.settlements to authenticated;
grant select on table public.exchange_rates to authenticated;

create function public.bootstrap_household(household_name text, invited_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', current_setting('request.jwt.claim.email', true), '')));
  normalized_invited_email text := lower(btrim(invited_email));
  new_household_id uuid;
  profile_name text := btrim(coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', split_part(current_email, '@', 1), 'Ilya'));
begin
  if current_user_id is null then
    raise exception 'authentication is required';
  end if;
  if btrim(coalesce(household_name, '')) = '' then
    raise exception 'household name is required';
  end if;
  if normalized_invited_email = '' or position('@' in normalized_invited_email) = 0 then
    raise exception 'a valid invited email is required';
  end if;
  if current_email = '' then
    raise exception 'an authenticated email is required';
  end if;
  if normalized_invited_email = current_email then
    raise exception 'the invited email must belong to Masha';
  end if;
  if exists (select 1 from public.household_members where user_id = current_user_id) then
    raise exception 'a user can only bootstrap one household';
  end if;

  insert into public.households (name) values (btrim(household_name)) returning id into new_household_id;
  insert into public.profiles (id, display_name) values (current_user_id, profile_name)
  on conflict (id) do update set display_name = excluded.display_name;
  insert into public.household_members (household_id, user_id, person_key)
  values (new_household_id, current_user_id, 'ilya');
  insert into public.household_invitations (household_id, email, person_key)
  values (new_household_id, normalized_invited_email, 'masha');
  insert into public.categories (household_id, name, normalized_name) values
    (new_household_id, 'Продукты', 'продукты'),
    (new_household_id, 'Кафе и рестораны', 'кафе и рестораны'),
    (new_household_id, 'Транспорт', 'транспорт'),
    (new_household_id, 'Дом', 'дом'),
    (new_household_id, 'Здоровье', 'здоровье'),
    (new_household_id, 'Связь', 'связь'),
    (new_household_id, 'Развлечения', 'развлечения'),
    (new_household_id, 'Прочее', 'прочее');

  return new_household_id;
end;
$$;

create function public.accept_household_invitation()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', current_setting('request.jwt.claim.email', true), '')));
  invitation public.household_invitations%rowtype;
  profile_name text := btrim(coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', split_part(current_email, '@', 1), 'Masha'));
begin
  if current_user_id is null or current_email = '' then
    raise exception 'an authenticated email is required';
  end if;
  if exists (select 1 from public.household_members where user_id = current_user_id) then
    raise exception 'user already belongs to a household';
  end if;

  select * into invitation
  from public.household_invitations
  where email = current_email and accepted_at is null
  for update;
  if not found then
    raise exception 'no pending invitation exists for this email';
  end if;

  insert into public.profiles (id, display_name) values (current_user_id, profile_name)
  on conflict (id) do update set display_name = excluded.display_name;
  insert into public.household_members (household_id, user_id, person_key)
  values (invitation.household_id, current_user_id, 'masha');
  update public.household_invitations set accepted_at = now() where id = invitation.id;

  return invitation.household_id;
end;
$$;

revoke all on function public.bootstrap_household(text, text) from public;
revoke all on function public.accept_household_invitation() from public;
grant execute on function public.bootstrap_household(text, text) to authenticated;
grant execute on function public.accept_household_invitation() to authenticated;
