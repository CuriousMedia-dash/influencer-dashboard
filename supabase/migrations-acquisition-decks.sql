-- ─────────────────────────────────────────────────────────────────────
-- Per-genre outreach decks.
-- Run all three steps in the Supabase SQL editor, then do the storage
-- step (4) in the dashboard.
-- ─────────────────────────────────────────────────────────────────────

-- 1. The record of which deck belongs to which genre.
create table if not exists acquisition_decks (
  id uuid primary key default gen_random_uuid(),
  kind text not null,              -- 'creators' or 'influencers'
  category text not null,          -- the genre, e.g. 'Fiction'
  file_name text not null,
  mime_type text,
  file_size bigint,
  storage_path text not null,
  uploaded_at timestamptz default now(),
  uploaded_by uuid,
  unique (kind, category)
);

-- 2. Anyone signed in to the portal can read and change decks.
alter table acquisition_decks enable row level security;

drop policy if exists "acquisition_decks_read" on acquisition_decks;
create policy "acquisition_decks_read"
  on acquisition_decks for select
  to authenticated using (true);

drop policy if exists "acquisition_decks_write" on acquisition_decks;
create policy "acquisition_decks_write"
  on acquisition_decks for all
  to authenticated using (true) with check (true);


-- 3. The bucket the actual files live in.
insert into storage.buckets (id, name, public)
values ('acquisition-decks', 'acquisition-decks', false)
on conflict (id) do nothing;

drop policy if exists "deck_files_read" on storage.objects;
create policy "deck_files_read"
  on storage.objects for select
  to authenticated using (bucket_id = 'acquisition-decks');

drop policy if exists "deck_files_write" on storage.objects;
create policy "deck_files_write"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'acquisition-decks');

drop policy if exists "deck_files_update" on storage.objects;
create policy "deck_files_update"
  on storage.objects for update
  to authenticated using (bucket_id = 'acquisition-decks');

drop policy if exists "deck_files_delete" on storage.objects;
create policy "deck_files_delete"
  on storage.objects for delete
  to authenticated using (bucket_id = 'acquisition-decks');


-- ─────────────────────────────────────────────────────────────────────
-- 4. Redeploy the mail function — it now accepts a direct send, not
--    only BCC. From the project folder, in a terminal:
--
--      supabase functions deploy send-acquisition-mail
--
--    Until you do this, "One mail, everyone in BCC" keeps working but
--    "A separate mail to each" will fail.
-- ─────────────────────────────────────────────────────────────────────
