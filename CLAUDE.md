# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Siana is an editorial "atlas" of architecture: a public website (cities, projects, journal, resources) plus a built-in admin CMS to manage that content. It is a client-only React SPA (Vite, no SSR) backed entirely by Supabase (Postgres + Auth + Storage).

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

**Data access.** Pages talk to Supabase **directly** via the `supabase` client (`import { supabase } from "@/integrations/supabase/client"`), fetching in `useEffect` + `useState`. `@tanstack/react-query` is wired up in `App.tsx` but currently unused (no `useQuery`/`useMutation` anywhere) — don't assume it's the data layer. `src/integrations/supabase/types.ts` is the generated DB schema; `client.ts` and `types.ts` are auto-generated — prefer regenerating over hand-editing.

**Auth & roles.** Supabase Auth handles sessions. Roles are deliberately stored in a separate `user_roles` table (not on `profiles`) and checked through the `has_role(_user_id, _role)` SECURITY DEFINER function, which is also what every RLS policy uses. `useAdmin()` (`src/hooks/useAdmin.ts`) resolves the current user and calls the `has_role` RPC; it registers `onAuthStateChange` *before* `getSession()` and defers the role check via `setTimeout(0)` to avoid a Supabase auth deadlock — preserve that ordering if you touch it. New signups get a `profiles` row and the `viewer` role automatically (trigger `handle_new_user`); `admin` must be granted manually in the DB.

**Authorization model (RLS).** Every content table enables RLS with the same shape: the public can `SELECT` rows where `status = 'published'`; admins (via `has_role`) can do everything. So unauthenticated reads only ever see published content. The `project-images` storage bucket follows the same rule (public read, admin write).

## Data model (Supabase)

- `cities` — city landing pages. Includes a `sections` JSONB column that stores a configurable page built by the **section builder** (see below), plus map center/zoom and per-record SEO fields.
- `projects` — architecture projects, FK `city_id → cities`, `gallery` JSONB, `featured` flag, `status` draft/published.
- `posts` — **both** Journal entries and Resources, distinguished by the `kind` column (`'journal' | 'resource'`). `city_tags` and `linked_project_ids` are UUID arrays.
- `seo_globals` — per-page SEO overrides keyed by `page_key` (publicly readable).
- `profiles`, `user_roles` — user identity and roles (see Auth above).

Migrations live in `supabase/migrations/`; `supabase/config.toml` pins the linked project ref. To apply schema to a (new) project: `supabase link --project-ref <ref>` then `supabase db push`.

## Content building blocks

- **Journal vs Resources** share the `posts` table and most UI. `src/lib/postKind.ts` (`kindConfig`, `detectKindFromPath`) supplies the labels, categories, and base paths for each `kind`; `/journal/*` and `/resources/*` routes reuse the same page components.
- **City section builder** — `src/lib/citySections.ts` defines the `CitySection` union (`rich_text | projects | journal | gallery | spacer`). `SectionBuilder` (admin, drag-and-drop via `@dnd-kit`) edits the array, it persists to `cities.sections`, and `CitySectionsRenderer` (site) renders it.
- **Rich text** — authored with TipTap (`src/components/admin/RichTextEditor.tsx`) and rendered through `src/components/site/RichHtml.tsx`, which sanitizes with DOMPurify. Sanitize any DB-sourced HTML the same way.
- **SEO** — set per page with the `SEO` component (`src/components/site/SEO.tsx`, react-helmet-async). `HelmetProvider` is at the app root.
- **Maps** — Mapbox GL; always get the token via `getMapboxToken()` rather than reading env directly.

## Conventions

- `@/*` is an alias for `src/*` (configured in `vite.config.ts`, `vitest.config.ts`, and tsconfig).
- UI is shadcn/ui (`src/components/ui/*`, config in `components.json`) on a custom editorial Tailwind theme. Colors are HSL CSS variables defined in `src/index.css` and exposed as tokens (`ink`, `paper`, `terracotta`, custom `tracking-tag`/`tracking-label`, serif `font-display`/`font-logo`). Note the legacy alias: the `blue` color token maps to terracotta.
- TypeScript is intentionally **non-strict** (`strictNullChecks: false`, `noImplicitAny: false`, `noUnused*: false` in `tsconfig.json`). Don't rely on strict-null guarantees.
- Tests use Vitest + Testing Library in a jsdom environment; setup is `src/test/setup.ts` (jest-dom + a `matchMedia` stub). Test files match `src/**/*.{test,spec}.{ts,tsx}`.
