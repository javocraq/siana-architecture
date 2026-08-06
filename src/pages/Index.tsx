import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import WelcomeOverlay from "@/components/site/WelcomeOverlay";
import { getMapboxToken } from "@/lib/mapbox";
import FeaturedCities from "@/components/site/FeaturedCities";
import FeaturedBuildings from "@/components/site/FeaturedBuildings";
import LatestJournal from "@/components/site/LatestJournal";
import NewsletterCta from "@/components/site/NewsletterCta";
import Footer from "@/components/site/Footer";
import Reveal from "@/components/site/Reveal";
import { useHomeContent } from "@/hooks/useHomeContent";
import { sanitizeInline } from "@/lib/inlineHtml";

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
  const [heroReady, setHeroReady] = useState(false);
  const content = useHomeContent();

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

  // Hero background — curated architecture photography. We deliberately
  // do NOT pull from the projects/cities tables here: while those rows
  // are nominally architecture, demo/seed entries can carry stock
  // imagery that doesn't fit the cover. This list is hand-verified.
  useEffect(() => {
    // Editor-chosen hero images (from /admin/home) take priority, in order.
    const custom = (content.hero.images || []).filter(Boolean);
    if (custom.length) {
      setHeroImages(custom);
      return;
    }
    const ARCH_IMAGES = [
      // Sunlit curved staircase — Valencia City of Sciences
      "https://images.unsplash.com/photo-1779995734326-3d3790120164?auto=format&fit=crop&w=1800&q=80",
      // Brutalist concrete structure in the desert
      "https://images.unsplash.com/photo-1780303063301-33ccfe1c56c2?auto=format&fit=crop&w=1800&q=80",
      // Concrete ceiling with square skylights, Shanghai
      "https://images.unsplash.com/photo-1780362507842-f9e75fbdce03?auto=format&fit=crop&w=1800&q=80",
      // Staircase with circular skylights, MLK Memorial Library
      "https://images.unsplash.com/photo-1777997271952-4fa8fec2ffa6?auto=format&fit=crop&w=1800&q=80",
      // Vintage interior with pendant lights and wooden floor
      "https://images.unsplash.com/photo-1780317307594-15b43d794ce6?auto=format&fit=crop&w=1800&q=80",
      // Contemporary dining space, Suances, Spain
      "https://images.unsplash.com/photo-1779960723465-61f8d0f5ac2b?auto=format&fit=crop&w=1800&q=80",
      // Country home interior with built-in wooden shelving
      "https://images.unsplash.com/photo-1780427670049-43aa7921e3f0?auto=format&fit=crop&w=1800&q=80",
    ];
    // Shuffle so the order isn't predictable between visits — but pin the
    // first slide. It is the one the page can preload (see the preload tag
    // the prerender step writes), and preloading only pays off if the image
    // it fetches is the one actually shown first.
    const [first, ...rest] = ARCH_IMAGES;
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    setHeroImages([first, ...rest]);
  }, [content.hero.images]);

  // Hold the cover back until its first photo has decoded. Without this the
  // veil and the white headline paint over an empty background — the grey
  // wash that showed on every load while the photo was still in flight.
  //
  // The deadline is its own mount-once effect on purpose. Living inside the
  // image effect, it was cleared and restarted every time the URL changed
  // (the list starts as the built-in photos, then swaps to the editor's), so
  // it could never fire — and a cover that never appears is worse than one
  // that appears late. Nothing can cancel this one but unmounting.
  useEffect(() => {
    const deadline = setTimeout(() => setHeroReady(true), 2500);
    return () => clearTimeout(deadline);
  }, []);

  const firstHero = heroImages[0];
  useEffect(() => {
    if (!firstHero) return;
    let cancelled = false;
    const reveal = () => !cancelled && setHeroReady(true);
    const img = new Image();
    img.onload = reveal;
    img.onerror = reveal;
    img.src = firstHero;
    if (img.complete) reveal();
    return () => {
      cancelled = true;
    };
  }, [firstHero]);

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
  // whole surface is a link into the Atlas. The globe spins slowly so the
  // hero map feels alive even though it's not clickable as a map.
  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    let io: IntersectionObserver | null = null;
    try {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        projection: { name: "mercator" },
        center: [10, 25],
        zoom: 1.6,
        attributionControl: false,
        interactive: false,
      });
      mapRef.current = map;

      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      let visible = true;
      const SECONDS_PER_REV = 120;
      const spinGlobe = () => {
        if (!visible || reduceMotion) return;
        const c = map.getCenter();
        c.lng -= 360 / SECONDS_PER_REV;
        map.easeTo({ center: c, duration: 1000, easing: (n) => n });
      };
      map.on("moveend", spinGlobe);
      map.on("load", spinGlobe);

      io = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          if (visible) spinGlobe();
        },
        { threshold: 0 }
      );
      io.observe(mapContainer.current);
    } catch (e) {
      console.error("Mapbox preview init failed", e);
    }
    return () => {
      io?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token]);

  // Decorative pins — pinned to the spinning globe at its natural extent;
  // we deliberately do NOT fitBounds here so the whole globe stays visible.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || pins.length === 0) return;
    const draw = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      const pts = pins.filter((p) => p.latitude != null && p.longitude != null);
      pts.forEach((p) => {
        const el = document.createElement("span");
        el.style.cssText =
          "display:block;width:9px;height:9px;border-radius:9999px;background:#bf3a18;border:2px solid #fff;box-shadow:0 0 0 2px #bf3a18;pointer-events:none;";
        markersRef.current.push(
          new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([p.longitude!, p.latitude!]).addTo(map)
        );
      });
    };
    if (map.loaded()) draw();
    else map.once("load", draw);
  }, [pins]);

  return (
    <div className="bg-paper">
      <WelcomeOverlay />
      <Helmet>
        <title>Siana Architecture</title>
        <meta name="description" content="An editorial atlas of architecture. Curated projects across the world's great cities - explore them on the interactive map." />
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
        {/* Background slideshow. Held at opacity 0 until the first photo has
            decoded, so the cover never shows its veil over an empty frame. */}
        <div
          className="absolute inset-0 z-0 overflow-hidden"
          aria-hidden="true"
          style={{ opacity: heroReady ? 1 : 0, transition: "opacity 900ms ease" }}
        >
          {heroImages.map((src, i) => (
            <div
              key={src}
              className="absolute inset-0 transition-opacity ease-in-out"
              style={{
                opacity: i === activeHero ? 1 : 0,
                backgroundImage: `url(${src})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                transitionDuration: "1800ms",
              }}
            />
          ))}
          {/* Dark veil — keeps white copy legible over the photo slideshow.
              Light on top so photos breathe, denser at the bottom where
              the headline + CTAs live. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(17,17,16,0.18) 0%, rgba(17,17,16,0.28) 45%, rgba(17,17,16,0.55) 100%)",
            }}
          />
        </div>

        <div
          className="relative z-10 mx-auto w-full max-w-[1400px] px-6 lg:px-10 text-center md:text-left"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingTop: "10rem",
            paddingBottom: "4rem",
            // The copy is white: it only becomes legible once the photo and
            // its veil are behind it, so it arrives with them, not before.
            opacity: heroReady ? 1 : 0,
            transition: "opacity 900ms ease",
          }}
        >
          <p className="fadeup-1 font-mono uppercase text-white font-semibold" style={{ fontSize: "13px", letterSpacing: "0.22em", marginBottom: "1.5rem", textShadow: "0 1px 8px rgba(0,0,0,0.25)" }}>
            <Link to="/atlas" className="hover:opacity-70 transition-opacity">{content.hero.eyebrow_architecture}</Link>
            {" · "}
            <Link to="/cities" className="hover:opacity-70 transition-opacity">{content.hero.eyebrow_cities}</Link>
            {" · "}
            <Link to="/practice" className="hover:opacity-70 transition-opacity">{content.hero.eyebrow_practice}</Link>
          </p>

          <h1
            className="fadeup-2 font-display-black text-white"
            style={{
              fontSize: "clamp(2.5rem, 8.2vw, 7rem)",
              lineHeight: 1.02,
              textShadow: "0 2px 18px rgba(0,0,0,0.25)",
              whiteSpace: "pre-line",
            }}
          >
            {content.hero.headline}
          </h1>

          <div className="fadeup-3 mt-10 md:mt-12">
            <p
              className="font-mono text-white/85 mx-auto md:mx-0 max-w-[380px] md:max-w-none [&_em]:italic [&_strong]:font-semibold"
              style={{ fontSize: "16.5px", lineHeight: 1.7, letterSpacing: "0.01em", textShadow: "0 1px 8px rgba(0,0,0,0.25)" }}
              dangerouslySetInnerHTML={{ __html: sanitizeInline(content.hero.description) }}
            />
          </div>
        </div>
      </section>

      {/* ============================================================
          2. MAP PREVIEW — full-bleed map with editorial copy overlaid
          on top. The whole surface opens the Atlas. The tool itself
          lives at /atlas.
          ============================================================ */}
      <section className="relative bg-paper-warm" style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}>
        <Link to="/atlas" aria-label="Open the Map" className="group relative block w-screen" style={{ height: "100vh", minHeight: 640, background: "hsl(var(--paper-mid))" }}>
          {token ? (
            <div ref={mapContainer} className="absolute inset-0" style={{ pointerEvents: "none" }} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-ink-soft font-mono uppercase" style={{ fontSize: 13, letterSpacing: "0.16em" }}>
              Map preview
            </div>
          )}

          {/* Soft editorial veil — soft radial halo at the center so the
              centered copy block has a calm, legible backdrop. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(247,243,237,0.78) 0%, rgba(247,243,237,0.45) 55%, rgba(247,243,237,0) 100%)",
            }}
          />

          {/* Overlaid editorial copy — slides up *after* the map is visible
              (delayed Reveal so the map renders first, then the text lands
              on top of it). */}
          <Reveal
            delay={650}
            className="absolute inset-0 flex items-center justify-center pointer-events-none px-6 lg:px-10"
          >
            <div className="text-center max-w-[680px]">
              <p
                className="font-mono uppercase text-accent-terra mb-3 font-semibold"
                style={{ fontSize: "13px", letterSpacing: "0.22em" }}
              >
                {content.map.eyebrow}
              </p>
              <h2
                className="font-display text-ink [&_em]:italic"
                style={{ fontSize: "clamp(2.1rem, 4vw, 3.8rem)", fontWeight: 400, lineHeight: 1 }}
                dangerouslySetInnerHTML={{ __html: sanitizeInline(content.map.headline) }}
              />
              <p
                className="font-mono text-ink-soft mt-5 mx-auto [&_em]:italic [&_strong]:font-semibold"
                style={{ fontSize: "16.5px", lineHeight: 1.65, maxWidth: 540, letterSpacing: "0.01em" }}
                dangerouslySetInnerHTML={{ __html: sanitizeInline(content.map.description) }}
              />

              {/* CTA — minimal hairline underline, gap grows on hover. */}
              <span
                className="inline-flex items-center font-mono uppercase text-ink transition-all group-hover:gap-3 mt-10"
                style={{
                  fontSize: "12px",
                  letterSpacing: "0.28em",
                  fontWeight: 500,
                  gap: "0.6rem",
                  borderBottom: "1px solid hsl(var(--ink))",
                  paddingBottom: 4,
                }}
              >
                {content.map.cta}
                <span aria-hidden="true">→</span>
              </span>
            </div>
          </Reveal>
        </Link>
      </section>

      {/* Cities strip — image, name & project count */}
      <FeaturedCities />

      {/* Featured buildings — editorial asymmetric grid */}
      <FeaturedBuildings />

      {/* Latest journal */}
      <LatestJournal />

      {/* Newsletter + footer */}
      <NewsletterCta />
      <Footer />
    </div>
  );
};

export default Index;
