import Reveal from "@/components/site/Reveal";
import EditorialButton from "@/components/site/EditorialButton";
import { useHomeContent } from "@/hooks/useHomeContent";
import { sanitizeInline } from "@/lib/inlineHtml";

/**
 * Where readers subscribe, in the footer of every page.
 *
 * Sign-up happens on Substack itself. Subscribing from a form here needs
 * Substack's own subscribe endpoint, which refuses server-to-server calls
 * (HTTP 403 from their edge — it is not a public API), so the alternatives
 * were an unstyleable Substack iframe or sending the reader to the
 * publication. This is the second, chosen deliberately for its simplicity.
 */
const SUBSTACK_URL =
  "https://sianaarchitecture.substack.com/?r=8l6ahp&utm_campaign=pub-share-checklist";

export default function NewsletterCta() {
  const content = useHomeContent();

  return (
    <section
      className="py-20 md:py-28"
      style={{
        background: "#F4F4F4",
        borderTop: "1px solid hsl(var(--paper-mid))",
      }}
    >
      <div className="mx-auto grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-x-16 gap-y-12 max-w-[1400px] px-6 lg:px-10">
        {/* Left — editorial intro, same hierarchy as other home sections */}
        <Reveal className="flex flex-col text-center md:text-left items-center md:items-start">
          <p
            className="font-mono uppercase text-accent-terra mb-5 font-semibold"
            style={{ fontSize: "13px", letterSpacing: "0.22em" }}
          >
            {content.newsletter.eyebrow}
          </p>
          <h2
            className="font-display-black text-ink [&_em]:italic"
            style={{ fontSize: "clamp(1.6rem, 2.8vw, 2.6rem)", lineHeight: 1.05 }}
            dangerouslySetInnerHTML={{ __html: sanitizeInline(content.newsletter.headline) }}
          />
          <p
            className="font-mono text-ink-soft mt-6 md:mt-8 [&_em]:italic [&_strong]:font-semibold"
            style={{ fontSize: "15px", lineHeight: 1.7, maxWidth: 420, letterSpacing: "0.01em" }}
            dangerouslySetInnerHTML={{ __html: sanitizeInline(content.newsletter.description) }}
          />
        </Reveal>

        {/* Right — the call to action. Opens in a new tab so the reader does
            not lose the page they were on. */}
        <Reveal
          delay={160}
          className="flex flex-col justify-center items-center md:items-start"
        >
          <EditorialButton href={SUBSTACK_URL} target="_blank" arrow>
            Subscribe on Substack
          </EditorialButton>
        </Reveal>
      </div>
    </section>
  );
}
