import AdminLayout from "@/components/admin/AdminLayout";
import SettingsTabs from "@/components/admin/SettingsTabs";

/**
 * Integraciones — configuración de servicios externos. Placeholder hasta
 * que se decidan qué integraciones se conectarán (Mapbox, Resend, Stripe,
 * etc.).
 */
export default function AdminIntegrations() {
  return (
    <AdminLayout>
      <div className="px-10 py-10 max-w-[960px]">
        <div className="mb-8">
          <p className="font-mono uppercase text-ink-soft mb-3 font-semibold" style={{ fontSize: 11, letterSpacing: "0.22em" }}>
            Gestionar
          </p>
          <h1 className="font-display text-ink" style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.8rem)", fontWeight: 400, lineHeight: 1, letterSpacing: "-0.005em" }}>
            Ajustes
          </h1>
        </div>

        <SettingsTabs />

        <section className="bg-background p-8" style={{ border: "1px solid hsl(var(--paper-mid))" }}>
          <h2 className="font-display text-ink mb-2" style={{ fontSize: 22, fontWeight: 400 }}>
            Integraciones
          </h2>
          <p className="text-[13px] text-ink-soft" style={{ lineHeight: 1.65, maxWidth: 560 }}>
            Aquí vivirán las claves y credenciales de servicios conectados — Mapbox,
            Supabase Storage, proveedores de correo, analítica, etc. Próximamente.
          </p>
        </section>
      </div>
    </AdminLayout>
  );
}
