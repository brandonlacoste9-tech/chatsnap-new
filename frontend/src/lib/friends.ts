import { supabase, type Profile } from "@/lib/supabase";

export type FriendEdge = {
  friendshipId: string;
  profile: Profile;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing" | "mutual";
};

export async function searchByUsername(
  username: string,
): Promise<Profile | null> {
  if (!supabase) return null;
  const clean = username.trim().toLowerCase().replace(/^@/, "");
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", clean)
    .maybeSingle();
  return (data as Profile) ?? null;
}

export async function sendFriendRequest(
  myId: string,
  theirId: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  if (myId === theirId) return "That's you";
  const { error } = await supabase.from("friendships").insert({
    requester_id: myId,
    addressee_id: theirId,
    status: "pending",
  });
  return error?.message ?? null;
}

export async function acceptFriendRequest(
  friendshipId: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId);
  return error?.message ?? null;
}

export async function listFriendships(myId: string): Promise<FriendEdge[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`)
    .in("status", ["pending", "accepted"]);

  if (error || !data) return [];

  const otherIds = data.map((f) =>
    f.requester_id === myId ? f.addressee_id : f.requester_id,
  );
  if (otherIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", otherIds);

  const byId = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]));

  return data
    .map((f) => {
      const otherId = f.requester_id === myId ? f.addressee_id : f.requester_id;
      const profile = byId.get(otherId);
      if (!profile) return null;
      const direction: FriendEdge["direction"] =
        f.status === "accepted"
          ? "mutual"
          : f.requester_id === myId
            ? "outgoing"
            : "incoming";
      return {
        friendshipId: f.id as string,
        profile,
        status: f.status as "pending" | "accepted",
        direction,
      };
    })
    .filter(Boolean) as FriendEdge[];
}

export async function listAcceptedFriends(myId: string): Promise<Profile[]> {
  const edges = await listFriendships(myId);
  return edges.filter((e) => e.status === "accepted").map((e) => e.profile);
}
