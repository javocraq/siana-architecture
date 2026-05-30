import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/site/SiteLayout";
import SEO from "@/components/site/SEO";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  author: string | null;
  hero_image_url: string | null;
  published_at: string | null;
}

const CATEGORY_SLUG: Record<string, string> = {
  "Architecture + AI": "architecture-ai",
};

const slugToCategory = (slug: string | null): string | null => {
  if (!slug) return null;
  const match = Object.entries(CATEGORY_SLUG).find(([, s]) => s === slug);
  return match ? match[0] : null;
};

export default function Journal() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = slugToCategory(searchParams.get("category"));

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, slug, title, excerpt, category, author, hero_image_url, published_at")
        .eq("status", "published")
        .eq("kind", "journal")
        .order("published_at", { ascending: false });
      if (data) setPosts(data);
      setLoading(false);
    })();
  }, []);


  const categories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.category && set.add(p.category));
    if (!set.has("Architecture + AI")) set.add("Architecture + AI");
    return Array.from(set);
  }, [posts]);

  const filteredPosts = activeCategory
    ? posts.filter((p) => p.category === activeCategory)
    : posts;

  const [feature, ...rest] = filteredPosts;

  const setCategory = (cat: string | null) => {
    if (!cat) {
      searchParams.delete("category");
    } else {
      searchParams.set("category", CATEGORY_SLUG[cat] || cat.toLowerCase().replace(/\s+/g, "-"));
    }
    setSearchParams(searchParams);
  };

  return (
    <SiteLayout>
      <SEO
        title="Journal — Siana Architecture"
        description="Essays, conversations, and field notes on architecture from Siana."
      />
      <div className="pt-32 md:pt-40 pb-24 md:pb-32 mx-auto max-w-[1280px] px-6 lg:px-10">
        <header className="mb-12 max-w-2xl">
          <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-4">Reading</p>
          <h1 className="text-[56px] md:text-[88px] leading-[0.95] text-ink" style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300 }}>
            Journal
          </h1>
          <p className="italic text-[20px] md:text-[24px] text-ink-muted mt-6" style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300 }}>
            Essays and field notes on architecture, slowly written.
          </p>
        </header>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2 mb-16 border-t hairline pt-8">
          <button
            onClick={() => setCategory(null)}
            className="uppercase transition-colors"
            style={{
              fontSize: 10,
              fontWeight: 300,
              letterSpacing: "0.18em",
              padding: "6px 14px",
              border: "1px solid",
              borderColor: !activeCategory ? "#0f0f0f" : "rgba(0,0,0,0.2)",
              background: !activeCategory ? "#0f0f0f" : "transparent",
              color: !activeCategory ? "#ffffff" : "#0f0f0f",
            }}
          >
            All
          </button>
          {categories.map((cat) => {
            const on = activeCategory === cat;
            const isAI = cat === "Architecture + AI";
            return (
              <button
                key={cat}
                onClick={() => setCategory(on ? null : cat)}
                className="uppercase transition-colors"
                style={{
                  fontSize: 10,
                  fontWeight: 300,
                  letterSpacing: "0.18em",
                  padding: "6px 14px",
                  border: "1px solid",
                  borderColor: on ? (isAI ? "#2563EB" : "#0f0f0f") : "rgba(0,0,0,0.2)",
                  background: on ? (isAI ? "#2563EB" : "#0f0f0f") : "transparent",
                  color: on ? "#ffffff" : "#0f0f0f",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="text-ink-muted text-[12px] tracking-tag uppercase">Loading…</p>
        ) : filteredPosts.length === 0 ? (
          <p className="text-ink-muted text-[12px] tracking-tag uppercase">No posts in this category yet.</p>
        ) : (
          <>
            {/* Feature */}
            {feature && (
              <Link to={`/journal/${feature.slug}`} className="group block mb-24 border-t hairline pt-12">
                <div className="overflow-hidden bg-stone mb-10" style={{ height: "70vh", minHeight: 480 }}>
                  <img src={feature.hero_image_url || ""} alt={feature.title}
                    className="photo-thumb w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />
                </div>
                <div className="max-w-3xl">
                  {feature.category && (
                    <p
                      className="italic mb-5"
                      style={{
                        fontFamily: '"Cormorant Garamond", serif',
                        fontWeight: 400,
                        fontSize: 13,
                        color: feature.category === "Architecture + AI" ? "#2563EB" : "#6b6760",
                      }}
                    >
                      {feature.category}
                    </p>
                  )}
                  <h2
                    className="text-ink mb-7 group-hover:opacity-60 transition-opacity"
                    style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: "clamp(40px, 5.5vw, 72px)", lineHeight: 1.05, letterSpacing: "0.01em" }}
                  >
                    {feature.title}
                  </h2>
                  {feature.excerpt && (
                    <p
                      className="italic text-ink-muted mb-7"
                      style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 400, fontSize: "clamp(20px, 1.8vw, 24px)", lineHeight: 1.55 }}
                    >
                      {feature.excerpt}
                    </p>
                  )}
                  <p className="text-[10px] tracking-tag uppercase text-ink-faint">
                    {feature.author && <>{feature.author} · </>}
                    {feature.published_at && new Date(feature.published_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                </div>
              </Link>
            )}

            {/* Rest */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-16 gap-y-16 border-t hairline pt-12">
                {rest.map((p) => (
                  <Link key={p.id} to={`/journal/${p.slug}`} className="group block">
                    <div className="aspect-[4/3] overflow-hidden bg-stone mb-6">
                      <img src={p.hero_image_url || ""} alt={p.title}
                        className="photo-thumb w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />
                    </div>
                    {p.category && (
                      <p
                        className="italic mb-3"
                        style={{
                          fontFamily: '"Cormorant Garamond", serif',
                          fontWeight: 400,
                          fontSize: 13,
                          color: p.category === "Architecture + AI" ? "#2563EB" : "#6b6760",
                        }}
                      >
                        {p.category}
                      </p>
                    )}
                    <h3
                      className="text-ink leading-tight mb-3 group-hover:opacity-60 transition-opacity"
                      style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 400, fontSize: 26, letterSpacing: "0.01em" }}
                    >
                      {p.title}
                    </h3>
                    {p.excerpt && <p className="text-[13px] text-ink-muted line-clamp-3 leading-relaxed">{p.excerpt}</p>}
                    {p.published_at && (
                      <p className="text-[10px] tracking-tag uppercase text-ink-faint mt-4">
                        {new Date(p.published_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "long", year: "numeric",
                        })}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </SiteLayout>
  );
}
