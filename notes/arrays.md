# Arrays & Hashing — Complete Guide

> Google DSA prep notes. Category: Arrays, hash maps, matrices, in-place tricks.
> This is the *foundation* file. Sum-over-a-contiguous-range lives in `subarrays.md`,
> window problems in `sliding_window.md`, "search a sorted/monotonic space" in
> `binary_search.md`, "next greater / span" in `monotonic_stack.md`. Everything else
> about arrays — hashing, prefix/difference arrays, index tricks, matrices, sampling,
> bit tricks and array-backed designs — is here.

## 1. Array fundamentals for interviews

### The physical model
An array is **one contiguous block of memory** holding equal-size slots. That single
fact generates every complexity you need to quote:

| Operation | Cost | Why |
|---|---|---|
| `a[i]` read/write | **O(1)** | address = `base + i * itemsize`, one multiply-add |
| append (amortised) | **O(1)** | doubling growth; see below |
| insert / delete at index `i` | **O(n − i)** | everything to the right shifts |
| insert / delete at the **end** | **O(1)** | nothing shifts |
| search unsorted | **O(n)** | must look at everything |
| search sorted | **O(log n)** | `binary_search.md` |

**Amortised append.** A dynamic array (`list`, `vector`, `ArrayList`) over-allocates.
When full it allocates a bigger block (CPython grows by ~12.5%, C++ usually 2×) and
copies. Copies cost `1 + 2 + 4 + ... + n < 2n` over `n` appends → **O(1) amortised**,
though one *individual* append can be O(n). If an interviewer asks "worst-case latency
per op", that distinction matters (and is the reason real-time systems pre-size).

**Deleting from the middle is the classic trap.** `del a[i]` is O(n). If order does
not matter, use the **swap-with-last** trick — the backbone of §10's `RandomizedSet`:
```python
def remove_unordered(a, i):
    a[i] = a[-1]        # overwrite the hole with the last element
    a.pop()             # O(1); array stays dense, order is destroyed
```
**Time / Space:** O(1) / O(1).

### Cache locality — say this out loud at Google
A modern CPU reads memory in **64-byte cache lines** and can prefetch a linear stride.
A sequential array scan gets ~1 cache miss per 8–16 elements; a linked structure gets
~1 miss per element, and a miss is ~100× the cost of an L1 hit. Consequence:

> An **O(n log n)** algorithm that scans and sorts arrays routinely beats an **O(n)**
> algorithm that chases pointers, for n up to millions.

Concrete interview-usable examples:
- Sorting an array then two-pointer scanning it usually beats building a hash map of
  n objects, despite `O(n log n)` vs `O(n)` — hashing randomises memory access.
- BFS on an adjacency **list of lists of ints** (CSR-style flat arrays) beats a graph
  of node objects by a large constant.
- `heapq`'s `2i+1 / 2i+2` jumps are why heapsort loses to quicksort (`heaps.md`).

The right phrasing: *"asymptotically they tie, but the array version has far better
locality so I'd expect it to win in practice; I'd measure."* That is a senior signal.

### Python containers — which one?
```python
xs = [1, 2, 3]              # list: array of POINTERS to boxed PyObjects
import array
ys = array.array('i', xs)   # array: packed C ints, 4 bytes each, no boxing
import numpy as np          # numpy: packed + vectorised ops in C
```
- `list` — pointer array, ~8 bytes/slot **plus** a heap-allocated int object each
  (small ints −5..256 are cached and shared). Heterogeneous, resizable, O(1) index.
- `array.array` — packed primitives, ~4× less memory, but no vector ops.
- `numpy` — packed *and* fast elementwise ops; the only one that changes complexity
  constants materially.

**For interviews, plain `list` is always fine.** n ≤ 10⁵–10⁶, and the grader measures
your algorithm, not your memory layout. Mentioning `numpy` in a DSA interview usually
reads as dodging the algorithm. Do know the facts above in case they probe.

Useful list facts to have memorised:
```python
a[i:j]            # COPY, O(j-i) — a hidden O(n^2) if done inside a loop
a[::-1]           # reversed copy, O(n);  a.reverse() is in-place O(1) space
a.sort()          # in-place Timsort, O(n log n), STABLE, returns None
sorted(a)         # new list, same guarantees
x in a            # O(n) on a list — O(1) on a set. #1 accidental blowup
a.index(x)        # O(n), raises ValueError if absent
[[0]*n for _ in range(m)]   # correct 2-D zeros; NEVER [[0]*n]*m  (§13)
```

**Mental trigger:** *"am I inserting/deleting anywhere but the end, or slicing inside a
loop?"* If yes, you probably just wrote an accidental O(n²).

---

## 2. Hashing fundamentals

### The contract
`dict` and `set` are open-addressed hash tables: **O(1) average, O(n) worst case** for
insert / lookup / delete. The average holds because the table keeps its load factor
below ~2/3 and resizes (rehashing everything, O(n), amortised away).

Always say "**O(1) average**". Saying flatly "O(1)" invites the follow-up you then fail.

### What makes a good key
A key must be **hashable**: immutable and with `__hash__`/`__eq__` that agree
(`a == b ⟹ hash(a) == hash(b)`).
```python
d[(r, c)] = 1                 # tuple  ✅ hashable
d[[r, c]] = 1                 # list   ❌ TypeError: unhashable type: 'list'
d[frozenset(s)] = 1           # frozenset ✅ ; set ❌
d[tuple(sorted(word))] = 1    # canonical form as a key — anagram grouping
d[tuple(count26)] = 1         # fixed-length count vector as a key
```
The interview skill is **designing the key**: reduce each object to a *canonical form*
such that "equivalent" objects collide on purpose. Sorted-string, count-vector,
normalised-shape and root-of-DSU are the four you will use most.

### The three dict wrappers worth knowing
```python
from collections import defaultdict, Counter

g = defaultdict(list); g[k].append(v)     # no key check; missing key AUTO-CREATES
c = Counter(nums)                          # freq map + .most_common(k) + set algebra
c1 & c2; c1 - c2                           # multiset min / difference
d.setdefault(k, []).append(v)              # same as defaultdict but per-call
d.get(k, 0)                                # read WITHOUT inserting
```
Trap: `defaultdict` **mutates on read** — a bare `if g[k]:` inserts an empty entry and
silently changes `len(g)`. Use `d.get(k)` or `k in d` for pure reads.

### When a fixed-size array beats a dict
If keys are **small and bounded**, use a plain list — same O(1) but ~5–10× faster,
zero hashing, perfect locality, trivially resettable:
```python
cnt = [0] * 26                  # lowercase letters
cnt[ord(ch) - 97] += 1
seen = [False] * (n + 1)        # values known to be in 1..n
grid = [[0] * cols for _ in range(rows)]   # coordinates → array, not dict of tuples
```
Rule: **bounded alphabet or bounded value range → array. Unbounded / sparse → dict.**
Volunteering this swap ("since it's lowercase ASCII I'd use a 26-array") scores points.

### Adversarial collisions (the senior follow-up)
Worst case is O(n) per op when every key lands in one bucket. This is not theoretical:
attackers can craft colliding keys to turn an O(n) endpoint into O(n²) — a real DoS
class. Mitigations: **hash randomisation per process** (Python enables `PYTHONHASHSEED`
randomisation for `str`/`bytes` by default), SipHash, or trees instead of chains
(Java 8 converts long buckets to red-black trees). Note that **`hash(int)` in CPython
is the int itself**, so integer keys are *not* randomised — `{i * 2**16 for i in ...}`
patterns can genuinely degrade. If worst-case bounds are required, use a sorted
structure (`O(log n)` guaranteed) instead of a hash map.

**Mental trigger:** *"have I seen X before?"* / *"where is X?"* / *"how many X?"* → hash.
*"...and X is a small bounded integer or letter"* → array instead of hash.

---

## 3. Pattern 1 — Hash map for complement / lookup

The single most common array pattern: **as you sweep, ask the map about the piece you
still need.** One pass, because the answer to "does the partner exist to my left?" is
already in the map.

### Two Sum (LC 1) and its variants
```python
def two_sum(nums, target):
    seen = {}                                # value -> index
    for i, x in enumerate(nums):
        if target - x in seen:               # the complement arrived earlier
            return [seen[target - x], i]
        seen[x] = i                          # insert AFTER checking: no self-pairing
    return []
```
**Time / Space:** O(n) / O(n).

Variants and the right tool for each:
```python
def two_sum_sorted(nums, target):            # LC 167 — input already sorted
    i, j = 0, len(nums) - 1
    while i < j:
        s = nums[i] + nums[j]
        if s == target: return [i + 1, j + 1]
        if s < target: i += 1                # need bigger → move left pointer up
        else: j -= 1
    return []

def two_sum_count_pairs(nums, target):       # count PAIRS, duplicates allowed
    seen, pairs = Counter(), 0
    for x in nums:
        pairs += seen[target - x]            # every earlier partner makes a pair
        seen[x] += 1
    return pairs
```
**Time / Space:** sorted variant O(n) / **O(1)** — that is why "sorted input" in the
prompt is a hint to drop the hash map. Count-pairs is O(n) / O(n).

### Contains Duplicate I / II / III (LC 217 / 219 / 220)
```python
def contains_duplicate(nums):                # I — any duplicate at all
    return len(set(nums)) != len(nums)

def contains_nearby_duplicate(nums, k):      # II — duplicate within index distance k
    last = {}
    for i, x in enumerate(nums):
        if x in last and i - last[x] <= k: return True
        last[x] = i                          # keep the LATEST index → smallest gap
    return False

def contains_nearby_almost_duplicate(nums, k, t):   # III — |vals| <= t AND |idx| <= k
    if t < 0: return False
    width = t + 1                            # bucket width t+1 => same bucket ⇒ diff<=t
    bucket = {}
    for i, x in enumerate(nums):
        b = x // width                       # floor division works for negatives too
        if b in bucket: return True
        if b - 1 in bucket and abs(x - bucket[b - 1]) <= t: return True
        if b + 1 in bucket and abs(x - bucket[b + 1]) <= t: return True
        bucket[b] = x
        if i >= k: del bucket[nums[i - k] // width]   # keep only a window of k buckets
    return False
```
**Time / Space:** I O(n)/O(n); II O(n)/O(min(n,k)); III **O(n)/O(k)**.
III is the interesting one: bucketing by `t+1` turns "is any value within t?" into
"is anything in my bucket or an adjacent one?" — three O(1) probes instead of a range
query. The alternative is a balanced BST / `SortedList` window at O(n log k).

### Longest Consecutive Sequence (LC 128) — the "start only from a head" trick
Sorting gives O(n log n) trivially. The O(n) solution is a Google favourite because the
naive "expand from every element" looks quadratic and isn't.

```python
def longest_consecutive(nums):
    s = set(nums)                            # O(1) membership, dedupes
    best = 0
    for x in s:
        if x - 1 in s:
            continue                         # x is NOT a head — someone else will do it
        length = 1
        while x + length in s:               # walk the run upward, once
            length += 1
        best = max(best, length)
    return best
```
**Time / Space:** **O(n) / O(n)**.

