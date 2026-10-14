/* Structure tests for the heading tree: nesting, rollup, search, rendering.
 *   node tools/test_structure.js
 */
const path=require("path");
const ROOT=path.join(__dirname,"..");
const fs=require("fs");
const src=fs.readFileSync(ROOT+"/docs/index.html","utf8");
function grab(n){const i=src.indexOf("function "+n+"(");if(i<0)throw new Error("missing "+n);let d=0;
  for(let k=src.indexOf("{",i);k<src.length;k++){if(src[k]==="{")d++;else if(src[k]==="}"){d--;if(!d)return src.slice(i,k+1);}}}
let STATE={},query="",filter="all",ITEM_TOPIC={},HAY={},openSec={},openDetail={},mdCache={},activeTags=[];
for(const n of ["esc","st","setItem","isDone","normText","matches","leafUnits","conceptUnits",
  "nodeText","conceptCount","passFilter","conceptHaystack","conceptVisible","renderMd",
  "itemTags","tagNames","tagEditor","noteBlock","conceptPart"]){
  try{ eval(grab(n)); }catch(e){ console.log("  (skipped "+n+": "+e.message+")"); }
}
const d=JSON.parse(fs.readFileSync(ROOT+"/docs/data/curriculum.json","utf8"));
let p=0,f=0;const t=(n,c,x)=>{console.log((c?"  ok   ":"  FAIL ")+n+(c?"":"  "+(x||"")));c?p++:f++;};

const heaps=d.topics.find(x=>x.id==="heaps");
const sec=heaps.concepts.find(c=>c.title.startsWith("Pattern 4"));
const l3=sec.parts.find(n=>n.title.includes("loop-slot"));
const l4=l3.children[0];

t("L3 node has children", l3.children.length===5);
t("L4 nodes parsed", l4.level===4, "level "+l4.level);
t("L4 leaf is a unit", leafUnits(l3).some(u=>u.id===l4.id));
t("L3 container is NOT a unit", !leafUnits(l3).some(u=>u.id===l3.id));
t("units recurse to deepest", leafUnits(l3).length===5, leafUnits(l3).length+" leaves");

setItem(l4.id,{done:true});
let done=0; leafUnits(l3).forEach(u=>{if(isDone(u.id))done++;});
t("L4 tick rolls up to L3 counter", done===1);
t("topic count includes L4 leaves", conceptCount(heaps).done===1);

query="two clocks"; HAY={};
t("search finds L4 by its own text", conceptVisible(sec,"Heaps"));
query="worked failure"; HAY={};
t("search finds L4 by its title", conceptVisible(sec,"Heaps"));
query=""; HAY={};

ITEM_TOPIC[l3.id]="Heaps"; openSec[l3.id]=true;
const html=conceptPart(l3,0);
t("container renders a counter", /sec-count tnum">1\/5</.test(html));
t("children render nested", html.includes('data-depth="1"'));
t("leaf has a tick", html.includes('data-tick="'+l4.id+'"'));
t("container has no tick of its own", !html.includes('data-tick="'+l3.id+'"'));
t("indent grows with depth", html.includes("padding-left:34px"));

const deep={id:"n1",title:"a",level:3,content:"",children:[
  {id:"n2",title:"b",level:4,content:"",children:[
    {id:"n3",title:"c",level:5,content:"",children:[
      {id:"n4",title:"d",level:6,content:"deepest text",children:[]}]}]}]};
t("5-level nesting -> 1 leaf", leafUnits(deep).length===1 && leafUnits(deep)[0].id==="n4");
openSec.n1=openSec.n2=openSec.n3=true;
const dh=conceptPart(deep,0);
t("5-level renders", dh.includes('data-depth="3"') && dh.includes('data-tick="n4"'));

let bad=[]; d.topics.forEach(tp=>{const c=conceptCount(tp); if(c.done>c.total)bad.push(tp.id);});
t("no topic over-counts", bad.length===0, bad.join(","));

console.log("\n"+p+" passed, "+f+" failed");
process.exit(f?1:0);
