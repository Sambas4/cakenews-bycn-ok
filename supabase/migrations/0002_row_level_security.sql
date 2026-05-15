-- =============================================================================
-- CakeNews — Row Level Security policies (migration 0002)
-- =============================================================================
--
-- Principles:
--   * Default-deny on every table (RLS enabled, no policy = no access).
--   * Public surfaces (articles published, public_profiles) are readable
--     by anonymous visitors so the marketing site / share previews work
--     without an auth bounce.
--   * Owner-only writes on personal data (profile, follows, vibes, trust).
--   * Editor / admin role gates expressed against `auth.jwt()->>'role'`,
--     populated by the trigger declared in migration 0001.
--   * Reports stay private to the reporter and to staff.
--
-- =============================================================================

-- -------------------------------------------------------------------------
-- helpers
-- -------------------------------------------------------------------------

create or replace function public.fn_jwt_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'role', 'USER');
$$;

create or replace function public.fn_is_staff()
returns boolean
language sql
stable
as $$
  select public.fn_jwt_role() in ('EDITOR', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN');
$$;

create or replace function public.fn_is_admin()
returns boolean
language sql
stable
as $$
  select public.fn_jwt_role() in ('ADMIN', 'SUPER_ADMIN');
$$;

-- -------------------------------------------------------------------------
-- enable RLS on every public table
-- -------------------------------------------------------------------------

alter table public.users              enable row level security;
alter table public.public_profiles    enable row level security;
alter table public.articles           enable row level security;
alter table public.article_comments   enable row level security;
alter table public.article_vibes      enable row level security;
alter table public.reports            enable row level security;
alter table public.follows            enable row level security;
alter table public.trust_events       enable row level security;
alter table public.counter_briefs     enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.broadcasts         enable row level security;
alter table public.admin_audit_log    enable row level security;

-- -------------------------------------------------------------------------
-- users  (private profile)
-- -------------------------------------------------------------------------
-- Owner reads/updates self. Staff reads everyone (for moderation UIs).
-- Nobody inserts / deletes directly: rows are created by the auth-sync
-- trigger and removed via `on delete cascade` from auth.users.

create policy users_self_select  on public.users
  for select using (uid = auth.uid() or public.fn_is_staff());

create policy users_self_update  on public.users
  for update using (uid = auth.uid())
  with check (
    -- A user cannot escalate their own role.
    uid = auth.uid()
    and (role is null or role = (select u.role from public.users u where u.uid = auth.uid()))
  );

create policy users_admin_update on public.users
  for update using (public.fn_is_admin())
  with check (public.fn_is_admin());

-- -------------------------------------------------------------------------
-- public_profiles  (publicly readable; owner writes mirror)
-- -------------------------------------------------------------------------

create policy public_profiles_select_all on public.public_profiles
  for select using (true);

create policy public_profiles_owner_upsert on public.public_profiles
  for insert with check (uid = auth.uid());

create policy public_profiles_owner_update on public.public_profiles
  for update using (uid = auth.uid())
  with check (uid = auth.uid());

create policy public_profiles_owner_delete on public.public_profiles
  for delete using (uid = auth.uid());

-- -------------------------------------------------------------------------
-- articles  (read = public for published; write = staff)
-- -------------------------------------------------------------------------

create policy articles_select_published on public.articles
  for select using (status = 'published' or public.fn_is_staff());

create policy articles_staff_insert on public.articles
  for insert with check (public.fn_is_staff());

create policy articles_staff_update on public.articles
  for update using (public.fn_is_staff())
  with check (public.fn_is_staff());

create policy articles_admin_delete on public.articles
  for delete using (public.fn_is_admin());

-- -------------------------------------------------------------------------
-- article_comments
-- -------------------------------------------------------------------------

create policy article_comments_select_visible on public.article_comments
  for select using (
    not is_deleted
    or author_uid = auth.uid()
    or public.fn_is_staff()
  );

create policy article_comments_owner_insert on public.article_comments
  for insert with check (author_uid = auth.uid());

create policy article_comments_owner_update on public.article_comments
  for update using (author_uid = auth.uid() or public.fn_is_staff())
  with check (author_uid = auth.uid() or public.fn_is_staff());

create policy article_comments_owner_delete on public.article_comments
  for delete using (author_uid = auth.uid() or public.fn_is_admin());

-- -------------------------------------------------------------------------
-- article_vibes  (each vote belongs to its caster)
-- -------------------------------------------------------------------------

-- Aggregated counts are public via articles.vibe_check; the per-row
-- detail is private — only the caster sees their own vote.

create policy article_vibes_select_self on public.article_vibes
  for select using (user_uid = auth.uid() or public.fn_is_admin());

create policy article_vibes_self_insert on public.article_vibes
  for insert with check (user_uid = auth.uid());

create policy article_vibes_self_update on public.article_vibes
  for update using (user_uid = auth.uid())
  with check (user_uid = auth.uid());

create policy article_vibes_self_delete on public.article_vibes
  for delete using (user_uid = auth.uid());

-- -------------------------------------------------------------------------
-- reports
-- -------------------------------------------------------------------------

create policy reports_self_or_staff_select on public.reports
  for select using (reporter_uid = auth.uid() or public.fn_is_staff());

create policy reports_self_insert on public.reports
  for insert with check (reporter_uid = auth.uid());

create policy reports_staff_update on public.reports
  for update using (public.fn_is_staff())
  with check (public.fn_is_staff());

create policy reports_admin_delete on public.reports
  for delete using (public.fn_is_admin());

-- -------------------------------------------------------------------------
-- follows
-- -------------------------------------------------------------------------

create policy follows_self_select on public.follows
  for select using (follower_uid = auth.uid());

create policy follows_self_insert on public.follows
  for insert with check (follower_uid = auth.uid());

create policy follows_self_delete on public.follows
  for delete using (follower_uid = auth.uid());

-- -------------------------------------------------------------------------
-- trust_events  (append-only ledger — only the user reads, RPC writes)
-- -------------------------------------------------------------------------
-- We deny client writes entirely; an Edge Function or trigger inserts
-- with the service role.

create policy trust_events_self_select on public.trust_events
  for select using (user_uid = auth.uid() or public.fn_is_staff());

-- (No insert / update / delete policies — clients cannot write.)

-- -------------------------------------------------------------------------
-- counter_briefs  (editorial-only)
-- -------------------------------------------------------------------------

create policy counter_briefs_staff_select on public.counter_briefs
  for select using (public.fn_is_staff());

create policy counter_briefs_staff_insert on public.counter_briefs
  for insert with check (public.fn_is_staff());

create policy counter_briefs_staff_update on public.counter_briefs
  for update using (public.fn_is_staff())
  with check (public.fn_is_staff());

create policy counter_briefs_admin_delete on public.counter_briefs
  for delete using (public.fn_is_admin());

-- -------------------------------------------------------------------------
-- push_subscriptions  (one user, one set of devices)
-- -------------------------------------------------------------------------

create policy push_subs_self_select on public.push_subscriptions
  for select using (user_uid = auth.uid());

create policy push_subs_self_insert on public.push_subscriptions
  for insert with check (user_uid = auth.uid());

create policy push_subs_self_update on public.push_subscriptions
  for update using (user_uid = auth.uid())
  with check (user_uid = auth.uid());

create policy push_subs_self_delete on public.push_subscriptions
  for delete using (user_uid = auth.uid());

-- -------------------------------------------------------------------------
-- broadcasts  (ticker / antenna)
-- -------------------------------------------------------------------------

create policy broadcasts_select_all on public.broadcasts
  for select using (true);

create policy broadcasts_staff_write on public.broadcasts
  for all using (public.fn_is_staff())
  with check (public.fn_is_staff());

-- -------------------------------------------------------------------------
-- admin_audit_log  (read-only for staff; clients cannot write)
-- -------------------------------------------------------------------------

create policy admin_audit_log_staff_select on public.admin_audit_log
  for select using (public.fn_is_staff());

-- (No write policies — only the audit_log() function below inserts.)
