import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Reveal from "@/components/site/Reveal";
import EditorialButton from "@/components/site/EditorialButton";
import { useHomeContent } from "@/hooks/useHomeContent";

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
  const content = useHomeContent();

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
      <Reveal
        className="mx-auto max-w-[1400px] px-6 lg:px-10"
        style={{ paddingBottom: "5rem" }}
      >
        <div className="text-center max-w-xl mx-auto">
          <h2 className="font-display-black text-ink" style={{ fontSize: "clamp(1.5rem, 2.8vw, 2.6rem)", lineHeight: 1.05 }}>
            {content.journal.headline_lead}
            {content.journal.headline_emphasis ? (
              <> <em className="italic text-accent-terra">{content.journal.headline_emphasis}</em></>
            ) : null}
          </h2>
          <p
            className="font-mono text-ink-soft mt-7 mx-auto"
            style={{ fontSize: 14, lineHeight: 1.7, letterSpacing: "0.01em", maxWidth: 440 }}
          >
            {content.journal.description}
          </p>
        </div>
      </Reveal>

      <div
        className="mx-auto max-w-[1400px] px-6 lg:px-10 grid grid-cols-1 gap-1 md:grid-cols-[2fr_1fr_1fr]"
        style={{ gridAutoRows: "minmax(220px, auto)" }}
      >
        {/* Featured — spans both rows on desktop; full-width on mobile */}
        <Reveal className="md:row-span-2">
        <Link
          to={`/practice/${featured.slug}`}
          className="group relative overflow-hidden bg-paper-mid block h-full"
          style={{ borderRadius: 0, minHeight: "460px" }}
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
              background: "linear-gradient(transparent, rgba(17,17,16,0.88))",
              borderRadius: 0,
            }}
          >
            {featured.category && (
              <p
                className="font-mono uppercase mb-1"
                style={{ fontSize: "12px", letterSpacing: "0.18em", fontWeight: 500, color: "#ffe4dc" }}
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
        </Reveal>

        {/* Smaller items */}
        {rest.map((p, i) => (
          <Reveal key={p.id} delay={120 + i * 110}>
          <Link
            to={`/practice/${p.slug}`}
            className="group relative overflow-hidden bg-paper-mid block h-full"
            style={{ borderRadius: 0, minHeight: "220px" }}
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
                background: "linear-gradient(transparent, rgba(17,17,16,0.88))",
                borderRadius: 0,
              }}
            >
              {p.category && (
                <p
                  className="font-mono uppercase mb-1"
                  style={{ fontSize: "12px", letterSpacing: "0.18em", fontWeight: 500, color: "#ffe4dc" }}
                >
                  {p.category}
                </p>
              )}
              <h3 className="font-display text-white" style={{ fontSize: "1rem", letterSpacing: "-0.01em" }}>
                {p.title}
              </h3>
            </div>
          </Link>
          </Reveal>
        ))}
      </div>

      <Reveal className="mx-auto max-w-[1400px] flex justify-center" style={{ padding: "4rem 2.5rem 0" }}>
        <EditorialButton to="/practice" arrow variant="muted">{content.journal.cta}</EditorialButton>
      </Reveal>
    </section>
  );
}
