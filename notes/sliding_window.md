# Sliding Window & Two Pointers — Complete Guide

> Google DSA prep notes. Category: Arrays / Strings / Two Pointers.
> Companion to `subarrays.md` (prefix sums, hashmaps, Kadane) and `monotonic_stack.md`
> (next greater/smaller, the deque). This file owns the **window machinery**: five
> window templates, the two-pointer families, and the precondition each one needs.

## 1. The core idea — validity must be MONOTONE

There are `n(n+1)/2` subarrays, so enumerating them is `O(n^2)` before you do any work.
Sliding window collapses that to `O(n)` — but only under a precondition most people
never state out loud:

> **Precondition.** For a fixed right end, if `[l, r]` is invalid then every wider
> `[l', r]` with `l' < l` is *also* invalid. **Growing the window can only make things
> worse; shrinking can only make them better.**

That is what lets `left` **never move backwards**: validity flips exactly once as `l`
sweeps right, so there is a single frontier and a forward-only pointer can track it.
The constraint must therefore be monotone-increasing as you add elements (sum of
positives, distinct-char count, count of 1s, length) or monotone-decreasing (product of
values ≥ 1, remaining budget).

### 1.1 The counter-example you must be able to give

**"Shortest subarray with sum ≥ target" with negatives allowed** (LC 862),
`nums = [2,-1,2], target = 3`. Window `[0,0]` sums to 2 (invalid); growing to `[0,1]`
gives 1 — *worse*; growing to `[0,2]` gives 3 — valid again. Validity is not monotone,
and shrinking from the left can *raise* the sum (`[1,2]=1`, `[2,2]=2`). There is no
frontier, `left` would have to move backwards, and a window silently returns a too-large
answer. Correct tool: **prefix sums + a monotonic deque of prefix indices.**

```python
from collections import deque

def shortest_subarray_at_least_k(nums, k):
    n = len(nums)
    prefix = [0] * (n + 1)
    for i, x in enumerate(nums):
        prefix[i + 1] = prefix[i] + x
    dq = deque()                                  # indices, prefix values increasing
    best = n + 1
    for j in range(n + 1):
        while dq and prefix[j] - prefix[dq[0]] >= k:
            best = min(best, j - dq.popleft())    # this left end can never do better
        while dq and prefix[dq[-1]] >= prefix[j]:
            dq.pop()                              # larger AND older ⇒ dominated
        dq.append(j)
    return best if best <= n else -1
```
**Time O(n) / Space O(n).** Prefix identity: `subarrays.md` §2. Deque logic: `monotonic_stack.md` §1.

**Mental trigger:** *"the array may contain negatives"* → **stop**, not a window problem.

---

## 2. Why it is O(n) — the amortised argument

Say this verbatim in the interview:

> The outer loop advances `right` exactly `n` times. The inner `while` only advances
> `left`, which is non-decreasing and bounded by `n`. So across the **entire run** the
> inner body executes at most `n` times *in total*, not `n` times per outer step.
> Total `O(n) + O(n) = O(n)`.

A `while` nested in a `for` does **not** imply `O(n^2)`. Per-element bookkeeping is
`O(1)` for a counter/sum, `O(log k)` for a heap or sorted structure.

---

## 3. Template A — variable window, "shrink while invalid"

The canonical shape; ~60% of window problems are exactly this.

```python
def template_a(items):
    left = 0
    state = ...                          # counter / sum / mask defining validity
    best = 0
    for right, x in enumerate(items):
        add(state, x)                    # 1. ALWAYS grow right
        while is_invalid(state):         # 2. WHILE, never IF
            remove(state, items[left]); left += 1
        best = max(best, right - left + 1)   # 3. record only once valid again
    return best
```
**Time O(n) / Space O(Σ) or O(1)** — every index enters and leaves once.

Three rules that kill 90% of bugs: grow unconditionally, shrink conditionally; `while`
not `if` (one element can force several evictions); update the answer **after** validity
is restored (Template C is the deliberate exception, §5).

**Mental trigger:** *"longest … such that <constraint>"*.

### 3a. Longest Substring Without Repeating Characters (LC 3)

```python
def length_of_longest_substring(s):
    seen = {}                            # char -> count inside the window
    left = best = 0
    for right, c in enumerate(s):
        seen[c] = seen.get(c, 0) + 1
        while seen[c] > 1:               # the only possible duplicate is c itself
            out = s[left]
            seen[out] -= 1
            if seen[out] == 0: del seen[out]     # never leave zero-count keys
            left += 1
        best = max(best, right - left + 1)
    return best
```
**Time O(n) / Space O(min(n, Σ)).**

### 3b. Longest Repeating Character Replacement (LC 424)

Valid while `window_length - count_of_most_frequent <= k`. The subtlety: `max_freq` is
deliberately **never decreased** on shrink.

```python
def character_replacement(s, k):
    count = {}
    left = max_freq = best = 0           # max_freq is HISTORIC, not recomputed
    for right, c in enumerate(s):
        count[c] = count.get(c, 0) + 1
        max_freq = max(max_freq, count[c])
        while (right - left + 1) - max_freq > k:
            count[s[left]] -= 1; left += 1
        best = max(best, right - left + 1)
    return best
```
Why a stale `max_freq` is safe: the answer only grows when `max_freq` grows. A stale
value can make a window *look* valid, but the length recorded can never exceed the length
genuinely achievable back when `max_freq` really was that large.
**Time O(n) / Space O(Σ).**

### 3c. Fruit Into Baskets (LC 904) — "at most 2 distinct"

```python
def total_fruit(fruits):
    count = {}
    left = best = 0
    for right, f in enumerate(fruits):
        count[f] = count.get(f, 0) + 1
        while len(count) > 2:
            out = fruits[left]
            count[out] -= 1
            if count[out] == 0: del count[out]   # else len(count) stays wrong forever
            left += 1
        best = max(best, right - left + 1)
    return best
```
Swap `2 → k` and this is **Longest Substring with At Most K Distinct** (LC 340); `k = 2`
on strings is LC 159. **Time O(n) / Space O(k).**

### 3d. Minimum Size Subarray Sum (LC 209) — the "shortest" flavour

"Invalid" now means *not yet big enough*, so the answer is recorded **inside** the shrink
loop. This is the bridge to Template C.

```python
def min_sub_array_len(target, nums):
    left = total = 0
    best = float('inf')
    for right, x in enumerate(nums):
        total += x
        while total >= target:                   # while VALID, keep tightening
            best = min(best, right - left + 1)
            total -= nums[left]; left += 1
    return 0 if best == float('inf') else best
```
**Time O(n) / Space O(1).** All-positive only — see §1.1.

### 3e. Max Consecutive Ones III (LC 1004)

```python
def longest_ones(nums, k):
    left = zeros = best = 0
    for right, x in enumerate(nums):
        zeros += (x == 0)
        while zeros > k:
            zeros -= (nums[left] == 0); left += 1
        best = max(best, right - left + 1)
    return best
```
**Time O(n) / Space O(1).** Same skeleton solves **Get Equal Substrings Within Budget**
(LC 1208, cost instead of zeros) and **Longest Nice Subarray** (LC 2401, bitmask state).

