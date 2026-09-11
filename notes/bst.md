# Binary Search Trees — Complete Guide

> Google DSA prep notes. Category: Trees / Ordered data structures.
> Companion to `trees.md` (generic traversal + recursion machinery) and
> `binary_search.md` (the same "discard half" idea, but on a sorted array).
> One sentence to remember the whole file: **a BST is a sorted array that you
> traverse lazily** — its inorder walk *is* that array.

---

## 1. The invariant (state it precisely — this is trap #1)

A node `x` with value `x.val` satisfies:

    every value in x.left  subtree  <  x.val
    every value in x.right subtree  >  x.val

Note "**every value in the subtree**", not "the two child nodes". The single most
common interview bug is validating with `node.left.val < node.val < node.right.val`,
which happily accepts:

```
        10
       /  \
      5    15
          /  \
         6    20      # 6 < 10 but it sits in the right subtree -> INVALID
```

Duplicates: undefined by default. Clarify out loud — the usual conventions are
(a) not allowed, (b) all duplicates go left (`<=` on the left), or (c) store a
`count` field on the node. Pick one and stay consistent in every comparison.

### Why O(h), and why h can be O(n)

Search compares once per level and discards one whole side, so the cost is the
**height** `h`, not `n`. For a perfectly balanced tree `h = log2(n)`. But a plain
BST has *no* self-balancing: insert `1,2,3,4,5` in order and every node becomes a
right child — you built a linked list with `h = n`, and every op is O(n).

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right
```

**Mental trigger:** if a problem hands you a BST, ask *"can I do this in one
inorder pass?"* before anything else. If it hands you a *stream* and asks for
order statistics, you need a **balanced** BST / BIT, not a hand-rolled BST.

---

## 2. THE golden rule: inorder of a BST is sorted

Left → node → right visits values in strictly increasing order. Therefore:

| Array problem | BST version |
|---|---|
| is the array sorted? | Validate BST |
| two elements swapped, fix them | Recover BST |
| `arr[k-1]` | Kth Smallest |
| min adjacent difference | Minimum Absolute Difference in BST |
| two-sum on a sorted array | Two Sum IV (two-pointer over two iterators) |
| suffix sums | Convert BST to Greater Tree (reverse inorder) |
| `bisect_left` | floor / ceiling |

Most BST problems are *"solve the array problem, but on the inorder stream, in
O(1) extra space"* — i.e. never materialise the list, just keep the **previous
node**.

### Generic skeleton: inorder with a `prev` pointer

```python
def inorder_with_prev(root):
    prev = None                      # previously visited node (not parent!)
    def dfs(node):
        nonlocal prev
        if not node:
            return
        dfs(node.left)
        # ---- visit(node): `prev` is the in-order predecessor ----
        if prev and prev.val >= node.val:
            ...                      # violation / anomaly handling
        prev = node
        # --------------------------------------------------------
        dfs(node.right)
    dfs(root)
```

**Time O(n) / Space O(h)** (recursion stack).
Swap `dfs(left)`/`dfs(right)` to get **reverse inorder** = descending order.

---

## 3. Template A — Search / Insert / Delete

### Search

```python
def search_bst(root, target):        # recursive
    if not root or root.val == target:
        return root
    return search_bst(root.left, target) if target < root.val \
        else search_bst(root.right, target)

def search_bst_iter(root, target):   # preferred: O(1) space, no stack overflow
    while root and root.val != target:
        root = root.left if target < root.val else root.right
    return root
```
**Time O(h) / Space O(h) recursive, O(1) iterative.**

### Insert (always at a leaf)

```python
def insert_into_bst(root, val):
    if not root:
        return TreeNode(val)
    if val < root.val:
        root.left = insert_into_bst(root.left, val)     # reattach the returned subtree
    elif val > root.val:
        root.right = insert_into_bst(root.right, val)
    return root                                          # unchanged root bubbles up
