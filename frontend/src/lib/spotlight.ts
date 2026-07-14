import { supabase, type Profile } from "@/lib/supabase";

export type SpotlightPost = {
  id: string;
  user_id: string;
  media_path: string;
  media_type: "image" | "video";
  caption: string | null;
  caption_2?: string | null;
  created_at: string;
  expires_at: string;
  like_count: number;
  author?: Profile;
  likedByMe?: boolean;
  url?: string | null;
};

export async function publishSpotlight(opts: {
  userId: string;
  blob: Blob;
  mediaType: "image" | "video";
  caption?: string;
  caption2?: string;
}): Promise<string | null> {
  if (!supabase) return "No backend";
  const id = crypto.randomUUID();
  const ext = opts.mediaType === "image" ? "jpg" : "webm";
  const path = `${opts.userId}/spotlight/${id}.${ext}`;

  const { error: upErr } = await supabase.storage.from("snaps").upload(path, opts.blob, {
    contentType:
      opts.blob.type ||
      (opts.mediaType === "image" ? "image/jpeg" : "video/webm"),
    upsert: false,
  });
  if (upErr) return upErr.message;

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("spotlight_posts").insert({
    id,
    user_id: opts.userId,
    media_path: path,
    media_type: opts.mediaType,
    caption: opts.caption?.trim().slice(0, 120) || null,
    caption_2: opts.caption2?.trim().slice(0, 120) || null,
    expires_at: expires,
  });
  return error?.message ?? null;
}

export async function listSpotlight(myId: string): Promise<SpotlightPost[]> {
  if (!supabase) return [];
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("spotlight_posts")
    .select("*")
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error || !data?.length) return [];

  const userIds = [...new Set(data.map((p) => p.user_id as string))];
  const postIds = data.map((p) => p.id as string);

  const [{ data: profiles }, { data: likes }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", userIds),
    supabase
      .from("spotlight_likes")
      .select("post_id")
      .eq("user_id", myId)
      .in("post_id", postIds),
  ]);

  const byUser = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]));
  const liked = new Set((likes ?? []).map((l) => l.post_id as string));

  const posts: SpotlightPost[] = [];
  for (const row of data) {
    const { data: signed } = await supabase.storage
      .from("snaps")
      .createSignedUrl(row.media_path as string, 300);
    posts.push({
      id: row.id as string,
      user_id: row.user_id as string,
      media_path: row.media_path as string,
      media_type: row.media_type as "image" | "video",
      caption: (row.caption as string) ?? null,
      caption_2: (row.caption_2 as string) ?? null,
      created_at: row.created_at as string,
      expires_at: row.expires_at as string,
      like_count: (row.like_count as number) ?? 0,
      author: byUser.get(row.user_id as string),
      likedByMe: liked.has(row.id as string),
      url: signed?.signedUrl ?? null,
    });
  }
  return posts;
}

export async function toggleSpotlightLike(
  postId: string,
  myId: string,
  currentlyLiked: boolean,
): Promise<{ error?: string; like_count?: number }> {
  if (!supabase) return { error: "No backend" };

  if (currentlyLiked) {
    await supabase
      .from("spotlight_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", myId);
  } else {
    const { error } = await supabase.from("spotlight_likes").insert({
      post_id: postId,
      user_id: myId,
    });
    if (error) return { error: error.message };
  }

  // Recount
  const { count } = await supabase
    .from("spotlight_likes")
    .select("post_id", { count: "exact", head: true })
    .eq("post_id", postId);

  await supabase
    .from("spotlight_posts")
    .update({ like_count: count ?? 0 })
    .eq("id", postId);

  return { like_count: count ?? 0 };
}
