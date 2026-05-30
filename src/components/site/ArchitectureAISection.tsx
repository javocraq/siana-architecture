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
              fontFamily: "Inter, sans-serif",
              fontWeight: 300,
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "#2563EB",
            }}
          >
            Architecture + AI
          </p>
          <h2
            className="mt-6"
            style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontWeight: 300,
              fontSize: "clamp(36px, 5vw, 48px)",
              color: "#ffffff",
              lineHeight: 1.1,
              letterSpacing: "0.01em",
            }}
          >
            The city, reimagined by machines
          </h2>
          <p
            className="mt-6"
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 300,
              fontSize: 15,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.8,
              maxWidth: 480,
            }}
          >
            AI is changing how architects design, how cities are imagined, and how
            architectural knowledge travels across the internet. Siana explores
            this intersection — through criticism, reporting, and original research.
          </p>
          <Link
            to="/journal?category=architecture-ai"
            className="inline-block mt-8 uppercase hover:opacity-70 transition-opacity"
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 300,
              fontSize: 11,
              letterSpacing: "0.18em",
              color: "#2563EB",
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
                    fontFamily: '"Cormorant Garamond", serif',
                    fontWeight: 400,
                    fontSize: 18,
                    color: "#ffffff",
                    lineHeight: 1.25,
                  }}
                >
                  {p.title}
                </h3>
                {p.excerpt && (
                  <p
                    className="mt-2"
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 300,
                      fontSize: 12,
                      color: "rgba(255,255,255,0.5)",
                      lineHeight: 1.6,
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
