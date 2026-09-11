# Heaps & Priority Queues — Complete Guide

> Google DSA prep notes. Category: Heaps / Priority Queues.
> A heap is the data structure for *"give me the best item right now, repeatedly,
> while new items keep arriving."* Everything below is a variation of that sentence.

## 1. What a heap actually is

A **binary heap** is a *complete binary tree* (every level full except possibly the
last, which fills left-to-right) that satisfies the **heap property**:

- **Min-heap:** `parent <= both children` → the global minimum is at the root.
- **Max-heap:** `parent >= both children` → the global maximum is at the root.

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

**Proof sketch.** Leaves (half the nodes) cost 0. A node at height `h` costs `O(h)`.
In a heap of `n` nodes there are at most `n / 2^(h+1)` nodes of height `h`, so:

$$T(n) \;=\; \sum_{h=0}^{\log n} \frac{n}{2^{h+1}} \cdot O(h) \;=\; O\!\left(n \sum_{h=0}^{\infty} \frac{h}{2^{h}}\right) \;=\; O(2n) \;=\; O(n)$$

because $\sum h/2^h = 2$ converges. The intuition: **most nodes are near the bottom
and barely move**; only the few nodes near the root pay `log n`. Pushing one-by-one
is the opposite — every element can travel the full height — hence `O(n log n)`.

**Time** O(n) · **Space** O(1)

---

## 2. Python's `heapq` in practice

`heapq` operates **in place on a plain list** and is **min-heap only**.

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

### Max-heap: negate

```python
h = []
for x in [3, 1, 4]:
    heapq.heappush(h, -x)    # store negatives
largest = -heapq.heappop(h)  # ALWAYS re-negate on the way out
```

For tuples, negate only the key you order by: `(-freq, word)` gives *highest freq
first, then lexicographically smallest word* — a very common Google phrasing.

### Tuples as keys, and the tie-breaking crash

```python
import heapq

class Task:
    def __init__(self, name): self.name = name

h = []
heapq.heappush(h, (1, Task("a")))
heapq.heappush(h, (1, Task("b")))   # TypeError: '<' not supported between Task instances
```

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

---

## 4. Pattern 1 — Top K / Kth element

### The size-K heap trick (and why the heap type is "backwards")

To keep the **K largest** elements you use a **MIN**-heap of size K.

Why: the heap's job is to hold the K best seen so far, and the only element you ever
want to *throw away* is the **weakest of those K**. In a min-heap that weakest item
sits at the root, where you can evict it in `O(log k)`. If you used a max-heap you
would have the strongest at the root — useless, because you never want to evict it.

> "K largest → min-heap. K smallest → max-heap. The root is the *victim*, not the
> prize." The final root is the **Kth largest**.

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

Keep exactly one element per list in the heap: the current head. Pop the global
minimum, then push that list's next element. The heap size is always ≤ k.

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

Google favourite. Maintain one pointer per list; the window is
`[min of heads, max of heads]`. To shrink it you must advance the **minimum**, so a
min-heap of heads plus a running `hi` is exactly right.

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

Invariants: `max(small) <= min(large)` and `len(small) - len(large) ∈ {0, 1}`.
The median is then `small[0]` (odd) or the average of both roots (even), in `O(1)`.

### Find Median from Data Stream (LC 295)

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

### Task Scheduler (LC 621)

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

## 11. Heapsort

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

**Basic**
1. Last Stone Weight (LC 1046) — max-heap, smash the two biggest.
2. Kth Largest Element in an Array (LC 215) — size-k min-heap vs Quickselect.
3. Kth Largest Element in a Stream (LC 703) — permanent size-k heap; design question.
4. Top K Frequent Elements (LC 347) — Counter + `nlargest`; follow-up bucket sort O(n).
5. Top K Frequent Words (LC 692) — tie-break: `(-count, word)`, mind the mixed order.
6. K Closest Points to Origin (LC 973) — size-k max-heap on squared distance.
7. Sort Characters By Frequency (LC 451) — heap or bucket; warm-up.
8. Relative Ranks (LC 506) — trivial heap, good for warming up tuple keys.
9. Seat Reservation Manager (LC 1845) — min-heap of free seat numbers; lazy init.
10. Maximum Product After K Increments (LC 2233) — always bump the current minimum.

**Core**
11. Merge k Sorted Lists (LC 23) — heap of heads; tie-break with the list index.
12. Ugly Number II (LC 264) — heap + `seen` set, or three pointers (better).
13. Super Ugly Number (LC 313) — same with k primes; k pointers beats the heap.
14. Find K Pairs with Smallest Sums (LC 373) — frontier heap + visited set.
15. Kth Smallest Element in a Sorted Matrix (LC 378) — frontier heap; binary search wins for big k.
16. Meeting Rooms II (LC 253) — min-heap of end times = rooms in use.
17. Task Scheduler (LC 621) — max-heap + cooldown deque (math formula also works).
18. Reorganize String (LC 767) — max-heap, hold the previous char back one step.
19. Rearrange String k Distance Apart (LC 358) — same with a k-length deque.
20. Car Pooling (LC 1094) — sort by start, heap of drop-offs.
21. Find Median from Data Stream (LC 295) — the canonical two-heap design problem.
22. Design Twitter (LC 355) — merge k sorted feeds, take 10; heap + hash sets.
23. Total Cost to Hire K Workers (LC 2462) — two heaps from both ends + two pointers.
24. Maximum Average Pass Ratio (LC 1792) — max-heap on the *marginal gain* Δ, not the ratio.
25. Furthest Building You Can Reach (LC 1642) — min-heap of ladder-used jumps; regret pattern.
26. Process Tasks Using Servers (LC 1882) — free heap + busy heap.
27. Single-Threaded CPU (LC 1834) — sort by arrival, heap by duration.

**Hard**
28. Sliding Window Median (LC 480) — two heaps + lazy deletion (or `SortedList`).
29. IPO / Maximum Capital (LC 502) — min-heap by capital, max-heap by profit.
30. Course Schedule III (LC 630) — sort by deadline, regret heap of durations.
31. Minimum Number of Refueling Stops (LC 871) — bank stations, refuel retroactively.
32. Smallest Range Covering Elements from K Lists (LC 632) — heap of heads + running max.
33. Maximum Performance of a Team (LC 1383) — sort by efficiency, heap the speeds.
34. Minimum Cost to Hire K Workers (LC 857) — sort by wage/quality ratio, heap the qualities.
35. Employee Free Time (LC 759) — heap-merge all intervals, report the gaps (`intervals.md`).
36. The Skyline Problem (LC 218) — sweep + max-heap of active heights with lazy deletion.
37. Trapping Rain Water II (LC 407) — min-heap boundary, Dijkstra-flavoured BFS inward.
38. Number of Flowers in Full Bloom (LC 2251) — sort queries, heap of end times (or binary search).
39. Network Delay Time (LC 743) — plain Dijkstra; the easiest heap-graph problem.
40. Path with Maximum Probability (LC 1514) — Dijkstra with a max-heap and products.
41. Swim in Rising Water (LC 778) — min-heap best-first on max-elevation-so-far.
42. Minimum Cost to Connect Sticks (LC 1167) — Huffman: always merge the two cheapest.
43. Cheapest Flights Within K Stops (LC 787) — heap variant, but Bellman-Ford is safer.

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
