export default function Footer() {
  return (
    <footer
      className="bg-paper flex items-center justify-between"
      style={{ padding: "2rem 2.5rem", borderTop: "1px solid hsl(var(--paper-mid))" }}
    >
      <div className="font-logo text-ink-soft" style={{ fontSize: "1.15rem" }}>
        siana
      </div>
      <div
        className="font-mono uppercase"
        style={{ fontSize: "13px", letterSpacing: "0.14em", color: "hsl(var(--ink-soft))" }}
      >
        © {new Date().getFullYear()} · Architecture, city by city
      </div>
    </footer>
  );
}
