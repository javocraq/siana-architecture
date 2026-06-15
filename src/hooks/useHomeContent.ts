import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HOME_DEFAULTS, mergeHomeContent, type HomeContent } from "@/lib/homeContent";

/**
 * Shared loader for the editable homepage copy. The home page itself plus
 * each strip (cities, featured buildings, latest journal, newsletter) calls
 * this hook, so we cache the result at module scope to avoid duplicate
 * fetches per session. The first caller starts the fetch; subsequent callers
 * subscribe to the same promise. Components render with HOME_DEFAULTS
 * synchronously until the fetch resolves so nothing flashes empty.
 */
let cachedContent: HomeContent | null = null;
let inflight: Promise<HomeContent> | null = null;

function loadHomeContent(): Promise<HomeContent> {
  if (cachedContent) return Promise.resolve(cachedContent);
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data } = await (supabase as any)
        .from("site_pages")
        .select("content")
        .eq("key", "home")
        .maybeSingle();
      const merged = mergeHomeContent(data?.content as Partial<HomeContent> | null);
      cachedContent = merged;
      return merged;
    } catch {
      cachedContent = HOME_DEFAULTS;
      return HOME_DEFAULTS;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useHomeContent(): HomeContent {
  const [content, setContent] = useState<HomeContent>(cachedContent || HOME_DEFAULTS);
  useEffect(() => {
    let cancelled = false;
    loadHomeContent().then((c) => {
      if (!cancelled) setContent(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return content;
}
