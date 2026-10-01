import re, json, os, unicodedata

ROOT = "/Users/utkarshraj/Documents/Learning/DSA"
SRC  = ROOT + "/notes"
TMP  = os.path.dirname(os.path.abspath(__file__))
OUT  = ROOT + "/docs/data/curriculum.json"

TITLE_MAP = {
 "arrays":"Arrays","binary_search":"Binary Search","bst":"Binary Search Trees",
 "dp":"Dynamic Programming","graphs":"Graphs","greedy":"Greedy","heaps":"Heaps",
 "intervals":"Intervals","linked_list":"Linked Lists","misc":"Misc Techniques",
 "monotonic_stack":"Monotonic Stack","recursion":"Recursion & Backtracking",
 "sliding_window":"Sliding Window","stacks":"Stacks","strings":"Strings",
 "subarrays":"Subarrays","trees":"Trees","tries":"Tries",
}
SKIP = {"README"}
LC_HEAD = re.compile(r"\(LC\s*([0-9][0-9/ ]*[0-9]|[0-9]+)\)")
LC_CODE = re.compile(r"^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(.*?#\s*LC\s*([0-9]+)(?::\s*(.*))?$")

def slugify(s):
    s = unicodedata.normalize("NFKD", str(s)).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")[:70] or "x"

def strip_num(s): return re.sub(r"^\d+\.\s*", "", s).strip()

def clean_title(raw):
    t = LC_HEAD.sub("", raw).strip()
    t = re.sub(r"\s{2,}", " ", t).rstrip(" -—")
    return t.strip()

def humanize_fn(fn):
    t = fn.replace("_", " ").strip()
    t = re.sub(r"\s+", " ", t)
    return t[:1].upper() + t[1:]

# ---------------- A2Z sheet ----------------
p = open(TMP+"/a2z_payload.txt", encoding="utf-8").read()
key='"sheet_syllabus":'; i=p.index(key)+len(key)
depth=0;instr=False;esc=False;end=None
for j in range(i,len(p)):
    ch=p[j]
    if esc: esc=False; continue
    if ch=='\\': esc=True; continue
    if ch=='"': instr=not instr; continue
    if instr: continue
    if ch=='{': depth+=1
    elif ch=='}':
        depth-=1
        if depth==0: end=j+1; break
syl=json.loads(p[i:end]); fields,rows,roots=syl["fields"],syl["rows"],syl["roots"]
objs=[dict(zip(fields[r[0]], r[1:])) for r in rows]

STEP_TOPIC = {
 "Beginner Problems":"fundamentals","Sorting":"sorting","Arrays":"arrays","Hashing":"arrays",
 "Binary Search":"binary_search","Strings (Basic and Medium)":"strings","Recursion":"recursion",
 "Linked-List":"linked_list","Bit Manipulation":"bit_manipulation","Greedy Algorithms":"greedy",
 "Sliding Window / 2 Pointer":"sliding_window","Stack / Queues":"stacks","Binary Trees":"trees",
 "Binary Search Trees":"bst","Heaps":"heaps","Graphs":"graphs","Dynamic Programming":"dp",
 "Tries":"tries","Strings (Advanced Algo)":"strings","Maths":"maths",
}

def collect(pos, acc):
    o = objs[pos]
    if o["type"] == "item": acc.append(o)
    elif o["type"] == "category":
        for c in (o.get("children") or []): collect(c, acc)

a2z_groups = {}       # topic -> [group]
lc_url_by_title = {}  # normalized title -> leetcode url
def norm(t): return re.sub(r"[^a-z0-9]+","", (t or "").lower())

for pos in roots:
    step = objs[pos]
    label = (step.get("label") or "").strip()
    topic = STEP_TOPIC.get(label)
    if not topic: print("UNMAPPED:", repr(label)); continue
    for cpos in (step.get("children") or []):
        sub = objs[cpos]; items=[]
        collect(cpos, items)
        if not items: continue
        g = {"id": slugify("a2z-"+label+"-"+(sub.get("label") or label)),
             "title": (sub.get("label") or label).strip(),
             "source":"a2z", "stepLabel":label, "items":[]}
        for it in items:
            lab=(it.get("label") or "").strip()
            url=it.get("leetcode_link") or None
            if url: lc_url_by_title.setdefault(norm(lab), url)
            g["items"].append({
                "id": slugify("a2z-"+label+"-"+lab), "title": lab, "lc": None,
                "url": url, "urlKind": "direct" if url else None,
                "tier": it.get("difficulty"), "source":"a2z",
            })
        a2z_groups.setdefault(topic, []).append(g)

def lc_link(title, num):
    u = lc_url_by_title.get(norm(title))
    if u: return u, "direct"
    if num:
        first = re.split(r"[^0-9]", str(num))[0]
        if first: return "https://leetcode.com/problemset/?search=" + first, "search"
    return None, None