Why is this linear when there's a `while` inside a `for`? Because of the guard. A run
`[a, a+1, ..., a+L-1]` is expanded **exactly once** — from its head `a`, the only
element whose predecessor is absent. Every non-head does O(1) work and quits. So the
total `while` work is `Σ L_i = n` across all runs. Charge each inner step to the unique
element it visits: each element is visited by at most one expansion. **That amortised
argument is the answer they want** — say it, don't just write the code.

Common wrong versions: dropping the `x - 1 in s` guard (O(n²) on `[1..n]`), or
iterating `nums` instead of `s` (duplicates redo the whole run).

### Group Anagrams (LC 49) — designing a canonical key
```python
def group_anagrams(strs):
    groups = defaultdict(list)
    for w in strs:
        key = [0] * 26
        for ch in w: key[ord(ch) - 97] += 1
        groups[tuple(key)].append(w)         # tuple: hashable canonical form
    return list(groups.values())
```
**Time / Space:** O(n·(k+26)) / O(n·k) for n words of length k. Sorted-string keys are
O(n·k log k) but shorter to write — mention both, justify your pick (`strings.md`).

### Valid Sudoku (LC 36) — one pass, three key families
```python
def is_valid_sudoku(board):
    seen = set()
    for r in range(9):
        for c in range(9):
            v = board[r][c]
            if v == '.': continue
            keys = ((v, 'row', r), (v, 'col', c), (v, 'box', r // 3, c // 3))
            if any(k in seen for k in keys): return False
            seen.update(keys)
    return True
```
**Time / Space:** O(81) / O(81) = O(1) / O(1). The trick is **tagged keys** in one set
instead of 27 separate structures — the same idea scales to any "multiple constraint
families" problem.

### Subarray Sum Equals K (LC 560) — prefix + map
```python
def subarray_sum(nums, k):
    seen = {0: 1}                            # empty prefix seen once
    prefix = count = 0
    for x in nums:
        prefix += x
        count += seen.get(prefix - k, 0)     # earlier prefix ⇒ gap sums to k
        seen[prefix] = seen.get(prefix, 0) + 1
    return count
```
**Time / Space:** O(n) / O(n). Full treatment (longest variant, mod-k variant, why a
sliding window is illegal with negatives) is in **`subarrays.md` §4** — don't re-derive
it here, just recognise it.

### 4Sum II (LC 454) — meet in the middle
Four arrays of size n; count quadruples summing to 0. Brute force is O(n⁴).
```python
def four_sum_count(a, b, c, d):
    ab = Counter(x + y for x in a for y in b)     # all n^2 sums of the FIRST half
    return sum(ab[-(x + y)] for x in c for y in d)  # look up the needed complement
```
**Time / Space:** **O(n²) / O(n²)**. Splitting `4 = 2 + 2` and hashing one half is
*meet in the middle*: it turns `O(n^k)` into `O(n^{k/2})` whenever the objective is a
sum you can split. The same move solves subset-sum for n ≈ 40.

**Mental trigger:** *"find a pair/quadruple hitting an exact target"* → hash the
complement; if there are 4+ terms, **split them in half and hash one half**.

---

## 4. Pattern 2 — Prefix sums & difference arrays

Two dual ideas: **prefix** answers *range queries* on a static array; **difference**
applies *range updates* cheaply and reads once at the end.

| You need | Structure | Build | Query | Update |
|---|---|---|---|---|
| many range sums, no updates | prefix sums | O(n) | **O(1)** | O(n) |
| many range updates, one final read | difference array | O(1) | O(n) | **O(1)** |
| both interleaved | Fenwick / segment tree | O(n) | O(log n) | O(log n) |

Recap (full derivation in **`subarrays.md` §2**): with `P[0] = 0`,
`P[i] = nums[0] + ... + nums[i-1]`, so `sum(nums[i..j]) = P[j+1] - P[i]`.

### Range Sum Query — Immutable (LC 303)
```python
class NumArray:
    def __init__(self, nums):
        self.pre = [0] * (len(nums) + 1)
        for i, x in enumerate(nums):
            self.pre[i + 1] = self.pre[i] + x     # pre[i] = sum of first i elements
    def sumRange(self, left, right):
        return self.pre[right + 1] - self.pre[left]
```
**Time / Space:** build O(n), query **O(1)** / O(n). (Mutable version → Fenwick tree.)

### Range Sum Query 2D (LC 304) — inclusion–exclusion
`P[r][c]` = sum of the rectangle from `(0,0)` to `(r-1,c-1)`.
```python
class NumMatrix:
    def __init__(self, matrix):
        rows, cols = len(matrix), len(matrix[0])
        self.pre = [[0] * (cols + 1) for _ in range(rows + 1)]
        for r in range(rows):
            for c in range(cols):
                self.pre[r + 1][c + 1] = (matrix[r][c] + self.pre[r][c + 1]
                                          + self.pre[r + 1][c] - self.pre[r][c])
    def sumRegion(self, r1, c1, r2, c2):
        return (self.pre[r2 + 1][c2 + 1] - self.pre[r1][c2 + 1]
                - self.pre[r2 + 1][c1] + self.pre[r1][c1])   # add back double-subtracted
```
**Time / Space:** build O(rc), query **O(1)** / O(rc). Both build and query are the
same 4-term inclusion–exclusion; the `+ pre[r][c]` fixes the corner subtracted twice.

### Max Sum of Rectangle No Larger Than K (LC 363)
Compress a column band into a 1-D array, then solve "max subarray sum ≤ k" with a
sorted list of prefixes: we want the smallest seen prefix `≥ prefix - k`.
```python
from bisect import bisect_left, insort

def max_sum_submatrix(matrix, k):
    rows, cols = len(matrix), len(matrix[0])
    best = float('-inf')
    for left in range(cols):
        band = [0] * rows
        for right in range(left, cols):
            for r in range(rows):
                band[r] += matrix[r][right]         # widen the column band in O(rows)
            seen, prefix = [0], 0
            for v in band:
                prefix += v
                i = bisect_left(seen, prefix - k)   # smallest prefix >= prefix-k
                if i < len(seen):
                    best = max(best, prefix - seen[i])
                insort(seen, prefix)
            if best == k: return k                  # early exit, can't beat k
    return best
```
**Time / Space:** O(cols²·rows·log rows) / O(rows). Same column-band compression as
2-D Kadane (`subarrays.md` §6.7) — only the inner 1-D routine changes.

### Difference array — O(1) range updates
To add `v` to `a[l..r]`: `diff[l] += v; diff[r+1] -= v`. The prefix sum of `diff`
*is* the final array. Every "book seats / board passengers / paint a range" problem.

```python
def get_modified_array(length, updates):            # LC 370 Range Addition
    diff = [0] * (length + 1)                       # one extra slot for r+1
    for l, r, inc in updates:
        diff[l] += inc
        diff[r + 1] -= inc                          # cancel the effect past r
    out, run = [], 0
    for i in range(length):
        run += diff[i]                              # running prefix = final value
        out.append(run)
    return out

def corp_flight_bookings(bookings, n):              # LC 1109 — 1-indexed flights
    diff = [0] * (n + 1)
    for first, last, seats in bookings:
        diff[first - 1] += seats
        diff[last] -= seats
    for i in range(1, n):
        diff[i] += diff[i - 1]                      # in-place prefix
    return diff[:n]

def car_pooling(trips, capacity):                   # LC 1094 — locations 0..1000
    diff = [0] * 1001
    for num, start, end in trips:
        diff[start] += num
        diff[end] -= num                            # passengers leave AT end, not after
    cur = 0
    for d in diff:
        cur += d
        if cur > capacity: return False
    return True
```
**Time / Space:** O(n + u) / O(n) for u updates. Note `car_pooling` uses `diff[end]`
(not `end+1`) because a trip ending at `end` frees the seats *before* anyone boards
there — an off-by-one that is really a *semantics* question. Ask.

### Prefix XOR
XOR is its own inverse, so the identity is identical to sums:
`xor(a[l..r]) = pre[r+1] ^ pre[l]`.
```python
def xor_queries(arr, queries):                      # LC 1310
    pre = [0]
    for x in arr: pre.append(pre[-1] ^ x)
    return [pre[r + 1] ^ pre[l] for l, r in queries]
```
**Time / Space:** O(n + q) / O(n). Any **invertible associative** op works: sum, XOR,
product-with-no-zeros, matrix product. `min`/`max` are **not** invertible → sparse table
or segment tree instead.

### Product of Array Except Self (LC 238) — prefix × suffix, no division
Division is banned (and would break on zeros anyway). Answer: for each `i`, multiply
"product of everything left" by "product of everything right".
```python
def product_except_self_two_arrays(nums):           # clearest version
    n = len(nums)
    left, right = [1] * n, [1] * n
    for i in range(1, n):
        left[i] = left[i - 1] * nums[i - 1]
    for i in range(n - 2, -1, -1):
        right[i] = right[i + 1] * nums[i + 1]
    return [left[i] * right[i] for i in range(n)]

def product_except_self(nums):                      # O(1) EXTRA space (output excluded)
    n = len(nums)
    out = [1] * n
    for i in range(1, n):
        out[i] = out[i - 1] * nums[i - 1]           # pass 1: out[i] = prefix product
    suffix = 1
    for i in range(n - 1, -1, -1):
        out[i] *= suffix                            # pass 2: fold the suffix in
        suffix *= nums[i]                           # ...carried in a single variable
    return out
```
**Time / Space:** O(n) / O(n) then **O(n) / O(1) extra**. The trick is generic: *build
one direction into the output array, then sweep the other direction with a single
running accumulator.* State that phrasing — it reuses in Trapping Rain Water,
Candy, and Best Time to Buy and Sell Stock.

**Mental trigger:** *"repeated range queries on static data"* → prefix.
*"many range updates, one final read"* → difference array.
*"exclude element i"* → prefix × suffix.

---

## 5. Pattern 3 — In-place index tricks (O(1) space)

When values are constrained to roughly `1..n`, the **array can be its own hash map**:
value `v` "belongs" at index `v-1`. That gives O(1) space where a set would cost O(n).
The interviewer asking "can you do it without extra space?" is asking for this section.

### Cyclic sort — the template
Repeatedly swap `nums[i]` to its home index until index `i` holds a value that belongs
there (or is out of range).
```python
def cyclic_sort(nums):                    # values 1..n, one pass, O(1) space
    i = 0
    while i < len(nums):
        home = nums[i] - 1                # where nums[i] wants to live
        if 0 <= home < len(nums) and nums[home] != nums[i]:
            nums[i], nums[home] = nums[home], nums[i]   # send it home, re-examine i
        else:
            i += 1
    return nums
```
**Time / Space:** **O(n) / O(1)**. Linear despite the nested-looking swap: every swap
places at least one value permanently at its home, so there are ≤ n swaps total.

⚠️ Compare `nums[home] != nums[i]` (values), **not** indices — with duplicates the
index test spins forever.

### Missing Number (LC 268) — three ways, all worth naming
```python
def missing_number_sum(nums):             # 0..n with one missing
    n = len(nums)
    return n * (n + 1) // 2 - sum(nums)   # Gauss; can overflow in C++/Java

def missing_number_xor(nums):             # no overflow, still O(n)/O(1)
    ans = len(nums)
    for i, x in enumerate(nums):
        ans ^= i ^ x                      # pairs cancel; the missing index survives
    return ans

def missing_number_cyclic(nums):
    n = len(nums)
    i = 0
    while i < n:
        home = nums[i]                    # values are 0..n, so home = value
        if home < n and nums[home] != nums[i]:
            nums[i], nums[home] = nums[home], nums[i]
        else:
            i += 1
    for i in range(n):
        if nums[i] != i: return i
    return n
```
**Time / Space:** O(n) / O(1) each. Offer XOR when the interviewer mentions overflow.

