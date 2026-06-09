# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Siana is an editorial "atlas" of architecture: a public website (atlas/map, cities, practice/journal entries, resources, about) plus a built-in admin CMS to manage that content. It is a client-only React SPA (Vite, no SSR) backed entirely by Supabase (Postgres + Auth + Storage).

## Commands

Bun is the declared package manager (`bun.lockb`), but `npm` also works (a `package-lock.json` is present). Use whichever; commands below show npm.

- `npm run dev` — start the dev server at **http://localhost:8080** (port/host are fixed in `vite.config.ts`)
- `npm run build` — production build (`build:dev` builds in development mode)
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

**Public navbar items** (`src/components/site/Navbar.tsx`): Atlas, Cities, Practice (formerly "Resources for Architects"), About. Journal as a top-level page was retired and now lives under `/practice`.

**Data access.** Pages talk to Supabase **directly** via the `supabase` client (`import { supabase } from "@/integrations/supabase/client"`), fetching in `useEffect` + `useState`. `@tanstack/react-query` is wired up in `App.tsx` but currently unused (no `useQuery`/`useMutation` anywhere) — don't assume it's the data layer. `src/integrations/supabase/types.ts` is the generated DB schema; `client.ts` and `types.ts` are auto-generated — prefer regenerating over hand-editing.

**Auth & roles.** Supabase Auth handles sessions. Roles are deliberately stored in a separate `user_roles` table (not on `profiles`) and checked through the `has_role(_user_id, _role)` SECURITY DEFINER function, which is also what every RLS policy uses. `useAdmin()` (`src/hooks/useAdmin.ts`) resolves the current user and calls the `has_role` RPC; it registers `onAuthStateChange` *before* `getSession()` and defers the role check via `setTimeout(0)` to avoid a Supabase auth deadlock — preserve that ordering if you touch it. New signups get a `profiles` row and the `viewer` role automatically (trigger `handle_new_user`); `admin` must be granted manually in the DB.

**Authorization model (RLS).** Every content table enables RLS with the same shape: the public can `SELECT` rows where `status = 'published'`; admins (via `has_role`) can do everything. So unauthenticated reads only ever see published content. The `project-images` storage bucket follows the same rule (public read, admin write).

## Data model (Supabase)

- `cities` — city landing pages. Includes a `sections` JSONB column that stores a configurable page built by the **section builder** (see below), plus map center/zoom and per-record SEO fields (`meta_title`, `meta_description`, `og_image_url`).
- `projects` — architecture projects, FK `city_id → cities`, `gallery` JSONB, `featured` flag, `status` draft/published, per-record SEO fields.
- `posts` — **both** Practice entries (kind=`resource`) and Recursos (kind=`journal`), distinguished by the `kind` column. `city_tags` and `linked_project_ids` are UUID arrays. Per-record SEO fields included.
- `seo_globals` — site-wide SEO defaults keyed by `page_key` (most relevant row: `page_key = 'global'`).
- `site_pages` — editable copy for static editorial pages, keyed by `key` (e.g. `'about'`) with a `content` JSONB blob. Public read, admin write. Migration: `supabase/migrations/20260609120000_site_pages.sql`.
- `profiles`, `user_roles` — user identity and roles (see Auth above).

Migrations live in `supabase/migrations/`; `supabase/config.toml` pins the linked project ref. To apply schema to a (new) project: `supabase link --project-ref <ref>` then `supabase db push`.

## Content building blocks

