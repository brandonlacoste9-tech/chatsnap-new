import { supabase } from "@/lib/supabase";

export type Memory = {
  id: string;
  user_id: string;
  media_path: string;
  media_type: "image" | "video";
  caption: string | null;
  source: string;
  created_at: string;
  url?: string | null;
};

export async function saveMemory(opts: {
  userId: string;
  blob: Blob;
  mediaType: "image" | "video";
  caption?: string;
  source?: "snap" | "story" | "spotlight" | "upload";
}): Promise<string | null> {
  if (!supabase) return "No backend";
  const id = crypto.randomUUID();
  const ext = opts.mediaType === "image" ? "jpg" : "webm";
  const path = `${opts.userId}/memories/${id}.${ext}`;

  const { error: upErr } = await supabase.storage.from("snaps").upload(path, opts.blob, {
    contentType:
      opts.blob.type ||
      (opts.mediaType === "image" ? "image/jpeg" : "video/webm"),
    upsert: false,
  });
  if (upErr) return upErr.message;

  const { error } = await supabase.from("memories").insert({
    id,
    user_id: opts.userId,
    media_path: path,
    media_type: opts.mediaType,
    caption: opts.caption?.trim().slice(0, 120) || null,
    source: opts.source ?? "snap",
  });
  return error?.message ?? null;
}

export async function listMemories(userId: string): Promise<Memory[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error || !data) return [];

  const out: Memory[] = [];
  for (const row of data) {
    const { data: signed } = await supabase.storage
      .from("snaps")
      .createSignedUrl(row.media_path as string, 600);
    out.push({
      id: row.id as string,
      user_id: row.user_id as string,
      media_path: row.media_path as string,
      media_type: row.media_type as "image" | "video",
      caption: (row.caption as string) ?? null,
      source: row.source as string,
      created_at: row.created_at as string,
      url: signed?.signedUrl ?? null,
    });
  }
  return out;
}

export async function deleteMemory(
  id: string,
  userId: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  const { data } = await supabase
    .from("memories")
    .select("media_path")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (data?.media_path) {
    await supabase.storage.from("snaps").remove([data.media_path as string]);
  }
  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  return error?.message ?? null;
}
