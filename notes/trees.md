# Trees — Complete Guide

> Google DSA prep notes. Category: binary trees & general (N-ary) trees.
> Covers traversals (recursive / iterative / Morris), the six reusable recursion
> templates, LCA + binary lifting, serialization, tree DP & rerooting, pitfalls and a
> graded problem ladder. BSTs have their own note — see `bst.md`.

## 1. What a tree is

A tree is a connected acyclic graph; a **rooted** tree picks an entry node, turning every
edge into parent → child. `n` nodes ⇒ exactly `n-1` edges.

- **root**: no parent. **leaf**: no children. **subtree**: a node + everything below it.
- **depth(v)** = edges from the **root down to v** (root = 0).
- **height(v)** = edges on the longest path from **v down to a leaf** (leaf = 0).

Depth counts downward, height counts upward. Mixing them is the #1 off-by-one bug.

**Shapes:** *full* = every node has 0 or 2 children · *complete* = all levels filled except
the last, which fills left→right (this is a heap; array layout `left=2i+1, right=2i+2`) ·
*perfect* = full **and** all leaves at the same depth (`2^(h+1)-1` nodes) ·
*balanced* = `|h(L)-h(R)| ≤ 1` everywhere ⇒ `h = O(log n)` · *skewed* = a linked list, `h = n-1`.

**Why height matters:** nearly every tree algorithm is `O(n)` time but `O(h)` **space** —
one recursion frame per level. Balanced ⇒ ~20 frames for a million nodes; skewed ⇒ a
million frames ⇒ Python's 1000-frame limit explodes. When an interviewer says *"the tree
may be very deep"*, they are asking for an iterative solution. That's the whole subtext.

```python
class TreeNode:
    __slots__ = ("val", "left", "right")      # saves memory on huge trees
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right
```

`None` is a valid tree (the empty tree). Every recursion you write starts by answering
*"what is the correct answer for `None`?"*

---

## 2. The single most important idea

> **Every tree problem is a recursion where you decide (a) what each node RETURNS UP to
> its parent, and (b) what info FLOWS DOWN from the parent into the call.**

Ninety percent of tree interviews are those two questions plus five lines of code. If you
can't answer them, you don't understand the problem yet — don't start typing.

### Bottom-up — return info up (postorder)

```
      node          "give me your answer, and yours,
     /    \          and I'll merge them into mine"
  left    right
    ↑        ↑       information travels UPWARD
```

```python
def solve(node):
    if not node: return BASE                     # answer for the empty tree
    L, R = solve(node.left), solve(node.right)   # trust the recursion
    return combine(L, R, node.val)
```

Use when the answer depends on **subtrees**: height, balance, diameter, subtree sums, LCA.

### Top-down — pass state down (preorder)

```
      node          "here is the sum / path / depth so far —
     /    \          continue from it"
  left    right
    ↓        ↓       information travels DOWNWARD
```

```python
def solve(node, state):
    if not node: return
    state = extend(state, node.val)
    if not node.left and not node.right: record(state)   # leaf: state is complete
    solve(node.left, state); solve(node.right, state)
```

Use when the answer depends on the **path from the root**: root-to-leaf sums/paths,
"count nodes ≥ max seen so far", BST range validation.

Most Hard problems are a **hybrid**: state down, aggregate up, plus a `nonlocal` global
for answers a parent can't extend (Section 4 explains that split).

**Mental trigger:** ask *"can a child compute its part without knowing anything about its
ancestors?"* Yes → bottom-up. No → push state down.

---

## 3. Traversals

The order name says **when you touch the node** relative to its children.
**preorder = top-down**, **postorder = bottom-up**, **inorder = sorted order on a BST**.

```python
def preorder(node, out):                       # node, left, right
    if not node: return
    out.append(node.val); preorder(node.left, out); preorder(node.right, out)

def inorder(node, out):                        # left, node, right
    if not node: return
    inorder(node.left, out); out.append(node.val); inorder(node.right, out)

def postorder(node, out):                      # left, right, node
    if not node: return
    postorder(node.left, out); postorder(node.right, out); out.append(node.val)
```
**Time O(n) / Space O(h)** each.

### Iterative — one explicit stack

```python
def preorder_iter(root):
    if not root: return []
    out, st = [], [root]
    while st:
        node = st.pop()
        out.append(node.val)
        if node.right: st.append(node.right)   # push right first → left pops first
        if node.left:  st.append(node.left)
    return out

def inorder_iter(root):
    out, st, cur = [], [], root
    while cur or st:
        while cur:                             # dive left, remembering the path
            st.append(cur); cur = cur.left
        cur = st.pop()                         # deepest unvisited node
        out.append(cur.val)
        cur = cur.right
    return out

def postorder_iter(root):
    if not root: return []
    out, st = [], [root]
    while st:                                  # mirrored preorder: root, right, left
        node = st.pop()
        out.append(node.val)
        if node.left:  st.append(node.left)
        if node.right: st.append(node.right)
    return out[::-1]                           # reverse → left, right, root
```
**Time O(n) / Space O(h)** each. `inorder_iter` is the skeleton for BST iterator / kth-smallest.

