import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { countPendingInbox } from "@/lib/snaps";

/** Live-ish count of unopened snaps for tab badge. */
export function useInboxCount(pollMs = 15000) {
  const { user, demoMode } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user?.id || demoMode) {
      setCount(0);
      return;
    }
    setCount(await countPendingInbox(user.id));
  }, [user?.id, demoMode]);

  useEffect(() => {
    void refresh();
    if (!user?.id || demoMode) return;
    const id = window.setInterval(() => void refresh(), pollMs);
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh, user?.id, demoMode, pollMs]);

  return { count, refresh };
}
