# Binary Search — Complete Guide

> Google DSA prep notes. Category: Binary Search (all forms).
> The one idea in this file: binary search is **not** "search a sorted array",
> it is **"find the boundary of a monotonic predicate"**. Everything below is a
> re-skin of that single sentence.

## 1. The real definition — the FFFF…TTTT model

Forget `nums` for a second. Imagine a function `P(x) -> bool` defined over a
range of candidates `x = lo … hi`. Binary search applies **iff** the sequence of
answers looks like this:

```
index:  0  1  2  3  4  5  6  7  8  9
P(x) :  F  F  F  F  T  T  T  T  T  T
                    ^
                    the boundary — the first True
```

That is the only requirement: **once `P` becomes True it never goes back to
False** (monotonic). The array being sorted is just *one common way* to get such
a predicate. If `nums` is sorted ascending and `P(i) = nums[i] >= target`, then
`P` is FFFF…TTTT and the first True is exactly `bisect_left`.

The ritual for **every** binary search problem:

1. **Name the search space.** Index? eating speed? capacity? matrix value? partition point?
2. **Write `P(x)` as a yes/no question** that goes False then True (or flip it).
3. **Prove monotonicity in one sentence.** "If speed `k` works, `k+1` works too."
   If you can't say that sentence, binary search is *wrong* here.
4. **Return the boundary**, never "the element".

```python
def boundary(lo, hi, P):                 # search space is half-open [lo, hi)
    """Smallest x in [lo, hi) with P(x) True. Returns hi if none."""
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if P(mid):
            hi = mid                     # mid might be the answer, keep it
        else:
            lo = mid + 1                 # mid is definitely F, discard it
    return lo
```
**Time O(log n) predicate calls · Space O(1).**

Everything in this file is that function with a different `P`.

**Mental trigger:** the moment you can say *"if X works then anything bigger
also works"*, stop thinking and binary search on X.

Two corollaries: **last False** = `boundary(...) - 1` (never write a second
loop for it), and a TTTT…FFFF predicate is just `not P` — don't invent a new
template.

---

## 2. Mid, overflow, and the three loop styles

### Why `lo + (hi - lo) // 2`

In C++/Java `(lo + hi) / 2` overflows 32-bit int near `2^31`; `lo + (hi-lo)//2`
can't, since `hi - lo` fits. Python ints are arbitrary precision so it's
cosmetic here — but interviewers ask, so write it reflexively.

`//` floors, so `mid` is biased toward `lo`. Therefore `lo = mid` (no `+1`) with
floor-mid and `hi == lo + 1` gives `mid == lo` and nothing changes →
**infinite loop**. Rules:

- `lo = mid + 1` pairs with floor mid  (`(lo + hi) // 2`).
- `lo = mid` (rare, "upper" style) **requires** ceiling mid:
  `mid = lo + (hi - lo + 1) // 2`.

### Style 1 — `while lo < hi` (half-open `[lo, hi)`) ✅ recommended

```python
lo, hi = 0, n                 # hi is EXCLUSIVE — n is a legal "not found" answer
while lo < hi:
    mid = lo + (hi - lo) // 2
    if P(mid): hi = mid
    else:      lo = mid + 1
return lo                     # lo == hi == boundary
```
Invariant: everything `< lo` is False, everything `>= hi` is True. Since
`lo <= mid < hi`, the window shrinks by ≥1 every iteration → **cannot infinite
loop**. On exit `lo == hi` *is* the answer. No post-loop fixup.

### Style 2 — `while lo <= hi` (closed `[lo, hi]`)

```python
lo, hi = 0, n - 1
while lo <= hi:
    mid = lo + (hi - lo) // 2
    if nums[mid] == target: return mid
    if nums[mid] < target:  lo = mid + 1
    else:                   hi = mid - 1
return -1
```
Fine for **exact-match only** — both sides move past `mid`, so termination is
safe. For boundary questions you must recall the post-loop trivia (`hi` ends at
last-False, `lo` at first-True), which is where people lose 5 minutes.

### Style 3 — `while hi - lo > 1` (open interval, two sentinels)

```python
lo, hi = -1, n                # both sentinels are OUTSIDE the array
while hi - lo > 1:
    mid = (lo + hi) // 2
    if P(mid): hi = mid
    else:      lo = mid
return hi                     # hi = first True, lo = last False, both free
```
Never needs `mid ± 1`, hands you both boundaries, terminates because
`lo < mid < hi` strictly. Downside: the sentinels are out of range, so never
touch `nums[lo]`/`nums[hi]` without a guard.

### Recommendation

**Use Style 1 (`while lo < hi`, half-open) for everything.** One template, no
post-loop reasoning, and `hi = n` naturally encodes "not found". Use Style 2
only for literal "return index of target or -1" with early exit. Memorise one;
the others are for reading other people's code.

### 2.1 The two predicate shapes — `first_true` and `last_true`

Every problem in this file is one of these two. Both use Style 1; the second is
the first one with `P` inverted.

**FFFF…TTTT — first True (minimize).** Use when *"if `x` works, `x+1` works"*.

```
x:  lo  …          …  hi-1
P:  F  F  F  F  T  T  T  T
                ^ return this
```

```python
def first_true(lo, hi, P):
    """Smallest x in [lo, hi) with P(x). Returns hi if none."""
    while lo < hi:
        mid = lo + (hi - lo) // 2        # floor mid
        if P(mid): hi = mid              # mid might be the first True
        else:      lo = mid + 1          # mid is definitely False
    return lo                            # lo == hi == boundary
```
Last False = `first_true(...) - 1`. Equality in `P` is success: `hours <= h`,
`arr[i] >= x`, `count >= k`.

**TTTT…FFFF — last True (maximize).** Use when *"if `x` works, `x-1` works"* —
bigger is harder (magnetic force, aggressive cows).

```
x:  lo  …          …  hi-1
P:  T  T  T  T  F  F  F  F
                ^ return this
```

```python
def last_true(lo, hi, P):
    """Largest x in [lo, hi) with P(x). Returns lo-1 if none.
    hi must be one past the last candidate so 'everything works' still has a
    first False to land on."""
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if not P(mid): hi = mid          # first fail == first_true(not P)
        else:          lo = mid + 1
    return lo                       
    # last True = first False - 1 ie lo - 1
```

Direct version, if you refuse to invert — **`lo = mid` forces ceiling mid** or
it hangs, and `hi` becomes inclusive:

```python
def last_true_direct(lo, hi, P):         # hi INCLUSIVE
    while lo < hi:
        mid = lo + (hi - lo + 1) // 2    # CEIL mid
        if P(mid): lo = mid              # still True → push right
        else:      hi = mid - 1
    return lo
```

| | FFFF…TTTT | TTTT…FFFF (invert) | TTTT…FFFF (direct) |
| --- | --- | --- | --- |
| Want | first True | last True | last True |
| `mid` | floor | floor | **ceil** |
| if `P(mid)` | `hi = mid` | `lo = mid + 1` | `lo = mid` |
| else | `lo = mid + 1` | `hi = mid` | `hi = mid - 1` |
| return | `lo` | `lo - 1` | `lo` |
| `hi` | exclusive | exclusive | inclusive |