```

The `root.left = recurse(...)` idiom is the whole trick: each call **returns the
new subtree root**, so the parent just rebinds its pointer. Forgetting the
assignment silently drops the insert.

### Delete — all three cases

```python
def delete_node(root, key):
    if not root:
        return None
    if key < root.val:
        root.left = delete_node(root.left, key)
    elif key > root.val:
        root.right = delete_node(root.right, key)
    else:
        # case 1 & 2: zero or one child -> splice the child up
        if not root.left:
            return root.right
        if not root.right:
            return root.left
        # case 3: two children -> replace with inorder successor
        succ = root.right
        while succ.left:                 # leftmost of the right subtree
            succ = succ.left
        root.val = succ.val              # copy value down
        root.right = delete_node(root.right, succ.val)   # delete the successor
    return root
```
**Time O(h) / Space O(h).**

Why the successor works: it is the smallest value greater than everything on the
left and smaller than everything else on the right — exactly the invariant slot.
The inorder **predecessor** (rightmost of the left subtree) works identically;
alternating between them is what keeps hand-rolled BSTs from skewing.
The successor has **no left child**, so the recursive delete of it hits case 1/2
and terminates — no infinite regress.

**Mental trigger:** any BST mutation → write `node.child = recurse(child)` and
`return node` at the end. Missing return = lost subtree.

---

## 4. Template B — Validation and repair

### Validate BST, version 1: min/max bounds (top-down)

```python
def is_valid_bst(root):
    def dfs(node, lo, hi):
        if not node:
            return True
        if not (lo < node.val < hi):     # must fit the window inherited from ancestors
            return False
        return dfs(node.left, lo, node.val) and dfs(node.right, node.val, hi)
    return dfs(root, float('-inf'), float('inf'))
```
**Time O(n) / Space O(h).**
Use `float('-inf')/float('inf')`, **not** `INT_MIN/INT_MAX` — LeetCode explicitly
tests `[2147483647]`. In Python you can also pass `None` and test for it.

### Validate BST, version 2: inorder must be strictly increasing

```python
def is_valid_bst_inorder(root):
    st, prev = [], None
    node = root
    while node or st:
        while node:
            st.append(node); node = node.left
        node = st.pop()
        if prev is not None and node.val <= prev:   # equal counts as invalid
            return False
        prev = node.val
        node = node.right
    return True
```
Version 2 early-exits on the *first* out-of-order pair and needs no bound
plumbing; version 1 generalises better (e.g. "count nodes valid in range").

### Recover Binary Search Tree (exactly two nodes swapped)

Run the inorder scan; a descent `prev.val > cur.val` is an **anomaly**.

- If the swapped nodes are **non-adjacent** in inorder order you see **two**
  anomalies: e.g. sorted `1 2 3 4 5` → `1 5 3 4 2`, anomalies at `(5,3)` and
  `(4,2)`. Take the **first** element of the first anomaly (`5`) and the
  **second** element of the last anomaly (`2`).
- If they are **adjacent** you see only **one** anomaly: `1 3 2 4 5` → anomaly
  `(3,2)`; the answer is exactly that pair.

The unified rule: `first = prev` on the *first* anomaly only; `second = cur` on
*every* anomaly (so it ends up holding the last one).

```python
def recover_tree(root):
    first = second = prev = None
    def dfs(node):
        nonlocal first, second, prev
        if not node:
            return
        dfs(node.left)
        if prev and prev.val > node.val:
            if first is None:
                first = prev          # only the FIRST anomaly sets `first`
            second = node             # EVERY anomaly overwrites `second`
        prev = node
        dfs(node.right)
    dfs(root)
    first.val, second.val = second.val, first.val   # swap values, not links
    return root
```
**Time O(n) / Space O(h)** → the O(1)-space follow-up is Morris inorder.

---

## 5. Template C — Ordered queries (kth, rank, floor/ceil, closest)

### Kth smallest — inorder with a counter, stop early

```python
def kth_smallest(root, k):
    st, node = [], root
    while node or st:
        while node:
            st.append(node); node = node.left
        node = st.pop()
        k -= 1
        if k == 0:
            return node.val
        node = node.right
```
**Time O(h + k) / Space O(h)** — the iterative version can *stop*; recursion has
to be short-circuited manually.

### Follow-up: "the tree is modified often" → augment with subtree sizes

Store `size` = number of nodes in that subtree. Then kth-smallest is O(h), and
insert/delete update sizes along the O(h) path.

```python
class SizedNode:
    def __init__(self, val):
        self.val, self.left, self.right, self.size = val, None, None, 1

