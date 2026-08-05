/**
 * Tab-separated clipboard text → a grid of cells.
 *
 * Excel, Numbers and Google Sheets all put a tab-separated block on the
 * clipboard alongside the HTML flavour. When the HTML flavour is missing —
 * pasting out of a plain-text note, a terminal, a chat window, or a model
 * answer — the editor used to drop a wall of tab characters into one paragraph.
 * Parsing the grid here lets the editor build a real table instead.
 *
 * Only TAB is treated as a separator. Commas are deliberately not supported:
 * ordinary prose is full of them and would turn into a table by accident.
 */

/** Splits a tab-separated block, honouring Excel's quoting rules: a field that
 *  contains a tab, a newline or a quote is wrapped in `"`, and inner quotes are
 *  doubled. Returns one array of cells per record. */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"' && cell === "") {
      quoted = true;
    } else if (ch === "\t") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      // Swallow the \n of a \r\n pair so it does not open an empty record.
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  // Trailing cell / record, unless the text simply ended with a line break.
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

export type TsvGrid = { rows: string[][]; cols: number };

/**
 * Decides whether pasted plain text is really a spreadsheet grid, and if so
 * returns it padded to a rectangle.
 *
 * Deliberately conservative — it must look like a grid on every line, not just
 * somewhere in the middle, so a paragraph that happens to contain one stray tab
 * is left as prose.
 */
export function tsvToGrid(text: string): TsvGrid | null {
  if (!text.includes("\t")) return null;

  const rows = parseTsv(text).filter((r) => r.some((c) => c.trim() !== ""));
  if (rows.length < 2) return null;

  const cols = Math.max(...rows.map((r) => r.length));
  if (cols < 2) return null;

  // Every row must carry at least two cells; otherwise this is prose that
  // merely contains a tab, not a grid.
  if (rows.some((r) => r.length < 2)) return null;

  return {
    cols,
    rows: rows.map((r) => {
      const padded = r.slice(0, cols).map((c) => c.trim());
      while (padded.length < cols) padded.push("");
      return padded;
    }),
  };
}
