import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RichHtml from "@/components/site/RichHtml";
import { Search, X } from "lucide-react";
import type {
  CitySection, RichTextSection, ProjectsSection, JournalSection, GallerySection, SpacerSection,
} from "@/lib/citySections";

interface Project {
  id: string; name: string; slug: string;
  architect: string | null; year_completed: number | null;
  category: string | null;
  cover_image_url: string | null; hero_image_url: string | null;
  featured: boolean | null; style: string | null;
}
interface Post {
  id: string; slug: string; title: string;
  excerpt: string | null; category: string | null;
  hero_image_url: string | null; published_at: string | null;
}

const Eyebrow = ({ text }: { text?: string }) =>
  text ? <p className="text-[13px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-4">{text}</p> : null;

const Heading = ({ text }: { text?: string }) =>
  text ? (
    <h2 className="text-ink mb-10"
      style={{ fontFamily: "'Adobe Garamond Pro', 'EB Garamond', Garamond, Georgia, serif", fontWeight: 400, fontSize: "clamp(26px, 3vw, 38px)", lineHeight: 1.08, letterSpacing: "-0.005em" }}>
      {text}
    </h2>
  ) : null;

function RichTextBlock({ s }: { s: RichTextSection }) {
  const bg = s.settings.background === "warm" ? "bg-warm-white"
    : s.settings.background === "mid" ? "bg-stone" : "bg-background";
  return (
    <section className={`${bg} py-20 md:py-28`}>
      <div className={`mx-auto max-w-[760px] px-6 lg:px-10 ${s.settings.align === "center" ? "text-center" : ""}`}>
        <Eyebrow text={s.settings.eyebrow} />
        <Heading text={s.settings.heading} />
        <RichHtml html={s.settings.html} />
      </div>
    </section>
  );
}

