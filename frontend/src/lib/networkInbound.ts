/** North Network deep-link intake for ChatSnap */

export const HUBLIFE_URL = "https://hublife.ca";

export type NetworkInbound = {
  fromNetwork: boolean;
  via: string | null;
  intent: string | null;
  campaign: string | null;
};

export function parseNetworkInbound(
  search = typeof window !== "undefined" ? window.location.search : "",
): NetworkInbound {
  const sp = new URLSearchParams(search);
  const from = sp.get("from");
  return {
    fromNetwork: from === "network" || from === "hublife",
    via: sp.get("via"),
    intent: sp.get("intent"),
    campaign: sp.get("utm_campaign"),
  };
}

export function hubLifeHomeUrl(via = "chatsnap"): string {
  const u = new URL(HUBLIFE_URL);
  u.searchParams.set("from", "network");
  u.searchParams.set("via", via);
  u.searchParams.set("utm_source", "north_network");
  u.searchParams.set("utm_medium", "cross_app");
  u.searchParams.set("utm_campaign", "chatsnap_home");
  return u.toString();
}

export function clearNetworkParamsFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const u = new URL(window.location.href);
    ["from", "via", "intent", "utm_source", "utm_medium", "utm_campaign"].forEach(
      (k) => u.searchParams.delete(k),
    );
    const next = u.pathname + (u.search ? u.search : "") + u.hash;
    window.history.replaceState({}, "", next || "/");
  } catch {
    /* ignore */
  }
}

/** Remember snap intent so camera can open after auth. */
export function stashSnapIntent() {
  try {
    sessionStorage.setItem("chatsnap_network_intent", "snap");
  } catch {
    /* ignore */
  }
}

export function consumeSnapIntent(): boolean {
  try {
    const v = sessionStorage.getItem("chatsnap_network_intent");
    if (v === "snap") {
      sessionStorage.removeItem("chatsnap_network_intent");
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