### Level-order BFS

```python
from collections import deque

def level_order(root):
    if not root: return []
    out, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):                # freeze level size BEFORE mutating q
            node = q.popleft()
            level.append(node.val)
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        out.append(level)
    return out
```
**Time O(n) / Space O(w)**, `w` = max width (up to `n/2`).

### Morris inorder — O(1) space

Instead of a stack, temporarily rewire the **inorder predecessor** (rightmost node of the
left subtree) to point back at the current node — that thread is the "return address".
Walk down; when you arrive back through the thread, tear it down and visit.

```python
def morris_inorder(root):
    out, cur = [], root
    while cur:
        if not cur.left:
            out.append(cur.val); cur = cur.right      # nothing left of me → visit, go right
        else:
            pred = cur.left
            while pred.right and pred.right is not cur:
                pred = pred.right                     # rightmost node of the left subtree
            if not pred.right:
                pred.right = cur; cur = cur.left      # thread: remember where to return
            else:
                pred.right = None                     # thread used → undo it
                out.append(cur.val); cur = cur.right
    return out
```
**Time O(n)** (each edge ≤ 3×) **/ Space O(1)**

**Mental trigger:** "traverse with O(1) extra space, no recursion, no stack" → Morris.
Cost: it mutates the tree mid-flight — the wrong answer for a read-only/concurrent tree.

---

## 4. Template A — bottom-up (postorder, return a value up)

```python
def dfs(node):
    if not node: return BASE
    L, R = dfs(node.left), dfs(node.right)
    # optionally update a nonlocal global with an answer that "passes through" here
    return combine(L, R, node.val)
```

**Mental trigger:** *"for every subtree…"*, or the node's answer is a function of its two
children's answers. If you can say *"assume the children told me the truth"* → Template A.

### A1 — Maximum depth (LC 104)

```python
def max_depth(root):
    if not root: return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))
```
**Time O(n) / Space O(h)**

### A2 — Balanced binary tree (LC 110)

Calling `max_depth` at every node is `O(n log n)`–`O(n²)`. Instead return the height **and**
encode failure in the same value.

```python
def is_balanced(root):
    def height(node):
        if not node: return 0
        L = height(node.left)
        if L == -1: return -1                  # -1 = "already failed" sentinel
        R = height(node.right)
        if R == -1 or abs(L - R) > 1: return -1
        return 1 + max(L, R)
    return height(root) != -1
```
**Time O(n) / Space O(h)**

Lesson: when one pass must compute two things, **return a tuple or a sentinel**. That trick
alone turns many `O(n²)` tree solutions into `O(n)`.

### A3 — Diameter (LC 543) — the classic confusion

The diameter through `X` is `height(L) + height(R)`, but `X` cannot *return* that, because a
path continuing through its parent may only use **one** side of `X`. So split it:

- **returned** = best *straight downward* chain = `1 + max(L, R)`
- **global** = best path *bending* here = `L + R`

```python
def diameter_of_binary_tree(root):
    best = 0
    def depth(node):
        nonlocal best
        if not node: return 0
        L, R = depth(node.left), depth(node.right)
        best = max(best, L + R)                # bends here → cannot go upward
        return 1 + max(L, R)                   # straight chain → returnable
    depth(root)
    return best
```
**Time O(n) / Space O(h)**

Burn this in: **"bend here → global; go straight → return."** Same shape in max path sum,
longest univalue path, longest ZigZag, longest consecutive sequence.

### A4 — Binary tree maximum path sum (LC 124) — Google favourite

```python
def max_path_sum(root):
    best = float("-inf")
    def gain(node):
        nonlocal best
        if not node: return 0
        L = max(gain(node.left), 0)            # a negative branch is worth skipping
        R = max(gain(node.right), 0)
        best = max(best, node.val + L + R)     # bend: both children used here
        return node.val + max(L, R)            # straight: parent extends one side only
    gain(root)
    return best
```
**Time O(n) / Space O(h)**

### A5 — Count univalue subtrees (LC 250)

```python
def count_univalue_subtrees(root):
    count = 0
    def dfs(node):                             # -> is this subtree univalue?
        nonlocal count
        if not node: return True
        l_ok, r_ok = dfs(node.left), dfs(node.right)   # recurse BOTH, no short-circuit
        if not (l_ok and r_ok): return False
        if node.left and node.left.val != node.val: return False
        if node.right and node.right.val != node.val: return False
        count += 1
        return True
    dfs(root)
    return count
```
**Time O(n) / Space O(h)**

---

## 5. Template B — top-down (pass parent state down)

**Mental trigger:** the words **"root-to-leaf"**, or validity depends on **ancestors**
(running sum, max seen, depth, allowed range).

### B1 — Path sum (LC 112)

```python
def has_path_sum(root, target):
    if not root: return False
    if not root.left and not root.right:       # leaf: exact match required
        return target == root.val
    rest = target - root.val
    return has_path_sum(root.left, rest) or has_path_sum(root.right, rest)
```
**Time O(n) / Space O(h)** — a node with one child is **not** a leaf; that trap fails `[1,2]`.

### B2 — All root-to-leaf paths (LC 257), with backtracking

