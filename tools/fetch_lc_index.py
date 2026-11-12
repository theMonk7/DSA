"""Refresh tools/lc_index.json from LeetCode's public problem list.

    python3 tools/fetch_lc_index.py

Run by hand when you want problems added to LeetCode after the last refresh;
the CI build only reads the committed file and never touches the network.

Output: {"<frontend id>": [title, slug, "E"|"M"|"H", 1 if premium else 0]}
"""
import json, os, time, urllib.request

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lc_index.json")
URL = "https://leetcode.com/graphql/"
Q = ("query($skip:Int!){q:questionList(categorySlug:\"\",limit:100,skip:$skip,filters:{})"
     "{total:totalNum data{id:questionFrontendId title titleSlug difficulty paid:isPaidOnly}}}")

def page(skip, tries=5):
    body = json.dumps({"query": Q, "variables": {"skip": skip}}).encode()
    req = urllib.request.Request(URL, data=body, headers={
        "Content-Type": "application/json", "Referer": "https://leetcode.com",
        "User-Agent": "Mozilla/5.0", "Accept-Encoding": "identity"})
    for n in range(tries):
        try:
            return json.loads(urllib.request.urlopen(req, timeout=60).read())["data"]["q"]
        except Exception as e:            # short reads happen; retry the page
            if n == tries - 1: raise
            print(f"  retry skip={skip}: {e.__class__.__name__}")
            time.sleep(1 + n)

out, skip, total = {}, 0, None
while total is None or skip < total:
    p = page(skip)
    total = p["total"]
    for q in p["data"]:
        out[q["id"]] = [q["title"], q["titleSlug"], q["difficulty"][0], 1 if q["paid"] else 0]
    skip += 100
out = dict(sorted(out.items(), key=lambda kv: int(kv[0]) if kv[0].isdigit() else 10**9))
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"{len(out)} problems -> {OUT} ({os.path.getsize(OUT)} bytes)")
