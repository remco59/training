// Verhoog VERSION als je bestanden wijzigt, dan krijgt iedereen de nieuwe versie.
var VERSION = "enkel-v3";
var SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-180.png",
  "img/stand.webp", "img/calf.webp", "img/band.webp", "img/circles.webp", "img/hop.webp"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Cache eerst (werkt offline), op de achtergrond verversen.
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.indexOf("/api/") === 0) return; // API nooit cachen
  var ok = url.origin === location.origin || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!ok) return;
  e.respondWith(caches.open(VERSION).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
