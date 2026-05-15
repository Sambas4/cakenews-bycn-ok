-- =============================================================================
-- 0007_rate_limits.sql — generic fixed-window rate limiter
-- =============================================================================
-- Backstop against abuse of privileged Edge Functions (delete-account,
-- export-user-data, send-push). Each function calls
-- `public.rate_limit_consume(key, max, window_seconds)` before doing any
-- expensive work; the RPC returns whether the call is allowed and how long
-- to wait if denied.
--
-- The table is intentionally tiny (one row per active rate-limit key) and
-- self-pruning — rows whose window expired are recycled in place by the
-- consume function.
-- =============================================================================

create table if not exists public.rate_limits (
  key            text        primary key,
  count          integer     not null default 0,
  window_start   timestamptz not null default now()
);

-- The table is service-role only; no RLS grants.
revoke all on public.rate_limits from public, anon, authenticated;

create or replace function public.rate_limit_consume(
  p_key             text,
  p_max             integer,
  p_window_seconds  integer
)
returns table (
  allowed              boolean,
  remaining            integer,
  retry_after_seconds  integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now           timestamptz := now();
  v_window_start  timestamptz;
  v_count         integer;
  v_window_age_s  integer;
begin
  -- Upsert + lock the row for the key. We start a new window if either
  -- (a) the row didn't exist (handled by COALESCE on the SELECT below),
  -- or (b) the existing window has expired.
  insert into public.rate_limits (key, count, window_start)
  values (p_key, 0, v_now)
  on conflict (key) do nothing;

  -- Re-fetch with a row lock so concurrent callers serialize.
  select rl.count, rl.window_start
    into v_count, v_window_start
    from public.rate_limits rl
   where rl.key = p_key
   for update;

  v_window_age_s := extract(epoch from (v_now - v_window_start))::integer;

  -- Window expired → reset.
  if v_window_age_s >= p_window_seconds then
    v_count := 0;
    v_window_start := v_now;
    v_window_age_s := 0;
  end if;

  if v_count >= p_max then
    update public.rate_limits
       set count        = v_count,
           window_start = v_window_start
     where key = p_key;
    return query
      select false,
             0,
             greatest(0, p_window_seconds - v_window_age_s);
    return;
  end if;

  v_count := v_count + 1;
  update public.rate_limits
     set count        = v_count,
         window_start = v_window_start
   where key = p_key;

  return query
    select true,
           greatest(0, p_max - v_count),
           greatest(0, p_window_seconds - v_window_age_s);
end;
$$;

revoke all on function public.rate_limit_consume(text, integer, integer) from public;
-- Service role only — Edge Functions call this with the service key.

-- Best-effort cleanup of long-stale keys. Run hourly via pg_cron so the
-- table never grows unbounded for one-off actors who never come back.
create or replace function public.rate_limit_gc()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limits
   where window_start < now() - interval '1 day';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.rate_limit_gc() from public;

-- Schedule the GC. `cron.schedule` is idempotent for a given job name.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'rate-limit-gc',
      '17 * * * *',
      $cron$ select public.rate_limit_gc(); $cron$
    );
  end if;
end $$;
