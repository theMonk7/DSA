# Greedy — Complete Guide

> Google DSA prep notes. Category: Greedy algorithms.
> Companion to `intervals.md` (sort-by-end scheduling), `heaps.md` (the "regret heap"
> that rescues an irreversible greedy) and `dp.md` (what to fall back to when the
> greedy choice property fails). `monotonic_stack.md` covers the lexicographic variants.

## 1. What "greedy" actually means

A greedy algorithm builds a solution **one irreversible decision at a time**, always
taking the choice that looks best *right now*, and **never backtracking**.

That's it. The algorithm is usually 5 lines. The difficulty is entirely in knowing
whether those 5 lines are *correct*.

Greedy is provably optimal only when both of these hold:

**(1) Greedy choice property** — there exists an optimal solution that *contains* the
locally-best choice. You never have to sacrifice a locally-best move to reach a
globally-best answer.

**(2) Optimal substructure** — after committing to that choice, what remains is the
same problem on a smaller input, and the optimal solution to the whole contains an
optimal solution to that remainder.

### Greedy vs DP, explicitly

Both need optimal substructure. Only greedy needs the greedy choice property.

| | Greedy | DP |
|---|---|---|
| Choices explored per step | exactly **1** | **all** of them |
| Decisions | irreversible | reconsidered via memo |
| Direction | usually top-down, forward | bottom-up over subproblems |
| Typical cost | `O(n log n)` (the sort dominates) | `O(n·k)` or worse |
| Fails when | a locally-best move blocks a better global one | (rarely — DP is the safe fallback) |

> DP says "try every first move and keep the best." Greedy says "I can **prove** one
> particular first move is safe, so I don't have to try the others." Greedy is DP
> with the search collapsed by a theorem.

**Mental trigger:** if you can sort the input by *one* number and then make a single
forward pass committing to choices, you are probably in greedy territory. If the
"best" choice depends on decisions you haven't made yet, it's DP.

---

## 2. The hard part: proving it

Interviewers at Google do not want the 5-line code. They want the argument. There are
three standard techniques.

### (a) Exchange argument — the workhorse

Shape of the proof:

1. Let `OPT` be *any* optimal solution.
2. Find the first place `OPT` disagrees with the greedy solution `G`.
3. **Exchange** that element of `OPT` for the greedy choice.
4. Show the result is still feasible and *no worse*.
5. Therefore an optimal solution exists that agrees with greedy one step further.
   Induct → an optimal solution agrees with greedy everywhere → `G` is optimal.

#### Worked in full: activity selection (sort by earliest finish time)

Problem: given `n` intervals, pick the maximum number that are pairwise
non-overlapping.

Greedy: sort by **finish time**, repeatedly take the earliest-finishing interval
compatible with what's already taken.

```python
def max_activities(intervals):
    intervals.sort(key=lambda x: x[1])       # earliest FINISH first, not earliest start
    count, prev_end = 0, float('-inf')
    for s, e in intervals:
        if s >= prev_end:                    # compatible with everything kept so far
            count += 1
            prev_end = e
    return count
```
**Time O(n log n) / Space O(1)** beyond the sort.

**Proof.** Let greedy pick `g1, g2, …, gk` in order of finish time. Let
`o1, o2, …, om` be any optimal solution, also written in sorted order, and suppose
for contradiction `m > k`.

*Claim: for every `i ≤ k`, `finish(gi) ≤ finish(oi)`.*

- **Base `i = 1`.** `g1` is the globally earliest-finishing interval, so
  `finish(g1) ≤ finish(o1)`.
- **Step.** Assume `finish(g[i-1]) ≤ finish(o[i-1])`. Since `OPT` is feasible,
  `start(oi) ≥ finish(o[i-1]) ≥ finish(g[i-1])`. So `oi` was *available* to greedy at
  step `i` — it doesn't overlap anything greedy has taken. Greedy chose the
  earliest-finishing available interval, therefore `finish(gi) ≤ finish(oi)`. ∎

Now the exchange: since `m > k`, `OPT` has an interval `o[k+1]` with
`start(o[k+1]) ≥ finish(ok) ≥ finish(gk)` — meaning `o[k+1]` was still compatible with
greedy's `k` picks, so greedy would not have stopped at `k`. Contradiction.
Hence `m = k` and greedy is optimal. ∎

Equivalently, phrased as a pure swap: take any optimal `OPT` and replace `o1` with
`g1`. `g1` finishes no later than `o1`, so it conflicts with nothing in
`o2, …, om`; the swapped set is feasible and the same size. Repeat down the list.

**Why sorting by *start* fails:** one interval `[0, 100]` starts first and eats the
whole timeline. **Why sorting by *duration* fails:** `[0,5], [4,6], [5,10]` — the
shortest is `[4,6]`, which blocks both of the other two (answer 2, greedy gets 1).

#### One-line exchange arguments you can reuse

| Problem | Exchange |
|---|---|
| Non-overlapping Intervals | swap in the earliest-finishing survivor — it leaves the most room |
| Fractional knapsack | swap any unit of lower-ratio item for a unit of higher-ratio item |
| Huffman | swapping the two least-frequent symbols to the deepest leaves never increases cost |
| Boats to Save People | if the heaviest person is paired with anyone but the lightest fit, re-pairing is no worse |
| Advantage Shuffle | if my card `x` beats their card `y` and a smaller card of mine also beats `y`, use the smaller one |

### (b) Staying ahead (induction on a measured quantity)

Instead of swapping, show that after every step greedy's partial solution is at
least as good as any other strategy's, by some measure.

*Jump Game II:* let `R_k` = the furthest index reachable in `k` jumps by greedy, and
`R'_k` the same for any other strategy. Claim `R_k ≥ R'_k` for all `k`.
Base: `R_0 = R'_0 = 0`. Step: any strategy's `k`-th jump departs from some index
`i ≤ R'_{k-1} ≤ R_{k-1}`, landing at `i + nums[i]`; greedy maximises exactly
`max(i + nums[i])` over `i ≤ R_{k-1}`, so `R_k ≥ i + nums[i] ≥ R'_k`. Greedy is never
behind → it reaches the end in no more jumps. ∎

**Mental trigger for staying-ahead:** the answer is a *count of rounds* and each round
has a natural "how far have I gotten" scalar.

### (c) Matroid intuition (brief, but it's the real theory)

A **matroid** is a ground set `E` plus a family of "independent" subsets that is
(i) *hereditary*: subsets of an independent set are independent, and
(ii) has the *exchange property*: if `|A| < |B|` and both are independent, some
element of `B \ A` can be added to `A` keeping it independent.

**Theorem:** on a matroid, sorting elements by weight descending and greedily adding
whatever keeps the set independent yields a maximum-weight independent set — always.

- Kruskal's MST = the *graphic matroid* (independent = acyclic edge set).
- Job sequencing with deadlines and unit times = the *transversal matroid*.

Practical takeaway: if your feasibility structure is downward-closed **and** has the
exchange property, greedy is safe without a bespoke proof. If it isn't (0/1 knapsack:
"weight ≤ W" is downward-closed but the *value* objective is not matroidal), be
suspicious.

---

## 3. How to DISPROVE a greedy (do this first, it's faster)

Before proving, spend 60 seconds trying to break it. Interviewers love this.

### Counterexample shapes checklist

1. **Ties** — two elements equal on the sort key. Does the tie-break change the answer?
2. **Large-vs-many** — one huge item vs several small items summing to more.
   (`{10}` vs `{6, 6}` under a capacity of 12.)
3. **Exact-fit trap** — a slightly worse local choice that *exactly* fills the budget.
4. **Negatives / zeros** — does `max` still make sense? Does a zero-length item break a ratio?
5. **Off-by-one boundaries** — touching endpoints, `n = 1`, empty input, all-equal input.
6. **Adversarial ordering** — the greedy's first pick is the one thing that blocks everything.
7. **Two competing criteria** — you sorted by A but the objective also depends on B.

