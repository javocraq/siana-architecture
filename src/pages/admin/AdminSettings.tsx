import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import SettingsTabs from "@/components/admin/SettingsTabs";
import ImageUpload from "@/components/admin/ImageUpload";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function AdminSettings() {
  const { user } = useAdmin();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);

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
    const { error } = await supabase.from("profiles").update({
      display_name: displayName || null,
      avatar_url: avatarUrl,
    }).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save profile", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Profile saved", description: "Your profile has been updated." });
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Make sure both fields are identical.", variant: "destructive" });
      return;
    }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPw(false);
    if (error) {
      toast({ title: "Could not update password", description: error.message, variant: "destructive" });
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast({ title: "Password updated", description: "Use your new password the next time you sign in." });
  };

  return (
    <AdminLayout>
      <div className="px-10 py-10 max-w-[960px]">
        <div className="mb-8">
          <p
            className="font-mono uppercase text-ink-soft mb-3 font-semibold"
            style={{ fontSize: 11, letterSpacing: "0.22em" }}
          >
            Manage
          </p>
          <h1
            className="font-display text-ink"
            style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.8rem)", fontWeight: 400, lineHeight: 1, letterSpacing: "-0.005em" }}
          >
            Settings
          </h1>
        </div>

        <SettingsTabs />

        {loading ? (
          <div className="flex items-center gap-3 text-ink-muted text-[12px]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-8">
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

            <div className="pt-2">
              <button onClick={save} disabled={saving}
                className="text-[11px] tracking-tag uppercase text-background px-5 py-2.5 disabled:opacity-50"
                style={{ background: "hsl(var(--ink))" }}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>

          <div className="border hairline bg-background p-6 space-y-6">
            <div>
              <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-2">Security</p>
              <h2 className="font-display text-[22px] text-ink">Change password</h2>
              <p className="mt-1 text-[12px] text-ink-faint">Set a new password for {user?.email}.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-[640px]">
              <Field label="New password" hint="At least 8 characters.">
                <input type="password" autoComplete="new-password" className={inputCls} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </Field>
              <Field label="Confirm new password">
                <input type="password" autoComplete="new-password" className={inputCls} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </Field>
            </div>
            <div className="pt-2">
              <button onClick={changePassword} disabled={savingPw || !newPassword}
                className="text-[11px] tracking-tag uppercase text-background px-5 py-2.5 disabled:opacity-50"
                style={{ background: "hsl(var(--ink))" }}>
                {savingPw ? "Updating…" : "Update password"}
              </button>
            </div>
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
