import { supabase, type Profile } from "@/lib/supabase";
import { bumpStreakOnSend } from "@/lib/streaks";

export type InboxItem = {
  recipientId: string;
  snapId: string;
  durationSec: number;
  mediaType: "image" | "video";
  createdAt: string;
  expiresAt: string;
  caption: string | null;
  sender: Profile;
};

export async function sendSnap(opts: {
  senderId: string;
  blob: Blob;
  mediaType: "image" | "video";
  durationSec: number;
  recipientIds: string[];
  caption?: string;
}): Promise<string | null> {
  if (!supabase) return "No backend";
  if (opts.recipientIds.length === 0) return "No recipients";

  const snapId = crypto.randomUUID();
  const ext = opts.mediaType === "image" ? "jpg" : "webm";
  const path = `${opts.senderId}/${snapId}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("snaps")
    .upload(path, opts.blob, {
      contentType:
        opts.blob.type ||
        (opts.mediaType === "image" ? "image/jpeg" : "video/webm"),
      upsert: false,
    });
  if (upErr) return upErr.message;

  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const caption = opts.caption?.trim().slice(0, 120) || null;
  const { error: snapErr } = await supabase.from("snaps").insert({
    id: snapId,
    sender_id: opts.senderId,
    media_path: path,
    media_type: opts.mediaType,
    duration_sec: opts.durationSec,
    expires_at: expires,
    caption,
  });
  if (snapErr) return snapErr.message;

  const rows = opts.recipientIds.map((rid) => ({
    snap_id: snapId,
    recipient_id: rid,
    status: "pending" as const,
  }));
  const { error: recErr } = await supabase.from("snap_recipients").insert(rows);
  if (recErr) return recErr.message;

  // Fire-and-forget streaks
  void bumpStreakOnSend(opts.senderId, opts.recipientIds).catch(() => {});
  return null;
}

export async function countPendingInbox(myId: string): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("snap_recipients")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", myId)
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
}

export async function listInbox(myId: string): Promise<InboxItem[]> {
  if (!supabase) return [];

  const now = new Date().toISOString();
  const { data: recs, error } = await supabase
    .from("snap_recipients")
    .select("id, snap_id, status, snaps(*)")
    .eq("recipient_id", myId)
    .eq("status", "pending");

  if (error || !recs?.length) return [];

  const items: InboxItem[] = [];
  const senderIds = new Set<string>();

  for (const r of recs) {
    const snap = r.snaps as unknown as {
      id: string;
      sender_id: string;
      media_type: "image" | "video";
      duration_sec: number;
      created_at: string;
      expires_at: string;
      caption: string | null;
    } | null;
    if (!snap) continue;
    if (snap.expires_at < now) continue;
    senderIds.add(snap.sender_id);
    items.push({
      recipientId: r.id as string,
      snapId: snap.id,
      durationSec: snap.duration_sec,
      mediaType: snap.media_type,
      createdAt: snap.created_at,
      expiresAt: snap.expires_at,
      caption: snap.caption ?? null,
      sender: {
        id: snap.sender_id,
        username: null,
        display_name: null,
        avatar_url: null,
        locale: null,
      },
    });
  }

  if (senderIds.size) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", [...senderIds]);
    const map = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]));
    for (const it of items) {
      const p = map.get(it.sender.id);
      if (p) it.sender = p;
    }
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type SentItem = {
  snapId: string;
  mediaType: "image" | "video";
  durationSec: number;
  createdAt: string;
  recipients: { username: string | null; status: string }[];
};

/** Snaps you sent (for “opened?” feedback). */
export async function listSentSnaps(myId: string): Promise<SentItem[]> {
  if (!supabase) return [];
  const { data: snaps, error } = await supabase
    .from("snaps")
    .select("id, media_type, duration_sec, created_at")
    .eq("sender_id", myId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error || !snaps?.length) return [];

  const ids = snaps.map((s) => s.id as string);
  const { data: recs } = await supabase
    .from("snap_recipients")
    .select("snap_id, status, recipient_id")
    .in("snap_id", ids);

  const recipientIds = [
    ...new Set((recs ?? []).map((r) => r.recipient_id as string)),
  ];
  const { data: profiles } = recipientIds.length
    ? await supabase.from("profiles").select("id, username").in("id", recipientIds)
    : { data: [] as { id: string; username: string | null }[] };
  const uname = new Map(
    (profiles as { id: string; username: string | null }[] | null)?.map((p) => [
      p.id,
      p.username,
    ]),
  );

  return snaps.map((s) => ({
    snapId: s.id as string,
    mediaType: s.media_type as "image" | "video",
    durationSec: s.duration_sec as number,
    createdAt: s.created_at as string,
    recipients: (recs ?? [])
      .filter((r) => r.snap_id === s.id)
      .map((r) => ({
        username: uname.get(r.recipient_id as string) ?? null,
        status: r.status as string,
      })),
  }));
}

export async function openSnap(recipientRowId: string): Promise<{
  url: string;
  mediaType: "image" | "video";
  durationSec: number;
  caption: string | null;
  error?: string;
} | null> {
  if (!supabase) return null;

  const { data: rec, error } = await supabase
    .from("snap_recipients")
    .select("id, status, snap_id, snaps(*)")
    .eq("id", recipientRowId)
    .maybeSingle();

  if (error || !rec)
    return {
      url: "",
      mediaType: "image",
      durationSec: 5,
      caption: null,
      error: "gone",
    };
  if (rec.status === "consumed") {
    return {
      url: "",
      mediaType: "image",
      durationSec: 5,
      caption: null,
      error: "gone",
    };
  }

  const snap = rec.snaps as unknown as {
    media_path: string;
    media_type: "image" | "video";
    duration_sec: number;
    expires_at: string;
    caption: string | null;
  };

  if (snap.expires_at < new Date().toISOString()) {
    return {
      url: "",
      mediaType: "image",
      durationSec: 5,
      caption: null,
      error: "expired",
    };
  }

  await supabase
    .from("snap_recipients")
    .update({ status: "opened", opened_at: new Date().toISOString() })
    .eq("id", recipientRowId);

  const { data: signed } = await supabase.storage
    .from("snaps")
    .createSignedUrl(snap.media_path, 60);

  if (!signed?.signedUrl) {
    return {
      url: "",
      mediaType: "image",
      durationSec: 5,
      caption: null,
      error: "gone",
    };
  }

  return {
    url: signed.signedUrl,
    mediaType: snap.media_type,
    durationSec: snap.duration_sec,
    caption: snap.caption ?? null,
  };
}

export async function consumeSnap(recipientRowId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("snap_recipients")
    .update({ status: "consumed" })
    .eq("id", recipientRowId);
}
