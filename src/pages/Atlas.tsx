import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import SEO from "@/components/site/SEO";
import { ChevronDown, X, Search, SlidersHorizontal } from "lucide-react";
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
  materials: string[] | null;
  experience: string[] | null;
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
type FilterType = "city" | "material" | "experience" | "style";
type Active = { type: FilterType; value: string };

const FILTER_LABELS: Record<FilterType, string> = {
  city: "City",
  material: "Material",
  experience: "Experience",
  style: "Style",
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
    <div className="relative w-full md:w-auto md:shrink-0">
      <button
        onClick={onToggleOpen}
        className="inline-flex w-full justify-between md:w-auto md:justify-center items-center gap-2 font-mono uppercase px-3.5 py-2 border transition-colors whitespace-nowrap"
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

/** Search box — type a project or city name and jump straight to it on the map.
 *  Cities filter the map (and open the project list); projects fly in and open
 *  their card. */
function SearchBox({
  projects,
  cities,
  token,
  onPickCity,
  onPickProject,
  onPickPlace,
  autoFocus,
}: {
  projects: Project[];
  cities: City[];
  token: string;
  onPickCity: (c: City) => void;
  onPickProject: (p: Project) => void;
  onPickPlace: (lng: number, lat: number, bbox?: number[]) => void;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [places, setPlaces] = useState<{ name: string; lng: number; lat: number; bbox?: number[] }[]>([]);
  const query = q.trim().toLowerCase();
  const cityMatches = query ? cities.filter((c) => c.name.toLowerCase().includes(query)).slice(0, 4) : [];
  const projMatches = query
    ? projects
        .filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            (p.architect || "").toLowerCase().includes(query) ||
            (p.city?.name || "").toLowerCase().includes(query)
        )
        .slice(0, 6)
    : [];

  // Geocoder — find ANY place (city, country, avenue, address…) via Mapbox so
  // the map can fly anywhere, not just to registered cities/projects.
  useEffect(() => {
    const qq = q.trim();
    if (!qq || !token) { setPlaces([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(qq)}.json` +
          `?access_token=${token}&limit=5&language=en`;
        const res = await fetch(url, { signal: ctrl.signal });
        const data = await res.json();
        setPlaces(
          (data.features || []).map((f: any) => ({
            name: f.place_name as string,
            lng: f.center[0] as number,
            lat: f.center[1] as number,
            bbox: f.bbox as number[] | undefined,
          }))
        );
      } catch {
        /* aborted or network error — ignore */
      }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, token]);

  const hasResults = cityMatches.length + projMatches.length + places.length > 0;
  return (
    <div className="relative w-full">
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: "hsl(var(--paper-warm) / 0.95)", border: "1px solid rgba(0,0,0,0.14)", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}
      >
        <Search className="w-3.5 h-3.5 text-ink-soft shrink-0" />
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search project or city"
          className="bg-transparent text-ink w-full focus:outline-none placeholder:text-ink-soft"
          style={{ fontSize: 13 }}
        />
        {q && (
          <button onClick={() => { setQ(""); setOpen(false); }} aria-label="Clear search" className="text-ink-soft hover:text-ink shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && query && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 right-0 top-full mt-1 z-50 bg-paper overflow-y-auto no-scrollbar fade-in"
            style={{ maxHeight: "60vh", border: "1px solid hsl(var(--paper-mid))", boxShadow: "0 10px 30px rgba(0,0,0,0.14)" }}
          >
            {!hasResults && (
              <p className="px-3 py-3 font-mono uppercase text-ink-soft" style={{ fontSize: 11, letterSpacing: "0.14em" }}>No matches</p>
            )}
            {cityMatches.map((c) => (
              <button
                key={"c" + c.id}
                onClick={() => { onPickCity(c); setQ(""); setOpen(false); }}
                className="w-full text-left px-3 py-2.5 hover:bg-paper-mid transition-colors flex items-center justify-between gap-2"
                style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}
              >
                <span className="font-display text-ink truncate" style={{ fontSize: 15 }}>{c.name}</span>
                <span className="font-mono uppercase text-ink-soft shrink-0" style={{ fontSize: 10, letterSpacing: "0.16em" }}>City</span>
              </button>
            ))}
            {projMatches.map((p) => (
              <button
                key={"p" + p.id}
                onClick={() => { onPickProject(p); setQ(""); setOpen(false); }}
                className="w-full text-left px-3 py-2.5 hover:bg-paper-mid transition-colors flex items-center justify-between gap-2"
                style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}
              >
                <span className="min-w-0">
                  <span className="block font-display text-ink truncate" style={{ fontSize: 15 }}>{p.name}</span>
                  {p.city?.name && (
                    <span className="block font-mono uppercase text-ink-soft truncate" style={{ fontSize: 10, letterSpacing: "0.14em" }}>{p.city.name}</span>
                  )}
                </span>
                <span className="font-mono uppercase text-ink-soft shrink-0" style={{ fontSize: 10, letterSpacing: "0.16em" }}>Project</span>
              </button>
            ))}
            {places.map((pl, i) => (
              <button
                key={"pl" + i}
                onClick={() => { onPickPlace(pl.lng, pl.lat, pl.bbox); setQ(""); setOpen(false); }}
                className="w-full text-left px-3 py-2.5 hover:bg-paper-mid transition-colors flex items-center justify-between gap-3"
                style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}
              >
                <span className="text-ink truncate" style={{ fontSize: 13, lineHeight: 1.3 }}>{pl.name}</span>
                <span className="font-mono uppercase text-ink-soft shrink-0" style={{ fontSize: 10, letterSpacing: "0.16em" }}>Place</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** A single filter category inside the Filters panel — a label and its options
 *  as toggle chips. Picking one activates that filter (single-select). */
function FilterGroup({
  label,
  type,
  options,
  active,
  onPick,
}: {
  label: string;
  type: FilterType;
  options: string[];
  active: Active | null;
  onPick: (v: string) => void;
}) {
  if (!options.length) return null;
  return (
    <div className="mb-5 last:mb-0">
      <p className="font-mono uppercase text-ink-soft mb-2.5" style={{ fontSize: 10, letterSpacing: "0.2em" }}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = active?.type === type && active.value === o;
          return (
            <button
              key={o}
              onClick={() => onPick(o)}
              className="font-mono uppercase px-3 py-1.5 border transition-colors"
              style={
                on
                  ? { fontSize: 12, letterSpacing: "0.12em", background: "hsl(var(--ink))", color: "#fff", borderColor: "hsl(var(--ink))" }
                  : { fontSize: 12, letterSpacing: "0.12em", background: "hsl(var(--paper))", color: "hsl(var(--ink))", borderColor: "rgba(0,0,0,0.14)" }
              }
            >
              {o}
            </button>
          );
        })}
      </div>
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
  const hoverPopupRef = useRef<mapboxgl.Popup | null>(null);
  const skipCameraRef = useRef(false);

  const [token, setToken] = useState<string>(() => getMapboxToken());
  const [tokenInput, setTokenInput] = useState("");
  const [mapReady, setMapReady] = useState(false);

  const [cities, setCities] = useState<City[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState<Active | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  // At world-view zoom levels, individual project pins from the same city stack
  // into illegible blobs (Barcelona's 3 projects sit on the same pixel). Hide
  // the pins entirely until the user zooms in to a city-readable scale.
  const [isCityCluster, setIsCityCluster] = useState(true);
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
          .select("*,city:cities(name,slug)")
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
      // On mobile, use a flat mercator map so every pin stays inside the
      // frame — on a narrow screen the globe pushes edge / far-side pins
      // outside the sphere. The spinning globe is reserved for wider screens.
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        projection: isMobile ? { name: "mercator" } : { name: "globe" },
        center: [10, 25],
        zoom: 1.5,
        attributionControl: false,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => setMapReady(true));
      map.on("zoom", () => {
        const z = map.getZoom();
        setIsZoomedIn(z > 3);
        setIsCityCluster(z < 5);
      });
      mapRef.current = map;

      // ─── Spinning globe (desktop only) ──────────────────────────────
      // The map rotates slowly at low zoom. As soon as the user zooms in
      // (or zoom passes maxSpinZoom for any reason), the spin pauses.
      if (!isMobile) {
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
      }
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
  const styleOptions = useMemo(
    () => Array.from(new Set(projects.map((p) => p.style).filter(Boolean) as string[])).sort(),
    [projects]
  );

  const filtered = useMemo(() => {
    if (!active) return projects;
    return projects.filter((p) => {
      if (active.type === "city") {
        return p.city_id === cityNameToId.get(active.value);
      }
      if (active.type === "style") return p.style === active.value;
      // Prefer the per-project DB tags (editable in the admin); fall back to the
      // static seed map for projects not yet tagged.
      const t = tagsFor(p.slug);
      const mats = p.materials && p.materials.length ? p.materials : t.materials;
      const exps = p.experience && p.experience.length ? p.experience : t.experience;
      if (active.type === "material") return mats.includes(active.value);
      if (active.type === "experience") return exps.includes(active.value);
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
    // A direct project pick handles its own fly-to; skip the auto framing once.
    if (skipCameraRef.current) {
      skipCameraRef.current = false;
      return;
    }
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

    // Shared hover tooltip — shows the project name when you hover a pin.
    hoverPopupRef.current?.remove();
    const hoverPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      anchor: "bottom",
      offset: 16,
      className: "siana-pin-popup",
    });
    hoverPopupRef.current = hoverPopup;
    const esc = (s: string) =>
      s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
    const dot = "#bf3a18";

    // ─── World-view: no pins ─────────────────────────────────────────
    // At low zoom, individual project pins from the same city collapse to
    // the same pixel and pile up. The map stays clean until the user zooms
    // in enough to read individual locations.
    if (isCityCluster) {
      return () => { hoverPopup.remove(); };
    }

    // ─── Zoomed in: individual project pins ──────────────────────────
    filtered.forEach((p) => {
      if (p.latitude == null || p.longitude == null) return;
      const on = selected?.id === p.id;
      // The anchor element IS the visible dot — sized exactly like what the
      // user sees, so Mapbox's `anchor: "center"` lands the dot's geometric
      // centre on the lat/lng. The pulse ring is a child centred on the dot
      // via top/left 50% + translate, so it can't drift relative to the dot.
      const el = document.createElement("button");
      el.setAttribute("aria-label", p.name);
      el.style.cssText = [
        "all:unset",
        "cursor:pointer",
        "display:block",
        "box-sizing:border-box",
        "width:11px",
        "height:11px",
        "border-radius:9999px",
        `background:${dot}`,
        "border:2px solid #fff",
        `box-shadow:0 0 0 2px ${dot}`,
        `transform:${on ? "scale(1.35)" : "scale(1)"}`,
        "transition:transform .18s ease",
        "position:relative",
      ].join(";");
      const pulse = document.createElement("span");
      pulse.style.cssText = [
        "position:absolute",
        "top:50%",
        "left:50%",
        "width:24px",
        "height:24px",
        "border-radius:9999px",
        `border:1px solid ${dot}`,
        "opacity:.35",
        "transform:translate(-50%,-50%)",
        "animation:siana-pulse 2.2s infinite",
        "pointer-events:none",
      ].join(";");
      el.appendChild(pulse);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        selectProject(p);
      });
      el.addEventListener("mouseenter", () => {
        if (!mapRef.current) return;
        // Only show the label when the user is zoomed in close enough to
        // be looking at a city — at the global view the labels would
        // overlap and clutter the cartography.
        if (mapRef.current.getZoom() < 8) return;
        hoverPopup
          .setLngLat([p.longitude!, p.latitude!])
          .setHTML(`<span class="siana-pin-popup-label">${esc(p.name)}</span>`)
          .addTo(mapRef.current);
      });
      el.addEventListener("mouseleave", () => hoverPopup.remove());
      markersRef.current.push(new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([p.longitude, p.latitude]).addTo(mapRef.current!));
    });
    return () => {
      hoverPopup.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selected, mapReady, isCityCluster]);

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
    setFiltersOpen(false);
  };
  const clearActive = () => {
    setActive(null);
    setSelected(null);
  };
  const resetView = () => {
    setActive(null);
    setSelected(null);
    mapRef.current?.flyTo({ center: [10, 25], zoom: 1.5, speed: 1.2, curve: 1.4, essential: true });
  };

  // Search: jump straight to a city (filter + fly + project list) or a project
  // (fly to it + open its card).
  const searchPickCity = (c: City) => {
    setSelected(null);
    setActive({ type: "city", value: c.name });
    setSearchOpen(false);
  };
  const searchPickProject = (p: Project) => {
    skipCameraRef.current = true;
    setActive(null);
    selectProject(p);
    setSearchOpen(false);
    window.setTimeout(() => { skipCameraRef.current = false; }, 600);
  };
  // A geocoded place (not a registered project/city) — just fly the map there,
  // like any map search. Fit the bbox when available, else zoom to the point.
  const searchPickPlace = (lng: number, lat: number, bbox?: number[]) => {
    skipCameraRef.current = true;
    setActive(null);
    setSelected(null);
    setSearchOpen(false);
    const map = mapRef.current;
    if (map) {
      if (bbox && bbox.length === 4) {
        map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], {
          padding: { top: NAV_H + FILTER_BAR_H + 40, bottom: 80, left: 80, right: 80 },
          maxZoom: 15,
          duration: 1100,
        });
      } else {
        map.flyTo({ center: [lng, lat], zoom: 14, essential: true });
      }
    }
    window.setTimeout(() => { skipCameraRef.current = false; }, 900);
  };

  const saveToken = () => {
    if (!tokenInput.trim()) return;
    localStorage.setItem(TOKEN_KEY, tokenInput.trim());
    setToken(tokenInput.trim());
  };

  return (
    <div className="bg-paper">
      <SEO
        title="Map — Explore Architecture | Siana"
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

        {/* Tap-away backdrop — closes the search / filters panels. */}
        {(searchOpen || filtersOpen) && (
          <div
            className="absolute inset-0 z-[35]"
            onClick={() => { setSearchOpen(false); setFiltersOpen(false); }}
          />
        )}

        {/* Reset-view button — only visible once the user has zoomed in.
            Sits bottom-left so it doesn't clash with Mapbox's nav controls
            (top-right) or the selected-project card. */}
        {isZoomedIn && !selected && !(active?.type === "city" && filtered.length > 0) && (
          <button
            onClick={resetView}
            className="absolute z-40 font-mono uppercase inline-flex items-center gap-1.5 px-2.5 py-1 transition-opacity hover:opacity-100 fade-in"
            style={{
              bottom: 18,
              left: 18,
              fontSize: 10,
              letterSpacing: "0.16em",
              fontWeight: 500,
              background: "hsl(var(--paper-warm) / 0.85)",
              border: "1px solid rgba(0,0,0,0.12)",
              color: "hsl(var(--ink-soft))",
              opacity: 0.8,
            }}
            aria-label="Reset map view"
          >
            <span aria-hidden="true">←</span>
            Back to world
          </button>
        )}

        {/* Filter bar — floats over the map, just below the navbar.
            High z-index so dropdown panels render above the selected card.
            When a filter is active, the bar collapses into a single
            "Filtering by … ×" pill that returns to the bar on click. */}
        <div
          className="absolute left-0 right-0 z-40"
          style={{ top: NAV_H, background: "transparent", pointerEvents: "none" }}
        >
          <div className="md:hidden px-5 py-2.5 pointer-events-auto">
            {/* Compact toolbar (MOBILE ONLY) — keeps the map clear; search and filters open on tap. */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setSearchOpen((o) => !o); setFiltersOpen(false); }}
                aria-label="Search"
                aria-expanded={searchOpen}
                className="inline-flex items-center justify-center transition-colors hover:opacity-90"
                style={{
                  width: 40, height: 40,
                  background: searchOpen ? "hsl(var(--ink))" : "hsl(var(--paper-warm) / 0.95)",
                  color: searchOpen ? "#fff" : "hsl(var(--ink))",
                  border: "1px solid rgba(0,0,0,0.14)",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                }}
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                onClick={() => { setFiltersOpen((o) => !o); setSearchOpen(false); }}
                aria-expanded={filtersOpen}
                className="inline-flex items-center gap-2 font-mono uppercase transition-colors hover:opacity-90"
                style={{
                  height: 40, padding: "0 14px",
                  fontSize: 12, letterSpacing: "0.14em", fontWeight: 500,
                  background: filtersOpen || active ? "hsl(var(--ink))" : "hsl(var(--paper-warm) / 0.95)",
                  color: filtersOpen || active ? "#fff" : "hsl(var(--ink))",
                  border: "1px solid rgba(0,0,0,0.14)",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                }}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                <ChevronDown className="w-3 h-3 transition-transform" style={{ transform: filtersOpen ? "rotate(180deg)" : "none" }} />
              </button>

              {active && (
                <button
                  onClick={clearActive}
                  className="inline-flex items-center gap-2 font-mono uppercase transition-opacity hover:opacity-90"
                  style={{
                    height: 40, padding: "0 12px",
                    fontSize: 12, letterSpacing: "0.12em",
                    background: "hsl(var(--paper-warm) / 0.95)",
                    color: "hsl(var(--ink))",
                    border: "1px solid hsl(var(--ink))",
                  }}
                  aria-label="Clear filter"
                >
                  {active.value}
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search panel — revealed by the magnifier. */}
            {searchOpen && (
              <div className="mt-2 w-full max-w-[360px]">
                <SearchBox projects={projects} cities={cities} token={token} onPickCity={searchPickCity} onPickProject={searchPickProject} onPickPlace={searchPickPlace} autoFocus />
              </div>
            )}

            {/* Filters panel — all categories in one sheet; pick one to apply. */}
            {filtersOpen && (
              <div
                className="mt-2 w-full max-w-[420px] bg-paper p-4 fade-in overflow-y-auto no-scrollbar"
                style={{ maxHeight: "min(70vh, 560px)", border: "1px solid hsl(var(--paper-mid))", boxShadow: "0 16px 44px rgba(0,0,0,0.14)" }}
              >
                <FilterGroup label="Cities" type="city" options={cityOptions} active={active} onPick={(v) => activate("city", v)} />
                <FilterGroup label="Materials" type="material" options={MATERIALS} active={active} onPick={(v) => activate("material", v)} />
                <FilterGroup label="Experience" type="experience" options={EXPERIENCES} active={active} onPick={(v) => activate("experience", v)} />
                <FilterGroup label="Style" type="style" options={styleOptions} active={active} onPick={(v) => activate("style", v)} />
              </div>
            )}
          </div>

          {/* DESKTOP (md+) — the classic always-visible bar: search box + filter
              chips in a row (the compact search/Filters toolbar above is mobile-only). */}
          <div className="hidden md:flex items-start gap-3 flex-wrap px-8 py-2.5 pointer-events-auto">
            <div className="w-[260px] shrink-0">
              <SearchBox projects={projects} cities={cities} token={token} onPickCity={searchPickCity} onPickProject={searchPickProject} onPickPlace={searchPickPlace} />
            </div>
            {active ? (
              <div className="inline-flex items-center gap-3" style={{ minHeight: 40 }}>
                <span className="font-mono uppercase text-ink" style={{ fontSize: 11, letterSpacing: "0.18em", background: "hsl(var(--paper-warm) / 0.92)", padding: "4px 8px" }}>
                  {FILTER_LABELS[active.type]}
                </span>
                <button
                  onClick={clearActive}
                  className="font-mono uppercase inline-flex items-center gap-2 px-3 py-1.5 transition-colors hover:opacity-90"
                  style={{ fontSize: 12, letterSpacing: "0.12em", background: "hsl(var(--ink))", color: "#fff", border: "1px solid hsl(var(--ink))" }}
                  aria-label="Clear filter"
                >
                  {active.value}
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 flex-wrap" style={{ minHeight: 40 }}>
                <FilterMenu label="Cities" options={cityOptions} selected={[]} onToggle={(v) => activate("city", v)} open={openMenu === "cities"} onToggleOpen={() => toggleMenu("cities")} onClose={closeMenu} stacked />
                <FilterMenu label="Materials" options={MATERIALS} selected={[]} onToggle={(v) => activate("material", v)} open={openMenu === "materials"} onToggleOpen={() => toggleMenu("materials")} onClose={closeMenu} stacked />
                <FilterMenu label="Experience" options={EXPERIENCES} selected={[]} onToggle={(v) => activate("experience", v)} open={openMenu === "experience"} onToggleOpen={() => toggleMenu("experience")} onClose={closeMenu} stacked />
                {styleOptions.length > 0 && (
                  <FilterMenu label="Style" options={styleOptions} selected={[]} onToggle={(v) => activate("style", v)} open={openMenu === "style"} onToggleOpen={() => toggleMenu("style")} onClose={closeMenu} stacked />
                )}
              </div>
            )}
          </div>
        </div>

          {/* Selected project — editorial card that opens the full page on click.
              Slides in from the right edge of the map. Photo dominates the card,
              copy sits in a tighter block underneath. Top offset clears the
              floating filter bar so the card isn't tucked under it. */}
          {selected && (
            <div
              key={selected.id}
              className="absolute z-30 slide-in-right
                left-4 right-4 bottom-4 max-h-[72vh] overflow-y-auto no-scrollbar
                md:left-auto md:right-6 md:bottom-auto md:top-[148px] md:w-[380px] md:max-h-[calc(100vh-180px)]"
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
                        className="block w-full h-auto max-h-[34vh] object-cover md:max-h-none transition-transform duration-700 group-hover:scale-[1.03]"
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

          {/* City project list — when a city is active, list its projects with
              an editorial thumbnail; clicking one selects it on the map. Sits
              on the left so it doesn't collide with the selected-project card
              (right); becomes a bottom sheet on mobile. */}
          {active?.type === "city" && filtered.length > 0 && (
            <div
              className={`absolute z-30 bg-paper overflow-hidden flex-col fade-in
                ${selected ? "hidden md:flex" : "flex"}
                left-4 right-4 bottom-4 max-h-[38vh]
                md:left-4 md:right-auto md:bottom-auto md:top-[148px] md:w-[324px] md:max-h-[calc(100vh-180px)]`}
              style={{ border: "1px solid hsl(var(--paper-mid))", boxShadow: "0 16px 44px rgba(0,0,0,0.16)" }}
            >
              <div className="flex items-start justify-between gap-3 px-4 py-3.5 shrink-0" style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}>
                <div className="min-w-0">
                  <p className="font-mono uppercase text-accent-terra font-semibold" style={{ fontSize: 10, letterSpacing: "0.2em" }}>Projects in</p>
                  <p className="font-display text-ink leading-tight mt-1 truncate" style={{ fontSize: 20 }}>{active.value}</p>
                  <p className="font-mono text-ink-soft mt-1" style={{ fontSize: 11, letterSpacing: "0.04em" }}>
                    {filtered.length} {filtered.length === 1 ? "building" : "buildings"}
                  </p>
                </div>
                <button onClick={clearActive} aria-label="Close list" className="p-1 -mr-1 text-ink-soft hover:text-ink transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto no-scrollbar">
                {filtered.map((p) => {
                  const on = selected?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => selectProject(p)}
                      className="group w-full text-left flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-paper-warm"
                      style={{ borderBottom: "1px solid hsl(var(--paper-mid))", background: on ? "hsl(var(--paper-warm))" : undefined }}
                    >
                      <span className="overflow-hidden shrink-0 bg-paper-mid" style={{ width: 66, height: 50 }}>
                        {(p.cover_image_url || p.hero_image_url) && (
                          <img
                            src={p.cover_image_url || p.hero_image_url || ""}
                            alt=""
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-ink truncate" style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.25 }}>{p.name}</span>
                        {(p.architect || p.year_completed) && (
                          <span className="block font-mono text-ink-soft truncate mt-1" style={{ fontSize: 11 }}>
                            {[p.architect, p.year_completed].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </span>
                      <span
                        aria-hidden="true"
                        className={"shrink-0 text-ink transition-all " + (on ? "opacity-100" : "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0")}
                        style={{ fontSize: 14 }}
                      >
                        →
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

      </div>
    </div>
  );
}
