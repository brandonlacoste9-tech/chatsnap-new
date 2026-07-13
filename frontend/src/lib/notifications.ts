/** Browser notifications (when permission granted). No server push yet. */

export async function ensureNotifyPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

export function notifySnap(fromUsername: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return; // app already open

  try {
    const n = new Notification("ChatSnap", {
      body: `New snap from @${fromUsername}`,
      icon: "/favicon.svg",
      tag: "chatsnap-inbox",
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}

export function notifyFriendRequest(fromUsername: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification("ChatSnap", {
      body: `@${fromUsername} sent a friend request`,
      icon: "/favicon.svg",
      tag: "chatsnap-friend",
    });
  } catch {
    /* ignore */
  }
}
