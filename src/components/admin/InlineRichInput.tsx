import { useEffect, useRef } from "react";
import { Bold, Italic } from "lucide-react";
import { sanitizeInline } from "@/lib/inlineHtml";

/**
 * A tiny single-line rich-text field for editorial headlines. It offers only
 * three controls — bold, italic and a terracotta accent — matching the
 * emphasis vocabulary of the public site. Selection is styled inline and the
 * value is stored as sanitized HTML.
 *
 * It is intentionally *uncontrolled* after mount: the initial `value` seeds the
 * DOM once, then edits flow out through `onChange`. Re-syncing innerHTML on
 * every render would fight the caret. Enter is suppressed so a headline stays
 * on one line and can't accumulate block markup.
 */
export default function InlineRichInput({
  value,
  onChange,
  ariaLabel,
  placeholder,
  multiline = false,
}: {
  value: string;
  onChange: (html: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  /** Allow line breaks (Enter inserts a <br>). Off = single-line headline. */
  multiline?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Seed the editor once on mount (the parent form only renders fields after
  // its async load, so `value` is already the real content here).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    if (ref.current) onChange(sanitizeInline(ref.current.innerHTML));
  };

  const runCommand = (cmd: "bold" | "italic") => {
    ref.current?.focus();
    document.execCommand(cmd);
    emit();
  };

  // Wrap the current selection in a terracotta span, or unwrap it if the
  // selection already sits inside one (toggle behaviour).
  const toggleTerracotta = () => {
    const root = ref.current;
    const sel = window.getSelection();
    if (!root || !sel || sel.rangeCount === 0) return;

    let node: Node | null = sel.anchorNode;
    let existing: HTMLElement | null = null;
    while (node && node !== root) {
      if (node instanceof HTMLElement && node.classList.contains("text-accent-terra")) {
        existing = node;
        break;
      }
      node = node.parentNode;
    }

    if (existing) {
      const parent = existing.parentNode;
      if (parent) {
        while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
        parent.removeChild(existing);
      }
    } else {
      const range = sel.getRangeAt(0);
      if (range.collapsed) return;
      const span = document.createElement("span");
      span.className = "text-accent-terra";
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }
    root.normalize();
    root.focus();
    emit();
  };

  return (
    <div>
      <div className="flex items-center gap-1 mb-2">
        <ToolbarButton onClick={() => runCommand("bold")} title="Bold">
          <Bold className="w-3.5 h-3.5" strokeWidth={2.4} />
        </ToolbarButton>
        <ToolbarButton onClick={() => runCommand("italic")} title="Italic">
          <Italic className="w-3.5 h-3.5" strokeWidth={2.2} />
        </ToolbarButton>
        <ToolbarButton onClick={toggleTerracotta} title="Terracotta accent">
          <span
            className="text-accent-terra"
            style={{ fontWeight: 700, fontSize: 13, lineHeight: 1, fontFamily: "Georgia, serif" }}
          >
            A
          </span>
        </ToolbarButton>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // Single-line headlines never break; multiline descriptions insert
            // a <br> (not a new block, which the sanitizer would strip).
            e.preventDefault();
            if (multiline) {
              document.execCommand("insertLineBreak");
              emit();
            }
          }
        }}
        className="w-full bg-transparent text-ink border border-paper-mid rounded-md px-3 py-2 leading-relaxed focus:outline-none focus:border-ink/40 empty:before:content-[attr(data-placeholder)] empty:before:text-ink-faint"
        style={{ fontSize: 15, minHeight: multiline ? 84 : 40 }}
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      // Keep the caret/selection in the editor when the button is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-paper-mid text-ink-soft hover:text-ink hover:bg-paper-warm transition-colors"
    >
      {children}
    </button>
  );
}
