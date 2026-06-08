import { Link } from "react-router-dom";

export default function CtaStrip() {
  return (
    <section
      className="bg-paper-warm flex items-center justify-between gap-8 flex-wrap"
      style={{
        borderTop: "1px solid hsl(var(--paper-mid))",
        padding: "5rem 2.5rem",
      }}
    >
      <div className="max-w-[640px]">
        <p
          className="font-mono uppercase text-accent-terra mb-4 font-medium"
          style={{ fontSize: "12px", letterSpacing: "0.22em" }}
        >
          Explore
        </p>
        <h2
          className="font-display-black text-ink"
          style={{ fontSize: "clamp(2rem, 4vw, 4rem)", lineHeight: 0.94 }}
        >
          Architecture is everywhere. <em className="italic">Start looking.</em>
        </h2>
      </div>
      <Link
        to="/cities"
        className="font-mono uppercase inline-flex items-center gap-3 text-white hover:gap-4 transition-all font-medium"
        style={{
          background: "hsl(var(--accent))",
          padding: "1.2rem 2.2rem",
          fontSize: "14px",
          letterSpacing: "0.16em",
          borderRadius: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(var(--ink))")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "hsl(var(--accent))")}
      >
        Explore the cities →
      </Link>
    </section>
  );
}
