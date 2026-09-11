# Subarray Problems — Complete Guide

> Google DSA prep notes. Category: Arrays / Subarrays.
> Focus: prefix sums, hash maps, sliding window — and knowing which to reach for.

## 0. What is a "subarray"? (get the vocabulary right)

A **subarray** is a *contiguous* slice of an array: elements sitting next to each
other, `nums[i..j]`. Order is preserved and you cannot skip elements.

- **Subarray** = contiguous. `[2,3]` from `[1,2,3,4]` ✅. `[1,3]` ❌ (skipped 2).
- **Subsequence** = order kept, gaps allowed. `[1,3]` ✅.
- **Subset** = any selection, order irrelevant.

For an array of size `n` there are `n*(n+1)/2` subarrays. That's `O(n^2)` of them,
so **enumerating every subarray is already O(n^2)** before you even do work inside.
The whole game is: *avoid enumerating them all.*

---

## 1. The brute force baseline (always know it)

Every subarray problem has the same naive shape. Learn it once so you can always
fall back to it and then optimize.

```python
n = len(nums)
for i in range(n):              # start of subarray
    running = 0
    for j in range(i, n):       # end of subarray
        running += nums[j]      # nums[i..j], built incrementally
        # ... do something with the subarray sum "running"
```

Note the trick already: the **inner loop reuses `running`** instead of re-summing
from scratch. That's `O(n^2)`. A third loop to sum each subarray would be `O(n^3)`
— never do that.

---

## 2. The two master tools

Almost every subarray-sum problem is solved by **one of two** tools. Picking the
right one is 90% of the battle, and the deciding factor is *whether the array can
contain negative numbers*.

### Tool A — Prefix Sum + Hash Map  → works with **negatives**

**Prefix sum** `P[i]` = sum of the first `i` elements (`P[0] = 0`).

$$P[i] = nums[0] + nums[1] + \dots + nums[i-1]$$

The key identity — memorize this, everything flows from it:

$$\text{sum of } nums[i..j] = P[j+1] - P[i]$$

So "does a subarray sum to `k`?" becomes "do two prefix sums differ by `k`?":

$$P[j+1] - P[i] = k \iff P[i] = P[j+1] - k$$

As you sweep `j` left→right, you ask *"have I seen a prefix `P[j+1] - k` before?"*
A hash map storing prefix sums answers that in O(1). This is the universal pattern.

### Tool B — Sliding Window (two pointers) → needs **all positives**

A window `[left, right]` whose sum you grow by moving `right` and shrink by moving
`left`. It works **only when the sum is monotonic** as the window changes — i.e.
adding an element always *increases* the sum and removing one always *decreases*
it. That's guaranteed **only with positive numbers** (or all-non-negative for some
variants).

With a negative in the array, shrinking the window might *increase* the sum, so you
can never safely decide to move `left` — the window breaks. **That's exactly why
"subarray sum = k with negatives" cannot use sliding window and must use prefix +
hashmap.**

---

## 3. Decision table — which tool?

| Situation | Values | Tool | Why |
|---|---|---|---|
| Count/find subarrays with **sum == k** | any (incl. negatives) | **Prefix sum + hashmap** | need exact prefix match; window not monotonic |
| **Longest/shortest** subarray with sum == k | any | **Prefix sum + hashmap** (store first index) | store earliest index of each prefix |
| Subarray sum == k | **all positive** | Sliding window *or* prefix map | window is O(n) O(1) space |
| **Minimum length** subarray sum **≥ k** | all positive | **Sliding window** | monotonic → shrink greedily |
| **Maximum length** subarray sum **≤ k** | all positive | Sliding window | monotonic |
| Subarrays with **at most K** of something | positive/counts | Sliding window | monotonic constraint |
| **Exactly K** (count) | counts | `atMost(K) - atMost(K-1)` | classic reduction |
| Max subarray sum (any) | any | **Kadane** | running max, DP-lite |
| Divisibility / mod-k patterns | any | Prefix sum + hashmap **on `prefix % k`** | remainder identity |

