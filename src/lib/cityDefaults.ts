// Default editorial description used both on the public city page and as
// the seeded value in the admin Descripción editor. Keeping a single
// source of truth means the admin sees exactly what the website will show
// for a new city, and can edit those paragraphs freely.

export function defaultCityDescriptionHTML(opts: {
  name: string;
  country?: string | null;
}): string {
  const name = opts.name?.trim() || "This city";
  const country = opts.country?.trim() || "";
  const visitingClause = country ? ` ${country}` : "";
  const countryClause = country ? ` and the wider story of ${country}` : "";

  return (
    `<p>${name} has been built and rebuilt for centuries. Its streets ` +
    `carry the marks of every era that passed through them — civic squares ` +
    `laid out by old empires, dense residential blocks raised during ` +
    `industrial booms, and contemporary insertions that quietly repair the ` +
    `gaps the twentieth century left behind.</p>` +
    `<p>What gives ${name} its architectural identity is less any single ` +
    `monument than the conversation between them: between façades that ` +
    `disagree about ornament, between courtyards that share light, between ` +
    `materials chosen by different generations for reasons that still hold.</p>` +
    `<p>The projects gathered here aim to read that conversation${countryClause} ` +
    `— from the icons that anyone visiting${visitingClause} would recognise, ` +
    `to the smaller, overlooked works that explain how the city actually ` +
    `thinks, builds and lives.</p>`
  );
}

// A description is considered "empty enough to seed defaults" if it's
// missing, only contains empty markup, or is shorter than a one-liner
// — a few words of seeded copy would be more confusing than helpful, so
// we let the editorial fallback take over until the admin writes a
// substantive paragraph.
const MIN_DESCRIPTION_TEXT_LENGTH = 80;

export function isDescriptionEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  const text = html.replace(/<[^>]*>/g, "").trim();
  return text.length < MIN_DESCRIPTION_TEXT_LENGTH;
}
