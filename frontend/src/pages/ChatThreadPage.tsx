import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { BottomChrome } from "@/components/BottomChrome";

export function ChatThreadPage() {
  const { friendId } = useParams();
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const myId = user?.id;

  const load = useCallback(async () => {
    if (!myId || !friendId) return;
    const list = await listThread(myId, friendId);
    setMsgs(list);
    void markThreadRead(myId, friendId);

    // Resolve audio URLs
    const next: Record<string, string> = {};
    for (const m of list) {
      if (m.media_type === "audio" && m.media_path) {
        const url = await signedMediaUrl(m.media_path);
        if (url) next[m.id] = url;
      }
    }
    setAudioUrls((prev) => ({ ...prev, ...next }));
  }, [myId, friendId]);

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

    const poll = window.setInterval(() => void load(), 15000);
    return () => {
      window.clearInterval(poll);
      void supabase?.removeChannel(channel);
    };
  }, [load, myId, friendId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function onSendText() {
    if (!myId || !friendId || !text.trim()) return;
    setBusy(true);
    const err = await sendTextMessage(myId, friendId, text);
    setBusy(false);
    if (err) {
      toast(err, "err");
      return;
    }
    setText("");
    void load();
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
    const err = await sendAudioMessage(myId, friendId, blob);
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
                  border: `1px solid ${mine ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 16,
                  padding: "10px 12px",
                }}
              >
                {m.media_type === "text" && (
                  <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {m.body}
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
                <div
                  className="muted"
                  style={{ fontSize: 10, marginTop: 4, textAlign: mine ? "right" : "left" }}
                >
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
            onChange={(e) => setText(e.target.value)}
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
