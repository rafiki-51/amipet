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

alter table public.pet_medications enable row level security;

grant select, insert, update, delete on public.pet_medications to authenticated;
grant select, insert, update, delete on public.pet_medications to service_role;

create policy "Users can read own pet medications"
on public.pet_medications
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own pet medications"
on public.pet_medications
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own pet medications"
on public.pet_medications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own pet medications"
on public.pet_medications
for delete
to authenticated
using (auth.uid() = user_id);
