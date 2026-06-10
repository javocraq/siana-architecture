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
  region: string | null;
  tagline: string | null;
  hero_image_url: string | null;
  project_count: number;
  project_styles: string[];
}

export default function Cities() {
  const [cities, setCities] = useState<City[]>([]);
  const [allStyles, setAllStyles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [style, setStyle] = useState("");

  useEffect(() => {
    (async () => {
      const { data: cs } = await supabase
        .from("cities")
        .select("id, name, slug, country, region, tagline, hero_image_url")
        .eq("status", "published")
        .order("name");
      if (!cs) { setLoading(false); return; }

      // Pull every published project's (city_id, style) in one go and group by city.
      const { data: ps } = await supabase
        .from("projects")
        .select("city_id, style")
        .eq("status", "published");
      const stylesByCity = new Map<string, Set<string>>();
      const styleSet = new Set<string>();
      (ps || []).forEach((p) => {
        if (!p.city_id) return;
        if (!stylesByCity.has(p.city_id)) stylesByCity.set(p.city_id, new Set());
        if (p.style) {
          stylesByCity.get(p.city_id)!.add(p.style);
          styleSet.add(p.style);
        }
      });

      const counts = await Promise.all(
        cs.map(async (c) => {
          const { count } = await supabase
            .from("projects").select("*", { count: "exact", head: true })
            .eq("city_id", c.id).eq("status", "published");
          return [c.id, count ?? 0] as const;
        })
      );
      const map = new Map(counts);
      setCities(cs.map((c) => ({
        ...c,
        project_count: map.get(c.id) ?? 0,
        project_styles: Array.from(stylesByCity.get(c.id) || []),
      })));
      setAllStyles(Array.from(styleSet).sort());
      setLoading(false);
    })();
  }, []);

  const regions = useMemo(
    () => Array.from(new Set(cities.map((c) => c.region).filter(Boolean) as string[])).sort(),
    [cities]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cities.filter((c) => {
      if (q && !(c.name.toLowerCase().includes(q) || (c.country?.toLowerCase().includes(q) ?? false))) {
        return false;
      }
      if (region && c.region !== region) return false;
      if (style && !c.project_styles.includes(style)) return false;
      return true;
    });
  }, [cities, query, region, style]);

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
          <header className="max-w-3xl mx-auto text-center mb-10 md:mb-14">
            <h1
              className="font-garamond text-black"
              style={{ fontWeight: 400, fontSize: "clamp(32px, 5vw, 58px)", lineHeight: 1.08, letterSpacing: "-0.005em" }}
            >
              Cities
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

          {/* Search + optional filters — single centered row, minimal hairline styling */}
          <div className="flex flex-wrap justify-center items-end gap-x-6 gap-y-3 mb-12 md:mb-16">
            <div
              className="relative"
              style={{ width: 280, borderBottom: "1px solid rgba(0,0,0,0.18)" }}
            >
              <input
                id="city-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a city or country"
                className="w-full bg-transparent py-2 pr-6 text-center font-garamond italic text-black placeholder:text-[#9a8e7e] focus:outline-none"
                style={{ fontSize: 15, lineHeight: 1.4 }}
                aria-label="Search cities"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[#4F4534] hover:text-black transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              aria-label="Filter by region"
              disabled={regions.length === 0}
              className="bg-transparent border-b border-black/15 pb-2 font-grotesk uppercase font-semibold text-[#4F4534] hover:text-black focus:outline-none focus:text-black focus:border-black/40 cursor-pointer transition-colors disabled:text-[#9a8e7e] disabled:cursor-not-allowed"
              style={{ fontSize: 11, letterSpacing: "0.22em" }}
            >
              <option value="">Region</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              aria-label="Filter cities by project style"
              disabled={allStyles.length === 0}
              className="bg-transparent border-b border-black/15 pb-2 font-grotesk uppercase font-semibold text-[#4F4534] hover:text-black focus:outline-none focus:text-black focus:border-black/40 cursor-pointer transition-colors disabled:text-[#9a8e7e] disabled:cursor-not-allowed"
              style={{ fontSize: 11, letterSpacing: "0.22em" }}
            >
              <option value="">Style</option>
              {allStyles.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {(region || style) && (
              <button
                type="button"
                onClick={() => { setRegion(""); setStyle(""); }}
                className="pb-2 font-grotesk uppercase font-semibold text-[#4F4534] hover:text-black transition-colors"
                style={{ fontSize: 11, letterSpacing: "0.22em" }}
              >
                Clear
              </button>
            )}
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
                <Link
                  to={`/cities/${c.slug}${style ? `?style=${encodeURIComponent(style)}` : ""}`}
                  className="group block"
                >
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
