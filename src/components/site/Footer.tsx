export default function Footer() {
  return (
    <footer
      className="bg-paper flex items-center justify-between"
      style={{ padding: "2rem 2.5rem", borderTop: "1px solid hsl(var(--paper-mid))" }}
    >
      <div className="font-logo text-warm-gray" style={{ fontSize: "1rem" }}>
        siana
      </div>
      <div
        className="font-mono uppercase"
        style={{ fontSize: "0.48rem", letterSpacing: "0.15em", color: "hsl(var(--paper-mid))" }}
      >
        © {new Date().getFullYear()} · Architecture, city by city
      </div>
    </footer>
  );
}
