-- ============================================================
-- Siana Architecture — demo seed data (published cities + projects)
-- ------------------------------------------------------------
-- Purpose: populate the public site so /cities renders the
-- "Fragment" cards (each card needs a published city; the
-- "N projects" count needs published projects per city).
--
-- How to run (pick one):
--   1. Supabase Dashboard → SQL Editor → paste this file → Run
--      (the editor runs as a privileged role, so RLS is bypassed)
--   2. Local CLI:  supabase db reset       (auto-runs supabase/seed.sql)
--   3. Remote CLI: psql "$SUPABASE_DB_URL" -f supabase/seed.sql
--
-- Safe to re-run: every INSERT uses ON CONFLICT (slug) DO NOTHING.
-- Images use picsum.photos placeholders — swap them for real
-- architecture photography via the admin "Image upload" later.
-- ============================================================

-- ---------- Cities ----------
insert into public.cities
  (name, slug, country, tagline, description, hero_image_url,
   center_latitude, center_longitude, default_zoom, status)
values
  ('Barcelona', 'barcelona', 'Spain',
   'Modernisme, mosaics, and the unfinished cathedral of a dream.',
   'From Gaudí''s organic façades to the rationalist grid of the Eixample.',
   'https://picsum.photos/seed/siana-barcelona/1200/1500',
   41.3874, 2.1686, 12, 'published'),

  ('Lisbon', 'lisbon', 'Portugal',
   'Azulejo light spilling across seven hills.',
   'Pombaline calm meeting a contemporary waterfront ambition.',
   'https://picsum.photos/seed/siana-lisbon/1200/1500',
   38.7223, -9.1393, 12, 'published'),

  ('Mexico City', 'mexico-city', 'Mexico',
   'Barragán''s color and the weight of volcanic stone.',
   'A megacity of muralism, modernism, and pink walls.',
   'https://picsum.photos/seed/siana-mexicocity/1200/1500',
   19.4326, -99.1332, 11, 'published'),

  ('Copenhagen', 'copenhagen', 'Denmark',
   'Quiet Nordic rigor by the water.',
   'Where social housing becomes a discipline of light.',
   'https://picsum.photos/seed/siana-copenhagen/1200/1500',
   55.6761, 12.5683, 12, 'published'),

  ('Porto', 'porto', 'Portugal',
   'Granite, fog, and the precision of Siza.',
   'A school of architecture written in white concrete.',
   'https://picsum.photos/seed/siana-porto/1200/1500',
   41.1579, -8.6291, 12, 'published'),

  ('Chicago', 'chicago', 'United States',
   'The birthplace of the skyscraper.',
   'Steel, glass, and the long shadow of Mies.',
   'https://picsum.photos/seed/siana-chicago/1200/1500',
   41.8781, -87.6298, 11, 'published')
on conflict (slug) do nothing;

-- ---------- Projects (linked to cities by slug) ----------
-- latitude/longitude are real building coordinates so the home-page map
-- renders a pin per project. cover/hero images are derived from the slug
-- (picsum placeholders) — swap for real photography via the admin later.
insert into public.projects
  (name, slug, architect, category, year_completed,
   latitude, longitude, cover_image_url, hero_image_url,
   city_id, status, featured)
select p.name, p.slug, p.architect, p.category, p.year_completed,
       p.latitude, p.longitude,
       'https://picsum.photos/seed/siana-' || p.slug || '/1200/1500',
       'https://picsum.photos/seed/siana-' || p.slug || '-hero/2000/1200',
       c.id, 'published', p.featured
from (
  values
    ('Sagrada Família',         'sagrada-familia',        'Antoni Gaudí',                 'Religious',   1882, 41.4036::float8,   2.1744::float8, 'barcelona',   true),
    ('Casa Batlló',             'casa-batllo',            'Antoni Gaudí',                 'Residential', 1906, 41.3917,           2.1649,         'barcelona',   false),
    ('Mercat de Santa Caterina','mercat-santa-caterina',  'EMBT',                         'Civic',       2005, 41.3870,           2.1779,         'barcelona',   false),
    ('Champalimaud Centre',     'champalimaud-centre',    'Charles Correa',               'Civic',       2010, 38.6936,          -9.2057,         'lisbon',      true),
    ('MAAT',                    'maat-lisbon',            'Amanda Levete (AL_A)',         'Cultural',    2016, 38.6957,          -9.1939,         'lisbon',      false),
    ('Casa Luis Barragán',      'casa-luis-barragan',     'Luis Barragán',                'Residential', 1948, 19.4116,         -99.1920,         'mexico-city', true),
    ('Museo Soumaya',           'museo-soumaya',          'FR-EE / Fernando Romero',      'Cultural',    2011, 19.4406,         -99.2046,         'mexico-city', false),
    ('8 House',                 '8-house',                'BIG',                          'Residential', 2010, 55.6180,          12.5772,         'copenhagen',  true),
    ('Royal Danish Opera',      'royal-danish-opera',     'Henning Larsen',               'Cultural',    2005, 55.6797,          12.6010,         'copenhagen',  false),
    ('Casa da Música',          'casa-da-musica',         'OMA / Rem Koolhaas',           'Cultural',    2005, 41.1586,          -8.6304,         'porto',       true),
    ('Serralves Museum',        'serralves-museum',       'Álvaro Siza',                  'Cultural',    1999, 41.1597,          -8.6592,         'porto',       false),
    ('Willis Tower',            'willis-tower',           'SOM / Fazlur Rahman Khan',     'Office',      1973, 41.8789,         -87.6359,         'chicago',     true),
    ('Robie House',             'robie-house',            'Frank Lloyd Wright',           'Residential', 1910, 41.7896,         -87.5959,         'chicago',     false)
) as p(name, slug, architect, category, year_completed, latitude, longitude, city_slug, featured)
join public.cities c on c.slug = p.city_slug
on conflict (slug) do nothing;