def size(n):  return n.size if n else 0

def insert(node, val):
    if not node:
        return SizedNode(val)
    if val < node.val:  node.left  = insert(node.left, val)
    else:               node.right = insert(node.right, val)
    node.size = 1 + size(node.left) + size(node.right)
    return node

def kth(node, k):                       # 1-indexed
    while node:
        left = size(node.left)
        if k == left + 1:
            return node.val
        if k <= left:
            node = node.left            # kth lives entirely on the left
        else:
            k -= left + 1               # skip left subtree AND node itself
            node = node.right
    return None

def rank(node, val):                    # how many values are strictly < val
    r = 0
    while node:
        if val <= node.val:
            node = node.left
        else:
            r += size(node.left) + 1
            node = node.right
    return r
```
**Time O(h) per op / Space O(n).** This `kth` + `rank` pair is *order statistics*
— say those words in the interview.

### Floor / ceiling (`bisect` on a tree)

```python
def floor_val(root, x):        # largest value <= x
    best = None
    while root:
        if root.val == x:  return x
        if root.val < x:
            best = root.val; root = root.right   # candidate, try bigger
        else:
            root = root.left
    return best

def ceil_val(root, x):         # smallest value >= x
    best = None
    while root:
        if root.val == x:  return x
        if root.val > x:
            best = root.val; root = root.left
        else:
            root = root.right
    return best
```
**Time O(h) / Space O(1).**

### Closest value (LC 270) and closest K values (LC 272)

```python
def closest_value(root, target):
    best = root.val
    while root:
        if abs(root.val - target) < abs(best - target):
            best = root.val
        root = root.left if target < root.val else root.right
    return best
```

For **K closest**, build two stacks along the search path — one holding the
predecessor chain (descending), one the successor chain (ascending) — then merge
them like two sorted lists, picking the closer head K times.

```python
def closest_k_values(root, target, k):
    pred, succ = [], []
    node = root
    while node:                          # seed both stacks along the search path
        if node.val < target:
            pred.append(node); node = node.right
        else:
            succ.append(node); node = node.left

    def advance(stack, to_left):         # pop next value in the right direction
        top = stack.pop()
        node = top.left if to_left else top.right
        while node:
            stack.append(node)
            node = node.right if to_left else node.left
        return top.val

    res = []
    p = pred[-1].val if pred else None
    s = succ[-1].val if succ else None
    while len(res) < k:
        if s is None or (p is not None and target - p <= s - target):
            res.append(p); p = advance(pred, True) if pred else None
        else:
            res.append(s); s = advance(succ, False) if succ else None
    return res
```
**Time O(h + k) / Space O(h).** The naive "inorder into a list, then sliding
window / heap" is O(n) — mention it, then give this as the optimal.

---

## 6. Template D — Range operations (the pruning family)

Every one of these is the same move: **use the invariant to skip a whole subtree.**

```python
def range_sum_bst(root, lo, hi):
    if not root:
        return 0
    if root.val < lo:                       # entire left subtree is < lo
        return range_sum_bst(root.right, lo, hi)
    if root.val > hi:                       # entire right subtree is > hi
        return range_sum_bst(root.left, lo, hi)
    return root.val + range_sum_bst(root.left, lo, hi) \
                    + range_sum_bst(root.right, lo, hi)
```
**Time O(n) worst, O(k + h) when the answer is sparse / Space O(h).**

```python
def trim_bst(root, lo, hi):
    if not root:
        return None
    if root.val < lo:
        return trim_bst(root.right, lo, hi)   # drop root AND its whole left side
    if root.val > hi:
        return trim_bst(root.left, lo, hi)
    root.left  = trim_bst(root.left, lo, hi)
    root.right = trim_bst(root.right, lo, hi)
    return root
```

```python
def count_in_range(root, lo, hi):
    if not root:                       return 0
    if root.val < lo:                  return count_in_range(root.right, lo, hi)
    if root.val > hi:                  return count_in_range(root.left, lo, hi)
    return 1 + count_in_range(root.left, lo, hi) + count_in_range(root.right, lo, hi)
