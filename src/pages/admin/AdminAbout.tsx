import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { ABOUT_DEFAULTS, type AboutContent } from "@/lib/aboutContent";

/**
 * Edits the text of the public /about page (only the manifesto block —
 * other strips below it are driven by their own admin sections).
 */
export default function AdminAbout() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<AboutContent>(ABOUT_DEFAULTS);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("site_pages")
        .select("content")
        .eq("key", "about")
        .maybeSingle();
      if (data?.content) {
        const c = data.content as Partial<AboutContent>;
        setContent({
          eyebrow: c.eyebrow ?? ABOUT_DEFAULTS.eyebrow,
          headline: c.headline ?? ABOUT_DEFAULTS.headline,
          body: Array.isArray(c.body) && c.body.length > 0 ? c.body : ABOUT_DEFAULTS.body,
          cta_label: c.cta_label ?? ABOUT_DEFAULTS.cta_label,
        });
      }
      setLoading(false);
    })();
  }, []);

  const updateBodyAt = (idx: number, value: string) =>
    setContent((c) => ({ ...c, body: c.body.map((p, i) => (i === idx ? value : p)) }));
  const addParagraph = () => setContent((c) => ({ ...c, body: [...c.body, ""] }));
  const removeParagraph = (idx: number) =>
    setContent((c) => ({ ...c, body: c.body.filter((_, i) => i !== idx) }));

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("site_pages")
      .upsert(
        { key: "about", content, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    setSaving(false);
    if (error) {
      toast({
        title: "Could not save",
        description: error.message.includes("does not exist")
          ? "The `site_pages` migration has not been applied on Supabase yet."
          : error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "About page saved", description: "The public copy has been updated." });
  };

  return (
    <AdminLayout>
      <div className="px-10 py-10 max-w-[820px]">
        <div className="mb-10 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="font-mono uppercase text-ink-soft mb-3 font-semibold" style={{ fontSize: 11, letterSpacing: "0.22em" }}>
              Manage
            </p>
            <h1
              className="font-display text-ink"
              style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.8rem)", fontWeight: 400, lineHeight: 1, letterSpacing: "-0.005em" }}
            >
              About
            </h1>
            <p className="mt-4 text-[13px] text-ink-soft" style={{ lineHeight: 1.6 }}>
              Manifesto copy on <code className="text-ink">/about</code>. Only edit the words — the layout and the project/city/resource strips are not configured from here.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-ink-muted text-[12px]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-8 bg-background p-6" style={{ border: "1px solid hsl(var(--paper-mid))" }}>
            <Field label="Eyebrow" hint="Shown above the headline in uppercase">
              <input
                className={inputCls}
                value={content.eyebrow}
                onChange={(e) => setContent((c) => ({ ...c, eyebrow: e.target.value }))}
              />
            </Field>

            <Field label="Headline">
              <input
                className={inputCls}
                value={content.headline}
                onChange={(e) => setContent((c) => ({ ...c, headline: e.target.value }))}
              />
            </Field>

            <div>
              <label className="block font-mono uppercase text-ink-soft mb-3 font-medium" style={{ fontSize: 10, letterSpacing: "0.22em" }}>
                Paragraphs
              </label>
              <p className="text-[12px] text-ink-soft mb-3" style={{ lineHeight: 1.5 }}>
                The last paragraph is rendered as a pull quote (serif italic). Hover one to delete it.
              </p>
              <div className="space-y-3">
                {content.body.map((p, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <textarea
                      rows={3}
                      className={inputCls}
                      value={p}
                      onChange={(e) => updateBodyAt(i, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeParagraph(i)}
                      disabled={content.body.length <= 1}
                      className="shrink-0 p-2 text-ink-soft hover:text-ink disabled:opacity-30"
                      aria-label="Delete paragraph"
                      title="Delete paragraph"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addParagraph}
                className="mt-4 inline-flex items-center gap-2 font-mono uppercase text-ink-soft hover:text-ink transition-colors"
                style={{ fontSize: 11, letterSpacing: "0.22em" }}
              >
                <Plus className="w-3.5 h-3.5" /> Add paragraph
              </button>
            </div>

            <Field label="CTA button label" hint='Text for the "Open the map" link'>
              <input
                className={inputCls}
                value={content.cta_label}
                onChange={(e) => setContent((c) => ({ ...c, cta_label: e.target.value }))}
              />
            </Field>

            <div className="pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="font-mono uppercase text-white disabled:opacity-50"
                style={{ background: "hsl(var(--ink))", fontSize: 11, letterSpacing: "0.22em", padding: "10px 22px" }}
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
      <div className="border" style={{ borderColor: "hsl(var(--paper-mid))" }}>
        {children}
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-ink-soft">{hint}</p>}
    </div>
  );
}
