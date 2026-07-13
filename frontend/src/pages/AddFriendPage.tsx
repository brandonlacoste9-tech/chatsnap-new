import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { searchByUsername, sendFriendRequest } from "@/lib/friends";
import type { Profile } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { BottomChrome } from "@/components/BottomChrome";

/** Deep link: /add/:username — auto-find and offer Add. */
export function AddFriendPage() {
  const { username } = useParams();
  const t = useT();
  const nav = useNavigate();
  const { toast } = useToast();
  const { user, profile, demoMode } = useAuth();
  const [target, setTarget] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!username) return;
    void (async () => {
      const res = await searchByUsername(username);
      if (res.error) setError(res.error);
      else if (!res.profile) setError(t("notFound"));
      else setTarget(res.profile);
    })();
  }, [username, t]);

  async function onAdd() {
    if (!target || !user?.id) return;
    if (target.id === user.id) {
      setError("That's you");
      return;
    }
    setBusy(true);
    const err = await sendFriendRequest(user.id, target.id);
    setBusy(false);
    if (err) {
      setError(err);
      toast(err, "err");
      return;
    }
    toast(t("addedOk"), "ok");
    nav("/friends", { replace: true });
  }

  return (
    <div className="app-root">
      <div className="page-center">
        <div className="brand" style={{ fontSize: 28 }}>
          Chat<span>Snap</span>
        </div>
        <h2 style={{ margin: 0 }}>{t("addThem")}</h2>

        {demoMode && <div className="banner">{t("setupBanner")}</div>}

        {target ? (
          <div className="stack" style={{ alignItems: "center" }}>
            <div className="avatar" style={{ width: 72, height: 72, fontSize: 28 }}>
              {(target.username?.[0] ?? "?").toUpperCase()}
            </div>
            <strong style={{ fontSize: 22 }}>@{target.username}</strong>
            <span className="muted">{target.display_name}</span>
            {profile?.username && (
              <p className="muted" style={{ fontSize: 13 }}>
                You: @{profile.username}
              </p>
            )}
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={busy || !user}
              onClick={() => void onAdd()}
            >
              {t("sendRequest")}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => nav("/friends")}
            >
              {t("friends")}
            </button>
          </div>
        ) : (
          <p className="muted">{error ?? t("loading")}</p>
        )}
      </div>
      <BottomChrome />
    </div>
  );
}
