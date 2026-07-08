import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Reveal from "@/components/site/Reveal";
import EditorialButton from "@/components/site/EditorialButton";
import { useHomeContent } from "@/hooks/useHomeContent";
import { sanitizeInline } from "@/lib/inlineHtml";

const INTERESTS = [
  "Architecture Guides",
  "Architectural Stays",
  "Practice",
  "AI for Architects",
  "City Guides",
  "Architectural Travel",
] as const;

export default function NewsletterCta() {
  const { toast } = useToast();
  const content = useHomeContent();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleInterest = (i: string) =>
    setInterests((curr) => (curr.includes(i) ? curr.filter((x) => x !== i) : [...curr, i]));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    // Backend wiring (e.g. Supabase newsletter_subscribers table) can be
    // added later — keep the UX intact in the meantime.
    await new Promise((r) => setTimeout(r, 350));
    setSubmitting(false);
    toast({ title: "You're on the list.", description: "Thanks for signing up — we'll be in touch." });
    setName("");
    setEmail("");
    setInterests([]);
  };

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

        {/* Right — form */}
        <Reveal delay={160} className="flex">
        <form onSubmit={onSubmit} className="flex flex-col w-full">
          <p
            className="font-mono uppercase text-ink-soft mb-4 font-medium"
            style={{ fontSize: "11px", letterSpacing: "0.22em" }}
          >
            I'm interested in
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mb-10">
            {INTERESTS.map((label) => {
              const checked = interests.includes(label);
              return (
                <label
                  key={label}
                  className="flex items-center gap-3 cursor-pointer text-ink-soft hover:text-ink transition-colors"
                  style={{ fontSize: "14px" }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleInterest(label)}
                    className="w-3.5 h-3.5 accent-accent-terra cursor-pointer"
                    style={{ borderRadius: 0 }}
                  />
                  <span style={{ lineHeight: 1.4 }}>{label}</span>
                </label>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mb-10">
            <div>
              <label
                className="font-mono uppercase text-ink-soft mb-2 block font-medium"
                style={{ fontSize: "11px", letterSpacing: "0.22em" }}
              >
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-ink focus:outline-none focus:border-ink transition-colors py-2"
                style={{
                  borderBottom: "1px solid hsl(var(--paper-mid))",
                  fontSize: "15px",
                }}
              />
            </div>
            <div>
              <label
                className="font-mono uppercase text-ink-soft mb-2 block font-medium"
                style={{ fontSize: "11px", letterSpacing: "0.22em" }}
              >
                E-Mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-ink focus:outline-none focus:border-ink transition-colors py-2"
                style={{
                  borderBottom: "1px solid hsl(var(--paper-mid))",
                  fontSize: "15px",
                }}
              />
            </div>
          </div>

          <EditorialButton type="submit" disabled={submitting} arrow className="self-center md:self-start">
            {submitting ? "Subscribing…" : "Subscribe"}
          </EditorialButton>
        </form>
        </Reveal>
      </div>
    </section>
  );
}
