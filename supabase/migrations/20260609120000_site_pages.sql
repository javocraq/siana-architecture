-- Static editorial pages (About manifesto, etc.). Stored as JSON so the
-- shape can evolve without a migration per field. Public read, admin write.
create table if not exists public.site_pages (
  key text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_pages enable row level security;

drop policy if exists "Anyone can read site pages" on public.site_pages;
create policy "Anyone can read site pages"
  on public.site_pages for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can manage site pages" on public.site_pages;
create policy "Admins can manage site pages"
  on public.site_pages for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Seed the About page with the current manifesto copy.
insert into public.site_pages (key, content) values (
  'about',
  jsonb_build_object(
    'eyebrow', 'Siana — Manifesto',
    'headline', 'The city as architecture.',
    'body', jsonb_build_array(
      'Siana is an architectural magazine that lives on a map. We believe the most interesting building in any city is rarely the most famous one — and that the best way to understand a place is to walk it, slowly, with someone pointing.',
      'We curate projects across cities, write about them with the care of an editor and the eye of an architect, and put them on a map you can actually use. No ads. No clutter. No infinite scroll.',
      'Made for those who look.'
    ),
    'cta_label', 'Open the map →'
  )
)
on conflict (key) do nothing;