```python
def binary_tree_paths(root):
    out, path = [], []
    def dfs(node):
        if not node: return
        path.append(str(node.val))
        if not node.left and not node.right:
            out.append("->".join(path))        # snapshot, never the live list
        dfs(node.left); dfs(node.right)
        path.pop()                             # UNDO before returning to the parent
    dfs(root)
    return out
```
**Time O(n·h) / Space O(h)** plus output. The `pop()` is non-negotiable.

### B3 — Count good nodes (LC 1448)

```python
def good_nodes(root):
    def dfs(node, best):
        if not node: return 0
        good = 1 if node.val >= best else 0
        best = max(best, node.val)             # state extends downward only
        return good + dfs(node.left, best) + dfs(node.right, best)
    return dfs(root, float("-inf"))
```
**Time O(n) / Space O(h)**

### B4 — Sum root-to-leaf numbers (LC 129)

```python
def sum_numbers(root):
    def dfs(node, cur):
        if not node: return 0
        cur = cur * 10 + node.val              # build the number while descending
        if not node.left and not node.right: return cur
        return dfs(node.left, cur) + dfs(node.right, cur)
    return dfs(root, 0)
```
**Time O(n) / Space O(h)** — hybrid: state down, sums back up.

---

## 6. Template C — level-order BFS family

```python
while q:
    n = len(q)                # ← the level boundary. Freeze it.
    for i in range(n):        # i = position WITHIN the level
        ...
```

That snapshot *is* the pattern: you fix the length before appending the next level, so each
loop body handles exactly one level.
**Mental trigger:** "levels / rows / each depth / width / views / nearest / min steps".

### C1 — Level averages (LC 637)

```python
def average_of_levels(root):
    out, q = [], deque([root])
    while q:
        n, total = len(q), 0
        for _ in range(n):
            node = q.popleft(); total += node.val
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        out.append(total / n)
    return out
```
**Time O(n) / Space O(w)**

### C2 — Right side view (LC 199)

```python
def right_side_view(root):
    if not root: return []
    out, q = [], deque([root])
    while q:
        n = len(q)
        for i in range(n):
            node = q.popleft()
            if i == n - 1: out.append(node.val)     # last node of the level
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
    return out
```
**Time O(n) / Space O(w)**

### C3 — Zigzag level order (LC 103)

```python
def zigzag_level_order(root):
    if not root: return []
    out, q, ltr = [], deque([root]), True
    while q:
        level = deque()
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val) if ltr else level.appendleft(node.val)
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        out.append(list(level)); ltr = not ltr      # flip direction each level
    return out
```
**Time O(n) / Space O(w)** — build with a deque instead of reversing; fewer bugs.

### C4 — Connect next right pointers (LC 116/117), O(1) space

Use the level you already threaded to build the next one — no queue at all.

```python
def connect(root):
    cur = root
    while cur:
        dummy = tail = Node(0)                      # dummy head of the NEXT level
        while cur:                                  # walk this level via next pointers
            if cur.left:  tail.next = cur.left;  tail = tail.next
            if cur.right: tail.next = cur.right; tail = tail.next
            cur = cur.next
        cur = dummy.next                            # descend into the level just built
    return root
```
**Time O(n) / Space O(1)**

### C5 — Minimum depth (LC 111) — where BFS beats DFS

```python
def min_depth(root):
    if not root: return 0
    q, d = deque([root]), 1
    while q:
        for _ in range(len(q)):
            node = q.popleft()
            if not node.left and not node.right: return d    # first leaf wins
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        d += 1
    return d
```
**Time O(n) worst case, early-exits at the shallowest leaf / Space O(w)**
DFS would grind through a million-node left subtree before seeing the depth-2 right leaf.
Say that out loud — it's exactly the reasoning being tested.

---

## 7. Template D — Lowest Common Ancestor

### D1 — Classic recursive LCA (LC 236)

```python
def lowest_common_ancestor(root, p, q):
    if not root or root is p or root is q:
        return root                    # found a target, or a dead end
    L = lowest_common_ancestor(root.left, p, q)
    R = lowest_common_ancestor(root.right, p, q)
    if L and R: return root            # targets split here ⇒ this node is the LCA
    return L or R                      # else bubble up whatever was found
```
**Time O(n) / Space O(h)**

**Why it works.** Read the return as *"the best answer in my subtree, or one of p/q if only
one is here, or None."* Three cases: (1) both sides non-`None` ⇒ the targets sit in different
subtrees ⇒ this node is the split point ⇒ the LCA; (2) one side non-`None` ⇒ either both
targets are down there (the value is already the LCA) or only one is (a real split higher up
will pair it) — passing it up is correct either way; (3) both `None` ⇒ report `None`.
The elegance: *"I am p"* and *"I am the LCA"* travel the same channel, and case 1
disambiguates them at exactly the right height. Assumes both nodes exist — otherwise count
matches and check at the end. Compare with `is`, never `.val ==`.

**Mental trigger:** "lowest/deepest node with both X and Y below it" → detect the **split**.

### D2 — LCA with parent pointers (LC 1650)

It becomes "intersection of two linked lists":

