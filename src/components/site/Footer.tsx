export default function Footer() {
  return (
    <footer
      className="bg-paper"
      style={{ paddingTop: "2rem", paddingBottom: "2rem", borderTop: "1px solid hsl(var(--paper-mid))" }}
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 flex flex-col md:flex-row items-center md:justify-between gap-3 md:gap-0 text-center md:text-left">
        <div className="font-logo text-ink-soft" style={{ fontSize: "1.15rem" }}>
          siana
        </div>
        <div
          className="font-mono uppercase"
          style={{ fontSize: "12px", letterSpacing: "0.14em", color: "hsl(var(--ink-soft))" }}
        >
          © {new Date().getFullYear()} · Architecture, city by city
        </div>
      </div>
    </footer>
  );
}
