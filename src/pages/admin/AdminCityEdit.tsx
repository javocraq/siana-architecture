import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import RichTextEditor from "@/components/admin/RichTextEditor";
import ImageUpload from "@/components/admin/ImageUpload";
import MapPicker from "@/components/admin/MapPicker";
import SectionBuilder from "@/components/admin/SectionBuilder";
import SelectOrCreate from "@/components/admin/SelectOrCreate";
import { REGIONS } from "@/lib/adminTaxonomies";
import type { CitySection } from "@/lib/citySections";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

type Tab = "content" | "layout" | "media" | "seo";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

type FormState = {
  name: string;
  slug: string;
  country: string;
  region: string;
  tagline: string;
  description: string;
  center_latitude: number | null;
  center_longitude: number | null;
  default_zoom: number;
  hero_image_url: string | null;
  og_image_url: string | null;
  status: "draft" | "published";
  meta_title: string;
  meta_description: string;
  canonical_url: string;
  sections: CitySection[];
};

const empty: FormState = {
  name: "",
  slug: "",
  country: "",
  region: "",
  tagline: "",
  description: "",
  center_latitude: null,
  center_longitude: null,
  default_zoom: 13,
  hero_image_url: null,
  og_image_url: null,
  status: "draft",
  meta_title: "",
  meta_description: "",
  canonical_url: "",
  sections: [],
};

