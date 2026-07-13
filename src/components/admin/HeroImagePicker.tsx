import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, Check, ChevronDown } from "lucide-react";

type ProjImg = { id: string; name: string; url: string };

/**
 * Lets the Home editor pull hero-slideshow images straight from published
 * projects instead of re-uploading them. Picked URLs are appended to the same
 * `hero.images` array the manual uploader writes to, so the public hero needs
 * no changes. Projects already in the slideshow show as "added".
 */
export default function HeroImagePicker({
  selected,
  onPick,
}: {
  selected: string[];
  onPick: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ProjImg[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || items.length) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, hero_image_url, cover_image_url")
        .eq("status", "published")
        .order("name");
      const list = (data || [])
        .map((p: any) => ({ id: p.id, name: p.name, url: p.hero_image_url || p.cover_image_url }))
        .filter((p) => p.url);
      setItems(list);
      setLoading(false);
    })();
  }, [open, items.length]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-ink-soft hover:text-ink border border-paper-mid rounded-md px-3 py-2 transition-colors"
      >
        <ImagePlus className="w-3.5 h-3.5" /> Add from a project
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>

      {open && (
        <div className="mt-3 border border-paper-mid rounded-lg p-3 max-h-[320px] overflow-y-auto">
          {loading && <p className="text-[12px] text-ink-soft">Loading projects…</p>}
          {!loading && items.length === 0 && (
            <p className="text-[12px] text-ink-soft">No project images available yet.</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {items.map((p) => {
              const added = selected.includes(p.url);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { if (!added) onPick(p.url); }}
                  disabled={added}
                  className="relative text-left disabled:cursor-default"
                  title={added ? "Already in the hero" : `Add ${p.name}`}
                >
                  <img
                    src={p.url}
                    alt={p.name}
                    className="w-full aspect-[16/10] object-cover border border-paper-mid rounded-md"
                    loading="lazy"
                  />
                  {added && (
                    <span className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-md">
                      <Check className="w-5 h-5 text-ink" />
                    </span>
                  )}
                  <span className="block mt-1 text-[10px] uppercase tracking-[0.12em] text-ink-soft truncate">
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
