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
      className="bg-paper py-16 md:py-24"
    >
      <Reveal
        className="mx-auto max-w-[1400px] px-6 lg:px-10"
        style={{ paddingBottom: "2.5rem" }}
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
        // Mobile: a swipeable row that snaps card to card, matching the
        // Cities strip above it. From md up it goes back to the asymmetric
        // mosaic, with the hero spanning both rows.
        className="mx-auto max-w-[1400px] px-6 lg:px-10 flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-pl-6 lg:scroll-pl-10 md:grid md:grid-cols-[1.4fr_1fr_1fr] md:gap-2 md:overflow-visible md:snap-none"
        style={{ gridAutoRows: "minmax(240px, auto)" }}
      >
        {/* Hero — spans both rows on desktop; full-width on mobile */}
        <Reveal className="shrink-0 w-[82%] snap-start md:w-auto md:shrink md:row-span-2">
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
            className="absolute bottom-0 left-0 right-0 pt-[2.2rem] px-[1.2rem] pb-[1rem] md:pt-[3rem] md:px-[1.8rem] md:pb-[1.5rem]"
            style={{
              background: "linear-gradient(transparent, rgba(17,17,16,0.9))",
              borderRadius: 0,
            }}
            // Same box as the smaller cards on mobile, where the strip makes
            // every card the same size; only the desktop mosaic gives the
            // hero its extra room.
          >
            {hero.city?.name && (
              <p
                className="font-mono uppercase mb-2 font-semibold text-[12px] md:text-[13px]"
                style={{ letterSpacing: "0.18em", color: "#ffffff" }}
              >
                {hero.city.name}
              </p>
            )}
            <h3 className="font-display text-white text-[1.3rem] md:text-[2rem]" style={{ letterSpacing: "-0.01em" }}>
              {hero.name}
            </h3>
          </div>
        </Link>
        </Reveal>

        {/* Smaller cards */}
        {rest.map((p, i) => (
          <Reveal key={p.id} delay={120 + i * 110} className="shrink-0 w-[82%] snap-start md:w-auto md:shrink">
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
