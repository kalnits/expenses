create function public.merge_category(source_category_id uuid, target_category_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_household_id uuid;
  target_household_id uuid;
begin
  if source_category_id = target_category_id then
    raise exception 'source and target categories must differ';
  end if;

  select household_id into source_household_id from public.categories where id = source_category_id for update;
  select household_id into target_household_id from public.categories where id = target_category_id and is_active for update;

  if source_household_id is null or target_household_id is null or source_household_id <> target_household_id then
    raise exception 'categories must exist in the same household and target must be active';
  end if;
  if not public.is_household_member(source_household_id) then
    raise exception 'household membership is required';
  end if;

  update public.expenses set category_id = target_category_id where category_id = source_category_id;

  delete from public.merchant_rules source_rule
  where source_rule.category_id = source_category_id
    and exists (
      select 1 from public.merchant_rules target_rule
      where target_rule.household_id = source_rule.household_id
        and target_rule.normalized_merchant = source_rule.normalized_merchant
        and target_rule.category_id = target_category_id
        and target_rule.id < source_rule.id
    );
  update public.merchant_rules set category_id = target_category_id where category_id = source_category_id;

  insert into public.budget_category_limits (monthly_budget_id, category_id, limit_satang)
  select monthly_budget_id, target_category_id, limit_satang
  from public.budget_category_limits
  where category_id = source_category_id
  on conflict (monthly_budget_id, category_id) do update
    set limit_satang = public.budget_category_limits.limit_satang + excluded.limit_satang;
  delete from public.budget_category_limits where category_id = source_category_id;

  update public.categories set is_active = false where id = source_category_id;
end;
$$;

revoke all on function public.merge_category(uuid, uuid) from public;
grant execute on function public.merge_category(uuid, uuid) to authenticated;
