import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import WelcomeOverlay from "@/components/site/WelcomeOverlay";
import { getMapboxToken } from "@/lib/mapbox";
import FeaturedCities from "@/components/site/FeaturedCities";
import FeaturedBuildings from "@/components/site/FeaturedBuildings";
import LatestJournal from "@/components/site/LatestJournal";
import CtaStrip from "@/components/site/CtaStrip";
import NewsletterCta from "@/components/site/NewsletterCta";
import Footer from "@/components/site/Footer";

type Pin = { latitude: number | null; longitude: number | null };

const HERO_SLIDE_MS = 6000;

const Index = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [token] = useState<string>(() => getMapboxToken());
  const [pins, setPins] = useState<Pin[]>([]);
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [activeHero, setActiveHero] = useState(0);

  // Lightweight: just coordinates, to scatter pins across the preview map
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("latitude,longitude")
        .eq("status", "published");
      if (data) setPins(data as Pin[]);
    })();
  }, []);

  // Hero background — collect architecture photography for the slideshow.
  // Sources: published project photos + published city hero images. Both
  // tables hold architecture imagery by definition. If neither has any
  // pictures yet, fall back to a curated stock set so the hero never
  // looks empty.
  useEffect(() => {
    (async () => {
      const [{ data: projData }, { data: cityData }] = await Promise.all([
        supabase
          .from("projects")
          .select("hero_image_url,cover_image_url")
          .eq("status", "published")
          .limit(12),
        supabase
          .from("cities")
          .select("hero_image_url")
          .eq("status", "published")
          .limit(8),
      ]);
      const imgs = [
        ...(projData ?? []).map((p) => p.hero_image_url || p.cover_image_url),
        ...(cityData ?? []).map((c) => c.hero_image_url),
      ].filter((s): s is string => Boolean(s));

      // Curated architecture stock — used only when no project/city photos
      // have been uploaded yet. Safe to delete once the CMS has content.
      const FALLBACK_ARCH = [
        "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1800&q=80",
        "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1800&q=80",
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1800&q=80",
        "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1800&q=80",
        "https://images.unsplash.com/photo-1496564203457-11bb12075d90?auto=format&fit=crop&w=1800&q=80",
        "https://images.unsplash.com/photo-1486718448742-163732cd1544?auto=format&fit=crop&w=1800&q=80",
      ];
      const pool = imgs.length > 0 ? imgs : FALLBACK_ARCH;

      // Shuffle so the order isn't predictable between visits
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      setHeroImages(pool);
    })();
  }, []);

  // Rotate the active hero image on a calm interval
  useEffect(() => {
    if (heroImages.length < 2) return;
    const t = setInterval(() => {
      setActiveHero((i) => (i + 1) % heroImages.length);
    }, HERO_SLIDE_MS);
    return () => clearInterval(t);
  }, [heroImages.length]);

  // Non-interactive preview map — a visual teaser of the product, not a tool.
  // `interactive: false` means it never traps scroll and can't be panned; the
  // whole surface is a link into the Atlas.
  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    try {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [4, 38],
        zoom: 1.5,
        attributionControl: false,
        interactive: false,
      });
      mapRef.current = map;
    } catch (e) {
      console.error("Mapbox preview init failed", e);
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token]);

  // Decorative pins + frame them
  useEffect(() => {
    const map = mapRef.current;
    if (!map || pins.length === 0) return;
    const draw = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      const pts = pins.filter((p) => p.latitude != null && p.longitude != null);
      const bounds = new mapboxgl.LngLatBounds();
      pts.forEach((p) => {
        const el = document.createElement("span");
        el.style.cssText =
          "display:block;width:9px;height:9px;border-radius:9999px;background:#bf3a18;border:2px solid #fff;box-shadow:0 0 0 2px #bf3a18;pointer-events:none;";
        markersRef.current.push(
          new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([p.longitude!, p.latitude!]).addTo(map)
        );
        bounds.extend([p.longitude!, p.latitude!]);
      });
      if (pts.length > 1) map.fitBounds(bounds, { padding: 70, maxZoom: 5, duration: 0 });
    };
    if (map.loaded()) draw();
    else map.once("load", draw);
  }, [pins]);

  return (
    <div className="bg-paper">
      <WelcomeOverlay />
      <Helmet>
        <title>Siana — Your city through architecture</title>
        <meta name="description" content="An editorial atlas of architecture. Curated projects across the world's great cities — explore them on the interactive map." />
        <link rel="canonical" href="/" />
      </Helmet>

      <Navbar />

      {/* ============================================================
          1. HERO — editorial cover that introduces the experience.
          Project photos quietly crossfade behind a warm paper veil so
          the ink-coloured headline remains legible.
          ============================================================ */}
      <section
        className="relative grid"
        style={{ gridTemplateRows: "1fr auto", minHeight: "100vh", background: "hsl(var(--paper-warm))", paddingTop: "76px", overflow: "hidden" }}
      >
        {/* Background slideshow */}
        <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          {heroImages.map((src, i) => (
            <div
              key={src}
              className="absolute inset-0 transition-opacity ease-in-out"
              style={{
                opacity: i === activeHero ? 1 : 0,
                backgroundImage: `url(${src})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "grayscale(15%)",
                transitionDuration: "1800ms",
              }}
            />
          ))}
          {/* Warm paper veil — keeps ink-coloured copy readable on top */}
          <div
            className="absolute inset-0"
            style={{ background: "hsl(var(--paper-warm) / 0.82)" }}
          />
        </div>

        <div
          className="relative z-10 mx-auto w-full"
          style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "4rem 2.5rem 4rem", maxWidth: 1400 }}
        >
          <p className="fadeup-1 font-mono uppercase text-accent-terra font-semibold" style={{ fontSize: "13px", letterSpacing: "0.22em", marginBottom: "1.5rem" }}>
            <Link to="/atlas" className="hover:opacity-70 transition-opacity">Architecture</Link>
            {" · "}
            <Link to="/cities" className="hover:opacity-70 transition-opacity">Cities</Link>
            {" · "}
            <Link to="/resources" className="hover:opacity-70 transition-opacity">Resources</Link>
          </p>

          <h1 className="fadeup-2 font-display-black text-ink" style={{ fontSize: "clamp(4rem, 9.5vw, 9.5rem)", lineHeight: 0.91 }}>
            The curated<br />
            architecture<br />
            guide
          </h1>

          <div className="fadeup-3 mt-12 flex items-end justify-between gap-8 flex-wrap">
            <p className="font-mono text-ink-soft" style={{ fontSize: "15px", lineHeight: 1.7, maxWidth: 360, letterSpacing: "0.01em" }}>
              Curated architectural projects mapped across the world's greatest cities.
              Explore by place, by style, by moment.
            </p>

            <div className="flex items-center gap-6 flex-wrap">
              <Link
                to="/atlas"
                className="font-mono uppercase inline-flex items-center text-white transition-all font-semibold"
                style={{ background: "hsl(var(--ink))", padding: "1.1rem 2rem", fontSize: "14px", letterSpacing: "0.16em", borderRadius: 0, gap: "0.7rem" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(var(--accent))"; e.currentTarget.style.gap = "1rem"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "hsl(var(--ink))"; e.currentTarget.style.gap = "0.7rem"; }}
              >
                Explore the Atlas →
              </Link>

              <Link
                to="/cities"
                className="font-mono uppercase text-ink-soft hover:text-ink transition-colors font-medium"
                style={{ fontSize: "13px", letterSpacing: "0.14em", borderBottom: "1px solid hsl(var(--paper-mid))", paddingBottom: 3 }}
              >
                Browse all cities
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          2. MAP PREVIEW — a visual teaser; the tool itself lives at /atlas
          ============================================================ */}
      <section className="relative bg-paper-warm" style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}>
        <div className="mx-auto max-w-[1400px] flex items-end justify-between flex-wrap gap-6" style={{ padding: "3rem 2.5rem 2.5rem" }}>
          <div>
            <p className="font-mono uppercase text-accent-terra mb-3 font-semibold" style={{ fontSize: "13px", letterSpacing: "0.22em" }}>
              The Atlas
            </p>
            <h2 className="font-display text-ink" style={{ fontSize: "clamp(2.5rem, 5vw, 5rem)", fontWeight: 500, lineHeight: 0.94 }}>
              Every building,<br />
              <em className="italic text-ink-soft">on the map.</em>
            </h2>
          </div>
          <p className="font-mono text-ink-soft" style={{ fontSize: "15px", lineHeight: 1.65, maxWidth: 320, textAlign: "right", letterSpacing: "0.01em" }}>
            A living atlas of architecture. Open the Atlas to filter by city,
            architect, style and year — and discover each project on the map.
          </p>
        </div>

        {/* Clickable preview — the whole surface opens the Atlas */}
        <Link to="/atlas" aria-label="Open the Atlas" className="group relative block w-full" style={{ height: "68vh", minHeight: 480, background: "hsl(var(--paper-mid))" }}>
          {token ? (
            <div ref={mapContainer} className="absolute inset-0" style={{ pointerEvents: "none" }} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-ink-soft font-mono uppercase" style={{ fontSize: 13, letterSpacing: "0.16em" }}>
              Map preview
            </div>
          )}

          {/* Soft editorial veil so the map reads as a teaser */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(247,243,237,0) 55%, rgba(247,243,237,0.55) 100%)" }} />

          {/* CTA pill */}
          <span
            className="absolute left-1/2 -translate-x-1/2 bottom-8 inline-flex items-center gap-2 font-mono uppercase text-white font-semibold transition-all group-hover:gap-3"
            style={{ background: "hsl(var(--ink))", padding: "1rem 1.9rem", fontSize: "14px", letterSpacing: "0.16em" }}
          >
            Open the interactive map →
          </span>
        </Link>
      </section>

      {/* Cities strip — image, name & project count */}
      <FeaturedCities />

      {/* Featured buildings — editorial asymmetric grid */}
      <FeaturedBuildings />

      {/* Latest journal */}
      <LatestJournal />

      {/* CTA + footer */}
      <CtaStrip />
      <NewsletterCta />
      <Footer />
    </div>
  );
};

export default Index;
