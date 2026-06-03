import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Project {
  id: string;
  name: string;
  slug: string;
  cover_image_url: string | null;
  hero_image_url: string | null;
  city: { name: string } | null;
}

/**
 * Featured Buildings — editorial asymmetric grid.
 * Big left card spans 2 rows, 4 smaller cards in a 2x2 to the right.
 * Title: "Featured Buildings." with italic terracotta accent.
 */
export default function FeaturedBuildings() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const { data, count } = await supabase
        .from("projects")
        .select("id, name, slug, cover_image_url, hero_image_url, city:cities(name)", { count: "exact" })
        .eq("status", "published")
        .eq("featured", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (data) setProjects(data as any);
      if (count != null) setTotal(count);
    })();
  }, []);

  if (projects.length < 1) return null;

  const hero = projects[0];
  const rest = projects.slice(1, 5);

  return (
    <section
      className="bg-paper"
      style={{ padding: "6rem 0", borderTop: "1px solid hsl(var(--paper-mid))" }}
    >
      <div
        className="mx-auto max-w-[1400px] flex items-start justify-between flex-wrap gap-6"
        style={{ padding: "0 2.5rem 3rem" }}
      >
        <h2
          className="font-display-black text-ink"
          style={{ fontSize: "clamp(2.4rem, 4.5vw, 4.5rem)", lineHeight: 0.94 }}
        >
          Featured<br />
          <em className="italic text-accent-terra">Buildings.</em>
        </h2>
        <Link
          to="/cities"
          className="font-mono uppercase text-ink-soft hover:text-ink transition-colors border-b border-paper-mid hover:border-ink pb-[2px] whitespace-nowrap mt-3 font-medium"
          style={{ fontSize: "13px", letterSpacing: "0.16em" }}
        >
          View all {total || projects.length} →
        </Link>
      </div>

      <div
        className="mx-auto max-w-[1400px]"
        style={{
          padding: "0 2.5rem",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr",
          gridAutoRows: "minmax(240px, auto)",
          gap: "8px",
        }}
      >
        {/* Hero — spans both rows */}
        <Link
          to={`/projects/${hero.slug}`}
          className="group relative overflow-hidden bg-paper-mid"
          style={{ borderRadius: 0, gridRow: "1 / 3", minHeight: 500 }}
        >
          <img
            src={hero.cover_image_url || hero.hero_image_url || ""}
            alt={hero.name}
            className="photo-thumb w-full h-full object-cover"
            loading="lazy"
          />
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              padding: "3rem 1.8rem 1.5rem",
              background: "linear-gradient(transparent, rgba(17,17,16,0.9))",
              borderRadius: 0,
            }}
          >
            {hero.city?.name && (
              <p
                className="font-mono uppercase mb-2 font-semibold"
                style={{ fontSize: "13px", letterSpacing: "0.18em", color: "#ffffff" }}
              >
                {hero.city.name}
              </p>
            )}
            <h3 className="font-display text-white" style={{ fontSize: "2rem", letterSpacing: "-0.01em" }}>
              {hero.name}
            </h3>
          </div>
        </Link>

        {/* Smaller cards */}
        {rest.map((p) => (
          <Link
            key={p.id}
            to={`/projects/${p.slug}`}
            className="group relative overflow-hidden bg-paper-mid"
            style={{ borderRadius: 0, minHeight: 240 }}
          >
            <img
              src={p.cover_image_url || p.hero_image_url || ""}
              alt={p.name}
              className="photo-thumb w-full h-full object-cover"
              loading="lazy"
            />
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{
                padding: "2.2rem 1.2rem 1rem",
                background: "linear-gradient(transparent, rgba(17,17,16,0.9))",
                borderRadius: 0,
              }}
            >
              {p.city?.name && (
                <p
                  className="font-mono uppercase mb-1.5 font-medium"
                  style={{ fontSize: "12px", letterSpacing: "0.16em", color: "#ffffff" }}
                >
                  {p.city.name}
                </p>
              )}
              <h3 className="font-display text-white" style={{ fontSize: "1.3rem", letterSpacing: "-0.01em" }}>
                {p.name}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
