-- ─────────────────────────────────────────────────────────────────────
-- 1. Script link — one per influencer, per campaign. Editable from both
--    your side and the brand dashboard.
-- ─────────────────────────────────────────────────────────────────────
alter table campaign_creator_links
  add column if not exists script_link text;


-- ─────────────────────────────────────────────────────────────────────
-- 2. Stop the same influencer being added to one campaign twice.
--    First see whether any duplicates already exist:
--
--      select campaign_id, creator_id, count(*)
--        from campaign_creator_links
--       group by campaign_id, creator_id
--      having count(*) > 1;
--
--    If that returns nothing, run the index below straight away. If it
--    returns rows, clear them first with the delete underneath — it
--    keeps the OLDEST row of each pair, which is the one your team has
--    been filling in. Read it before running it.
-- ─────────────────────────────────────────────────────────────────────

-- delete from campaign_creator_links a
--  using campaign_creator_links b
--  where a.campaign_id = b.campaign_id
--    and a.creator_id  = b.creator_id
--    and a.ctid > b.ctid;

create unique index if not exists campaign_creator_links_unique_pair
  on campaign_creator_links (campaign_id, creator_id);


-- ─────────────────────────────────────────────────────────────────────
-- 3. For the brand to save script links, the dashboard's update
--    function needs to accept the new field. It lives in the database,
--    not the repo — run this and send me what it prints:
--
--      select pg_get_functiondef(oid)
--        from pg_proc
--       where proname in ('get_brand_dashboard', 'update_brand_dashboard_link');
--
--    Until then, your side saves script links normally and the brand
--    can see them; only their edits will fail.
-- ─────────────────────────────────────────────────────────────────────