# ---------------- notes ----------------
def parse_notes(stem, path):
    lines = open(path, encoding="utf-8").readlines()
    has_h2 = any(re.match(r"^## ", l) for l in lines)

    if not has_h2:   # misc.md
        items=[{"id":slugify(stem+"-"+t), "title":t, "lc":None, "url":None,
                "urlKind":None, "tier":None, "source":"notes"}
               for t in [m.group(1).strip() for m in
                         (re.match(r"^- (.+)", l.strip()) for l in lines) if m]]
        body = "".join(lines).strip()
        return ([{"id":slugify(stem+"-overview"), "title":"Overview",
                  "content":body, "subheads":[]}],
                [{"id":slugify(stem+"-techniques"), "title":"Techniques to know",
                  "source":"notes", "items":items}] if items else [])

    h2pos = [i for i,l in enumerate(lines) if re.match(r"^## ", l)]
    concepts, groups = [], []
    seen_lc = set()

    for k, start in enumerate(h2pos):
        stop = h2pos[k+1] if k+1 < len(h2pos) else len(lines)
        raw_title = re.match(r"^## (.+)", lines[start]).group(1).strip()
        title = strip_num(raw_title)
        block = "".join(lines[start+1:stop]).strip("\n")
        subheads = [{"title": clean_title(m.group(1).strip()),
                     "id": slugify(stem+"-"+m.group(1).strip())}
                    for m in (re.match(r"^### (.+)", l) for l in lines[start+1:stop]) if m]
        concepts.append({"id": slugify(stem+"-"+raw_title), "title": title,
                         "content": block, "subheads": subheads})

        items = []
        # (a) ### headings carrying an LC tag
        for li in range(start+1, stop):
            m = re.match(r"^### (.+)", lines[li])
            if not m: continue
            ht = m.group(1).strip()
            lcm = LC_HEAD.search(ht)
            if not lcm: continue
            ct = clean_title(ht); num = lcm.group(1).strip()
            url, kind = lc_link(ct, num)
            for n in re.findall(r"\d+", num): seen_lc.add(n)
            items.append({"id": slugify(stem+"-"+ht), "title": ct, "lc": num,
                          "url": url, "urlKind": kind, "tier": None, "source":"notes"})
        # (b) `def fn(...):  # LC n` markers not already covered
        for li in range(start+1, stop):
            m = LC_CODE.match(lines[li].rstrip("\n"))
            if not m: continue
            fn, num, hint = m.group(1), m.group(2), (m.group(3) or "").strip()
            if num in seen_lc: continue
            seen_lc.add(num)
            ct = humanize_fn(fn)
            url, kind = lc_link(ct, num)
            items.append({"id": slugify(stem+"-fn-"+fn+"-"+num), "title": ct, "lc": num,
                          "url": url, "urlKind": kind, "tier": None, "source":"notes",
                          "hint": hint or None})
        if items:
            groups.append({"id": slugify(stem+"-g-"+raw_title), "title": title,
                           "source":"notes", "items": items})
    return concepts, groups

topics = {}
for fname in sorted(os.listdir(SRC)):
    if not fname.endswith(".md"): continue
    stem = fname[:-3]
    if stem in SKIP: continue
    concepts, groups = parse_notes(stem, os.path.join(SRC, fname))
    topics[stem] = {"id": stem, "title": TITLE_MAP.get(stem, stem.title()),
                    "concepts": concepts, "problems": groups}

NEW = {"fundamentals":"Fundamentals","sorting":"Sorting",
       "bit_manipulation":"Bit Manipulation","maths":"Maths"}
for tid, gs in a2z_groups.items():
    if tid not in topics:
        topics[tid] = {"id":tid, "title":NEW.get(tid, tid.title()), "concepts":[], "problems":[]}
    topics[tid]["problems"].extend(gs)

ORDER = ["fundamentals","sorting","arrays","strings","linked_list","stacks","monotonic_stack",
         "sliding_window","subarrays","intervals","binary_search","bit_manipulation","heaps",
         "trees","bst","tries","graphs","recursion","dp","greedy","maths","misc"]
oi={t:i for i,t in enumerate(ORDER)}
out = sorted(topics.values(), key=lambda t: oi.get(t["id"], 999))

seen=set()
for t in out:
    for coll in ("concepts",):
        for c in t[coll]:
            b=c["id"]; n=1
            while c["id"] in seen: n+=1; c["id"]=f"{b}-{n}"
            seen.add(c["id"])
    for g in t["problems"]:
        for it in g["items"]:
            b=it["id"]; n=1
            while it["id"] in seen: n+=1; it["id"]=f"{b}-{n}"
            seen.add(it["id"])

nc = sum(len(t["concepts"]) for t in out)
npz = sum(len(g["items"]) for t in out for g in t["problems"])
nnotes = sum(1 for t in out for g in t["problems"] for it in g["items"] if it["source"]=="notes")
linked = sum(1 for t in out for g in t["problems"] for it in g["items"] if it.get("url"))
direct = sum(1 for t in out for g in t["problems"] for it in g["items"] if it.get("urlKind")=="direct")
print(f"topics={len(out)} conceptSections={nc} problems={npz} (notes={nnotes}, a2z={npz-nnotes})")
print(f"problems with a LeetCode link: {linked} ({direct} direct, {linked-direct} search)")
for t in out:
    print(f"  {t['id']:16s} concepts={len(t['concepts']):3d}  problemGroups={len(t['problems']):3d}  problems={sum(len(g['items']) for g in t['problems']):4d}")
json.dump({"topics":out, "generated": "notes/*.md + Striver A2Z sheet"},
          open(OUT,"w",encoding="utf-8"), ensure_ascii=False)
print("wrote", OUT, os.path.getsize(OUT), "bytes")
