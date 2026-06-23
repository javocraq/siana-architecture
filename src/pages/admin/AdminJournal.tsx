import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { kindConfig } from "@/lib/postKind";
import { adminTableCardCls } from "@/lib/adminUi";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  category: string | null;
  status: string;
  published_at: string | null;
  updated_at: string;
  hero_image_url: string | null;
};

export default function AdminJournal() {
  const cfg = kindConfig();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<PostRow | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("id,slug,title,author,category,status,published_at,updated_at,hero_image_url")
      .order("updated_at", { ascending: false });
    setPosts((data as PostRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);


  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const p = pendingDelete;
    setPendingDelete(null);
    const { error } = await supabase.from("posts").delete().eq("id", p.id);
    if (error) {
      toast({ title: `Could not delete ${cfg.label.toLowerCase()}`, description: error.message, variant: "destructive" });
      return;
    }
    setPosts((prev) => prev.filter((x) => x.id !== p.id));
    toast({
      title: `${cfg.label} deleted`,
      description: `“${p.title}” has been removed.`,
    });
  };

  return (
    <AdminLayout>
      <div className="px-10 py-10">
        <div className="flex items-end justify-between mb-10 gap-6 flex-wrap">
          <div>
            <h1
              className="font-display text-ink"
              style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.8rem)", fontWeight: 400, lineHeight: 1, letterSpacing: "-0.005em" }}
            >
              {cfg.sectionTitle}
            </h1>
            <p
              className="mt-4 font-mono uppercase text-ink-soft"
              style={{ fontSize: 11, letterSpacing: "0.18em" }}
            >
              {loading ? "Loading…" : `${posts.length} total`}
            </p>
          </div>
          <Link
            to={`${cfg.adminBase}/new`}
            className="group font-mono uppercase inline-flex items-center text-ink transition-all hover:gap-3"
            style={{
              fontSize: 11,
              letterSpacing: "0.28em",
              fontWeight: 500,
              gap: "0.55rem",
              borderBottom: "1px solid hsl(var(--ink))",
              paddingBottom: 4,
            }}
          >
            <Plus className="w-3.5 h-3.5" /> Add entry
          </Link>
        </div>


        <div className={adminTableCardCls}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b hairline text-left">
                  <th className="px-4 py-3 w-[60px]"></th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">Title</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">Author</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">Category</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">Status</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">Published</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted">Updated</th>
                  <th className="px-4 py-3 font-light tracking-tag uppercase text-[10px] text-ink-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => {
                  const published = p.status === "published";
                  return (
                    <tr key={p.id} className="border-b hairline last:border-b-0 hover:bg-off-white/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="w-11 h-11 bg-stone overflow-hidden">
                          {p.hero_image_url && (
                            <img src={p.hero_image_url} alt={p.title} className="photo-thumb w-full h-full object-cover" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink font-medium">{p.title}</td>
                      <td className="px-4 py-3 text-ink-muted">{p.author || "—"}</td>
                      <td className="px-4 py-3 text-ink-muted">{p.category || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex uppercase px-2 py-0.5"
                          style={{
                            fontSize: 9,
                            letterSpacing: "0.16em",
                            background: published ? "hsl(var(--paper-mid))" : "#f1efe8",
                            color: published ? "hsl(var(--ink))" : "#6b6760",
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-faint text-[11px]">
                        {p.published_at ? new Date(p.published_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-ink-faint text-[11px]">
                        {new Date(p.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          to={`${cfg.adminBase}/${p.id}`}
                          className="text-[11px] tracking-ui text-ink-muted hover:text-ink mr-4"
                        >
                          Edit
                        </Link>
                        <Link
                          to={`${cfg.publicBase}/${p.slug}`}
                          target="_blank"
                          className="text-[11px] tracking-ui text-ink-muted hover:text-ink mr-4"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => setPendingDelete(p)}
                          className="text-[11px] tracking-ui text-ink-muted hover:text-destructive"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && posts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[12px] text-ink-faint">
                      No entries yet. <Link to={`${cfg.adminBase}/new`} className="underline" style={{ color: "hsl(var(--ink))" }}>Create the first one</Link>.
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete ${cfg.label.toLowerCase()}`}
        description={
          pendingDelete
            ? `“${pendingDelete.title}” will be permanently removed. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmDelete}
      />
    </AdminLayout>
  );
}
