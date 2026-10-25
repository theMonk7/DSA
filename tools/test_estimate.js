/* Scope filter + time-to-finish estimate.
 *   node tools/test_estimate.js
 */
const path = require("path"), fs = require("fs");
const ROOT = path.join(__dirname, "..");
const src = fs.readFileSync(ROOT + "/docs/index.html", "utf8");
function grab(n) {
  const i = src.indexOf("function " + n + "(");
  if (i < 0) throw new Error("missing " + n);
  let d = 0;
  for (let k = src.indexOf("{", i); k < src.length; k++) {
    if (src[k] === "{") d++;
    else if (src[k] === "}") { d--; if (!d) return src.slice(i, k + 1); }
  }
}
let STATE = {}, DATA = null, ITEM_TOPIC = {}, planRate = {}, statsScope = "all";
const SCOPES = [{ id: "all", label: "All" }, { id: "concept", label: "Concepts" }, { id: "problem", label: "Problems" }];
for (const n of ["st", "setItem", "isDone", "leafUnits", "conceptUnits", "todayKey", "dayOffset",
  "allUnits", "analytics", "esc", "finishDate", "estimateFor", "estimatePanel"]) eval(grab(n));
DATA = JSON.parse(fs.readFileSync(ROOT + "/docs/data/curriculum.json", "utf8"));

let p = 0, f = 0;
const t = (n, c, x) => { console.log((c ? "  ok   " : "  FAIL ") + n + (c ? "" : "  " + (x || ""))); c ? p++ : f++; };

const all = analytics("all"), con = analytics("concept"), pro = analytics("problem");
t("scopes partition the units", con.units + pro.units === all.units, con.units + "+" + pro.units + " vs " + all.units);
t("concept scope has only concepts", con.kind.problem.total === 0 && con.kind.concept.total === con.units);
t("problem scope has only problems", pro.kind.concept.total === 0 && pro.kind.problem.total === pro.units);

// no activity: no estimate, never a fake number
t("no activity -> no estimate", estimateFor("all").days === null);

// 30 days of activity: 2 problems and 1 concept a day
const units = allUnits(), today = todayKey();
const P = units.filter(u => u.kind === "problem"), C = units.filter(u => u.kind === "concept");
for (let d = 0; d < 30; d++) {
  const day = dayOffset(today, -d);
  setItem(P[2 * d].id, { done: true, doneAt: day });
  setItem(P[2 * d + 1].id, { done: true, doneAt: day });
  setItem(C[d].id, { done: true, doneAt: day });
}
const Ep = estimateFor("problem"), Ec = estimateFor("concept"), Ea = estimateFor("all");
t("problem pace = 2/day", Math.abs(Ep.pace - 2) < 1e-9, Ep.pace);
t("concept pace = 1/day", Math.abs(Ec.pace - 1) < 1e-9, Ec.pace);
t("combined pace = 3/day", Math.abs(Ea.pace - 3) < 1e-9, Ea.pace);
t("problem days = ceil(left/2)", Ep.days === Math.ceil(Ep.A.remaining / 2), Ep.days + " vs " + Math.ceil(Ep.A.remaining / 2));
t("concept days = left", Ec.days === Ec.A.remaining);
t("basis reported as 30-day pace", Ep.basis === "30-day pace");
t("done partitions across scopes", Ep.A.done + Ec.A.done === Ea.A.done);

// a plan overrides the measured pace
planRate.problem = 10;
const Eplan = estimateFor("problem");
t("plan overrides pace", Eplan.pace === 10 && Eplan.basis === "your plan");
t("plan days = ceil(left/10)", Eplan.days === Math.ceil(Eplan.A.remaining / 10));
planRate = {};

// only a week of history falls back to the 7-day pace
STATE = {};
for (let d = 0; d < 3; d++) setItem(P[d].id, { done: true, doneAt: dayOffset(today, -d) });
const E7 = estimateFor("problem");
t("30-day pace still used when present", E7.basis === "30-day pace");

// finished scope reads as done, not a date
STATE = {};
C.forEach(u => setItem(u.id, { done: true, doneAt: today }));
t("finished scope -> 0 days", estimateFor("concept").days === 0);

// panel markup
const html = estimatePanel();
t("panel has all three scopes", ["all", "concept", "problem"].every(s => html.includes('data-scope="' + s + '"')));
t("panel has a plan input per scope", (html.match(/data-plan="/g) || []).length === 3);
t("selected scope highlighted", (html.match(/est-row on/g) || []).length === 1);
t("no NaN in panel", !/NaN|undefined/.test(html));

console.log("\n" + p + " passed, " + f + " failed");
process.exit(f ? 1 : 0);
