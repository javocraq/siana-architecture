import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import RichTextEditor from "@/components/admin/RichTextEditor";
import ImageUpload from "@/components/admin/ImageUpload";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { kindConfig } from "@/lib/postKind";
import { useTaxonomies } from "@/hooks/useTaxonomies";
import { adminInputCls, adminLabelCls } from "@/lib/adminUi";

type City = { id: string; name: string };
type Project = { id: string; name: string; slug: string };

type Tab = "content" | "seo";


const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  author: string;
  category: string;
  city_tags: string[];
  linked_project_ids: string[];
  hero_image_url: string | null;
  og_image_url: string | null;
  status: "draft" | "published";
  published_at: string | null;
  meta_title: string;
  meta_description: string;
  canonical_url: string;
};

const empty: FormState = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  author: "",
  category: "",
  city_tags: [],
  linked_project_ids: [],
  hero_image_url: null,
  og_image_url: null,
  status: "draft",
  published_at: null,
  meta_title: "",
  meta_description: "",
  canonical_url: "",
};

export default function AdminJournalEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const kind = "resource" as const;
  const cfg = kindConfig();
  const { toast } = useToast();
  const tax = useTaxonomies();


  const [tab, setTab] = useState<Tab>("content");
  const [form, setForm] = useState<FormState>(empty);
  const [cities, setCities] = useState<City[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [projectQuery, setProjectQuery] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("cities").select("id,name").order("name"),
      supabase.from("projects").select("id,name,slug").order("name"),
    ]).then(([{ data: cs }, { data: ps }]) => {
      setCities((cs as City[]) || []);
      setProjects((ps as Project[]) || []);
    });
  }, []);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data, error } = await supabase.from("posts").select("*").eq("id", id!).maybeSingle();
      if (error || !data) {
        setError(error?.message || "Post not found");
        setLoading(false);
        return;
      }
      setForm({
        title: data.title || "",
        slug: data.slug || "",
        excerpt: data.excerpt || "",
        body: data.body || "",
        author: data.author || "",
        category: data.category || "",
        city_tags: data.city_tags || [],
        linked_project_ids: data.linked_project_ids || [],
        hero_image_url: data.hero_image_url,
        og_image_url: data.og_image_url,
        status: (data.status as "draft" | "published") || "draft",
        published_at: data.published_at,
        meta_title: data.meta_title || "",
        meta_description: data.meta_description || "",
        canonical_url: data.canonical_url || "",
      });
      setLoading(false);
    })();
  }, [id, isNew]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onTitleChange = (v: string) => {
    setForm((f) => ({ ...f, title: v, slug: slugTouched ? f.slug : slugify(v) }));
  };

  const toggleCity = (cityId: string) => {
    setForm((f) => ({
      ...f,
      city_tags: f.city_tags.includes(cityId)
        ? f.city_tags.filter((x) => x !== cityId)
        : [...f.city_tags, cityId],
    }));
  };

  const toggleProject = (pid: string) => {
    setForm((f) => ({
      ...f,
      linked_project_ids: f.linked_project_ids.includes(pid)
        ? f.linked_project_ids.filter((x) => x !== pid)
        : [...f.linked_project_ids, pid],
    }));
  };

  const submit = async (publishOverride?: "draft" | "published") => {
    setError(null);
    if (!form.title.trim()) {
      setError("Title is required");
      setTab("content");
      return;
    }
    if (!form.slug.trim()) {
      setError("Slug is required");
      setTab("content");
      return;
    }
    setSaving(true);
    const newStatus = publishOverride || form.status;
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt || null,
      body: form.body || null,
      author: form.author || null,
      category: form.category || null,
      city_tags: form.city_tags,
      linked_project_ids: form.linked_project_ids,
      hero_image_url: form.hero_image_url,
      og_image_url: form.og_image_url,
      status: newStatus,
      kind,
      published_at:
        newStatus === "published"
          ? form.published_at || new Date().toISOString()
          : form.published_at,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      canonical_url: form.canonical_url || null,
    };
    if (isNew) {
      const { data, error } = await supabase.from("posts").insert(payload).select("id").single();
      setSaving(false);
      if (error) {
        setError(error.message);
        toast({ title: `Could not save ${cfg.label.toLowerCase()}`, description: error.message, variant: "destructive" });
        return;
      }
      toast({
        title: newStatus === "published" ? `${cfg.label} published` : "Draft saved",
        description: `“${payload.title}” has been ${newStatus === "published" ? "published" : "saved as a draft"}.`,
      });
      navigate(`${cfg.adminBase}/${data.id}`, { replace: true });

    } else {
      const { error } = await supabase.from("posts").update(payload).eq("id", id!);
      setSaving(false);
      if (error) {
        setError(error.message);
        toast({ title: `Could not save ${cfg.label.toLowerCase()}`, description: error.message, variant: "destructive" });
        return;
      }
      if (publishOverride) {
        set("status", publishOverride);
        if (publishOverride === "published" && !form.published_at) {
          set("published_at", payload.published_at);
        }
      }
      toast({
        title:
          publishOverride === "published"
            ? `${cfg.label} published`
            : publishOverride === "draft"
              ? "Moved to draft"
              : newStatus === "published"
                ? `${cfg.label} updated`
                : "Draft saved",
        description: `“${payload.title}” has been saved.`,
      });
    }
  };

  const serpTitle = form.meta_title || form.title || "Post title";
  const serpDesc = form.meta_description || form.excerpt || "Meta description preview…";
  const serpUrl = `siana.com/journal/${form.slug || "slug"}`;

  const tabs: { key: Tab; label: string }[] = useMemo(
    () => [
      { key: "content", label: "Content" },
      { key: "seo", label: "SEO" },
    ],
    []
  );

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectQuery.toLowerCase())
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
        <Link to={cfg.adminBase} className="inline-flex items-center gap-2 text-[11px] tracking-tag uppercase text-ink-muted hover:text-ink mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to {cfg.sectionTitle.toLowerCase()}
        </Link>

        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-2">{isNew ? "New" : "Edit"} {cfg.label.toLowerCase()}</p>
            <h1 className="font-display text-[28px] text-ink">{form.title || `Untitled ${cfg.label.toLowerCase()}`}</h1>
          </div>
          <div className="flex items-center gap-3">
            {!isNew && form.status === "published" && (
              <Link to={`${cfg.publicBase}/${form.slug}`} target="_blank" className="text-[11px] tracking-tag uppercase text-ink-muted hover:text-ink">
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
              style={{ background: "hsl(var(--ink))" }}
            >
              {saving ? "Saving…" : form.status === "published" ? "Update" : "Publish"}
            </button>
          </div>
        </div>

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
            {/* Title / slug / excerpt on the left, hero image on the right
                (mirrors the project editor: keeps the visual at a glance
                without crowding the body editor below). */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8 items-start">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <Field label="Title *">
                    <input className={inputCls} value={form.title} onChange={(e) => onTitleChange(e.target.value)} />
                  </Field>
                  <Field label="Slug *" hint="URL: /journal/{slug}">
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

                <Field label="Excerpt" hint="Short summary shown on the journal index">
                  <textarea rows={2} className={inputCls} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
                </Field>
              </div>

              <ImageUpload
                label="Hero image"
                value={form.hero_image_url}
                onChange={(url) => set("hero_image_url", url)}
                aspect="wide"
              />
            </div>

            <Field label="Body">
              <RichTextEditor
                value={form.body}
                onChange={(html) => set("body", html)}
                placeholder="Write the article…"
              />
            </Field>

            <div className="grid grid-cols-2 gap-6">
              <Field label="Author">
                <input className={inputCls} value={form.author} onChange={(e) => set("author", e.target.value)} />
              </Field>
              <Field label="Category">
                <select
                  className={inputCls}
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                >
                  <option value="">— Select —</option>
                  {(form.category && !tax.categories.includes(form.category)
                    ? [form.category, ...tax.categories]
                    : tax.categories
                  ).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="City tags" hint="Cities this post relates to">
              <div className="flex flex-wrap gap-2">
                {cities.map((c) => {
                  const active = form.city_tags.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCity(c.id)}
                      className="text-[11px] tracking-ui px-3 py-1.5 border hairline transition-colors"
                      style={{
                        background: active ? "hsl(var(--ink))" : "transparent",
                        color: active ? "#fff" : "hsl(var(--ink))",
                        borderColor: active ? "hsl(var(--ink))" : undefined,
                      }}
                    >
                      {c.name}
                    </button>
                  );
                })}
                {cities.length === 0 && (
                  <p className="text-[11px] text-ink-faint">No cities yet.</p>
                )}
              </div>
            </Field>

            <Field label="Linked projects" hint="Projects featured or referenced in this post">
              <input
                className={inputCls + " mb-3"}
                placeholder="Search projects…"
                value={projectQuery}
                onChange={(e) => setProjectQuery(e.target.value)}
              />
              {form.linked_project_ids.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.linked_project_ids.map((pid) => {
                    const p = projects.find((x) => x.id === pid);
                    if (!p) return null;
                    return (
                      <span
                        key={pid}
                        className="inline-flex items-center gap-2 text-[11px] px-2.5 py-1 border hairline bg-off-white"
                      >
                        {p.name}
                        <button type="button" onClick={() => toggleProject(pid)}>
                          <X className="w-3 h-3 text-ink-muted hover:text-ink" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="border hairline max-h-[220px] overflow-y-auto bg-background">
                {filteredProjects.map((p) => {
                  const active = form.linked_project_ids.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProject(p.id)}
                      className={`w-full text-left px-3 py-2 text-[12px] flex items-center justify-between border-b hairline last:border-b-0 ${
                        active ? "bg-off-white" : "hover:bg-off-white/50"
                      }`}
                    >
                      <span className="text-ink">{p.name}</span>
                      <span className="text-[10px] text-ink-faint">{active ? "✓ Linked" : "Add"}</span>
                    </button>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <p className="px-3 py-4 text-[11px] text-ink-faint">No projects match.</p>
                )}
              </div>
            </Field>
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

const inputCls = adminInputCls;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className={adminLabelCls}>{label}</label>}
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}
