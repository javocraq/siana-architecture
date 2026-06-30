import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import { ABOUT_DEFAULTS, normalizeAboutBody, type AboutContent } from "@/lib/aboutContent";
import { adminInputCls, adminLabelCls } from "@/lib/adminUi";

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
        const c = data.content as Partial<AboutContent> & { body?: unknown };
        setContent({
          eyebrow: c.eyebrow ?? ABOUT_DEFAULTS.eyebrow,
          headline: c.headline ?? ABOUT_DEFAULTS.headline,
          body: normalizeAboutBody(c.body),
          cta_label: c.cta_label ?? ABOUT_DEFAULTS.cta_label,
        });
      }
      setLoading(false);
    })();
  }, []);

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
            <h1
              className="font-display text-ink"
              style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.8rem)", fontWeight: 400, lineHeight: 1, letterSpacing: "-0.005em" }}
            >
              About
            </h1>
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

            <Field label="Body" hint="Use the toolbar for italics, bold or block quotes — italics render as the editorial pull quote on /about.">
              <RichTextEditor
                value={content.body}
                onChange={(html) => setContent((c) => ({ ...c, body: html }))}
                placeholder="Write the manifesto…"
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

const inputCls = adminInputCls;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className={adminLabelCls}>{label}</label>}
      {children}
      {hint && <p className="mt-2 text-[12px] text-ink-soft">{hint}</p>}
    </div>
  );
}
