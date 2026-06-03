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
      {/* Warm-white canvas (DESIGN.md — Siana Atlas Narrative) */}
      <div className="bg-[#FFF9F2] min-h-screen">
        <div className="pt-32 md:pt-40 pb-28 md:pb-40 mx-auto max-w-[1280px] px-5 md:px-20">
          {/* Editorial header — an editorial name for the section, not the tab label */}
          <header className="max-w-3xl mb-10 md:mb-14">
            <h1
              className="font-garamond text-black"
              style={{ fontWeight: 500, fontSize: "clamp(44px, 7vw, 84px)", lineHeight: 1.04, letterSpacing: "-0.02em" }}
            >
              Atlas Metropolitano
            </h1>
            <p
              className="font-garamond text-[#3a2f24] mt-6"
              style={{ fontWeight: 400, fontSize: "clamp(19px, 1.8vw, 23px)", lineHeight: 1.6 }}
            >
              A curated index of permanent architectural forms across global centers. This visual
              registry documents spatial integrity, structural resonance, and the silent luxury of
              built environments.
            </p>
          </header>

          {/* Hairline divider (stark-black @ ~10%) */}
          <div className="border-t border-black/10 mb-12 md:mb-20" />

          {loading ? (
            <p className="font-grotesk text-[13px] font-semibold uppercase tracking-[0.16em] text-[#4F4534]">
              Loading…
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 md:gap-x-10 gap-y-14 md:gap-y-24">
              {cities.map((c) => (
                <Link key={c.id} to={`/cities/${c.slug}`} className="group block">
                  {/* Fragment card — fixed rectangle, image shown whole (no destructive crop) */}
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#E5E1DA]">
                    <img
                      src={c.hero_image_url || ""}
                      alt={c.name}
                      className="photo-thumb w-full h-full object-contain transition-transform duration-700 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </div>
                  {/* Title + metadata positioned immediately below the image */}
                  <div className="mt-5">
                    <p className="font-grotesk text-[13px] font-semibold uppercase tracking-[0.16em] text-[#4F4534] mb-3">
                      {c.country} · {c.project_count} {c.project_count === 1 ? "project" : "projects"}
                    </p>
                    <h2
                      className="font-garamond text-black"
                      style={{ fontWeight: 500, fontSize: "clamp(28px, 3.2vw, 36px)", lineHeight: 1.1, letterSpacing: "-0.015em" }}
                    >
                      {c.name}
                    </h2>
                    {c.tagline && (
                      <p
                        className="font-garamond italic text-[#4F4534] mt-3"
                        style={{ fontWeight: 400, fontSize: 19, lineHeight: 1.45 }}
                      >
                        {c.tagline}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
