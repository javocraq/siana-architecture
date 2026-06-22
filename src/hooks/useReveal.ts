import { useLayoutEffect, useRef, useState } from "react";

/**
 * Toggles `revealed` whenever the element enters or leaves the viewport,
 * so the slide-up animation re-plays on every pass (scrolling down AND
 * back up). Respects prefers-reduced-motion (reveals once, no animation).
 *
 * Uses useLayoutEffect + an immediate visibility check so content that is
 * already in the viewport at mount stays visible across the first paint —
 * otherwise the IntersectionObserver's async callback would leave it at
 * opacity:0 for one frame, producing a visible flash where the page
 * "starts empty" and the footer briefly looks like the only content.
 */
export function useReveal<T extends HTMLElement = HTMLElement>(
  options?: IntersectionObserverInit
) {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }
    // Synchronous viewport check before the first paint. Anything already
    // visible at mount is revealed immediately, avoiding the flash.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setRevealed(true);
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
