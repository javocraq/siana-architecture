import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2 } from "lucide-react";

type Props = {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  label?: string;
  aspect?: "square" | "wide" | "portrait";
  folder?: string;
};

export default function ImageUpload({ value, onChange, label = "Image", aspect = "wide", folder = "projects" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aspectClass =
    aspect === "square" ? "aspect-square" : aspect === "portrait" ? "aspect-[3/4]" : "aspect-[16/10]";

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("project-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (upErr) {
      setUploading(false);
      setError(upErr.message);
      return;
    }
    const { data } = supabase.storage.from("project-images").getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
  };

  return (
    <div>
      <p className="text-[10px] tracking-tag uppercase text-ink-muted mb-2">{label}</p>
      <div className={`relative ${aspectClass} bg-stone overflow-hidden border hairline group`}>
        {value ? (
          <>
            <img src={value} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-2 right-2 bg-background/90 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove"
            >
              <X className="w-3.5 h-3.5 text-ink" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-muted hover:text-ink hover:bg-off-white transition-colors"
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            <span className="text-[10px] tracking-tag uppercase">{uploading ? "Uploading…" : "Upload"}</span>
          </button>
        )}
        {value && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-2 left-2 bg-background/90 px-2 py-1 text-[10px] tracking-tag uppercase opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {uploading ? "Uploading…" : "Replace"}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
