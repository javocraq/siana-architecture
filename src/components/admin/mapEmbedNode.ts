import { Node, mergeAttributes } from "@tiptap/core";
import type { MapEmbedTarget } from "@/lib/mapEmbed";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mapEmbed: {
      /** Inserts a map block pinned to a city or a project. */
      setMapEmbed: (target: MapEmbedTarget) => ReturnType;
    };
  }
}

/**
 * An atomic block that stands in for a live map.
 *
 * In the editor it draws a compact card ("Map · Barcelona") so the author can
 * see and move the block without the cost — and the scroll-hijacking — of a
 * real Mapbox canvas inside the text flow. The public site swaps it for the
 * actual map (see `RichHtml` / `ContentMapEmbed`).
 */
export const MapEmbed = Node.create({
  name: "mapEmbed",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      kind: {
        default: "city",
        parseHTML: (el) => el.getAttribute("data-map-embed") || "city",
        renderHTML: (attrs) => ({ "data-map-embed": attrs.kind }),
      },
      slug: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-slug") || "",
        renderHTML: (attrs) => ({ "data-slug": attrs.slug }),
      },
      label: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-label") || "",
        renderHTML: (attrs) => (attrs.label ? { "data-label": attrs.label } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-map-embed]" }];
  },

  renderHTML({ HTMLAttributes }) {
    // Rendered empty on purpose — the public renderer mounts the map into it.
    return ["div", mergeAttributes(HTMLAttributes)];
  },

  addCommands() {
    return {
      setMapEmbed:
        (target) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { kind: target.kind, slug: target.slug, label: target.label || "" },
          }),
    };
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.className =
        "my-3 flex items-center gap-3 border hairline bg-stone/60 px-4 py-3 text-ink-muted select-none";
      dom.contentEditable = "false";

      const icon = document.createElement("span");
      icon.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/>' +
        '<path d="M15 5.764v15"/><path d="M9 3.236v15"/></svg>';
      icon.className = "shrink-0";

      const text = document.createElement("span");
      text.className = "text-[11px] tracking-tag uppercase";
      const target = node.attrs.label || node.attrs.slug;
      text.textContent = target
        ? `Map · ${target}`
        : "Map - no city or project selected";

      dom.append(icon, text);
      return { dom };
    };
  },
});
