import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import WelcomeOverlay from "@/components/site/WelcomeOverlay";
import MapFilters, { EMPTY_FILTERS, Filters, eraMatches } from "@/components/site/MapFilters";
import { Search, X, List } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { getMapboxToken, TOKEN_KEY } from "@/lib/mapbox";
import FeaturedCities from "@/components/site/FeaturedCities";
import FeaturedBuildings from "@/components/site/FeaturedBuildings";
import LatestJournal from "@/components/site/LatestJournal";
import CtaStrip from "@/components/site/CtaStrip";
import Footer from "@/components/site/Footer";

type City = {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  tagline: string | null;
  center_latitude: number | null;
  center_longitude: number | null;
  default_zoom: number | null;
};

type Project = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  architect: string | null;
  practice: string | null;
  year_completed: number | null;
  category: string | null;
  style: string | null;
  latitude: number | null;
  longitude: number | null;
  cover_image_url: string | null;
  hero_image_url: string | null;
};

const Index = () => {
  const heroBgRef = useRef<HTMLDivElement | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);

  const [token, setToken] = useState<string>(() => getMapboxToken());
  const [tokenInput, setTokenInput] = useState("");

  const [cities, setCities] = useState<City[]>([]);
  const [activeCity, setActiveCity] = useState<City | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  // Load cities
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cities")
        .select("id,slug,name,country,tagline,center_latitude,center_longitude,default_zoom")
        .eq("status", "published")
        .order("name");
      if (data && data.length) {
        setCities(data);
        const munich = data.find((c) => c.slug === "munich") || data[0];
        setActiveCity(munich);
      }
    })();
  }, []);

  // Load projects when city changes
  useEffect(() => {
    if (!activeCity) return;
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("id,slug,name,tagline,architect,practice,year_completed,category,style,latitude,longitude,cover_image_url,hero_image_url")
        .eq("status", "published")
        .eq("city_id", activeCity.id);
      setProjects(data || []);
      setSelected(null);
    })();
  }, [activeCity]);

  // Init interactive map
  useEffect(() => {
    if (!token || !activeCity || !mapContainer.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    try {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [activeCity.center_longitude || 11.582, activeCity.center_latitude || 48.1351],
        zoom: activeCity.default_zoom || 13,
        attributionControl: false,
        // Let page scroll pass through the map; zoom needs ⌘/Ctrl+scroll
        // (or two fingers on touch) so the map no longer traps the scroll.
        cooperativeGestures: true,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-left");
      mapRef.current = map;
    } catch (e) {
      console.error("Mapbox init failed", e);
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token, activeCity?.id]);

  // Fly to city
  useEffect(() => {
    if (!activeCity) return;
    mapRef.current?.flyTo({
      center: [activeCity.center_longitude || 11.582, activeCity.center_latitude || 48.1351],
      zoom: activeCity.default_zoom || 13,
      speed: 1.2,
      curve: 1.4,
      essential: true,
    });
  }, [activeCity]);

  // "Map" nav link points to "/#map" — scroll to the interactive map section
  // (it lives below the hero on the home page).
  useEffect(() => {
    if (location.hash !== "#map") return;
    const t = setTimeout(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => clearTimeout(t);
  }, [location.hash, location.key]);

  const architectOptions = Array.from(
    new Set(projects.map((p) => p.architect).filter(Boolean))
  ) as string[];

  const filtered = projects.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.architect || "").toLowerCase().includes(search.toLowerCase());
    const matchesProgramme = !filters.programme || p.category === filters.programme;
    const matchesStyle = filters.styles.length === 0 || (p.style && filters.styles.includes(p.style));
    const matchesEra = filters.eras.length === 0 || filters.eras.some((e) => eraMatches(p.year_completed, e));
    const matchesArchitect =
      !filters.architect.trim() ||
      (p.architect || "").toLowerCase().includes(filters.architect.toLowerCase());
    return matchesSearch && matchesProgramme && matchesStyle && matchesEra && matchesArchitect;
  });

  // Render markers — terracotta dots with pulsing ring
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    filtered.forEach((p) => {
      if (p.latitude == null || p.longitude == null) return;
      const el = document.createElement("button");
      el.setAttribute("aria-label", p.name);
      el.style.cssText = "background:transparent;border:0;padding:0;cursor:pointer;display:block;position:relative;width:14px;height:14px;";
      const isSelected = selected?.id === p.id;
      const dotColor = "#bf3a18"; // terracotta accent always
      el.innerHTML = `
        <span style="display:block;width:10px;height:10px;border-radius:9999px;background:${dotColor};border:2px solid #ffffff;box-shadow:0 0 0 2px ${dotColor};position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) ${isSelected ? "scale(1.3)" : "scale(1)"};transition:transform 0.18s ease;"></span>
        <span style="position:absolute;top:50%;left:50%;width:22px;height:22px;border-radius:9999px;border:1px solid ${dotColor};opacity:0.35;transform:translate(-50%,-50%);animation:siana-pulse 2.2s infinite;"></span>
      `;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        setSelected(p);
        mapRef.current?.flyTo({ center: [p.longitude!, p.latitude!], zoom: 15, essential: true });
      });
      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([p.longitude, p.latitude])
        .addTo(mapRef.current!);
      markersRef.current.push(marker);
    });
  }, [filtered, selected]);

  const saveToken = () => {
    if (!tokenInput.trim()) return;
    localStorage.setItem(TOKEN_KEY, tokenInput.trim());
    setToken(tokenInput.trim());
  };

  const scrollToMap = () => {
    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="bg-paper">
      <WelcomeOverlay />
      <Helmet>
        <title>Siana — Your city through architecture</title>
        <meta name="description" content="Curated architectural projects mapped across Europe's greatest cities. Explore by place, by style, by moment." />
        <link rel="canonical" href="/" />
      </Helmet>

      <Navbar />

      {!token && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/95">
          <div className="max-w-md w-full mx-6 p-8 bg-paper" style={{ border: "1px solid hsl(var(--paper-mid))", borderRadius: 0 }}>
            <p className="font-mono uppercase text-ink-soft mb-3 font-semibold" style={{ fontSize: 13, letterSpacing: "0.16em" }}>
              Mapbox token required
            </p>
            <h2 className="font-display text-3xl text-ink mb-4">Connect the map</h2>
            <p className="text-[15px] text-ink-soft mb-6 leading-[1.65]">
              Paste a Mapbox public token, or set <code>VITE_MAPBOX_PUBLIC_TOKEN</code> / hardcode it in <code>src/lib/mapbox.ts</code> to skip this prompt.
            </p>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="pk.eyJ1Ijoi..."
              className="w-full px-3 py-2.5 bg-paper text-[15px] mb-3 focus:outline-none focus:border-ink placeholder:text-ink-soft"
              style={{ border: "1px solid hsl(var(--paper-mid))", borderRadius: 0 }}
            />
            <button
              onClick={saveToken}
              className="w-full px-4 py-2.5 font-mono uppercase hover:opacity-80 transition-opacity font-medium"
              style={{ background: "hsl(var(--ink))", color: "white", fontSize: 14, letterSpacing: "0.16em", borderRadius: 0 }}
            >
              Save token
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          1. HERO — bottom-anchored, 3-line italic accent headline
          ============================================================ */}
      <section
        className="relative grid"
        style={{
          gridTemplateRows: "1fr auto",
          minHeight: "100vh",
          background: "hsl(var(--paper-warm))",
          paddingTop: "76px",
          overflow: "hidden",
        }}
      >

        {/* Content — anchored to bottom */}
        <div
          className="relative z-10 mx-auto w-full"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "7rem 2.5rem 3.5rem",
            maxWidth: 1400,
          }}
        >
          <p
            className="fadeup-1 font-mono uppercase text-accent-terra font-semibold"
            style={{ fontSize: "13px", letterSpacing: "0.22em", marginBottom: "1.5rem" }}
          >
            ARCHITECTURE · CITIES · RESOURCES
          </p>

          <h1
            className="fadeup-2 font-display-black text-ink"
            style={{
              fontSize: "clamp(4rem, 9.5vw, 9.5rem)",
              lineHeight: 0.91,
            }}
          >
            The curated<br />
            architecture<br />
            guide
          </h1>

          <div className="fadeup-3 mt-12 flex items-end justify-between gap-8 flex-wrap">
            <p
              className="font-mono text-ink-soft"
              style={{ fontSize: "15px", lineHeight: 1.7, maxWidth: 360, letterSpacing: "0.01em" }}
            >
              Curated architectural projects mapped across Europe's greatest cities.
              Explore by place, by style, by moment.
            </p>

            <div className="flex items-center gap-6 flex-wrap">
              <button
                onClick={scrollToMap}
                className="font-mono uppercase inline-flex items-center text-white transition-all font-semibold"
                style={{
                  background: "hsl(var(--ink))",
                  padding: "1.1rem 2rem",
                  fontSize: "14px",
                  letterSpacing: "0.16em",
                  borderRadius: 0,
                  gap: "0.7rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "hsl(var(--accent))";
                  e.currentTarget.style.gap = "1rem";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "hsl(var(--ink))";
                  e.currentTarget.style.gap = "0.7rem";
                }}
              >
                Start exploring →
              </button>

              <Link
                to="/cities"
                className="font-mono uppercase text-ink-soft hover:text-ink transition-colors font-medium"
                style={{
                  fontSize: "13px",
                  letterSpacing: "0.14em",
                  borderBottom: "1px solid hsl(var(--paper-mid))",
                  paddingBottom: 3,
                }}
              >
                Browse all cities
              </Link>
            </div>
          </div>
        </div>

      </section>

      {/* Map section — lead element after the hero */}
      <section
        id="map"
        ref={mapSectionRef}
        className="relative bg-paper-warm"
        style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}
      >
        <div
          className="mx-auto max-w-[1400px] flex items-end justify-between flex-wrap gap-6"
          style={{ padding: "6rem 2.5rem 3rem" }}
        >
          <div>
            <p
              className="font-mono uppercase text-accent-terra mb-3 font-semibold"
              style={{ fontSize: "13px", letterSpacing: "0.22em" }}
            >
              Interactive Map
            </p>
            <h2
              className="font-display text-ink"
              style={{ fontSize: "clamp(2.5rem, 5vw, 5rem)", fontWeight: 500, lineHeight: 0.94 }}
            >
              Find it<br />
              <em className="italic text-ink-soft">on the map.</em>
            </h2>
          </div>
          <p
            className="font-mono text-ink-soft"
            style={{ fontSize: "15px", lineHeight: 1.65, maxWidth: 300, textAlign: "right", letterSpacing: "0.01em" }}
          >
            Every building is pinned. Filter by city, era, or architect.
            The map is where the journey begins.
          </p>
        </div>

        {/* Map + sidebar */}
        <div
          className="relative w-full"
          style={{ height: "70vh", minHeight: 540, background: "hsl(var(--paper-mid))" }}
        >
          <div ref={mapContainer} className="absolute inset-0" />

          {token && activeCity && (
            <aside
              className={`absolute z-20 bg-paper-warm flex flex-col overflow-hidden transition-transform duration-300 ease-out
                md:top-0 md:bottom-0 md:left-0 md:w-[300px] md:translate-y-0
                left-0 right-0 bottom-0 top-[40%]
                ${sheetOpen || !isMobile ? "translate-y-0" : "translate-y-[calc(100%-64px)]"}
              `}
              style={{ borderRight: "1px solid hsl(var(--paper-mid))" }}
            >
              <button
                onClick={() => setSheetOpen((o) => !o)}
                className="md:hidden flex flex-col items-center pt-2 pb-3"
                style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}
                aria-label="Toggle list"
              >
                <span className="w-10 h-1 bg-paper-mid rounded-full mb-2" />
                <span className="font-mono uppercase text-ink-soft font-medium" style={{ fontSize: 13, letterSpacing: "0.14em" }}>
                  {filtered.length} projects in {activeCity.name}
                </span>
              </button>

              <div className="hidden md:block px-6 pt-6 pb-5" style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}>
                <h2 className="font-display text-ink leading-none" style={{ fontSize: 22 }}>
                  {activeCity.name}
                </h2>
                <p className="mt-2 font-mono uppercase text-ink-soft font-medium" style={{ fontSize: 13, letterSpacing: "0.14em" }}>
                  {filtered.length} {filtered.length === 1 ? "project" : "projects"}
                </p>
                {activeCity.tagline && (
                  <>
                    <div className="mt-4 mb-3 h-px w-8 bg-paper-mid" />
                    <p className="font-display italic text-ink-soft" style={{ fontSize: 16, lineHeight: 1.5 }}>
                      {activeCity.tagline}
                    </p>
                  </>
                )}
              </div>

              <div className="px-6 py-4" style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}>
                <div className="relative">
                  <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search projects"
                    className="w-full pl-7 pr-2 py-2.5 bg-transparent text-[15px] focus:outline-none placeholder:text-ink-soft"
                    style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}
                  />
                </div>
              </div>

              <MapFilters
                filters={filters}
                onChange={setFilters}
                resultCount={filtered.length}
                architectOptions={architectOptions}
              />

              <div className="flex-1 overflow-y-auto no-scrollbar">
                {filtered.map((p) => {
                  const thumb = p.cover_image_url || p.hero_image_url;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelected(p);
                        if (p.latitude != null && p.longitude != null) {
                          mapRef.current?.flyTo({ center: [p.longitude, p.latitude], zoom: 15, essential: true });
                        }
                        if (isMobile) setSheetOpen(false);
                      }}
                      className={`w-full text-left px-6 py-5 hover:bg-accent-light transition-colors flex gap-4 items-start group ${
                        selected?.id === p.id ? "bg-accent-light" : ""
                      }`}
                      style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}
                    >
                      <div
                        className="shrink-0 overflow-hidden bg-paper-mid"
                        style={{ width: 52, height: 52, borderRadius: 0 }}
                      >
                        {thumb && (
                          <img src={thumb} alt={p.name} className="photo-thumb w-full h-full object-cover" loading="lazy" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-ink leading-tight truncate" style={{ fontSize: 19, fontWeight: 500 }}>
                          {p.name}
                        </p>
                        <p className="mt-1 font-mono text-ink-soft truncate" style={{ fontSize: 13, letterSpacing: "0.01em" }}>
                          {[p.architect, p.year_completed].filter(Boolean).join(" · ")}
                        </p>
                        {p.category && (
                          <p
                            className="mt-1.5 font-mono uppercase font-medium"
                            style={{ fontSize: 12, color: "hsl(var(--ink-soft))", letterSpacing: "0.16em" }}
                          >
                            {p.category}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="px-6 py-8 text-ink-soft" style={{ fontSize: 14 }}>
                    No projects match.
                  </p>
                )}
              </div>
            </aside>
          )}

          {/* Mobile list toggle */}
          {token && activeCity && isMobile && !sheetOpen && (
            <button
              onClick={() => setSheetOpen(true)}
              className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-2 font-mono uppercase shadow-lg font-semibold"
              style={{
                background: "hsl(var(--ink))",
                color: "white",
                padding: "0.85rem 1.2rem",
                fontSize: 13,
                letterSpacing: "0.16em",
                borderRadius: 0,
              }}
            >
              <List className="w-3.5 h-3.5" /> {filtered.length} projects
            </button>
          )}

          {/* Project card */}
          {token && selected && (
            <div
              className="absolute z-30 fade-in bottom-4 left-4 right-4 md:bottom-6 md:right-6 md:left-auto md:w-[320px]"
              style={{
                background: "hsl(var(--paper))",
                borderRadius: 0,
                boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
              }}
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute top-2 right-2 z-10 p-1 text-warm-gray hover:text-ink"
                style={{ background: "rgba(255,255,255,0.85)", borderRadius: 0 }}
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {(selected.cover_image_url || selected.hero_image_url) && (
                <div
                  className="overflow-hidden bg-paper-mid"
                  style={{ height: 220, borderRadius: 0 }}
                >
                  <img
                    src={selected.cover_image_url || selected.hero_image_url || ""}
                    alt={selected.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-5">
                <h3 className="font-display text-ink leading-tight" style={{ fontSize: 24, fontWeight: 500 }}>
                  {selected.name}
                </h3>
                <p className="mt-2 font-mono text-ink-soft" style={{ fontSize: 14, letterSpacing: "0.01em" }}>
                  {[selected.architect, selected.year_completed].filter(Boolean).join(" · ")}
                </p>
                {selected.practice && (
                  <p
                    className="mt-1.5 font-mono uppercase text-ink-soft font-medium"
                    style={{ fontSize: 12, letterSpacing: "0.16em" }}
                  >
                    {selected.practice}
                  </p>
                )}
                {selected.tagline && (
                  <p className="mt-3 text-ink-soft" style={{ fontSize: 15, lineHeight: 1.65 }}>
                    {selected.tagline}
                  </p>
                )}
                <Link
                  to={`/projects/${selected.slug}`}
                  className="mt-5 inline-flex items-center font-mono uppercase text-accent-terra hover:opacity-80 font-semibold"
                  style={{ fontSize: 13, letterSpacing: "0.16em", borderBottom: "1px solid currentColor", paddingBottom: 3 }}
                >
                  View project →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Cities row — clickable filters */}
        {cities.length > 0 && (
          <div
            className="mx-auto max-w-[1400px] flex overflow-x-auto no-scrollbar"
            style={{ padding: "0 2.5rem 5rem", borderTop: "1px solid hsl(var(--paper-mid))" }}
          >
            {cities.map((c, idx) => {
              const active = activeCity?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveCity(c);
                    setSelected(null);
                    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  aria-pressed={active}
                  className="flex-1 min-w-[140px] py-6 pl-6 text-left transition-colors block"
                  style={{
                    borderRight: idx < cities.length - 1 ? "1px solid hsl(var(--paper-mid))" : "none",
                    background: active ? "hsl(var(--accent-light))" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "hsl(var(--accent-light))";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
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
                    {c.country || "—"}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Cities strip — image, name & project count, below the map */}
      <FeaturedCities />

      {/* Featured buildings — editorial asymmetric grid */}
      <FeaturedBuildings />

      {/* Latest journal */}
      <LatestJournal />

      {/* CTA + footer */}
      <CtaStrip />
      <Footer />
    </div>
  );
};

export default Index;
