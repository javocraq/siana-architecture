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
      className="bg-paper-warm"
      style={{
        padding: "7rem 2.5rem",
        borderTop: "1px solid hsl(var(--paper-mid))",
      }}
    >
      <div className="mx-auto flex flex-col items-center text-center" style={{ maxWidth: 560 }}>
        <p
          className="font-mono uppercase text-accent-terra font-semibold"
          style={{ fontSize: "12px", letterSpacing: "0.28em" }}
        >
          Stay in Touch
        </p>

        <p
          className="font-display italic text-ink-soft mt-6"
          style={{ fontSize: "18px", lineHeight: 1.55 }}
        >
          Sign up for our newsletter to receive curated architecture
          discoveries, city guides, and resources for architects.
        </p>

        <form onSubmit={onSubmit} className="w-full flex flex-col items-center mt-12">
          <p
            className="self-start font-mono uppercase text-ink-soft mb-4 font-medium"
            style={{ fontSize: "11px", letterSpacing: "0.22em" }}
          >
            I'm interested in
          </p>
          <div className="self-start w-full grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mb-12">
            {INTERESTS.map((label) => {
              const checked = interests.includes(label);
              return (
                <label
                  key={label}
                  className="flex items-center gap-3 cursor-pointer text-left text-ink-soft hover:text-ink transition-colors"
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

          <div className="w-full mb-5">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="w-full bg-transparent text-center text-ink placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors py-2.5"
              style={{
                borderBottom: "1px solid hsl(var(--paper-mid))",
                fontSize: "15px",
                letterSpacing: "0.02em",
              }}
            />
          </div>

          <div className="w-full mb-10">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-Mail"
              className="w-full bg-transparent text-center text-ink placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors py-2.5"
              style={{
                borderBottom: "1px solid hsl(var(--paper-mid))",
                fontSize: "15px",
                letterSpacing: "0.02em",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="font-mono uppercase text-ink hover:bg-ink hover:text-paper transition-colors disabled:opacity-60 font-medium"
            style={{
              border: "1px solid hsl(var(--ink))",
              padding: "0.9rem 2.6rem",
              fontSize: "12px",
              letterSpacing: "0.22em",
              background: "transparent",
              borderRadius: 0,
            }}
          >
            {submitting ? "Signing up…" : "Sign Up"}
          </button>
        </form>
      </div>
    </section>
  );
}
