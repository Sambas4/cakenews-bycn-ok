-- =============================================================================
-- CakeNews — initial production schema (migration 0001)
-- =============================================================================
--
-- Goals:
--   * Normalise the data model so comments, vibe votes, reports and
--     follows live in their own tables instead of inside the article
--     row (the v2 layout caused race conditions on viral pieces).
--   * Cover every read/write the client makes, in a shape compatible
--     with Postgres RLS.
--   * Set the foundation for cursor pagination, atomic counters and
--     append-only audit logs.
--
-- Apply with:  supabase db push    (or supabase db reset for a clean env)
--
-- =============================================================================

-- -------------------------------------------------------------------------
-- Extensions
-- -------------------------------------------------------------------------

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- search relevance later

-- -------------------------------------------------------------------------
-- ENUMs
-- -------------------------------------------------------------------------

create type cake_article_status   as enum ('draft', 'scheduled', 'published', 'archived');
create type cake_user_status      as enum ('ACTIVE', 'SUSPENDED', 'BANNED');
create type cake_user_role        as enum ('USER', 'EDITOR', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN');
create type cake_vibe_kind        as enum ('choque', 'sceptique', 'bullish', 'valide');
create type cake_report_reason    as enum ('truth', 'ethics', 'tech');
create type cake_report_status    as enum ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED');
create type cake_target_type      as enum ('ARTICLE', 'COMMENT', 'USER');
create type cake_follow_kind      as enum ('author', 'topic', 'tag');
create type cake_trust_event_kind as enum (
  'GOOD_REPORT', 'BAD_REPORT', 'DEEP_READ', 'COMMENT_LIKED',
  'COMMENT_REPORTED', 'BETA_PROGRAM', 'IDENTITY_VERIFIED'
);
create type cake_counter_brief_status as enum (
  'NEW', 'TRIAGED', 'ASSIGNED', 'PUBLISHED', 'DISMISSED'
);

-- -------------------------------------------------------------------------
-- users  (private profile, only the owner reads)
-- -------------------------------------------------------------------------
-- Mirrors auth.users with the columns the app needs. Keep in sync via
-- the trigger declared at the end of the file.

create table if not exists public.users (
  uid              uuid primary key references auth.users(id) on delete cascade,
  email            text,
  display_name     text not null,
  username         text unique,
  bio              text,
  photo_url        text,
  avatar_bg        text,
  status           cake_user_status not null default 'ACTIVE',
  role             cake_user_role  not null default 'USER',
  moderation_note  text,
  preferences      jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists users_username_idx on public.users using btree (username);

-- -------------------------------------------------------------------------
-- public_profiles  (anyone can read; owner writes; admin writes)
-- -------------------------------------------------------------------------

create table if not exists public.public_profiles (
  uid           uuid primary key references public.users(uid) on delete cascade,
  display_name  text not null,
  username      text unique,
  bio           text,
  photo_url     text,
  avatar_bg     text,
  updated_at    timestamptz not null default now()
);

create index if not exists public_profiles_username_idx on public.public_profiles using btree (username);

-- -------------------------------------------------------------------------
-- articles  (canonical feed inventory)
-- -------------------------------------------------------------------------

create table if not exists public.articles (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  summary          text,
  content          text,
  image_url        text,
  video_url        text,
  flash_audio_url  text,
  author           text not null,
  author_uid       uuid references public.users(uid) on delete set null,
  category         text not null,
  tags             text[] not null default '{}',
  -- Cognitive metadata used by the algorithm (auto-tagger writes here).
  metadata         jsonb,
  -- External voices and cover/decoration come as structured JSON to keep
  -- the writer experience flexible while migrations stay cheap.
  external_voices  jsonb,
  is_exclusive     boolean not null default false,
  is_sensitive     boolean not null default false,
  status           cake_article_status not null default 'draft',
  scheduled_date   timestamptz,
  -- Public counters. Comments / vibes have their own table; we keep
  -- denormalised counters here for cheap list rendering.
  likes            integer not null default 0 check (likes >= 0),
  comments_count   integer not null default 0 check (comments_count >= 0),
  views            integer not null default 0,
  read_rate        numeric(5,4) check (read_rate is null or (read_rate >= 0 and read_rate <= 1)),
  avg_time         text,
  virality         numeric,
  reports_count    integer not null default 0 check (reports_count >= 0),
  disputes         integer not null default 0,
  certified_by     text,
  -- Aggregated vibe map kept for the algorithm's quality boost. The
  -- per-user truth lives in article_vibes; this map is reconciled by
  -- the vibe RPC.
  vibe_check       jsonb not null default '{"choque":0,"sceptique":0,"bullish":0,"valide":0}'::jsonb,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Cursor-friendly index: feed pagination scans (published_at desc, id desc).
create index if not exists articles_published_idx
  on public.articles using btree (published_at desc, id desc)
  where status = 'published';

create index if not exists articles_status_idx     on public.articles (status);
create index if not exists articles_category_idx   on public.articles (category);
create index if not exists articles_author_uid_idx on public.articles (author_uid);
create index if not exists articles_tags_gin       on public.articles using gin (tags);
create index if not exists articles_title_trgm     on public.articles using gin (title gin_trgm_ops);

-- -------------------------------------------------------------------------
-- article_comments  (split from articles.roomComments)
-- -------------------------------------------------------------------------

create table if not exists public.article_comments (
  id            uuid primary key default gen_random_uuid(),
  article_id    uuid not null references public.articles(id) on delete cascade,
  author_uid    uuid not null references public.users(uid) on delete cascade,
  reply_to_id   uuid references public.article_comments(id) on delete set null,
  content       text not null,
  likes         integer not null default 0 check (likes >= 0),
  is_deleted    boolean not null default false,
  is_flagged    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists article_comments_article_idx
  on public.article_comments (article_id, created_at desc);
create index if not exists article_comments_author_idx
  on public.article_comments (author_uid);

-- -------------------------------------------------------------------------
-- article_vibes  (one row per (article, user) — the source of truth)
-- -------------------------------------------------------------------------

create table if not exists public.article_vibes (
  article_id  uuid not null references public.articles(id) on delete cascade,
  user_uid    uuid not null references public.users(uid) on delete cascade,
  vibe        cake_vibe_kind not null,
  created_at  timestamptz not null default now(),
  primary key (article_id, user_uid)
);

create index if not exists article_vibes_article_idx on public.article_vibes (article_id);

-- -------------------------------------------------------------------------
-- reports  (moderation tickets)
-- -------------------------------------------------------------------------

create table if not exists public.reports (
  id                    uuid primary key default gen_random_uuid(),
  target_id             uuid not null,
  target_type           cake_target_type not null,
  target_title          text,
  target_content_preview text,
  reason                cake_report_reason not null,
  description           text,
  reporter_uid          uuid not null references public.users(uid) on delete cascade,
  reporter_score        integer,
  status                cake_report_status not null default 'OPEN',
  assigned_to_uid       uuid references public.users(uid) on delete set null,
  evidence_links        text[] not null default '{}',
  internal_notes        jsonb,
  created_at            timestamptz not null default now(),
  resolved_at           timestamptz
);

create index if not exists reports_status_idx     on public.reports (status, created_at desc);
create index if not exists reports_target_idx     on public.reports (target_type, target_id);
create index if not exists reports_reporter_idx   on public.reports (reporter_uid);
create index if not exists reports_assigned_idx   on public.reports (assigned_to_uid);

-- -------------------------------------------------------------------------
-- follows  (explicit follow intent — feeds the Cercle lane)
-- -------------------------------------------------------------------------

create table if not exists public.follows (
  follower_uid  uuid not null references public.users(uid) on delete cascade,
  kind          cake_follow_kind not null,
  value         text not null,
  followed_at   timestamptz not null default now(),
  primary key (follower_uid, kind, value)
);

create index if not exists follows_kind_value_idx on public.follows (kind, value);

-- -------------------------------------------------------------------------
-- trust_events  (transparent ledger that produces the trust score)
-- -------------------------------------------------------------------------

create table if not exists public.trust_events (
  id          uuid primary key default gen_random_uuid(),
  user_uid    uuid not null references public.users(uid) on delete cascade,
  kind        cake_trust_event_kind not null,
  delta       integer not null,
  reason      text not null,
  meta        jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists trust_events_user_idx on public.trust_events (user_uid, created_at desc);

-- -------------------------------------------------------------------------
-- counter_briefs  (editorial inbox derived from the vibe-signals)
-- -------------------------------------------------------------------------

create table if not exists public.counter_briefs (
  id                   uuid primary key default gen_random_uuid(),
  source_article_id    uuid not null references public.articles(id) on delete cascade,
  status               cake_counter_brief_status not null default 'NEW',
  weight               numeric not null default 0,
  sceptic_percent      integer,
  total_vibes          integer,
  assigned_to_uid      uuid references public.users(uid) on delete set null,
  note                 text,
  detected_at          timestamptz not null default now(),
  resolved_at          timestamptz,
  unique (source_article_id)
);

create index if not exists counter_briefs_status_idx on public.counter_briefs (status, detected_at desc);

-- -------------------------------------------------------------------------
-- push_subscriptions  (one row per device subscription)
-- -------------------------------------------------------------------------

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_uid     uuid not null references public.users(uid) on delete cascade,
  endpoint     text not null,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  unique (user_uid, endpoint)
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_uid);

-- -------------------------------------------------------------------------
-- broadcasts  (ticker / antenna campaigns + system_config row)
-- -------------------------------------------------------------------------

create table if not exists public.broadcasts (
  id                  text primary key,
  name                text,
  message             text,
  type                text,
  priority            integer,
  capping             jsonb,
  targeting           jsonb,
  schedule            jsonb,
  manual_rankings     jsonb,
  ranking_mode        text,
  mode                text,
  speed               text,
  default_location    text,
  category_titles     jsonb,
  linked_article_id   uuid,
  created_at          timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- admin_audit_log  (append-only — every privileged action lands here)
-- -------------------------------------------------------------------------

create table if not exists public.admin_audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_uid    uuid not null references public.users(uid) on delete set null,
  action       text not null,
  target_type  cake_target_type,
  target_id    uuid,
  payload      jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists admin_audit_log_actor_idx  on public.admin_audit_log (actor_uid, created_at desc);
create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_type, target_id);

-- -------------------------------------------------------------------------
-- updated_at triggers (single function reused everywhere)
-- -------------------------------------------------------------------------

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tg_users_updated_at            before update on public.users            for each row execute function public.tg_set_updated_at();
create trigger tg_public_profiles_updated_at  before update on public.public_profiles  for each row execute function public.tg_set_updated_at();
create trigger tg_articles_updated_at         before update on public.articles         for each row execute function public.tg_set_updated_at();
create trigger tg_article_comments_updated_at before update on public.article_comments for each row execute function public.tg_set_updated_at();

-- -------------------------------------------------------------------------
-- auth.users → public.users sync
-- -------------------------------------------------------------------------
-- Auto-create a row in public.users whenever an auth user is created.
-- The client may then update the profile with display_name / photo etc.

create or replace function public.tg_sync_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (uid, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'User'))
  on conflict (uid) do nothing;
  return new;
end;
$$;

drop trigger if exists tg_on_auth_user_created on auth.users;
create trigger tg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_sync_auth_user();

-- -------------------------------------------------------------------------
-- public.users.role → JWT custom claim
-- -------------------------------------------------------------------------
-- Mirror the role column into the JWT app_metadata so RLS policies can
-- read the role from the token without a join. The session token is
-- refreshed on next sign-in (or via the client's refresh API).

create or replace function public.tg_propagate_role_claim()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if (old.role is distinct from new.role) then
    update auth.users
       set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                              || jsonb_build_object('role', new.role::text)
     where id = new.uid;
  end if;
  return new;
end;
$$;

create trigger tg_users_role_to_jwt
  after update of role on public.users
  for each row execute function public.tg_propagate_role_claim();
