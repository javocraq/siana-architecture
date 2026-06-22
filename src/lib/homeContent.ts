/**
 * Shape of the Home page content stored in `site_pages` keyed by 'home'.
 * Defaults mirror what the page originally rendered — they're used as a
 * fallback when the row is missing or the migration hasn't run yet.
 *
 * The hero headline is a single string; newlines in it render as line
 * breaks on the public page (whitespace: pre-line). Older records that
 * still have `headline_line1` / `headline_line2` are migrated on read by
 * `mergeHomeContent`. The map block's headline is split into a leading
 * phrase and an emphasised tail (rendered in italic), matching the
 * original markup.
 */
export type HomeContent = {
  hero: {
    eyebrow_architecture: string;
    eyebrow_cities: string;
    eyebrow_practice: string;
    headline: string;
    /** @deprecated Kept for backward compatibility with older saved records.
     *  Read by mergeHomeContent into `headline`; do not write new values. */
    headline_line1?: string;
    /** @deprecated Same as above. */
    headline_line2?: string;
    description: string;
    cta_primary: string;
    cta_secondary: string;
    /** Background photos for the hero slideshow. Empty → the page uses its
     *  built-in curated set. */
    images: string[];
  };
  map: {
    eyebrow: string;
    headline_lead: string;
    headline_emphasis: string;
    description: string;
    cta: string;
  };
  cities: {
    title: string;
  };
  buildings: {
    headline_lead: string;
    headline_emphasis: string;
    description: string;
  };
  journal: {
    headline_lead: string;
    headline_emphasis: string;
    description: string;
    cta: string;
  };
  newsletter: {
    eyebrow: string;
    headline: string;
    description: string;
  };
};

export const HOME_DEFAULTS: HomeContent = {
  hero: {
    eyebrow_architecture: "Architecture",
    eyebrow_cities: "Cities",
    eyebrow_practice: "Practice",
    headline: "Discover Architecture\nthrough Cities",
    description:
      "Explore curated projects, city guides, and architectural stories from around the world.",
    cta_primary: "Explore the Map",
    cta_secondary: "Browse all cities",
    images: [],
  },
  map: {
    eyebrow: "The Map",
    headline_lead: "Every building,",
    headline_emphasis: "on the map",
    description:
      "A living atlas of architecture. Open the Map to filter by city, architect, style and year — and discover each project on the map.",
    cta: "Open the interactive map",
  },
  cities: {
    title: "Cities",
  },
  buildings: {
    headline_lead: "Featured",
    headline_emphasis: "Buildings",
    description:
      "A curated selection of the projects we keep returning to — across cities, eras and materials.",
  },
  journal: {
    headline_lead: "Field",
    headline_emphasis: "notes",
    description: "Essays, criticism and field notes on architecture — slowly written.",
    cta: "All notes",
  },
  newsletter: {
    eyebrow: "Stay in Touch",
    headline: "Curated Architecture Updates",
    description:
      "Subscribe to our newsletter to receive updates on curated architecture discoveries, city guides, and resources for architects.",
  },
};

/** Merge a partial DB record on top of the defaults so missing fields don't blank out. */
export function mergeHomeContent(partial?: Partial<HomeContent> | null): HomeContent {
  if (!partial) return HOME_DEFAULTS;
  const heroPartial = (partial.hero || {}) as HomeContent["hero"] & {
    headline_line1?: string;
    headline_line2?: string;
  };
  // Back-compat: older DB rows stored the headline as two separate lines.
  // If the new `headline` field is missing, reconstruct it from those.
  const legacyHeadline =
    heroPartial.headline_line1 || heroPartial.headline_line2
      ? [heroPartial.headline_line1, heroPartial.headline_line2].filter(Boolean).join("\n")
      : undefined;
  const hero: HomeContent["hero"] = {
    ...HOME_DEFAULTS.hero,
    ...heroPartial,
    headline: heroPartial.headline ?? legacyHeadline ?? HOME_DEFAULTS.hero.headline,
  };
  delete (hero as any).headline_line1;
  delete (hero as any).headline_line2;
  return {
    hero,
    map: { ...HOME_DEFAULTS.map, ...(partial.map || {}) },
    cities: { ...HOME_DEFAULTS.cities, ...(partial.cities || {}) },
    buildings: { ...HOME_DEFAULTS.buildings, ...(partial.buildings || {}) },
    journal: { ...HOME_DEFAULTS.journal, ...(partial.journal || {}) },
    newsletter: { ...HOME_DEFAULTS.newsletter, ...(partial.newsletter || {}) },
  };
}
