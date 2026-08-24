/* Carpool service worker — notifications only.
 *
 * Deliberately no fetch handler and no caching: this app is worthless with
 * stale data, and a cache would happily serve yesterday's positions. Its one
 * job is to wake the phone when a driver is a minute from the door.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "Carpool", body: event.data ? event.data.text() : "Update" };
  }

  const title = payload.title || "Carpool";
  const options = {
    body: payload.body || "",
    icon: "/carpool/icon-192.png",
    badge: "/carpool/icon-192.png",
    // Same tag replaces an earlier notice for the same event instead of stacking.
    tag: payload.tag || payload.kind || "carpool",
    renotify: true,
    requireInteraction: payload.kind === "one_minute",
    vibrate: payload.kind === "one_minute" ? [200, 80, 200] : [120],
    data: { url: payload.url || "/carpool" }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/carpool";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes("/carpool") && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
