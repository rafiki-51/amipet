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

alter table public.pet_weight_logs enable row level security;

grant select, insert, update, delete on public.pet_weight_logs to authenticated;
grant select, insert, update, delete on public.pet_weight_logs to service_role;

create policy "Users can read own pet weight logs"
on public.pet_weight_logs
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own pet weight logs"
on public.pet_weight_logs
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own pet weight logs"
on public.pet_weight_logs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own pet weight logs"
on public.pet_weight_logs
for delete
to authenticated
using (auth.uid() = user_id);
