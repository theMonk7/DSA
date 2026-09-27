# Heaps & Priority Queues — Complete Guide

> Google DSA prep notes. Category: Heaps / Priority Queues.
> A heap is the data structure for *"give me the best item right now, repeatedly,
> while new items keep arriving."* Everything below is a variation of that sentence.

## 0. How to invent a heap solution (the interview voice)

Do **not** start from "this looks like a heap problem." Start from four questions.
Every coded solution in this file is just these four answers written down.

1. **What do I keep needing?** If a loop says "give me the current best / cheapest /
   most frequent / earliest-ending item", that *is* a heap. If you only need the
   best **once**, scan or sort — a heap would be theatre.
2. **Does the candidate set change while I loop?** New arrivals, expiries, cooldowns,
   "I just used this so I cannot use it again yet", undoing a past pick — the set is
   *live*. Live set → heap. Frozen set → `sorted()` once.
3. **Who is the victim?** Heap type is chosen by *what you throw away*, not what you
   want as the answer. Keeping the K largest → you evict the smallest of those K →
   **min-heap**. Keeping the K closest → you evict the farthest → **max-heap** on
   distance. **Root = victim, not prize.**
4. **What one-sentence invariant is true after every step?** Write it before coding:
   "this heap always holds exactly the K best so far"; "every list contributes exactly
   one unread head"; "max(lower half) ≤ min(upper half) and the sizes differ by at
   most 1". The code only restores that sentence.

**Two-axis problems** (`sum * min`, profit given capital, speed given efficiency):
sort the axis that acts as a **cap / min**, heap the axis you **accumulate**. That
one sentence is LC 1383, 857, 502, 1642.

**If you cannot name the victim and the invariant, you do not yet have a solution.**
The sections below show that naming process on every worked problem.

---

## 1. What a heap actually is

A **binary heap** is a *complete binary tree* (every level full except possibly the
last, which fills left-to-right) that satisfies the **heap property**:

- **Min-heap:** parent ≤ both children → the global minimum is at the root.
- **Max-heap:** parent ≥ both children → the global maximum is at the root.

Because the tree is complete, it can be stored in a plain array with **no pointers**:

```
index:   0    1    2    3    4    5    6
value:   1    3    2    7    4    5    9

              1(0)
            /      \
         3(1)      2(2)
        /   \      /   \
     7(3)  4(4)  5(5)  9(6)
```

### Index math (memorise this)

```python
parent(i) = (i - 1) // 2
left(i)   = 2 * i + 1
right(i)  = 2 * i + 2
```

Height is `floor(log2(n))`, so every root-to-leaf walk is `O(log n)`.

### A heap is NOT sorted

`[1, 3, 2, 7, 4, 5, 9]` is a valid min-heap but not a sorted array. The heap only
guarantees a **parent–child** ordering along each path, not left-to-right order.
Siblings are unordered; `heap[1]` is not necessarily the 2nd smallest (it *is* one
of the candidates for 2nd smallest, together with `heap[2]`).

**Consequence:** you cannot binary-search a heap, you cannot iterate it in sorted
order without popping, and `heap[k]` means nothing. This is exactly the trade you
make: a heap gives you `O(log n)` insert *and* `O(1)` peek-at-best, by refusing to
maintain full order.

### sift-up (used by push)

**How to think.** Completeness is non-negotiable (that is what makes index math
work), so a new item *must* be appended as the last leaf. That may break the
heap property with its parent, and *only* with its parent — children of a leaf
do not exist. So you swap with the parent until the property holds. You never
look at siblings.

Put the new item at the end (keeps completeness), then bubble it toward the root.

```python
def sift_up(heap, i):
    while i > 0:
        p = (i - 1) // 2
        if heap[i] < heap[p]:            # min-heap: child smaller than parent → swap
            heap[i], heap[p] = heap[p], heap[i]
            i = p
        else:
            break

def heap_push(heap, x):
    heap.append(x)                       # completeness preserved
    sift_up(heap, len(heap) - 1)
```
**Time** O(log n) · **Space** O(1)

### sift-down (used by pop)

**How to think.** Pop must remove the root and keep the tree complete, so the
*last* leaf moves into the hole at the top. That value is usually too big
(min-heap) for the root, so it has to walk down. At each step it has two
children; swapping with the *larger* one would leave the smaller child smaller
than its new parent — broken. Always swap with the child that is more
root-like (smaller in a min-heap).

Move the last element to the root (keeps completeness), then push it down past the
*smaller* child until the heap property holds.

```python
def sift_down(heap, i, n=None):
    n = len(heap) if n is None else n
    while True:
        l, r, smallest = 2 * i + 1, 2 * i + 2, i
        if l < n and heap[l] < heap[smallest]:
            smallest = l
        if r < n and heap[r] < heap[smallest]:
            smallest = r                 # must compare against the SMALLER child
        if smallest == i:
            return
        heap[i], heap[smallest] = heap[smallest], heap[i]
        i = smallest

def heap_pop(heap):
    top = heap[0]
    last = heap.pop()
    if heap:
        heap[0] = last
        sift_down(heap, 0)
    return top
```
**Time** O(log n) · **Space** O(1)

> Swapping with the *larger* child in a min-heap is the classic bug: the new parent
> would violate the property against its other child.

### heapify in O(n) — and why it is not O(n log n)

```python
def heapify(a):
    for i in range(len(a) // 2 - 1, -1, -1):   # last internal node → root
        sift_down(a, i)
    return a
```

**Why this is O(n), not O(n log n).** Leaves (about half the nodes) already satisfy
the heap property, so they cost 0. A node at height `h` sift-downs at most `h`
levels. There are at most `n / 2^{h+1}` nodes of height `h`, so:

```
T(n)  =  Σ_{h = 0 .. log n}  (n / 2^{h+1}) · O(h)
      =  O( n · Σ_{h = 0 .. ∞}  h / 2^h )
      =  O( n · 2 )                  because Σ h/2^h = 2
      =  O(n)
```

The picture: **most nodes sit near the bottom and barely move**; only the few nodes
near the root pay `log n`. Pushing one-by-one is the opposite — every element starts
at a leaf and can climb the full height — hence O(n log n).

**Time** O(n) · **Space** O(1)

---

## 2. Python's `heapq` in practice

`heapq` operates **in place on a plain list** and is **min-heap only**.

**How to think.** Python did not give you a `PriorityQueue` class. It gave you
functions that *rearrange a list*. So `h[0]` is the min, `h` itself is the heap,
and anything that is not `heapq.*` or an index walk (`2*i+1`) will silently
destroy the invariant. Peek is `h[0]`, never `h[-1]`, never `min(h)`.

```python
import heapq

h = [5, 1, 8, 3]
heapq.heapify(h)             # O(n), in place
heapq.heappush(h, 2)         # O(log n)
smallest = heapq.heappop(h)  # O(log n)
peek = h[0]                  # O(1) — never h[-1], never sorted(h)[0]

heapq.heappushpop(h, 4)      # push then pop  — cheaper than two calls
heapq.heapreplace(h, 4)      # pop  then push — heap must be non-empty
heapq.nlargest(3, h)         # O(n log k)
heapq.nsmallest(3, h)
list(heapq.merge([1, 4], [2, 3]))   # lazy k-way merge of sorted iterables
```

`heappushpop` vs `heapreplace`: `heappushpop(h, x)` returns `min(x, h[0])` — if `x`
is smaller than the root, nothing changes. `heapreplace` always evicts the root
first, so it can return something larger than `x`. For the "size-k heap" trick,
`heappushpop` is the right one.

**How to think about the two-in-one ops.** Both are "replace one element, restore
the heap", but they disagree about *whether `x` is allowed to be the new min*:

- `heappushpop` = "consider `x` as a candidate, then throw away whoever is worst
  (including `x` if `x` is worst)". Size-K club uses this.
- `heapreplace` = "the current root is leaving no matter what; `x` is the
  replacement". Meeting-rooms reuse uses this: that room is definitely free, the
  new meeting definitely takes it.

### Max-heap: negate

```python
h = []
for x in [3, 1, 4]:
    heapq.heappush(h, -x)    # store negatives
largest = -heapq.heappop(h)  # ALWAYS re-negate on the way out
```

For tuples, negate only the key you order by: `(-freq, word)` gives *highest freq
first, then lexicographically smallest word* — a very common Google phrasing.

**How to think.** `heapq` only knows min-heaps. To make "bigger is better" you
store the *negated score*. The heap still pops the numerically smallest entry,
which is the *best* original score. Forget the second negation and every answer
is the wrong sign — the most common heap bug in interviews.

On tuples, negation applies **only to the numeric key**. `(-freq, word)` means:
higher freq wins; if freqs tie, smaller word wins (because the heap is still a
min-heap on the second field). That mixed order is usually what LC 692 wants.
If you needed both descending you cannot negate a string — pair with an index.

### Tuples as keys, and the tie-breaking crash

```python
import heapq

class Task:
    def __init__(self, name): self.name = name

h = []
heapq.heappush(h, (1, Task("a")))
heapq.heappush(h, (1, Task("b")))   # TypeError: '<' not supported between Task instances
```

**How to think.** Tuples compare left-to-right until they find a difference. Equal
priorities therefore fall through to the payload. If the payload has no `<`, you
get `TypeError` — but **only on ties**, so your tests can be all-green until the
interviewer adds a duplicate priority.

The counter fix is not a hack: it also gives FIFO among equals, which is what
most schedulers want. Defining `__lt__` is the other path; `heapq` never calls
`__gt__` or `__le__`.

When priorities tie, Python compares the **next** tuple element. If that element is
not orderable, you crash — and it only crashes on *some* inputs, which makes it a
nasty interview bug. Two fixes:

```python
import itertools, heapq

counter = itertools.count()          # unique, monotonically increasing
h = []
heapq.heappush(h, (1, next(counter), Task("a")))
heapq.heappush(h, (1, next(counter), Task("b")))   # safe: counters never tie
```

The counter also gives **FIFO order among equal priorities** for free.

```python
import functools

@functools.total_ordering
class Job:
    def __init__(self, pri, name):
        self.pri, self.name = pri, name
    def __lt__(self, other):          # heapq only ever needs __lt__
        return self.pri < other.pri
    def __eq__(self, other):
        return self.pri == other.pri
```

`heapq` uses **only `<`**. Defining `__lt__` is sufficient; `total_ordering` just
makes the class well-behaved elsewhere.

---

## 3. Mental trigger master list

