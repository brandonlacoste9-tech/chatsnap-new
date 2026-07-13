import { supabase, type Profile } from "@/lib/supabase";

export type ChatMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string | null;
  media_path: string | null;
  media_type: "text" | "audio" | "image";
  created_at: string;
  read_at: string | null;
};

export type ChatPreview = {
  friend: Profile;
  lastMessage: ChatMessage | null;
  unread: number;
};

export async function listChatPreviews(myId: string): Promise<ChatPreview[]> {
  if (!supabase) return [];

  // Accepted friends
  const { data: friendships } = await supabase
    .from("friendships")
    .select("*")
    .eq("status", "accepted")
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);

  if (!friendships?.length) return [];

  const friendIds = friendships.map((f) =>
    f.requester_id === myId ? f.addressee_id : f.requester_id,
  ) as string[];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", friendIds);

  const byId = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]));

  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${myId},recipient_id.eq.${myId}`)
    .order("created_at", { ascending: false })
    .limit(200);

  const lastByFriend = new Map<string, ChatMessage>();
  const unreadByFriend = new Map<string, number>();

  for (const m of (msgs as ChatMessage[] | null) ?? []) {
    const other = m.sender_id === myId ? m.recipient_id : m.sender_id;
    if (!lastByFriend.has(other)) lastByFriend.set(other, m);
    if (m.recipient_id === myId && !m.read_at) {
      unreadByFriend.set(other, (unreadByFriend.get(other) ?? 0) + 1);
    }
  }

  const previews: ChatPreview[] = friendIds
    .map((id) => {
      const friend = byId.get(id);
      if (!friend) return null;
      return {
        friend,
        lastMessage: lastByFriend.get(id) ?? null,
        unread: unreadByFriend.get(id) ?? 0,
      };
    })
    .filter(Boolean) as ChatPreview[];

  // Sort by last message time
  previews.sort((a, b) => {
    const ta = a.lastMessage?.created_at ?? "";
    const tb = b.lastMessage?.created_at ?? "";
    return tb.localeCompare(ta);
  });

  return previews;
}

export async function listThread(
  myId: string,
  friendId: string,
): Promise<ChatMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${myId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${myId})`,
    )
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return [];
  return (data as ChatMessage[]) ?? [];
}

export async function sendTextMessage(
  myId: string,
  friendId: string,
  body: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  const text = body.trim();
  if (!text) return "Empty message";
  const { error } = await supabase.from("messages").insert({
    sender_id: myId,
    recipient_id: friendId,
    body: text.slice(0, 2000),
    media_type: "text",
  });
  return error?.message ?? null;
}

export async function sendAudioMessage(
  myId: string,
  friendId: string,
  blob: Blob,
): Promise<string | null> {
  if (!supabase) return "No backend";
  const id = crypto.randomUUID();
  const path = `${myId}/chat/${id}.webm`;
  const { error: upErr } = await supabase.storage.from("snaps").upload(path, blob, {
    contentType: blob.type || "audio/webm",
    upsert: false,
  });
  if (upErr) return upErr.message;

  const { error } = await supabase.from("messages").insert({
    sender_id: myId,
    recipient_id: friendId,
    media_path: path,
    media_type: "audio",
    body: null,
  });
  return error?.message ?? null;
}

export async function markThreadRead(
  myId: string,
  friendId: string,
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", myId)
    .eq("sender_id", friendId)
    .is("read_at", null);
}

export async function signedMediaUrl(
  path: string,
): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.storage
    .from("snaps")
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function countUnreadMessages(myId: string): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", myId)
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}
