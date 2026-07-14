/* Push handlers injected into the Workbox service worker */
/* global self, clients */

self.addEventListener("push", (event) => {
  let data = { title: "ChatSnap", body: "Something new", url: "/app" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    try {
      data.body = event.data?.text() || data.body;
    } catch {
      /* ignore */
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "ChatSnap", {
      body: data.body || "",
      icon: "/pwa-192.png",
      badge: "/favicon-32.png",
      tag: data.tag || "chatsnap",
      data: { url: data.url || "/app" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/app";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
