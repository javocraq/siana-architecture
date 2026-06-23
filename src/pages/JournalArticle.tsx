import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { detectKindFromPath, kindConfig } from "@/lib/postKind";

import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/site/SiteLayout";
import SEO from "@/components/site/SEO";
import RichHtml from "@/components/site/RichHtml";
import { MapPin } from "lucide-react";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  category: string | null;
  author: string | null;
  hero_image_url: string | null;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  city_tags: string[] | null;
  linked_project_ids: string[] | null;
}

interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  hero_image_url: string | null;
  published_at: string | null;
}

// Editorial body — serif paragraphs at a comfortable size, headings and
// quotes styled to match. Left-aligned in a 960px column so Practice and
// Journal pieces share the same measure as the City and Project pages.
const BODY_PROSE =
  "[&_p]:font-serif [&_p]:text-[17px] md:[&_p]:text-[19px] [&_p]:leading-[1.75] [&_p]:text-ink [&_p]:text-justify [&_p]:hyphens-auto [&_p]:mb-6 " +
  "[&_h2]:font-display [&_h2]:text-ink [&_h2]:text-[clamp(22px,2.4vw,30px)] [&_h2]:mt-10 [&_h2]:mb-4 " +
  "[&_h3]:font-display [&_h3]:text-ink [&_h3]:text-[clamp(19px,2vw,24px)] [&_h3]:mt-8 [&_h3]:mb-3 " +
  "[&_img]:mx-auto [&_img]:my-8 [&_blockquote]:border-l-2 [&_blockquote]:border-ink/30 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-ink-soft [&_blockquote]:text-[18px] md:[&_blockquote]:text-[20px] [&_blockquote]:my-8 " +
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:font-serif [&_li]:text-ink [&_li]:text-[17px] md:[&_li]:text-[19px] [&_li]:leading-[1.7] [&_li]:mb-1.5 [&_a]:underline [&_a]:underline-offset-2 " +
  // Tables: stay inside the article column, render as a block with horizontal
  // scroll if there are genuinely too many columns to fit. Editorial palette
  // — hairline borders, serif body, mono-caps headers, generous padding.
  "[&_table]:block [&_table]:overflow-x-auto [&_table]:max-w-full [&_table]:w-full [&_table]:mx-auto [&_table]:my-10 [&_table]:text-left [&_table]:text-[13px] md:[&_table]:text-[14px] [&_table]:border-collapse " +
  "[&_thead]:border-b [&_thead]:border-ink/30 " +
  "[&_th]:font-mono [&_th]:text-[10px] md:[&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-[0.14em] [&_th]:text-ink [&_th]:font-semibold [&_th]:px-3 [&_th]:py-3 [&_th]:text-left [&_th]:align-top [&_th]:whitespace-normal " +
  "[&_td]:font-serif [&_td]:text-ink [&_td]:px-3 [&_td]:py-3 [&_td]:border-b [&_td]:border-ink/10 [&_td]:align-top [&_td]:leading-[1.55] [&_td]:whitespace-normal " +
  "[&_table_p]:mb-0 [&_table_p]:text-[13px] md:[&_table_p]:text-[14px] [&_table_p]:leading-[1.55]";

/** Split top-level HTML blocks in half so a section can be inserted mid-article.
 *  Returns the whole thing as `first` (empty `second`) when it's too short to
 *  split or when DOMParser isn't available (e.g. during prerender). */
function splitHtmlMidpoint(html: string): { first: string; second: string } {
  if (!html || typeof DOMParser === "undefined") return { first: html, second: "" };
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const nodes = Array.from(doc.body.children);
    if (nodes.length < 4) return { first: html, second: "" };
    const mid = Math.ceil(nodes.length / 2);
    return {
      first: nodes.slice(0, mid).map((n) => n.outerHTML).join(""),
      second: nodes.slice(mid).map((n) => n.outerHTML).join(""),
    };
  } catch {
    return { first: html, second: "" };
  }
}

