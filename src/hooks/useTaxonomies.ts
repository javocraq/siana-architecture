import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TAXONOMY_DEFAULTS, mergeTaxonomies, type Taxonomies } from "@/lib/taxonomies";

/**
 * Shared loader for the editable option lists (categories, styles, materials,
 * experiences, regions). Cached at module scope so the Projects/Cities forms
 * don't refetch. Renders with defaults synchronously, then swaps in the saved
 * lists once loaded — so the form options are never empty.
 */
let cached: Taxonomies | null = null;
let inflight: Promise<Taxonomies> | null = null;

function load(): Promise<Taxonomies> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data } = await (supabase as any)
        .from("site_pages")
        .select("content")
        .eq("key", "taxonomies")
        .maybeSingle();
      cached = mergeTaxonomies(data?.content as Partial<Taxonomies> | null);
      return cached;
    } catch {
      cached = TAXONOMY_DEFAULTS;
      return TAXONOMY_DEFAULTS;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useTaxonomies(): Taxonomies {
  const [tax, setTax] = useState<Taxonomies>(cached || TAXONOMY_DEFAULTS);
  useEffect(() => {
    let cancelled = false;
    load().then((t) => { if (!cancelled) setTax(t); });
    return () => { cancelled = true; };
  }, []);
  return tax;
}
