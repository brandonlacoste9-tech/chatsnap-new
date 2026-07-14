import { supabase, type Profile } from "@/lib/supabase";

export type StoryItem = {
  id: string;
  user_id: string;
  media_path: string;
  media_type: "image" | "video";
  caption: string | null;
  caption_2?: string | null;
  duration_sec: number;
  created_at: string;
  expires_at: string;
};

export type StoryRailUser = {
  profile: Profile;
  stories: StoryItem[];
  hasUnseen: boolean;
  isMe: boolean;
};

export async function publishStory(opts: {
  userId: string;
  blob: Blob;
  mediaType: "image" | "video";
  caption?: string;
  caption2?: string;
  durationSec?: number;
}): Promise<string | null> {
  if (!supabase) return "No backend";
  const id = crypto.randomUUID();
  const ext = opts.mediaType === "image" ? "jpg" : "webm";
  const path = `${opts.userId}/story/${id}.${ext}`;

  const { error: upErr } = await supabase.storage.from("snaps").upload(path, opts.blob, {
    contentType:
      opts.blob.type ||
      (opts.mediaType === "image" ? "image/jpeg" : "video/webm"),
    upsert: false,
  });
  if (upErr) return upErr.message;

  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("stories").insert({
    id,
    user_id: opts.userId,
    media_path: path,
    media_type: opts.mediaType,
    caption: opts.caption?.trim().slice(0, 120) || null,
    caption_2: opts.caption2?.trim().slice(0, 120) || null,
    duration_sec: opts.durationSec ?? 5,
    expires_at: expires,
  });
  return error?.message ?? null;
}

export async function listStoryRail(myId: string): Promise<StoryRailUser[]> {
  if (!supabase) return [];
  const now = new Date().toISOString();

  // My stories
  const { data: mine } = await supabase
    .from("stories")
    .select("*")
    .eq("user_id", myId)
    .gt("expires_at", now)
    .order("created_at", { ascending: true });

  // Friends
  const { data: friendships } = await supabase
    .from("friendships")
    .select("*")
    .eq("status", "accepted")
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);

  const friendIds = (friendships ?? []).map((f) =>
    f.requester_id === myId ? f.addressee_id : f.requester_id,
  ) as string[];

  let friendStories: StoryItem[] = [];
  if (friendIds.length) {
    const { data } = await supabase
      .from("stories")
      .select("*")
      .in("user_id", friendIds)
      .gt("expires_at", now)
      .order("created_at", { ascending: true });
    friendStories = (data as StoryItem[]) ?? [];
  }

  const allUserIds = [
    ...new Set([myId, ...friendStories.map((s) => s.user_id)]),
  ];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", allUserIds);
  const byId = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]));

  const storyIds = [
    ...(mine as StoryItem[] | null)?.map((s) => s.id) ?? [],
    ...friendStories.map((s) => s.id),
  ];
  const viewed = new Set<string>();
  if (storyIds.length) {
    const { data: views } = await supabase
      .from("story_views")
      .select("story_id")
      .eq("viewer_id", myId)
      .in("story_id", storyIds);
    for (const v of views ?? []) viewed.add(v.story_id as string);
  }

  const rail: StoryRailUser[] = [];

  const myProfile = byId.get(myId);
  const myList = (mine as StoryItem[] | null) ?? [];
  if (myProfile) {
    rail.push({
      profile: myProfile,
      stories: myList,
      hasUnseen: false,
      isMe: true,
    });
  }

  const byFriend = new Map<string, StoryItem[]>();
  for (const s of friendStories) {
    const arr = byFriend.get(s.user_id) ?? [];
    arr.push(s);
    byFriend.set(s.user_id, arr);
  }

  for (const [uid, stories] of byFriend) {
    const profile = byId.get(uid);
    if (!profile) continue;
    const hasUnseen = stories.some((s) => !viewed.has(s.id));
    rail.push({ profile, stories, hasUnseen, isMe: false });
  }

  // Unseen first (except me stays first)
  const me = rail.filter((r) => r.isMe);
  const others = rail
    .filter((r) => !r.isMe)
    .sort((a, b) => Number(b.hasUnseen) - Number(a.hasUnseen));
  return [...me, ...others];
}

export async function markStoryViewed(
  storyId: string,
  viewerId: string,
): Promise<void> {
  if (!supabase) return;
  await supabase.from("story_views").upsert({
    story_id: storyId,
    viewer_id: viewerId,
    viewed_at: new Date().toISOString(),
  });
}

export async function signedStoryUrl(path: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.storage
    .from("snaps")
    .createSignedUrl(path, 120);
  return data?.signedUrl ?? null;
}
