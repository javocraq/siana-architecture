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
              className="font-mono uppercase text-accent-terra mb-3 font-medium"
              style={{ fontSize: "12px", letterSpacing: "0.22em" }}
            >
              Geography
            </p>
            <h2 className="font-display-black text-ink" style={{ fontSize: "clamp(1.8rem, 3.5vw, 3.4rem)", lineHeight: 1 }}>
              Explore by <em className="italic text-ink-soft">city</em>
            </h2>
          </div>
          <Link
            to="/cities"
            className="font-mono uppercase text-ink-soft hover:text-ink transition-colors border-b border-paper-mid hover:border-ink pb-[2px] font-medium"
            style={{ fontSize: "13px", letterSpacing: "0.16em" }}
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
              className="font-display text-ink mb-1.5"
              style={{ fontSize: "1.25rem", fontWeight: 600 }}
            >
              {c.name}
            </div>
            <div
              className="font-mono uppercase text-ink-soft"
              style={{ fontSize: "12px", letterSpacing: "0.14em" }}
            >
              {c.project_count} {c.project_count === 1 ? "building" : "buildings"}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
