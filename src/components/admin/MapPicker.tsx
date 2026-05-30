import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getMapboxToken } from "@/lib/mapbox";

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
};

export default function MapPicker({ latitude, longitude, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [token] = useState<string>(() => getMapboxToken());

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
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    if (latitude && longitude) {
      markerRef.current = new mapboxgl.Marker({ color: "#bf3a18", draggable: true })
        .setLngLat([lng, lat])
        .addTo(map);
      markerRef.current.on("dragend", () => {
        const { lng, lat } = markerRef.current!.getLngLat();
        onChange(+lat.toFixed(6), +lng.toFixed(6));
      });
    }

    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({ color: "#bf3a18", draggable: true })
          .setLngLat([lng, lat])
          .addTo(map);
        markerRef.current.on("dragend", () => {
          const ll = markerRef.current!.getLngLat();
          onChange(+ll.lat.toFixed(6), +ll.lng.toFixed(6));
        });
      } else {
        markerRef.current.setLngLat([lng, lat]);
      }
      onChange(+lat.toFixed(6), +lng.toFixed(6));
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
      <div ref={ref} className="w-full h-[360px]" />
      <p className="px-3 py-2 text-[11px] text-ink-faint border-t hairline">
        Click to place pin · drag to fine-tune
      </p>
    </div>
  );
}
