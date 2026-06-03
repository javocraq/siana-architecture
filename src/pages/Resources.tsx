import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/site/SiteLayout";
import SEO from "@/components/site/SEO";
import { RESOURCE_CATEGORIES } from "@/lib/postKind";

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

const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

export default function Resources() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSlug = searchParams.get("category");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, slug, title, excerpt, category, author, hero_image_url, published_at")
        .eq("status", "published")
        .eq("kind", "resource")
        .order("published_at", { ascending: false });
      if (data) setPosts(data);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(RESOURCE_CATEGORIES);
    posts.forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [posts]);

  const activeCategory = activeSlug
    ? categories.find((c) => toSlug(c) === activeSlug) || null
    : null;

  const filteredPosts = activeCategory
    ? posts.filter((p) => p.category === activeCategory)
    : posts;

  const setCategory = (cat: string | null) => {
    if (!cat) searchParams.delete("category");
    else searchParams.set("category", toSlug(cat));
    setSearchParams(searchParams);
  };

  return (
    <SiteLayout>
      <SEO
        title="RESOURCES FOR ARCHITECTS — Siana"
        description="Practical guides, playbooks and tools for architecture, engineering and construction firms."
      />
      <div className="pt-32 md:pt-40 pb-24 md:pb-32 mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="flex flex-wrap gap-2 mb-16">
          <button
            onClick={() => setCategory(null)}
            className="uppercase transition-colors"
            style={{
              fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", padding: "8px 16px",
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
            return (
              <button
                key={cat}
                onClick={() => setCategory(on ? null : cat)}
                className="uppercase transition-colors"
                style={{
                  fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", padding: "8px 16px",
                  border: "1px solid",
                  borderColor: on ? "#2563EB" : "rgba(0,0,0,0.2)",
                  background: on ? "#2563EB" : "transparent",
                  color: on ? "#ffffff" : "#0f0f0f",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="text-ink-soft text-[13px] font-medium tracking-[0.16em] uppercase">Loading…</p>
        ) : filteredPosts.length === 0 ? (
          <p className="text-ink-soft text-[13px] font-medium tracking-[0.16em] uppercase">No resources in this category yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-16 gap-y-16 border-t hairline pt-12">
            {filteredPosts.map((p) => (
              <Link key={p.id} to={`/resources/${p.slug}`} className="group block">
                {p.hero_image_url && (
                  <div className="aspect-[4/3] overflow-hidden bg-stone mb-6">
                    <img src={p.hero_image_url} alt={p.title}
                      className="photo-thumb w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />
                  </div>
                )}
                {p.category && (
                  <p className="italic mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: 15, color: "#1d4ed8" }}>
                    {p.category}
                  </p>
                )}
                <h3 className="text-ink leading-tight mb-3 group-hover:opacity-60 transition-opacity"
                  style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: 26, letterSpacing: "-0.01em" }}>
                  {p.title}
                </h3>
                {p.excerpt && <p className="text-[15px] text-ink-soft line-clamp-3 leading-[1.65]">{p.excerpt}</p>}
                {p.published_at && (
                  <p className="text-[12px] font-medium tracking-[0.16em] uppercase text-ink-soft mt-4">
                    {new Date(p.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
