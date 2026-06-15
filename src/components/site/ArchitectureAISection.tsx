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

const serif = "'Adobe Garamond Pro', 'EB Garamond', Garamond, Georgia, serif";
const sans = "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";

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
    <section style={{ background: "#F4F4F4", borderTop: "1px solid hsl(var(--paper-mid))", borderBottom: "1px solid hsl(var(--paper-mid))" }} className="py-20 md:py-28">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start">
        {/* Left */}
        <div>
          <p className="font-mono uppercase text-accent-terra" style={{ fontWeight: 600, fontSize: 13, letterSpacing: "0.2em" }}>
            Architecture + AI
          </p>
          <h2
            className="mt-5 text-black"
            style={{ fontFamily: serif, fontWeight: 400, fontSize: "clamp(30px, 4vw, 44px)", lineHeight: 1.1, letterSpacing: "-0.015em" }}
          >
            The city, reimagined by machines
          </h2>
          <p className="mt-5" style={{ fontFamily: sans, fontWeight: 400, fontSize: 16, color: "#4F4534", lineHeight: 1.7, maxWidth: 460 }}>
            AI is changing how architects design, how cities are imagined, and how
            architectural knowledge travels across the internet. Siana explores
            this intersection — through criticism, reporting, and original research.
          </p>
          <Link
            to="/practice?category=architecture-ai"
            className="inline-block mt-7 font-mono uppercase text-accent-terra hover:opacity-70 transition-opacity"
            style={{ fontWeight: 600, fontSize: 13, letterSpacing: "0.16em", borderBottom: "1px solid currentColor", paddingBottom: 3 }}
          >
            Read the series →
          </Link>
        </div>

        {/* Right — 2 latest posts */}
        <div className="flex flex-col gap-7">
          {posts.map((p) => (
            <Link key={p.id} to={`/practice/${p.slug}`} className="group grid grid-cols-[120px_1fr] gap-5 items-start">
              <div className="aspect-square overflow-hidden bg-paper-mid">
                <img
                  src={p.hero_image_url || ""}
                  alt={p.title}
                  className="photo-thumb w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  loading="lazy"
                />
              </div>
              <div>
                <h3
                  className="text-black transition-colors group-hover:text-[#796C5C]"
                  style={{ fontFamily: serif, fontWeight: 400, fontSize: 20, lineHeight: 1.25, letterSpacing: "-0.01em" }}
                >
                  {p.title}
                </h3>
                {p.excerpt && (
                  <p className="mt-2" style={{ fontFamily: sans, fontWeight: 400, fontSize: 14, color: "#6B6256", lineHeight: 1.6 }}>
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
