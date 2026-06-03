import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { detectKindFromPath, kindConfig } from "@/lib/postKind";

import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/site/SiteLayout";
import SEO from "@/components/site/SEO";
import RichHtml from "@/components/site/RichHtml";

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
}

export default function JournalArticle() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const kind = detectKindFromPath(location.pathname);
  const cfg = kindConfig(kind);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);


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
    })();
  }, [slug]);

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
    return <SiteLayout><div className="pt-40 mx-auto max-w-[1280px] px-6 text-ink-soft text-[13px] font-medium tracking-[0.16em] uppercase">Loading…</div></SiteLayout>;
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
          <h1 className="font-display text-[44px] md:text-[72px] leading-[1.05] tracking-editorial text-ink">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="font-display italic text-[22px] md:text-[26px] tracking-editorial text-ink-soft mt-8 max-w-2xl mx-auto leading-[1.45]">
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

        {/* Hero image */}
        {post.hero_image_url && (
          <div className="mx-auto max-w-[1280px] px-6 lg:px-10 mb-20">
            <div className="aspect-[16/9] bg-stone overflow-hidden">
              <img src={post.hero_image_url} alt={post.title} className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        {/* Body */}
        {post.body && (
          <div className="mx-auto max-w-[680px] px-6 lg:px-10 pb-24 md:pb-32">
            <RichHtml
              html={post.body}
              className="prose-lg [&_p]:font-serif [&_p]:text-[19px] md:[&_p]:text-[21px] [&_p]:leading-[1.7] [&_p]:text-ink"
            />
          </div>
        )}

        <div className="mx-auto max-w-[680px] px-6 lg:px-10 pb-24">
          <Link to={cfg.publicBase} className="text-[13px] font-semibold tracking-[0.16em] uppercase text-ink hover:opacity-70 border-t hairline pt-8 inline-block w-full">
            ← Back to {cfg.sectionTitle}

          </Link>
        </div>
      </article>
    </SiteLayout>
  );
}
