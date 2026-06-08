import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import SEO from "@/components/site/SEO";
import { Search, ChevronDown } from "lucide-react";
import { getMapboxToken, TOKEN_KEY } from "@/lib/mapbox";
import { MATERIALS, EXPERIENCES, STYLES, ERAS, eraMatches, tagsFor } from "@/lib/atlasFilters";

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

type Sel = { materials: string[]; experience: string[]; styles: string[]; eras: string[]; architects: string[] };
const EMPTY: Sel = { materials: [], experience: [], styles: [], eras: [], architects: [] };

/** A minimal popover filter — a labelled chip that opens a panel of toggle chips. */
function FilterMenu({
  label, options, selected, onToggle, open, onToggleOpen, onClose,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  open: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
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
          borderColor: active ? "hsl(var(--ink))" : "rgba(0,0,0,0.14)",
          color: active ? "hsl(var(--ink))" : "hsl(var(--ink-soft))",
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
          <div className="absolute left-0 top-full mt-2 z-50 bg-paper p-4 fade-in" style={{ minWidth: 248, maxWidth: 320, border: "1px solid hsl(var(--paper-mid))", boxShadow: "0 10px 34px rgba(0,0,0,0.10)" }}>
            <div className="flex flex-wrap gap-1.5 max-h-[280px] overflow-y-auto no-scrollbar">
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
  const stripRef = useRef<HTMLDivElement | null>(null);

  const [token, setToken] = useState<string>(() => getMapboxToken());
  const [tokenInput, setTokenInput] = useState("");
  const [mapReady, setMapReady] = useState(false);

  const [cities, setCities] = useState<City[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<Sel>(EMPTY);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [selected, setSelected] = useState<Project | null>(null);

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
          .select("id,slug,name,tagline,architect,year_completed,category,style,latitude,longitude,cover_image_url,hero_image_url,city_id,city:cities(name,slug)")
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
        center: [4, 38],
        zoom: 1.6,
        attributionControl: false,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => setMapReady(true));
      mapRef.current = map;
    } catch (e) {
      console.error("Mapbox init failed", e);
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [token]);

  const architectOptions = useMemo(
    () => Array.from(new Set(projects.map((p) => p.architect).filter(Boolean))).sort() as string[],
    [projects]
  );

  const filtered = useMemo(
    () =>
      projects.filter((p) => {
        if (cityFilter && p.city_id !== cityFilter) return false;
        const q = search.trim().toLowerCase();
        if (
          q &&
          !(
            p.name.toLowerCase().includes(q) ||
            (p.architect || "").toLowerCase().includes(q) ||
            (p.city?.name || "").toLowerCase().includes(q)
          )
        )
          return false;
        if (sel.styles.length && !(p.style && sel.styles.includes(p.style))) return false;
        if (sel.eras.length && !sel.eras.some((e) => eraMatches(p.year_completed, e))) return false;
        if (sel.architects.length && !(p.architect && sel.architects.includes(p.architect))) return false;
        const t = tagsFor(p.slug);
        if (sel.materials.length && !sel.materials.some((m) => t.materials.includes(m))) return false;
        if (sel.experience.length && !sel.experience.some((x) => t.experience.includes(x))) return false;
        return true;
      }),
    [projects, cityFilter, search, sel]
  );

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
    map.fitBounds(b, { padding: { top: 60, bottom: 200, left: 60, right: 60 }, maxZoom: 13, duration: 1100 });
  };

  // Frame the atlas on load; fly to a city when chosen
  useEffect(() => {
    if (!mapReady) return;
    if (cityFilter) {
      const c = cities.find((x) => x.id === cityFilter);
      if (c && c.center_latitude != null && c.center_longitude != null) {
        mapRef.current?.flyTo({ center: [c.center_longitude, c.center_latitude], zoom: c.default_zoom || 12, speed: 1.2, curve: 1.4, essential: true });
        return;
      }
    }
    fitTo(projects);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, cityFilter, projects.length]);

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

  // Scroll the strip to the selected card
  useEffect(() => {
    if (!selected || !stripRef.current) return;
    const card = stripRef.current.querySelector(`[data-pid="${selected.id}"]`);
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selected]);

  const selectProject = (p: Project) => {
    setSelected(p);
    if (p.latitude != null && p.longitude != null) {
      mapRef.current?.flyTo({ center: [p.longitude, p.latitude], zoom: 15, essential: true });
    }
  };

  const toggle = (key: keyof Sel, val: string) =>
    setSel((s) => ({ ...s, [key]: s[key].includes(val) ? s[key].filter((x) => x !== val) : [...s[key], val] }));

  const toggleMenu = (k: string) => setOpenMenu((m) => (m === k ? null : k));
  const closeMenu = () => setOpenMenu(null);

  const anyActive = cityFilter !== null || search.trim() !== "" || Object.values(sel).some((a) => a.length > 0);
  const clearAll = () => {
    setSel(EMPTY);
    setCityFilter(null);
    setSearch("");
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

      <div className="flex flex-col fade-in" style={{ marginTop: NAV_H, height: `calc(100vh - ${NAV_H}px)` }}>
        {/* ===== Filter bar (cities + filters above the map) ===== */}
        <div className="bg-paper-warm shrink-0" style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}>
          {/* Cities */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-5 md:px-8 py-3.5" style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}>
            <span className="font-mono uppercase text-ink-soft shrink-0 mr-1" style={{ fontSize: 11, letterSpacing: "0.18em" }}>Cities</span>
            <button
              onClick={() => { setCityFilter(null); setSelected(null); }}
              className="font-mono uppercase px-3 py-1.5 border transition-colors shrink-0"
              style={!cityFilter
                ? { fontSize: 12, letterSpacing: "0.12em", background: "hsl(var(--ink))", color: "#fff", borderColor: "hsl(var(--ink))" }
                : { fontSize: 12, letterSpacing: "0.12em", borderColor: "rgba(0,0,0,0.14)", color: "hsl(var(--ink-soft))" }}
            >
              All
            </button>
            {cities.map((c) => {
              const on = cityFilter === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => { setCityFilter(on ? null : c.id); setSelected(null); }}
                  className="font-mono uppercase px-3 py-1.5 border transition-colors shrink-0"
                  style={on
                    ? { fontSize: 12, letterSpacing: "0.12em", background: "hsl(var(--ink))", color: "#fff", borderColor: "hsl(var(--ink))" }
                    : { fontSize: 12, letterSpacing: "0.12em", borderColor: "rgba(0,0,0,0.14)", color: "hsl(var(--ink-soft))" }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          {/* Filters + search */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-5 md:px-8 py-3">
            <FilterMenu label="Materials" options={MATERIALS} selected={sel.materials} onToggle={(v) => toggle("materials", v)} open={openMenu === "materials"} onToggleOpen={() => toggleMenu("materials")} onClose={closeMenu} />
            <FilterMenu label="Experience" options={EXPERIENCES} selected={sel.experience} onToggle={(v) => toggle("experience", v)} open={openMenu === "experience"} onToggleOpen={() => toggleMenu("experience")} onClose={closeMenu} />
            <FilterMenu label="Style" options={STYLES} selected={sel.styles} onToggle={(v) => toggle("styles", v)} open={openMenu === "styles"} onToggleOpen={() => toggleMenu("styles")} onClose={closeMenu} />
            <FilterMenu label="Era" options={ERAS} selected={sel.eras} onToggle={(v) => toggle("eras", v)} open={openMenu === "eras"} onToggleOpen={() => toggleMenu("eras")} onClose={closeMenu} />
            <FilterMenu label="Architect" options={architectOptions} selected={sel.architects} onToggle={(v) => toggle("architects", v)} open={openMenu === "architects"} onToggleOpen={() => toggleMenu("architects")} onClose={closeMenu} />

            {anyActive && (
              <button onClick={clearAll} className="font-mono uppercase text-ink-soft hover:text-ink shrink-0 ml-1" style={{ fontSize: 11, letterSpacing: "0.16em" }}>
                Clear
              </button>
            )}

            <div className="flex-1" />

            <span className="hidden md:inline font-mono uppercase text-ink-soft shrink-0 mr-1" style={{ fontSize: 11, letterSpacing: "0.16em" }}>
              {filtered.length} {filtered.length === 1 ? "project" : "projects"}
            </span>
            <div className="relative shrink-0" style={{ width: 200 }}>
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-full pl-6 pr-2 py-1.5 bg-transparent text-[14px] focus:outline-none placeholder:text-ink-soft" style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }} />
            </div>
          </div>
        </div>

        {/* ===== Map ===== */}
        <div className="relative flex-1" style={{ background: "hsl(var(--paper-mid))" }}>
          <div ref={mapContainer} className="absolute inset-0" />

          {/* Project cards strip */}
          <div className="absolute left-0 right-0 bottom-0 z-20 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(247,243,237,0) 0%, rgba(247,243,237,0.0) 100%)" }}>
            <div ref={stripRef} className="flex gap-3 overflow-x-auto no-scrollbar px-4 md:px-6 py-4 pointer-events-auto">
              {filtered.map((p) => {
                const thumb = p.cover_image_url || p.hero_image_url;
                const on = selected?.id === p.id;
                return (
                  <div
                    key={p.id}
                    data-pid={p.id}
                    className="shrink-0 bg-paper flex items-stretch"
                    style={{ width: 280, border: on ? "1px solid hsl(var(--ink))" : "1px solid hsl(var(--paper-mid))", boxShadow: "0 4px 18px rgba(0,0,0,0.08)" }}
                  >
                    <button onClick={() => selectProject(p)} className="text-left flex items-stretch gap-3 flex-1 min-w-0 p-2.5 hover:bg-accent-light transition-colors">
                      <div className="shrink-0 overflow-hidden bg-paper-mid" style={{ width: 64, height: 64 }}>
                        {thumb && <img src={thumb} alt={p.name} className="photo-thumb w-full h-full object-cover" loading="lazy" />}
                      </div>
                      <div className="min-w-0 flex-1 self-center">
                        <p className="font-display text-ink leading-tight truncate" style={{ fontSize: 17, fontWeight: 500 }}>{p.name}</p>
                        <p className="mt-0.5 font-mono text-ink-soft truncate" style={{ fontSize: 12 }}>
                          {[p.architect, p.year_completed].filter(Boolean).join(" · ")}
                        </p>
                        <p className="mt-0.5 font-mono uppercase text-ink-soft truncate" style={{ fontSize: 10, letterSpacing: "0.14em" }}>
                          {p.city?.name}
                        </p>
                      </div>
                    </button>
                    <Link to={`/projects/${p.slug}`} aria-label={`View ${p.name}`} className="shrink-0 flex items-center justify-center px-3 text-ink-soft hover:text-ink hover:bg-accent-light transition-colors" style={{ borderLeft: "1px solid hsl(var(--paper-mid))" }}>
                      →
                    </Link>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="bg-paper px-5 py-4 font-mono uppercase text-ink-soft" style={{ fontSize: 12, letterSpacing: "0.14em", border: "1px solid hsl(var(--paper-mid))" }}>
                  No projects match these filters.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
