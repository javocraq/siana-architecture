import { useMemo, useState } from "react";
import { X, SlidersHorizontal } from "lucide-react";

export type Filters = {
  programme: string | null; // Cultural | Public | Commercial | Residential | Mixed Use
  styles: string[];
  eras: string[];
  architect: string;
};

export const EMPTY_FILTERS: Filters = {
  programme: null,
  styles: [],
  eras: [],
  architect: "",
};

export const PROGRAMMES = ["Cultural", "Public", "Commercial", "Residential", "Mixed Use"];
const STYLES = [
  "Modernist","Brutalist","Art Deco","Baroque","Gothic",
  "Deconstructivist","Postmodern","Contemporary","Expressionist","Organic","High-Tech",
];
const ERAS = ["Pre-1900","1900–1945","1945–1975","1975–2000","2000–now"];

export function eraMatches(year: number | null, era: string) {
  if (year == null) return false;
  switch (era) {
    case "Pre-1900": return year < 1900;
    case "1900–1945": return year >= 1900 && year <= 1945;
    case "1945–1975": return year > 1945 && year <= 1975;
    case "1975–2000": return year > 1975 && year <= 2000;
    case "2000–now": return year > 2000;
    default: return false;
  }
}

type Props = {
  filters: Filters;
  onChange: (f: Filters) => void;
  resultCount: number;
  architectOptions: string[];
};

