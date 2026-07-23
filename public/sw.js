self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Vista CRM";
  const options = {
    body: payload.body || "Bạn có thông báo mới.",
    icon: payload.icon || "/vista-icon.svg",
    data: { link: payload.link || "/" },
    tag: `${payload.event_type || "notification"}-${Date.now()}`,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  let targetUrl;
  try {
    const requestedUrl = new URL(event.notification.data?.link || "/", self.location.origin);
    targetUrl = requestedUrl.origin === self.location.origin ? requestedUrl.href : self.location.origin;
  } catch {
    targetUrl = self.location.origin;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      const visibleClient = clients.find((client) => "focus" in client);
      if (visibleClient) {
        if ("navigate" in visibleClient) {
          await visibleClient.navigate(targetUrl);
        }
        return visibleClient.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
