// Editable option lists ("categories") for the CMS forms. Stored in the
// existing `site_pages` table under key 'taxonomies' (JSONB) — no migration
// needed. Managed from /admin/taxonomies; read by the Projects and Cities
// forms via the useTaxonomies() hook. Defaults mirror the previous hardcoded
// lists so nothing changes until an editor edits them.
import { STYLES, REGIONS } from "./adminTaxonomies";
import { MATERIALS, EXPERIENCES } from "./atlasFilters";
import { PRACTICE_CATEGORIES } from "./postKind";

export type Taxonomies = {
  categories: string[];
  styles: string[];
  materials: string[];
  experiences: string[];
  regions: string[];
};

export const TAXONOMY_DEFAULTS: Taxonomies = {
  categories: [...PRACTICE_CATEGORIES],
  styles: [...STYLES],
  materials: [...MATERIALS],
  experiences: [...EXPERIENCES],
  regions: [...REGIONS],
};

export const TAXONOMY_FIELDS: { key: keyof Taxonomies; label: string; hint: string }[] = [
  { key: "categories", label: "Categories", hint: "Used by Projects and Practice entries." },
  { key: "styles", label: "Styles", hint: "Architectural style of a project." },
  { key: "materials", label: "Materials", hint: "Primary materials of a project." },
  { key: "experiences", label: "Experiences", hint: "How a visitor experiences a project." },
  { key: "regions", label: "Regions", hint: "World region of a city." },
];

const pick = (arr: unknown, fallback: string[]): string[] =>
  Array.isArray(arr) ? (arr.filter((x) => typeof x === "string" && x.trim() !== "") as string[]) : fallback;

/** Merge a partial DB record over the defaults. A saved (possibly empty) array
 *  is respected; a missing key falls back to its default list. */
export function mergeTaxonomies(partial?: Partial<Taxonomies> | null): Taxonomies {
  if (!partial) return TAXONOMY_DEFAULTS;
  return {
    categories: partial.categories === undefined ? TAXONOMY_DEFAULTS.categories : pick(partial.categories, TAXONOMY_DEFAULTS.categories),
    styles: partial.styles === undefined ? TAXONOMY_DEFAULTS.styles : pick(partial.styles, TAXONOMY_DEFAULTS.styles),
    materials: partial.materials === undefined ? TAXONOMY_DEFAULTS.materials : pick(partial.materials, TAXONOMY_DEFAULTS.materials),
    experiences: partial.experiences === undefined ? TAXONOMY_DEFAULTS.experiences : pick(partial.experiences, TAXONOMY_DEFAULTS.experiences),
    regions: partial.regions === undefined ? TAXONOMY_DEFAULTS.regions : pick(partial.regions, TAXONOMY_DEFAULTS.regions),
  };
}
