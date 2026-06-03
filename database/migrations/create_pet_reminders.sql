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

alter table public.pet_reminders enable row level security;

grant select, insert, update, delete on public.pet_reminders to authenticated;
grant select, insert, update, delete on public.pet_reminders to service_role;

create policy "Users can read own pet reminders"
on public.pet_reminders
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own pet reminders"
on public.pet_reminders
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own pet reminders"
on public.pet_reminders
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own pet reminders"
on public.pet_reminders
for delete
to authenticated
using (auth.uid() = user_id);
