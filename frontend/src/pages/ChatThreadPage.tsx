import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";
import {
  listThread,
  markThreadRead,
  sendAudioMessage,
  sendTextMessage,
  signedMediaUrl,
  type ChatMessage,
} from "@/lib/messages";
import { supabase } from "@/lib/supabase";
import {
  broadcastTyping,
  closeTypingChannel,
  openTypingChannel,
} from "@/lib/typing";
import {
  groupReactionEmojis,
  listMessageReactions,
  REACTION_EMOJIS,
  sendMessageReaction,
  type MsgReaction,
} from "@/lib/reactions";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { BottomChrome } from "@/components/BottomChrome";
import { translateText } from "@/lib/translate";
import { blockUser } from "@/lib/blocks";
import { reportUser } from "@/lib/safety";

type ReplySnapState = {
  replyToSnap?: { snapId?: string; snippet?: string };
};

export function ChatThreadPage() {
  const { friendId } = useParams();
  const location = useLocation();
  const t = useT();
  const nav = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [friendName, setFriendName] = useState("…");
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [ephemeral, setEphemeral] = useState(false);
  const [replySnap, setReplySnap] = useState<{
    snapId?: string;
    snippet: string;
  } | null>(() => {
    const st = location.state as ReplySnapState | null;
    if (st?.replyToSnap?.snippet) {
      return {
        snapId: st.replyToSnap.snapId,
        snippet: st.replyToSnap.snippet,
      };
    }
    return null;
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const typingChRef = useRef<RealtimeChannel | null>(null);
  const typingTimerRef = useRef<number | undefined>(undefined);
  const lastTypedRef = useRef(0);
  const [friendTyping, setFriendTyping] = useState(false);
  const [reacts, setReacts] = useState<Map<string, MsgReaction[]>>(new Map());
  const [reactMenu, setReactMenu] = useState<string | null>(null);

  const myId = user?.id;

  const load = useCallback(async () => {
    if (!myId || !friendId) return;
    const list = await listThread(myId, friendId);
    setMsgs(list);
    void markThreadRead(myId, friendId);

    const next: Record<string, string> = {};
    for (const m of list) {
      if (m.media_type === "audio" && m.media_path) {
        const url = await signedMediaUrl(m.media_path);
        if (url) next[m.id] = url;
      }
    }
    setAudioUrls((prev) => ({ ...prev, ...next }));

    const map = await listMessageReactions(list.map((m) => m.id));
    setReacts(map);
  }, [myId, friendId]);

  async function onReactMsg(messageId: string, emoji: string) {
    if (!myId) return;
    const err = await sendMessageReaction(messageId, myId, emoji);
    if (err) toast(err, "err");
    else {
      setReactMenu(null);
      void load();
    }
  }

  useEffect(() => {
    if (!friendId || !supabase) return;
    void supabase
      .from("profiles")
      .select("username")
      .eq("id", friendId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.username) setFriendName(data.username as string);
      });
  }, [friendId]);

  useEffect(() => {
    void load();
    if (!myId || !friendId || !supabase) return;

    // Realtime: new messages in this thread
    const channel = supabase
      .channel(`chat-${myId}-${friendId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const row = payload.new as ChatMessage;
          const relevant =
            (row.sender_id === myId && row.recipient_id === friendId) ||
            (row.sender_id === friendId && row.recipient_id === myId);
          if (relevant) void load();
        },
      )
      .subscribe();

    // Typing indicator channel
    typingChRef.current = openTypingChannel(myId, friendId, () => {
      setFriendTyping(true);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = window.setTimeout(
        () => setFriendTyping(false),
        2500,
      );
    });

    const poll = window.setInterval(() => void load(), 15000);
    return () => {
      window.clearInterval(poll);
      void supabase?.removeChannel(channel);
      closeTypingChannel(typingChRef.current);
      typingChRef.current = null;
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    };
  }, [load, myId, friendId]);

  function onTextChange(value: string) {
    setText(value);
    if (!myId || !value.trim()) return;
    const now = Date.now();
    if (now - lastTypedRef.current < 900) return;
    lastTypedRef.current = now;
    void broadcastTyping(typingChRef.current, myId);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function onSendText() {
    if (!myId || !friendId || !text.trim()) return;
    setBusy(true);
    const err = await sendTextMessage(myId, friendId, text, {
      ephemeral,
      replySnippet: replySnap?.snippet,
      replyToSnapId: replySnap?.snapId,
    });
    setBusy(false);
    if (err) {
      toast(err, "err");
      return;
    }
    setText("");
    setReplySnap(null);
    // clear router state so refresh doesn't re-attach reply
    nav(location.pathname, { replace: true, state: null });
    void load();
  }

  async function onTranslate(m: ChatMessage) {
    if (!m.body || translations[m.id]) {
      setTranslations((prev) => {
        const n = { ...prev };
        delete n[m.id];
        return n;
      });
      return;
    }
    const res = await translateText(m.body);
    if (!res) {
      toast(t("translateFail"), "err");
      return;
    }
    setTranslations((prev) => ({ ...prev, [m.id]: res.text }));
  }

  async function onBlock() {
    if (!myId || !friendId) return;
    if (!confirm(t("blockConfirm"))) return;
    const err = await blockUser(myId, friendId);
    if (err) toast(err, "err");
    else {
      toast(t("blocked"), "ok");
      nav("/chats", { replace: true });
    }
  }

  async function onReport() {
    if (!myId || !friendId) return;
    const reason = window.prompt(t("reportPrompt"));
    if (!reason || reason.trim().length < 3) return;
    const err = await reportUser({
      reporterId: myId,
      reportedId: friendId,
      reason,
      context: "chat",
    });
    if (err) toast(err, "err");
    else toast(t("reportSent"), "ok");
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
    if (!rec || !myId || !friendId) return;
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
    const err = await sendAudioMessage(myId, friendId, blob, { ephemeral });
    setBusy(false);
    if (err) toast(err, "err");
    else void load();
  }

  if (!friendId) return null;

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
          <button type="button" className="chip" onClick={() => nav("/chats")}>
            ←
          </button>
          <div className="avatar" style={{ width: 36, height: 36 }}>
            {(friendName[0] ?? "?").toUpperCase()}
          </div>
          <strong style={{ flex: 1 }}>@{friendName}</strong>
          <button
            type="button"
            className="chip"
            onClick={() => nav("/app")}
            title={t("camera")}
          >
            📷
          </button>
          <button
            type="button"
            className="chip"
            title={t("report")}
            onClick={() => void onReport()}
          >
            🚩
          </button>
          <button
            type="button"
            className="chip"
            title={t("block")}
            onClick={() => void onBlock()}
          >
            🚫
          </button>
        </header>

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
                  border: `1px solid ${
                    m.ephemeral
                      ? "#a855f7"
                      : mine
                        ? "var(--accent)"
                        : "var(--border)"
                  }`,
                  borderRadius: 16,
                  padding: "10px 12px",
                  opacity: m.ephemeral ? 0.95 : 1,
                }}
              >
                {m.ephemeral && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "#c4b5fd",
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    👻 {t("ephemeral")}
                  </div>
                )}
                {m.reply_snippet && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--accent)",
                      fontWeight: 700,
                      marginBottom: 6,
                      padding: "6px 8px",
                      borderLeft: "3px solid var(--accent)",
                      background: "rgba(255,252,0,0.08)",
                      borderRadius: 6,
                    }}
                  >
                    ↩ {t("replyingToSnap")}: {m.reply_snippet}
                  </div>
                )}
                {m.media_type === "text" && (
                  <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {m.body}
                    {translations[m.id] && (
                      <div
                        style={{
                          marginTop: 6,
                          paddingTop: 6,
                          borderTop: "1px solid rgba(255,255,255,0.12)",
                          fontStyle: "italic",
                          opacity: 0.9,
                        }}
                      >
                        🌐 {translations[m.id]}
                      </div>
                    )}
                  </div>
                )}
                {m.media_type === "audio" && (
                  <div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                      🎤 {t("voiceNote")}
                    </div>
                    {audioUrls[m.id] ? (
                      <audio controls src={audioUrls[m.id]} style={{ maxWidth: "100%" }} />
                    ) : (
                      <span className="muted">{t("loading")}</span>
                    )}
                  </div>
                )}

                {/* Reaction chips */}
                {groupReactionEmojis(reacts.get(m.id), myId).length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 4,
                      marginTop: 6,
                    }}
                  >
                    {groupReactionEmojis(reacts.get(m.id), myId).map((g) => (
                      <button
                        key={g.emoji}
                        type="button"
                        onClick={() => void onReactMsg(m.id, g.emoji)}
                        style={{
                          border: g.mine
                            ? "1px solid var(--accent)"
                            : "1px solid var(--border)",
                          background: g.mine
                            ? "rgba(255,252,0,0.15)"
                            : "rgba(0,0,0,0.35)",
                          borderRadius: 999,
                          padding: "2px 8px",
                          fontSize: 13,
                          cursor: "pointer",
                          color: "#fff",
                        }}
                      >
                        {g.emoji}
                        {g.count > 1 ? ` ${g.count}` : ""}
                      </button>
                    ))}
                  </div>
                )}

                {reactMenu === m.id && (
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      marginTop: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {REACTION_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        className="chip"
                        style={{ fontSize: 16, minWidth: 36, height: 36 }}
                        onClick={() => void onReactMsg(m.id, e)}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}

                <div
                  className="muted"
                  style={{
                    fontSize: 10,
                    marginTop: 4,
                    display: "flex",
                    gap: 8,
                    justifyContent: mine ? "flex-end" : "flex-start",
                    alignItems: "center",
                  }}
                >
                  <span>
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setReactMenu((cur) => (cur === m.id ? null : m.id))
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: 700,
                      padding: 0,
                    }}
                    title={t("react")}
                  >
                    {reactMenu === m.id ? "✕" : "☺"}
                  </button>
                  {m.media_type === "text" && m.body && (
                    <button
                      type="button"
                      onClick={() => void onTranslate(m)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--accent)",
                        fontSize: 11,
                        cursor: "pointer",
                        fontWeight: 700,
                        padding: 0,
                      }}
                    >
                      {translations[m.id] ? t("hideTranslation") : "EN⇄FR"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {friendTyping && (
          <div
            className="muted"
            style={{
              padding: "4px 14px",
              fontSize: 12,
              fontStyle: "italic",
              borderTop: "1px solid #1a1a1a",
            }}
          >
            @{friendName} {t("isTyping")}
          </div>
        )}

        {replySnap && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderTop: "1px solid var(--border)",
              background: "#1a1600",
            }}
          >
            <div style={{ flex: 1, fontSize: 13, minWidth: 0 }}>
              <strong style={{ color: "var(--accent)" }}>
                ↩ {t("replyingToSnap")}
              </strong>
              <div
                className="muted"
                style={{
                  fontSize: 12,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {replySnap.snippet}
              </div>
            </div>
            <button
              type="button"
              className="chip"
              onClick={() => {
                setReplySnap(null);
                nav(location.pathname, { replace: true, state: null });
              }}
            >
              ✕
            </button>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            padding: 10,
            borderTop: "1px solid var(--border)",
            background: "#0a0a0a",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className={`chip ${ephemeral ? "active" : ""}`}
            title={t("ephemeralHint")}
            onClick={() => setEphemeral((e) => !e)}
            style={
              ephemeral
                ? { background: "#6b21a8", color: "#fff", borderColor: "#a855f7" }
                : undefined
            }
          >
            👻
          </button>
          <button
            type="button"
            className="chip"
            style={{
              background: recording ? "var(--danger)" : undefined,
              color: recording ? "#fff" : undefined,
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
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSendText();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: "0.7rem 1rem" }}
            disabled={busy || !text.trim()}
            onClick={() => void onSendText()}
          >
            {t("send")}
          </button>
        </div>
      </div>
      <BottomChrome />
    </div>
  );
}
