import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageUpload from "@/components/admin/ImageUpload";
import { useAdmin } from "@/hooks/useAdmin";
import { Loader2 } from "lucide-react";

export default function AdminSettings() {
  const { user } = useAdmin();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setDisplayName(data.display_name || "");
        setAvatarUrl(data.avatar_url);
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setMsg(null);
    setError(null);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName || null,
      avatar_url: avatarUrl,
    }).eq("id", user.id);
    setSaving(false);
    if (error) setError(error.message);
    else setMsg("Profile saved.");
  };

  return (
    <AdminLayout>
      <div className="px-10 py-10 max-w-[760px]">
        <div className="mb-10">
          <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-3">Manage</p>
          <h1 className="font-display text-[44px] text-ink leading-none">Settings</h1>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-ink-muted text-[12px]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="border hairline bg-background p-6 space-y-6">
            <div>
              <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-2">Account</p>
              <h2 className="font-display text-[22px] text-ink">Your profile</h2>
              <p className="mt-1 text-[12px] text-ink-faint">{user?.email}</p>
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-8">
              <ImageUpload label="Avatar" value={avatarUrl} onChange={setAvatarUrl} aspect="square" folder="avatars" />
              <div className="space-y-5">
                <Field label="Display name">
                  <input className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </Field>
                <Field label="Email" hint="Email is managed by your auth provider.">
                  <input className={inputCls + " opacity-60"} value={user?.email || ""} disabled />
                </Field>
              </div>
            </div>

            {error && <p className="text-[12px] text-destructive">{error}</p>}
            {msg && <p className="text-[12px]" style={{ color: "hsl(var(--blue))" }}>{msg}</p>}

            <div className="pt-2">
              <button onClick={save} disabled={saving}
                className="text-[11px] tracking-tag uppercase text-background px-5 py-2.5 disabled:opacity-50"
                style={{ background: "hsl(var(--blue))" }}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

const inputCls =
  "w-full bg-background border hairline px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-ink";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className="block text-[10px] tracking-tag uppercase text-ink-muted mb-2">{label}</label>}
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}
