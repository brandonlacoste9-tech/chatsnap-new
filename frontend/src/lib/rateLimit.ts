import { supabase } from "@/lib/supabase";

/** Soft client-side rate limit via Supabase RPCs. */
export async function checkRateLimit(
  action: string,
  max: number,
  windowSec: number,
): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("count_recent_actions", {
      p_action: action,
      p_seconds: windowSec,
    });
    if (error) return null; // fail open if RPC missing
    if (typeof data === "number" && data >= max) {
      return "Slow down — try again in a bit.";
    }
    await supabase.rpc("log_action", { p_action: action });
  } catch {
    /* fail open */
  }
  return null;
}
