import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUpload from "@/components/admin/ImageUpload";
import { Loader2, Plus, Trash2 } from "lucide-react";

type SeoRow = {
  id: string;
  page_key: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  robots: string;
};

const PRESETS = ["home", "cities", "projects", "journal", "about"];

export default function AdminSEO() {
  const [rows, setRows] = useState<SeoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("seo_globals").select("*").order("page_key");
    setRows((data as SeoRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (key: string, patch: Partial<SeoRow>) => {
    setRows((prev) => prev.map((r) => (r.page_key === key ? { ...r, ...patch } : r)));
  };

  const save = async (row: SeoRow) => {
    setSavingKey(row.page_key);
    setError(null);
    const { error } = await supabase.from("seo_globals").update({
      meta_title: row.meta_title || null,
      meta_description: row.meta_description || null,
      og_image_url: row.og_image_url,
      robots: row.robots || "index,follow",
    }).eq("id", row.id);
    setSavingKey(null);
    if (error) setError(error.message);
  };

  const addKey = async (key: string) => {
    setError(null);
    const k = key.trim().toLowerCase();
    if (!k) return;
    if (rows.some((r) => r.page_key === k)) { setError(`"${k}" already exists`); return; }
    const { data, error } = await supabase.from("seo_globals").insert({
      page_key: k, robots: "index,follow",
    }).select("*").single();
    if (error) { setError(error.message); return; }
    setRows((prev) => [...prev, data as SeoRow].sort((a, b) => a.page_key.localeCompare(b.page_key)));
    setNewKey("");
  };

  const remove = async (row: SeoRow) => {
    if (!confirm(`Delete SEO defaults for "${row.page_key}"?`)) return;
    const { error } = await supabase.from("seo_globals").delete().eq("id", row.id);
    if (!error) setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  const missing = PRESETS.filter((k) => !rows.some((r) => r.page_key === k));

  return (
    <AdminLayout>
      <div className="px-10 py-10 max-w-[1100px]">
        <div className="mb-10">
          <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-3">Manage</p>
          <h1 className="font-display text-[44px] text-ink leading-none">SEO defaults</h1>
          <p className="mt-3 text-[12px] text-ink-muted max-w-xl">
            Per-page meta title, description, social card, and robots directive. These are used as fallbacks when an individual record doesn't override them.
          </p>
        </div>

        {error && <div className="mb-6 px-4 py-3 border hairline text-[12px] text-destructive bg-off-white">{error}</div>}

        {/* Add new key */}
        <div className="mb-8 p-5 border hairline bg-background">
          <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-3">Add page key</p>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {missing.map((k) => (
              <button key={k} onClick={() => addKey(k)}
                className="text-[11px] tracking-tag uppercase border hairline px-3 py-1.5 text-ink-muted hover:text-ink hover:bg-off-white">
                + {k}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={inputCls + " max-w-[260px]"} placeholder="custom-key"
              value={newKey} onChange={(e) => setNewKey(e.target.value)} />
            <button onClick={() => addKey(newKey)}
              className="inline-flex items-center gap-2 uppercase text-background"
              style={{ background: "hsl(var(--blue))", fontSize: 11, letterSpacing: "0.18em", padding: "8px 18px" }}>
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-ink-muted text-[12px]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-[12px] text-ink-faint">No SEO defaults yet. Add one above.</p>
        ) : (
          <div className="space-y-6">
            {rows.map((row) => (
              <div key={row.id} className="border hairline bg-background p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-1">Page key</p>
                    <h2 className="font-display text-[22px] text-ink">/{row.page_key}</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => save(row)} disabled={savingKey === row.page_key}
                      className="text-[11px] tracking-tag uppercase text-background px-4 py-2 disabled:opacity-50"
                      style={{ background: "hsl(var(--blue))" }}>
                      {savingKey === row.page_key ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => remove(row)} title="Delete"
                      className="p-2 text-ink-muted hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_280px] gap-6">
                  <div className="space-y-5">
                    <Field label="Meta title" hint={`${(row.meta_title || "").length}/60`}>
                      <input className={inputCls} value={row.meta_title || ""}
                        onChange={(e) => update(row.page_key, { meta_title: e.target.value })} maxLength={80} />
                    </Field>
                    <Field label="Meta description" hint={`${(row.meta_description || "").length}/160`}>
                      <textarea rows={3} className={inputCls} value={row.meta_description || ""}
                        onChange={(e) => update(row.page_key, { meta_description: e.target.value })} maxLength={200} />
                    </Field>
                    <Field label="Robots">
                      <select className={inputCls} value={row.robots}
                        onChange={(e) => update(row.page_key, { robots: e.target.value })}>
                        <option value="index,follow">index, follow</option>
                        <option value="noindex,follow">noindex, follow</option>
                        <option value="index,nofollow">index, nofollow</option>
                        <option value="noindex,nofollow">noindex, nofollow</option>
                      </select>
                    </Field>
                  </div>
                  <div>
                    <ImageUpload label="OG image" value={row.og_image_url}
                      onChange={(url) => update(row.page_key, { og_image_url: url })}
                      aspect="wide" folder="seo" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

const inputCls =
  "w-full bg-background border hairline px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-ink";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className="block text-[10px] tracking-tag uppercase text-ink-muted mb-2">{label}</label>}
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}
