import { useEffect, useState } from "react";
import { Loader2, X, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUpload from "@/components/admin/ImageUpload";
import { useToast } from "@/hooks/use-toast";
import { HOME_DEFAULTS, mergeHomeContent, type HomeContent } from "@/lib/homeContent";
import { adminInputCls, adminLabelCls } from "@/lib/adminUi";

/**
 * Edits the text blocks of the public homepage (hero + map preview).
 * Other strips on /home (Featured buildings, Latest journal, Newsletter)
 * are driven by their own data sources. Each block is collapsible so the
 * editor can fold away the ones it isn't working on.
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
          <h1
            className="font-display text-ink"
            style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.8rem)", fontWeight: 400, lineHeight: 1, letterSpacing: "-0.005em" }}
          >
            Home
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-ink-muted text-[12px]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Hero block */}
            <CollapsibleSection
              title="Hero"
              description="The first screen visitors see — eyebrow links, headline, intro line and CTAs."
            >
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

              <Field label="Title" hint="Press ↵ Enter to break onto a new line">
                <textarea
                  rows={2}
                  className={inputCls}
                  value={content.hero.headline}
                  onChange={(e) => updateHero({ headline: e.target.value })}
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

              <Field label="Hero images" hint="Background photos that cross-fade behind the hero. Leave empty to use the built-in curated set; the editor order is preserved.">
                <div className="space-y-3">
                  {content.hero.images.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {content.hero.images.map((src, i) => (
                        <div key={src + i} className="relative">
                          <img src={src} alt="" className="w-full aspect-[16/10] object-cover border hairline" />
                          <button
                            type="button"
                            onClick={() => updateHero({ images: content.hero.images.filter((_, j) => j !== i) })}
                            aria-label="Remove image"
                            className="absolute top-1 right-1 p-1 bg-background/90 border hairline text-ink-muted hover:text-ink press"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="max-w-[220px]">
                    <ImageUpload
                      key={content.hero.images.length}
                      label="Add image"
                      value={null}
                      onChange={(url) => { if (url) updateHero({ images: [...content.hero.images, url] }); }}
                      folder="home"
                    />
                  </div>
                </div>
              </Field>
            </CollapsibleSection>

            {/* Map preview block */}
            <CollapsibleSection
              title="Map preview"
              description="Editorial copy overlaid on the spinning globe section."
            >
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
            </CollapsibleSection>

            {/* Featured buildings */}
            <CollapsibleSection
              title="Featured Buildings"
              description='Editorial intro above the asymmetric project grid. The cards themselves come from projects flagged as "Featured".'
            >
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
            </CollapsibleSection>

            {/* Latest journal */}
            <CollapsibleSection
              title="Latest journal"
              description="Photo grid of recent posts. Cards are pulled from published posts ordered by date."
            >
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
            </CollapsibleSection>

            {/* Newsletter */}
            <CollapsibleSection
              title="Newsletter"
              description="Subscription block at the bottom of every page. Form labels (Name, E-Mail, interest options) are not editable here."
            >
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
            </CollapsibleSection>

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
const labelCls = adminLabelCls;

/**
 * Collapsible card. The header (title + description + chevron) is always
 * visible and toggles the body; defaults to open so nothing is hidden on
 * first load.
 */
function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = true,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="bg-white rounded-xl border border-paper-mid overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-start justify-between gap-4 text-left px-7 py-6 transition-colors hover:bg-paper-warm"
      >
        <div>
          <h2 className="font-display text-ink" style={{ fontSize: 22, fontWeight: 400 }}>{title}</h2>
          <p className="text-[12px] text-ink-soft mt-1" style={{ lineHeight: 1.5 }}>{description}</p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-ink-muted shrink-0 mt-1 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          strokeWidth={1.5}
        />
      </button>
      {open && <div className="px-7 pb-7 space-y-6">{children}</div>}
    </section>
  );
}

function Field({ label, hint, children }: { label?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      {children}
      {hint && <p className="mt-2 text-[12px] text-ink-soft">{hint}</p>}
    </div>
  );
}
