/**
 * Contract for a map embedded inside editor content.
 *
 * Requested in the first review — "que esté incrustado el embed dentro de cada
 * una de las entradas" — and again in the fourth, where the map should appear
 * on a project or a note whenever it is tied to a city or a project.
 *
 * The editor stores an empty placeholder element:
 *
 *   <div data-map-embed="city"    data-slug="barcelona"></div>
 *   <div data-map-embed="project" data-slug="sagrada-familia"></div>
 *
 * `RichHtml` finds those placeholders on the public site and mounts a real map
 * into them. Keeping the target as a *slug* (not a database id) means the saved
 * HTML stays readable, survives a copy-paste between entries, and can be typed
 * by hand in the HTML view.
 */

export type MapEmbedKind = "city" | "project";

export const MAP_EMBED_SELECTOR = "[data-map-embed]";

export type MapEmbedTarget = {
  kind: MapEmbedKind;
  slug: string;
  /** Human-readable name, kept only so the editor placeholder can show it. */
  label?: string;
};

export function isMapEmbedKind(v: string | null | undefined): v is MapEmbedKind {
  return v === "city" || v === "project";
}

/** Reads an embed's target off a placeholder element. */
export function readMapEmbed(el: HTMLElement): MapEmbedTarget | null {
  const kind = el.getAttribute("data-map-embed");
  if (!isMapEmbedKind(kind)) return null;
  const slug = (el.getAttribute("data-slug") || "").trim();
  if (!slug) return null;
  return { kind, slug, label: el.getAttribute("data-label") || undefined };
}
