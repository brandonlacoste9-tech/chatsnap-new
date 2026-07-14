import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/** Channel name for a 1:1 chat typing presence (sorted ids). */
export function typingChannelName(a: string, b: string): string {
  return a < b ? `typing:${a}:${b}` : `typing:${b}:${a}`;
}

export function openTypingChannel(
  myId: string,
  friendId: string,
  onTyping: (fromUserId: string) => void,
): RealtimeChannel | null {
  if (!supabase) return null;
  const name = typingChannelName(myId, friendId);
  const channel = supabase
    .channel(name, { config: { broadcast: { self: false } } })
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      const uid = (payload as { userId?: string })?.userId;
      if (uid && uid !== myId) onTyping(uid);
    })
    .subscribe();
  return channel;
}

export async function broadcastTyping(
  channel: RealtimeChannel | null,
  myId: string,
): Promise<void> {
  if (!channel) return;
  await channel.send({
    type: "broadcast",
    event: "typing",
    payload: { userId: myId, at: Date.now() },
  });
}

export function closeTypingChannel(channel: RealtimeChannel | null): void {
  if (!channel || !supabase) return;
  void supabase.removeChannel(channel);
}
