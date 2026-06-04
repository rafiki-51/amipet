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

alter table public.pet_medical_records enable row level security;

grant select, insert, update, delete on public.pet_medical_records to authenticated;
grant select, insert, update, delete on public.pet_medical_records to service_role;

create policy "Users can read own pet medical records"
on public.pet_medical_records
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own pet medical records"
on public.pet_medical_records
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own pet medical records"
on public.pet_medical_records
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own pet medical records"
on public.pet_medical_records
for delete
to authenticated
using (auth.uid() = user_id);
