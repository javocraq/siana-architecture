import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import SEO from "@/components/site/SEO";
import { ChevronDown, X } from "lucide-react";
import { getMapboxToken, TOKEN_KEY } from "@/lib/mapbox";
import { MATERIALS, EXPERIENCES, tagsFor } from "@/lib/atlasFilters";

type City = {
  id: string;
  slug: string;
  name: string;
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
  city_id: string | null;
  city: { name: string; slug: string } | null;
};

const NAV_H = 76;
// Approx height of the filter bar (chips + padding). Used to push the map
// canvas down so the bar isn't sitting on top of the map.
const FILTER_BAR_H = 60;

/** Single active filter — picking a chip from any category activates one
 *  filter, hides the filter bar, and frames the map on the matching set. */
type FilterType = "city" | "material" | "experience";
type Active = { type: FilterType; value: string };

const FILTER_LABELS: Record<FilterType, string> = {
  city: "City",
  material: "Material",
  experience: "Experience",
};

/** A minimal popover filter — a labelled chip that opens a panel of toggle chips.
 *  When `stacked` is set, options render one-per-row as standalone boxes
 *  without a surrounding panel — used by the Cities filter so the chips
 *  float over the map. */
function FilterMenu({
  label, options, selected, onToggle, open, onToggleOpen, onClose, stacked,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  open: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  stacked?: boolean;
}) {
  const count = selected.length;
  const active = count > 0 || open;
  return (
    <div className="relative shrink-0">
      <button
        onClick={onToggleOpen}
        className="inline-flex items-center gap-2 font-mono uppercase px-3.5 py-2 border transition-colors whitespace-nowrap"
        style={{
          fontSize: 12,
          letterSpacing: "0.14em",
          fontWeight: 500,
          background: "hsl(var(--paper-warm) / 0.92)",
          borderColor: active ? "hsl(var(--ink))" : "rgba(0,0,0,0.14)",
          color: active ? "hsl(var(--ink))" : "hsl(var(--ink-soft))",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        }}
      >
        {label}
        {count > 0 && (
          <span className="inline-flex items-center justify-center text-white" style={{ background: "hsl(var(--ink))", fontSize: 10, minWidth: 16, height: 16, padding: "0 4px" }}>
            {count}
          </span>
        )}
        <ChevronDown className="w-3 h-3 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          {stacked ? (
            <div className="absolute left-0 top-full mt-2 z-50 fade-in flex flex-col gap-1.5 overflow-y-auto no-scrollbar"
              style={{ maxHeight: "min(60vh, 480px)", minWidth: 200 }}>
              {options.map((o) => {
                const on = selected.includes(o);
                return (
                  <button
                    key={o}
                    onClick={() => onToggle(o)}
                    className="font-mono uppercase px-3 py-2 border transition-colors text-left whitespace-nowrap"
                    style={
                      on
                        ? { fontSize: 12, letterSpacing: "0.12em", background: "hsl(var(--ink))", color: "#fff", borderColor: "hsl(var(--ink))", boxShadow: "0 2px 10px rgba(0,0,0,0.10)" }
                        : { fontSize: 12, letterSpacing: "0.12em", background: "hsl(var(--paper))", borderColor: "rgba(0,0,0,0.12)", color: "hsl(var(--ink))", boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }
                    }
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="absolute left-0 top-full mt-2 z-50 bg-paper p-4 fade-in" style={{ minWidth: 280, maxWidth: 380, border: "1px solid hsl(var(--paper-mid))", boxShadow: "0 10px 34px rgba(0,0,0,0.10)" }}>
              <div className="flex flex-wrap gap-1.5 overflow-y-auto no-scrollbar" style={{ maxHeight: "min(60vh, 480px)" }}>
                {options.map((o) => {
                  const on = selected.includes(o);
                  return (
                    <button
                      key={o}
                      onClick={() => onToggle(o)}
                      className="font-mono uppercase px-3 py-1.5 border transition-colors"
                      style={
                        on
                          ? { fontSize: 12, letterSpacing: "0.12em", background: "hsl(var(--ink))", color: "#fff", borderColor: "hsl(var(--ink))" }
                          : { fontSize: 12, letterSpacing: "0.12em", borderColor: "rgba(0,0,0,0.12)", color: "hsl(var(--ink-muted))" }
                      }
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Atlas — the dedicated architectural-discovery tool.
 * Cities and all filters sit in a horizontal bar above a full-bleed map.
 */
export default function Atlas() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [token, setToken] = useState<string>(() => getMapboxToken());
  const [tokenInput, setTokenInput] = useState("");
  const [mapReady, setMapReady] = useState(false);

  const [cities, setCities] = useState<City[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState<Active | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [selected, setSelected] = useState<Project | null>(null);
  const [searchParams] = useSearchParams();
  const cityParam = searchParams.get("city");
  const projectParam = searchParams.get("project");

  // When the URL carries ?city=<slug>, activate that city as the filter.
  useEffect(() => {
    if (!cityParam || cities.length === 0) return;
    const match = cities.find((c) => c.slug === cityParam);
    if (match) setActive({ type: "city", value: match.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityParam, cities.length]);

  // When the URL carries ?project=<slug>, activate its city and select it.
  useEffect(() => {
    if (!projectParam || projects.length === 0 || !mapReady) return;
    const p = projects.find((x) => x.slug === projectParam);
    if (!p) return;
    if (p.city?.name) setActive({ type: "city", value: p.city.name });
    setSelected(p);
    if (p.latitude != null && p.longitude != null) {
      mapRef.current?.flyTo({ center: [p.longitude, p.latitude], zoom: 15, essential: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectParam, projects.length, mapReady]);

  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: ps }] = await Promise.all([
        supabase
          .from("cities")
          .select("id,slug,name,center_latitude,center_longitude,default_zoom")
          .eq("status", "published")
          .order("name"),
        supabase
          .from("projects")
          .select("id,slug,name,tagline,architect,practice,year_completed,category,style,latitude,longitude,cover_image_url,hero_image_url,city_id,city:cities(name,slug)")
          .eq("status", "published"),
      ]);
      if (cs) setCities(cs as any);
      if (ps) setProjects(ps as any);
    })();
  }, []);

  // Init map once
  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    try {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [10, 25],
        zoom: 1.5,
        attributionControl: false,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => setMapReady(true));
      mapRef.current = map;

      // ─── Spinning globe ─────────────────────────────────────────────
      // The map rotates slowly at low zoom. As soon as the user zooms in
      // (or zoom passes maxSpinZoom for any reason), the spin pauses.
      const SECONDS_PER_REV = 220;
      const MAX_SPIN_ZOOM = 4;
      const SLOW_SPIN_ZOOM = 3;
      let userInteracting = false;
      const spinGlobe = () => {
        const zoom = map.getZoom();
        if (userInteracting || zoom >= MAX_SPIN_ZOOM) return;
        let distancePerSecond = 360 / SECONDS_PER_REV;
        if (zoom > SLOW_SPIN_ZOOM) {
          const zoomDif = (MAX_SPIN_ZOOM - zoom) / (MAX_SPIN_ZOOM - SLOW_SPIN_ZOOM);
          distancePerSecond *= zoomDif;
        }
        const c = map.getCenter();
        c.lng -= distancePerSecond;
        map.easeTo({ center: c, duration: 1000, easing: (n) => n });
      };
      map.on("mousedown", () => { userInteracting = true; });
      map.on("mouseup", () => { userInteracting = false; spinGlobe(); });
      map.on("touchstart", () => { userInteracting = true; });
      map.on("touchend", () => { userInteracting = false; spinGlobe(); });
      map.on("dragend", () => { userInteracting = false; spinGlobe(); });
      map.on("pitchend", () => { userInteracting = false; spinGlobe(); });
      map.on("rotateend", () => { userInteracting = false; spinGlobe(); });
      map.on("moveend", () => { spinGlobe(); });
      map.on("load", () => spinGlobe());
    } catch (e) {
      console.error("Mapbox init failed", e);
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [token]);

  // Map city name → id for fast lookup (used by the city filter).
  const cityNameToId = useMemo(() => {
    const m = new Map<string, string>();
    cities.forEach((c) => m.set(c.name, c.id));
    return m;
  }, [cities]);
  const cityOptions = useMemo(() => cities.map((c) => c.name), [cities]);

  const filtered = useMemo(() => {
    if (!active) return projects;
    return projects.filter((p) => {
      if (active.type === "city") {
        return p.city_id === cityNameToId.get(active.value);
      }
      const t = tagsFor(p.slug);
      if (active.type === "material") return t.materials.includes(active.value);
      if (active.type === "experience") return t.experience.includes(active.value);
      return true;
    });
  }, [projects, active, cityNameToId]);

  const fitTo = (list: Project[]) => {
    const map = mapRef.current;
    const pts = list.filter((p) => p.latitude != null && p.longitude != null);
    if (!map || pts.length === 0) return;
    if (pts.length === 1) {
      map.flyTo({ center: [pts[0].longitude!, pts[0].latitude!], zoom: 13, essential: true });
      return;
    }
    const b = new mapboxgl.LngLatBounds();
    pts.forEach((p) => b.extend([p.longitude!, p.latitude!]));
    // Top padding accounts for the navbar + filter bar overlay so the
    // bounded set centers visually within the area below them.
    map.fitBounds(b, {
      padding: { top: NAV_H + FILTER_BAR_H + 40, bottom: 80, left: 80, right: 80 },
      maxZoom: 13,
      duration: 1100,
    });
  };

  // Frame the atlas on load; when a single city is active, fly to it;
  // otherwise fit bounds around the matching set.
  useEffect(() => {
    if (!mapReady) return;
    if (active?.type === "city") {
      const c = cities.find((x) => x.name === active.value);
      if (c && c.center_latitude != null && c.center_longitude != null) {
        mapRef.current?.flyTo({ center: [c.center_longitude, c.center_latitude], zoom: c.default_zoom || 12, speed: 1.2, curve: 1.4, essential: true });
        return;
      }
    }
    fitTo(filtered.length ? filtered : projects);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, active, projects.length, filtered.length]);

  // Markers for the filtered set
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    filtered.forEach((p) => {
      if (p.latitude == null || p.longitude == null) return;
      const el = document.createElement("button");
      el.setAttribute("aria-label", p.name);
      el.style.cssText = "background:transparent;border:0;padding:0;cursor:pointer;display:block;position:relative;width:16px;height:16px;";
      const on = selected?.id === p.id;
      const dot = "#bf3a18";
      el.innerHTML = `
        <span style="display:block;width:11px;height:11px;border-radius:9999px;background:${dot};border:2px solid #fff;box-shadow:0 0 0 2px ${dot};position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) ${on ? "scale(1.35)" : "scale(1)"};transition:transform .18s ease;"></span>
        <span style="position:absolute;top:50%;left:50%;width:24px;height:24px;border-radius:9999px;border:1px solid ${dot};opacity:.35;transform:translate(-50%,-50%);animation:siana-pulse 2.2s infinite;"></span>`;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        selectProject(p);
      });
      markersRef.current.push(new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([p.longitude, p.latitude]).addTo(mapRef.current!));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selected, mapReady]);

  const selectProject = (p: Project) => {
    setSelected(p);
    if (p.latitude != null && p.longitude != null) {
      mapRef.current?.flyTo({ center: [p.longitude, p.latitude], zoom: 15, essential: true });
    }
  };

  const toggleMenu = (k: string) => setOpenMenu((m) => (m === k ? null : k));
  const closeMenu = () => setOpenMenu(null);

  // Activating a value commits the filter and closes the dropdown — the
  // filter bar then collapses to a single "× value" pill.
  const activate = (type: FilterType, value: string) => {
    setActive({ type, value });
    setOpenMenu(null);
    setSelected(null);
  };
  const clearActive = () => {
    setActive(null);
    setSelected(null);
  };

  const saveToken = () => {
    if (!tokenInput.trim()) return;
    localStorage.setItem(TOKEN_KEY, tokenInput.trim());
    setToken(tokenInput.trim());
  };

  return (
    <div className="bg-paper">
      <SEO
        title="Atlas — Explore Architecture on the Map | Siana"
        description="An interactive atlas of significant architecture across the world's cities. Filter by city, material, experience, style, era and architect — and explore each project on the map."
      />
      <Navbar />

      {!token && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/95">
          <div className="max-w-md w-full mx-6 p-8 bg-paper" style={{ border: "1px solid hsl(var(--paper-mid))" }}>
            <p className="font-mono uppercase text-ink-soft mb-3 font-semibold" style={{ fontSize: 13, letterSpacing: "0.16em" }}>Mapbox token required</p>
            <h2 className="font-display text-3xl text-ink mb-4">Connect the map</h2>
            <p className="text-[15px] text-ink-soft mb-6 leading-[1.65]">
              Paste a Mapbox public token, or set <code>VITE_MAPBOX_PUBLIC_TOKEN</code> to skip this prompt.
            </p>
            <input type="text" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="pk.eyJ1Ijoi..." className="w-full px-3 py-2.5 bg-paper text-[15px] mb-3 focus:outline-none focus:border-ink placeholder:text-ink-soft" style={{ border: "1px solid hsl(var(--paper-mid))" }} />
            <button onClick={saveToken} className="w-full px-4 py-2.5 font-mono uppercase hover:opacity-80 transition-opacity font-medium" style={{ background: "hsl(var(--ink))", color: "white", fontSize: 14, letterSpacing: "0.16em" }}>Save token</button>
          </div>
        </div>
      )}

      {/* Map fills the entire viewport; the filter bar overlays on top of
          it with a near-transparent background so the cartography reads
          through. */}
      <div className="relative fade-in" style={{ height: "100vh", width: "100%", overflow: "hidden", background: "hsl(var(--paper-warm))" }}>
        <div ref={mapContainer} className="absolute inset-0" />

        {/* Filter bar — floats over the map, just below the navbar.
            High z-index so dropdown panels render above the selected card.
            When a filter is active, the bar collapses into a single
            "Filtering by … ×" pill that returns to the bar on click. */}
        <div
          className="absolute left-0 right-0 z-40"
          style={{
            top: NAV_H,
            height: FILTER_BAR_H,
            background: "transparent",
            pointerEvents: "none",
          }}
        >
          {active ? (
            <div className="inline-flex items-center gap-3 px-5 md:px-8 h-full pointer-events-auto">
              <span className="font-mono uppercase text-ink" style={{ fontSize: 11, letterSpacing: "0.18em", background: "hsl(var(--paper-warm) / 0.92)", padding: "4px 8px" }}>
                {FILTER_LABELS[active.type]}
              </span>
              <button
                onClick={clearActive}
                className="font-mono uppercase inline-flex items-center gap-2 px-3 py-1.5 transition-colors hover:opacity-90"
                style={{
                  fontSize: 12,
                  letterSpacing: "0.12em",
                  background: "hsl(var(--ink))",
                  color: "#fff",
                  border: "1px solid hsl(var(--ink))",
                }}
                aria-label="Clear filter"
              >
                {active.value}
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 flex-wrap px-5 md:px-8 h-full pointer-events-auto">
              <FilterMenu label="Cities" options={cityOptions} selected={[]} onToggle={(v) => activate("city", v)} open={openMenu === "cities"} onToggleOpen={() => toggleMenu("cities")} onClose={closeMenu} stacked />
              <FilterMenu label="Materials" options={MATERIALS} selected={[]} onToggle={(v) => activate("material", v)} open={openMenu === "materials"} onToggleOpen={() => toggleMenu("materials")} onClose={closeMenu} stacked />
              <FilterMenu label="Experience" options={EXPERIENCES} selected={[]} onToggle={(v) => activate("experience", v)} open={openMenu === "experience"} onToggleOpen={() => toggleMenu("experience")} onClose={closeMenu} stacked />
            </div>
          )}
        </div>

          {/* Selected project — editorial card that opens the full page on click.
              Slides in from the right edge of the map. Photo dominates the card,
              copy sits in a tighter block underneath. Top offset clears the
              floating filter bar so the card isn't tucked under it. */}
          {selected && (
            <div
              key={selected.id}
              className="absolute z-30 slide-in-right
                left-4 right-4
                md:left-auto md:right-6 md:w-[380px]"
              style={{ top: NAV_H + 72 }}
            >
              <div className="relative bg-paper" style={{ boxShadow: "0 10px 36px rgba(0,0,0,0.18)" }}>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="absolute top-2 right-2 z-20 p-1.5 text-ink hover:bg-paper-mid transition-colors"
                  style={{ background: "rgba(255,255,255,0.9)" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <Link
                  to={`/projects/${selected.slug}`}
                  className="block group"
                  aria-label={`Open ${selected.name}`}
                >
                  {(selected.cover_image_url || selected.hero_image_url) && (
                    <div className="overflow-hidden">
                      <img
                        src={selected.cover_image_url || selected.hero_image_url || ""}
                        alt={selected.name}
                        className="block w-full h-auto transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    </div>
                  )}
                  <div className="px-5 pt-4 pb-5">
                    {selected.city?.name && (
                      <p
                        className="font-mono uppercase text-accent-terra font-semibold mb-1.5"
                        style={{ fontSize: 11, letterSpacing: "0.2em" }}
                      >
                        {selected.city.name}
                      </p>
                    )}
                    <h3
                      className="font-display text-ink leading-tight"
                      style={{ fontSize: 21, fontWeight: 400, letterSpacing: "-0.005em" }}
                    >
                      {selected.name}
                    </h3>
                    {(selected.architect || selected.year_completed) && (
                      <p className="mt-1.5 font-mono text-ink-soft" style={{ fontSize: 12, letterSpacing: "0.01em" }}>
                        {[selected.architect, selected.year_completed].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <span
                      className="mt-3 group font-mono uppercase inline-flex items-center text-ink transition-all group-hover:gap-3"
                      style={{
                        fontSize: 12,
                        letterSpacing: "0.28em",
                        fontWeight: 500,
                        gap: "0.6rem",
                        borderBottom: "1px solid hsl(var(--ink))",
                        paddingBottom: 4,
                      }}
                    >
                      View project
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          )}

      </div>
    </div>
  );
}
