ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'journal';
CREATE INDEX IF NOT EXISTS posts_kind_status_idx ON public.posts (kind, status, published_at DESC);