/**
 * Shared visual primitives for the admin CMS. Keep input, label and panel
 * styles here so changes propagate across every edit page without hunting
 * for one-off Tailwind strings.
 */

/** Modern editorial text input. White surface, soft rounded corners, gentle
 *  hover state, ink border + ring on focus. The border lives on the input
 *  itself — no wrapping plate around it. */
export const adminInputCls =
  "w-full bg-white border border-paper-mid rounded-lg px-4 py-3 text-[14px] text-ink placeholder:text-ink-faint transition-colors duration-150 focus:outline-none focus:border-ink/50 focus:ring-2 focus:ring-ink/5 hover:border-ink/30 disabled:opacity-60 disabled:cursor-not-allowed";

/** Label above inputs. Less aggressive tracking than the previous
 *  mono-uppercase style, but still small-caps editorial. */
export const adminLabelCls =
  "block text-[11px] uppercase text-ink-muted mb-2 font-semibold tracking-[0.08em]";

/** Card/section panel for grouping fields. Rounded, white, gentle border. */
export const adminCardCls =
  "bg-white rounded-xl p-7 space-y-6 border border-paper-mid";

/** Variant of the card for list/table containers — same shell as adminCardCls
 *  but without padding or vertical spacing (the table rows already manage
 *  their own paddings), and with overflow-hidden so the rounded corners
 *  clip the inner table cleanly. */
export const adminTableCardCls =
  "bg-white rounded-xl border border-paper-mid overflow-hidden";
