import "@testing-library/jest-dom";

// jsdom performs no layout, so it never implemented Range measurement. TipTap's
// `.focus()` scrolls the selection into view, which asks a Range for its rects
// and would otherwise throw. An empty but well-formed answer is enough.
const emptyRect = () =>
  ({ top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

// jsdom has no viewport, so it ships no IntersectionObserver. `Reveal` (used by
// most public sections) needs one; a no-op that never fires leaves the content
// in its initial state, which is what these tests assert against.
if (!("IntersectionObserver" in globalThis)) {
  class NoopIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: readonly number[] = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  globalThis.IntersectionObserver = NoopIntersectionObserver as unknown as typeof IntersectionObserver;
}

if (typeof Range !== "undefined") {
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = emptyRect;
  }
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () =>
      Object.assign([] as unknown as DOMRectList, { item: () => null });
  }
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
