import DOMPurify from "dompurify";
import { useEffect, useRef } from "react";

type Props = {
  html: string;
  className?: string;
};

/**
 * Renders sanitized HTML content from the rich text editor.
 * Wrap in a `prose` container so headings/lists/tables get sensible defaults.
 *
 * Every <table> is moved into a `.rt-table` scroll container (see index.css)
 * so wide data tables can break out of the reading column and scroll instead
 * of being clipped, while small tables stay centred at their natural width.
 * Applies everywhere RichHtml is used — articles, project and city copy.
 */
export default function RichHtml({ html, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const clean = html ? DOMPurify.sanitize(html, { ADD_ATTR: ["target", "rel"] }) : "";

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll("table").forEach((table) => {
      if (table.parentElement?.classList.contains("rt-table")) return;
      const wrap = document.createElement("div");
      wrap.className = "rt-table";
      table.parentNode?.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }, [clean]);

  if (!clean) return null;
  return (
    <div
      ref={ref}
      className={`prose prose-stone max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
