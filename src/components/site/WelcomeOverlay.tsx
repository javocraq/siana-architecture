import { useEffect, useState } from "react";
import { X } from "lucide-react";

const KEY = "siana_visited";
const CITIES = ["Munich", "London", "Berlin", "Vienna", "Paris"];

export default function WelcomeOverlay() {
  const [show, setShow] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY)) return;
    setShow(true);
    localStorage.setItem(KEY, "true");
    const t = setTimeout(() => setFading(true), 2500);
    const t2 = setTimeout(() => setShow(false), 3100);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-paper"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 600ms ease",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <button
        onClick={() => setFading(true)}
        aria-label="Skip"
        className="absolute top-6 right-6 p-2 text-warm-gray hover:text-ink"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="text-center px-6">
        <h1 className="font-logo text-ink leading-none" style={{ fontSize: 52 }}>
          siana
        </h1>
        <p
          className="mt-5 font-mono"
          style={{ fontSize: 15, color: "hsl(var(--ink-soft))", letterSpacing: "0.04em", lineHeight: 1.6 }}
        >
          An architectural magazine meets a city platform
        </p>
        <p
          className="mt-6 font-mono uppercase font-medium"
          style={{ fontSize: 13, color: "hsl(var(--ink-soft))", letterSpacing: "0.16em" }}
        >
          {CITIES.join(" · ")}
        </p>
      </div>
    </div>
  );
}