| Phrase in the problem | Reach for |
|---|---|
| "top K", "K most frequent", "K closest" | size-K heap (opposite type!) |
| "Kth largest / Kth smallest" | size-K heap, or Quickselect |
| "Kth largest **in a stream**" | size-K min-heap kept forever |
| "median of a stream / window" | two heaps |
| "merge K sorted lists/arrays" | heap of heads |
| "smallest range covering all lists" | heap of heads + running max |
| "always take the current best/cheapest/most frequent" | greedy + heap |
| "soonest deadline", "earliest end time" | min-heap of end times |
| "shortest path with weights" | Dijkstra = heap |
| "we may regret an earlier choice" | keep a heap of past choices to undo |
| "at most K of something, maximise/minimise" | heap of size K + sort the other axis |

**Mental trigger (the umbrella one):** *if a greedy loop needs "the best remaining
item" and the set of candidates keeps changing, that's a heap.* If the candidate set
is fixed, just sort once.

**60-second self-check before you code**

1. Name the live set in one phrase ("K largest so far", "heads of unread lists",
   "rooms currently occupied", "stations I drove past but have not used").
2. Name the victim (the element you would throw away). That chooses min vs max.
3. Write the invariant you will restore after every iteration.
4. If two numbers interact (`sum * min`, profit given capital), decide which axis
   you **sort** (the cap) and which you **heap** (the sum).
5. If an element must disappear from the middle of the heap, you need lazy
   deletion — not `list.remove`.

---

## 4. Pattern 1 — Top K / Kth element

### The size-K heap trick (and why the heap type is "backwards")

**How to think.** You do not need the whole ranking — you need a *club of size K*.
After seeing `i` numbers, the club is "the K largest among the first `i`". When
number `i+1` arrives there are only two cases:

- Club not full yet → let it in. Anyone is among the K largest of a short prefix.
- Club full → the newcomer belongs **iff it beats the current weakest member**.
  Everyone else in the club is already ≥ that weakest, so comparing against one
  number is enough. If it gets in, the old weakest is no longer in the top K.

That weakest member is the **victim**. A min-heap puts the victim at the root.

To keep the **K largest** elements you use a **MIN**-heap of size K.

Why: the heap's job is to hold the K best seen so far, and the only element you ever
want to *throw away* is the **weakest of those K**. In a min-heap that weakest item
sits at the root, where you can evict it in `O(log k)`. If you used a max-heap you
would have the strongest at the root — useless, because you never want to evict it.

> "K largest → min-heap. K smallest → max-heap. The root is the *victim*, not the
> prize." The final root is the **Kth largest**.

**Invariant after every insert:** `h` has at most K items, they are a subset of the
numbers seen so far, and every number *not* in `h` is ≤ `h[0]`. Therefore `h[0]`
is the Kth largest (or the minimum of everything, if you have seen fewer than K).

```python
import heapq

def kth_largest(nums, k):
    h = []
    for x in nums:
        if len(h) < k:
            heapq.heappush(h, x)
        elif x > h[0]:                  # better than the weakest of our K
            heapq.heappushpop(h, x)     # one O(log k) op, not two
    return h[0]                         # root = Kth largest
```
**Time** O(n log k) · **Space** O(k)

### O(n log k) vs O(n log n) vs O(n)

| Approach | Time | Space | Use when |
|---|---|---|---|
| Sort, take `a[-k]` | O(n log n) | O(1)/O(n) | n small, or you need all of them ordered |
| Size-K heap | O(n log k) | O(k) | **k << n**, or data is a stream / doesn't fit memory |
| Quickselect | O(n) average, O(n²) worst | O(1) | array in memory, single query, k arbitrary |
| `heapq.nlargest(k, a)` | O(n log k) | O(k) | you want one line |

When `k ≈ n`, the size-K heap is `O(n log n)` **and** uses `O(n)` memory — just sort.

### Quickselect (expected O(n))

**How to think.** Sorting is overkill: you do not care about the order of the other
n − 1 elements, only about *which* value sits at rank `n − k` in the sorted array
(0-indexed). Partition (the same step as quicksort) puts a pivot in its final
sorted slot `p`. Then:

- `p` is the rank you wanted → done.
- `p` is too far left → the answer lives in the right piece; throw the left away.
- `p` is too far right → throw the right away.

You only recurse into **one** side. If each pivot lands near the middle, the work
is `n + n/2 + n/4 + … = 2n`. Random pivot makes a consistently terrible split
astronomically unlikely.

**Why not always Quickselect?** It needs the whole array in memory, it mutates,
and it answers *one* query. A stream, an unknown `n`, or "give me the K items
themselves" all push you back to the size-K heap.

```python
import random

def quickselect_kth_largest(nums, k):
    """kth largest, 1-indexed. Mutates nums."""
    target = len(nums) - k                     # index it must land on when ascending
    lo, hi = 0, len(nums) - 1
    while True:
        p = _partition(nums, lo, hi)
        if p == target:
            return nums[p]
        if p < target:
            lo = p + 1                         # answer is to the right
        else:
            hi = p - 1                         # answer is to the left

def _partition(nums, lo, hi):
    r = random.randint(lo, hi)                 # random pivot ⇒ adversary-proof
    nums[r], nums[hi] = nums[hi], nums[r]
    pivot = nums[hi]
    i = lo
    for j in range(lo, hi):
        if nums[j] < pivot:
            nums[i], nums[j] = nums[j], nums[i]
            i += 1
    nums[i], nums[hi] = nums[hi], nums[i]      # pivot to its final position
    return i
```
**Time** O(n) average, O(n²) worst · **Space** O(1)

Why average `O(n)`: each round discards a constant fraction, so
`n + n/2 + n/4 + ... = 2n`. Unlike quicksort you only recurse into **one** side.