---

## 4. Template B — fixed-size window

Width `k` is given, so there is no shrink loop: add one, remove one, size stays pinned.

```python
def template_b(items, k):
    state = ...
    best = None
    for right, x in enumerate(items):
        add(state, x)                            # new element enters
        if right >= k:
            remove(state, items[right - k])      # the leaver is at right - k
        if right >= k - 1:
            best = better(best, read(state))     # window is full from here on
    return best
```
**Time O(n · cost(add/remove)) / Space O(state).** Burn in the two off-by-ones: the
leaver is index `right - k`, and the window is full from `right == k - 1`.

**Mental trigger:** *"of size k"*, *"every window of length k"*.

### 4a. Maximum Average Subarray I (LC 643)

```python
def find_max_average(nums, k):
    total = best = sum(nums[:k])
    for right in range(k, len(nums)):
        total += nums[right] - nums[right - k]   # add new, drop old — O(1)
        best = max(best, total)
    return best / k
```
**Time O(n) / Space O(1).**

### 4b. Find All Anagrams / Permutation in String (LC 438, 567)

**Version 1 — compare dictionaries.** Readable, but an `O(Σ)` comparison every step.

```python
from collections import Counter

def find_anagrams_naive(s, p):
    if len(p) > len(s): return []
    need = Counter(p)
    window = Counter(s[:len(p) - 1])
    res = []
    for right in range(len(p) - 1, len(s)):
        window[s[right]] += 1
        left = right - len(p) + 1
        if window == need: res.append(left)      # O(Σ) on every single index
        window[s[left]] -= 1
        if window[s[left]] == 0: del window[s[left]]   # zero keys break Counter ==
    return res
```
**Time O(n·Σ) / Space O(Σ).**

**Version 2 — the `matches` counter.** Keep one integer: how many distinct characters of
`need` currently have *exactly* the right count. Each add/remove touches one character,
so `matches` moves by at most 1 → genuine `O(n)`.

```python
def find_anagrams(s, p):
    n, m = len(s), len(p)
    if m > n: return []
    need = Counter(p)
    window = Counter()
    matches = 0                                  # chars of need currently exact
    res = []
    for right, c in enumerate(s):
        if c in need:
            window[c] += 1
            if window[c] == need[c]: matches += 1        # just became exact
            elif window[c] == need[c] + 1: matches -= 1  # just overshot
        if right >= m:
            out = s[right - m]
            if out in need:
                if window[out] == need[out]: matches -= 1
                elif window[out] == need[out] + 1: matches += 1
                window[out] -= 1
        if right >= m - 1 and matches == len(need):
            res.append(right - m + 1)
    return res
```
Ignoring characters outside `need` is safe **here only** because the window width is
exactly `m = sum(need.values())`: if every needed char is exact, there is no room left
for an intruder. **Time O(n) / Space O(Σ).**

### 4c. Sliding Window Maximum (LC 239) — monotonic deque

A counter cannot maintain a max: remove the max and you have no idea what the runner-up
was. Keep a **decreasing deque of indices** (`monotonic_stack.md` §1).

```python
def max_sliding_window(nums, k):
    dq = deque()                                 # indices; nums[dq] is decreasing
    res = []
    for i, x in enumerate(nums):
        while dq and dq[0] <= i - k: dq.popleft()     # front left the window
        while dq and nums[dq[-1]] <= x: dq.pop()      # smaller AND older ⇒ useless
        dq.append(i)
        if i >= k - 1: res.append(nums[dq[0]])
    return res
```
**Time O(n) amortised / Space O(k).**

### 4d. Repeated DNA Sequences (LC 187) — rolling hash

Hash the 10-char window instead of slicing it: 4 letters → 2 bits each → a 20-bit int.

```python
def find_repeated_dna_sequences(s):
    if len(s) < 10: return []
    code = {'A': 0, 'C': 1, 'G': 2, 'T': 3}
    mask = (1 << 20) - 1                         # keep only the low 10 characters
    h = 0
    seen, out = set(), set()
    for i, c in enumerate(s):
        h = ((h << 2) | code[c]) & mask          # shift new in, old out
        if i >= 9:
            if h in seen: out.add(s[i - 9:i + 1])
            else: seen.add(h)
    return list(out)
```
**Time O(n) / Space O(n).** Same idea powers Rabin–Karp.

---

## 5. Template C — shrink to minimum

The window starts **invalid**, becomes valid, then you squeeze it while it *stays* valid.
The answer is recorded **inside** the loop.

```python
def template_c(items):
    left = 0
    best = float('inf')
    for right, x in enumerate(items):
        add(x)
        while is_valid():                        # while STILL valid, tighten
            best = min(best, right - left + 1)
            remove(items[left]); left += 1
    return best
```
**Mental trigger:** *"minimum window / shortest substring containing …"*.

### 5a. Minimum Window Substring (LC 76) — the `have` / `need` technique

The most-asked window problem. Four ideas, learned separately:

1. **`need = Counter(t)`**; `required = len(need)` = how many *distinct* chars must be satisfied.
2. **`window`** — counts in the current window. Only chars present in `need` affect validity.
3. **`have`** — how many distinct chars currently satisfy `window[c] >= need[c]`. The
   window is valid exactly when `have == required`. This one integer replaces an `O(Σ)`
   dict comparison.
4. **The two flip points** — `have` changes by at most 1 per operation:
   - **adding** `c`: increment only when `window[c]` becomes *exactly* `need[c]` (going
     from 3 to 4 copies of a char that needs 2 changes nothing);
   - **removing** `c`: decrement only when `window[c]` drops *below* `need[c]`.

```python
from collections import Counter, defaultdict

def min_window(s, t):
    if not s or not t: return ""
    need = Counter(t)
    required = len(need)
    window = defaultdict(int)
    have = left = 0
    best_len, best_l = float('inf'), 0
    for right, c in enumerate(s):
        window[c] += 1
        if c in need and window[c] == need[c]:
            have += 1                            # EXACTLY satisfied, not "at least"
        while have == required:                  # valid ⇒ record, then tighten
            if right - left + 1 < best_len:
                best_len, best_l = right - left + 1, left
            out = s[left]
            window[out] -= 1
            if out in need and window[out] < need[out]:
                have -= 1                        # broke validity ⇒ stop shrinking
            left += 1
    return "" if best_len == float('inf') else s[best_l:best_l + best_len]
```
**Time O(|s| + |t|) / Space O(|s| + |t|).** Trace `s="ADOBECODEBANC", t="ABC"`: first
valid at `"ADOBEC"` (6), later tightens to `"BANC"` (4) — the answer.

### 5b. Minimum Window Subsequence (LC 727) — a Google classic

