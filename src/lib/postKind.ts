// Posts (journal + recursos) were unified into a single "Práctica" section.
// The `kind` column on the table still exists for legacy rows, but the UI
// no longer distinguishes between them — both feed the same Práctica list
// and detail pages.

export type PostKind = "journal" | "resource";

export const PRACTICE_CATEGORIES = [
  "Architecture + AI",
  "Criticism",
  "Profile",
  "Reportage",
  "Essay",
  "Interview",
  "City guide",
  "Practice Management",
  "BIM & Tech",
  "AI in AEC",
  "Specifications & Materials",
  "Sustainability",
  "Project Delivery",
  "Business Development",
  "Legal & Contracts",
  "Tools & Software",
];

// Back-compat alias for existing imports.
export const JOURNAL_CATEGORIES = PRACTICE_CATEGORIES;
export const RESOURCE_CATEGORIES = PRACTICE_CATEGORIES;

const PRACTICE_CONFIG = {
  label: "Practice entry",
  labelPlural: "Practice",
  // Public-facing section name — the site renders this in English ("Practice"),
  // matching the navbar and the /practice URL.
  sectionTitle: "Practice",
  sectionTagline:
    "Practical guides, essays, and field notes for architecture, engineering, and construction firms.",
  publicBase: "/practice",
  adminBase: "/admin/practice",
  categories: PRACTICE_CATEGORIES,
  eyebrow: "Library",
};

export const kindConfig = (_kind?: PostKind) => PRACTICE_CONFIG;
export const detectKindFromPath = (_pathname: string): PostKind => "resource";