`while lo < hi` is the **window** condition — it is never the problem's
`<=`/`>=`. Picker: *"if `x` works ⇒ `x+1` works?"* Yes → `first_true`.
No → `last_true`. Don't memorise a third template.

---

## 3. Template A — `bisect_left` / `bisect_right` from scratch

Both are the boundary function with different predicates.

```python
def bisect_left(nums, target):           # first index with nums[i] >= target
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] >= target: hi = mid          # P: nums[mid] >= target
        else:                   lo = mid + 1
    return lo

def bisect_right(nums, target):          # first index with nums[i] > target
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] > target:  hi = mid          # P: nums[mid] > target
        else:                   lo = mid + 1
    return lo
```
**Time O(log n) · Space O(1).**

The *only* difference is `>=` vs `>`. `bisect_left` inserts before an equal run,
`bisect_right` after it. That's the whole story.

### 3.1 The search space for Template A — always `[0, n)`

Same rule as §4.2, just instantiated on indices. Candidates are `A = 0` to
`B = n - 1`, so the window is `lo, hi = 0, B + 1 = 0, n`. **Half-open, never
`[0, n-1]`.** The out-of-range sentinel isn't an edge case here — it *is* an
answer you want:

| Shape | window | return | outputs | sentinel means |
| --- | --- | --- | --- | --- |
| `first_true` | `[0, n)` | `lo` | `0 … n` | `n` = no such element / insert at end |
| `last_true` (invert) | `[0, n)` | `lo - 1` | `-1 … n-1` | `-1` = no such element |

That's why `bisect_left` returning `len(a)` is a feature, not a bug — it's the
insert position for LC 35 and the "not found" flag at the same time.

**You only ever need two predicates.** On ascending data every index question is
one of these, plus `±1` arithmetic:

| Want | `P(i)` | Shape | Expression |
| --- | --- | --- | --- |
| first `>= x` (ceil, lower_bound) | `a[i] >= x` | first True | `bisect_left(a, x)` |
| first `> x` (successor, upper_bound) | `a[i] > x` | first True | `bisect_right(a, x)` |
| last `<= x` (floor) | `a[i] > x` | first True `- 1` | `bisect_right(a, x) - 1` |
| last `< x` (predecessor) | `a[i] >= x` | first True `- 1` | `bisect_left(a, x) - 1` |

Note the last two are `last_true` questions but are written as `first_true - 1`
— the invert form, done for you. Don't write a `lo = mid` loop for a floor.

**The one mandatory guard.** `lo` can equal `n`, so never touch `a[lo]` bare:

```python
i = bisect_left(a, x)
found = i < len(a) and a[i] == x         # both halves required
j = bisect_right(a, x) - 1
floor_val = a[j] if j >= 0 else None     # j == -1 when x < a[0]
```

### What Python gives you

```python
from bisect import bisect_left, bisect_right, insort
bisect_left(a, x)             # == lower_bound
bisect_right(a, x)            # == upper_bound  (alias: bisect)
bisect_left(a, x, lo, hi)     # restrict to a slice WITHOUT copying — use this
insort(a, x)                  # insert keeping sorted order: O(n) due to shift!
bisect_left(a, x, key=...)    # Python 3.10+: search a list of objects
```
Gotchas: `insort` is `O(n)` (list shift), not `O(log n)`; and `bisect` only
works on **ascending** data — for descending, negate the values and the target.

### Everything reduces to these two

```python
i = bisect_left(a, x)
first_occurrence = i if i < len(a) and a[i] == x else -1   # LC 34 left end
last_occurrence  = bisect_right(a, x) - 1                  # LC 34 right end
count_of_x       = bisect_right(a, x) - bisect_left(a, x)
insert_position  = bisect_left(a, x)                       # LC 35
contains         = i < len(a) and a[i] == x

floor_index   = bisect_right(a, x) - 1     # largest a[j] <= x  (-1 if none)
ceil_index    = bisect_left(a, x)          # smallest a[j] >= x (len if none)
pred_index    = bisect_left(a, x) - 1      # largest a[j] <  x
succ_index    = bisect_right(a, x)         # smallest a[j] >  x
```

### Phrasing → call

| Question phrasing | Call |
| --- | --- |
| "insert position to keep sorted" | `bisect_left(a, x)` |
| "first index equal to x" | `bisect_left`, then verify `a[i] == x` |
| "last index equal to x" | `bisect_right(a, x) - 1` |
| "how many equal x" | `bisect_right - bisect_left` |
| "how many strictly less than x" | `bisect_left(a, x)` |
| "how many <= x" | `bisect_right(a, x)` |
| "how many in `[lo, hi]`" | `bisect_right(a, hi) - bisect_left(a, lo)` |
| "largest value <= x (floor)" | `a[bisect_right(a, x) - 1]` |
| "smallest value >= x (ceiling)" | `a[bisect_left(a, x)]` |
| "strictly greater successor" | `a[bisect_right(a, x)]` |

**Mental trigger:** the words *first / last / count / insert / floor / ceiling*
on sorted data → you are writing one `bisect` line, not a loop.

---

## 4. Template B — Binary search on the ANSWER (parametric search)

This is the #1 interview form. The array is *not* what you search; the **answer
value** is. You search `x` over `[lo, hi]` and ask `feasible(x)`.

```python
def min_feasible(lo, hi, feasible):
    """Smallest x in [lo, hi] with feasible(x) True. Assumes some x works."""
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if feasible(mid): hi = mid
        else:             lo = mid + 1
    return lo
```
**Time O(log(range) · cost(feasible)) · Space O(1).**

Finding the pieces:

- **`lo`** = smallest conceivably legal value (often `1`, or `max(nums)` when
  every element must fit somewhere).
- **`hi`** = a value that is *definitely* feasible (often `sum(nums)`). Being
  generous costs one `log` step; too tight is a **wrong answer**. Over-shoot.
- **`feasible(x)`** = a greedy simulation, usually `O(n)`.

**Mental trigger:** *"minimize the maximum"*, *"maximize the minimum"*,
*"smallest capacity / speed / size such that …"* → binary search on the answer.

### 4.1 Finalising the search space — what `hi` actually means

`hi` is **exclusive as a window** (`mid` is always `< hi`) but that does *not*
mean `hi` can't be the answer. What matters is **what the loop returns**:

| Shape | returns | max possible return | so `hi` must be… |
| --- | --- | --- | --- |
| `first_true` (minimize) | `lo` | `hi` | a value **guaranteed feasible** |
| `last_true` invert (maximize) | `lo - 1` | `hi - 1` | a value **guaranteed infeasible** (= last candidate `+ 1`) |
| `last_true_direct` | `lo` | `hi` | the last candidate, **inclusive** |

That single row difference is the whole `hi = max(arr)` vs `hi = max(arr) + 1`
question.

