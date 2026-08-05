import { supabase } from "@/integrations/supabase/client";

/** Storage bucket that backs every image the admin uploads. */
export const IMAGE_BUCKET = "project-images";

/** Ceiling for a single upload. Matches what Supabase Storage accepts by
 *  default and keeps a stray 40 MB camera original from stalling the editor. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export class ImageUploadError extends Error {}

const EXT_FROM_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

function extensionFor(file: File): string {
  const fromName = file.name.includes(".") ? file.name.split(".").pop()! : "";
  if (fromName && /^[a-z0-9]{1,5}$/i.test(fromName)) return fromName.toLowerCase();
  // Clipboard pastes arrive as `image.png` or with no name at all, so fall
  // back to the MIME type before guessing.
  return EXT_FROM_TYPE[file.type] || "png";
}

/**
 * Uploads one image to Supabase Storage and returns its public URL.
 *
 * Shared by the standalone `ImageUpload` field and the rich text editor, so a
 * photo dropped into an article lands in the same bucket, with the same naming,
 * as a hero image picked from the form.
 *
 * @param folder path prefix inside the bucket (e.g. `content`, `projects`)
 */
export async function uploadImage(file: File, folder = "content"): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new ImageUploadError(`“${file.name || "That file"}” is not an image.`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new ImageUploadError(
      `That image is ${mb} MB — the limit is ${MAX_IMAGE_BYTES / 1024 / 1024} MB. Please resize it first.`,
    );
  }

  const path = `${folder}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new ImageUploadError(error.message);

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Pulls every image file out of a drop / paste payload. */
export function imageFilesFrom(data: DataTransfer | null | undefined): File[] {
  if (!data) return [];
  const out: File[] = [];
  // `files` is populated for drops and for screenshots pasted from the OS;
  // `items` covers browsers that only expose the payload through the item list.
  for (const f of Array.from(data.files || [])) {
    if (f.type.startsWith("image/")) out.push(f);
  }
  if (out.length === 0) {
    for (const item of Array.from(data.items || [])) {
      if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
      const f = item.getAsFile();
      if (f) out.push(f);
    }
  }
  return out;
}