**One-line rule of thumb:**
> Negatives present, or you need an *exact* sum/longest/count → **prefix + hashmap**.
> All positive, and you need *shortest/longest under a monotonic constraint* → **sliding window**.

---

## 4. Prefix + Hashmap — the three canonical templates

### 4a. COUNT subarrays with sum == k (works with negatives)

Store **frequency** of each prefix sum seen so far.

```python
def subarray_sum_count(nums, k):
    seen = {0: 1}          # prefix sum 0 seen once (empty prefix)
    prefix = 0
    count = 0
    for x in nums:
        prefix += x
        # a previous prefix == prefix - k means the gap sums to k
        count += seen.get(prefix - k, 0)
        seen[prefix] = seen.get(prefix, 0) + 1
    return count
```

Why `{0: 1}` seeding? A subarray starting at index 0 has left prefix `P[0] = 0`.
Without seeding, you'd miss every subarray that begins at the start.

### 4b. LONGEST subarray with sum == k (works with negatives)

Store the **first (earliest) index** each prefix appears — earliest left edge gives
the longest window.

```python
def longest_subarray_sum_k(nums, k):
    first_idx = {0: -1}    # prefix 0 lives "before" index 0
    prefix = 0
    best = 0
    for i, x in enumerate(nums):
        prefix += x
        if prefix - k in first_idx:
            best = max(best, i - first_idx[prefix - k])
        # only record the FIRST time (don't overwrite → keeps it earliest)
        if prefix not in first_idx:
            first_idx[prefix] = i
    return best
```