Now `t` must appear **in order but not contiguously**. A counter cannot express order, so
use **forward match, then backward tighten**: the forward pass finds an occurrence ending
as early as possible; the backward pass walks that same occurrence in reverse to push the
start as far right as possible.

```python
def min_window_subsequence(s, t):
    n, m = len(s), len(t)
    best_len, best_start = float('inf'), -1
    i = 0
    while i < n:
        j, k = 0, i
        while k < n:                             # forward: greedily match t
            if s[k] == t[j]:
                j += 1
                if j == m: break
            k += 1
        if j < m: break                          # no complete match remains
        end = k
        j = m - 1
        while j >= 0:                            # backward: tighten the start
            if s[k] == t[j]: j -= 1
            k -= 1
        start = k + 1
        if end - start + 1 < best_len:
            best_len, best_start = end - start + 1, start
        i = start + 1                            # restart just past this start
    return "" if best_start < 0 else s[best_start:best_start + best_len]
```
**Time O(n·m) worst case / Space O(1).** There is an `O(n·m)` DP too, but this uses `O(1)`
space and is what the interviewer is fishing for.

### 5c. Smallest Range Covering Elements from K Lists (LC 632)

A window across `k` sorted lists: one pointer per list in a min-heap, plus the running
max. The window is `[heap_min, cur_max]`; advancing the **minimum** pointer is the only
move that can shrink the range.

```python
import heapq

def smallest_range(nums):
    heap = [(row[0], i, 0) for i, row in enumerate(nums)]
    heapq.heapify(heap)
    cur_max = max(row[0] for row in nums)
    best = (heap[0][0], cur_max)
    while True:
        val, i, j = heapq.heappop(heap)
        if cur_max - val < best[1] - best[0]: best = (val, cur_max)
        if j + 1 == len(nums[i]): return list(best)   # a list ran out ⇒ done
        nxt = nums[i][j + 1]
        cur_max = max(cur_max, nxt)
        heapq.heappush(heap, (nxt, i, j + 1))
```
**Time O(N log k) / Space O(k)**, `N` = total elements.

---

## 6. Counting cookbook — at most K / exactly K / at least K

Longest records **one length** after the shrink. Counting uses the **same window** and
records **how many starts** share the frontier. The shrink rule depends on the
inequality; equality is never a shrink rule.

Write `N = n(n+1)/2` for the number of contiguous subarrays. The measure (distinct
count, odd count, sum of non-negatives, …) must be a **non-negative integer** and
monotone in the window's extent (§1).

| Ask | Monotone? | Shrink | Formula |
|---|---|---|---|
| **at most K** | yes — grow can only exceed K | while `measure > K` | `res += right - left + 1` after shrink |
| **exactly K** | **no** — flips on then off | never shrink on `== K` | `atMost(K) - atMost(K-1)` |
| **at least K** | yes — grow can only help | while still valid (`measure >= K`) | `N - atMost(K-1)`, or `ans += left` |

Same loop, four different `+=` (longest included for contrast):

```python
best = max(best, right - left + 1)   # LONGEST  at most K     (Template A)
res  += right - left + 1             # COUNT    at most K     (Template E)
best = min(best, right - left + 1)   # SHORTEST at least K    (Template C, inside while)
ans  += left                         # COUNT    at least K    (after shrink-while-valid)
# COUNT exactly K:  at_most(k) - at_most(k - 1)               (Template D, two passes)
```

### 6.0 at most K — shrink while invalid, then count starts

After shrink, `left` is the *smallest* start for which `[left, right]` still has
measure ≤ K. By monotonicity every start in `{left, …, right}` works, and all those
subarrays **end at this `right`**:

```
atMost(K) = Σ_r (r - L(r) + 1)
```

where `L(r)` is the frontier after shrinking. This is Template E (§7). LC 713, 2302.

```python
def at_most(nums, k, add, remove, value):
    if k < 0: return 0
    left = state = res = 0
    for right, x in enumerate(nums):
        state = add(state, x)
        while value(state) > k:                  # invalid → shrink
            state = remove(state, nums[left]); left += 1
        res += right - left + 1                  # all valid starts ending at right
    return res
```

### 6.1 at least K — complement, or count the *wide* starts

Growing helps, so the valid windows are the **wide** ones. Two equivalent formulas:

```
atLeast(K) = N - atMost(K-1)
atLeast(K) = Σ_r L(r)
```

The second: shrink **while still valid** (Template C). When the `while` stops, `left` is
the first start that *breaks* validity, so every start in `{0, …, left-1}` still contains
enough — that is `left` subarrays ending at `right`. LC 1358 is this with a 3-letter
alphabet; last-seen (`min(last)+1`) is the same count without an explicit `left`.

```python
def at_least(nums, k, add, remove, value):
    n = len(nums)
    return n * (n + 1) // 2 - at_most(nums, k - 1, add, remove, value)

def at_least_frontier(items, is_valid, add, remove):
    left = ans = 0
    for right, x in enumerate(items):
        add(x)
        while is_valid():                        # still "enough" → push left
            remove(items[left]); left += 1
        ans += left                              # starts 0 .. left-1 all work
    return ans
```

### 6.2 exactly K — subtraction, never a direct window (Template D)

Counting subarrays with **exactly** K of something is *not* a window problem: as `right`
grows, "exactly K" switches on **and off**, so validity is not monotone (§1). But
**"at most K" is monotone** — adding elements can only push you over. Hence:

```
exactly(K) = atMost(K) - atMost(K-1)
```

**Why it works.** `atMost(K)` counts subarrays whose measure lies in `{0,…,K}`;
`atMost(K-1)` counts `{0,…,K-1}`. The second set is a subset of the first, so subtracting
the counts leaves the count of the set difference — exactly the measure-`K` subarrays.

```python
def exactly_k(nums, k, measure):
    def at_most(limit):
        if limit < 0: return 0
        left = state = res = 0
        for right, x in enumerate(nums):
            state = measure.add(state, x)
            while measure.value(state) > limit:
                state = measure.remove(state, nums[left]); left += 1
            res += right - left + 1              # see §7 for what this counts
        return res
    return at_most(k) - at_most(k - 1)
```
**Time O(n) (two passes) / Space O(state).**

**Mental trigger:** *"exactly K …"*, *"sum equals goal"* over non-negative data → write
`atMost` once, call it twice. *"at least K …"* → `N - atMost(K-1)` or `ans += left`.

### 6a. Subarrays with K Different Integers (LC 992)

```python
def subarrays_with_k_distinct(nums, k):
    def at_most(limit):
        count = {}
        left = res = 0
        for right, x in enumerate(nums):
            count[x] = count.get(x, 0) + 1
            while len(count) > limit:
                out = nums[left]
                count[out] -= 1
                if count[out] == 0: del count[out]
                left += 1
            res += right - left + 1
        return res
    return at_most(k) - at_most(k - 1)
```

### 6b. Count Number of Nice Subarrays (LC 1248) — exactly k odd numbers

