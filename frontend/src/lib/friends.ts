import { supabase, type Profile } from "@/lib/supabase";

export type FriendEdge = {
  friendshipId: string;
  profile: Profile;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing" | "mutual";
};

function cleanUsername(username: string) {
  return username.trim().toLowerCase().replace(/^@/, "");
}

export async function searchByUsername(
  username: string,
): Promise<{ profile: Profile | null; error?: string }> {
  if (!supabase) return { profile: null, error: "No backend" };
  const clean = cleanUsername(username);
  if (clean.length < 2) return { profile: null, error: "Type a username" };

  // Exact first
  const exact = await supabase
    .from("profiles")
    .select("*")
    .eq("username", clean)
    .maybeSingle();

  if (exact.error) return { profile: null, error: exact.error.message };
  if (exact.data) return { profile: exact.data as Profile };

  // Partial fallback (e.g. "bran" → brandon)
  const partial = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", `%${clean}%`)
    .not("username", "is", null)
    .limit(1)
    .maybeSingle();

  if (partial.error) return { profile: null, error: partial.error.message };
  return { profile: (partial.data as Profile) ?? null };
}

/** Other users with usernames (small social graph discovery for MVP). */
export async function listDiscoverableUsers(
  myId: string,
): Promise<{ users: Profile[]; error?: string }> {
  if (!supabase) return { users: [], error: "No backend" };
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", myId)
    .not("username", "is", null)
    .order("username", { ascending: true })
    .limit(50);
  if (error) return { users: [], error: error.message };

  // Hide blocked either way
  const { data: blocked } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${myId},blocked_id.eq.${myId}`);
  const hide = new Set<string>();
  for (const b of blocked ?? []) {
    if (b.blocker_id === myId) hide.add(b.blocked_id as string);
    else hide.add(b.blocker_id as string);
  }

  return {
    users: ((data as Profile[]) ?? []).filter((u) => !hide.has(u.id)),
  };
}

export async function sendFriendRequest(
  myId: string,
  theirId: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  if (myId === theirId) return "That's you";
  const { checkRateLimit } = await import("@/lib/rateLimit");
  const limited = await checkRateLimit("friend_request", 30, 3600);
  if (limited) return limited;

  // Already friends / pending either direction?
  const { data: existing } = await supabase
    .from("friendships")
    .select("*")
    .or(
      `and(requester_id.eq.${myId},addressee_id.eq.${theirId}),and(requester_id.eq.${theirId},addressee_id.eq.${myId})`,
    )
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") return "Already friends";
    if (existing.status === "pending") {
      // They already requested you → accept
      if (existing.requester_id === theirId && existing.addressee_id === myId) {
        const { error } = await supabase
          .from("friendships")
          .update({ status: "accepted" })
          .eq("id", existing.id);
        return error?.message ?? null;
      }
      return "Request already sent";
    }
  }

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

  const otherIds = [
    ...new Set(
      data.map((f) =>
        f.requester_id === myId ? f.addressee_id : f.requester_id,
      ),
    ),
  ];
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
