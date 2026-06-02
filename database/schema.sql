-- Amipet initial Supabase/PostgreSQL schema - revised version

create extension if not exists pgcrypto;

-- Updated timestamp helper
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Delivery zones
create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_delivery_zones_updated_at
before update on public.delivery_zones
for each row execute function public.set_updated_at();

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  price integer not null check (price >= 0),
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  pet_type text not null check (pet_type in ('perro', 'gato')),
  category text not null check (
    category in (
      'alimento-seco',
      'alimento-humedo',
      'snacks',
      'accesorios'
    )
  ),
  weight text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_slug_idx on public.products (slug);
create index products_active_idx on public.products (is_active);
create index products_pet_type_idx on public.products (pet_type);
create index products_category_idx on public.products (category);

create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- Customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_phone_idx on public.customers (phone);

create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

-- Addresses
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  delivery_zone_id uuid not null references public.delivery_zones(id),
  address text not null,
  delivery_references text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index addresses_customer_id_idx on public.addresses (customer_id);
create index addresses_delivery_zone_id_idx on public.addresses (delivery_zone_id);

create trigger set_addresses_updated_at
before update on public.addresses
for each row execute function public.set_updated_at();

-- Pets
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  species text not null,
  sex text not null default 'unknown' check (sex in ('male', 'female', 'unknown')),
  breed text,
  birth_date date,
  weight numeric,
  allergies text,
  current_food text,
  care_notes text,
  archived_at timestamptz,
  archived_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pets_user_id_idx on public.pets (user_id);

create trigger set_pets_updated_at
before update on public.pets
for each row execute function public.set_updated_at();

-- Orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.customers(id),
  address_id uuid not null references public.addresses(id),
  status text not null default 'recibido' check (
    status in (
      'recibido',
      'preparando',
      'en-ruta',
      'entregado',
      'cancelado'
    )
  ),
  payment_method text not null check (
    payment_method in (
      'sinpe-movil',
      'efectivo-contra-entrega',
      'coordinar-whatsapp'
    )
  ),
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  total integer not null check (total >= 0),
  notes text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_order_number_idx on public.orders (order_number);
create index orders_customer_id_idx on public.orders (customer_id);
create index orders_address_id_idx on public.orders (address_id);
create index orders_status_idx on public.orders (status);
create index orders_payment_method_idx on public.orders (payment_method);
create index orders_created_at_idx on public.orders (created_at desc);

create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- Order items
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  subtotal integer not null check (subtotal >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

create trigger set_order_items_updated_at
before update on public.order_items
for each row execute function public.set_updated_at();

-- Profiles for future admin auth
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('admin', 'operator', 'customer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Customer account profiles
create table public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  full_name text not null,
  phone text,
  preferences jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_profiles_user_id_idx
on public.customer_profiles (user_id);

create trigger set_customer_profiles_updated_at
before update on public.customer_profiles
for each row execute function public.set_updated_at();

-- Customer saved addresses
create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delivery_zone_id uuid references public.delivery_zones(id),
  label text,
  address text not null,
  delivery_references text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_addresses_user_id_idx
on public.customer_addresses (user_id);

create index customer_addresses_delivery_zone_id_idx
on public.customer_addresses (delivery_zone_id);

create trigger set_customer_addresses_updated_at
before update on public.customer_addresses
for each row execute function public.set_updated_at();

-- Automatically create customer profile rows for new Auth users.
create or replace function public.handle_new_customer_user()
returns trigger
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'customer');

  insert into public.customer_profiles (user_id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );

  return new;
end;
$$ language plpgsql;

create trigger on_auth_user_created_create_customer_profile
after insert on auth.users
for each row execute function public.handle_new_customer_user();

-- Optional status history for auditing order status changes
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  previous_status text check (
    previous_status is null
    or previous_status in (
      'recibido',
      'preparando',
      'en-ruta',
      'entregado',
      'cancelado'
    )
  ),
  new_status text not null check (
    new_status in (
      'recibido',
      'preparando',
      'en-ruta',
      'entregado',
      'cancelado'
    )
  ),
  changed_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now()
);

create index order_status_history_order_id_idx
on public.order_status_history (order_id);

create index order_status_history_created_at_idx
on public.order_status_history (created_at desc);

create index order_status_history_changed_by_idx
on public.order_status_history (changed_by);

-- RLS
alter table public.products enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.customers enable row level security;
alter table public.addresses enable row level security;
alter table public.pets enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.profiles enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.order_status_history enable row level security;

-- Public read for active products only.
grant select on public.products to anon, authenticated;
grant select on public.products to service_role;

create policy "Public can read active products"
on public.products
for select
to anon, authenticated
using (is_active = true);

-- Public read for active delivery zones only.
grant select on public.delivery_zones to anon, authenticated;
grant select on public.delivery_zones to service_role;

create policy "Public can read active delivery zones"
on public.delivery_zones
for select
to anon, authenticated
using (is_active = true);

-- Customers, addresses, orders, order_items and order_status_history:
-- no public policies for MVP.
-- With RLS enabled and no policies, direct client access is denied.
-- Access should happen later through server-side API routes using service role
-- or through authenticated admin policies.
grant select, insert, update, delete on public.customers to service_role;
grant select, insert, update, delete on public.addresses to service_role;
grant select, insert, update, delete on public.orders to service_role;
grant select, insert, update, delete on public.order_items to service_role;
grant select, insert, update, delete on public.order_status_history to service_role;

-- Pets: authenticated users can manage only their own pets.
grant select, insert, update, delete on public.pets to authenticated;
grant select, insert, update, delete on public.pets to service_role;

create policy "Users can read own pets"
on public.pets
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own pets"
on public.pets
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own pets"
on public.pets
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own pets"
on public.pets
for delete
to authenticated
using (auth.uid() = user_id);

-- Profiles: users can read only their own profile.
grant select on public.profiles to authenticated;
grant insert on public.profiles to authenticated;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can insert own customer profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id and role = 'customer');

-- Customer profiles: authenticated users can manage only their own data.
grant select, insert, update on public.customer_profiles to authenticated;
grant select, insert, update, delete on public.customer_profiles to service_role;

create policy "Users can read own customer profile"
on public.customer_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own customer profile"
on public.customer_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own customer profile"
on public.customer_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Customer addresses: authenticated users can manage only their own addresses.
grant select, insert, update, delete on public.customer_addresses to authenticated;
grant select, insert, update, delete on public.customer_addresses to service_role;

create policy "Users can read own customer addresses"
on public.customer_addresses
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own customer addresses"
on public.customer_addresses
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own customer addresses"
on public.customer_addresses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own customer addresses"
on public.customer_addresses
for delete
to authenticated
using (auth.uid() = user_id);

-- Important:
-- No self-update policy for profiles in this MVP schema.
-- Role changes must be done from trusted server-side code using the service role,
-- or manually by an owner in the Supabase dashboard.
