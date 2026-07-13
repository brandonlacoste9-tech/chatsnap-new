import { supabase } from "@/lib/supabase";

function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export type StreakInfo = {
  streakCount: number;
  lastActiveDate: string;
};

/** Bump streak when you send a snap to a friend (once per UTC day). */
export async function bumpStreakOnSend(
  myId: string,
  friendIds: string[],
): Promise<void> {
  if (!supabase || friendIds.length === 0) return;
  const today = utcDateString();
  const yday = yesterdayUtc();

  for (const friendId of friendIds) {
    if (friendId === myId) continue;
    const [user_low, user_high] = pair(myId, friendId);

    const { data: row } = await supabase
      .from("friendship_streaks")
      .select("*")
      .eq("user_low", user_low)
      .eq("user_high", user_high)
      .maybeSingle();

    if (!row) {
      await supabase.from("friendship_streaks").insert({
        user_low,
        user_high,
        streak_count: 1,
        last_active_date: today,
      });
      continue;
    }

    const last = row.last_active_date as string;
    if (last === today) continue; // already counted today

    const next = last === yday ? (row.streak_count as number) + 1 : 1;
    await supabase
      .from("friendship_streaks")
      .update({
        streak_count: next,
        last_active_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq("user_low", user_low)
      .eq("user_high", user_high);
  }
}

export async function getStreak(
  myId: string,
  friendId: string,
): Promise<number> {
  if (!supabase) return 0;
  const [user_low, user_high] = pair(myId, friendId);
  const { data } = await supabase
    .from("friendship_streaks")
    .select("streak_count, last_active_date")
    .eq("user_low", user_low)
    .eq("user_high", user_high)
    .maybeSingle();
  if (!data) return 0;
  const last = data.last_active_date as string;
  const today = utcDateString();
  const yday = yesterdayUtc();
  // Streak broken if last activity older than yesterday
  if (last !== today && last !== yday) return 0;
  return (data.streak_count as number) ?? 0;
}

export async function listStreaksForUser(
  myId: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!supabase) return map;
  const { data } = await supabase
    .from("friendship_streaks")
    .select("*")
    .or(`user_low.eq.${myId},user_high.eq.${myId}`);
  if (!data) return map;
  const today = utcDateString();
  const yday = yesterdayUtc();
  for (const row of data) {
    const last = row.last_active_date as string;
    if (last !== today && last !== yday) continue;
    const other =
      row.user_low === myId ? row.user_high : row.user_low;
    map.set(other as string, row.streak_count as number);
  }
  return map;
}
