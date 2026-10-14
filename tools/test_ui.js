/* Headless smoke test for docs/index.html.
 *
 *   node tools/test_ui.js
 *
 * Runs the real page script against the real curriculum.json under a minimal DOM
 * stub, then drives the actual event handlers. No browser, no dependencies.
 * Catches the class of bug that leaves the page stuck on "Loading your curriculum".
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const listeners = {};
function mkEl(id) {
  return {
    _id: id, _html: "", _l: {}, hidden: false, value: "", textContent: "",
    style: {}, dataset: {}, _attrs: {}, className: "",
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener(t, f) { (this._l[t] ||= []).push(f); },
    focus() {}, click() {},
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k] ?? null; },
    removeAttribute(k) { delete this._attrs[k]; },
    querySelector() { return mkEl("q"); }, querySelectorAll() { return []; },
    closest() { return null; }, appendChild() {}, remove() {}, setSelectionRange() {},
    get innerHTML() { return this._html; }, set innerHTML(v) { this._html = v; },
    get parentNode() { return mkEl("p"); }
  };
}
const els = {};
const get = s => els[s] || (els[s] = mkEl(s));

global.document = {
  documentElement: mkEl("html"), body: mkEl("body"), activeElement: null,
  querySelector: get, querySelectorAll: () => [],
  getElementById: id => { const e = get("#" + id); e.id = id; return e; },
  createElement: t => mkEl(t),
  addEventListener(t, f) { (listeners[t] ||= []).push(f); }
};
const mem = {};
global.localStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; }
};
global.CSS = { escape: s => String(s) };
global.window = { matchMedia: () => ({ matches: false }), CSS: global.CSS, localStorage: global.localStorage };
global.location = { hash: "" };
global.Blob = class {};
global.URL = require("url").URL;
global.URL.createObjectURL = () => "";
global.URL.revokeObjectURL = () => {};
global.FileReader = class { readAsText() {} };
global.fetch = u => String(u).includes("curriculum.json")
  ? Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve(JSON.parse(
        fs.readFileSync(path.join(ROOT, "docs/data/curriculum.json"), "utf8")))
    })
  : Promise.reject(new Error("unexpected fetch " + u));

process.on("unhandledRejection", e => {
  console.error("\nUNHANDLED REJECTION (this is what breaks the page):");
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});

const src = fs.readFileSync(path.join(ROOT, "docs/index.html"), "utf8");
const m = src.match(/<script>\n\(function\(\)\{([\s\S]*)\}\)\(\);\n<\/script>/);
if (!m) { console.error("could not find the page script in docs/index.html"); process.exit(1); }
try { new Function(m[1])(); }
catch (e) { console.error("SYNC THROW:", e.stack); process.exit(1); }

const fire = (t, target) => (listeners[t] || []).forEach(f => f({ target, preventDefault() {}, key: target.key }));
const tgt = a => ({
  id: a.id || "", className: a.className || "", classList: { contains: () => false },
  getAttribute: k => a[k] ?? null, setAttribute() {}, textContent: "",
  closest: sel => {
    const k = sel.replace(/[[\]]/g, "");
    return a[k] != null
      ? { getAttribute: x => a[x] ?? null, setAttribute() {}, textContent: "", className: a.className || "", classList: { contains: () => false } }
      : null;
  }
});
const clickBtn = id => {
  const el = get("#" + id); el.id = id;
  const ev = { target: Object.assign(Object.create(el), { id, closest: () => null, classList: { contains: () => false }, className: "" }), preventDefault() {} };
  (el._l.click || []).forEach(f => f(ev));
  (listeners.click || []).forEach(f => f(ev));
};
const view = () => get("#view").innerHTML;
const wait = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const t = (n, c, x) => { console.log((c ? "  ok   " : "  FAIL ") + n + (c ? "" : "   " + (x || ""))); c ? pass++ : fail++; };

(async () => {
  await wait(1200);

  t("page renders (not stuck loading)", !view().includes("Loading your curriculum") && view().includes("Progress"), view().slice(0, 90));
  t("dual progress bar has both zones", view().includes("zone zc") && view().includes("zone zp"));
  t("build stamp shown", /data built/.test(view()) || !/generatedAt/.test(src), view().slice(0, 240));
  t("clear-filters hidden at rest", get("#clearFilters").hidden === true);

  clickBtn("fTodo"); await wait(60);
  t("dashboard filter spans all modules", view().includes("across every module"));
  t("clear-filters appears", get("#clearFilters").hidden === false);
  clickBtn("clearFilters"); await wait(60);
  t("clear restores dashboard", view().includes("Progress"));

  fire("input", { id: "search", value: "dijkstra", getAttribute: () => null });
  await wait(320);
  t("global search finds a late module", view().includes("Results for") && view().includes("Graphs"));
  fire("input", { id: "search", value: "", getAttribute: () => null });
  await wait(320);

  fire("click", tgt({ "[data-nav]": "topic", "data-nav": "topic", "data-id": "heaps" }));
  await wait(40);
  t("topic view renders", view().includes("Heaps"));
  t("module reset button present", view().includes('data-modreset="heaps"'));
  t("add problem button present", view().includes('data-addproblem="heaps"'));
  t("reset sits after add (right edge)", view().indexOf("data-addproblem") < view().indexOf("data-modreset"));
  t("every problem row has a link control", !/class="row"/.test(view()) || view().includes("data-linkedit="));

  clickBtn("fTodo"); await wait(60);
  t("module filter stays in module", view().includes("Heaps") && !view().includes("across every module"));
  clickBtn("clearFilters"); await wait(60);

  fire("click", tgt({ id: "paletteBtn" })); await wait(20);
  t("theme menu builds", get("#paletteMenu").innerHTML.includes("Indigo"));
  fire("click", tgt({ "[data-palette]": "forest", "data-palette": "forest", className: "menu-item" }));
  await wait(20);
  t("palette applies and persists", document.documentElement.getAttribute("data-palette") === "forest" && mem["pl-palette"] === "forest");

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