```python
def lca_with_parents(p, q):
    a, b = p, q
    while a is not b:
        a = a.parent if a else q       # swap rails when you fall off the top
        b = b.parent if b else p
    return a                           # both walk len(A)+len(B) steps → they meet
```
**Time O(h) / Space O(1)**

### D3 — LCA of deepest leaves (LC 1123 / 865)

```python
def lca_deepest_leaves(root):
    def dfs(node):                     # -> (subtree depth, lca of its deepest leaves)
        if not node: return 0, None
        dl, ln = dfs(node.left)
        dr, rn = dfs(node.right)
        if dl == dr: return dl + 1, node          # equally deep ⇒ split here
        return (dl + 1, ln) if dl > dr else (dr + 1, rn)
    return dfs(root)[1]
```
**Time O(n) / Space O(h)**

### D4 — Binary lifting: LCA for many queries (Google favourite)

Recursive LCA is `O(n)` *per query* ⇒ `O(nq)`. Precompute `up[k][v]` = the `2^k`-th ancestor
of `v`, then answer each query in `O(log n)` by jumping in powers of two.

```python
import math

class LCA:
    def __init__(self, n, adj, root=0):
        self.LOG = max(1, math.ceil(math.log2(n)) + 1)
        self.up = [[-1] * n for _ in range(self.LOG)]     # up[k][v] = 2^k-th ancestor
        self.depth = [0] * n
        q, seen = deque([root]), [False] * n
        seen[root] = True
        while q:                                          # BFS fills depths + parents
            v = q.popleft()
            for w in adj[v]:
                if not seen[w]:
                    seen[w] = True
                    self.up[0][w], self.depth[w] = v, self.depth[v] + 1
                    q.append(w)
        for k in range(1, self.LOG):                      # doubling: 2^k = 2^(k-1) twice
            for v in range(n):
                mid = self.up[k - 1][v]
                self.up[k][v] = self.up[k - 1][mid] if mid != -1 else -1

    def kth_ancestor(self, v, k):
        for i in range(self.LOG):
            if k >> i & 1:                                # jump by each set bit of k
                v = self.up[i][v]
                if v == -1: return -1
        return v

    def query(self, a, b):
        if self.depth[a] < self.depth[b]: a, b = b, a
        a = self.kth_ancestor(a, self.depth[a] - self.depth[b])   # level them first
        if a == b: return a
        for k in range(self.LOG - 1, -1, -1):             # jump only while they DIFFER
            if self.up[k][a] != self.up[k][b]:
                a, b = self.up[k][a], self.up[k][b]
        return self.up[0][a]                              # parent of the split = LCA
```
**Build O(n log n) time & space / Query O(log n)**
The descending-`k` loop never overshoots: you only move while the ancestors still differ, so
afterwards `a` and `b` sit exactly one step below the LCA.

---

## 8. Template E — serialize/deserialize & construct from traversals

### E1 — Serialize with null markers (LC 297) — Google favourite

```python
class Codec:
    def serialize(self, root):
        out = []
        def dfs(node):
            if not node:
                out.append("#"); return        # the null marker makes it invertible
            out.append(str(node.val)); dfs(node.left); dfs(node.right)
        dfs(root)
        return ",".join(out)

    def deserialize(self, data):
        vals = iter(data.split(","))           # an iterator = a cursor, no index bookkeeping
        def build():
            v = next(vals)
            if v == "#": return None
            node = TreeNode(int(v))
            node.left, node.right = build(), build()
            return node
        return build()
```
**Time O(n) / Space O(n)** — preorder because the root comes first, so you can create the
node before recursing. Inorder + nulls does **not** round-trip: you can't locate the root.

### E2 — Build from preorder + inorder (LC 105)

Preorder gives the **root**; inorder says **how many nodes sit on its left**.

```python
def build_tree(preorder, inorder):
    idx = {v: i for i, v in enumerate(inorder)}   # O(1) root lookup instead of an O(n) scan
    pos = 0
    def build(lo, hi):                            # inorder slice [lo, hi]
        nonlocal pos
        if lo > hi: return None
        node = TreeNode(preorder[pos]); pos += 1  # preorder is consumed strictly left→right
        mid = idx[node.val]
        node.left = build(lo, mid - 1)            # left FIRST — that's preorder's order
        node.right = build(mid + 1, hi)
        return node
    return build(0, len(inorder) - 1)
```
**Time O(n) / Space O(n)** — without the index map (or with list slicing) it degrades to `O(n²)`.

### E3 — Build from postorder + inorder (LC 106)

Postorder read backwards is root, right, left — so consume from the end, build right first.

```python
def build_tree_post(inorder, postorder):
    idx = {v: i for i, v in enumerate(inorder)}
    pos = len(postorder) - 1
    def build(lo, hi):
        nonlocal pos
        if lo > hi: return None
        node = TreeNode(postorder[pos]); pos -= 1
        mid = idx[node.val]
        node.right = build(mid + 1, hi)           # RIGHT first — postorder reversed
        node.left = build(lo, mid - 1)
        return node
    return build(0, len(inorder) - 1)
```
**Time O(n) / Space O(n)**