```python
def number_of_nice_subarrays(nums, k):
    def at_most(limit):
        if limit < 0: return 0
        left = odds = res = 0
        for right, x in enumerate(nums):
            odds += x & 1
            while odds > limit:
                odds -= nums[left] & 1; left += 1
            res += right - left + 1
        return res
    return at_most(k) - at_most(k - 1)
```

### 6c. Binary Subarrays With Sum (LC 930)

```python
def num_subarrays_with_sum(nums, goal):
    def at_most(limit):
        if limit < 0: return 0
        left = total = res = 0
        for right, x in enumerate(nums):
            total += x
            while total > limit:
                total -= nums[left]; left += 1
            res += right - left + 1
        return res
    return at_most(goal) - at_most(goal - 1)
```

### 6d. Substrings Containing All Three Characters (LC 1358) — at least K, last-seen

This is **at least** (the window must contain a, b, *and* c). Complement works
(`N - atMost(2)` with distinct-count), but the frontier is even cleaner: for each
`right`, every start at or before `min(last_a, last_b, last_c)` already contains all
three, so that many prefixes of `[0..right]` are valid.

```python
def number_of_substrings(s):
    last = {'a': -1, 'b': -1, 'c': -1}
    ans = 0
    for i, c in enumerate(s):
        last[c] = i
        ans += min(last.values()) + 1            # 0 while a letter is still missing
    return ans
```

Same count as the Template-C window (`ans += left` after shrinking while still valid):

```python
def number_of_substrings_window(s):
    count = {'a': 0, 'b': 0, 'c': 0}
    left = ans = 0
    for right, c in enumerate(s):
        count[c] += 1
        while all(count[ch] > 0 for ch in 'abc'):
            count[s[left]] -= 1
            left += 1                            # left = first start that BREAKS validity
        ans += left                              # starts 0 .. left-1 all contain a,b,c
    return ans
```
**Time O(n) / Space O(1).** `min(last)+1` is this with O(1) state for a 3-letter alphabet.

---

## 7. Template E — counting windows and `right - left + 1`

```python
res += right - left + 1
```

**What it counts, precisely:** after the shrink loop, `left` is the *smallest* start for
which `[left, right]` is valid. By monotonicity (§1) the valid starts for this fixed
`right` are exactly `left, left+1, …, right` — that is `right - left + 1` subarrays,
**all ending at `right`**. Summing over every `right` covers each subarray exactly once,
because every subarray has exactly one right end. Writing `res += 1` instead counts
*windows*, not subarrays — a classic silent wrong answer.

**This does not overlap.** A subarray is a pair `(L, R)` with one right end. The
increment at `right = 3` only adds pairs `(*, 3)`; the increment at `right = 2` only
added `(*, 2)`. Those sets are disjoint — summing over `right` is a **partition** of
subarrays by right endpoint. Inner windows that *live inside* `[left, right]` ended
*earlier* and were already billed to that earlier `right`. Same `left` on two iterations
only means the frontier did not move, so new suffixes ending at the *new* `right` became
valid.

```
index:     0    1    2    3
           a    b    c    d

right=2, left=1  →  [b,c], [c]           all end at 2
right=3, left=1  →  [b,c,d], [c,d], [d]  all end at 3  (disjoint from above)
```

**Mental trigger:** *"count the number of subarrays such that …"* (at most / less-than).
For *at least* / *exactly* see §6.

### 7a. Subarray Product Less Than K (LC 713)

```python
def num_subarray_product_less_than_k(nums, k):
    if k <= 1: return 0
    left = res = 0
    prod = 1
    for right, x in enumerate(nums):
        prod *= x
        while prod >= k:
            prod //= nums[left]; left += 1       # exact: every factor is an integer
        res += right - left + 1
    return res
```
**Time O(n) / Space O(1).** Needs all values ≥ 1; a zero or a fraction breaks monotonicity.

### 7b. Count Subarrays With Score Less Than K (LC 2302)

`score = sum × length`, monotone increasing for positive values.

```python
def count_subarrays_score_lt_k(nums, k):
    left = total = res = 0
    for right, x in enumerate(nums):
        total += x
        while total * (right - left + 1) >= k:
            total -= nums[left]; left += 1
        res += right - left + 1
    return res
```
**Time O(n) / Space O(1).**

### 7c. Number of Subarrays with Bounded Maximum (LC 795)

`atMost(hi) - atMost(lo-1)` again, but `atMost` here is a run-length scan: any element
above the bound resets the run to zero.

```python
def num_subarray_bounded_max(nums, lo, hi):
    def at_most(bound):
        res = run = 0
        for x in nums:
            run = run + 1 if x <= bound else 0   # subarrays ending here, all ≤ bound
            res += run
        return res
    return at_most(hi) - at_most(lo - 1)
```
**Time O(n) / Space O(1).**

---

## 8. Two pointers proper (not a sliding window)

A sliding window is *one* kind of two-pointer scan: both pointers move the same direction
and the region **between** them is the object of interest. The families below are
genuinely different — do not conflate them.

### 8.1 Opposite ends (converging)

**Mental trigger:** *sorted input* + *"find a pair/triple"*, or *"the answer depends on
the two boundaries"*.

```python
def two_sum_sorted(nums, target):                # LC 167
    l, r = 0, len(nums) - 1
    while l < r:
        s = nums[l] + nums[r]
        if s == target: return [l + 1, r + 1]
        if s < target: l += 1                    # only way to raise the sum
        else: r -= 1
    return []
```
**Time O(n) / Space O(1).** The elimination argument: if `s < target`, then `nums[l]`
paired with *anything* ≤ `nums[r]` is still too small, so `l` cannot be part of any
solution with a surviving partner — discard the whole row at once.

**3Sum (LC 15)** — sort, fix an anchor, two-pointer the rest, dedup in **three** places.

```python
def three_sum(nums):
    nums.sort()
    n, res = len(nums), []
    for i in range(n - 2):
        if nums[i] > 0: break                    # sorted ⇒ no way back to zero
        if i > 0 and nums[i] == nums[i - 1]: continue        # dedup 1: the anchor
        l, r = i + 1, n - 1
        while l < r:
            s = nums[i] + nums[l] + nums[r]
            if s < 0: l += 1
            elif s > 0: r -= 1
            else:
                res.append([nums[i], nums[l], nums[r]])
                l += 1; r -= 1
                while l < r and nums[l] == nums[l - 1]: l += 1   # dedup 2: left
                while l < r and nums[r] == nums[r + 1]: r -= 1   # dedup 3: right
    return res
```
**Time O(n²) / Space O(1) extra.** **4Sum (LC 18)** adds one more loop (`O(n³)`); the
general `kSum` recurses down to this 2-pointer base case.