- **Minimize.** `hi = sum(weights)` (ship in 1 day) or `hi = max(piles)` (1 hour
  per pile) are *definitely feasible*, so `return lo` landing on `hi` is a
  correct answer even though `hi` was never probed as `mid`. Untested ≠ unreturnable.
- **Maximize.** With `return lo - 1`, `hi` is the **landing pad for the first
  False**. If the true answer is `max(arr)` and you set `hi = max(arr)`, the
  first False has nowhere to land and you silently return `max - 1`. Use
  `hi = max(arr) + 1`.

Same logic on the low end: `first_true` can return `lo`, so `lo` must be
≤ the answer; `last_true` invert returns `lo - 1`, so `lo - 1` must be the legal
"nothing works" sentinel (usually `0` or `-1`).

The checklist:

1. Write `P(x)` and confirm monotonicity.
2. Pick the shape → that fixes the return statement.
3. Set `lo` = smallest value for which `P` is even **well-defined** (`max(nums)`
   in LC 410, because a limit below the largest element makes the greedy
   meaningless), not merely the smallest number you can think of.
4. Set `hi` per the table: feasible sentinel for minimize, infeasible sentinel
   for maximize.
5. Sanity-test the two extremes — "answer is the smallest candidate" and
   "answer is the largest candidate". Both off-by-ones live there.

### 4.2 The universal bound — stop case-splitting, use `hi = B + 1`

`sum(arr)` / `max(arr)` **are** legal answers, so they belong in the candidate
set. Keep two things separate:

- **candidate set** `[A, B]` — every value that could legitimately be returned.
- **loop window** `[lo, hi)` — every value probed as `mid`.

They are not the same interval, and the `+1` is just the conversion between
them. One rule covers both shapes:

```python
lo, hi = A, B + 1                        # ALWAYS one past the last candidate
```

Then the template's own return statement handles the ends:

| Shape | body | return | range of outputs | "impossible" reads as |
| --- | --- | --- | --- | --- |
| minimize | `if P: hi = mid else: lo = mid + 1` | `lo` | `A … B+1` | `B + 1` |
| maximize | `if not P: hi = mid else: lo = mid + 1` | `lo - 1` | `A-1 … B` | `A - 1` |

Both reach every real candidate, and each overshoots by exactly one on the side
where "no answer exists" needs to be expressed. Nothing to memorise per problem.

Worked bounds under this one rule:

| Problem | `A` | `B` | `lo, hi` | return |
| --- | --- | --- | --- | --- |
| Koko (875) | `1` | `max(piles)` | `1, max+1` | `lo` |
| Ship in D days (1011) | `max(w)` | `sum(w)` | `max(w), sum(w)+1` | `lo` |
| Split array (410) | `max(nums)` | `sum(nums)` | `max, sum+1` | `lo` |
| Bouquets (1482) | `min(bloom)` | `max(bloom)` | `min, max+1` | `lo` |
| Max candies (2226) | `1` | `max(candies)` | `1, max+1` | `lo - 1` |
| Magnetic force (1552) | `1` | `pos[-1]-pos[0]` | `1, span+1` | `lo - 1` |

The textbook `hi = sum(weights)` (no `+1`) is a one-step **optimisation**, valid
only because `sum` is provably feasible so `return lo` can land on it. It saves
nothing measurable — `log` of one extra value. Writing `B + 1` everywhere is the
version you can't get wrong under interview pressure.

Only exception: `last_true_direct` (`lo = mid` + ceil mid) wants `hi = B`
inclusive. That's the reason to prefer the invert form and keep one convention.

### Koko Eating Bananas (LC 875)

Speed `k`; hours needed = `sum(ceil(p/k))`. Bigger `k` ⇒ fewer hours ⇒ if `k`
works, `k+1` works. Monotone. ✅

```python
def min_eating_speed(piles, h):
    lo, hi = 1, max(piles)                       # speed > max(piles) is pointless
    while lo < hi:
        k = lo + (hi - lo) // 2
        hours = sum((p + k - 1) // k for p in piles)   # ceil division
        if hours <= h: hi = k                    # feasible → try slower
        else:          lo = k + 1
    return lo
```
**Time O(n log max(piles)) · Space O(1).**

### Capacity to Ship Packages Within D Days (LC 1011)

Order is fixed, so `feasible` is a straight greedy fill.

```python
def ship_within_days(weights, days):
    lo, hi = max(weights), sum(weights)          # lo: heaviest item must fit
    while lo < hi:
        cap = lo + (hi - lo) // 2
        need, cur = 1, 0
        for w in weights:
            if cur + w > cap:                    # start a new day
                need += 1; cur = 0
            cur += w
        if need <= days: hi = cap
        else:            lo = cap + 1
    return lo
```
**Time O(n log(sum)) · Space O(1).**

### Split Array Largest Sum (LC 410)

Identical to shipping — same `lo/hi`, same greedy. Recognising that two
"different" hard problems are one function is the skill being tested.

```python
def split_array(nums, k):
    def parts(limit):
        cnt, cur = 1, 0
        for v in nums:
            if cur + v > limit: cnt += 1; cur = 0
            cur += v
        return cnt
    lo, hi = max(nums), sum(nums)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if parts(mid) <= k: hi = mid             # NOT == k
        else:               lo = mid + 1
    return lo
```
**Time O(n log(sum)) · Space O(1).** (DP alternative is `O(n²k)` — mention both.)

**Why `<= k` when the statement says "exactly k".** `parts(limit)` is the
*minimum* number of groups the greedy needs. Bigger `limit` never needs more
groups, so `parts` is non-increasing. That makes `P(limit) = parts(limit) <= k`
FFFF…TTTT. `parts(limit) == k` is **not** monotone:

```
nums = [1,1,1,1], k = 2
limit:  1  2  3  4
parts:  4  2  2  1
== 2:   F  T  T  F     ← no single boundary
<= 2:   F  T  T  T     ← first True is the answer
```

The conversion "exactly k" → "at most k" is legal here because **splitting is
free**: if a partition into `p < k` groups already has max-sum `<= limit`, you
can cut extra groups out of existing ones (nums are non-negative) without
raising the max. So any feasible `limit` for fewer groups is also feasible for
exactly `k`. Binary search therefore hunts the first `limit` with
`parts(limit) <= k`. Same lemma turns LC 1011's "within D days" into the same
check: unused days = unused extra splits.

### Minimum Days to Make m Bouquets (LC 1482)

Search space is *days*. More days ⇒ more bloomed flowers ⇒ more bouquets.

```python
def min_days(bloom_day, m, k):
    if m * k > len(bloom_day): return -1         # impossible, check first
    def enough(day):
        made = run = 0
        for b in bloom_day:
            run = run + 1 if b <= day else 0     # consecutive bloomed run
            if run == k:
                made += 1; run = 0               # consume the window
        return made >= m
    lo, hi = min(bloom_day), max(bloom_day)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if enough(mid): hi = mid
        else:           lo = mid + 1
    return lo
```
**Time O(n log(max day)) · Space O(1).**

### Magnetic Force Between Two Balls (LC 1552) / Aggressive Cows

