import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import SEO from "@/components/site/SEO";
import { ChevronDown, X, Search, SlidersHorizontal } from "lucide-react";
import { getMapboxToken, TOKEN_KEY } from "@/lib/mapbox";
import { tagsFor } from "@/lib/atlasFilters";
import { useTaxonomies } from "@/hooks/useTaxonomies";

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
        className="atlas-filter-btn inline-flex w-full justify-between md:w-auto md:justify-center items-center gap-2 font-mono uppercase whitespace-nowrap"
        style={{
          height: 42,
          padding: "0 16px",
          borderRadius: 10,
          fontSize: 11,
          letterSpacing: "0.18em",
          fontWeight: 500,
          background: active ? "hsl(var(--ink))" : "#fff",
          color: active ? "#fff" : "hsl(var(--ink))",
          boxShadow: active
            ? "0 1px 3px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.10)"
            : "0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        {label}
        {count > 0 && (
          <span className="inline-flex items-center justify-center" style={{ background: active ? "#fff" : "hsl(var(--ink))", color: active ? "hsl(var(--ink))" : "#fff", borderRadius: 6, fontSize: 10, minWidth: 18, height: 18, padding: "0 5px", fontWeight: 600 }}>
            {count}
          </span>
        )}
        <ChevronDown className="w-3 h-3 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div
            className="absolute left-0 top-full mt-2 z-50 fade-in bg-white overflow-y-auto no-scrollbar"
            style={{
              minWidth: 220,
              maxWidth: 320,
              maxHeight: "min(60vh, 480px)",
              borderRadius: 12,
              boxShadow: "0 4px 12px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.10)",
              padding: 6,
            }}
          >
            {options.map((o) => {
              const on = selected.includes(o);
              return (
                <button
                  key={o}
                  onClick={() => onToggle(o)}
                  className="w-full text-left font-mono uppercase transition-colors whitespace-nowrap"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    fontSize: 11,
                    letterSpacing: "0.16em",
                    fontWeight: 500,
                    background: on ? "hsl(var(--ink))" : "transparent",
                    color: on ? "#fff" : "hsl(var(--ink))",
                  }}
                >
                  {o}
                </button>
              );
            })}
          </div>
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
        className="flex items-center gap-2"
        style={{
          background: "#fff",
          borderRadius: 10,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06)",
          paddingLeft: 14,
          paddingRight: 8,
          height: 42,
        }}
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
          <button
            onClick={() => { setQ(""); setOpen(false); }}
            aria-label="Clear search"
            className="inline-flex items-center justify-center text-ink-soft hover:text-ink shrink-0"
            style={{ width: 26, height: 26, borderRadius: 8 }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && query && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 right-0 top-full mt-2 z-50 bg-white overflow-y-auto no-scrollbar fade-in"
            style={{ maxHeight: "60vh", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.10)" }}
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
  // Mobile filters: when null, the panel shows the list of categories. When
  // set, the panel shows the options for that category. Two-level nav.
  const [mobileFilterCategory, setMobileFilterCategory] = useState<FilterType | null>(null);
  const [selected, setSelected] = useState<Project | null>(null);
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  // Mobile search — single query lifted up so the pill never has to change
  // shape between "closed" and "typing" states. The dropdown of matches
  // renders below the pill.
  const [mobileQ, setMobileQ] = useState("");
  const [mobilePlaces, setMobilePlaces] = useState<{ name: string; lng: number; lat: number; bbox?: number[] }[]>([]);
  // A standalone marker the search drops on the picked city/place so the user
  // can visually locate where they searched, even when there are no projects.
  const placedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  // At world-view zoom levels, individual project pins from the same city stack
  // into illegible blobs (Barcelona's 3 projects sit on the same pixel). Hide
  // the pins entirely until the user zooms in to a city-readable scale.
  const [isCityCluster, setIsCityCluster] = useState(true);
  // ─── Mobile bottom sheet ──────────────────────────────────────────
  // Google-Maps style draggable sheet for the city projects list and the
  // selected project's detail view. Three snap points: collapsed (header
  // only), medium (~half screen), expanded (almost full screen).
  type SheetSnap = "collapsed" | "medium" | "expanded";
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("medium");
  const sheetDragRef = useRef({ active: false, startY: 0, startTranslate: 0, translate: 0 });
  const sheetEl = useRef<HTMLDivElement | null>(null);
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

  // When the URL carries ?project=<slug>, select just that project and fly
  // straight to it. We deliberately do NOT activate the city filter — the
  // user clicked "See on the map" expecting to see THIS project marked, not
  // the whole list of buildings in the city.
  useEffect(() => {
    if (!projectParam || projects.length === 0 || !mapReady) return;
    const p = projects.find((x) => x.slug === projectParam);
    if (!p) return;
    skipCameraRef.current = true;
    setActive(null);
    setSelected(p);
    if (p.latitude != null && p.longitude != null) {
      mapRef.current?.flyTo({ center: [p.longitude, p.latitude], zoom: 15, essential: true });
    }
    window.setTimeout(() => { skipCameraRef.current = false; }, 800);
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
        // On mobile, start framed on the Atlantic so the Americas + Europe sit
        // in view together — at zoom ~2.2 the country labels are readable and
        // there are no project pins yet (those appear once the user zooms past 5).
        center: isMobile ? [-35, 20] : [10, 25],
        zoom: isMobile ? 2.2 : 1.5,
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
  const tax = useTaxonomies();
  // Style options come from the managed Categories list, falling back to the
  // styles actually present in the loaded projects when the list is empty.
  const styleOptions = tax.styles.length
    ? tax.styles
    : Array.from(new Set(projects.map((p) => p.style).filter(Boolean) as string[])).sort();

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
    // On mobile, keep the initial framed view (Americas + Europe with country
    // labels visible) instead of auto-fitting to the project bounds — that
    // would zoom out to include Copenhagen and lose the "first screen" framing.
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (isMobile && !active) return;
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

    // ─── World-view: no pins (unfiltered) ────────────────────────────
    // At low zoom, individual project pins from the same city collapse to
    // the same pixel and pile up. The map stays clean until the user zooms
    // in enough to read individual locations. Exception: when a filter is
    // active, always show the matching pins so the filter is visible.
    if (isCityCluster && !active) {
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
  }, [filtered, selected, mapReady, isCityCluster, active]);

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
    setSheetSnap("medium");
  };
  const clearActive = () => {
    setActive(null);
    setSelected(null);
    clearSearchMarker();
  };
  const resetView = () => {
    setActive(null);
    setSelected(null);
    clearSearchMarker();
    mapRef.current?.flyTo({ center: [10, 25], zoom: 1.5, speed: 1.2, curve: 1.4, essential: true });
  };

  // Search: jump straight to a city (filter + fly + project list) or a project
  // (fly to it + open its card). After picking, the chosen name stays in the
  // search input so the user knows what they're looking at; tapping the × in
  // the pill resets everything back to neutral.
  const searchPickCity = (c: City) => {
    setSelected(null);
    setActive({ type: "city", value: c.name });
    setSearchOpen(false);
    setMobileQ(c.name);
    setMobilePlaces([]);
    setSheetSnap("medium");
    if (c.center_longitude != null && c.center_latitude != null) {
      placeSearchMarker(c.center_longitude, c.center_latitude);
    }
  };
  const searchPickProject = (p: Project) => {
    skipCameraRef.current = true;
    setActive(null);
    selectProject(p);
    setSearchOpen(false);
    setMobileQ(p.name);
    setMobilePlaces([]);
    setSheetSnap("medium");
    if (p.longitude != null && p.latitude != null) {
      placeSearchMarker(p.longitude, p.latitude);
    }
    window.setTimeout(() => { skipCameraRef.current = false; }, 600);
  };
  // A geocoded place (not a registered project/city) — just fly the map there,
  // like any map search. Fit the bbox when available, else zoom to the point.
  const searchPickPlace = (lng: number, lat: number, bbox?: number[], name?: string) => {
    skipCameraRef.current = true;
    setActive(null);
    setSelected(null);
    setSearchOpen(false);
    setMobileQ(name ?? "");
    setMobilePlaces([]);
    placeSearchMarker(lng, lat);
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
  // The pill's × button: reset everything to neutral — clear text, filter,
  // selected project and the dropped search marker.
  const clearMobileSearch = () => {
    setMobileQ("");
    setMobilePlaces([]);
    setSearchOpen(false);
    setActive(null);
    setSelected(null);
    clearSearchMarker();
  };

  const saveToken = () => {
    if (!tokenInput.trim()) return;
    localStorage.setItem(TOKEN_KEY, tokenInput.trim());
    setToken(tokenInput.trim());
  };

  // Geocoder for the mobile pill (lifted out of SearchBox so the pill itself
  // stays the same shape while the user types).
  useEffect(() => {
    const qq = mobileQ.trim();
    if (!qq || !token) { setMobilePlaces([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(qq)}.json` +
          `?access_token=${token}&limit=5&language=en`;
        const res = await fetch(url, { signal: ctrl.signal });
        const data = await res.json();
        setMobilePlaces(
          (data.features || []).map((f: any) => ({
            name: f.place_name as string,
            lng: f.center[0] as number,
            lat: f.center[1] as number,
            bbox: f.bbox as number[] | undefined,
          }))
        );
      } catch { /* aborted or network error — ignore */ }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [mobileQ, token]);

  // Drops (or moves) a standalone marker at a lng/lat. Used to highlight a
  // city or geocoded place the user just searched for.
  const placeSearchMarker = (lng: number, lat: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (placedMarkerRef.current) {
      placedMarkerRef.current.setLngLat([lng, lat]);
      return;
    }
    const el = document.createElement("div");
    el.style.cssText = [
      "width:18px",
      "height:26px",
      "position:relative",
      "pointer-events:none",
    ].join(";");
    // Editorial drop-pin: terracotta teardrop with a white dot inside.
    el.innerHTML = `
      <svg viewBox="0 0 18 26" width="18" height="26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M9 0C4.03 0 0 4.03 0 9c0 6.75 9 17 9 17s9-10.25 9-17c0-4.97-4.03-9-9-9z" fill="#bf3a18"/>
        <circle cx="9" cy="9" r="3" fill="#ffffff"/>
      </svg>`;
    placedMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([lng, lat])
      .addTo(map);
  };
  const clearSearchMarker = () => {
    placedMarkerRef.current?.remove();
    placedMarkerRef.current = null;
  };

  // ─── Bottom-sheet snap maths ──────────────────────────────────────
  // The sheet's outer height is 88vh and it sits flush to the bottom of
  // the viewport. translateY pushes it down: 0 = fully visible (expanded),
  // larger values hide more of the sheet. The three snap points are
  // expressed as pixel offsets so the touch handler can compare them
  // against the cumulative drag delta.
  const SHEET_OUTER_VH = 88;
  const SHEET_COLLAPSED_PX = 96;   // visible height when collapsed
  const SHEET_MEDIUM_VH = 45;      // visible height when medium
  const sheetTranslateFor = (snap: SheetSnap) => {
    if (typeof window === "undefined") return 0;
    const outer = (SHEET_OUTER_VH / 100) * window.innerHeight;
    if (snap === "expanded") return 0;
    if (snap === "medium") return outer - (SHEET_MEDIUM_VH / 100) * window.innerHeight;
    return outer - SHEET_COLLAPSED_PX;
  };
  const applySheetTransform = (translate: number) => {
    if (sheetEl.current) sheetEl.current.style.transform = `translateY(${translate}px)`;
  };
  const onSheetTouchStart = (e: React.TouchEvent) => {
    sheetDragRef.current.active = true;
    sheetDragRef.current.startY = e.touches[0].clientY;
    sheetDragRef.current.startTranslate = sheetTranslateFor(sheetSnap);
    sheetDragRef.current.translate = sheetDragRef.current.startTranslate;
    if (sheetEl.current) sheetEl.current.style.transition = "none";
  };
  const onSheetTouchMove = (e: React.TouchEvent) => {
    if (!sheetDragRef.current.active) return;
    const delta = e.touches[0].clientY - sheetDragRef.current.startY;
    const max = sheetTranslateFor("collapsed");
    const next = Math.max(0, Math.min(max, sheetDragRef.current.startTranslate + delta));
    sheetDragRef.current.translate = next;
    applySheetTransform(next);
  };
  const onSheetTouchEnd = () => {
    if (!sheetDragRef.current.active) return;
    sheetDragRef.current.active = false;
    if (sheetEl.current) sheetEl.current.style.transition = "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";
    // Snap to whichever target is closest to the final translate.
    const current = sheetDragRef.current.translate;
    const targets: { snap: SheetSnap; y: number }[] = [
      { snap: "expanded", y: sheetTranslateFor("expanded") },
      { snap: "medium", y: sheetTranslateFor("medium") },
      { snap: "collapsed", y: sheetTranslateFor("collapsed") },
    ];
    const closest = targets.reduce((best, t) => (Math.abs(t.y - current) < Math.abs(best.y - current) ? t : best));
    setSheetSnap(closest.snap);
    applySheetTransform(closest.y);
  };
  // Keep the transform in sync when snap is changed programmatically (e.g.
  // selecting a project or opening the sheet for the first time).
  useEffect(() => {
    if (sheetEl.current) {
      sheetEl.current.style.transition = "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";
      applySheetTransform(sheetTranslateFor(sheetSnap));
    }
  }, [sheetSnap, active?.value, selected?.id]);

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
          <div className="md:hidden px-4 py-2.5 pointer-events-auto">
            {/* Google-Maps style search pill (MOBILE ONLY) — single rounded
                input with a search icon on the left and the Filters icon on
                the right (where the mic sits in Google Maps). The pill keeps
                the same shape whether the user is typing or idle; the results
                drop down below as a separate overlay. */}
            {(() => {
              const q = mobileQ.trim().toLowerCase();
              const cityMatches = q ? cities.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 4) : [];
              const projMatches = q
                ? projects
                    .filter(
                      (p) =>
                        p.name.toLowerCase().includes(q) ||
                        (p.architect || "").toLowerCase().includes(q) ||
                        (p.city?.name || "").toLowerCase().includes(q)
                    )
                    .slice(0, 6)
                : [];
              const hasResults = cityMatches.length + projMatches.length + mobilePlaces.length > 0;
              const showDropdown = searchOpen && q.length > 0;
              // Single rule: as long as there's anything "active" — text in
              // the input, an applied filter, a selected project or the
              // search panel open — show a × that clears everything. Else
              // show the filters icon.
              const showClear = !!mobileQ || !!active || !!selected || searchOpen;
              return (
                <>
                  <div
                    className="flex items-center gap-2 w-full"
                    style={{
                      background: "#fff",
                      borderRadius: 9999,
                      boxShadow: "0 2px 12px rgba(0,0,0,0.14)",
                      paddingLeft: 14,
                      paddingRight: 6,
                      height: 48,
                    }}
                  >
                    <Search className="w-4 h-4 text-ink-soft shrink-0" />
                    <input
                      type="text"
                      value={mobileQ}
                      onChange={(e) => { setMobileQ(e.target.value); setSearchOpen(true); }}
                      onFocus={() => { setSearchOpen(true); setFiltersOpen(false); }}
                      placeholder="Buscar aquí"
                      className="flex-1 min-w-0 bg-transparent text-ink focus:outline-none placeholder:text-ink-soft"
                      style={{ fontSize: 14, height: 40 }}
                      aria-label="Search project, city or place"
                    />

                    {showClear ? (
                      <button
                        onClick={clearMobileSearch}
                        aria-label="Clear"
                        className="inline-flex items-center justify-center shrink-0"
                        style={{ width: 36, height: 36, borderRadius: 9999, color: "hsl(var(--ink))" }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => { setFiltersOpen((o) => !o); setSearchOpen(false); setMobileFilterCategory(null); }}
                        aria-label="Filters"
                        aria-expanded={filtersOpen}
                        className="inline-flex items-center justify-center shrink-0"
                        style={{
                          width: 36, height: 36, borderRadius: 9999,
                          background: filtersOpen ? "hsl(var(--ink))" : "transparent",
                          color: filtersOpen ? "#fff" : "hsl(var(--ink))",
                        }}
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Results dropdown below the pill */}
                  {showDropdown && (
                    <div
                      className="mt-2 w-full bg-paper overflow-y-auto no-scrollbar fade-in"
                      style={{ maxHeight: "60vh", border: "1px solid hsl(var(--paper-mid))", boxShadow: "0 10px 30px rgba(0,0,0,0.14)", borderRadius: 12 }}
                    >
                      {!hasResults && (
                        <p className="px-3 py-3 font-mono uppercase text-ink-soft" style={{ fontSize: 11, letterSpacing: "0.14em" }}>No matches</p>
                      )}
                      {cityMatches.map((c) => (
                        <button
                          key={"c" + c.id}
                          onClick={() => searchPickCity(c)}
                          className="w-full text-left px-3 py-2.5 active:bg-paper-mid transition-colors flex items-center justify-between gap-2"
                          style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}
                        >
                          <span className="font-display text-ink truncate" style={{ fontSize: 15 }}>{c.name}</span>
                          <span className="font-mono uppercase text-ink-soft shrink-0" style={{ fontSize: 10, letterSpacing: "0.16em" }}>City</span>
                        </button>
                      ))}
                      {projMatches.map((p) => (
                        <button
                          key={"p" + p.id}
                          onClick={() => searchPickProject(p)}
                          className="w-full text-left px-3 py-2.5 active:bg-paper-mid transition-colors flex items-center justify-between gap-2"
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
                      {mobilePlaces.map((pl, i) => (
                        <button
                          key={"pl" + i}
                          onClick={() => searchPickPlace(pl.lng, pl.lat, pl.bbox, pl.name)}
                          className="w-full text-left px-3 py-2.5 active:bg-paper-mid transition-colors flex items-center justify-between gap-3"
                          style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}
                        >
                          <span className="text-ink truncate" style={{ fontSize: 13, lineHeight: 1.3 }}>{pl.name}</span>
                          <span className="font-mono uppercase text-ink-soft shrink-0" style={{ fontSize: 10, letterSpacing: "0.16em" }}>Place</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

            {/* Filters panel — opens below the pill on tap. Two-level nav:
                first the user picks a category (Cities / Materials / …) and
                then the options for that category appear. */}
            {filtersOpen && (() => {
              const categories: { type: FilterType; label: string; options: string[] }[] = [
                { type: "material", label: "Materials", options: tax.materials },
                { type: "experience", label: "Experience", options: tax.experiences },
                { type: "style", label: "Style", options: styleOptions },
              ];
              const current = categories.find((c) => c.type === mobileFilterCategory) || null;
              return (
                <div
                  className="mt-2 w-full bg-white fade-in overflow-y-auto no-scrollbar"
                  style={{ maxHeight: "min(70vh, 560px)", borderRadius: 14, boxShadow: "0 16px 44px rgba(0,0,0,0.16)", padding: 8 }}
                >
                  {!current ? (
                    categories.filter((c) => c.options.length > 0).map((c) => (
                      <button
                        key={c.type}
                        onClick={() => setMobileFilterCategory(c.type)}
                        className="w-full flex items-center justify-between text-left transition-colors active:bg-paper-warm"
                        style={{
                          padding: "14px 14px",
                          borderRadius: 10,
                          fontSize: 14,
                          fontWeight: 500,
                          color: "hsl(var(--ink))",
                        }}
                      >
                        <span>{c.label}</span>
                        <span aria-hidden="true" className="text-ink-soft">→</span>
                      </button>
                    ))
                  ) : (
                    <>
                      <button
                        onClick={() => setMobileFilterCategory(null)}
                        className="inline-flex items-center gap-2 transition-colors"
                        style={{ padding: "8px 12px", fontSize: 12, color: "hsl(var(--ink-soft))" }}
                      >
                        <span aria-hidden="true">←</span> Back
                      </button>
                      <p className="font-mono uppercase text-ink-soft px-3 mt-1 mb-2" style={{ fontSize: 10, letterSpacing: "0.2em" }}>{current.label}</p>
                      <div className="flex flex-col">
                        {current.options.map((o) => {
                          const on = active?.type === current.type && active.value === o;
                          return (
                            <button
                              key={o}
                              onClick={() => { activate(current.type, o); setMobileFilterCategory(null); }}
                              className="w-full text-left transition-colors active:bg-paper-warm"
                              style={{
                                padding: "12px 14px",
                                borderRadius: 10,
                                fontSize: 14,
                                fontWeight: 500,
                                background: on ? "hsl(var(--ink))" : "transparent",
                                color: on ? "#fff" : "hsl(var(--ink))",
                              }}
                            >
                              {o}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* DESKTOP (md+) — editorial square search box + filter chips. */}
          <div className="hidden md:flex items-center gap-2 flex-wrap px-8 py-3 pointer-events-auto">
            <div className="w-[280px] shrink-0">
              <SearchBox projects={projects} cities={cities} token={token} onPickCity={searchPickCity} onPickProject={searchPickProject} onPickPlace={searchPickPlace} />
            </div>
            {active ? (
              <button
                onClick={clearActive}
                className="atlas-filter-btn inline-flex items-center gap-2 font-mono uppercase"
                style={{
                  height: 42,
                  padding: "0 16px",
                  borderRadius: 10,
                  background: "hsl(var(--ink))",
                  color: "#fff",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  fontWeight: 500,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.10)",
                }}
                aria-label="Clear filter"
              >
                <span className="opacity-70">{FILTER_LABELS[active.type]} ·</span>
                {active.value}
                <X className="w-3 h-3" />
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 flex-wrap">
                <FilterMenu label="Materials" options={tax.materials} selected={[]} onToggle={(v) => activate("material", v)} open={openMenu === "materials"} onToggleOpen={() => toggleMenu("materials")} onClose={closeMenu} stacked />
                <FilterMenu label="Experience" options={tax.experiences} selected={[]} onToggle={(v) => activate("experience", v)} open={openMenu === "experience"} onToggleOpen={() => toggleMenu("experience")} onClose={closeMenu} stacked />
                {styleOptions.length > 0 && (
                  <FilterMenu label="Style" options={styleOptions} selected={[]} onToggle={(v) => activate("style", v)} open={openMenu === "style"} onToggleOpen={() => toggleMenu("style")} onClose={closeMenu} stacked />
                )}
              </div>
            )}
          </div>
        </div>

          {/* Selected project — editorial card (DESKTOP only). On mobile the
              project detail is rendered inside the bottom sheet instead. */}
          {selected && (
            <div
              key={selected.id}
              className="absolute z-30 slide-in-right hidden
                md:flex md:flex-col md:left-auto md:right-6 md:bottom-auto md:top-[148px] md:w-[380px] md:max-h-[calc(100vh-180px)] md:overflow-y-auto no-scrollbar"
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

          {/* City project list (DESKTOP only) — left column. On mobile the
              same content lives inside the bottom sheet below. */}
          {active?.type === "city" && filtered.length > 0 && (
            <div
              className={`absolute z-30 bg-paper overflow-hidden flex-col fade-in hidden
                ${selected ? "md:hidden" : "md:flex"}
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

          {/* ─── Mobile bottom sheet — city projects list ───────────────
              Draggable Google-Maps style sheet with 3 snap points. Only
              renders the list view; the selected-project detail lives in
              its own centred overlay below so it stays fully visible. */}
          {active?.type === "city" && filtered.length > 0 && !selected && (
            <div
              ref={sheetEl}
              className="md:hidden absolute left-0 right-0 bottom-0 z-30 bg-paper flex flex-col"
              style={{
                height: `${SHEET_OUTER_VH}vh`,
                borderTopLeftRadius: 18,
                borderTopRightRadius: 18,
                boxShadow: "0 -8px 30px rgba(0,0,0,0.18)",
                transform: `translateY(${sheetTranslateFor(sheetSnap)}px)`,
              }}
            >
              <div
                onTouchStart={onSheetTouchStart}
                onTouchMove={onSheetTouchMove}
                onTouchEnd={onSheetTouchEnd}
                onTouchCancel={onSheetTouchEnd}
                className="shrink-0 cursor-grab select-none"
                style={{ paddingTop: 10, paddingBottom: 12, touchAction: "none" }}
              >
                <div
                  className="mx-auto"
                  style={{ width: 44, height: 4, borderRadius: 9999, background: "hsl(var(--paper-mid))" }}
                  aria-hidden="true"
                />
                <div className="flex items-start justify-between gap-3 px-5 pt-3">
                  <div className="min-w-0">
                    <p className="font-mono uppercase text-accent-terra font-semibold" style={{ fontSize: 10, letterSpacing: "0.2em" }}>Projects in</p>
                    <p className="font-display text-ink leading-tight mt-1 truncate" style={{ fontSize: 20 }}>{active?.value}</p>
                    <p className="font-mono text-ink-soft mt-1" style={{ fontSize: 11, letterSpacing: "0.04em" }}>
                      {filtered.length} {filtered.length === 1 ? "project" : "projects"}
                    </p>
                  </div>
                  <button onClick={clearMobileSearch} aria-label="Close list" className="p-1 -mr-1 text-ink-soft hover:text-ink transition-colors shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar" style={{ overscrollBehavior: "contain" }}>
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectProject(p)}
                    className="w-full text-left flex items-center gap-3.5 px-5 py-3 transition-colors active:bg-paper-warm"
                    style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}
                  >
                    <span className="overflow-hidden shrink-0 bg-paper-mid" style={{ width: 64, height: 64, borderRadius: 8 }}>
                      {(p.cover_image_url || p.hero_image_url) && (
                        <img
                          src={p.cover_image_url || p.hero_image_url || ""}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-ink truncate" style={{ fontSize: 16, fontWeight: 400, lineHeight: 1.25 }}>{p.name}</span>
                      {(p.architect || p.year_completed) && (
                        <span className="block font-mono text-ink-soft truncate mt-1" style={{ fontSize: 12 }}>
                          {[p.architect, p.year_completed].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-ink-soft" style={{ fontSize: 16 }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Mobile project card — centred overlay ──────────────────
              Compact card that sits over the map (not pinned to the
              bottom) so the whole project preview is visible at a glance:
              cover image, name, short description and a CTA to open the
              full project page. */}
          {selected && (
            <div
              className="md:hidden absolute z-40 fade-in"
              style={{ bottom: 16, right: 12, width: "58%", maxWidth: 240 }}
            >
              <div
                className="relative bg-paper overflow-hidden"
                style={{ borderRadius: 12, boxShadow: "0 14px 36px rgba(0,0,0,0.22)" }}
              >
                <button
                  onClick={() => { setSelected(null); clearSearchMarker(); }}
                  aria-label="Close project"
                  className="absolute z-10 inline-flex items-center justify-center"
                  style={{
                    top: 6, right: 6,
                    width: 26, height: 26, borderRadius: 9999,
                    background: "rgba(255,255,255,0.94)",
                    color: "hsl(var(--ink))",
                    boxShadow: "0 1px 5px rgba(0,0,0,0.18)",
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {(selected.cover_image_url || selected.hero_image_url) && (
                  <img
                    src={selected.cover_image_url || selected.hero_image_url || ""}
                    alt={selected.name}
                    className="block w-full object-cover"
                    style={{ height: 170 }}
                  />
                )}

                <div className="px-3 pt-2.5 pb-3">
                  {selected.city?.name && (
                    <p className="font-mono uppercase text-accent-terra font-semibold truncate" style={{ fontSize: 9, letterSpacing: "0.2em" }}>
                      {selected.city.name}
                    </p>
                  )}
                  <h3 className="font-display text-ink leading-tight mt-0.5" style={{ fontSize: 14, fontWeight: 400, letterSpacing: "-0.005em" }}>
                    {selected.name}
                  </h3>
                  {(selected.architect || selected.year_completed) && (
                    <p className="mt-0.5 font-mono text-ink-soft truncate" style={{ fontSize: 10 }}>
                      {[selected.architect, selected.year_completed].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {selected.tagline && (
                    <p className="mt-1.5 text-ink-soft leading-[1.4]" style={{ fontSize: 11, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {selected.tagline}
                    </p>
                  )}
                  <Link
                    to={`/projects/${selected.slug}`}
                    className="mt-2.5 inline-flex items-center justify-center w-full font-mono uppercase text-white"
                    style={{
                      background: "hsl(var(--ink))",
                      height: 28,
                      fontSize: 9,
                      letterSpacing: "0.18em",
                      fontWeight: 500,
                      borderRadius: 9999,
                    }}
                  >
                    View project
                    <span aria-hidden="true" className="ml-1.5">→</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

      </div>
    </div>
  );
}
