import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/site/SiteLayout";
import SEO from "@/components/site/SEO";
import RichHtml from "@/components/site/RichHtml";
import EditorialButton from "@/components/site/EditorialButton";
import Reveal from "@/components/site/Reveal";
import { Search, X } from "lucide-react";
import CitySectionsRenderer from "@/components/site/CitySectionsRenderer";
import { getMapboxToken } from "@/lib/mapbox";
import type { CitySection } from "@/lib/citySections";
import { isDescriptionEmpty } from "@/lib/cityDefaults";

interface City {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  tagline: string | null;
  description: string | null;
  hero_image_url: string | null;
  center_latitude: number | null;
  center_longitude: number | null;
  default_zoom: number | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  sections: CitySection[] | null;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  architect: string | null;
  year_completed: number | null;
  category: string | null;
  style: string | null;
  cover_image_url: string | null;
  hero_image_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Post {
  id: string; slug: string; title: string;
  excerpt: string | null; category: string | null;
  hero_image_url: string | null; published_at: string | null;
}

export default function CityDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const styleFilter = searchParams.get("style") || "";
  const setStyleFilter = (v: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v) next.set("style", v); else next.delete("style");
      return next;
    }, { replace: true });
  };
  const [city, setCity] = useState<City | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data: c } = await supabase
        .from("cities")
        .select("id, name, slug, country, tagline, description, hero_image_url, center_latitude, center_longitude, default_zoom, meta_title, meta_description, og_image_url, sections")
        .eq("slug", slug).eq("status", "published").maybeSingle();
      if (cancelled) return;
      if (!c) { setNotFound(true); setLoading(false); return; }
      // Render the hero + intro immediately on city data; projects/posts
      // load in parallel below and stream in without blocking the page.
      setCity(c as any);
      setLoading(false);

      const sections = (c as any).sections as CitySection[] | null;
      const usingDefaults = !sections || sections.length === 0;
      if (!usingDefaults) return;

      const [psRes, jsRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name, slug, architect, year_completed, category, style, cover_image_url, hero_image_url, latitude, longitude")
          .eq("city_id", c.id).eq("status", "published")
          .order("year_completed", { ascending: false }),
        supabase
          .from("posts")
          .select("id, slug, title, excerpt, category, hero_image_url, published_at, city_tags")
          .eq("status", "published")
          .contains("city_tags", [c.id])
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(3),
      ]);
      if (cancelled) return;
      if (psRes.data) setProjects(psRes.data as any);
      if (jsRes.data) setPosts(jsRes.data as any);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const projectStyles = useMemo(
    () => Array.from(new Set(projects.map((p) => p.style).filter(Boolean) as string[])).sort(),
    [projects]
  );
  const filteredProjects = useMemo(
    () => (styleFilter ? projects.filter((p) => p.style === styleFilter) : projects),
    [projects, styleFilter]
  );

  if (notFound) {
    return (
      <SiteLayout>
        <div className="pt-40 pb-32 mx-auto max-w-[1280px] px-6 text-center">
          <h1 className="font-display text-[48px] tracking-editorial text-ink">City not found</h1>
          <Link to="/cities" className="text-[13px] font-medium tracking-[0.16em] uppercase text-ink-soft hover:opacity-60 mt-6 inline-block">← All cities</Link>
        </div>
      </SiteLayout>
    );
  }

  if (loading || !city) {
    // min-h-screen pushes the newsletter/footer below the fold during the
    // brief loading window, so the user doesn't see the footer flash above
    // the not-yet-rendered hero. A skeleton hero gives the page a stable
    // silhouette while the city query resolves (~100–300ms).
    return (
      <SiteLayout>
        <div className="min-h-screen">
          <div className="relative h-[80vh] min-h-[560px] overflow-hidden bg-paper-mid animate-pulse" />
        </div>
      </SiteLayout>
    );
  }

  const hasCustomLayout = city.sections && city.sections.length > 0;

  return (
    <SiteLayout>
      <SEO
        title={city.meta_title || `${city.name} — Siana Architecture`}
        description={city.meta_description || city.tagline}
        image={city.og_image_url || city.hero_image_url}
      />

      {/* ============================================================
          1. HERO — large city image, country eyebrow, big serif title,
          architectural tagline, and a CTA into the Atlas. Mirrors the
          editorial cover used on Home (dark veil for legibility).
          ============================================================ */}
      <section className="relative h-[80vh] min-h-[560px] overflow-hidden">
        {city.hero_image_url && (
          <img src={city.hero_image_url} alt={city.name} className="absolute inset-0 w-full h-full object-cover" loading="eager" fetchPriority="high" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(17,17,16,0.20) 0%, rgba(17,17,16,0.28) 45%, rgba(17,17,16,0.60) 100%)",
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-end pb-16 md:pb-24">
          <div className="mx-auto max-w-[1400px] w-full px-6 lg:px-10 text-background text-center flex flex-col items-center">
            {city.country && (
              <p
                className="font-mono uppercase text-white font-semibold mb-5"
                style={{ fontSize: 13, letterSpacing: "0.22em", textShadow: "0 1px 8px rgba(0,0,0,0.25)" }}
              >
                {city.country}
              </p>
            )}
            <h1
              className="font-display-black text-white"
              style={{
                fontSize: "clamp(2.8rem, 6.5vw, 6.5rem)",
                lineHeight: 0.94,
                textShadow: "0 2px 18px rgba(0,0,0,0.25)",
              }}
            >
              {city.name}
            </h1>
            {city.tagline && (
              <p
                className="font-mono text-white/85 mt-8 max-w-xl"
                style={{ fontSize: 15, lineHeight: 1.7, letterSpacing: "0.01em", textShadow: "0 1px 8px rgba(0,0,0,0.25)" }}
              >
                {city.tagline}
              </p>
            )}
          </div>
        </div>
      </section>

      {!isDescriptionEmpty(city.description) && (
        <CityIntro city={city} projects={projects} projectStyles={projectStyles} />
      )}

      {hasCustomLayout ? (
        <CitySectionsRenderer sections={city.sections!} cityId={city.id} />
      ) : (
        <>

          {/* ============================================================
              2. CITY MAP PREVIEW — a small, filtered teaser of the Atlas
              showing this city's projects. The whole surface links into
              the full interactive map.
              ============================================================ */}
          <CityMapPreview city={city} projects={projects} />

          {/* ============================================================
              3. PROJECTS — asymmetric editorial grid (1 hero + 4 small),
              same visual language as Home's "Featured Buildings".
              CTA at the bottom: "See all projects".
              ============================================================ */}
          <CityProjects
            city={city}
            projects={filteredProjects}
            projectStyles={projectStyles}
            styleFilter={styleFilter}
            setStyleFilter={setStyleFilter}
          />

          {/* ============================================================
              4. ARTICLES — Journal entries tagged with this city.
              Asymmetric photo grid in the spirit of "Field notes" on Home.
              Falls back to two example posts so the section is never empty
              while the editorial team is still seeding content.
              ============================================================ */}
          <CityArticles city={city} posts={posts.length > 0 ? posts : exampleArticlesFor(city)} />
        </>
      )}
    </SiteLayout>
  );
}

