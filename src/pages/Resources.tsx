import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/site/SiteLayout";
import SEO from "@/components/site/SEO";
import { PRACTICE_CATEGORIES } from "@/lib/postKind";

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

const toSlug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

// Hides the category bar when scrolling down, reveals it when scrolling up.
// Resets to visible near the very top so the first paint shows the bar.
function useAutoHideOnScrollDown() {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80) { setVisible(true); lastY.current = y; return; }
      const dy = y - lastY.current;
      if (Math.abs(dy) < 6) return;
      setVisible(dy < 0);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return visible;
}

export default function Resources() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSlug = searchParams.get("category");
  const barVisible = useAutoHideOnScrollDown();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, slug, title, excerpt, category, author, hero_image_url, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (data) setPosts(data);
      setLoading(false);
    })();
  }, []);

  // Categories: predefined list + any extra categories already used in posts.
  const categories = useMemo(() => {
    const set = new Set<string>(PRACTICE_CATEGORIES);
    posts.forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [posts]);

  const activeCategory = activeSlug
    ? categories.find((c) => toSlug(c) === activeSlug) || null
    : null;

  const filteredPosts = activeCategory
    ? posts.filter((p) => p.category === activeCategory)
    : posts;

  const featured = filteredPosts[0];
  const rest = filteredPosts.slice(1);

  const setCategory = (cat: string | null) => {
    if (!cat) searchParams.delete("category");
    else searchParams.set("category", toSlug(cat));
    setSearchParams(searchParams);
  };

  return (
    <SiteLayout>
      <SEO
        title={activeCategory ? `${activeCategory} — Practice — Siana` : "Practice — Siana"}
        description="Essays, field notes and practical guides for architecture, engineering and construction firms."
      />

      {/* Auto-hiding category nav — sits just below the main 76px navbar. */}
      <div
        className="fixed left-0 right-0 z-30 transition-transform duration-300"
        style={{
          top: 76,
          transform: barVisible ? "translateY(0)" : "translateY(-130%)",
          background: "hsl(var(--paper))",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <nav className="mx-auto max-w-[1280px] px-6 lg:px-10 py-4 flex items-center justify-center gap-8 md:gap-12 flex-wrap">
          {categories.map((cat) => {
            const on = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(on ? null : cat)}
                className="font-mono uppercase transition-opacity hover:opacity-70"
                style={{
                  fontSize: 12,
                  letterSpacing: "0.22em",
                  fontWeight: on ? 700 : 500,
                  color: "#0f0f0f",
                  borderBottom: on ? "1px solid #0f0f0f" : "1px solid transparent",
                  paddingBottom: 3,
                }}
              >
                {cat}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Top padding clears the main navbar (76px) + category bar (≈52px). */}
      <div className="pt-[160px] md:pt-[180px] pb-24 md:pb-32 mx-auto max-w-[1280px] px-6 lg:px-10">
        {/* Editorial heading: "CATEGORÍA" eyebrow + large serif name */}
        <div className="text-center mb-14 md:mb-20">
          <p
            className="font-mono uppercase text-ink-soft mb-4"
            style={{ fontSize: 12, letterSpacing: "0.22em" }}
          >
            {activeCategory ? "Categoría" : "Práctica"}
          </p>
          <h1
            className="font-garamond text-black"
            style={{
              fontWeight: 400,
              fontSize: "clamp(40px, 6vw, 80px)",
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}
          >
            {activeCategory || "Todo"}
          </h1>
        </div>

        {loading ? (
          <p className="text-ink-soft text-[13px] font-medium tracking-[0.16em] uppercase text-center">
            Loading…
          </p>
        ) : filteredPosts.length === 0 ? (
          <p className="text-ink-soft text-[13px] font-medium tracking-[0.16em] uppercase text-center">
            No entries in this category yet.
          </p>
        ) : (
          <>
            {/* Featured — large image left, copy right */}
            {featured && (
              <Link
                to={`/practice/${featured.slug}`}
                className="grid grid-cols-1 md:grid-cols-2 mb-20 md:mb-28 group"
              >
                {featured.hero_image_url ? (
                  <div className="aspect-[4/5] md:aspect-auto overflow-hidden bg-stone">
                    <img
                      src={featured.hero_image_url}
                      alt={featured.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="bg-stone aspect-[4/5] md:aspect-auto" />
                )}
                <div
                  className="flex flex-col justify-center px-8 md:px-14 py-12 md:py-20"
                  style={{ background: "#F5F1EA" }}
                >
                  {featured.category && (
                    <p
                      className="font-mono uppercase text-ink-soft mb-6"
                      style={{ fontSize: 12, letterSpacing: "0.22em", fontWeight: 600 }}
                    >
                      {featured.category}
                    </p>
                  )}
                  <h2
                    className="font-garamond text-black mb-6 group-hover:opacity-70 transition-opacity"
                    style={{
                      fontWeight: 400,
                      fontSize: "clamp(28px, 3.6vw, 46px)",
                      lineHeight: 1.1,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p
                      className="font-garamond text-ink-soft mb-8 max-w-[480px]"
                      style={{ fontSize: 17, lineHeight: 1.6 }}
                    >
                      {featured.excerpt}
                    </p>
                  )}
                  <span
                    className="inline-flex items-center gap-3 font-mono uppercase border hairline px-6 py-3 self-start group-hover:bg-ink group-hover:text-background transition-colors"
                    style={{ fontSize: 12, letterSpacing: "0.22em", fontWeight: 600 }}
                  >
                    Leer más →
                  </span>
                </div>
              </Link>
            )}

            {/* Rest grid */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-16 border-t hairline pt-16">
                {rest.map((p) => (
                  <Link key={p.id} to={`/practice/${p.slug}`} className="group block">
                    {p.hero_image_url && (
                      <div className="aspect-[4/3] overflow-hidden bg-stone mb-5">
                        <img
                          src={p.hero_image_url}
                          alt={p.title}
                          className="photo-thumb w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      </div>
                    )}
                    {p.category && (
                      <p
                        className="font-mono uppercase text-ink-soft mb-3"
                        style={{ fontSize: 11, letterSpacing: "0.2em", fontWeight: 600 }}
                      >
                        {p.category}
                      </p>
                    )}
                    <h3
                      className="font-garamond text-black leading-tight mb-3 group-hover:opacity-60 transition-opacity"
                      style={{ fontWeight: 400, fontSize: 22, letterSpacing: "-0.005em", lineHeight: 1.2 }}
                    >
                      {p.title}
                    </h3>
                    {p.excerpt && (
                      <p className="text-[14px] text-ink-soft line-clamp-3 leading-[1.6]">
                        {p.excerpt}
                      </p>
                    )}
                    {p.published_at && (
                      <p
                        className="font-mono uppercase text-ink-soft mt-4"
                        style={{ fontSize: 11, letterSpacing: "0.18em" }}
                      >
                        {new Date(p.published_at).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
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
