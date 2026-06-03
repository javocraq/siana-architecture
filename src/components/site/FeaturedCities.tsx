import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface City {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  hero_image_url: string | null;
  project_count: number;
}

/**
 * Cities strip — published cities shown below the map on the home page.
 * Horizontal drag-to-scroll row (like the previous "Recently added" strip)
 * using the Atlas Narrative "Fragment card" style: warm-white canvas, sharp
 * full-bleed portrait image, centered serif name + label-caps metadata
 * "COUNTRY • NN PROYECTOS". Each card links to that city's page.
 */
export default function FeaturedCities() {
  const [cities, setCities] = useState<City[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ down: false, startX: 0, scrollLeft: 0 });

  useEffect(() => {
    (async () => {
      const { data: cs } = await supabase
        .from("cities")
        .select("id, name, slug, country, hero_image_url")
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
          return [c.id, count ?? 0] as const;
        })
      );
      const map = new Map(counts);
      setCities(cs.map((c) => ({ ...c, project_count: map.get(c.id) ?? 0 })));
    })();
  }, []);

  if (!cities.length) return null;

  const onDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    dragState.current.down = true;
    dragState.current.startX = e.pageX - scrollRef.current.offsetLeft;
    dragState.current.scrollLeft = scrollRef.current.scrollLeft;
    scrollRef.current.style.cursor = "grabbing";
  };
  const onLeaveOrUp = () => {
    if (!scrollRef.current) return;
    dragState.current.down = false;
    scrollRef.current.style.cursor = "grab";
  };
  const onMove = (e: React.MouseEvent) => {
    if (!dragState.current.down || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.4;
    scrollRef.current.scrollLeft = dragState.current.scrollLeft - walk;
  };

  return (
    <section
      className="bg-[#FFF9F2]"
      style={{ padding: "5rem 0", borderBottom: "1px solid hsl(var(--paper-mid))" }}
    >
      <p
        className="font-grotesk text-[13px] font-semibold uppercase tracking-[0.18em] text-[#4F4534]"
        style={{ padding: "0 2.5rem", marginBottom: "3rem" }}
      >
        Ciudades
      </p>
      <div
        ref={scrollRef}
        className="flex no-scrollbar overflow-x-auto"
        style={{ gap: "2rem", padding: "0 2.5rem", cursor: "grab" }}
        onMouseDown={onDown}
        onMouseLeave={onLeaveOrUp}
        onMouseUp={onLeaveOrUp}
        onMouseMove={onMove}
      >
        {cities.map((c) => (
          <Link
            key={c.id}
            to={`/cities/${c.slug}`}
            className="group flex-shrink-0 block text-center"
            style={{ width: 320 }}
            draggable={false}
          >
            {/* Fragment card — sharp corners, full-bleed portrait, no scrim */}
            <div className="relative aspect-[3/4] overflow-hidden bg-[#E5E1DA]">
              <img
                src={c.hero_image_url || ""}
                alt={c.name}
                className="photo-thumb w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                loading="lazy"
                draggable={false}
              />
            </div>
            {/* Centered name + metadata below the image */}
            <h3
              className="font-garamond text-black mt-6"
              style={{ fontWeight: 500, fontSize: "clamp(28px, 2.8vw, 38px)", lineHeight: 1.1, letterSpacing: "-0.015em" }}
            >
              {c.name}
            </h3>
            <p className="font-grotesk text-[13px] font-semibold uppercase tracking-[0.16em] text-[#4F4534] mt-3">
              {c.country ? `${c.country} • ` : ""}
              {String(c.project_count).padStart(2, "0")} Proyectos
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
