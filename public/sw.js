// Hand-written service worker (no Serwist/Workbox) -- @serwist/next's
// Turbopack support is still experimental, and this app's dev/build
// pipeline runs on Turbopack, so a hand-rolled worker avoids relying
// on an immature integration for a security-sensitive app.
//
// Scope is intentionally narrow: this worker ONLY makes the app
// installable and gives a friendly offline screen when navigation
// fails with no network. It never caches API calls, Supabase
// requests, or any authenticated page's HTML -- caching a dashboard
// or person page would risk showing stale or wrong documents, or
// content from a different signed-in session, which is unacceptable
// for a document-management app. Every navigation always goes to the
// network first; the cache is only a fallback.

const CACHE_NAME = "docvault-shell-v1";
const OFFLINE_URL = "/offline";

const APP_SHELL = [
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever intercept same-origin page navigations. Everything else
  // (API calls, Supabase Storage/Auth/Realtime, Edge Function calls,
  // Next.js data/static assets) goes straight to the network,
  // untouched -- this worker never caches or serves stale versions of
  // any of that.
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(() =>
      caches.open(CACHE_NAME).then((cache) => cache.match(OFFLINE_URL)),
    ),
  );
});
