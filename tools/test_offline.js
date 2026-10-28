/* Offline: service worker routing + offline-first gist sync.
 *   node tools/test_offline.js
 */
const path = require("path"), fs = require("fs"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
let p = 0, f = 0;
const t = (n, c, x) => { console.log((c ? "  ok   " : "  FAIL ") + n + (c ? "" : "  " + (x || ""))); c ? p++ : f++; };

/* ============ Part A: the service worker against a fake network ============ */
async function swTests() {
  const ORIGIN = "https://user.github.io";
  const store = new Map();                       // the Cache Storage
  let online = true, fetched = [];
  const body = u => "BODY:" + u;
  class Res {
    constructor(b, o = {}) { this.b = b; this.status = o.status || 200; this.ok = this.status < 400; this.type = "basic"; }
    clone() { return new Res(this.b, { status: this.status }); }
    text() { return Promise.resolve(this.b); }
  }
  const norm = r => (typeof r === "string" ? new URL(r, ORIGIN + "/DSA/").href : r.url);
  const cache = {
    put: (r, res) => { store.set(norm(r), res); return Promise.resolve(); },
    match: (r, o) => {
      let k = norm(r);
      if (o && o.ignoreSearch) k = k.split("?")[0];
      for (const [key, v] of store) if ((o && o.ignoreSearch ? key.split("?")[0] : key) === k) return Promise.resolve(v);
      return Promise.resolve(undefined);
    }
  };
  const handlers = {};
  const sandbox = {
    self: { addEventListener: (n, h) => (handlers[n] = h), location: { origin: ORIGIN },
            skipWaiting: () => Promise.resolve(), clients: { claim: () => Promise.resolve() } },
    caches: { open: () => Promise.resolve(cache), keys: () => Promise.resolve(["pattern-ledger-v0", "pattern-ledger-v1", "other-app"]),
              delete: k => { sandbox._deleted.push(k); return Promise.resolve(true); } },
    _deleted: [],
    fetch: (r) => {
      const u = norm(r); fetched.push(u);
      if (!online) return Promise.reject(new TypeError("offline"));
      if (u.includes("fonts.googleapis.com/css2"))
        return Promise.resolve(new Res("@font-face{src:url(https://fonts.gstatic.com/s/plex/a.woff2)}"));
      return Promise.resolve(new Res(body(u)));
    },
    Response: Res, URL, Promise, setTimeout, console
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(ROOT + "/docs/sw.js", "utf8"), sandbox);

  // install
  let waited; handlers.install({ waitUntil: pr => (waited = pr) }); await waited;
  const keys = [...store.keys()];
  for (const want of ["/DSA/", "/DSA/index.html", "/DSA/data/curriculum.json", "/DSA/manifest.webmanifest",
                      "marked.min.js", "highlight.min.js", "python.min.js", "fonts.googleapis.com/css2"])
    t("install caches " + want, keys.some(k => k.includes(want)));
  t("install caches the font files named in the font CSS", keys.some(k => k.includes("fonts.gstatic.com/s/plex/a.woff2")));

  // activate removes only our older caches
  handlers.activate({ waitUntil: pr => (waited = pr) }); await waited;
  t("activate drops old app caches only", sandbox._deleted.join() === "pattern-ledger-v0", sandbox._deleted.join());

  const fire = (url, mode) => {
    let resp = null;
    handlers.fetch({ request: { url, method: "GET", mode: mode || "cors" }, respondWith: r => (resp = r) });
    return resp;
  };

  // github api is never intercepted
  t("api.github.com is not intercepted", fire("https://api.github.com/gists/abc") === null);
  t("POSTs are not intercepted",
    (() => { let r = null; handlers.fetch({ request: { url: ORIGIN + "/DSA/x", method: "PATCH" }, respondWith: x => (r = x) }); return r === null; })());

  // online: network-first refreshes the cached data
  store.delete(ORIGIN + "/DSA/data/curriculum.json");
  let res = await fire(ORIGIN + "/DSA/data/curriculum.json");
  t("online: data comes from the network", res && res.b.includes("curriculum.json"));
  t("online: and is written to the cache", store.has(ORIGIN + "/DSA/data/curriculum.json"));

  // offline: same requests answered from cache
  online = false;
  res = await fire(ORIGIN + "/DSA/data/curriculum.json");
  t("offline: data answered from cache", res && res.ok && res.b.includes("curriculum.json"));
  res = await fire(ORIGIN + "/DSA/data/curriculum.json?cache-bust=1");
  t("offline: query strings still hit the cache", res && res.ok);
  res = await fire(ORIGIN + "/DSA/", "navigate");
  t("offline: the page opens", res && res.ok);
  res = await fire(ORIGIN + "/DSA/analytics", "navigate");
  t("offline: any in-app URL falls back to index.html", res && res.ok && res.b.includes("index.html"), res && res.b);
  res = await fire("https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js");
  t("offline: libraries served from cache", res && res.ok);
  res = await fire(ORIGIN + "/DSA/never-seen.png");
  t("offline: uncached asset gets a clean 503, not a hang", res && res.status === 503);
}

/* ============ Part B: offline-first gist sync ============ */
async function syncTests() {
  const src = fs.readFileSync(ROOT + "/docs/index.html", "utf8");
  function grab(n) {
    const i = src.indexOf("function " + n + "(");
    if (i < 0) throw new Error("missing " + n);
    let d = 0;
    for (let k = src.indexOf("{", i); k < src.length; k++) {
      if (src[k] === "{") d++; else if (src[k] === "}") { d--; if (!d) return src.slice(i, k + 1); }
    }
  }
  const mem = {};
  global.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  let online = true, remote = { state: {}, custom: { topics: [], groups: [], items: [] } }, patches = 0, toasts = [];
  global.navigator = { get onLine() { return online; } };
  const GIST_FILE = "pattern-ledger.json", GH_USER_KEY = "pattern-ledger-gh-user";
  let GH = { token: "x", gistId: "G1", user: { login: "me" } }, STATE = {}, CUSTOM = { topics: [], groups: [], items: [] };
  function ghApi(pathname, opts) {
    if (!online) return Promise.reject({ code: "offline" });
    if (opts && opts.method === "PATCH") {
      patches++;
      remote = JSON.parse(opts.body.files[GIST_FILE].content);
      return Promise.resolve({});
    }
    return Promise.resolve({ files: { [GIST_FILE]: { content: JSON.stringify({ state: remote.state, custom: remote.custom }) } } });
  }
  function toast(m) { toasts.push(m); } function renderAccount() {} function rebuildData() {} function render() {}
  for (const n of ["emptyCustom", "st", "setItem", "mirrorKey", "mirrorRead", "mirrorWrite", "mergeStates",
                   "mergeCustom", "isOffline", "ghParse", "ghFiles", "ghPayload", "gistStore"]) eval(grab(n));

  // --- merge rules
  const m = mergeStates({ a: { done: true, t: 5 }, b: { done: true, t: 9 } }, { a: { done: false, t: 7 }, b: { done: false, t: 3 }, c: { done: true, t: 1 } });
  t("merge: newer local edit wins", m.a.done === false);
  t("merge: newer remote edit wins", m.b.done === true);
  t("merge: items only on one side are kept", !!m.c);
  const mc = mergeCustom({ items: [{ id: "x", title: "remote" }] }, { items: [{ id: "x", title: "local" }, { id: "y" }] });
  t("custom merge: union by id, local wins a clash", mc.items.length === 2 && mc.items[0].title === "local");

  // --- online first load seeds the device copy
  remote.state = { p1: { done: true, t: 100 } };
  let s = gistStore();
  let st0 = await s.load();
  t("online load reads the gist", st0.p1 && st0.p1.done);
  t("online load seeds the device copy", !!mirrorRead() && mirrorRead().dirty === false);

  // --- go offline, keep working
  STATE = st0; online = false;
  setItem("p2", { done: true });
  const ok = await s.bulk();
  t("offline save reports success (kept on device)", ok === true);
  t("offline save marks the copy dirty", mirrorRead().dirty === true);
  t("offline save did not reach GitHub", patches === 0);
  t("you are told it is offline, once", toasts.filter(x => /Offline/.test(x)).length === 1);
  setItem("p3", { done: true }); setItem("p5", { done: true, note: "offline here" }); await s.bulk();
  t("second offline save does not repeat the toast", toasts.filter(x => /Offline/.test(x)).length === 1);

  // --- reload while still offline: data comes from the device copy
  s = gistStore();
  const offlineLoad = await s.load();
  t("offline reload shows your progress", offlineLoad.p1 && offlineLoad.p2 && offlineLoad.p3);
  t("offline reload flags the store as offline", s.offline === true);

  // --- meanwhile another device edited the gist
  remote.state.p9 = { done: true, t: Date.now() + 5000 };            // newer, elsewhere
  remote.state.p1 = { done: false, t: 50 };                         // older than ours
  remote.state.p5 = { done: false, note: "edited later elsewhere", t: Date.now() + 5000 };  // same item, newer
  STATE = offlineLoad;

  // --- back online: sync merges both sides and pushes
  online = true;
  const synced = await s.sync();
  t("reconnect syncs", synced === true && patches === 1, "patches " + patches);
  t("your offline ticks reached the gist", remote.state.p2 && remote.state.p2.done && remote.state.p3.done);
  t("the other device's newer edit survived", remote.state.p9 && remote.state.p9.done);
  t("an older remote edit did not overwrite yours", remote.state.p1.done === true);
  t("same item edited on both sides: newer one wins", remote.state.p5.note === "edited later elsewhere",
    JSON.stringify(remote.state.p5));
  t("device copy clean after sync", mirrorRead().dirty === false);
  t("you are told it synced", toasts.some(x => /Back online/.test(x)));

  // --- crash-safe: dirty copy left from last session is merged on next online load
  online = false; STATE = Object.assign({}, remote.state); setItem("p4", { done: true }); await gistStore().bulk();
  online = true; patches = 0;
  s = gistStore();
  const later = await s.load();
  t("leftover offline edits merged on next online visit", later.p4 && later.p4.done);
  t("and flagged to be pushed after load", s.pendingPush === true);
}

(async () => {
  console.log("service worker:"); await swTests();
  console.log("offline sync:"); await syncTests();
  console.log("\n" + p + " passed, " + f + " failed");
  process.exit(f ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
