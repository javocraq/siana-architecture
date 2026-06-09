import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import SiteLayout from "@/components/site/SiteLayout";
import FeaturedProjects from "@/components/site/FeaturedProjects";
import CitiesStrip from "@/components/site/CitiesStrip";
import LatestJournal from "@/components/site/LatestJournal";
import ArchitectureAISection from "@/components/site/ArchitectureAISection";
import EditorialButton from "@/components/site/EditorialButton";
import { supabase } from "@/integrations/supabase/client";
import { ABOUT_DEFAULTS, type AboutContent } from "@/lib/aboutContent";

const About = () => {
  const [content, setContent] = useState<AboutContent>(ABOUT_DEFAULTS);

  // Pull from site_pages where key='about'. Falls back to the defaults if
  // the row is missing or the table doesn't exist yet.
  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("site_pages")
        .select("content")
        .eq("key", "about")
        .maybeSingle();
      if (error || !data?.content) return;
      const c = data.content as Partial<AboutContent>;
      setContent({
        eyebrow: c.eyebrow ?? ABOUT_DEFAULTS.eyebrow,
        headline: c.headline ?? ABOUT_DEFAULTS.headline,
        body: Array.isArray(c.body) && c.body.length > 0 ? c.body : ABOUT_DEFAULTS.body,
        cta_label: c.cta_label ?? ABOUT_DEFAULTS.cta_label,
      });
    })();
  }, []);

  return (
    <SiteLayout>
      <Helmet>
        <title>About — Siana Architecture</title>
        <meta
          name="description"
          content="An architectural magazine meets a city platform. Curated projects, explored through an editorial lens."
        />
        <link rel="canonical" href="/about" />
      </Helmet>

      {/* Manifesto */}
      <section className="pt-40 pb-24 md:pt-48 md:pb-32">
        <div className="mx-auto max-w-[820px] px-6 lg:px-10">
          <p className="text-[13px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-8">{content.eyebrow}</p>
          <h1
            className="text-ink"
            style={{ fontFamily: "'Adobe Garamond Pro', 'EB Garamond', Garamond, Georgia, serif", fontWeight: 400, fontSize: "clamp(34px, 5vw, 58px)", lineHeight: 1.08, letterSpacing: "-0.005em" }}
          >
            {content.headline}
          </h1>
          <div className="mt-12 space-y-6 text-[17px] md:text-[18px] leading-[1.7] text-ink-soft max-w-[640px]">
            {content.body.map((para, i) => {
              // The last paragraph styles as a serif italic pull-quote, matching
              // the original "Made for those who look." treatment.
              const isLast = i === content.body.length - 1;
              if (isLast && content.body.length > 1) {
                return (
                  <p
                    key={i}
                    className="text-ink italic"
                    style={{ fontFamily: "'Adobe Garamond Pro', 'EB Garamond', Garamond, Georgia, serif", fontWeight: 400, fontSize: 26 }}
                  >
                    {para}
                  </p>
                );
              }
              return <p key={i}>{para}</p>;
            })}
          </div>
          <div className="mt-12">
            <EditorialButton to="/atlas" arrow>
              {content.cta_label.replace(/\s*→\s*$/, "")}
            </EditorialButton>
          </div>
        </div>
      </section>

      <ArchitectureAISection />
      <FeaturedProjects />
      <CitiesStrip />
      <LatestJournal />
    </SiteLayout>
  );
};

export default About;
