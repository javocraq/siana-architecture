import { useMemo, useState } from "react";
import { adminInputCls } from "@/lib/adminUi";

const inputCls = adminInputCls;

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
};

export default function SelectOrCreate({
  value,
  onChange,
  options,
  placeholder = "- Select -",
}: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const merged = useMemo(() => {
    const set = new Set(options);
    if (value && !set.has(value)) set.add(value);
    return Array.from(set);
  }, [options, value]);

  if (adding) {
    const commit = () => {
      const v = draft.trim();
      if (v) onChange(v);
      setAdding(false);
      setDraft("");
    };
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          className={inputCls}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="New value…"
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            else if (e.key === "Escape") { setAdding(false); setDraft(""); }
          }}
        />
        <button
          type="button"
          onClick={commit}
          className="text-[11px] tracking-tag uppercase border hairline px-3 text-ink hover:bg-off-white whitespace-nowrap"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => { setAdding(false); setDraft(""); }}
          className="text-[11px] tracking-tag uppercase px-2 text-ink-muted hover:text-ink whitespace-nowrap"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <select
      className={inputCls}
      value={value}
      onChange={(e) => {
        if (e.target.value === "__add__") setAdding(true);
        else onChange(e.target.value);
      }}
    >
      <option value="">{placeholder}</option>
      {merged.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
      <option value="__add__">+ Add new…</option>
    </select>
  );
}