export default function MapFilters({ filters, onChange, resultCount, architectOptions }: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(filters);

  const activeTags = useMemo(() => {
    const tags: { label: string; clear: () => void }[] = [];
    if (filters.programme)
      tags.push({ label: filters.programme, clear: () => onChange({ ...filters, programme: null }) });
    filters.styles.forEach((s) =>
      tags.push({ label: s, clear: () => onChange({ ...filters, styles: filters.styles.filter((x) => x !== s) }) })
    );
    filters.eras.forEach((e) =>
      tags.push({ label: e, clear: () => onChange({ ...filters, eras: filters.eras.filter((x) => x !== e) }) })
    );
    if (filters.architect.trim())
      tags.push({ label: filters.architect, clear: () => onChange({ ...filters, architect: "" }) });
    return tags;
  }, [filters, onChange]);

  const openPanel = () => {
    setDraft(filters);
    setPanelOpen(true);
  };

  const toggle = (key: "styles" | "eras", val: string) => {
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(val) ? d[key].filter((x) => x !== val) : [...d[key], val],
    }));
  };

  const filteredArchitects = draft.architect.trim()
    ? architectOptions.filter((a) => a.toLowerCase().includes(draft.architect.toLowerCase())).slice(0, 6)
    : [];

  return (
    <>
      <div className="px-6 py-4 border-b hairline">
        {activeTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 items-center">
            {activeTags.map((t) => (
              <button
                key={t.label}
                onClick={t.clear}
                className="inline-flex items-center gap-1 font-medium uppercase px-3 py-1.5 border"
                style={{
                  fontSize: 13,
                  letterSpacing: "0.12em",
                  background: "hsl(var(--blue-light))",
                  color: "hsl(var(--blue))",
                  borderColor: "hsl(var(--blue-muted))",
                }}
              >
                {t.label}
                <X className="w-2.5 h-2.5" />
              </button>
            ))}
            <button
              onClick={openPanel}
              className="inline-flex items-center gap-1 font-medium uppercase px-3 py-1.5 border text-ink hover:bg-off-white"
              style={{ fontSize: 13, letterSpacing: "0.12em", borderColor: "#0f0f0f" }}
            >
              <SlidersHorizontal className="w-2.5 h-2.5" /> Filters
            </button>
          </div>
        ) : (
          <div className="flex gap-1.5 items-center">
            <button
              onClick={() => onChange(EMPTY_FILTERS)}
              className="font-medium uppercase px-3.5 py-1.5 border whitespace-nowrap text-background"
              style={{
                fontSize: 13,
                letterSpacing: "0.12em",
                background: "hsl(var(--blue))",
                borderColor: "hsl(var(--blue))",
              }}
            >
              All
            </button>
            <button
              onClick={openPanel}
              className="inline-flex items-center gap-1.5 font-medium uppercase px-3.5 py-1.5 text-ink hover:bg-off-white whitespace-nowrap border"
              style={{ fontSize: 13, letterSpacing: "0.12em", borderColor: "#0f0f0f" }}
            >
              <SlidersHorizontal className="w-2.5 h-2.5" /> Filters
            </button>
          </div>
        )}
      </div>

      {panelOpen && (
        <div className="absolute inset-0 z-30 bg-background flex flex-col fade-in">
          <div className="flex items-center justify-between px-6 py-4 border-b hairline">
            <p className="text-[14px] font-semibold tracking-[0.16em] uppercase text-ink">Filters</p>
            <button onClick={() => setPanelOpen(false)} aria-label="Close" className="p-1 text-ink-muted hover:text-ink">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-7">
            <div>
              <p className="text-[12px] font-semibold tracking-[0.16em] uppercase text-ink-soft mb-3">Programme</p>
              <div className="flex flex-wrap gap-1.5">
                {PROGRAMMES.map((p) => {
                  const on = draft.programme === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setDraft({ ...draft, programme: on ? null : p })}
                      className="text-[13px] font-medium tracking-[0.14em] uppercase px-3.5 py-2 border transition-colors"
                      style={
                        on
                          ? { background: "hsl(var(--blue))", color: "#fff", borderColor: "hsl(var(--blue))" }
                          : { borderColor: "rgba(0,0,0,0.08)", color: "hsl(var(--ink-muted))" }
                      }
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[12px] font-semibold tracking-[0.16em] uppercase text-ink-soft mb-3">Style</p>
              <div className="flex flex-wrap gap-1.5">
                {STYLES.map((s) => {
                  const on = draft.styles.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggle("styles", s)}
                      className="text-[13px] font-medium tracking-[0.14em] uppercase px-3.5 py-2 border transition-colors"
                      style={
                        on
                          ? { background: "hsl(var(--blue))", color: "#fff", borderColor: "hsl(var(--blue))" }
                          : { borderColor: "rgba(0,0,0,0.08)", color: "hsl(var(--ink-muted))" }
                      }
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[12px] font-semibold tracking-[0.16em] uppercase text-ink-soft mb-3">Era</p>
              <div className="flex flex-wrap gap-1.5">
                {ERAS.map((e) => {
                  const on = draft.eras.includes(e);
                  return (
                    <button
                      key={e}
                      onClick={() => toggle("eras", e)}
                      className="text-[13px] font-medium tracking-[0.14em] uppercase px-3.5 py-2 border transition-colors"
                      style={
                        on
                          ? { background: "hsl(var(--blue))", color: "#fff", borderColor: "hsl(var(--blue))" }
                          : { borderColor: "rgba(0,0,0,0.08)", color: "hsl(var(--ink-muted))" }
                      }
                    >
                      {e}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[12px] font-semibold tracking-[0.16em] uppercase text-ink-soft mb-3">Architect</p>
              <input
                type="text"
                value={draft.architect}
                onChange={(e) => setDraft({ ...draft, architect: e.target.value })}
                placeholder="Search architects"
                className="w-full bg-transparent border-b hairline text-[15px] py-2.5 focus:outline-none focus:border-ink placeholder:text-ink-soft"
              />
              {filteredArchitects.length > 0 && (
                <div className="mt-2 space-y-1">
                  {filteredArchitects.map((a) => (
                    <button
                      key={a}
                      onClick={() => setDraft({ ...draft, architect: a })}
                      className="block w-full text-left text-[14px] text-ink-soft hover:text-ink py-1.5"
                    >
                      {a}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="px-6 py-4 border-t hairline flex items-center justify-between">
            <button
              onClick={() => setDraft(EMPTY_FILTERS)}
              className="text-[13px] font-semibold tracking-[0.16em] uppercase text-ink-soft hover:text-ink"
            >
              Clear
            </button>
            <button
              onClick={() => {
                onChange(draft);
                setPanelOpen(false);
              }}
              className="text-[13px] font-semibold tracking-[0.16em] uppercase text-ink hover:opacity-70 underline underline-offset-[6px] decoration-[1px]"
            >
              Show {resultCount} projects →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
