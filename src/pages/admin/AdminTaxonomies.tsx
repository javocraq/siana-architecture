import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, Plus } from "lucide-react";
import { TAXONOMY_DEFAULTS, TAXONOMY_FIELDS, mergeTaxonomies, type Taxonomies } from "@/lib/taxonomies";
import { adminInputCls } from "@/lib/adminUi";

/**
 * Categories — manage the option lists used across the CMS (categories,
 * styles, materials, experiences, regions). Stored in `site_pages` under
 * key 'taxonomies'; the Projects and Cities forms read them via useTaxonomies.
 */
export default function AdminTaxonomies() {
  const { toast } = useToast();
  const [tax, setTax] = useState<Taxonomies>(TAXONOMY_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("site_pages")
        .select("content")
        .eq("key", "taxonomies")
        .maybeSingle();
      setTax(mergeTaxonomies(data?.content as Partial<Taxonomies> | null));
      setLoading(false);
    })();
  }, []);

  const addValue = (key: keyof Taxonomies, value: string) => {
    const v = value.trim();
    if (!v) return;
    setTax((t) => (t[key].includes(v) ? t : { ...t, [key]: [...t[key], v] }));
  };
  const removeValue = (key: keyof Taxonomies, value: string) =>
    setTax((t) => ({ ...t, [key]: t[key].filter((x) => x !== value) }));

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("site_pages")
      .upsert({ key: "taxonomies", content: tax, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast({
        title: "Could not save categories",
        description: /relation .* does not exist|site_pages/i.test(error.message)
          ? "The `site_pages` table is missing on Supabase."
          : error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Categories saved", description: "The option lists have been updated." });
  };

  return (
    <AdminLayout>
      <div className="px-10 py-10 max-w-[960px]">
        <div className="mb-8">
          <h1 className="font-display text-ink" style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.8rem)", fontWeight: 400, lineHeight: 1, letterSpacing: "-0.005em" }}>
            Categories
          </h1>
          <p className="mt-3 text-[13px] text-ink-faint max-w-[560px] leading-relaxed">
            Add or remove the options used across the CMS — categories, styles, materials, experiences and regions.
            These appear in the Projects and Cities forms.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-ink-muted text-[12px]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-6">
            {TAXONOMY_FIELDS.map((f) => (
              <TaxonomyList
                key={f.key}
                label={f.label}
                hint={f.hint}
                values={tax[f.key]}
                onAdd={(v) => addValue(f.key, v)}
                onRemove={(v) => removeValue(f.key, v)}
              />
            ))}
            <div className="pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="text-[11px] tracking-tag uppercase text-background px-5 py-2.5 disabled:opacity-50 press"
                style={{ background: "hsl(var(--ink))" }}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function TaxonomyList({
  label, hint, values, onAdd, onRemove,
}: {
  label: string;
  hint: string;
  values: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
}) {
  const [input, setInput] = useState("");
  const submit = () => { onAdd(input); setInput(""); };
  return (
    <div className="border hairline bg-background p-6">
      <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-1">{label}</p>
      <p className="text-[11px] text-ink-faint mb-4">{hint}</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {values.length === 0 && <span className="text-[12px] text-ink-faint italic">No options yet.</span>}
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1.5 border hairline pl-3 pr-2 py-1.5 text-[12px] text-ink">
            {v}
            <button type="button" onClick={() => onRemove(v)} aria-label={`Remove ${v}`} className="text-ink-muted hover:text-ink press">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
          placeholder={`Add ${label.toLowerCase().replace(/s$/, "")}…`}
          className={adminInputCls + " flex-1"}
        />
        <button
          type="button"
          onClick={submit}
          className="inline-flex items-center gap-1.5 text-[11px] tracking-tag uppercase px-3 py-2 border hairline text-ink hover:bg-stone transition-colors press"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
    </div>
  );
}