Now we **maximize the minimum** gap, so feasibility is TTTT…FFFF: a small gap is
easy, a large gap is impossible. Search for the *last* True.

```python
def max_distance(position, m):
    position.sort()
    def can(gap):                                # place greedily, leftmost first
        cnt, last = 1, position[0]
        for p in position[1:]:
            if p - last >= gap:
                cnt += 1; last = p
        return cnt >= m
    lo, hi = 1, position[-1] - position[0]
    while lo < hi:
        mid = lo + (hi - lo + 1) // 2            # CEIL mid, because lo = mid
        if can(mid): lo = mid                    # feasible → push for bigger
        else:        hi = mid - 1
    return lo
```
**Time O(n log n + n log(range)) · Space O(1).**

Two changes for maximize-the-minimum: **ceiling mid** and `lo = mid`. Forget the
ceiling and you hang forever. (Or keep the canonical template: find the first
gap that *fails*, subtract 1.)

**Why `sort()` here but never in LC 410 / 1011.** Ask what the input array
*means*:

| Input means | Sort? | Problems |
| --- | --- | --- |
| A **sequence** — order is part of the constraint | **Never** (it changes the answer) | 410 split array, 1011 shipping, 1482 bouquets (adjacent flowers) |
| A **set** — you pick elements, order is not constrained | Sort **if** the greedy walks neighbours | 1552, aggressive cows |
| A **set**, and `feasible` is an order-free sum | No need | 875 Koko, 2226 candies |

Splitting into *contiguous* subarrays and shipping *in the given order* are
sequence problems — sorting would solve a different question. Stall positions
are a set: sorting doesn't add or remove a stall, so it's free.

And the cow greedy *requires* sorted input, because "place at the first stall
`>= last + gap`" is only an exchange-argument optimum when you scan in
increasing coordinate order. Unsorted `[1,2,8,4,9]`, `gap=3`, `m=3`:

```text
unsorted: last=1 → 8 (cnt 2) → 4,9 both < last+3   → cnt 2, "infeasible"  ✗
sorted:   1 → 4 (cnt 2) → 8 (cnt 3)                → cnt 3, "feasible"    ✓
```

`p - last` even goes negative on unsorted data, so `feasible` stops being
monotone and binary search is silently invalid. Cost is `O(n log n)` once,
outside the loop — never sort inside `can()`.

---

## 5. Template C — Binary search on floats

You cannot iterate to `lo == hi` with floats. Two options:

```python
# Option 1: epsilon — needs care choosing eps relative to magnitude
while hi - lo > 1e-9:
    mid = (lo + hi) / 2
    if feasible(mid): hi = mid
    else:             lo = mid

# Option 2: fixed iterations — ALWAYS terminates, no eps tuning. Prefer this.
for _ in range(100):                 # 100 halvings ≈ 2^-100 relative error
    mid = (lo + hi) / 2
    if feasible(mid): hi = mid
    else:             lo = mid
return lo
```
**Time O(100 · cost(feasible)) ≈ O(cost) · Space O(1).**

~50 iterations already exhausts double precision, so 100 is free insurance. It
also dodges the classic hang where `hi - lo > 1e-9` never goes false because the
values are ~1e18 and the gap can't shrink below one ULP.

### Integer sqrt (LC 69) — the integer version

```python
def my_sqrt(x):
    lo, hi = 0, x + 1                            # half-open; +1 covers x = 0,1
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if mid * mid > x: hi = mid               # P: mid too big
        else:             lo = mid + 1
    return lo - 1                                # last False = floor(sqrt(x))
```
**Time O(log x) · Space O(1).** Valid Perfect Square (LC 367) = same, then check
`lo*lo == x`.

### Decimal sqrt — `while` loop, and when to stop

Same `P`: `mid * mid > x` is FFFF…TTTT, first True is `ceil(sqrt(x))`. On
floats you **cannot** wait for `lo == hi` — IEEE-754 never lands there. You
stop when the window is small enough *for the requested precision*.

**Decide the stop from the problem, not from habit.** If the statement says
"absolute error `< 1e-6`", the window width is the error:

```
|answer - true| ≤ hi - lo
```

so `while hi - lo > eps` with `eps = 1e-6` (or `1e-7` for a safety digit) is
the *definition* of done. Relative error (`"6 significant digits"`) uses
`while hi - lo > eps * max(1.0, hi)` instead, otherwise tiny answers never
meet an absolute `1e-9` and huge answers never shrink below one ULP.

```python
def sqrt_float(x, eps=1e-9):
    if x < 0: raise ValueError("domain")
    if x == 0 or x == 1: return float(x)
    lo, hi = (1.0, x) if x > 1 else (x, 1.0)     # sqrt(x) lives in here
    while hi - lo > eps:
        mid = (lo + hi) / 2
        if mid * mid > x: hi = mid               # same P as the integer version
        else:             lo = mid               # keep mid: it may still be the root
    return (lo + hi) / 2                         # or lo, or hi — all within eps
```
**Time O(log((hi-lo)/eps)) · Space O(1).** ~30 iterations for `eps = 1e-9` on
typical `x`.

Three things that differ from the integer loop, all forced by floats:

1. **No `mid ± 1`.** There is no next representable you can name portably, so
   both branches keep `mid`. The window still halves every step.
2. **`hi` starts at `x` (or `1`), not `x+1`.** The real square root of `x > 1`
   is `< x`, so `x` is already a strict infeasible sentinel. For `0 < x < 1`,
   `sqrt(x) > x`, so swap the bounds — that's why the `if x > 1` line exists.
3. **Return anything in `[lo, hi]`.** After the loop they differ by `< eps`.
   Averaging is cosmetic.

**When the `while` hangs.** If `x ≈ 1e18` and `eps = 1e-9`, `hi - lo` cannot
drop below one ULP of `x` (~0.25), so `> 1e-9` stays True forever. Two
escapes, prefer the second:

```python
# (a) cap the loop — still a while, just with a fuse
it = 0
while hi - lo > eps and it < 100:
    mid = (lo + hi) / 2
    if mid * mid > x: hi = mid
    else:             lo = mid
    it += 1

# (b) drop eps entirely (Template C option 2)
for _ in range(100):                             # 2^-100, past double precision
    mid = (lo + hi) / 2
    if mid * mid > x: hi = mid
    else:             lo = mid
return (lo + hi) / 2
```

Interview default: **100 iterations, no `eps`.** Use the `while hi - lo > eps`
form only when the statement names an absolute error and `x` is known to be
moderate. Same `P`, same branches as LC 69 — only the stop condition changes.

### Square root to `p` decimal places // 

Asked for `p` digits after the decimal, not an `eps`. Stop when the window is
narrower than one unit in the last place: `eps = 10**(-p)`. Then either
**truncate** or **round** that last digit — those are different, so ask.

