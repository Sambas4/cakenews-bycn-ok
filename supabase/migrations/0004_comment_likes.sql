-- =============================================================================
-- CakeNews — comment likes (migration 0004)
-- =============================================================================
--
-- The room module exposes a heart icon on every comment, but until
-- now nothing persisted those votes. This migration introduces:
--
--   1. `article_comment_likes` — one row per (comment, user) liker,
--      same shape as `article_vibes` so the cognitive overhead stays
--      low for anyone reading the schema.
--   2. A denormalised `likes` counter on `article_comments` (already
--      declared in 0001) that the RPC keeps in sync.
--   3. `toggle_comment_like(p_comment_id)` — a single atomic call
--      that flips the caller's vote and returns the new aggregate.
--   4. RLS: the per-user row is private (no leak of who liked what),
--      the aggregated counter on the parent comment is public via
--      the existing comment policies.
--
-- =============================================================================

-- -------------------------------------------------------------------------
-- Table
-- -------------------------------------------------------------------------

create table if not exists public.article_comment_likes (
  comment_id  uuid not null references public.article_comments(id) on delete cascade,
  user_uid    uuid not null references public.users(uid) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (comment_id, user_uid)
);

create index if not exists article_comment_likes_comment_idx
  on public.article_comment_likes (comment_id);

alter table public.article_comment_likes enable row level security;

-- Each user can read / mutate only their own likes. Aggregate counts
-- live on `article_comments.likes` and follow that table's policies.
create policy article_comment_likes_self_select on public.article_comment_likes
  for select using (user_uid = auth.uid());

create policy article_comment_likes_self_insert on public.article_comment_likes
  for insert with check (user_uid = auth.uid());

create policy article_comment_likes_self_delete on public.article_comment_likes
  for delete using (user_uid = auth.uid());

-- -------------------------------------------------------------------------
-- Atomic toggle
-- -------------------------------------------------------------------------

create or replace function public.toggle_comment_like(
  p_comment_id uuid
)
returns table (
  liked        boolean,
  total_likes  integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_existed boolean;
  v_total integer;
begin
  if v_caller is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  -- Fast existence check + lock the row if it exists.
  select true into v_existed
    from public.article_comment_likes
   where comment_id = p_comment_id and user_uid = v_caller
   for update;

  if v_existed is null then
    insert into public.article_comment_likes (comment_id, user_uid)
    values (p_comment_id, v_caller);
    v_existed := false;
  else
    delete from public.article_comment_likes
     where comment_id = p_comment_id and user_uid = v_caller;
    v_existed := true;
  end if;

  -- Re-aggregate from the source of truth so the denormalised
  -- counter never drifts even under concurrent toggles.
  select count(*)::integer
    into v_total
    from public.article_comment_likes
   where comment_id = p_comment_id;

  update public.article_comments
     set likes = v_total
   where id = p_comment_id;

  -- `v_existed` was the BEFORE state; the AFTER liked state is the
  -- inverse of that.
  return query select (not v_existed), v_total;
end;
$$;

revoke all on function public.toggle_comment_like(uuid) from public;
grant execute on function public.toggle_comment_like(uuid) to authenticated;

-- -------------------------------------------------------------------------
-- Helper: list the comments the caller has liked on a given article
-- -------------------------------------------------------------------------
-- Used by the room module on first mount so the heart icon already
-- reflects past votes, without exposing other users' voting graph.

create or replace function public.list_liked_comments(
  p_article_id uuid
)
returns setof uuid
language sql
stable
security invoker
set search_path = public
as $$
  select cl.comment_id
    from public.article_comment_likes cl
    join public.article_comments c on c.id = cl.comment_id
   where c.article_id = p_article_id
     and cl.user_uid = auth.uid();
$$;

grant execute on function public.list_liked_comments(uuid) to authenticated;
