import { supabase } from "@/lib/supabase";

export const REACTION_EMOJIS = ["🔥", "😂", "❤️", "😮", "💀", "👏"] as const;

export type MsgReaction = {
  message_id: string;
  user_id: string;
  emoji: string;
};

export async function sendSnapReaction(
  snapId: string,
  userId: string,
  emoji: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  const { error } = await supabase.from("snap_reactions").upsert(
    {
      snap_id: snapId,
      user_id: userId,
      emoji,
      created_at: new Date().toISOString(),
    },
    { onConflict: "snap_id,user_id" },
  );
  return error?.message ?? null;
}

export async function listReactionsForSnaps(
  snapIds: string[],
): Promise<Map<string, { emoji: string; user_id: string }[]>> {
  const map = new Map<string, { emoji: string; user_id: string }[]>();
  if (!supabase || snapIds.length === 0) return map;
  const { data } = await supabase
    .from("snap_reactions")
    .select("snap_id, emoji, user_id")
    .in("snap_id", snapIds);
  for (const row of data ?? []) {
    const sid = row.snap_id as string;
    const arr = map.get(sid) ?? [];
    arr.push({ emoji: row.emoji as string, user_id: row.user_id as string });
    map.set(sid, arr);
  }
  return map;
}

export async function sendMessageReaction(
  messageId: string,
  userId: string,
  emoji: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  // Toggle: same emoji → remove
  const { data: existing } = await supabase
    .from("message_reactions")
    .select("emoji")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.emoji === emoji) {
    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", userId);
    return error?.message ?? null;
  }
  const { error } = await supabase.from("message_reactions").upsert(
    {
      message_id: messageId,
      user_id: userId,
      emoji,
      created_at: new Date().toISOString(),
    },
    { onConflict: "message_id,user_id" },
  );
  return error?.message ?? null;
}

export async function listMessageReactions(
  messageIds: string[],
): Promise<Map<string, MsgReaction[]>> {
  const map = new Map<string, MsgReaction[]>();
  if (!supabase || messageIds.length === 0) return map;
  const { data } = await supabase
    .from("message_reactions")
    .select("message_id, user_id, emoji")
    .in("message_id", messageIds);
  for (const row of data ?? []) {
    const mid = row.message_id as string;
    const arr = map.get(mid) ?? [];
    arr.push({
      message_id: mid,
      user_id: row.user_id as string,
      emoji: row.emoji as string,
    });
    map.set(mid, arr);
  }
  return map;
}

/** Group reactions by emoji for bubble chips. */
export function groupReactionEmojis(
  list: MsgReaction[] | undefined,
  myId?: string,
): { emoji: string; count: number; mine: boolean }[] {
  if (!list?.length) return [];
  const m = new Map<string, { count: number; mine: boolean }>();
  for (const r of list) {
    const cur = m.get(r.emoji) ?? { count: 0, mine: false };
    cur.count += 1;
    if (myId && r.user_id === myId) cur.mine = true;
    m.set(r.emoji, cur);
  }
  return [...m.entries()].map(([emoji, v]) => ({ emoji, ...v }));
}
