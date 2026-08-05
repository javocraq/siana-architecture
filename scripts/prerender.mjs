#!/usr/bin/env node
/**
 * Build-time prerender (SSG-lite) for the Vite SPA.
 *
 * Runs after `vite build` (npm "postbuild"). For every public route it writes a
 * static dist/<route>/index.html that contains real, crawlable content BEFORE
 * any JavaScript runs:
 *   · a correct <title> + meta description + canonical + Open Graph/Twitter tags
 *   · JSON-LD structured data (Organization, BlogPosting, …) for AI/search
 *   · the actual heading + body text (the full article for journal posts)
 *
 * Why this and not Puppeteer: AI crawlers (GPTBot, PerplexityBot, …) and many
 * search bots don't execute JS, so a client-only SPA serves them an empty
 * <div id="root">. This injects the content from Supabase into static HTML. No
 * headless browser → can't hang or break the Vercel build. React still boots on
 * top for users (createRoot replaces the prerendered markup).
 *
 * Reads only the PUBLIC Supabase keys (RLS → published rows only). Non-fatal:
 * any failure leaves the normal SPA build untouched.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");
const SITE_URL = (process.env.SITE_URL || "https://sianaarchitecture.com").replace(/\/+$/, "");
const OG_DEFAULT = `${SITE_URL}/favicon.ico`;

function loadEnv() {
  const env = { ...process.env };
  const p = resolve(ROOT, ".env");
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}
const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const stripHtml = (s) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const clamp = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

async function fetchRows(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`${query} → ${res.status}`);
  return res.json();
}

/** Inject SEO head tags + content into a copy of the built index.html. */
function renderPage(template, { path, title, description, image, type = "website", jsonld, content }) {
  const canonical = SITE_URL + path;
  const desc = clamp(stripHtml(description || ""), 300);
  let html = template;

  const sub = (re, value) => { html = html.replace(re, () => value); };

  sub(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  sub(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(desc)}" />`);
  sub(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}" />`);
  sub(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(desc)}" />`);
  sub(/<meta property="og:type"[^>]*>/, `<meta property="og:type" content="${esc(type)}" />`);

  const head = [
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:site_name" content="Siana Architecture" />`,
    image ? `<meta property="og:image" content="${esc(image)}" />` : "",
    image ? `<meta name="twitter:image" content="${esc(image)}" />` : "",
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
    jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : "",
  ].filter(Boolean).join("\n    ");
  sub(/<\/head>/, `    ${head}\n  </head>`);

  // Crawlable content inside #root; React (createRoot) replaces it on mount.
  if (content) {
    const block = `<div id="root"><div id="prerender">${content}</div></div>`;
    if (html.includes('<div id="root"></div>')) html = html.replace('<div id="root"></div>', () => block);
    else html = html.replace(/<div id="root">\s*<\/div>/, () => block);
  }
  return html;
}

const ORG = {
  "@type": "Organization",
  name: "Siana Architecture",
  url: SITE_URL,
  description: "An editorial atlas of architecture — significant buildings mapped city by city.",
};

function write(path, html) {
  const dir = path === "/" ? DIST : join(DIST, path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html, "utf8");
}

async function main() {
  if (!existsSync(join(DIST, "index.html"))) {
    console.warn("[prerender] dist/index.html not found — run after `vite build`. Skipping.");
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[prerender] Missing Supabase env — leaving SPA build as-is.");
    return;
  }
  const template = readFileSync(join(DIST, "index.html"), "utf8");
  const byNewest = (a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? "");

  const [cities, projects, posts] = await Promise.all([
    fetchRows("cities?status=eq.published&select=slug,name,country,tagline,hero_image_url&order=name"),
    fetchRows("projects?status=eq.published&select=slug,name,tagline,architect,practice,year_completed,category,description,hero_image_url,cover_image_url,city:cities(name)&order=name"),
    fetchRows("posts?status=eq.published&select=slug,kind,title,excerpt,body,author,category,hero_image_url,published_at&order=published_at.desc"),
  ]);
  const journal = posts.filter((p) => p.kind === "journal");
  const resources = posts.filter((p) => p.kind === "resource");
  let n = 0;

  // --- Home ---
  write("/", renderPage(template, {
    path: "/",
    title: "Siana — Architecture, city by city",
    description: "An editorial atlas of architecture: significant buildings mapped city by city, with a journal of essays and field notes and resources for architects.",
    image: OG_DEFAULT,
    jsonld: { "@context": "https://schema.org", "@graph": [ORG, { "@type": "WebSite", name: "Siana Architecture", url: SITE_URL }] },
    content:
      `<h1>Siana — Architecture, city by city</h1>` +
      `<p>An editorial atlas of architecture: significant buildings mapped city by city, paired with a journal of essays and field notes and a library of resources for architects.</p>` +
      `<nav><a href="/cities">Cities</a> · <a href="/journal">Journal</a> · <a href="/resources">Resources</a> · <a href="/about">About</a></nav>`,
  })); n++;

  // --- Listing: Cities ---
  write("/cities", renderPage(template, {
    path: "/cities",
    title: "Cities — Siana Architecture",
    description: "Browse Siana's architecture guides city by city: " + cities.map((c) => c.name).join(", ") + ".",
    image: OG_DEFAULT,
    content:
      `<h1>Cities</h1><ul>` +
      cities.map((c) => `<li><a href="/cities/${esc(c.slug)}">${esc(c.name)}</a>${c.country ? " — " + esc(c.country) : ""}${c.tagline ? ": " + esc(c.tagline) : ""}</li>`).join("") +
      `</ul>`,
  })); n++;

  // --- Listing: Journal ---
  write("/journal", renderPage(template, {
    path: "/journal",
    title: "Journal — Siana Architecture",
    description: "Essays, criticism, profiles, interviews and field notes on architecture from Siana.",
    image: OG_DEFAULT,
    content:
      `<h1>Journal</h1><ul>` +
      journal.map((p) => `<li><a href="/journal/${esc(p.slug)}">${esc(p.title)}</a>${p.excerpt ? " — " + esc(p.excerpt) : ""}</li>`).join("") +
      `</ul>`,
  })); n++;

  // --- Listing: Resources ---
  write("/resources", renderPage(template, {
    path: "/resources",
    title: "Resources for Architects — Siana",
    description: "Practical guides, playbooks and tools for architecture, engineering and construction practices.",
    image: OG_DEFAULT,
    content:
      `<h1>Resources for architects</h1>` +
      (resources.length
        ? `<ul>` + resources.map((p) => `<li><a href="/resources/${esc(p.slug)}">${esc(p.title)}</a>${p.excerpt ? " — " + esc(p.excerpt) : ""}</li>`).join("") + `</ul>`
        : `<p>Practical guides for AEC practices — coming soon.</p>`),
  })); n++;

  // --- About ---
  write("/about", renderPage(template, {
    path: "/about",
    title: "About — Siana Architecture",
    description: "Siana is an architectural magazine that lives on a map — curated projects explored through an editorial lens.",
    image: OG_DEFAULT,
    content:
      `<h1>The city as architecture.</h1>` +
      `<p>Siana is an architectural magazine that lives on a map. We curate projects across cities, write about them with the care of an editor and the eye of an architect, and put them on a map you can actually use.</p>`,
  })); n++;

  // --- Atlas (the discovery tool) ---
  write("/atlas", renderPage(template, {
    path: "/atlas",
    title: "Atlas — Explore Architecture on the Map | Siana",
    description: "An interactive atlas of significant architecture across the world's cities. Filter by city, architect, style and year, and explore each project on the map.",
    image: OG_DEFAULT,
    content:
      `<h1>The Atlas</h1>` +
      `<p>An interactive map of significant architecture across the world's cities — filter by city, architect, style and year, and explore each project on the map.</p>` +
      `<p><a href="/cities">Browse cities</a> · <a href="/journal">Journal</a></p>`,
  })); n++;

  // --- City detail ---
  for (const c of cities) {
    write(`/cities/${c.slug}`, renderPage(template, {
      path: `/cities/${c.slug}`,
      title: `${c.name} — Architecture Guide | Siana`,
      description: `Architecture guide to ${c.name}${c.country ? ", " + c.country : ""}.${c.tagline ? " " + c.tagline : ""}`,
      image: c.hero_image_url || OG_DEFAULT,
      jsonld: { "@context": "https://schema.org", "@type": "Place", name: c.name, address: c.country || undefined, url: `${SITE_URL}/cities/${c.slug}` },
      content: `<h1>${esc(c.name)}</h1>${c.country ? `<p>${esc(c.country)}</p>` : ""}${c.tagline ? `<p>${esc(c.tagline)}</p>` : ""}`,
    })); n++;
  }

  // --- Project detail ---
  for (const p of projects) {
    const facts = [p.architect, p.year_completed && p.year_completed > 1000 ? p.year_completed : null, p.city?.name].filter(Boolean).join(" · ");
    write(`/projects/${p.slug}`, renderPage(template, {
      path: `/projects/${p.slug}`,
      title: `${p.name}${p.architect ? " by " + p.architect : ""} | Siana`,
      description: p.tagline || `${p.name}${facts ? " — " + facts : ""}.`,
      image: p.cover_image_url || p.hero_image_url || OG_DEFAULT,
      type: "article",
      jsonld: {
        "@context": "https://schema.org", "@type": "Article",
        headline: p.name, image: p.cover_image_url || p.hero_image_url || undefined,
        about: facts || undefined, publisher: ORG, mainEntityOfPage: `${SITE_URL}/projects/${p.slug}`,
      },
      content:
        `<h1>${esc(p.name)}</h1>${facts ? `<p>${esc(facts)}</p>` : ""}` +
        `${p.tagline ? `<p>${esc(p.tagline)}</p>` : ""}${p.description ? `<div>${p.description}</div>` : ""}`,
    })); n++;
  }

  // --- Journal + Resource articles (full body) ---
  for (const p of [...journal, ...resources]) {
    const base = p.kind === "resource" ? "/resources" : "/journal";
    write(`${base}/${p.slug}`, renderPage(template, {
      path: `${base}/${p.slug}`,
      title: `${p.title} | Siana ${p.kind === "resource" ? "Resources" : "Journal"}`,
      description: p.excerpt || stripHtml(p.body).slice(0, 200),
      image: p.hero_image_url || OG_DEFAULT,
      type: "article",
      jsonld: {
        "@context": "https://schema.org", "@type": "BlogPosting",
        headline: p.title, description: p.excerpt || undefined, image: p.hero_image_url || undefined,
        datePublished: p.published_at || undefined,
        author: p.author ? { "@type": "Person", name: p.author } : ORG,
        publisher: ORG, mainEntityOfPage: `${SITE_URL}${base}/${p.slug}`,
        articleSection: p.category || undefined,
      },
      content:
        `<article><h1>${esc(p.title)}</h1>${p.category ? `<p>${esc(p.category)}</p>` : ""}` +
        `${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ""}${p.body ? `<div>${p.body}</div>` : ""}` +
        `<p>${p.author ? esc(p.author) + " · " : ""}${p.published_at ? esc(new Date(p.published_at).toISOString().slice(0, 10)) : ""}</p></article>`,
    })); n++;
  }

  console.log(`[prerender] Wrote ${n} static pages (${cities.length} cities, ${projects.length} projects, ${journal.length} journal, ${resources.length} resources).`);
}

main().catch((err) => {
  console.error("[prerender] Skipped (build is fine, SPA fallback in place):", err.message);
});
