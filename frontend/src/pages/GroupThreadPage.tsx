import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  getGroupMeta,
  kickFromGroup,
  leaveGroup,
  listGroupMembers,
  listGroupMessages,
  renameGroup,
  sendGroupAudio,
  sendGroupText,
  type GroupMessage,
} from "@/lib/groups";
import type { Profile } from "@/lib/supabase";
import { signedMediaUrl } from "@/lib/messages";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { BottomChrome } from "@/components/BottomChrome";

export function GroupThreadPage() {
  const { groupId } = useParams();
  const t = useT();
  const nav = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [name, setName] = useState("…");
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [renameVal, setRenameVal] = useState("");
  const [msgs, setMsgs] = useState<GroupMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const myId = user?.id;
  const isOwner = Boolean(myId && createdBy === myId);

  const load = useCallback(async () => {
    if (!groupId) return;
    const list = await listGroupMessages(groupId);
    setMsgs(list);
    const next: Record<string, string> = {};
    for (const m of list) {
      if (m.media_type === "audio" && m.media_path) {
        const url = await signedMediaUrl(m.media_path);
        if (url) next[m.id] = url;
      }
    }
    setAudioUrls((prev) => ({ ...prev, ...next }));
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    void getGroupMeta(groupId).then((meta) => {
      if (meta) {
        setName(meta.name);
        setCreatedBy(meta.created_by);
        setRenameVal(meta.name);
      }
    });
    void listGroupMembers(groupId).then(setMembers);
  }, [groupId]);

  useEffect(() => {
    void load();
    if (!groupId || !supabase) return;
    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        () => void load(),
      )
      .subscribe();
    const poll = window.setInterval(() => void load(), 20000);
    return () => {
      window.clearInterval(poll);
      void supabase?.removeChannel(channel);
    };
  }, [load, groupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function onSend() {
    if (!myId || !groupId || !text.trim()) return;
    setBusy(true);
    const err = await sendGroupText(groupId, myId, text);
    setBusy(false);
    if (err) toast(err, "err");
    else {
      setText("");
      void load();
    }
  }

  async function startVoice() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.start(100);
      setRecording(true);
    } catch {
      toast(t("micError"), "err");
    }
  }

  async function stopVoice() {
    const rec = recorderRef.current;
    if (!rec || !myId || !groupId) return;
    setBusy(true);
    await new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
      rec.stop();
    });
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    setRecording(false);
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    if (blob.size < 200) {
      setBusy(false);
      return;
    }
    const err = await sendGroupAudio(groupId, myId, blob);
    setBusy(false);
    if (err) toast(err, "err");
    else void load();
  }

  return (
    <div className="app-root" style={{ height: "100%" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          paddingBottom: "calc(56px + var(--safe-bottom))",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderBottom: "1px solid var(--border)",
            background: "#0a0a0a",
          }}
        >
          <button type="button" className="chip" onClick={() => nav("/groups")}>
            ←
          </button>
          <div
            className="avatar"
            style={{ width: 36, height: 36, background: "#2a2200" }}
          >
            👥
          </div>
          <strong style={{ flex: 1 }}>{name}</strong>
          <button
            type="button"
            className="chip"
            onClick={() => setShowAdmin((s) => !s)}
            title={t("groupSettings")}
          >
            ⚙️
          </button>
        </header>

        {showAdmin && (
          <div
            className="list-row"
            style={{
              flexDirection: "column",
              alignItems: "stretch",
              gap: 10,
              margin: 12,
              borderColor: "var(--accent)",
            }}
          >
            <strong>{t("groupSettings")}</strong>
            {isOwner && (
              <>
                <input
                  className="field"
                  value={renameVal}
                  maxLength={40}
                  onChange={(e) => setRenameVal(e.target.value)}
                  placeholder={t("groupName")}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => {
                    if (!myId || !groupId) return;
                    setBusy(true);
                    void renameGroup(groupId, myId, renameVal).then((err) => {
                      setBusy(false);
                      if (err) toast(err, "err");
                      else {
                        setName(renameVal.trim());
                        toast(t("groupRenamed"), "ok");
                      }
                    });
                  }}
                >
                  {t("groupRename")}
                </button>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  {t("groupMembers")}
                </p>
                {members.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ flex: 1 }}>@{m.username}</span>
                    {m.id !== myId && (
                      <button
                        type="button"
                        className="chip"
                        disabled={busy}
                        onClick={() => {
                          if (!myId || !groupId) return;
                          if (!confirm(t("groupKickConfirm"))) return;
                          setBusy(true);
                          void kickFromGroup(groupId, myId, m.id).then(
                            (err) => {
                              setBusy(false);
                              if (err) toast(err, "err");
                              else {
                                toast(t("groupKicked"), "ok");
                                void listGroupMembers(groupId).then(
                                  setMembers,
                                );
                              }
                            },
                          );
                        }}
                      >
                        {t("groupKick")}
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => {
                if (!myId || !groupId) return;
                if (!confirm(t("groupLeaveConfirm"))) return;
                setBusy(true);
                void leaveGroup(groupId, myId).then((err) => {
                  setBusy(false);
                  if (err) toast(err, "err");
                  else {
                    toast(t("groupLeft"), "ok");
                    nav("/groups", { replace: true });
                  }
                });
              }}
            >
              {t("groupLeave")}
            </button>
          </div>
        )}

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {msgs.length === 0 && (
            <p className="muted" style={{ textAlign: "center", marginTop: 40 }}>
              {t("sayHi")}
            </p>
          )}
          {msgs.map((m) => {
            const mine = m.sender_id === myId;
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  background: mine ? "#2a2600" : "var(--bg-elevated)",
                  border: `1px solid ${mine ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 16,
                  padding: "10px 12px",
                }}
              >
                {!mine && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--accent)",
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    @{m.sender?.username ?? "…"}
                  </div>
                )}
                {m.media_type === "text" && (
                  <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {m.body}
                  </div>
                )}
                {m.media_type === "audio" && (
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      🎤 {t("voiceNote")}
                    </div>
                    {audioUrls[m.id] ? (
                      <audio controls src={audioUrls[m.id]} style={{ maxWidth: "100%" }} />
                    ) : (
                      <span className="muted">{t("loading")}</span>
                    )}
                  </div>
                )}
                <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            padding: 10,
            borderTop: "1px solid var(--border)",
            background: "#0a0a0a",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            className="chip"
            style={{
              background: recording ? "var(--danger)" : undefined,
              minWidth: 48,
            }}
            disabled={busy}
            onClick={() => void (recording ? stopVoice() : startVoice())}
          >
            {recording ? "⏹" : "🎤"}
          </button>
          <input
            className="field"
            style={{ flex: 1 }}
            placeholder={t("typeMessage")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: "0.7rem 1rem" }}
            disabled={busy || !text.trim()}
            onClick={() => void onSend()}
          >
            {t("send")}
          </button>
        </div>
      </div>
      <BottomChrome />
    </div>
  );
}
