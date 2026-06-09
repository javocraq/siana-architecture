import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/site/SiteLayout";
import SEO from "@/components/site/SEO";
import Reveal from "@/components/site/Reveal";

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
  const [query, setQuery] = useState("");

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.country?.toLowerCase().includes(q) ?? false)
    );
  }, [cities, query]);

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
              style={{ fontWeight: 400, fontSize: "clamp(32px, 5vw, 58px)", lineHeight: 1.08, letterSpacing: "-0.005em" }}
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

          {/* Search — editorial prompt: small mono-caps label sits above
              a large serif italic field with only a hairline underneath. */}
          <div className="flex flex-col items-start text-left mb-10 md:mb-14">
            <label
              htmlFor="city-search"
              className="font-grotesk uppercase text-[#4F4534] mb-4 font-semibold"
              style={{ fontSize: 11, letterSpacing: "0.28em" }}
            >
              Looking for
            </label>
            <div
              className="relative w-full"
              style={{ maxWidth: 520, borderBottom: "1px solid rgba(0,0,0,0.18)" }}
            >
              <input
                id="city-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="a city or a country"
                className="w-full bg-transparent py-3 text-left font-garamond italic text-black placeholder:text-[#9a8e7e] focus:outline-none"
                style={{ fontSize: "clamp(22px, 2.8vw, 32px)", lineHeight: 1.3 }}
                aria-label="Search cities"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[#4F4534] hover:text-black transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Hairline divider (stark-black @ ~10%) */}
          <div className="border-t border-black/10 mb-12 md:mb-20" />

          {loading ? (
            <p className="font-grotesk text-[13px] font-semibold uppercase tracking-[0.16em] text-[#4F4534]">
              Loading…
            </p>
          ) : filtered.length === 0 ? (
            <p className="font-garamond italic text-[#4F4534]" style={{ fontSize: 19, lineHeight: 1.5 }}>
              No cities match “{query}”.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 md:gap-x-10 gap-y-14 md:gap-y-24">
              {filtered.map((c, i) => (
                <Reveal key={c.id} delay={(i % 6) * 90}>
                <Link to={`/cities/${c.slug}`} className="group block">
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
                      style={{ fontWeight: 400, fontSize: "clamp(22px, 2.4vw, 28px)", lineHeight: 1.15, letterSpacing: "-0.005em" }}
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
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
