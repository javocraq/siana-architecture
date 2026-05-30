import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/site/SiteLayout";
import SEO from "@/components/site/SEO";
import RichHtml from "@/components/site/RichHtml";


interface Project {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  architect: string | null;
  practice: string | null;
  year_completed: number | null;
  category: string | null;
  style: string | null;
  era: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  hero_image_url: string | null;
  cover_image_url: string | null;
  gallery: any;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  city: { name: string; slug: string } | null;
}

const cormorant: React.CSSProperties = {
  fontFamily: '"Cormorant Garamond", serif',
  fontWeight: 300,
  letterSpacing: "0.01em",
  textTransform: "none",
};

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("*, city:cities(name, slug)")
        .eq("slug", slug).eq("status", "published").maybeSingle();
      if (!data) { setNotFound(true); setLoading(false); return; }
      setProject(data as any);
      setLoading(false);
    })();
  }, [slug]);

  if (notFound) {
    return (
      <SiteLayout>
        <div className="pt-40 pb-32 mx-auto max-w-[1280px] px-6 text-center">
          <h1 style={{ ...cormorant, fontSize: 56 }} className="text-ink">Project not found</h1>
          <Link to="/" className="text-[12px] tracking-tag uppercase text-ink-muted hover:opacity-60 mt-6 inline-block">← Home</Link>
        </div>
      </SiteLayout>
    );
  }

  if (loading || !project) {
    return <SiteLayout><div className="pt-40 mx-auto max-w-[1280px] px-6 text-ink-muted text-[12px] tracking-tag uppercase">Loading…</div></SiteLayout>;
  }

  const gallery: { url: string; caption?: string }[] = Array.isArray(project.gallery) ? project.gallery : [];

  // 4-column meta strip — only the editorial essentials
  const metaStrip = [
    { label: "Architect", value: project.architect },
    { label: "Year", value: project.year_completed?.toString() },
    { label: "City", value: project.city?.name, href: project.city ? `/cities/${project.city.slug}` : null },
    { label: "Style", value: project.style },
  ].filter((m) => m.value);

  const isHtml = /<\/?[a-z][\s\S]*>/i.test(project.description || "");
  const paragraphs = isHtml ? [] : (project.description || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);


  return (
    <SiteLayout>
      <SEO
        title={project.meta_title || `${project.name} — Siana Architecture`}
        description={project.meta_description || project.tagline}
        image={project.og_image_url || project.hero_image_url || project.cover_image_url}
        type="article"
      />



      {/* Hero — full natural color, no filter */}
      <section className="relative h-[90vh] min-h-[600px] overflow-hidden">
        {project.hero_image_url && (
          <img src={project.hero_image_url} alt={project.name} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/15 via-transparent to-ink/55" />
        <div className="absolute inset-0 flex flex-col justify-end pb-16 md:pb-20">
          <div className="mx-auto max-w-[1280px] w-full px-6 lg:px-10 text-background">
            {project.city && (
              <Link to={`/cities/${project.city.slug}`} className="text-[10px] tracking-tag uppercase opacity-80 hover:opacity-100 mb-4 inline-block">
                {project.city.name}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Hairline rule before title block */}
      <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }} />

      {/* Title block */}
      <section className="pt-16 md:pt-24 pb-10 mx-auto max-w-[1280px] px-6 lg:px-10">
        <h1
          className="text-ink"
          style={{
            ...cormorant,
            fontSize: "clamp(40px, 7vw, 72px)",
            lineHeight: 1.05,
          }}
        >
          {project.name}
        </h1>
        {project.tagline && (
          <p
            className="text-ink-muted mt-6 max-w-2xl italic"
            style={{ ...cormorant, fontWeight: 400, fontSize: "clamp(20px, 2vw, 26px)", lineHeight: 1.5 }}
          >
            {project.tagline}
          </p>
        )}
      </section>

      {/* Meta strip — 4-column definition list */}
      {metaStrip.length > 0 && (
        <section className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <dl
            className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-12 pt-10 pb-10"
            style={{ borderTop: "1px solid rgba(0,0,0,0.08)", borderBottom: "1px solid rgba(0,0,0,0.08)" }}
          >
            {metaStrip.map((m) => (
              <div key={m.label}>
                <dt className="text-[10px] tracking-tag uppercase text-ink-muted mb-3">{m.label}</dt>
                <dd className="text-[15px]" style={{ color: "#0f0f0f" }}>
                  {m.href ? (
                    <Link to={m.href} className="hover:opacity-60">{m.value}</Link>
                  ) : m.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* 60px breathing room */}
      <div style={{ height: 60 }} />

      {/* Body */}
      {isHtml && project.description && (
        <section className="mx-auto max-w-[760px] px-6 lg:px-10 pb-20 md:pb-28">
          <RichHtml html={project.description} />
        </section>
      )}
      {!isHtml && paragraphs.length > 0 && (
        <section className="mx-auto max-w-[760px] px-6 lg:px-10 pb-20 md:pb-28">
          {paragraphs.map((p, i) => {
            const isPullQuote = i > 0 && i < paragraphs.length - 1 && p.length < 220;
            if (isPullQuote) {
              return (
                <blockquote
                  key={i}
                  className="my-12 pl-8 italic text-ink"
                  style={{ ...cormorant, fontWeight: 400, fontSize: 32, lineHeight: 1.35, borderLeft: "3px solid #2563EB" }}
                >
                  {p}
                </blockquote>
              );
            }
            return (
              <p
                key={i}
                className="text-ink mb-8"
                style={{ ...cormorant, fontWeight: 400, fontSize: 19, lineHeight: 1.75, whiteSpace: "pre-line" }}
              >
                {p}
              </p>
            );
          })}
        </section>
      )}


      {/* Byline card — full-width #f8f7f4 strip */}
      {(project.architect || project.practice) && (
        <section className="bg-off-white py-16 md:py-20 text-center px-6">
          {project.architect && (
            <p style={{ ...cormorant, fontWeight: 400, fontSize: 28, color: "#0f0f0f", lineHeight: 1.2 }}>
              {project.architect}
            </p>
          )}
          {project.practice && (
            <p
              className="mt-3 uppercase"
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 300,
                fontSize: 12,
                letterSpacing: "0.18em",
                color: "hsl(var(--ink-muted))",
              }}
            >
              {project.practice}
            </p>
          )}
        </section>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
            <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-10">Gallery</p>
            <div className="space-y-16">
              {gallery.map((img, i) => (
                <figure key={i}>
                  <div className="bg-stone overflow-hidden">
                    <img src={img.url} alt={img.caption || `${project.name} — ${i + 1}`} className="w-full h-auto" loading="lazy" />
                  </div>
                  {img.caption && (
                    <figcaption className="text-[11px] tracking-tag uppercase text-ink-muted mt-4">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Back link */}
      <section className="pb-24 md:pb-32 mx-auto max-w-[1280px] px-6 lg:px-10">
        <Link to="/cities" className="text-[11px] tracking-tag uppercase text-ink hover:opacity-60 border-t hairline pt-8 inline-block w-full">
          ← Explore more
        </Link>
      </section>
    </SiteLayout>
  );
}
