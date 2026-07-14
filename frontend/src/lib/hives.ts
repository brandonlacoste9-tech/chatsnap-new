import { supabase, type Profile } from "@/lib/supabase";

export type Hive = {
  id: string;
  code: string;
  name: string;
  created_by: string;
  created_at: string;
  max_members: number;
};

function randomCode(len = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  let out = "";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) out += alphabet[buf[i]! % alphabet.length];
  return out;
}

export function normalizeHiveCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function listMyHives(
  userId: string,
): Promise<{ hives: Hive[]; error?: string }> {
  if (!supabase) return { hives: [], error: "No backend" };
  const { data: mems, error: mErr } = await supabase
    .from("hive_members")
    .select("hive_id")
    .eq("user_id", userId);
  if (mErr) return { hives: [], error: mErr.message };
  const ids = (mems ?? []).map((m) => m.hive_id as string);
  if (!ids.length) return { hives: [] };

  const { data, error } = await supabase
    .from("hives")
    .select("*")
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (error) return { hives: [], error: error.message };
  return { hives: (data as Hive[]) ?? [] };
}

export async function createHive(
  userId: string,
  name: string,
): Promise<{ hive: Hive | null; error?: string }> {
  if (!supabase) return { hive: null, error: "No backend" };
  const clean = name.trim();
  if (clean.length < 2) return { hive: null, error: "Name too short" };

  // retry code collision a few times
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode(6);
    const { data, error } = await supabase
      .from("hives")
      .insert({ name: clean, code, created_by: userId })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") continue; // unique violation
      return { hive: null, error: error.message };
    }
    const hive = data as Hive;
    const { error: jErr } = await supabase.from("hive_members").insert({
      hive_id: hive.id,
      user_id: userId,
    });
    if (jErr) return { hive: null, error: jErr.message };
    return { hive };
  }
  return { hive: null, error: "Could not allocate code" };
}

export async function joinHiveByCode(
  _userId: string,
  rawCode: string,
): Promise<{ hive: Hive | null; error?: string }> {
  if (!supabase) return { hive: null, error: "No backend" };
  const code = normalizeHiveCode(rawCode);
  if (code.length < 4) return { hive: null, error: "Invalid code" };

  const { data, error } = await supabase.rpc("join_hive_by_code", {
    p_code: code,
  });
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("not_found")) return { hive: null, error: "Code not found" };
    if (msg.includes("full")) return { hive: null, error: "Hive is full" };
    if (msg.includes("invalid_code")) return { hive: null, error: "Invalid code" };
    return { hive: null, error: error.message };
  }
  return { hive: data as Hive };
}

export async function leaveHive(
  userId: string,
  hiveId: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  const { error } = await supabase
    .from("hive_members")
    .delete()
    .eq("hive_id", hiveId)
    .eq("user_id", userId);
  return error?.message ?? null;
}

export async function listHiveMembers(
  hiveId: string,
): Promise<{ members: Profile[]; error?: string }> {
  if (!supabase) return { members: [], error: "No backend" };
  const { data: mems, error } = await supabase
    .from("hive_members")
    .select("user_id")
    .eq("hive_id", hiveId)
    .order("joined_at", { ascending: true });
  if (error) return { members: [], error: error.message };
  const ids = (mems ?? []).map((m) => m.user_id as string);
  if (!ids.length) return { members: [] };

  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids);
  if (pErr) return { members: [], error: pErr.message };
  return { members: (profiles as Profile[]) ?? [] };
}
