/* Analytics tests: date stamping, streaks, pace, chart markup.
 *   node tools/test_stats.js
 */
const path=require("path");
const ROOT=path.join(__dirname,"..");
const fs=require("fs");
const src=fs.readFileSync(ROOT+"/docs/index.html","utf8");
function grab(n){const i=src.indexOf("function "+n+"(");if(i<0)throw new Error("missing "+n);let d=0;
  for(let k=src.indexOf("{",i);k<src.length;k++){if(src[k]==="{")d++;else if(src[k]==="}"){d--;if(!d)return src.slice(i,k+1);}}}
let STATE={},DATA=null,ITEM_TOPIC={},activeTags=[],query="",filter="all";
const TIER={basic:"Basic",core:"Core",pro:"Pro"};
for(const n of ["st","setItem","isDone","leafUnits","conceptUnits","todayKey","dayOffset",
  "allUnits","analytics","toggle","esc","svgEsc","heatmap","cumulativeChart","dailyBars",
  "stackRow","legendRow"]) eval(grab(n));
function pushItem(){} function render(){}
DATA=JSON.parse(fs.readFileSync(ROOT+"/docs/data/curriculum.json","utf8"));

let p=0,f=0;const t=(n,c,x)=>{console.log((c?"  ok   ":"  FAIL ")+n+(c?"":"  "+(x||"")));c?p++:f++;};
const units=allUnits();
const expConcept=DATA.topics.reduce((a,t)=>a+t.concepts.reduce((b,c)=>b+conceptUnits(c).length,0),0);
const expProblem=DATA.topics.reduce((a,t)=>a+t.problems.reduce((b,g)=>b+g.items.length,0),0);
t("units = concept leaves + problems", units.length===expConcept+expProblem,
  units.length+" vs "+expConcept+"+"+expProblem);
console.log("       "+expConcept+" concept leaves + "+expProblem+" problems = "+units.length);

// nothing done yet
let A=analytics();
t("empty state is safe", A.done===0&&A.today.total===0&&A.streak===0&&A.eta===null);
t("365-day window built", A.days.length===364, A.days.length);

// tick something today
const first=units.find(u=>u.kind==="problem");
toggle(first.id);
A=analytics();
t("today's count moves", A.today.total===1&&A.today.problem===1, JSON.stringify(A.today));
t("doneAt recorded", st(first.id).doneAt===todayKey(), st(first.id).doneAt);
t("firstDoneAt recorded", st(first.id).firstDoneAt===todayKey());

// untick clears the day but keeps history
toggle(first.id);
t("untick clears doneAt", st(first.id).doneAt==="");
t("untick keeps firstDoneAt", st(first.id).firstDoneAt===todayKey());
t("today's count drops back", analytics().today.total===0);

// synthetic history: 5 consecutive days ending today
const probs=units.filter(u=>u.kind==="problem").slice(0,20);
const today=todayKey();
probs.slice(0,12).forEach((u,i)=>{
  const day=dayOffset(today,-(i%5));
  setItem(u.id,{done:true,doneAt:day,firstDoneAt:day});
});
A=analytics();
t("streak counts consecutive days", A.streak===5, "streak "+A.streak);
t("last7 aggregates", A.last7===12, "last7 "+A.last7);
t("pace computed", A.perDay30>0 && A.eta!==null, "perDay "+A.perDay30.toFixed(2)+" eta "+A.eta);

// a gap breaks the streak
setItem(probs[0].id,{done:true,doneAt:dayOffset(today,-9),firstDoneAt:dayOffset(today,-9)});
t("older day does not extend streak", analytics().streak===5);

// undated legacy items counted separately
setItem(units[500].id,{done:true,doneAt:"",firstDoneAt:""});
A=analytics();
t("undated items reported", A.undated===1, "undated "+A.undated);
t("undated still in total", A.done===13, "done "+A.done);

// charts render without throwing and produce svg
const hm=heatmap(A.days);
t("heatmap renders 364 cells", (hm.match(/<rect/g)||[]).length===364, (hm.match(/<rect/g)||[]).length);
t("heatmap cells have titles", hm.includes("<title>"));
const cum=cumulativeChart(A.days);
t("cumulative line renders", cum.includes("<path") && cum.includes("</svg>"));
const bars=dailyBars(A.days);
t("30-day bars render", (bars.match(/<rect/g)||[]).length===30);
t("stack row renders", stackRow("x",[{name:"a",v:3,color:"var(--ch1)"},{name:"b",v:7,color:"var(--chart-empty)"}],10).includes("30%"));

// no NaN or undefined leaking into markup
const all=hm+cum+bars;
t("no NaN in chart markup", !/NaN|undefined/.test(all), (all.match(/NaN|undefined/)||[])[0]);

// per-module stats are coherent
const bad=A.topics.filter(r=>r.done>r.total);
t("no module over-counts", bad.length===0);
t("module totals sum to all units", A.topics.reduce((a,r)=>a+r.total,0)===units.length);

console.log("\n"+p+" passed, "+f+" failed");
process.exit(f?1:0);
