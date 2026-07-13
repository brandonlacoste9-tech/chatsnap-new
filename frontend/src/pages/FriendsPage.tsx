import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  acceptFriendRequest,
  listDiscoverableUsers,
  listFriendships,
  searchByUsername,
  sendFriendRequest,
  type FriendEdge,
} from "@/lib/friends";
import type { Profile } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { BottomChrome } from "@/components/BottomChrome";
import { useToast } from "@/components/Toast";
import { shareInvite } from "@/lib/media";
import { listStreaksForUser } from "@/lib/streaks";

export function FriendsPage() {
  const t = useT();
  const nav = useNavigate();
  const { toast } = useToast();
  const { user, demoMode, profile } = useAuth();
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Profile | null>(null);
  const [people, setPeople] = useState<Profile[]>([]);
  const [edges, setEdges] = useState<FriendEdge[]>([]);
  const [streaks, setStreaks] = useState<Map<string, number>>(new Map());
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const myId = user?.id ?? profile?.id;
  const myUsername = profile?.username;

  const reload = useCallback(async () => {
    if (!myId || demoMode) {
      setEdges([]);
      setPeople([]);
      setStreaks(new Map());
      return;
    }
    const [fEdges, disc, st] = await Promise.all([
      listFriendships(myId),
      listDiscoverableUsers(myId),
      listStreaksForUser(myId),
    ]);
    setEdges(fEdges);
    setStreaks(st);
    if (disc.error) setMsg(disc.error);
    // Hide people already friends / pending
    const taken = new Set(fEdges.map((e) => e.profile.id));
    setPeople(disc.users.filter((u) => !taken.has(u.id)));
  }, [myId, demoMode]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setFound(null);
    if (demoMode) {
      setMsg(t("setupBanner"));
      return;
    }
    setBusy(true);
    const res = await searchByUsername(q);
    setBusy(false);
    if (res.error) {
      setMsg(res.error);
      return;
    }
    if (!res.profile) {
      setMsg(
        `${t("notFound")} — ask them to sign up and pick a username first.`,
      );
      return;
    }
    if (res.profile.id === myId) {
      setMsg("That's you 👋 Share your @username with a friend instead.");
      return;
    }
    setFound(res.profile);
  }

  async function onRequest(theirId: string) {
    if (!myId) {
      setMsg("Not signed in");
      return;
    }
    setBusy(true);
    setMsg(null);
    const err = await sendFriendRequest(myId, theirId);
    setBusy(false);
    if (err) {
      setMsg(err);
      toast(err, "err");
    } else {
      setMsg(t("pending") + " ✓");
      toast(t("addedOk"), "ok");
      setFound(null);
      setQ("");
    }
    void reload();
  }

  async function onAccept(id: string) {
    setBusy(true);
    const err = await acceptFriendRequest(id);
    setBusy(false);
    if (err) {
      setMsg(err);
      toast(err, "err");
    } else {
      setMsg("Friends! ✓");
      toast(t("friendsOk"), "ok");
    }
    void reload();
  }

  async function copyUsername() {
    if (!myUsername) return;
    try {
      await navigator.clipboard.writeText(`@${myUsername}`);
      setCopied(true);
      toast(`@${myUsername}`, "ok");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg(`@${myUsername}`);
    }
  }

  async function onShareInvite() {
    if (!myUsername) return;
    const ok = await shareInvite(myUsername);
    toast(ok ? t("inviteCopied") : t("shareInvite"), ok ? "ok" : "info");
  }

  const accepted = edges.filter((e) => e.status === "accepted");
  const incoming = edges.filter(
    (e) => e.status === "pending" && e.direction === "incoming",
  );
  const outgoing = edges.filter(
    (e) => e.status === "pending" && e.direction === "outgoing",
  );

  return (
    <div className="app-root">
      <div className="page">
        <h2 style={{ marginBottom: 8 }}>{t("friends")}</h2>

        {demoMode && <div className="banner">{t("setupBanner")}</div>}

        {/* Your identity — so others can find you */}
        <div
          className="list-row"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: 10,
            marginBottom: 16,
            borderColor: "var(--accent)",
          }}
        >
          <div className="muted" style={{ fontSize: 12 }}>
            Your username — friends search this
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div className="avatar">
              {(myUsername?.[0] ?? "?").toUpperCase()}
            </div>
            <div style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>
              @{myUsername || "…"}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "0.5rem 0.9rem" }}
              onClick={() => void copyUsername()}
              disabled={!myUsername}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: "100%" }}
            onClick={() => void onShareInvite()}
            disabled={!myUsername}
          >
            {t("shareInvite")}
          </button>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Need a second person: open the app in another browser / phone,
            sign up, pick a username, then search @{myUsername || "you"} from
            there — or send your invite link.
          </p>
        </div>

        <h3 style={{ marginTop: 8 }}>{t("addFriend")}</h3>
        <form
          onSubmit={(e) => void onSearch(e)}
          style={{ display: "flex", gap: 8 }}
        >
          <input
            className="field"
            placeholder="@username"
            value={q}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || !q.trim()}
          >
            {t("search")}
          </button>
        </form>

        {found && (
          <div className="list-row" style={{ marginTop: 12 }}>
            <div className="avatar">
              {(found.username?.[0] ?? "?").toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <strong>@{found.username}</strong>
              <div className="muted">{found.display_name}</div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "0.5rem 0.9rem" }}
              disabled={busy}
              onClick={() => void onRequest(found.id)}
            >
              {t("sendRequest")}
            </button>
          </div>
        )}

        {msg && (
          <p
            style={{
              color: msg.includes("✓") ? "var(--ok)" : "var(--danger)",
              marginTop: 12,
            }}
          >
            {msg}
          </p>
        )}

        {/* One-tap discover */}
        {people.length > 0 && (
          <>
            <h3>On ChatSnap</h3>
            <p className="muted" style={{ marginTop: -8, fontSize: 13 }}>
              Tap Add to send a request
            </p>
            {people.map((p) => (
              <div key={p.id} className="list-row" style={{ marginBottom: 8 }}>
                <div className="avatar">
                  {(p.username?.[0] ?? "?").toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <strong>@{p.username}</strong>
                  <div className="muted">{p.display_name}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: "0.5rem 0.9rem" }}
                  disabled={busy}
                  onClick={() => void onRequest(p.id)}
                >
                  {t("addFriend")}
                </button>
              </div>
            ))}
          </>
        )}

        {incoming.length > 0 && (
          <>
            <h3>{t("friendRequests")}</h3>
            {incoming.map((e) => (
              <div key={e.friendshipId} className="list-row" style={{ marginBottom: 8 }}>
                <div className="avatar">
                  {(e.profile.username?.[0] ?? "?").toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>@{e.profile.username}</div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: "0.5rem 0.9rem" }}
                  disabled={busy}
                  onClick={() => void onAccept(e.friendshipId)}
                >
                  {t("accept")}
                </button>
              </div>
            ))}
          </>
        )}

        {outgoing.length > 0 && (
          <>
            <h3>{t("pending")}</h3>
            {outgoing.map((e) => (
              <div key={e.friendshipId} className="list-row" style={{ marginBottom: 8 }}>
                <div className="avatar">
                  {(e.profile.username?.[0] ?? "?").toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  @{e.profile.username}
                  <div className="muted">{t("pending")}…</div>
                </div>
              </div>
            ))}
          </>
        )}

        <h3>{t("friends")}</h3>
        {accepted.length === 0 && (
          <p className="muted">
            {t("noFriends")}
            <br />
            <span style={{ fontSize: 13 }}>
              Tip: create a 2nd account on another device, then search each
              other.
            </span>
          </p>
        )}
        {accepted.map((e) => (
          <div key={e.friendshipId} className="list-row" style={{ marginBottom: 8 }}>
            <div className="avatar">
              {(e.profile.username?.[0] ?? "?").toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <strong>@{e.profile.username}</strong>
              <div className="muted">{e.profile.display_name}</div>
            </div>
            {(streaks.get(e.profile.id) ?? 0) > 0 && (
              <span
                style={{
                  fontWeight: 800,
                  color: "var(--accent)",
                  marginRight: 8,
                }}
              >
                🔥 {streaks.get(e.profile.id)}
              </span>
            )}
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "0.45rem 0.75rem" }}
              onClick={() => nav(`/chat/${e.profile.id}`)}
            >
              💬
            </button>
          </div>
        ))}
      </div>
      <BottomChrome />
    </div>
  );
}