### Find All Numbers Disappeared (LC 448) — negative marking
Values in `1..n`, some appear twice. Use the **sign** of `nums[v-1]` as a "seen" bit.
```python
def find_disappeared_numbers(nums):
    for x in nums:
        idx = abs(x) - 1                  # abs: x may already be marked negative
        if nums[idx] > 0:
            nums[idx] = -nums[idx]        # mark "value idx+1 exists"
    return [i + 1 for i, x in enumerate(nums) if x > 0]

def find_all_duplicates(nums):            # LC 442 — same trick, opposite report
    out = []
    for x in nums:
        idx = abs(x) - 1
        if nums[idx] < 0: out.append(abs(x))   # already marked ⇒ second sighting
        else: nums[idx] = -nums[idx]
    return out
```
**Time / Space:** O(n) / O(1) extra. Caveats to volunteer: it **mutates the input**
(restore by taking `abs` if required) and needs a spare bit — impossible if 0 or
negatives are legal values, in which case you fall back to cyclic sort.

### First Missing Positive (LC 41) — teach this one slowly
> Given an unsorted array (any integers), return the smallest **positive** integer
> missing. Required: **O(n) time, O(1) space.**

**Step 1 — bound the answer.** With `n` slots, the answer is always in `1..n+1`. If the
array happened to be exactly `1..n`, the answer is `n+1`; otherwise some value in
`1..n` is missing. So **anything ≤ 0 or > n is irrelevant** — noise we can ignore.

**Step 2 — the array is the hash map.** We want a set of "which of 1..n are present"
without allocating one. Since positions `0..n-1` are exactly the slots for values
`1..n`, put value `v` at index `v-1`.

**Step 3 — place, then scan.**
```python
def first_missing_positive(nums):
    n = len(nums)
    for i in range(n):
        # keep swapping nums[i] home while it is in range and not already there
        while 1 <= nums[i] <= n and nums[nums[i] - 1] != nums[i]:
            j = nums[i] - 1                       # cache the target index FIRST
            nums[i], nums[j] = nums[j], nums[i]   # (see the swap trap below)
    for i in range(n):
        if nums[i] != i + 1:
            return i + 1                          # first slot holding the wrong value
    return n + 1                                  # perfect 1..n ⇒ answer is n+1
```
**Time / Space:** **O(n) / O(1)**.

Four things to say while writing it:
1. **Why the `while` doesn't make it quadratic** — each swap puts one value at its
   permanent home, and a value never leaves home, so ≤ n swaps happen across the whole
   outer loop. Amortised O(1) per index.
2. **Why `nums[nums[i]-1] != nums[i]` and not `nums[i] != i+1`** — with duplicates
   (`[1,1]`) the home already holds the right value; the value-comparison terminates,
   an index-comparison loops forever.
3. **The Python swap trap.** Writing
   `nums[i], nums[nums[i]-1] = nums[nums[i]-1], nums[i]` is **wrong**: the RHS is
   evaluated first, then the targets are assigned **left to right**, so `nums[i]` is
   overwritten *before* `nums[nums[i]-1]` computes its index — using the new value.
   Cache `j = nums[i] - 1` first. This is a genuine interview-killer bug.
4. **Out-of-range values are left alone** on purpose; they will occupy some slot and be
   caught by the final scan as "wrong value here".

Sanity checks to run aloud: `[1,2,0] → 3`, `[3,4,-1,1] → 2`, `[7,8,9,11,12] → 1`,
`[1] → 2`, `[] → 1`.

### Find the Duplicate Number (LC 287) — Floyd on the index graph
`n+1` numbers, each in `1..n`, exactly one duplicate; **don't modify** the array, O(1)
space. Negative marking is banned, sorting is banned, a set is banned.

**The graph framing** (this is the whole insight). Define a function
`f(i) = nums[i]`, i.e. a directed edge from index `i` to index `nums[i]`. Because all
values lie in `1..n`, every edge lands in `1..n`, so **index 0 has no incoming edge**
— it is a tail, not part of any cycle. Following `0 → nums[0] → nums[nums[0]] → ...`
in a finite space must eventually repeat: the walk has a **ρ shape**, a tail followed
by a cycle. A cycle exists only because two indices point to the same place — and the
node with **two incoming edges is exactly the duplicated value**. So: *find the entrance
of the cycle* = classic Floyd tortoise-and-hare (`linked_list.md`).

```python
def find_duplicate(nums):
    slow = fast = 0
    while True:                       # phase 1: find a meeting point inside the cycle
        slow = nums[slow]
        fast = nums[nums[fast]]       # fast moves twice as fast
        if slow == fast: break
    slow = 0
    while slow != fast:               # phase 2: both at speed 1 ⇒ meet at the entrance
        slow = nums[slow]
        fast = nums[fast]
    return slow                       # entrance node == duplicated value
```
**Time / Space:** **O(n) / O(1)**, input untouched.

Why phase 2 works: let the tail be `μ` and cycle length `λ`. They meet at distance `k`
inside the cycle where `μ + k ≡ 0 (mod λ)`; restarting one pointer at 0 and stepping
both by 1 makes them meet after exactly `μ` steps — at the cycle entrance. The
alternate accepted answer is **binary search on the value** (count how many elements
are ≤ mid; if the count exceeds mid, the duplicate is ≤ mid) at O(n log n) — mention it
as the easier-to-derive fallback (`binary_search.md`).

### Set Matrix Zeroes (LC 73) — first row/col as the marker storage
```python
def set_zeroes(matrix):
    rows, cols = len(matrix), len(matrix[0])
    first_row = any(matrix[0][c] == 0 for c in range(cols))   # save these two facts
    first_col = any(matrix[r][0] == 0 for r in range(rows))   # BEFORE they get clobbered
    for r in range(1, rows):
        for c in range(1, cols):
            if matrix[r][c] == 0:
                matrix[r][0] = matrix[0][c] = 0                # record in the margins
    for r in range(1, rows):
        for c in range(1, cols):
            if matrix[r][0] == 0 or matrix[0][c] == 0:
                matrix[r][c] = 0
    if first_row:
        for c in range(cols): matrix[0][c] = 0                 # apply saved flags LAST
    if first_col:
        for r in range(rows): matrix[r][0] = 0
```
**Time / Space:** O(rc) / **O(1)** (naive uses two O(r+c) sets). The whole difficulty is
that cell `(0,0)` would have to be *both* row-0's and col-0's flag — hence two extra
booleans and applying them at the very end.

**Mental trigger:** *"values are in 1..n"* → cyclic sort or negative marking.
*"O(1) space, don't modify, find a duplicate"* → Floyd on the index graph.

---

## 6. Pattern 4 — Sorting-based

Sorting costs O(n log n) and buys **adjacency**: equal things and near things become
neighbours. But if the *keys are bounded*, counting/bucketing gets you O(n).

### Counting / bucket sort — Top K Frequent in O(n) (LC 347)
A frequency is at most `n`, so bucket by frequency and read the buckets top-down.
```python
def top_k_frequent(nums, k):
    freq = Counter(nums)
    buckets = [[] for _ in range(len(nums) + 1)]   # index = frequency
    for val, f in freq.items():
        buckets[f].append(val)
    out = []
    for f in range(len(nums), 0, -1):
        for val in buckets[f]:
            out.append(val)
            if len(out) == k: return out
    return out
```
**Time / Space:** **O(n) / O(n)**. Beats the heap (O(n log k), `heaps.md`) and
quickselect (O(n) average, O(n²) worst) because the key range is bounded by n. Say
*"frequencies are bounded by n, so I can bucket instead of compare-sort"*.

### H-Index (LC 274) — same bucketing, clamped
```python
def h_index(citations):
    n = len(citations)
    bucket = [0] * (n + 1)
    for c in citations:
        bucket[min(c, n)] += 1                # anything above n is as good as n
    total = 0
    for h in range(n, -1, -1):
        total += bucket[h]                    # papers with >= h citations
        if total >= h: return h
    return 0
```
**Time / Space:** O(n) / O(n). The clamp `min(c, n)` is the trick: `h` can never exceed
`n`, so all larger citation counts collapse into one bucket.

### Sort Colors (LC 75) — Dutch national flag, one pass
```python
def sort_colors(nums):
    low, i, high = 0, 0, len(nums) - 1
    while i <= high:
        if nums[i] == 0:
            nums[low], nums[i] = nums[i], nums[low]; low += 1; i += 1
        elif nums[i] == 2:
            nums[i], nums[high] = nums[high], nums[i]; high -= 1   # do NOT advance i
        else:
            i += 1                                                 # 1 is already home
    return nums
```
**Time / Space:** **O(n) / O(1)**, single pass (counting sort needs two). `i` does not
advance on the `2` branch because the value swapped in from the right is unexamined.
Invariant: `[0,low)` are 0s, `[low,i)` are 1s, `(high,n)` are 2s.