/* ──────────────────────────────────────────────────────────────────
   City Map Preview
   ────────────────────────────────────────────────────────────────── */

// Renders the city-center marker as a classic teardrop pin in terracotta
// (matching the admin editor). The pin tip anchors exactly on the saved
// coordinate; the city name comes from the map's own cartographic labels
// (no superimposed text label).
function buildCenterMarkerEl(): HTMLElement {
  const wrap = document.createElement("div");
  // Sized to the pin only so Mapbox's "bottom" anchor places the tip on
  // the coord; the label is absolutely positioned out of flow below.
  wrap.style.cssText = "position:relative;width:28px;height:38px;pointer-events:none;";

  const pin = document.createElement("div");
  pin.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38" aria-hidden="true">' +
    '<path d="M14 0C6.27 0 0 6.27 0 14c0 9.95 12.5 22.5 13.04 23.04a1.36 1.36 0 0 0 1.93 0C15.5 36.5 28 23.95 28 14 28 6.27 21.73 0 14 0Z" fill="#bf3a18"/>' +
    '<circle cx="14" cy="14" r="5" fill="#fff"/>' +
    "</svg>";
  pin.style.cssText = "filter:drop-shadow(0 2px 4px rgba(0,0,0,0.18));";

  wrap.appendChild(pin);
  return wrap;
}

