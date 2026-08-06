import AdminLayout from "@/components/admin/AdminLayout";

export default function AdminPlaceholder({ title }: { title: string }) {
  return (
    <AdminLayout>
      <div className="px-10 py-10">
        <h1 className="font-display text-[44px] text-ink leading-none">{title}</h1>
        <p className="mt-6 text-[13px] text-ink-muted max-w-md leading-relaxed">
          This admin section ships in the next build pass - together with the full Project editor
          (Content · Media · SEO tabs with TipTap rich text and embedded Mapbox), Journal admin,
          global SEO defaults, and Settings.
        </p>
      </div>
    </AdminLayout>
  );
}