```

Same shape gives **LCA of a BST** — no subtree search needed at all:

```python
def lowest_common_ancestor(root, p, q):
    while root:
        if p.val < root.val and q.val < root.val:   root = root.left
        elif p.val > root.val and q.val > root.val: root = root.right
        else: return root            # split point (or root == p / q)
```
**Time O(h) / Space O(1).**

**Mental trigger:** the words "in the range `[lo, hi]`" on a BST → prune, never
traverse both sides blindly.

---

## 7. Template E — Construction

### Sorted array → height-balanced BST

```python
def sorted_array_to_bst(nums):
    def build(lo, hi):
        if lo > hi:
            return None
        mid = (lo + hi) // 2          # any mid works; // 2 gives a left-leaning tree
        node = TreeNode(nums[mid])
        node.left  = build(lo, mid - 1)
        node.right = build(mid + 1, hi)
        return node
    return build(0, len(nums) - 1)
```
**Time O(n) / Space O(log n).**

### Sorted linked list → BST in O(n) (inorder simulation)

Don't convert to an array (O(n) space) or find the middle each time (O(n log n)).
Instead build the tree **in inorder order**, consuming the list left to right.

```python
def sorted_list_to_bst(head):
    n, node = 0, head
    while node:
        n += 1; node = node.next
    cur = head
    def build(size):
        nonlocal cur
        if size == 0:
            return None
        left = build(size // 2)       # build left subtree first...
        root = TreeNode(cur.val)      # ...then the list pointer is AT the root
        cur = cur.next
        root.left = left
        root.right = build(size - size // 2 - 1)
        return root
    return build(n)
```
**Time O(n) / Space O(log n).**

### BST from preorder (LC 1008) — bounds method, O(n)

Preorder gives root first; a value belongs to the current subtree only while it
stays inside the inherited upper bound.

```python
def bst_from_preorder(preorder):
    i = 0
    def build(bound):
        nonlocal i
        if i == len(preorder) or preorder[i] > bound:
            return None
        root = TreeNode(preorder[i]); i += 1
        root.left  = build(root.val)   # left subtree: everything < root
        root.right = build(bound)      # right subtree: inherits parent's bound
        return root
    return build(float('inf'))
```
**Time O(n) / Space O(h).** (Preorder + the BST property ⇒ inorder is just the
sorted array, so the tree is uniquely determined.)

### Unique BSTs I & II — Catalan

Fix `i` as the root of a tree built from `1..n`. Then the left subtree uses the
`i-1` smaller values and the right uses the `n-i` larger ones, independently:

$$G(n)=\sum_{i=1}^{n} G(i-1)\,G(n-i),\qquad G(0)=G(1)=1$$

which is the Catalan number $C_n = \binom{2n}{n}/(n+1)$.

```python
def num_trees(n):
    G = [0] * (n + 1); G[0] = 1
    for nodes in range(1, n + 1):
        for root in range(1, nodes + 1):
            G[nodes] += G[root - 1] * G[nodes - root]
    return G[n]
```
**Time O(n²) / Space O(n).**

```python
def generate_trees(n):                       # LC 95 — return all trees
    from functools import lru_cache
    def build(lo, hi):
        if lo > hi:
            return [None]
        out = []
        for r in range(lo, hi + 1):
            for L in build(lo, r - 1):
                for R in build(r + 1, hi):
                    out.append(TreeNode(r, L, R))
        return out
    return build(1, n) if n else []
```
**Time O(n · Cₙ) / Space O(n · Cₙ).** Only the *shape* depends on the range size,
so memoising on `(hi - lo)` and relabelling is the optimisation to mention.

---

## 8. Template F — BST Iterator (LC 173) — a Google favourite

Controlled inorder: keep only the **left spine** on the stack, so space is O(h),
not O(n). Each node is pushed and popped exactly once over `n` calls → **amortized
O(1)** per `next()` (worst single call is O(h)).

```python
class BSTIterator:
    def __init__(self, root):
        self.st = []
        self._push_left(root)

    def _push_left(self, node):
        while node:
            self.st.append(node)
            node = node.left

    def has_next(self) -> bool:
        return bool(self.st)

    def next(self) -> int:
        node = self.st.pop()
        self._push_left(node.right)    # the right subtree becomes the new frontier
        return node.val

    def peek(self) -> int:
        return self.st[-1].val
```
**Time amortized O(1) per next / Space O(h).**

### Bidirectional variant (LC 1586)

Keep a second stack seeded with the **right** spine and a `_push_right` mirror;
`prev()` pops from it. The clean way to support interleaved `next()/prev()`
without bugs is to maintain an index into a lazily grown list, or to re-seed the
opposite stack from the last returned value (O(h)).

### Two Sum in a BST (LC 653) with two iterators

Forward iterator = smallest-first, reverse iterator = largest-first → classic
two-pointer on a sorted sequence, in **O(h) space instead of O(n)**.

```python
def find_target(root, k):
    lo, hi = BSTIterator(root), ReverseBSTIterator(root)
    a, b = lo.next(), hi.next()
    while a < b:
        s = a + b
        if s == k:   return True
        if s < k:    a = lo.next()
        else:        b = hi.next()
    return False
```

**Mental trigger:** "design a class over a BST" / "O(h) memory" / "next() must be
O(1)" → explicit-stack controlled inorder.

---

## 9. Successor / Predecessor

### With parent pointers (LC 510)

```python
def inorder_successor_parent(node):
    if node.right:                      # leftmost node of the right subtree
        node = node.right
        while node.left:
            node = node.left
        return node
    while node.parent and node.parent.right is node:
        node = node.parent              # climb while we are a RIGHT child
    return node.parent                  # first ancestor we are a left child of
```

### Without parent pointers (LC 285) — search from the root

```python
def inorder_successor(root, p):
    succ = None
    while root:
        if p.val < root.val:
            succ = root                 # candidate; something smaller may exist left
            root = root.left
        else:
            root = root.right           # p.val >= root.val: successor is to the right
    return succ
```
**Time O(h) / Space O(1).** Predecessor is the mirror image.

**Follow-up (LC 285 II / "not a BST"):** if the tree isn't a BST you must do a
real inorder scan and return the node right after `p` — O(n). If instead the
follow-up is "many queries", precompute the inorder list or thread the tree.

---

## 10. Balanced BSTs in Python interviews

Python has **no built-in TreeMap/TreeSet**. `heapq` gives you only the min, and
`bisect` on a `list` is O(log n) to *find* but O(n) to *insert*. Your three
options:

**(a) `sortedcontainers.SortedList`** — allowed on LeetCode, not in stdlib. Ask
the interviewer; if they say no, fall back to (b) or (c).

```python
from sortedcontainers import SortedList
sl = SortedList()
sl.add(5); sl.add(1); sl.add(9)     # O(log n) amortized
i = sl.bisect_left(5)               # O(log n) -> rank / floor / ceiling
sl.remove(5)                        # O(log n)
sl[0], sl[-1], sl[k]                # O(log n) indexing  -> order statistics
```

**(b) Heap + lazy deletion** — when you only need the min/max and deletions are
"logical". Push `(val, id)`, keep a `removed` set, and pop-while-top-is-removed.
Good for "sliding window median"-lite and scheduling; **cannot** do rank queries.

**(c) Fenwick tree (BIT) over coordinate-compressed values** — the real workhorse
for offline order-statistics problems.

```python
class BIT:
    def __init__(self, n):
        self.n, self.t = n, [0] * (n + 1)     # 1-indexed

    def add(self, i, v=1):                    # i is 0-indexed
        i += 1
        while i <= self.n:
            self.t[i] += v; i += i & -i

    def query(self, i):                       # sum of [0, i) in 0-indexed terms
        s = 0
        while i > 0:
            s += self.t[i]; i -= i & -i
        return s

def count_smaller(nums):                      # LC 315
    rank = {v: i for i, v in enumerate(sorted(set(nums)))}
    bit, res = BIT(len(rank)), []
    for v in reversed(nums):                  # walk right-to-left
        res.append(bit.query(rank[v]))        # already-seen values strictly smaller
        bit.add(rank[v])
    return res[::-1]
```
**Time O(n log n) / Space O(n).**

For **Contains Duplicate III (LC 220)** the ordered-structure solution is a
`SortedList` window: for each `x`, binary-search for the first element `>= x - t`
and check it is `<= x + t`; evict `nums[i - k]` as you slide. The bucket
solution (bucket width `t + 1`) is the O(n) alternative — know both.

---

## 11. Transformations

### Convert BST to Greater Tree (LC 538/1038) — reverse inorder accumulation

```python
def convert_bst(root):
    total = 0
    def dfs(node):
        nonlocal total
        if not node:
            return
        dfs(node.right)          # visit LARGEST first
        total += node.val
        node.val = total         # running suffix sum
        dfs(node.left)
    dfs(root)
    return root
```
**Time O(n) / Space O(h).**

### BST → sorted doubly linked list, in place (LC 426)

```python
def tree_to_doubly_list(root):
    if not root:
        return None
    first = last = None
    def dfs(node):
        nonlocal first, last
        if not node:
            return
        dfs(node.left)
        if last:
            last.right, node.left = node, last   # stitch predecessor <-> node
        else:
            first = node
        last = node
        dfs(node.right)
    dfs(root)
    first.left, last.right = last, first         # close the circle
    return first
```

### Merge two BSTs / All Elements in Two BSTs (LC 1305)

Two `BSTIterator`s + a merge step → **O(m + n) time, O(h₁ + h₂) space**. If asked
to *merge into one balanced BST*: merge the two inorder lists, then run
`sorted_array_to_bst` — O(m + n). (Same recipe as **Balance a BST**, LC 1382:
inorder → array → rebuild.)

---

## 12. Common pitfalls

1. **Validating with parent–child comparisons only.** Must carry bounds (or use
   inorder). The `10 / 15 / 6` counter-example above is the standard rejection.
2. **`INT_MIN`/`INT_MAX` as sentinels.** Fails on a tree containing exactly those
   values. Use `±inf` or `None`.
3. **Duplicates policy unstated.** `<=` vs `<` flips answers in Validate BST,
   Kth Smallest and Insert. Ask first.
4. **Delete/insert not returning the subtree root** (or the caller not
   reassigning `node.left = ...`) → silently lost subtrees.
5. **Recursion on a skewed tree.** `h = n = 10⁵` blows Python's 1000-frame limit.
   Prefer iterative search/insert, or say "I'd convert this to an explicit stack".
6. **Assuming the tree is balanced.** Never write "O(log n)" unqualified — write
   **O(h)**, then say "O(log n) if balanced, O(n) worst case".
7. **Mutating while iterating.** Deleting nodes during an inorder walk invalidates
   the stack. Collect the targets first, mutate after (or rebuild).
8. **Comparing nodes instead of values** (`p < root` instead of `p.val < root.val`)
   — Python will raise `TypeError`, but the same slip in LCA logic is subtle.
9. **`prev` confused with `parent`.** In the inorder skeleton `prev` is the
   *previously visited node*, which is usually not the parent.
10. **Recover BST: swapping links instead of values.** Swap `.val` — swapping
    pointers requires fixing four references and is where people lose the tree.

---

## 13. Cheat sheets

### Complexity

| Operation | Plain BST | Balanced (AVL/RB/`SortedList`) | Sorted array |
|---|---|---|---|
| Search / floor / ceil | O(h) | O(log n) | O(log n) |
| Insert / delete | O(h) | O(log n) | O(n) |
| Kth smallest | O(h + k), O(h) if size-augmented | O(log n) | O(1) |
| Min / max | O(h) | O(log n) | O(1) |
| Inorder / sorted output | O(n) | O(n) | O(n) |
| Range query `[lo,hi]` | O(h + k) | O(log n + k) | O(log n + k) |

Space: O(h) for any recursion or explicit-stack iteration; Morris traversal gets
you O(1) at the cost of temporarily mutating right pointers.

### Phrasing → approach

| The problem says… | Reach for |
|---|---|
| "validate", "is it a BST" | bounds recursion **or** inorder + `prev` |
| "kth smallest / largest" | inorder counter; augment sizes if mutable |
| "in the range [lo, hi]" | prune (Template D) |
| "closest value(s)" | root-to-leaf descent; two stacks for K |
| "successor / predecessor" | one descent tracking the last left-turn |
| "sorted array/list → tree" | recursive middle, or inorder simulation |
| "how many distinct trees" | Catalan DP |
| "design an iterator", "O(h) memory" | explicit-stack controlled inorder |
| "two sum on a BST" | forward + reverse iterator, two pointers |
| "LCA" | walk down while both on the same side |
| "count smaller/greater to the right", "rank in a stream" | BIT / SortedList |
| "book an interval, no double-booking" | ordered map: floor + ceiling |

---

## 14. Problem ladder (Google-flavoured)

**Basic**
1. **700 Search in a BST** — the descent, iteratively.
2. **701 Insert into a BST** — reattach the returned subtree.
3. **270 Closest BST Value** — track best while descending.
4. **938 Range Sum of BST** — first pruning problem.
5. **897 Increasing Order Search Tree** — inorder rebuild into a right chain.
6. **530 / 783 Minimum Absolute Difference in BST** — inorder + `prev`.
7. **235 LCA of a BST** — no subtree search; O(h), O(1).
8. **108 Convert Sorted Array to BST** — recursive middle.
9. **1382 Balance a BST** — inorder → array → rebuild.

**Medium**
10. **98 Validate BST** — bounds *and* inorder; know both.
11. **450 Delete Node in a BST** — the three cases; successor swap.
12. **230 Kth Smallest in a BST** — plus the "modified often" size augmentation.
13. **173 BST Iterator** — amortized O(1), O(h) space.
14. **653 Two Sum IV** — two iterators (beats the hash-set answer on space).
15. **669 Trim a BST** — prune and return.
16. **285 Inorder Successor in BST** — last left-turn; II is the parent-pointer version.
17. **510 Inorder Successor II** — climb while you are a right child.
18. **449 Serialize and Deserialize BST** — preorder only, no null markers needed.
19. **1008 Construct BST from Preorder** — bounds method, O(n).
20. **96 Unique BSTs** — Catalan DP.
21. **95 Unique BSTs II** — build all trees; memoise on shape.
22. **538 / 1038 Convert BST to Greater Tree** — reverse inorder suffix sums.
23. **426 BST → Sorted Doubly Linked List** — in-place stitching.
24. **109 Convert Sorted List to BST** — inorder simulation, O(n).
25. **1305 All Elements in Two BSTs** — merge two iterators.
26. **333 Largest BST Subtree** — bottom-up returning `(min, max, size, isBST)`.
27. **729 My Calendar I** — floor/ceiling on an ordered map.
28. **731 My Calendar II** — double-booking allowed; sweep or two interval sets.
29. **220 Contains Duplicate III** — sliding `SortedList`, or bucketing.

**Hard**
30. **99 Recover BST** — first/second anomaly; Morris for O(1) space.
31. **272 Closest BST Values II** — two stacks, O(h + k).
32. **315 Count of Smaller Numbers After Self** — BIT / merge sort / SortedList.
33. **732 My Calendar III** — max concurrency; sweep with an ordered map.
34. **352 Data Stream as Disjoint Intervals** — ordered map of interval starts,
    merge with the floor and ceiling neighbours on each insert.
35. **1902 Depth of BST Given Insertion Order** — ordered map of neighbours.

---

## 15. Quiz

**Q1.** Why isn't `node.left.val < node.val < node.right.val` at every node enough?
<details><summary>Answer</summary>
It only checks immediate children. A deep node can violate an *ancestor's* bound —
e.g. `6` in the right subtree of `10`. You must propagate `(lo, hi)` windows, or
check that the full inorder sequence is strictly increasing.
</details>

**Q2.** A BST built by inserting `1..n` in order — what is the cost of `search(n)`?
<details><summary>Answer</summary>
O(n). Every insert becomes a right child, so `h = n`; the tree is a linked list.
This is why real systems use AVL/red-black/B-trees, and why you should quote O(h),
not O(log n).
</details>

**Q3.** In `delete`, why replace a 2-child node with its inorder successor rather
than any right-subtree node?
<details><summary>Answer</summary>
The successor is the *smallest* value in the right subtree, so it is greater than
everything on the left and less than everything remaining on the right — the only
choice (besides the predecessor) that preserves the invariant. It also has no left
child, so deleting it recursively hits the easy 0/1-child case.
</details>

**Q4.** Recover BST: you find only one anomaly `(prev, cur)`. What does that mean?
<details><summary>Answer</summary>
The two swapped nodes are adjacent in inorder order, so they produce a single
descent. Swap exactly `prev` and `cur`. Two anomalies ⇒ take `first` from the
first and `second` from the last.
</details>

**Q5.** Kth smallest is called millions of times while the tree is inserted into
and deleted from. What changes?
<details><summary>Answer</summary>
Augment each node with its subtree `size`, maintained on the O(h) insert/delete
path. Then `kth` is O(h): compare `k` with `size(left) + 1` and descend,
subtracting `size(left) + 1` when going right. Also mention keeping the tree
balanced (AVL/red-black) so O(h) = O(log n).
</details>

**Q6.** Why is `BSTIterator.next()` amortized O(1) when a single call can be O(h)?
<details><summary>Answer</summary>
Over a full traversal each node is pushed once and popped once — 2n stack
operations total for n calls. The expensive calls (long left spines) pay for the
cheap ones.
</details>

**Q7.** How do you find the floor of `x` (largest value ≤ x) in O(h), O(1) space?
<details><summary>Answer</summary>
Descend from the root. When `node.val <= x`, record it as the best candidate and
go right (looking for something closer to `x`); otherwise go left. The last
recorded candidate is the floor.
</details>

**Q8.** Python has no TreeMap. You need O(log n) insert plus rank queries. Options?
<details><summary>Answer</summary>
(1) `sortedcontainers.SortedList` if permitted; (2) a Fenwick/segment tree over
coordinate-compressed values when the value universe is known offline; (3) a
hand-rolled size-augmented BST/treap; (4) offline merge-sort counting. A heap does
**not** work — it can't answer rank or ordered-neighbour queries.
</details>

---

## 16. Mini project — booking / leaderboard service

A single ordered structure answers both classic Google follow-ups: "no
double-booking" (floor + ceiling neighbours) and "what rank is this score"
(order statistics).

```python
from sortedcontainers import SortedList


class BookingService:
    """Non-overlapping interval booking, LC 729 generalised."""

    def __init__(self):
        self.slots = SortedList()          # of (start, end), sorted by start

    def book(self, start: int, end: int) -> bool:
        i = self.slots.bisect_left((start, end))
        if i < len(self.slots) and self.slots[i][0] < end:     # next booking starts too early
            return False
        if i > 0 and start < self.slots[i - 1][1]:             # previous booking ends too late
            return False
        self.slots.add((start, end))
        return True

    def cancel(self, start: int, end: int) -> None:
        self.slots.discard((start, end))

    def next_free_after(self, t: int) -> int:
        i = self.slots.bisect_left((t, t))
        if i > 0 and self.slots[i - 1][1] > t:
            return self.slots[i - 1][1]                        # t falls inside a booking
        return t


class Leaderboard:
    """add / remove / rank / top-k, all O(log n) except top-k = O(k)."""

    def __init__(self):
        self.scores = SortedList()         # negated so index 0 is the highest
        self.by_player = {}

    def submit(self, player: str, score: int) -> None:
        if player in self.by_player:
            self.scores.remove(-self.by_player[player])
        self.by_player[player] = score
        self.scores.add(-score)

    def rank(self, player: str) -> int:                        # 1-indexed, higher is better
        return self.scores.bisect_left(-self.by_player[player]) + 1

    def top(self, k: int):
        return [-s for s in self.scores[:k]]

    def count_between(self, lo: int, hi: int) -> int:
        return self.scores.bisect_right(-lo) - self.scores.bisect_left(-hi)
```

**Extensions to attempt:**
1. Replace `SortedList` with your own size-augmented BST so `rank` and `top(k)`
   run without a library (Template C).
2. Add "max concurrent bookings" (My Calendar III) with a sweep over a
   `SortedDict` of `+1 / -1` deltas.
3. Persist to a sorted array and rebuild a balanced BST on load
   (`sorted_array_to_bst`), showing you understand why balance matters.
