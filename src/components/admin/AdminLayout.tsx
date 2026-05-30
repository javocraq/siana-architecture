import { ReactNode } from "react";
import { Link, NavLink, Navigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";

const navItems = [
  { to: "/admin/projects", label: "Projects" },
  { to: "/admin/cities", label: "Cities" },
  { to: "/admin/journal", label: "Journal" },
  { to: "/admin/resources", label: "RESOURCES FOR ARCHITECTS" },
  { to: "/admin/seo", label: "SEO" },
  { to: "/admin/settings", label: "Settings" },
];


export default function AdminLayout({ children }: { children: ReactNode }) {
  const { loading, user, isAdmin } = useAdmin();
  const location = useLocation();

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

  return (
    <>
      <Helmet>
        <title>Siana Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="min-h-screen flex bg-[#f8f7f4]">
        {/* Sidebar */}
        <aside className="fixed top-0 left-0 bottom-0 w-[220px] bg-background border-r hairline flex flex-col z-30">
          <div className="px-6 pt-6 pb-5 border-b hairline">
            <Link to="/admin/projects" className="font-display italic text-[16px] text-ink">
              siana admin
            </Link>
          </div>
          <nav className="flex-1 py-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative block px-6 py-2.5 text-[12px] tracking-tag uppercase transition-colors ${
                    isActive ? "text-[hsl(var(--blue))]" : "text-ink-muted hover:text-ink"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        className="absolute left-0 top-0 bottom-0 w-0.5"
                        style={{ background: "hsl(var(--blue))" }}
                      />
                    )}
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="px-6 py-4 border-t hairline">
            <Link
              to="/"
              className="block text-[11px] tracking-tag uppercase text-ink-muted hover:text-ink mb-3"
            >
              ← Back to site
            </Link>
            <p className="text-[11px] font-light text-ink-muted truncate">{user.email}</p>
            <button
              onClick={signOut}
              className="mt-2 text-[10px] tracking-tag uppercase text-ink-faint hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="ml-[220px] flex-1 min-h-screen">{children}</main>
      </div>
    </>
  );
}
