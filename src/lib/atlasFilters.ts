// Atlas filter vocabularies + interim project tagging.
//
// NOTE: `materials` and `experience` are not yet columns on the `projects`
// table (DB writes were unavailable when this shipped), so they live here keyed
// by project slug. When the columns are added, swap PROJECT_TAGS for the DB
// fields — the Atlas filter logic stays the same.

export const MATERIALS = ["Concrete", "Brick", "Steel", "Timber", "Glass", "Stone"];

export const EXPERIENCES = [
  "Must Visit",
  "Hidden Gem",
  "Architectural Stay",
  "Best Public Space",
  "Student Favorite",
  "Worth the Detour",
];

export const STYLES = [
  "Modernist", "Brutalist", "Art Deco", "Baroque", "Gothic",
  "Deconstructivist", "Postmodern", "Contemporary", "Expressionist", "Organic", "High-Tech",
];

export const ERAS = ["Pre-1900", "1900–1945", "1945–1975", "1975–2000", "2000–now"];

export function eraMatches(year: number | null, era: string) {
  if (year == null) return false;
  switch (era) {
    case "Pre-1900": return year < 1900;
    case "1900–1945": return year >= 1900 && year <= 1945;
    case "1945–1975": return year > 1945 && year <= 1975;
    case "1975–2000": return year > 1975 && year <= 2000;
    case "2000–now": return year > 2000;
    default: return false;
  }
}

export type ProjectTags = { materials: string[]; experience: string[] };

export const PROJECT_TAGS: Record<string, ProjectTags> = {
  "sagrada-familia": { materials: ["Stone", "Concrete"], experience: ["Must Visit"] },
  "casa-batllo": { materials: ["Stone", "Glass"], experience: ["Must Visit"] },
  "mercat-santa-caterina": { materials: ["Steel", "Timber"], experience: ["Best Public Space"] },
  "casa-da-musica": { materials: ["Concrete"], experience: ["Must Visit", "Worth the Detour"] },
  "serralves-museum": { materials: ["Concrete", "Stone"], experience: ["Hidden Gem"] },
  "maat-lisbon": { materials: ["Concrete", "Glass"], experience: ["Best Public Space"] },
  "champalimaud-centre": { materials: ["Stone", "Concrete"], experience: ["Worth the Detour"] },
  "casa-luis-barragan": { materials: ["Concrete", "Stone"], experience: ["Architectural Stay", "Hidden Gem"] },
  "museo-soumaya": { materials: ["Steel", "Glass"], experience: ["Must Visit"] },
  "8-house": { materials: ["Concrete", "Glass"], experience: ["Architectural Stay"] },
  "royal-danish-opera": { materials: ["Steel", "Glass", "Stone"], experience: ["Best Public Space"] },
  "robie-house": { materials: ["Brick", "Timber"], experience: ["Student Favorite"] },
  "willis-tower": { materials: ["Steel", "Glass"], experience: ["Must Visit"] },
  "altos-del-rimac": { materials: ["Concrete", "Brick"], experience: ["Hidden Gem"] },
};

export const tagsFor = (slug: string): ProjectTags => PROJECT_TAGS[slug] || { materials: [], experience: [] };
