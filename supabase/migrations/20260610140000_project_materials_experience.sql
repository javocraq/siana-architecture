-- Materials & Experience tagging for projects.
-- These power the Atlas filters (atlasFilters.ts: MATERIALS / EXPERIENCES) and
-- are editable per project from the admin (Proyectos → Content).

alter table public.projects
  add column if not exists materials  text[] not null default '{}',
  add column if not exists experience text[] not null default '{}';

-- Seed the existing catalogue so the Atlas filters work immediately.
update public.projects as p
set materials = v.materials, experience = v.experience
from (values
  ('sagrada-familia',       array['Stone','Concrete'],      array['Must Visit']),
  ('casa-batllo',           array['Stone','Glass'],         array['Must Visit']),
  ('mercat-santa-caterina', array['Steel','Timber'],        array['Best Public Space']),
  ('casa-da-musica',        array['Concrete'],              array['Must Visit','Worth the Detour']),
  ('serralves-museum',      array['Concrete','Stone'],      array['Hidden Gem']),
  ('maat-lisbon',           array['Concrete','Glass'],      array['Best Public Space']),
  ('champalimaud-centre',   array['Stone','Concrete'],      array['Worth the Detour']),
  ('casa-luis-barragan',    array['Concrete','Stone'],      array['Architectural Stay','Hidden Gem']),
  ('museo-soumaya',         array['Steel','Glass'],         array['Must Visit']),
  ('8-house',               array['Concrete','Glass'],      array['Architectural Stay']),
  ('royal-danish-opera',    array['Steel','Glass','Stone'], array['Best Public Space']),
  ('robie-house',           array['Brick','Timber'],        array['Student Favorite']),
  ('willis-tower',          array['Steel','Glass'],         array['Must Visit']),
  ('altos-de-lima',         array['Concrete','Brick'],      array['Hidden Gem'])
) as v(slug, materials, experience)
where p.slug = v.slug;
