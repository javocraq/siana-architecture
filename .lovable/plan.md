## Goals

1. Fix raw HTML showing as text on city landing pages
2. Show city-linked journal entries on the city LP
3. Visual page-builder for city landing pages (toggle/reorder sections)
4. WordPress-style journal editor with tables + visual/HTML toggle

---

## 1. Fix HTML rendering on city LP

The city description is stored as HTML by the RichTextEditor (TipTap) but is currently being printed as a string. Switch to safe HTML rendering with `dangerouslySetInnerHTML` plus DOMPurify sanitization, and apply a `prose` typography class so headings/paragraphs/lists style correctly. Same fix applied to journal article body and project description anywhere a TipTap field is rendered.

## 2. Journal entries on the city landing page

Posts already have a `city_tags: uuid[]` column. On `CityDetail.tsx`, add a "From the Journal" section that queries:
```
posts where status='published' AND city_id = ANY(city_tags) order by published_at desc limit 6
```
Shows article cards (hero image, title, excerpt, date) linking to `/journal/:slug`. The Journal admin editor already lets you pick `city_tags`, so no schema change needed.

## 3. City landing page builder

Add a new `sections jsonb` column on `cities` storing an ordered array of section blocks. Each block has:
```json
{ "id": "uuid", "type": "rich_text" | "projects" | "journal" | "gallery" | "spacer", "enabled": true, "settings": { ... } }
```
- `rich_text` — TipTap content
- `projects` — filter by `category`/`style`/`featured`, max count
- `journal` — filter by `category`, max count (uses city_tags by default)
- `gallery` — list of images
- `spacer` — height

Admin UI inside `AdminCityEdit.tsx` gets a new **Layout** tab with:
- A vertical list of section cards
- Drag handle to reorder (`@dnd-kit/sortable` — already in stack-friendly category, install if missing)
- Toggle switch (enable/disable)
- Inline settings panel per type
- "Add section" dropdown at the bottom
- Duplicate / delete buttons

Public `CityDetail.tsx` reads `sections`, renders blocks in order, skipping disabled ones. If `sections` is empty, falls back to the current default layout (hero → description → projects → journal) so existing cities keep working.

## 4. WordPress-style journal editor

Upgrade `RichTextEditor` (TipTap) with:
- `@tiptap/extension-table`, `@tiptap/extension-table-row/header/cell`
- Toolbar: insert table, add/remove row & column, merge/split cells, toggle header row
- Existing formatting: headings, bold/italic, lists, link, image, blockquote, code
- A **"Code" toggle button** that switches the editor between Visual mode and a raw HTML `<textarea>` — paste/edit HTML and switch back to render it
- Table styling in `index.css` so tables look right both in editor and on published pages

Apply the upgraded editor to journal posts and city rich-text sections.

---

## Technical notes

- New deps: `dompurify`, `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-header`, `@tiptap/extension-table-cell`, `@dnd-kit/core`, `@dnd-kit/sortable`
- Migration: `ALTER TABLE cities ADD COLUMN sections jsonb NOT NULL DEFAULT '[]'::jsonb;`
- No RLS changes needed
- Files touched:
  - `src/pages/CityDetail.tsx` (HTML render, journal section, sections renderer)
  - `src/pages/JournalArticle.tsx` (HTML render)
  - `src/pages/ProjectDetail.tsx` (HTML render)
  - `src/components/admin/RichTextEditor.tsx` (tables + code mode)
  - `src/pages/admin/AdminCityEdit.tsx` (Layout tab)
  - New `src/components/admin/SectionBuilder.tsx`
  - New `src/components/site/sections/*` for public renderers
