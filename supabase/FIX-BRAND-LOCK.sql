-- ─────────────────────────────────────────────────────────────────────
-- FIX: brand lock doesn't survive a refresh
--
-- Run this whole file in the Supabase SQL editor. It's safe to re-run.
--
-- What was wrong: the brand's Lock click had two ways to save and both
-- were blocked. The dashboard function refuses that field, and a direct
-- write is stopped by row-level security. A blocked write reports no
-- error in Postgres — it just changes nothing — so the screen kept the
-- lock and the database never had it. Refresh, and it's gone.
--
-- This adds one small function that does only this one job and runs with
-- the table owner's rights, so row-level security doesn't block it. The
-- app calls this first now.
-- ─────────────────────────────────────────────────────────────────────

create or replace function brand_lock_creator(
  p_campaign_id uuid,
  p_creator_id  uuid
)
returns boolean
language plpgsql
security definer          -- runs as the owner, so RLS doesn't block it
set search_path = public
as $$
declare
  v_email text;
  v_rows  int;
begin
  -- Who's calling. No session, no lock.
  select auth.jwt() ->> 'email' into v_email;
  if v_email is null then
    raise exception 'Not signed in.';
  end if;

  -- Only a brand login may lock. Staff confirm on their own side.
  if not exists (select 1 from brand_users where email = v_email) then
    raise exception 'Only a brand login can lock a creator.';
  end if;

  update campaign_creator_links
     set brand_locked    = true,
         brand_locked_at = now()
   where campaign_id = p_campaign_id
     and creator_id  = p_creator_id;

  get diagnostics v_rows = row_count;

  -- Nothing matched means a wrong campaign or creator id, which the
  -- caller should hear about rather than assume worked.
  if v_rows = 0 then
    raise exception 'No such creator on this campaign.';
  end if;

  return true;
end;
$$;

grant execute on function brand_lock_creator(uuid, uuid) to authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- CHECK IT WORKED
-- Lock someone on the brand dashboard, then run this. brand_locked
-- should be true and brand_locked_at should be a moment ago.
-- ─────────────────────────────────────────────────────────────────────
-- select c.name, cl.brand_locked, cl.brand_locked_at
--   from campaign_creator_links cl
--   join creators c on c.id = cl.creator_id
--  where cl.campaign_id = '<campaign id from the dashboard URL>'
--  order by c.name;
