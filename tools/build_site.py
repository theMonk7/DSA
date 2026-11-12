import re, json, os, unicodedata
from urllib.parse import quote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
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
_SMALL = {"a","an","and","as","at","but","by","for","in","of","on","or","the","to","vs","with"}
def humanize_stem(stem):
    """segment_trees -> Segment Trees. Any new notes file gets a sane title with
    no code change; TITLE_MAP only overrides where we want something different."""
    words = [w for w in re.split(r"[_\-\s]+", stem) if w]
    out = []
    for i, w in enumerate(words):
        lw = w.lower()
        out.append(lw if (i and lw in _SMALL) else lw.capitalize())
    return " ".join(out) or stem
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
tuf_url_by_title = {} # normalized title -> takeuforward problem page

TUF_BASE = "https://takeuforward.org/plus/dsa/problems/"
def tuf_url(item):
    """takeuforward.org/plus/dsa/problems/<itemSlug>, verified to resolve."""
    rt = item.get("redirectTo") or {}
    slug = rt.get("itemSlug")
    if not slug or rt.get("layoutType") != "practice":
        return None
    return TUF_BASE + quote(slug, safe="")

def tuf_article(item):
    """The sheet's own free article path, e.g. /blogs/data-structure-and-algorithm/<x>."""
    b = item.get("free_blog_link")
    if not b:
        return None
    return "https://takeuforward.org" + b if b.startswith("/") else b
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
            lcu=it.get("leetcode_link") or None
            tufu=tuf_url(it)
            if lcu: lc_url_by_title.setdefault(norm(lab), lcu)
            if tufu: tuf_url_by_title.setdefault(norm(lab), tufu)
            # LeetCode when the sheet has one, otherwise the takeUforward page
            if lcu:
                url, kind = lcu, "leetcode"
            elif tufu:
                url, kind = tufu, "tuf"
            else:
                art = tuf_article(it)          # theory entries have no problem page
                url, kind = (art, "article") if art else (None, None)
            g["items"].append({
                "id": slugify("a2z-"+label+"-"+lab), "title": lab, "lc": None,
                "url": url, "urlKind": kind,
                "tier": it.get("difficulty"), "source":"a2z",
            })
        a2z_groups.setdefault(topic, []).append(g)

# ---------------- LeetCode index ----------------
# number -> [title, slug, "E"|"M"|"H", paid]. Refreshed by tools/fetch_lc_index.py;
# the build itself never touches the network.
LC = {}
if os.path.exists(TMP + "/lc_index.json"):
    LC = json.load(open(TMP + "/lc_index.json", encoding="utf-8"))
LC_SLUG = {v[1]: k for k, v in LC.items()}
DIFF_TIER = {"E": "basic", "M": "core", "H": "pro"}
LC_URL = "https://leetcode.com/problems/{}/"

def first_num(num):
    m = re.search(r"\d+", str(num or ""))
    return m.group(0) if m else None

def lc_meta(num):
    """tier and premium flag for an LC number, from the index."""
    e = LC.get(first_num(num) or "")
    if not e: return None, False
    return DIFF_TIER.get(e[2]), bool(e[3])