**Prefer Quickselect when:** the whole array is in memory, you need one Kth query,
and mutating/reordering is allowed. **Prefer the heap when:** data streams in, `n`
is unknown or huge, you need the K items (not just the Kth), or you must not mutate
the input. **Worst case:** all-equal elements or an adversarial order — random pivot
makes `O(n²)` astronomically unlikely; Median-of-Medians makes it `O(n)` worst-case
but with a bad constant (mention it, don't code it).

### Top K Frequent Elements

**How to think.** Frequency is just another score. Count once (`Counter` is O(n)),
then the problem *is* "K largest scores". Same victim: the least-frequent of the
current K. `heapq.nlargest(k, freq, key=freq.get)` is that size-K heap in one line.

**Why a follow-up exists.** Frequencies are integers in `1..n`, so you can *index*
by frequency: `bucket[f]` = all values that appear `f` times. Scan `bucket` from
`n` down to 1 and collect K items. That is O(n) because you never sort and never
heap. Reach for it when the interviewer asks "can you beat `n log k`?".

```python
import heapq
from collections import Counter

def top_k_frequent(nums, k):
    freq = Counter(nums)
    return heapq.nlargest(k, freq, key=freq.get)      # O(n log k)
```
Bucket sort gives a true `O(n)`: index buckets by frequency `1..n`, scan from the
top. Mention it — Google likes the follow-up "can you beat `n log k`?".

### K Closest Points to Origin

**How to think.** "Closest" = K *smallest* distances. Victim of a K-smallest club
is the *farthest of the K*, so you want a **max-heap on distance**. Squared
distance `x*x + y*y` is enough: sqrt is strictly increasing, so it never changes
comparisons, and you avoid floats.

Picture a circle around the origin that just covers your current K. A new point
enters the club only if it lands **inside** that circle; then the old farthest
point is kicked out and the circle may shrink. The heap root *is* that circle's
radius.

```python
import heapq

def k_closest(points, k):
    h = []                                   # max-heap by distance, size k
    for x, y in points:
        d = x * x + y * y                    # no sqrt: monotonic, avoids floats
        if len(h) < k:
            heapq.heappush(h, (-d, x, y))
        elif -d > h[0][0]:                   # closer than our current worst
            heapq.heappushpop(h, (-d, x, y))
    return [[x, y] for _, x, y in h]
```
**Time** O(n log k) · **Space** O(k)
K *smallest* distances → **max**-heap. Same trick, mirrored.

### Kth Largest in a Stream

**How to think.** Same club as Kth-largest-in-an-array, except the club is a
*long-lived object*. Construction is "heapify the starting list, then evict until
size is K" — heapify is O(n), cheaper than K pushes. Each `add` is one comparison
against the victim (`h[0]`):

- fewer than K members → always admit (you do not yet have a Kth)
- `val` ≤ victim → ignore; it cannot enter the top K
- `val` > victim → `heappushpop` swaps them in one O(log k) step

`heappushpop` (push then pop) is the right primitive: if `val` is smaller than the
root it is a no-op on the structure after the pop, and the heap never grows past K.
`heapreplace` (pop then push) would *always* evict the root, which is wrong when
`val` is worse than the victim.

Equals do **not** replace the root (`val > h[0]`). "Kth largest" with duplicates
should keep one of the equals; replacing would shuffle identical values for no
reason.

```python
import heapq

class KthLargest:
    def __init__(self, k, nums):
        self.k = k
        self.h = list(nums)
        heapq.heapify(self.h)                # O(n)
        while len(self.h) > k:
            heapq.heappop(self.h)

    def add(self, val):
        if len(self.h) < self.k:
            heapq.heappush(self.h, val)
        elif val > self.h[0]:
            heapq.heappushpop(self.h, val)
        return self.h[0]
```
**Time** O(n + m log k) for m adds · **Space** O(k)

**Mental trigger:** "top/Kth ... and the data keeps coming" → fixed-size heap of the
**opposite** type; never store more than k items.

---

## 5. Pattern 2 — Merge K sorted sequences

### Heap of heads

**How to think.** Each list is already sorted, so the next unused value of list `i`
is always its current head. The next number of the *merged* output is therefore the
minimum among the k heads. That is exactly "give me the best of a live set of size
k" — a min-heap of heads.

After you emit a head, that list's *next* cell becomes its new head and must enter
the competition. Heap size stays ≤ k because you never store more than one unread
cell per list.

**Why not concatenate and sort?** That is O(N log N). The heap uses the fact that
order *inside* each list is already known, so you only pay `log k` per element:
O(N log k).

**Invariant:** the heap holds the leftmost unused element of every non-exhausted
list. Anything already popped is ≤ every remaining element (because each list is
sorted and we always took the global min of the heads).

Keep exactly one element per list in the heap: the current head. Pop the global
minimum, then push that list's next element. The heap size is always at most k.

```python
import heapq

def merge_k_sorted_arrays(arrays):
    h = [(a[0], i, 0) for i, a in enumerate(arrays) if a]   # (value, list_idx, pos)
    heapq.heapify(h)
    out = []
    while h:
        val, i, j = heapq.heappop(h)
        out.append(val)
        if j + 1 < len(arrays[i]):
            heapq.heappush(h, (arrays[i][j + 1], i, j + 1))  # refill from same list
    return out
```
**Time** O(N log k) for N total elements · **Space** O(k)

For linked lists, push `(node.val, i, node)` — the `i` is the tie-breaker that stops
Python from comparing `ListNode` objects (see §2).

`heapq.merge(*iterables)` does exactly this **lazily**, so it works on infinite or
file-backed streams:

```python
import heapq
list(heapq.merge([1, 4, 7], [2, 5], [3, 6, 8]))   # -> [1,2,3,4,5,6,7,8]
```

Alternative without a heap: divide-and-conquer pairwise merging, also `O(N log k)`,
`O(1)` extra — a good answer when the interviewer bans heaps.

### Smallest Range Covering Elements from K Lists (LC 632)

Google favourite.

**How to think.** A covering range must pick ≥ 1 element from every list. For a
fixed choice of k elements (one per list), the covering range is
`[min of those k, max of those k]` — you cannot do better for *that* choice. So
the search is over "which k-tuple of heads", and you want the tuple whose
`max − min` is smallest.

Start with the first element of every list. That is a valid cover. The only way to
try a *different* cover that might be tighter is to advance the current **minimum**
(advancing anyone else can only grow the max, which cannot shrink the range). A
min-heap of heads tells you who the minimum is in O(1); a running `hi` tracks the
max. When any list runs out you must stop: every later window would miss that list.

**Why the range can only get "different", not magically smaller in both ends.**
`lo` moves up when you pop; `hi` never decreases (`hi = max(hi, nxt)`). You just
keep the best `[lo, hi]` seen. You do not need to generate every k-tuple — moving
the min is enough because of sortedness inside each list.

Maintain one pointer per list; the window is `[min of heads, max of heads]`. To
shrink it you must advance the **minimum**, so a min-heap of heads plus a running
`hi` is exactly right.

```python
import heapq

def smallest_range(nums):
    h = [(row[0], i, 0) for i, row in enumerate(nums)]
    heapq.heapify(h)
    hi = max(row[0] for row in nums)          # running max of the current heads
    best = (h[0][0], hi)
    while True:
        lo, i, j = heapq.heappop(h)
        if hi - lo < best[1] - best[0]:
            best = (lo, hi)
        if j + 1 == len(nums[i]):             # a list is exhausted → no more windows
            return [best[0], best[1]]
        nxt = nums[i][j + 1]
        hi = max(hi, nxt)                     # only the max can grow
        heapq.heappush(h, (nxt, i, j + 1))
```
**Time** O(N log k) · **Space** O(k)

**Mental trigger:** "merge / cover / interleave several already-sorted sources" →
heap of heads, one entry per source.

---

## 6. Pattern 3 — Two heaps (running median & friends)

Split the multiset in half:
- `small` = **max-heap** (negated) of the lower half → its root is the largest small.
- `large` = **min-heap** of the upper half → its root is the smallest large.

Invariants: `max(small) ≤ min(large)` and the two sizes differ by at most 1
(`len(small) - len(large)` is 0 or 1). The median is then `small[0]` (odd) or the
average of both roots (even), in O(1).

**How to think (the picture).** The median is the middle of a sorted array. You
cannot keep a sorted array cheaply under inserts, but you do not need the whole
order — only the two values that *touch* the middle. So cut the stream into
"everything ≤ median" and "everything ≥ median". The largest of the left half and
the smallest of the right half *are* the median (or average to it). Those two
values are exactly the two heap roots.

Why two *opposite* heaps: left half's interesting end is its **max**, right half's
interesting end is its **min**.

### Find Median from Data Stream (LC 295)

**How to think.** One mechanical dance that never requires comparing `num` against
the roots:

1. Push into `small` (lower half).
2. Move `small`'s max across into `large`. Now every value in `small` is ≤ every
   value in `large` — the order invariant is automatic.
3. If `large` is bigger, move one back. Now sizes differ by at most 1, and we
   bias the extra element onto `small` so the odd-count median is `-small[0]`.

You could instead "compare `num` to `-small[0]` and push to the correct side, then
rebalance". That also works; the dance above is shorter and harder to get wrong.

```python
import heapq

class MedianFinder:
    def __init__(self):
        self.small = []      # max-heap via negation (lower half)
        self.large = []      # min-heap (upper half)

    def addNum(self, num):
        heapq.heappush(self.small, -num)                    # always enter via small
        heapq.heappush(self.large, -heapq.heappop(self.small))  # move its max across
        if len(self.large) > len(self.small):               # rebalance sizes
            heapq.heappush(self.small, -heapq.heappop(self.large))

    def findMedian(self):
        if len(self.small) > len(self.large):
            return float(-self.small[0])
        return (-self.small[0] + self.large[0]) / 2.0
```
**Time** O(log n) add, O(1) query · **Space** O(n)

The "push into small → move to large → rebalance" dance is worth memorising: it
makes the ordering invariant automatic, so you never have to compare against roots.

### Sliding Window Median (LC 480) — with lazy deletion
// TODO:
**How to think.** Same two-heap median, but now values *leave*. A binary heap
cannot delete an arbitrary interior node in O(log n) unless you know its index.
You do not. So do not delete. Stamp the departing index as dead, decrement the
**live** size of whichever half owned it, and only physically pop when a dead
entry later rises to a root (the only place you ever read).

Why an index tag, not just the value: duplicates. Why a `side` map: after lazy
delete you cannot ask the heap "which half was this in?" — the object may already
be buried. Live counts `n_small` / `n_large` are the source of truth for
rebalancing; `len(small)` is a lie because of corpses.

A heap has no `remove(x)`. The fix: mark the departed element as dead, keep exact
**live counts** yourself, and only physically evict when a dead element surfaces at
a root. Tagging entries with their index makes "which heap owns it" unambiguous.

```python
import heapq

def median_sliding_window(nums, k):
    small, large = [], []          # small: max-heap of (-val, idx); large: min-heap of (val, idx)
    side = {}                      # idx -> 'S' | 'L'  (exact ownership, no guessing)
    dead = set()
    n_small = n_large = 0

    def prune(h):                  # evict expired entries only when they reach the top
        while h and h[0][1] in dead:
            heapq.heappop(h)

    def push_small(v, i):
        nonlocal n_small
        heapq.heappush(small, (-v, i)); side[i] = 'S'; n_small += 1

    def push_large(v, i):
        nonlocal n_large
        heapq.heappush(large, (v, i)); side[i] = 'L'; n_large += 1

    def rebalance():
        nonlocal n_small, n_large
        while n_small > n_large + 1:
            prune(small)
            v, i = heapq.heappop(small); n_small -= 1
            push_large(-v, i)
        while n_small < n_large:
            prune(large)
            v, i = heapq.heappop(large); n_large -= 1
            push_small(v, i)
        prune(small); prune(large)     # keep both roots live for the next comparison

    res = []
    for i, x in enumerate(nums):
        if not small or x <= -small[0][0]:
            push_small(x, i)
        else:
            push_large(x, i)
        if i >= k:                      # element leaving the window
            j = i - k
            dead.add(j)
            if side[j] == 'S': n_small -= 1
            else:              n_large -= 1
        rebalance()
        if i >= k - 1:
            res.append(float(-small[0][0]) if k % 2 else (-small[0][0] + large[0][0]) / 2.0)
    return res
```
**Time** O(n log n) · **Space** O(n)
In Python, `sortedcontainers.SortedList` is the pragmatic alternative
(`O(log n)` insert/remove *and* `O(1)` indexing) — say so, but know the heap version.

### IPO / Maximum Capital (LC 502)

**How to think.** You may do at most `k` projects. Doing a project raises capital,
which can *unlock* projects you could not afford before. The greedy claim: at
every capital `w`, among projects you can afford, take the one with **max profit**.
(Any other affordable project you could have taken instead gives weakly less
capital now, so it cannot unlock extra options you would miss.)

That claim splits the data into two live sets:

- not yet affordable → ordered by capital (a sorted list or min-heap) so you can
  unlock a prefix as `w` grows
- affordable right now → you only care about the richest, so a **max-heap of
  profit**

Each of the k rounds: dump every newly-affordable project into the profit heap,
then pop once. If the profit heap is empty you are stuck.

Two structures, not two heaps of the same kind: a **min-heap by capital** (what
might become affordable) and a **max-heap by profit** (what is affordable now).

```python
import heapq

def find_maximized_capital(k, w, profits, capital):
    by_capital = sorted(zip(capital, profits))   # cheapest-to-unlock first
    affordable = []                              # max-heap of profits
    i = 0
    for _ in range(k):
        while i < len(by_capital) and by_capital[i][0] <= w:
            heapq.heappush(affordable, -by_capital[i][1])   # unlock
            i += 1
        if not affordable:
            break                                # nothing we can do
        w += -heapq.heappop(affordable)          # greedily take the richest project
    return w
```
**Time** O(n log n) · **Space** O(n)

**Mental trigger:** "median", "balance two halves", or "unlock-then-pick-the-best"
→ two heaps facing each other.

---

## 7. Pattern 4 — Scheduling / greedy with a heap

The shape is always: **sort by the dimension that makes items *available*, then use
a heap on the dimension you *optimise*.**

**How to think (the shape).** Availability is usually time or position — a sort
makes items *appear* in the right order. Optimality is "which of the currently
available items do I pick?" — that is the heap. If you catch yourself sorting on
the *optimisation* key, you have frozen a ranking that will be wrong the moment
the available set changes.

### The Two-Axis Mental Model (how to crack any new problem)

Every scheduling/greedy-heap problem has exactly two dimensions:

| Dimension | Controls | What you do |
|---|---|---|
| **Axis 1 — Gate/Order** | *when* an item becomes available | **Sort** by this |
| **Axis 2 — Pick/Greedy** | *which* available item to choose | **Heap** by this |

### The derivation script — 5 questions that write the solution

**Do not start from "what heap?"** Start from: *"if I simulated this by hand with
infinite time, what would I do?"* The simulation hands you every answer below.

---

**Q1 — What am I sweeping along?** → **sort key**

One axis you move forward on and never revisit. An item has several numbers; the
sweep axis is the one at which the item **enters your awareness**.

> Trip `[num, from, to]`: you learn about these passengers when they board → `from`.

**Rule: sort by the ENTRY event. The EXIT event goes in the heap.**

The sweep axis is not always a column — in Task Scheduler it is the wall clock,
which appears nowhere in the input.

---

**Q2 — Standing at a point on the sweep, what set must I know?** → **heap contents**

Name it in one plain phrase:
- "passengers currently in the car"
- "rooms currently in use"
- "courses I have committed to"
- "stations I drove past but have not used"

If you cannot name the set in a phrase, you do not have a solution yet.

---

**Q3 — Do members of that set leave on their own, or only when I evict them?**
→ **shape + heap direction**

**This is the discriminator. Everything downstream flips on this one answer.**

| Q3 answer | Meaning | Heap key | Type | Shape |
|---|---|---|---|---|
| Leave on their own | time passes, they are gone whether you like it or not | **exit point** | **min** | A — sweep |
| Only when I evict | they stay until you actively drop one | **how much you regret it** | **max** | B — regret |
| Never leave, sit unused | banked options you have not spent | **value** | **max** | C — bank |

---

**Q4 — What single question do I ask the set, over and over?**
→ **confirms key + direction**

- "Who leaves soonest?" → min-heap
- "What is my worst commitment?" → max-heap
- "What is the best unused option?" → max-heap

If you need **two** different questions (soonest *and* latest, or removal by value
plus rank lookup) → **not a heap**. Use `SortedList`.

---

**Q5 — What do I report?** → **answer expression**

`len(heap)` · peak of a running scalar · pop count · boolean on first violation.
Write this down *before* coding, or you will finish the loop and not know what to
return.

---

### Push and pop are not decisions

Once Q2 says "the heap **is** the live set", push and pop stop being choices and
become definitions:

- **Push** = the event that *grows* the set.
- **Pop** = the event that *shrinks* it.

The only subtlety: **pop is lazy.** You are not standing at the exit moment, so you
catch the state up at the top of each iteration:

```python
while heap and heap[0][0] <= now:     # ALWAYS while, never if
    remove_it()
```

`while`, not `if` — several members can exit between two consecutive entry events.

---

### Worked derivation — Car Pooling (LC 1094)

| Question | Answer | Produces |
|---|---|---|
| Q1 sweep | road position; passengers enter awareness at `from` | `trips.sort(key=lambda t: t[1])` |
| Q2 set | "passengers currently in the car" | heap contents |
| Q3 leave how | **on their own**, at `to` | min-heap on dropoff → Shape A |
| Q4 question | "who gets out soonest?" | key = `to`, min-heap |
| Q5 report | did the count ever exceed capacity | boolean + running scalar `current` |

Push = board. Pop = `to <= now`, lazily. The code is now mechanical:

```python
import heapq

def carPooling(trips, capacity):
    trips.sort(key=lambda t: t[1])        # Q1: sort by ENTRY
    heap, current = [], 0                 # Q2: live set + scalar companion
    for num, start, end in trips:
        while heap and heap[0][0] <= start:   # lazy catch-up (Q3: they leave alone)
            current -= heapq.heappop(heap)[1]
        current += num
        if current > capacity:            # Q5: report
            return False
        heapq.heappush(heap, (end, num))
    return True
```

### Same script, opposite answer — Course Schedule III (LC 630)

Q1 and Q2 have the same *shape*. **Q3 flips**, and everything after it flips too:

| | Car Pooling | Course Schedule III |
|---|---|---|
| Q2 set | passengers in the car | courses I have committed to |
| **Q3** | **leave on their own** (at `to`) | **only when I evict** (a course never un-takes itself) |
| Heap key | dropoff position | duration |
| Heap type | **min** | **max** |
| Pop trigger | `heap[0] <= now` (catch-up) | `total > deadline` (violation) |
| Q5 report | boolean | `len(heap)` |

One question, two different worlds. Memorise Q3 above all the others.

---

### Two things that save you

**The scalar companion.** If set members carry a *weight* and you need the sum,
keep a running scalar and update it on every push and pop. Never rescan the heap.
Car Pooling → `current`. Course Schedule III → `total`. Max Performance → `total`.

**Wrong-answer smells.**

| Symptom | Cause | Fix |
|---|---|---|
| "Wait, I don't know yet whether that item entered." | sorted by the *exit* column | re-sort by the entry event |
| The root is something you would never throw away. | picked max where min belongs (or vice versa) | root is the **victim**, not the prize |
| Passes small tests, fails when two things exit back to back. | used `if` instead of `while` for catch-up | always `while` |
| You need both ends of the order. | not a heap problem | `SortedList` |

---

**The four shapes.** Q3 tells you which one; each shape below is just the script's
answers pre-filled.

#### Shape A — "Sweep and Admit" (Resource Assignment)
*Meeting Rooms, Car Pooling, Servers, Single-thread CPU*

- **Sort by:** start time / arrival time.
- **Heap holds:** currently occupied resources, keyed by **when they free**.
- **Push when:** you assign a resource (push its end/free time).
- **Pop when:** heap root ≤ current start → resource is free, reuse it.

```python
items.sort(key=lambda x: x.start)
heap = []
for s, e in items:
    if heap and heap[0] <= s:
        heapreplace(heap, e)    # free resource reused
    else:
        heappush(heap, e)       # need a new resource
# heap size = peak concurrency = answer (for meeting rooms)
```

#### Shape B — "Greedy Take-All + Regret" (Undo worst past choice)
*Course Schedule III, Furthest Building*

- **Sort by:** constraint / deadline.
- **Heap holds:** past choices, keyed by **how costly they were** (max-heap of cost).
- **Push when:** you take an item (take EVERYTHING greedily first, no filter).
- **Pop when:** taking this item violated a constraint → pop the worst past pick and undo it.

```python
items.sort(key=lambda x: x.constraint)
heap, total = [], 0
for cost, limit in items:
    heappush(heap, -cost)      # max-heap: biggest cost = most regrettable
    total += cost
    if total > limit:
        total += heappop(heap) # undo the longest/costliest past choice
# len(heap) = answer (how many items you kept)
```

**Why it works:** if you drop the longest already-taken item when you overshoot, you keep the count maximal AND minimize total time used, giving future items the best chance.

#### Shape C — "Bank and Spend" (Retroactive best-pick)
*Refueling Stops — pass options, spend when stuck*

- **Sort by:** position / order of encounter.
- **Heap holds:** options seen but not yet used, keyed by **value** (max-heap).
- **Push when:** you pass/see an option (bank it, don't decide now).
- **Pop when:** you're stuck/stalled → retroactively "use" the best banked option.

```python
heap, i = [], 0
while not_at_goal():
    while i < len(stations) and stations[i][0] <= current_reach:
        heappush(heap, -stations[i][1])   # bank it
        i += 1
    if not heap: return IMPOSSIBLE
    current_reach += -heappop(heap)       # retroactively used the biggest
    answer_count += 1
```

**Key insight:** you never actually go back. You're deciding NOW that you WOULD have stopped at that station. The heap is a "time machine" for deferred decisions.

#### Shape D — "Two-Axis: Sort one, Heap the other"
*Max Performance (sum × min), Hire K Workers*

When the objective couples **sum × min** or **sum / max ratio**:

1. Find which value appears as **min/max** in the formula.
2. Sort by THAT axis (descending if it's a max-cap). Now the current item IS the min — frozen.
3. Heap the OTHER axis. Evict when size exceeds k (victim = root of a size-K min-heap).
4. Record `total_other × current_frozen` at each step.

```python
# Max Performance: performance = sum(speed) * min(efficiency)
engineers = sorted(zip(efficiency, speed), reverse=True)  # sort by min-axis
h, total, best = [], 0, 0
for eff, spd in engineers:
    heappush(h, spd); total += spd
    if len(h) > k:
        total -= heappop(h)        # evict slowest (victim)
    best = max(best, total * eff)  # eff is frozen min by construction
```

### 60-second identification checklist

Before writing a line:
1. **Gate exists?** → sort by it. No gate → heap everything from the start.
2. **Reuse resources?** → heap of resource end-times. Pop to free, push to assign. → Shape A.
3. **Undo worst?** → max-heap of costs, pop when overshoot. → Shape B.
4. **Bank options, spend later?** → max-heap of values, pop when stalled. → Shape C.
5. **sum × min in objective?** → sort by min-axis, heap the sum-axis. → Shape D.
6. **Answer is:** heap size? running max? pop count? Write this before coding.

### Task Scheduler (LC 621)

**How to think.** The bottleneck is the most frequent task: it must be spaced `n`
apart. At every time slot the locally best move is "run the ready task that still
has the most remaining work" — otherwise you paint yourself into a corner of idle
slots later. That is a max-heap of remaining counts.

After you run a task it is *not* ready for `n` more slots, so it leaves the heap
and sits in a cooldown queue keyed by `ready_time`. When the clock hits that
time, it re-enters the heap. Idle slots happen naturally: the heap is empty but
the cooldown queue is not.

(Math formula `idle = (max_freq - 1) * n - (slots filled by other tasks)` is
faster to code for this specific problem. The heap is the version that still
works when tasks have different cooldowns or you must emit the actual schedule.)

```python
import heapq
from collections import Counter, deque

def least_interval(tasks, n):
    h = [-c for c in Counter(tasks).values()]
    heapq.heapify(h)                       # always run the most frequent task
    cooling = deque()                      # (ready_time, remaining_count)
    time = 0
    while h or cooling:
        time += 1
        if h:
            c = heapq.heappop(h) + 1       # one execution (values are negative)
            if c:
                cooling.append((time + n, c))
        if cooling and cooling[0][0] == time:
            heapq.heappush(h, cooling.popleft()[1])
    return time
```
**Time** O(T log 26) ≈ O(T) · **Space** O(26)

### Meeting Rooms II (LC 253)

**How to think.** A new meeting needs a room unless *some* previous meeting has
already finished. You do not care which room — only whether the **earliest**
end-time among rooms in use is `≤` this start. That earliest end-time is a
min-heap root.

- `ends[0] ≤ s` → reuse that room (`heapreplace` with the new end)
- else → every in-use room is still busy → allocate (`heappush`)

Heap size = rooms currently occupied. The maximum size during the sweep *is*
the answer (max concurrency). Sorting by start is mandatory: you have to
process meetings in the order they try to grab a room.

```python
import heapq

def min_meeting_rooms(intervals):
    intervals.sort()                       # by start
    ends = []                              # min-heap of end times = rooms in use
    for s, e in intervals:
        if ends and ends[0] <= s:          # earliest-freeing room is free by now
            heapq.heapreplace(ends, e)     # reuse it
        else:
            heapq.heappush(ends, e)        # need a new room
    return len(ends)
```
**Time** O(n log n) · **Space** O(n)
The heap size *is* the answer — max concurrency.

### Reorganize String (LC 767) / Rearrange String k Distance Apart (LC 358)

**How to think.** Adjacent repeats (or repeats closer than k) are forbidden, and
you must use every character. Greedy: at each position write the *currently most
frequent remaining* character that is not blocked. If you starve a high-frequency
character, you will be forced to clump it later.

So: max-heap of `(count, char)`. Pop the winner, write it, and **hold it out**
for one step (LC 767) or `k` steps (LC 358, a deque of the last k written). Then
push it back with count − 1. If the heap runs dry before the string is finished,
some character was more than 50% (or more than the k-gap allows) — impossible.

```python
import heapq
from collections import Counter

def reorganize_string(s):
    h = [(-c, ch) for ch, c in Counter(s).items()]
    heapq.heapify(h)
    out, prev = [], None
    while h:
        c, ch = heapq.heappop(h)           # most frequent that isn't blocked
        out.append(ch)
        if prev:
            heapq.heappush(h, prev)        # the previous char becomes usable again
        prev = (c + 1, ch) if c + 1 else None
    res = "".join(out)
    return res if len(res) == len(s) else ""
```
**Time** O(n log 26) · **Space** O(26)
LC 358 is the same with a `deque` holding the last `k` used characters instead of one.

### Car Pooling (LC 1094)

**How to think.** This is Meeting Rooms II with passenger counts. Sweep trips in
order of pickup. Capacity changes only at pickups and drop-offs, so you need "who
is currently in the car?" — a min-heap of drop-off locations. Before boarding,
pop everyone whose drop-off is `≤` here. Then add the new passengers; if `cur`
exceeds capacity, fail.

You could also flatten every pickup as `+num` and drop-off as `-num` and sort
events (difference array). Same idea; the heap version is natural when drop-offs
must be queried as "earliest".

```python
import heapq

def car_pooling(trips, capacity):
    trips.sort(key=lambda t: t[1])         # by start location
    h, cur = [], 0                         # min-heap of (drop_off, passengers)
    for num, s, e in trips:
        while h and h[0][0] <= s:          # everyone who got off before we start
            cur -= heapq.heappop(h)[1]
        cur += num
        if cur > capacity:
            return False
        heapq.heappush(h, (e, num))
    return True
```
**Time** O(n log n) · **Space** O(n)

### Course Schedule III (LC 630) — the "regret" heap

**How to think.** You want as many courses as possible, each with a duration and
a hard deadline. Sort by deadline: never consider a later-deadline course before
an earlier one (otherwise you skip a tighter constraint you might still have
satisfied). Then take every course greedily.

When taking the next course would blow its deadline, you are allowed to *drop
one already-taken course*. Which one? The **longest**. Dropping the longest
frees the most time; if even that does not help, no other drop would either.
That "longest taken so far" is a max-heap of durations.

Invariant: the heap is a feasible subset of the courses whose deadlines are
≤ the current one, of maximum size, and among such subsets it has minimum total
duration (because we always evict the longest when we must). That last bit is
why future courses still have the best chance of fitting.

```python
import heapq

def schedule_course(courses):
    courses.sort(key=lambda c: c[1])       # by deadline: never skip ahead of a deadline
    h, total = [], 0                       # max-heap of taken durations
    for dur, end in courses:
        heapq.heappush(h, -dur); total += dur
        if total > end:                    # infeasible → undo the longest course taken
            total += heapq.heappop(h)
    return len(h)
```
**Time** O(n log n) · **Space** O(n)
**This is the pattern worth internalising:** take greedily, and when you overshoot,
use the heap to *retract the worst past decision*. "Regret / undo the biggest
mistake so far" appears constantly at Google.

### Minimum Number of Refueling Stops (LC 871)

**How to think.** You drive as far as current fuel allows. Every station you
pass is an option you *could have* used. You do not decide at the station —
you bank it. When you would run dry, you retroactively take the **largest
banked tank**. That is the fewest extra stops to reach strictly farther, and
it never hurts later (more fuel now dominates fewer gallons later).

Max-heap of passed-but-unused station fuels. If the heap is empty when you
stall, the target is unreachable.

This is Course Schedule III run backwards: instead of undoing the worst past
choice, you **commit to the best unused past option** the moment you need it.

```python
import heapq

def min_refuel_stops(target, start_fuel, stations):
    h, fuel, i, stops = [], start_fuel, 0, 0
    while fuel < target:
        while i < len(stations) and stations[i][0] <= fuel:
            heapq.heappush(h, -stations[i][1])    # bank every station we drove past
            i += 1
        if not h:
            return -1
        fuel += -heapq.heappop(h)                 # retroactively refuel at the biggest
        stops += 1
    return stops
```
**Time** O(n log n) · **Space** O(n)
Same "regret" idea, in reverse: decide to have stopped, *after* running dry.

### Single-Threaded CPU (LC 1834)

**How to think.** One CPU, tasks arrive over time, at every idle-or-just-finished
moment you must pick the ready task with smallest processing time (then smallest
index). "Ready" is a live set whose membership changes as the clock moves → heap
keyed by `(processing_time, index)`.

Sort by enqueue time so you can admit newly arrived tasks with a pointer.
If the ready heap is empty, jump the clock to the next arrival (do not tick one
by one — that is O(max timestamp)).

```python
import heapq

def get_order(tasks):
    n = len(tasks)
    order = sorted(range(n), key=lambda i: tasks[i][0])   # by enqueue time
    ready, res = [], []
    t, p = 0, 0
    while len(res) < n:
        while p < n and tasks[order[p]][0] <= t:
            i = order[p]
            heapq.heappush(ready, (tasks[i][1], i))       # (processing time, index)
            p += 1
        if not ready:
            t = tasks[order[p]][0]                        # idle → jump to next arrival
            continue
        dur, i = heapq.heappop(ready)
        t += dur
        res.append(i)
    return res
```
**Time** O(n log n) · **Space** O(n)

### Process Tasks Using Servers (LC 1882)

**How to think.** Two live sets: servers that are **free now** (you pick the
lightest, then smallest index) and servers that are **busy** (you need the one
that frees soonest). That is two heaps:

- `free`: `(weight, index)`
- `busy`: `(free_time, weight, index)` — include weight/index so that when several
  free at the same time they re-enter `free` in the right order

For each task in order: first move everyone whose `free_time ≤ t` back to `free`.
If `free` is nonempty, assign. If not, you must wait — pop the earliest-busy
server and start it at *its* free time, not at `t`.

```python
import heapq

def assign_tasks(servers, tasks):
    free = [(w, i) for i, w in enumerate(servers)]        # (weight, index)
    heapq.heapify(free)
    busy = []                                            # (free_time, weight, index)
    res = []
    for t, dur in enumerate(tasks):
        while busy and busy[0][0] <= t:
            ft, w, i = heapq.heappop(busy)
            heapq.heappush(free, (w, i))                 # returns to the pool
        if free:
            w, i = heapq.heappop(free)
            heapq.heappush(busy, (t + dur, w, i))
        else:
            ft, w, i = heapq.heappop(busy)               # wait for the earliest free
            heapq.heappush(busy, (ft + dur, w, i))
        res.append(i)
    return res
```
**Time** O((n + m) log n) · **Space** O(n)

### Maximum Performance of a Team (LC 1383) — "sort one factor, heap the other"

Performance = `sum(speed of chosen) * min(efficiency of chosen)`. Two coupled
dimensions, so **fix one**: iterate engineers in decreasing efficiency; when you are
at engineer `e`, `e.efficiency` *is* the minimum for any team drawn from the prefix.
Now you only need the **k largest speeds** in that prefix → size-k min-heap.

**How to think.** The product couples a *sum* and a *min*, so you cannot heap
both. Freeze the min: sort efficiency descending. Standing at engineer `e`,
every already-seen engineer is at least as efficient, so any team that includes
`e` plus a subset of the prefix has `min efficiency = e.efficiency`. The product
is then `(sum of speeds of that subset) * e.efficiency`, and you want the subset
of size at most k with maximum speed sum → keep a size-k **min-heap of speeds**
(victim = slowest of the current k). Record `total * eff` at every `e`.

Modulo only at the end: `max` of already-reduced numbers is not the max of the
originals.

```python
import heapq

def max_performance(n, speed, efficiency, k):
    MOD = 10 ** 9 + 7
    engineers = sorted(zip(efficiency, speed), reverse=True)   # dimension 1: sorted
    h, total, best = [], 0, 0                                  # dimension 2: heaped
    for eff, spd in engineers:
        heapq.heappush(h, spd); total += spd
        if len(h) > k:
            total -= heapq.heappop(h)      # drop the slowest — it caps nothing
        best = max(best, total * eff)      # eff is the min efficiency by construction
    return best % MOD
```
**Time** O(n log n) · **Space** O(k)

> **Take the modulo only at the end** — `max()` on already-reduced values is wrong.

**Mental trigger:** *two dimensions and "choose at most k"* → sort by the dimension
that appears as a `min`/`max` in the objective, heap the one that appears as a `sum`.
Same skeleton: Minimum Cost to Hire K Workers (LC 857), Furthest Building You Can
Reach (LC 1642), Maximum Average Pass Ratio (LC 1792).

---

## 8. Pattern 5 — Heaps inside graph algorithms

### Dijkstra (see `graphs.md` for the full treatment)

**How to think.** Shortest path with non-negative weights has a greedy structure:
the first time you pop a node `u` from a min-heap of `(distance, node)`, that
distance is final. Why? Every other path to `u` would have to go through some
not-yet-popped node, and those nodes already have *larger* tentative distances,
so adding a non-negative edge cannot undercut `u`. That is why the heap key is
"best known distance", and why negatives break it.

Python has no `decrease-key`. Instead of mutating an existing heap entry you
push a *new* `(nd, v)` whenever you find a better path. Old entries become
stale; the line `if d > dist[u]: continue` throws them away. Heap size can
reach O(E), but `log E = O(log V)`.

```python
import heapq

def dijkstra(graph, src):
    """graph: {u: [(v, w), ...]} with non-negative w."""
    dist = {src: 0}
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, float('inf')):
            continue                       # stale entry — lazy deletion in the wild
        for v, w in graph.get(u, ()):
            nd = d + w
            if nd < dist.get(v, float('inf')):
                dist[v] = nd
                heapq.heappush(pq, (nd, v))   # "insert instead of decrease-key"
    return dist
```
**Time** O(E log V) · **Space** O(V + E)

The `if d > dist[u]: continue` guard is the single most important line: Python's
heap has no `decrease-key`, so we push duplicates and skip outdated pops.
Negative weights break Dijkstra (a popped node may still improve) — use Bellman-Ford.

### Prim's MST

**How to think.** Grow a tree from a seed. At every step the cheapest edge that
*crosses the cut* (one end in the tree, one end out) is safe to add — that is
the cut property of MSTs. The live set is "edges leaving the current tree";
you always want the cheapest → min-heap of `(weight, vertex)`.

Mark a vertex `seen` when you pop it (when it joins the tree). Ignore later
pops of the same vertex; they are more expensive edges to a node you already
connected. Same stale-entry idea as Dijkstra; the key is edge weight, not
path length.

```python
import heapq

def prim(n, adj):
    """adj: list of [(neighbour, weight), ...]; returns MST weight or -1."""
    seen = [False] * n
    pq, total, count = [(0, 0)], 0, 0
    while pq and count < n:
        w, u = heapq.heappop(pq)
        if seen[u]:
            continue
        seen[u] = True; total += w; count += 1
        for v, wt in adj[u]:
            if not seen[v]:
                heapq.heappush(pq, (wt, v))    # cheapest edge crossing the cut
    return total if count == n else -1
```
**Time** O(E log V) · **Space** O(E)

**A\*** is Dijkstra with priority `g(n) + h(n)` for an admissible heuristic `h` — the
heap is unchanged, only the key differs.

### Best-first "expand the frontier" search

Kth Smallest in a Sorted Matrix (LC 378) and K Pairs with Smallest Sums (LC 373) are
graph searches in disguise: the "graph" is a grid where moving right or down never
decreases the value, so a min-heap frontier pops values in sorted order. The
**visited set is mandatory** — `(r+1, c)` and `(r, c+1)` both reach `(r+1, c+1)`.

**How to think.** You want the K smallest values of a function that is monotone
on a grid (`matrix[r][c] ≤ matrix[r+1][c]` and `≤ matrix[r][c+1]`; similarly
`nums1[i] + nums2[j]`). Then the global minimum is at `(0, 0)`, and the next
candidates after popping `(r, c)` can only be its right and down neighbours.

That is Dijkstra on an implicit DAG of cells. The heap pops cells in sorted
order of value; after `k` pops you have the kth smallest. **Visited is not
optional:** two parents share a child, and without a set you push that child
twice, then its children four times, and the heap explodes.

If `k` is huge (near `n²`), binary-search the *value* "how many matrix entries
are ≤ mid?" in `O(n log(max − min))` instead — you no longer materialise K
cells.

```python
import heapq

def kth_smallest_matrix(matrix, k):
    n = len(matrix)
    h = [(matrix[0][0], 0, 0)]
    seen = {(0, 0)}                        # without this, entries duplicate expo-ish
    for _ in range(k - 1):
        _, r, c = heapq.heappop(h)
        for nr, nc in ((r + 1, c), (r, c + 1)):
            if nr < n and nc < len(matrix[0]) and (nr, nc) not in seen:
                seen.add((nr, nc))
                heapq.heappush(h, (matrix[nr][nc], nr, nc))
    return h[0][0]
```
**Time** O(k log k) · **Space** O(k)
Binary search on the *value* is `O(n log(max-min))` and beats this for large `k`.

```python
import heapq

def k_smallest_pairs(nums1, nums2, k):
    if not nums1 or not nums2:
        return []
    h = [(nums1[0] + nums2[0], 0, 0)]
    seen, res = {(0, 0)}, []
    while h and len(res) < k:
        _, i, j = heapq.heappop(h)
        res.append([nums1[i], nums2[j]])
        for ni, nj in ((i + 1, j), (i, j + 1)):
            if ni < len(nums1) and nj < len(nums2) and (ni, nj) not in seen:
                seen.add((ni, nj))
                heapq.heappush(h, (nums1[ni] + nums2[nj], ni, nj))
    return res
```
**Time** O(k log k) · **Space** O(k)

**Mental trigger:** "smallest/largest K values of a monotone function over a grid or
lattice" → heap frontier + visited set.

---

## 9. Pattern 6 — Lazy deletion & "a heap with removal"

**How to think.** A heap is an array with parent/child index math. To delete an
arbitrary value you must *find* it (O(n) scan) and then sift. There is no
hash-to-index unless you maintain one yourself (indexed heap, §10). So the
practical move is: **do not delete**. Remember that the value is dead, and only
the root needs to be honest — because the only operations you use are peek/pop.
Each corpse is popped at most once, so the extra work amortises to O(1) per
push.

Use this whenever the problem says "the window lost an element" or "this task
was cancelled" and you still only need the current min/max.

A binary heap supports `remove(x)` only in `O(n)` (you must *find* `x`). Two ways out:

1. **Lazy deletion** — record that `x` is dead in a counter dict; skip dead items
   when they surface at the root. Every operation stays `O(log n)` amortised.
2. **Stale-entry / re-insert** (Dijkstra style) — never remove; push an updated copy
   and ignore outdated pops. Works when you can *detect* staleness cheaply.
3. **`SortedList`** — use it when you need ordered indexing, `bisect`, or an exact
   size at all times.

```python
import heapq
from collections import defaultdict

class LazyHeap:
    """Min-heap with O(log n) amortised remove(x). Values must be comparable/hashable."""

    def __init__(self, items=()):
        self._h = list(items)
        heapq.heapify(self._h)
        self._dead = defaultdict(int)      # value -> pending deletions
        self._size = len(self._h)

    def _clean(self):                      # only the root has to be truthful
        while self._h and self._dead[self._h[0]]:
            self._dead[self._h[0]] -= 1
            heapq.heappop(self._h)

    def push(self, x):
        heapq.heappush(self._h, x)
        self._size += 1

    def remove(self, x):                   # x must currently be in the heap
        self._dead[x] += 1
        self._size -= 1
        self._clean()

    def top(self):
        self._clean()
        return self._h[0]

    def pop(self):
        self._clean()
        self._size -= 1
        return heapq.heappop(self._h)

    def __len__(self):
        return self._size

    def __bool__(self):
        return self._size > 0
```
**Time** O(log n) amortised per op · **Space** O(n)
Amortised because each pushed item is physically popped at most once; the `while`
loop in `_clean` is paid for by earlier pushes.

**Caveat:** `self._size` is the count of *live* elements — never use `len(self._h)`.
If two distinct objects compare equal, key them by a unique id instead of by value.

**Use `SortedList` instead when** you need `sl[i]`, `sl.bisect_left`, or removal of
an arbitrary element while also reading the max *and* min — a heap gives you only
one end.

---

## 10. Indexed and d-ary heaps (know it exists)

**How to think.** Textbook Dijkstra assumes `decrease-key` because each vertex
should have **one** heap entry whose key you lower. `heapq` cannot do that, so
real Python code uses extra stale entries instead (§8). An indexed heap is how
you would implement the textbook version: store `pos[v]` and sift from that
index. Mention it; do not write it unless asked.

d-ary heaps are the same idea with a bushier tree: pushes get cheaper (`log_d n`
is smaller), pops get more expensive (`d` children to scan). `d = 4` is a real
optimisation for dense Dijkstra, not an interview default.

- **Indexed heap:** keep `pos[item] = index_in_array` and update it on every swap.
  This gives real `O(log n)` `decrease-key` and `remove` — what textbook Dijkstra
  assumes. `heapq` has none of this; the lazy/stale trick replaces it.
- **d-ary heap:** each node has `d` children; `parent(i) = (i-1)//d`, `child_j(i) =
  d*i + j + 1`. Height `log_d n` → cheaper `push`/`decrease-key`, costlier `pop`
  (`d` comparisons per level). `d = 4` is cache-friendly and a real speedup for
  Dijkstra on dense graphs.

| Heap | insert | pop-min | decrease-key | merge | In practice |
|---|---|---|---|---|---|
| Binary | O(log n) | O(log n) | O(log n) | O(n) | The default; best constants |
| d-ary | O(log_d n) | O(d log_d n) | O(log_d n) | O(n) | Dense-graph Dijkstra, cache locality |
| Binomial | O(1)* | O(log n) | O(log n) | **O(log n)** | When you must merge heaps |
| Fibonacci | O(1)* | O(log n)* | **O(1)\*** | O(1) | Theory only; huge constants |
| Pairing | O(1) | O(log n)* | O(log n)* | O(1) | Fibonacci's practical cousin |

`*` = amortised.

**When the theory matters:** Dijkstra is `O(E log V)` with a binary heap and
`O(E + V log V)` with a Fibonacci heap, which is asymptotically better on **dense**
graphs (`E ≈ V²`). In real code the constants make Fibonacci heaps lose almost
always — the correct interview answer is "asymptotically better, practically not
worth it; I'd use a binary heap or a d-ary heap."

---

## 11. Heapsort TODO: 

**How to think.** If you can build a max-heap in O(n) and pop-max in O(log n),
then n pops give you the descending order of the array. Heapsort just pops
*into the tail of the same array*: swap root with `a[end]`, shrink the heap
by one, sift-down the new root. After n − 1 such steps the array is sorted
ascending.

You get O(n log n) **even on adversarial input** (unlike quicksort) and O(1)
extra memory (unlike mergesort). You pay for it with cache misses (`2i+1`
jumps) and extra comparisons, which is why libraries use introsort instead.

```python
def heapsort(a):
    n = len(a)
    for i in range(n // 2 - 1, -1, -1):      # build a MAX-heap in O(n)
        _sift_down_max(a, i, n)
    for end in range(n - 1, 0, -1):
        a[0], a[end] = a[end], a[0]          # largest goes to its final slot
        _sift_down_max(a, 0, end)            # restore over the shrinking prefix
    return a

def _sift_down_max(a, i, n):
    while True:
        l, r, big = 2 * i + 1, 2 * i + 2, i
        if l < n and a[l] > a[big]: big = l
        if r < n and a[r] > a[big]: big = r
        if big == i: return
        a[i], a[big] = a[big], a[i]
        i = big
```
**Time** O(n log n) worst case · **Space** O(1) in place

`O(n)` build + `n` pops of `O(log n)` = `O(n log n)`, with **no bad inputs** (unlike
quicksort) and **no extra memory** (unlike mergesort). Yet it is usually slower than
quicksort because it jumps around the array (`2i+1`, `2i+2` destroy cache locality)
and it does ~2× the comparisons. It is also **not stable**. Real libraries use
introsort: quicksort, falling back to heapsort when recursion goes too deep — you get
quicksort's speed with heapsort's worst-case guarantee.

---

## 12. Common pitfalls

1. **Forgetting to re-negate.** You pushed `-x` for a max-heap and returned
   `heappop(h)` — now every answer is negative. Negate on the way in *and* out.
2. **Negating only part of a tuple, inconsistently.** `(-freq, word)` sorts freq
   descending but `word` **ascending**. If you want both descending you cannot
   negate a string — push `(-freq, i)` with an index into a list, or reverse later.
3. **`TypeError: '<' not supported`** when priorities tie and the next tuple element
   is a custom object / `ListNode` / `dict`. Insert a unique counter or index.
4. **Mutating an item that is already inside the heap.** Changing an object's
   priority does *not* re-heapify; the invariant silently breaks and `heap[0]` lies.
   Push a new entry and lazily discard the stale one.
5. **`heapq.heapify` on a list of lists.** It "works" (lists compare elementwise) but
   then mutating an inner list corrupts the order, and unequal-length rows compare in
   surprising ways. Use tuples and never mutate them.
6. **`list.remove(x)` on a heap** — `O(n)` search *and* it leaves the array in a
   non-heap state. Use lazy deletion (§9), or `heapify` again if you must.
7. **`heappop` on an empty heap** raises `IndexError`. Guard with `while h:` /
   `if h:`; the bug hides in `while ...: heappop()` loops with a wrong condition.
8. **Using a heap where one sort is enough.** If all data is available up front and
   you consume it in order, `sorted()` is simpler and faster. A heap pays off only
   when items arrive/leave during the loop.
9. **Size-k heap with `k ≈ n`.** `O(n log k) = O(n log n)` plus `O(n)` memory and
   worse constants — just sort.
10. **Peeking with `h[-1]` or `max(h)`.** Only `h[0]` is meaningful; `h[-1]` is an
    arbitrary leaf. And `sorted(h)[0]` throws away the whole point.
11. **Assuming pop order among equal keys is FIFO.** It is not; add a counter if
    insertion order matters.
12. **Forgetting the visited set** in grid/frontier heaps (§8) — duplicates explode
    and the answer is off.

---

## 13. Cheat sheets

### Complexity

| Operation | Binary heap | Sorted array | `SortedList` | Hash map |
|---|---|---|---|---|
| Build from n items | **O(n)** | O(n log n) | O(n log n) | O(n) |
| Peek best | **O(1)** | O(1) | O(1) | O(n) |
| Insert | O(log n) | O(n) | O(log n) | O(1) |
| Pop best | O(log n) | O(1)/O(n) | O(log n) | O(n) |
| Remove arbitrary | O(n) (O(log n) lazy) | O(n) | **O(log n)** | O(1) |
| k-th element by rank | O(n) | **O(1)** | **O(log n)** | O(n) |
| Search for a value | O(n) | O(log n) | O(log n) | **O(1)** |

`heapq.nlargest(k, it)`: O(n log k). `heapq.merge`: O(N log k), lazy.

### Phrasing → pattern

| The problem says | Do this |
|---|---|
| "K largest / most frequent / closest" | size-K heap of the **opposite** type |
| "Kth largest, array in memory, one query" | Quickselect O(n) avg |
| "Kth largest in a stream" | permanent size-K min-heap |
| "merge K sorted …" | heap of heads (or D&C pairwise merge) |
| "median of stream / window" | two heaps (+ lazy deletion for windows) |
| "min rooms / max overlap" | min-heap of end times, sort by start |
| "most frequent task, with cooldown" | max-heap + cooldown queue |
| "take greedily, may need to undo" | max-heap of past choices → pop the worst |
| "at most k, objective = sum × min" | sort by the `min` axis, heap the `sum` axis |
| "shortest path, non-negative weights" | Dijkstra (heap) |
| "smallest sums / kth in sorted matrix" | heap frontier + visited set |
| "need remove + indexing + order stats" | **not** a heap → `SortedList` / BIT |
| "all data known, single pass in order" | **not** a heap → just `sorted()` |

---

## 14. Google-favourite problems (basic → hard)

For each, the parenthetical is the *thought*, not the API.

**Basic**
1. Last Stone Weight (LC 1046) — always smash the two heaviest remaining; live set
   of stone weights → max-heap. Stop when 0 or 1 stone left.
2. Kth Largest Element in an Array (LC 215) — club of K largest (size-k min-heap)
   or Quickselect if the array is in memory and one query is enough.
3. Kth Largest Element in a Stream (LC 703) — same club, but it is a long-lived
   object; `add` is "does this beat the victim?".
4. Top K Frequent Elements (LC 347) — frequencies are scores; then it is top-K.
   Follow-up: bucket by frequency for O(n).
5. Top K Frequent Words (LC 692) — same, but ties want *lexicographically smaller*
   word → `(-count, word)` mixed order. Do not negate the string.
6. K Closest Points to Origin (LC 973) — K smallest distances → max-heap of
   squared distance (victim = farthest of the K).
7. Sort Characters By Frequency (LC 451) — emit from a max-heap of counts, or
   bucket by frequency. Warm-up for 347.
8. Relative Ranks (LC 506) — max-heap of `(score, index)` so you can write
   "Gold"/"Silver"/"Bronze"/rank back into the original order.
9. Seat Reservation Manager (LC 1845) — live set of free seats; you always want
   the smallest number → min-heap. Lazy-init: start with `1` and push `n+1` only
   when you have handed `n` out, so you do not materialise `10^6` seats.
10. Maximum Product After K Increments (LC 2233) — product grows most if you
    increment the *current minimum* (because `(x+1)/x` is largest for small x).
    Min-heap, bump k times, watch the modulo.

**Core**
11. Merge k Sorted Lists (LC 23) — next merged value = min of the k heads. Tie-break
    with list index so Python never compares `ListNode`s.
12. Ugly Number II (LC 264) — every ugly number is `2, 3, or 5 ×` an earlier one.
    A min-heap + seen-set generates them in order. Three pointers (one per prime)
    is O(n) and better; the heap is how you *discover* that.
13. Super Ugly Number (LC 313) — same with k primes. k pointers still beat the heap
    because each new value has a unique "which prime produced me" parent.
14. Find K Pairs with Smallest Sums (LC 373) — monotone grid of `a[i]+b[j]`; frontier
    heap from `(0,0)` plus visited so `(i+1,j)` and `(i,j+1)` do not double-push.
15. Kth Smallest Element in a Sorted Matrix (LC 378) — same frontier. For large k,
    binary-search the value instead of materialising k cells.
16. Meeting Rooms II (LC 253) — earliest-freeing room vs this start; heap size is
    concurrency.
17. Task Scheduler (LC 621) — always run the ready task with most remaining work;
    cooldown deque holds the rest. Formula is a shortcut for identical cooldowns.
18. Reorganize String (LC 767) — most-frequent remaining char, hold the previous
    one out for a step so it cannot sit next to itself.
19. Rearrange String k Distance Apart (LC 358) — same, hold the last k chars in a
    deque instead of one.
20. Car Pooling (LC 1094) — Meeting Rooms II with weights; drop-offs leave a
    min-heap before each pickup.
21. Find Median from Data Stream (LC 295) — two opposite heaps; you only need the
    two values that touch the middle.
22. Design Twitter (LC 355) — each user's feed is a sorted list of tweets; "10
    most recent among followees" is merge-k-lists, k = followees, take 10.
23. Total Cost to Hire K Workers (LC 2462) — candidates arrive from both ends of
    the row. Two min-heaps (left window, right window) + two pointers; always
    hire the cheaper of the two roots.
24. Maximum Average Pass Ratio (LC 1792) — extra student should go where they
    raise the average *most*. Heap key is Δ = `(p+1)/(t+1) − p/t`, not the ratio
    itself. Recompute Δ after each assignment.
25. Furthest Building You Can Reach (LC 1642) — use bricks greedily, remember
    every climb in a min-heap (those are the climbs you might wish you had used
    a ladder on). When bricks run out, convert the *smallest* stored climb into
    a ladder (regret the cheapest past brick spend).
26. Process Tasks Using Servers (LC 1882) — free heap (weight, index) vs busy
    heap (free_time, weight, index). Move busy→free before each assignment.
27. Single-Threaded CPU (LC 1834) — admit by enqueue time, pick by
    `(processing_time, index)`; jump the clock if idle.

**Hard**
28. Sliding Window Median (LC 480) — two-heap median plus lazy delete of the
    index that just left the window. Live counts, not `len(heap)`.
29. IPO / Maximum Capital (LC 502) — unlock by capital (sorted/min-heap), then
    pick max profit among affordable. k rounds of "unlock prefix, pop once".
30. Course Schedule III (LC 630) — sort by deadline, take all, undo the longest
    taken course when a deadline breaks.
31. Minimum Number of Refueling Stops (LC 871) — bank every passed station; when
    you would stall, retroactively take the biggest tank.
32. Smallest Range Covering Elements from K Lists (LC 632) — only advancing the
    current min can shrink a valid k-list cover; heap of heads + running max.
33. Maximum Performance of a Team (LC 1383) — freeze min-efficiency by sorting
    it descending; size-k min-heap of speeds in the prefix.
34. Minimum Cost to Hire K Workers (LC 857) — cost = `sum(quality) * max(wage/quality
    in the team)`. Freeze the ratio by sorting it; size-k min-heap of qualities
    (actually a max-heap of quality if you drop the largest quality when over k,
    since ratio is already fixed — victim is the costliest quality).
35. Employee Free Time (LC 759) — merge-k on every employee's sorted intervals;
    a gap in the merged timeline is a common free slot (`intervals.md`).
36. The Skyline Problem (LC 218) — sweep left-to-right; live set is active
    building heights → max-heap with lazy deletion when a building ends. A
    skyline point is emitted only when the max height *changes*.
37. Trapping Rain Water II (LC 407) — water is limited by the lowest boundary
    cell. Dijkstra-style: min-heap of the current rim, grow inward; a cell
    holds `max(0, rim − height)`.
38. Number of Flowers in Full Bloom (LC 2251) — sort people by visit time; min-heap
    of bloom-end times of flowers already started. Heap size = flowers in bloom.
    (Or binary-search starts and ends separately.)
39. Network Delay Time (LC 743) — Dijkstra from `k`; answer is max dist, or −1
    if some node is missing.
40. Path with Maximum Probability (LC 1514) — Dijkstra but the key is
    *probability product* and you want the **max**, so push `(-prob, node)` and
    relax when `nd > dist[v]`.
41. Swim in Rising Water (LC 778) — you wait for `t = max elevation on the path`.
    Best-first search on that bottleneck: heap key = `max(t_so_far, grid[nr][nc])`.
42. Minimum Cost to Connect Sticks (LC 1167) — Huffman: always merge the two
    cheapest; the merge cost goes back into the min-heap. Any other merge order
    pays at least as much (exchange argument).
43. Cheapest Flights Within K Stops (LC 787) — a heap-Dijkstra *can* be wrong
    here because a longer path with fewer stops may enable a cheaper continuation.
    Safer: Bellman-Ford / BFS layering for exactly `k+1` edges.

---

## 15. Quiz

**Q1.** To keep the K *largest* elements of a stream, do you use a min-heap or a
max-heap, and why?

<details><summary>Answer</summary>
A **min-heap** of size K. The only element you ever evict is the *weakest* of the K
you are holding, and a min-heap puts exactly that at the root for `O(1)` inspection
and `O(log k)` removal. The final root is the Kth largest.
</details>

**Q2.** Why is `heapify` `O(n)` while pushing n elements one at a time is
`O(n log n)`?

<details><summary>Answer</summary>
`heapify` sift-downs cost `O(height above the leaves)`, and half the nodes are leaves
with cost 0. Summing `Σ (n/2^(h+1))·h = O(n)` because `Σ h/2^h` converges to 2. With
repeated `push`, each element sift-*ups* from the bottom and can travel the full
`log n` height, so the cheap-majority argument disappears.
</details>

**Q3.** `heapq.heappush(h, (1, obj_a))` then `heapq.heappush(h, (1, obj_b))` throws
`TypeError`. Why, and what is the standard fix?

<details><summary>Answer</summary>
Tuples compare elementwise; when the priorities tie Python falls through to comparing
`obj_a < obj_b`, which is undefined for arbitrary objects. Fix: insert a unique,
always-comparable tie-breaker — `(priority, next(itertools.count()), obj)` — which
also yields FIFO order among equal priorities. Alternatively define `__lt__`.
</details>

**Q4.** Is `h[1]` the second-smallest element of a min-heap?

<details><summary>Answer</summary>
No. The second smallest is `min(h[1], h[2])` (one of the root's children), but `h[1]`
alone is not guaranteed. A heap orders only along parent→child paths; siblings and
subtrees are unordered relative to each other.
</details>

**Q5.** Dijkstra with `heapq` has no `decrease-key`. What do we do instead, and which
line makes it correct?

<details><summary>Answer</summary>
We push a *new* `(new_dist, node)` entry and leave the outdated one in the heap. The
guard `if d > dist[u]: continue` after popping discards stale entries. The heap grows
to `O(E)` instead of `O(V)`, but the complexity stays `O(E log V)` since `log E =
O(log V²) = O(log V)`.
</details>

**Q6.** When would you choose `SortedList` over a heap?

<details><summary>Answer</summary>
When you need more than "the best element": removal of an arbitrary value, indexing
by rank (`sl[k]`), binary search (`bisect`), or access to *both* ends. A heap gives
`O(1)` access to one end only and `O(n)` arbitrary removal (or `O(log n)` amortised
with lazy deletion, at the cost of an inexact physical size).
</details>

**Q7.** Heapsort is `O(n log n)` worst-case with `O(1)` space. Why do libraries still
default to quicksort?

<details><summary>Answer</summary>
Constants and cache. Heapsort's `2i+1 / 2i+2` jumps have terrible locality, it makes
roughly twice the comparisons of quicksort, and it is not stable. Quicksort scans
sequentially. Practical libraries use introsort — quicksort that switches to heapsort
when recursion gets too deep, keeping the `O(n log n)` guarantee.
</details>

**Q8.** In Maximum Performance of a Team, why is it valid to treat the current
engineer's efficiency as the team minimum?

<details><summary>Answer</summary>
Because we iterate in *decreasing* efficiency, every engineer already in the heap has
efficiency ≥ the current one. So any team formed from the processed prefix that
includes the current engineer has exactly `current.efficiency` as its minimum, which
decouples the two dimensions: maximise the speed sum with a size-k min-heap and
multiply. This "sort one dimension, heap the other" split is the whole trick.
</details>

---

## 16. Mini project — event-driven simulator + rate-limited scheduler

**How to think.** A discrete-event simulator is "always run the next thing that
happens". That is a min-heap keyed by virtual time. Ties must not compare
callables, so a monotonic `seq` sits in the tuple (the same crash as §2).
Cancellation is lazy deletion by `seq`: the event stays in the heap and is
skipped when popped.

The rate limiter is a second heap: jobs waiting for a token, keyed by priority.
When tokens run out you *schedule a wake-up* at `now + time_until_next_token`
instead of spinning. Two heaps, two meanings of "best": soonest event, then
most important waiting job.

Build a discrete-event simulator whose entire engine is one priority queue keyed by
*virtual time*. Then layer a token-bucket rate limiter on top: jobs that would exceed
the rate are re-scheduled instead of run. This exercises tuple keys, tie-breakers,
lazy cancellation, and heap-driven greedy scheduling in one place.

```python
import heapq
import itertools
from dataclasses import dataclass, field
from typing import Callable, Any


@dataclass(order=True)
class Event:
    time: float
    seq: int                                    # FIFO tie-break; never compares payload
    action: Callable[[], Any] = field(compare=False)
    name: str = field(compare=False, default="")


class Simulator:
    """Discrete-event simulation engine: one min-heap keyed by (time, seq)."""

    def __init__(self):
        self._pq: list[Event] = []
        self._seq = itertools.count()
        self._cancelled: set[int] = set()       # lazy deletion by seq number
        self.now = 0.0
        self.log: list[tuple[float, str]] = []

    def schedule(self, delay, action, name=""):
        ev = Event(self.now + delay, next(self._seq), action, name)
        heapq.heappush(self._pq, ev)
        return ev.seq                            # handle for cancel()

    def cancel(self, handle):
        self._cancelled.add(handle)              # O(1); skipped when it surfaces

    def run(self, until=float("inf")):
        while self._pq and self._pq[0].time <= until:
            ev = heapq.heappop(self._pq)
            if ev.seq in self._cancelled:
                self._cancelled.discard(ev.seq)
                continue
            self.now = ev.time                   # virtual clock jumps forward
            self.log.append((self.now, ev.name))
            ev.action()
        return self.log


class RateLimitedScheduler:
    """Token bucket: `rate` jobs per second, burst `capacity`.

    Jobs waiting for tokens sit in a priority heap keyed by (priority, seq)
    so the most important job wins the next token.
    """

    def __init__(self, sim, rate, capacity):
        self.sim, self.rate, self.capacity = sim, rate, capacity
        self.tokens = float(capacity)
        self.last_refill = sim.now
        self.pending: list[tuple[int, int, str]] = []
        self._seq = itertools.count()

    def _refill(self):
        elapsed = self.sim.now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last_refill = self.sim.now

    def submit(self, name, priority=0):
        heapq.heappush(self.pending, (priority, next(self._seq), name))
        self._drain()

    def _drain(self):
        self._refill()
        while self.pending and self.tokens >= 1:
            self.tokens -= 1
            _, _, name = heapq.heappop(self.pending)
            self.sim.log.append((self.sim.now, f"run {name}"))
        if self.pending:                          # wake up exactly when a token exists
            wait = (1 - self.tokens) / self.rate
            self.sim.schedule(wait, self._drain, name="refill")


if __name__ == "__main__":
    sim = Simulator()
    sched = RateLimitedScheduler(sim, rate=2.0, capacity=1)   # 2 jobs/sec, burst 1
    for i in range(5):
        sim.schedule(0.0, lambda i=i: sched.submit(f"job{i}", priority=i % 2))
    sim.run(until=10)
    for t, what in sim.log:
        print(f"{t:5.2f}  {what}")
```

**Extensions to try**
- Replace the token bucket with a **sliding-window** limiter (a deque of timestamps).
- Add job **deadlines** and drop jobs whose deadline passed while queued (EDF: key
  the heap by deadline instead of priority — one-line change, different policy).
- Support **priority ageing**: bump waiting jobs' priority over time. A plain heap
  cannot decrease-key, so either re-push with a stale-check or wrap `LazyHeap` (§9).
- Simulate `M/M/1` arrivals with `random.expovariate` and measure queue length —
  the classic use of a priority queue outside interviews.


<!-- Mental Model -->
DSA Greedy Scheduling & HeapsThe Universal Template: 
- Every greedy heap problem follows a 3-step lifecycle: Sort (establish chronological order), Heap (track future events/bottlenecks), and Loop (process the timeline).
- What Goes in the Heap: Determine this using a 3-question checklist:
    - What is my sorting axis? Chronological time. Sort tasks by arrival_time.
    - What is my bottleneck? Available servers.
    - What event "fixes" the bottleneck? A server finishing its current task.
    - When does it finish? arrival_time + load. (This is our heap key!)
    - Do I need extra info? Yes! When the server finishes, I need to know which server just freed up so I can assign the new task to it and increment its "busiest" counter.

Heap contains: (finish_time, server_index).
- The CPU Trap (Why pop only ONE task?): In work-driven problems, never empty the entire heap at once. Executing a task advances the clock. You must pop exactly one task, advance the clock, and check the original array to see if a better task arrived while the CPU was busy.
- For Loop vs. While Loop (Who controls the clock?):
    - Use a for loop: When parallel execution is allowed (e.g., Car Pooling, Meeting Rooms). The sorted array dictates time. Once you check the array, you are done.
    - Use a while loop: When dealing with a single bottleneck/queue (e.g., Single-Threaded CPU). Time advances based on how long a task takes to finish. You must loop until both the array and the heap (waiting room) are completely empty.