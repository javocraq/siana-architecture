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
 * Each <table> is moved into a `.rt-table` container (see index.css). A table
 * that fits the reading column stays there (centred at its content width); a
 * table too wide to fit gets `.is-wide`, which breaks it out near full-viewport
 * width so every column shows at once — no clipping, no horizontal scroll.
 * Re-measured on resize and after fonts load, and applied to every place
 * RichHtml is used (articles, project and city copy) and future posts.
 */
export default function RichHtml({ html, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const clean = html ? DOMPurify.sanitize(html, { ADD_ATTR: ["target", "rel"] }) : "";

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // Move each table into a `.rt-table` wrapper (idempotent).
    const wraps: HTMLElement[] = [];
    root.querySelectorAll("table").forEach((table) => {
      let wrap = table.parentElement as HTMLElement | null;
      if (!wrap || !wrap.classList.contains("rt-table")) {
        wrap = document.createElement("div");
        wrap.className = "rt-table";
        table.parentNode?.insertBefore(wrap, table);
        wrap.appendChild(table);
      }
      wraps.push(wrap);
    });

    // Flag the tables that can't fit the reading column so they break out wide.
    // Measure against the column baseline (without `.is-wide`) each time.
    const evaluate = () => {
      wraps.forEach((wrap) => {
        const table = wrap.querySelector("table") as HTMLElement | null;
        if (!table) return;
        wrap.classList.remove("is-wide");
        if (table.offsetWidth > wrap.clientWidth + 1) wrap.classList.add("is-wide");
      });
    };

    let raf = requestAnimationFrame(evaluate);
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(evaluate);
    };
    window.addEventListener("resize", onResize);
    (document as any).fonts?.ready?.then(evaluate).catch(() => {});

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
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
