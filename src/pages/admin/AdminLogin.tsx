import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAdmin();

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate("/admin/projects", { replace: true });
    }
  }, [loading, user, isAdmin, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Wait briefly for role check; useAdmin will redirect if admin.
    setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data: hasAdmin } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (hasAdmin) {
        navigate("/admin/projects", { replace: true });
      } else {
        await supabase.auth.signOut();
        setError("This account does not have admin access.");
      }
    }, 200);
  };

  return (
    <>
      <Helmet>
        <title>Admin · Siana</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-paper-warm px-6">
        <div className="w-full max-w-[380px] bg-paper p-10" style={{ border: "1px solid hsl(var(--paper-mid))" }}>
          <h1 className="font-logo text-ink text-center leading-none" style={{ fontSize: "1.8rem" }}>
            siana
          </h1>
          <p
            className="mt-2 text-center font-mono uppercase text-ink-soft font-semibold"
            style={{ fontSize: 10, letterSpacing: "0.28em" }}
          >
            Admin
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-[10px] tracking-tag uppercase text-ink-muted mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b hairline text-[13px] py-2 focus:outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-tag uppercase text-ink-muted mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b hairline text-[13px] py-2 focus:outline-none focus:border-ink"
              />
            </div>

            {error && (
              <p className="text-[12px] text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full uppercase text-background mt-6 disabled:opacity-60"
              style={{
                background: "hsl(var(--ink))",
                fontSize: 11,
                fontWeight: 300,
                letterSpacing: "0.18em",
                padding: "12px 0",
              }}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-[10px] text-ink-faint text-center leading-relaxed">
            Admin accounts are provisioned manually.
            <br />
            Contact the site owner for access.
          </p>
        </div>
      </div>
    </>
  );
}