```python
def sqrt_to_p(n, p, round_last=True):
    """sqrt(n) to p decimal places. n > 0, p >= 0."""
    lo, hi = (1.0, float(n)) if n >= 1 else (float(n), 1.0)
    eps = 10 ** (-(p + 2))                   # two extra digits so rounding is safe
    for _ in range(100):                     # fuse: never hang on huge n
        if hi - lo <= eps:
            break
        mid = (lo + hi) / 2
        if mid * mid > n: hi = mid           # same P as LC 69
        else:             lo = mid
    x = (lo + hi) / 2
    scale = 10 ** p
    if round_last:
        return int(x * scale + 0.5) / scale  # half-up
    return int(x * scale) / scale            # truncate toward 0
```
**Time O(100) · Space O(1).** `p+2` extra digits exist so `int(x*scale + 0.5)`
sees a stable last digit; `eps = 10**(-p)` alone can leave the `p`-th digit on
a rounding boundary.

Floats still lie for large `n` or large `p` (`p > 12` eats the 53-bit mantissa).
If `n` is an integer, search the **scaled integer** instead — exact truncation,
no IEEE:

```python
def sqrt_to_p_int(n: int, p: int, round_last=True) -> str:
    """Return a string so trailing zeros survive (1.200 at p=3)."""
    extra = 1 if round_last else 0
    target = n * 10 ** (2 * (p + extra))     # (m / 10^{p+extra})^2 <= n
    lo, hi = 0, target + 1
    while lo < hi:                           # LC 69 on the scaled value
        mid = lo + (hi - lo) // 2
        if mid * mid > target: hi = mid
        else:                  lo = mid + 1
    m = lo - 1                               # floor(sqrt(n) * 10^{p+extra})
    if round_last:
        m = (m + 5) // 10                    # round using the extra digit
    whole, frac = divmod(m, 10 ** p)
    return f"{whole}.{str(frac).zfill(p)}" if p else str(whole)
```
**Time O(log(n) + p) · Space O(p)** for the string. This is the version to
write when the statement says "correctly rounded / truncated at `p` digits" —
the float loop is an approximation, this one is the digits.

### Minimize Max Distance to Gas Station (LC 774)  TODO:

Add `k` stations to minimize the largest gap `d`. Feasible: stations needed for
distance `d` is `sum(ceil(gap/d) - 1) <= k`. Smaller `d` needs more stations →
monotone.

```python
def minmax_gas_dist(stations, k):
    lo, hi = 0.0, float(stations[-1] - stations[0])
    for _ in range(100):
        d = (lo + hi) / 2
        need = sum(int((stations[i+1] - stations[i]) / d) for i in range(len(stations)-1))
        if need <= k: hi = d                     # d achievable → shrink
        else:         lo = d
    return hi
```
**Time O(100n) · Space O(1).**

**Mental trigger:** answer is a real number / "within 1e-5" in the statement →
fixed-iteration float binary search.

---

## 6. Template D — Rotated sorted arrays

A rotated sorted array is two ascending runs, the second entirely below the
first: `[4,5,6,7,0,1,2]`.

**The invariant:** cut at any `mid` — **at least one half is fully sorted.**
Compare `nums[lo]` with `nums[mid]` to find out which:

- `nums[lo] <= nums[mid]` → left half `[lo..mid]` is sorted.
- else → right half `[mid..hi]` is sorted.

Then: if `target` lies inside the sorted half's range, recurse there; otherwise
recurse into the other half. That's the entire algorithm.

### Search in Rotated Sorted Array (LC 33)

```python
def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target: return mid
        if nums[lo] <= nums[mid]:                     # left half sorted
            if nums[lo] <= target < nums[mid]: hi = mid - 1
            else:                              lo = mid + 1
        else:                                         # right half sorted
            if nums[mid] < target <= nums[hi]: lo = mid + 1
            else:                              hi = mid - 1
    return -1
```
**Time O(log n) · Space O(1).**

Say out loud: the test is `<=` not `<` because when `lo == mid` (window of size
1 or 2) the left half is trivially sorted, and `<` sends you down the wrong
branch.

### Find Minimum in Rotated Sorted Array (LC 153)

Do **not** compare to `nums[0]` or `nums[lo]` here — compare to `nums[hi]`. The
predicate `P(i) = nums[i] <= nums[hi]` is FFFF…TTTT over the array, and its
boundary is the pivot.

```python
def find_min(nums):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] > nums[hi]: lo = mid + 1     # min is strictly right of mid
        else:                    hi = mid         # mid could be the min
    return nums[lo]
```
**Time O(log n) · Space O(1).**

Why `nums[hi]`: on a **non-rotated** array `[1,2,3]`, comparing with `nums[lo]`
gives `nums[mid] >= nums[lo]` and you'd wrongly go right. `nums[hi]` handles
both cases in one branch.

### Duplicates: LC 81 and LC 154 — the trap

With duplicates, `nums[lo] == nums[mid] == nums[hi]` says **nothing** about
which half is sorted (`[1,1,1,0,1]`). The only correct move is to shrink by one
and lose the log guarantee.

```python
def search_rotated_ii(nums, target):             # LC 81, returns bool
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target: return True
        if nums[lo] == nums[mid] == nums[hi]:    # ambiguous → trim both ends
            lo += 1; hi -= 1
        elif nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]: hi = mid - 1
            else:                              lo = mid + 1
        else:
            if nums[mid] < target <= nums[hi]: lo = mid + 1
            else:                              hi = mid - 1
    return False

def find_min_ii(nums):                           # LC 154
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if   nums[mid] > nums[hi]: lo = mid + 1
        elif nums[mid] < nums[hi]: hi = mid
        else:                      hi -= 1       # nums[mid] == nums[hi]: safe to drop hi
    return nums[lo]
```
**Time O(log n) average, O(n) worst (all-equal input) · Space O(1).**

`hi -= 1` is safe because `nums[mid] == nums[hi]` means `hi` is never a *unique*
minimum — `mid` holds the same value and stays in range.

**Mental trigger:** "sorted array, rotated at an unknown pivot" → find which
half is sorted, then range-check the target. If duplicates are allowed, say the
`O(n)` worst case out loud before coding.

---

## 7. Template E — Peak finding (binary search without sortedness)

**Find Peak Element (LC 162).** `nums[i] != nums[i+1]`, ends are `-inf`. Return
any index with `nums[i] > nums[i-1]` and `nums[i] > nums[i+1]`.

```python
def find_peak_element(nums):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] < nums[mid + 1]: lo = mid + 1   # uphill → peak on the right
        else:                         hi = mid       # downhill → mid may be peak
    return lo
```
**Time O(log n) · Space O(1).**

**Why this works without sorted data.** The invariant is *"the window `[lo, hi]`
contains a peak"*, maintained by an existence argument, not by order:

- `nums[mid] < nums[mid+1]`: the right side starts going up, and must eventually
  come down (boundary is `-inf`) → a peak exists in `[mid+1, hi]`.
- Otherwise we're descending at `mid`, and the left side rose to `mid` from
  `-inf` → a peak exists in `[lo, mid]`.

The predicate "is there a descent at or before `i`" is FFFF…TTTT, and the first
descent *is* a peak. Sortedness was never required; **predicate monotonicity
was.**