### The canonical counterexample: coin change `{1, 3, 4}`, target 6

```python
def greedy_coins(coins, amount):
    used = 0
    for c in sorted(coins, reverse=True):     # biggest coin first
        used += amount // c
        amount %= c
    return used if amount == 0 else -1

# greedy_coins([1, 3, 4], 6) -> 3   (4 + 1 + 1)
# true optimum                 -> 2   (3 + 3)
```

Greedy coin change is optimal only for *canonical* systems (like `1, 5, 10, 25`). For
an arbitrary coin set it is wrong, and the fix is DP:
`dp[a] = 1 + min(dp[a - c] for c in coins)`.

**Exact-fit trap in one line:** the `4` looked best but destroyed the exact `3 + 3` fit.

### Fractional vs 0/1 knapsack — the contrast that makes it click

Fractional knapsack (you may take a *fraction* of an item) **is** greedy: sort by
value-per-weight and fill.

```python
def fractional_knapsack(items, cap):          # items = [(value, weight), ...]
    total = 0.0
    for val, wt in sorted(items, key=lambda it: it[0] / it[1], reverse=True):
        take = min(wt, cap)                   # partial take is allowed
        total += val * take / wt
        cap -= take
        if cap == 0:
            break
    return total
```
**Time O(n log n) / Space O(1).**
*Exchange:* if the knapsack contains a unit of weight from a lower-ratio item while a
higher-ratio item is not exhausted, swapping that unit strictly increases value. So
some optimal solution is the ratio-sorted fill.

0/1 knapsack breaks it, because "take a bit less" is not an option:

```
cap = 10
items (value, weight) = [(10, 6), (8, 5), (8, 5)]
ratios                =   1.67 ,  1.6 ,  1.6
greedy: take (10,6) -> 4 capacity left, nothing fits -> value 10
optimal: (8,5) + (8,5)                                -> value 16
```

**Mental trigger:** *divisible → greedy; indivisible → DP.* Whenever the problem says
"you must take the whole thing," expect the greedy choice property to fail.

---

## 4. Pattern 1 — Sort by one key, then sweep

The most common greedy shape: **find the right sort key, then one linear pass**.
Finding the key *is* the problem; the sweep is bookkeeping.

**Mental trigger:** "maximum/minimum number of X you can keep / remove / pair up,
order doesn't matter."

### Activity selection family (cross-ref `intervals.md` §6)

Sort by **end**, keep anything that starts at/after `prev_end`.

```python
def erase_overlap_intervals(intervals):       # LC 435 — min removals
    intervals.sort(key=lambda x: x[1])
    kept, prev_end = 0, float('-inf')
    for s, e in intervals:
        if s >= prev_end:
            kept += 1
            prev_end = e
    return len(intervals) - kept

def find_min_arrow_shots(points):             # LC 452 — touching DOES overlap
    points.sort(key=lambda p: p[1])
    arrows, prev_end = 0, float('-inf')
    for s, e in points:
        if s > prev_end:                      # note: > not >=
            arrows += 1
            prev_end = e
    return arrows
```
**Time O(n log n) / Space O(1).** The only difference between the two is `>` vs `>=`
— that is the "ties" item on the counterexample checklist, and it is the whole
problem.

### Two City Scheduling (LC 1029) — sort by the *difference*

Send `n` of `2n` people to city A and `n` to city B, minimising total cost.

The delta insight: **pretend everyone flies to B**. That costs `sum(b)`. Moving person
`i` to A changes the cost by `a_i - b_i`. So we must pick exactly `n` people to move,
and to minimise we pick the `n` most negative deltas. Sorting by `a - b` does that.

```python
def two_city_sched_cost(costs):
    costs.sort(key=lambda c: c[0] - c[1])     # most "A-favouring" first
    n = len(costs) // 2
    return sum(a for a, _ in costs[:n]) + sum(b for _, b in costs[n:])
```
**Time O(n log n) / Space O(1).**
*Exchange:* if an optimal assignment sends `i` to A and `j` to B while
`a_i - b_i > a_j - b_j`, swapping them changes cost by
`(a_j - b_j) - (a_i - b_i) < 0` — strictly better. So no optimal solution can
disagree with the sorted order.

**Mental trigger:** "choose exactly half / exactly k, each with two costs" → sort by
the difference, never by either cost alone.

### Boats to Save People (LC 881) — two pointers after sorting

Each boat carries at most 2 people and at most `limit` weight.

```python
def num_rescue_boats(people, limit):
    people.sort()
    i, j, boats = 0, len(people) - 1, 0
    while i <= j:
        if people[i] + people[j] <= limit:    # lightest rides with heaviest if possible
            i += 1
        j -= 1                                # heaviest always leaves now
        boats += 1
    return boats
```
**Time O(n log n) / Space O(1).**
*Exchange:* the heaviest person needs a boat regardless. If they can share, sharing
with the *lightest* is never worse than sharing with anyone else (any partner that
fits with someone heavier also fits with the lightest).

### Queue Reconstruction by Height (LC 406) — tall first, then insert

Each person is `[h, k]`: `k` people **≥ h** stand in front of them.

Sort by height descending, ties by `k` ascending, then `insert(k, person)`.

```python
def reconstruct_queue(people):
    people.sort(key=lambda p: (-p[0], p[1]))
    out = []
    for p in people:
        out.insert(p[1], p)                   # k is exactly the final index, so far
    return out
```
**Time O(n²) (list insert) / Space O(n).**

*Why it works:* when we insert person `p`, everyone already placed is **taller or
equal** to `p`. So `p`'s `k` counts exactly the people already in the list — putting
`p` at index `k` satisfies them immediately. And every person inserted *later* is
strictly shorter, so shifting `p` right by later insertions can never change `p`'s
count. The invariant "all placed people are correct" is preserved forever. The
`k`-ascending tie-break matters: among equal heights, the smaller `k` must be placed
first or it would be pushed past its own group-mates.

### Car Fleet (LC 853) — sweep from the destination backwards

```python
def car_fleet(target, position, speed):
    fleets, slowest = 0, 0.0
    for pos, sp in sorted(zip(position, speed), reverse=True):   # closest to target first
        t = (target - pos) / sp
        if t > slowest:                       # can't catch the car ahead -> new fleet
            fleets += 1
            slowest = t
    return fleets
```
**Time O(n log n) / Space O(n).** A car merges into the fleet ahead iff its arrival
time is `≤` that fleet's arrival time. (This is also a monotonic-stack problem — see
`monotonic_stack.md`.)

### Largest Number (LC 179) — greedy via a custom comparator

The sort key isn't a number, it's a **pairwise rule**: `a` before `b` iff `a+b > b+a`.

```python
import functools

def largest_number(nums):
    strs = list(map(str, nums))
    # cmp: negative if a should come first
    strs.sort(key=functools.cmp_to_key(
        lambda a, b: (a + b < b + a) - (a + b > b + a)))
    return "0" if strs[0] == "0" else "".join(strs)
```
**Time O(n log n · L) / Space O(n).** The comparator is provably a total order
(transitive) — that is the thing to assert out loud; a non-transitive comparator makes
the sort meaningless.

**Mental trigger:** "arrange items to form the best string/number" → define a pairwise
comparator, prove transitivity, sort.

---

## 5. Pattern 2 — Sort + heap ("sort one dimension, heap the other")

When each item has **two** attributes and the objective couples them, sort by the
attribute that defines *eligibility* and keep a heap over the attribute you want to
*optimise*. Sweeping the sort key monotonically grows or shrinks the eligible set;
the heap answers "best/worst so far" in `O(log n)`.

**Mental trigger:** two numbers per item, and "as I raise a threshold, more items
become available."

### IPO (LC 502) — unlock by capital, take by profit

