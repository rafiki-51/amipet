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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pets_user_id_idx on public.pets (user_id);

create trigger set_pets_updated_at
before update on public.pets
for each row execute function public.set_updated_at();

alter table public.pets enable row level security;

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
