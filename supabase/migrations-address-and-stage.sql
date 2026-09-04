-- Run these in the Supabase SQL editor before using the new build.
-- Steps 1 and 2 are required. Step 3 is optional. Step 4 is only needed
-- if you want the brand dashboard to show the address.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Address, per creator, per campaign.
--    Lives on the link between a campaign and a creator, so the same
--    influencer can have a different address on a different campaign.
-- ─────────────────────────────────────────────────────────────────────
alter table campaign_creator_links
  add column if not exists address text;


-- ─────────────────────────────────────────────────────────────────────
-- 2. Nothing — placeholder so the numbering matches the notes.
--    (No schema change needed for the Mega+ category: it's worked out
--    from the follower count, not stored.)
-- ─────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────
-- 3. OPTIONAL: move rows still sitting on the old first stage over to
--    the new one. Without this they keep showing "Draft Video", which
--    still displays correctly but is no longer offered as a choice.
--    Check how many would move first:
--
--      select count(*) from campaign_creator_links
--      where execution_stage = 'Draft Video';
--
--    Then, if that number looks right:
-- ─────────────────────────────────────────────────────────────────────
-- update campaign_creator_links
--    set execution_stage = 'Concept Shared'
--  where execution_stage = 'Draft Video';


-- ─────────────────────────────────────────────────────────────────────
-- 4. Brand dashboard visibility.
--    The brand side reads through the get_brand_dashboard function, not
--    the table directly, so the address won't reach it until that
--    function selects the new column too. That function isn't in the
--    repo — it only exists in the database. Run this to print its
--    current definition and send it over, and I'll give you the exact
--    replacement:
--
--      select pg_get_functiondef(oid)
--        from pg_proc
--       where proname = 'get_brand_dashboard';
--
--    Until then, everything else works: the address saves, shows, and
--    edits fine on your side. The brand's Address column just stays
--    blank.
-- ─────────────────────────────────────────────────────────────────────
