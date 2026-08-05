import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableRowResize } from "./tableRowResize";
import TextAlign from "@tiptap/extension-text-align";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote,
  Link as LinkIcon, Image as ImageIcon, ImagePlus, Undo2, Redo2, Code2,
  Table as TableIcon, Trash2, Loader2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
} from "lucide-react";
import { imageFilesFrom, uploadImage } from "@/lib/uploadImage";
import { tsvToGrid, type TsvGrid } from "@/lib/tsvTable";
import { MapEmbed } from "./mapEmbedNode";
import type { MapEmbedKind } from "@/lib/mapEmbed";
import { supabase } from "@/integrations/supabase/client";
import { Map as MapIcon } from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Folder inside the storage bucket for images uploaded from this editor. */
  uploadFolder?: string;
};

// Row height, stored as inline `style: height` on table cells. In tables a
// height acts as a minimum, so dragging only ever makes a row taller than its
// content — it never clips text. Drag handled by the TableRowResize plugin.
const ROW_HEIGHT_ATTR = {
  height: {
    default: null,
    parseHTML: (el: HTMLElement) => {
      const h = parseInt(el.style.height, 10);
      return Number.isFinite(h) ? h : null;
    },
    renderHTML: (attrs: { height?: number | null }) =>
      attrs.height ? { style: `height: ${attrs.height}px` } : {},
  },
};

/** Toolbar button. Defined at module level (NOT inside RichTextEditor) so its
 *  identity is stable across renders — otherwise every keystroke remounts all
 *  the buttons, which made them flicker/"tremble", especially in tables. */
