import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { listAcceptedFriends } from "@/lib/friends";
import {
  createGroup,
  listMyGroups,
  type ChatGroup,
} from "@/lib/groups";
import type { Profile } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { BottomChrome } from "@/components/BottomChrome";

export function GroupsPage() {
  const t = useT();
  const nav = useNavigate();
  const { toast } = useToast();
  const { user, demoMode } = useAuth();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id || demoMode) {
      setGroups([]);
      setFriends([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [g, f] = await Promise.all([
      listMyGroups(user.id),
      listAcceptedFriends(user.id),
    ]);
    setGroups(g);
    setFriends(f);
    setLoading(false);
  }, [user?.id, demoMode]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(id: string) {
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function onCreate() {
    if (!user?.id) return;
    if (picked.size < 1) {
      toast(t("needGroupMembers"), "err");
      return;
    }
    setBusy(true);
    const res = await createGroup({
      myId: user.id,
      name: name || t("newGroup"),
      memberIds: [...picked],
    });
    setBusy(false);
    if (res.error || !res.id) {
      toast(res.error ?? "Error", "err");
      return;
    }
    toast(t("groupCreated"), "ok");
    setCreating(false);
    setName("");
    setPicked(new Set());
    nav(`/group/${res.id}`);
  }

  return (
    <div className="app-root">
      <div className="page">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0 }}>{t("groups")}</h2>
          <button
            type="button"
            className="chip active"
            onClick={() => setCreating((c) => !c)}
          >
            {creating ? t("cancel") : `+ ${t("newGroup")}`}
          </button>
        </div>

        {demoMode && <div className="banner">{t("setupBanner")}</div>}

        {creating && (
          <div
            className="list-row"
            style={{
              flexDirection: "column",
              alignItems: "stretch",
              gap: 10,
              marginTop: 12,
              borderColor: "var(--accent)",
            }}
          >
            <input
              className="field"
              placeholder={t("groupName")}
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {t("pickMembers")}
            </p>
            {friends.length === 0 && (
              <p className="muted">{t("noFriends")}</p>
            )}
            {friends.map((f) => (
              <button
                key={f.id}
                type="button"
                className="list-row"
                style={{
                  width: "100%",
                  borderColor: picked.has(f.id) ? "var(--accent)" : undefined,
                }}
                onClick={() => toggle(f.id)}
              >
                <div className="avatar">
                  {(f.username?.[0] ?? "?").toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>@{f.username}</div>
                {picked.has(f.id) ? "✓" : ""}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void onCreate()}
            >
              {t("createGroup")}
            </button>
          </div>
        )}

        {loading && <p className="muted">{t("loading")}</p>}
        {!loading && groups.length === 0 && !creating && (
          <p className="muted" style={{ marginTop: 16 }}>
            {t("noGroups")}
          </p>
        )}

        <div className="stack" style={{ maxWidth: "none", marginTop: 16 }}>
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              className="list-row"
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
              onClick={() => nav(`/group/${g.id}`)}
            >
              <div
                className="avatar"
                style={{ background: "#2a2200", borderColor: "var(--accent)" }}
              >
                👥
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{g.name}</strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  {g.memberCount ?? "?"} {t("members")}
                  {g.lastBody ? ` · ${g.lastBody}` : ""}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          style={{ width: "100%", marginTop: 16 }}
          onClick={() => nav("/chats")}
        >
          ← {t("chats")}
        </button>
      </div>
      <BottomChrome />
    </div>
  );
}
