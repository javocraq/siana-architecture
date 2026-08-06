#!/usr/bin/env node
/**
 * Regenerates public/sitemap.xml AND public/llms.txt from the live Supabase
 * content. Wired into `npm run build`, so every production build / deploy picks
 * up newly published cities, projects and journal posts automatically — no
 * manual editing of either file.
 *
 *   sitemap.xml → search engines (Google, Bing, …)
 *   llms.txt    → AI search engines / assistants (ChatGPT, Perplexity, Claude,
 *                 Gemini) — see https://llmstxt.org
 *
 * Reads only the PUBLIC Supabase keys and relies on RLS (anonymous users can
 * read rows where status = 'published'), so there are no secrets in here and
 * the generated files are safe to commit.
 *
 * Run manually:  npm run generate:seo
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = resolve(ROOT, "public");
const SITE_URL = (process.env.SITE_URL || "https://sianaarchitecture.com").replace(/\/+$/, "");

// --- resolve Supabase creds from real env vars, falling back to .env ---------
function loadEnv() {
  const env = { ...process.env };
  const envPath = resolve(ROOT, ".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      if (env[m[1]] === undefined) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

// --- helpers -----------------------------------------------------------------
const dateOnly = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : null);
const TODAY = new Date().toISOString().slice(0, 10);

async function fetchRows(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`${query} → ${res.status} ${await res.text()}`);
  return res.json();
}

// ---------- sitemap.xml ------------------------------------------------------
const xmlEscape = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));

function urlEntry(path, lastmod, changefreq, priority) {
  return [
    "  <url>",
    `    <loc>${xmlEscape(SITE_URL + path)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].filter(Boolean).join("\n");
}

function buildSitemap({ cities, projects, journal, resources }) {
  const entries = [
    urlEntry("/", TODAY, "weekly", "1.0"),
    urlEntry("/atlas", TODAY, "weekly", "0.9"),
    urlEntry("/cities", TODAY, "weekly", "0.9"),
    urlEntry("/journal", TODAY, "weekly", "0.9"),
    urlEntry("/resources", TODAY, "weekly", "0.7"),
    urlEntry("/about", TODAY, "monthly", "0.5"),
    ...cities.map((c) => urlEntry(`/cities/${c.slug}`, dateOnly(c.updated_at), "monthly", "0.8")),
    ...projects.map((p) => urlEntry(`/projects/${p.slug}`, dateOnly(p.updated_at), "monthly", "0.7")),
    ...journal.map((p) => urlEntry(`/journal/${p.slug}`, dateOnly(p.updated_at), "monthly", "0.7")),
    ...resources.map((p) => urlEntry(`/resources/${p.slug}`, dateOnly(p.updated_at), "monthly", "0.6")),
  ];
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n` +
    `${entries.join("\n")}\n\n` +
    `</urlset>\n`
  );
}

// ---------- llms.txt ---------------------------------------------------------
const LLMS_INTRO =
  `# Siana - Architecture, city by city\n\n` +
  `> Siana is an editorial atlas of architecture: a curated guide to significant buildings around the world, mapped city by city, paired with a journal of essays and field notes and a library of resources for architects.\n\n` +
  `Siana documents notable architecture across global cities and writes about it with an editorial eye. The site is organized into four areas: **Cities** (city guides with an interactive map of pinned buildings), **Projects** (individual buildings with architect, year and context), the **Journal** (the blog - essays, criticism, profiles, interviews and field notes on architecture), and **Resources** (practical guides for architecture practices).\n`;

function buildLlms({ cities, projects, journal }) {
  const cityLine = (c) => {
    let d = `Architecture guide to ${c.name}${c.country ? ", " + c.country : ""}`;
    d += c.tagline ? ` - ${c.tagline}` : ".";
    return `- [${c.name}](${SITE_URL}/cities/${c.slug}): ${d}`;
  };
  const journalLine = (p) =>
    `- [${p.title}](${SITE_URL}/journal/${p.slug}): ${p.category ? p.category + " - " : ""}${p.excerpt ?? ""}`.trimEnd();
  const projectLine = (p) => {
    const year = p.year_completed && p.year_completed > 1000 ? p.year_completed : null;
    const meta = [p.architect, year].filter(Boolean).join(", ");
    const city = p.city?.name;
    const tail = [meta, city].filter(Boolean).join(" - ");
    return `- [${p.name}](${SITE_URL}/projects/${p.slug})${tail ? ": " + tail + "." : ""}`;
  };

  return (
    `${LLMS_INTRO}\n` +
    `- Website: ${SITE_URL}\n` +
    `- Language: English\n` +
    `- Focus: architecture, cities, urbanism, design history, the built environment\n` +
    `- Cities covered: ${cities.map((c) => c.name).join(", ")}\n\n` +
    `## Cities\n${cities.map(cityLine).join("\n")}\n\n` +
    `## Journal (blog)\n${journal.map(journalLine).join("\n")}\n\n` +
    `## Projects\n${projects.map(projectLine).join("\n")}\n\n` +
    `## Main sections\n` +
    `- [Atlas](${SITE_URL}/atlas): Interactive map - explore every project by city, architect, style and year.\n` +
    `- [Cities index](${SITE_URL}/cities): Browse all cities in the atlas.\n` +
    `- [Journal](${SITE_URL}/journal): All essays and field notes (the blog).\n` +
    `- [Resources for architects](${SITE_URL}/resources): Practical guides for architecture, engineering and construction practices.\n` +
    `- [About](${SITE_URL}/about): What Siana is and why it exists.\n\n` +
    `## Optional\n` +
    `- [XML sitemap](${SITE_URL}/sitemap.xml): Full list of indexable URLs.\n`
  );
}

// ---------- main -------------------------------------------------------------
async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[seo] Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY - keeping existing sitemap.xml / llms.txt");
    return;
  }

  const byNewest = (a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? "");

  const [cities, projects, posts] = await Promise.all([
    fetchRows("cities?status=eq.published&select=slug,name,country,tagline,updated_at&order=name"),
    fetchRows("projects?status=eq.published&select=slug,name,architect,year_completed,updated_at,city:cities(name)&order=name"),
    fetchRows("posts?status=eq.published&select=slug,kind,title,excerpt,category,updated_at,published_at"),
  ]);
  const journal = posts.filter((p) => p.kind === "journal").sort(byNewest);
  const resources = posts.filter((p) => p.kind === "resource").sort(byNewest);

  const data = { cities, projects, journal, resources };

  if (!existsSync(PUBLIC)) mkdirSync(PUBLIC, { recursive: true });
  writeFileSync(resolve(PUBLIC, "sitemap.xml"), buildSitemap(data), "utf8");
  writeFileSync(resolve(PUBLIC, "llms.txt"), buildLlms(data), "utf8");

  const total = 5 + cities.length + projects.length + journal.length + resources.length;
  console.log(
    `[seo] Wrote public/sitemap.xml (${total} URLs) + public/llms.txt - ` +
      `${cities.length} cities, ${projects.length} projects, ${journal.length} journal, ${resources.length} resources`,
  );
}

main().catch((err) => {
  // Never block a build because SEO files couldn't be refreshed — keep the
  // committed copies and surface the reason in the logs.
  console.error("[seo] Generation failed, keeping existing files:", err.message);
});
