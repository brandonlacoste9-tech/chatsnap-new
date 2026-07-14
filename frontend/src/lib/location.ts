import { supabase, type Profile } from "@/lib/supabase";

export type FriendPin = {
  user_id: string;
  lat: number;
  lng: number;
  updated_at: string;
  profile?: Profile;
};

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
): Promise<string | null> {
  if (!supabase) return "No backend";
  const { error } = await supabase.from("user_locations").upsert({
    user_id: userId,
    lat,
    lng,
    accuracy_m: accuracy ?? null,
    updated_at: new Date().toISOString(),
  });
  return error?.message ?? null;
}

export async function listFriendPins(myId: string): Promise<FriendPin[]> {
  if (!supabase) return [];
  // RLS filters to friends who opted in
  const { data, error } = await supabase
    .from("user_locations")
    .select("*")
    .neq("user_id", myId);
  if (error || !data?.length) return [];

  const ids = data.map((d) => d.user_id as string);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids);
  const byId = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]));

  return data.map((d) => ({
    user_id: d.user_id as string,
    lat: d.lat as number,
    lng: d.lng as number,
    updated_at: d.updated_at as string,
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
  return {
    user_id: data.user_id as string,
    lat: data.lat as number,
    lng: data.lng as number,
    updated_at: data.updated_at as string,
  };
}