export default function JournalArticle() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const kind = detectKindFromPath(location.pathname);
  const cfg = kindConfig(kind);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [linkedProjects, setLinkedProjects] = useState<{ slug: string; name: string }[]>([]);
  const [linkedCities, setLinkedCities] = useState<{ slug: string; name: string }[]>([]);
  const [related, setRelated] = useState<RelatedPost[]>([]);


  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("posts").select("*")
        .eq("slug", slug).eq("status", "published").maybeSingle();
      if (!data) { setNotFound(true); setLoading(false); return; }
      setPost(data as any);
      setLoading(false);
      window.scrollTo(0, 0);

      // Resolve linked projects / tagged cities so the article can point to
      // them on the map. Both columns store UUIDs; only published records show.
      const projIds = ((data as any).linked_project_ids as string[]) || [];
      const cityIds = ((data as any).city_tags as string[]) || [];
      const [projRes, cityRes] = await Promise.all([
        projIds.length
          ? supabase.from("projects").select("slug,name").in("id", projIds).eq("status", "published")
          : Promise.resolve({ data: [] as any[] }),
        cityIds.length
          ? supabase.from("cities").select("slug,name").in("id", cityIds).eq("status", "published")
          : Promise.resolve({ data: [] as any[] }),
      ]);
      setLinkedProjects(((projRes.data as any[]) || []).map((r) => ({ slug: r.slug, name: r.name })));
      setLinkedCities(((cityRes.data as any[]) || []).map((r) => ({ slug: r.slug, name: r.name })));

      // Related reading — more from the same section, newest first.
      const postKind = (data as any).kind || kind;
      const { data: rel } = await supabase
        .from("posts")
        .select("id, slug, title, excerpt, category, hero_image_url, published_at")
        .eq("status", "published")
        .eq("kind", postKind)
        .neq("id", (data as any).id)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(3);
      setRelated((rel as any[]) || []);
    })();
  }, [slug]);

  const split = useMemo(() => splitHtmlMidpoint(post?.body || ""), [post?.body]);

  if (notFound) {
    return (
      <SiteLayout>
        <div className="pt-40 pb-32 mx-auto max-w-[1280px] px-6 text-center">
          <h1 className="font-display text-[48px] tracking-editorial text-ink">Article not found</h1>
          <Link to={cfg.publicBase} className="text-[13px] font-medium tracking-[0.16em] uppercase text-ink-soft hover:opacity-70 mt-6 inline-block">← {cfg.sectionTitle}</Link>
        </div>
      </SiteLayout>
    );
  }

  if (loading || !post) {
    return (
      <SiteLayout>
        <div className="min-h-screen">
          <div className="relative h-[60vh] min-h-[440px] overflow-hidden bg-paper-mid animate-pulse" />
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <SEO
        title={post.meta_title || `${post.title} — Siana ${cfg.sectionTitle}`}
        description={post.meta_description || post.excerpt}
        image={post.og_image_url || post.hero_image_url}
        type="article"
      />

      <article>
        {/* Header */}
        <header className="pt-32 md:pt-40 pb-16 mx-auto max-w-[860px] px-6 lg:px-10 text-center">
          {post.category && (
            <p className="text-[13px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-6">{post.category}</p>
          )}
          <h1 className="font-display text-[34px] md:text-[54px] leading-[1.08] tracking-editorial text-ink">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="font-display italic text-[19px] md:text-[23px] tracking-editorial text-ink-soft mt-7 max-w-2xl mx-auto leading-[1.45]">
              {post.excerpt}
            </p>
          )}
          <p className="text-[13px] font-medium tracking-[0.16em] uppercase text-ink-soft mt-10">
            {post.author && <>{post.author} · </>}
            {post.published_at && new Date(post.published_at).toLocaleDateString("en-GB", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </header>

        {/* Hero image — kept modest so the writing leads. */}
        {post.hero_image_url && (
          <div className="mx-auto max-w-[960px] px-6 lg:px-10 mb-14">
            <div className="aspect-[16/9] bg-stone overflow-hidden">
              <img src={post.hero_image_url} alt={post.title} className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        {/* Body — centered editorial column. When the piece is long enough AND
            there are related posts, split it in half and drop a "Keep reading"
            block in the middle; otherwise render it whole. */}
        {post.body && (related.length > 0 && split.second ? (
          <>
            <div className="mx-auto max-w-[960px] px-6 lg:px-10 pb-12 md:pb-16">
              <RichHtml html={split.first} className={BODY_PROSE} />
            </div>
            <RelatedArticles posts={related} cfg={cfg} />
            <div className="mx-auto max-w-[960px] px-6 lg:px-10 pt-12 md:pt-16 pb-24 md:pb-32">
              <RichHtml html={split.second} className={BODY_PROSE} />
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto max-w-[960px] px-6 lg:px-10 pb-16 md:pb-20">
              <RichHtml html={post.body} className={BODY_PROSE} />
            </div>
            {related.length > 0 && <RelatedArticles posts={related} cfg={cfg} />}
          </>
        ))}

        {(linkedProjects.length > 0 || linkedCities.length > 0) && (
          <div className="mx-auto max-w-[960px] px-6 lg:px-10 pb-12">
            <div className="border-t hairline pt-10">
              <p className="font-mono uppercase text-accent-terra font-semibold mb-5" style={{ fontSize: 12, letterSpacing: "0.2em" }}>
                On the map
              </p>
              <div className="flex flex-col">
                {linkedProjects.map((p) => (
                  <Link
                    key={"p" + p.slug}
                    to={`/atlas?project=${p.slug}`}
                    className="group flex items-center gap-3 py-3.5 border-b hairline text-ink hover:opacity-70 transition-opacity"
                  >
                    <MapPin className="w-4 h-4 text-accent-terra shrink-0" />
                    <span className="font-display flex-1 min-w-0 truncate" style={{ fontSize: 20 }}>{p.name}</span>
                    <span className="font-mono uppercase text-ink-soft shrink-0" style={{ fontSize: 10, letterSpacing: "0.16em" }}>Project</span>
                    <span aria-hidden="true" className="shrink-0 transition-transform group-hover:translate-x-1" style={{ fontSize: 14 }}>→</span>
                  </Link>
                ))}
                {linkedCities.map((c) => (
                  <Link
                    key={"c" + c.slug}
                    to={`/atlas?city=${c.slug}`}
                    className="group flex items-center gap-3 py-3.5 border-b hairline text-ink hover:opacity-70 transition-opacity"
                  >
                    <MapPin className="w-4 h-4 text-accent-terra shrink-0" />
                    <span className="font-display flex-1 min-w-0 truncate" style={{ fontSize: 20 }}>{c.name}</span>
                    <span className="font-mono uppercase text-ink-soft shrink-0" style={{ fontSize: 10, letterSpacing: "0.16em" }}>City</span>
                    <span aria-hidden="true" className="shrink-0 transition-transform group-hover:translate-x-1" style={{ fontSize: 14 }}>→</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-[960px] px-6 lg:px-10 pb-24">
          <Link to={cfg.publicBase} className="text-[13px] font-semibold tracking-[0.16em] uppercase text-ink hover:opacity-70 border-t hairline pt-8 inline-block w-full">
            ← Back to {cfg.sectionTitle}

          </Link>
        </div>
      </article>
    </SiteLayout>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Related reading — a mid-article "keep reading" block. Centered cards
   in the spirit of the home "Field notes" grid.
   ────────────────────────────────────────────────────────────────── */
function RelatedArticles({ posts, cfg }: { posts: RelatedPost[]; cfg: { publicBase: string; sectionTitle: string } }) {
  return (
    <section
      className="bg-paper-warm my-4 md:my-6"
      style={{ borderTop: "1px solid hsl(var(--paper-mid))", borderBottom: "1px solid hsl(var(--paper-mid))" }}
    >
      <div className="mx-auto max-w-[1100px] px-6 lg:px-10 py-16 md:py-20">
        <div className="text-center mb-10 md:mb-12">
          <p className="font-mono uppercase text-accent-terra font-semibold mb-3" style={{ fontSize: 12, letterSpacing: "0.2em" }}>
            Keep reading
          </p>
          <h2 className="font-display text-ink" style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
            More from {cfg.sectionTitle}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-10">
          {posts.map((p) => (
            <Link key={p.id} to={`${cfg.publicBase}/${p.slug}`} className="group block text-center">
              <div className="aspect-[4/3] overflow-hidden bg-paper-mid mb-4">
                {p.hero_image_url && (
                  <img
                    src={p.hero_image_url}
                    alt={p.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                )}
              </div>
              {p.category && (
                <p className="font-mono uppercase text-ink-soft mb-2" style={{ fontSize: 10, letterSpacing: "0.16em" }}>
                  {p.category}
                </p>
              )}
              <h3 className="font-display text-ink group-hover:opacity-70 transition-opacity" style={{ fontSize: 18, lineHeight: 1.25 }}>
                {p.title}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
