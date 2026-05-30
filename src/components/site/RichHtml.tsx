import DOMPurify from "dompurify";

type Props = {
  html: string;
  className?: string;
};

/**
 * Renders sanitized HTML content from the rich text editor.
 * Wrap in a `prose` container so headings/lists/tables get sensible defaults.
 */
export default function RichHtml({ html, className = "" }: Props) {
  if (!html) return null;
  const clean = DOMPurify.sanitize(html, {
    ADD_ATTR: ["target", "rel"],
  });
  return (
    <div
      className={`prose prose-stone max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
