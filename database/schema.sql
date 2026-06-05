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

-- Pet weight history
create table public.pet_weight_logs (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  weight numeric not null check (weight > 0),
  measured_at date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pet_weight_logs_pet_id_measured_at_idx
on public.pet_weight_logs (pet_id, measured_at desc);

create index pet_weight_logs_user_id_idx
on public.pet_weight_logs (user_id);

create trigger set_pet_weight_logs_updated_at
before update on public.pet_weight_logs
for each row execute function public.set_updated_at();

-- Pet vaccinations
create table public.pet_vaccinations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vaccine_name text not null,
  administered_at date not null,
  next_due_at date,
  clinic_name text,
  veterinarian_name text,
  batch_number text,
  notes text,
  status text not null default 'applied' check (
    status in ('applied', 'scheduled', 'skipped')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pet_vaccinations_pet_id_administered_at_idx
on public.pet_vaccinations (pet_id, administered_at desc);

create index pet_vaccinations_user_id_idx
on public.pet_vaccinations (user_id);

create index pet_vaccinations_user_id_next_due_at_idx
on public.pet_vaccinations (user_id, next_due_at);

create trigger set_pet_vaccinations_updated_at
before update on public.pet_vaccinations
for each row execute function public.set_updated_at();

-- Pet reminders
create table public.pet_reminders (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  reminder_type text not null check (
    reminder_type in (
      'vaccine',
      'medication',
      'vet_visit',
      'deworming',
      'grooming',
      'feeding',
      'other'
    )
  ),
  due_at date not null,
  completed_at timestamptz,
  status text not null default 'pending' check (
    status in ('pending', 'completed', 'canceled')
  ),
  source text not null default 'manual' check (
    source in ('manual', 'vaccination')
  ),
  related_vaccination_id uuid references public.pet_vaccinations(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pet_reminders_pet_id_due_at_idx
on public.pet_reminders (pet_id, due_at asc);

create index pet_reminders_user_id_idx
on public.pet_reminders (user_id);

create index pet_reminders_user_id_status_due_at_idx
on public.pet_reminders (user_id, status, due_at asc);

create index pet_reminders_user_id_due_at_idx
on public.pet_reminders (user_id, due_at asc);

create index pet_reminders_related_vaccination_id_idx
on public.pet_reminders (related_vaccination_id);

create trigger set_pet_reminders_updated_at
before update on public.pet_reminders
for each row execute function public.set_updated_at();

-- Pet medications
create table public.pet_medications (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  medication_name text not null,
  medication_type text not null default 'medication' check (
    medication_type in (
      'medication',
      'supplement',
      'antiparasitic',
      'vitamin',
      'dermatological',
      'other'
    )
  ),
  dosage text,
  frequency text,
  route text,
  start_date date not null,
  end_date date,
  status text not null default 'active' check (
    status in ('active', 'completed', 'paused', 'canceled')
  ),
  prescribed_by text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pet_medications_end_date_check check (
    end_date is null or end_date >= start_date
  )
);

create index pet_medications_pet_id_start_date_idx
on public.pet_medications (pet_id, start_date desc);

create index pet_medications_user_id_idx
on public.pet_medications (user_id);

create index pet_medications_user_id_status_start_date_idx
on public.pet_medications (user_id, status, start_date desc);

create index pet_medications_user_id_status_end_date_idx
on public.pet_medications (user_id, status, end_date);

create index pet_medications_pet_id_status_idx
on public.pet_medications (pet_id, status);

create trigger set_pet_medications_updated_at
before update on public.pet_medications
for each row execute function public.set_updated_at();

-- Pet medical records
create table public.pet_medical_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_type text not null check (
    record_type in (
      'consultation',
      'symptom',
      'diagnosis',
      'treatment',
      'procedure',
      'surgery',
      'emergency',
      'exam_result',
      'follow_up',
      'note',
      'other'
    )
  ),
  title text not null,
  occurred_at date not null,
  symptoms text,
  diagnosis text,
  treatment text,
  clinic_name text,
  veterinarian_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pet_medical_records_pet_id_occurred_at_idx
on public.pet_medical_records (pet_id, occurred_at desc);

create index pet_medical_records_user_id_idx
on public.pet_medical_records (user_id);

create index pet_medical_records_user_id_occurred_at_idx
on public.pet_medical_records (user_id, occurred_at desc);

create index pet_medical_records_user_id_record_type_occurred_at_idx
on public.pet_medical_records (user_id, record_type, occurred_at desc);

create index pet_medical_records_pet_id_record_type_idx
on public.pet_medical_records (pet_id, record_type);

create trigger set_pet_medical_records_updated_at
before update on public.pet_medical_records
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
alter table public.pet_weight_logs enable row level security;
alter table public.pet_vaccinations enable row level security;
alter table public.pet_reminders enable row level security;
alter table public.pet_medications enable row level security;
alter table public.pet_medical_records enable row level security;
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

-- Pet weight logs: authenticated users can manage only their own pet weight history.
grant select, insert, update, delete on public.pet_weight_logs to authenticated;
grant select, insert, update, delete on public.pet_weight_logs to service_role;

create policy "Users can read own pet weight logs"
on public.pet_weight_logs
for select
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

create policy "Users can insert own pet weight logs"
on public.pet_weight_logs
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

create policy "Users can update own pet weight logs"
on public.pet_weight_logs
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

create policy "Users can delete own pet weight logs"
on public.pet_weight_logs
for delete
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

-- Pet vaccinations: authenticated users can manage only their own pet vaccination history.
grant select, insert, update, delete on public.pet_vaccinations to authenticated;
grant select, insert, update, delete on public.pet_vaccinations to service_role;

create policy "Users can read own pet vaccinations"
on public.pet_vaccinations
for select
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

create policy "Users can insert own pet vaccinations"
on public.pet_vaccinations
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

create policy "Users can update own pet vaccinations"
on public.pet_vaccinations
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

create policy "Users can delete own pet vaccinations"
on public.pet_vaccinations
for delete
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

-- Pet reminders: authenticated users can manage only their own pet reminders.
grant select, insert, update, delete on public.pet_reminders to authenticated;
grant select, insert, update, delete on public.pet_reminders to service_role;

create policy "Users can read own pet reminders"
on public.pet_reminders
for select
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

create policy "Users can insert own pet reminders"
on public.pet_reminders
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

create policy "Users can update own pet reminders"
on public.pet_reminders
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

create policy "Users can delete own pet reminders"
on public.pet_reminders
for delete
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

-- Pet medications: authenticated users can manage only their own pet medications.
grant select, insert, update, delete on public.pet_medications to authenticated;
grant select, insert, update, delete on public.pet_medications to service_role;

create policy "Users can read own pet medications"
on public.pet_medications
for select
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

create policy "Users can insert own pet medications"
on public.pet_medications
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

create policy "Users can update own pet medications"
on public.pet_medications
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

create policy "Users can delete own pet medications"
on public.pet_medications
for delete
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

-- Pet medical records: authenticated users can manage only their own pet medical records.
grant select, insert, update, delete on public.pet_medical_records to authenticated;
grant select, insert, update, delete on public.pet_medical_records to service_role;

create policy "Users can read own pet medical records"
on public.pet_medical_records
for select
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

create policy "Users can insert own pet medical records"
on public.pet_medical_records
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

create policy "Users can update own pet medical records"
on public.pet_medical_records
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

create policy "Users can delete own pet medical records"
on public.pet_medical_records
for delete
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_id
    and pets.user_id = auth.uid()
  )
);

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
