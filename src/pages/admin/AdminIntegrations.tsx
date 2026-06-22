import AdminLayout from "@/components/admin/AdminLayout";
import SettingsTabs from "@/components/admin/SettingsTabs";

/**
 * Integrations — configuration for external services. Placeholder until we
 * decide which integrations will be connected (Mapbox, Resend, Stripe, etc.).
 */
export default function AdminIntegrations() {
  return (
    <AdminLayout>
      <div className="px-10 py-10 max-w-[960px]">
        <div className="mb-8">
          <h1 className="font-display text-ink" style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.8rem)", fontWeight: 400, lineHeight: 1, letterSpacing: "-0.005em" }}>
            Settings
          </h1>
        </div>

        <SettingsTabs />

        <section className="bg-background p-8" style={{ border: "1px solid hsl(var(--paper-mid))" }}>
          <h2 className="font-display text-ink mb-2" style={{ fontSize: 22, fontWeight: 400 }}>
            Integrations
          </h2>
          <p className="text-[13px] text-ink-soft" style={{ lineHeight: 1.65, maxWidth: 560 }}>
            Keys and credentials for connected services will live here — Mapbox,
            Supabase Storage, email providers, analytics, etc. Coming soon.
          </p>
        </section>
      </div>
    </AdminLayout>
  );
}
