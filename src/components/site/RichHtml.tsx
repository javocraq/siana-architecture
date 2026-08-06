import DOMPurify from "dompurify";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
// Pulled in only when a body actually contains a map block, so Mapbox stays
// out of the bundle for the many entries that have none.
import ContentMapEmbed from "@/components/site/ContentMapEmbed";
import { MAP_EMBED_SELECTOR, readMapEmbed, type MapEmbedTarget } from "@/lib/mapEmbed";

type Props = {
  html: string;
  className?: string;
};

type MountedEmbed = MapEmbedTarget & { host: HTMLElement };

/**
 * Renders sanitized HTML content from the rich text editor.
 * Wrap in a `prose` container so headings/lists/tables get sensible defaults.
 *
 * Tables reproduce the layout set in the editor. Each <table> is moved into a
 * `.rt-table` wrapper (see index.css). A table whose authored width is wider
 * than the reading column gets `.is-wide`: its column px-widths are converted
 * to proportions and stored as `--tw` (the authored total width) so the table
 * shows at that width on large screens and scales down to fit on smaller ones
 * — instead of being clipped or forcing a horizontal scrollbar. Narrow tables
 * keep their authored width within the column. Applies everywhere RichHtml is
 * used (articles, project and city copy) and to future posts.
 */
export default function RichHtml({ html, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // `data-map-embed` / `data-slug` survive sanitising because DOMPurify keeps
  // data-* attributes by default; they are named here so the intent is explicit.
  const clean = html
    ? DOMPurify.sanitize(html, {
        ADD_ATTR: ["target", "rel", "data-map-embed", "data-slug", "data-label"],
      })
    : "";
  const [embeds, setEmbeds] = useState<MountedEmbed[]>([]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const prepare = () => {
      root.querySelectorAll("table").forEach((table) => {
        // Move into a `.rt-table` wrapper (idempotent).
        let wrap = table.parentElement as HTMLElement | null;
        if (!wrap || !wrap.classList.contains("rt-table")) {
          wrap = document.createElement("div");
          wrap.className = "rt-table";
          table.parentNode?.insertBefore(wrap, table);
          wrap.appendChild(table);
        }
        if ((table as HTMLElement).dataset.rtPrepped) return;
        (table as HTMLElement).dataset.rtPrepped = "1";

        // Decide "wide" from the authored data, not a live measure (which the
        // default fit-content cap would distort). A table only breaks out when
        // EVERY column was given a width and their total is wider than the
        // reading column — otherwise it stays content-sized so a widthless
        // column (e.g. "#") can't balloon.
        const cols = Array.from(table.querySelectorAll("col")) as HTMLElement[];
        const widths = cols.map((c) => parseFloat(c.style.width));
        const hasColWidths = cols.length > 0 && widths.every((w) => w > 0);
        const colSum = hasColWidths ? widths.reduce((a, b) => a + b, 0) : 0;
        const inlineWidth = parseFloat((table as HTMLElement).style.width) || 0;
        const authorWidth = Math.max(inlineWidth, colSum);
        const columnWidth = wrap.clientWidth;

        if (hasColWidths && authorWidth > columnWidth + 1) {
          wrap.classList.add("is-wide");
          wrap.style.setProperty("--tw", `${Math.round(authorWidth)}px`);
          wrap.style.setProperty("--tw-half", `${Math.round(authorWidth / 2)}px`);
          // px -> proportions, so the table scales to fill whatever width the
          // breakout band ends up being on this screen.
          cols.forEach((c, i) => {
            c.style.width = `${((widths[i] / colSum) * 100).toFixed(3)}%`;
          });
        }
      });
    };

    // Map placeholders left by the editor become real maps, portalled into the
    // exact spot the author put them in.
    const collectEmbeds = () => {
      const found: MountedEmbed[] = [];
      root.querySelectorAll<HTMLElement>(MAP_EMBED_SELECTOR).forEach((host) => {
        const target = readMapEmbed(host);
        if (target) found.push({ ...target, host });
      });
      setEmbeds(found);
    };

    const raf = requestAnimationFrame(() => {
      prepare();
      collectEmbeds();
    });
    return () => {
      cancelAnimationFrame(raf);
      // Unmount the portals before React replaces the innerHTML they live in.
      setEmbeds([]);
    };
  }, [clean]);

  if (!clean) return null;
  return (
    <>
      <div
        ref={ref}
        className={`prose prose-stone max-w-none ${className}`}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
      {embeds.map((e, i) =>
        createPortal(
          <ContentMapEmbed kind={e.kind} slug={e.slug} label={e.label} />,
          e.host,
          `${e.kind}:${e.slug}:${i}`,
        ),
      )}
    </>
  );
}
