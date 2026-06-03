import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  hero_image_url: string | null;
}

export default function ArchitectureAISection() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, slug, title, excerpt, hero_image_url")
        .eq("status", "published")
        .eq("category", "Architecture + AI")
        .order("published_at", { ascending: false })
        .limit(2);
      if (data) setPosts(data);
    })();
  }, []);

  return (
    <section style={{ background: "#0f0f0f" }} className="py-24 md:py-32">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10 grid grid-cols-1 md:grid-cols-2 gap-14 md:gap-20">
        {/* Left */}
        <div>
          <p
            className="uppercase"
            style={{
              fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: "0.18em",
              color: "#7AA8FF",
            }}
          >
            Architecture + AI
          </p>
          <h2
            className="mt-6"
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 500,
              fontSize: "clamp(36px, 5vw, 48px)",
              color: "#ffffff",
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
            }}
          >
            The city, reimagined by machines
          </h2>
          <p
            className="mt-6"
            style={{
              fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontWeight: 400,
              fontSize: 17,
              color: "rgba(255,255,255,0.82)",
              lineHeight: 1.7,
              maxWidth: 480,
            }}
          >
            AI is changing how architects design, how cities are imagined, and how
            architectural knowledge travels across the internet. Siana explores
            this intersection — through criticism, reporting, and original research.
          </p>
          <Link
            to="/journal?category=architecture-ai"
            className="inline-block mt-8 uppercase hover:opacity-80 transition-opacity"
            style={{
              fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontWeight: 600,
              fontSize: 14,
              letterSpacing: "0.16em",
              color: "#7AA8FF",
            }}
          >
            Read the series →
          </Link>
        </div>

        {/* Right — 2 latest posts */}
        <div className="flex flex-col gap-8">
          {posts.map((p) => (
            <Link key={p.id} to={`/journal/${p.slug}`} className="group grid grid-cols-[120px_1fr] gap-5 items-start">
              <div className="aspect-square overflow-hidden bg-stone/20">
                <img
                  src={p.hero_image_url || ""}
                  alt={p.title}
                  className="w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.04]"
                  style={{ filter: "saturate(0.4) hue-rotate(200deg) brightness(0.85)" }}
                  loading="lazy"
                />
              </div>
              <div>
                <h3
                  className="group-hover:opacity-70 transition-opacity"
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontWeight: 500,
                    fontSize: 20,
                    color: "#ffffff",
                    lineHeight: 1.25,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {p.title}
                </h3>
                {p.excerpt && (
                  <p
                    className="mt-2"
                    style={{
                      fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
                      fontWeight: 400,
                      fontSize: 14,
                      color: "rgba(255,255,255,0.78)",
                      lineHeight: 1.65,
                    }}
                  >
                    {p.excerpt}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
