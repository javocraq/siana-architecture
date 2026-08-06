import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Reveal from "@/components/site/Reveal";
import EditorialButton from "@/components/site/EditorialButton";
import { useHomeContent } from "@/hooks/useHomeContent";

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
  const content = useHomeContent();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ down: false, startX: 0, scrollLeft: 0 });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Track scroll position to toggle the arrows' enabled state.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [cities.length]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    // Roughly one card + gap per click — 320 + 32.
    el.scrollBy({ left: dir * 352, behavior: "smooth" });
  };

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
      className="bg-white"
      style={{ padding: "5rem 0" }}
    >
      <div
        className="mx-auto max-w-[1400px] px-6 lg:px-10"
        style={{ marginBottom: "3rem" }}
      >
        <Reveal
          as="h2"
          className="font-display text-ink"
          style={{
            fontSize: "clamp(2rem, 3.7vw, 3.4rem)",
            fontWeight: 400,
            lineHeight: 1,
            letterSpacing: "-0.005em",
          }}
        >
          {content.cities.title}
        </Reveal>
      </div>
      {/* Strip + overlaid arrows. The relative wrapper anchors the arrow
          buttons over the photo area (top portion of each card). */}
      <div className="relative">
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        disabled={!canScrollLeft}
        aria-label="Anterior"
        className="absolute z-10 inline-flex items-center justify-center transition-all disabled:opacity-0 disabled:pointer-events-none hover:bg-white"
        style={{
          left: "1.75rem",
          top: "37%",
          transform: "translateY(-50%)",
          width: 52,
          height: 52,
          borderRadius: 9999,
          background: "rgba(255,255,255,0.92)",
          color: "hsl(var(--ink))",
          boxShadow: "0 2px 14px rgba(0,0,0,0.10)",
          backdropFilter: "blur(4px)",
        }}
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.25} />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        disabled={!canScrollRight}
        aria-label="Siguiente"
        className="absolute z-10 inline-flex items-center justify-center transition-all disabled:opacity-0 disabled:pointer-events-none hover:bg-white"
        style={{
          right: "1.75rem",
          top: "37%",
          transform: "translateY(-50%)",
          width: 52,
          height: 52,
          borderRadius: 9999,
          background: "rgba(255,255,255,0.92)",
          color: "hsl(var(--ink))",
          boxShadow: "0 2px 14px rgba(0,0,0,0.10)",
          backdropFilter: "blur(4px)",
        }}
      >
        <ArrowRight className="w-4 h-4" strokeWidth={1.25} />
      </button>
      {/* One Reveal around the whole strip so the cards fade in together
          instead of cascading one by one — the staggered per-card reveal
          was creating a "photos hiding/moving" feel as the section
          scrolled into view. The onWheel handler forwards vertical wheel
          deltas to the window so the strip (which has overflow-x: auto)
          doesn't trap them — Chrome on Mac trackpads otherwise absorbs
          Y-dominant wheel events here and the page appears to freeze. */}
      <Reveal>
        <div
          ref={scrollRef}
          className="flex no-scrollbar overflow-x-auto scroll-smooth mx-auto max-w-[1400px] px-6 lg:px-10 snap-x snap-mandatory md:snap-none"
          style={{
            gap: "2rem",
            cursor: "grab",
            overscrollBehaviorY: "none",
            // "pan-y" alone told the browser to handle only vertical gestures
            // here, so a finger swiped sideways did nothing and the arrows
            // were the only way through. Allowing both lets the browser pick
            // by gesture direction: sideways scrolls the strip, up and down
            // still scrolls the page.
            touchAction: "pan-x pan-y",
          }}
          onWheel={(e) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              e.preventDefault();
              window.scrollBy(0, e.deltaY);
            }
          }}
          onMouseDown={onDown}
          onMouseLeave={onLeaveOrUp}
          onMouseUp={onLeaveOrUp}
          onMouseMove={onMove}
        >
          {cities.map((c) => (
            <div key={c.id} className="flex-shrink-0 snap-start" style={{ width: 320 }}>
              <Link
                to={`/cities/${c.slug}`}
                className="group block text-center"
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
            </div>
          ))}
        </div>
      </Reveal>
      </div>
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 flex justify-center" style={{ marginTop: "3rem" }}>
        <Reveal delay={120}>
          <EditorialButton to="/cities" arrow>View all cities</EditorialButton>
        </Reveal>
      </div>
    </section>
  );
}
