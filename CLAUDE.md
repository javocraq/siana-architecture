# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Siana Architecture is an editorial "atlas" of architecture: a public website (map, cities, practice entries, about) plus a built-in admin CMS that controls both the content *and* the editorial copy of the public surfaces. It is a client-only React SPA (Vite, no SSR) backed entirely by Supabase (Postgres + Auth + Storage). Deploys go to Vercel — a static `vite build` plus a post-build prerender step (`scripts/prerender.mjs`) and a pre-build SEO generator (`scripts/generate-seo.mjs`) that refreshes `public/sitemap.xml` and `public/llms.txt`.

## Commands

Bun is the declared package manager (`bun.lockb`), but `npm` also works (a `package-lock.json` is present). Use whichever; commands below show npm.

- `npm run dev` — start the dev server at **http://localhost:8080** (port/host are fixed in `vite.config.ts`)
- `npm run build` — production build. Composed: `generate:seo` (writes `public/sitemap.xml` + `public/llms.txt`) → `vite build` → `prerender` (post-build static HTML)
- `npm run build:dev` — same chain in development mode
- `npm run lint` — ESLint over the repo
- `npm run test` — run the Vitest suite once
- `npm run test:watch` — Vitest in watch mode
- Single test file: `npx vitest run src/test/example.test.ts`
- Single test by name: `npx vitest run -t "name substring"`

There is no separate typecheck script; use `npx tsc --noEmit -p tsconfig.app.json`.

## Environment variables

Vite env vars (prefix `VITE_`) are read from `.env`. `.env.example` documents them. They are embedded in the client bundle, so only public values belong here.

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — required; consumed in `src/integrations/supabase/client.ts`
- `VITE_MAPBOX_PUBLIC_TOKEN` — optional; map components fall back to a hardcoded constant then `localStorage` (see `src/lib/mapbox.ts`)

## Architecture

**Routing & layout.** All routes are declared in `src/App.tsx` under a single `BrowserRouter`. Two surfaces share the app:
- Public site — pages in `src/pages/*` wrapped in `SiteLayout` (`src/components/site/`).
- Admin CMS — pages in `src/pages/admin/*` wrapped in `AdminLayout` (`src/components/admin/`).

Routes in `App.tsx` are **not** individually guarded. Access control lives inside `AdminLayout`, which calls `useAdmin()` and renders `<Navigate to="/admin/login">` unless the user is an admin. Any new admin page must render inside `AdminLayout` to be protected.

`ScrollToTop` in `App.tsx` resets `window.scrollTo(0, 0)` on every `pathname` change unless the URL has a hash (so anchor links like `/#map` keep working).

**Public navbar items** (`src/components/site/Navbar.tsx`): **Map** (→ `/atlas`), **Cities**, **Practice**, **About**. The navbar uses `link-underline` with an `.is-active` modifier — there is no terracotta nav indicator.

**Legacy URL handling.** Practice and Recursos are now unified. Both `/journal` and `/resources` (and their `/:slug` variants) redirect to `/practice` via `<PracticeRedirect>`; both `/admin/journal/*` and `/admin/resources/*` redirect to `/admin/practice/*` via `<AdminPracticeRedirect>`, preserving the `:slug` or `:id`.

**Data access.** Pages talk to Supabase **directly** via the `supabase` client (`import { supabase } from "@/integrations/supabase/client"`), fetching in `useEffect` + `useState`. `@tanstack/react-query` is wired up in `App.tsx` but currently unused (no `useQuery`/`useMutation` anywhere) — don't assume it's the data layer. `src/integrations/supabase/types.ts` is the generated DB schema; `client.ts` and `types.ts` are auto-generated — prefer regenerating over hand-editing.

**Auth & roles.** Supabase Auth handles sessions. Roles are deliberately stored in a separate `user_roles` table (not on `profiles`) and checked through the `has_role(_user_id, _role)` SECURITY DEFINER function, which is also what every RLS policy uses. `useAdmin()` (`src/hooks/useAdmin.ts`) resolves the current user and calls the `has_role` RPC; it registers `onAuthStateChange` *before* `getSession()` and defers the role check via `setTimeout(0)` to avoid a Supabase auth deadlock — preserve that ordering if you touch it. New signups get a `profiles` row and the `viewer` role automatically (trigger `handle_new_user`); `admin` must be granted manually in the DB.

**Authorization model (RLS).** Every content table enables RLS with the same shape: the public can `SELECT` rows where `status = 'published'`; admins (via `has_role`) can do everything. So unauthenticated reads only ever see published content. The `project-images` storage bucket follows the same rule (public read, admin write). `site_pages` is public-read / admin-write across all rows.

## Data model (Supabase)

