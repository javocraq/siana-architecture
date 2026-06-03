import SiteLayout from "@/components/site/SiteLayout";
import FeaturedProjects from "@/components/site/FeaturedProjects";
import CitiesStrip from "@/components/site/CitiesStrip";
import LatestJournal from "@/components/site/LatestJournal";
import CtaStrip from "@/components/site/CtaStrip";
import ArchitectureAISection from "@/components/site/ArchitectureAISection";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

const About = () => {
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
          <p className="text-[13px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-8">Siana — Manifesto</p>
          <h1
            className="text-ink"
            style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: "clamp(48px, 7vw, 84px)", lineHeight: 1.05, letterSpacing: "-0.015em" }}
          >
            The city as architecture.
          </h1>
          <div className="mt-12 space-y-6 text-[17px] md:text-[18px] leading-[1.7] text-ink-soft max-w-[640px]">
            <p>
              Siana is an architectural magazine that lives on a map. We believe
              the most interesting building in any city is rarely the most
              famous one — and that the best way to understand a place is to
              walk it, slowly, with someone pointing.
            </p>
            <p>
              We curate projects across cities, write about them with the care
              of an editor and the eye of an architect, and put them on a map
              you can actually use. No ads. No clutter. No infinite scroll.
            </p>
            <p
              className="text-ink italic"
              style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 26 }}
            >
              Made for those who look.
            </p>
          </div>
          <div className="mt-12">
            <Link
              to="/"
              className="inline-flex items-center text-[14px] font-semibold tracking-[0.16em] uppercase text-ink hover:opacity-70 underline underline-offset-[6px] decoration-[1px]"
            >
              Open the map →
            </Link>
          </div>
        </div>
      </section>

      <ArchitectureAISection />
      <FeaturedProjects />
      <CitiesStrip />
      <LatestJournal />
      <CtaStrip />
    </SiteLayout>
  );
};

export default About;