function Btn({
  active,
  onClick,
  children,
  title,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors disabled:opacity-30 ${active ? "bg-ink text-background" : "text-ink-muted hover:text-ink hover:bg-stone"}`}
    >
      {children}
    </button>
  );
}

// Pretty-print TipTap's compact single-line HTML so the source view is
// readable: each block element on its own line, nested blocks indented.
// Inline-only blocks (e.g. `<p>text <strong>x</strong></p>`) stay on one
// line so prose is easy to scan. Round-tripping through TipTap normalizes
// whitespace, so the formatting is purely cosmetic for the editor.
const BLOCK_TAGS = new Set([
  "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "blockquote",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th",
  "figure", "figcaption", "section", "article", "header", "footer",
  "pre", "hr", "div",
]);
const VOID_TAGS = new Set(["br", "hr", "img", "input", "meta", "link"]);

function escapeAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function serializeChildren(node: Node, depth: number): string {
  const pad = "  ".repeat(depth);
  let out = "";
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const t = (child.textContent || "").replace(/\s+/g, " ").trim();
      if (t) out += pad + t + "\n";
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    const attrs = Array.from(el.attributes)
      .map((a) => ` ${a.name}="${escapeAttr(a.value)}"`)
      .join("");
    if (VOID_TAGS.has(tag)) {
      out += `${pad}<${tag}${attrs}>\n`;
      continue;
    }
    const hasBlockChildren = Array.from(el.children).some((c) =>
      BLOCK_TAGS.has(c.tagName.toLowerCase()),
    );
    if (BLOCK_TAGS.has(tag) && hasBlockChildren) {
      out += `${pad}<${tag}${attrs}>\n`;
      out += serializeChildren(el, depth + 1);
      out += `${pad}</${tag}>\n`;
    } else {
      out += `${pad}<${tag}${attrs}>${el.innerHTML.trim()}</${tag}>\n`;
    }
  }
  return out;
}

function prettyHtml(html: string): string {
  if (!html) return "";
  const container = document.createElement("div");
  container.innerHTML = html;
  return serializeChildren(container, 0).trimEnd();
}

type MapOption = { kind: MapEmbedKind; name: string; slug: string };

/** Cities first, then projects — the editor almost always wants "the map of
 *  this city", and only sometimes a single building. */
async function loadMapOptions(): Promise<MapOption[]> {
  const [{ data: cities }, { data: projects }] = await Promise.all([
    supabase.from("cities").select("name, slug").order("name"),
    supabase.from("projects").select("name, slug").order("name"),
  ]);
  return [
    ...(cities || []).map((c) => ({ kind: "city" as const, name: c.name, slug: c.slug })),
    ...(projects || []).map((p) => ({ kind: "project" as const, name: p.name, slug: p.slug })),
  ];
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Spreadsheet grid → table markup, first row as the header. Fed through
 *  `insertContent` so TipTap builds real table nodes from it. */
function gridToTableHtml({ rows }: TsvGrid): string {
  const [head, ...body] = rows;
  const tr = (cells: string[], tag: "th" | "td") =>
    `<tr>${cells.map((c) => `<${tag}>${escapeHtml(c)}</${tag}>`).join("")}</tr>`;
  return `<table>${tr(head, "th")}${body.map((r) => tr(r, "td")).join("")}</table>`;
}

export default function RichTextEditor({ value, onChange, placeholder, uploadFolder = "content" }: Props) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [htmlBuffer, setHtmlBuffer] = useState(value || "");
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [hoverDims, setHoverDims] = useState<{ rows: number; cols: number } | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // Image uploads. `editorRef` lets the paste/drop handlers — which are wired
  // once, when the editor is created — reach the live editor instance.
  const editorRef = useRef<Editor | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderRef = useRef(uploadFolder);
  folderRef.current = uploadFolder;
  const [pending, setPending] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Map block picker — cities and projects are fetched the first time the
  // picker opens, so an editor that never inserts a map costs nothing.
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapQuery, setMapQuery] = useState("");
  const [mapOptions, setMapOptions] = useState<MapOption[] | null>(null);
  const mapPickerRef = useRef<HTMLDivElement | null>(null);

  /** Uploads each image and drops it into the document. `at` is a document
   *  position (used for drops, so the photo lands where it was released);
   *  without it images go in at the cursor. */
  const insertImages = useCallback(async (files: File[], at?: number) => {
    const ed = editorRef.current;
    if (!ed || files.length === 0) return;
    setUploadError(null);
    setPending((n) => n + files.length);
    let pos = at;
    for (const file of files) {
      try {
        const src = await uploadImage(file, folderRef.current);
        const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
        if (pos == null) {
          ed.chain().focus().setImage({ src, alt }).run();
        } else {
          ed.chain().focus().insertContentAt(pos, { type: "image", attrs: { src, alt } }).run();
          pos += 1; // keep a multi-file drop in the order it was dropped
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Could not upload that image.");
      } finally {
        setPending((n) => n - 1);
      }
    }
  }, []);

  const editor = useEditor({
    extensions: [
      // StarterKit ships its own Link; turn it off so the configured one below
      // is the only one registered. With both, TipTap warns about a duplicate
      // extension and the `openOnClick` / underline settings may not win.
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "underline" } }),
      Image,
      Placeholder.configure({ placeholder: placeholder || "Start writing…" }),
      Table.configure({ resizable: true, HTMLAttributes: { class: "rte-table" } }).extend({
        // Per-table row spacing, stored as data-density on the <table> so it
        // persists in the saved HTML and renders the same on the public site.
        addAttributes() {
          return {
            ...this.parent?.(),
            density: {
              default: null,
              parseHTML: (el) => el.getAttribute("data-density"),
              renderHTML: (attrs) =>
                attrs.density ? { "data-density": attrs.density } : {},
            },
          };
        },
      }),
      TableRow,
      TableHeader.extend({ addAttributes() { return { ...this.parent?.(), ...ROW_HEIGHT_ATTR }; } }),
      TableCell.extend({ addAttributes() { return { ...this.parent?.(), ...ROW_HEIGHT_ATTR }; } }),
      TableRowResize,
      MapEmbed,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left",
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[280px] px-4 py-4 focus:outline-none text-[14px] leading-relaxed text-ink",
      },
      handlePaste: (_view, event) => {
        const data = event.clipboardData;

        // A screenshot or a photo copied from Finder/Explorer: upload it
        // rather than letting the browser inline a huge base64 blob.
        const images = imageFilesFrom(data);
        if (images.length) {
          event.preventDefault();
          void insertImages(images);
          return true;
        }

        // Spreadsheet cells. Excel and Sheets also put an HTML table on the
        // clipboard — that flavour carries the formatting, so let TipTap take
        // it. Only fall back to the tab-separated text when there is no table.
        const html = data?.getData("text/html") || "";
        if (!/<table/i.test(html)) {
          const grid = tsvToGrid(data?.getData("text/plain") || "");
          if (grid) {
            event.preventDefault();
            editorRef.current?.chain().focus().insertContent(gridToTableHtml(grid)).run();
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event, _slice, moved) => {
        // `moved` means the user is dragging content already in the document.
        if (moved) return false;
        const images = imageFilesFrom((event as DragEvent).dataTransfer);
        if (!images.length) return false;
        event.preventDefault();
        const coords = view.posAtCoords({
          left: (event as DragEvent).clientX,
          top: (event as DragEvent).clientY,
        });
        void insertImages(images, coords?.pos);
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    if (mode === "visual" && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, mode]);

  // Close the size picker if the user clicks anywhere outside of it.
  useEffect(() => {
    if (!tablePickerOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!pickerRef.current) return;
      if (!pickerRef.current.contains(e.target as Node)) {
        setTablePickerOpen(false);
        setHoverDims(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [tablePickerOpen]);

  useEffect(() => {
    if (!mapPickerOpen) return;
    if (mapOptions === null) {
      loadMapOptions().then(setMapOptions).catch(() => setMapOptions([]));
    }
    const onDocClick = (e: MouseEvent) => {
      if (mapPickerRef.current && !mapPickerRef.current.contains(e.target as Node)) {
        setMapPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [mapPickerOpen, mapOptions]);

  if (!editor) return null;

  const inTable = editor.isActive("table");

  const switchToHtml = () => {
    setHtmlBuffer(prettyHtml(editor.getHTML()));
    setMode("html");
  };
  const switchToVisual = () => {
    editor.commands.setContent(htmlBuffer || "");
    onChange(htmlBuffer || "");
    setMode("visual");
  };

  return (
    <div className="border hairline bg-background">
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b hairline">
        <Btn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} disabled={mode === "html"}><Bold className="w-3.5 h-3.5" /></Btn>
        <Btn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} disabled={mode === "html"}><Italic className="w-3.5 h-3.5" /></Btn>
        <span className="w-px h-4 bg-border mx-1" />
        <Btn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} disabled={mode === "html"}><Heading2 className="w-3.5 h-3.5" /></Btn>
        <Btn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} disabled={mode === "html"}><Heading3 className="w-3.5 h-3.5" /></Btn>
        <span className="w-px h-4 bg-border mx-1" />
        <Btn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={mode === "html"}><List className="w-3.5 h-3.5" /></Btn>
        <Btn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} disabled={mode === "html"}><ListOrdered className="w-3.5 h-3.5" /></Btn>
        <Btn title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} disabled={mode === "html"}><Quote className="w-3.5 h-3.5" /></Btn>
        <span className="w-px h-4 bg-border mx-1" />
        <Btn title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} disabled={mode === "html"}><AlignLeft className="w-3.5 h-3.5" /></Btn>
        <Btn title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} disabled={mode === "html"}><AlignCenter className="w-3.5 h-3.5" /></Btn>
        <Btn title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} disabled={mode === "html"}><AlignRight className="w-3.5 h-3.5" /></Btn>
        <Btn title="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} disabled={mode === "html"}><AlignJustify className="w-3.5 h-3.5" /></Btn>
        <span className="w-px h-4 bg-border mx-1" />
        <Btn title="Link" active={editor.isActive("link")} disabled={mode === "html"}
          onClick={() => {
            const url = window.prompt("URL", editor.getAttributes("link").href || "https://");
            if (url === null) return;
            if (url === "") editor.chain().focus().unsetLink().run();
            else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}>
          <LinkIcon className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Upload image from your computer" disabled={mode === "html" || pending > 0}
          onClick={() => fileInputRef.current?.click()}>
          {pending > 0 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
        </Btn>
        <Btn title="Insert image from a URL" disabled={mode === "html"}
          onClick={() => {
            const url = window.prompt("Image URL");
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}>
          <ImageIcon className="w-3.5 h-3.5" />
        </Btn>
        <span className="w-px h-4 bg-border mx-1" />
        {/* Insert table — opens a small grid picker so the editor chooses
            the exact rows × cols before inserting. */}
        <div className="relative" ref={pickerRef}>
          <Btn
            title="Insert table"
            active={tablePickerOpen}
            disabled={mode === "html"}
            onClick={() => setTablePickerOpen((o) => !o)}
          >
            <TableIcon className="w-3.5 h-3.5" />
          </Btn>
          {tablePickerOpen && (
            <div
              className="absolute left-0 top-full mt-1 z-50 bg-background border hairline shadow-lg p-3"
              style={{ minWidth: 200 }}
            >
              <p className="text-[11px] text-ink-muted mb-2 text-center tracking-tag uppercase">
                {hoverDims ? `${hoverDims.rows} × ${hoverDims.cols}` : "Pick size"}
              </p>
              <div
                className="grid gap-[2px]"
                style={{ gridTemplateColumns: `repeat(8, 16px)` }}
                onMouseLeave={() => setHoverDims(null)}
              >
                {Array.from({ length: 8 * 8 }).map((_, i) => {
                  const r = Math.floor(i / 8) + 1;
                  const c = (i % 8) + 1;
                  const on = !!hoverDims && r <= hoverDims.rows && c <= hoverDims.cols;
                  return (
                    <button
                      key={i}
                      type="button"
                      onMouseEnter={() => setHoverDims({ rows: r, cols: c })}
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .insertTable({ rows: r, cols: c, withHeaderRow: true })
                          .run();
                        setTablePickerOpen(false);
                        setHoverDims(null);
                      }}
                      className="w-4 h-4 border hairline transition-colors"
                      style={{
                        background: on ? "hsl(var(--ink))" : "transparent",
                        borderColor: on ? "hsl(var(--ink))" : "hsl(var(--border))",
                      }}
                    />
                  );
                })}
              </div>
              <p className="text-[10px] text-ink-muted mt-2 text-center">
                Click to insert
              </p>
            </div>
          )}
        </div>

        {/* Insert a map pinned to a city or a building, right where the
            reader is being told about it. */}
        <div className="relative" ref={mapPickerRef}>
          <Btn
            title="Insert map"
            active={mapPickerOpen || editor.isActive("mapEmbed")}
            disabled={mode === "html"}
            onClick={() => setMapPickerOpen((o) => !o)}
          >
            <MapIcon className="w-3.5 h-3.5" />
          </Btn>
          {mapPickerOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-background border hairline shadow-lg p-2 w-64">
              <input
                autoFocus
                value={mapQuery}
                onChange={(e) => setMapQuery(e.target.value)}
                placeholder="Search cities and projects"
                className="w-full px-2 py-1.5 mb-2 text-[12px] border hairline bg-background text-ink focus:outline-none"
              />
              <div className="max-h-56 overflow-y-auto">
                {mapOptions === null ? (
                  <p className="px-2 py-3 text-[11px] text-ink-muted">Loading…</p>
                ) : (() => {
                  const q = mapQuery.trim().toLowerCase();
                  const matches = q
                    ? mapOptions.filter((o) => o.name.toLowerCase().includes(q))
                    : mapOptions;
                  if (!matches.length) {
                    return <p className="px-2 py-3 text-[11px] text-ink-muted">Nothing matches “{mapQuery}”.</p>;
                  }
                  return matches.slice(0, 60).map((o) => (
                    <button
                      key={`${o.kind}:${o.slug}`}
                      type="button"
                      onClick={() => {
                        editor.chain().focus()
                          .setMapEmbed({ kind: o.kind, slug: o.slug, label: o.name })
                          .run();
                        setMapPickerOpen(false);
                        setMapQuery("");
                      }}
                      className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left text-[12px] text-ink hover:bg-stone"
                    >
                      <span className="truncate">{o.name}</span>
                      <span className="shrink-0 text-[9px] tracking-tag uppercase text-ink-muted">{o.kind}</span>
                    </button>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>
        {inTable && mode === "visual" && (
          <>
            <span className="w-px h-4 bg-border mx-1" />
            <Btn title="Add row above" onClick={() => editor.chain().focus().addRowBefore().run()}>
              <span className="text-[10px] font-mono">R↑</span>
            </Btn>
            <Btn title="Add row below" onClick={() => editor.chain().focus().addRowAfter().run()}>
              <span className="text-[10px] font-mono">R↓</span>
            </Btn>
            <Btn title="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}>
              <span className="text-[10px] font-mono">R✕</span>
            </Btn>
            <Btn title="Add column before" onClick={() => editor.chain().focus().addColumnBefore().run()}>
              <span className="text-[10px] font-mono">C←</span>
            </Btn>
            <Btn title="Add column after" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              <span className="text-[10px] font-mono">C→</span>
            </Btn>
            <Btn title="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()}>
              <span className="text-[10px] font-mono">C✕</span>
            </Btn>
            <Btn title="Toggle header row" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
              <span className="text-[10px] font-mono">H</span>
            </Btn>
            <Btn title="Merge selected cells" onClick={() => editor.chain().focus().mergeCells().run()}>
              <span className="text-[10px] font-mono">M</span>
            </Btn>
            <Btn title="Split cell" onClick={() => editor.chain().focus().splitCell().run()}>
              <span className="text-[10px] font-mono">S</span>
            </Btn>
            <Btn title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
              <Trash2 className="w-3.5 h-3.5" />
            </Btn>
            <span className="w-px h-4 bg-border mx-1" />
            <Btn title="Row spacing: compact" active={editor.getAttributes("table").density === "compact"}
              onClick={() => editor.chain().focus().updateAttributes("table", { density: "compact" }).run()}>
              <span className="text-[10px] font-mono">↕-</span>
            </Btn>
            <Btn title="Row spacing: comfortable" active={!editor.getAttributes("table").density || editor.getAttributes("table").density === "comfortable"}
              onClick={() => editor.chain().focus().updateAttributes("table", { density: "comfortable" }).run()}>
              <span className="text-[10px] font-mono">↕</span>
            </Btn>
            <Btn title="Row spacing: spacious" active={editor.getAttributes("table").density === "spacious"}
              onClick={() => editor.chain().focus().updateAttributes("table", { density: "spacious" }).run()}>
              <span className="text-[10px] font-mono">↕+</span>
            </Btn>
          </>
        )}
        <span className="flex-1" />
        <Btn title={mode === "visual" ? "Edit HTML" : "Visual editor"} active={mode === "html"}
          onClick={() => (mode === "visual" ? switchToHtml() : switchToVisual())}>
          <Code2 className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={mode === "html"}><Undo2 className="w-3.5 h-3.5" /></Btn>
        <Btn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={mode === "html"}><Redo2 className="w-3.5 h-3.5" /></Btn>
      </div>

      {mode === "visual" ? (
        <EditorContent editor={editor} />
      ) : (
        <textarea
          className="w-full min-h-[420px] px-4 py-4 font-mono text-[12px] leading-[1.6] text-ink bg-background focus:outline-none resize-y"
          value={htmlBuffer}
          onChange={(e) => { setHtmlBuffer(e.target.value); onChange(e.target.value); }}
          placeholder="<p>Paste or edit HTML here…</p>"
          spellCheck={false}
        />
      )}

      {/* Images can also be dragged onto the editor or pasted straight from
          the clipboard — the hint keeps that discoverable. */}
      {mode === "visual" && (
        <div className="flex items-center gap-2 px-4 py-2 border-t hairline text-[11px] text-ink-muted">
          {pending > 0 ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              Uploading {pending} image{pending > 1 ? "s" : ""}…
            </>
          ) : uploadError ? (
            <span className="text-destructive">{uploadError}</span>
          ) : (
            <span>Drag images in, or paste them straight from the clipboard.</span>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = "";
          void insertImages(files);
        }}
      />
    </div>
  );
}
