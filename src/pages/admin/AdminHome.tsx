import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { HOME_DEFAULTS, mergeHomeContent, type HomeContent } from "@/lib/homeContent";

/**
 * Edits the text blocks of the public homepage (hero + map preview).
 * Other strips on /home (Featured cities, Featured buildings, Latest
 * journal, Newsletter) are driven by their own data sources.
 */
export default function AdminHome() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<HomeContent>(HOME_DEFAULTS);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("site_pages")
        .select("content")
        .eq("key", "home")
        .maybeSingle();
      setContent(mergeHomeContent(data?.content as Partial<HomeContent> | null));
      setLoading(false);
    })();
  }, []);

  const updateHero = (patch: Partial<HomeContent["hero"]>) =>
    setContent((c) => ({ ...c, hero: { ...c.hero, ...patch } }));
  const updateMap = (patch: Partial<HomeContent["map"]>) =>
    setContent((c) => ({ ...c, map: { ...c.map, ...patch } }));
  const updateCities = (patch: Partial<HomeContent["cities"]>) =>
    setContent((c) => ({ ...c, cities: { ...c.cities, ...patch } }));
  const updateBuildings = (patch: Partial<HomeContent["buildings"]>) =>
    setContent((c) => ({ ...c, buildings: { ...c.buildings, ...patch } }));
  const updateJournal = (patch: Partial<HomeContent["journal"]>) =>
    setContent((c) => ({ ...c, journal: { ...c.journal, ...patch } }));
  const updateNewsletter = (patch: Partial<HomeContent["newsletter"]>) =>
    setContent((c) => ({ ...c, newsletter: { ...c.newsletter, ...patch } }));

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("site_pages")
      .upsert(
        { key: "home", content, updated_at: new Date().toISOString() },
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
    toast({ title: "Home page saved", description: "The public copy has been updated." });
  };

  return (
    <AdminLayout>
      <div className="px-10 py-10">
        <div className="mb-10">
          <p className="font-mono uppercase text-ink-soft mb-3 font-semibold" style={{ fontSize: 11, letterSpacing: "0.22em" }}>
            Manage
          </p>
          <h1
            className="font-display text-ink"
            style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.8rem)", fontWeight: 400, lineHeight: 1, letterSpacing: "-0.005em" }}
          >
            Home
          </h1>
          <p className="mt-4 text-[13px] text-ink-soft" style={{ lineHeight: 1.6 }}>
            Text on the homepage — the hero cover and the map preview section. Featured cities,
            buildings and journal strips below them are driven by their own content.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-ink-muted text-[12px]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-8">
            {/* Hero block */}
            <section className="bg-background p-6 space-y-6" style={{ border: "1px solid hsl(var(--paper-mid))" }}>
              <div>
                <h2 className="font-display text-ink" style={{ fontSize: 22, fontWeight: 400 }}>Hero</h2>
                <p className="text-[12px] text-ink-soft mt-1" style={{ lineHeight: 1.5 }}>
                  The first screen visitors see — eyebrow links, headline, intro line and CTAs.
                </p>
              </div>

              <div>
                <label className={labelCls}>Eyebrow links</label>
                <p className="text-[11px] text-ink-soft mb-3">
                  Three labels rendered as <code className="text-ink">Architecture · Cities · Practice</code>.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field>
                    <input
                      className={inputCls}
                      value={content.hero.eyebrow_architecture}
                      onChange={(e) => updateHero({ eyebrow_architecture: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <input
                      className={inputCls}
                      value={content.hero.eyebrow_cities}
                      onChange={(e) => updateHero({ eyebrow_cities: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <input
                      className={inputCls}
                      value={content.hero.eyebrow_practice}
                      onChange={(e) => updateHero({ eyebrow_practice: e.target.value })}
                    />
                  </Field>
                </div>
              </div>

              <Field label="Headline — line 1">
                <input
                  className={inputCls}
                  value={content.hero.headline_line1}
                  onChange={(e) => updateHero({ headline_line1: e.target.value })}
                />
              </Field>
              <Field label="Headline — line 2" hint="Leave empty to render a single-line headline">
                <input
                  className={inputCls}
                  value={content.hero.headline_line2}
                  onChange={(e) => updateHero({ headline_line2: e.target.value })}
                />
              </Field>

              <Field label="Description">
                <textarea
                  rows={3}
                  className={inputCls}
                  value={content.hero.description}
                  onChange={(e) => updateHero({ description: e.target.value })}
                />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Primary CTA label" hint="Links to /atlas">
                  <input
                    className={inputCls}
                    value={content.hero.cta_primary}
                    onChange={(e) => updateHero({ cta_primary: e.target.value })}
                  />
                </Field>
                <Field label="Secondary CTA label" hint="Links to /cities">
                  <input
                    className={inputCls}
                    value={content.hero.cta_secondary}
                    onChange={(e) => updateHero({ cta_secondary: e.target.value })}
                  />
                </Field>
              </div>
            </section>

            {/* Map preview block */}
            <section className="bg-background p-6 space-y-6" style={{ border: "1px solid hsl(var(--paper-mid))" }}>
              <div>
                <h2 className="font-display text-ink" style={{ fontSize: 22, fontWeight: 400 }}>Map preview</h2>
                <p className="text-[12px] text-ink-soft mt-1" style={{ lineHeight: 1.5 }}>
                  Editorial copy overlaid on the spinning globe section.
                </p>
              </div>

              <Field label="Eyebrow">
                <input
                  className={inputCls}
                  value={content.map.eyebrow}
                  onChange={(e) => updateMap({ eyebrow: e.target.value })}
                />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Headline — lead" hint="Rendered in regular ink">
                  <input
                    className={inputCls}
                    value={content.map.headline_lead}
                    onChange={(e) => updateMap({ headline_lead: e.target.value })}
                  />
                </Field>
                <Field label="Headline — emphasis" hint="Rendered in italic, softened">
                  <input
                    className={inputCls}
                    value={content.map.headline_emphasis}
                    onChange={(e) => updateMap({ headline_emphasis: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Description">
                <textarea
                  rows={3}
                  className={inputCls}
                  value={content.map.description}
                  onChange={(e) => updateMap({ description: e.target.value })}
                />
              </Field>

              <Field label="CTA label">
                <input
                  className={inputCls}
                  value={content.map.cta}
                  onChange={(e) => updateMap({ cta: e.target.value })}
                />
              </Field>
            </section>

            {/* Cities strip */}
            <section className="bg-background p-6 space-y-6" style={{ border: "1px solid hsl(var(--paper-mid))" }}>
              <div>
                <h2 className="font-display text-ink" style={{ fontSize: 22, fontWeight: 400 }}>Cities strip</h2>
                <p className="text-[12px] text-ink-soft mt-1" style={{ lineHeight: 1.5 }}>
                  Horizontal row of published cities. Only the heading is editable here — the cards are pulled from the Cities table.
                </p>
              </div>
              <Field label="Heading">
                <input
                  className={inputCls}
                  value={content.cities.title}
                  onChange={(e) => updateCities({ title: e.target.value })}
                />
              </Field>
            </section>

            {/* Featured buildings */}
            <section className="bg-background p-6 space-y-6" style={{ border: "1px solid hsl(var(--paper-mid))" }}>
              <div>
                <h2 className="font-display text-ink" style={{ fontSize: 22, fontWeight: 400 }}>Featured Buildings</h2>
                <p className="text-[12px] text-ink-soft mt-1" style={{ lineHeight: 1.5 }}>
                  Editorial intro above the asymmetric project grid. The cards themselves come from projects flagged as "Featured".
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Headline — lead" hint="Rendered in solid ink">
                  <input
                    className={inputCls}
                    value={content.buildings.headline_lead}
                    onChange={(e) => updateBuildings({ headline_lead: e.target.value })}
                  />
                </Field>
                <Field label="Headline — emphasis" hint="Rendered in italic terracotta">
                  <input
                    className={inputCls}
                    value={content.buildings.headline_emphasis}
                    onChange={(e) => updateBuildings({ headline_emphasis: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Description">
                <textarea
                  rows={3}
                  className={inputCls}
                  value={content.buildings.description}
                  onChange={(e) => updateBuildings({ description: e.target.value })}
                />
              </Field>
            </section>

            {/* Latest journal */}
            <section className="bg-background p-6 space-y-6" style={{ border: "1px solid hsl(var(--paper-mid))" }}>
              <div>
                <h2 className="font-display text-ink" style={{ fontSize: 22, fontWeight: 400 }}>Latest journal</h2>
                <p className="text-[12px] text-ink-soft mt-1" style={{ lineHeight: 1.5 }}>
                  Photo grid of recent posts. Cards are pulled from published posts ordered by date.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Headline — lead" hint="Rendered in solid ink">
                  <input
                    className={inputCls}
                    value={content.journal.headline_lead}
                    onChange={(e) => updateJournal({ headline_lead: e.target.value })}
                  />
                </Field>
                <Field label="Headline — emphasis" hint="Rendered in italic terracotta">
                  <input
                    className={inputCls}
                    value={content.journal.headline_emphasis}
                    onChange={(e) => updateJournal({ headline_emphasis: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Description">
                <textarea
                  rows={3}
                  className={inputCls}
                  value={content.journal.description}
                  onChange={(e) => updateJournal({ description: e.target.value })}
                />
              </Field>
              <Field label="CTA label" hint="Links to /practice">
                <input
                  className={inputCls}
                  value={content.journal.cta}
                  onChange={(e) => updateJournal({ cta: e.target.value })}
                />
              </Field>
            </section>

            {/* Newsletter */}
            <section className="bg-background p-6 space-y-6" style={{ border: "1px solid hsl(var(--paper-mid))" }}>
              <div>
                <h2 className="font-display text-ink" style={{ fontSize: 22, fontWeight: 400 }}>Newsletter</h2>
                <p className="text-[12px] text-ink-soft mt-1" style={{ lineHeight: 1.5 }}>
                  Subscription block at the bottom of every page. Form labels (Name, E-Mail, interest options) are not editable here.
                </p>
              </div>
              <Field label="Eyebrow">
                <input
                  className={inputCls}
                  value={content.newsletter.eyebrow}
                  onChange={(e) => updateNewsletter({ eyebrow: e.target.value })}
                />
              </Field>
              <Field label="Headline">
                <input
                  className={inputCls}
                  value={content.newsletter.headline}
                  onChange={(e) => updateNewsletter({ headline: e.target.value })}
                />
              </Field>
              <Field label="Description">
                <textarea
                  rows={3}
                  className={inputCls}
                  value={content.newsletter.description}
                  onChange={(e) => updateNewsletter({ description: e.target.value })}
                />
              </Field>
            </section>

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

const labelCls =
  "block font-mono uppercase text-ink-soft mb-2 font-medium";

function Field({ label, hint, children }: { label?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <label className={labelCls} style={{ fontSize: 10, letterSpacing: "0.22em" }}>
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
