import { supabase, type Profile } from "@/lib/supabase";

export type InboxItem = {
  recipientId: string;
  snapId: string;
  durationSec: number;
  mediaType: "image" | "video";
  createdAt: string;
  expiresAt: string;
  sender: Profile;
};

export async function sendSnap(opts: {
  senderId: string;
  blob: Blob;
  mediaType: "image" | "video";
  durationSec: number;
  recipientIds: string[];
}): Promise<string | null> {
  if (!supabase) return "No backend";
  if (opts.recipientIds.length === 0) return "No recipients";

  const snapId = crypto.randomUUID();
  const ext = opts.mediaType === "image" ? "jpg" : "webm";
  const path = `${opts.senderId}/${snapId}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("snaps")
    .upload(path, opts.blob, {
      contentType: opts.blob.type || (opts.mediaType === "image" ? "image/jpeg" : "video/webm"),
      upsert: false,
    });
  if (upErr) return upErr.message;

  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error: snapErr } = await supabase.from("snaps").insert({
    id: snapId,
    sender_id: opts.senderId,
    media_path: path,
    media_type: opts.mediaType,
    duration_sec: opts.durationSec,
    expires_at: expires,
  });
  if (snapErr) return snapErr.message;

  const rows = opts.recipientIds.map((rid) => ({
    snap_id: snapId,
    recipient_id: rid,
    status: "pending" as const,
  }));
  const { error: recErr } = await supabase.from("snap_recipients").insert(rows);
  return recErr?.message ?? null;
}

export async function listInbox(myId: string): Promise<InboxItem[]> {
  if (!supabase) return [];

  const now = new Date().toISOString();
  const { data: recs } = await supabase
    .from("snap_recipients")
    .select("id, snap_id, status, snaps(*)")
    .eq("recipient_id", myId)
    .eq("status", "pending");

  if (!recs?.length) return [];

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

export async function openSnap(recipientRowId: string): Promise<{
  url: string;
  mediaType: "image" | "video";
  durationSec: number;
  error?: string;
} | null> {
  if (!supabase) return null;

  const { data: rec, error } = await supabase
    .from("snap_recipients")
    .select("id, status, snap_id, snaps(*)")
    .eq("id", recipientRowId)
    .maybeSingle();

  if (error || !rec) return { url: "", mediaType: "image", durationSec: 5, error: "gone" };
  if (rec.status === "consumed") {
    return { url: "", mediaType: "image", durationSec: 5, error: "gone" };
  }

  const snap = rec.snaps as unknown as {
    media_path: string;
    media_type: "image" | "video";
    duration_sec: number;
    expires_at: string;
  };

  if (snap.expires_at < new Date().toISOString()) {
    return { url: "", mediaType: "image", durationSec: 5, error: "expired" };
  }

  await supabase
    .from("snap_recipients")
    .update({ status: "opened", opened_at: new Date().toISOString() })
    .eq("id", recipientRowId);

  const { data: signed } = await supabase.storage
    .from("snaps")
    .createSignedUrl(snap.media_path, 60);

  if (!signed?.signedUrl) {
    return { url: "", mediaType: "image", durationSec: 5, error: "gone" };
  }

  return {
    url: signed.signedUrl,
    mediaType: snap.media_type,
    durationSec: snap.duration_sec,
  };
}

export async function consumeSnap(recipientRowId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("snap_recipients")
    .update({ status: "consumed" })
    .eq("id", recipientRowId);
}
