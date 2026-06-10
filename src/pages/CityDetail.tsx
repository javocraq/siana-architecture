import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/site/SiteLayout";
import SEO from "@/components/site/SEO";
import RichHtml from "@/components/site/RichHtml";
import EditorialButton from "@/components/site/EditorialButton";
import CitySectionsRenderer from "@/components/site/CitySectionsRenderer";
import type { CitySection } from "@/lib/citySections";

interface City {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  tagline: string | null;
  description: string | null;
  hero_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  sections: CitySection[] | null;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  architect: string | null;
  year_completed: number | null;
  category: string | null;
  style: string | null;
  cover_image_url: string | null;
  hero_image_url: string | null;
}

interface Post {
  id: string; slug: string; title: string;
  excerpt: string | null; category: string | null;
  hero_image_url: string | null; published_at: string | null;
}

export default function CityDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const styleFilter = searchParams.get("style") || "";
  const setStyleFilter = (v: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v) next.set("style", v); else next.delete("style");
      return next;
    }, { replace: true });
  };
  const [city, setCity] = useState<City | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: c } = await supabase
        .from("cities")
        .select("id, name, slug, country, tagline, description, hero_image_url, meta_title, meta_description, og_image_url, sections")
        .eq("slug", slug).eq("status", "published").maybeSingle();
      if (!c) { setNotFound(true); setLoading(false); return; }
      setCity(c as any);

      const sections = (c as any).sections as CitySection[] | null;
      const usingDefaults = !sections || sections.length === 0;

      if (usingDefaults) {
        const { data: ps } = await supabase
          .from("projects")
          .select("id, name, slug, architect, year_completed, category, style, cover_image_url, hero_image_url")
          .eq("city_id", c.id).eq("status", "published")
          .order("year_completed", { ascending: false });
        if (ps) setProjects(ps);

        const { data: js } = await supabase
          .from("posts")
          .select("id, slug, title, excerpt, category, hero_image_url, published_at, city_tags")
          .eq("status", "published")
          .contains("city_tags", [c.id])
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(3);
        if (js) setPosts(js as any);
      }

      setLoading(false);
    })();
  }, [slug]);

  const projectStyles = useMemo(
    () => Array.from(new Set(projects.map((p) => p.style).filter(Boolean) as string[])).sort(),
    [projects]
  );
  const filteredProjects = useMemo(
    () => (styleFilter ? projects.filter((p) => p.style === styleFilter) : projects),
    [projects, styleFilter]
  );

  if (notFound) {
    return (
      <SiteLayout>
        <div className="pt-40 pb-32 mx-auto max-w-[1280px] px-6 text-center">
          <h1 className="font-display text-[48px] tracking-editorial text-ink">City not found</h1>
          <Link to="/cities" className="text-[13px] font-medium tracking-[0.16em] uppercase text-ink-soft hover:opacity-60 mt-6 inline-block">← All cities</Link>
        </div>
      </SiteLayout>
    );
  }

  if (loading || !city) {
    return <SiteLayout><div className="pt-40 mx-auto max-w-[1280px] px-6 text-ink-soft text-[13px] font-medium tracking-[0.16em] uppercase">Loading…</div></SiteLayout>;
  }

  const hasCustomLayout = city.sections && city.sections.length > 0;

  return (
    <SiteLayout>
      <SEO
        title={city.meta_title || `${city.name} — Siana Architecture`}
        description={city.meta_description || city.tagline}
        image={city.og_image_url || city.hero_image_url}
      />

      {/* Hero (always shown) */}
      <section className="relative h-[80vh] min-h-[560px] overflow-hidden">
        {city.hero_image_url && (
          <img src={city.hero_image_url} alt={city.name} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-transparent to-ink/60" />
        <div className="absolute inset-0 flex flex-col justify-end pb-16 md:pb-24">
          <div className="mx-auto max-w-[1280px] w-full px-6 lg:px-10 text-background">
            <p className="text-[13px] font-semibold tracking-[0.18em] uppercase opacity-95 mb-4">{city.country}</p>
            <h1
              style={{ fontFamily: "'Adobe Garamond Pro', 'EB Garamond', Garamond, Georgia, serif", fontWeight: 400, letterSpacing: "-0.005em", textTransform: "none" }}
              className="text-[64px] md:text-[112px] leading-[0.95]"
            >
              {city.name}
            </h1>
            {city.tagline && (
              <p
                className="italic mt-8 max-w-2xl opacity-95"
                style={{ fontFamily: "'Adobe Garamond Pro', 'EB Garamond', Garamond, Georgia, serif", fontWeight: 400, fontSize: "clamp(22px, 2.4vw, 32px)", letterSpacing: "0.01em" }}
              >
                {city.tagline}
              </p>
            )}
            <div className="mt-10">
              <EditorialButton to={`/atlas?city=${city.slug}`} arrow variant="invert">
                See {city.name} on the map
              </EditorialButton>
            </div>
          </div>
        </div>
      </section>

      {hasCustomLayout ? (
        <CitySectionsRenderer sections={city.sections!} cityId={city.id} />
      ) : (
        <>
          {/* Default layout: description → projects → journal */}
          {city.description && (
            <section className="bg-warm-white py-28 md:py-36">
              <div className="mx-auto max-w-[760px] px-6 lg:px-10">
                <RichHtml
                  html={city.description}
                  className="prose-lg [&_p]:font-serif [&_p]:text-[clamp(20px,2vw,26px)] [&_p]:leading-[1.6] [&_p]:text-ink"
                />
              </div>
            </section>
          )}

          <section className="py-24 md:py-32 bg-background">
            <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
              <div className="flex items-end justify-between mb-10 border-t hairline pt-12">
                <div>
                  <p className="text-[12px] font-semibold tracking-[0.16em] uppercase text-ink-soft mb-4">Projects</p>
                  <h2
                    className="text-ink"
                    style={{ fontFamily: "'Adobe Garamond Pro', 'EB Garamond', Garamond, Georgia, serif", fontWeight: 400, fontSize: "clamp(30px, 3.4vw, 42px)", lineHeight: 1.08, letterSpacing: "-0.005em" }}
                  >
                    {filteredProjects.length} {filteredProjects.length === 1 ? "project" : "projects"} in {city.name}
                  </h2>
                </div>
                <span className="hidden md:inline-flex">
                  <EditorialButton to={`/atlas?city=${city.slug}`} arrow>On the map</EditorialButton>
                </span>
              </div>

              {projectStyles.length > 0 && (
                <div className="flex items-center gap-6 mb-12">
                  <select
                    value={styleFilter}
                    onChange={(e) => setStyleFilter(e.target.value)}
                    aria-label="Filter projects by style"
                    className="bg-transparent border-b border-black/15 pb-2 font-grotesk uppercase font-semibold text-ink-soft hover:text-ink focus:outline-none focus:text-ink focus:border-black/40 cursor-pointer transition-colors"
                    style={{ fontSize: 11, letterSpacing: "0.22em" }}
                  >
                    <option value="">Style</option>
                    {projectStyles.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {styleFilter && (
                    <button
                      type="button"
                      onClick={() => setStyleFilter("")}
                      className="pb-2 font-grotesk uppercase font-semibold text-ink-soft hover:text-ink transition-colors"
                      style={{ fontSize: 11, letterSpacing: "0.22em" }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {filteredProjects.map((p) => (
                  <Link key={p.id} to={`/projects/${p.slug}`} className="group block">
                    <div className="aspect-[3/4] overflow-hidden bg-stone mb-6" style={{ minHeight: 280 }}>
                      <img
                        src={p.cover_image_url || p.hero_image_url || ""}
                        alt={p.name}
                        className="photo-thumb w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    </div>
                    {p.category && (
                      <p
                        className="italic mb-2"
                        style={{ fontFamily: "'Adobe Garamond Pro', 'EB Garamond', Garamond, Georgia, serif", fontWeight: 400, fontSize: 15, color: "hsl(var(--ink-soft))" }}
                      >
                        {p.category}
                      </p>
                    )}
                    <h3
                      className="text-ink leading-tight mb-3 group-hover:opacity-60 transition-opacity"
                      style={{ fontFamily: "'Adobe Garamond Pro', 'EB Garamond', Garamond, Georgia, serif", fontWeight: 500, fontSize: 26, letterSpacing: "-0.01em" }}
                    >
                      {p.name}
                    </h3>
                    {p.architect && (
                      <p
                        style={{
                          fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
                          fontWeight: 300,
                          fontSize: 14,
                          color: "hsl(var(--ink-muted))",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {p.architect}{p.year_completed ? ` · ${p.year_completed}` : ""}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {posts.length > 0 && (
            <section className="py-24 md:py-32 bg-warm-white">
              <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
                <div className="border-t hairline pt-12 mb-14">
                  <p className="text-[12px] font-semibold tracking-[0.16em] uppercase text-ink-soft mb-4">Journal</p>
                  <h2
                    className="text-ink"
                    style={{ fontFamily: "'Adobe Garamond Pro', 'EB Garamond', Garamond, Georgia, serif", fontWeight: 400, fontSize: "clamp(26px, 3vw, 38px)", lineHeight: 1.08, letterSpacing: "-0.005em" }}
                  >
                    From the Journal
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  {posts.map((p) => (
                    <Link key={p.id} to={`/practice/${p.slug}`} className="group block">
                      {p.hero_image_url && (
                        <div className="aspect-[4/3] overflow-hidden bg-stone mb-5">
                          <img src={p.hero_image_url} alt={p.title}
                            className="photo-thumb w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />
                        </div>
                      )}
                      {p.category && <p className="text-[12px] font-semibold tracking-[0.16em] uppercase text-ink-soft mb-3">{p.category}</p>}
                      <h3 className="text-ink mb-3 group-hover:opacity-60 transition-opacity"
                        style={{ fontFamily: "'Adobe Garamond Pro', 'EB Garamond', Garamond, Georgia, serif", fontWeight: 500, fontSize: 24, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
                        {p.title}
                      </h3>
                      {p.excerpt && <p className="text-ink-soft text-[15px] leading-[1.65] line-clamp-3">{p.excerpt}</p>}
                      {p.published_at && (
                        <p className="text-[12px] font-semibold tracking-[0.16em] uppercase text-ink-soft mt-4">
                          {new Date(p.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </SiteLayout>
  );
}
