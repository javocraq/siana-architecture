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

      {/* Manifesto — centered editorial cover on the warm canvas */}
      <section className="bg-[#FFF9F2]">
        <div className="mx-auto max-w-[760px] px-6 lg:px-10 pt-32 md:pt-36 pb-16 md:pb-20 text-center">
          <p className="font-mono uppercase text-accent-terra mb-5" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.2em" }}>
            {content.eyebrow}
          </p>
          <h1
            className="text-black"
            style={{ fontFamily: "'Adobe Garamond Pro', 'EB Garamond', Garamond, Georgia, serif", fontWeight: 400, fontSize: "clamp(32px, 4.4vw, 52px)", lineHeight: 1.1, letterSpacing: "-0.01em" }}
          >
            {content.headline}
          </h1>
          <div className="mt-7 space-y-4 text-[16px] md:text-[17px] leading-[1.7] max-w-[600px] mx-auto" style={{ color: "#4F4534" }}>
            {content.body.map((para, i) => {
              // The last paragraph styles as a serif italic pull-quote.
              const isLast = i === content.body.length - 1;
              if (isLast && content.body.length > 1) {
                return (
                  <p
                    key={i}
                    className="italic"
                    style={{ fontFamily: "'Adobe Garamond Pro', 'EB Garamond', Garamond, Georgia, serif", fontWeight: 400, fontSize: 22, color: "#796C5C" }}
                  >
                    {para}
                  </p>
                );
              }
              return <p key={i}>{para}</p>;
            })}
          </div>
          <div className="mt-8 flex justify-center">
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