- `cities` — city landing pages. Includes a `sections` JSONB column that stores a configurable page built by the **section builder** (see below), plus map center/zoom, a `region` taxonomy column, and per-record SEO fields (`meta_title`, `meta_description`, `og_image_url`). Note: an earlier migration also added a `style` column to `cities`, which a subsequent migration dropped — style lives on `projects`, not on cities.
- `projects` — architecture projects, FK `city_id → cities`, `gallery` JSONB, `featured` flag, `status` draft/published, `materials text[]` and `experience text[]` for atlas filtering, per-record SEO fields.
- `posts` — practice entries. Historically held both Journal and Resources rows distinguished by a `kind` column (`journal | resource`); both surfaces have been unified under "Practice" and the UI no longer branches on `kind`. New rows are created with `kind = 'resource'` by convention, but readers should not depend on the value. `city_tags` and `linked_project_ids` are UUID arrays. Per-record SEO fields included.
- `site_pages` — editable copy for editor-controlled surfaces, keyed by `key` with a `content` JSONB blob. Public read, admin write. Current keys: `'about'` (manifesto on `/about`), `'home'` (every editable block on `/`), `'taxonomies'` (override lists for categories/styles/materials/experiences/regions). Migration: `supabase/migrations/20260609120000_site_pages.sql`.
- `seo_globals` — site-wide SEO defaults keyed by `page_key` (most relevant row: `page_key = 'global'`).
- `profiles`, `user_roles` — user identity and roles (see Auth above).

Migrations live in `supabase/migrations/`; `supabase/config.toml` pins the linked project ref. To apply schema to a (new) project: `supabase link --project-ref <ref>` then `supabase db push`.

## Editable content surfaces (site_pages)

Several public surfaces read their copy from `site_pages` JSONB rows, with hard-coded defaults as the fallback when the row is missing. This is the pattern to follow for any new editor-controlled block.

- **About** — `site_pages.key = 'about'`. Defaults in `src/lib/aboutContent.ts` (`ABOUT_DEFAULTS`). Edited at `/admin/about`.
- **Home** — `site_pages.key = 'home'`. Shape and `HOME_DEFAULTS` in `src/lib/homeContent.ts` (with `mergeHomeContent()` that backfills missing fields and migrates legacy `headline_line1/line2` into the unified `headline`). Loaded via `useHomeContent()` (`src/hooks/useHomeContent.ts`) — a module-scope cached singleton so multiple components on the homepage share one fetch. Edited at `/admin/home`.
- **Taxonomies** — `site_pages.key = 'taxonomies'`. Shape and `TAXONOMY_DEFAULTS` in `src/lib/taxonomies.ts`. Loaded via `useTaxonomies()` (same singleton pattern as `useHomeContent`). Provides the option lists used by Projects/Cities forms and by Atlas filter chips. Edited at `/admin/taxonomies` ("Categories" in the sidebar).

## Content building blocks

