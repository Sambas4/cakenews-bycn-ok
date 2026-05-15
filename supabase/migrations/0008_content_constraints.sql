-- =============================================================================
-- 0008_content_constraints.sql
-- =============================================================================
-- Defence-in-depth on user-provided text and operational hygiene on the
-- audit trail. RLS already restricts WHO can insert; these constraints
-- restrict WHAT can be inserted and how long it lives.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Length caps on user-generated content
-- -----------------------------------------------------------------------------
-- Without an explicit cap, a malicious or buggy client can write rows
-- of arbitrary size. The Postgres row limit (1 GiB) is not a useful
-- defence: a single multi-megabyte comment would already cripple the
-- feed and the audit-log payloads.
--
-- Numbers picked from product specs:
--   * articles.content       — 32 768 chars  (long-form essay length)
--   * article_comments.content — 2 000 chars (≈ Twitter thread length)
--   * articles.title         — 200 chars
--   * articles.subtitle      — 400 chars

alter table public.articles
  drop constraint if exists articles_content_length_check,
  add  constraint articles_content_length_check
    check (content is null or length(content) <= 32768);

alter table public.articles
  drop constraint if exists articles_title_length_check,
  add  constraint articles_title_length_check
    check (title is null or length(title) <= 200);

alter table public.articles
  drop constraint if exists articles_subtitle_length_check,
  add  constraint articles_subtitle_length_check
    check (subtitle is null or length(subtitle) <= 400);

alter table public.article_comments
  drop constraint if exists article_comments_content_length_check,
  add  constraint article_comments_content_length_check
    check (length(content) between 1 and 2000);

-- -----------------------------------------------------------------------------
-- 2. Tighten post_article_comment so trimmed-empty payloads are rejected
-- -----------------------------------------------------------------------------
-- The RPC previously stored ' ' × N as a valid comment. Trim it server-side
-- so the new CHECK above can't be bypassed by whitespace padding.

create or replace function public.post_article_comment(
  p_article_id  uuid,
  p_content     text,
  p_reply_to_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_clean   text;
  v_id      uuid;
begin
  if v_uid is null then
    raise exception 'auth_required';
  end if;

  v_clean := btrim(coalesce(p_content, ''));
  if v_clean = '' then
    raise exception 'empty_content';
  end if;
  if length(v_clean) > 2000 then
    raise exception 'content_too_long';
  end if;

  insert into public.article_comments (article_id, author_uid, reply_to_id, content)
  values (p_article_id, v_uid, p_reply_to_id, v_clean)
  returning id into v_id;

  update public.articles
     set comments_count = comments_count + 1
   where id = p_article_id;

  return v_id;
end;
$$;

revoke all on function public.post_article_comment(uuid, text, uuid) from public;
grant execute on function public.post_article_comment(uuid, text, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Audit-log retention
-- -----------------------------------------------------------------------------
-- The admin_audit_log table is append-only and grows monotonically with
-- traffic. The GDPR Art. 17 right-to-erasure and EU recommendations on
-- proportionality require a documented retention horizon — 13 months
-- gives us a year of incident archaeology plus a one-month buffer.

create or replace function public.audit_log_gc()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.admin_audit_log
   where created_at < now() - interval '13 months';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.audit_log_gc() from public;

-- Monthly cron — pick a quiet hour. `cron.schedule` is idempotent for
-- a given job name; re-running this migration replaces the job in place.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'audit-log-gc',
      '23 3 1 * *',
      $cron$ select public.audit_log_gc(); $cron$
    );
  end if;
end $$;
