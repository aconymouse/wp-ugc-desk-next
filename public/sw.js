self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { judul: event.data ? event.data.text() : "" };
  }
  const mac = /Macintosh|Mac OS X/.test(self.navigator.userAgent);
  const opsi = {
    body: data.isi || "",
    icon: mac && data.gambar ? data.gambar : "/icons/ikon-192.png",
    badge: "/icons/ikon-badge.png",
    lang: "id",
    data: { url: data.url || "/" },
  };
  if (data.gambar) opsi.image = data.gambar;
  if (data.tag) opsi.tag = data.tag;
  if (data.waktu) opsi.timestamp = data.waktu;
  event.waitUntil(self.registration.showNotification(data.judul || self.registration.scope, opsi));
});

async function bukaDiTabLama(tujuan) {
  const daftar = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const tab = daftar[0];
  if (!tab) return;
  await tab.focus();
  if ("navigate" in tab) await tab.navigate(tujuan).catch(() => null);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const tujuan = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients
      .openWindow(tujuan)
      .then((jendela) => jendela || bukaDiTabLama(tujuan))
      .catch(() => bukaDiTabLama(tujuan))
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const lama = event.oldSubscription;
      const kunci = lama && lama.options ? lama.options.applicationServerKey : null;
      if (!lama || !kunci) return;
      const baru =
        event.newSubscription ||
        (await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: kunci }));
      await fetch("/api/push/ganti/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lama: lama.endpoint, langganan: baru.toJSON() }),
      });
    })()
  );
});
