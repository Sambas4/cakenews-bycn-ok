-- =============================================================================
-- CakeNews — atomic RPCs (migration 0003)
-- =============================================================================
--
-- The client must NEVER perform read-modify-write counters against the
-- public tables: under realistic concurrency the visible totals drift
-- after the first viral piece. These functions move the dangerous
-- read-modify-write to the database where Postgres serialises the
-- update for us.
--
-- All functions are `security definer` so RLS doesn't apply inside the
-- body — the function itself is the access boundary. They run under
-- the role of the caller (`auth.uid()`) and always re-validate the
-- caller's identity before mutating shared state.
--
-- =============================================================================

-- -------------------------------------------------------------------------
-- adjust_article_likes (atomic counter)
-- -------------------------------------------------------------------------
-- Increments / decrements the public `likes` counter on an article.
-- Floors at 0. Returns the new value.

create or replace function public.adjust_article_likes(
  p_article_id uuid,
  p_delta      integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_likes  integer;
begin
  if v_caller is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if p_delta = 0 then
    select likes into v_likes from public.articles where id = p_article_id;
    return coalesce(v_likes, 0);
  end if;

  update public.articles
     set likes = greatest(likes + p_delta, 0)
   where id = p_article_id
   returning likes into v_likes;

  if v_likes is null then
    raise exception 'article_not_found' using errcode = '02000';
  end if;
  return v_likes;
end;
$$;

revoke all on function public.adjust_article_likes(uuid, integer) from public;
grant execute on function public.adjust_article_likes(uuid, integer) to authenticated;

-- -------------------------------------------------------------------------
-- vote_article_vibe (atomic per-user vote)
-- -------------------------------------------------------------------------
-- Casts (or replaces) the caller's vibe vote on an article and updates
-- the aggregated `vibe_check` map in a single transaction.
-- Pass `p_vibe = NULL` to retract the vote.

create or replace function public.vote_article_vibe(
  p_article_id uuid,
  p_vibe       cake_vibe_kind
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller     uuid := auth.uid();
  v_existing   cake_vibe_kind;
  v_aggregate  jsonb;
begin
  if v_caller is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  select vibe into v_existing
    from public.article_vibes
   where article_id = p_article_id and user_uid = v_caller
   for update;

  if p_vibe is null then
    delete from public.article_vibes
     where article_id = p_article_id and user_uid = v_caller;
  elsif v_existing is null then
    insert into public.article_vibes (article_id, user_uid, vibe)
    values (p_article_id, v_caller, p_vibe);
  elsif v_existing <> p_vibe then
    update public.article_vibes
       set vibe = p_vibe, created_at = now()
     where article_id = p_article_id and user_uid = v_caller;
  end if;

  -- Recompute the aggregate from the source of truth so it can never
  -- drift even if a row was inserted by an admin tool out-of-band.
  select jsonb_build_object(
           'choque',    count(*) filter (where vibe = 'choque'),
           'sceptique', count(*) filter (where vibe = 'sceptique'),
           'bullish',   count(*) filter (where vibe = 'bullish'),
           'valide',    count(*) filter (where vibe = 'valide')
         )
    into v_aggregate
    from public.article_vibes
   where article_id = p_article_id;

  update public.articles
     set vibe_check = v_aggregate
   where id = p_article_id;

  return v_aggregate;
end;
$$;

revoke all on function public.vote_article_vibe(uuid, cake_vibe_kind) from public;
grant execute on function public.vote_article_vibe(uuid, cake_vibe_kind) to authenticated;

-- -------------------------------------------------------------------------
-- post_article_comment (insert + counter sync)
-- -------------------------------------------------------------------------

create or replace function public.post_article_comment(
  p_article_id uuid,
  p_content    text,
  p_reply_to   uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_id     uuid;
begin
  if v_caller is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if length(coalesce(p_content, '')) = 0 then
    raise exception 'empty_content' using errcode = '22023';
  end if;

  insert into public.article_comments (article_id, author_uid, reply_to_id, content)
  values (p_article_id, v_caller, p_reply_to, p_content)
  returning id into v_id;

  update public.articles
     set comments_count = comments_count + 1
   where id = p_article_id;

  return v_id;
end;
$$;

revoke all on function public.post_article_comment(uuid, text, uuid) from public;
grant execute on function public.post_article_comment(uuid, text, uuid) to authenticated;

-- -------------------------------------------------------------------------
-- record_trust_event (append-only ledger)
-- -------------------------------------------------------------------------
-- Inserts an event into trust_events. RLS denies direct INSERTs on
-- that table; this function is the only path for clients that they
-- can call.

create or replace function public.record_trust_event(
  p_kind   cake_trust_event_kind,
  p_delta  integer,
  p_reason text,
  p_meta   jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_id     uuid;
begin
  if v_caller is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  -- Sanity bounds — clients should not be able to record arbitrary
  -- score swings. Hard cap at +/-25 per call.
  if p_delta < -25 or p_delta > 25 then
    raise exception 'delta_out_of_range' using errcode = '22023';
  end if;

  insert into public.trust_events (user_uid, kind, delta, reason, meta)
  values (v_caller, p_kind, p_delta, p_reason, p_meta)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_trust_event(cake_trust_event_kind, integer, text, jsonb) from public;
grant execute on function public.record_trust_event(cake_trust_event_kind, integer, text, jsonb) to authenticated;

-- -------------------------------------------------------------------------
-- audit_log (privileged)
-- -------------------------------------------------------------------------
-- Only callable from other security-definer code (Edge Functions,
-- triggers) — clients have no execute grant.

create or replace function public.audit_log(
  p_actor       uuid,
  p_action      text,
  p_target_type cake_target_type default null,
  p_target_id   uuid default null,
  p_payload     jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_audit_log (actor_uid, action, target_type, target_id, payload)
  values (p_actor, p_action, p_target_type, p_target_id, p_payload);
end;
$$;

revoke all on function public.audit_log(uuid, text, cake_target_type, uuid, jsonb) from public;

-- -------------------------------------------------------------------------
-- list_feed_page (cursor pagination)
-- -------------------------------------------------------------------------
-- Returns the next page of published articles after a (published_at, id)
-- cursor. Allows the client to scroll the entire archive without ever
-- pulling the full inventory.

create or replace function public.list_feed_page(
  p_after_published timestamptz default null,
  p_after_id        uuid default null,
  p_limit           integer default 20
)
returns setof public.articles
language sql
stable
security invoker
set search_path = public
as $$
  select *
    from public.articles
   where status = 'published'
     and (
       p_after_published is null
       or published_at < p_after_published
       or (published_at = p_after_published and id < coalesce(p_after_id, '00000000-0000-0000-0000-000000000000'::uuid))
     )
   order by published_at desc, id desc
   limit greatest(1, least(p_limit, 100));
$$;

grant execute on function public.list_feed_page(timestamptz, uuid, integer) to authenticated, anon;
