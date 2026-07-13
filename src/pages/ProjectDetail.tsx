import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/site/SiteLayout";
import SEO from "@/components/site/SEO";
import RichHtml from "@/components/site/RichHtml";
import EditorialButton from "@/components/site/EditorialButton";


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
  fontFamily: "'Adobe Garamond Pro', 'EB Garamond', Garamond, Georgia, serif",
  fontWeight: 500,
  letterSpacing: "-0.015em",
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
          <Link to="/" className="text-[13px] font-medium tracking-[0.16em] uppercase text-ink-soft hover:opacity-60 mt-6 inline-block">← Home</Link>
        </div>
      </SiteLayout>
    );
  }

  if (loading || !project) {
    return (
      <SiteLayout>
        <div className="min-h-screen">
          <div className="relative h-[80vh] min-h-[560px] overflow-hidden bg-paper-mid animate-pulse" />
        </div>
      </SiteLayout>
    );
  }

  // The admin saves gallery as a string[] (just URLs); older records may also
  // be stored as {url, caption}[]. Normalize both shapes so the renderer can
  // assume {url, caption?}.
  const gallery: { url: string; caption?: string }[] = Array.isArray(project.gallery)
    ? (project.gallery as any[])
        .map((g) => (typeof g === "string" ? { url: g } : g))
        .filter((g) => g && typeof g.url === "string" && g.url)
    : [];

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
              <Link to={`/cities/${project.city.slug}`} className="text-[13px] font-semibold tracking-[0.16em] uppercase opacity-90 hover:opacity-100 mb-4 inline-block">
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
            fontSize: "clamp(30px, 5vw, 52px)",
            lineHeight: 1.08,
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

      {/* 60px breathing room */}
      <div style={{ height: 60 }} />

      {/* Body — same editorial typography as the city description (Garamond
          serif, large clamp size, generous line-height) so projects and cities
          read as one design system. */}
      {isHtml && project.description && (
        <section className="mx-auto max-w-[960px] px-6 lg:px-10 pb-20 md:pb-28">
          <RichHtml
            html={project.description}
            className="[&_p]:font-serif [&_p]:text-ink [&_p+p]:mt-5 [&_p]:leading-[1.7] [&_p]:text-[clamp(17px,1.25vw,20px)] [&_p]:text-justify [&_p]:hyphens-auto [&_h2]:font-display [&_h2]:text-ink [&_h2]:text-[clamp(22px,2vw,29px)] [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-ink [&_h3]:text-[clamp(19px,1.6vw,24px)] [&_h3]:mt-8 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:text-ink [&_li]:font-serif [&_li]:text-[clamp(16px,1.15vw,19px)] [&_li]:leading-[1.7] [&_blockquote]:border-l-2 [&_blockquote]:border-ink/30 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-ink-soft [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2"
          />
        </section>
      )}
      {!isHtml && paragraphs.length > 0 && (
        <section className="mx-auto max-w-[960px] px-6 lg:px-10 pb-20 md:pb-28">
          {paragraphs.map((p, i) => {
            const isPullQuote = i > 0 && i < paragraphs.length - 1 && p.length < 220;
            if (isPullQuote) {
              return (
                <blockquote
                  key={i}
                  className="my-12 pl-8 italic text-ink"
                  style={{ ...cormorant, fontWeight: 400, fontSize: 32, lineHeight: 1.35, borderLeft: "3px solid hsl(var(--accent))" }}
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


      {/* Gallery — image-only, centered, no background plate so portrait
          shots don't end up framed by big grey side bars. The container is
          narrow on purpose: editorial photo essay, not a hero. */}
      {gallery.length > 0 && (
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-[960px] px-6 lg:px-10">
            <p className="text-[12px] font-semibold tracking-[0.16em] uppercase text-ink-soft mb-10">Gallery</p>
            <div className="space-y-12">
              {gallery.map((img, i) => (
                <figure key={i} className="flex flex-col items-center">
                  <img
                    src={img.url}
                    alt={img.caption || `${project.name} — ${i + 1}`}
                    className="block w-auto max-w-full max-h-[70vh] object-contain"
                    loading="lazy"
                  />
                  {img.caption && (
                    <figcaption className="text-[13px] font-semibold tracking-[0.16em] uppercase text-ink-soft mt-4 text-center">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Project facts — moved to the foot of the article */}
      {metaStrip.length > 0 && (
        <section className="mx-auto max-w-[1280px] px-6 lg:px-10 pb-4">
          <dl
            className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-12 pt-10"
            style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
          >
            {metaStrip.map((m) => (
              <div key={m.label}>
                <dt className="text-[12px] font-semibold tracking-[0.16em] uppercase text-ink-soft mb-3">{m.label}</dt>
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

      {/* Back link + map CTA */}
      <section className="pb-24 md:pb-32 mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="border-t hairline pt-8 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
          <EditorialButton to="/cities" variant="muted" leadingArrow>Explore more</EditorialButton>
          <EditorialButton to={`/atlas?project=${project.slug}`} arrow>See on the map</EditorialButton>
        </div>
      </section>
    </SiteLayout>
  );
}
