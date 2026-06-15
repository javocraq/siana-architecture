import { useEffect, useRef, useState } from "react";

/**
 * Toggles `revealed` whenever the element enters or leaves the viewport,
 * so the slide-up animation re-plays on every pass (scrolling down AND
 * back up). Respects prefers-reduced-motion (reveals once, no animation).
 */
export function useReveal<T extends HTMLElement = HTMLElement>(
  options?: IntersectionObserverInit
) {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        setRevealed(entry.isIntersecting);
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px", ...options }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, revealed };
}
