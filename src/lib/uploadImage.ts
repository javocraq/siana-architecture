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
  // The MIME type wins: re-encoding below can change the format without
  // touching the filename, and the extension must match what we upload.
  const fromType = EXT_FROM_TYPE[file.type];
  if (fromType) return fromType;
  const fromName = file.name.includes(".") ? file.name.split(".").pop()! : "";
  return fromName && /^[a-z0-9]{1,5}$/i.test(fromName) ? fromName.toLowerCase() : "png";
}

/** Longest edge kept, in pixels. Comfortably past a full-bleed 4K hero, far
 *  short of what a phone camera produces. */
const MAX_EDGE = 2400;
const QUALITY = 0.82;
/** Under this, re-encoding costs quality and saves nothing worth having. */
const SKIP_UNDER_BYTES = 600 * 1024;
const RESIZABLE = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Shrinks camera-sized photos before they are stored.
 *
 * Straight-from-the-phone images run to 8–10 MB. Uploaded raw they were being
 * served at that size to every visitor, which is what made the home cover take
 * seconds to appear. Anything already small, plus SVG and animated GIF, is
 * passed through untouched.
 */
async function downscale(file: File): Promise<File> {
  if (!RESIZABLE.has(file.type) || file.size <= SKIP_UNDER_BYTES) return file;
  if (typeof createImageBitmap !== "function") return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    // WebP for PNG sources so transparency survives; JPEG otherwise.
    const type = file.type === "image/png" ? "image/webp" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, QUALITY),
    );
    // If the encoder gave us something no smaller (or refused the format),
    // the original is the better answer.
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name, { type: blob.type || type });
  } finally {
    bitmap.close?.();
  }
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
      `That image is ${mb} MB - the limit is ${MAX_IMAGE_BYTES / 1024 / 1024} MB. Please resize it first.`,
    );
  }

  const prepared = await downscale(file);
  const path = `${folder}/${crypto.randomUUID()}.${extensionFor(prepared)}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, prepared, {
    // A year: the filename is a fresh UUID per upload, so the URL changes
    // whenever the image does and there is nothing stale to serve.
    cacheControl: "31536000",
    upsert: false,
    contentType: prepared.type || undefined,
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
