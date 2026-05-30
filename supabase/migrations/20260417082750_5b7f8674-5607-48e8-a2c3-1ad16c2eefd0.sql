-- Roles enum + table (security best practice: roles separate from profiles)
CREATE TYPE public.app_role AS ENUM ('admin', 'viewer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Updated_at trigger fn
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + viewer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Cities
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  country TEXT,
  tagline TEXT,
  description TEXT,
  hero_image_url TEXT,
  center_latitude FLOAT8,
  center_longitude FLOAT8,
  default_zoom INT DEFAULT 13,
  status TEXT NOT NULL DEFAULT 'draft',
  meta_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,
  canonical_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_cities_updated_at BEFORE UPDATE ON public.cities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tagline TEXT,
  architect TEXT,
  practice TEXT,
  year_completed INT,
  category TEXT,
  style TEXT,
  era TEXT,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  address TEXT,
  latitude FLOAT8,
  longitude FLOAT8,
  description TEXT,
  hero_image_url TEXT,
  cover_image_url TEXT,
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',
  meta_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,
  canonical_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_projects_city ON public.projects(city_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_featured ON public.projects(featured) WHERE featured = true;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Posts
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  author TEXT,
  category TEXT,
  city_tags UUID[] NOT NULL DEFAULT '{}',
  linked_project_ids UUID[] NOT NULL DEFAULT '{}',
  hero_image_url TEXT,
  excerpt TEXT,
  body TEXT,
  published_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  meta_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,
  canonical_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_posts_status ON public.posts(status);
CREATE INDEX idx_posts_published_at ON public.posts(published_at DESC);
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEO globals
CREATE TABLE public.seo_globals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT UNIQUE NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,
  robots TEXT NOT NULL DEFAULT 'index,follow',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_globals ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_seo_globals_updated_at BEFORE UPDATE ON public.seo_globals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== RLS POLICIES =====

-- user_roles: only admins can read/manage; users can read own
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- cities: public can read published; admins manage
CREATE POLICY "Public can view published cities" ON public.cities
  FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can view all cities" ON public.cities
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert cities" ON public.cities
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update cities" ON public.cities
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete cities" ON public.cities
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- projects
CREATE POLICY "Public can view published projects" ON public.projects
  FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can view all projects" ON public.projects
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update projects" ON public.projects
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete projects" ON public.projects
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- posts
CREATE POLICY "Public can view published posts" ON public.posts
  FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can view all posts" ON public.posts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert posts" ON public.posts
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update posts" ON public.posts
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete posts" ON public.posts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- seo_globals
CREATE POLICY "Public can view seo globals" ON public.seo_globals
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert seo globals" ON public.seo_globals
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update seo globals" ON public.seo_globals
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete seo globals" ON public.seo_globals
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));