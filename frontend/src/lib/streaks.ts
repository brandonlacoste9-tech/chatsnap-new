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

function daysAgoUtc(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

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
    if (last === today) continue;

    const freezeUntil = row.freeze_until as string | null;
    let next: number;
    if (last === yday) {
      next = (row.streak_count as number) + 1;
    } else if (freezeUntil && freezeUntil >= today && last >= daysAgoUtc(3)) {
      // Missed day(s) but freeze active — keep streak
      next = row.streak_count as number;
    } else {
      next = 1;
    }

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
    .select("streak_count, last_active_date, freeze_until")
    .eq("user_low", user_low)
    .eq("user_high", user_high)
    .maybeSingle();
  if (!data) return 0;
  const last = data.last_active_date as string;
  const today = utcDateString();
  const yday = yesterdayUtc();
  const freezeUntil = data.freeze_until as string | null;
  if (last === today || last === yday) return (data.streak_count as number) ?? 0;
  if (freezeUntil && freezeUntil >= today) return (data.streak_count as number) ?? 0;
  return 0;
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
    const freezeUntil = row.freeze_until as string | null;
    const alive =
      last === today ||
      last === yday ||
      (freezeUntil != null && freezeUntil >= today);
    if (!alive) continue;
    const other = row.user_low === myId ? row.user_high : row.user_low;
    map.set(other as string, row.streak_count as number);
  }
  return map;
}

/** One free freeze per 7 days — protects streak if you miss a day. */
export async function activateStreakFreeze(
  myId: string,
  friendId: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  const [user_low, user_high] = pair(myId, friendId);
  const { data: row } = await supabase
    .from("friendship_streaks")
    .select("*")
    .eq("user_low", user_low)
    .eq("user_high", user_high)
    .maybeSingle();
  if (!row) return "No streak yet — send a snap first";

  const lastFreeze = row.last_freeze_at
    ? new Date(row.last_freeze_at as string).getTime()
    : 0;
  const week = 7 * 24 * 60 * 60 * 1000;
  if (lastFreeze && Date.now() - lastFreeze < week) {
    return "Freeze already used this week";
  }

  const until = new Date();
  until.setUTCDate(until.getUTCDate() + 1);
  const freeze_until = until.toISOString().slice(0, 10);

  const { error } = await supabase
    .from("friendship_streaks")
    .update({
      freeze_until,
      last_freeze_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_low", user_low)
    .eq("user_high", user_high);
  return error?.message ?? null;
}
