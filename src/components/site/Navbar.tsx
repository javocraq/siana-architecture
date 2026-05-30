import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navLinks = [
  { to: "/", label: "Map" },
  { to: "/cities", label: "Cities" },
  { to: "/journal", label: "Journal" },
  { to: "/resources", label: "RESOURCES FOR ARCHITECTS" },
  { to: "/about", label: "About" },
];


export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 nav-frost">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10 h-[60px] flex items-center justify-between">
          <Link
            to="/"
            className="font-logo text-ink hover:opacity-80 transition-opacity"
            style={{ fontSize: "1.15rem" }}
          >
            siana
          </Link>

          <nav className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => {
              const active = link.to === "/" ? location.pathname === "/" : location.pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "font-mono uppercase transition-opacity",
                    active ? "opacity-100" : "opacity-60 hover:opacity-100"
                  )}
                  style={{
                    fontSize: "0.6rem",
                    letterSpacing: "0.18em",
                    color: "hsl(var(--ink-soft))",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <button
            className="md:hidden p-2 -mr-2 text-ink"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1">
              <line x1="2" y1="6" x2="18" y2="6" />
              <line x1="2" y1="14" x2="18" y2="14" />
            </svg>
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-paper flex flex-col fade-in">
          <div className="flex items-center justify-between h-[60px] px-6">
            <Link to="/" className="font-logo text-ink" style={{ fontSize: "1.15rem" }}>
              siana
            </Link>
            <button
              className="p-2 -mr-2 text-ink"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1">
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 flex flex-col items-start justify-center gap-8 px-10">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="font-display text-[40px] text-ink hover:opacity-60"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