def lc_link(title, num):
    # A number in the index is authoritative: it is the exact problem page.
    e = LC.get(first_num(num) or "")
    if e: return LC_URL.format(e[1]), "leetcode"
    u = lc_url_by_title.get(norm(title))
    if u: return u, "leetcode"
    t = tuf_url_by_title.get(norm(title))
    if t: return t, "tuf"
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
    sections = []          # (start, stop, raw_title, title) per ## section

    for k, start in enumerate(h2pos):
        stop = h2pos[k+1] if k+1 < len(h2pos) else len(lines)
        raw_title = re.match(r"^## (.+)", lines[start]).group(1).strip()
        title = strip_num(raw_title)

        # Any heading deeper than ## becomes a node in a tree under this section,
        # nested by its own level. Add a ###, a ####, or a ##### anywhere and it
        # renders in the right place with no code change.
        heads = []
        for li in range(start + 1, stop):
            m = re.match(r"^(#{3,6}) (.+)", lines[li])
            if m:
                heads.append((li, len(m.group(1)), m.group(2).strip()))

        first = heads[0][0] if heads else stop
        preamble = "".join(lines[start + 1:first]).strip("\n")

        nodes, stack = [], []
        for n, (li, lvl, ht) in enumerate(heads):
            nxt = heads[n + 1][0] if n + 1 < len(heads) else stop
            node = {
                "id": slugify(stem + "-" + ht),
                "title": clean_title(ht),
                "level": lvl,
                "content": "".join(lines[li + 1:nxt]).strip("\n"),
                "children": [],
            }
            # a heading closes every open heading at its level or deeper
            while stack and stack[-1][0] >= lvl:
                stack.pop()
            (stack[-1][1]["children"] if stack else nodes).append(node)
            stack.append((lvl, node))

        concepts.append({"id": slugify(stem + "-" + raw_title), "title": title,
                         "content": preamble, "parts": nodes})

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
            tier, paid = lc_meta(num)
            items.append({"id": slugify(stem+"-"+ht), "title": ct, "lc": num,
                          "url": url, "urlKind": kind, "tier": tier, "paid": paid,
                          "source":"notes"})
        # (b) `def fn(...):  # LC n` markers not already covered
        for li in range(start+1, stop):
            m = LC_CODE.match(lines[li].rstrip("\n"))
            if not m: continue
            fn, num, hint = m.group(1), m.group(2), (m.group(3) or "").strip()
            if num in seen_lc: continue
            seen_lc.add(num)
            # the official title reads better than one rebuilt from `def exist(...)`;
            # the id still comes from the function name, so ticks stay attached
            ct = LC[num][0] if num in LC else humanize_fn(fn)
            url, kind = lc_link(ct, num)
            tier, paid = lc_meta(num)
            items.append({"id": slugify(stem+"-fn-"+fn+"-"+num), "title": ct, "lc": num,
                          "url": url, "urlKind": kind, "tier": tier, "paid": paid,
                          "source":"notes", "hint": hint or None})
        if items:
            groups.append({"id": slugify(stem+"-g-"+raw_title), "title": title,
                           "source":"notes", "items": items})
        sections.append((start, stop, raw_title, title))

    # (c) every other LC reference in the prose, lists, tables and code comments:
    # "13. **Majority Element** (LC 169) — Boyer-Moore" becomes a problem in the
    # section it is written in, titled from the LeetCode index, with the text after
    # the dash as its hint. Runs after (a)/(b) for the whole file so a problem that
    # has its own ### write-up anywhere in the file is never listed twice.
    by_gid = {g["id"]: g for g in groups}
    for start, stop, raw_title, title in sections:
        for li in range(start, stop):
            line = lines[li]
            if re.match(r"^### ", line): continue        # handled by (a)
            for num, hint in mentions(line):
                if num in seen_lc: continue
                seen_lc.add(num)
                e = LC[num]
                if hint and norm(hint) == norm(e[0]): hint = None   # "LC 228 — Summary Ranges"
                tier, paid = lc_meta(num)
                gid = slugify(stem+"-g-"+raw_title)
                g = by_gid.get(gid)
                if not g:
                    g = by_gid[gid] = {"id": gid, "title": title, "source": "notes", "items": []}
                    groups.append(g)
                g["items"].append({"id": slugify(stem+"-ref-"+num), "title": e[0], "lc": num,
                                   "url": LC_URL.format(e[1]), "urlKind": "leetcode",
                                   "tier": tier, "paid": paid, "source": "notes",
                                   "ref": True, "hint": hint})
    # keep groups in the order their sections appear in the file
    order = {slugify(stem+"-g-"+rt): i for i, (_, _, rt, _) in enumerate(sections)}
    groups.sort(key=lambda g: order.get(g["id"], 10**6))
    return concepts, groups

MENTION = re.compile(r"\bLC\s*#?\s*(\d{1,4}(?:\s*/\s*\d{1,4})*)\b"
                     r"|\bLeetCode\s*#\s*(\d{1,4})\b"
                     r"|leetcode\.com/problems/([a-z0-9-]+)")
LIST_ITEM = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s+")
def mentions(line):
    """(number, hint) for each LC problem referenced on a line. Only numbers that
    exist in the index count, so stray text like 'LC 0' is ignored."""
    found = []
    for m in MENTION.finditer(line):
        if m.group(3):
            nums = [LC_SLUG.get(m.group(3))]
        else:
            nums = re.findall(r"\d+", m.group(1) or m.group(2))
        for n in nums:
            if n and n in LC and n not in (x for x, _ in found):
                found.append((n, m.end()))
    out = []
    for n, end in found:
        hint = None
        if len(found) == 1 and LIST_ITEM.match(line):
            d = re.search(r"\s[—–-]{1,2}\s+(.+)$", line[end:].rstrip())
            if d:
                hint = re.sub(r"\*\*|__|`", "", d.group(1)).strip()
                hint = (hint[:157] + "...") if len(hint) > 160 else hint
        out.append((n, hint or None))
    return out

