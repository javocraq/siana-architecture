import { ReactNode, useEffect, useState } from "react";
import { Link, NavLink, Navigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  LayoutDashboard,
  Building2,
  MapPin,
  BookOpen,
  Info,
  Home as HomeIcon,
  Settings as SettingsIcon,
  Tags,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// Pretty-print an email as a display name: "daniela@sianamarketing.com" ->
// "Daniela". Falls back to the raw email when the local part is empty.
function displayNameFromEmail(email: string | null | undefined) {
  if (!email) return "Admin";
  const local = email.split("@")[0] || email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

// Match the visible CMS structure. SEO Global lives under Settings as a tab,
// not as its own top-level item. Practice unifies the former Practice + Resources
// — all posts share /admin/practice regardless of their legacy `kind` value.
const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/home", label: "Home", icon: HomeIcon },
  { to: "/admin/projects", label: "Projects", icon: Building2 },
  { to: "/admin/cities", label: "Cities", icon: MapPin },
  { to: "/admin/practice", label: "Practice", icon: BookOpen },
  { to: "/admin/about", label: "About", icon: Info },
  { to: "/admin/taxonomies", label: "Categories", icon: Tags },
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

  // User-menu open state. We pin the sidebar's "expanded" treatment to this
  // because Radix portals the dropdown outside the <aside>; the moment the
  // cursor moves onto the portaled menu it leaves the sidebar, `hovered`
  // flips back to false, the trigger unmounts, and Radix closes the menu —
  // an open/close loop. Treating menuOpen as another reason to stay
  // expanded breaks that cycle.
  const [menuOpen, setMenuOpen] = useState(false);

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
  // hovered it temporarily expands to full width and shifts the main
  // content with it — same visual behaviour as the committed expanded
  // state, so the list/table never gets hidden under the sidebar.
  const peekOpen = hovered || menuOpen;
  const expandedByHover = collapsed && peekOpen && !isMobile;
  const desktopSidebarW = collapsed && !peekOpen ? SIDEBAR_W_COLLAPSED : SIDEBAR_W;
  const sidebarWidth = isMobile ? 260 : desktopSidebarW;
  const sidebarTranslate = isMobile && !mobileOpen ? "-100%" : "0";
  const mainOffset = isMobile ? 0 : desktopSidebarW;
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
          {/* Header — the wordmark slot now shows the signed-in user's name
              as a dropdown trigger. Clicking opens a 2-item menu (Settings,
              Sign out). "Back to site" sits below as a small standalone link
              so the admin always has a one-click escape to the public side. */}
          <div
            className="pt-6 pb-5"
            style={{
              borderBottom: "1px solid hsl(var(--paper-mid))",
              paddingLeft: showExpanded ? 28 : 0,
              paddingRight: showExpanded ? 16 : 0,
            }}
          >
            <div
              className="flex items-start"
              style={{ justifyContent: showExpanded ? "space-between" : "center" }}
            >
              {showExpanded && (
                <div className="min-w-0 flex-1 pr-2">
                  <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="group flex items-center gap-1.5 text-ink hover:opacity-80 transition-opacity max-w-full"
                      >
                        <span
                          className="font-display leading-none truncate"
                          style={{ fontSize: "1.4rem", fontWeight: 500 }}
                        >
                          {displayNameFromEmail(user.email)}
                        </span>
                        <ChevronDown
                          className="w-3.5 h-3.5 text-ink-soft shrink-0 transition-transform group-data-[state=open]:rotate-180"
                          strokeWidth={1.8}
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="min-w-[180px] rounded-none border-paper-mid"
                    >
                      <DropdownMenuItem asChild>
                        <Link
                          to="/admin/settings"
                          onClick={() => {
                            if (!isMobile) {
                              window.localStorage.setItem(COLLAPSED_KEY, "1");
                              setCollapsed(true);
                            }
                          }}
                          className="font-mono uppercase text-ink-soft hover:text-ink cursor-pointer flex items-center gap-2"
                          style={{ fontSize: 10, letterSpacing: "0.22em" }}
                        >
                          <SettingsIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={signOut}
                        className="font-mono uppercase text-ink-soft hover:text-ink cursor-pointer flex items-center gap-2"
                        style={{ fontSize: 10, letterSpacing: "0.22em" }}
                      >
                        <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  className="p-2 text-ink-soft hover:text-ink transition-colors"
                  title={collapsed ? "Expand" : "Collapse"}
                >
                  {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
              )}
            </div>

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
                  end={item.to === "/admin/settings" || item.to === "/admin"}
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
