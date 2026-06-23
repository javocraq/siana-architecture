import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getMapboxToken } from "@/lib/mapbox";

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  /** Optional place query (e.g. "Madrid, Spain") used to auto-locate the
   *  map and drop a marker when no coordinates have been saved yet. The
   *  editor can still drag, click or search to refine. */
  defaultPlace?: string;
  /** Geocoding `types` filter for the auto-locate query. Defaults to
   *  `"place"` so a city editor resolves to the city centroid. For project
   *  editors pass e.g. `"poi,address,place"` so a building or street name
   *  resolves to the building itself, falling back to the city. */
  defaultPlaceTypes?: string;
  /** Zoom level the camera flies to after auto-locate. City editors should
   *  pass ~11 (city overview — the basemap still shows the city label).
   *  Project editors keep the default 15 (street level, you see the pin
   *  sitting on the building). */
  autoLocateZoom?: number;
  /** Optional initial / saved zoom level. The map will mount at this zoom
   *  and emit zoom changes through onZoomChange so the parent form keeps
   *  the value in sync (no separate slider needed). */
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
};

type Suggestion = { mapboxId: string; name: string; place_formatted?: string; distance?: number };

// Compact distance label: "320 m" under 1 km, otherwise "12 km" / "1 240 km".
const formatDistance = (meters?: number): string | null => {
  if (typeof meters !== "number" || !Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return km < 100 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString("es")} km`;
};

const newSessionToken = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// One-shot geocode for the auto-locate effect. Uses the lightweight Geocoding
// v5 endpoint (no session token). `types` is configurable so the city editor
// can stay restricted to `place` (city centroid) while the project editor can
// pass `poi,address,place` to resolve a building or address.
async function geocodePlace(
  query: string,
  token: string,
  types: string,
  signal?: AbortSignal,
): Promise<[number, number] | null> {
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
      `?access_token=${token}&types=${encodeURIComponent(types)}&limit=1&language=es`;
    const res = await fetch(url, { signal });
    const data = await res.json();
    const c = data?.features?.[0]?.center;
    return Array.isArray(c) && c.length === 2 ? [c[0] as number, c[1] as number] : null;
  } catch {
    return null;
  }
}

export default function MapPicker({ latitude, longitude, onChange, defaultPlace, defaultPlaceTypes = "place", autoLocateZoom = 15, zoom, onZoomChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  // Keep the latest onChange / onZoomChange reachable from listeners created
  // once (map click, marker dragend, map zoomend) without re-initialising the
  // map on every parent re-render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  // Per-mount session token for the Mapbox Search Box API. Tied billing-wise
  // to the suggest → retrieve pair, so suggestions don't count as separate
  // searches unless the editor actually picks one.
  const sessionTokenRef = useRef<string>(newSessionToken());
  // True once the pin has been placed by something we shouldn't override —
  // saved coordinates loaded from the DB, a manual click on the map, a drag
  // of the marker, or a pick from the search dropdown. Auto-locate only
  // touches the pin while this is false, so refining the form's name re-runs
  // the geocode and walks the pin toward the right place without ever
  // clobbering a manual edit.
  const manuallyPlacedRef = useRef(false);

  const [token] = useState<string>(() => getMapboxToken());
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);

  // Create or move the draggable pin, report the position, optionally fly to it.
  // `targetZoom` overrides the default "zoom in to street level" behaviour —
  // city editors pass a lower value so the camera lands at city-overview
  // scale (the basemap still shows the city label).
  const placeMarker = useCallback((lng: number, lat: number, opts?: { fly?: boolean; silent?: boolean; targetZoom?: number }) => {
    const map = mapRef.current;
    if (!map) return;
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ color: "#bf3a18", draggable: true })
        .setLngLat([lng, lat])
        .addTo(map);
      markerRef.current.on("dragend", () => {
        manuallyPlacedRef.current = true;
        const ll = markerRef.current!.getLngLat();
        onChangeRef.current(+ll.lat.toFixed(6), +ll.lng.toFixed(6));
      });
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }
    if (!opts?.silent) onChangeRef.current(+lat.toFixed(6), +lng.toFixed(6));
    if (opts?.fly) {
      // Default behaviour: zoom in to street level (15) but never zoom out
      // if the user is already closer. Caller can override with targetZoom.
      const target = opts.targetZoom ?? Math.max(map.getZoom(), 15);
      map.flyTo({ center: [lng, lat], zoom: target, essential: true });
    }
  }, []);

  // Init map once.
  useEffect(() => {
    if (!token || !ref.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const lng = longitude ?? 2.349;
    const lat = latitude ?? 48.864;
    const initialZoom = zoom ?? (latitude && longitude ? 14 : 11);
    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [lng, lat],
      zoom: initialZoom,
      // Don't hijack page scroll on hover — require ⌘/Ctrl + scroll (and two
      // fingers on touch) to zoom. Mapbox shows a small hint overlay.
      cooperativeGestures: true,
    });
    mapRef.current = map;

    // Existing coordinates → drop the pin without firing onChange. Coords
    // loaded from the DB count as a manual placement: don't let auto-locate
    // overwrite a project that was already pinned by hand.
    if (latitude && longitude) {
      manuallyPlacedRef.current = true;
      placeMarker(lng, lat, { silent: true });
    }

    map.on("click", (e) => {
      manuallyPlacedRef.current = true;
      placeMarker(e.lngLat.lng, e.lngLat.lat);
    });
    // Sync zoom to the parent form whenever the editor settles on a new
    // level (mouse wheel, +/- buttons, double-click). Rounded to an integer
    // because the DB column is `integer`.
    map.on("zoomend", () => {
      const z = Math.round(map.getZoom());
      onZoomChangeRef.current?.(z);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Sync the marker with externally-driven prop changes (e.g. the parent form
  // resets coords, or the city is re-loaded after a save). Skips no-op
  // updates when the marker is already at those coords so editor-driven
  // moves don't ping-pong with the parent state.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (latitude == null || longitude == null) return;
    const current = markerRef.current?.getLngLat();
    const same = current && Math.abs(current.lat - latitude) < 1e-6 && Math.abs(current.lng - longitude) < 1e-6;
    if (same) return;
    placeMarker(longitude, latitude, { silent: true });
    map.easeTo({ center: [longitude, latitude], duration: 500 });
  }, [latitude, longitude, placeMarker]);

  // Auto-locate: re-runs every time `defaultPlace` changes (e.g. the editor
  // is typing the project name or just picked a city). Geocodes the current
  // query and walks the pin to the result, so a half-typed name like
  // "Sagrada F" doesn't lock the pin in the wrong place — once the editor
  // finishes typing "Sagrada Familia, Barcelona" the pin flies to Barcelona.
  // Stops as soon as the pin has been placed manually (click, drag, search
  // pick, or loaded from saved DB coords), so manual edits are never lost.
  useEffect(() => {
    if (!token || !mapRef.current) return;
    if (manuallyPlacedRef.current) return;
    const place = defaultPlace?.trim();
    if (!place) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const coords = await geocodePlace(place, token, defaultPlaceTypes, ctrl.signal);
      // Re-check after the async hop — the editor may have clicked or
      // dragged in the meantime.
      if (!coords) return;
      if (manuallyPlacedRef.current) return;
      placeMarker(coords[0], coords[1], { fly: true, targetZoom: autoLocateZoom });
    }, 500);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [defaultPlace, defaultPlaceTypes, token, placeMarker, autoLocateZoom]);

  // Debounced autocomplete — Mapbox Search Box API. Searches POIs, addresses,
  // streets and places, biased toward the current map center so a query like
  // "naval museum" inside Madrid surfaces nearby museums before global matches.
  useEffect(() => {
    const qq = query.trim();
    if (!qq || !token) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const url = new URL("https://api.mapbox.com/search/searchbox/v1/suggest");
        url.searchParams.set("q", qq);
        url.searchParams.set("access_token", token);
        url.searchParams.set("session_token", sessionTokenRef.current);
        url.searchParams.set("limit", "8");
        url.searchParams.set("language", "es");
        // Proximity bias: prefer the dropped pin first, otherwise the map's
        // current center. Helpful for generic queries like "café" or "park".
        // BUT: when the query is specific enough (3+ words or contains a
        // comma — typical of "Building, City"), the user is naming a precise
        // place and the bias hurts more than it helps. Searching
        // "Champalimaud Centre new york" while the pin is in Lisbon should
        // not be pulled back to Lisbon results. Skip proximity in that case.
        const wordCount = qq.split(/\s+/).filter(Boolean).length;
        const isSpecific = wordCount >= 3 || qq.includes(",");
        if (!isSpecific) {
          const ll = markerRef.current?.getLngLat() ?? mapRef.current?.getCenter();
          if (ll) url.searchParams.set("proximity", `${ll.lng},${ll.lat}`);
        }

        const res = await fetch(url.toString(), { signal: ctrl.signal });
        const data = await res.json();
        const feats: Suggestion[] = (data.suggestions || []).map((f: any) => ({
          mapboxId: f.mapbox_id as string,
          name: (f.name as string) || (f.place_formatted as string) || "",
          place_formatted: f.place_formatted as string | undefined,
          distance: typeof f.distance === "number" ? f.distance : undefined,
        }));
        // Mapbox ranks by relevance (name + proximity), but sometimes a
        // distant exact name match outranks a closer near-match — e.g.
        // searching "Fuente de la Cibeles" from Madrid surfaces the
        // namesake fountain at La Granja (~80 km away) before Madrid's
        // own Cibeles. Re-sort by distance so the nearest match always
        // wins; ties keep Mapbox's order. Suggestions without distance
        // (no proximity hit) sink to the bottom.
        feats.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        setResults(feats);
      } catch {
        /* aborted or network error — ignore */
      }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, token]);

  const pick = async (r: Suggestion) => {
    if (!token) return;
    try {
      const url = new URL(`https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(r.mapboxId)}`);
      url.searchParams.set("access_token", token);
      url.searchParams.set("session_token", sessionTokenRef.current);
      const res = await fetch(url.toString());
      const data = await res.json();
      const coords = data?.features?.[0]?.geometry?.coordinates as [number, number] | undefined;
      if (!coords) return;
      const [lng, lat] = coords;
      manuallyPlacedRef.current = true;
      placeMarker(lng, lat, { fly: true });
      setQuery(r.name);
      setResults([]);
      setOpen(false);
      // Rotate the session token — billing closes when a retrieve fires.
      sessionTokenRef.current = newSessionToken();
    } catch {
      /* network error — ignore */
    }
  };

  if (!token) {
    return (
      <div className="border hairline bg-off-white p-6 text-center">
        <p className="text-[12px] text-ink-muted">
          Mapbox token not set. Open the homepage and enter your token to enable the map picker.
        </p>
      </div>
    );
  }

  return (
    <div className="border hairline">
      <div className="relative">
        <div ref={ref} className="w-full h-[360px]" />

        {/* Search — find a city, place or building and drop the pin there. */}
        <div className="absolute top-3 left-3 z-10" style={{ width: "min(330px, calc(100% - 24px))" }}>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (results[0]) pick(results[0]);
              }
            }}
            placeholder="Search city, place, building…"
            className="w-full px-3 py-2 text-[13px] bg-white border hairline shadow-sm focus:outline-none focus:border-ink/40 placeholder:text-ink-faint"
          />
          {open && query.trim() && results.length > 0 && (
            <ul className="mt-1 bg-white border hairline shadow-md max-h-[220px] overflow-y-auto">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(r)}
                    className="w-full text-left px-3 py-2 text-[12.5px] leading-snug hover:bg-off-white border-b hairline last:border-b-0"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-ink truncate">{r.name}</span>
                      {formatDistance(r.distance) && (
                        <span className="text-[10px] tracking-tag uppercase text-ink-faint shrink-0">
                          {formatDistance(r.distance)}
                        </span>
                      )}
                    </div>
                    {r.place_formatted && r.place_formatted !== r.name && (
                      <span className="block text-[11px] text-ink-faint mt-0.5">{r.place_formatted}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="px-3 py-2 text-[11px] text-ink-faint border-t hairline">
        Search, or click to place the pin · drag to fine-tune · ⌘/Ctrl + scroll to zoom
      </p>
    </div>
  );
}
