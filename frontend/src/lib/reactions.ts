import { supabase } from "@/lib/supabase";

export const REACTION_EMOJIS = ["🔥", "😂", "❤️", "😮", "💀", "👏"] as const;

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
