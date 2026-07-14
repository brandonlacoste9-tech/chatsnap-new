import { supabase, type Profile } from "@/lib/supabase";
import { bumpStreakOnSend } from "@/lib/streaks";
import { notifyUsersPush } from "@/lib/push";

export type InboxItem = {
  recipientId: string;
  snapId: string;
  durationSec: number;
  mediaType: "image" | "video";
  createdAt: string;
  expiresAt: string;
  caption: string | null;
  caption2: string | null;
  sender: Profile;
};

export async function sendSnap(opts: {
  senderId: string;
  blob: Blob;
  mediaType: "image" | "video";
  durationSec: number;
  recipientIds: string[];
  caption?: string;
  caption2?: string;
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
  const caption_2 = opts.caption2?.trim().slice(0, 120) || null;
  // 0 = open until close; otherwise clamp 1–60
  const rawDur = opts.durationSec ?? 10;
  const duration_sec =
    rawDur <= 0 ? 0 : Math.min(60, Math.max(1, Math.round(rawDur)));
  const { error: snapErr } = await supabase.from("snaps").insert({
    id: snapId,
    sender_id: opts.senderId,
    media_path: path,
    media_type: opts.mediaType,
    duration_sec,
    expires_at: expires,
    caption,
    caption_2,
  });
  if (snapErr) return snapErr.message;

  const rows = opts.recipientIds.map((rid) => ({
    snap_id: snapId,
    recipient_id: rid,
    status: "pending" as const,
  }));
  const { error: recErr } = await supabase.from("snap_recipients").insert(rows);
  if (recErr) return recErr.message;

  // Fire-and-forget streaks + web push
  void bumpStreakOnSend(opts.senderId, opts.recipientIds).catch(() => {});
  void notifyUsersPush({
    userIds: opts.recipientIds,
    title: "ChatSnap",
    body: "New snap 👻",
    url: "/app/inbox",
  });
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
  // Two-step fetch avoids nested embed RLS edge cases
  const { data: recs, error } = await supabase
    .from("snap_recipients")
    .select("id, snap_id, status")
    .eq("recipient_id", myId)
    .eq("status", "pending");

  if (error || !recs?.length) return [];

  const snapIds = [...new Set(recs.map((r) => r.snap_id as string))];
  const { data: snaps, error: sErr } = await supabase
    .from("snaps")
    .select(
      "id, sender_id, media_type, duration_sec, created_at, expires_at, caption, caption_2",
    )
    .in("id", snapIds);

  if (sErr || !snaps?.length) return [];

  const snapById = new Map(
    snaps.map((s) => [s.id as string, s as {
      id: string;
      sender_id: string;
      media_type: "image" | "video";
      duration_sec: number;
      created_at: string;
      expires_at: string;
      caption: string | null;
      caption_2: string | null;
    }]),
  );

  const items: InboxItem[] = [];
  const senderIds = new Set<string>();

  for (const r of recs) {
    const snap = snapById.get(r.snap_id as string);
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
      caption2: snap.caption_2 ?? null,
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
  caption: string | null;
  caption2: string | null;
  recipients: { username: string | null; status: string }[];
  reactions: string[];
};

/** Snaps you sent (for “opened?” feedback + re-view). */
export async function listSentSnaps(myId: string): Promise<SentItem[]> {
  if (!supabase) return [];
  const { data: snaps, error } = await supabase
    .from("snaps")
    .select("id, media_type, duration_sec, created_at, caption, caption_2")
    .eq("sender_id", myId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error || !snaps?.length) return [];

  const ids = snaps.map((s) => s.id as string);
  const { data: recs } = await supabase
    .from("snap_recipients")
    .select("snap_id, status, recipient_id")
    .in("snap_id", ids);

  const { data: reacts } = await supabase
    .from("snap_reactions")
    .select("snap_id, emoji")
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

  const reactsBySnap = new Map<string, string[]>();
  for (const r of reacts ?? []) {
    const sid = r.snap_id as string;
    const arr = reactsBySnap.get(sid) ?? [];
    arr.push(r.emoji as string);
    reactsBySnap.set(sid, arr);
  }

  return snaps.map((s) => ({
    snapId: s.id as string,
    mediaType: s.media_type as "image" | "video",
    durationSec: s.duration_sec as number,
    createdAt: s.created_at as string,
    caption: (s.caption as string) ?? null,
    caption2: (s.caption_2 as string) ?? null,
    recipients: (recs ?? [])
      .filter((r) => r.snap_id === s.id)
      .map((r) => ({
        username: uname.get(r.recipient_id as string) ?? null,
        status: r.status as string,
      })),
    reactions: reactsBySnap.get(s.id as string) ?? [],
  }));
}

/** Sender permanently erases a snap (storage + row; recipients cascade). */
export async function deleteSentSnap(
  snapId: string,
  myId: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  const { data: snap, error: gErr } = await supabase
    .from("snaps")
    .select("id, media_path, sender_id")
    .eq("id", snapId)
    .eq("sender_id", myId)
    .maybeSingle();
  if (gErr) return gErr.message;
  if (!snap) return "Not found";

  const path = snap.media_path as string;
  if (path) {
    await supabase.storage.from("snaps").remove([path]);
  }
  const { error } = await supabase
    .from("snaps")
    .delete()
    .eq("id", snapId)
    .eq("sender_id", myId);
  return error?.message ?? null;
}

/** Recipient dismisses an inbox snap without opening (erase from inbox). */
export async function dismissInboxSnap(
  recipientRowId: string,
  myId: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  const { error } = await supabase
    .from("snap_recipients")
    .delete()
    .eq("id", recipientRowId)
    .eq("recipient_id", myId);
  return error?.message ?? null;
}

/**
 * Sender re-views their own snap (does not mark consumed for recipients).
 */
export async function openSentSnap(
  snapId: string,
  myId: string,
): Promise<{
  url: string;
  mediaType: "image" | "video";
  durationSec: number;
  caption: string | null;
  caption2: string | null;
  error?: string;
} | null> {
  if (!supabase) return null;
  const empty = (error: string) => ({
    url: "",
    mediaType: "image" as const,
    durationSec: 10,
    caption: null,
    caption2: null,
    error,
  });

  const { data: snap, error } = await supabase
    .from("snaps")
    .select(
      "id, sender_id, media_path, media_type, duration_sec, expires_at, caption, caption_2",
    )
    .eq("id", snapId)
    .eq("sender_id", myId)
    .maybeSingle();

  if (error || !snap) return empty("gone");

  const { data: signed } = await supabase.storage
    .from("snaps")
    .createSignedUrl(snap.media_path as string, 120);

  if (!signed?.signedUrl) return empty("gone");

  return {
    url: signed.signedUrl,
    mediaType: snap.media_type as "image" | "video",
    durationSec: (snap.duration_sec as number) ?? 10,
    caption: (snap.caption as string) ?? null,
    caption2: (snap.caption_2 as string) ?? null,
  };
}

export async function openSnap(recipientRowId: string): Promise<{
  url: string;
  mediaType: "image" | "video";
  durationSec: number;
  caption: string | null;
  caption2: string | null;
  snapId: string | null;
  senderId: string | null;
  error?: string;
} | null> {
  if (!supabase) return null;

  const empty = (error: string) => ({
    url: "",
    mediaType: "image" as const,
    durationSec: 5,
    caption: null,
    caption2: null,
    snapId: null,
    senderId: null,
    error,
  });

  const { data: rec, error } = await supabase
    .from("snap_recipients")
    .select("id, status, snap_id")
    .eq("id", recipientRowId)
    .maybeSingle();

  if (error || !rec) return empty("gone");
  if (rec.status === "consumed") return empty("gone");

  const { data: snapRow, error: snapErr } = await supabase
    .from("snaps")
    .select(
      "id, sender_id, media_path, media_type, duration_sec, expires_at, caption, caption_2",
    )
    .eq("id", rec.snap_id as string)
    .maybeSingle();

  if (snapErr || !snapRow) return empty("gone");

  const snap = snapRow as {
    id: string;
    sender_id: string;
    media_path: string;
    media_type: "image" | "video";
    duration_sec: number;
    expires_at: string;
    caption: string | null;
    caption_2: string | null;
  };

  if (snap.expires_at < new Date().toISOString()) return empty("expired");

  await supabase
    .from("snap_recipients")
    .update({ status: "opened", opened_at: new Date().toISOString() })
    .eq("id", recipientRowId);

  const { data: signed } = await supabase.storage
    .from("snaps")
    .createSignedUrl(snap.media_path, 60);

  if (!signed?.signedUrl) return empty("gone");

  return {
    url: signed.signedUrl,
    mediaType: snap.media_type,
    durationSec: snap.duration_sec,
    caption: snap.caption ?? null,
    caption2: snap.caption_2 ?? null,
    snapId: snap.id ?? (rec.snap_id as string),
    senderId: snap.sender_id ?? null,
  };
}

export async function consumeSnap(recipientRowId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("snap_recipients")
    .update({ status: "consumed" })
    .eq("id", recipientRowId);
}
