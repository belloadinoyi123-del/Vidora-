/* Vidora Service Worker – minimal push support */
self.addEventListener("push", (event) => {
  let data = { title: "Vidora", body: "You have a new notification" };
  try {
    if (event.data) data = event.data.json();
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title || "Vidora", {
      body: data.body || "New activity on the network",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: data.url || "/"
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      if (list.length > 0) {
        list[0].focus();
        return;
      }
      return clients.openWindow(event.notification.data || "/");
    })
  );
});
