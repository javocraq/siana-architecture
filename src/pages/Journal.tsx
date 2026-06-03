import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function Journal() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

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

  const [feature, ...rest] = posts;

  // label-caps — gallery-style category/metadata text (Hanken Grotesk)
  const labelCaps = "font-grotesk text-[13px] font-semibold uppercase tracking-[0.16em] text-[#4F4534]";

  return (
    <SiteLayout>
      <SEO
        title="Journal — Siana Architecture"
        description="Essays, conversations, and field notes on architecture from Siana."
      />
      {/* Warm-white canvas (DESIGN.md — Siana Atlas Narrative) */}
      <div className="bg-[#FFF9F2] min-h-screen">
        <div className="pt-32 md:pt-40 pb-28 md:pb-40 mx-auto max-w-[1280px] px-5 md:px-20">
          {loading ? (
            <p className={labelCaps}>Loading…</p>
          ) : posts.length === 0 ? (
            <p className={labelCaps}>No posts yet.</p>
          ) : (
            <>
              {/* Feature — Fragment layout: full-bleed image, text immediately below */}
              {feature && (
                <Link to={`/journal/${feature.slug}`} className="group block">
                  <div className="aspect-[3/2] overflow-hidden bg-[#E5E1DA]">
                    <img
                      src={feature.hero_image_url || ""}
                      alt={feature.title}
                      className="photo-thumb w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-7 max-w-3xl">
                    {feature.category && <p className={`${labelCaps} mb-4`}>{feature.category}</p>}
                    <h2
                      className="font-garamond text-black transition-colors group-hover:text-[#4F4534]"
                      style={{ fontWeight: 500, fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 1.1, letterSpacing: "-0.02em" }}
                    >
                      {feature.title}
                    </h2>
                    {feature.excerpt && (
                      <p className="font-grotesk mt-5" style={{ fontWeight: 400, fontSize: 19, lineHeight: 1.65, color: "#2f2a26" }}>
                        {feature.excerpt}
                      </p>
                    )}
                    <p className={`${labelCaps} mt-6`}>
                      {feature.author && <>{feature.author} · </>}
                      {feature.published_at && formatDate(feature.published_at)}
                    </p>
                  </div>
                </Link>
              )}

              {/* Rest — Fragment cards in an editorial 3-column grid */}
              {rest.length > 0 && (
                <div className="mt-20 md:mt-28 pt-12 md:pt-16 border-t border-black/10 grid grid-cols-1 md:grid-cols-3 gap-x-8 md:gap-x-10 gap-y-14 md:gap-y-20">
                  {rest.map((p) => (
                    <Link key={p.id} to={`/journal/${p.slug}`} className="group block">
                      <div className="aspect-[4/5] overflow-hidden bg-[#E5E1DA]">
                        <img
                          src={p.hero_image_url || ""}
                          alt={p.title}
                          className="photo-thumb w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      </div>
                      <div className="mt-5">
                        {p.category && <p className={`${labelCaps} mb-3`}>{p.category}</p>}
                        <h3
                          className="font-garamond text-black transition-colors group-hover:text-[#4F4534]"
                          style={{ fontWeight: 500, fontSize: "clamp(22px, 2.4vw, 28px)", lineHeight: 1.15, letterSpacing: "-0.015em" }}
                        >
                          {p.title}
                        </h3>
                        {p.excerpt && (
                          <p
                            className="font-grotesk mt-3 line-clamp-3"
                            style={{ fontWeight: 400, fontSize: 16, lineHeight: 1.6, color: "#2f2a26" }}
                          >
                            {p.excerpt}
                          </p>
                        )}
                        {p.published_at && <p className={`${labelCaps} mt-4`}>{formatDate(p.published_at)}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
