-- =============================================================================
-- CakeNews — scheduled jobs (migration 0006)
-- =============================================================================
--
-- Supabase ships `pg_cron` for scheduling Postgres jobs and
-- `pg_net` for outbound HTTP from those jobs. We use both to wire a
-- self-poll of the healthcheck endpoint: every minute the cluster
-- pings its own /functions/v1/healthcheck and stores the response
-- so the studio dashboard (and any external monitor) can read a
-- short rolling history without scraping the function directly.
--
-- The history table is RLS-protected for staff only; non-staff
-- clients never see it.
-- =============================================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- -------------------------------------------------------------------------
-- Persisted snapshots
-- -------------------------------------------------------------------------

create table if not exists public.health_snapshots (
  id          bigserial primary key,
  recorded_at timestamptz not null default now(),
  status      text not null,
  body        jsonb not null,
  http_status integer
);

create index if not exists health_snapshots_recorded_at_idx
  on public.health_snapshots (recorded_at desc);

alter table public.health_snapshots enable row level security;

create policy health_snapshots_staff_select on public.health_snapshots
  for select using (public.fn_is_staff());

-- -------------------------------------------------------------------------
-- Helper: callable function that pings the healthcheck Edge Function
-- and stores the result. We define it once and let cron call it.
--
-- Reads its `SUPABASE_URL` / `SUPABASE_ANON_KEY` from custom GUCs the
-- maintainer sets via `alter database … set app.healthcheck_url = …;`
-- so we don't bake the URL into the migration.
-- -------------------------------------------------------------------------

create or replace function public.cron_record_health()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := current_setting('app.healthcheck_url', true);
  v_resp record;
  v_body jsonb;
  v_status text;
begin
  if v_url is null or length(v_url) = 0 then
    -- Nothing to do until the maintainer wires the URL.
    return;
  end if;

  select status_code, content::jsonb as content
    into v_resp
    from extensions.http_get(v_url);

  v_body := coalesce(v_resp.content, '{}'::jsonb);
  v_status := coalesce(v_body->>'status', 'unknown');

  insert into public.health_snapshots (status, body, http_status)
  values (v_status, v_body, v_resp.status_code);

  -- Trim to the last 1440 rows (~24h at 1-min cadence).
  delete from public.health_snapshots
   where id in (
     select id from public.health_snapshots
      order by recorded_at desc offset 1440
   );
exception when others then
  -- Never fail a cron tick; record the failure as a synthetic row.
  insert into public.health_snapshots (status, body, http_status)
  values ('unknown', jsonb_build_object('error', sqlerrm), null);
end;
$$;

revoke all on function public.cron_record_health() from public;

-- -------------------------------------------------------------------------
-- Schedule
--
-- One minute cadence — frequent enough to surface a regression on the
-- studio dashboard within ~60 s, infrequent enough to stay free under
-- Supabase's billing tier. Idempotent: `cron.schedule` silently
-- replaces an existing job with the same name.
-- -------------------------------------------------------------------------

select cron.schedule(
  job_name => 'cake-healthcheck-poll',
  schedule => '* * * * *',
  command  => $cron$ select public.cron_record_health(); $cron$
);
