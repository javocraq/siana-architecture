import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdmin } from "@/hooks/useAdmin";
import { Loader2, Plus, ArrowRight, ArrowUpRight, Building2, MapPin, BookOpen } from "lucide-react";

/**
 * Dashboard — the admin landing page (/admin). A calm, editorial overview of
 * the atlas: published/draft counts per content type, quick actions, and the
 * most recently edited records. Monochrome to match the rest of the CMS — no
 * colour, just paper/ink, hairline borders and the display serif.
 */

type Section = { key: string; label: string; base: string; nameCol: string; icon: any };

// The three content tables surfaced on the dashboard. `posts` powers the
// Practice list (no kind filter there), so we count every post — consistent
// with what /admin/practice shows.
const SECTIONS: Section[] = [
  { key: "projects", label: "Projects", base: "/admin/projects", nameCol: "name", icon: Building2 },
  { key: "cities", label: "Cities", base: "/admin/cities", nameCol: "name", icon: MapPin },
  { key: "posts", label: "Practice", base: "/admin/practice", nameCol: "title", icon: BookOpen },
];

type Stat = Section & { total: number; published: number };
type RecentItem = { id: string; type: string; name: string; status: string; editPath: string; updated_at: string };

// "daniela@sianamarketing.com" -> "Daniela". Used for the greeting only.
function nameFromEmail(email?: string | null) {
  if (!email) return "there";
  const local = email.split("@")[0] || email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default function AdminDashboard() {
  const { user } = useAdmin();
  const [stats, setStats] = useState<Stat[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const db = supabase as any;
      const statResults: Stat[] = [];
      const recentAll: RecentItem[] = [];
      for (const s of SECTIONS) {
        // Two head/count queries (total + published) and a small recent slice
        // per table. draft = total - published.
        const [totalRes, pubRes, recentRes] = await Promise.all([
          db.from(s.key).select("*", { count: "exact", head: true }),
          db.from(s.key).select("*", { count: "exact", head: true }).eq("status", "published"),
          db.from(s.key)
            .select(`id, status, updated_at, ${s.nameCol}`)
            .order("updated_at", { ascending: false })
            .limit(4),
        ]);
        statResults.push({ ...s, total: totalRes.count ?? 0, published: pubRes.count ?? 0 });
        (recentRes.data || []).forEach((r: any) =>
          recentAll.push({
            id: r.id,
            type: s.label,
            name: r[s.nameCol] || "Untitled",
            status: r.status || "draft",
            editPath: `${s.base}/${r.id}`,
            updated_at: r.updated_at || "",
          })
        );
      }
      recentAll.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
      setStats(statResults);
      setRecent(recentAll.slice(0, 6));
      setLoading(false);
    })();
  }, []);

  const totalAll = stats.reduce((n, s) => n + s.total, 0);

  return (
    <AdminLayout>
      <div className="px-6 sm:px-10 py-12 max-w-[1080px] mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-3">Content management</p>
          <h1
            className="font-display text-ink"
            style={{ fontSize: "clamp(2rem, 3.4vw, 3rem)", fontWeight: 400, lineHeight: 1, letterSpacing: "-0.01em" }}
          >
            Welcome back, {nameFromEmail(user?.email)}
          </h1>
          <p className="mt-3 text-[13px] text-ink-faint max-w-[540px] leading-relaxed mx-auto">
            An overview of the Siana atlas — projects, cities and practice entries. Pick up where you left off below.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-ink-muted text-[12px]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-12">
            {/* Stat tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.map((s) => {
                const draft = Math.max(0, s.total - s.published);
                const Icon = s.icon;
                return (
                  <Link
                    key={s.key}
                    to={s.base}
                    className="group bg-white rounded-xl border border-paper-mid p-8 flex flex-col items-center text-center transition-all duration-200 hover:border-ink/25 hover:shadow-[0_6px_28px_rgba(0,0,0,0.05)]"
                  >
                    <Icon className="w-9 h-9 text-ink-soft mb-5 transition-colors group-hover:text-ink" strokeWidth={1.1} />
                    <p className="text-[10px] tracking-tag uppercase text-ink-muted">{s.label}</p>
                    <p
                      className="font-display text-ink mt-3"
                      style={{ fontSize: 50, fontWeight: 400, lineHeight: 1, letterSpacing: "-0.02em" }}
                    >
                      {s.total}
                    </p>
                    <p className="mt-3 text-[11.5px] text-ink-faint">
                      <span className="text-ink-muted">{s.published}</span> published · {draft} draft{draft === 1 ? "" : "s"}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1 text-[10px] tracking-tag uppercase text-ink-faint transition-colors group-hover:text-ink">
                      View
                      <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Quick actions */}
            <div className="text-center">
              <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-4">Quick actions</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <ActionLink to="/admin/projects/new" icon={Plus}>New project</ActionLink>
                <ActionLink to="/admin/cities/new" icon={Plus}>New city</ActionLink>
                <ActionLink to="/admin/practice/new" icon={Plus}>New entry</ActionLink>
                <ActionLink to="/admin/home">Edit home</ActionLink>
                <ActionLink to="/admin/taxonomies">Categories</ActionLink>
              </div>
            </div>

            {/* Recently updated */}
            <div>
              <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-4 text-center">Recently updated</p>
              <div className="bg-white rounded-xl border border-paper-mid overflow-hidden">
                {recent.length === 0 ? (
                  <p className="px-7 py-6 text-[13px] text-ink-faint">
                    {totalAll === 0
                      ? "No content yet — create your first project or city above."
                      : "Nothing to show."}
                  </p>
                ) : (
                  recent.map((r) => (
                    <Link
                      key={r.type + r.id}
                      to={r.editPath}
                      className="group flex items-center gap-4 px-7 py-4 border-b border-paper-mid last:border-b-0 transition-colors hover:bg-paper-warm"
                    >
                      <span className="text-[10px] tracking-tag uppercase text-ink-faint w-[78px] shrink-0">{r.type}</span>
                      <span className="font-display text-ink flex-1 min-w-0 truncate" style={{ fontSize: 17 }}>
                        {r.name}
                      </span>
                      <span
                        className={`text-[10px] tracking-tag uppercase shrink-0 ${
                          r.status === "published" ? "text-ink-muted" : "text-ink-faint"
                        }`}
                      >
                        {r.status === "published" ? "Published" : "Draft"}
                      </span>
                      <ArrowUpRight
                        className="w-4 h-4 text-ink-faint shrink-0 transition-all group-hover:text-ink group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        strokeWidth={1.5}
                      />
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function ActionLink({ to, icon: Icon, children }: { to: string; icon?: any; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 text-[11px] tracking-tag uppercase px-4 py-3 bg-white border border-paper-mid rounded-lg text-ink-soft transition-colors hover:text-ink hover:border-ink/30 press"
    >
      {Icon && <Icon className="w-4 h-4" strokeWidth={1.5} />}
      {children}
    </Link>
  );
}
