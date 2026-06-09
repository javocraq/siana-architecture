/**
 * Shape of the About manifesto content stored in `site_pages` keyed by 'about'.
 * Defaults mirror what the page originally rendered — they're used as a
 * fallback when the row is missing or the migration hasn't run yet.
 */
export type AboutContent = {
  eyebrow: string;
  headline: string;
  body: string[];
  cta_label: string;
};

export const ABOUT_DEFAULTS: AboutContent = {
  eyebrow: "Siana — Manifesto",
  headline: "The city as architecture.",
  body: [
    "Siana is an architectural magazine that lives on a map. We believe the most interesting building in any city is rarely the most famous one — and that the best way to understand a place is to walk it, slowly, with someone pointing.",
    "We curate projects across cities, write about them with the care of an editor and the eye of an architect, and put them on a map you can actually use. No ads. No clutter. No infinite scroll.",
    "Made for those who look.",
  ],
  cta_label: "Open the map →",
};
