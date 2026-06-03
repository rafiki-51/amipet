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

alter table public.pet_vaccinations enable row level security;

grant select, insert, update, delete on public.pet_vaccinations to authenticated;
grant select, insert, update, delete on public.pet_vaccinations to service_role;

create policy "Users can read own pet vaccinations"
on public.pet_vaccinations
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own pet vaccinations"
on public.pet_vaccinations
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own pet vaccinations"
on public.pet_vaccinations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own pet vaccinations"
on public.pet_vaccinations
for delete
to authenticated
using (auth.uid() = user_id);
