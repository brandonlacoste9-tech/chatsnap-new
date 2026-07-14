import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BottomChrome } from "@/components/BottomChrome";
import { InboxWatcher } from "@/components/InboxWatcher";
import { useT } from "@/lib/i18n";

// Heavy / secondary screens — code-split
const AuthPage = lazy(() =>
  import("@/pages/AuthPage").then((m) => ({ default: m.AuthPage })),
);
const UsernameGate = lazy(() =>
  import("@/pages/UsernameGate").then((m) => ({ default: m.UsernameGate })),
);
const FriendsPage = lazy(() =>
  import("@/pages/FriendsPage").then((m) => ({ default: m.FriendsPage })),
);
const MePage = lazy(() =>
  import("@/pages/MePage").then((m) => ({ default: m.MePage })),
);
const SendToPage = lazy(() =>
  import("@/pages/SendToPage").then((m) => ({ default: m.SendToPage })),
);
const ViewerPage = lazy(() =>
  import("@/pages/ViewerPage").then((m) => ({ default: m.ViewerPage })),
);
const AddFriendPage = lazy(() =>
  import("@/pages/AddFriendPage").then((m) => ({ default: m.AddFriendPage })),
);
const EditSnapPage = lazy(() =>
  import("@/pages/EditSnapPage").then((m) => ({ default: m.EditSnapPage })),
);
const ChatsPage = lazy(() =>
  import("@/pages/ChatsPage").then((m) => ({ default: m.ChatsPage })),
);
const ChatThreadPage = lazy(() =>
  import("@/pages/ChatThreadPage").then((m) => ({ default: m.ChatThreadPage })),
);
const StoryViewerPage = lazy(() =>
  import("@/pages/StoryViewerPage").then((m) => ({
    default: m.StoryViewerPage,
  })),
);
const DiscoverPage = lazy(() =>
  import("@/pages/DiscoverPage").then((m) => ({ default: m.DiscoverPage })),
);
const GroupsPage = lazy(() =>
  import("@/pages/GroupsPage").then((m) => ({ default: m.GroupsPage })),
);
const GroupThreadPage = lazy(() =>
  import("@/pages/GroupThreadPage").then((m) => ({
    default: m.GroupThreadPage,
  })),
);
const MemoriesPage = lazy(() =>
  import("@/pages/MemoriesPage").then((m) => ({ default: m.MemoriesPage })),
);
const MapPage = lazy(() =>
  import("@/pages/MapPage").then((m) => ({ default: m.MapPage })),
);
const StickersPage = lazy(() =>
  import("@/pages/StickersPage").then((m) => ({ default: m.StickersPage })),
);
const SwipeShell = lazy(() =>
  import("@/components/SwipeShell").then((m) => ({ default: m.SwipeShell })),
);

function PageLoader() {
  const t = useT();
  return (
    <div className="page-center">
      <p className="muted">{t("loading")}</p>
    </div>
  );
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

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

function AddFriendGate() {
  const { username } = useParams();
  const { ready, session, profile, demoMode } = useAuth();
  if (!ready) return null;
  if (demoMode && profile?.username)
    return (
      <Lazy>
        <AddFriendPage />
      </Lazy>
    );
  if (!session) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ returnTo: `/add/${username ?? ""}` }}
      />
    );
  }
  if (!profile?.username) {
    return (
      <Navigate
        to="/username"
        replace
        state={{ returnTo: `/add/${username ?? ""}` }}
      />
    );
  }
  return (
    <Lazy>
      <AddFriendPage />
    </Lazy>
  );
}

function AppShell() {
  return (
    <div className="app-root" style={{ height: "100%" }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          paddingBottom: "calc(56px + var(--safe-bottom))",
        }}
      >
        <Lazy>
          <SwipeShell />
        </Lazy>
      </div>
      <BottomChrome />
    </div>
  );
}

function RU({ children }: { children: ReactNode }) {
  return (
    <RequireUser>
      <Lazy>{children}</Lazy>
    </RequireUser>
  );
}

export default function App() {
  return (
    <>
      <InboxWatcher />
      <Routes>
        <Route
          path="/auth"
          element={
            <Lazy>
              <AuthPage />
            </Lazy>
          }
        />
        <Route
          path="/username"
          element={
            <Lazy>
              <UsernameGate />
            </Lazy>
          }
        />
        <Route path="/add/:username" element={<AddFriendGate />} />
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
            <RU>
              <FriendsPage />
            </RU>
          }
        />
        <Route
          path="/chats"
          element={
            <RU>
              <ChatsPage />
            </RU>
          }
        />
        <Route
          path="/chat/:friendId"
          element={
            <RU>
              <ChatThreadPage />
            </RU>
          }
        />
        <Route
          path="/groups"
          element={
            <RU>
              <GroupsPage />
            </RU>
          }
        />
        <Route
          path="/group/:groupId"
          element={
            <RU>
              <GroupThreadPage />
            </RU>
          }
        />
        <Route
          path="/me"
          element={
            <RU>
              <MePage />
            </RU>
          }
        />
        <Route
          path="/discover"
          element={
            <RU>
              <DiscoverPage />
            </RU>
          }
        />
        <Route
          path="/memories"
          element={
            <RU>
              <MemoriesPage />
            </RU>
          }
        />
        <Route
          path="/map"
          element={
            <RU>
              <MapPage />
            </RU>
          }
        />
        <Route
          path="/stickers"
          element={
            <RU>
              <StickersPage />
            </RU>
          }
        />
        <Route
          path="/edit"
          element={
            <RU>
              <EditSnapPage />
            </RU>
          }
        />
        <Route
          path="/send"
          element={
            <RU>
              <SendToPage />
            </RU>
          }
        />
        <Route
          path="/view/:recipientId"
          element={
            <RU>
              <ViewerPage />
            </RU>
          }
        />
        <Route
          path="/story/:userId"
          element={
            <RU>
              <StoryViewerPage />
            </RU>
          }
        />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </>
  );
}
