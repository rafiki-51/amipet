alter table public.orders
add column if not exists idempotency_key text,
add column if not exists idempotency_payload_hash text;

create unique index if not exists orders_idempotency_key_unique_idx
on public.orders (idempotency_key)
where idempotency_key is not null;

create index if not exists orders_customer_id_created_at_idx
on public.orders (customer_id, created_at desc);
