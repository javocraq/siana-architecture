// Live llms.txt — Supabase Edge Function (Deno).
//
// Regenerates the AI-context file (https://llmstxt.org) from PUBLISHED content
// on every request, so a new journal post / project / city appears instantly.
// Public (verify_jwt = false in supabase/config.toml).
//
// NOTE: AI tools look for llms.txt at the SITE ROOT (https://your-domain/llms.txt).
// To serve this live version there, add a host rewrite  /llms.txt -> this URL.
// Until then, the build-time public/llms.txt (refreshed on each deploy) is what
// gets served at the root.
//
// Deploy:  supabase functions deploy llms
// URL:     https://<project-ref>.supabase.co/functions/v1/llms

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://sianaarchitecture.com").replace(/\/+$/, "");

async function fetchRows(query: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`${query} → ${res.status} ${await res.text()}`);
  return res.json();
}

const INTRO =
  `# Siana — Architecture, city by city\n\n` +
  `> Siana is an editorial atlas of architecture: a curated guide to significant buildings around the world, mapped city by city, paired with a journal of essays and field notes and a library of resources for architects.\n\n` +
  `Siana documents notable architecture across global cities and writes about it with an editorial eye. The site is organized into four areas: **Cities** (city guides with an interactive map of pinned buildings), **Projects** (individual buildings with architect, year and context), the **Journal** (the blog — essays, criticism, profiles, interviews and field notes on architecture), and **Resources** (practical guides for architecture practices).\n`;

Deno.serve(async () => {
  try {
    const byNewest = (a: any, b: any) => (b.published_at ?? "").localeCompare(a.published_at ?? "");
    const [cities, projects, posts] = await Promise.all([
      fetchRows("cities?status=eq.published&select=slug,name,country,tagline&order=name"),
      fetchRows("projects?status=eq.published&select=slug,name,architect,year_completed,city:cities(name)&order=name"),
      fetchRows("posts?status=eq.published&kind=eq.journal&select=slug,title,excerpt,category,published_at"),
    ]);
    const journal = posts.sort(byNewest);

    const cityLine = (c: any) => {
      let d = `Architecture guide to ${c.name}${c.country ? ", " + c.country : ""}`;
      d += c.tagline ? ` — ${c.tagline}` : ".";
      return `- [${c.name}](${SITE_URL}/cities/${c.slug}): ${d}`;
    };
    const journalLine = (p: any) =>
      `- [${p.title}](${SITE_URL}/journal/${p.slug}): ${p.category ? p.category + " — " : ""}${p.excerpt ?? ""}`.trimEnd();
    const projectLine = (p: any) => {
      const year = p.year_completed && p.year_completed > 1000 ? p.year_completed : null;
      const meta = [p.architect, year].filter(Boolean).join(", ");
      const tail = [meta, p.city?.name].filter(Boolean).join(" — ");
      return `- [${p.name}](${SITE_URL}/projects/${p.slug})${tail ? ": " + tail + "." : ""}`;
    };

    const body =
      `${INTRO}\n` +
      `- Website: ${SITE_URL}\n` +
      `- Language: English\n` +
      `- Focus: architecture, cities, urbanism, design history, the built environment\n` +
      `- Cities covered: ${cities.map((c) => c.name).join(", ")}\n\n` +
      `## Cities\n${cities.map(cityLine).join("\n")}\n\n` +
      `## Journal (blog)\n${journal.map(journalLine).join("\n")}\n\n` +
      `## Projects\n${projects.map(projectLine).join("\n")}\n\n` +
      `## Main sections\n` +
      `- [Cities index](${SITE_URL}/cities): Browse all cities in the atlas.\n` +
      `- [Journal](${SITE_URL}/journal): All essays and field notes (the blog).\n` +
      `- [Resources for architects](${SITE_URL}/resources): Practical guides for architecture, engineering and construction practices.\n` +
      `- [About](${SITE_URL}/about): What Siana is and why it exists.\n\n` +
      `## Optional\n` +
      `- [XML sitemap](${SITE_URL}/sitemap.xml): Full list of indexable URLs.\n`;

    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(`llms.txt generation failed: ${String(err)}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});
