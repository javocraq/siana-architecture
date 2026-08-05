-- Newsletter sign-ups from the footer form.
--
-- The list is stored here first and forwarded to Substack second, so a
-- Substack outage (or a change to their undocumented subscribe endpoint) can
-- never lose an address. `substack_status` records how that hand-off went, and
-- rows left as 'failed' can be retried or exported and imported by hand.
--
-- Nothing writes to this table from the browser: the `newsletter-subscribe`
-- Edge Function is the only writer and it uses the service role. Hence no
-- anon/authenticated INSERT policy — only admins can read.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  -- Stored already lower-cased so Ana@x.com and ana@x.com are one person. The
  -- constraint is on the plain column (not an expression index) because
  -- PostgREST's `on_conflict=email` can only target a real unique constraint;
  -- the check keeps the invariant true for any future writer.
  email text not null unique check (email = lower(email)),
  name text,
  -- Where the sign-up came from, e.g. the page path the reader was on.
  source text,
  substack_status text not null default 'pending'
    check (substack_status in ('pending', 'subscribed', 'failed')),
  substack_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_subscribers_status_idx
  on public.newsletter_subscribers (substack_status)
  where substack_status <> 'subscribed';

drop trigger if exists trg_newsletter_subscribers_updated_at on public.newsletter_subscribers;
create trigger trg_newsletter_subscribers_updated_at
  before update on public.newsletter_subscribers
  for each row execute function public.update_updated_at_column();

alter table public.newsletter_subscribers enable row level security;

-- Subscriber emails are personal data: readable only by admins, and never by
-- the anon key the public site ships with.
drop policy if exists "Admins can read subscribers" on public.newsletter_subscribers;
create policy "Admins can read subscribers"
  on public.newsletter_subscribers for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can manage subscribers" on public.newsletter_subscribers;
create policy "Admins can manage subscribers"
  on public.newsletter_subscribers for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
