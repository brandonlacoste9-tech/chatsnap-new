import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BottomChrome } from "@/components/BottomChrome";
import { useToast } from "@/components/Toast";
import { useT } from "@/lib/i18n";
import {
  createHive,
  joinHiveByCode,
  leaveHive,
  listHiveMembers,
  listMyHives,
  normalizeHiveCode,
  type Hive,
} from "@/lib/hives";
import { sendFriendRequest } from "@/lib/friends";
import type { Profile } from "@/lib/supabase";

export function HivesPage() {
  const t = useT();
  const { user, demoMode } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [hives, setHives] = useState<Hive[]>([]);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [active, setActive] = useState<Hive | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);

  const myId = user?.id;

  const reload = useCallback(async () => {
    if (!myId || demoMode) {
      setHives([]);
      return;
    }
    const { hives: list, error } = await listMyHives(myId);
    if (error) toast(error, "err");
    setHives(list);
  }, [myId, demoMode, toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!active) {
      setMembers([]);
      return;
    }
    void listHiveMembers(active.id).then(({ members: m, error }) => {
      if (error) toast(error, "err");
      setMembers(m);
    });
  }, [active, toast]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!myId) return;
    setBusy(true);
    const { hive, error } = await createHive(myId, name);
    setBusy(false);
    if (error || !hive) {
      toast(error ?? t("hiveCreateFail"), "err");
      return;
    }
    setName("");
    toast(t("hiveCreated"), "ok");
    setActive(hive);
    void reload();
  }

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    if (!myId) return;
    setBusy(true);
    const { hive, error } = await joinHiveByCode(myId, code);
    setBusy(false);
    if (error || !hive) {
      toast(error ?? t("hiveJoinFail"), "err");
      return;
    }
    setCode("");
    toast(t("hiveJoined"), "ok");
    setActive(hive);
    void reload();
  }

  async function onLeave(hive: Hive) {
    if (!myId) return;
    setBusy(true);
    const err = await leaveHive(myId, hive.id);
    setBusy(false);
    if (err) toast(err, "err");
    else {
      toast(t("hiveLeft"), "ok");
      if (active?.id === hive.id) setActive(null);
      void reload();
    }
  }

  async function onAddFriend(theirId: string) {
    if (!myId) return;
    setBusy(true);
    const err = await sendFriendRequest(myId, theirId);
    setBusy(false);
    if (err) toast(err, "err");
    else toast(t("addedOk"), "ok");
  }

  async function onCopy(c: string) {
    try {
      await navigator.clipboard.writeText(c);
      toast(t("hiveCodeCopied"), "ok");
    } catch {
      toast(c, "info");
    }
  }

  return (
    <div className="app-root">
      <div className="page">
        <h2 style={{ margin: "0 0 4px" }}>🐝 {t("hives")}</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
          {t("hivesHint")}
        </p>

        {demoMode && (
          <div className="banner" style={{ marginBottom: 12 }}>
            {t("hivesDemo")}
          </div>
        )}

        <form className="stack" style={{ maxWidth: "none" }} onSubmit={(e) => void onCreate(e)}>
          <h3 style={{ margin: 0 }}>{t("hiveCreate")}</h3>
          <input
            className="field"
            placeholder={t("hiveNamePh")}
            value={name}
            maxLength={48}
            disabled={demoMode || busy}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={demoMode || busy || name.trim().length < 2}
          >
            {t("hiveCreate")}
          </button>
        </form>

        <form
          className="stack"
          style={{ maxWidth: "none", marginTop: 20 }}
          onSubmit={(e) => void onJoin(e)}
        >
          <h3 style={{ margin: 0 }}>{t("hiveJoin")}</h3>
          <input
            className="field"
            placeholder={t("hiveCodePh")}
            value={code}
            maxLength={12}
            disabled={demoMode || busy}
            onChange={(e) => setCode(normalizeHiveCode(e.target.value))}
            autoCapitalize="characters"
          />
          <button
            type="submit"
            className="btn btn-ghost"
            disabled={demoMode || busy || code.length < 4}
          >
            {t("hiveJoin")}
          </button>
        </form>

        <h3 style={{ marginTop: 24 }}>{t("myHives")}</h3>
        {!hives.length && (
          <p className="muted" style={{ fontSize: 14 }}>
            {t("noHives")}
          </p>
        )}
        <div className="stack" style={{ maxWidth: "none", gap: 8 }}>
          {hives.map((h) => (
            <button
              key={h.id}
              type="button"
              className="list-row"
              style={{
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                borderColor:
                  active?.id === h.id ? "var(--accent)" : undefined,
              }}
              onClick={() => setActive(h)}
            >
              <div style={{ flex: 1 }}>
                <strong>{h.name}</strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  {t("hiveCode")}: <code>{h.code}</code>
                </div>
              </div>
              <span className="muted">→</span>
            </button>
          ))}
        </div>

        {active && (
          <section style={{ marginTop: 24 }}>
            <div
              className="list-row"
              style={{
                flexDirection: "column",
                alignItems: "stretch",
                gap: 10,
                borderColor: "var(--accent)",
              }}
            >
              <strong style={{ fontSize: 18 }}>{active.name}</strong>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <code
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    letterSpacing: 2,
                    color: "var(--accent)",
                  }}
                >
                  {active.code}
                </code>
                <button
                  type="button"
                  className="chip"
                  onClick={() => void onCopy(active.code)}
                >
                  {t("copy")}
                </button>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                {t("hiveShareHint")}
              </p>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => void onLeave(active)}
              >
                {t("hiveLeave")}
              </button>
            </div>

            <h3 style={{ marginTop: 16 }}>{t("hiveMembers")}</h3>
            <div className="stack" style={{ maxWidth: "none" }}>
              {members.map((m) => {
                const isMe = m.id === myId;
                return (
                  <div key={m.id} className="list-row">
                    <div className="avatar">
                      {(m.username?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <strong>@{m.username}</strong>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {m.display_name}
                      </div>
                    </div>
                    {!isMe && (
                      <button
                        type="button"
                        className="chip"
                        disabled={busy}
                        onClick={() => void onAddFriend(m.id)}
                      >
                        {t("addFriend")}
                      </button>
                    )}
                    {isMe && (
                      <span className="muted" style={{ fontSize: 12 }}>
                        {t("you")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <button
          type="button"
          className="btn btn-ghost"
          style={{ marginTop: 24, width: "100%" }}
          onClick={() => nav("/friends")}
        >
          {t("goFriends")}
        </button>
      </div>
      <BottomChrome />
    </div>
  );
}