### Custom comparators — Largest Number (LC 179)
Sometimes the *order relation itself* is the puzzle. Compare `a+b` vs `b+a`.
```python
from functools import cmp_to_key

def largest_number(nums):
    strs = list(map(str, nums))
    # a before b iff a+b > b+a ; cmp returns negative when a should come first
    strs.sort(key=cmp_to_key(lambda a, b: (a + b < b + a) - (a + b > b + a)))
    return "0" if strs[0] == "0" else "".join(strs)
```
**Time / Space:** O(n·L log n) / O(n·L). `"3"` vs `"30"`: `"330" > "303"` so 3 first.
This relation is a genuine total order (it's transitive — worth asserting), which is
what makes sorting by it valid. Python 3 has no `cmp=` argument; `cmp_to_key` is the
bridge, and a plain `key=` is impossible here because the comparison is *pairwise*.

### Sort by key, then sweep
The generic move: sort so the constraint becomes local, then one linear pass.
Examples across files — Merge Intervals (`intervals.md`), Meeting Rooms II,
Minimum Cost to Hire K Workers (`heaps.md`), 3Sum below. Whenever a problem couples
*two* dimensions, **sort by one and handle the other with a sweep/heap**.

### Merge-sort counting — inversions and friends (a Google favourite)
Merge sort can *count* pairs across the split for free, because when `right[j]` jumps
ahead of `left[i]`, it beats **all** of `left[i:]` at once.

```python
def count_inversions(nums):                        # pairs i<j with nums[i] > nums[j]
    def sort(a):
        if len(a) <= 1: return a, 0
        m = len(a) // 2
        left, x = sort(a[:m])
        right, y = sort(a[m:])
        merged, inv = [], x + y
        i = j = 0
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:                # <= keeps it stable, no inversion
                merged.append(left[i]); i += 1
            else:
                inv += len(left) - i               # left[i:] ALL beat right[j]
                merged.append(right[j]); j += 1
        merged += left[i:] + right[j:]
        return merged, inv
    return sort(nums)[1]

def count_smaller(nums):                           # LC 315 — per-element counts
    n = len(nums)
    counts = [0] * n
    order = list(range(n))                         # sort INDICES so we can attribute

    def sort(lo, hi):
        if hi - lo <= 1: return
        mid = (lo + hi) // 2
        sort(lo, mid); sort(mid, hi)
        merged, i, j = [], lo, mid
        while i < mid and j < hi:
            if nums[order[j]] < nums[order[i]]:
                merged.append(order[j]); j += 1    # a right element crosses over
            else:
                counts[order[i]] += j - mid        # j-mid right elements already crossed
                merged.append(order[i]); i += 1
        while i < mid:
            counts[order[i]] += j - mid            # the rest of the right half crossed
            merged.append(order[i]); i += 1
        merged += order[j:hi]
        order[lo:hi] = merged
    sort(0, n)
    return counts

def reverse_pairs(nums):                           # LC 493 — nums[i] > 2*nums[j], i<j
    arr = nums[:]                                  # don't mutate the caller's list
    def sort(lo, hi):
        if hi - lo <= 1: return 0
        mid = (lo + hi) // 2
        cnt = sort(lo, mid) + sort(mid, hi)
        j = mid
        for i in range(lo, mid):                   # both halves sorted ⇒ j never rewinds
            while j < hi and arr[i] > 2 * arr[j]: j += 1
            cnt += j - mid
        arr[lo:hi] = sorted(arr[lo:hi])            # then merge (sorted() is fine here)
        return cnt
    return sort(0, len(arr))
```
**Time / Space:** **O(n log n) / O(n)** for all three.

Key points to say: the counting is *free* because the halves are already sorted; the
two-pointer count in `reverse_pairs` is separate from the merge because the predicate
(`> 2x`) is not the merge predicate. The alternative implementations are a **Fenwick
tree over compressed values** (same complexity, easier to extend to "count greater",
"count in range") — mention it as the other standard answer.

**Mental trigger:** *"count pairs (i, j) with i < j and some order relation"* →
merge-sort counting **or** Fenwick over ranks. *"top/most frequent with bounded keys"*
→ bucket by count, not a heap.

---

## 7. Pattern 5 — Matrix manipulation

Matrices are arrays with index arithmetic. Draw a 4×4 grid on the whiteboard, label
`(r, c)`, and *derive* the mapping instead of guessing signs.

### Rotate Image 90° clockwise, in place (LC 48)
Derive the target: `(r, c) → (c, n-1-r)`. Two ways:
```python
def rotate_transpose(matrix):                 # transpose, then reverse each row
    n = len(matrix)
    for r in range(n):
        for c in range(r + 1, n):             # c > r only, or you swap back
            matrix[r][c], matrix[c][r] = matrix[c][r], matrix[r][c]
    for row in matrix:
        row.reverse()
    return matrix

def rotate_layers(matrix):                    # 4-way cycle, ring by ring
    n = len(matrix)
    for layer in range(n // 2):
        first, last = layer, n - 1 - layer
        for i in range(first, last):
            offset = i - first
            top = matrix[first][i]
            matrix[first][i] = matrix[last - offset][first]     # left  -> top
            matrix[last - offset][first] = matrix[last][last - offset]  # bottom -> left
            matrix[last][last - offset] = matrix[i][last]       # right -> bottom
            matrix[i][last] = top                               # top   -> right
    return matrix
```
**Time / Space:** O(n²) / **O(1)** both. Transpose+reverse is what you write; the layer
version is what you explain if asked "without the two-pass trick". Counter-clockwise =
transpose then reverse **columns** (i.e. `matrix.reverse()` then transpose).

### Spiral Matrix — traverse (LC 54) and generate (LC 59)
Four moving boundaries; shrink after each edge.
```python
def spiral_order(matrix):
    if not matrix or not matrix[0]: return []
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    out = []
    while top <= bottom and left <= right:
        for c in range(left, right + 1): out.append(matrix[top][c])
        top += 1
        for r in range(top, bottom + 1): out.append(matrix[r][right])
        right -= 1
        if top <= bottom:                       # guard: a single leftover row
            for c in range(right, left - 1, -1): out.append(matrix[bottom][c])
            bottom -= 1
        if left <= right:                       # guard: a single leftover column
            for r in range(bottom, top - 1, -1): out.append(matrix[r][left])
            left += 1
    return out

def generate_matrix(n):                          # fill 1..n^2 spirally
    m = [[0] * n for _ in range(n)]
    top, bottom, left, right, v = 0, n - 1, 0, n - 1, 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1): m[top][c] = v; v += 1
        top += 1
        for r in range(top, bottom + 1): m[r][right] = v; v += 1
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1): m[bottom][c] = v; v += 1
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1): m[r][left] = v; v += 1
            left += 1
    return m
```
**Time / Space:** O(rc) / O(1) extra. The two `if` guards are the whole difficulty —
without them a 1×n or n×1 remainder is emitted twice. Test 1×1, 1×n, n×1, 3×3.

### Diagonal Traverse (LC 498)
All cells on one anti-diagonal share `r + c = d`. Alternate direction per diagonal.
```python
def find_diagonal_order(mat):
    if not mat or not mat[0]: return []
    m, n = len(mat), len(mat[0])
    out = []
    for d in range(m + n - 1):
        if d % 2 == 0:                       # even diagonal: bottom-left -> top-right
            r = min(d, m - 1); c = d - r
            while r >= 0 and c < n:
                out.append(mat[r][c]); r -= 1; c += 1
        else:                                # odd: top-right -> bottom-left
            c = min(d, n - 1); r = d - c
            while c >= 0 and r < m:
                out.append(mat[r][c]); r += 1; c -= 1
    return out
```
**Time / Space:** O(mn) / O(1) extra. Grouping by `r+c` (anti-diagonals) or `r-c`
(main diagonals) into a dict is the easier-to-write O(mn) variant.

### Search a 2D Matrix I (LC 74) and II (LC 240)
```python
def search_matrix(matrix, target):            # I: rows sorted AND row-major sorted
    rows, cols = len(matrix), len(matrix[0])
    lo, hi = 0, rows * cols - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        v = matrix[mid // cols][mid % cols]   # treat it as one flat sorted array
        if v == target: return True
        if v < target: lo = mid + 1
        else: hi = mid - 1
    return False

def search_matrix_ii(matrix, target):         # II: rows and cols sorted independently
    r, c = 0, len(matrix[0]) - 1              # start at the TOP-RIGHT corner
    while r < len(matrix) and c >= 0:
        v = matrix[r][c]
        if v == target: return True
        if v > target: c -= 1                 # this whole column is too big
        else: r += 1                          # this whole row is too small
    return False
```
**Time / Space:** I **O(log(rc))** / O(1); II **O(r + c)** / O(1). The staircase works
because the top-right corner is the max of its row and the min of its column, so each
comparison eliminates a full row or column — a *monotone staircase*, not binary search.

### Game of Life in place (LC 289) — 2-bit encoding
Every cell must be updated from the **old** board simultaneously. Store the new state
in bit 1 while bit 0 still holds the old state.
```python
def game_of_life(board):
    rows, cols = len(board), len(board[0])
    for r in range(rows):
        for c in range(cols):
            live = 0
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if dr or dc:
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < rows and 0 <= nc < cols:
                            live += board[nr][nc] & 1      # bit 0 = ORIGINAL state
            if board[r][c] & 1:
                if live in (2, 3): board[r][c] |= 2        # survives -> set bit 1
            elif live == 3:
                board[r][c] |= 2                           # birth -> set bit 1
    for r in range(rows):
        for c in range(cols):
            board[r][c] >>= 1                              # drop the old state
    return board
```
**Time / Space:** O(rc·8) / **O(1)**. Follow-up they always ask: *infinite board?* →
store only live cells in a set of `(r, c)`, count neighbours with a `Counter` over live
cells' neighbourhoods; that's O(live), not O(area).

### Rotate Array by k (LC 189) — derive the three-reversal trick
Target: `nums[i]` moves to `(i + k) % n`. Reversal derivation, in three lines you can
reconstruct under pressure:
- the answer is `last k elements` followed by `first n-k elements`;
- reversing the whole array gives `reverse(last k) + reverse(first n-k)` — the two
  blocks are now in the right *order* but each is internally backwards;
- so reverse each block back.

```python
def rotate(nums, k):
    n = len(nums)
    k %= n                                    # k can exceed n
    def rev(i, j):
        while i < j:
            nums[i], nums[j] = nums[j], nums[i]; i += 1; j -= 1
    rev(0, n - 1)                             # whole array
    rev(0, k - 1)                             # first block back
    rev(k, n - 1)                             # second block back
    return nums
```
**Time / Space:** **O(n) / O(1)**. Alternatives: slicing `nums[:] = nums[-k:] + nums[:-k]`
(O(n) space, one line — say it, then give the O(1) one) or cyclic replacements with
`gcd(n,k)` cycles (correct but fiddly).

**Mental trigger:** *"in place, matrix"* → find an encoding (extra bit, sign, margins)
or a geometric identity (transpose, reverse, staircase). Always derive `(r,c) → (?, ?)`
on paper first.

---

## 8. Pattern 6 — Two pointers on arrays

Short section — window/two-pointer theory lives in `sliding_window.md`. These are the
*array* classics where two indices move toward or with each other after a sort.

### 3Sum (LC 15) — sort, then fix one and two-point the rest
```python
def three_sum(nums):
    nums.sort()
    n, out = len(nums), []
    for i in range(n - 2):
        if nums[i] > 0: break                      # sorted ⇒ no way to reach 0
        if i and nums[i] == nums[i - 1]: continue  # skip duplicate anchors
        lo, hi = i + 1, n - 1
        while lo < hi:
            s = nums[i] + nums[lo] + nums[hi]
            if s < 0: lo += 1
            elif s > 0: hi -= 1
            else:
                out.append([nums[i], nums[lo], nums[hi]])
                lo += 1; hi -= 1
                while lo < hi and nums[lo] == nums[lo - 1]: lo += 1   # skip dup pairs
    return out
```
**Time / Space:** **O(n²) / O(1)** extra (O(n) if sorting counts). Sorting is what makes
duplicate-skipping possible — with a hash set you'd need to dedupe triples afterwards.
4Sum is the same with one more loop, O(n³); beyond that use meet-in-the-middle (§3).

### Merge Sorted Array — fill from the back (LC 88)
```python
def merge(nums1, m, nums2, n):
    i, j, k = m - 1, n - 1, m + n - 1
    while j >= 0:                                  # nums2 must be exhausted
        if i >= 0 and nums1[i] > nums2[j]:
            nums1[k] = nums1[i]; i -= 1
        else:
            nums1[k] = nums2[j]; j -= 1
        k -= 1
    return nums1
```
**Time / Space:** O(m+n) / **O(1)**. Writing back-to-front is the whole idea: the tail of
`nums1` is free space, so no element is overwritten before it is read. *"Fill from the
end when the destination overlaps the source"* generalises well.

### Remove Element / Remove Duplicates (LC 27 / 26 / 80) — slow-fast writer
```python
def remove_duplicates(nums):                       # sorted, keep 1 of each
    write = 0
    for x in nums:
        if write == 0 or nums[write - 1] != x:
            nums[write] = x; write += 1            # `write` = size of the kept prefix
    return write

def remove_duplicates_k(nums, k=2):                # LC 80 — keep at most k of each
    write = 0
    for x in nums:
        if write < k or nums[write - k] != x:      # compare k back, not 1 back
            nums[write] = x; write += 1
    return write
```
**Time / Space:** O(n) / O(1). The *read pointer / write pointer* pair is the generic
in-place filter; `remove_element` is the same with `if x != val`.

### Squares of a Sorted Array (LC 977)
```python
def sorted_squares(nums):
    n = len(nums)
    out = [0] * n
    i, j = 0, n - 1
    for k in range(n - 1, -1, -1):                 # fill LARGEST first
        if abs(nums[i]) > abs(nums[j]):
            out[k] = nums[i] * nums[i]; i += 1
        else:
            out[k] = nums[j] * nums[j]; j -= 1
    return out
```
**Time / Space:** **O(n) / O(n)** (output). Squares are largest at the two *ends*, so the
extremes shrink inward — filling backwards avoids the O(n log n) sort.

### Trapping Rain Water (LC 42) — two pointers, O(1) space
```python
def trap(height):
    if not height: return 0
    l, r = 0, len(height) - 1
    left_max = right_max = total = 0
    while l < r:
        if height[l] < height[r]:                  # the SMALLER side is the bottleneck
            left_max = max(left_max, height[l])
            total += left_max - height[l]          # safe: a taller bar exists on the right
            l += 1
        else:
            right_max = max(right_max, height[r])
            total += right_max - height[r]
            r -= 1
    return total
```
**Time / Space:** O(n) / O(1). Prefix-max/suffix-max arrays are the O(n) space version;
the monotonic-stack solution is in `monotonic_stack.md`.

### Next Permutation (LC 31) — scan, swap, reverse
```python
def next_permutation(nums):
    i = len(nums) - 2
    while i >= 0 and nums[i] >= nums[i + 1]: i -= 1   # find the rightmost ascent
    if i >= 0:
        j = len(nums) - 1
        while nums[j] <= nums[i]: j -= 1              # smallest value > nums[i], from right
        nums[i], nums[j] = nums[j], nums[i]
    nums[i + 1:] = reversed(nums[i + 1:])             # suffix was descending ⇒ reverse = min
    return nums
```
**Time / Space:** O(n) / O(1). The suffix after the pivot is non-increasing by
construction, so reversing it yields the smallest arrangement — that's why no sort.

**Mental trigger:** *"sorted (or sortable) and I need pairs/triples, or an in-place
filter/merge"* → two pointers. If the destination overlaps, **go backwards**.

---

## 9. Pattern 7 — Kadane & friends

Full derivations, the generic engine and the recognition checklist are in
**`subarrays.md` §6**. Compressed reference here.

### Max Subarray (LC 53)
```python
def max_subarray(nums):
    best = cur = nums[0]
    for x in nums[1:]:
        cur = max(x, cur + x)        # extend the run, or restart at x
        best = max(best, cur)
    return best
```
**Time / Space:** O(n) / O(1). `cur` = best sum of a subarray *ending exactly here*.

### Max Product Subarray (LC 152) — carry min **and** max
```python
def max_product(nums):
    best = cur_max = cur_min = nums[0]
    for x in nums[1:]:
        if x < 0:
            cur_max, cur_min = cur_min, cur_max   # a negative flips the roles
        cur_max = max(x, cur_max * x)
        cur_min = min(x, cur_min * x)
        best = max(best, cur_max)
    return best
```
**Time / Space:** O(n) / O(1). **Why min?** Sum is monotone under extension, product is
not: multiplying by a negative maps *most negative → most positive*. So the "worst"
running product is a candidate for tomorrow's best, and the DP state must be the pair
`(max, min)`. Same reasoning appears whenever the combine step is not monotone.

### Maximum Sum Circular Subarray (LC 918)
A circular subarray either doesn't wrap (plain Kadane) or wraps, in which case it is
`total − (some middle chunk)`; maximise it by **minimising the middle** — Kadane with
`min`.
```python
def max_subarray_circular(nums):
    total = 0
    cur_max = best_max = nums[0]
    cur_min = best_min = nums[0]
    for i, x in enumerate(nums):
        total += x
        if i:
            cur_max = max(x, cur_max + x); best_max = max(best_max, cur_max)
            cur_min = min(x, cur_min + x); best_min = min(best_min, cur_min)
    if best_max < 0:                   # ALL negative: total-best_min == 0 = empty array
        return best_max                # ...which is illegal, so return the max element
    return max(best_max, total - best_min)
```
**Time / Space:** O(n) / O(1). The all-negative guard is the only trap: without it
`[-3,-2,-3]` returns 0. (`subarrays.md` §6.4 explains why `best_max < 0` and
`best_min == total` are *different* guards that both work.)

### Max Sum of Two Non-Overlapping Subarrays (LC 1031)
Fix which block comes second; keep the best first-block seen so far — the same
"prefix-max carried in one variable" move as §4.
```python
def max_sum_two_no_overlap(nums, first_len, second_len):
    n = len(nums)
    pre = [0] * (n + 1)
    for i, x in enumerate(nums): pre[i + 1] = pre[i] + x

    def best_with_order(a, b):            # an a-window entirely left of a b-window
        best = best_a = 0
        for i in range(a + b, n + 1):
            best_a = max(best_a, pre[i - b] - pre[i - b - a])   # best a-window on the left
            best = max(best, best_a + pre[i] - pre[i - b])      # + the b-window ending at i
        return best
    return max(best_with_order(first_len, second_len),
               best_with_order(second_len, first_len))          # either order is allowed
```
**Time / Space:** O(n) / O(n). Trying both orders is essential — the problem does not
say which block is on the left.

**Mental trigger:** *"maximum/minimum over contiguous subarrays"* → Kadane. If the
combine rule is not monotone (products, ratios), **carry both extremes**.

---

## 10. Pattern 8 — Randomised & sampling

Rare in most companies, **common at Google** because they expose whether you can reason
about probability, not just loops.

### Fisher–Yates shuffle — with the uniformity proof
```python
import random

def shuffle(a):
    for i in range(len(a) - 1, 0, -1):
        j = random.randint(0, i)          # INCLUSIVE of i — the element may stay put
        a[i], a[j] = a[j], a[i]
    return a
```
**Time / Space:** O(n) / O(1).

**Proof of uniformity.** Claim: each of the `n!` permutations has probability `1/n!`.
By induction from the back: slot `n-1` receives a uniformly random element (`1/n` each,
by construction). Conditioned on that, the remaining `n-1` elements occupy `a[0..n-2]`
and the algorithm recurses, producing each of their `(n-1)!` orders with probability
`1/(n-1)!`. So any full permutation has probability `(1/n)·(1/(n-1)!) = 1/n!`. ∎

**The classic bug** is `j = random.randint(0, n-1)` (full range every step). That
produces `n^n` equally likely execution paths, which cannot divide evenly into `n!`
outcomes — so the distribution is provably *not* uniform. Being able to say
"`n^n` is not divisible by `n!` for n ≥ 3" is the crisp answer.

### Reservoir sampling — streams of unknown length
**k = 1:** keep the current pick, replace it with probability `1/i` at the `i`-th item.
```python
def reservoir_one(stream):
    chosen = None
    for i, x in enumerate(stream, 1):
        if random.randint(1, i) == 1:     # replace with probability 1/i
            chosen = x
    return chosen

def reservoir_k(stream, k):
    res = []
    for i, x in enumerate(stream):
        if i < k:
            res.append(x)                 # fill the reservoir first
        else:
            j = random.randint(0, i)      # 0..i inclusive
            if j < k:                     # with probability k/(i+1), evict a random slot
                res[j] = x
    return res
```
**Time / Space:** O(n) / **O(k)** — one pass, never stores the stream.

**Proof (k = 1).** After `n` items, item `i` survives iff it was chosen at step `i`
(prob `1/i`) and never replaced at steps `i+1..n` (prob `Π_{t=i+1}^{n} (1 - 1/t)`).
That product telescopes: `(i/(i+1))·((i+1)/(i+2))···((n-1)/n) = i/n`. So the total is
`(1/i)·(i/n) = 1/n`, independent of `i`. ∎

**General k.** Item `i > k` enters with probability `k/i`. For any item already in the
reservoir, the probability it survives step `t` is `1 - (k/t)·(1/k) = 1 - 1/t`, and the
same telescoping gives `k/n` for every item. ∎

### Random Pick with Weight (LC 528) — prefix sums + binary search
```python
class WeightedRandom:
    def __init__(self, w):
        self.pre = []
        total = 0
        for x in w:
            total += x
            self.pre.append(total)        # pre[i] = cumulative weight through i
        self.total = total
    def pickIndex(self):
        target = random.random() * self.total       # uniform in [0, total)
        return bisect_right(self.pre, target)       # first i with pre[i] > target
```
**Time / Space:** build O(n), pick **O(log n)** / O(n). Index `i` owns the interval
`[pre[i-1], pre[i])` of length `w[i]`, so it is picked with probability `w[i]/total`.
(Alias method gives O(1) picks after O(n) setup — worth naming as the follow-up.)

### Random Pick Index (LC 398) — reservoir over matches
```python
def pick(nums, target):
    count, chosen = 0, -1
    for i, x in enumerate(nums):
        if x == target:
            count += 1
            if random.randint(1, count) == 1:      # k=1 reservoir over the matches
                chosen = i
    return chosen
```
**Time / Space:** O(n) / **O(1)** — beats the O(n)-space "map value → list of indices"
version when memory is the constraint (which is exactly the stated follow-up).

### Insert Delete GetRandom O(1) (LC 380) — array + index map
`getRandom` needs a **dense array** (uniform pick = one `randint`); `remove` needs O(1),
which an array can't do in the middle — unless order doesn't matter and you swap with
the last element. The dict tracks where everything lives.
```python
class RandomizedSet:
    def __init__(self):
        self.vals = []           # dense array of values  -> O(1) uniform sampling
        self.pos = {}            # value -> its index in self.vals

    def insert(self, val):
        if val in self.pos: return False
        self.pos[val] = len(self.vals)
        self.vals.append(val)
        return True

    def remove(self, val):
        if val not in self.pos: return False
        i = self.pos.pop(val)
        last = self.vals.pop()               # take the tail out first
        if i < len(self.vals):               # ...unless val WAS the tail
            self.vals[i] = last              # move the tail into the hole
            self.pos[last] = i               # and fix its recorded index
        return True

    def getRandom(self):
        return random.choice(self.vals)
```
**Time / Space:** O(1) average all three / O(n). The `if i < len(self.vals)` guard is
where most candidates break — removing the last element must not re-add it.

### With duplicates (LC 381)
Same skeleton, but `pos` maps a value to a **set of indices**.
```python
class RandomizedCollection:
    def __init__(self):
        self.vals = []
        self.pos = defaultdict(set)          # value -> {indices where it sits}

    def insert(self, val):
        self.pos[val].add(len(self.vals))
        self.vals.append(val)
        return len(self.pos[val]) == 1       # True iff it was NOT already present

    def remove(self, val):
        if not self.pos[val]: return False
        i = self.pos[val].pop()              # any one occurrence
        last = self.vals.pop()
        if i < len(self.vals):
            self.vals[i] = last
            self.pos[last].discard(len(self.vals))   # last's OLD index is gone
            self.pos[last].add(i)                    # it now lives at i
        return True

    def getRandom(self):
        return random.choice(self.vals)
```
**Time / Space:** O(1) average / O(n). `getRandom` is automatically weighted by
multiplicity, which is what the problem asks for.

**Mental trigger:** *"O(1) random + O(1) insert/delete"* → dense array + index map,
swap-with-last. *"unknown-length stream, uniform sample"* → reservoir.

---

## 11. Pattern 9 — Bit manipulation on arrays

XOR is the interviewer's favourite because it is **its own inverse** (`x^x=0`,
`x^0=x`) and **commutative/associative** — so order doesn't matter and pairs vanish.

