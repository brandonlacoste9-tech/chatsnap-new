import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BottomChrome } from "@/components/BottomChrome";
import { SwipeShell } from "@/components/SwipeShell";
import { AuthPage } from "@/pages/AuthPage";
import { UsernameGate } from "@/pages/UsernameGate";
import { FriendsPage } from "@/pages/FriendsPage";
import { MePage } from "@/pages/MePage";
import { SendToPage } from "@/pages/SendToPage";
import { ViewerPage } from "@/pages/ViewerPage";
import { useT } from "@/lib/i18n";

function RequireUser({ children }: { children: ReactNode }) {
  const { ready, session, profile, demoMode } = useAuth();
  const t = useT();
  if (!ready) {
    return (
      <div className="page-center">
        <p className="muted">{t("loading")}</p>
      </div>
    );
  }
  if (demoMode) {
    if (!profile?.username) return <Navigate to="/auth" replace />;
    return children;
  }
  if (!session) return <Navigate to="/auth" replace />;
  if (!profile?.username) return <Navigate to="/username" replace />;
  return children;
}

function AppShell() {
  return (
    <div className="app-root" style={{ height: "100%" }}>
      <div style={{ flex: 1, minHeight: 0, paddingBottom: "calc(56px + var(--safe-bottom))" }}>
        <SwipeShell />
      </div>
      <BottomChrome />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/username" element={<UsernameGate />} />
      <Route
        path="/app/*"
        element={
          <RequireUser>
            <AppShell />
          </RequireUser>
        }
      />
      <Route
        path="/friends"
        element={
          <RequireUser>
            <FriendsPage />
          </RequireUser>
        }
      />
      <Route
        path="/me"
        element={
          <RequireUser>
            <MePage />
          </RequireUser>
        }
      />
      <Route
        path="/send"
        element={
          <RequireUser>
            <SendToPage />
          </RequireUser>
        }
      />
      <Route
        path="/view/:recipientId"
        element={
          <RequireUser>
            <ViewerPage />
          </RequireUser>
        }
      />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
