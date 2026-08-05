# Siana Architecture

An editorial atlas of architecture — public site (cities, projects, journal, resources) with a built-in admin CMS. Client-only React SPA (Vite, no SSR) backed by Supabase (Postgres + Auth + Storage).

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Postgres, Auth, Storage, RLS)
- Mapbox GL for city maps
- TipTap for rich text authoring
- Vitest + Testing Library for tests

## Getting started

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_MAPBOX_PUBLIC_TOKEN
npm run dev            # http://localhost:8080
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build (generates the sitemap first)
- `npm run lint` — ESLint over the repo
- `npm run test` — run the Vitest suite once
- `npm run test:watch` — Vitest in watch mode

See `CLAUDE.md` for architectural notes (routing, auth/roles, RLS, content model, conventions).