```python
def single_number(nums):                    # LC 136 — everyone twice except one
    ans = 0
    for x in nums: ans ^= x                 # duplicates cancel, the loner survives
    return ans

def single_number_ii(nums):                 # LC 137 — everyone THREE times except one
    ones = twos = 0
    for x in nums:
        ones = (ones ^ x) & ~twos           # a 2-bit counter per bit position,
        twos = (twos ^ x) & ~ones           # resetting whenever a bit hits 3
    return ones

def single_number_iii(nums):                # LC 260 — exactly TWO loners
    xor_all = 0
    for x in nums: xor_all ^= x             # = a ^ b (all pairs cancelled)
    low_bit = xor_all & -xor_all            # lowest bit where a and b DIFFER
    a = b = 0
    for x in nums:
        if x & low_bit: a ^= x              # partition into two groups; each has one loner
        else: b ^= x
    return [a, b]

def missing_number(nums):                   # LC 268 — XOR indices against values
    ans = len(nums)
    for i, x in enumerate(nums): ans ^= i ^ x
    return ans

def counting_bits(n):                       # LC 338 — popcount for 0..n in O(n)
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        dp[i] = dp[i >> 1] + (i & 1)        # i's bits = (i//2)'s bits + the last bit
    return dp

def subsets(nums):                          # LC 78 — enumerate 2^n masks
    n = len(nums)
    return [[nums[i] for i in range(n) if mask >> i & 1] for mask in range(1 << n)]
```
**Time / Space:** all O(n) / O(1) except `subsets` at O(n·2ⁿ) / O(n·2ⁿ) and
`counting_bits` at O(n) / O(n).

