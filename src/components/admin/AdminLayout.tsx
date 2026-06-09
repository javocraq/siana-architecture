import { ReactNode, useEffect, useState } from "react";
import { Link, NavLink, Navigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Building2,
  MapPin,
  BookOpen,
  Library,
  Info,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { useIsMobile } from "@/hooks/use-mobile";

// Match the visible CMS structure. SEO Global lives under Ajustes as a tab,
// not as its own top-level item. Práctica = posts (kind: resource) — kept
// at /admin/practice. Recursos = posts (kind: journal) — restored at
// /admin/journal under a Spanish label.
const navItems = [
  { to: "/admin/projects", label: "Proyectos", icon: Building2 },
  { to: "/admin/cities", label: "Ciudades", icon: MapPin },
  { to: "/admin/practice", label: "Práctica", icon: BookOpen },
  { to: "/admin/journal", label: "Recursos", icon: Library },
  { to: "/admin/about", label: "About", icon: Info },
];

const SIDEBAR_W = 240;
const SIDEBAR_W_COLLAPSED = 68;
const COLLAPSED_KEY = "siana.admin.sidebar.collapsed";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { loading, user, isAdmin } = useAdmin();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Desktop collapse state, persisted across sessions.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  });
  useEffect(() => {
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Mobile drawer open state.
  const [mobileOpen, setMobileOpen] = useState(false);
  // Close drawer whenever the route changes.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  // Hover-expansion on desktop: while the cursor sits over a collapsed
  // sidebar, peek the full menu without committing to expanded width.
  const [hovered, setHovered] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-[11px] tracking-tag uppercase text-ink-faint">Loading…</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // On mobile the sidebar slides in from the left as a full-width drawer.
  // On desktop it stays pinned and can be collapsed to an icon rail. While
  // hovered it temporarily peeks out to full width overlaying the content.
  const expandedByHover = collapsed && hovered && !isMobile;
  const sidebarWidth = isMobile
    ? 260
    : collapsed && !hovered
      ? SIDEBAR_W_COLLAPSED
      : SIDEBAR_W;
  const sidebarTranslate = isMobile && !mobileOpen ? "-100%" : "0";
  // Main content margin reflects the *committed* collapsed state — when
  // we peek on hover, the sidebar overlays the content instead of pushing it.
  const mainOffset = isMobile ? 0 : collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W;
  // Visual "expanded" state used to decide which content is rendered.
  const showExpanded = !(collapsed && !isMobile) || expandedByHover;

  return (
    <>
      <Helmet>
        <title>Siana Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="min-h-screen bg-paper-warm">
        {/* Mobile top bar — hamburger to open drawer + wordmark */}
        {isMobile && (
          <div
            className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-5 h-[56px]"
            style={{
              background: "hsl(var(--paper))",
              borderBottom: "1px solid hsl(var(--paper-mid))",
            }}
          >
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="p-2 -ml-2 text-ink"
            >
              <Menu className="w-4 h-4" />
            </button>
            <Link to="/admin/projects" className="font-logo text-ink leading-none" style={{ fontSize: "1.2rem" }}>
              siana
            </Link>
            <span style={{ width: 24 }} />
          </div>
        )}

        {/* Backdrop on mobile when drawer is open */}
        {isMobile && mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-ink/30"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className="fixed top-0 left-0 bottom-0 flex flex-col z-40 transition-[width,transform] duration-300 ease-out"
          style={{
            width: sidebarWidth,
            transform: `translateX(${sidebarTranslate})`,
            background: "hsl(var(--paper))",
            borderRight: "1px solid hsl(var(--paper-mid))",
            boxShadow: expandedByHover ? "0 12px 36px rgba(0,0,0,0.08)" : "none",
          }}
          onMouseEnter={() => !isMobile && setHovered(true)}
          onMouseLeave={() => !isMobile && setHovered(false)}
        >
          {/* Header — wordmark + (desktop) toggle button or (mobile) close */}
          <div
            className="flex items-center justify-between pt-6 pb-5"
            style={{
              borderBottom: "1px solid hsl(var(--paper-mid))",
              paddingLeft: showExpanded ? 28 : 0,
              paddingRight: showExpanded ? 16 : 0,
              justifyContent: showExpanded ? "space-between" : "center",
            }}
          >
            {showExpanded && (
              <div>
                <Link to="/admin/projects" className="font-logo text-ink leading-none block" style={{ fontSize: "1.6rem" }}>
                  siana
                </Link>
                <p
                  className="font-mono uppercase text-ink-soft mt-2 font-semibold"
                  style={{ fontSize: 10, letterSpacing: "0.28em" }}
                >
                  Admin
                </p>
              </div>
            )}
            {isMobile ? (
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-2 text-ink-soft hover:text-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
                className="p-2 text-ink-soft hover:text-ink transition-colors"
                title={collapsed ? "Expandir" : "Colapsar"}
              >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 py-5 overflow-y-auto no-scrollbar">
            {navItems.map((item) => {
              const onSettings =
                item.to === "/admin/settings" &&
                (location.pathname.startsWith("/admin/settings") ||
                  location.pathname.startsWith("/admin/seo"));
              const Icon = item.icon;
              const showLabel = showExpanded;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/admin/settings"}
                  onClick={() => {
                    // Auto-collapse the sidebar after picking a section so
                    // the main content gets the full width. We persist the
                    // flag synchronously — the next page mounts a fresh
                    // AdminLayout instance and would otherwise miss the
                    // state update from the unmounted layout.
                    if (!isMobile) {
                      window.localStorage.setItem(COLLAPSED_KEY, "1");
                      setCollapsed(true);
                    }
                  }}
                  className={({ isActive }) =>
                    `relative flex items-center font-mono uppercase py-2.5 transition-all hover:bg-black/[0.03] hover:shadow-[0_1px_4px_rgba(0,0,0,0.04)] ${
                      isActive || onSettings ? "text-ink" : "text-ink-soft hover:text-ink"
                    }`
                  }
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    fontWeight: 500,
                    paddingLeft: showLabel ? 28 : 0,
                    paddingRight: showLabel ? 28 : 0,
                    justifyContent: showLabel ? "flex-start" : "center",
                    gap: 12,
                  }}
                  title={!showLabel ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {(isActive || onSettings) && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5"
                          style={{ background: "hsl(var(--ink))" }}
                        />
                      )}
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      {showLabel && <span>{item.label}</span>}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer — Ajustes + Cerrar sesión live here, separated from the
              main nav so the sidebar reads as "content / settings". */}
          <div
            style={{
              borderTop: "1px solid hsl(var(--paper-mid))",
              padding: showExpanded ? "12px 0 20px" : "12px 0",
            }}
          >
            {/* Ajustes — styled exactly like the other nav items */}
            {(() => {
              const onSettings =
                location.pathname.startsWith("/admin/settings") ||
                location.pathname.startsWith("/admin/seo");
              return (
                <NavLink
                  to="/admin/settings"
                  end
                  onClick={() => {
                    if (!isMobile) {
                      window.localStorage.setItem(COLLAPSED_KEY, "1");
                      setCollapsed(true);
                    }
                  }}
                  className={`relative flex items-center font-mono uppercase py-2.5 transition-all hover:bg-black/[0.03] hover:shadow-[0_1px_4px_rgba(0,0,0,0.04)] ${
                    onSettings ? "text-ink" : "text-ink-soft hover:text-ink"
                  }`}
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    fontWeight: 500,
                    paddingLeft: showExpanded ? 28 : 0,
                    paddingRight: showExpanded ? 28 : 0,
                    justifyContent: showExpanded ? "flex-start" : "center",
                    gap: 12,
                  }}
                  title={!showExpanded ? "Ajustes" : undefined}
                >
                  {onSettings && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5"
                      style={{ background: "hsl(var(--ink))" }}
                    />
                  )}
                  <SettingsIcon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  {showExpanded && <span>Ajustes</span>}
                </NavLink>
              );
            })()}

            {/* User block + sign out */}
            {!showExpanded ? (
              <button
                onClick={signOut}
                className="w-full font-mono uppercase text-ink-soft hover:text-ink transition-colors flex items-center justify-center py-2 mt-2"
                style={{ fontSize: 10, letterSpacing: "0.18em" }}
                title="Cerrar sesión"
              >
                ⎋
              </button>
            ) : (
              <div className="px-7 mt-4">
                <Link
                  to="/"
                  className="font-mono uppercase text-ink-soft hover:text-ink transition-colors block mb-3"
                  style={{ fontSize: 10, letterSpacing: "0.22em" }}
                >
                  ← Back to site
                </Link>
                <p className="text-[11px] font-light text-ink-soft truncate">{user.email}</p>
                <button
                  onClick={signOut}
                  className="mt-2 font-mono uppercase text-ink-soft hover:text-ink transition-colors"
                  style={{ fontSize: 10, letterSpacing: "0.22em" }}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <main
          className="min-h-screen transition-[margin-left] duration-300 ease-out"
          style={{ marginLeft: mainOffset, paddingTop: isMobile ? 56 : 0 }}
        >
          {children}
        </main>
      </div>
    </>
  );
}
