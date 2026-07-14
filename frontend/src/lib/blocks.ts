import { supabase } from "@/lib/supabase";

export async function blockUser(
  myId: string,
  theirId: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  if (myId === theirId) return "That's you";
  const { error } = await supabase.from("blocks").insert({
    blocker_id: myId,
    blocked_id: theirId,
  });
  // Best-effort: remove friendship either direction
  await supabase
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${myId},addressee_id.eq.${theirId}),and(requester_id.eq.${theirId},addressee_id.eq.${myId})`,
    );
  return error?.message ?? null;
}

export async function unblockUser(
  myId: string,
  theirId: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", myId)
    .eq("blocked_id", theirId);
  return error?.message ?? null;
}

export async function listBlocked(myId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", myId);
  return (data ?? []).map((r) => r.blocked_id as string);
}

export async function isBlockedEitherWay(
  a: string,
  b: string,
): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase
    .from("blocks")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`,
    )
    .limit(1);
  return Boolean(data?.length);
}