export default function AdminCityEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("content");
  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(!isNew);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data, error } = await supabase.from("cities").select("*").eq("id", id!).maybeSingle();
      if (error || !data) {
        setError(error?.message || "City not found");
        setLoading(false);
        return;
      }
      setForm({
        name: data.name || "",
        slug: data.slug || "",
        country: data.country || "",
        region: (data as any).region || "",
        tagline: data.tagline || "",
        description: data.description || "",
        center_latitude: data.center_latitude,
        center_longitude: data.center_longitude,
        default_zoom: data.default_zoom ?? 13,
        hero_image_url: data.hero_image_url,
        og_image_url: data.og_image_url,
        status: (data.status as "draft" | "published") || "draft",
        meta_title: data.meta_title || "",
        meta_description: data.meta_description || "",
        canonical_url: data.canonical_url || "",
        sections: Array.isArray((data as any).sections) ? ((data as any).sections as CitySection[]) : [],
      });
      setLoading(false);
    })();
  }, [id, isNew]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onNameChange = (v: string) => {
    setForm((f) => ({ ...f, name: v, slug: slugTouched ? f.slug : slugify(v) }));
  };

  const submit = async (publishOverride?: "draft" | "published") => {
    setError(null);
    if (!form.name.trim()) { setError("Name is required"); setTab("content"); return; }
    if (!form.slug.trim()) { setError("Slug is required"); setTab("content"); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      country: form.country || null,
      region: form.region || null,
      tagline: form.tagline || null,
      description: form.description || null,
      center_latitude: form.center_latitude,
      center_longitude: form.center_longitude,
      default_zoom: form.default_zoom,
      hero_image_url: form.hero_image_url,
      og_image_url: form.og_image_url,
      status: publishOverride || form.status,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      canonical_url: form.canonical_url || null,
      sections: form.sections as any,
    };
    const finalStatus = publishOverride || form.status;
    if (isNew) {
      const { data, error } = await supabase.from("cities").insert(payload).select("id").single();
      setSaving(false);
      if (error) {
        setError(error.message);
        toast({ title: "Could not save city", description: error.message, variant: "destructive" });
        return;
      }
      toast({
        title: finalStatus === "published" ? "City published" : "Draft saved",
        description: `“${payload.name}” has been ${finalStatus === "published" ? "published" : "saved as a draft"}.`,
      });
      navigate(`/admin/cities/${data.id}`, { replace: true });
    } else {
      const { error } = await supabase.from("cities").update(payload).eq("id", id!);
      setSaving(false);
      if (error) {
        setError(error.message);
        toast({ title: "Could not save city", description: error.message, variant: "destructive" });
        return;
      }
      if (publishOverride) set("status", publishOverride);
      toast({
        title:
          publishOverride === "published"
            ? "City published"
            : publishOverride === "draft"
              ? "Moved to draft"
              : finalStatus === "published"
                ? "City updated"
                : "Draft saved",
        description: `“${payload.name}” has been saved.`,
      });
    }
  };

  const serpTitle = form.meta_title || form.name || "City title";
  const serpDesc = form.meta_description || form.tagline || "Meta description preview…";
  const serpUrl = `siana.com/cities/${form.slug || "slug"}`;

  const tabs = useMemo<{ key: Tab; label: string }[]>(() => [
    { key: "content", label: "Content" },
    { key: "layout", label: "Layout" },
    { key: "media", label: "Media" },
    { key: "seo", label: "SEO" },
  ], []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="px-10 py-10 flex items-center gap-3 text-ink-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="px-10 py-8">
        <Link to="/admin/cities" className="inline-flex items-center gap-2 text-[11px] tracking-tag uppercase text-ink-muted hover:text-ink mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to cities
        </Link>

        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-2">{isNew ? "New" : "Edit"} city</p>
            <h1 className="font-display text-[28px] text-ink">{form.name || "Untitled city"}</h1>
          </div>
          <div className="flex items-center gap-3">
            {!isNew && form.status === "published" && (
              <Link to={`/cities/${form.slug}`} target="_blank" className="text-[11px] tracking-tag uppercase text-ink-muted hover:text-ink">
                View live ↗
              </Link>
            )}
            <button type="button" onClick={() => submit("draft")} disabled={saving}
              className="text-[11px] tracking-tag uppercase border hairline px-4 py-2.5 text-ink hover:bg-off-white disabled:opacity-50">
              Save draft
            </button>
            <button type="button" onClick={() => submit("published")} disabled={saving}
              className="text-[11px] tracking-tag uppercase text-background px-5 py-2.5 disabled:opacity-50"
              style={{ background: "hsl(var(--ink))" }}>
              {saving ? "Saving…" : form.status === "published" ? "Update" : "Publish"}
            </button>
          </div>
        </div>

        <div className="flex gap-6 border-b hairline mb-8">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`pb-3 text-[11px] tracking-tag uppercase transition-colors relative ${tab === t.key ? "text-ink" : "text-ink-muted hover:text-ink"}`}>
              {t.label}
              {tab === t.key && <span className="absolute left-0 right-0 -bottom-px h-0.5" style={{ background: "hsl(var(--ink))" }} />}
            </button>
          ))}
        </div>

        {error && <div className="mb-6 px-4 py-3 border hairline text-[12px] text-destructive bg-off-white">{error}</div>}

        {tab === "content" && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <Field label="Name *">
                <input className={inputCls} value={form.name} onChange={(e) => onNameChange(e.target.value)} />
              </Field>
              <Field label="Slug *" hint="URL: /cities/{slug}">
                <input className={inputCls} value={form.slug}
                  onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
              </Field>
            </div>

            <Field label="Country">
              <input className={inputCls} value={form.country} onChange={(e) => set("country", e.target.value)} />
            </Field>

            <Field label="Region" hint="Pick from the list or add a new one">
              <SelectOrCreate
                value={form.region}
                onChange={(v) => set("region", v)}
                options={REGIONS}
              />
            </Field>

            <Field label="Tagline" hint="One short sentence shown under the title">
              <input className={inputCls} value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
            </Field>

            <Field label="Description">
              <RichTextEditor value={form.description} onChange={(html) => set("description", html)}
                placeholder="Tell the story of this city…" />
            </Field>

            <Field label="Map center" hint={form.center_latitude && form.center_longitude ? `${form.center_latitude}, ${form.center_longitude}` : "Click on the map to set the default center"}>
              <MapPicker latitude={form.center_latitude} longitude={form.center_longitude}
                onChange={(lat, lng) => setForm((f) => ({ ...f, center_latitude: lat, center_longitude: lng }))} />
            </Field>

            <Field label={`Default zoom — ${form.default_zoom}`} hint="0 (world) → 22 (street)">
              <input type="range" min={1} max={20} step={1} value={form.default_zoom}
                onChange={(e) => set("default_zoom", parseInt(e.target.value, 10))}
                className="w-full" />
            </Field>
          </div>
        )}

        {tab === "layout" && (
          <div className="space-y-6">
            <div className="border hairline bg-off-white px-5 py-4 text-[12px] text-ink-muted leading-relaxed">
              Build the city landing page from modular blocks. Drag to reorder, toggle to enable/disable.
              <br />
              <strong className="text-ink">Tip:</strong> if you leave this empty, the page falls back to the default layout (Description → Projects → Journal).
            </div>
            <SectionBuilder value={form.sections} onChange={(s) => set("sections", s)} />
          </div>
        )}

        {tab === "media" && (
          <div className="space-y-10 max-w-[760px]">
            <ImageUpload label="Hero image" value={form.hero_image_url} onChange={(url) => set("hero_image_url", url)} aspect="wide" folder="cities" />
          </div>
        )}

        {tab === "seo" && (
          <div className="space-y-8 max-w-[760px]">
            <Field label="Meta title" hint={`${form.meta_title.length}/60 characters`}>
              <input className={inputCls} value={form.meta_title} onChange={(e) => set("meta_title", e.target.value)} maxLength={80} />
            </Field>
            <Field label="Meta description" hint={`${form.meta_description.length}/160 characters`}>
              <textarea rows={3} className={inputCls} value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)} maxLength={200} />
            </Field>
            <Field label="Canonical URL">
              <input className={inputCls} value={form.canonical_url} onChange={(e) => set("canonical_url", e.target.value)} placeholder="https://…" />
            </Field>
            <ImageUpload label="OG image (social share)" value={form.og_image_url} onChange={(url) => set("og_image_url", url)} aspect="wide" folder="cities" />

            <div>
              <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-3">Search preview</p>
              <div className="border hairline bg-background p-5">
                <p className="text-[11px] text-ink-muted truncate">{serpUrl}</p>
                <p className="text-[18px] mt-1 truncate" style={{ color: "hsl(var(--ink))" }}>{serpTitle}</p>
                <p className="text-[13px] text-ink-muted mt-1 line-clamp-2">{serpDesc}</p>
              </div>
            </div>
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
