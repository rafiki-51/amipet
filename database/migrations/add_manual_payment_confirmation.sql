alter table public.orders
add column paid_at timestamptz null,
add column payment_confirmed_by uuid null references auth.users(id);

create or replace function public.transition_order_status(
  p_order_id uuid,
  p_next_status text,
  p_changed_by uuid,
  p_cancellation_reason text default null
)
returns table (
  order_id uuid,
  previous_status text,
  status text,
  payment_status text,
  updated_at timestamptz,
  canceled_at timestamptz,
  stock_restored_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_previous_status text;
  v_expected_product_count integer;
  v_updated_product_count integer;
  v_stock_restored_at timestamptz;
begin
  if p_order_id is null
    or p_changed_by is null
    or p_next_status is null
    or p_next_status not in (
      'recibido',
      'preparando',
      'en-ruta',
      'entregado',
      'cancelado'
    )
    or not exists (
      select 1
      from auth.users u
      where u.id = p_changed_by
    )
  then
    raise exception 'INVALID_PAYLOAD';
  end if;

  select
    o.id,
    o.status,
    o.payment_status,
    o.stock_deducted_at,
    o.stock_restored_at,
    o.canceled_at,
    o.updated_at
  into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  v_previous_status := v_order.status;

  if v_previous_status = p_next_status then
    order_id := v_order.id;
    previous_status := v_previous_status;
    status := v_order.status;
    payment_status := v_order.payment_status;
    updated_at := v_order.updated_at;
    canceled_at := v_order.canceled_at;
    stock_restored_at := v_order.stock_restored_at;
    return next;
    return;
  end if;

  if not (
    (v_previous_status = 'recibido' and p_next_status in ('preparando', 'cancelado'))
    or (v_previous_status = 'preparando' and p_next_status in ('en-ruta', 'cancelado'))
    or (v_previous_status = 'en-ruta' and p_next_status in ('entregado', 'cancelado'))
  ) then
    raise exception 'INVALID_ORDER_TRANSITION';
  end if;

  if v_previous_status = 'en-ruta'
    and p_next_status = 'entregado'
    and v_order.payment_status <> 'paid'
  then
    raise exception 'PAYMENT_REQUIRED';
  end if;

  if p_next_status = 'cancelado' then
    if nullif(trim(coalesce(p_cancellation_reason, '')), '') is null then
      raise exception 'CANCELLATION_REASON_REQUIRED';
    end if;

    if v_order.payment_status = 'paid' then
      raise exception 'PAID_ORDER_CANNOT_BE_CANCELED';
    end if;

    if v_order.stock_deducted_at is not null
      and v_order.stock_restored_at is null
    then
      if not exists (
        select 1
        from public.order_items oi
        where oi.order_id = p_order_id
      ) or exists (
        select 1
        from public.order_items oi
        where oi.order_id = p_order_id
          and oi.product_id is null
      ) then
        raise exception 'ORDER_ITEMS_NOT_RESTORABLE';
      end if;

      select count(*)::integer
      into v_expected_product_count
      from (
        select oi.product_id
        from public.order_items oi
        where oi.order_id = p_order_id
        group by oi.product_id
      ) restored_items;

      perform p.id
      from public.products p
      join (
        select oi.product_id
        from public.order_items oi
        where oi.order_id = p_order_id
        group by oi.product_id
      ) restored_items on restored_items.product_id = p.id
      order by p.id
      for update of p;

      update public.products p
      set stock = p.stock + restored_items.quantity
      from (
        select
          oi.product_id,
          sum(oi.quantity)::integer as quantity
        from public.order_items oi
        where oi.order_id = p_order_id
        group by oi.product_id
      ) restored_items
      where p.id = restored_items.product_id;

      get diagnostics v_updated_product_count = row_count;

      if v_updated_product_count <> v_expected_product_count then
        raise exception 'STOCK_RESTORE_FAILED';
      end if;

      v_stock_restored_at := now();
    end if;

    update public.orders o
    set
      status = 'cancelado',
      payment_status = case
        when o.payment_status = 'pending' then 'canceled'
        else o.payment_status
      end,
      canceled_at = now(),
      cancellation_reason = trim(p_cancellation_reason),
      stock_restored_at = coalesce(v_stock_restored_at, o.stock_restored_at)
    where o.id = p_order_id
    returning
      o.id,
      o.status,
      o.payment_status,
      o.updated_at,
      o.canceled_at,
      o.stock_restored_at
    into
      v_order.id,
      v_order.status,
      v_order.payment_status,
      v_order.updated_at,
      v_order.canceled_at,
      v_order.stock_restored_at;
  else
    update public.orders o
    set status = p_next_status
    where o.id = p_order_id
    returning
      o.id,
      o.status,
      o.payment_status,
      o.updated_at,
      o.canceled_at,
      o.stock_restored_at
    into
      v_order.id,
      v_order.status,
      v_order.payment_status,
      v_order.updated_at,
      v_order.canceled_at,
      v_order.stock_restored_at;
  end if;

  insert into public.order_status_history (
    order_id,
    previous_status,
    new_status,
    changed_by,
    notes
  )
  values (
    p_order_id,
    v_previous_status,
    p_next_status,
    p_changed_by,
    case
      when p_next_status = 'cancelado' then trim(p_cancellation_reason)
      else 'Estado actualizado mediante transición segura.'
    end
  );

  order_id := v_order.id;
  previous_status := v_previous_status;
  status := v_order.status;
  payment_status := v_order.payment_status;
  updated_at := v_order.updated_at;
  canceled_at := v_order.canceled_at;
  stock_restored_at := v_order.stock_restored_at;
  return next;
end;
$$;

revoke all on function public.transition_order_status(
  uuid,
  text,
  uuid,
  text
) from public;

revoke all on function public.transition_order_status(
  uuid,
  text,
  uuid,
  text
) from anon;

revoke all on function public.transition_order_status(
  uuid,
  text,
  uuid,
  text
) from authenticated;

grant execute on function public.transition_order_status(
  uuid,
  text,
  uuid,
  text
) to service_role;

create or replace function public.transition_order_payment_status(
  p_order_id uuid,
  p_next_payment_status text,
  p_changed_by uuid
)
returns table (
  order_id uuid,
  status text,
  previous_payment_status text,
  payment_status text,
  paid_at timestamptz,
  payment_confirmed_by uuid,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_previous_payment_status text;
begin
  if p_order_id is null
    or p_changed_by is null
    or p_next_payment_status is null
    or p_next_payment_status not in ('pending', 'paid', 'canceled')
    or not exists (
      select 1
      from auth.users u
      where u.id = p_changed_by
    )
  then
    raise exception 'INVALID_PAYLOAD';
  end if;

  select
    o.id,
    o.status,
    o.payment_status,
    o.paid_at,
    o.payment_confirmed_by,
    o.updated_at
  into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  v_previous_payment_status := v_order.payment_status;

  if v_order.status = 'cancelado'
    and p_next_payment_status = 'paid'
  then
    raise exception 'ORDER_CANCELED';
  end if;

  if v_previous_payment_status = 'paid'
    and p_next_payment_status = 'paid'
  then
    order_id := v_order.id;
    status := v_order.status;
    previous_payment_status := v_previous_payment_status;
    payment_status := v_order.payment_status;
    paid_at := v_order.paid_at;
    payment_confirmed_by := v_order.payment_confirmed_by;
    updated_at := v_order.updated_at;
    return next;
    return;
  end if;

  if not (
    v_previous_payment_status = 'pending'
    and p_next_payment_status = 'paid'
  ) then
    raise exception 'INVALID_PAYMENT_TRANSITION';
  end if;

  update public.orders o
  set
    payment_status = 'paid',
    paid_at = now(),
    payment_confirmed_by = p_changed_by
  where o.id = p_order_id
  returning
    o.id,
    o.status,
    o.payment_status,
    o.paid_at,
    o.payment_confirmed_by,
    o.updated_at
  into
    v_order.id,
    v_order.status,
    v_order.payment_status,
    v_order.paid_at,
    v_order.payment_confirmed_by,
    v_order.updated_at;

  order_id := v_order.id;
  status := v_order.status;
  previous_payment_status := v_previous_payment_status;
  payment_status := v_order.payment_status;
  paid_at := v_order.paid_at;
  payment_confirmed_by := v_order.payment_confirmed_by;
  updated_at := v_order.updated_at;
  return next;
end;
$$;

revoke all on function public.transition_order_payment_status(
  uuid,
  text,
  uuid
) from public;

revoke all on function public.transition_order_payment_status(
  uuid,
  text,
  uuid
) from anon;

revoke all on function public.transition_order_payment_status(
  uuid,
  text,
  uuid
) from authenticated;

grant execute on function public.transition_order_payment_status(
  uuid,
  text,
  uuid
) to service_role;
