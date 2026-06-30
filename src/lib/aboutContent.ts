/**
 * Shape of the About manifesto content stored in `site_pages` keyed by 'about'.
 * Defaults mirror what the page originally rendered — they're used as a
 * fallback when the row is missing or the migration hasn't run yet.
 *
 * Body is HTML authored through the rich text editor: italics, bold,
 * blockquote, etc. are all expressed inline so the author sees the same
 * formatting in the admin as readers see on /about.
 */
export type AboutContent = {
  eyebrow: string;
  headline: string;
  body: string;
  cta_label: string;
};

export const ABOUT_DEFAULTS: AboutContent = {
  eyebrow: "Siana — Manifesto",
  headline: "The city as architecture.",
  body:
    "<p>Siana is an architectural magazine that lives on a map. We believe the most interesting building in any city is rarely the most famous one — and that the best way to understand a place is to walk it, slowly, with someone pointing.</p>" +
    "<p>We curate projects across cities, write about them with the care of an editor and the eye of an architect, and put them on a map you can actually use. No ads. No clutter. No infinite scroll.</p>" +
    "<p><em>Made for those who look.</em></p>",
  cta_label: "Open the map →",
};

/** Backwards compatibility: rows authored before the rich-text migration
 *  stored body as `string[]`, with the last paragraph styled as a serif
 *  italic pull-quote at render time. Convert that shape to HTML on the
 *  fly so the new editor and the new renderer never have to special-case
 *  arrays. New rows are saved as HTML and skip this branch. */
export const normalizeAboutBody = (raw: unknown): string => {
  if (typeof raw === "string" && raw.trim()) return raw;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .map((p, i) => {
        const text = String(p ?? "").trim();
        if (!text) return "";
        const isPullQuote = i === raw.length - 1 && raw.length > 1;
        return isPullQuote ? `<p><em>${escapeHtml(text)}</em></p>` : `<p>${escapeHtml(text)}</p>`;
      })
      .filter(Boolean)
      .join("");
  }
  return ABOUT_DEFAULTS.body;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string),
  );
