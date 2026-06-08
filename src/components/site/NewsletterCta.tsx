import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const INTERESTS = [
  "Architecture Guides",
  "Architectural Stays",
  "Resources for Architects",
  "AI for Architects",
  "City Guides",
  "Architectural Travel",
] as const;

export default function NewsletterCta() {
  const { toast } = useToast();
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
      className="bg-paper"
      style={{
        padding: "7rem 2.5rem",
        borderTop: "1px solid hsl(var(--paper-mid))",
      }}
    >
      <div
        className="mx-auto grid gap-x-16 gap-y-12"
        style={{
          maxWidth: 1400,
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)",
        }}
      >
        {/* Left — editorial intro, same hierarchy as other home sections */}
        <div className="flex flex-col">
          <p
            className="font-mono uppercase text-accent-terra mb-5 font-semibold"
            style={{ fontSize: "13px", letterSpacing: "0.22em" }}
          >
            Stay in Touch
          </p>
          <h2
            className="font-display-black text-ink"
            style={{ fontSize: "clamp(2rem, 4vw, 4rem)", lineHeight: 0.94 }}
          >
            The journal,<br />
            <em className="italic text-accent-terra">in your inbox.</em>
          </h2>
          <p
            className="font-mono text-ink-soft mt-8"
            style={{ fontSize: "15px", lineHeight: 1.7, maxWidth: 420, letterSpacing: "0.01em" }}
          >
            Sign up for our newsletter to receive curated architecture
            discoveries, city guides, and resources for architects.
          </p>
        </div>

        {/* Right — form */}
        <form onSubmit={onSubmit} className="flex flex-col">
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

          <button
            type="submit"
            disabled={submitting}
            className="self-start font-mono uppercase inline-flex items-center text-white transition-all font-semibold disabled:opacity-60"
            style={{
              background: "hsl(var(--ink))",
              padding: "1.1rem 2rem",
              fontSize: "14px",
              letterSpacing: "0.16em",
              borderRadius: 0,
              gap: "0.7rem",
            }}
            onMouseEnter={(e) => {
              if (submitting) return;
              e.currentTarget.style.background = "hsl(var(--accent))";
              e.currentTarget.style.gap = "1rem";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "hsl(var(--ink))";
              e.currentTarget.style.gap = "0.7rem";
            }}
          >
            {submitting ? "Signing up…" : "Sign Up →"}
          </button>
        </form>
      </div>
    </section>
  );
}
