/**
 * Mapbox public token.
 *
 * Public Mapbox tokens (pk.…) are designed to be exposed in client code.
 * Restrict yours by URL in https://account.mapbox.com/access-tokens/
 * for production safety.
 *
 * Resolution order:
 * 1. import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN  (preferred — set in env)
 * 2. The hardcoded fallback below
 * 3. localStorage("siana_mapbox_token")  (legacy — for the user's existing token)
 */

const HARDCODED_FALLBACK = ""; // ← paste your pk.… here to bake it into the build

export const TOKEN_KEY = "siana_mapbox_token";

export function getMapboxToken(): string {
  const fromEnv = (import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined) || "";
  if (fromEnv) return fromEnv;
  if (HARDCODED_FALLBACK) return HARDCODED_FALLBACK;
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY) || "";
  }
  return "";
}
