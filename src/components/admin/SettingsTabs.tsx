import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/admin/settings", label: "General", end: true },
  { to: "/admin/seo", label: "SEO Global" },
  { to: "/admin/settings/integrations", label: "Integrations" },
];

/** Tabs shared across the three Settings sub-pages. */
export default function SettingsTabs() {
  return (
    <div className="flex gap-1 mb-10" style={{ borderBottom: "1px solid hsl(var(--paper-mid))" }}>
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end as boolean | undefined}
          className={({ isActive }) =>
            `font-mono uppercase px-4 py-3 -mb-px transition-colors ${
              isActive ? "text-ink" : "text-ink-soft hover:text-ink"
            }`
          }
          style={({ isActive }) => ({
            fontSize: 11,
            letterSpacing: "0.22em",
            fontWeight: 500,
            borderBottom: isActive ? "1px solid hsl(var(--ink))" : "1px solid transparent",
          })}
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}
