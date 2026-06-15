-- Seed two example editorial articles tagged with the Barcelona city.
-- Safe to run multiple times — INSERTs are idempotent via slug ON CONFLICT.
-- Only runs if a published city with slug = 'barcelona' exists.

DO $$
DECLARE
  bcn_id uuid;
BEGIN
  SELECT id INTO bcn_id FROM public.cities WHERE slug = 'barcelona' LIMIT 1;
  IF bcn_id IS NULL THEN
    RAISE NOTICE 'No Barcelona city row found — skipping seed.';
    RETURN;
  END IF;

  INSERT INTO public.posts
    (slug, title, kind, status, category, excerpt, body, hero_image_url, city_tags, published_at)
  VALUES
    (
      'best-buildings-barcelona',
      'The Best Buildings in Barcelona',
      'resource',
      'published',
      'City Guide',
      'From the Sagrada Família to the Pavelló Mies van der Rohe — the buildings that define Barcelona''s architectural identity, walked in a single day.',
      '<p>Barcelona is a city you read building by building. Modernisme spirals up from the Eixample blocks, mid-century rationalism quietly anchors the seafront, and contemporary museums sit inside reused industrial shells.</p><p>This guide collects the buildings we keep returning to — the ones that explain how the city thinks about light, ornament and the street.</p>',
      'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1600&q=80',
      ARRAY[bcn_id]::uuid[],
      now() - interval '6 days'
    ),
    (
      'modernisme-style-guide-barcelona',
      'A Field Guide to Catalan Modernisme',
      'resource',
      'published',
      'Style Guide',
      'Trencadís mosaics, parabolic arches, wrought-iron flora — a short field guide to recognising Catalan Modernisme on a Barcelona walk.',
      '<p>Catalan Modernisme is more than Gaudí. It is a regional reading of Art Nouveau that fused craft, structure and symbol — and it left Barcelona''s streets dense with details worth slowing down for.</p><p>Use this guide to read the façades: the materials, the motifs, the structural moves that mark a building as Modernista.</p>',
      'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1600&q=80',
      ARRAY[bcn_id]::uuid[],
      now() - interval '2 days'
    )
  ON CONFLICT (slug) DO NOTHING;
END $$;
