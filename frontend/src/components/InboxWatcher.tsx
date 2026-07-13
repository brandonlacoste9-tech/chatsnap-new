import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { listInbox } from "@/lib/snaps";
import { notifySnap } from "@/lib/notifications";
import { useToast } from "@/components/Toast";
import { useT } from "@/lib/i18n";

/** Polls inbox; toasts + browser notify on new snaps. */
export function InboxWatcher() {
  const { user, demoMode } = useAuth();
  const { toast } = useToast();
  const t = useT();
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  useEffect(() => {
    if (!user?.id || demoMode) return;

    const tick = async () => {
      const items = await listInbox(user.id);
      if (!primed.current) {
        for (const it of items) seen.current.add(it.recipientId);
        primed.current = true;
        return;
      }
      for (const it of items) {
        if (seen.current.has(it.recipientId)) continue;
        seen.current.add(it.recipientId);
        const name = it.sender.username ?? "someone";
        toast(`${t("newSnapNotif")} @${name}`, "ok");
        notifySnap(name);
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 10000);
    return () => window.clearInterval(id);
  }, [user?.id, demoMode, toast, t]);

  return null;
}
