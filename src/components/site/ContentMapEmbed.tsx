import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { getMapboxToken } from "@/lib/mapbox";
import type { MapEmbedTarget } from "@/lib/mapEmbed";

type Pin = { name: string; slug: string; lng: number; lat: number };

type Resolved = {
  title: string;
  center: [number, number];
  zoom: number;
  pins: Pin[];
  atlasHref: string;
};

/** Terracotta dot used for every pinned building — same language as the
 *  city page and the Atlas, so a map inside an article reads as the same map. */
function pinEl(): HTMLElement {
  const el = document.createElement("span");
  el.style.cssText =
    "display:block;width:10px;height:10px;border-radius:9999px;background:#bf3a18;" +
    "border:2px solid #fff;box-shadow:0 0 0 2px #bf3a18;pointer-events:none;";
  return el;
}

async function resolveCity(slug: string): Promise<Resolved | null> {
  const { data: city } = await supabase
    .from("cities")
    .select("id, name, slug, center_latitude, center_longitude, default_zoom")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!city) return null;

  const { data: projects } = await supabase
    .from("projects")
    .select("name, slug, latitude, longitude")
    .eq("city_id", city.id)
    .eq("status", "published");

  const pins: Pin[] = (projects || [])
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({ name: p.name, slug: p.slug, lng: p.longitude!, lat: p.latitude! }));

  // Prefer the centre the editor pinned for the city; otherwise sit on the
  // projects themselves so the block is never a view of the empty ocean.
  const center: [number, number] =
    city.center_longitude != null && city.center_latitude != null
      ? [city.center_longitude, city.center_latitude]
      : pins.length
        ? [pins[0].lng, pins[0].lat]
        : [10, 25];

  return {
    title: city.name,
    center,
    zoom: Math.min(city.default_zoom ?? 11, 11),
    pins,
    atlasHref: `/atlas?city=${city.slug}`,
  };
}

async function resolveProject(slug: string): Promise<Resolved | null> {
  const { data: project } = await supabase
    .from("projects")
    .select("name, slug, latitude, longitude")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!project || project.latitude == null || project.longitude == null) return null;

  const pin: Pin = {
    name: project.name,
    slug: project.slug,
    lng: project.longitude,
    lat: project.latitude,
  };
  return {
    title: project.name,
    center: [pin.lng, pin.lat],
    zoom: 14,
    pins: [pin],
    atlasHref: `/atlas?project=${project.slug}`,
  };
}

/**
 * A live map inside editor content, pinned to one city or one building.
 *
 * Mounted by `RichHtml` wherever the editor left a `data-map-embed`
 * placeholder, so a city page, a project page and a Practice note all get the
 * same map from the same block.
 */
export default function ContentMapEmbed({ kind, slug, label }: MapEmbedTarget) {
  const container = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [data, setData] = useState<Resolved | null>(null);
  const [failed, setFailed] = useState(false);
  const token = getMapboxToken();

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setFailed(false);
    (kind === "city" ? resolveCity(slug) : resolveProject(slug))
      .then((r) => {
        if (cancelled) return;
        if (r) setData(r);
        else setFailed(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [kind, slug]);

  useEffect(() => {
    if (!data || !token || !container.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    try {
      const map = new mapboxgl.Map({
        container: container.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: data.center,
        zoom: data.zoom,
        attributionControl: false,
        // An article scrolls; a map that grabs the wheel would trap the reader.
        scrollZoom: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      map.touchZoomRotate.disableRotation();
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      map.on("load", () => {
        data.pins.forEach((p) =>
          new mapboxgl.Marker({ element: pinEl(), anchor: "center" })
            .setLngLat([p.lng, p.lat])
            .addTo(map),
        );
        if (data.pins.length >= 2) {
          const b = new mapboxgl.LngLatBounds();
          data.pins.forEach((p) => b.extend([p.lng, p.lat]));
          map.fitBounds(b, { padding: 60, duration: 0, maxZoom: 13 });
        }
      });
    } catch (e) {
      console.error("Content map embed failed to initialise", e);
      setFailed(true);
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [data, token]);

  // Nothing to show is better than a broken frame: an unresolved slug, an
  // unpublished target or a missing Mapbox token leaves the article reading
  // normally rather than leaving an empty grey box in the middle of it.
  if (failed || !token) return null;

  return (
    <figure className="not-prose my-10">
      <div
        ref={container}
        className="w-full bg-stone"
        style={{ height: "clamp(300px, 42vh, 420px)" }}
        aria-label={`Map of ${data?.title || label || slug}`}
      />
      <figcaption className="mt-3 flex items-center justify-between gap-4 flex-wrap">
        <span className="text-[11px] tracking-tag uppercase text-ink-muted">
          {data?.title || label || slug}
        </span>
        {data && (
          <Link
            to={data.atlasHref}
            className="text-[11px] tracking-tag uppercase text-ink hover:opacity-60 transition-opacity"
          >
            Open in the map ↗
          </Link>
        )}
      </figcaption>
    </figure>
  );
}
