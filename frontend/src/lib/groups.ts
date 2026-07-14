import { supabase, type Profile } from "@/lib/supabase";

export type ChatGroup = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  memberCount?: number;
  lastBody?: string | null;
};

export type GroupMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  body: string | null;
  media_path: string | null;
  media_type: "text" | "audio" | "image";
  created_at: string;
  sender?: Profile | null;
};

export async function listMyGroups(myId: string): Promise<ChatGroup[]> {
  if (!supabase) return [];
  const { data: memberships } = await supabase
    .from("chat_group_members")
    .select("group_id")
    .eq("user_id", myId);
  if (!memberships?.length) return [];

  const ids = memberships.map((m) => m.group_id as string);
  const { data: groups } = await supabase
    .from("chat_groups")
    .select("*")
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (!groups?.length) return [];

  const result: ChatGroup[] = [];
  for (const g of groups) {
    const { count } = await supabase
      .from("chat_group_members")
      .select("user_id", { count: "exact", head: true })
      .eq("group_id", g.id);
    const { data: last } = await supabase
      .from("group_messages")
      .select("body, media_type")
      .eq("group_id", g.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    result.push({
      id: g.id as string,
      name: g.name as string,
      created_by: g.created_by as string,
      created_at: g.created_at as string,
      memberCount: count ?? 0,
      lastBody:
        last?.media_type === "audio"
          ? "🎤"
          : ((last?.body as string) ?? null),
    });
  }
  return result;
}

export async function createGroup(opts: {
  myId: string;
  name: string;
  memberIds: string[];
}): Promise<{ id?: string; error?: string }> {
  if (!supabase) return { error: "No backend" };
  const name = opts.name.trim().slice(0, 40);
  if (name.length < 1) return { error: "Name required" };

  const { data: group, error } = await supabase
    .from("chat_groups")
    .insert({ name, created_by: opts.myId })
    .select("id")
    .single();
  if (error || !group) return { error: error?.message ?? "Create failed" };

  const gid = group.id as string;
  const members = new Set([opts.myId, ...opts.memberIds]);
  const rows = [...members].map((user_id) => ({
    group_id: gid,
    user_id,
  }));
  const { error: mErr } = await supabase.from("chat_group_members").insert(rows);
  if (mErr) return { error: mErr.message };
  return { id: gid };
}

export async function listGroupMessages(
  groupId: string,
): Promise<GroupMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("group_messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error || !data?.length) return [];

  const senderIds = [...new Set(data.map((m) => m.sender_id as string))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", senderIds);
  const byId = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]));

  return data.map((m) => ({
    id: m.id as string,
    group_id: m.group_id as string,
    sender_id: m.sender_id as string,
    body: (m.body as string) ?? null,
    media_path: (m.media_path as string) ?? null,
    media_type: m.media_type as GroupMessage["media_type"],
    created_at: m.created_at as string,
    sender: byId.get(m.sender_id as string) ?? null,
  }));
}

export async function sendGroupText(
  groupId: string,
  senderId: string,
  body: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  const text = body.trim();
  if (!text) return "Empty";
  const { error } = await supabase.from("group_messages").insert({
    group_id: groupId,
    sender_id: senderId,
    body: text.slice(0, 2000),
    media_type: "text",
  });
  return error?.message ?? null;
}

export async function sendGroupAudio(
  groupId: string,
  senderId: string,
  blob: Blob,
): Promise<string | null> {
  if (!supabase) return "No backend";
  const id = crypto.randomUUID();
  const path = `${senderId}/group/${id}.webm`;
  const { error: upErr } = await supabase.storage.from("snaps").upload(path, blob, {
    contentType: blob.type || "audio/webm",
    upsert: false,
  });
  if (upErr) return upErr.message;
  const { error } = await supabase.from("group_messages").insert({
    group_id: groupId,
    sender_id: senderId,
    media_path: path,
    media_type: "audio",
  });
  return error?.message ?? null;
}

export async function listGroupMembers(
  groupId: string,
): Promise<Profile[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("chat_group_members")
    .select("user_id")
    .eq("group_id", groupId);
  if (!data?.length) return [];
  const ids = data.map((d) => d.user_id as string);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids);
  return (profiles as Profile[]) ?? [];
}
