begin;

create or replace function public.link_order_to_customer_manual(
  p_order_id uuid,
  p_target_user_id uuid,
  p_changed_by uuid
)
returns table (
  order_id uuid,
  order_number text,
  user_id uuid,
  user_linked_at timestamptz,
  user_link_source text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
begin
  if p_order_id is null
    or p_target_user_id is null
    or p_changed_by is null
    or not exists (
      select 1
      from auth.users u
      where u.id = p_changed_by
    )
  then
    raise exception 'INVALID_PAYLOAD';
  end if;

  if not exists (
    select 1
    from auth.users u
    join public.profiles pr on pr.id = u.id
    where u.id = p_target_user_id
      and pr.role = 'customer'
  ) then
    raise exception 'INVALID_TARGET_USER';
  end if;

  select
    o.id,
    o.order_number,
    o.user_id
  into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.user_id is not null then
    raise exception 'ORDER_ALREADY_LINKED';
  end if;

  update public.orders o
  set
    user_id = p_target_user_id,
    user_linked_at = now(),
    user_link_source = 'manual-support'
  where o.id = p_order_id
    and o.user_id is null
  returning
    o.id,
    o.order_number,
    o.user_id,
    o.user_linked_at,
    o.user_link_source
  into
    order_id,
    order_number,
    user_id,
    user_linked_at,
    user_link_source;

  if not found then
    raise exception 'ORDER_ALREADY_LINKED';
  end if;

  return next;
end;
$$;

revoke all on function public.link_order_to_customer_manual(
  uuid,
  uuid,
  uuid
) from public;

revoke all on function public.link_order_to_customer_manual(
  uuid,
  uuid,
  uuid
) from anon;

revoke all on function public.link_order_to_customer_manual(
  uuid,
  uuid,
  uuid
) from authenticated;

grant execute on function public.link_order_to_customer_manual(
  uuid,
  uuid,
  uuid
) to service_role;

commit;
