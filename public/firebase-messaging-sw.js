self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "CooperWeb", body: "New update", url: "/" };
  try {
    const payload = event.data ? event.data.json() : {};
    data = { title: payload.title ?? data.title, body: payload.body ?? data.body, url: payload.url ?? data.url };
  } catch {
    const text = event.data ? event.data.text() : "";
    if (text) data.body = text;
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(self.clients.openWindow(url));
});
