import { Link } from "react-router-dom";

export type PublishStatus = "draft" | "published";

type Props = {
  /** The state the editor has selected — what Save will write. */
  status: PublishStatus;
  /** The state currently stored, i.e. what the public site is showing. */
  savedStatus: PublishStatus;
  onStatusChange: (status: PublishStatus) => void;
  onSave: () => void;
  saving: boolean;
  /** Public URL, shown only once the entry is actually live. */
  liveHref?: string;
};

/**
 * Draft/Published switch plus a single Save button.
 *
 * Replaces the old pair of buttons ("Save draft" and "Update"). Those were
 * confusing — the review asked for one button — and worse, pressing "Save
 * draft" on a live entry quietly pulled it off the site. Now the state is
 * something you set on purpose, Save always just saves, and taking something
 * offline says so before you do it.
 */
export default function SaveBar({
  status,
  savedStatus,
  onStatusChange,
  onSave,
  saving,
  liveHref,
}: Props) {
  const willUnpublish = savedStatus === "published" && status === "draft";
  const willPublish = savedStatus !== "published" && status === "published";

  const segment = (value: PublishStatus, label: string) => {
    const active = status === value;
    return (
      <button
        type="button"
        onClick={() => onStatusChange(value)}
        aria-pressed={active}
        className={`px-3 py-2 text-[11px] tracking-tag uppercase transition-colors ${
          active ? "text-background" : "text-ink-muted hover:text-ink"
        }`}
        style={active ? { background: "hsl(var(--ink))" } : undefined}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-3">
        {liveHref && savedStatus === "published" && (
          <Link
            to={liveHref}
            target="_blank"
            className="text-[11px] tracking-tag uppercase text-ink-muted hover:text-ink"
          >
            View live ↗
          </Link>
        )}

        <div className="flex border hairline" role="group" aria-label="Visibility">
          {segment("draft", "Draft")}
          {segment("published", "Published")}
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="text-[11px] tracking-tag uppercase text-background px-5 py-2.5 disabled:opacity-50"
          style={{ background: "hsl(var(--ink))" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <p className="text-[10px] text-ink-muted">
        {willUnpublish
          ? "Saving will take this off the site."
          : willPublish
            ? "Saving will publish this to the site."
            : status === "published"
              ? "Live on the site."
              : "Draft — only visible here."}
      </p>
    </div>
  );
}