function CityMapPreview({ city, projects }: { city: City; projects: Project[] }) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const centerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [token] = useState<string>(() => getMapboxToken());

  // Whether the admin set an explicit center for this city.
  const hasCenter = city.center_longitude != null && city.center_latitude != null;

  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    try {
      const center: [number, number] = hasCenter
        ? [city.center_longitude!, city.center_latitude!]
        : [10, 25];
      // The public city preview is a "where in the world is this city" view,
      // not a street-level placement. Cap the admin's saved zoom at a level
      // that reliably shows the city label on the basemap — admins often pin
      // a precise spot at z=15+ to fine-tune the marker, but that detail view
      // hides the city name on the public page.
      const PUBLIC_PREVIEW_MAX_ZOOM = 11;
      const zoom = Math.min(city.default_zoom ?? 11, PUBLIC_PREVIEW_MAX_ZOOM);
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center,
        zoom,
        attributionControl: false,
        scrollZoom: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      map.touchZoomRotate.disableRotation();
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false, showZoom: true }), "top-right");
      mapRef.current = map;

      // Visible city-center marker (hollow ring + name label) so the admin's
      // pin choice is confirmed visually, distinct from the red project dots.
      if (hasCenter) {
        centerMarkerRef.current = new mapboxgl.Marker({ element: buildCenterMarkerEl(), anchor: "bottom" })
          .setLngLat(center)
          .addTo(map);
      }

      map.on("load", () => {
        const pts = projects.filter((p) => p.latitude != null && p.longitude != null);
        pts.forEach((p) => {
          const el = document.createElement("span");
          el.style.cssText =
            "display:block;width:10px;height:10px;border-radius:9999px;background:#bf3a18;border:2px solid #fff;box-shadow:0 0 0 2px #bf3a18;pointer-events:none;";
          new mapboxgl.Marker({ element: el, anchor: "center" })
            .setLngLat([p.longitude!, p.latitude!])
            .addTo(map);
        });
        // If the admin didn't set a city center but there are projects,
        // fit to the project bounds as a fallback. Admin's explicit
        // center+zoom always wins when provided.
        if (!hasCenter && pts.length >= 2) {
          const b = new mapboxgl.LngLatBounds();
          pts.forEach((p) => b.extend([p.longitude!, p.latitude!]));
          map.fitBounds(b, { padding: 80, duration: 0 });
        }
      });
    } catch (e) {
      console.error("City map preview init failed", e);
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      centerMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, city.id, projects.length]);

  // React to admin edits — when the saved coords or zoom change, animate
  // the map to the new view and move the center marker. No re-init, so
  // project pins and tiles stay loaded.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (city.center_longitude == null || city.center_latitude == null) return;
    const target: [number, number] = [city.center_longitude, city.center_latitude];
    map.easeTo({
      center: target,
      zoom: Math.min(city.default_zoom ?? map.getZoom(), 11),
      duration: 600,
    });
    if (centerMarkerRef.current) {
      centerMarkerRef.current.setLngLat(target);
    } else {
      centerMarkerRef.current = new mapboxgl.Marker({ element: buildCenterMarkerEl(), anchor: "bottom" })
        .setLngLat(target)
        .addTo(map);
    }
  }, [city.center_latitude, city.center_longitude, city.default_zoom]);

  return (
    <section
      className="bg-paper-warm"
      style={{ padding: "6rem 0", borderTop: "1px solid hsl(var(--paper-mid))" }}
    >
      <Reveal className="mx-auto max-w-[1400px] px-6 lg:px-10" style={{ paddingBottom: "3rem" }}>
        <div className="max-w-xl">
          <p
            className="font-mono uppercase text-accent-terra font-semibold mb-4"
            style={{ fontSize: 13, letterSpacing: "0.22em" }}
          >
            The Map · {city.name}
          </p>
          <h2
            className="font-display-black text-ink"
            style={{ fontSize: "clamp(1.7rem, 3.2vw, 3rem)", lineHeight: 1.05 }}
          >
            Every project, <em className="italic text-accent-terra">on the map</em>
          </h2>
        </div>
      </Reveal>

      <Reveal delay={120} className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div
          className="relative block w-full"
          style={{ height: "clamp(420px, 56vh, 560px)", background: "hsl(var(--paper-mid))" }}
        >
          {token ? (
            <div ref={mapContainer} className="absolute inset-0" />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center text-ink-soft font-mono uppercase"
              style={{ fontSize: 13, letterSpacing: "0.16em" }}
            >
              Map preview
            </div>
          )}

          {/* CTA — sits over the map, centered along the bottom edge.
              Pointer events are scoped so the button is clickable but the
              rest of the map remains draggable. */}
          <div className="absolute left-0 right-0 bottom-6 flex justify-center px-4 pointer-events-none">
            <span className="pointer-events-auto inline-flex max-w-full">
              <EditorialButton
                to={`/atlas?city=${city.slug}`}
                arrow
                className="text-center justify-center flex-wrap max-w-full"
                style={{
                  background: "hsl(var(--paper-warm) / 0.95)",
                  padding: "9px 16px 7px",
                  boxShadow: "0 2px 14px rgba(0,0,0,0.10)",
                  fontSize: 11,
                  letterSpacing: "0.16em",
                }}
              >
                Explore {city.name} on the Map
              </EditorialButton>
            </span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Projects — asymmetric grid in the spirit of FeaturedBuildings
   ────────────────────────────────────────────────────────────────── */
function CityProjects({
  city, projects, projectStyles, styleFilter, setStyleFilter,
}: {
  city: City;
  projects: Project[];
  projectStyles: string[];
  styleFilter: string;
  setStyleFilter: (v: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q
    ? projects.filter((p) => p.name.toLowerCase().includes(q) || (p.architect || "").toLowerCase().includes(q))
    : projects;
  const searching = q.length > 0;

  if (projects.length === 0) {
    return (
      <section className="bg-paper py-24 md:py-32" style={{ borderTop: "1px solid hsl(var(--paper-mid))" }}>
        <Reveal className="mx-auto max-w-[1400px] px-6 lg:px-10 text-center">
          <p
            className="font-mono uppercase text-accent-terra mb-5 font-semibold"
            style={{ fontSize: 13, letterSpacing: "0.22em" }}
          >
            Projects
          </p>
          <h2
            className="font-display-black text-ink"
            style={{ fontSize: "clamp(1.7rem, 3.2vw, 3rem)", lineHeight: 1.05 }}
          >
            Coming <em className="italic text-accent-terra">soon</em>
          </h2>
          <p
            className="font-mono text-ink-soft mt-7 mx-auto"
            style={{ fontSize: 14, lineHeight: 1.7, letterSpacing: "0.01em", maxWidth: 440 }}
          >
            We're still gathering the projects we love in {city.name}. Check back soon.
          </p>
        </Reveal>
      </section>
    );
  }

  const hero = projects[0];
  const rest = projects.slice(1, 5);

  return (
    <section className="bg-paper" style={{ padding: "6rem 0", borderTop: "1px solid hsl(var(--paper-mid))" }}>
      <Reveal className="mx-auto max-w-[1400px] px-6 lg:px-10" style={{ paddingBottom: "3rem" }}>
        <div className="flex items-end justify-between gap-8 flex-wrap">
          <div className="max-w-xl">
            <p
              className="font-mono uppercase text-accent-terra font-semibold mb-4"
              style={{ fontSize: 13, letterSpacing: "0.22em" }}
            >
              Projects
            </p>
            <h2
              className="font-display-black text-ink"
              style={{ fontSize: "clamp(1.7rem, 3.2vw, 3rem)", lineHeight: 1.05 }}
            >
              {projects.length} {projects.length === 1 ? "project" : "projects"} in{" "}
              <em className="italic text-accent-terra">{city.name}</em>
            </h2>
          </div>

          <div className="flex items-center gap-5 flex-wrap">
            <div className="flex items-center gap-2 border-b border-black/15 pb-2 focus-within:border-black/40 transition-colors">
              <Search className="w-3.5 h-3.5 text-ink-soft shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects"
                aria-label="Search projects by name"
                className="bg-transparent font-mono text-ink placeholder:text-ink-soft focus:outline-none"
                style={{ fontSize: 12, letterSpacing: "0.04em", width: 150 }}
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-ink-soft hover:text-ink shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {projectStyles.length > 0 && (
              <>
                <select
                  value={styleFilter}
                  onChange={(e) => setStyleFilter(e.target.value)}
                  aria-label="Filter projects by style"
                  className="bg-transparent border-b border-black/15 pb-2 font-mono uppercase text-ink-soft hover:text-ink focus:outline-none focus:text-ink focus:border-black/40 cursor-pointer transition-colors"
                  style={{ fontSize: 11, letterSpacing: "0.22em", fontWeight: 500 }}
                >
                  <option value="">Style</option>
                  {projectStyles.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {styleFilter && (
                  <button
                    type="button"
                    onClick={() => setStyleFilter("")}
                    className="pb-2 font-mono uppercase text-ink-soft hover:text-ink transition-colors"
                    style={{ fontSize: 11, letterSpacing: "0.22em", fontWeight: 500 }}
                  >
                    Clear
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </Reveal>

      {/* When searching, show a uniform grid of every match (so any project
          surfaces, not just the 5 in the hero layout); otherwise the
          asymmetric editorial grid that mirrors Home's "Featured Buildings". */}
      {searching ? (
        matches.length ? (
          <div
            className="mx-auto max-w-[1400px] px-6 lg:px-10 grid gap-2"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
          >
            {matches.map((p, i) => (
              <Reveal key={p.id} delay={Math.min(i, 6) * 70}>
                <Link
                  to={`/projects/${p.slug}`}
                  className="group relative overflow-hidden bg-paper-mid block lift"
                  style={{ borderRadius: 0, aspectRatio: "4 / 5" }}
                >
                  <img
                    src={p.cover_image_url || p.hero_image_url || ""}
                    alt={p.name}
                    className="photo-thumb absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div
                    className="absolute bottom-0 left-0 right-0"
                    style={{ padding: "2.2rem 1.2rem 1rem", background: "linear-gradient(transparent, rgba(17,17,16,0.9))" }}
                  >
                    {(p.architect || p.year_completed) && (
                      <p className="font-mono uppercase mb-1.5 font-medium" style={{ fontSize: 12, letterSpacing: "0.16em", color: "#ffffff" }}>
                        {[p.architect, p.year_completed].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <h3 className="font-display text-white" style={{ fontSize: "1.3rem", letterSpacing: "-0.01em" }}>
                      {p.name}
                    </h3>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal className="mx-auto max-w-[1400px] px-6 lg:px-10 text-center">
            <p className="font-mono text-ink-soft" style={{ fontSize: 14, letterSpacing: "0.04em" }}>
              No projects match “{query}”.
            </p>
          </Reveal>
        )
      ) : (
      <div
        className="mx-auto max-w-[1400px] px-6 lg:px-10 grid grid-cols-1 gap-2 md:grid-cols-[1.4fr_1fr_1fr]"
        style={{ gridAutoRows: "minmax(240px, auto)" }}
      >
        <Reveal className="md:row-span-2">
          <Link
            to={`/projects/${hero.slug}`}
            className="group relative overflow-hidden bg-paper-mid block h-full lift"
            style={{ borderRadius: 0, minHeight: 500 }}
          >
            <img
              src={hero.cover_image_url || hero.hero_image_url || ""}
              alt={hero.name}
              className="photo-thumb w-full h-full object-cover"
              loading="lazy"
            />
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{
                padding: "3rem 1.8rem 1.5rem",
                background: "linear-gradient(transparent, rgba(17,17,16,0.9))",
              }}
            >
              {(hero.architect || hero.year_completed) && (
                <p
                  className="font-mono uppercase mb-2 font-semibold"
                  style={{ fontSize: 13, letterSpacing: "0.18em", color: "#ffffff" }}
                >
                  {[hero.architect, hero.year_completed].filter(Boolean).join(" · ")}
                </p>
              )}
              <h3 className="font-display text-white" style={{ fontSize: "2rem", letterSpacing: "-0.01em" }}>
                {hero.name}
              </h3>
            </div>
          </Link>
        </Reveal>

        {rest.map((p, i) => (
          <Reveal key={p.id} delay={120 + i * 110}>
            <Link
              to={`/projects/${p.slug}`}
              className="group relative overflow-hidden bg-paper-mid block h-full lift"
              style={{ borderRadius: 0, minHeight: 240 }}
            >
              <img
                src={p.cover_image_url || p.hero_image_url || ""}
                alt={p.name}
                className="photo-thumb w-full h-full object-cover"
                loading="lazy"
              />
              <div
                className="absolute bottom-0 left-0 right-0"
                style={{
                  padding: "2.2rem 1.2rem 1rem",
                  background: "linear-gradient(transparent, rgba(17,17,16,0.9))",
                }}
              >
                {(p.architect || p.year_completed) && (
                  <p
                    className="font-mono uppercase mb-1.5 font-medium"
                    style={{ fontSize: 12, letterSpacing: "0.16em", color: "#ffffff" }}
                  >
                    {[p.architect, p.year_completed].filter(Boolean).join(" · ")}
                  </p>
                )}
                <h3 className="font-display text-white" style={{ fontSize: "1.3rem", letterSpacing: "-0.01em" }}>
                  {p.name}
                </h3>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
      )}

      <Reveal className="mx-auto max-w-[1400px] flex justify-center" style={{ padding: "4rem 2.5rem 0" }}>
        <EditorialButton to={`/atlas?city=${city.slug}`} arrow variant="muted">
          See all projects
        </EditorialButton>
      </Reveal>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Articles — asymmetric Field-notes-style grid scoped to the city
   ────────────────────────────────────────────────────────────────── */
function CityArticles({ city, posts }: { city: City; posts: Post[] }) {
  const featured = posts[0];
  const rest = posts.slice(1, 5);

  return (
    <section className="bg-paper-warm" style={{ padding: "6rem 0", borderTop: "1px solid hsl(var(--paper-mid))" }}>
      <Reveal className="mx-auto max-w-[1400px] px-6 lg:px-10" style={{ paddingBottom: "3rem" }}>
        <div className="flex items-end justify-between gap-8 flex-wrap">
          <div className="max-w-xl">
            <p
              className="font-mono uppercase text-accent-terra font-semibold mb-4"
              style={{ fontSize: 13, letterSpacing: "0.22em" }}
            >
              Field Notes
            </p>
            <h2
              className="font-display-black text-ink"
              style={{ fontSize: "clamp(1.7rem, 3.2vw, 3rem)", lineHeight: 1.05 }}
            >
              Stories from <em className="italic text-accent-terra">{city.name}</em>
            </h2>
          </div>
          <EditorialButton to={`/practice?city=${city.slug}`} arrow variant="muted">
            All {city.name} articles
          </EditorialButton>
        </div>
      </Reveal>

      <div
        className={`mx-auto max-w-[1400px] px-6 lg:px-10 grid grid-cols-1 gap-1 ${rest.length ? "md:grid-cols-[2fr_1fr_1fr]" : ""}`}
        style={{ gridAutoRows: "minmax(220px, auto)" }}
      >
        <Reveal className={rest.length ? "md:row-span-2" : ""}>
          <Link
            to={`/practice/${featured.slug}`}
            className="group relative overflow-hidden bg-paper-mid block h-full lift"
            style={{ borderRadius: 0, minHeight: 460 }}
          >
            <img
              src={featured.hero_image_url || ""}
              alt={featured.title}
              className="photo-thumb w-full h-full object-cover"
              style={{ minHeight: 460 }}
              loading="lazy"
            />
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{
                padding: "2.5rem 1.4rem 1.2rem",
                background: "linear-gradient(transparent, rgba(17,17,16,0.88))",
              }}
            >
              {featured.category && (
                <p
                  className="font-mono uppercase mb-1"
                  style={{ fontSize: 12, letterSpacing: "0.18em", fontWeight: 500, color: "#ffe4dc" }}
                >
                  {featured.category}
                </p>
              )}
              <h3 className="font-display text-white" style={{ fontSize: "1.4rem", letterSpacing: "-0.01em" }}>
                {featured.title}
              </h3>
            </div>
          </Link>
        </Reveal>

        {rest.map((p, i) => (
          <Reveal key={p.id} delay={120 + i * 110}>
            <Link
              to={`/practice/${p.slug}`}
              className="group relative overflow-hidden bg-paper-mid block h-full lift"
              style={{ borderRadius: 0, minHeight: 220 }}
            >
              <img
                src={p.hero_image_url || ""}
                alt={p.title}
                className="photo-thumb w-full h-full object-cover"
                style={{ minHeight: 220 }}
                loading="lazy"
              />
              <div
                className="absolute bottom-0 left-0 right-0"
                style={{
                  padding: "2rem 1.2rem 1rem",
                  background: "linear-gradient(transparent, rgba(17,17,16,0.88))",
                }}
              >
                {p.category && (
                  <p
                    className="font-mono uppercase mb-1"
                    style={{ fontSize: 12, letterSpacing: "0.18em", fontWeight: 500, color: "#ffe4dc" }}
                  >
                    {p.category}
                  </p>
                )}
                <h3 className="font-display text-white" style={{ fontSize: "1rem", letterSpacing: "-0.01em" }}>
                  {p.title}
                </h3>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Example articles
   ──────────────────────────────────────────────────────────────────
   Two placeholder posts shown when the city has no published posts
   yet. Slugs match the seed migration (20260610150000_seed_barcelona
   _articles.sql) so once the migration runs, the same URLs resolve
   to real, editable content. */
function exampleArticlesFor(city: City): Post[] {
  return [
    {
      id: `example-best-buildings-${city.id}`,
      slug: `best-buildings-${city.slug}`,
      title: `The Best Buildings in ${city.name}`,
      excerpt: `A walking guide to the buildings that define ${city.name}'s architectural identity — from icons to overlooked gems.`,
      category: "City Guide",
      hero_image_url:
        "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1600&q=80",
      published_at: new Date(Date.now() - 6 * 86400 * 1000).toISOString(),
    },
    {
      id: `example-style-guide-${city.id}`,
      slug: `style-guide-${city.slug}`,
      title: `A Field Guide to ${city.name}'s Style`,
      excerpt: `Materials, motifs and structural moves — a short field guide to recognising ${city.name}'s architectural language on a single walk.`,
      category: "Style Guide",
      hero_image_url:
        "https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1600&q=80",
      published_at: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
    },
  ];
}

/* ──────────────────────────────────────────────────────────────────
   City Intro
   ──────────────────────────────────────────────────────────────────
   A longer-form architectural / historical narrative for the city.
   Uses the DB `description` when present; otherwise falls back to a
   short essay so even newly added cities feel finished. */
function CityIntro({ city }: { city: City; projects: Project[]; projectStyles: string[] }) {
  const html = city.description!;
  // No Reveal wrapper here: the description can be an arbitrarily long
  // editorial essay, and the IntersectionObserver's 12% threshold misfires
  // on very tall sections (the user lands inside the section without ever
  // crossing the trigger). Long-form text must be visible immediately.
  return (
    <section className="bg-paper py-24 md:py-32" style={{ borderTop: "1px solid hsl(var(--paper-mid))" }}>
      <div className="mx-auto max-w-[960px] px-6 lg:px-10">
        <RichHtml
          html={html}
          className="[&_p]:font-serif [&_p]:text-ink [&_p+p]:mt-5 [&_p]:leading-[1.7] [&_p]:text-[clamp(17px,1.25vw,20px)] [&_p]:text-justify [&_p]:hyphens-auto [&_h2]:font-display [&_h2]:text-ink [&_h2]:text-[clamp(22px,2vw,29px)] [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-ink [&_h3]:text-[clamp(19px,1.6vw,24px)] [&_h3]:mt-8 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:text-ink [&_li]:font-serif [&_li]:text-[clamp(16px,1.15vw,19px)] [&_li]:leading-[1.7] [&_blockquote]:border-l-2 [&_blockquote]:border-ink/30 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-ink-soft [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2"
        />
      </div>
    </section>
  );
}
