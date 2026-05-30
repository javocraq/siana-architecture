export type PostKind = "journal" | "resource";

export const JOURNAL_CATEGORIES = [
  "Architecture + AI",
  "Criticism",
  "Profile",
  "Reportage",
  "Essay",
  "Interview",
  "City guide",
];

export const RESOURCE_CATEGORIES = [
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

export const kindConfig = (kind: PostKind) =>
  kind === "resource"
    ? {
        label: "Resource",
        labelPlural: "RESOURCES FOR ARCHITECTS",
        sectionTitle: "RESOURCES FOR ARCHITECTS",
        sectionTagline: "Practical guides, playbooks and tools for architecture, engineering and construction firms.",
        publicBase: "/resources",
        adminBase: "/admin/resources",
        categories: RESOURCE_CATEGORIES,
        eyebrow: "Library",
      }
    : {
        label: "Post",
        labelPlural: "Journal",
        sectionTitle: "Journal",
        sectionTagline: "Essays and field notes on architecture, slowly written.",
        publicBase: "/journal",
        adminBase: "/admin/journal",
        categories: JOURNAL_CATEGORIES,
        eyebrow: "Reading",
      };

export const detectKindFromPath = (pathname: string): PostKind =>
  pathname.includes("/resources") ? "resource" : "journal";
