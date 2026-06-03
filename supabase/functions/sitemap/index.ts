// Live sitemap.xml — Supabase Edge Function (Deno).
//
// Regenerates the sitemap from PUBLISHED content on every request, so a new
// journal post / project / city appears the instant it is published in the
// CMS — no rebuild or redeploy needed.
//
// Public endpoint (no auth): set `verify_jwt = false` for this function in
// supabase/config.toml so search-engine crawlers can fetch it.
//
// Uses the auto-injected SUPABASE_URL + SUPABASE_ANON_KEY and relies on RLS
// (anon can read rows where status = 'published') — no secrets, no elevated
// access.
//
// Deploy:  supabase functions deploy sitemap
// URL:     https://<project-ref>.supabase.co/functions/v1/sitemap

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://sianaarchitecture.com").replace(/\/+$/, "");

const ENT: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
const xmlEscape = (s: string) => s.replace(/[&<>"']/g, (c) => ENT[c] ?? c);
const dateOnly = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : null);

async function fetchRows(query: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`${query} → ${res.status} ${await res.text()}`);
  return res.json();
}

function urlEntry(path: string, lastmod: string | null, changefreq: string, priority: string): string {
  return [
    "  <url>",
    `    <loc>${xmlEscape(SITE_URL + path)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].filter(Boolean).join("\n");
}

Deno.serve(async () => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [cities, projects, posts] = await Promise.all([
      fetchRows("cities?status=eq.published&select=slug,updated_at&order=slug"),
      fetchRows("projects?status=eq.published&select=slug,updated_at&order=slug"),
      fetchRows("posts?status=eq.published&select=slug,kind,updated_at,published_at"),
    ]);

    const byNewest = (a: any, b: any) => (b.published_at ?? "").localeCompare(a.published_at ?? "");
    const journal = posts.filter((p) => p.kind === "journal").sort(byNewest);
    const resources = posts.filter((p) => p.kind === "resource").sort(byNewest);

    const entries = [
      urlEntry("/", today, "weekly", "1.0"),
      urlEntry("/cities", today, "weekly", "0.9"),
      urlEntry("/journal", today, "weekly", "0.9"),
      urlEntry("/resources", today, "weekly", "0.7"),
      urlEntry("/about", today, "monthly", "0.5"),
      ...cities.map((c) => urlEntry(`/cities/${c.slug}`, dateOnly(c.updated_at), "monthly", "0.8")),
      ...projects.map((p) => urlEntry(`/projects/${p.slug}`, dateOnly(p.updated_at), "monthly", "0.7")),
      ...journal.map((p) => urlEntry(`/journal/${p.slug}`, dateOnly(p.updated_at), "monthly", "0.7")),
      ...resources.map((p) => urlEntry(`/resources/${p.slug}`, dateOnly(p.updated_at), "monthly", "0.6")),
    ];

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n` +
      `${entries.join("\n")}\n\n` +
      `</urlset>\n`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        // Cache at the edge/CDN for an hour — plenty fresh for crawlers while
        // keeping function invocations low.
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(`sitemap generation failed: ${String(err)}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});
