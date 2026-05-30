import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { useEffect, useState } from "react";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote,
  Link as LinkIcon, Image as ImageIcon, Undo2, Redo2, Code2,
  Table as TableIcon, Rows, Columns, Trash2,
} from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [htmlBuffer, setHtmlBuffer] = useState(value || "");

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
        <Btn title="Insert table" disabled={mode === "html"}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <TableIcon className="w-3.5 h-3.5" />
        </Btn>
        {inTable && mode === "visual" && (
          <>
            <Btn title="Add row below" onClick={() => editor.chain().focus().addRowAfter().run()}><Rows className="w-3.5 h-3.5" /></Btn>
            <Btn title="Add column right" onClick={() => editor.chain().focus().addColumnAfter().run()}><Columns className="w-3.5 h-3.5" /></Btn>
            <Btn title="Toggle header row" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>H</Btn>
            <Btn title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}><Trash2 className="w-3.5 h-3.5" /></Btn>
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
