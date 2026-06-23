import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const KEY = new PluginKey("tableRowResize");
const EDGE = 6; // px proximity to a row's bottom border that arms the resize
const MIN_H = 24; // never drag a row below this

/**
 * Drag-to-resize row HEIGHT for tables — the row counterpart to TipTap's
 * built-in column (width) resizing. Dragging a row's bottom border sets a
 * `height` attribute on that row's cells. Because `height` acts as a minimum
 * for table cells, it only ever makes a row TALLER than its content — it never
 * clips text. Requires TableCell/TableHeader to carry a `height` attribute
 * (added where the editor is configured).
 */
export const TableRowResize = Extension.create({
  name: "tableRowResize",
  addProseMirrorPlugins() {
    let drag: { startY: number; startH: number; cells: HTMLElement[] } | null = null;

    const rowAtBottomEdge = (event: MouseEvent): HTMLElement | null => {
      const el = event.target as HTMLElement | null;
      const cell = el?.closest?.("td, th") as HTMLElement | null;
      const row = cell?.closest?.("tr") as HTMLElement | null;
      if (!row) return null;
      const rect = row.getBoundingClientRect();
      return Math.abs(event.clientY - rect.bottom) <= EDGE ? row : null;
    };

    return [
      new Plugin({
        key: KEY,
        props: {
          handleDOMEvents: {
            mousemove: (view, event) => {
              if (drag) return false;
              view.dom.classList.toggle("row-resize-cursor", !!rowAtBottomEdge(event));
              return false;
            },
            mousedown: (view, event) => {
              const row = rowAtBottomEdge(event);
              if (!row) return false;
              event.preventDefault();
              const cells = Array.from(
                row.querySelectorAll(":scope > td, :scope > th")
              ) as HTMLElement[];
              drag = { startY: event.clientY, startH: row.getBoundingClientRect().height, cells };

              const heightFor = (e: MouseEvent) =>
                Math.max(MIN_H, Math.round(drag!.startH + (e.clientY - drag!.startY)));

              // Live preview while dragging.
              const onMove = (e: MouseEvent) => {
                if (!drag) return;
                const h = heightFor(e);
                drag.cells.forEach((c) => (c.style.height = `${h}px`));
              };
              // Commit the height onto each cell node so it persists in the HTML.
              const onUp = (e: MouseEvent) => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
                if (!drag) return;
                const h = heightFor(e);
                const cells = drag.cells;
                drag = null;
                try {
                  let tr = view.state.tr;
                  let changed = false;
                  cells.forEach((cellEl) => {
                    const pos = view.posAtDOM(cellEl, 0);
                    const $pos = view.state.doc.resolve(pos);
                    for (let d = $pos.depth; d > 0; d--) {
                      const node = $pos.node(d);
                      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
                        tr = tr.setNodeMarkup($pos.before(d), undefined, { ...node.attrs, height: h });
                        changed = true;
                        break;
                      }
                    }
                  });
                  if (changed) view.dispatch(tr);
                } catch {
                  /* keep the live DOM height as a fallback */
                }
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
              return true;
            },
          },
        },
      }),
    ];
  },
});
