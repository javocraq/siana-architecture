---
name: Siana Architecture Narrative
colors:
  surface: '#fef8f1'
  surface-dim: '#dfd9d2'
  surface-bright: '#fef8f1'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f9f3ec'
  surface-container: '#f3ede6'
  surface-container-high: '#ede7e0'
  surface-container-highest: '#e7e2db'
  on-surface: '#1d1b17'
  on-surface-variant: '#4c4546'
  inverse-surface: '#32302c'
  inverse-on-surface: '#f6f0e9'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#695c4d'
  on-secondary: '#ffffff'
  secondary-container: '#f1e0cc'
  on-secondary-container: '#6f6253'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1b1b'
  on-tertiary-container: '#848484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#f1e0cc'
  secondary-fixed-dim: '#d4c4b1'
  on-secondary-fixed: '#231a0e'
  on-secondary-fixed-variant: '#504537'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1b1b1b'
  on-tertiary-fixed-variant: '#474747'
  background: '#fef8f1'
  on-background: '#1d1b17'
  surface-variant: '#e7e2db'
  warm-white: '#FFF9F2'
  muted-earth: '#796C5C'
  stark-black: '#000000'
  paper-grey: '#E5E1DA'
typography:
  display-lg:
    fontFamily: ebGaramond
    fontSize: 64px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: ebGaramond
    fontSize: 40px
    fontWeight: '400'
    lineHeight: '1.1'
  headline-md:
    fontFamily: ebGaramond
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: ebGaramond
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.3'
  body-lg:
    fontFamily: hankenGrotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: hankenGrotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: hankenGrotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.1em
  ui-button:
    fontFamily: hankenGrotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.0'
    letterSpacing: 0.05em
spacing:
  unit: 4px
  gutter: 24px
  margin-desktop: 80px
  margin-mobile: 20px
  section-gap: 120px
---

## Brand & Style

The design system is rooted in the concept of "Silent Luxury." It moves away from the ephemeral nature of digital startups toward the permanence of architectural monographs and high-end editorial journals. The target audience consists of discerning travelers, architects, and cultural curators who value depth over speed.

The visual style is **Minimalist** with an **Editorial** inflection. It prioritizes the "empty" space as much as the content itself. The UI is designed to be invisible, acting as a sophisticated frame for high-quality architectural photography. There are no heavy shadows, rounded "bubble" buttons, or vibrant call-outs. Instead, the interface relies on precision, thin hairlines, and rhythmic typography to guide the eye.

## Colors

The palette is strictly organic and grounded. 
- **Warm White (#FFF9F2):** Serves as the primary canvas, providing a softer, more "paper-like" feel than pure white to reduce digital glare and enhance the premium feel.
- **Stark Black (#000000):** Used for primary typography and structural hairlines to create high-contrast, authoritative legibility.
- **Muted Earth (#796C5C):** A sophisticated taupe/brown used for secondary information, meta-data, and subtle interactive states.
- **Paper Grey (#E5E1DA):** Employed for low-contrast dividers and background shifts in immersive sections.

Avoid any use of pure blue, green, or vibrant "action" colors. All interactive states should be conveyed through tonal shifts or typographic changes (e.g., italics or underlines).

## Typography

The typographic strategy hinges on the tension between the classical **EB Garamond** and the architectural precision of **Hanken Grotesk**.

- **Serif (Headings):** Use EB Garamond for all editorial titles and narrative headers. Use tight letter spacing for large display sizes to emphasize the elegant high-contrast strokes.
- **Sans-Serif (Body & UI):** Hanken Grotesk provides a neutral, modern counterpoint. It should be used with generous leading (line height) to ensure the text feels airy and legible.
- **Labels:** Small caps with tracking (letter spacing) are used for categories and metadata to create a "gallery label" aesthetic.

## Layout & Spacing

The layout follows an **Editorial Grid** model with an emphasis on asymmetrical balance. 
- **The Grid:** A 12-column system is used for desktop, but content should rarely span the full width. Centered narrow columns (8 columns) or offset layouts (e.g., 4 columns text / 6 columns image) are preferred to create visual rhythm.
- **Whitespace:** Vertical spacing between sections should be exceptionally generous (up to 120px or 160px) to force a slower, more intentional scrolling pace.
- **Dividers:** Use 0.5px or 1px hairlines in `stark-black` (at 10-20% opacity) to separate content sections without adding visual weight.

## Elevation & Depth

This design system eschews shadows and depth-based layering. 
- **Tonal Layers:** Hierachy is created through background color shifts (e.g., moving from `warm-white` to a full-bleed `stark-black` section) rather than elevation.
- **Flat Surface:** All elements sit on the same optical plane. 
- **Image Overlays:** When text must appear over photography, use a very subtle linear gradient (from 30% black to transparent) rather than a heavy scrim.
- **Overlaps:** Subtle asymmetrical overlaps—where an image slightly bleeds into a margin or a text block partially covers an image—are encouraged to mimic physical magazine layouts.

## Shapes

The shape language is strictly **Sharp (0px)**. 

Every element—including buttons, input fields, image containers, and cards—must feature 90-degree corners. This reinforces the architectural theme and suggests a sense of structure, permanence, and precision. Rounded corners are seen as too "friendly" or "digital" for this specific brand narrative.

## Components

- **Buttons:** Buttons are never "blocks." Use a simple text link in `label-caps` style with a persistent 1px underline. On hover, the underline should animate to a thicker weight or change color to `muted-earth`.
- **Cards:** Do not use traditional cards with borders or shadows. Instead, use "Fragment" layouts: a full-bleed image with the title and category positioned immediately below in a clear typographic hierarchy.
- **Inputs:** Simple bottom-border only (hairline). Labels should be in `label-caps` positioned above the line. No background fills.
- **Navigation:** A minimal top bar with high transparency. The logo should be centered or far-left, with navigation items spaced widely to the right. Use a "hamburger" or "menu" text label even on desktop to maintain a clean aesthetic.
- **Imagery:** All images should utilize `object-fit: cover` and maintain fixed aspect ratios (preferably 3:2 or 4:5) to ensure a disciplined, curated look across the platform.

## Implementation notes

How this spec maps onto the codebase (see `CLAUDE.md` for the broader architecture):

- **Fonts** are loaded in `index.html` (Google Fonts: `EB Garamond`, `Hanken Grotesk`) and exposed as Tailwind utilities `font-garamond` (serif headings) and `font-grotesk` (body/UI/labels) in `tailwind.config.ts`. These are added alongside — not replacing — the legacy `font-display`/`font-mono`/`font-logo` families.
- **Palette** values above are applied with Tailwind arbitrary values where used (`bg-[#FFF9F2]`, `text-black`, `text-[#796C5C]`, `bg-[#E5E1DA]`, hairlines via `border-black/10`). The global HSL token set in `src/index.css` (ink/paper/terracotta) has **not** been replaced yet, so non-migrated pages keep the previous editorial theme.
- **Applied so far:** `/cities` (`src/pages/Cities.tsx`) — warm-white canvas, EB Garamond title, label-caps metadata, hairline divider, and "Fragment" cards (image with title/meta below, sharp corners, no scrim). The shared `Navbar`/`Footer` (`SiteLayout`) still use the legacy theme until the system is rolled out site-wide.