**Peak Index in a Mountain Array (852)** — identical code. **Find in Mountain
Array (1095)** — find the peak, then two ordinary searches (ascending left,
descending right), minding the `MountainArray.get()` call budget. **Local
minimum** — same trick, comparison flipped, walk downhill.

**Mental trigger:** "unsorted array, but the answer is defined by a *local*
comparison, and the boundaries guarantee existence" → binary search on the
slope.

---

## 8. Template F — Binary search in 2D

### 8.1 Fully sorted matrix (LC 74) — flatten

Rows sorted, and `row[i][-1] < row[i+1][0]`. Treat it as one array of length
`m*n` and convert the index.

```python
def search_matrix(matrix, target):
    m, n = len(matrix), len(matrix[0])
    lo, hi = 0, m * n
    while lo < hi:
        mid = lo + (hi - lo) // 2
        val = matrix[mid // n][mid % n]          # 1D index -> (row, col)
        if   val == target: return True
        elif val < target:  lo = mid + 1
        else:               hi = mid
    return False
```
**Time O(log(mn)) · Space O(1).**

### 8.2 Row- and column-sorted matrix (LC 240) — the staircase

Here rows and columns are each sorted but a row can overlap the next, so
flattening is invalid. Start at the **top-right** corner: that cell is the max of
its row and the min of its column, so each comparison eliminates a whole line.

```python
def search_matrix_ii(matrix, target):
    r, c = 0, len(matrix[0]) - 1                 # top-right corner
    while r < len(matrix) and c >= 0:
        if   matrix[r][c] == target: return True
        elif matrix[r][c] > target:  c -= 1      # kill this column
        else:                        r += 1      # kill this row
    return False
```
**Time O(m + n) · Space O(1).** Not logarithmic — and that's optimal here.
Saying "`O(m+n)`, not `O(log mn)`, because the rows overlap" is the point being
checked.

### 8.3 Kth Smallest Element in a Sorted Matrix (LC 378) — Google favourite

Binary search the **value**, not positions. `count_le(v)` is non-decreasing in
`v` → monotone. The answer is the smallest `v` with `count_le(v) >= k`, and that
`v` must be a real matrix element (the boundary can only land on a present
value).

```python
def kth_smallest(matrix, k):
    n = len(matrix)
    def count_le(v):                             # staircase count, O(n)
        cnt, c = 0, n - 1
        for r in range(n):
            while c >= 0 and matrix[r][c] > v: c -= 1
            cnt += c + 1                         # c+1 entries in this row are <= v
        return cnt
    lo, hi = matrix[0][0], matrix[-1][-1]
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if count_le(mid) >= k: hi = mid
        else:                  lo = mid + 1
    return lo
```
**Time O(n log(max - min)) · Space O(1).** Beats the `O(k log n)` heap solution
when `k` is large.

### 8.4 Kth Smallest in Multiplication Table (LC 668) / Nth Magical Number (LC 878)

Same shape, and now the matrix is *virtual* — never materialise it.

```python
def find_kth_number(m, n, k):                    # m x n table, cell (i,j) = i*j
    def count_le(v):
        return sum(min(v // i, n) for i in range(1, m + 1))
    lo, hi = 1, m * n
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if count_le(mid) >= k: hi = mid
        else:                  lo = mid + 1
    return lo
```
**Time O(m log(mn)) · Space O(1).**

**Mental trigger:** *"kth smallest"* + you can write an `O(n)` "how many ≤ v"
counter → binary search on value.

---

## 9. Median of Two Sorted Arrays (LC 4) — the partition derivation

Goal: `O(log(min(m, n)))`. Merging is `O(m+n)` and will be rejected.

**Idea.** Cut both arrays into LEFT and RIGHT such that

1. `len(LEFT) == (m + n + 1) // 2` — the `+1` parks the extra element on the
   left for odd totals, making the odd case trivial.
2. Every element in LEFT ≤ every element in RIGHT.

Take `i` from `A` and `j = half - i` is forced: **one** free variable, searched
over `[0, m]`. Always search the **smaller** array so `j` stays in range.

Condition 2 needs only two comparisons (within-array order is free):
`A[i-1] <= B[j]` and `B[j-1] <= A[i]`. `±inf` sentinels at edge cuts kill every
special case.

```python
def find_median_sorted_arrays(A, B):
    if len(A) > len(B): A, B = B, A              # binary search the smaller one
    m, n = len(A), len(B)
    half = (m + n + 1) // 2
    lo, hi = 0, m                                # i = how many taken from A
    while lo <= hi:
        i = (lo + hi) // 2
        j = half - i
        Aleft  = A[i-1] if i > 0 else float('-inf')
        Aright = A[i]   if i < m else float('inf')
        Bleft  = B[j-1] if j > 0 else float('-inf')
        Bright = B[j]   if j < n else float('inf')
        if Aleft <= Bright and Bleft <= Aright:  # correct partition found
            if (m + n) % 2: return max(Aleft, Bleft)          # odd: left has the extra
            return (max(Aleft, Bleft) + min(Aright, Bright)) / 2
        if Aleft > Bright: hi = i - 1            # took too many from A
        else:              lo = i + 1            # took too few from A
    return 0.0                                   # unreachable for valid input
```
**Time O(log(min(m, n))) · Space O(1).**

Sanity checks: `i = 0` takes nothing from `A` (`Aleft = -inf` always passes);
`i = m` takes all of `A` (`Aright = +inf`); and because we swapped to the
smaller array, `j` never leaves `[0, n]`. The same partition gives the **kth**
element of two sorted arrays; for *k* arrays use §8.3-style value search instead.

---

## 10. Unknown size / interactive APIs — galloping first

**Search in a Sorted Array of Unknown Size (LC 702).** You only have
`reader.get(i)`, returning `2**31 - 1` out of bounds, so you can't set `hi`.
Fix: **exponential (galloping) search** to bracket the answer, then binary
search inside the bracket.

```python
def search_unknown_size(reader, target):
    lo, hi = 0, 1
    while reader.get(hi) < target:               # double until we overshoot
        lo, hi = hi, hi * 2
    while lo < hi:                               # answer is inside [lo, hi]
        mid = lo + (hi - lo) // 2
        if reader.get(mid) >= target: hi = mid
        else:                         lo = mid + 1
    return lo if reader.get(lo) == target else -1
```
**Time O(log n) · Space O(1).** Doubling takes `⌈log n⌉` probes and the final
window has size ≤ `n` → `2 log n` total.

**Guess Number Higher or Lower (LC 374)** — the plain template against an oracle:

```python
def guess_number(n):
    lo, hi = 1, n
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if guess(mid) <= 0: hi = mid             # -1 = too high, 0 = correct
        else:               lo = mid + 1
    return lo
```

Galloping also solves: infinite streams, intersecting two sorted lists of wildly
different sizes (`O(k log(n/k))`), and any unbounded "first index where an
expensive monotone check flips".

**Mental trigger:** no `n`, or an unbounded answer space → double first, then
binary search.

---

## 11. Common pitfalls

1. **`(lo + hi) / 2` overflow** in C++/Java for large indices. Write
   `lo + (hi - lo) // 2` always; be ready to explain it.