Rule: for **longest**, keep the *earliest* index (don't overwrite). For **shortest**
you'd keep the *latest* index (do overwrite).

### 4c. Divisibility — subarrays with sum divisible by k

Two prefixes with the **same remainder mod k** bracket a subarray divisible by k.
Store frequency of `prefix % k` (normalize negatives with `((p % k) + k) % k`).

```python
def subarrays_div_by_k(nums, k):
    seen = {0: 1}
    prefix = 0
    count = 0
    for x in nums:
        prefix += x
        r = ((prefix % k) + k) % k   # handle negative mod in Python-safe way
        count += seen.get(r, 0)
        seen[r] = seen.get(r, 0) + 1
    return count
```

---

## 5. Sliding Window — the two templates (positives only)

### 5a. Minimum length subarray with sum ≥ target

```python
def min_len_subarray(nums, target):
    left = 0
    window = 0
    best = float('inf')
    for right, x in enumerate(nums):
        window += x
        while window >= target:          # shrink while still valid
            best = min(best, right - left + 1)
            window -= nums[left]
            left += 1
    return best if best != float('inf') else 0
```

### 5b. "Exactly K" via "at most K" reduction (very common Google trick)

Counting subarrays with **exactly** K is awkward; counting **at most** K is a clean
sliding window. So:

$$\text{exactly}(K) = \text{atMost}(K) - \text{atMost}(K-1)$$

```python
def subarrays_with_exactly_k_odds(nums, k):
    def at_most(k):
        if k < 0: return 0
        left = 0; odds = 0; res = 0
        for right, x in enumerate(nums):
            odds += x % 2
            while odds > k:
                odds -= nums[left] % 2
                left += 1
            res += right - left + 1   # all windows ending at 'right' are valid
        return res
    return at_most(k) - at_most(k - 1)
```

The `res += right - left + 1` line is the sliding-window counting identity: every
subarray ending at `right` with `left` as the smallest valid start is valid.

---

## 6. Kadane — the maximum-subarray family (a whole toolkit, not one trick)

Kadane is **1-D dynamic programming**, not prefix-sum and not sliding-window. It has
exactly one state idea, and every variant below is a re-skin of it. Learn the state,
and a dozen "hard" problems collapse into the same five lines.

### 6.0 The single idea — "best subarray ending *here*"

Define, for each index `i`:

$$\text{end}[i] = \text{best answer for a subarray that is FORCED to end at } i$$

Every subarray ends *somewhere*. So if you know the best subarray ending at every
index and take the overall max, you've considered **all** subarrays — in one pass.
That's why it's `O(n)` time and `O(1)` space.

The recurrence is a binary choice at each element:

$$\text{end}[i] = \max\big(nums[i],\ \text{end}[i-1] + nums[i]\big)$$

> **Start fresh** at `nums[i]`, or **extend** the best run ending at `i-1`.
> You only extend when the carried value helps — i.e. when `end[i-1] > 0`.
> That is the entire "drop it when the running sum goes negative" intuition.

```python
def max_subarray(nums):
    best = cur = nums[0]
    for x in nums[1:]:
        cur = max(x, cur + x)   # extend previous, or start fresh at x
        best = max(best, cur)
    return best
```

Handles negatives naturally. Starting `best = cur = nums[0]` (not `0`) matters: an
all-negative array like `[-3,-1,-2]` must answer `-1`, not `0`. Seeding with `0`
silently assumes the empty subarray is allowed — usually it isn't.

### 6.1 The GENERIC Kadane template (the reusable engine)

Almost every variant keeps this skeleton and only changes three knobs:

1. **What `end` tracks** — a sum, a product, a count, a sum-with-a-deletion…
2. **The combine rule** — usually `max(x, end+x)`; products also track a `min`.
3. **Seed / reset** — first element, or the identity value.

```python
def kadane(nums, extend, base):
    """extend(prev_state, x) -> new_state ; base(x) -> fresh state at x"""
    end = base(nums[0])
    best = end
    for x in nums[1:]:
        end = extend(end, x)          # extend previous or start fresh (inside)
        best = max(best, end)         # or a custom 'better(best, end)'
    return best

# classic max-subarray-sum expressed through the engine:
max_sum = kadane(nums,
                 extend=lambda end, x: max(x, end + x),
                 base=lambda x: x)
```

You rarely write it this abstractly in an interview, but the mental model —
*"pick the state, pick the extend rule"* — is what lets you derive any variant on
the spot instead of memorizing each.

### 6.2 Return the indices (not just the value)

Track where the current run started; commit the boundaries when you beat `best`.

```python
def max_subarray_with_range(nums):
    best = cur = nums[0]
    start = best_l = best_r = 0
    for i in range(1, len(nums)):
        if cur + nums[i] < nums[i]:   # cheaper to start fresh
            cur = nums[i]
            start = i
        else:
            cur += nums[i]
        if cur > best:
            best, best_l, best_r = cur, start, i
    return best, best_l, best_r
```

### 6.3 Maximum Product Subarray (LC 152) — track max *and* min

Products break plain Kadane: a big **negative** times another negative becomes a big
positive. So the smallest (most negative) running product is also valuable. Keep
**both**, and swap them when the incoming element is negative.

```python
def max_product(nums):
    best = cur_max = cur_min = nums[0]
    for x in nums[1:]:
        if x < 0:
            cur_max, cur_min = cur_min, cur_max   # negative flips roles
        cur_max = max(x, cur_max * x)
        cur_min = min(x, cur_min * x)
        best = max(best, cur_max)
    return best
```

Same skeleton — the state just grew from one number to a `(max, min)` pair.

### 6.4 Maximum Sum Circular Subarray (LC 918) — two cases

**The case split (both approaches rest on this).** Any circular subarray has exactly
one of two shapes:

1. **Non-wrapping** — an ordinary subarray → plain Kadane.
2. **Wrapping** — a **prefix** plus a non-overlapping **suffix**, skipping a middle chunk.

So `answer = max(best_non_wrapping, best_wrapping)`. The approaches differ only in
how they get the wrapping case.

#### Approach 1 — enumerate prefix + suffix — `O(n)` time, `O(n)` space

Model shape 2 literally. Precompute `right_max[i]` = largest suffix sum starting at
or after `i` (built right-to-left). Then sweep prefixes left-to-right and pair the
running prefix with `right_max[i+1]`, which is non-overlapping by construction.

```python
def max_circular_prefix_suffix(nums):
    n = len(nums)
    right_max = [0] * n
    right_max[n - 1] = suffix = nums[n - 1]
    for i in range(n - 2, -1, -1):
        suffix += nums[i]
        right_max[i] = max(right_max[i + 1], suffix)

    special = float('-inf')          # best wrapping sum
    prefix = 0
    for i in range(n - 1):           # stop at n-2 so a suffix always remains
        prefix += nums[i]
        special = max(special, prefix + right_max[i + 1])
    return max(max_subarray(nums), special)
```

More intuitive, but costs the auxiliary array.

#### Approach 2 — total − minimum subarray — `O(n)` time, `O(1)` space

The clever reframe: a wrapping subarray is **everything except a contiguous middle
chunk**, so `wrapping = total - middle`. To *maximize* the wrap, **minimize the
middle** — which is just Kadane with `min` instead of `max`.

```python
def max_circular(nums):
    total = 0
    cur_max = best_max = nums[0]
    cur_min = best_min = nums[0]
    for i, x in enumerate(nums):
        total += x
        if i:
            cur_max = max(x, cur_max + x); best_max = max(best_max, cur_max)
            cur_min = min(x, cur_min + x); best_min = min(best_min, cur_min)
    if best_max < 0:            # all negative → don't take empty wrap
        return best_max
    return max(best_max, total - best_min)
```

#### The one trap — the empty-subarray guard

If the minimum subarray is the *whole* array, then `total - best_min == 0`, which
represents the **empty** subarray — illegal, since the answer must be non-empty.

Two correct guards, and they are **not** the same condition:

- Editorial: `if best_min == total: return best_max`.
- Above: `if best_max < 0: return best_max` (i.e. all elements negative).

All-negative ⇒ `best_min == total`, but **not** conversely. On `[-2,1,-2]`:
`total = -3`, `best_min = -3` (equal!), yet `best_max = 1 > 0`. The `best_max < 0`
version still answers correctly because `total - best_min = 0` simply loses to
`best_max = 1`. General reason: whenever the array has any non-negative element,
`best_max >= 0`, so `max(best_max, 0)` is just `best_max`.

### 6.5 Minimum Subarray Sum — same engine, flipped

Swap every `max` for `min`. Useful as a building block (see 6.4) and on its own.

```python
def min_subarray(nums):
    best = cur = nums[0]
    for x in nums[1:]:
        cur = min(x, cur + x)
        best = min(best, cur)
    return best
```

### 6.6 Max Subarray Sum with **at most one deletion** (LC 1186)

Two states per index: best run ending here with **0** deletions and with **1**.

```python
def max_sum_one_deletion(nums):
    no_del = nums[0]           # best ending here, nothing deleted
    one_del = nums[0]          # best ending here, one element deleted
    best = nums[0]
    for x in nums[1:]:
        one_del = max(no_del,          # delete current x (carry prev no_del)
                      one_del + x)      # already deleted earlier, extend
        no_del = max(x, no_del + x)     # ordinary Kadane
        best = max(best, no_del, one_del)
    return best
```

This "one extra dimension of state" is the standard way to upgrade Kadane. The same
move solves *"at most k deletions"*, *"one negation allowed"*, etc.

### 6.7 2-D Kadane — maximum-sum submatrix (`O(cols² · rows)`)

Fix a pair of columns `(l, r)`, compress every row to a single number (its sum over
those columns), then run **1-D Kadane** on that compressed array. Best over all
column pairs is the answer.

```python
def max_submatrix(mat):
    rows, cols = len(mat), len(mat[0])
    best = float('-inf')
    for l in range(cols):
        row_sum = [0] * rows
        for r in range(l, cols):
            for i in range(rows):
                row_sum[i] += mat[i][r]   # widen the column band
            best = max(best, max_subarray(row_sum))  # reuse 1-D Kadane!
    return best
```

The lesson: **higher-dimensional problems reduce to 1-D Kadane by collapsing a
dimension.** Reuse, don't reinvent.

### 6.8 How to *recognize* a Kadane problem

Reach for this family when **all** of these hold:

- The objects are **contiguous** subarrays (not subsequences).
- You want an **optimum** (max/min sum, max product, best under a small constraint)
  — not a *count* and not an *exact target* (those are prefix-map / sliding-window).
- The answer for position `i` can be built from the answer at `i-1` plus `nums[i]`
  (optimal-substructure with a tiny, fixed state).

If instead you need *count of subarrays* or *exact sum == k*, go back to
prefix + hashmap (§4). If you need *shortest/longest under a monotonic constraint*
with positives, go to sliding window (§5). Kadane owns the **"best value"** column.

### 6.9 The Kadane cheat-sheet

| Problem | State you carry | Combine rule |
|---|---|---|
| Max subarray sum (LC 53) | `cur` | `max(x, cur+x)` |
| Min subarray sum | `cur` | `min(x, cur+x)` |
| Max product (LC 152) | `(cur_max, cur_min)` | swap on `x<0`, then max/min |
| Circular max (LC 918) | Kadane max **and** min + `total` | `max(best_max, total-best_min)` |
| One deletion (LC 1186) | `(no_del, one_del)` | see 6.6 |
| 2-D submatrix | compressed row array | fix col-pair → 1-D Kadane |

---

## 7. Mental checklist before you code

1. **Contiguous?** If not, it's a subsequence problem — different toolbox.
2. **Any negatives?** Yes → prefix + hashmap. No → sliding window is on the table.
3. **What's asked?** count / longest / shortest / max-sum / divisibility → pick
   the matching template above.
4. **Seed the map right:** `{0: 1}` for counting, `{0: -1}` for longest-index.
5. **Longest vs shortest index rule:** longest = keep earliest, shortest = keep latest.

---

## 8. Practice problems (in order — do them in this sequence)

Work these top-to-bottom; each builds on the previous. Try before looking up.

### Warm-up (build the reflexes)
1. **Maximum Subarray** (LC 53) — Kadane. Confirm the "drop when negative" intuition.
2. **Subarray Sum Equals K** (LC 560) — the count template 4a. THE core problem.
3. **Minimum Size Subarray Sum** (LC 209, positives) — sliding window 5a.

### Kadane family (the §6 toolkit — do them back to back)
K1. **Maximum Product Subarray** (LC 152) — carry `(max, min)`, §6.3.
K2. **Maximum Sum Circular Subarray** (LC 918) — two-case + total−min, §6.4.
K3. **Maximum Sum with One Deletion** (LC 1186) — extra state dimension, §6.6.
K4. **Best Time to Buy and Sell Stock** (LC 121) — Kadane in disguise (max of
    running gains; it *is* max-subarray on the diff array).
K5. **Maximum Sum Rectangle in a 2D Matrix** — column-pair compression + 1-D
    Kadane, §6.7.

### Core (prefix + hashmap with negatives)
4. **Longest Subarray with Sum K** (has negatives) — template 4b.
5. **Contiguous Array** (LC 525) — longest subarray with equal 0s and 1s.
   *Hint:* map 0 → -1, then it's "longest subarray sum == 0".
6. **Subarray Sums Divisible by K** (LC 974) — template 4c, mind negative mod.
7. **Continuous Subarray Array** (LC 523) — subarray sum multiple of k, length ≥ 2.

### Sliding window mastery
8. **Binary Subarrays With Sum** (LC 930) — exactly K via atMost, template 5b.
9. **Subarrays with K Different Integers** (LC 992) — exactly K distinct, atMost trick.
10. **Fruit Into Baskets** (LC 904) — longest subarray with ≤ 2 distinct.
11. **Max Consecutive Ones III** (LC 1004) — longest window with ≤ k zeros.

### Mixed / harder
12. **Maximum Size Subarray Sum Equals k** (LC 325) — longest, negatives allowed.
13. **Count Number of Nice Subarrays** (LC 1248) — exactly k odds (5b example).
14. **Shortest Subarray with Sum at Least K** (LC 862) — **negatives + monotonic
    deque**; the hard boss that shows why plain window fails with negatives.

### How to self-check
For each, before coding write down: (a) negatives? (b) tool chosen and *why*,
(c) map seeding, (d) longest vs shortest index rule. If you can state those four,
the code writes itself.
```
