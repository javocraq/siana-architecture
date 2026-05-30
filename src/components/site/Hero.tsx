import { Link } from "react-router-dom";

const heroImages = [
  "https://picsum.photos/seed/siana-1/600/600?grayscale",
  "https://picsum.photos/seed/siana-2/600/600?grayscale",
  "https://picsum.photos/seed/siana-3/600/600?grayscale",
  "https://picsum.photos/seed/siana-4/600/600?grayscale",
  "https://picsum.photos/seed/siana-5/600/600?grayscale",
  "https://picsum.photos/seed/siana-6/600/600?grayscale",
  "https://picsum.photos/seed/siana-7/600/600?grayscale",
  "https://picsum.photos/seed/siana-8/600/600?grayscale",
  "https://picsum.photos/seed/siana-9/600/600?grayscale",
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background pt-16">
      {/* 3x3 background grid */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-[0.18]" aria-hidden>
        {heroImages.map((src, i) => (
          <div key={i} className="overflow-hidden">
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover fade-in"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          </div>
        ))}
      </div>

      {/* White wash for legibility */}
      <div className="absolute inset-0 bg-background/70" aria-hidden />

      <div className="relative z-10 mx-auto max-w-[1100px] px-6 text-center">
        <p className="text-[11px] tracking-tag uppercase text-ink-muted mb-8 fade-in">
          Siana Architecture
        </p>
        <h1 className="font-display font-light text-[clamp(48px,9vw,96px)] leading-[1.05] tracking-editorial text-ink fade-in">
          The city as architecture
        </h1>
        <p className="mt-8 mx-auto max-w-xl text-[14px] text-ink-muted leading-relaxed fade-in">
          Curated architectural projects, explored through an editorial lens.
        </p>
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 fade-in">
          <Link
            to="/cities/munich"
            className="inline-flex items-center px-8 py-3.5 border hairline text-[11px] tracking-tag uppercase text-ink hover:bg-ink hover:text-background transition-colors"
          >
            Explore Munich
          </Link>
          <Link
            to="/journal"
            className="text-[11px] tracking-tag uppercase text-ink hover:opacity-60 transition-opacity underline-offset-[6px] underline decoration-[1px]"
          >
            Read the journal
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-10">
        <span className="text-[10px] tracking-tag uppercase text-ink-faint">Scroll</span>
        <div className="w-px h-10 bg-ink-faint" />
      </div>
    </section>
  );
}