Memorise: pre+in and post+in work; **pre+post is ambiguous** unless the tree is full. All of
them need **distinct values** — duplicates break the index map.

---

## 9. Template F — tree DP & rerooting

### F1 — House Robber III (LC 337)

State per node: best if I **take** it vs best if I **skip** it. Return both.

```python
def rob(root):
    def dfs(node):                        # -> (best_if_robbed, best_if_skipped)
        if not node: return 0, 0
        lr, ls = dfs(node.left)
        rr, rs = dfs(node.right)
        robbed = node.val + ls + rs                    # taking me forces skipping children
        skipped = max(lr, ls) + max(rr, rs)            # skipping me frees them
        return robbed, skipped
    return max(dfs(root))
```
**Time O(n) / Space O(h)**

**Mental trigger:** "adjacent nodes conflict" / "choose a subset under a constraint" →
return a small tuple of DP states. Generalises to tree independent set, colouring, and
Binary Tree Cameras (3 states: covered-by-child / has-camera / needs-cover).

### F2 — Rerooting: sum of distances in tree (LC 834)

For **every** node, the sum of distances to all others. BFS from each node is `O(n²)`.
Rerooting does it in `O(n)`: pass 1 (post-order) computes subtree sizes and the root's
answer; pass 2 (pre-order) moves the root from `u` to child `v` — the `count[v]` nodes inside
`v`'s subtree get 1 closer, the `n - count[v]` outside get 1 farther:

`ans[v] = ans[u] - count[v] + (n - count[v])`

```python
def sum_of_distances_in_tree(n, edges):
    adj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b); adj[b].append(a)
    count, ans = [1] * n, [0] * n

    def post(u, parent):                          # subtree sizes + distances within
        for v in adj[u]:
            if v == parent: continue
            post(v, u)
            count[u] += count[v]
            ans[u] += ans[v] + count[v]           # every subtree node is 1 edge farther
    def pre(u, parent):                           # reroot: derive each child in O(1)
        for v in adj[u]:
            if v == parent: continue
            ans[v] = ans[u] - count[v] + (n - count[v])
            pre(v, u)

    post(0, -1); pre(0, -1)
    return ans
```
**Time O(n) / Space O(n)**

**Mental trigger:** *"compute the answer for every node as the root"* → two DFS passes.

---

## 10. Path problems — taxonomy

| Path shape | Meaning | Template |
|---|---|---|
| root → leaf | starts at root, ends at a leaf | B (state down) |
| downward only | any node → any descendant, straight down | B + prefix sums |
| any → any | may **bend** at one node (its peak) | A + global |
| node → node via LCA | explicit endpoints | LCA + depths |

### Path Sum III (LC 437) — downward paths, prefix-sum hashmap

Brute force starts a DFS at every node → `O(n·h)`. Better: the root-to-current path is a
1-D array, so reuse the subarray-sum-equals-k trick.

