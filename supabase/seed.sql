-- =============================================================================
-- seed.sql — démarrage minimal d'une instance CakeNews
-- =============================================================================
-- Ce fichier est exécuté manuellement après `supabase db push` sur un
-- environnement neuf. Il ne crée AUCUN compte utilisateur : la table
-- `auth.users` est gérée exclusivement par Supabase Auth (signup ou
-- import via le dashboard). Le seed se limite à :
--
--   1. Trois articles publiés d'exemple pour que le feed ne soit pas
--      vide la première seconde après la mise en ligne.
--   2. La configuration du ticker (mode AUTO, manualRankings vide).
--
-- Les articles seedés sont signés par l'auteur `'system'`. Quand un
-- vrai compte rédacteur prend le relais, supprimez ces trois lignes
-- ou marquez-les `is_published = false` via le studio admin.
-- =============================================================================

-- 1. Articles
insert into public.articles (id, title, subtitle, content, category, author, image_url, is_published, published_at)
values
  (
    gen_random_uuid(),
    'Bienvenue sur CakeNews',
    'L''information qui vibre, pas qui crie.',
    'CakeNews est une app d''info conçue mobile-first. Swipe pour découvrir, like ce qui te parle, signale ce qui dérape. Tu contrôles ton fil.',
    'TECH',
    'system',
    'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=1200',
    true,
    now()
  ),
  (
    gen_random_uuid(),
    'Comment fonctionne le ticker',
    'Une bande défilante curatée — pas un fil d''actu automatique.',
    'Le ticker n''affiche que les contenus marqués manuellement par la rédaction dans la console AntENNE. Tant qu''aucune entrée n''est ajoutée, le bandeau reste invisible.',
    'TECH',
    'system',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200',
    true,
    now()
  ),
  (
    gen_random_uuid(),
    'Tes données t''appartiennent',
    'Export GDPR et suppression de compte sont à portée de clic.',
    'Dans ton profil → Paramètres, le bouton Exporter te renvoie l''intégralité de tes données en JSON ; Supprimer le compte enclenche un hard-delete avec cascade sur toutes les tables qui te référencent.',
    'POLITIQUE',
    'system',
    'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200',
    true,
    now()
  )
on conflict do nothing;

-- 2. Configuration ticker
insert into public.broadcasts (id, mode, speed, default_location, ranking_mode, manual_rankings, category_titles)
values (
  'system_config',
  'AUTO',
  'normal',
  'Global',
  'AUTO',
  '[]'::jsonb,
  '{}'::jsonb
)
on conflict (id) do nothing;
