drop policy if exists "Users can read own pet weight logs"
on public.pet_weight_logs;

drop policy if exists "Users can insert own pet weight logs"
on public.pet_weight_logs;

drop policy if exists "Users can update own pet weight logs"
on public.pet_weight_logs;

drop policy if exists "Users can delete own pet weight logs"
on public.pet_weight_logs;

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

drop policy if exists "Users can read own pet vaccinations"
on public.pet_vaccinations;

drop policy if exists "Users can insert own pet vaccinations"
on public.pet_vaccinations;

drop policy if exists "Users can update own pet vaccinations"
on public.pet_vaccinations;

drop policy if exists "Users can delete own pet vaccinations"
on public.pet_vaccinations;

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

drop policy if exists "Users can read own pet reminders"
on public.pet_reminders;

drop policy if exists "Users can insert own pet reminders"
on public.pet_reminders;

drop policy if exists "Users can update own pet reminders"
on public.pet_reminders;

drop policy if exists "Users can delete own pet reminders"
on public.pet_reminders;

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

drop policy if exists "Users can read own pet medications"
on public.pet_medications;

drop policy if exists "Users can insert own pet medications"
on public.pet_medications;

drop policy if exists "Users can update own pet medications"
on public.pet_medications;

drop policy if exists "Users can delete own pet medications"
on public.pet_medications;

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

drop policy if exists "Users can read own pet medical records"
on public.pet_medical_records;

drop policy if exists "Users can insert own pet medical records"
on public.pet_medical_records;

drop policy if exists "Users can update own pet medical records"
on public.pet_medical_records;

drop policy if exists "Users can delete own pet medical records"
on public.pet_medical_records;

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