topics = {}
for fname in sorted(os.listdir(SRC)):
    if not fname.endswith(".md"): continue
    stem = fname[:-3]
    if stem in SKIP: continue
    concepts, groups = parse_notes(stem, os.path.join(SRC, fname))
    topics[stem] = {"id": stem, "title": TITLE_MAP.get(stem, humanize_stem(stem)),
                    "concepts": concepts, "problems": groups}

NEW = {"fundamentals":"Fundamentals","sorting":"Sorting",
       "bit_manipulation":"Bit Manipulation","maths":"Maths"}
for tid, gs in a2z_groups.items():
    if tid not in topics:
        topics[tid] = {"id":tid, "title":NEW.get(tid, tid.title()), "concepts":[], "problems":[]}
    topics[tid]["problems"].extend(gs)

def item_lc(it):
    """The LC number an item stands for: its own tag, else its LeetCode URL."""
    if it.get("lc"): return first_num(it["lc"])
    m = re.search(r"leetcode\.com/problems/([^/?#]+)", it.get("url") or "")
    return LC_SLUG.get(m.group(1)) if m else None

# A prose mention that the A2Z sheet already lists in the same topic is dropped:
# the A2Z row is the same problem, so listing it twice would double-count it.
dropped_refs = 0
for t in topics.values():
    have = {item_lc(it) for g in t["problems"] for it in g["items"] if not it.get("ref")}
    for g in t["problems"]:
        keep = [it for it in g["items"] if not (it.get("ref") and it["lc"] in have)]
        dropped_refs += len(g["items"]) - len(keep)
        g["items"] = keep
    t["problems"] = [g for g in t["problems"] if g["items"]]
print("prose mentions already listed by A2Z in the same topic:", dropped_refs)

# A2Z rows that point at LeetCode get the premium flag, and a level where the
# sheet gave none.
for t in topics.values():
    for g in t["problems"]:
        for it in g["items"]:
            if it.get("source") != "a2z": continue
            n = item_lc(it)
            if not n or n not in LC: continue
            it["paid"] = bool(LC[n][3])
            if not it.get("tier"): it["tier"] = DIFF_TIER.get(LC[n][2])

# ---------------- practice sheets ----------------
# practice/<topic>.md: "## Section" headings over markdown tables of
#   | LC | Problem | Level | Companies |
# A row whose problem the topic already has (notes or A2Z) is not added again; it
# lends its company tags (and its level, where the item has none) to that row.
PRACTICE = ROOT + "/practice"
TIERS = {"basic", "core", "pro"}
ROW = re.compile(r"^\|(.+)\|\s*$")
LINK = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")

def parse_sheet(path):
    """[(section title, [row dict])]; rows the build cannot trust are reported."""
    sections, cur, bad = [], None, []
    for ln, line in enumerate(open(path, encoding="utf-8"), 1):
        h = re.match(r"^## (.+)", line)
        if h:
            cur = (h.group(1).strip(), []); sections.append(cur); continue
        r = ROW.match(line.rstrip("\n"))
        if not r or cur is None: continue
        cells = [c.strip() for c in r.group(1).split("|")]
        if len(cells) < 4 or re.fullmatch(r":?-+:?", cells[0]) or cells[0].lower() == "lc":
            continue
        num = first_num(cells[0])
        title, url = cells[1], None
        lk = LINK.search(title)
        if lk: title, url = lk.group(1), lk.group(2)
        tier = cells[2].lower() or None
        if tier and tier not in TIERS:
            bad.append(f"{ln}: level {cells[2]!r}"); tier = None
        cos = [c.strip() for c in cells[3].split(",") if c.strip()]
        if num and num not in LC:
            bad.append(f"{ln}: LC {num} not in tools/lc_index.json"); continue
        if num and norm(LC[num][0]) != norm(title):
            bad.append(f"{ln}: LC {num} is {LC[num][0]!r}, row says {title!r}")
        if not num and not url:
            bad.append(f"{ln}: no LC number and no link"); continue
        cur[1].append({"lc": num, "title": title, "url": url, "tier": tier, "companies": cos})
    for b in bad: print(f"  WARN {os.path.basename(path)}:{b}")
    return sections

