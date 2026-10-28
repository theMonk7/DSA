/* Pattern Ledger service worker - makes the site usable with no network.
 *
 *   page + curriculum.json   network-first, cache fallback (so updates still arrive)
 *   CDN scripts + web fonts  cache-first (pinned versions, never change)
 *   api.github.com           never touched (carries your token and private data)
 *
 * Your progress is not cached here: it lives in localStorage on this device and,
 * when connected, in your gist. This file only keeps the app itself loadable.
 */
var CACHE = "pattern-ledger-v1";
var NETWORK_TIMEOUT_MS = 4000;

var SHELL = [
  "./",
  "index.html",
  "data/curriculum.json",
  "manifest.webmanifest",
  "icon.svg"
];
var STATIC = [
  "https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/python.min.js"
];
var FONT_CSS = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap";

var CACHE_FIRST_HOSTS = ["cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"];
var NEVER_CACHE_HOSTS = ["api.github.com", "gist.githubusercontent.com"];

/* Cache each entry on its own, so one unreachable URL cannot fail the install. */
function put(cache, url) {
  return fetch(url, { cache: "reload" }).then(function (res) {
    if (res && (res.ok || res.type === "opaque")) return cache.put(url, res.clone()).then(function () { return res; });
    return null;
  }).catch(function () { return null; });
}

/* The font stylesheet names its .woff2 files; cache those too so text renders
   in the right faces offline, not just the fallback stack. */
function cacheFonts(cache) {
  return put(cache, FONT_CSS).then(function (res) {
    if (!res) return;
    return res.text().then(function (css) {
      var urls = [], re = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g, m;
      while ((m = re.exec(css))) urls.push(m[1]);
      return Promise.all(urls.map(function (u) { return put(cache, u); }));
    });
  });
}

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return Promise.all(SHELL.concat(STATIC).map(function (u) { return put(cache, u); }))
      .then(function () { return cacheFonts(cache); });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) {
      return k.indexOf("pattern-ledger-") === 0 && k !== CACHE;
    }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function timeout(ms) {
  return new Promise(function (_, reject) { setTimeout(function () { reject(new Error("timeout")); }, ms); });
}

function networkFirst(request, fallbackUrl) {
  return caches.open(CACHE).then(function (cache) {
    return Promise.race([fetch(request), timeout(NETWORK_TIMEOUT_MS)]).then(function (res) {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    }).catch(function () {
      return cache.match(request, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        return fallbackUrl ? cache.match(fallbackUrl) : undefined;
      }).then(function (hit) {
        return hit || new Response("Offline and this page is not cached yet.", {
          status: 503, headers: { "Content-Type": "text/plain" }
        });
      });
    });
  });
}

function cacheFirst(request) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request).then(function (hit) {
      if (hit) return hit;
      return fetch(request).then(function (res) {
        if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone());
        return res;
      });
    });
  });
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  if (NEVER_CACHE_HOSTS.indexOf(url.hostname) >= 0) return;   // let the browser handle it

  if (CACHE_FIRST_HOSTS.indexOf(url.hostname) >= 0) {
    event.respondWith(cacheFirst(req));
    return;
  }
  if (url.origin === self.location.origin) {
    var nav = req.mode === "navigate";
    event.respondWith(networkFirst(req, nav ? "index.html" : null));
  }
});