```python
def four_sum(nums, target):
    nums.sort()
    n, res = len(nums), []
    for i in range(n - 3):
        if i > 0 and nums[i] == nums[i - 1]: continue
        for j in range(i + 1, n - 2):
            if j > i + 1 and nums[j] == nums[j - 1]: continue
            l, r = j + 1, n - 1
            while l < r:
                s = nums[i] + nums[j] + nums[l] + nums[r]
                if s < target: l += 1
                elif s > target: r -= 1
                else:
                    res.append([nums[i], nums[j], nums[l], nums[r]])
                    l += 1; r -= 1
                    while l < r and nums[l] == nums[l - 1]: l += 1
                    while l < r and nums[r] == nums[r + 1]: r -= 1
    return res
```

**Container With Most Water (LC 11) — learn the proof, they ask for it.**

```python
def max_area(height):
    l, r = 0, len(height) - 1
    best = 0
    while l < r:
        best = max(best, (r - l) * min(height[l], height[r]))
        if height[l] < height[r]: l += 1         # discarding the SHORTER side is safe
        else: r -= 1
    return best
```
> **Proof.** Suppose `height[l] < height[r]` and we are about to discard `l`. Take any
> pair `(l, r')` with `l < r' < r`. Its width `r' - l` is strictly smaller than `r - l`,
> and its height `min(height[l], height[r']) <= height[l] = min(height[l], height[r])`.
> So **every** remaining pair involving `l` has area ≤ the pair `(l, r)` we just measured
> and recorded — discarding `l` cannot lose the optimum. Moving the *taller* side has no
> such guarantee: the height stays capped by the shorter bar, so the lost width buys
> nothing.

**Time O(n) / Space O(1).**

**Trapping Rain Water (LC 42) — two pointers, O(1) space.**

Water above `i` is `min(maxLeft[i], maxRight[i]) - height[i]`. You never need both
maxima — only which one *binds*, and comparing the two end heights tells you that.

```python
def trap(height):
    l, r = 0, len(height) - 1
    left_max = right_max = total = 0
    while l < r:
        if height[l] < height[r]:
            left_max = max(left_max, height[l])
            total += left_max - height[l]        # right side is guaranteed ≥ left_max
            l += 1
        else:
            right_max = max(right_max, height[r])
            total += right_max - height[r]
            r -= 1
    return total
```
> **Why it works.** When `height[l] < height[r]` there exists a bar at least as tall as
> `height[l]` somewhere to the right (namely `height[r]`), so the true right maximum for
> position `l` is ≥ `left_max`. Therefore `min(maxLeft, maxRight) = left_max`, and column
> `l` can be settled immediately without ever computing `maxRight[l]`.

**Time O(n) / Space O(1).**

```python
def valid_palindrome(s):                         # LC 680
    def is_pal(i, j):
        while i < j:
            if s[i] != s[j]: return False
            i += 1; j -= 1
        return True
    l, r = 0, len(s) - 1
    while l < r:
        if s[l] != s[r]:
            return is_pal(l + 1, r) or is_pal(l, r - 1)   # delete left OR right
        l += 1; r -= 1
    return True
```
**Time O(n) / Space O(1).**

**Sort Colors — Dutch National Flag (LC 75)** — *three* pointers, one pass.

```python
def sort_colors(nums):
    low, mid, high = 0, 0, len(nums) - 1
    while mid <= high:                           # note <= : nums[high] is unexamined
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]; low += 1; mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1                            # do NOT advance mid: value is unseen
    return nums
```
Invariant: `[0,low)` all 0s, `[low,mid)` all 1s, `(high,n)` all 2s, `[mid,high]`
unexamined. **Time O(n) / Space O(1).**

**In-place reversal (LC 344 / 151 / 186)** — reverse the whole buffer, then each word.

```python
def reverse_in_place(chars, i, j):
    while i < j:
        chars[i], chars[j] = chars[j], chars[i]; i += 1; j -= 1

def reverse_words_in_place(chars):
    reverse_in_place(chars, 0, len(chars) - 1)   # right word order, each word backwards
    start = 0
    for i in range(len(chars) + 1):
        if i == len(chars) or chars[i] == ' ':
            reverse_in_place(chars, start, i - 1); start = i + 1
    return chars
```
**Time O(n) / Space O(1).**

### 8.2 Same direction — slow / fast (read & write pointers)

**Mental trigger:** *"in place"*, *"O(1) extra space"*, *"return the new length"*.
Universal shape: `fast` reads everything, `slow` marks where the next **kept** element
goes. Safe to mutate because `slow <= fast` always.

```python
def remove_duplicates(nums):                     # LC 26, sorted input
    if not nums: return 0
    slow = 1
    for fast in range(1, len(nums)):
        if nums[fast] != nums[slow - 1]:
            nums[slow] = nums[fast]; slow += 1
    return slow                                  # nums[:slow] is the answer

def remove_duplicates_ii(nums, allowed=2):       # LC 80 — keep at most `allowed`
    slow = 0
    for x in nums:
        if slow < allowed or x != nums[slow - allowed]:
            nums[slow] = x; slow += 1
    return slow

def move_zeroes(nums):                           # LC 283
    slow = 0
    for fast in range(len(nums)):
        if nums[fast] != 0:
            nums[slow], nums[fast] = nums[fast], nums[slow]; slow += 1
    return nums
```
**Time O(n) / Space O(1)** each.

**Merge Sorted Array (LC 88) — fill from the back.** Writing forwards would clobber
unread values in `nums1`; the tail is free space, so write there.

```python
def merge(nums1, m, nums2, n):
    i, j, k = m - 1, n - 1, m + n - 1
    while j >= 0:                                # nums1 leftovers are already in place
        if i >= 0 and nums1[i] > nums2[j]:
            nums1[k] = nums1[i]; i -= 1
        else:
            nums1[k] = nums2[j]; j -= 1
        k -= 1
    return nums1
```
**Time O(m+n) / Space O(1).**

**Backspace String Compare (LC 844) in O(1) space** — scan right-to-left, because a `#`
only affects characters *before* it.

```python
def _next_valid(s, i):
    skip = 0
    while i >= 0:
        if s[i] == '#': skip += 1; i -= 1
        elif skip: skip -= 1; i -= 1
        else: break
    return i

def backspace_compare(s, t):
    i, j = len(s) - 1, len(t) - 1
    while i >= 0 or j >= 0:
        i, j = _next_valid(s, i), _next_valid(t, j)
        if i >= 0 and j >= 0:
            if s[i] != t[j]: return False
        elif i >= 0 or j >= 0:
            return False                         # one ran out early ⇒ different
        i -= 1; j -= 1
    return True
```
**Time O(n+m) / Space O(1).**

**Squares of a Sorted Array (LC 977)** — opposite-ends read, back-to-front write, since
the largest square sits at one of the two ends.

```python
def sorted_squares(nums):
    n = len(nums)
    res = [0] * n
    l, r = 0, n - 1
    for k in range(n - 1, -1, -1):
        if abs(nums[l]) > abs(nums[r]): res[k] = nums[l] * nums[l]; l += 1
        else: res[k] = nums[r] * nums[r]; r -= 1
    return res
```
**Time O(n) / Space O(n) output.**

**Linked lists** — the same fast/slow idea gives Floyd cycle detection, the middle node,
and k-th-from-the-end. See `linked_list.md`.

