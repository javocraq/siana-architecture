import DOMPurify from "dompurify";

/**
 * Sanitizer for the short inline-formatted copy used in home headlines.
 * Only bold, italic, a terracotta accent span, and line breaks are allowed —
 * enough for editorial emphasis, nothing that could break the layout or
 * introduce script/style injection. Both the admin editor (on save) and the
 * public renderers run values through this so the DB never stores stray markup.
 */
const INLINE_CONFIG = {
  ALLOWED_TAGS: ["b", "strong", "i", "em", "span", "br"],
  ALLOWED_ATTR: ["class"],
};

export function sanitizeInline(html?: string | null): string {
  return html ? DOMPurify.sanitize(html, INLINE_CONFIG) : "";
}

/** Escape plain text before embedding it in an inline-HTML string. */
export function escapeInline(text?: string | null): string {
  return (text || "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)
  );
}
