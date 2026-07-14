import { supabase, type Profile } from "@/lib/supabase";
import { listFriendships } from "@/lib/friends";

/**
 * Soft suggestions: people who share a hive or group with you,
 * but are not already friends / pending.
 */
export async function listSoftSuggestions(
  myId: string,
): Promise<Profile[]> {
  if (!supabase) return [];

  const edges = await listFriendships(myId);
  const taken = new Set(edges.map((e) => e.profile.id));
  taken.add(myId);

  const candidateIds = new Set<string>();

  // Hive co-members
  const { data: myHives } = await supabase
    .from("hive_members")
    .select("hive_id")
    .eq("user_id", myId);
  if (myHives?.length) {
    const hiveIds = myHives.map((h) => h.hive_id as string);
    const { data: hivePeople } = await supabase
      .from("hive_members")
      .select("user_id")
      .in("hive_id", hiveIds)
      .neq("user_id", myId)
      .limit(80);
    for (const r of hivePeople ?? []) candidateIds.add(r.user_id as string);
  }

  // Group co-members
  const { data: myGroups } = await supabase
    .from("chat_group_members")
    .select("group_id")
    .eq("user_id", myId);
  if (myGroups?.length) {
    const gids = myGroups.map((g) => g.group_id as string);
    const { data: groupPeople } = await supabase
      .from("chat_group_members")
      .select("user_id")
      .in("group_id", gids)
      .neq("user_id", myId)
      .limit(80);
    for (const r of groupPeople ?? []) candidateIds.add(r.user_id as string);
  }

  const ids = [...candidateIds].filter((id) => !taken.has(id)).slice(0, 20);
  if (!ids.length) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids)
    .not("username", "is", null);
  return (profiles as Profile[]) ?? [];
}
