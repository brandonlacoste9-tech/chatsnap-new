import { supabase } from "@/lib/supabase";

export async function reportUser(opts: {
  reporterId: string;
  reportedId: string;
  reason: string;
  context?: string;
}): Promise<string | null> {
  if (!supabase) return "No backend";
  if (opts.reporterId === opts.reportedId) return "That's you";
  const reason = opts.reason.trim();
  if (reason.length < 3) return "Reason too short";
  const { error } = await supabase.from("reports").insert({
    reporter_id: opts.reporterId,
    reported_id: opts.reportedId,
    reason: reason.slice(0, 500),
    context: opts.context?.slice(0, 200) ?? null,
  });
  return error?.message ?? null;
}

export async function setRestrictedMode(
  userId: string,
  on: boolean,
): Promise<string | null> {
  if (!supabase) return "No backend";
  const { error } = await supabase
    .from("profiles")
    .update({ restricted_mode: on })
    .eq("id", userId);
  // Restricted: force map off
  if (on) {
    await supabase
      .from("profiles")
      .update({ show_on_map: false })
      .eq("id", userId);
    await supabase.from("user_locations").delete().eq("user_id", userId);
  }
  return error?.message ?? null;
}

export async function getRestrictedMode(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase
    .from("profiles")
    .select("restricted_mode")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.restricted_mode);
}
