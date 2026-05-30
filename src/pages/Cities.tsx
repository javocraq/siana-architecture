import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/site/SiteLayout";
import SEO from "@/components/site/SEO";

interface City {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  tagline: string | null;
  hero_image_url: string | null;
  project_count: number;
}

export default function Cities() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: cs } = await supabase
        .from("cities")
        .select("id, name, slug, country, tagline, hero_image_url")
        .eq("status", "published")
        .order("name");
      if (!cs) { setLoading(false); return; }
      const counts = await Promise.all(
        cs.map(async (c) => {
          const { count } = await supabase
            .from("projects").select("*", { count: "exact", head: true })
            .eq("city_id", c.id).eq("status", "published");
          return [c.id, count ?? 0] as const;
        })
      );
      const map = new Map(counts);
      setCities(cs.map((c) => ({ ...c, project_count: map.get(c.id) ?? 0 })));
      setLoading(false);
    })();
  }, []);

  return (
    <SiteLayout>
      <SEO
        title="Cities — Siana Architecture"
        description="Explore architectural projects city by city. Curated editorial features from across the world."
      />
      <div className="pt-32 md:pt-40 pb-24 md:pb-32 mx-auto max-w-[1280px] px-6 lg:px-10">
        <header className="mb-20 max-w-2xl">
          <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-4">Index</p>
          <h1
            className="text-ink"
            style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: "clamp(64px, 9vw, 104px)", lineHeight: 0.95, letterSpacing: "0.01em" }}
          >
            Cities
          </h1>
          <p
            className="italic text-ink-muted mt-8"
            style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 400, fontSize: "clamp(22px, 2.4vw, 28px)" }}
          >
            A growing atlas. Each city, a chapter.
          </p>
        </header>

        {loading ? (
          <p className="text-ink-muted text-[12px] tracking-tag uppercase">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
            {cities.map((c) => (
              <Link
                key={c.id}
                to={`/cities/${c.slug}`}
                className="group block"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-stone mb-6">
                  <img
                    src={c.hero_image_url || ""}
                    alt={c.name}
                    className="photo-thumb w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8 text-background">
                    <p className="text-[10px] tracking-tag uppercase opacity-80 mb-2">
                      {c.country} · {c.project_count} {c.project_count === 1 ? "project" : "projects"}
                    </p>
                    <h2
                      style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: "clamp(52px, 5vw, 72px)", lineHeight: 0.95, letterSpacing: "0.01em" }}
                    >
                      {c.name}
                    </h2>
                  </div>
                </div>
                {c.tagline && (
                  <p
                    className="italic text-ink-muted"
                    style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 400, fontSize: 20 }}
                  >
                    {c.tagline}
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
