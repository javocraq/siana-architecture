import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Reveal from "@/components/site/Reveal";
import EditorialButton from "@/components/site/EditorialButton";
import { useHomeContent } from "@/hooks/useHomeContent";
import { sanitizeInline } from "@/lib/inlineHtml";
import { supabase } from "@/integrations/supabase/client";

export default function NewsletterCta() {
  const { toast } = useToast();
  const content = useHomeContent();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot — see the hidden field
  const [submitting, setSubmitting] = useState(false);

  /**
   * Posts to the `newsletter-subscribe` Edge Function, which stores the address
   * and hands it to Substack. Subscribing happens here — the reader is never
   * sent off to substack.com.
   */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke("newsletter-subscribe", {
      body: {
        email: email.trim(),
        name: name.trim() || null,
        source: window.location.pathname,
        company,
      },
    });
    setSubmitting(false);

    // Keep what they typed on failure so the retry is one click, not a retype.
    if (error || !(data as { ok?: boolean } | null)?.ok) {
      toast({
        title: "That didn't go through.",
        description: "Please check the address and try again.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "You're on the list.",
      description: "Check your inbox to confirm your subscription.",
    });
    setName("");
    setEmail("");
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
        {/* Just name + email: the fewer fields between a reader and the list,
            the more of them finish. `justify-center` keeps the short form
            optically aligned with the intro copy in the column beside it. */}
        <form onSubmit={onSubmit} className="flex flex-col justify-center w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mb-10">
            <div>
              <label
                htmlFor="newsletter-name"
                className="font-mono uppercase text-ink-soft mb-2 block font-medium"
                style={{ fontSize: "11px", letterSpacing: "0.22em" }}
              >
                Name
              </label>
              <input
                id="newsletter-name"
                type="text"
                autoComplete="name"
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
                htmlFor="newsletter-email"
                className="font-mono uppercase text-ink-soft mb-2 block font-medium"
                style={{ fontSize: "11px", letterSpacing: "0.22em" }}
              >
                E-Mail
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                autoComplete="email"
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

          {/* Honeypot: off-screen and skipped by keyboard and screen readers,
              so only a bot filling every field will trip it. */}
          <input
            type="text"
            name="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute w-px h-px -left-[9999px] opacity-0"
          />

          <EditorialButton type="submit" disabled={submitting} arrow className="self-center md:self-start">
            {submitting ? "Subscribing…" : "Subscribe"}
          </EditorialButton>
        </form>
        </Reveal>
      </div>
    </section>
  );
}
