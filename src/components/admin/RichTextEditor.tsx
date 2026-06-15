import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote,
  Link as LinkIcon, Image as ImageIcon, Undo2, Redo2, Code2,
  Table as TableIcon, Trash2,
} from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [htmlBuffer, setHtmlBuffer] = useState(value || "");
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [hoverDims, setHoverDims] = useState<{ rows: number; cols: number } | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "underline" } }),
      Image,
      Placeholder.configure({ placeholder: placeholder || "Start writing…" }),
      Table.configure({ resizable: true, HTMLAttributes: { class: "rte-table" } }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[280px] px-4 py-4 focus:outline-none text-[14px] leading-relaxed text-ink",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

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

  if (!editor) return null;

  const Btn = ({ active, onClick, children, title, disabled }: { active?: boolean; onClick: () => void; children: React.ReactNode; title: string; disabled?: boolean }) => (
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

  const inTable = editor.isActive("table");

  const switchToHtml = () => {
    setHtmlBuffer(editor.getHTML());
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
        <Btn title="Link" active={editor.isActive("link")} disabled={mode === "html"}
          onClick={() => {
            const url = window.prompt("URL", editor.getAttributes("link").href || "https://");
            if (url === null) return;
            if (url === "") editor.chain().focus().unsetLink().run();
            else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}>
          <LinkIcon className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Image URL" disabled={mode === "html"}
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
          className="w-full min-h-[280px] px-4 py-4 font-mono text-[12px] text-ink bg-background focus:outline-none resize-y"
          value={htmlBuffer}
          onChange={(e) => { setHtmlBuffer(e.target.value); onChange(e.target.value); }}
          placeholder="<p>Paste or edit HTML here…</p>"
          spellCheck={false}
        />
      )}
    </div>
  );
}
