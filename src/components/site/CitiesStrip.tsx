import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface City {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  tagline: string | null;
  hero_image_url: string | null;
  project_count: number;
}

export default function CitiesStrip() {
  const [cities, setCities] = useState<City[]>([]);

  useEffect(() => {
    (async () => {
      const { data: cs } = await supabase
        .from("cities")
        .select("id, name, slug, country, tagline, hero_image_url")
        .eq("status", "published")
        .order("name");
      if (!cs) return;
      const counts = await Promise.all(
        cs.map(async (c) => {
          const { count } = await supabase
            .from("projects")
            .select("*", { count: "exact", head: true })
            .eq("city_id", c.id)
            .eq("status", "published");
          return { id: c.id, count: count ?? 0 };
        })
      );
      const map = new Map(counts.map((x) => [x.id, x.count]));
      setCities(cs.map((c) => ({ ...c, project_count: map.get(c.id) ?? 0 })));
    })();
  }, []);

  return (
    <section className="bg-paper-warm" style={{ paddingTop: "6rem", paddingBottom: 0 }}>
      <div className="mx-auto max-w-[1400px] px-10">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
          <div>
            <p
              className="font-mono uppercase text-accent-terra mb-3"
              style={{ fontSize: "0.52rem", letterSpacing: "0.28em" }}
            >
              Geography
            </p>
            <h2 className="font-display-black text-ink" style={{ fontSize: "clamp(2.5rem, 5vw, 5rem)", lineHeight: 0.94 }}>
              Explore by <em className="italic text-warm-gray">city.</em>
            </h2>
          </div>
          <Link
            to="/cities"
            className="font-mono uppercase text-warm-gray hover:text-ink transition-colors border-b border-paper-mid hover:border-ink pb-[2px]"
            style={{ fontSize: "0.58rem", letterSpacing: "0.18em" }}
          >
            All cities →
          </Link>
        </div>
      </div>

      {/* Cities row — flex with thin dividers, accent-light hover */}
      <div
        className="mx-auto max-w-[1400px] px-10 flex overflow-x-auto no-scrollbar"
        style={{ borderTop: "1px solid hsl(var(--paper-mid))", paddingBottom: "5rem" }}
      >
        {cities.map((c, idx) => (
          <Link
            key={c.id}
            to={`/cities/${c.slug}`}
            className="flex-1 min-w-[140px] py-6 pl-6 hover:bg-accent-light transition-colors"
            style={{
              borderRight: idx < cities.length - 1 ? "1px solid hsl(var(--paper-mid))" : "none",
            }}
          >
            <div
              className="font-display text-ink mb-1"
              style={{ fontSize: "1.05rem", fontWeight: 400 }}
            >
              {c.name}
            </div>
            <div
              className="font-mono uppercase text-warm-gray"
              style={{ fontSize: "0.48rem", letterSpacing: "0.15em" }}
            >
              {c.project_count} {c.project_count === 1 ? "building" : "buildings"}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