function ProjectsBlock({ s, cityId }: { s: ProjectsSection; cityId: string }) {
  const [items, setItems] = useState<Project[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const styleFilter = searchParams.get("style") || "";
  const setStyleFilter = (v: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v) next.set("style", v); else next.delete("style");
      return next;
    }, { replace: true });
  };
  useEffect(() => {
    (async () => {
      let q = supabase.from("projects")
        .select("id, name, slug, architect, year_completed, category, cover_image_url, hero_image_url, featured, style")
        .eq("city_id", cityId).eq("status", "published")
        .order("year_completed", { ascending: false })
        .limit(s.settings.limit || 6);
      if (s.settings.featuredOnly) q = q.eq("featured", true);
      if (s.settings.category) q = q.eq("category", s.settings.category);
      if (s.settings.style) q = q.eq("style", s.settings.style);
      const { data } = await q;
      if (data) setItems(data as any);
    })();
  }, [cityId, s.settings.limit, s.settings.featuredOnly, s.settings.category, s.settings.style]);

  // Runtime style filter — only meaningful when the editor hasn't already
  // pinned a single style for this section.
  const showStyleFilter = !s.settings.style;
  const styleOptions = useMemo(
    () => Array.from(new Set(items.map((p) => p.style).filter(Boolean) as string[])).sort(),
    [items]
  );
  const filtered = useMemo(
    () => (styleFilter ? items.filter((p) => p.style === styleFilter) : items),
    [items, styleFilter]
  );
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const displayed = useMemo(
    () => (q ? filtered.filter((p) => p.name.toLowerCase().includes(q) || (p.architect || "").toLowerCase().includes(q)) : filtered),
    [filtered, q]
  );

  if (!items.length) return null;
  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="border-t hairline pt-12 mb-10">
          <Eyebrow text={s.settings.eyebrow || "Projects"} />
          <Heading text={s.settings.heading} />
        </div>
        <div className="flex items-center gap-6 mb-12 flex-wrap">
          <div className="flex items-center gap-2 border-b border-black/15 pb-2 focus-within:border-black/40 transition-colors">
            <Search className="w-3.5 h-3.5 text-ink-soft shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects"
              aria-label="Search projects by name"
              className="bg-transparent font-grotesk text-ink placeholder:text-ink-soft focus:outline-none"
              style={{ fontSize: 12, letterSpacing: "0.04em", width: 160 }}
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-ink-soft hover:text-ink shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {showStyleFilter && styleOptions.length > 0 && (
            <>
              <select
                value={styleFilter}
                onChange={(e) => setStyleFilter(e.target.value)}
                aria-label="Filter projects by style"
                className="bg-transparent border-b border-black/15 pb-2 font-grotesk uppercase font-semibold text-ink-soft hover:text-ink focus:outline-none focus:text-ink focus:border-black/40 cursor-pointer transition-colors"
                style={{ fontSize: 11, letterSpacing: "0.22em" }}
              >
                <option value="">Style</option>
                {styleOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
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
            </>
          )}
        </div>
        {displayed.length === 0 ? (
          <p className="font-grotesk text-ink-soft" style={{ fontSize: 14, letterSpacing: "0.04em" }}>No projects match “{query}”.</p>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {displayed.map((p) => (
            <Link key={p.id} to={`/projects/${p.slug}`} className="group block">
              <div className="aspect-[3/4] overflow-hidden bg-stone mb-6">
                <img src={p.cover_image_url || p.hero_image_url || ""} alt={p.name}
                  className="photo-thumb w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />
              </div>
              {p.category && (
                <p className="italic mb-2" style={{ fontFamily: "'Adobe Garamond Pro', 'EB Garamond', Garamond, Georgia, serif", fontSize: 14, color: "hsl(var(--ink-soft))" }}>{p.category}</p>
              )}
              <h3 className="text-ink mb-3 group-hover:opacity-60 transition-opacity"
                style={{ fontFamily: "'Adobe Garamond Pro', 'EB Garamond', Garamond, Georgia, serif", fontWeight: 500, fontSize: 26, letterSpacing: "-0.01em" }}>
                {p.name}
              </h3>
              {p.architect && (
                <p style={{ fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 400, fontSize: 14, color: "hsl(var(--ink-soft))", letterSpacing: "0.01em" }}>
                  {p.architect}{p.year_completed ? ` · ${p.year_completed}` : ""}
                </p>
              )}
            </Link>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}

function JournalBlock({ s, cityId }: { s: JournalSection; cityId: string }) {
  const [items, setItems] = useState<Post[]>([]);
  useEffect(() => {
    (async () => {
      let q = supabase.from("posts")
        .select("id, slug, title, excerpt, category, hero_image_url, published_at, city_tags")
        .eq("status", "published")
        .eq("kind", "journal")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(s.settings.limit || 3);
      if (s.settings.onlyTaggedWithCity) q = q.contains("city_tags", [cityId]);
      if (s.settings.category) q = q.eq("category", s.settings.category);

      const { data } = await q;
      if (data) setItems(data as any);
    })();
  }, [cityId, s.settings.limit, s.settings.onlyTaggedWithCity, s.settings.category]);

  if (!items.length) return null;
  return (
    <section className="py-24 md:py-32 bg-warm-white">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="border-t hairline pt-12 mb-14">
          <Eyebrow text={s.settings.eyebrow || "Practice"} />
          <Heading text={s.settings.heading || "From Practice"} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {items.map((p) => (
            <Link key={p.id} to={`/practice/${p.slug}`} className="group block">
              {p.hero_image_url && (
                <div className="aspect-[4/3] overflow-hidden bg-stone mb-5">
                  <img src={p.hero_image_url} alt={p.title}
                    className="photo-thumb w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />
                </div>
              )}
              {p.category && (
                <p className="text-[12px] font-semibold tracking-[0.16em] uppercase text-ink-soft mb-3">{p.category}</p>
              )}
              <h3 className="text-ink mb-3 group-hover:opacity-60 transition-opacity"
                style={{ fontFamily: "'Adobe Garamond Pro', 'EB Garamond', Garamond, Georgia, serif", fontWeight: 500, fontSize: 24, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
                {p.title}
              </h3>
              {p.excerpt && (
                <p className="text-ink-soft text-[15px] leading-[1.65] line-clamp-3">{p.excerpt}</p>
              )}
              {p.published_at && (
                <p className="text-[12px] font-medium tracking-[0.16em] uppercase text-ink-soft mt-4">
                  {new Date(p.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function GalleryBlock({ s }: { s: GallerySection }) {
  if (!s.settings.images?.length) return null;
  const cols = s.settings.columns || 3;
  const gridCls = cols === 2 ? "md:grid-cols-2" : cols === 4 ? "md:grid-cols-4" : "md:grid-cols-3";
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <Eyebrow text={s.settings.eyebrow} />
        <Heading text={s.settings.heading} />
        <div className={`grid grid-cols-1 ${gridCls} gap-4`}>
          {s.settings.images.map((src, i) => (
            <div key={i} className="aspect-[4/3] overflow-hidden bg-stone">
              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SpacerBlock({ s }: { s: SpacerSection }) {
  return <div style={{ height: `${s.settings.height || 60}px` }} />;
}

export default function CitySectionsRenderer({ sections, cityId }: { sections: CitySection[]; cityId: string }) {
  return (
    <>
      {sections.filter((s) => s.enabled).map((s) => {
        switch (s.type) {
          case "rich_text": return <RichTextBlock key={s.id} s={s} />;
          case "projects":  return <ProjectsBlock key={s.id} s={s} cityId={cityId} />;
          case "journal":   return <JournalBlock key={s.id} s={s} cityId={cityId} />;
          case "gallery":   return <GalleryBlock key={s.id} s={s} />;
          case "spacer":    return <SpacerBlock key={s.id} s={s} />;
          default: return null;
        }
      })}
    </>
  );
}
