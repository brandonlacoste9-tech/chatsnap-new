import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { countUnreadMessages } from "@/lib/messages";

export function useUnreadMessages(pollMs = 12000) {
  const { user, demoMode } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user?.id || demoMode) {
      setCount(0);
      return;
    }
    setCount(await countUnreadMessages(user.id));
  }, [user?.id, demoMode]);

  useEffect(() => {
    void refresh();
    if (!user?.id || demoMode) return;
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(id);
  }, [refresh, user?.id, demoMode, pollMs]);

  return { count, refresh };
}