2. **Infinite loop from `lo = mid` with floor mid.** When `hi == lo + 1`,
   `mid == lo` and the window never shrinks. `lo = mid` requires
   `mid = lo + (hi - lo + 1) // 2` (ceiling).
3. **`hi = n` vs `hi = n - 1` mixed with the wrong loop condition.** Half-open
   pairs with `while lo < hi`; closed pairs with `while lo <= hi`. Mixing them
   silently drops the last element or reads out of bounds.
4. **Duplicates break rotation logic.** `nums[lo] == nums[mid] == nums[hi]` is
   uninformative; you must shrink by one → `O(n)` worst case. Never claim
   `O(log n)` for LC 81/154.
5. **Predicate isn't actually monotonic.** e.g. "minimum k such that some
   non-monotone score ≥ target". Binary search returns a plausible-looking wrong
   answer with no crash. Always say the monotonicity sentence out loud.
6. **Answer-space bounds too tight.** `hi = max(nums)` when the true answer is
   `sum(nums)` returns `hi` with no error. Over-shoot the bounds; one extra
   `log` step is free.
7. **`bisect` on a descending array.** It will not warn you. Negate the values
   (and the target), or reverse and remap indices.
8. **Comparing to `nums[0]` instead of `nums[hi]` in Find-Min-Rotated.** Fails
   on non-rotated input like `[1, 2, 3]`.
9. **Float precision / `while hi - lo > eps` never terminating** at large
   magnitudes. Use `for _ in range(100)` instead.
10. **Using binary search when the underlying property isn't monotone in the
    array** — e.g. searching a peak in an array with equal neighbours, or
    "shortest subarray with sum ≥ k" when negatives are allowed (prefix sums are
    no longer increasing → use a monotonic deque, not binary search).
11. **Returning `nums[lo]` without a bounds check.** After a half-open search
    `lo` can equal `n`. Guard: `lo < n and nums[lo] == target`.
12. **`insort` inside a loop** thinking it's `O(log n)` — it's `O(n)` per call,
    so the loop is `O(n²)`. Use a BIT/segment tree or `SortedList` instead.
13. **Off-by-one in ceil division.** `(p + k - 1) // k`, not `p // k + 1`
    (breaks when `k` divides `p`). Or use `-(-p // k)`.
14. **`hi = max(arr)` with a `return lo - 1` loop.** The invert-maximize form
    needs `hi` to be an *infeasible* sentinel, so it must be `max(arr) + 1`.
    With `hi = max(arr)` the largest candidate can never be reported and you
    return `max - 1`. Minimize loops (`return lo`) are fine with `hi = max/sum`
    because those bounds are guaranteed feasible. See §4.1.

---

## 12. Complexity + decision cheat-sheet

| Phrasing in the problem | Template | Complexity |
| --- | --- | --- |
| "sorted array, find target" | closed-interval exact match | `O(log n)` |
| "first/last position of X", "count of X" | A — `bisect_left/right` | `O(log n)` |
| "insert position", "floor/ceiling" | A — `bisect` | `O(log n)` |
| "minimum capacity/speed/size such that…" | B — answer space | `O(n log R)` |
| "minimize the maximum" / "maximize the minimum" | B — answer space | `O(n log R)` |
| "split into k parts, minimize largest" | B — greedy `feasible` | `O(n log sum)` |
| "answer within 1e-5" | C — 100 float iterations | `O(100·n)` |
| "rotated sorted array" | D — one half is sorted | `O(log n)` (dupes: `O(n)`) |
| "find any peak / local extremum" | E — walk the slope | `O(log n)` |
| "fully sorted matrix" | F.1 — flatten | `O(log mn)` |
| "rows and cols sorted" | F.2 — staircase | `O(m + n)` |
| "kth smallest, can count ≤ v fast" | F.3 — search on value | `O(n log R)` |
| "median of two sorted arrays" | §9 — partition | `O(log min(m,n))` |
| "unknown size / no upper bound" | §10 — gallop then search | `O(log n)` |
| "longest increasing subsequence" | patience + `bisect_left` | `O(n log n)` |
| "weighted random pick" | prefix sums + `bisect` | `O(log n)` per pick |

---

## 13. Problem list (Google-flavoured), Basic → Hard

### Basic — get these to muscle memory
1. **Binary Search (704)** — the canonical template, exact match.
2. **Search Insert Position (35)** — literally `bisect_left`.
3. **First Bad Version (278)** — the purest FFFF…TTTT problem in existence.
4. **Sqrt(x) (69)** — integer boundary, answer is *last* True.
5. **Valid Perfect Square (367)** — same as 69 plus an equality check.
6. **Guess Number Higher or Lower (374)** — oracle predicate.
7. **Two Sum II — Input Array Is Sorted (167)** — two pointers, or `bisect` per element.
8. **Intersection of Two Arrays II (350)** — sort + `bisect` when one array is huge.

### Core patterns
9. **Find First and Last Position (34)** — `bisect_left` + `bisect_right - 1`.
10. **Search in Rotated Sorted Array (33)** — "one half is sorted".
11. **Search in Rotated Sorted Array II (81)** — duplicates → `O(n)` worst case.
12. **Find Minimum in Rotated Sorted Array (153)** — compare against `nums[hi]`.
13. **Find Minimum in Rotated Sorted Array II (154)** — `hi -= 1` on ties.
14. **Find Peak Element (162)** — slope walk, no sortedness needed.
15. **Peak Index in a Mountain Array (852)** — same code, guaranteed mountain.
16. **Find K Closest Elements (658)** — binary search the *window start* with
    `arr[mid + k] - x < x - arr[mid]`; slicker than two pointers.
17. **Search a 2D Matrix (74)** — flatten with `mid // n`, `mid % n`.
18. **Search a 2D Matrix II (240)** — staircase from top-right, `O(m+n)`.
19. **Single Element in a Sorted Array (540)** — pair-index parity predicate, `O(log n)`.
20. **Find Smallest Letter Greater Than Target (744)** — `bisect_right` with wraparound.

### Answer-space (the interview bread-and-butter)
21. **Koko Eating Bananas (875)** — speed, ceil-division hours.
22. **Capacity to Ship Packages Within D Days (1011)** — `lo = max`, `hi = sum`.
23. **Split Array Largest Sum (410)** — identical to 1011; know both the BS and DP.
24. **Minimum Number of Days to Make m Bouquets (1482)** — search on days.
25. **Magnetic Force Between Two Balls (1552)** — maximize-the-min, ceiling mid.
26. **Divide Chocolate (1231)** — maximize-the-min sweetness; twin of 1552.
27. **Minimize Max Distance to Gas Station (774)** — float search, hard-ish.
28. **Minimum Size Subarray Sum (209)** — prefix + `bisect` variant (positives only!).
29. **Nth Magical Number (878)** — count via inclusion–exclusion with LCM.
30. **Ugly Number III (1201)** — inclusion–exclusion over three divisors.
31. **Maximum Value at a Given Index in a Bounded Array (1802)** — closed-form
    arithmetic-series sum inside `feasible`; very Google.
