import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Reveal from "@/components/site/Reveal";
import { useHomeContent } from "@/hooks/useHomeContent";
import { sanitizeInline } from "@/lib/inlineHtml";

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
  const content = useHomeContent();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, slug, cover_image_url, hero_image_url, city:cities(name)")
        .eq("status", "published")
        .eq("featured", true)
        // Order by last-touched, not creation date, so toggling a project's
        // "featured" flag (which bumps updated_at via the DB trigger) promotes
        // it to the front of this 5-slot showcase. Otherwise older featured
        // projects could never surface here no matter how you toggle them.
        .order("updated_at", { ascending: false })
        .limit(5);
      if (data) setProjects(data as any);
    })();
  }, []);

  if (projects.length < 1) return null;

  const hero = projects[0];
  const rest = projects.slice(1, 5);

  return (
    <section
      className="bg-paper"
      style={{ padding: "6rem 0" }}
    >
      <Reveal
        className="mx-auto max-w-[1400px] px-6 lg:px-10"
        style={{ paddingBottom: "5rem" }}
      >
        <div className="text-center max-w-xl mx-auto">
          <h2
            className="font-display-black text-ink [&_em]:italic"
            style={{ fontSize: "clamp(2rem, 3.7vw, 3.4rem)", lineHeight: 1.05 }}
            dangerouslySetInnerHTML={{ __html: sanitizeInline(content.buildings.headline) }}
          />
          <p
            className="font-mono text-ink-soft mt-7 mx-auto [&_em]:italic [&_strong]:font-semibold"
            style={{ fontSize: 16, lineHeight: 1.7, letterSpacing: "0.01em", maxWidth: 460 }}
            dangerouslySetInnerHTML={{ __html: sanitizeInline(content.buildings.description) }}
          />
        </div>
      </Reveal>

      <div
        className="mx-auto max-w-[1400px] px-6 lg:px-10 grid grid-cols-1 gap-2 md:grid-cols-[1.4fr_1fr_1fr]"
        style={{ gridAutoRows: "minmax(240px, auto)" }}
      >
        {/* Hero — spans both rows on desktop; full-width on mobile */}
        <Reveal className="md:row-span-2">
        <Link
          to={`/projects/${hero.slug}`}
          className="group relative overflow-hidden bg-paper-mid block h-full lift"
          style={{ borderRadius: 0, minHeight: 500 }}
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
        </Reveal>

        {/* Smaller cards */}
        {rest.map((p, i) => (
          <Reveal key={p.id} delay={120 + i * 110}>
          <Link
            to={`/projects/${p.slug}`}
            className="group relative overflow-hidden bg-paper-mid block h-full lift"
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
          </Reveal>
        ))}
      </div>
    </section>
  );
}
