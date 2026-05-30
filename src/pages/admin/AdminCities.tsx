import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus } from "lucide-react";

type CityRow = {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  status: string;
  hero_image_url: string | null;
  updated_at: string;
};

export default function AdminCities() {
  const [cities, setCities] = useState<CityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cities")
      .select("id,slug,name,country,status,hero_image_url,updated_at")
      .order("name");
    setCities((data as CityRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (c: CityRow) => {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("cities").delete().eq("id", c.id);
    if (!error) setCities((prev) => prev.filter((x) => x.id !== c.id));
  };

  return (
    <AdminLayout>
      <div className="px-10 py-10 max-w-[1400px]">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-3">Manage</p>
            <h1 className="font-display text-[44px] text-ink leading-none">Cities</h1>
            <p className="mt-3 text-[12px] text-ink-muted">
              {loading ? "Loading…" : `${cities.length} total`}
            </p>
          </div>
          <Link
            to="/admin/cities/new"
            className="inline-flex items-center gap-2 uppercase text-background hover:opacity-90 transition-opacity"
            style={{
              background: "hsl(var(--blue))",
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: "0.18em",
              padding: "10px 22px",
            }}
          >
            <Plus className="w-3.5 h-3.5" /> Add city
          </Link>
        </div>

        <div className="bg-background border hairline overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b hairline text-left">
                  <th className="px-4 py-3 w-[60px]"></th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">Name</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">Country</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">Slug</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">Status</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">Updated</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((c) => {
                  const published = c.status === "published";
                  return (
                    <tr key={c.id} className="border-b hairline last:border-b-0 hover:bg-off-white/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="w-11 h-11 bg-stone overflow-hidden">
                          {c.hero_image_url && (
                            <img src={c.hero_image_url} alt={c.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-ink-muted">{c.country || "—"}</td>
                      <td className="px-4 py-3 text-ink-faint">/{c.slug}</td>
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
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-faint text-[11px]">
                        {new Date(c.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link to={`/admin/cities/${c.id}`} className="text-[11px] tracking-ui text-ink-muted hover:text-ink mr-4">
                          Edit
                        </Link>
                        <Link to={`/cities/${c.slug}`} target="_blank" className="text-[11px] tracking-ui text-ink-muted hover:text-ink mr-4">
                          View
                        </Link>
                        <button onClick={() => remove(c)} className="text-[11px] tracking-ui text-ink-muted hover:text-destructive">
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && cities.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-[12px] text-ink-faint">
                      No cities yet.{" "}
                      <Link to="/admin/cities/new" className="underline" style={{ color: "hsl(var(--blue))" }}>
                        Create the first one
                      </Link>
                      .
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