```python
import heapq

def find_maximized_capital(k, w, profits, capital):
    projects = sorted(zip(capital, profits))  # eligibility dimension = capital
    heap, i = [], 0
    for _ in range(k):
        while i < len(projects) and projects[i][0] <= w:
            heapq.heappush(heap, -projects[i][1])   # max-heap on profit
            i += 1
        if not heap:                          # nothing affordable
            break
        w -= heapq.heappop(heap)              # take the most profitable unlocked
    return w
```
**Time O(n log n + k log n) / Space O(n).** Capital never decreases, so an unlocked
project stays unlocked — the pointer `i` only moves forward.

### Maximum Performance of a Team (LC 1383)

`performance = (sum of chosen speeds) × (min chosen efficiency)`, at most `k` members.

Fix the minimum efficiency by iterating efficiency **descending**: when we process
worker `e`, every worker already seen has efficiency `≥ e`, so `e` *is* the minimum if
`e` is included. Keep the top-`k` speeds in a min-heap.

```python
def max_performance(n, speed, efficiency, k):
    workers = sorted(zip(efficiency, speed), reverse=True)
    heap, total, best = [], 0, 0
    for eff, sp in workers:
        heapq.heappush(heap, sp)              # min-heap: the worst speed is on top
        total += sp
        if len(heap) > k:
            total -= heapq.heappop(heap)      # evict the slowest
        best = max(best, total * eff)         # eff is the current minimum
    return best % (10 ** 9 + 7)
```
**Time O(n log n) / Space O(n).** Note `%` is applied **once at the end** — taking it
earlier would corrupt the `max`.

### Minimum Cost to Hire K Workers (LC 857)

Everyone is paid in proportion to quality, and everyone must clear their minimum wage.
So the wage-per-quality **ratio** of the group is `max(wage_i / quality_i)`, and the
cost is `ratio × sum(quality)`.

