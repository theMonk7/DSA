/* Hover-layer tests: tooltip payloads, hit targets, crosshair data.
 *   node tools/test_hover.js
 */
const path = require("path");
const fs = require("fs");
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
let STATE = {}, DATA = null, ITEM_TOPIC = {};
const TIER = { basic: "Basic", core: "Core", pro: "Pro" };
for (const n of ["st","setItem","isDone","leafUnits","conceptUnits","todayKey","dayOffset",
  "allUnits","analytics","toggle","esc","svgEsc","heatmap","cumulativeChart","dailyBars","stackRow"])
  eval(grab(n));
function pushItem() {} function render() {}
DATA = JSON.parse(fs.readFileSync(ROOT + "/docs/data/curriculum.json", "utf8"));

const units = allUnits();
const today = todayKey();
units.filter(u => u.kind === "problem").slice(0, 9).forEach((u, i) => {
  const day = dayOffset(today, -(i % 4));
  setItem(u.id, { done: true, doneAt: day, firstDoneAt: day });
});
const A = analytics();
const hm = heatmap(A.days), bars = dailyBars(A.days), cum = cumulativeChart(A.days);
const sr = stackRow("Concepts",
  [{ name: "Done", v: 3, color: "var(--ch1)" }, { name: "Remaining", v: 7, color: "var(--chart-empty)" }], 10);

let p = 0, f = 0;
const t = (n, c, x) => { console.log((c ? "  ok   " : "  FAIL ") + n + (c ? "" : "  " + (x || ""))); c ? p++ : f++; };

t("no native <title> tooltips left", !/<title>/.test(hm + bars + cum));
t("heatmap cells carry data-tip", (hm.match(/data-tip="/g) || []).length === 364);
t("heatmap cells focusable", (hm.match(/tabindex="0"/g) || []).length === 364);
t("heatmap cells have aria labels",
  (hm.match(/<rect[^>]*aria-label="/g) || []).length === 364,
  (hm.match(/<rect[^>]*aria-label="/g) || []).length + " cells");

t("bars have a full-height hit area", (bars.match(/class="hit col-hit"/g) || []).length === 30);
const colH = bars.match(/class="hit col-hit"[^>]*height="(\d+)"/);
t("hit area taller than a 2px bar", !!colH && +colH[1] > 50, colH && colH[1]);

t("line chart has crosshair group", cum.includes('class="xh"'));
t("line chart has a hit overlay", cum.includes('data-xh="1"'));
const xs = (cum.match(/data-xs="([^"]+)"/) || [])[1];
const vals = (cum.match(/data-vals="([^"]+)"/) || [])[1];
const days = (cum.match(/data-days="([^"]+)"/) || [])[1];
t("crosshair arrays are aligned",
  xs.split(",").length === vals.split(",").length && vals.split(",").length === days.split(",").length,
  [xs.split(",").length, vals.split(",").length, days.split(",").length].join("/"));
t("crosshair values are cumulative (monotonic)",
  vals.split(",").map(Number).every((v, i, a) => i === 0 || v >= a[i - 1]));

t("stack segments carry data-tip", (sr.match(/data-tip="/g) || []).length === 2);
t("stack tip is value|label|sub", /data-tip="3\|Concepts/.test(sr), sr.slice(0, 160));
t("no NaN in any hover payload", !/NaN|undefined/.test(hm + bars + cum + sr));

const tipSrc = grab("showTip");
t("tooltip uses textContent, never innerHTML",
  tipSrc.includes("textContent") && !tipSrc.includes("innerHTML"));
t("tooltip is pointer-transparent", /#chartTip\{[^}]*pointer-events:none/.test(src));
t("focus shows the same readout", src.includes('document.addEventListener("focusin"'));

console.log("\n" + p + " passed, " + f + " failed");
process.exit(f ? 1 : 0);
