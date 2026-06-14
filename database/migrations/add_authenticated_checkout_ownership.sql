begin;

drop function if exists public.create_checkout_order(
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
);

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
  p_items jsonb,
  p_user_id uuid default null
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

  if p_user_id is not null
    and not exists (
      select 1
      from auth.users u
      join public.profiles pr on pr.id = u.id
      where u.id = p_user_id
        and pr.role = 'customer'
    )
  then
    raise exception 'INVALID_ORDER_OWNER';
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
    o.idempotency_payload_hash,
    o.user_id
  into v_existing_order
  from public.orders o
  where o.idempotency_key = p_idempotency_key
  limit 1;

  if found then
    if v_existing_order.idempotency_payload_hash is distinct from p_idempotency_payload_hash
      or v_existing_order.user_id is distinct from p_user_id
    then
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
      user_id,
      user_linked_at,
      user_link_source,
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
      p_user_id,
      case when p_user_id is not null then now() else null end,
      case when p_user_id is not null then 'authenticated-checkout' else null end,
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
        o.idempotency_payload_hash,
        o.user_id
      into v_existing_order
      from public.orders o
      where o.idempotency_key = p_idempotency_key
      limit 1;

      if found
        and v_existing_order.idempotency_payload_hash = p_idempotency_payload_hash
        and v_existing_order.user_id is not distinct from p_user_id
      then
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
  jsonb,
  uuid
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
  jsonb,
  uuid
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
  jsonb,
  uuid
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
  jsonb,
  uuid
) to service_role;

commit;