Iterate ratio ascending (fixing the group's max ratio), keep the `k` smallest
qualities.

```python
def mincost_to_hire_workers(quality, wage, k):
    workers = sorted((w / q, q) for q, w in zip(quality, wage))
    heap, qsum, best = [], 0, float('inf')
    for ratio, q in workers:
        heapq.heappush(heap, -q)              # max-heap on quality
        qsum += q
        if len(heap) > k:
            qsum += heapq.heappop(heap)       # pop returns -q_max, so += subtracts it
        if len(heap) == k:
            best = min(best, ratio * qsum)
    return best
```
**Time O(n log n) / Space O(n).**

### Course Schedule III (LC 630) — the **regret greedy**

This is the Google-level trick. Courses have `(duration, deadline)`. Take as many as
possible.

Sort by deadline. Greedily take every course. When the running time overshoots the
current deadline, **undo the single worst decision made so far** — drop the
longest-duration course already taken. That keeps the *count* the same while
minimising elapsed time, which maximises future options.

```python
def schedule_course(courses):
    courses.sort(key=lambda c: c[1])          # by deadline
    heap, time = [], 0                        # max-heap of taken durations
    for dur, last_day in courses:
        heapq.heappush(heap, -dur)
        time += dur
        if time > last_day:                   # REGRET: undo the longest course taken
            time += heapq.heappop(heap)
    return len(heap)
```
**Time O(n log n) / Space O(n).**

**The regret-greedy idea in general:** commit optimistically, and keep a heap of your
commitments so that when you hit infeasibility you can retract the *worst* one at
`O(log n)` cost. It converts an irreversible greedy into a reversible one **without**
becoming a search. Use it whenever a plain greedy "would be right if only I could take
one thing back."

*Correctness sketch:* by induction on deadlines, after processing the first `i`
courses the heap holds a maximum-size feasible set among them **with minimum total
duration**. Swapping out the longest preserves size and strictly reduces time, so it
can never hurt a later course.

### Furthest Building You Can Reach (LC 1642) — same regret shape

Ladders are unlimited-height; bricks cost the height difference. Reserve the ladders
for the **largest** climbs seen so far.

```python
def furthest_building(heights, bricks, ladders):
    heap = []                                 # min-heap of climbs currently on ladders
    for i in range(len(heights) - 1):
        d = heights[i + 1] - heights[i]
        if d <= 0:
            continue                          # going down is free
        heapq.heappush(heap, d)
        if len(heap) > ladders:               # too many ladders used -> demote smallest
            bricks -= heapq.heappop(heap)
            if bricks < 0:
                return i
    return len(heights) - 1
```
**Time O(n log L) / Space O(L).**

### Minimum Number of Refueling Stops (LC 871) — retroactive refuelling

Drive past every station without stopping; when you run dry, *retroactively* fill up
at the biggest station you passed.

```python
def min_refuel_stops(target, start_fuel, stations):
    heap, fuel, i, stops = [], start_fuel, 0, 0
    while fuel < target:
        while i < len(stations) and stations[i][0] <= fuel:
            heapq.heappush(heap, -stations[i][1])   # bank every reachable station
            i += 1
        if not heap:
            return -1                         # stranded
        fuel -= heapq.heappop(heap)           # spend the largest banked tank
        stops += 1
    return stops
```
**Time O(n log n) / Space O(n).** "Refuelling later at a station you already passed"
is legal because fuel is fungible — that observation is the whole solution.

---

## 6. Pattern 3 — Reachability / jump greedy

**Mental trigger:** the answer is "can I reach the end / how few steps," and each
position advertises how far it can push you.

### Jump Game (LC 55) — track max reach

```python
def can_jump(nums):
    reach = 0
    for i, n in enumerate(nums):
        if i > reach:                         # a gap we can never cross
            return False
        reach = max(reach, i + n)
    return True
```
**Time O(n) / Space O(1).**

### Jump Game II (LC 45) — BFS by levels, without a queue

Each "jump" is a BFS level. `cur_end` is the right edge of the current level;
`farthest` is the right edge of the next.

```python
def jump(nums):
    jumps = cur_end = farthest = 0
    for i in range(len(nums) - 1):            # stop before the last index
        farthest = max(farthest, i + nums[i])
        if i == cur_end:                      # exhausted this level -> jump
            jumps += 1
            cur_end = farthest
    return jumps
```
**Time O(n) / Space O(1).** Proof = the staying-ahead induction in §2(b).

### Gas Station (LC 134) — proved

```python
def can_complete_circuit(gas, cost):
    if sum(gas) < sum(cost):
        return -1                             # globally impossible
    total, start = 0, 0
    for i in range(len(gas)):
        total += gas[i] - cost[i]
        if total < 0:                         # can't reach i+1 from `start`
            start, total = i + 1, 0
    return start
```
**Time O(n) / Space O(1).**

**Proof, both halves:**

*Existence.* Let `d[i] = gas[i] - cost[i]` and `P[k] = d[0] + … + d[k]` (prefix sums).
If `sum(d) ≥ 0`, pick the index `m` where `P` is **minimum**. Starting at `m + 1`, the
tank after reaching index `j` equals `P[j] - P[m]` (wrapping adds `sum(d) ≥ 0`), which
is `≥ 0` by the choice of `m`. So `m + 1` is a valid start.

*The loop finds it.* If the run starting at `start` fails first at index `i`, then no
index in `[start, i]` can be a valid start either: for any `t` in that range the
partial sum from `start` to `t-1` was `≥ 0` (otherwise we'd have reset earlier), so
the sum from `t` to `i` is `≤` the sum from `start` to `i`, which is `< 0`. Hence we
may skip the whole block and reset to `i + 1`. Combined with existence, the final
`start` is valid. ∎

### Candy (LC 135) — two passes over one array

Each child gets ≥ 1 candy; a child with a higher rating than a neighbour gets more.

```python
def candy(ratings):
    n = len(ratings)
    c = [1] * n
    for i in range(1, n):                     # left-to-right: fix the "> left" rule
        if ratings[i] > ratings[i - 1]:
            c[i] = c[i - 1] + 1
    for i in range(n - 2, -1, -1):            # right-to-left: fix "> right", keep max
        if ratings[i] > ratings[i + 1]:
            c[i] = max(c[i], c[i + 1] + 1)
    return sum(c)
```
**Time O(n) / Space O(n).** Two *independent* local constraints; satisfy each greedily
and take the pointwise `max`. The result is the pointwise-minimum valid assignment, so
its sum is minimal.

**Mental trigger:** "constraint looks in both directions" → two sweeps + `max`.

### Partition Labels (LC 763) — last-occurrence sweep

```python
def partition_labels(s):
    last = {c: i for i, c in enumerate(s)}    # last index of each character
    res, start, end = [], 0, 0
    for i, c in enumerate(s):
        end = max(end, last[c])               # this chunk must extend at least to here
        if i == end:                          # every char seen is fully contained
            res.append(end - start + 1)
            start = i + 1
    return res
```
**Time O(n) / Space O(1)** (26 letters). Identical skeleton to Jump Game II —
`end` *is* `cur_end`.

---

## 7. Pattern 4 — Frequency / rearrangement greedy

**Mental trigger:** "arrange items so identical ones are ≥ k apart" or "schedule with
a cooldown." Always: **place the most frequent item first**.

### Task Scheduler (LC 621) — both derivations

*Formula.* Let `f` be the max frequency and `m` the number of tasks tied at `f`. Lay
out the most frequent task as a skeleton of `f - 1` blocks of width `n + 1`, then
append the `m` tail tasks:

```
A _ _ | A _ _ | A _ _ | A B      (f = 4, n = 2, m = 2 with B also at freq 4)
```

Every other task fits into the gaps (there are enough slots because their frequencies
are `≤ f`). If tasks overflow the gaps, no idling is needed at all, so the answer is
just `len(tasks)`.

```python
from collections import Counter, deque

def least_interval(tasks, n):
    freq = Counter(tasks)
    f_max = max(freq.values())
    n_max = sum(1 for v in freq.values() if v == f_max)   # tasks tied at the max
    return max(len(tasks), (f_max - 1) * (n + 1) + n_max)
```
**Time O(N) / Space O(1)** (26 keys).

*Heap simulation* — same answer, but generalises to variants where the formula breaks:

```python
def least_interval_heap(tasks, n):
    heap = [-c for c in Counter(tasks).values()]
    heapq.heapify(heap)
    cooling, time = deque(), 0                # deque of (ready_time, remaining_count)
    while heap or cooling:
        time += 1
        if heap:
            cnt = heapq.heappop(heap) + 1     # run the most frequent available task
            if cnt:
                cooling.append((time + n, cnt))
        if cooling and cooling[0][0] == time:  # cooldown expired -> back in the pool
            heapq.heappush(heap, cooling.popleft()[1])
    return time
```
**Time O(N log 26) / Space O(26).**

### Reorganize String (LC 767)

```python
def reorganize_string(s):
    freq = Counter(s)
    if max(freq.values()) > (len(s) + 1) // 2:
        return ""                             # pigeonhole: impossible
    heap = [(-c, ch) for ch, c in freq.items()]
    heapq.heapify(heap)
    res, prev = [], None
    while heap:
        c, ch = heapq.heappop(heap)           # most frequent that isn't the last used
        res.append(ch)
        if prev:
            heapq.heappush(heap, prev)        # release the one held back
        prev = (c + 1, ch) if c + 1 else None
    return "".join(res)
```
**Time O(n log 26) / Space O(26).** Holding exactly one character back is the whole
trick — it enforces "not adjacent" without any search.

### Rearrange String k Distance Apart (LC 358) — generalise the hold-back to `k`

```python
def rearrange_string(s, k):
    if k <= 1:
        return s
    heap = [(-c, ch) for ch, c in Counter(s).items()]
    heapq.heapify(heap)
    res, waiting = [], deque()                # FIFO of length k-1 on cooldown
    while heap:
        c, ch = heapq.heappop(heap)
        res.append(ch)
        waiting.append((c + 1, ch))
        if len(waiting) >= k:
            c2, ch2 = waiting.popleft()
            if c2:                            # still has copies left
                heapq.heappush(heap, (c2, ch2))
    return "".join(res) if len(res) == len(s) else ""
```
**Time O(n log 26) / Space O(26).** Running out of heap early = impossible.

### Maximum Number of Events That Can Be Attended (LC 1353)

One event per day. Walk the calendar day by day; among events already open, attend the
one that **ends soonest** (activity selection, done online).

```python
def max_events(events):
    events.sort()                             # by start day
    heap, i, day, count = [], 0, 0, 0
    n = len(events)
    while i < n or heap:
        if not heap:
            day = max(day, events[i][0])      # skip dead time
        while i < n and events[i][0] <= day:
            heapq.heappush(heap, events[i][1])   # min-heap of end days
            i += 1
        while heap and heap[0] < day:
            heapq.heappop(heap)               # expired, can never be attended
        if heap:
            heapq.heappop(heap)
            count += 1
        day += 1
    return count
```
**Time O(n log n) / Space O(n).**

---

## 8. Pattern 5 — Digit / lexicographic greedy

**Mental trigger:** "smallest/largest string or number you can form." Decide the
**leftmost** character first — it dominates every character to its right — and use a
stack so you can retract a bad prefix while budget remains.

### Remove K Digits (LC 402) — monotonic stack (see `monotonic_stack.md`)

```python
def remove_k_digits(num, k):
    st = []
    for d in num:
        while k and st and st[-1] > d:        # a bigger digit on the left is always worse
            st.pop()
            k -= 1
        st.append(d)
    if k:
        st = st[:-k]                          # still budget left -> chop the tail
    return "".join(st).lstrip("0") or "0"
```
**Time O(n) / Space O(n).** *Why leftmost-first:* for equal length, the number is
compared digit by digit, so lowering an earlier digit beats any improvement later.

### Smallest Subsequence of Distinct Characters (LC 316 / 1081)

Same stack, plus "I may only pop a character if it appears again later."

```python
def smallest_subsequence(s):
    last = {c: i for i, c in enumerate(s)}
    st, in_st = [], set()
    for i, c in enumerate(s):
        if c in in_st:
            continue                          # already placed, and placed earlier = better
        while st and st[-1] > c and last[st[-1]] > i:   # top reappears later -> drop it
            in_st.discard(st.pop())
        st.append(c)
        in_st.add(c)
    return "".join(st)
```
**Time O(n) / Space O(26).**

### Create Maximum Number (LC 321)

Split `k` between the two arrays every possible way; for each split take the best
subsequence from each (Remove-K-Digits in reverse), then merge greedily.

```python
def max_number(nums1, nums2, k):
    def pick(nums, t):                        # best length-t subsequence, order kept
        drop = len(nums) - t
        st = []
        for x in nums:
            while drop and st and st[-1] < x:
                st.pop()
                drop -= 1
            st.append(x)
        return st[:t]

    def merge(a, b):
        out = []
        while a or b:
            bigger = a if a > b else b        # LIST comparison = correct tie-breaking
            out.append(bigger.pop(0))
        return out

    best = []
    for i in range(max(0, k - len(nums2)), min(k, len(nums1)) + 1):
        best = max(best, merge(pick(nums1, i), pick(nums2, k - i)))
    return best
```
**Time O(k · (n + m + k²)) / Space O(k).** The subtle part is `merge`: comparing the
*whole remaining lists* (not just heads) is required — with heads tied you must look
ahead, and Python's list `>` does exactly that.

### Monotone Increasing Digits (LC 738)

```python
def monotone_increasing_digits(n):
    d = list(str(n))
    mark = len(d)                             # everything from here becomes '9'
    for i in range(len(d) - 1, 0, -1):        # scan right to left
        if d[i - 1] > d[i]:
            d[i - 1] = str(int(d[i - 1]) - 1)
            mark = i
    for i in range(mark, len(d)):
        d[i] = '9'
    return int("".join(d))
```
**Time O(log n) / Space O(log n).** Right-to-left matters: decrementing a digit can
break monotonicity with the digit to *its* left, and the backward scan fixes that on
the next iteration. (`332 → 329 → 299`.)

### Next Permutation (LC 31) — full derivation

We want the smallest permutation strictly greater than the current one.

1. A suffix that is **non-increasing** is already the largest arrangement of its
   elements — nothing inside it can increase. So find the longest such suffix; let `i`
   be the index just before it (the last "ascent", `nums[i] < nums[i+1]`).
2. If no such `i`, the whole array is descending = last permutation → wrap to sorted.
3. To increase as little as possible, `nums[i]` must become the **smallest value in
   the suffix that is still greater than `nums[i]`**. Since the suffix is
   non-increasing, that's the rightmost element exceeding `nums[i]`.
4. After swapping, the suffix is still non-increasing (the swap preserves it), and we
   want it as small as possible → **reverse** it.

```python
def next_permutation(nums):
    i = len(nums) - 2
    while i >= 0 and nums[i] >= nums[i + 1]:  # 1) last ascent
        i -= 1
    if i >= 0:
        j = len(nums) - 1
        while nums[j] <= nums[i]:             # 3) rightmost value > nums[i]
            j -= 1
        nums[i], nums[j] = nums[j], nums[i]
    nums[i + 1:] = reversed(nums[i + 1:])     # 4) make the suffix ascending
    return nums
```
**Time O(n) / Space O(1).**

Largest Number (LC 179) also lives here — see §4.

---

## 9. Pattern 6 — Interval / scheduling greedy

Full treatment in `intervals.md`; here is the greedy lens on it.

### Meeting Rooms II (LC 253) — min rooms = max concurrency

```python
def min_meeting_rooms(intervals):
    heap = []                                 # min-heap of end times = busy rooms
    for s, e in sorted(intervals):
        if heap and heap[0] <= s:
            heapq.heappop(heap)               # a room freed up before this start
        heapq.heappush(heap, e)
    return len(heap)
```
**Time O(n log n) / Space O(n).** Greedy choice: always reuse the room that frees
earliest; if even that one is busy you provably need a new room.

### Employee Free Time (LC 759)

```python
def employee_free_time(schedule):
    ivs = sorted(iv for emp in schedule for iv in emp)
    res, end = [], ivs[0][1]
    for s, e in ivs[1:]:
        if s > end:                           # gap between merged coverage and next
            res.append([end, s])
        end = max(end, e)
    return res
```
**Time O(n log n) / Space O(n).**

### Min Taps to Water a Garden (LC 1326) / Video Stitching (LC 1024) — **reduce to Jump Game II**

Show the reduction explicitly; it is the entire insight.

Tap `i` with range `r` covers `[i - r, i + r]`. Build an array
`reach[left] = max right endpoint of any interval starting at or before left`. Now
"minimum intervals to cover `[0, n]`" is literally "minimum jumps from 0 to n" with
`nums[i] = reach[i] - i`.

```python
def min_taps(n, ranges):
    reach = [0] * (n + 1)
    for i, r in enumerate(ranges):
        if r == 0:
            continue
        left = max(0, i - r)
        reach[left] = max(reach[left], i + r) # collapse each tap to (start -> furthest)
    taps = cur_end = farthest = 0
    for i in range(n):                        # identical body to Jump Game II
        farthest = max(farthest, reach[i])
        if i == farthest:
            return -1                         # stuck: nothing covers position i
        if i == cur_end:
            taps += 1
            cur_end = farthest
    return taps

def video_stitching(clips, time):
    reach = [0] * time
    for s, e in clips:
        if s < time:
            reach[s] = max(reach[s], e)
    count = cur_end = farthest = 0
    for i in range(time):
        farthest = max(farthest, reach[i])
        if i == farthest:
            return -1
        if i == cur_end:
            count += 1
            cur_end = farthest
    return count
```
**Time O(n + m) / Space O(n).**

**Mental trigger:** "minimum number of intervals to cover a segment" → *always* the
jump-game reduction, never a sort-by-length heuristic.

### Split Array into Consecutive Subsequences (LC 659)

Every subsequence must be consecutive and length ≥ 3. Greedy: **extend an existing run
if you can**, otherwise start a new run of exactly 3.

```python
def is_possible(nums):
    count = Counter(nums)
    ends = Counter()                          # runs waiting to be extended, by last value
    for x in nums:
        if not count[x]:
            continue                          # already consumed by an earlier run
        count[x] -= 1
        if ends[x - 1]:
            ends[x - 1] -= 1                  # extending is never worse than starting
            ends[x] += 1
        elif count[x + 1] and count[x + 2]:
            count[x + 1] -= 1
            count[x + 2] -= 1
            ends[x + 2] += 1
        else:
            return False
    return True
```
**Time O(n) / Space O(n).** *Exchange:* if an optimal packing starts a new run at `x`
while a run ends at `x-1`, moving `x` (and its tail) onto that run keeps both runs
valid and lengths ≥ 3.

---

## 10. Pattern 7 — Local invariants ("sum of good local moves")

**Mental trigger:** the global objective decomposes into a sum of independent local
decisions, so "best globally" = "best at each step."

### Best Time to Buy and Sell Stock II (LC 122) — proved

```python
def max_profit(prices):
    return sum(max(prices[i + 1] - prices[i], 0) for i in range(len(prices) - 1))
```
**Time O(n) / Space O(1).**

*Proof.* Any sequence of non-overlapping buy/sell pairs `(b, s)` has profit
`prices[s] - prices[b] = Σ_{i=b}^{s-1} (prices[i+1] - prices[i])` — a telescoping sum
of daily deltas. So **every** strategy's profit is a sum of a *disjoint subset* of
daily deltas, and the best such subset is obviously "all the positive ones." That set
is achievable (buy at the start of each rising run, sell at its peak). Hence the sum
of positive deltas is both an upper bound and attainable. ∎

### Wiggle Subsequence (LC 376)

```python
def wiggle_max_length(nums):
    up = down = 1                             # longest wiggle ending on an up / down move
    for i in range(1, len(nums)):
        if nums[i] > nums[i - 1]:
            up = down + 1
        elif nums[i] < nums[i - 1]:
            down = up + 1
    return max(up, down)
```
**Time O(n) / Space O(1).** Greedy reading: only *direction changes* count, so the
answer is the number of local extrema — flat stretches and mid-slope points are free
to drop.

### Minimum Add to Make Parentheses Valid (LC 921)

```python
def min_add_to_make_valid(s):
    open_need = add = 0
    for c in s:
        if c == '(':
            open_need += 1
        elif open_need:
            open_need -= 1                    # match the most recent unmatched '('
        else:
            add += 1                          # unmatched ')' -> must insert '(' now
    return add + open_need
```
**Time O(n) / Space O(1).** Every unmatched bracket needs exactly one insertion and
insertions never help two brackets at once → the count is a tight lower bound.

### Score After Flipping Matrix (LC 861)

Two independent greedy rules, applied by column significance:

1. Every row must start with `1` (the leading bit is worth more than *all* the rest
   combined) → flip any row whose first entry is `0`.
2. Then each remaining column independently: flip it if that yields more `1`s.

```python
def matrix_score(grid):
    m, n = len(grid), len(grid[0])
    score = (1 << (n - 1)) * m                # column 0 is all 1s after row flips
    for j in range(1, n):
        # after the row flip, cell (i, j) is 1 exactly when grid[i][j] == grid[i][0]
        ones = sum(grid[i][j] == grid[i][0] for i in range(m))
        score += max(ones, m - ones) * (1 << (n - 1 - j))
    return score
```
**Time O(m·n) / Space O(1).** The trick is doing the row flips *virtually* via the
comparison to column 0.

### Bag of Tokens (LC 948)

```python
def bag_of_tokens_score(tokens, power):
    tokens.sort()
    i, j, score, best = 0, len(tokens) - 1, 0, 0
    while i <= j:
        if power >= tokens[i]:                # spend the CHEAPEST token for a point
            power -= tokens[i]
            i += 1
            score += 1
            best = max(best, score)
        elif score:                           # sell the PRICIEST token for power
            power += tokens[j]
            j -= 1
            score -= 1
        else:
            break
    return best
```
**Time O(n log n) / Space O(1).** Buy low, sell high — and record `best` before any
sell-back, since the score can dip.

### Advantage Shuffle (LC 870) — "use my worst card against their best"

The Tian Ji horse racing strategy.

```python
def advantage_count(nums1, nums2):
    mine = sorted(nums1)
    order = sorted(range(len(nums2)), key=lambda i: nums2[i])
    res = [0] * len(nums1)
    lo, hi = 0, len(mine) - 1
    for idx in reversed(order):               # strongest opponent first
        if mine[hi] > nums2[idx]:
            res[idx] = mine[hi]               # beat them with my best
            hi -= 1
        else:
            res[idx] = mine[lo]               # unbeatable -> throw away my worst
            lo += 1
    return res
```
**Time O(n log n) / Space O(n).** *Exchange:* if my strongest card cannot beat their
strongest, no card can, so that opponent is a guaranteed loss — spend the least
valuable card on it.

---

## 11. Greedy classics: Huffman, MST, Dijkstra

### Huffman coding — the canonical greedy

Build an optimal prefix-free code by repeatedly merging the two **least frequent**
symbols.

```python
import itertools

def huffman_codes(freq):
    """freq: {symbol: weight} -> {symbol: bit string}"""
    tie = itertools.count()                   # keeps heap tuples comparable
    heap = [(w, next(tie), sym) for sym, w in freq.items()]
    heapq.heapify(heap)
    if len(heap) == 1:
        return {heap[0][2]: "0"}              # degenerate single-symbol alphabet
    while len(heap) > 1:
        w1, _, a = heapq.heappop(heap)        # two lightest subtrees merge
        w2, _, b = heapq.heappop(heap)
        heapq.heappush(heap, (w1 + w2, next(tie), (a, b)))

    codes = {}
    def walk(node, path):
        if isinstance(node, tuple):
            walk(node[0], path + "0")
            walk(node[1], path + "1")
        else:
            codes[node] = path
    walk(heap[0][2], "")
    return codes
```
**Time O(n log n) / Space O(n).**

*Exchange argument:* in an optimal tree the two deepest leaves are siblings (otherwise
promote one and cost drops). The two least-frequent symbols can be swapped into those
deepest positions without increasing `Σ freq × depth`, because swapping a smaller
frequency to a deeper level and a larger one shallower changes cost by
`(f_small - f_large)(d_deep - d_shallow) ≤ 0`. Merging them is therefore safe, and the
remaining problem is the same problem with one fewer symbol. ∎

### Minimum Cost to Connect Sticks (LC 1167) — Huffman without the tree

```python
def connect_sticks(sticks):
    heapq.heapify(sticks)
    cost = 0
    while len(sticks) > 1:
        a = heapq.heappop(sticks)
        b = heapq.heappop(sticks)
        cost += a + b                         # every merge charges both subtrees again
        heapq.heappush(sticks, a + b)
    return cost
```
**Time O(n log n) / Space O(1)** in-place. Literally the Huffman recurrence — a stick's
length is counted once per level of the merge tree, i.e. `Σ length × depth`.

### MST — Kruskal & Prim (cross-ref `graphs.md`)

Both are greedy; both are justified by the **cut property**: for any cut of the graph,
the lightest crossing edge belongs to some MST.

```python
def kruskal(n, edges):                        # edges = [(weight, u, v), ...]
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]     # path halving
            x = parent[x]
        return x

    total, used = 0, 0
    for w, u, v in sorted(edges):             # globally lightest edge first
        ru, rv = find(u), find(v)
        if ru != rv:                          # adding it keeps the forest acyclic
            parent[ru] = rv
            total += w
            used += 1
    return total if used == n - 1 else -1     # -1 = disconnected

def prim(n, adj):                             # adj[u] = [(v, weight), ...]
    visited = [False] * n
    heap, total, seen = [(0, 0)], 0, 0
    while heap and seen < n:
        w, u = heapq.heappop(heap)
        if visited[u]:
            continue
        visited[u] = True                     # lightest edge crossing the visited cut
        total += w
        seen += 1
        for v, wt in adj[u]:
            if not visited[v]:
                heapq.heappush(heap, (wt, v))
    return total if seen == n else -1
```
**Kruskal: O(E log E) / O(V). Prim: O(E log V) / O(V + E).**

Kruskal is exactly the matroid greedy from §2(c) on the graphic matroid — that's *why*
"sort all edges and take whatever doesn't cycle" needs no problem-specific proof.

### Dijkstra — greedy over a growing "settled" set

```python
def dijkstra(n, adj, src):
    dist = [float('inf')] * n
    dist[src] = 0
    heap = [(0, src)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue                          # stale entry
        for v, w in adj[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(heap, (dist[v], v))
    return dist
```
**Time O((V + E) log V) / Space O(V).** Greedy choice: the unsettled node with the
smallest tentative distance is already final. The proof needs **non-negative weights**
— with a negative edge, a longer-looking path could later shrink, the greedy choice
property dies, and you must use Bellman-Ford (which is DP).

---

## 12. Greedy vs DP — decision guide

**Try greedy first when:**
- Sorting by an obvious key makes the problem trivial to state.
- The objective is a *count* (max items, min steps) rather than a weighted optimum.
- Items are divisible, or "take one whole item" has no capacity interaction.
- The constraint is local ("no two adjacent," "≥ 3 in a row," "within k").
- `n` is up to `10^5`–`10^6` — DP over subsets/values wouldn't fit anyway.

**Fall back to DP when:**
- Items are indivisible **and** interact through a shared budget (0/1 knapsack).
- The best first move depends on the *shape* of the remainder (Min Cost to Cut a
  Stick, Burst Balloons, Matrix Chain).
- Two players alternate (Stone Game — minimax, not greedy).
- You found a counterexample in the §3 checklist and can't repair the sort key.

**Say this out loud in the interview:**

> "My first instinct is greedy: sort by finish time and sweep. Before I commit, let me
> try to break it — ties, one huge interval versus many small ones, exact-fit cases.
> [30 seconds of probing.] I can't break it, and here's why: exchange argument — take
> any optimal solution, and the earliest-finishing interval can replace its first pick
> without reducing the count, so an optimal solution exists that starts with my greedy
> choice; induct. That's `O(n log n)` time, `O(1)` extra space. If you'd rather I
> assume nothing, the safe fallback is an `O(n²)` DP on the same sorted order."

That paragraph — probe, prove, complexity, fallback — is the answer they're grading.

---

## 13. Common pitfalls

1. **Shipping a greedy with no proof.** "It passed the examples" is not an argument.
   Always attempt the exchange argument, even briefly.
2. **Sorting by the wrong key.** Activity selection by *start* or by *duration* is
   wrong; only *finish* works. Two City Scheduling by `a` alone is wrong; only `a - b`
   works. When in doubt, write down what the key is supposed to prove.
3. **Arbitrary tie-breaking.** Min Arrows uses `>` while Non-overlapping Intervals uses
   `>=`; Queue Reconstruction needs `k` ascending inside equal heights. Ties are where
   greedy silently breaks.
4. **Sample-passing, adversary-failing.** LeetCode examples are friendly. Test:
   all-equal, strictly decreasing, one dominant element, `n = 1`, empty.
5. **Greedy on 0/1 knapsack** (and its disguises: "select at most k items with weights
   to maximise value"). Ratio-greedy is unbounded-error there. Divisible → greedy,
   indivisible → DP.
6. **Forgetting negatives / zeros.** Ratio sorts crash or invert with zero weights;
   "sum of positive deltas" needs the `max(…, 0)`; max-reach logic assumes
   non-negative jumps. Dijkstra dies on negative edges.
7. **An irreversible choice that needed a regret heap.** If a plain greedy is right
   "except when it overshoots," don't switch to DP — add a max-heap of commitments and
   retract the worst (Course Schedule III, Furthest Building, Refueling Stops).
8. **Mixing two greedy criteria in one pass.** "Sort by ratio, tie-break by weight,
   then also prefer short ones" is a heuristic, not an algorithm. A correct greedy has
   **one** key (possibly a proven comparator) — if you need two, one of them belongs in
   a heap, or you need DP.
9. **Applying `% MOD` mid-computation** and then taking a `max`/`min` of the results
   (Maximum Performance of a Team). Reduce only at the end.
10. **Assuming a local optimum is reachable.** Jump/coverage problems must check
    "did I actually make progress this round" (`if i == farthest: return -1`) or they
    silently return a wrong count.

---

## 14. Cheat sheets

### Complexity

| Shape | Time | Space |
|---|---|---|
| Sort + single sweep | `O(n log n)` | `O(1)` |
| Sort + heap (top-k / regret) | `O(n log n)` | `O(k)` |
| Counting/frequency greedy | `O(n + Σ)` | `O(Σ)` |
| Reachability sweep (jump/cover) | `O(n)` | `O(1)` |
| Monotonic-stack lexicographic | `O(n)` | `O(n)` |
| Huffman / connect sticks | `O(n log n)` | `O(n)` |
| Kruskal / Prim | `O(E log E)` / `O(E log V)` | `O(V)` |
| Dijkstra | `O((V + E) log V)` | `O(V)` |

### Phrasing → pattern

| The problem says… | Reach for |
|---|---|
| "maximum number of non-overlapping…" | sort by **end**, sweep (§4) |
| "minimum removals/arrows so that…" | same, answer = `n - kept` (§4) |
| "exactly half to A, half to B" | sort by **difference** (§4) |
| "pair up items under a limit" | sort + two pointers (§4) |
| "largest/smallest number from these parts" | custom comparator (§4) or stack (§8) |
| "each item has (cost, value), pick k" | sort one, **heap** the other (§5) |
| "…but I might need to undo a choice" | **regret heap** (§5) |
| "can I reach / fewest steps to reach" | max-reach sweep (§6) |
| "minimum intervals to cover [0, n]" | reduce to **Jump Game II** (§9) |
| "no two identical within k / cooldown" | frequency max-heap + cooldown queue (§7) |
| "lexicographically smallest subsequence" | monotonic stack + remaining-count (§8) |
| "merge things, cost = sum of merged" | **Huffman** min-heap (§11) |
| "connect all nodes cheaply" | **MST** (§11) |
| "two players play optimally" | **not greedy** → DP/minimax (§12) |
| "cut/split at a point, cost depends on both halves" | **not greedy** → interval DP (§12) |

---

## 15. Google-favourite problem list

### Basic (warm-ups — know these cold)
1. **Assign Cookies** (LC 455) — sort both, two pointers; smallest cookie that satisfies the least greedy child.
2. **Lemonade Change** (LC 860) — always give a `$10` back before two `$5`s; hoard the flexible bill.
3. **Best Time to Buy and Sell Stock** (LC 121) — track running min; not really greedy, but the same one-pass invariant.
4. **Best Time to Buy and Sell Stock II** (LC 122) — sum of positive deltas; telescoping proof (§10).
5. **Maximum Units on a Truck** (LC 1710) — sort by units per box descending, fill.
6. **Container With Most Water** (LC 11) — two pointers; always move the shorter wall (the taller one can't improve while the shorter binds).
7. **Minimum Add to Make Parentheses Valid** (LC 921) — one counter each way (§10).
8. **Increasing Triplet Subsequence** (LC 334) — greedily keep the smallest and second-smallest seen.

### Core (the interval / sweep block)
9. **Non-overlapping Intervals** (LC 435) — sort by end; `n - kept` (§4, `intervals.md`).
10. **Minimum Number of Arrows** (LC 452) — same, `>` for touching balloons.
11. **Meeting Rooms II** (LC 253) — min-heap of end times = max concurrency.
12. **Employee Free Time** (LC 759) — merge everything, report the gaps.
13. **Partition Labels** (LC 763) — last-occurrence sweep.
14. **Merge Intervals** (LC 56) — sort by start; the base skill for all of the above.

### Core (jump / reachability)
15. **Jump Game** (LC 55) — max reach.
16. **Jump Game II** (LC 45) — level-by-level greedy; staying-ahead proof.
17. **Gas Station** (LC 134) — total ≥ 0 ⟹ solvable; start after the minimum prefix.
18. **Video Stitching** (LC 1024) — jump-game reduction.
19. **Minimum Taps to Water a Garden** (LC 1326) — same reduction, harder to spot.
20. **Jump Game IV** (LC 1345) — *contrast*: arbitrary teleports break the max-reach argument; this is **BFS**, not greedy.

### Core (sort + heap)
21. **IPO** (LC 502) — unlock by capital, pick by profit.
22. **Furthest Building You Can Reach** (LC 1642) — ladders for the largest climbs.
23. **Minimum Number of Refueling Stops** (LC 871) — retroactive refuelling.
24. **Minimum Cost to Connect Sticks** (LC 1167) — Huffman merge.
25. **Task Scheduler** (LC 621) — formula and heap; know both derivations.

### Advanced
26. **Course Schedule III** (LC 630) — the regret heap. Google favourite.
27. **Minimum Cost to Hire K Workers** (LC 857) — fix the ratio, heap the qualities.
28. **Maximum Performance of a Team** (LC 1383) — fix the min efficiency, heap the speeds.
29. **Candy** (LC 135) — two directional passes, pointwise max.
30. **Queue Reconstruction by Height** (LC 406) — tall-first insertion invariant.
31. **Two City Scheduling** (LC 1029) — the delta insight.
32. **Boats to Save People** (LC 881) — sorted two pointers.
33. **Car Fleet** (LC 853) — arrival times, sweep from the target backwards.
34. **Advantage Shuffle** (LC 870) — Tian Ji's horses; sacrifice the worst card.
35. **Bag of Tokens** (LC 948) — buy cheap, sell dear, record the peak.
36. **Broken Calculator** (LC 991) — *work backwards*: halve when even, `+1` when odd.
37. **Remove K Digits** (LC 402) — monotonic stack (`monotonic_stack.md`).
38. **Create Maximum Number** (LC 321) — split `k`, pick, merge with list comparison.
39. **Smallest Subsequence of Distinct Characters** (LC 316/1081) — stack + last index.
40. **Monotone Increasing Digits** (LC 738) — right-to-left decrement, then `9`-fill.
41. **Next Permutation** (LC 31) — ascent, swap, reverse.
42. **Largest Number** (LC 179) — pairwise comparator; prove transitivity.
43. **Reorganize String** (LC 767) / **Rearrange String k Distance Apart** (LC 358) — hold-back queue.
44. **Maximum Number of Events That Can Be Attended** (LC 1353) — online activity selection.
45. **Split Array into Consecutive Subsequences** (LC 659) — extend before you start.
46. **Minimum Deletions to Make Character Frequencies Unique** (LC 1647) — walk each frequency down to a free slot.
47. **Score After Flipping Matrix** (LC 861) — MSB first, then per-column majority.
48. **Wiggle Subsequence** (LC 376) — count direction changes.
49. **Text Justification** (LC 68) — greedy line fill (pack words until overflow), then distribute spaces left-heavy. See `strings.md`.
50. **Minimum Cost to Cut a Stick** (LC 1547) — *contrast*: "always cut the longest piece" is wrong; the cost of a cut depends on the segment it lands in → **interval DP** on sorted cut positions.
51. **Stone Game I/II/III** (LC 877/1140/1406) — *contrast*: "take the bigger end" fails for II/III; alternating optimal play is **minimax DP**.

---

## 16. Quiz

**Q1.** For activity selection, why is sorting by *shortest duration* wrong? Give the
smallest counterexample.
<details><summary>Answer</summary>
`[0,5], [4,6], [5,10]`. The shortest is `[4,6]`, which overlaps both others, so greedy
returns 1. The optimum is 2 (`[0,5]` and `[5,10]`). Sorting by finish time picks
`[0,5]` first and gets 2.
</details>

**Q2.** Is this greedy correct? *"To make change with coins `{1, 5, 10, 25}`, always
take the largest coin that fits."* What about `{1, 3, 4}`?
<details><summary>Answer</summary>
Correct for `{1,5,10,25}` (a canonical system — provable by an exchange argument on the
number of each coin), wrong in general. For `{1,3,4}` and target 6, greedy gives
`4+1+1 = 3` coins; the optimum is `3+3 = 2`. Fix: DP,
`dp[a] = 1 + min(dp[a-c])`.
</details>

**Q3.** Is this greedy correct? *"Given `(value, weight)` items and capacity `W`, take
whole items in decreasing value/weight ratio."* Prove it or break it.
<details><summary>Answer</summary>
Wrong for 0/1 knapsack. `W = 10`, items `(10, 6), (8, 5), (8, 5)`: greedy takes the
ratio-1.67 item and can fit nothing else → 10. Optimum takes both ratio-1.6 items → 16.
The error can be made arbitrarily large. It *is* correct for the **fractional**
version, where the exchange argument works: swapping any unit of weight from a lower
ratio item to a higher one strictly improves the value.
</details>

**Q4.** In Gas Station, why is "if `sum(gas) ≥ sum(cost)` a solution exists" true, and
why is the reset-to-`i+1` loop guaranteed to find it?
<details><summary>Answer</summary>
Let `d[i] = gas[i] - cost[i]` and `P` its prefix sums. Starting just after the index
where `P` is minimal, every partial sum is `P[j] - P[min] ≥ 0`, so the tank never goes
negative. For the loop: if the run from `start` first fails at `i`, then for any `t` in
`[start, i]` the sum from `start` to `t-1` was `≥ 0`, so the sum from `t` to `i` is
`≤` the (negative) sum from `start` to `i` — every intermediate start also fails, so
skipping to `i+1` loses nothing.
</details>

**Q5.** Task Scheduler: derive `(f_max - 1) * (n + 1) + n_max` and say when it is *not*
the answer.
<details><summary>Answer</summary>
The most frequent task forces `f_max - 1` complete blocks of width `n + 1`
(task + `n` slots), plus a final partial block containing the `n_max` tasks tied at the
maximum frequency. When there are enough other tasks to fill every idle slot, no idling
occurs and the answer is simply `len(tasks)` — hence the outer `max(len(tasks), …)`.
</details>

**Q6.** Queue Reconstruction by Height inserts at index `k` — why doesn't a later
insertion invalidate an earlier person's count?
<details><summary>Answer</summary>
People are processed tallest-first, so anyone inserted later is **strictly shorter**
than everyone already placed. A shorter person never counts toward a taller person's
`k`, so shifting someone right by a later insertion leaves their "number of ≥-height
people in front" unchanged. The `k`-ascending tie-break handles equal heights, where
the shorter-`k` person must be placed first.
</details>

**Q7.** What is a "regret heap" and which two signals tell you to use one?
<details><summary>Answer</summary>
A max-heap of the choices you have already committed to, so that when the greedy
becomes infeasible you can retract the single worst commitment in `O(log n)` instead of
restarting. Signals: (1) the greedy is right except that it sometimes *overshoots* a
budget/deadline; (2) retracting a choice keeps the solution the same **size** while
strictly improving a resource. Canonical: Course Schedule III, Furthest Building You
Can Reach, Minimum Number of Refueling Stops.
</details>

**Q8.** You've proposed a greedy in an interview and can't prove it. What do you say?
<details><summary>Answer</summary>
Name the risk explicitly and offer the fallback: "I believe sorting by X is optimal but
my exchange argument isn't closing — the case I can't rule out is [ties / a large item
blocking many small ones]. Rather than ship an unproven greedy, here's an `O(n·W)` DP
that's definitely correct; if you'd like, I'll spend two more minutes on the exchange
argument to get back to `O(n log n)`." Correct-and-slower beats fast-and-unproven, and
naming the failure case is what gets graded.
</details>

---

## 17. Mini project — meeting-room allocator + policy comparison

Build a tiny scheduler that allocates real rooms to meeting requests and compares the
provably-optimal greedy against two plausible-looking heuristics. The point is to
*measure* how badly a wrong sort key loses.

```python
import heapq
import random


def allocate_rooms(meetings):
    """Optimal room assignment: sort by start, reuse the room that frees earliest.
    Returns (rooms_used, {meeting -> room_id}). Time O(n log n), Space O(n)."""
    free = []                                  # room ids currently idle (min-heap)
    busy = []                                  # (end_time, room_id)
    assignment, next_id = {}, 0
    for s, e, name in sorted(meetings):
        while busy and busy[0][0] <= s:        # release every room freed by time s
            heapq.heappush(free, heapq.heappop(busy)[1])
        if free:
            room = heapq.heappop(free)
        else:
            room, next_id = next_id, next_id + 1
        assignment[name] = room
        heapq.heappush(busy, (e, room))
    return next_id, assignment


def max_meetings_one_room(meetings, key):
    """How many meetings fit in a SINGLE room under a given sort key."""
    kept, prev_end = [], float('-inf')
    for s, e, name in sorted(meetings, key=key):
        if s >= prev_end:
            kept.append(name)
            prev_end = e
    return kept


POLICIES = {
    "by_end   (optimal)": lambda m: m[1],
    "by_start (naive)  ": lambda m: m[0],
    "by_length(naive)  ": lambda m: m[1] - m[0],
}


def compare(trials=2000, n=12, horizon=40, seed=7):
    rng = random.Random(seed)
    totals = {p: 0 for p in POLICIES}
    for _ in range(trials):
        meetings = []
        for i in range(n):
            s = rng.randrange(horizon)
            meetings.append((s, s + rng.randint(1, 8), f"m{i}"))
        for name, key in POLICIES.items():
            totals[name] += len(max_meetings_one_room(meetings, key))
    return {p: totals[p] / trials for p in POLICIES}


if __name__ == "__main__":
    demo = [(0, 30, "standup"), (5, 10, "1:1"), (15, 20, "design"),
            (10, 15, "retro"), (25, 35, "review")]
    rooms, plan = allocate_rooms(demo)
    print(f"rooms needed: {rooms}")
    for name in sorted(plan):
        print(f"  {name:8} -> room {plan[name]}")
    print("\navg meetings booked into ONE room (higher is better):")
    for policy, avg in compare().items():
        print(f"  {policy}: {avg:.2f}")
```

**Extensions to try**
1. Add room *capacities* and required attendee counts — now it's a bipartite matching
   problem, and pure greedy stops being optimal. Find the counterexample.
2. Add per-meeting priorities and maximise total priority in one room. Greedy by
   `priority / duration` fails — build the counterexample, then write the
   weighted-interval-scheduling DP (sort by end + binary search, see `dp.md`).
3. Swap the domain: implement LRU vs LFU vs Belady's optimal for a CDN cache and
   measure the hit-rate gap. Belady ("evict the item used furthest in the future") is
   the provably optimal offline greedy — LRU is the online approximation of it.