Two notes to volunteer:
- `single_number_ii` uses `~` on Python's **arbitrary-precision** ints, which behave as
  infinite two's complement. It is correct for non-negative inputs; if negatives are
  possible, mask with `& 0xFFFFFFFF` and convert back
  (`x - 2**32 if x >= 2**31 else x`). The portable alternative is counting each of the
  32 bit positions mod 3 — O(32n) but obviously correct.
- `x & -x` isolates the lowest set bit (two's complement identity); `x & (x-1)` clears
  it (Brian Kernighan popcount).

### Maximum XOR of Two Numbers (LC 421)
Greedy from the top bit: assume the next answer bit can be 1, and check whether two
prefixes in the set can produce it (`a ^ b = c ⟺ a ^ c = b`).
```python
def find_maximum_xor(nums):
    ans = 0
    for bit in range(31, -1, -1):
        ans <<= 1
        prefixes = {x >> bit for x in nums}       # top bits seen so far
        candidate = ans | 1                       # can we achieve a 1 in this position?
        if any(candidate ^ p in prefixes for p in prefixes):
            ans = candidate
    return ans
```
**Time / Space:** O(32n) = O(n) / O(n). The canonical alternative is a **binary trie**
(insert each number's 32 bits, then greedily walk the opposite branch) — same
complexity, better for the "max XOR with a query value / in a range" follow-ups. See
`tries.md`.

**Mental trigger:** *"every element appears k times except one"* → XOR / bit counting.
*"maximise a XOR"* → greedy from the top bit with a trie or prefix set.
*"enumerate all subsets, n ≤ 20"* → bitmask.

---

## 12. Design problems built on arrays

Design rounds check whether you can *compose* an array with a hash map. The recurring
idea: **arrays give O(1) index + O(1) random access; a hash map gives O(1) lookup by
key; keep them in sync.**

### LRU Cache (LC 146) — dict + doubly linked list
Hash map for O(1) find, doubly linked list for O(1) reordering. Full node mechanics and
the `OrderedDict` shortcut are in `linked_list.md`; here is the array-free core.
```python
class Node:
    __slots__ = ('key', 'val', 'prev', 'next')
    def __init__(self, key=0, val=0):
        self.key, self.val, self.prev, self.next = key, val, None, None

class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.map = {}                                   # key -> Node
        self.head, self.tail = Node(), Node()           # sentinels: head=MRU, tail=LRU
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, node):
        node.prev.next, node.next.prev = node.next, node.prev

    def _push_front(self, node):
        node.next, node.prev = self.head.next, self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        if key not in self.map: return -1
        node = self.map[key]
        self._unlink(node); self._push_front(node)      # touch => becomes MRU
        return node.val

    def put(self, key, value):
        if key in self.map:
            node = self.map[key]
            node.val = value
            self._unlink(node); self._push_front(node)
            return
        if len(self.map) == self.cap:
            lru = self.tail.prev                        # evict from the tail
            self._unlink(lru); del self.map[lru.key]
        node = Node(key, value)
        self.map[key] = node
        self._push_front(node)
```
**Time / Space:** O(1) `get`/`put` / O(capacity). Sentinel head/tail nodes remove every
null check — always use them. LFU (LC 460) adds a second map `freq -> DLL`.

### Design HashMap from scratch (LC 706) — buckets + chaining
```python
class MyHashMap:
    def __init__(self, buckets=1009):                   # prime size spreads keys better
        self.n = buckets
        self.table = [[] for _ in range(buckets)]       # each bucket = list of (k, v)

    def _bucket(self, key):
        return self.table[key % self.n]                 # the hash function

    def put(self, key, value):
        b = self._bucket(key)
        for i, (k, _) in enumerate(b):
            if k == key:
                b[i] = (key, value); return             # update in place
        b.append((key, value))

    def get(self, key):
        for k, v in self._bucket(key):
            if k == key: return v
        return -1

    def remove(self, key):
        b = self._bucket(key)
        for i, (k, _) in enumerate(b):
            if k == key:
                b.pop(i); return
```
**Time / Space:** O(1 + load factor) average, **O(n) worst** / O(n + buckets). Talk
about: prime bucket count, load factor and **resizing** (double and rehash when
`size/buckets > 0.75`, amortised O(1)), chaining vs open addressing, and converting a
long chain to a tree for worst-case O(log n) (Java 8). `MyHashSet` is the same with no
value.

### Snapshot Array (LC 1146) — per-index version history
Naive "copy the array on every snap" is O(n) per snap. Instead each index keeps its own
sorted list of `(snap_id, value)` and `get` binary-searches it.
```python
from bisect import bisect_right

class SnapshotArray:
    def __init__(self, length):
        self.snap_id = 0
        self.history = [[(-1, 0)] for _ in range(length)]   # every index starts at 0

    def set(self, index, val):
        h = self.history[index]
        if h[-1][0] == self.snap_id:
            h[-1] = (self.snap_id, val)                     # overwrite within one snap
        else:
            h.append((self.snap_id, val))

    def snap(self):
        self.snap_id += 1
        return self.snap_id - 1

    def get(self, index, snap_id):
        h = self.history[index]
        i = bisect_right(h, (snap_id, float('inf'))) - 1    # last record at or before snap_id
        return h[i][1]
```
**Time / Space:** `set` O(1), `snap` **O(1)**, `get` O(log writes) / O(total writes).
Key insight: **snapshots should cost nothing; pay at read time.** That is copy-on-write
/ MVCC, the same design as a database's snapshot isolation — say so.

### Time Based Key-Value Store (LC 981)
```python
class TimeMap:
    def __init__(self):
        self.store = defaultdict(list)                # key -> [(timestamp, value)] ascending

    def set(self, key, value, timestamp):
        self.store[key].append((timestamp, value))    # timestamps arrive increasing

    def get(self, key, timestamp):
        arr = self.store.get(key, [])
        i = bisect_right(arr, (timestamp, chr(0x10FFFF))) - 1   # largest ts <= timestamp
        return arr[i][1] if i >= 0 else ""
```
**Time / Space:** `set` O(1), `get` **O(log n)** / O(n). If timestamps could arrive out
of order you'd need `insort` (O(n)) or a balanced tree. Ask.

### Range Module (LC 715) — a sorted flat list of endpoints
Keep disjoint ranges flattened as `[s1,e1,s2,e2,...]`. Then **even index = a start,
odd index = an end**, and parity answers everything.
```python
from bisect import bisect_left, bisect_right

class RangeModule:
    def __init__(self):
        self.ranges = []                        # sorted, disjoint, flattened endpoints

    def addRange(self, left, right):
        i = bisect_left(self.ranges, left)
        j = bisect_right(self.ranges, right)
        sub = []
        if i % 2 == 0: sub.append(left)         # left landed in a gap -> it starts a range
        if j % 2 == 0: sub.append(right)        # right landed in a gap -> it ends one
        self.ranges[i:j] = sub                  # everything between is absorbed

    def queryRange(self, left, right):
        i = bisect_right(self.ranges, left)
        j = bisect_left(self.ranges, right)
        return i == j and i % 2 == 1            # both inside the SAME open range

    def removeRange(self, left, right):
        i = bisect_left(self.ranges, left)
        j = bisect_right(self.ranges, right)
        sub = []
        if i % 2 == 1: sub.append(left)         # left was inside a range -> close it here
        if j % 2 == 1: sub.append(right)        # right was inside a range -> reopen there
        self.ranges[i:j] = sub
```
**Time / Space:** O(log n) search + O(n) splice per update, O(log n) query / O(n). The
"parity of the insertion index tells you inside-vs-gap" trick is worth memorising; it
also solves My Calendar (`intervals.md`).

**Mental trigger:** design problem with an O(1) or O(log n) requirement → pick the
array for *ordering/sampling*, the hash map for *lookup*, and write down the invariant
that keeps them consistent before coding.

---

## 13. Common pitfalls

**1. Mutating a list while iterating it.** Removal shifts everything left and the
iterator skips elements.
```python
a = [1, 2, 2, 3]
for x in a:
    if x == 2: a.remove(x)     # BUG -> [1, 2, 3]; the second 2 is skipped
a = [x for x in [1, 2, 2, 3] if x != 2]   # FIX: build a new list (or iterate a copy)
```

**2. `[[0]*n]*m` aliasing.** The outer `*` copies the **reference**, so all rows are the
same list.
```python
grid = [[0] * 3] * 2
grid[0][0] = 9
print(grid)                       # [[9, 0, 0], [9, 0, 0]]   <-- both rows changed!
grid = [[0] * 3 for _ in range(2)]           # FIX: a fresh row per iteration
```
The same bug bites `dp = [[float('inf')] * n] * n` and `defaultdict(lambda: [0]*n)` is
fine only because the lambda runs per key.

**3. Shallow vs deep copy.** `b = a[:]`, `list(a)` and `copy.copy(a)` all copy only the
*top* level; nested lists stay shared. Use `copy.deepcopy` (slow) or rebuild explicitly.

**4. Off-by-one in ranges.** `range(n)` excludes `n`; `nums[i:j]` excludes `j`; a
"window of size k ending at i" starts at `i-k+1`. Write the concrete indices for n = 1
and n = 2 before trusting a loop bound.

**5. Integer division and negatives.** Python's `//` floors toward **−∞**:
`-7 // 2 == -4` (C/Java give −3), and `-7 % 3 == 2` (C gives −1). Mid-point
`(lo + hi) // 2` is fine, but if you port a formula from C++ check the sign. For
truncation use `int(a / b)` or `math.trunc`.

**6. Sorting when the original order is the answer.** If you must return **indices**
(Two Sum) or preserve input order, sorting destroys it. Sort `enumerate(nums)` pairs or
sort an index array instead.

**7. `x in list` is O(n).** Inside a loop that's O(n²) — the single most common
accidental blowup. Convert to a `set` once. (`x in dict` and `x in set` are O(1).)

**8. Empty / single-element inputs.** `nums[0]`, `max(nums)`, `nums[-1]` and
`while lo < hi` all behave differently at n = 0 and n = 1. Kadane initialised with
`float('-inf')` vs `nums[0]` is a classic divergence. Always ask "can the array be
empty?" and state the answer you'd return.

**9. Negative indexing silently succeeds.** `nums[i-1]` with `i == 0` reads the **last**
element instead of raising — a wrong answer, not a crash. Guard `if i > 0` explicitly.

**10. `sort()` returns `None`.** `a = a.sort()` destroys your list. Use `a.sort()` for
in-place or `b = sorted(a)` for a copy. Same trap: `reverse()`, `append()`, `extend()`.

**11. The chained-swap trap.** `nums[i], nums[nums[i]] = nums[nums[i]], nums[i]`
evaluates targets left-to-right *after* the RHS, so the second index uses the **new**
`nums[i]`. Cache the index first (§5, First Missing Positive).

**12. Floating-point equality.** `0.1 + 0.2 != 0.3`. Compare with a tolerance
(`abs(a-b) < 1e-9`), or better, keep everything in integers (multiply out, or use
`Fraction`) — average/median problems love this trap.

**13. Overflow — not in Python, but say it.** Python ints are unbounded, so
`sum(1..n)` never overflows here. In C++/Java it does; mention the XOR alternative or
`long long`. Interviewers notice when you flag it.

---

## 14. Cheat sheets

### Complexity reference
| Operation | list | set / dict | sorted list (`bisect`) | heap |
|---|---|---|---|---|
| index / random access | **O(1)** | – | O(1) | – |
| search by value | O(n) | **O(1)** avg | O(log n) | O(n) |
| insert at end | O(1) amort. | **O(1)** avg | O(n) (shift) | O(log n) |
| insert in middle | O(n) | – | O(n) | – |
| delete by value | O(n) | **O(1)** avg | O(n) | O(n) |
| min / max | O(n) | O(n) | **O(1)** at the ends | **O(1)** root |
| ordered iteration | O(n log n) | O(n log n) | **O(n)** | O(n log n) |

Algorithm costs worth quoting: sort **O(n log n)**; counting/bucket sort **O(n + k)**;
prefix build **O(n)** then O(1) queries; Fenwick/segment tree **O(log n)** both ways;
quickselect **O(n)** average / O(n²) worst; two pointers **O(n)**; enumerate all
subarrays **O(n²)**; all subsets **O(2ⁿ)**.

### Decision cheat-sheet — phrasing → technique
| The prompt says… | Reach for | File |
|---|---|---|
| "have I seen it / find the pair summing to X" | hash map of complements | §3 |
| "contiguous subarray, sum == k, negatives allowed" | prefix sum + hash map | `subarrays.md` |
| "longest/shortest window, all positive" | sliding window | `sliding_window.md` |
| "max/min sum of a contiguous subarray" | Kadane | §9 |
| "many range sum queries, no updates" | prefix sums | §4 |
| "many range updates, read once at the end" | difference array | §4 |
| "range updates **and** range queries" | Fenwick / segment tree | — |
| "values are 1..n" / "find the missing/duplicate" | cyclic sort, negative marking | §5 |
| "O(1) extra space" on an array of bounded values | encode in sign / high bits / margins | §5, §7 |
| "no extra space, don't modify, find the duplicate" | Floyd on the index graph | §5 |
| "k most frequent / top k" | bucket by count (O(n)) or heap (O(n log k)) | §6, `heaps.md` |
| "count pairs (i<j) with an order relation" | merge-sort counting or Fenwick | §6 |
| "sorted array, find pairs/triples" | two pointers after sort | §8 |
| "search a sorted / rotated array" | binary search | `binary_search.md` |
| "next greater / span / histogram" | monotonic stack | `monotonic_stack.md` |
| "overlapping ranges / meetings" | sort + sweep | `intervals.md` |
| "uniform random from a stream" | reservoir sampling | §10 |
| "O(1) insert, delete and random" | array + index map | §10, §12 |
| "everything appears k times except one" | XOR / bit counting | §11 |
| "n ≤ 20, enumerate every subset" | bitmask | §11 |
| "minimise the maximum / maximise the minimum" | binary search on the answer | `binary_search.md` |

---

## 15. Google-favourite problem list

### Basic — build the reflexes
1. **Two Sum** (LC 1) — hash the complement; the ur-problem.
2. **Best Time to Buy and Sell Stock** (LC 121) — track min-so-far, max the gap; Kadane on diffs.
3. **Contains Duplicate** (LC 217) — `len(set) != len(nums)`.
4. **Contains Duplicate II** (LC 219) — last-seen index map, gap ≤ k.
5. **Remove Duplicates from Sorted Array** (LC 26) — read/write pointers.
6. **Merge Sorted Array** (LC 88) — fill from the back, O(1) space.
7. **Squares of a Sorted Array** (LC 977) — two pointers, fill largest first.
8. **Move Zeroes** (LC 283) — write pointer; the "stable partition" primitive.
9. **Rotate Array** (LC 189) — three reversals; derive it.
10. **Plus One** (LC 66) — carry propagation; the all-9s case.
11. **Missing Number** (LC 268) — Gauss, XOR, or cyclic sort. Know all three.
12. **Single Number** (LC 136) — XOR everything.
13. **Majority Element** (LC 169) — **Boyer–Moore**: keep a candidate and a count; a
    non-match cancels one vote. Since the majority appears > n/2 times, it survives
    every possible pairing-off of one majority with one non-majority vote.
14. **Sort Colors** (LC 75) — Dutch flag, one pass.
15. **Product of Array Except Self** (LC 238) — prefix × suffix, no division.

### Core — the interview bread and butter
16. **Group Anagrams** (LC 49) — canonical count-vector key.
17. **Top K Frequent Elements** (LC 347) — bucket by frequency, O(n).
18. **Valid Sudoku** (LC 36) — tagged keys in one set.
19. **Longest Consecutive Sequence** (LC 128) — only expand from sequence heads.
20. **Subarray Sum Equals K** (LC 560) — prefix + map (`subarrays.md`).
21. **Maximum Subarray** (LC 53) — Kadane.
22. **Maximum Product Subarray** (LC 152) — carry min and max.
23. **Insert Delete GetRandom O(1)** (LC 380) — array + index map.
24. **Set Matrix Zeroes** (LC 73) — first row/col as markers.
25. **Spiral Matrix** (LC 54) / **Spiral Matrix II** (LC 59) — four shrinking bounds.
26. **Rotate Image** (LC 48) — transpose + reverse rows.
27. **Search a 2D Matrix** (LC 74) — flatten and binary search.
28. **Search a 2D Matrix II** (LC 240) — top-right staircase, O(r+c).
29. **3Sum** (LC 15) — sort, fix one, two-point; skip duplicates.
30. **Next Permutation** (LC 31) — rightmost ascent, swap, reverse suffix.
31. **Find All Numbers Disappeared** (LC 448) — negative marking.
32. **Find All Duplicates in an Array** (LC 442) — same marking, opposite report.
33. **Majority Element II** (LC 229) — Boyer–Moore with **two** counters (at most two
    values can exceed n/3); verify both candidates in a second pass.
34. **Range Sum Query 2D — Immutable** (LC 304) — 2-D prefix, inclusion–exclusion.
35. **Corporate Flight Bookings** (LC 1109) / **Car Pooling** (LC 1094) / **Range
    Addition** (LC 370) — the difference-array trio.
36. **Random Pick with Weight** (LC 528) — prefix + `bisect`.
37. **Time Based Key-Value Store** (LC 981) — per-key sorted list + binary search.
38. **Snapshot Array** (LC 1146) — copy-on-write version history.
39. **Design HashMap** (LC 706) — buckets, chaining, load factor, resize.
40. **LRU Cache** (LC 146) — dict + doubly linked list (`linked_list.md`).
41. **Merge Intervals** (LC 56) — sort by start, sweep (`intervals.md`).
42. **Meeting Rooms II** (LC 253) — max concurrency; heap or sweep (`intervals.md`).
43. **Task Scheduler** (LC 621) — idle slots from the max frequency: `(f-1)*(k+1)+ties`.
44. **Counting Bits** (LC 338) — `dp[i] = dp[i>>1] + (i&1)`.
45. **Subsets** (LC 78) — bitmask or backtracking.
46. **Game of Life** (LC 289) — 2-bit in-place encoding; infinite-board follow-up.
47. **Diagonal Traverse** (LC 498) — group by `r + c`, alternate direction.
48. **Max Chunks To Make Sorted** (LC 769) — a chunk ends where `max(prefix) == index`.
49. **Shortest Unsorted Continuous Subarray** (LC 581) — one pass with running max/min,
    or compare to the sorted copy; O(n)/O(1).
50. **Wiggle Sort** (LC 280) — one pass, swap whenever the local order is wrong.

### Hard — the Google differentiators
51. **First Missing Positive** (LC 41) — index-as-hash, O(n)/O(1). §5.
52. **Find the Duplicate Number** (LC 287) — Floyd on the index graph. §5.
53. **Trapping Rain Water** (LC 42) — two pointers, or monotonic stack.
54. **Median of Two Sorted Arrays** (LC 4) — partition search, O(log min(m,n));
    see `binary_search.md`.
55. **Sliding Window Maximum** (LC 239) — monotonic deque (`sliding_window.md`).
56. **Largest Rectangle in Histogram** (LC 84) — monotonic stack (`monotonic_stack.md`).
57. **Maximal Rectangle** (LC 85) — build a histogram per row, then LC 84.
58. **Sum of Subarray Minimums** (LC 907) — contribution counting with a monotonic
    stack: each element is the min of `left_span * right_span` subarrays.
59. **Count of Smaller Numbers After Self** (LC 315) — merge-sort counting / Fenwick.
60. **Reverse Pairs** (LC 493) — merge sort with a separate two-pointer count.
61. **Count Inversions** (classic) — the template both of the above specialise.
62. **Maximum Sum Rectangle No Larger Than K** (LC 363) — column bands + sorted prefixes.
63. **Number of Submatrices That Sum to Target** (LC 1074) — column bands + the LC 560
    prefix-map, O(c²·r).
64. **Split Array Largest Sum** (LC 410) — binary search on the answer, greedy feasibility
    check (`binary_search.md`).
65. **Candy** (LC 135) — two sweeps (left→right, right→left), take the max at each index.
66. **Wiggle Sort II** (LC 324) — quickselect the median, then virtual-index three-way
    partition; the O(1)-space version is genuinely hard.
67. **Max Chunks To Make Sorted II** (LC 768) — duplicates allowed: compare running
    prefix-max with suffix-min.
68. **Minimum Number of Moves to Make Array Complementary** (LC 1674) — a difference
    array over the possible target sums; each pair contributes 0/1/2 over ranges.
69. **4Sum II** (LC 454) — meet in the middle with a hash map, O(n²).
70. **Maximum XOR of Two Numbers** (LC 421) — greedy top-down bits + trie (`tries.md`).
71. **Single Number II** (LC 137) / **III** (LC 260) — bit counters / partition by a
    differing bit.
72. **Contains Duplicate III** (LC 220) — bucketing by `t+1`, O(n).
73. **Insert Delete GetRandom — Duplicates allowed** (LC 381) — value → set of indices.
74. **Range Module** (LC 715) — flattened sorted endpoints + index parity.
75. **Shuffle an Array** (LC 384) — Fisher–Yates; be ready to prove uniformity.

---

## 16. Quiz

**Q1.** Longest Consecutive Sequence has a `while` loop nested inside a `for`. Prove it
is O(n), not O(n²).

<details><summary>Answer</summary>
The `if x - 1 in s: continue` guard means the inner walk only ever starts at the **head**
of a run (the unique element whose predecessor is absent). A run of length L is therefore
expanded exactly once, doing L steps. Summing over all runs gives Σ Lᵢ = n total inner
steps. Charge each inner step to the distinct element it visits: no element is visited by
two different expansions, so the total work is O(n). Remove the guard and `[1..n]` degrades
to O(n²).
</details>

**Q2.** Why does Maximum Product Subarray need to track the minimum as well, when
Maximum Subarray does not?

<details><summary>Answer</summary>
Extension by `+x` is monotone in the running value, so only the maximum matters. Multiplying
by a **negative** x is order-*reversing*: the most negative running product becomes the most
positive. So the optimal value at step i is not a function of the running max alone — the
DP state must be the pair (max, min), and they swap roles whenever x < 0. Any non-monotone
combine rule forces the same "carry both extremes" upgrade.
</details>

**Q3.** `nums[i], nums[nums[i] - 1] = nums[nums[i] - 1], nums[i]` — why is this wrong in
Python and right-looking in C++?

<details><summary>Answer</summary>
Python evaluates the whole RHS tuple first, then assigns targets **left to right**. `nums[i]`
is written first, so the second target's index `nums[i] - 1` is computed from the *new*
value — corrupting the swap. Cache `j = nums[i] - 1` before swapping. In C++ `std::swap(a, b)`
takes references bound before either write, so the equivalent line is fine.
</details>

**Q4.** In Find the Duplicate Number, why is index 0 guaranteed not to be inside the cycle?

<details><summary>Answer</summary>
Values are constrained to 1..n, and the edges are `i → nums[i]`. Every edge therefore *lands*
on an index in 1..n, so index 0 has in-degree 0. A node with no incoming edge cannot lie on a
cycle, so starting the walk at 0 guarantees a non-empty tail — exactly the ρ shape Floyd's
algorithm needs, with the cycle entrance being the node with two incoming edges, i.e. the
duplicated value.
</details>

**Q5.** `grid = [[0]*3]*2; grid[0][0] = 9` — what is `grid` and why?

<details><summary>Answer</summary>
`[[9, 0, 0], [9, 0, 0]]`. The outer `*2` copies the **reference** to the same inner list twice,
so `grid[0] is grid[1]`. Mutating through one name is visible through the other. Use
`[[0]*3 for _ in range(2)]`, which evaluates the row expression fresh each iteration. Note
the *inner* `[0]*3` is safe because ints are immutable.
</details>

**Q6.** You need range sums **and** point updates, interleaved, on 10⁵ elements with 10⁵
queries. Why is a prefix-sum array the wrong choice?

<details><summary>Answer</summary>
A prefix array answers queries in O(1) but every point update invalidates the whole suffix,
costing O(n) to rebuild — worst case 10¹⁰ operations. Use a Fenwick (BIT) or segment tree:
O(log n) for both update and query, ~1.7×10⁶ operations. Prefix arrays are for **static**
data; difference arrays are the dual (O(1) update, O(n) final read).
</details>

**Q7.** Fisher–Yates with `j = random.randint(0, n-1)` (instead of `0..i`) is not uniform.
Give the counting argument.

<details><summary>Answer</summary>
That variant makes n independent choices out of n options, so there are exactly nⁿ equally
likely execution paths mapping onto n! permutations. For n ≥ 3, n! does not divide nⁿ
(e.g. n=3: 27 paths, 6 permutations, 27/6 = 4.5), so the probabilities cannot all be equal —
some permutations are strictly more likely. The correct version draws from `0..i`, giving
n·(n−1)···1 = n! equally likely paths in bijection with the permutations.
</details>

**Q8.** When is a fixed-size array strictly better than a `dict`, and when is a `dict`
strictly better?

<details><summary>Answer</summary>
Array wins when keys are small bounded integers (letters, digits, values in 1..n, grid
coordinates): same O(1) but no hashing, ~5–10× lower constant, perfect cache locality,
O(k) reset, and immune to adversarial collisions. `dict` wins when the key space is huge or
sparse (arbitrary ints, strings, tuples) — an array indexed by value would need O(max value)
memory. Rule: **bounded and dense → array; unbounded or sparse → dict.**
</details>

---

## 17. Mini project — an in-memory column store with prefix-sum analytics

Build the tiny analytics engine that all of §4 is secretly about: store data
**column-wise** (contiguous arrays → cache-friendly scans), precompute prefix sums so
range aggregates are O(1), and use a difference array to apply bulk range updates in
O(1) each. This is exactly how ClickHouse/DuckDB-style engines start.

```python
from bisect import bisect_left, bisect_right


class ColumnStore:
    """Column-oriented table with O(1) range aggregates over a sorted time key.

    Layout: one Python list per column (contiguous, homogeneous, scan-friendly).
    Rows must be appended in non-decreasing `ts` order so `ts` doubles as an index.
    """

    def __init__(self, numeric_cols, tag_cols=()):
        self.ts = []
        self.num = {c: [] for c in numeric_cols}          # column name -> values
        self.tag = {c: [] for c in tag_cols}
        self._prefix = {}                                  # column -> prefix sums
        self._index = {}                                   # tag column -> value -> [rows]
        self._dirty = True

    # ---------- ingest ----------
    def append(self, ts, **values):
        if self.ts and ts < self.ts[-1]:
            raise ValueError("rows must arrive in non-decreasing ts order")
        self.ts.append(ts)
        for c, col in self.num.items(): col.append(values.get(c, 0))
        for c, col in self.tag.items(): col.append(values.get(c))
        self._dirty = True

    def build(self):
        """O(n) per column: prefix sums + inverted index. Amortised over many queries."""
        for c, col in self.num.items():
            pre = [0] * (len(col) + 1)
            for i, v in enumerate(col):
                pre[i + 1] = pre[i] + v
            self._prefix[c] = pre
        for c, col in self.tag.items():
            idx = {}
            for i, v in enumerate(col):
                idx.setdefault(v, []).append(i)            # tag value -> sorted row ids
            self._index[c] = idx
        self._dirty = False

    # ---------- helpers ----------
    def _rows_between(self, t0, t1):
        """Half-open [t0, t1) as a row-index range — binary search on the sorted ts."""
        return bisect_left(self.ts, t0), bisect_left(self.ts, t1)

    def _ensure(self):
        if self._dirty: self.build()

    # ---------- O(1) aggregates ----------
    def sum(self, col, t0, t1):
        self._ensure()
        lo, hi = self._rows_between(t0, t1)
        pre = self._prefix[col]
        return pre[hi] - pre[lo]                           # the whole point of §4

    def count(self, t0, t1):
        lo, hi = self._rows_between(t0, t1)
        return hi - lo

    def avg(self, col, t0, t1):
        n = self.count(t0, t1)
        return self.sum(col, t0, t1) / n if n else 0.0

    def max(self, col, t0, t1):
        lo, hi = self._rows_between(t0, t1)                # O(range): max is NOT invertible,
        return max(self.num[col][lo:hi], default=None)     # so no prefix trick (sparse table
                                                           # or segment tree if this is hot)

    # ---------- bulk range update: difference array ----------
    def bulk_add(self, col, updates):
        """updates = [(t0, t1, delta)] applied to [t0, t1). O(u + n), not O(u * n)."""
        n = len(self.ts)
        diff = [0] * (n + 1)
        for t0, t1, delta in updates:
            lo, hi = self._rows_between(t0, t1)
            diff[lo] += delta
            diff[hi] -= delta                              # cancel past the range
        run, col_vals = 0, self.num[col]
        for i in range(n):
            run += diff[i]
            col_vals[i] += run
        self._dirty = True                                 # prefix sums are stale

    # ---------- grouped query ----------
    def group_sum(self, tag_col, value_col, t0, t1):
        """SELECT tag, SUM(value) ... GROUP BY tag — intersect the index with the range."""
        self._ensure()
        lo, hi = self._rows_between(t0, t1)
        out = {}
        for tag_value, rows in self._index[tag_col].items():
            i = bisect_left(rows, lo)                      # rows are sorted -> binary search
            j = bisect_right(rows, hi - 1)
            if i < j:
                col = self.num[value_col]
                out[tag_value] = sum(col[r] for r in rows[i:j])
        return out


if __name__ == "__main__":
    store = ColumnStore(numeric_cols=("latency_ms", "bytes"), tag_cols=("service",))
    services = ["auth", "search", "cart"]
    for t in range(1000):
        store.append(t,
                     latency_ms=(t % 37) + 5,
                     bytes=(t * 13) % 1024,
                     service=services[t % 3])
    store.build()

    print("count  [100,200):", store.count(100, 200))
    print("sum    [100,200):", store.sum("latency_ms", 100, 200))
    print("avg    [100,200):", round(store.avg("latency_ms", 100, 200), 3))
    print("max    [100,200):", store.max("latency_ms", 100, 200))
    print("group  [0,300):  ", store.group_sum("service", "bytes", 0, 300))

    store.bulk_add("latency_ms", [(0, 500, 10), (400, 600, 5)])   # two overlapping ranges
    print("after bulk_add   :", store.sum("latency_ms", 100, 200))
```

**Extensions to try**
- Swap `avg` for a **rolling p99** using a two-heap median structure (`heaps.md`) or a
  t-digest; note that quantiles are not prefix-summable.
- Add `min`/`max` in O(1) with a **sparse table** (O(n log n) build) — the idempotent-op
  analogue of prefix sums.
- Support **out-of-order arrivals** by buffering into a small sorted run and merging
  (LSM-tree style), or by replacing prefix sums with a Fenwick tree.
- Add **snapshots** with the copy-on-write trick from §12 so queries can read a
  consistent version while writes continue.
- Store columns as `array.array('q', ...)` or `numpy` arrays and measure the speedup —
  the cache-locality claim from §1, empirically.
