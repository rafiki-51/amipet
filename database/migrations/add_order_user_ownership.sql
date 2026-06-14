alter table public.orders
add column user_id uuid null,
add column user_linked_at timestamptz null,
add column user_link_source text null,
add constraint orders_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete set null,
add constraint orders_user_link_source_check
  check (
    user_link_source is null
    or user_link_source in (
      'authenticated-checkout',
      'verified-email-claim',
      'manual-support',
      'historical-migration'
    )
  ),
add constraint orders_user_link_metadata_coherence_check
  check (
    (user_linked_at is null) = (user_link_source is null)
    and (
      user_id is null
      or (
        user_linked_at is not null
        and user_link_source is not null
      )
    )
  );

create index orders_user_id_created_at_id_idx
on public.orders (user_id, created_at desc, id desc)
where user_id is not null;
