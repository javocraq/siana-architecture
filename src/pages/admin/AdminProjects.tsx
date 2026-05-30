import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus } from "lucide-react";

type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  architect: string | null;
  category: string | null;
  style: string | null;
  featured: boolean;
  status: string;
  updated_at: string;
  city_id: string | null;
  hero_image_url: string | null;
  cover_image_url: string | null;
};

type CityRow = { id: string; name: string };

export default function AdminProjects() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [cities, setCities] = useState<Record<string, string>>({});
  const [cityList, setCityList] = useState<CityRow[]>([]);
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: ps }, { data: cs }] = await Promise.all([
      supabase
        .from("projects")
        .select("id,slug,name,architect,category,style,featured,status,updated_at,city_id,hero_image_url,cover_image_url")
        .order("updated_at", { ascending: false }),
      supabase.from("cities").select("id,name"),
    ]);
    setProjects((ps as ProjectRow[]) || []);
    const list = (cs as CityRow[]) || [];
    const map: Record<string, string> = {};
    list.forEach((c) => (map[c.id] = c.name));
    setCities(map);
    setCityList([...list].sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleFeatured = async (p: ProjectRow) => {
    setSavingId(p.id);
    const { error } = await supabase
      .from("projects")
      .update({ featured: !p.featured })
      .eq("id", p.id);
    setSavingId(null);
    if (!error) {
      setProjects((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, featured: !x.featured } : x))
      );
    }
  };

  const removeProject = async (p: ProjectRow) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("projects").delete().eq("id", p.id);
    if (!error) setProjects((prev) => prev.filter((x) => x.id !== p.id));
  };

  const filteredProjects = projects.filter((p) => {
    if (cityFilter === "all") return true;
    if (cityFilter === "none") return !p.city_id;
    return p.city_id === cityFilter;
  });

  return (
    <AdminLayout>
      <div className="px-10 py-10 max-w-[1400px]">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-3">Manage</p>
            <h1 className="font-display text-[44px] text-ink leading-none">Projects</h1>
            <p className="mt-3 text-[12px] text-ink-muted">
              {loading ? "Loading…" : `${filteredProjects.length} of ${projects.length}`}
            </p>
          </div>
          <Link
            to="/admin/projects/new"
            className="inline-flex items-center gap-2 uppercase text-background hover:opacity-90 transition-opacity"
            style={{
              background: "hsl(var(--blue))",
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: "0.18em",
              padding: "10px 22px",
            }}
          >
            <Plus className="w-3.5 h-3.5" /> Add project
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <label className="text-[10px] tracking-tag uppercase text-ink-muted">City</label>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="bg-background border hairline text-[12px] px-3 py-2 text-ink focus:outline-none"
          >
            <option value="all">All cities</option>
            <option value="none">— Unassigned —</option>
            {cityList.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {cityFilter !== "all" && (
            <button
              onClick={() => setCityFilter("all")}
              className="text-[11px] tracking-ui text-ink-muted hover:text-ink underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-background border hairline overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b hairline text-left">
                  <th className="px-4 py-3 w-[60px]"></th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">Name</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">Architect</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">City</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">Category</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">Style</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted text-center">Featured</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">Status</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">Updated</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((p) => {
                  const thumb = p.cover_image_url || p.hero_image_url;
                  const published = p.status === "published";
                  return (
                    <tr key={p.id} className="border-b hairline last:border-b-0 hover:bg-off-white/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="w-11 h-11 bg-stone overflow-hidden">
                          {thumb && (
                            <img src={thumb} alt={p.name} className="photo-thumb w-full h-full object-cover" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-ink-muted">{p.architect || "—"}</td>
                      <td className="px-4 py-3 text-ink-muted">{p.city_id ? cities[p.city_id] || "—" : "—"}</td>
                      <td className="px-4 py-3 text-ink-muted">{p.category || "—"}</td>
                      <td className="px-4 py-3 text-ink-muted">{p.style || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleFeatured(p)}
                          disabled={savingId === p.id}
                          aria-label="Toggle featured"
                          className="inline-flex items-center"
                          style={{
                            width: 32,
                            height: 18,
                            borderRadius: 9999,
                            background: p.featured ? "hsl(var(--blue))" : "rgba(0,0,0,0.15)",
                            transition: "background 0.2s ease",
                            position: "relative",
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              top: 2,
                              left: p.featured ? 16 : 2,
                              width: 14,
                              height: 14,
                              borderRadius: 9999,
                              background: "#fff",
                              transition: "left 0.2s ease",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                            }}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex uppercase px-2 py-0.5"
                          style={{
                            fontSize: 9,
                            letterSpacing: "0.16em",
                            background: published ? "hsl(var(--blue-light))" : "#f1efe8",
                            color: published ? "hsl(var(--blue))" : "#6b6760",
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-faint text-[11px]">
                        {new Date(p.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          to={`/admin/projects/${p.id}`}
                          className="text-[11px] tracking-ui text-ink-muted hover:text-ink mr-4"
                        >
                          Edit
                        </Link>
                        <Link
                          to={`/projects/${p.slug}`}
                          target="_blank"
                          className="text-[11px] tracking-ui text-ink-muted hover:text-ink mr-4"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => removeProject(p)}
                          className="text-[11px] tracking-ui text-ink-muted hover:text-destructive"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && projects.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-[12px] text-ink-faint">
                      No projects yet. <Link to="/admin/projects/new" className="underline" style={{ color: "hsl(var(--blue))" }}>Create the first one</Link>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
