/* Moving problems and sections, plus the theme switcher.
 *
 *   node tools/test_move.js
 *
 * Runs the real page script against the real curriculum.json under the same
 * minimal DOM stub as test_ui.js, and reaches the page's own functions through
 * a hook appended to the script body.
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

function mkEl(id) {
  return {
    _id: id, _html: "", _l: {}, hidden: false, value: "", textContent: "",
    style: {}, dataset: {}, _attrs: {}, className: "",
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener(t, f) { (this._l[t] ||= []).push(f); },
    focus() {}, click() {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
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
const root = mkEl("html");
global.document = {
  documentElement: root, body: mkEl("body"), activeElement: null,
  querySelector: get, querySelectorAll: () => [],
  getElementById: id => { const e = get("#" + id); e.id = id; return e; },
  createElement: t => mkEl(t),
  addEventListener() {}
};
const mem = {};
global.localStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; }
};
let osDark = false;
const mqListeners = [];
global.CSS = { escape: s => String(s) };
global.window = {
  matchMedia: () => ({ get matches() { return osDark; }, addEventListener: (t, f) => mqListeners.push(f) }),
  CSS: global.CSS, localStorage: global.localStorage
};
global.location = { hash: "" };
global.Blob = class {};
global.URL = require("url").URL;
global.URL.createObjectURL = () => "";
global.URL.revokeObjectURL = () => {};
global.FileReader = class { readAsText() {} };
global.fetch = u => String(u).includes("curriculum.json")
  ? Promise.resolve({ ok: true, status: 200,
      json: () => Promise.resolve(JSON.parse(fs.readFileSync(path.join(ROOT, "docs/data/curriculum.json"), "utf8"))) })
  : Promise.reject(new Error("unexpected fetch " + u));

process.on("unhandledRejection", e => { console.error("UNHANDLED", e && e.stack || e); process.exit(1); });

const src = fs.readFileSync(path.join(ROOT, "docs/index.html"), "utf8");
const m = src.match(/<script>\n\(function\(\)\{([\s\S]*)\}\)\(\);\n<\/script>/);
if (!m) { console.error("could not find the page script"); process.exit(1); }
const HOOK = `
globalThis.__T={
  get DATA(){return DATA;}, get CUSTOM(){return CUSTOM;}, set CUSTOM(v){CUSTOM=v;},
  get HOME(){return HOME;}, get route(){return route;},
  moveProblem:moveProblem, moveSection:moveSection, locateProblem:locateProblem,
  locateGroup:locateGroup, isMoved:isMoved, sectionMoved:sectionMoved, rebuildData:rebuildData,
  persistCustom:persistCustom, mergeCustom:mergeCustom, setItem:setItem, st:st,
  topicCount:topicCount, problemRow:problemRow, setMode:setMode, setPalette:setPalette,
  renderPaletteMenu:renderPaletteMenu, PALETTES:PALETTES, customSize:customSize,
  emptyCustom:emptyCustom, editForm:editForm, sectionForm:sectionForm, setLayout:setLayout,
  LAYOUTS:LAYOUTS, set menuTab(v){menuTab=v;}, render:render, set route(v){route=v;},
  captureModal:function(){ openModal=function(html,fn){__T.lastHtml=html;__T.lastSubmit=fn;}; }
};`;
new Function(m[1] + HOOK)();
const T = globalThis.__T;

let pass = 0, fail = 0;
const t = (n, c, x) => { console.log((c ? "  ok   " : "  FAIL ") + n + (c ? "" : "   " + (x || ""))); c ? pass++ : fail++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const topic = id => T.DATA.topics.find(x => x.id === id);
const inGroup = (gid, id) => { const l = T.locateGroup(gid); return !!l && l.group.items.some(i => i.id === id); };
const saved = () => JSON.parse(mem["pattern-ledger-custom-v1"] || "{}");

(async () => {
  await wait(1000);
  t("page booted", !!T.DATA && T.DATA.topics.length > 5);

  // ---------- move one generated problem ----------
  const fromG = topic("arrays").problems[0];
  const it = fromG.items[0];
  const toG = topic("strings").problems[1];
  const arraysBefore = T.topicCount(topic("arrays")).p.total;
  const stringsBefore = T.topicCount(topic("strings")).p.total;
  T.setItem(it.id, { done: true, note: "keep me" });

  T.moveProblem(it.id, "strings", toG.id);
  T.persistCustom("x");
  t("problem lands in the target section", inGroup(toG.id, it.id));
  t("problem leaves its old section", !inGroup(fromG.id, it.id));
  t("old module count drops by one", T.topicCount(topic("arrays")).p.total === arraysBefore - 1);
  t("new module count rises by one", T.topicCount(topic("strings")).p.total === stringsBefore + 1);
  t("tick and note travel with it", T.st(it.id).done === true && T.st(it.id).note === "keep me");
  t("row shows a moved tag", T.problemRow(T.locateProblem(it.id).item).includes("tag moved"));
  t("row has one Edit button", T.problemRow(T.locateProblem(it.id).item).includes('data-edit="' + it.id + '"') && !T.problemRow(T.locateProblem(it.id).item).includes('data-linkedit'));
  t("move is saved with custom content", (saved().moves || []).some(x => x.id === it.id && x.groupId === toG.id));
  t("HOME remembers the original section", T.HOME[it.id].groupId === fromG.id);

  // a reload rebuilds from the stored copy
  T.CUSTOM = saved(); T.rebuildData();
  t("move survives a reload", inGroup(toG.id, it.id) && !inGroup(fromG.id, it.id));

  // put back: the override is rewritten to home, not deleted
  T.moveProblem(it.id, "arrays", fromG.id); T.persistCustom("x");
  t("put back returns it home", inGroup(fromG.id, it.id) && !T.isMoved(it.id));
  t("put back keeps an override pointing home (merge-safe)",
    saved().moves.filter(x => x.id === it.id).length === 1 && saved().moves.find(x => x.id === it.id).groupId === fromG.id);

  // an older synced copy that still holds the move must not win over the newer put-back
  const older = { topics: [], groups: [], items: [], moves: [{ id: it.id, topicId: "strings", groupId: toG.id, t: 1 }], secMoves: [] };
  const merged = T.mergeCustom(older, T.CUSTOM);
  t("merge prefers this device's put-back", merged.moves.find(x => x.id === it.id).groupId === fromG.id);
  t("merge keeps moves from both sides",
    T.mergeCustom({ moves: [{ id: "a" }] }, { moves: [{ id: "b" }] }).moves.length === 2);
  t("merge keeps section moves from both sides",
    T.mergeCustom({ secMoves: [{ id: "a" }] }, { secMoves: [{ id: "b" }] }).secMoves.length === 2);
  // two moves at once: the second must not disturb the first
  const a2 = fromG.items[2], a3 = fromG.items[3];
  T.moveProblem(a2.id, "strings", toG.id); T.moveProblem(a3.id, "strings", toG.id); T.persistCustom("x");
  t("two moved problems both stay moved", inGroup(toG.id, a2.id) && inGroup(toG.id, a3.id));
  T.moveProblem(a2.id, "arrays", fromG.id); T.moveProblem(a3.id, "arrays", fromG.id); T.persistCustom("x");
  t("customSize counts moves", T.customSize({ moves: [{ id: "a" }], secMoves: [{ id: "b" }] }) === 2);

  // a target that disappears (notes renamed a section) leaves the problem at home
  T.CUSTOM.moves.push({ id: fromG.items[1].id, topicId: "strings", groupId: "no-such-section", t: Date.now() });
  T.rebuildData();
  t("move to a missing section is ignored", inGroup(fromG.id, fromG.items[1].id));

  // ---------- move a whole section ----------
  const secG = topic("linked_list").problems[0];
  const n = secG.items.length;
  T.moveSection(secG.id, "arrays"); T.persistCustom("x");
  const loc = T.locateGroup(secG.id);
  t("section lands in the target module", loc && loc.topic.id === "arrays");
  t("section keeps all its problems", loc && loc.group.items.length === n);
  t("section is gone from its old module", !topic("linked_list").problems.some(g => g.id === secG.id));
  t("section shows as moved", T.sectionMoved(secG.id));
  T.moveSection(secG.id, "linked_list"); T.persistCustom("x");
  t("section put back", T.locateGroup(secG.id).topic.id === "linked_list" && !T.sectionMoved(secG.id));

  // a problem moved into a section that is then moved follows the section
  T.moveProblem(it.id, "linked_list", secG.id);
  T.moveSection(secG.id, "strings"); T.persistCustom("x");
  t("problem follows its moved section", T.locateProblem(it.id).topic.id === "strings");
  T.moveSection(secG.id, "linked_list"); T.moveProblem(it.id, "arrays", fromG.id); T.persistCustom("x");

  // ---------- custom problems move by editing themselves ----------
  T.CUSTOM.items.push({ id: "prob-test", title: "Mine", topicId: "arrays", groupId: null, custom: true, source: "custom" });
  T.rebuildData();
  T.moveProblem("prob-test", "strings", toG.id); T.persistCustom("x");
  const ci = T.CUSTOM.items.find(x => x.id === "prob-test");
  t("custom problem moves by its own fields", ci.topicId === "strings" && ci.groupId === toG.id && inGroup(toG.id, "prob-test"));
  t("custom problem adds no override", !T.CUSTOM.moves.some(x => x.id === "prob-test"));

  // old saved data without the new fields still loads
  T.CUSTOM = { topics: [], groups: [], items: [] }; T.rebuildData();
  t("custom data from before moves existed still loads", Array.isArray(T.CUSTOM.moves) && Array.isArray(T.CUSTOM.secMoves));

  // ---------- themes ----------
  const html = src;
  for (const p of T.PALETTES) {
    if (p.id === "slate") continue;
    t("palette " + p.id + " has light and dark CSS",
      html.includes(`:root[data-palette="${p.id}"]{`) && html.includes(`:root[data-palette="${p.id}"][data-scheme="dark"]{`));
  }
  t("eleven palettes", T.PALETTES.length === 11);
  T.setMode("dark");
  t("dark mode sets data-scheme", root.getAttribute("data-scheme") === "dark" && mem["pl-theme"] === "dark");
  T.setMode("light");
  t("light mode sets data-scheme", root.getAttribute("data-scheme") === "light");
  T.setMode("auto");
  t("auto clears the saved mode", root.getAttribute("data-theme") === null && !("pl-theme" in mem));
  osDark = true; mqListeners.forEach(f => f());
  t("auto follows the OS switching to dark", root.getAttribute("data-scheme") === "dark");
  osDark = false; mqListeners.forEach(f => f());
  t("auto follows the OS back to light", root.getAttribute("data-scheme") === "light");
  T.setPalette("retro"); T.renderPaletteMenu();
  const menu = get("#paletteMenu").innerHTML;
  t("menu lists the new themes", ["Modern", "Retro", "Pop", "Synthwave", "Terminal", "Ink", "Ocean"].every(x => menu.includes(x)));
  t("menu offers Auto mode", menu.includes('data-mode="auto"'));
  t("palette persists", root.getAttribute("data-palette") === "retro" && mem["pl-palette"] === "retro");
  t("no CSS keys on the old data-theme for colours", !/\[data-theme="(dark|light)"\]\{/.test(html));

  // ---------- one editor per problem ----------
  T.captureModal();
  const form = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
  const P = topic("arrays").problems[0], q = P.items[4];
  T.editForm(q.id);
  t("editor has link and section parts", T.lastHtml.includes("Link</div>") && T.lastHtml.includes("Section</div>"));
  t("editor for a generated problem has no details or delete", !T.lastHtml.includes("Details</div>") && !T.lastHtml.includes("data-delproblem"));
  let err = T.lastSubmit(form({ url: "not a url with spaces", topic: "arrays", group: P.id, newGroup: "" }));
  t("bad link is refused", typeof err === "string" && !T.st(q.id).link);
  T.editForm(q.id);
  err = T.lastSubmit(form({ url: "https://www.geeksforgeeks.org/x", topic: "strings", group: "__new__", newGroup: "" }));
  t("new section without a name is refused, and nothing changes", typeof err === "string" && !T.st(q.id).link && inGroup(P.id, q.id));
  T.editForm(q.id);
  err = T.lastSubmit(form({ url: "geeksforgeeks.org/x", topic: "arrays", group: P.id, newGroup: "" }));
  t("link-only edit saves the link", err === null && T.st(q.id).link === "https://geeksforgeeks.org/x" && inGroup(P.id, q.id));
  T.editForm(q.id);
  err = T.lastSubmit(form({ url: "https://geeksforgeeks.org/x", topic: "strings", group: "__new__", newGroup: "Odd ones" }));
  const newSec = T.locateProblem(q.id).group;
  t("editor moves into a new section", err === null && newSec.title === "Odd ones" && T.locateProblem(q.id).topic.id === "strings");
  t("link kept through the move", T.st(q.id).link === "https://geeksforgeeks.org/x");
  T.editForm(q.id);
  t("moved problem offers put back", T.lastHtml.includes('data-moveback="' + q.id + '"'));
  T.moveProblem(q.id, "arrays", P.id); T.persistCustom("x");

  T.CUSTOM.items.push({ id: "prob-ed", title: "Mine2", topicId: "arrays", groupId: null, custom: true, source: "custom" });
  T.rebuildData();
  T.editForm("prob-ed");
  t("editor for my problem has details and delete", T.lastHtml.includes("Details</div>") && T.lastHtml.includes("data-delproblem"));
  const g2 = T.locateProblem("prob-ed").group.id;
  err = T.lastSubmit(form({ title: "Renamed", tier: "core", lc: "42", url: "", topic: "arrays", group: g2, newGroup: "" }));
  const ce = T.CUSTOM.items.find(x => x.id === "prob-ed");
  t("details save", err === null && ce.title === "Renamed" && ce.tier === "core" && ce.lc === "42");
  t("a number with no link points at a LeetCode search", ce.url === "https://leetcode.com/problemset/?search=42");
  T.editForm("prob-ed");
  t("my problem needs a name", typeof T.lastSubmit(form({ title: " ", tier: "", lc: "", url: "", topic: "arrays", group: g2, newGroup: "" })) === "string");

  // ---------- section editor: rename and move ----------
  const S = topic("strings").problems[0], oldTitle = S.title;
  T.sectionForm(S.id);
  err = T.lastSubmit(form({ title: "Counting tricks", topic: "strings" }));
  t("generated section can be renamed", err === null && T.locateGroup(S.id).group.title === "Counting tricks" && T.sectionMoved(S.id));
  T.CUSTOM = saved(); T.rebuildData();
  t("rename survives a reload", T.locateGroup(S.id).group.title === "Counting tricks");
  T.sectionForm(S.id);
  err = T.lastSubmit(form({ title: "Counting tricks", topic: "arrays" }));
  t("renamed section can then move, keeping its name",
    T.locateGroup(S.id).topic.id === "arrays" && T.locateGroup(S.id).group.title === "Counting tricks");
  T.moveSection(S.id, "strings", oldTitle); T.persistCustom("x");
  t("put back restores name and module", T.locateGroup(S.id).group.title === oldTitle && T.locateGroup(S.id).topic.id === "strings" && !T.sectionMoved(S.id));

  // ---------- layouts ----------
  t("eight layouts", T.LAYOUTS.length === 8 && T.LAYOUTS[0].id === "classic");
  for (const l of T.LAYOUTS.slice(1))
    t("layout " + l.id + " has its own CSS", (src.match(new RegExp('\\[data-layout="' + l.id + '"\\]', "g")) || []).length >= 10);
  T.menuTab = "layout"; T.renderPaletteMenu();
  const lm = get("#paletteMenu").innerHTML;
  t("menu has Colours and Layout tabs", lm.includes('data-menutab="colours"') && lm.includes('data-menutab="layout"'));
  t("layout tab lists every view", T.LAYOUTS.every((l, i) => lm.includes("View " + (i + 1) + " · " + l.label)));
  t("layout tab hides the palette grid", !lm.includes("pal-grid"));
  T.setLayout("funky");
  t("layout applies and persists", root.getAttribute("data-layout") === "funky" && mem["pl-layout"] === "funky");
  T.menuTab = "colours"; T.renderPaletteMenu();
  t("colours tab still lists palettes", get("#paletteMenu").innerHTML.includes("pal-grid") && get("#paletteMenu").innerHTML.includes("Synthwave"));

  // the entry animation runs on navigation, not on the re-render a tick causes
  const v = get("#view"); let adds = 0;
  v.classList = { add: c => { if (c === "enter") adds++; }, remove() {}, toggle() {}, contains() { return false; } };
  T.route = { view: "topic", topic: "heaps", tab: "problems" }; T.render(); const afterNav = adds;
  T.render(); T.render();
  t("navigation starts the entry animation", afterNav === 1);
  t("re-render on the same page does not replay it", adds === 1);
  t("problem rows render an Edit button", v.innerHTML.includes("data-edit=") && v.innerHTML.includes("data-editsec="));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
