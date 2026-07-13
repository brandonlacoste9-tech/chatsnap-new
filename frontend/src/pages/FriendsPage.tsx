import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  acceptFriendRequest,
  listFriendships,
  searchByUsername,
  sendFriendRequest,
  type FriendEdge,
} from "@/lib/friends";
import type { Profile } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { BottomChrome } from "@/components/BottomChrome";

export function FriendsPage() {
  const t = useT();
  const { user, demoMode, profile } = useAuth();
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Profile | null | undefined>(undefined);
  const [edges, setEdges] = useState<FriendEdge[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const myId = user?.id ?? profile?.id;

  const reload = useCallback(async () => {
    if (!myId || demoMode) {
      setEdges([]);
      return;
    }
    setEdges(await listFriendships(myId));
  }, [myId, demoMode]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (demoMode) {
      setMsg(t("setupBanner"));
      return;
    }
    const p = await searchByUsername(q);
    setFound(p);
    if (!p) setMsg(t("notFound"));
  }

  async function onRequest(theirId: string) {
    if (!myId) return;
    const err = await sendFriendRequest(myId, theirId);
    setMsg(err ?? t("pending"));
    void reload();
  }

  async function onAccept(id: string) {
    const err = await acceptFriendRequest(id);
    if (err) setMsg(err);
    void reload();
  }

  const accepted = edges.filter((e) => e.status === "accepted");
  const incoming = edges.filter(
    (e) => e.status === "pending" && e.direction === "incoming",
  );

  return (
    <div className="app-root">
      <div className="page">
        <h2>{t("friends")}</h2>
        {demoMode && <div className="banner">{t("setupBanner")}</div>}

        <form
          onSubmit={(e) => void onSearch(e)}
          style={{ display: "flex", gap: 8 }}
        >
          <input
            className="field"
            placeholder="@username"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
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
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "0.5rem 0.9rem" }}
              onClick={() => void onRequest(found.id)}
            >
              {t("sendRequest")}
            </button>
          </div>
        )}

        {msg && <p className="muted">{msg}</p>}

        {incoming.length > 0 && (
          <>
            <h3>{t("friendRequests")}</h3>
            {incoming.map((e) => (
              <div key={e.friendshipId} className="list-row">
                <div className="avatar">
                  {(e.profile.username?.[0] ?? "?").toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>@{e.profile.username}</div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: "0.5rem 0.9rem" }}
                  onClick={() => void onAccept(e.friendshipId)}
                >
                  {t("accept")}
                </button>
              </div>
            ))}
          </>
        )}

        <h3>{t("friends")}</h3>
        {accepted.length === 0 && <p className="muted">{t("noFriends")}</p>}
        {accepted.map((e) => (
          <div key={e.friendshipId} className="list-row">
            <div className="avatar">
              {(e.profile.username?.[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <strong>@{e.profile.username}</strong>
              <div className="muted">{e.profile.display_name}</div>
            </div>
          </div>
        ))}
      </div>
      <BottomChrome />
    </div>
  );
}
