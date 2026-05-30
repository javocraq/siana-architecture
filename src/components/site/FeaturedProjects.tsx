import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Project {
  id: string;
  name: string;
  slug: string;
  architect: string | null;
  year_completed: number | null;
  category: string | null;
  cover_image_url: string | null;
  hero_image_url: string | null;
  city: { name: string } | null;
}

/**
 * Peek strip — horizontal drag-scroll of recently added buildings.
 * Per spec section 8: white bg, 200px → 280px on hover, 10px radius,
 * slight desaturation default → full color on hover.
 */
export default function FeaturedProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ down: false, startX: 0, scrollLeft: 0 });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, slug, architect, year_completed, category, cover_image_url, hero_image_url, city:cities(name)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(8);
      if (data) setProjects(data as any);
    })();
  }, []);

  if (!projects.length) return null;

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
      className="bg-paper"
      style={{ padding: "4rem 0", borderBottom: "1px solid hsl(var(--paper-mid))" }}
    >
      <p
        className="font-mono uppercase text-warm-gray section-label-line"
        style={{ padding: "0 2.5rem 1.5rem", fontSize: "0.52rem", letterSpacing: "0.28em" }}
      >
        Recently added
      </p>
      <div
        ref={scrollRef}
        className="flex no-scrollbar overflow-x-auto"
        style={{ gap: "4px", padding: "0 2.5rem", cursor: "grab" }}
        onMouseDown={onDown}
        onMouseLeave={onLeaveOrUp}
        onMouseUp={onLeaveOrUp}
        onMouseMove={onMove}
      >
        {projects.map((p) => (
          <Link
            key={p.id}
            to={`/projects/${p.slug}`}
            className="group relative flex-shrink-0 overflow-hidden bg-paper-mid"
            style={{
              flex: "0 0 200px",
              height: "260px",
              borderRadius: "10px",
              transition: "flex-basis 0.4s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.flexBasis = "280px")}
            onMouseLeave={(e) => (e.currentTarget.style.flexBasis = "200px")}
          >
            <img
              src={p.cover_image_url || p.hero_image_url || ""}
              alt={p.name}
              className="photo-thumb w-full h-full object-cover"
              style={{ transition: "transform 0.5s, filter 0.4s" }}
              loading="lazy"
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
            <div
              className="absolute bottom-0 left-0 right-0 font-mono uppercase"
              style={{
                padding: "2rem 1rem 0.85rem",
                background: "linear-gradient(transparent, rgba(17,17,16,0.75))",
                fontSize: "0.5rem",
                letterSpacing: "0.14em",
                color: "rgba(255,255,255,0.85)",
                borderRadius: "0 0 10px 10px",
              }}
            >
              {p.city?.name ? `${p.city.name} · ` : ""}{p.name}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