```python
from collections import defaultdict

def path_sum_iii(root, target):
    seen = defaultdict(int)
    seen[0] = 1                       # empty prefix: lets a path starting at the root count
    total = 0
    def dfs(node, run):
        nonlocal total
        if not node: return
        run += node.val
        total += seen[run - target]   # every ancestor prefix that completes a target
        seen[run] += 1
        dfs(node.left, run); dfs(node.right, run)
        seen[run] -= 1                # BACKTRACK: this prefix is invalid for siblings
    dfs(root, 0)
    return total
```
**Time O(n) / Space O(h)** — without the decrement, prefixes leak across branches and you
silently overcount (a bug small tests won't catch).

---

## 11. N-ary trees, and when a tree is really a graph

```python
class NaryNode:
    def __init__(self, val=None, children=None):
        self.val, self.children = val, children or []

def n_ary_max_depth(root):
    if not root: return 0
    return 1 + max((n_ary_max_depth(c) for c in root.children), default=0)  # childless node
```
**Time O(n) / Space O(h)**

Everything generalises: swap `node.left/right` for `for c in node.children`. Pre/postorder
still make sense; **inorder does not** (no canonical middle).

### When it becomes a graph

Trees point downward. The moment you need to move **up or sideways**, build a parent map
(an undirected adjacency list) and BFS with a `visited` set.

```python
def distance_k(root, target, k):                   # LC 863
    parent = {}
    def annotate(node, par):
        if not node: return
        parent[node] = par                         # add the missing "up" edge
        annotate(node.left, node); annotate(node.right, node)
    annotate(root, None)

    seen, q = {target}, deque([target])
    for _ in range(k):                             # k BFS rings outward
        for _ in range(len(q)):
            node = q.popleft()
            for nxt in (node.left, node.right, parent[node]):
                if nxt and nxt not in seen:
                    seen.add(nxt); q.append(nxt)
    return [n.val for n in q]
```
**Time O(n) / Space O(n)**

**Mental trigger:** "distance", "neighbour", "burn/infect the tree", "move to the parent" ⇒
parent links + undirected BFS. (LC 2385 infection is literally this code.)

---

## 12. Common pitfalls

1. **Null handling.** Answer "what about `None`?" first, deliberately: `0` for depth, `True`
   for balanced, `-inf` for max path sum, `None` for LCA.
2. **Leaf ≠ null.** A leaf is `not node.left and not node.right`; `not node` is the *empty*
   tree. Path Sum on `[1,2]` with target 1 breaks if you confuse them.
3. **Returning vs. global.** A value the parent cannot extend (a *bending* path) belongs in a
   `nonlocal`, never the return value — diameter, max path sum, longest univalue path.
4. **Depth vs. height off-by-one.** Decide up front whether you count **nodes** or **edges**:
   LC 104 wants node-count (leaf = 1), diameter wants edge-count (leaf = 0). Hand-check the
   single-node tree.
5. **Mutating a shared path list without backtracking.** Every `append` needs a matching
   `pop()` on *every* exit path, and you must store a **copy** (`list(path)`), not an alias
   that later empties itself.
6. **Python's 1000-frame recursion limit.** A 10⁵-node skewed tree ⇒ `RecursionError`. Go
   iterative; raising the limit risks a real C-stack segfault (say that out loud).
7. **Comparing values instead of nodes.** In LCA use `node is p`, not `node.val == p.val` —
   duplicates hand you the wrong ancestor.
8. **Duplicate values in serialization/construction.** Index maps and subtree signatures
   (LC 652) assume distinct values; always serialize with null markers so `[1,null,2]`
   differs from `[1,2,null]`.
9. **Assuming BST properties.** No "BST" in the statement ⇒ inorder is *not* sorted and you
   can't prune by value. Conversely, on a real BST, ignoring the ordering wastes an `O(h)`.
10. **`and`/`or` short-circuiting away a needed recursion.** `dfs(l) and dfs(r)` skips the
    right call when the left is falsy — fatal when the recursion has side effects.
11. **BFS level boundary.** Read `n = len(q)` **before** the inner loop, never inside it, or
    levels merge together.
12. **Claiming O(1) space for recursive DFS.** It's `O(h)`, degrading to `O(n)` when skewed.
    Interviewers listen for exactly this sentence.

---

## 13. Complexity cheat sheet

| Pattern | Time | Space | Note |
|---|---|---|---|
| DFS traversal, recursive | O(n) | O(h) | h = n if skewed |
| DFS iterative (explicit stack) | O(n) | O(h) | immune to recursion limits |
| Morris inorder | O(n) | **O(1)** | mutates the tree temporarily |
| BFS level order | O(n) | O(w) | w up to n/2 |
| Max depth / balanced / diameter | O(n) | O(h) | Template A |
| Root-to-leaf paths | O(n·h) | O(h) | the n·h comes from copying paths out |
| LCA, single query | O(n) | O(h) | Template D |
| LCA with parent pointers | O(h) | O(1) | two-pointer meet |
| LCA binary lifting | O(n log n) build, O(log n)/query | O(n log n) | many queries |
| Serialize / deserialize | O(n) | O(n) | preorder + null markers |
| Build from pre+inorder | O(n) | O(n) | O(n²) without the index map |
| Tree DP (rob / cameras) | O(n) | O(h) | tuple of states per node |
| Rerooting | O(n) | O(n) | two passes |
| Path Sum III (prefix map) | O(n) | O(h) | vs O(n·h) brute force |
| Distance-K / infection (graph mode) | O(n) | O(n) | parent map + BFS |
| Search in a balanced BST | O(log n) | O(1) iterative | see `bst.md` |

---

## 14. Problem ladder (Google-weighted)

### Basic — build the reflexes
- LC 104 Maximum Depth — the "hello world" of Template A.
- LC 111 Minimum Depth — why BFS beats DFS; the leaf-vs-null trap.
- LC 226 Invert Binary Tree — swap children; the famous warm-up.
- LC 100 Same Tree — simultaneous recursion over two trees.
- LC 101 Symmetric Tree — mirror recursion `(l.left, r.right)`; do it iteratively too.
- LC 112 Path Sum — Template B, subtract while descending.
- LC 257 Binary Tree Paths — backtracking discipline on a shared list.
- LC 94 / 144 / 145 Traversals — write all three **iteratively**; non-negotiable.
- LC 102 Level Order — the `for _ in range(len(q))` boundary trick.
- LC 543 Diameter — the bend-vs-straight split; asked constantly at Google.
- LC 110 Balanced Binary Tree — sentinel `-1` fuses two computations into one pass.
- LC 617 Merge Two Binary Trees — parallel recursion with null handling.
- LC 572 Subtree of Another Tree — naive O(n·m) vs serialization + KMP.

### Medium — the templates in anger
- LC 199 Right Side View — last node per level (or DFS keyed by depth).
- LC 103 Zigzag Level Order — build each level in a deque.
- LC 107 Level Order II — same BFS, reversed output.
- LC 116 / 117 Populating Next Right Pointers — O(1)-space level threading.
- LC 129 Sum Root to Leaf Numbers — state down, sums up.
- LC 113 Path Sum II — Template B + backtracking, collect all paths.
- LC 437 Path Sum III — prefix-sum hashmap with backtracking. Very common.
- LC 1448 Count Good Nodes — "max seen so far" flows down.
- LC 236 LCA of a Binary Tree — the split-detection recursion.
- LC 235 LCA of a BST — O(h) by value comparison; cross-ref `bst.md`.
- LC 105 / 106 Construct from Traversals — index map for O(n).
- LC 889 Construct from Pre + Postorder — shows why it needs a full tree.
- LC 337 House Robber III — take/skip tuple DP.
- LC 662 Maximum Width of Binary Tree — heap indexing `2i`/`2i+1`, normalise per level.
- LC 250 Count Univalue Subtrees — postorder boolean, no short-circuit.
- LC 951 Flip Equivalent Binary Trees — try both child pairings. Google favourite.
- LC 1123 / 865 Smallest Subtree with All the Deepest Nodes — return `(depth, node)`.
- LC 863 All Nodes Distance K — parent map + BFS; the tree→graph pivot.
- LC 1372 Longest ZigZag Path — carry (direction, length) down.
- LC 652 Find Duplicate Subtrees — serialize subtrees into a counter.
- LC 366 Find Leaves of Binary Tree — height *is* the removal round.
- LC 1315 Even-Valued Grandparent — pass two ancestors down.

### Hard / Google-level
- LC 124 Binary Tree Maximum Path Sum — clip negatives, bend vs straight. Top-5 Google.
- LC 297 Serialize and Deserialize Binary Tree — preorder + null markers. Top-5 Google.
- LC 428 Serialize/Deserialize N-ary Tree — encode child counts or terminators.
- LC 987 Vertical Order Traversal — sort by (col, row, val); the tie-break *is* the test.
- LC 314 Vertical Order (no tie-break) — BFS keeps rows ordered for free.
- LC 545 Boundary of Binary Tree — left spine + leaves + reversed right spine, no dupes.
- LC 968 Binary Tree Cameras — greedy postorder, 3 states. Classic Google hard.
- LC 979 Distribute Coins in Binary Tree — return the surplus, sum `abs()` of the flows.
- LC 1110 Delete Nodes and Return Forest — pass "is my parent deleted" down.
- LC 1245 Tree Diameter (N-ary) — two BFS passes, or DFS with the top-2 depths.
- LC 834 Sum of Distances in Tree — rerooting.
- LC 2265 Nodes Equal to Average of Subtree — return `(sum, count)` up.
- LC 2385 Time for Binary Tree to Be Infected — parent map + BFS rings.
- LC 1483 Kth Ancestor of a Tree Node — **binary lifting**, exactly Section 7 D4.
- LC 99 Recover Binary Search Tree — inorder finds the swapped pair; O(1) via Morris.
- LC 114 Flatten Binary Tree to Linked List — reverse postorder, or Morris-style O(1).
- LC 1028 Recover a Tree From Preorder Traversal — depth-prefixed preorder + a stack.
- LC 549 Longest Consecutive Sequence II — return (inc, dec), bend at the node.
- LC 894 All Possible Full Binary Trees — memoised construction by node count.

---

## 15. Decision cheat-sheet

| If the question says… | Reach for |
|---|---|
| "max/min depth", "is it balanced", "subtree sum/size" | Template A — bottom-up |
| "for every subtree, check X" | Template A returning a tuple/sentinel |
| "longest path", "diameter", "path that may bend" | Template A + `nonlocal` global |
| "root-to-leaf" | Template B, leaf test `not l and not r` |
| "count nodes satisfying an ancestor condition" | Template B carrying max/min/sum down |
| "level", "row", "each depth", "width", "side view" | Template C — BFS, `len(q)` boundary |
| "shortest / nearest / minimum steps" | Template C — BFS with early exit |
| "lowest common ancestor", "deepest node with both" | Template D — split detection |
| "many LCA / k-th ancestor queries" | Binary lifting |
| "encode to a string and rebuild" | Template E — preorder + null markers |
| "given two traversals, build the tree" | Template E — index map, O(n) |
| "adjacent nodes conflict", "cover the tree" | Template F — tuple DP per node |
| "answer for every node as the root" | Rerooting, two DFS passes |
| "distance k", "infection spreads", "move to parent" | Parent map + BFS (graph mode) |
| "O(1) extra space traversal" | Morris |
| "the tree may be extremely deep / skewed" | Iterative + explicit stack |
| "sorted order", "kth smallest", "validate ordering" | It's a BST → `bst.md` |

---

## 16. Quiz

**Q1.** Is a node with exactly one child a leaf? Why does it matter in Path Sum (LC 112)?
<details><summary>Answer</summary>
No — a leaf has **both** children `None`. Returning `target == node.val` at a one-child node
makes `root=[1,2], target=1` wrongly return `True`. Test `not node.left and not node.right`.
</details>

**Q2.** In the diameter solution, why can't the recursion return `L + R`?
<details><summary>Answer</summary>
`L + R` **bends** at this node, so a parent cannot extend it (it could only enter through one
side). The return value must be the best straight downward chain `1 + max(L, R)`; the bending
value goes to a global.
</details>

**Q3.** Why does preorder+inorder determine a unique tree but preorder+postorder not?
<details><summary>Answer</summary>
Preorder gives the root and inorder splits the rest into strict left/right groups. With
pre+post you know the root and each subtree's contents but cannot tell whether a lone child
is a left or a right child — unique only if the tree is full.
</details>

**Q4.** Why is `seen[run] -= 1` required in Path Sum III?
<details><summary>Answer</summary>
The map must describe only the **current root-to-node path**. Without the decrement,
prefixes from the left branch leak into the right branch and count paths that aren't
vertically connected — an overcount.
</details>

**Q5.** In LCA, why is returning `L or R` correct when only one side is non-null?
<details><summary>Answer</summary>
Either both targets are inside that side (so the returned value is already their LCA and
bubbling it up unchanged is right), or only one target is there and a true split point higher
up will pair it with the other. One line handles both cases.
</details>

**Q6.** Space complexity of recursive tree DFS — and when does it bite in Python?
<details><summary>Answer</summary>
`O(h)`: `O(log n)` balanced, `O(n)` skewed. Python's default recursion limit is 1000, so a
skewed tree of >~1000 nodes raises `RecursionError`. Fix with an explicit stack; raising the
limit risks a C-stack crash.
</details>

**Q7.** Morris gives O(1) space — what does it cost?
<details><summary>Answer</summary>
It temporarily **mutates** the tree (threading predecessor→current), so it isn't thread-safe
or usable on an immutable tree, and it walks some edges up to three times (still `O(n)`).
</details>

**Q8.** LCA for 10⁵ query pairs on a 10⁵-node tree — plan?
<details><summary>Answer</summary>
Naive recursion is `O(n)` per query ⇒ `10^10`, far too slow. Use **binary lifting**:
`O(n log n)` preprocessing of `up[k][v]` + depths, then `O(log n)` per query ⇒ ~`10^6`.
(Offline alternative: Tarjan's LCA with union-find, near-linear.)
</details>

---

## 17. Mini project — expression-tree evaluator

Build a tree from an infix expression, then evaluate, pretty-print and simplify it. Every
template appears: construction (stack), postorder evaluation (A), in-order printing with
state flowing down (B), constant folding (tree DP).

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class ExprNode:
    val: str                                    # an operator "+-*/" or a numeric literal
    left: Optional["ExprNode"] = None
    right: Optional["ExprNode"] = None
    @property
    def is_leaf(self) -> bool:
        return self.left is None and self.right is None

PREC = {"+": 1, "-": 1, "*": 2, "/": 2}

def build(tokens: list[str]) -> ExprNode:
    """Shunting-yard: operands on one stack, operators on another."""
    nodes, ops = [], []
    def reduce_top():                           # pop an operator, bind the top two operands
        op = ops.pop()
        r, l = nodes.pop(), nodes.pop()         # the right operand was pushed last
        nodes.append(ExprNode(op, l, r))
    for t in tokens:
        if t == "(":
            ops.append(t)
        elif t == ")":
            while ops[-1] != "(": reduce_top()
            ops.pop()
        elif t in PREC:
            while ops and ops[-1] != "(" and PREC[ops[-1]] >= PREC[t]:
                reduce_top()                    # left-associative: equal precedence reduces
            ops.append(t)
        else:
            nodes.append(ExprNode(t))
    while ops: reduce_top()
    return nodes[0]

def evaluate(node: ExprNode) -> float:
    """Template A: children first, then combine."""
    if node.is_leaf: return float(node.val)
    a, b = evaluate(node.left), evaluate(node.right)
    return {"+": a + b, "-": a - b, "*": a * b, "/": a / b}[node.val]

def to_string(node: ExprNode, parent_prec: int = 0) -> str:
    """Template B: the parent's precedence flows DOWN and decides parenthesisation."""
    if node.is_leaf: return node.val
    p = PREC[node.val]
    s = f"{to_string(node.left, p)} {node.val} {to_string(node.right, p)}"
    return f"({s})" if p < parent_prec else s

def fold(node: ExprNode) -> ExprNode:
    """Tree DP: a subtree of pure literals collapses into one literal."""
    if node.is_leaf: return node
    node.left, node.right = fold(node.left), fold(node.right)
    if node.left.is_leaf and node.right.is_leaf:
        try:
            return ExprNode(str(evaluate(node)))
        except ZeroDivisionError:
            return node                         # leave a division by zero unfolded
    return node

if __name__ == "__main__":
    root = build("( 3 + 5 ) * 2 - 8 / 4".split())
    print(to_string(root))          # (3 + 5) * 2 - 8 / 4
    print(evaluate(root))           # 14.0
    print(to_string(fold(root)))    # 14.0
```
**Build O(n) / Evaluate O(n) / Space O(h)**

### Extensions
1. Unary minus and right-associative `^` (hint: `>` instead of `>=` in the reduce loop).
2. Variables plus a `substitute(env)` pass, then re-fold.
3. Serialize/deserialize the tree with Section 8's codec and assert a round-trip.
4. Symbolic differentiation — a beautiful bottom-up recursion: `d(u*v) = u'v + uv'`.
5. Swap in an N-ary node so `+`/`*` take many children, then flatten `(a+b)+c → +(a,b,c)`
   — a real compiler optimisation.
