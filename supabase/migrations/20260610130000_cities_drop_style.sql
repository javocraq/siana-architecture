-- Style lives on projects, not cities. Region stays on cities.
alter table public.cities
  drop column if exists style;
