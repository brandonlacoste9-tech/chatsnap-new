import { supabase, type Profile } from "@/lib/supabase";

export type FriendPin = {
  user_id: string;
  lat: number;
  lng: number;
  updated_at: string;
  share_until?: string | null;
  coarse?: boolean;
  profile?: Profile;
};

export type ShareDuration = "1h" | "evening" | "on" | "off";

/** Local end-of-evening (21:00) as ISO, or +1h if already past. */
export function eveningUntilIso(): string {
  const d = new Date();
  d.setHours(21, 0, 0, 0);
  if (d.getTime() <= Date.now()) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString();
}

export function shareUntilFromDuration(
  duration: ShareDuration,
): string | null {
  if (duration === "off" || duration === "on") return null;
  if (duration === "1h") {
    return new Date(Date.now() + 60 * 60 * 1000).toISOString();
  }
  return eveningUntilIso();
}

function roundCoord(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export async function setShowOnMap(
  userId: string,
  show: boolean,
): Promise<string | null> {
  if (!supabase) return "No backend";
  const { error } = await supabase
    .from("profiles")
    .update({ show_on_map: show })
    .eq("id", userId);
  if (!show) {
    await supabase.from("user_locations").delete().eq("user_id", userId);
  }
  return error?.message ?? null;
}

export async function getShowOnMap(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase
    .from("profiles")
    .select("show_on_map")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.show_on_map);
}

export async function publishLocation(
  userId: string,
  lat: number,
  lng: number,
  accuracy?: number,
  opts?: {
    shareUntil?: string | null;
    coarse?: boolean;
  },
): Promise<string | null> {
  if (!supabase) return "No backend";
  const coarse = Boolean(opts?.coarse);
  const outLat = coarse ? roundCoord(lat, 2) : lat;
  const outLng = coarse ? roundCoord(lng, 2) : lng;
  const { error } = await supabase.from("user_locations").upsert({
    user_id: userId,
    lat: outLat,
    lng: outLng,
    accuracy_m: accuracy ?? null,
    updated_at: new Date().toISOString(),
    share_until: opts?.shareUntil ?? null,
    coarse,
  });
  return error?.message ?? null;
}

function isShareActive(row: {
  share_until?: string | null;
}): boolean {
  if (!row.share_until) return true;
  return row.share_until > new Date().toISOString();
}

export async function listFriendPins(myId: string): Promise<FriendPin[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("user_locations")
    .select("*")
    .neq("user_id", myId);
  if (error || !data?.length) return [];

  const active = data.filter((d) => isShareActive(d));
  if (!active.length) return [];

  const ids = active.map((d) => d.user_id as string);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids);
  const byId = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]));

  return active.map((d) => ({
    user_id: d.user_id as string,
    lat: d.lat as number,
    lng: d.lng as number,
    updated_at: d.updated_at as string,
    share_until: (d.share_until as string) ?? null,
    coarse: Boolean(d.coarse),
    profile: byId.get(d.user_id as string),
  }));
}

export async function getMyPin(userId: string): Promise<FriendPin | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("user_locations")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  if (!isShareActive(data)) return null;
  return {
    user_id: data.user_id as string,
    lat: data.lat as number,
    lng: data.lng as number,
    updated_at: data.updated_at as string,
    share_until: (data.share_until as string) ?? null,
    coarse: Boolean(data.coarse),
  };
}