### 8.3 Merging two sequences / subsequence matching

```python
def is_subsequence(s, t):                        # LC 392
    i = 0
    for c in t:
        if i < len(s) and s[i] == c: i += 1      # greedy: earliest match is safe
    return i == len(s)
```
**Time O(|t|) / Space O(1).** Greedy is optimal: matching `s[i]` as early as possible
leaves the largest possible suffix of `t` for the rest of `s`. For **many** queries
against one `t`, precompute `next_pos[i][c]` and binary-search — that is the follow-up.

---

## 9. Windows with an auxiliary data structure

When validity depends on the window's max / min / median, a counter cannot express it.
Swap the structure; the template does not change, only `add` / `remove` / `read`.

### 9a. Window + monotonic deque — Longest Subarray, Abs Diff ≤ Limit (LC 1438)

Validity is `max(window) - min(window) <= limit`, so keep **two** deques.

```python
def longest_subarray(nums, limit):
    max_dq, min_dq = deque(), deque()            # decreasing / increasing values
    left = best = 0
    for right, x in enumerate(nums):
        while max_dq and max_dq[-1] < x: max_dq.pop()
        max_dq.append(x)
        while min_dq and min_dq[-1] > x: min_dq.pop()
        min_dq.append(x)
        while max_dq[0] - min_dq[0] > limit:
            if max_dq[0] == nums[left]: max_dq.popleft()   # pop only if leaver IS extreme
            if min_dq[0] == nums[left]: min_dq.popleft()
            left += 1
        best = max(best, right - left + 1)
    return best
```
**Time O(n) / Space O(n).**

### 9b. Window + deque over DP — Jump Game VI (LC 1696)

`dp[i] = nums[i] + max(dp[i-k .. i-1])` — a sliding-window maximum over a DP array.

```python
def max_result(nums, k):
    n = len(nums)
    dp = [0] * n
    dp[0] = nums[0]
    dq = deque([0])                              # indices; dp values decreasing
    for i in range(1, n):
        while dq and dq[0] < i - k: dq.popleft()
        dp[i] = dp[dq[0]] + nums[i]
        while dq and dp[dq[-1]] <= dp[i]: dq.pop()
        dq.append(i)
    return dp[-1]
```
**Time O(n) / Space O(n).**

### 9c. Window + heap

A heap gives `O(log n)` insert and `O(1)` peek-max but **no `O(log n)` delete of an
arbitrary element**. The fix is **lazy deletion**: push `(value, index)` and discard the
top whenever its index has fallen out of the window — which lets the heap grow to `O(n)`
and costs `O(n log n)`. Use it when you need the extreme's identity; otherwise the deque
(§9a) is strictly better.

### 9d. Window + SortedList — Sliding Window Median (LC 480)

Order statistics need a balanced structure. `SortedList` gives `O(log k)` add/remove and
`O(1)` indexing.

```python
from sortedcontainers import SortedList          # pip install sortedcontainers

def median_sliding_window(nums, k):
    window = SortedList(nums[:k])
    res = []
    for i in range(k, len(nums) + 1):
        if k % 2: res.append(float(window[k // 2]))
        else: res.append((window[k // 2 - 1] + window[k // 2]) / 2)
        if i == len(nums): break
        window.add(nums[i])
        window.remove(nums[i - k])               # O(log k) — impossible with a heap
    return res
```
**Time O(n log k) / Space O(k).** If imports are banned: two heaps (max-heap of the low
half, min-heap of the high half) plus lazy deletion.

### 9e. Window + hashmap of last index — the "jump left" variant of LC 3

Jump `left` straight past the previous occurrence instead of stepping. Same `O(n)`, fewer
operations; the `>= left` guard is the trap.

```python
def length_of_longest_substring_jump(s):
    last = {}                                    # char -> last index seen
    left = best = 0
    for right, c in enumerate(s):
        if c in last and last[c] >= left:
            left = last[c] + 1                   # guard: never move left BACKWARDS
        last[c] = right
        best = max(best, right - left + 1)
    return best
```
**Time O(n) / Space O(Σ).**

---

## 10. When sliding window fails — what to use instead

| Symptom | Why the window breaks | Use instead |
|---|---|---|
| **Negatives** + a sum constraint | adding can *lower* the sum ⇒ not monotone | prefix + hashmap (`subarrays.md` §4) or prefix + deque (§1.1) |
| "subarray sum **== k**", any values | equality is monotone in neither direction | prefix sum + hashmap of counts |
| "**longest** subarray with sum == k" | same | prefix + hashmap storing the **earliest** index |
| "sum divisible by k" | modular, not monotone | hashmap on `prefix % k` |
| Need window **median / k-th smallest** | counters answer no order queries | SortedList, or two heaps |
| Need window **max / min** | removing the extreme loses the runner-up | monotonic deque (`monotonic_stack.md`) |
| "**exactly** K", non-negative data | switches on *and off* | `atMost(K) - atMost(K-1)` (§6) |
| Max subarray sum, negatives allowed | no valid shrink rule exists | Kadane (`subarrays.md` §6) |
| Constraint over **non-contiguous** picks | there is no window | DP / greedy / heap |
| **Circular** array | wraparound | duplicate to length `2n`, or case-split |

**One-line rule:** *the window works iff the predicate is monotone in the window's
extent.* If you cannot state that monotonicity in one sentence, you have the wrong tool.

---

## 11. Common pitfalls (each of these has cost someone an offer)

1. **`if` instead of `while` when shrinking.** One new element can violate the constraint
   by more than one unit; `if` shrinks once and leaves the window invalid.
2. **Recording the answer before restoring validity.** Template A records *after* the
   shrink loop, Template C *inside* it. Swapping them is off by exactly one window.
3. **Leaving zero-count keys in the dict.** `len(count)` is the standard distinct-count
   test; a key sitting at 0 inflates it forever and the window never grows again. Always
   `if count[c] == 0: del count[c]`. The same bug breaks `Counter == Counter`.
4. **Off-by-one in window length.** It is `right - left + 1`, always. `right - left`
   silently under-reports every length and every count.
5. **Fixed window: forgetting to evict**, or evicting the wrong index. The leaver is at
   `right - k`, and only once `right >= k`.
6. **Using a window on negatives** (or on a product containing zero). §1.1 — the most
   common *conceptual* failure, and it produces plausible answers on small tests.
7. **Comparing whole dictionaries every step.** `window == need` inside the loop is `O(Σ)`
   per index. Use the `have` / `matches` integer (§4b, §5a) — Google probes for this.
8. **`while l <= r` vs `while l < r`.** Converging pointers on *pairs* need `l < r` (an
   element must not pair with itself); Dutch-flag needs `mid <= high` (the element at
   `high` is still unexamined). Backwards ⇒ dropped element or infinite loop.
9. **Not handling empty / short input**: `k > len(nums)`, `len(t) > len(s)`, empty string.
   Several templates index `nums[0]` or slice `nums[:k]` unguarded.
