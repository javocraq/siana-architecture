import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import SettingsTabs from "@/components/admin/SettingsTabs";
import ImageUpload from "@/components/admin/ImageUpload";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type SeoRow = {
  id: string;
  page_key: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  robots: string;
};

const GLOBAL_KEY = "global";

/**
 * SEO Global — only the site-wide defaults live here. Per-content SEO
 * (title, description, slug, OG) is edited directly on each project,
 * city, practice or resource form.
 */
export default function AdminSEO() {
  const [row, setRow] = useState<SeoRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Stubbed fields — UI only until DB columns are added. The user can
  // wire these to the relevant columns when they extend `seo_globals`.
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [gaId, setGaId] = useState("");
  const [gscVerify, setGscVerify] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      let { data } = await supabase.from("seo_globals").select("*").eq("page_key", GLOBAL_KEY).maybeSingle();
      if (!data) {
        const res = await supabase
          .from("seo_globals")
          .insert({ page_key: GLOBAL_KEY, robots: "index,follow" })
          .select("*")
          .single();
        data = res.data;
      }
      setRow((data as SeoRow) || null);
      setLoading(false);
    })();
  }, []);

  const update = (patch: Partial<SeoRow>) =>
    setRow((curr) => (curr ? { ...curr, ...patch } : curr));

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const { error } = await supabase.from("seo_globals").update({
      meta_title: row.meta_title || null,
      meta_description: row.meta_description || null,
      og_image_url: row.og_image_url,
      robots: row.robots || "index,follow",
    }).eq("id", row.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Global SEO saved", description: "Site-wide defaults have been updated." });
  };

  return (
    <AdminLayout>
      <div className="px-10 py-10 max-w-[960px]">
        <div className="mb-8">
          <p className="font-mono uppercase text-ink-soft mb-3 font-semibold" style={{ fontSize: 11, letterSpacing: "0.22em" }}>
            Manage
          </p>
          <h1 className="font-display text-ink" style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.8rem)", fontWeight: 400, lineHeight: 1, letterSpacing: "-0.005em" }}>
            Settings
          </h1>
        </div>

        <SettingsTabs />

        {loading || !row ? (
          <div className="flex items-center gap-3 text-ink-muted text-[12px]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-8">
            {/* Globals card */}
            <section className="bg-background p-6" style={{ border: "1px solid hsl(var(--paper-mid))" }}>
              <h2 className="font-display text-ink mb-1" style={{ fontSize: 22, fontWeight: 400 }}>SEO Global</h2>
              <p className="text-[13px] text-ink-soft mb-6" style={{ lineHeight: 1.6 }}>
                Site-wide defaults. Each project, city, practice or resource can override them in its own form.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8">
                <div className="space-y-5">
                  <Field label="Global meta title" hint={`${(row.meta_title || "").length}/60`}>
                    <input className={inputCls} value={row.meta_title || ""}
                      onChange={(e) => update({ meta_title: e.target.value })} maxLength={80} />
                  </Field>
                  <Field label="Global meta description" hint={`${(row.meta_description || "").length}/160`}>
                    <textarea rows={3} className={inputCls} value={row.meta_description || ""}
                      onChange={(e) => update({ meta_description: e.target.value })} maxLength={200} />
                  </Field>
                  <Field label="Robots">
                    <select className={inputCls} value={row.robots}
                      onChange={(e) => update({ robots: e.target.value })}>
                      <option value="index,follow">index, follow</option>
                      <option value="noindex,follow">noindex, follow</option>
                      <option value="index,nofollow">index, nofollow</option>
                      <option value="noindex,nofollow">noindex, nofollow</option>
                    </select>
                  </Field>
                </div>
                <div>
                  <ImageUpload label="Global Open Graph" value={row.og_image_url}
                    onChange={(url) => update({ og_image_url: url })}
                    aspect="wide" folder="seo" />
                </div>
              </div>
            </section>

            {/* Sitemap + Analytics card (UI-only until DB columns are added) */}
            <section className="bg-background p-6" style={{ border: "1px solid hsl(var(--paper-mid))" }}>
              <h2 className="font-display text-ink mb-1" style={{ fontSize: 22, fontWeight: 400 }}>Indexing &amp; Analytics</h2>
              <p className="text-[13px] text-ink-soft mb-6" style={{ lineHeight: 1.6 }}>
                These fields require additional columns on <code className="text-ink">seo_globals</code> to persist. For now they can be managed via environment variables.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                <Field label="Sitemap URL" hint="e.g. /sitemap.xml">
                  <input className={inputCls} value={sitemapUrl}
                    onChange={(e) => setSitemapUrl(e.target.value)}
                    placeholder="https://siana.com/sitemap.xml" />
                </Field>
                <Field label="Google Analytics ID" hint="G-XXXXXXX or UA-XXXXXX">
                  <input className={inputCls} value={gaId}
                    onChange={(e) => setGaId(e.target.value)} placeholder="G-XXXXXXXXXX" />
                </Field>
                <Field label="Google Search Console" hint="meta verification content">
                  <input className={inputCls} value={gscVerify}
                    onChange={(e) => setGscVerify(e.target.value)}
                    placeholder="google-site-verification=…" />
                </Field>
              </div>
            </section>

            <div className="flex items-center gap-4">
              <button onClick={save} disabled={saving}
                className="font-mono uppercase text-white disabled:opacity-50"
                style={{ background: "hsl(var(--ink))", fontSize: 11, letterSpacing: "0.22em", padding: "10px 22px" }}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <p className="text-[11px] text-ink-soft">
                The indexing and analytics fields are not yet persisted to the database.
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

const inputCls =
  "w-full bg-background px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-ink";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <label className="block font-mono uppercase text-ink-soft mb-2 font-medium" style={{ fontSize: 10, letterSpacing: "0.22em" }}>
          {label}
        </label>
      )}
      <div className="border" style={{ borderColor: "hsl(var(--paper-mid))" }}>{children}</div>
      {hint && <p className="mt-1.5 text-[11px] text-ink-soft">{hint}</p>}
    </div>
  );
}
