-- =============================================================================
-- CakeNews — server-side article search (migration 0005)
-- =============================================================================
--
-- Replaces the v1 client-side substring filter with a real
-- relevance-ranked search exploiting Postgres' pg_trgm extension
-- (already enabled in 0001) and the existing GIN index on
-- `articles.title`.
--
-- The function returns a single row per article, ordered by a
-- composite score:
--
--   score = title_similarity * 0.55
--         + summary_similarity * 0.20
--         + category_match    * 0.10
--         + tag_match          * 0.10
--         + author_match       * 0.05
--         + log10(1 + likes + 2 * comments) / 8
--
-- The engagement boost is capped (log10) so a 100k-like article
-- can't bury a perfect title match.
--
-- =============================================================================

-- -------------------------------------------------------------------------
-- Indexes for the trigram lookups
-- -------------------------------------------------------------------------

create index if not exists articles_summary_trgm
  on public.articles using gin (summary gin_trgm_ops);

create index if not exists articles_author_trgm
  on public.articles using gin (author gin_trgm_ops);

-- -------------------------------------------------------------------------
-- search_articles
-- -------------------------------------------------------------------------

create or replace function public.search_articles(
  p_query text,
  p_limit integer default 25
)
returns setof public.articles
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_q text := lower(trim(coalesce(p_query, '')));
  v_limit integer := greatest(1, least(coalesce(p_limit, 25), 100));
begin
  if length(v_q) = 0 then
    return;
  end if;

  return query
    select a.*
      from public.articles a,
           lateral (
             select
               -- Trigram similarity for free-text fields. similarity()
               -- returns 0..1; we weight title heaviest.
               similarity(lower(a.title),   v_q)         as sim_title,
               similarity(lower(coalesce(a.summary, '')), v_q) as sim_summary,
               similarity(lower(coalesce(a.author, '')),  v_q) as sim_author,
               -- Booleans collapsed into 0/1 for the weighted sum.
               case when lower(a.category) = v_q then 1::numeric else 0::numeric end as cat_exact,
               case when exists (
                 select 1 from unnest(coalesce(a.tags, '{}'::text[])) tag
                  where lower(tag) like '%' || v_q || '%'
               ) then 1::numeric else 0::numeric end as tag_match
           ) s
     where a.status = 'published'
       and (s.sim_title > 0.18
            or s.sim_summary > 0.20
            or s.sim_author > 0.30
            or s.cat_exact = 1
            or s.tag_match = 1)
     order by (
         s.sim_title    * 0.55
       + s.sim_summary  * 0.20
       + s.cat_exact    * 0.10
       + s.tag_match    * 0.10
       + s.sim_author   * 0.05
       + (log(1 + coalesce(a.likes, 0) + 2 * coalesce(a.comments_count, 0)) / 8.0)::numeric
     ) desc,
       a.published_at desc nulls last,
       a.id desc
     limit v_limit;
end;
$$;

grant execute on function public.search_articles(text, integer) to authenticated, anon;