10. **Mutating the input while scanning.** Fine for write-pointer patterns (§8.2) where
    `slow <= fast` guarantees you only overwrite already-read cells — fatal the moment you
    write *ahead* of the read pointer.
11. **Stale aggregate reused blindly.** LC 424's `max_freq` is deliberately stale *and*
    correct; copying that idiom where you need the true current max is a silent bug.
12. **Returning `float('inf')`** instead of the required sentinel (`0`, `-1`, `""`) when
    no valid window exists.

---

## 12. Cheat sheets

### 12a. Complexity

| Pattern | Time | Space |
|---|---|---|
| Template A / C (counter or sum state) | O(n) | O(Σ) or O(1) |
| Template B fixed window | O(n) | O(k) or O(Σ) |
| Template D (`atMost` twice) | O(n) | O(Σ) |
| Template E counting | O(n) | O(1) |
| Window + monotonic deque | O(n) amortised | O(k) |
| Window + heap (lazy delete) | O(n log n) | O(n) |
| Window + SortedList | O(n log k) | O(k) |
| Two pointers on sorted input | O(n) after O(n log n) sort | O(1) |
| 3Sum / 4Sum | O(n²) / O(n³) | O(1) extra |

### 12b. Phrasing → template

| The problem says… | Reach for |
|---|---|
| "longest substring/subarray such that …" | **A** — shrink while invalid |
| "shortest / minimum window containing …" | **C** — shrink while valid |
| "of size k", "every window of length k" | **B** — fixed |
| "at most K …" (count) | **E** — shrink while invalid, `res += right - left + 1` |
| "exactly K …", "sum == goal" (non-negative) | **D** — `atMost(K) - atMost(K-1)` |
| "at least K …" (count) | `N - atMost(K-1)`, or `ans += left` after shrink-while-valid |
| "count the number of subarrays where …" | **E** / §6 cookbook — do **not** `res += 1` |
| "max/min of every window" | **B + monotonic deque** |
| "median / k-th smallest of every window" | **B + SortedList / two heaps** |
| "sorted array, find a pair/triple summing to X" | opposite-ends two pointers |
| "in place, O(1) space, return new length" | slow/fast write pointer |
| "… with negative numbers" (any sum constraint) | **not a window** → `subarrays.md` |

---

## 13. Google-favourite problem list

**Basic — know these cold**
1. LC 3 — Longest Substring Without Repeating Characters — Template A; counts or last-index jump.
2. LC 209 — Minimum Size Subarray Sum — shrink-while-valid; positives only.
3. LC 643 — Maximum Average Subarray I — the "hello world" of fixed windows.
4. LC 1004 — Max Consecutive Ones III — Template A counting zeros.
5. LC 121 — Best Time to Buy and Sell Stock — degenerate window: track the min so far.
6. LC 344 — Reverse String — converging pointers, in place.
7. LC 26 / 80 — Remove Duplicates from Sorted Array I/II — slow-fast write pointer.
8. LC 283 — Move Zeroes — write pointer with swap, preserves order.
9. LC 977 — Squares of a Sorted Array — opposite-ends read, back-to-front write.
10. LC 88 — Merge Sorted Array — fill from the back or you clobber unread data.
11. LC 392 — Is Subsequence — greedy two pointers; follow-up: many queries → `next_pos` table.
12. LC 167 — Two Sum II — the elimination argument in five lines.

**Core — very frequent**
13. LC 424 — Longest Repeating Character Replacement — the stale-`max_freq` trick.
14. LC 904 — Fruit Into Baskets — "at most 2 distinct" in disguise.
15. LC 159 — Longest Substring with At Most **Two** Distinct Characters — the k=2 base case.
16. LC 340 — Longest Substring with At Most **K** Distinct Characters — canonical "at most K".
17. LC 438 / 567 — Find All Anagrams / Permutation in String — fixed window + `matches` counter.
18. LC 76 — **Minimum Window Substring** — Template C with `have`/`need`. Most-asked of all.
19. LC 239 — Sliding Window Maximum — monotonic deque; cross-ref `monotonic_stack.md`.
20. LC 713 — Subarray Product Less Than K — Template E; needs all values ≥ 1.
21. LC 930 — Binary Subarrays With Sum — `atMost(goal) - atMost(goal-1)`.
22. LC 1248 — Count Number of Nice Subarrays — same subtraction, odd-count measure.
23. LC 1358 — Substrings Containing All Three Characters — min of last-seen indices.
24. LC 795 — Number of Subarrays with Bounded Maximum — `atMost` via run lengths.
25. LC 15 / 18 — 3Sum / 4Sum — sort + two pointers + dedup in three places.
26. LC 11 — Container With Most Water — know the "move the shorter side" proof.
27. LC 42 — Trapping Rain Water — two-pointer O(1) space; know why `left_max` binds.
28. LC 75 — Sort Colors — Dutch national flag; `mid <= high`, don't advance on a 2.
29. LC 680 — Valid Palindrome II — converge, branch once on the first mismatch.
30. LC 844 — Backspace String Compare — right-to-left, O(1) space.
31. LC 187 — Repeated DNA Sequences — rolling hash over a fixed window.
32. LC 1456 — Maximum Number of Vowels in a Substring — Template B, one counter.
33. LC 1052 — Grumpy Bookstore Owner — base sum + fixed window of "rescued" customers.
34. LC 1423 — Maximum Points from Cards — take k from the ends ⇒ **minimise** the fixed middle window of size `n-k`.
35. LC 1208 — Get Equal Substrings Within Budget — Template A with a cost budget.
36. LC 151 / 186 — Reverse Words in a String — reverse all, then reverse each word.

**Hard / Google-flavoured**
37. LC 992 — Subarrays with K Different Integers — the flagship `atMost` subtraction.
38. LC 727 — **Minimum Window Subsequence** — forward match + backward tighten. A Google classic.
39. LC 632 — Smallest Range Covering Elements from K Lists — heap window across lists.
40. LC 480 — Sliding Window Median — SortedList, or two heaps + lazy deletion.
41. LC 1438 — Longest Subarray with Absolute Diff ≤ Limit — two monotonic deques.
42. LC 1696 — Jump Game VI — sliding-window max over a DP array.
43. LC 862 — Shortest Subarray with Sum at Least K — **negatives** ⇒ prefix + deque, not a window.
44. LC 30 — Substring with Concatenation of All Words — `word_len` interleaved windows, one per offset.
45. LC 995 — Minimum Number of K Consecutive Bit Flips — window carrying a running XOR of pending flips (difference array).
46. LC 1234 — Replace the Substring for Balanced String — invert it: smallest window whose *removal* balances the outside.
47. LC 1838 — Frequency of the Most Frequent Element — sort, then window where `k >= x·len - windowSum`.
48. LC 1151 / 2134 — Minimum Swaps to Group All 1's Together I/II — fixed window of width `count(1)`; II is circular ⇒ duplicate the array.
49. LC 2401 — Longest Nice Subarray — window state is a bitmask; shrink while `mask & x`.
50. LC 2799 — Count Complete Subarrays — distinct count of the whole array, then Template E.
51. LC 2516 — Take K of Each Character From Left and Right — taking from both ends ⇒ find the **longest middle window** you can afford to leave.
52. LC 2302 — Count Subarrays With Score Less Than K — Template E with `sum × length`.