32. **Minimum Time to Complete Trips (2187)** / **Minimum Speed to Arrive on Time
    (1870)** — same skeleton, different `feasible`.

### Hard / combined
33. **Kth Smallest Element in a Sorted Matrix (378)** — binary search on value + count.
34. **Kth Smallest Number in Multiplication Table (668)** — virtual matrix.
35. **Median of Two Sorted Arrays (4)** — partition with `±inf` sentinels.
36. **Find in Mountain Array (1095)** — peak, then two searches, limited API calls.
37. **Search in a Sorted Array of Unknown Size (702)** — gallop then search.
38. **Longest Increasing Subsequence (300)** — patience piles + `bisect_left`, `O(n log n)`.
39. **Russian Doll Envelopes (354)** — sort `w` asc, `h` **desc** on ties, then LIS on `h`.
40. **Maximum Profit in Job Scheduling (1235)** — DP + `bisect` on end times.
41. **Time Based Key-Value Store (981)** — per-key sorted timestamps + `bisect_right - 1`.
42. **Random Pick with Weight (528)** — prefix sums + `bisect_left(prefix, rand)`.
43. **Snapshot Array (1146)** — per-index `(snap_id, val)` list + `bisect`.
44. **Count of Smaller Numbers After Self (315)** — BIT / merge sort; `SortedList` + `bisect` also passes.
45. **Median of a Data Stream / Sliding Window Median (480)** — `SortedList` + `bisect` (or two heaps).
46. **Find the Duplicate Number (287)** — binary search on *value* with a count
    predicate, `O(n log n)` (Floyd's is `O(n)` — mention both).

---

## 14. Quiz

**Q1.** Why does `while lo < hi` with `hi = mid` / `lo = mid + 1` never infinite-loop?

<details><summary>Answer</summary>
`mid = lo + (hi - lo)//2` satisfies `lo <= mid < hi`. So `hi = mid` strictly
decreases `hi`, and `lo = mid + 1` strictly increases `lo`. The window shrinks by
≥ 1 each iteration and must reach `lo == hi`.
</details>

**Q2.** Give `bisect_left` and `bisect_right` for `a = [1,2,2,2,5]`, `x = 2`. How
do you get the count of 2s and the last index of 2?

<details><summary>Answer</summary>
`bisect_left = 1`, `bisect_right = 4`. Count `= 4 - 1 = 3`; last index
`= 4 - 1 = 3`.
</details>

**Q3.** In Koko Eating Bananas, why is `hi = max(piles)` and not `sum(piles)`?

<details><summary>Answer</summary>
Koko eats from at most one pile per hour, so a speed above `max(piles)` gives the
same hour count as `max(piles)`. It's still *correct* (just slower) to use
`sum(piles)` — tight upper bounds are an optimisation, but a bound that's too
**low** is a wrong answer.
</details>

**Q4.** Why must Find-Minimum-in-Rotated compare `nums[mid]` with `nums[hi]`
rather than `nums[lo]`?

<details><summary>Answer</summary>
On a non-rotated array `[1,2,3]`, `nums[mid] >= nums[lo]` is true and would send
you right, missing the true minimum at index 0. `nums[hi]` correctly classifies
both rotated and non-rotated cases with one branch.
</details>

**Q5.** Find Peak Element runs on an *unsorted* array. What makes binary search legal?

<details><summary>Answer</summary>
The invariant "the current window contains a peak", preserved by an existence
argument: if we're on an upslope at `mid`, the right side must eventually
descend (`-inf` sentinels at the ends), so a peak lives there. Sortedness is
never needed — only a monotone decision rule.
</details>

**Q6.** When maximizing the minimum (e.g. LC 1552) you write `lo = mid`. What
else must change and why?

<details><summary>Answer</summary>
`mid` must use ceiling division: `mid = lo + (hi - lo + 1)//2`. With floor mid
and `hi == lo + 1`, `mid == lo` and `lo = mid` makes no progress → infinite loop.
</details>

**Q7.** In LC 4, why binary search the **smaller** array, and what are the `±inf`
sentinels for?

<details><summary>Answer</summary>
Searching the smaller array (size `m`) guarantees `j = half - i` stays within
`[0, n]` and gives `O(log min(m,n))`. The sentinels make edge cuts
(`i = 0` or `i = m`) satisfy the comparisons automatically, removing every
special case.
</details>

**Q8.** You must find the first index where an expensive monotone check flips,
but the array has no known length. What do you do?

<details><summary>Answer</summary>
Exponential/galloping search: probe `1, 2, 4, 8, …` until the check flips, which
brackets the answer in `[hi/2, hi]` after `O(log n)` probes, then run a normal
binary search inside that bracket. Total `O(log n)`.
</details>

---

## 15. Mini project — "version rollout bisect tool"

Find the **first bad deploy** in a version range, like `git bisect`. Exercises
the whole file: monotone predicate, expensive oracle, galloping for an unknown
upper bound, call accounting.

Requirements:
- Given versions `1..n` and an oracle `is_bad(v)` (a slow health check), return
  the first bad version in `O(log n)` calls.
- If `n` is unknown, gallop to find an upper bound first.
- Cache oracle results and report the number of real calls made.
- Handle "no bad version" (return `None`) and "version 1 is already bad".

```python
from functools import lru_cache

class Bisector:
    def __init__(self, is_bad):
        self.calls = 0
        self._raw = is_bad
        self.is_bad = lru_cache(maxsize=None)(self._probe)   # never re-check a version

    def _probe(self, v: int) -> bool:
        self.calls += 1                          # count only true oracle hits
        return self._raw(v)

    def find_upper_bound(self) -> int:
        """Gallop until we see a bad version; None if the range looks all-good."""
        hi = 1
        while not self.is_bad(hi):
            if hi > 1 << 40: return None         # give up; treat as all-good
            hi *= 2
        return hi

    def first_bad(self, n: int | None = None) -> int | None:
        if n is None:
            n = self.find_upper_bound()
            if n is None: return None
        lo, hi = 1, n + 1                        # half-open; hi = n+1 means "none bad"
        while lo < hi:
            mid = lo + (hi - lo) // 2
            if self.is_bad(mid): hi = mid        # mid may be the first bad one
            else:                lo = mid + 1
        return lo if lo <= n else None


if __name__ == "__main__":
    FIRST_BAD = 1_000_003
    b = Bisector(lambda v: v >= FIRST_BAD)       # the monotone oracle
    print(b.first_bad(), "found in", b.calls, "probes")   # ~40 probes, not 1e6
```

Extensions worth doing:
- **Non-monotone reality:** deploys can be flaky. Probe each version 3× and take
  a majority vote; note that this only *approximates* monotonicity — document
  that the result is a best guess.
- **`git bisect` mode:** replace the version range with a commit list and shell
  out to a test command; print the culprit SHA.
- **Parallel bisect:** with `p` workers, probe `p` evenly spaced points per round
  to get `log_(p+1)(n)` rounds. Derive the speedup.