- **Practice (unified)** — `posts` rows are surfaced under a single "Practice" section on the site (`/practice`, `/practice/:slug`) and in a single admin list (`/admin/practice`). `src/lib/postKind.ts` still exports a `PostKind` type and the category list (`PRACTICE_CATEGORIES`), and `kindConfig()` exists for back-compat but always returns the unified Practice config. Don't reintroduce kind-based branching.
- **City section builder** — `src/lib/citySections.ts` defines the `CitySection` union (`rich_text | projects | journal | gallery | spacer`). `SectionBuilder` (admin, drag-and-drop via `@dnd-kit`) edits the array, it persists to `cities.sections`, and `CitySectionsRenderer` (site) renders it. Note the `journal` section type is kept as-is internally — it pulls from `posts`.
- **Rich text** — authored with TipTap (`src/components/admin/RichTextEditor.tsx`, includes the table extensions) and rendered through `src/components/site/RichHtml.tsx`, which sanitizes with DOMPurify. Sanitize any DB-sourced HTML the same way. StarterKit's bundled Link is disabled (`link: false`) so the configured `@tiptap/extension-link` is the only one registered.
- **Images in the editor** — uploaded through `src/lib/uploadImage.ts` (shared with the standalone `ImageUpload` field), which validates type/size and writes to the `project-images` bucket. The editor accepts a file picker, a drag-and-drop, and a clipboard paste; inserting by URL is still available as a secondary button. Never inline a pasted image as base64 — always upload.
- **Pasting spreadsheet data** — Excel/Sheets put an HTML table on the clipboard and TipTap handles that directly. When only plain text is available, `src/lib/tsvTable.ts` parses the tab-separated grid (Excel quoting rules included) and the editor builds a real table. Only TAB is treated as a separator, so prose containing commas — or a single stray tab — is left alone.
- **Map blocks in content** — `src/lib/mapEmbed.ts` defines the placeholder contract (`<div data-map-embed="city|project" data-slug="…">`). `src/components/admin/mapEmbedNode.ts` is the TipTap node (an atom drawing a card in the editor); `RichHtml` portals `ContentMapEmbed` into each placeholder on the public site. Targets are stored as **slugs**, not ids, so the HTML stays portable between entries. The `data-*` attributes are named explicitly in the DOMPurify config — dropping them would silently delete every embedded map.
- **Editor tables on the public site** — tables authored in TipTap retain their pixel widths when rendered: wide tables "break out" past the article column to use the full viewport (with extra side margin and no horizontal scroll), narrow tables stay centered in the column. CSS handling for this lives in `src/components/site/RichHtml.tsx` and `src/index.css`.
- **Admin table row resizing** — `src/components/admin/tableRowResize.ts` is a TipTap extension that lets editors drag a table row's bottom edge to commit a `height` attribute on its cells (used as a min-height so content never clips). Admin tables also expose a compact / comfortable / spacious row-spacing toggle per table.
- **Saving and visibility** — every edit form (Projects, Cities, Practice) uses `src/components/admin/SaveBar.tsx`: a Draft/Published switch plus a single **Save** button. `form.status` is the visibility the editor has selected; `savedStatus` is what the site is currently showing, and the difference between them drives the warning shown before a save takes something offline. Don't reintroduce a second button that changes status as a side effect.
- **SEO** — per-page meta lives in the SEO tab of each edit form (Projects, Cities, Practice) using the record's own columns. Site-wide defaults live in `seo_globals` and are managed from **Settings → SEO Global** (`/admin/seo`). `src/components/site/SEO.tsx` renders react-helmet-async; `HelmetProvider` is at the app root.
- **Maps** — Mapbox GL; always get the token via `getMapboxToken()` rather than reading env directly. The Atlas (`/atlas`) is full-bleed (100vh) with a spinning globe at low zoom, **compound filters** (one selection each across City / Material / Experience / Style — see `src/lib/atlasFilters.ts` and `src/components/site/MapFilters.tsx`), `?city=<slug>` and `?project=<slug>` URL params for deep-linking, and a slide-in editorial card on pin click. The home preview uses a non-interactive spinning Mercator projection.
- **WelcomeOverlay** (`src/components/site/WelcomeOverlay.tsx`) — first-visit splash (gated by the `siana_visited` localStorage key) that fades out after a short delay. Mounted from the home page.
- **Newsletter** — `NewsletterCta` (in `SiteLayout`, so it is the footer of every page) is a link to `sianaarchitecture.substack.com`, opened in a new tab. It deliberately collects nothing. Subscribing from our own form was tried and removed: Substack's subscribe endpoint is not a public API and their edge answers **HTTP 403** to server-to-server calls, so the only supported options were an unstyleable Substack iframe or sending the reader to the publication. Don't re-add a form that posts to Substack — it will 403 — and never let a sign-up form claim success before a backend confirms it. The `newsletter-subscribe` Edge Function and the `newsletter_subscribers` table were both removed once the form became a link.

## Editorial design system

- **Typography**:
  - Primary serif: **Adobe Garamond Pro** (commercial) with **EB Garamond** as the open-source web fallback. Used by `font-display`, `font-display-black`, `font-garamond`, and all `h1-h6` defaults.
  - Wordmark: Instrument Serif italic (`font-logo`).
  - Sans / micro: Montserrat for mono-caps labels (`font-mono`), Inter for body, Manrope for `font-title`/`font-grotesk`.
  - Title sizes use small `clamp()` ranges (`clamp(1.8rem, 3.2vw, 2.8rem)` typical) — kept compact and elegant, not display-bold.
  - Trailing periods on section headings were removed across the site.

- **Color palette** — strictly monochrome (paper/ink/grey scale) with a single terracotta accent (`hsl(var(--accent))`) reserved for the public site eyebrows; the admin is fully greyscale (no terracotta). CSS variables in `src/index.css`. Note the legacy alias: the `blue` token maps to terracotta — historical, leave alone.

- **Editorial CTA** — `src/components/site/EditorialButton.tsx` standardizes every public-site CTA: mono-caps with a hairline underline and an arrow that grows on hover. Three variants:
  - `primary` — ink underline + ink text (default).
  - `muted` — paper-mid underline + ink-soft text.
  - `invert` — white underline + white text for use over dark/photo backgrounds (e.g. city hero).
  Also accepts `arrow` / `leadingArrow` and renders as `<Link>` (if `to`), `<a>` (if `href`) or `<button>` (if `onClick`/`type`).

- **Scroll reveal** — `src/hooks/useReveal.ts` + `src/components/site/Reveal.tsx` wrap elements with an IntersectionObserver-driven fade-up. Use `delay` for stagger on grids. The CSS lives in `src/index.css` under `.reveal` and respects `prefers-reduced-motion`.

