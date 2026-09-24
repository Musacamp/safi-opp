import { supabase } from "./supabase";

const BUCKET = "contact-photos";
const MAX_DIMENSION = 512;
const QUALITY = 0.8;

/** Resize and compress an image File before upload. Returns a JPEG Blob. */
export async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to compress image"));
          },
          "image/jpeg",
          QUALITY
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/** Upload a profile photo to cloud storage. Returns the public URL. */
export async function uploadContactPhoto(
  userId: string,
  file: File
): Promise<string> {
  const compressed = await resizeImage(file);
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filename = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, compressed, {
      contentType: "image/jpeg",
      upsert: false,
    });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

/** Delete a photo from storage by its URL path. */
export async function deleteContactPhoto(photoUrl: string): Promise<void> {
  try {
    const url = new URL(photoUrl);
    const parts = url.pathname.split("/");
    const idx = parts.indexOf(BUCKET);
    if (idx >= 0 && parts.length > idx + 1) {
      const path = parts.slice(idx + 1).join("/");
      await supabase.storage.from(BUCKET).remove([path]);
    }
  } catch {
    // Silently ignore — best-effort cleanup
  }
}
