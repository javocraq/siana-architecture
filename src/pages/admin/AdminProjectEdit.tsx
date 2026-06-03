import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import RichTextEditor from "@/components/admin/RichTextEditor";
import ImageUpload from "@/components/admin/ImageUpload";
import MapPicker from "@/components/admin/MapPicker";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";

type City = { id: string; name: string };

type Tab = "content" | "media" | "seo";

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
  tagline: string;
  description: string;
  architect: string;
  practice: string;
  city_id: string | null;
  category: string;
  style: string;
  era: string;
  year_completed: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  hero_image_url: string | null;
  cover_image_url: string | null;
  og_image_url: string | null;
  gallery: string[];
  featured: boolean;
  status: "draft" | "published";
  meta_title: string;
  meta_description: string;
  canonical_url: string;
};

const empty: FormState = {
  name: "",
  slug: "",
  tagline: "",
  description: "",
  architect: "",
  practice: "",
  city_id: null,
  category: "",
  style: "",
  era: "",
  year_completed: "",
  address: "",
  latitude: null,
  longitude: null,
  hero_image_url: null,
  cover_image_url: null,
  og_image_url: null,
  gallery: [],
  featured: false,
  status: "draft",
  meta_title: "",
  meta_description: "",
  canonical_url: "",
};

export default function AdminProjectEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("content");
  const [form, setForm] = useState<FormState>(empty);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(!isNew);

  useEffect(() => {
    supabase.from("cities").select("id,name").order("name").then(({ data }) => {
      setCities((data as City[]) || []);
    });
  }, []);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id!).maybeSingle();
      if (error || !data) {
        setError(error?.message || "Project not found");
        setLoading(false);
        return;
      }
      const gallery = Array.isArray(data.gallery) ? (data.gallery as string[]) : [];
      setForm({
        name: data.name || "",
        slug: data.slug || "",
        tagline: data.tagline || "",
        description: data.description || "",
        architect: data.architect || "",
        practice: data.practice || "",
        city_id: data.city_id,
        category: data.category || "",
        style: data.style || "",
        era: data.era || "",
        year_completed: data.year_completed != null ? String(data.year_completed) : "",
        address: data.address || "",
        latitude: data.latitude,
        longitude: data.longitude,
        hero_image_url: data.hero_image_url,
        cover_image_url: data.cover_image_url,
        og_image_url: data.og_image_url,
        gallery,
        featured: !!data.featured,
        status: (data.status as "draft" | "published") || "draft",
        meta_title: data.meta_title || "",
        meta_description: data.meta_description || "",
        canonical_url: data.canonical_url || "",
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
    if (!form.name.trim()) {
      setError("Name is required");
      setTab("content");
      return;
    }
    if (!form.slug.trim()) {
      setError("Slug is required");
      setTab("content");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      tagline: form.tagline || null,
      description: form.description || null,
      architect: form.architect || null,
      practice: form.practice || null,
      city_id: form.city_id,
      category: form.category || null,
      style: form.style || null,
      era: form.era || null,
      year_completed: form.year_completed ? parseInt(form.year_completed, 10) : null,
      address: form.address || null,
      latitude: form.latitude,
      longitude: form.longitude,
      hero_image_url: form.hero_image_url,
      cover_image_url: form.cover_image_url,
      og_image_url: form.og_image_url,
      gallery: form.gallery,
      featured: form.featured,
      status: publishOverride || form.status,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      canonical_url: form.canonical_url || null,
    };
    const finalStatus = publishOverride || form.status;
    if (isNew) {
      const { data, error } = await supabase.from("projects").insert(payload).select("id").single();
      setSaving(false);
      if (error) {
        setError(error.message);
        toast({ title: "Could not save project", description: error.message, variant: "destructive" });
        return;
      }
      toast({
        title: finalStatus === "published" ? "Project published" : "Draft saved",
        description: `“${payload.name}” has been ${finalStatus === "published" ? "published" : "saved as a draft"}.`,
      });
      navigate(`/admin/projects/${data.id}`, { replace: true });
    } else {
      const { error } = await supabase.from("projects").update(payload).eq("id", id!);
      setSaving(false);
      if (error) {
        setError(error.message);
        toast({ title: "Could not save project", description: error.message, variant: "destructive" });
        return;
      }
      if (publishOverride) set("status", publishOverride);
      toast({
        title:
          publishOverride === "published"
            ? "Project published"
            : publishOverride === "draft"
              ? "Moved to draft"
              : finalStatus === "published"
                ? "Project updated"
                : "Draft saved",
        description: `“${payload.name}” has been saved.`,
      });
    }
  };

  const serpTitle = form.meta_title || form.name || "Project title";
  const serpDesc = form.meta_description || form.tagline || "Meta description preview…";
  const serpUrl = `siana.com/projects/${form.slug || "slug"}`;

  const tabs: { key: Tab; label: string }[] = useMemo(
    () => [
      { key: "content", label: "Content" },
      { key: "media", label: "Media" },
      { key: "seo", label: "SEO" },
    ],
    []
  );

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
      <div className="px-10 py-8 max-w-[1100px]">
        <Link to="/admin/projects" className="inline-flex items-center gap-2 text-[11px] tracking-tag uppercase text-ink-muted hover:text-ink mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to projects
        </Link>

        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-2">{isNew ? "New" : "Edit"} project</p>
            <h1 className="font-display text-[28px] text-ink">{form.name || "Untitled project"}</h1>
          </div>
          <div className="flex items-center gap-3">
            {!isNew && form.status === "published" && (
              <Link to={`/projects/${form.slug}`} target="_blank" className="text-[11px] tracking-tag uppercase text-ink-muted hover:text-ink">
                View live ↗
              </Link>
            )}
            <button
              type="button"
              onClick={() => submit("draft")}
              disabled={saving}
              className="text-[11px] tracking-tag uppercase border hairline px-4 py-2.5 text-ink hover:bg-off-white disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => submit("published")}
              disabled={saving}
              className="text-[11px] tracking-tag uppercase text-background px-5 py-2.5 disabled:opacity-50"
              style={{ background: "hsl(var(--blue))" }}
            >
              {saving ? "Saving…" : form.status === "published" ? "Update" : "Publish"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b hairline mb-8">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-[11px] tracking-tag uppercase transition-colors relative ${
                tab === t.key ? "text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5" style={{ background: "hsl(var(--blue))" }} />
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 border hairline text-[12px] text-destructive bg-off-white">{error}</div>
        )}

        {tab === "content" && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <Field label="Name *">
                <input className={inputCls} value={form.name} onChange={(e) => onNameChange(e.target.value)} />
              </Field>
              <Field label="Slug *" hint="URL: /projects/{slug}">
                <input
                  className={inputCls}
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", slugify(e.target.value));
                  }}
                />
              </Field>
            </div>

            <Field label="Tagline" hint="One short sentence shown under the title">
              <input className={inputCls} value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
            </Field>

            <Field label="Description">
              <RichTextEditor
                value={form.description}
                onChange={(html) => set("description", html)}
                placeholder="Tell the story of this project…"
              />
            </Field>

            <div className="grid grid-cols-2 gap-6">
              <Field label="Architect"><input className={inputCls} value={form.architect} onChange={(e) => set("architect", e.target.value)} /></Field>
              <Field label="Practice"><input className={inputCls} value={form.practice} onChange={(e) => set("practice", e.target.value)} /></Field>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <Field label="City">
                <select
                  className={inputCls}
                  value={form.city_id || ""}
                  onChange={(e) => set("city_id", e.target.value || null)}
                >
                  <option value="">— Select —</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Category"><input className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)} /></Field>
              <Field label="Style"><input className={inputCls} value={form.style} onChange={(e) => set("style", e.target.value)} /></Field>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <Field label="Era"><input className={inputCls} value={form.era} onChange={(e) => set("era", e.target.value)} /></Field>
              <Field label="Year completed"><input type="number" className={inputCls} value={form.year_completed} onChange={(e) => set("year_completed", e.target.value)} /></Field>
              <Field label="Featured">
                <button
                  type="button"
                  onClick={() => set("featured", !form.featured)}
                  className="inline-flex items-center"
                  style={{
                    width: 36, height: 20, borderRadius: 9999,
                    background: form.featured ? "hsl(var(--blue))" : "rgba(0,0,0,0.15)",
                    position: "relative", transition: "background 0.2s ease",
                  }}
                >
                  <span style={{
                    position: "absolute", top: 2, left: form.featured ? 18 : 2,
                    width: 16, height: 16, borderRadius: 9999, background: "#fff",
                    transition: "left 0.2s ease", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  }} />
                </button>
              </Field>
            </div>

            <Field label="Address"><input className={inputCls} value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>

            <Field label="Location" hint={form.latitude && form.longitude ? `${form.latitude}, ${form.longitude}` : "Click on the map to place the pin"}>
              <MapPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
              />
            </Field>
          </div>
        )}

        {tab === "media" && (
          <div className="space-y-10">
            <div className="grid grid-cols-2 gap-6">
              <ImageUpload label="Hero image" value={form.hero_image_url} onChange={(url) => set("hero_image_url", url)} aspect="wide" />
              <ImageUpload label="Cover (thumbnail)" value={form.cover_image_url} onChange={(url) => set("cover_image_url", url)} aspect="square" />
            </div>

            <div>
              <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-3">Gallery</p>
              <div className="grid grid-cols-3 gap-4">
                {form.gallery.map((url, i) => (
                  <div key={i} className="relative group aspect-square bg-stone overflow-hidden border hairline">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => set("gallery", form.gallery.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 bg-background/90 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-ink" />
                    </button>
                  </div>
                ))}
                <ImageUpload
                  label=""
                  value={null}
                  aspect="square"
                  onChange={(url) => {
                    if (url) set("gallery", [...form.gallery, url]);
                  }}
                />
              </div>
            </div>
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
            <ImageUpload label="OG image (social share)" value={form.og_image_url} onChange={(url) => set("og_image_url", url)} aspect="wide" />

            <div>
              <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-3">Search preview</p>
              <div className="border hairline bg-background p-5">
                <p className="text-[11px] text-ink-muted truncate">{serpUrl}</p>
                <p className="text-[18px] mt-1 truncate" style={{ color: "hsl(var(--blue))" }}>{serpTitle}</p>
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