- **Practice vs Recursos** share the `posts` table and most UI. `src/lib/postKind.ts` (`kindConfig`, `detectKindFromPath`) supplies the labels, categories, and base paths for each `kind`. The public site exposes both under `/practice` and `/journal`; the legacy `/resources` URL is kept as an alias in `App.tsx`. In the CMS sidebar they appear as **Práctica** (kind=`resource`) and **Recursos** (kind=`journal`).
- **City section builder** — `src/lib/citySections.ts` defines the `CitySection` union (`rich_text | projects | journal | gallery | spacer`). `SectionBuilder` (admin, drag-and-drop via `@dnd-kit`) edits the array, it persists to `cities.sections`, and `CitySectionsRenderer` (site) renders it.
- **Rich text** — authored with TipTap (`src/components/admin/RichTextEditor.tsx`) and rendered through `src/components/site/RichHtml.tsx`, which sanitizes with DOMPurify. Sanitize any DB-sourced HTML the same way.
- **SEO** — per-page meta lives in the SEO tab of each edit form (Projects, Cities, Practice, Recursos) using the record's own columns. Site-wide defaults live in `seo_globals` and are managed from **Ajustes → SEO Global** (`/admin/seo`). `src/components/site/SEO.tsx` renders react-helmet-async; `HelmetProvider` is at the app root.
- **About content** — the manifesto block on `/about` is editable from **/admin/about**. Fetched from `site_pages` keyed by `'about'`; falls back to `ABOUT_DEFAULTS` in `src/lib/aboutContent.ts` if the row is missing or the migration hasn't run.
- **Maps** — Mapbox GL; always get the token via `getMapboxToken()` rather than reading env directly. The Atlas (`/atlas`) is full-bleed (100vh) with a spinning globe at low zoom, single-select category filters (Cities / Materials / Experience as stacked dropdowns), `?city=<slug>` and `?project=<slug>` URL params for deep-linking, and a slide-in editorial card on pin click. The home preview uses a non-interactive spinning Mercator projection.

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

## Admin CMS layout

- **Sidebar** (`src/components/admin/AdminLayout.tsx`) is collapsible. State (`siana.admin.sidebar.collapsed`) is persisted in localStorage and read by each remount.
  - Expanded: 240 px with icon + label.
  - Collapsed: 68 px with icon only.
  - **Hover-peek**: while collapsed, hovering the sidebar temporarily expands it as an overlay (the main content stays put).
  - **Auto-collapse on nav click**: clicking any nav item commits `collapsed=true` synchronously to localStorage so the next page mount picks it up.
  - **Mobile**: hidden by default behind a 56 px top bar with hamburger + wordmark; opens as a 260 px slide-in drawer with backdrop.
  - **Hover affordance**: every nav item shows a faint background tint + soft drop shadow on hover.

- **Sidebar items** (Spanish): Proyectos, Ciudades, Práctica, Recursos, About. **Ajustes** lives in the footer (separated by a hairline) alongside the user email and "Cerrar sesión". The active state highlights Ajustes also for `/admin/seo` and `/admin/settings/integrations`.

- **Ajustes sub-navigation** — `src/components/admin/SettingsTabs.tsx` is a reusable tabbed nav that appears on each Ajustes page: **General** (`/admin/settings`), **SEO Global** (`/admin/seo`), **Integraciones** (`/admin/settings/integrations`).

- **Admin pages stretch full width** — list/edit pages (Projects, Cities, Practice, Recursos, *Edit) removed their outer `max-w-[1400px]` / `max-w-[1100px]` constraints so tables and forms use the entire available canvas. Settings/SEO/Integrations/About keep narrow `max-w-[820–960px]` containers since they're focused forms.

## Conventions

- `@/*` is an alias for `src/*` (configured in `vite.config.ts`, `vitest.config.ts`, and tsconfig).
- UI primitives are shadcn/ui (`src/components/ui/*`, config in `components.json`) on a custom editorial Tailwind theme. Colors are HSL CSS variables in `src/index.css` and exposed as Tailwind tokens (`ink`, `paper`, `paper-warm`, `paper-mid`, `accent` (terracotta), `accent-terra`, `warm-gray`, etc.) with utility classes `tracking-tag`/`tracking-label` and serif/sans helpers `font-display`/`font-logo`/`font-mono`.
- TypeScript is intentionally **non-strict** (`strictNullChecks: false`, `noImplicitAny: false`, `noUnused*: false` in `tsconfig.json`). Don't rely on strict-null guarantees.
- Tests use Vitest + Testing Library in a jsdom environment; setup is `src/test/setup.ts` (jest-dom + a `matchMedia` stub). Test files match `src/**/*.{test,spec}.{ts,tsx}`.
- Per-record SEO columns (`meta_title`, `meta_description`, `og_image_url`) exist on `projects`, `cities`, and `posts`. When adding new content tables, follow the same pattern.
