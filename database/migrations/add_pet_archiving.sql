alter table public.pets
add column archived_at timestamptz,
add column archived_reason text;
