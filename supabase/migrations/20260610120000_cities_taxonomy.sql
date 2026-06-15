-- Cities taxonomy: region (e.g. Europe, Asia, Americas) and style
-- (e.g. Modernist, Brutalist, Vernacular). Free text for now; can be
-- promoted to enums or reference tables later if the vocabulary stabilizes.
alter table public.cities
  add column if not exists region text,
  add column if not exists style text;
