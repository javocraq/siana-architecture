// Shared types for the city landing page section builder.

export type SectionType =
  | "rich_text"
  | "projects"
  | "journal"
  | "gallery"
  | "spacer";

export interface BaseSection {
  id: string;
  type: SectionType;
  enabled: boolean;
}

export interface RichTextSection extends BaseSection {
  type: "rich_text";
  settings: {
    eyebrow?: string;
    heading?: string;
    html: string;
    background?: "paper" | "warm" | "mid";
    align?: "left" | "center";
  };
}

export interface ProjectsSection extends BaseSection {
  type: "projects";
  settings: {
    eyebrow?: string;
    heading?: string;
    limit: number;
    featuredOnly: boolean;
    category?: string;
    style?: string;
  };
}

export interface JournalSection extends BaseSection {
  type: "journal";
  settings: {
    eyebrow?: string;
    heading?: string;
    limit: number;
    onlyTaggedWithCity: boolean;
    category?: string;
  };
}

export interface GallerySection extends BaseSection {
  type: "gallery";
  settings: {
    eyebrow?: string;
    heading?: string;
    images: string[];
    columns: 2 | 3 | 4;
  };
}

export interface SpacerSection extends BaseSection {
  type: "spacer";
  settings: { height: number };
}

export type CitySection =
  | RichTextSection
  | ProjectsSection
  | JournalSection
  | GallerySection
  | SpacerSection;

export const newSection = (type: SectionType): CitySection => {
  const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  switch (type) {
    case "rich_text":
      return { id, type, enabled: true, settings: { html: "", background: "warm", align: "left" } };
    case "projects":
      return { id, type, enabled: true, settings: { heading: "Projects", limit: 6, featuredOnly: false } };
    case "journal":
      return { id, type, enabled: true, settings: { heading: "From Practice", limit: 3, onlyTaggedWithCity: true } };
    case "gallery":
      return { id, type, enabled: true, settings: { images: [], columns: 3 } };
    case "spacer":
      return { id, type, enabled: true, settings: { height: 80 } };
  }
};

export const SECTION_LABELS: Record<SectionType, string> = {
  rich_text: "Text block",
  projects: "Projects grid",
  journal: "Practice entries",
  gallery: "Image gallery",
  spacer: "Spacer",
};
