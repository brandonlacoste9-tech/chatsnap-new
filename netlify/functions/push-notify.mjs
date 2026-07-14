/**
 * Web Push notify — POST { userIds, title, body, url }
 * Auth: Bearer <supabase user access token>
 * Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 *      SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY)
 */
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", ...cors },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const vapidPublic =
    process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:hello@chatsnap.app";
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY;

  if (!vapidPublic || !vapidPrivate) {
    return json(503, { error: "VAPID keys not configured" });
  }
  if (!supabaseUrl || !anonKey) {
    return json(503, { error: "Supabase not configured" });
  }

  const authHdr =
    event.headers.authorization || event.headers.Authorization || "";
  const token = authHdr.startsWith("Bearer ") ? authHdr.slice(7) : "";
  if (!token) return json(401, { error: "Unauthorized" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const userIds = Array.isArray(body.userIds)
    ? body.userIds.filter((id) => typeof id === "string").slice(0, 40)
    : [];
  const title = String(body.title || "ChatSnap").slice(0, 80);
  const text = String(body.body || "").slice(0, 200);
  const url = String(body.url || "/app").slice(0, 200);
  if (!userIds.length) return json(400, { error: "userIds required" });

  const sb = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userData?.user) return json(401, { error: "Invalid token" });

  const { data: subs, error: subErr } = await sb.rpc("push_subs_for_notify", {
    p_ids: userIds,
  });
  if (subErr) return json(500, { error: subErr.message });
  if (!subs?.length) return json(200, { sent: 0, message: "No subscriptions" });

  webpush.setVapidDetails(subject, vapidPublic, vapidPrivate);

  const payload = JSON.stringify({ title, body: text, url, tag: "chatsnap" });
  let sent = 0;
  const dead = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload,
        );
        sent += 1;
      } catch (e) {
        const code = e?.statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
      }
    }),
  );

  // Best-effort cleanup of dead endpoints (own row only via RLS — skip if not own)
  // Dead subs for friends: ignore; user will re-subscribe on their device.

  return json(200, { sent, dead: dead.length });
}
