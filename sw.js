
"use strict";

const CACHE_NAME = "vidora-shell-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
    })()
  );
});

// Display push notifications sent by the secure server.
self.addEventListener("push", (event) => {
  let payload = {
    title: "Vidora",
    body: "You have a new notification.",
    url: "/"
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const safeUrl =
    typeof payload.url === "string" &&
    payload.url.startsWith("/") &&
    !payload.url.startsWith("//")
      ? payload.url
      : "/";

  event.waitUntil(
    self.registration.showNotification(
      String(payload.title || "Vidora"),
      {
        body: String(payload.body || "You have a new notification."),
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        data: { url: safeUrl }
      }
    )
  );
});

// Open Vidora when the user taps a notification.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const destination = new URL(
    event.notification.data?.url || "/",
    self.location.origin
  );

  if (destination.origin !== self.location.origin) return;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      for (const client of windows) {
        if (client.url.startsWith(self.location.origin)) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(destination.href);
          }
          return;
        }
      }

      await self.clients.openWindow(destination.href);
    })()
  );
});
