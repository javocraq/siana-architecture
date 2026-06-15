import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getMapboxToken } from "@/lib/mapbox";

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
};

type Suggestion = { name: string; lng: number; lat: number };

export default function MapPicker({ latitude, longitude, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  // Keep the latest onChange reachable from listeners created once (map click,
  // marker dragend) without re-initialising the map.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [token] = useState<string>(() => getMapboxToken());
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);

  // Create or move the draggable pin, report the position, optionally fly to it.
  const placeMarker = useCallback((lng: number, lat: number, opts?: { fly?: boolean; silent?: boolean }) => {
    const map = mapRef.current;
    if (!map) return;
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ color: "#bf3a18", draggable: true })
        .setLngLat([lng, lat])
        .addTo(map);
      markerRef.current.on("dragend", () => {
        const ll = markerRef.current!.getLngLat();
        onChangeRef.current(+ll.lat.toFixed(6), +ll.lng.toFixed(6));
      });
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }
    if (!opts?.silent) onChangeRef.current(+lat.toFixed(6), +lng.toFixed(6));
    if (opts?.fly) map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15), essential: true });
  }, []);

  // Init map once.
  useEffect(() => {
    if (!token || !ref.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const lng = longitude ?? 2.349;
    const lat = latitude ?? 48.864;
    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [lng, lat],
      zoom: latitude && longitude ? 14 : 11,
      // Don't hijack page scroll on hover — require ⌘/Ctrl + scroll (and two
      // fingers on touch) to zoom. Mapbox shows a small hint overlay.
      cooperativeGestures: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    // Existing coordinates → drop the pin without firing onChange.
    if (latitude && longitude) placeMarker(lng, lat, { silent: true });

    map.on("click", (e) => placeMarker(e.lngLat.lng, e.lngLat.lat));

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Debounced forward geocoding — search by city, place, building, address…
  useEffect(() => {
    const qq = query.trim();
    if (!qq || !token) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(qq)}.json` +
          `?access_token=${token}&limit=6&language=en`;
        const res = await fetch(url, { signal: ctrl.signal });
        const data = await res.json();
        const feats: Suggestion[] = (data.features || []).map((f: any) => ({
          name: f.place_name as string,
          lng: f.center[0] as number,
          lat: f.center[1] as number,
        }));
        setResults(feats);
      } catch {
        /* aborted or network error — ignore */
      }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, token]);

  const pick = (r: Suggestion) => {
    placeMarker(r.lng, r.lat, { fly: true });
    setQuery(r.name);
    setResults([]);
    setOpen(false);
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
                    className="w-full text-left px-3 py-2 text-[12.5px] leading-snug text-ink hover:bg-off-white border-b hairline last:border-b-0"
                  >
                    {r.name}
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
