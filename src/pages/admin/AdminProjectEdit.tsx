import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import RichTextEditor from "@/components/admin/RichTextEditor";
import ImageUpload from "@/components/admin/ImageUpload";
import SaveBar from "@/components/admin/SaveBar";
import MapPicker from "@/components/admin/MapPicker";
import SelectOrCreate from "@/components/admin/SelectOrCreate";
import { useTaxonomies } from "@/hooks/useTaxonomies";
import { useToast } from "@/hooks/use-toast";
import { adminInputCls, adminLabelCls } from "@/lib/adminUi";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";

type City = { id: string; name: string; center_latitude: number | null; center_longitude: number | null };

type Tab = "content" | "seo";

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
  city_id: string | null;
  category: string;
  style: string;
  materials: string[];
  experience: string[];
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
  city_id: null,
  category: "",
  style: "",
  materials: [],
  experience: [],
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
  const tax = useTaxonomies();

  const [tab, setTab] = useState<Tab>("content");
  const [form, setForm] = useState<FormState>(empty);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  // What the site is showing right now, as opposed to `form.status`, which
  // is the visibility the editor has selected for the next save.
  const [savedStatus, setSavedStatus] = useState<"draft" | "published">("draft");
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [addingCity, setAddingCity] = useState(false);
  const [cityDraft, setCityDraft] = useState("");
  const [creatingCity, setCreatingCity] = useState(false);

  useEffect(() => {
    supabase
      .from("cities")
      .select("id,name,center_latitude,center_longitude")
      .order("name")
      .then(({ data }) => {
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
        city_id: data.city_id,
        category: data.category || "",
        style: data.style || "",
        materials: Array.isArray((data as any).materials) ? (data as any).materials : [],
        experience: Array.isArray((data as any).experience) ? (data as any).experience : [],
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
      setSavedStatus((data.status as "draft" | "published") || "draft");
      setLoading(false);
    })();
  }, [id, isNew]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const createCity = async () => {
    const name = cityDraft.trim();
    if (!name) return;
    setCreatingCity(true);
    const slug = slugify(name);
    const { data, error } = await supabase
      .from("cities")
      .insert({ name, slug, status: "draft" })
      .select("id, name")
      .single();
    setCreatingCity(false);
    if (error || !data) {
      toast({ title: "Could not create city", description: error?.message, variant: "destructive" });
      return;
    }
    setCities((cs) => [...cs, { id: data.id, name: data.name, center_latitude: null, center_longitude: null }].sort((a, b) => a.name.localeCompare(b.name)));
    set("city_id", data.id);
    setAddingCity(false);
    setCityDraft("");
    toast({ title: "City created", description: `“${data.name}” added as draft. Edit it later from /admin/cities.` });
  };

  const onNameChange = (v: string) => {
    setForm((f) => ({ ...f, name: v, slug: slugTouched ? f.slug : slugify(v) }));
  };

  /** Saves with whatever visibility the editor selected in the SaveBar. */
  const submit = async () => {
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
      city_id: form.city_id,
      category: form.category || null,
      style: form.style || null,
      materials: form.materials,
      experience: form.experience,
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
      status: form.status,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      canonical_url: form.canonical_url || null,
    };
    const finalStatus = form.status;
    const wasPublished = savedStatus === "published";

    const writeOnce = async (pl: any) => {
      if (isNew) return await supabase.from("projects").insert(pl).select("id").single();
      const r = await supabase.from("projects").update(pl).eq("id", id!);
      return { data: null as any, error: r.error };
    };

    let { data, error } = await writeOnce(payload);
    // If the materials/experience columns aren't in the DB yet (migration not
    // applied), save the rest so the editor never breaks.
    if (error && /materials|experience|schema cache|could not find/i.test(error.message || "")) {
      const { materials: _m, experience: _e, ...safe } = payload;
      ({ data, error } = await writeOnce(safe));
      if (!error) {
        toast({
          title: "Materials/Experience not saved yet",
          description: "Apply the DB migration (project materials/experience columns) to enable those fields.",
          variant: "destructive",
        });
      }
    }
    setSaving(false);
    if (error) {
      setError(error.message);
      toast({ title: "Could not save project", description: error.message, variant: "destructive" });
      return;
    }
    setSavedStatus(finalStatus);
    if (isNew) {
      toast({
        title: finalStatus === "published" ? "Project published" : "Draft saved",
        description: `“${payload.name}” has been ${finalStatus === "published" ? "published" : "saved as a draft"}.`,
      });
      navigate(`/admin/projects/${data.id}`, { replace: true });
    } else {
      toast({
        title:
          finalStatus === "published"
            ? wasPublished ? "Project updated" : "Project published"
            : wasPublished ? "Moved to draft" : "Draft saved",
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
      <div className="px-10 py-8">
        <Link to="/admin/projects" className="inline-flex items-center gap-2 text-[11px] tracking-tag uppercase text-ink-muted hover:text-ink mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to projects
        </Link>

        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-2">{isNew ? "New" : "Edit"} project</p>
            <h1 className="font-display text-[28px] text-ink">{form.name || "Untitled project"}</h1>
          </div>
          <SaveBar
            status={form.status}
            savedStatus={savedStatus}
            onStatusChange={(s) => set("status", s)}
            onSave={() => submit()}
            saving={saving}
            liveHref={isNew ? undefined : `/projects/${form.slug}`}
          />
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
                <span className="absolute left-0 right-0 -bottom-px h-0.5" style={{ background: "hsl(var(--ink))" }} />
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 border hairline text-[12px] text-destructive bg-off-white">{error}</div>
        )}

        {tab === "content" && (
          <div className="space-y-8">
            {/* Details on the left, hero image on the right. */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8 items-start">
              <div className="space-y-6">
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

            <Field label="Architect"><input className={inputCls} value={form.architect} onChange={(e) => set("architect", e.target.value)} /></Field>

            <div className="grid grid-cols-3 gap-6">
              <Field label="City" hint="Pick a city or add a new one">
                {addingCity ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      className={inputCls}
                      value={cityDraft}
                      onChange={(e) => setCityDraft(e.target.value)}
                      placeholder="New city name…"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); createCity(); }
                        else if (e.key === "Escape") { setAddingCity(false); setCityDraft(""); }
                      }}
                    />
                    <button
                      type="button"
                      onClick={createCity}
                      disabled={creatingCity || !cityDraft.trim()}
                      className="text-[11px] tracking-tag uppercase border hairline px-3 text-ink hover:bg-off-white whitespace-nowrap disabled:opacity-50"
                    >
                      {creatingCity ? "…" : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddingCity(false); setCityDraft(""); }}
                      className="text-[11px] tracking-tag uppercase px-2 text-ink-muted hover:text-ink whitespace-nowrap"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    className={inputCls}
                    value={form.city_id || ""}
                    onChange={(e) => {
                      if (e.target.value === "__add_city__") setAddingCity(true);
                      else set("city_id", e.target.value || null);
                    }}
                  >
                    <option value="">— Select —</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="__add_city__">+ Add new city…</option>
                  </select>
                )}
              </Field>
              <Field label="Category">
                <SelectOrCreate value={form.category} onChange={(v) => set("category", v)} options={tax.categories} />
              </Field>
              <Field label="Style">
                <SelectOrCreate
                  value={form.style}
                  onChange={(v) => set("style", v)}
                  options={tax.styles}
                />
              </Field>
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
                    background: form.featured ? "hsl(var(--ink))" : "rgba(0,0,0,0.15)",
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Materials" hint="Filterable on the Map">
                <ChipMulti
                  options={tax.materials}
                  selected={form.materials}
                  onToggle={(v) => set("materials", form.materials.includes(v) ? form.materials.filter((x) => x !== v) : [...form.materials, v])}
                />
              </Field>
              <Field label="Experience" hint="Filterable on the Map">
                <ChipMulti
                  options={tax.experiences}
                  selected={form.experience}
                  onToggle={(v) => set("experience", form.experience.includes(v) ? form.experience.filter((x) => x !== v) : [...form.experience, v])}
                />
              </Field>
            </div>

            <Field label="Address"><input className={inputCls} value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
              </div>

              <div className="space-y-6">
                <ImageUpload label="Hero image" value={form.hero_image_url} onChange={(url) => set("hero_image_url", url)} aspect="wide" />
                <div>
                  <ImageUpload label="Cover (thumbnail)" value={form.cover_image_url} onChange={(url) => set("cover_image_url", url)} aspect="square" />
                  <p className="mt-2 text-[11px] text-ink-faint">Used in card grids. Falls back to the hero image if empty.</p>
                </div>
              </div>
            </div>

            {/* Map — full width, below the details. As soon as the editor types
                a project name (and ideally picks a city), the map auto-locates
                to that building/address. Clicking, dragging or searching after
                that takes precedence — auto-locate never overrides a manual pin. */}
            <Field label="Location" hint={form.latitude && form.longitude ? `${form.latitude}, ${form.longitude}` : "We'll locate the project automatically as you type the name — click or drag to fine-tune"}>
              {(() => {
                const selectedCity = cities.find((c) => c.id === form.city_id);
                const proximity: [number, number] | undefined =
                  selectedCity && selectedCity.center_longitude != null && selectedCity.center_latitude != null
                    ? [selectedCity.center_longitude, selectedCity.center_latitude]
                    : undefined;
                return (
                  <MapPicker
                    latitude={form.latitude}
                    longitude={form.longitude}
                    defaultPlace={[form.name, selectedCity?.name].filter(Boolean).join(", ")}
                    defaultPlaceTypes="poi,address,place"
                    proximity={proximity}
                    cityName={selectedCity?.name}
                    maxDistanceKm={selectedCity ? 80 : undefined}
                    onChange={(lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
                  />
                );
              })()}
            </Field>

            {/* Description — below the map. */}
            <Field label="Description">
              <RichTextEditor
                value={form.description}
                onChange={(html) => set("description", html)}
                placeholder="Tell the story of this project…"
              />
            </Field>

            {/* Gallery — additional images shown on the public project page. */}
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
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-start">
            <div className="space-y-8">
              <Field label="Meta title" hint={`${form.meta_title.length}/60 characters`}>
                <input className={inputCls} value={form.meta_title} onChange={(e) => set("meta_title", e.target.value)} maxLength={80} />
              </Field>
              <Field label="Meta description" hint={`${form.meta_description.length}/160 characters`}>
                <textarea rows={3} className={inputCls} value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)} maxLength={200} />
              </Field>
              <Field label="Canonical URL">
                <input className={inputCls} value={form.canonical_url} onChange={(e) => set("canonical_url", e.target.value)} placeholder="https://…" />
              </Field>

              <div>
                <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-3">Search preview</p>
                <div className="border hairline bg-background p-5">
                  <p className="text-[11px] text-ink-muted truncate">{serpUrl}</p>
                  <p className="text-[18px] mt-1 truncate" style={{ color: "hsl(var(--ink))" }}>{serpTitle}</p>
                  <p className="text-[13px] text-ink-muted mt-1 line-clamp-2">{serpDesc}</p>
                </div>
              </div>
            </div>

            <ImageUpload label="OG image (social share)" value={form.og_image_url} onChange={(url) => set("og_image_url", url)} aspect="wide" />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

const inputCls = adminInputCls;

function ChipMulti({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className="uppercase tracking-[0.1em] px-3 py-1.5 border transition-colors"
            style={
              on
                ? { fontSize: 11, background: "hsl(var(--ink))", color: "#fff", borderColor: "hsl(var(--ink))" }
                : { fontSize: 11, borderColor: "rgba(0,0,0,0.15)", color: "hsl(var(--ink-soft))" }
            }
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className={adminLabelCls}>{label}</label>}
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}
