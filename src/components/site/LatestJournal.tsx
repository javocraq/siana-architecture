import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Post {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  hero_image_url: string | null;
  excerpt: string | null;
  published_at: string | null;
}

/**
 * Photo grid — per spec section 10.
 * 3-col layout (2fr 1fr 1fr), first item spans both rows.
 */
export default function LatestJournal() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, slug, title, category, hero_image_url, excerpt, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(5);
      if (data) setPosts(data as any);
    })();
  }, []);

  if (!posts.length) return null;

  const featured = posts[0];
  const rest = posts.slice(1, 5);

  return (
    <section className="bg-paper" style={{ padding: "6rem 0" }}>
      <div
        className="mx-auto max-w-[1400px] flex items-baseline justify-between flex-wrap gap-4"
        style={{ padding: "0 2.5rem 3rem" }}
      >
        <h2 className="font-display-black text-ink" style={{ fontSize: "clamp(2rem, 4vw, 4rem)" }}>
          From the <em className="italic text-accent-terra">journal.</em>
        </h2>
        <Link
          to="/journal"
          className="font-mono uppercase text-warm-gray hover:text-ink transition-colors border-b border-paper-mid hover:border-ink pb-[2px] whitespace-nowrap"
          style={{ fontSize: "0.58rem", letterSpacing: "0.18em" }}
        >
          All essays →
        </Link>
      </div>

      <div
        className="mx-auto max-w-[1400px]"
        style={{
          padding: "0 2.5rem",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr",
          gridAutoRows: "minmax(220px, auto)",
          gap: "4px",
        }}
      >
        {/* Featured — spans both rows */}
        <Link
          to={`/journal/${featured.slug}`}
          className="group relative overflow-hidden bg-paper-mid"
          style={{ borderRadius: "10px", gridRow: "1 / 3", minHeight: "460px" }}
        >
          <img
            src={featured.hero_image_url || ""}
            alt={featured.title}
            className="photo-thumb w-full h-full object-cover"
            style={{ minHeight: "460px" }}
            loading="lazy"
          />
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              padding: "2.5rem 1.4rem 1.2rem",
              background: "linear-gradient(transparent, rgba(17,17,16,0.7))",
              borderRadius: "0 0 10px 10px",
            }}
          >
            {featured.category && (
              <p
                className="font-mono uppercase mb-1"
                style={{ fontSize: "0.48rem", letterSpacing: "0.2em", color: "hsl(var(--accent-light))" }}
              >
                {featured.category}
              </p>
            )}
            <h3
              className="font-display text-white"
              style={{ fontSize: "1.4rem", letterSpacing: "-0.01em" }}
            >
              {featured.title}
            </h3>
          </div>
        </Link>

        {/* Smaller items */}
        {rest.map((p) => (
          <Link
            key={p.id}
            to={`/journal/${p.slug}`}
            className="group relative overflow-hidden bg-paper-mid"
            style={{ borderRadius: "10px", minHeight: "220px" }}
          >
            <img
              src={p.hero_image_url || ""}
              alt={p.title}
              className="photo-thumb w-full h-full object-cover"
              style={{ minHeight: "220px" }}
              loading="lazy"
            />
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{
                padding: "2rem 1.2rem 1rem",
                background: "linear-gradient(transparent, rgba(17,17,16,0.7))",
                borderRadius: "0 0 10px 10px",
              }}
            >
              {p.category && (
                <p
                  className="font-mono uppercase mb-1"
                  style={{ fontSize: "0.48rem", letterSpacing: "0.2em", color: "hsl(var(--accent-light))" }}
                >
                  {p.category}
                </p>
              )}
              <h3 className="font-display text-white" style={{ fontSize: "1rem", letterSpacing: "-0.01em" }}>
                {p.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
