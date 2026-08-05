// Newsletter sign-up — Supabase Edge Function (Deno).
//
// Takes the footer form's submission, stores it in `newsletter_subscribers`,
// then forwards the address to Substack. That order is deliberate: Substack has
// no documented public subscribe API, so the call below uses the same internal
// endpoint their own embed posts to. If it changes or goes down, the address is
// already saved and the reader still gets an honest confirmation — the row is
// just left as `substack_status = 'failed'` to retry or import by hand.
//
// Runs with the service role so the browser never needs write access to the
// subscriber list (see the RLS policies in the migration).
//
// Public endpoint (no auth): `verify_jwt = false` in supabase/config.toml.
//
// Deploy:  supabase functions deploy newsletter-subscribe
// URL:     https://<project-ref>.supabase.co/functions/v1/newsletter-subscribe

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Overridable so a staging deploy can point at a different publication.
const SUBSTACK_PUBLICATION = (
  Deno.env.get("SUBSTACK_PUBLICATION") ?? "https://sianaarchitecture.substack.com"
).replace(/\/+$/, "");

const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://sianaarchitecture.com").replace(/\/+$/, "");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// Deliberately permissive — the real validation is Substack's confirmation
// email. This only catches obvious rubbish before it reaches the table.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Payload = {
  email?: unknown;
  name?: unknown;
  source?: unknown;
  /** Honeypot: a real person never fills a field they cannot see. */
  company?: unknown;
};

/** Posts to the endpoint Substack's own embed form uses. Returns null on
 *  success, or a short reason to store against the row. */
async function forwardToSubstack(email: string): Promise<string | null> {
  const body = new URLSearchParams({
    email,
    first_url: SITE_URL,
    first_referrer: "",
    current_url: SITE_URL,
    current_referrer: "",
    referral_code: "",
    source: "embed",
  });

  // Don't let a hanging third party hold the reader's request open.
  const abort = AbortSignal.timeout(8_000);

  try {
    const res = await fetch(`${SUBSTACK_PUBLICATION}/api/v1/free`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Referer: `${SUBSTACK_PUBLICATION}/embed`,
        Origin: SUBSTACK_PUBLICATION,
      },
      body,
      signal: abort,
    });
    if (res.ok) return null;
    return `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`;
  } catch (err) {
    return err instanceof Error ? err.message.slice(0, 300) : "Unknown error";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Honeypot tripped — accept silently so the bot learns nothing.
  if (typeof payload.company === "string" && payload.company.trim() !== "") {
    return json({ ok: true, subscribed: true });
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 120) : null;
  const source = typeof payload.source === "string" ? payload.source.trim().slice(0, 200) : null;

  // 1. Store first, so the address survives whatever Substack does next.
  //    `merge-duplicates` makes a repeat sign-up an update, not an error.
  const stored = await fetch(
    `${SUPABASE_URL}/rest/v1/newsletter_subscribers?on_conflict=email`,
    {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify([{ email, name, source }]),
    },
  );

  if (!stored.ok) {
    const detail = await stored.text();
    console.error("newsletter-subscribe: could not store subscriber", detail);
    return json({ error: "We couldn't save that just now. Please try again." }, 500);
  }

  const [row] = (await stored.json()) as Array<{ id: string }>;

  // 2. Hand off to Substack. A failure here is logged against the row, not
  //    shown to the reader — they are on the list either way.
  const failure = await forwardToSubstack(email);
  if (failure) console.error("newsletter-subscribe: Substack rejected", email, failure);

  await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?id=eq.${row.id}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      substack_status: failure ? "failed" : "subscribed",
      substack_error: failure,
    }),
  });

  return json({ ok: true, subscribed: !failure });
});