- **Shared admin styling** — `src/lib/adminUi.ts` exports class-string constants (`adminInputCls`, `adminLabelCls`, `adminCardCls`, `adminTableCardCls`) that every admin edit page composes onto its inputs/cards. Use them rather than re-styling per form.

## Admin CMS layout

- **Sidebar** (`src/components/admin/AdminLayout.tsx`) is collapsible. State (`siana.admin.sidebar.collapsed`) is persisted in localStorage and read by each remount.
  - Expanded: 240 px with icon + label.
  - Collapsed: 68 px with icon only.
  - **Hover-intent peek**: while collapsed on desktop, hovering the sidebar starts a 400 ms dwell timer; on expiry it expands as an overlay that also shifts the main content. Leaving the sidebar cancels immediately. The peek state is also pinned open while the user-menu dropdown is open (Radix portals the menu outside the `<aside>`, which would otherwise close the menu in a loop).
  - **Auto-collapse on nav click**: clicking any nav item commits `collapsed=true` synchronously to localStorage so the next page mount picks it up.
  - **Mobile**: hidden by default behind a 56 px top bar with hamburger + wordmark; opens as a 260 px slide-in drawer with backdrop.

- **Sidebar items** (English labels, in order): **Dashboard** (`/admin`), **Home** (`/admin/home`), **Projects** (`/admin/projects`), **Cities** (`/admin/cities`), **Practice** (`/admin/practice`), **About** (`/admin/about`), **Categories** (`/admin/taxonomies`). The sidebar **header** is a dropdown trigger showing the signed-in user's display name (derived from the email local-part) and opens a menu with **Settings** (also collapses the sidebar) and **Sign out**. There is no separate "Recursos" entry — Practice is unified. Settings/SEO routes are reached via the user menu and live under `/admin/settings`, `/admin/seo`, `/admin/settings/integrations`.

- **Settings sub-navigation** — `src/components/admin/SettingsTabs.tsx` is a reusable tabbed nav that appears on each Settings page: **General** (`/admin/settings`), **SEO Global** (`/admin/seo`), **Integrations** (`/admin/settings/integrations`).

- **Admin pages**:
  - **Dashboard** (`/admin`, `AdminDashboard.tsx`) — editorial landing with counts (projects / cities / practice, with published vs draft splits), quick-action links, and a "recently updated" list across the three content tables.
  - **Home** (`/admin/home`, `AdminHome.tsx`) — collapsible blocks for the homepage hero, map preview copy, featured cities/buildings copy, latest practice copy, and newsletter copy; hero image uploads on the right column. Persists to `site_pages('home')` via `useHomeContent()`.
  - **Categories** (`/admin/taxonomies`, `AdminTaxonomies.tsx`) — tag editors for categories, styles, materials, experiences, and regions. Persists to `site_pages('taxonomies')` and is read by Projects/Cities edit forms and by the Atlas filter chips via `useTaxonomies()`.
  - **About** (`/admin/about`, `AdminAbout.tsx`) — edits the manifesto block. Persists to `site_pages('about')`.

- **Width**: list/edit pages (Projects, Cities, Practice, *Edit) intentionally have no outer max-width so tables and forms use the entire available canvas. Settings/SEO/Integrations/About/Home keep narrow `max-w-[820–960px]` containers since they're focused forms.

- **ConfirmDialog** (`src/components/admin/ConfirmDialog.tsx`) — shared destructive-action confirmation built on Radix AlertDialog. Use it for deletes rather than `window.confirm`.

## Conventions

- `@/*` is an alias for `src/*` (configured in `vite.config.ts`, `vitest.config.ts`, and tsconfig).
- UI primitives are shadcn/ui (`src/components/ui/*`, config in `components.json`) on a custom editorial Tailwind theme. Colors are HSL CSS variables in `src/index.css` and exposed as Tailwind tokens (`ink`, `paper`, `paper-warm`, `paper-mid`, `accent` (terracotta), `accent-terra`, `warm-gray`, etc.) with utility classes `tracking-tag`/`tracking-label` and serif/sans helpers `font-display`/`font-logo`/`font-mono`.
- TypeScript is intentionally **non-strict** (`strictNullChecks: false`, `noImplicitAny: false`, `noUnused*: false` in `tsconfig.json`). Don't rely on strict-null guarantees.
- Tests use Vitest + Testing Library in a jsdom environment; setup is `src/test/setup.ts` (jest-dom + a `matchMedia` stub). Test files match `src/**/*.{test,spec}.{ts,tsx}`.
- Per-record SEO columns (`meta_title`, `meta_description`, `og_image_url`) exist on `projects`, `cities`, and `posts`. When adding new content tables, follow the same pattern.
- For editor-controlled copy on a public surface, follow the `site_pages` pattern: define a typed shape and `*_DEFAULTS` in a lib file, a `merge*` helper that backfills missing fields, a singleton hook that fetches once per session, and an admin page that writes the row back.