def merge_sheet(t, sections):
    by_lc = {}
    for g in t["problems"]:
        for it in g["items"]:
            n = item_lc(it)
            if n: by_lc.setdefault(n, []).append(it)
    added = enriched = 0
    sheet_groups = []
    for sec, rows in sections:
        g = {"id": slugify(t["id"]+"-sheet-g-"+sec), "title": sec, "source": "sheet", "items": []}
        for r in rows:
            n = r["lc"]
            if n and n in by_lc:                       # already here: tag it, don't repeat it
                for it in by_lc[n]:
                    cos = it.setdefault("companies", [])
                    cos += [c for c in r["companies"] if c not in cos]
                    if r["tier"] and (not it.get("tier") or it.get("source") != "a2z"):
                        it["tier"] = r["tier"]
                enriched += 1
                continue
            if n:
                e = LC[n]; title, url, kind = e[0], LC_URL.format(e[1]), "leetcode"
                paid = bool(e[3]); tier = r["tier"] or DIFF_TIER.get(e[2])
                iid = slugify(t["id"]+"-sheet-"+n)
            else:
                title, url, kind, paid, tier = r["title"], r["url"], None, False, r["tier"]
                iid = slugify(t["id"]+"-sheet-"+title)
            it = {"id": iid, "title": title, "lc": n, "url": url, "urlKind": kind,
                  "tier": tier, "paid": paid, "source": "sheet", "companies": r["companies"]}
            if n: by_lc[n] = [it]
            g["items"].append(it); added += 1
        if g["items"]: sheet_groups.append(g)
    # notes groups first, then the practice sheet, then the A2Z sheet
    notes_g = [g for g in t["problems"] if g.get("source") == "notes"]
    rest = [g for g in t["problems"] if g.get("source") != "notes"]
    t["problems"] = notes_g + sheet_groups + rest
    return added, enriched

if os.path.isdir(PRACTICE):
    for fname in sorted(os.listdir(PRACTICE)):
        if not fname.endswith(".md") or fname[:-3] in SKIP: continue
        tid = fname[:-3]
        if tid not in topics:
            topics[tid] = {"id": tid, "title": TITLE_MAP.get(tid, NEW.get(tid, humanize_stem(tid))),
                           "concepts": [], "problems": []}
        a, e = merge_sheet(topics[tid], parse_sheet(os.path.join(PRACTICE, fname)))
        print(f"  sheet {tid:16s} added={a:3d} tagged-existing={e:3d}")

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

# Heading-tree nodes claim their ids LAST. A "### 3Sum (LC 15)" heading is both a
# write-up you read and a problem you solve; they must not share an id, or ticking
# one ticks the other and both count toward totals. Problem ids keep theirs (notes,
# links and ticks hang off them); the reading entry gets a "--read" suffix.
renamed = 0
def _claim(nodes):
    global renamed
    for nd in nodes:
        if nd["id"] in seen:
            b = nd["id"] + "--read"; nd["id"] = b; n = 1
            while nd["id"] in seen: n += 1; nd["id"] = f"{b}-{n}"
            renamed += 1
        seen.add(nd["id"])
        _claim(nd["children"])
for t in out:
    for c in t["concepts"]:
        _claim(c.get("parts") or [])
print("concept nodes renamed to avoid problem-id collisions:", renamed)

nc = sum(len(t["concepts"]) for t in out)
def _count_nodes(ns):
    return sum(1 + _count_nodes(n["children"]) for n in ns)
npart = sum(_count_nodes(c.get("parts") or []) for t in out for c in t["concepts"])
npz = sum(len(g["items"]) for t in out for g in t["problems"])
def scount(src): return sum(1 for t in out for g in t["problems"] for it in g["items"] if it["source"]==src)
nnotes = scount("notes")
nref = sum(1 for t in out for g in t["problems"] for it in g["items"] if it.get("ref"))
def kcount(k): return sum(1 for t in out for g in t["problems"] for it in g["items"] if it.get("urlKind")==k)
linked = sum(1 for t in out for g in t["problems"] for it in g["items"] if it.get("url"))
print(f"topics={len(out)} conceptSections={nc} conceptParts={npart} problems={npz} "
      f"(notes={nnotes} of which prose mentions={nref}, sheet={scount('sheet')}, a2z={scount('a2z')})")
print(f"links: {linked}/{npz} -> leetcode {kcount('leetcode')}, takeUforward {kcount('tuf')}, "
      f"tuf-article {kcount('article')}, lc-search {kcount('search')}, none {npz-linked}")
for t in out:
    print(f"  {t['id']:16s} concepts={len(t['concepts']):3d}  problemGroups={len(t['problems']):3d}  problems={sum(len(g['items']) for g in t['problems']):4d}")
import datetime
meta = {
  "generatedAt": datetime.datetime.now(datetime.timezone.utc)
                   .replace(microsecond=0).isoformat().replace("+00:00","Z"),
  "source": "notes/*.md + practice/*.md + Striver A2Z sheet",
  "topics": len(out), "conceptSections": nc, "conceptParts": npart, "problems": npz,
}
json.dump({"topics": out, "meta": meta},
          open(OUT,"w",encoding="utf-8"), ensure_ascii=False)
print("generatedAt", meta["generatedAt"])
print("wrote", OUT, os.path.getsize(OUT), "bytes")
