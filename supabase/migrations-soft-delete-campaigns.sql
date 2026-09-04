-- Run this in the Supabase SQL editor before using the new build.
--
-- Campaigns are no longer destroyed when deleted — they're marked with a
-- date and hidden from the list instead, so everything inside them
-- (costs, execution stages, payment info, remarks, addresses) survives.
alter table campaigns
  add column if not exists deleted_at timestamptz;

-- To see what's been deleted:
--
--   select id, name, client, deleted_at
--     from campaigns
--    where deleted_at is not null
--    order by deleted_at desc;
--
-- To restore one:
--
--   update campaigns set deleted_at = null where id = '<paste the id>';
