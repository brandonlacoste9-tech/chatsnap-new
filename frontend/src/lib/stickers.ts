import { supabase } from "@/lib/supabase";

export type UserSticker = {
  id: string;
  user_id: string;
  media_path: string;
  label: string | null;
  created_at: string;
  url?: string | null;
};

export async function listMyStickers(userId: string): Promise<UserSticker[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("user_stickers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error || !data) return [];

  const out: UserSticker[] = [];
  for (const row of data) {
    const { data: signed } = await supabase.storage
      .from("snaps")
      .createSignedUrl(row.media_path as string, 600);
    out.push({
      id: row.id as string,
      user_id: row.user_id as string,
      media_path: row.media_path as string,
      label: (row.label as string) ?? null,
      created_at: row.created_at as string,
      url: signed?.signedUrl ?? null,
    });
  }
  return out;
}

export async function uploadSticker(
  userId: string,
  blob: Blob,
  label?: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  const id = crypto.randomUUID();
  const path = `${userId}/stickers/${id}.png`;
  const { error: upErr } = await supabase.storage.from("snaps").upload(path, blob, {
    contentType: blob.type || "image/png",
    upsert: false,
  });
  if (upErr) return upErr.message;
  const { error } = await supabase.from("user_stickers").insert({
    id,
    user_id: userId,
    media_path: path,
    label: label?.trim().slice(0, 40) || null,
  });
  return error?.message ?? null;
}

export async function deleteSticker(
  id: string,
  userId: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  const { data } = await supabase
    .from("user_stickers")
    .select("media_path")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (data?.media_path) {
    await supabase.storage.from("snaps").remove([data.media_path as string]);
  }
  const { error } = await supabase
    .from("user_stickers")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  return error?.message ?? null;
}
