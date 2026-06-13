alter table public.orders
add column stock_deducted_at timestamptz null,
add column stock_restored_at timestamptz null,
add column canceled_at timestamptz null,
add column cancellation_reason text null,
add constraint orders_stock_restoration_requires_deduction_check
check (stock_restored_at is null or stock_deducted_at is not null);

create or replace function public.create_checkout_order(
  p_customer_name text,
  p_customer_phone text,
  p_zone_name text,
  p_address text,
  p_references text,
  p_payment_method text,
  p_notes text,
  p_idempotency_key text,
  p_idempotency_payload_hash text,
  p_items jsonb
)
returns table (
  order_id uuid,
  order_number text,
  status text,
  subtotal integer,
  delivery_fee integer,
  total integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_order record;
  v_delivery_zone record;
  v_customer_id uuid;
  v_address_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_subtotal integer;
  v_total integer;
  v_normalized_items jsonb;
  v_expected_product_count integer;
  v_updated_product_count integer;
begin
  if nullif(trim(coalesce(p_idempotency_key, '')), '') is null
    or nullif(trim(coalesce(p_idempotency_payload_hash, '')), '') is null
    or nullif(trim(coalesce(p_customer_name, '')), '') is null
    or nullif(trim(coalesce(p_customer_phone, '')), '') is null
    or nullif(trim(coalesce(p_zone_name, '')), '') is null
    or nullif(trim(coalesce(p_address, '')), '') is null
  then
    raise exception 'INVALID_PAYLOAD';
  end if;

  if p_payment_method not in (
    'sinpe-movil',
    'efectivo-contra-entrega',
    'coordinar-whatsapp'
  ) then
    raise exception 'INVALID_PAYLOAD';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0
  then
    raise exception 'INVALID_PAYLOAD';
  end if;

  -- Serialize concurrent retries that use the same idempotency key.
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));

  select
    o.id,
    o.order_number,
    o.status,
    o.subtotal,
    o.delivery_fee,
    o.total,
    o.idempotency_payload_hash
  into v_existing_order
  from public.orders o
  where o.idempotency_key = p_idempotency_key
  limit 1;

  if found then
    if v_existing_order.idempotency_payload_hash is distinct from p_idempotency_payload_hash then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;

    order_id := v_existing_order.id;
    order_number := v_existing_order.order_number;
    status := v_existing_order.status;
    subtotal := v_existing_order.subtotal;
    delivery_fee := v_existing_order.delivery_fee;
    total := v_existing_order.total;
    return next;
    return;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as item
    where jsonb_typeof(item->'product_id') <> 'string'
      or jsonb_typeof(item->'quantity') <> 'number'
      or (item->>'product_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or case
        when jsonb_typeof(item->'quantity') = 'number' then
          ((item->>'quantity')::numeric % 1) <> 0
          or (item->>'quantity')::integer < 1
          or (item->>'quantity')::integer > 99
        else false
      end
  ) then
    raise exception 'INVALID_PAYLOAD';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'product_id', normalized.product_id,
      'quantity', normalized.quantity
    )
    order by normalized.product_id
  )
  into v_normalized_items
  from (
    select
      (item->>'product_id')::uuid as product_id,
      sum((item->>'quantity')::integer) as quantity
    from jsonb_array_elements(p_items) as item
    group by (item->>'product_id')::uuid
  ) normalized;

  select jsonb_array_length(v_normalized_items)
  into v_expected_product_count;

  select dz.id, dz.delivery_fee
  into v_delivery_zone
  from public.delivery_zones dz
  where dz.name = p_zone_name
    and dz.is_active = true
  limit 1;

  if not found then
    raise exception 'DELIVERY_ZONE_NOT_FOUND';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(v_normalized_items)
      as normalized_items(product_id uuid, quantity bigint)
    where quantity > 99
  ) then
    raise exception 'INVALID_PAYLOAD';
  end if;

  -- Lock every requested product in a stable order before checking stock.
  perform p.id
  from public.products p
  join jsonb_to_recordset(v_normalized_items)
    as normalized_items(product_id uuid, quantity integer)
    on p.id = normalized_items.product_id
  order by p.id
  for update of p;

  if exists (
    select 1
    from jsonb_to_recordset(v_normalized_items)
      as ni(product_id uuid, quantity integer)
    left join public.products p
      on p.id = ni.product_id
      and p.is_active = true
    where p.id is null
  ) then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(v_normalized_items)
      as ni(product_id uuid, quantity integer)
    join public.products p on p.id = ni.product_id
    where p.stock < ni.quantity
  ) then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  select coalesce(sum(p.price * ni.quantity), 0)::integer
  into v_subtotal
  from jsonb_to_recordset(v_normalized_items)
    as ni(product_id uuid, quantity integer)
  join public.products p
    on p.id = ni.product_id
    and p.is_active = true;

  v_total := v_subtotal + v_delivery_zone.delivery_fee;

  select c.id
  into v_customer_id
  from public.customers c
  where c.phone = p_customer_phone
  limit 1;

  if not found then
    insert into public.customers (name, phone)
    values (p_customer_name, p_customer_phone)
    returning id into v_customer_id;
  end if;

  insert into public.addresses (
    customer_id,
    delivery_zone_id,
    address,
    delivery_references
  )
  values (
    v_customer_id,
    v_delivery_zone.id,
    p_address,
    nullif(trim(coalesce(p_references, '')), '')
  )
  returning id into v_address_id;

  v_order_number := 'AMI-'
    || to_char(now(), 'YYYYMMDD')
    || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  begin
    insert into public.orders (
      order_number,
      customer_id,
      address_id,
      status,
      payment_method,
      payment_status,
      subtotal,
      delivery_fee,
      total,
      notes,
      idempotency_key,
      idempotency_payload_hash
    )
    values (
      v_order_number,
      v_customer_id,
      v_address_id,
      'recibido',
      p_payment_method,
      'pending',
      v_subtotal,
      v_delivery_zone.delivery_fee,
      v_total,
      nullif(trim(coalesce(p_notes, '')), ''),
      p_idempotency_key,
      p_idempotency_payload_hash
    )
    returning id into v_order_id;
  exception
    when unique_violation then
      select
        o.id,
        o.order_number,
        o.status,
        o.subtotal,
        o.delivery_fee,
        o.total,
        o.idempotency_payload_hash
      into v_existing_order
      from public.orders o
      where o.idempotency_key = p_idempotency_key
      limit 1;

      if found and v_existing_order.idempotency_payload_hash = p_idempotency_payload_hash then
        order_id := v_existing_order.id;
        order_number := v_existing_order.order_number;
        status := v_existing_order.status;
        subtotal := v_existing_order.subtotal;
        delivery_fee := v_existing_order.delivery_fee;
        total := v_existing_order.total;
        return next;
        return;
      end if;

      if found then
        raise exception 'IDEMPOTENCY_CONFLICT';
      end if;

      raise;
  end;

  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    subtotal
  )
  select
    v_order_id,
    p.id,
    p.name,
    ni.quantity,
    p.price,
    p.price * ni.quantity
  from jsonb_to_recordset(v_normalized_items)
    as ni(product_id uuid, quantity integer)
  join public.products p
    on p.id = ni.product_id
    and p.is_active = true;

  update public.products p
  set stock = p.stock - ni.quantity
  from jsonb_to_recordset(v_normalized_items)
    as ni(product_id uuid, quantity integer)
  where p.id = ni.product_id
    and p.is_active = true
    and p.stock >= ni.quantity;

  get diagnostics v_updated_product_count = row_count;

  if v_updated_product_count <> v_expected_product_count then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  update public.orders
  set stock_deducted_at = now()
  where id = v_order_id;

  insert into public.order_status_history (
    order_id,
    previous_status,
    new_status,
    changed_by,
    notes
  )
  values (
    v_order_id,
    null,
    'recibido',
    null,
    'Pedido creado desde checkout.'
  );

  order_id := v_order_id;
  order_number := v_order_number;
  status := 'recibido';
  subtotal := v_subtotal;
  delivery_fee := v_delivery_zone.delivery_fee;
  total := v_total;
  return next;
end;
$$;

revoke all on function public.create_checkout_order(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) from public;

revoke all on function public.create_checkout_order(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) from anon;

revoke all on function public.create_checkout_order(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) from authenticated;

grant execute on function public.create_checkout_order(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to service_role;

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