---

## 14. Quiz

**Q1.** State the precondition for sliding window in one sentence.
<details><summary>Answer</summary>
Validity must be monotone in the window's extent: for a fixed right end, if `[l, r]` is
invalid then every wider `[l', r]` with `l' < l` is invalid too — growing can only hurt,
shrinking can only help. That is exactly what lets `left` move forward only.
</details>

**Q2.** Why is a `while` nested inside a `for` still `O(n)` here?
<details><summary>Answer</summary>
Amortisation. The inner loop only advances `left`, which is non-decreasing and bounded by
`n`, so across the whole run its body executes at most `n` times *in total* — not `n`
times per outer iteration.
</details>

**Q3.** Precisely what does `res += right - left + 1` count?
<details><summary>Answer</summary>
The number of valid subarrays **ending at `right`**. After shrinking, `left` is the
smallest valid start, and by monotonicity every start in `[left, right]` is valid too —
that is `right - left + 1` of them. Summing over all `right` counts each subarray exactly
once, since every subarray has exactly one right end.
</details>

**Q4.** Why does `exactly(K) = atMost(K) - atMost(K-1)` hold?
<details><summary>Answer</summary>
`atMost(K)` counts subarrays whose measure lies in `{0..K}` and `atMost(K-1)` those in
`{0..K-1}`. The second set is a subset of the first, so the difference of the counts is
the count of the set difference — precisely the measure-`K` subarrays. It requires only
that the measure be a non-negative integer.
</details>

**Q5.** In LC 424, `max_freq` is never decreased when the window shrinks. Is that a bug?
<details><summary>Answer</summary>
No. The recorded answer only grows when `max_freq` grows. A stale `max_freq` may let an
invalid window pass the test, but the length it produces can never exceed the length that
was genuinely achievable back when `max_freq` really was that large — so the maximum is
unaffected.
</details>

**Q6.** In Container With Most Water, why is discarding the shorter side safe?
<details><summary>Answer</summary>
If `height[l] < height[r]`, then for any `r'` with `l < r' < r` the width shrinks
(`r' - l < r - l`) while the height stays capped by `height[l]`. So every remaining pair
using `l` is no better than the `(l, r)` already measured and recorded — discarding `l`
cannot lose the optimum.
</details>

**Q7.** `nums = [1, -1, 5, -2, 3]`, shortest subarray with sum ≥ 3. What does a naive
sliding window do, and what is correct?
<details><summary>Answer</summary>
The correct answer is `1` — the single element `5`. A naive window reports something
longer, because after adding `-1` the running sum drops and the shrink condition never
fires at the right moment: validity is not monotone with negatives. Use prefix sums plus a
monotonic deque (§1.1).
</details>

**Q8.** You need the maximum of every window of size `k`. Why not a max-heap?
<details><summary>Answer</summary>
A heap cannot delete an arbitrary element in `O(log k)` — only the top. You must use lazy
deletion, which lets the heap grow to `O(n)` and costs `O(n log n)`. A monotonic deque
discards d

**Q9.** Write the three counting formulas (at most / exactly / at least) in one line each.
<details><summary>Answer</summary>
`atMost(K)`: shrink while `measure > K`, then `res += right - left + 1`.
`exactly(K) = atMost(K) - atMost(K-1)`.
`atLeast(K) = n(n+1)/2 - atMost(K-1)`, equivalently `ans += left` after shrinking while
still valid. Equality is never a shrink condition.
</details>

**Q10.** Why does `res += right - left + 1` not double-count nested windows?
<details><summary>Answer</summary>
Each increment only counts subarrays **ending at this `right`**. A nested window
`[L, R]` with `R < right` was billed when the outer loop was at that earlier `R`.
Summing over `right` partitions all subarrays by right endpoint — the sets are disjoint.
</details>ominated elements eagerly (smaller *and* older can never be the answer), giving
`O(n)` total and `O(k)` space.
</details>

---

## 15. Mini project — rolling-window rate limiter + streaming metrics

Sliding windows are not an interview toy: every rate limiter, every "p99 over the last
60s" dashboard, and every fraud rule is a window over a time-ordered stream. This
exercises Templates B and E plus §9a at once.

**Requirements**
1. `allow(key, now)` — at most `max_events` per `key` in any `window` seconds (exact log).
2. Rolling sum / count / average over the last `window` seconds, `O(1)` amortised.
3. Rolling **max** over the same window, `O(1)` amortised, via a monotonic deque.
4. Evict on read so memory tracks the live window, not total traffic.

```python
from collections import deque

class SlidingWindowRateLimiter:
    """Exact sliding log: at most max_events per key within `window` seconds."""
    def __init__(self, max_events, window):
        self.max_events, self.window = max_events, window
        self._log = {}                           # key -> deque of increasing timestamps

    def allow(self, key, now):
        dq = self._log.setdefault(key, deque())
        cutoff = now - self.window
        while dq and dq[0] <= cutoff: dq.popleft()   # amortised O(1): each ts leaves once
        if len(dq) >= self.max_events: return False
        dq.append(now)
        return True

class RollingMetrics:
    """Sum / count / average / max over a time-based sliding window."""
    def __init__(self, window):
        self.window = window
        self._points = deque()                   # (timestamp, value)
        self._sum = 0.0
        self._max_dq = deque()                   # (timestamp, value), values decreasing

    def record(self, ts, value):
        self._points.append((ts, value))
        self._sum += value
        while self._max_dq and self._max_dq[-1][1] <= value:
            self._max_dq.pop()                   # smaller AND older ⇒ can never win
        self._max_dq.append((ts, value))
        self._evict(ts)

    def _evict(self, now):
        cutoff = now - self.window
        while self._points and self._points[0][0] <= cutoff:
            self._sum -= self._points.popleft()[1]
        while self._max_dq and self._max_dq[0][0] <= cutoff:
            self._max_dq.popleft()

    def snapshot(self, now):
        self._evict(now)
        n = len(self._points)
        return {"count": n, "sum": self._sum,
                "avg": self._sum / n if n else 0.0,
                "max": self._max_dq[0][1] if self._max_dq else None}
```
**Time O(1) amortised per operation / Space O(events in window).**

**Extensions worth doing**
- Replace the exact log with a **fixed-window counter** (`O(1)` memory per key), then with
  the **sliding-window counter** approximation `prev_count · overlap + cur_count` — the
  trade-off real systems actually make.
- Add p50/p99 with a `SortedList` (§9d) and compare cost against the deque.
- Make eviction lazy vs eager and measure the tail-latency difference.
- Shard `_log` by key hash and reason about the worst-case memory bound.
