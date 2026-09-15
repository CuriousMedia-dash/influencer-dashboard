-- Run this right after locking someone on the brand dashboard.
-- It answers the question in one go: did the lock actually reach the
-- database, or only the screen?

select cl.creator_id,
       c.name        as creator,
       cl.brand_locked,
       cl.brand_locked_at
  from campaign_creator_links cl
  join creators c on c.id = cl.creator_id
 where cl.campaign_id = '<paste the campaign id from the dashboard URL>'
 order by c.name;

-- brand_locked = true  -> it saved. The green row on your side is a
--                         front-end problem; tell me and I'll fix that.
--
-- brand_locked = false -> it never saved. The brand login isn't allowed
--                         to write that column, and the update silently
--                         affected zero rows. See below.


-- WHY A BLOCKED WRITE LOOKS LIKE A SUCCESS
-- ----------------------------------------
-- When row-level security blocks an update, Postgres doesn't raise an
-- error. The update simply matches no rows and reports success. That's
-- why the lock appeared to start working — nothing complained, so the
-- screen kept the value.
--
-- The new build asks for the changed rows back and treats "zero rows"
-- as the failure it is, so you'll now see a red message on the row
-- instead.


-- WHAT POLICIES EXIST TODAY
-- -------------------------
select policyname, cmd, roles, qual, with_check
  from pg_policies
 where tablename = 'campaign_creator_links';

-- If there's no UPDATE policy that covers brand logins, that's the
-- whole story. The clean fix is still the dashboard function, which
-- runs with its own permissions and sidesteps this entirely:
--
--   select pg_get_functiondef(oid)
--     from pg_proc
--    where proname = 'update_brand_dashboard_link';
--
-- Send me that and I'll give you the exact replacement.
