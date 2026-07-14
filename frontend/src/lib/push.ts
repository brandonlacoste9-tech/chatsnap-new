import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim() || "";

export function isPushConfigured(): boolean {
  return (
    Boolean(VAPID_PUBLIC) &&
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  return Notification.permission;
}

/** Subscribe device + store endpoint for this user. */
export async function subscribeWebPush(
  userId: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  if (!isPushConfigured()) return "Push not configured";
  if (!("Notification" in window)) return "Notifications unsupported";

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "Permission denied";

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        VAPID_PUBLIC,
      ) as BufferSource,
    });
  }

  const json = sub.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) return "Invalid subscription";

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: "user_id,endpoint" },
  );
  return error?.message ?? null;
}

export async function unsubscribeWebPush(
  userId: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", endpoint);
    }
  } catch (e) {
    return e instanceof Error ? e.message : "Unsubscribe failed";
  }
  return null;
}

/**
 * Ask backend to notify recipient user ids (e.g. after sending a snap).
 * Best-effort — fails silently if function not deployed / no VAPID secret.
 */
export async function notifyUsersPush(opts: {
  userIds: string[];
  title: string;
  body: string;
  url?: string;
}): Promise<void> {
  if (!opts.userIds.length) return;
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) return;

  try {
    await fetch("/.netlify/functions/push-notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userIds: opts.userIds,
        title: opts.title,
        body: opts.body,
        url: opts.url ?? "/app/inbox",
      }),
    });
  } catch {
    /* offline / no function */
  }
}
