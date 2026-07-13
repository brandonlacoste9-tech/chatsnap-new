/** Downscale + JPEG compress for snap upload. */
export async function compressImage(
  blob: Blob,
  maxEdge = 1280,
  quality = 0.85,
): Promise<Blob> {
  if (!blob.type.startsWith("image/")) return blob;

  const bitmap = await createImageBitmap(blob);
  let { width, height } = bitmap;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return blob;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const out = await new Promise<Blob | null>((res) =>
    canvas.toBlob((b) => res(b), "image/jpeg", quality),
  );
  return out && out.size > 0 ? out : blob;
}

export function inviteUrl(username: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://chatsnap-app.netlify.app";
  return `${origin}/add/${encodeURIComponent(username.replace(/^@/, ""))}`;
}

export async function shareInvite(username: string): Promise<boolean> {
  const url = inviteUrl(username);
  const text = `Add me on ChatSnap: @${username.replace(/^@/, "")}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "ChatSnap", text, url });
      return true;
    }
  } catch {
    /* user cancelled or unsupported */
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return true;
  } catch {
    return false;
  }
}
