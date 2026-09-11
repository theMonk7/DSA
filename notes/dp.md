# Dynamic Programming — Complete Guide

> Google DSA prep notes. Category: Dynamic Programming (all patterns).
> DP is not a trick you memorize — it is a *procedure* you execute: define state,
> write transition, set base cases, pick an order, read off the answer.

## 1. What DP actually is

Dynamic programming = **recursion + reuse**. You get to use it when a problem has
both of these properties:

1. **Optimal substructure** — the optimal answer to the whole problem is built
   from optimal answers to smaller *subproblems* of the same shape.
   ("Best way to make 11 cents" uses "best way to make 11 - coin cents".)
2. **Overlapping subproblems** — the same subproblem is reached many times along
   different recursion paths, so caching it pays off.

If only (1) holds and each subproblem appears once, you have **divide and conquer**
(merge sort, quick sort, binary search) — a cache buys you nothing there.

### DP vs divide and conquer

| | Divide & conquer | Dynamic programming |
|---|---|---|
| Subproblems | Disjoint, seen once | Overlapping, seen many times |
| Combine | Merge results | Take max/min/sum over choices |
| Memory | Call stack only | Table / memo of size = #states |
| Example | Merge sort | Coin change |

### DP vs greedy — a concrete failure

Greedy commits to a locally best choice and never revisits it. That is only valid
when an *exchange argument* proves the local choice is safe. Coin change breaks it:

```python
coins = [1, 3, 4]
target = 6

# Greedy (always take the biggest coin that fits):
#   6 -> take 4  (rem 2)
#   2 -> take 1  (rem 1)
#   1 -> take 1  (rem 0)
#   => 3 coins.  WRONG.
# DP explores all first choices:
#   3 + 3 = 6    => 2 coins.  OPTIMAL.
```

```python
def min_coins(coins, target):
    INF = float('inf')
    dp = [0] + [INF] * target           # dp[a] = fewest coins summing to a
    for a in range(1, target + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1   # try EVERY first coin, keep the best
    return -1 if dp[target] == INF else dp[target]
```
**Time O(target × len(coins)) / Space O(target)**

**Mental trigger:** if you can describe a brute-force that "tries every choice at
every step" and the recursion re-visits identical situations, that is DP. Greedy is
DP where you can *prove* only one branch needs exploring.

---

## 2. The universal 5-step recipe

This is the heart of the file. Every DP problem, without exception, is these five
steps. Do them **on paper, in this order, before writing any code.**

> **(1) State** — write in English what `dp[...]` means. It must be a *complete
> description of the situation* and it must be a *number* (or small tuple).
> **(2) Transition** — from a state, what choices exist, and what smaller states do
> they lead to? Write the recurrence.
> **(3) Base cases** — the smallest states whose answer you know without recursing.
> **(4) Order** — iterate so every state's dependencies are already computed
> (a topological order of the dependency DAG).
> **(5) Answer + space** — which cell is the answer? Then shrink memory.

### Applied end-to-end: House Robber (LC 198)

Houses in a line, `nums[i]` money, cannot rob two adjacent houses. Maximize loot.

**Step 1 — State (English first!)**
> `dp[i]` = the maximum money obtainable considering only houses `0..i`, where
> house `i` may or may not be robbed.

Sanity check: is that enough to make the next decision? At house `i+1` I only need
to know "best if I already handled up to `i`" and "best if I already handled up to
`i-1`" (because adjacency reaches back exactly one house). Yes — state is complete.

**Step 2 — Transition.** At house `i` there are exactly two choices:

```
rob it   -> nums[i] + dp[i-2]      (must skip i-1)
skip it  -> dp[i-1]
dp[i] = max(nums[i] + dp[i-2], dp[i-1])
```

**Step 3 — Base cases.**
```
dp[0] = nums[0]
dp[1] = max(nums[0], nums[1])
```

**Step 4 — Order.** `dp[i]` depends on `i-1` and `i-2`, both smaller → iterate `i`
increasing. (Dependency DAG points backwards, so go forwards.)

**Step 5 — Answer.** `dp[n-1]`.

```python
def rob(nums):
    n = len(nums)
    if n == 0: return 0
    if n == 1: return nums[0]
    dp = [0] * n
    dp[0] = nums[0]
    dp[1] = max(nums[0], nums[1])
    for i in range(2, n):
        dp[i] = max(dp[i - 1], nums[i] + dp[i - 2])
    return dp[-1]
```
**Time O(n) / Space O(n)**

**Space optimization** — the recurrence only reads two cells back, so keep two scalars:

```python
def rob(nums):
    prev2 = prev1 = 0          # dp[i-2], dp[i-1]
    for x in nums:
        prev2, prev1 = prev1, max(prev1, prev2 + x)
    return prev1
```
**Time O(n) / Space O(1)**

**Mental trigger:** if you cannot say your state out loud as one English sentence,
you do not have a state yet — and no amount of code will fix that.

---

## 3. Memoization (top-down) vs tabulation (bottom-up)

### Top-down: write the recursion, add one decorator

```python
from functools import cache      # Python 3.9+; use lru_cache(None) below that

def rob(nums):
    n = len(nums)

    @cache
    def best(i):                 # best loot from houses i..n-1
        if i >= n:
            return 0
        return max(best(i + 1), nums[i] + best(i + 2))

    ans = best(0)
    best.cache_clear()           # avoid holding the closure alive
    return ans
```

### Bottom-up: allocate the table, fill in dependency order

Same recurrence, loop instead of stack (see §2 code).

| | Top-down (memo) | Bottom-up (table) |
|---|---|---|
| Writing effort | Low — mirrors brute force | Higher — must find the order |
| Computes | Only *reachable* states (can be far fewer) | All states |
| Constant factor | Slower (call overhead, hashing) | Faster (array indexing) |
| Space optimization | Hard | Easy (rolling arrays) |
| Risk | `RecursionError` at depth ~1000 in Python | None |
| Best for | Irregular/sparse state spaces, digit DP, bitmask DP | Dense tables, tight limits |

**Python recursion-depth caveat.** Default limit is 1000. A memoized DP over
`n = 10^5` will blow the stack. Options: `sys.setrecursionlimit(300000)` *plus*
raising the thread stack size, or — better in interviews — convert to bottom-up.

```python
import sys, threading
sys.setrecursionlimit(1 << 25)
threading.stack_size(1 << 26)
threading.Thread(target=main).start()   # only if you must keep recursion
```

### Converting memo → table mechanically

1. List the recursion parameters → those are the table dimensions.
2. Terminal `return` values → base cases in the table.
3. Reverse the direction: recursion computes `f(i)` from `f(i+1)`, so the loop runs
   `i` from `n-1` down to `0` (and vice versa).
4. Replace every `f(args)` call with `dp[args]`.
5. The answer is `dp[<initial call args>]`.

**Mental trigger:** write it top-down first to *discover* the recurrence, then
convert to bottom-up if `n` is large or you need `O(1)` space.

---

## 4. How to FIND the state (the hardest part)

Ask exactly one question:

> **"What is the minimum I must remember about the past in order to make the next
> decision correctly?"**

Everything you must remember becomes a state dimension. Everything you can forget
must be forgotten (or your table explodes).

### The standard state vocabulary

| Dimension | Meaning | Typical problems |
|---|---|---|
| `i` — index / position | "I have processed the first `i` items" | almost all DP |
| `c` — remaining capacity / budget | knapsack weight, target sum, money left | knapsack, coin change |
| `last` — last taken value/index | needed when a constraint compares to the previous pick | LIS, delete-and-earn |
| `k` — count used | at most `k` transactions/removals/deletions | stock IV, k-deletions |
| `flag` — boolean on/off | holding stock, in cooldown, already started | state machines, digit DP |
| `(i, j)` — two pointers | two sequences, or a *range* of one sequence | edit distance, interval DP |
| `mask` — bitmask of a small set | which of ≤20 items are used | TSP, assignment |
| `(r, c)` | grid position | grid DP |
| `mod` / remainder | sum modulo k | divisible-subarray DP |

### Worked state-finding examples

- *"Max money robbing non-adjacent houses"* → to decide at house `i` I need only
  whether `i-1` was robbed → state `i` plus the two-scalar recurrence. **1D.**
- *"Pick items to hit weight ≤ W"* → I need position **and** how much capacity is
  left → `dp[i][w]`. **2D.**
- *"Longest increasing subsequence"* → I need position **and** what the last chosen
  value was → `dp[i]` = LIS *ending at* `i` encodes "last = nums[i]". **1D by trick.**
- *"At most k stock transactions"* → position, transactions used, holding or not →
  `dp[i][k][0/1]`. **3D.**
- *"Visit all cities once"* → which cities visited + where I am now →
  `dp[mask][city]`. **Bitmask.**

**Mental trigger:** every constraint in the problem statement ("non-adjacent",
"at most k", "increasing", "each item once") forces a state dimension. Count the
constraints, and you have counted your dimensions.

---

## 5. Pattern 1 — Linear / 1D DP

State is a single index; transition looks back a constant number of steps.

### Generic skeleton

```python
def linear_dp(nums):
    n = len(nums)
    dp = [0] * (n + 1)                 # dp[i] = answer for prefix of length i
    dp[0] = BASE
    for i in range(1, n + 1):
        for choice in choices_at(i):   # often just 1-2 choices -> O(1)
            dp[i] = combine(dp[i], dp[i - choice.cost] + choice.gain)
    return dp[n]
```
**Time O(n × choices) / Space O(n) → O(1) when the look-back window is constant**

### Fibonacci / Climbing Stairs (LC 70)

```python
def climb_stairs(n):
    a, b = 1, 1                     # ways to reach step 0 and step 1
    for _ in range(n - 1):
        a, b = b, a + b             # dp[i] = dp[i-1] + dp[i-2]
    return b
```
**Time O(n) / Space O(1)**

### Min Cost Climbing Stairs (LC 746)

```python
def min_cost_climbing_stairs(cost):
    a = b = 0                       # min cost to REACH step i-2 and step i-1
    for i in range(2, len(cost) + 1):
        a, b = b, min(b + cost[i - 1], a + cost[i - 2])   # step from 1 or 2 below
    return b
```
**Time O(n) / Space O(1)**

### House Robber II (LC 213) — circular street

Houses form a circle, so house `0` and house `n-1` are adjacent. Trick: the answer
is the better of two *linear* problems.

```python
def rob_circular(nums):
    if len(nums) == 1:
        return nums[0]

    def rob_line(arr):
        p2 = p1 = 0
        for x in arr:
            p2, p1 = p1, max(p1, p2 + x)
        return p1

    return max(rob_line(nums[1:]), rob_line(nums[:-1]))   # exclude first OR last
```
**Time O(n) / Space O(1)**

### Decode Ways (LC 91)

```python
def num_decodings(s):
    if not s or s[0] == '0':
        return 0
    prev2, prev1 = 1, 1             # dp[-1], dp[0]
    for i in range(1, len(s)):
        cur = 0
        if s[i] != '0':                       # single-digit decode
            cur += prev1
        if 10 <= int(s[i - 1:i + 1]) <= 26:   # two-digit decode
            cur += prev2
        prev2, prev1 = prev1, cur
        if cur == 0:
            return 0                # dead end, nothing can recover
    return prev1
```
**Time O(n) / Space O(1)**

### Word Break (LC 139)

```python
def word_break(s, word_dict):
    words = set(word_dict)
    n = len(s)
    dp = [False] * (n + 1)
    dp[0] = True                        # empty prefix is breakable
    for i in range(1, n + 1):
        for j in range(i):
            if dp[j] and s[j:i] in words:   # split point j
                dp[i] = True
                break
    return dp[n]
```
**Time O(n² × L) / Space O(n)** — `L` is slicing/hash cost.

### Jump Game II (LC 45) — DP that collapses into greedy BFS

```python
def jump(nums):
    jumps = cur_end = farthest = 0
    for i in range(len(nums) - 1):
        farthest = max(farthest, i + nums[i])
        if i == cur_end:            # exhausted the current BFS level
            jumps += 1
            cur_end = farthest
    return jumps
```
**Time O(n) / Space O(1)**

### Delete and Earn (LC 740) — House Robber in disguise

Taking value `v` deletes all `v-1` and `v+1`. Bucket by value, then it *is* robbing
a line indexed by value.

```python
def delete_and_earn(nums):
    if not nums: return 0
    hi = max(nums)
    points = [0] * (hi + 1)
    for x in nums:
        points[x] += x               # total gain from taking value x
    p2 = p1 = 0
    for v in range(hi + 1):
        p2, p1 = p1, max(p1, p2 + points[v])
    return p1
```
**Time O(n + max(nums)) / Space O(max(nums))**

**Mental trigger:** "each step depends on the previous one or two" → 1D DP, and
almost always collapsible to `O(1)` space with rotating scalars.

---

## 6. Pattern 2 — Knapsack family (the most important pattern)

Every "choose a subset of items to hit a target" problem is a knapsack.

### 6.1 — 0/1 knapsack (each item at most once)

**State:** `dp[i][w]` = best value using the first `i` items with capacity exactly `w` available.

```python
def knapsack_01_2d(weights, values, W):
    n = len(weights)
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(W + 1):
            dp[i][w] = dp[i - 1][w]                     # skip item i-1
            if weights[i - 1] <= w:                     # or take it
                dp[i][w] = max(dp[i][w],
                               dp[i - 1][w - weights[i - 1]] + values[i - 1])
    return dp[n][W]
```
**Time O(n·W) / Space O(n·W)**

Rolled to one row — **note the reversed inner loop**:

```python
def knapsack_01(weights, values, W):
    dp = [0] * (W + 1)
    for wt, val in zip(weights, values):
        for w in range(W, wt - 1, -1):          # REVERSE
            dp[w] = max(dp[w], dp[w - wt] + val)
    return dp[W]
```
**Time O(n·W) / Space O(W)**

### 6.2 — Unbounded knapsack (each item unlimited times)

```python
def knapsack_unbounded(weights, values, W):
    dp = [0] * (W + 1)
    for wt, val in zip(weights, values):
        for w in range(wt, W + 1):              # FORWARD
            dp[w] = max(dp[w], dp[w - wt] + val)
    return dp[W]
```
**Time O(n·W) / Space O(W)**

### 6.3 — WHY the loop direction differs (read this twice)

In the 1D array, `dp[w - wt]` is being read *while* `dp[...]` is being overwritten.
The direction decides **which row you are reading from**:

- **Reverse (`W → wt`)**: when you compute `dp[w]`, the cell `dp[w - wt]` is at a
  *smaller* index, which you have **not touched yet in this item's pass**. So it
  still holds the value from row `i-1` (item not used). → item used **at most once**.
- **Forward (`wt → W`)**: `dp[w - wt]` is at a smaller index that you **already
  updated in this same pass**, so it may already include this item. → item can be
  reused. → **unbounded**.

**Trace — count ways, coin `2`, target `6`, `dp[0] = 1`:**

```
FORWARD (unbounded)                    REVERSE (0/1)
start dp = [1,0,0,0,0,0,0]             start dp = [1,0,0,0,0,0,0]
w=2: dp[2] += dp[0]=1  -> dp[2]=1      w=6: dp[6] += dp[4]=0  -> 0
w=3: dp[3] += dp[1]=0                  w=5: dp[5] += dp[3]=0  -> 0
w=4: dp[4] += dp[2]=1  -> dp[4]=1      w=4: dp[4] += dp[2]=0  -> 0
     (that is 2+2 : coin reused!)      w=3: dp[3] += dp[1]=0  -> 0
w=5: dp[5] += dp[3]=0                  w=2: dp[2] += dp[0]=1  -> dp[2]=1
w=6: dp[6] += dp[4]=1  -> dp[6]=1           (only ONE 2 was ever used)
     (that is 2+2+2)
final dp[6] = 1                        final dp[6] = 0   (correct: one coin 2
                                        cannot make 6)
```

### 6.4 — Combinations vs permutations (loop *nesting* order)

Same two loops, swapped nesting, completely different meaning.

```python
def count_combinations(coins, target):      # LC 518 — {1,2} == {2,1}
    dp = [1] + [0] * target
    for c in coins:                         # OUTER = coins
        for a in range(c, target + 1):      # INNER = amount
            dp[a] += dp[a - c]
    return dp[target]

def count_permutations(nums, target):       # LC 377 — {1,2} != {2,1}
    dp = [1] + [0] * target
    for a in range(1, target + 1):          # OUTER = amount
        for x in nums:                      # INNER = numbers
            if x <= a:
                dp[a] += dp[a - x]
    return dp[target]
```
**Time O(n·target) / Space O(target)** for both.

Why: with **coins outside**, coin `c` is only ever considered once in the whole
build-up, so sequences are forced into a fixed coin order → each multiset counted
once. With **amount outside**, at every amount you re-open the full menu, so
`1 then 2` and `2 then 1` are separate paths.

Check with `coins = [1, 2], target = 3`:
combinations → `{1,1,1}, {1,2}` = **2**; permutations → `{1,1,1}, {1,2}, {2,1}` = **3**.

### 6.5 — Bounded (multiple) knapsack: item `i` available `cnt[i]` times

Binary splitting turns it into 0/1 in `O(log cnt)` items:

```python
def bounded_knapsack(weights, values, counts, W):
    dp = [0] * (W + 1)
    for wt, val, cnt in zip(weights, values, counts):
        k = 1
        while cnt > 0:                       # split cnt into 1,2,4,...,remainder
            take = min(k, cnt)
            w2, v2 = wt * take, val * take
            for w in range(W, w2 - 1, -1):   # reverse = 0/1 on the bundle
                dp[w] = max(dp[w], dp[w - w2] + v2)
            cnt -= take
            k <<= 1
    return dp[W]
```
**Time O(W · Σ log cnt_i) / Space O(W)**

### 6.6 — Subset Sum / Partition Equal Subset Sum (LC 416)

```python
def can_partition(nums):
    total = sum(nums)
    if total % 2:
        return False
    target = total // 2
    dp = [False] * (target + 1)
    dp[0] = True
    for x in nums:
        for s in range(target, x - 1, -1):   # 0/1 -> reverse
            dp[s] |= dp[s - x]
        if dp[target]:
            return True                      # early exit
    return dp[target]
```
**Time O(n · total/2) / Space O(total/2)**

Bitset speed-up (very fast in Python, uses big-int as a bitmask):

```python
def can_partition_fast(nums):
    total = sum(nums)
    if total % 2: return False
    bits = 1                     # bit s set == sum s reachable
    for x in nums:
        bits |= bits << x        # one shift handles the whole array at once
    return (bits >> (total // 2)) & 1 == 1
```

### 6.7 — Target Sum (LC 494) — assign `+`/`-` to reach `S`

Let `P` = set given `+`. Then `P - (total - P) = S` → `P = (total + S) / 2`.
It reduces to **count subsets summing to `P`** = 0/1 knapsack counting.

```python
def find_target_sum_ways(nums, S):
    total = sum(nums)
    if (total + S) % 2 or abs(S) > total:
        return 0
    P = (total + S) // 2
    dp = [1] + [0] * P
    for x in nums:
        for s in range(P, x - 1, -1):        # 0/1 -> reverse
            dp[s] += dp[s - x]
    return dp[P]
```
**Time O(n·P) / Space O(P)**

### 6.8 — Coin change: min coins vs count ways

```python
def coin_change_min(coins, amount):          # LC 322 — unbounded, minimize
    INF = float('inf')
    dp = [0] + [INF] * amount
    for c in coins:
        for a in range(c, amount + 1):       # forward -> unlimited coins
            dp[a] = min(dp[a], dp[a - c] + 1)
    return -1 if dp[amount] == INF else dp[amount]

def coin_change_ways(coins, amount):         # LC 518 — unbounded, count combos
    dp = [1] + [0] * amount
    for c in coins:                          # coins OUTER -> combinations
        for a in range(c, amount + 1):
            dp[a] += dp[a - c]
    return dp[amount]
```
**Time O(n·amount) / Space O(amount)**

**Mental trigger:** "pick a subset to reach a target" → knapsack. Then answer two
questions: *can each item repeat?* (loop direction) and *does order matter?*
(loop nesting). Those two answers fully determine the code.

---

## 7. Pattern 3 — Grid / 2D DP

State is a cell; transitions come from neighbours already computed.

### Unique Paths (LC 62) and with obstacles (LC 63)

```python
def unique_paths_with_obstacles(grid):
    m, n = len(grid), len(grid[0])
    dp = [0] * n
    dp[0] = 1 if grid[0][0] == 0 else 0
    for r in range(m):
        for c in range(n):
            if grid[r][c] == 1:
                dp[c] = 0                    # blocked: no paths through here
            elif c > 0:
                dp[c] += dp[c - 1]           # dp[c] is "from above", dp[c-1] "from left"
    return dp[-1]
```
**Time O(m·n) / Space O(n)**

### Minimum Path Sum (LC 64)

```python
def min_path_sum(grid):
    m, n = len(grid), len(grid[0])
    dp = [float('inf')] * n
    dp[0] = 0
    for r in range(m):
        dp[0] += grid[r][0]
        for c in range(1, n):
            dp[c] = min(dp[c], dp[c - 1]) + grid[r][c]   # from top or left
    return dp[-1]
```
**Time O(m·n) / Space O(n)**

### Maximal Square (LC 221)

`dp[r][c]` = side of the largest all-1 square whose **bottom-right corner** is `(r,c)`.

```python
def maximal_square(matrix):
    m, n = len(matrix), len(matrix[0])
    dp = [0] * (n + 1)
    best = 0
    for r in range(m):
        prev_diag = 0                        # dp[r-1][c-1]
        for c in range(1, n + 1):
            temp = dp[c]
            if matrix[r][c - 1] == '1':
                dp[c] = min(dp[c], dp[c - 1], prev_diag) + 1   # bottleneck of 3
                best = max(best, dp[c])
            else:
                dp[c] = 0
            prev_diag = temp
    return best * best
```
**Time O(m·n) / Space O(n)**

### Dungeon Game (LC 174) — why you must iterate BACKWARDS

You need "minimum HP required *entering* this cell to survive to the end". That
depends on the **future**, not the past, so the natural state points forward and the
loop must go from bottom-right to top-left. Going forwards fails because maximizing
health so far does not guarantee survival later (a greedy prefix can be trapped).

```python
def calculate_minimum_hp(dungeon):
    m, n = len(dungeon), len(dungeon[0])
    need = [[float('inf')] * (n + 1) for _ in range(m + 1)]
    need[m][n - 1] = need[m - 1][n] = 1      # need 1 HP just past the princess
    for r in range(m - 1, -1, -1):
        for c in range(n - 1, -1, -1):
            best_next = min(need[r + 1][c], need[r][c + 1])
            need[r][c] = max(1, best_next - dungeon[r][c])   # never drop below 1
    return need[0][0]
```
**Time O(m·n) / Space O(m·n)**

### Cherry Pickup (LC 741 / 1463) — two agents, 3D state

Two walkers move simultaneously. Since both take the same number of steps `t`,
`row = t - col`, so the state is `(t, c1, c2)` — or for LC 1463 just `(row, c1, c2)`.

```python
def cherry_pickup_two_robots(grid):          # LC 1463
    m, n = len(grid), len(grid[0])
    NEG = float('-inf')
    dp = [[NEG] * n for _ in range(n)]
    dp[0][n - 1] = grid[0][0] + grid[0][n - 1]
    for r in range(1, m):
        nxt = [[NEG] * n for _ in range(n)]
        for c1 in range(n):
            for c2 in range(n):
                if dp[c1][c2] == NEG:
                    continue
                for d1 in (-1, 0, 1):
                    for d2 in (-1, 0, 1):
                        a, b = c1 + d1, c2 + d2
                        if 0 <= a < n and 0 <= b < n:
                            gain = grid[r][a] + (grid[r][b] if a != b else 0)
                            nxt[a][b] = max(nxt[a][b], dp[c1][c2] + gain)
        dp = nxt
    return max(max(row) for row in dp)
```
**Time O(m·n²·9) / Space O(n²)**

### Longest Increasing Path in a Matrix (LC 329) — memo on a DAG

Strictly increasing edges make the grid acyclic, so plain memoization works with no
ordering worry.

```python
from functools import lru_cache

def longest_increasing_path(matrix):
    if not matrix: return 0
    m, n = len(matrix), len(matrix[0])

    @lru_cache(maxsize=None)
    def dfs(r, c):
        best = 1
        for dr, dc in ((1,0), (-1,0), (0,1), (0,-1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and matrix[nr][nc] > matrix[r][c]:
                best = max(best, 1 + dfs(nr, nc))   # edges only go "uphill" -> DAG
        return best

    return max(dfs(r, c) for r in range(m) for c in range(n))
```
**Time O(m·n) / Space O(m·n)**

**Mental trigger:** grid + "paths / min cost / largest shape" → 2D DP. If the answer
depends on what happens *after* the cell (survival, resource floor), iterate
backwards.

---

## 8. Pattern 4 — String DP

State is a pair of prefix lengths `(i, j)` — "first `i` chars of A vs first `j` of B".

### Edit Distance (LC 72) — full derivation

`dp[i][j]` = minimum operations to turn `a[:i]` into `b[:j]`.

Look at the last characters:
- If `a[i-1] == b[j-1]`, they cost nothing: `dp[i][j] = dp[i-1][j-1]`.
- Otherwise, one operation must have happened last:
  - **replace** `a[i-1]` with `b[j-1]` → `1 + dp[i-1][j-1]`
  - **delete** `a[i-1]` → `1 + dp[i-1][j]`
  - **insert** `b[j-1]` → `1 + dp[i][j-1]`

Base: `dp[i][0] = i` (delete all), `dp[0][j] = j` (insert all).

```python
def min_distance(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1): dp[i][0] = i
    for j in range(n + 1): dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]              # free match
            else:
                dp[i][j] = 1 + min(dp[i - 1][j - 1],     # replace
                                   dp[i - 1][j],         # delete from a
                                   dp[i][j - 1])         # insert into a
    return dp[m][n]
```
**Time O(m·n) / Space O(m·n)**

### The rolling-row trick — O(min(m,n)) space

Every cell reads only `(i-1, j-1)`, `(i-1, j)`, `(i, j-1)` → keep one row plus one
scalar for the diagonal.

```python
def min_distance_1d(a, b):
    if len(a) < len(b):
        a, b = b, a                       # keep the short one as columns
    prev = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        cur = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            cur[j] = prev[j - 1] if a[i - 1] == b[j - 1] else \
                     1 + min(prev[j - 1], prev[j], cur[j - 1])
        prev = cur
    return prev[-1]
```
**Time O(m·n) / Space O(min(m, n))**

### Longest Common Subsequence (LC 1143)

```python
def lcs(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])   # drop one char
    return dp[m][n]
```
**Time O(m·n) / Space O(m·n)**

### Longest Common **Substring** (contiguous — note the difference)

```python
def longest_common_substring(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    best = 0
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1   # must extend, no max() fallback
                best = max(best, dp[i][j])
            # else dp[i][j] stays 0 -> the run is BROKEN
    return best
```
**Time O(m·n) / Space O(m·n)** — the only change from LCS is the missing `else max(...)`.

### Distinct Subsequences (LC 115) — count how many times `t` appears in `s`

```python
def num_distinct(s, t):
    dp = [1] + [0] * len(t)             # dp[j] = ways to form t[:j]
    for ch in s:
        for j in range(len(t), 0, -1):  # REVERSE: each s-char used once
            if t[j - 1] == ch:
                dp[j] += dp[j - 1]
    return dp[len(t)]
```
**Time O(m·n) / Space O(n)**

### Interleaving String (LC 97)

```python
def is_interleave(s1, s2, s3):
    m, n = len(s1), len(s2)
    if m + n != len(s3):
        return False
    dp = [False] * (n + 1)
    dp[0] = True
    for j in range(1, n + 1):
        dp[j] = dp[j - 1] and s2[j - 1] == s3[j - 1]
    for i in range(1, m + 1):
        dp[0] = dp[0] and s1[i - 1] == s3[i - 1]
        for j in range(1, n + 1):
            dp[j] = (dp[j] and s1[i - 1] == s3[i + j - 1]) or \
                    (dp[j - 1] and s2[j - 1] == s3[i + j - 1])
    return dp[n]
```
**Time O(m·n) / Space O(n)**

### Regular Expression Matching (LC 10) — `.` and `*`

```python
def is_match_regex(s, p):
    m, n = len(s), len(p)
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    dp[0][0] = True
    for j in range(1, n + 1):
        if p[j - 1] == '*':
            dp[0][j] = dp[0][j - 2]              # "x*" matches empty
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if p[j - 1] == '*':
                dp[i][j] = dp[i][j - 2]          # use the pattern ZERO times
                if p[j - 2] in (s[i - 1], '.'):
                    dp[i][j] |= dp[i - 1][j]     # or one more time
            elif p[j - 1] in (s[i - 1], '.'):
                dp[i][j] = dp[i - 1][j - 1]
    return dp[m][n]
```
**Time O(m·n) / Space O(m·n)**

### Wildcard Matching (LC 44) — `?` and `*`

```python
def is_match_wildcard(s, p):
    m, n = len(s), len(p)
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    dp[0][0] = True
    for j in range(1, n + 1):
        dp[0][j] = dp[0][j - 1] and p[j - 1] == '*'
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if p[j - 1] == '*':
                dp[i][j] = dp[i - 1][j] or dp[i][j - 1]   # consume a char OR nothing
            elif p[j - 1] == '?' or p[j - 1] == s[i - 1]:
                dp[i][j] = dp[i - 1][j - 1]
    return dp[m][n]
```
**Time O(m·n) / Space O(m·n)**

Key difference from regex: here `*` stands alone and matches any run; in regex `*`
modifies the **previous** character, hence the `j - 2` lookback.

### Shortest Common Supersequence (LC 1092)

Length is `m + n - LCS(a, b)`. Build the string by walking the LCS table backwards.

```python
def shortest_common_supersequence(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            dp[i][j] = dp[i-1][j-1] + 1 if a[i-1] == b[j-1] else max(dp[i-1][j], dp[i][j-1])
    out, i, j = [], m, n
    while i and j:
        if a[i - 1] == b[j - 1]:
            out.append(a[i - 1]); i -= 1; j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            out.append(a[i - 1]); i -= 1
        else:
            out.append(b[j - 1]); j -= 1
    return a[:i] + b[:j] + ''.join(reversed(out))
```
**Time O(m·n) / Space O(m·n)**

### Palindromic DP

```python
def count_palindromic_substrings(s):          # LC 647 — expand around centers
    n, total = len(s), 0
    for center in range(2 * n - 1):
        lo, hi = center // 2, center // 2 + center % 2
        while lo >= 0 and hi < n and s[lo] == s[hi]:
            total += 1; lo -= 1; hi += 1
    return total
```
**Time O(n²) / Space O(1)**

```python
def longest_palindrome(s):                    # LC 5 — table version
    n = len(s)
    dp = [[False] * n for _ in range(n)]
    start = length = 1 if n else 0
    for i in range(n):
        dp[i][i] = True
    for ln in range(2, n + 1):                # BY LENGTH: dp[i][j] needs dp[i+1][j-1]
        for i in range(n - ln + 1):
            j = i + ln - 1
            if s[i] == s[j] and (ln == 2 or dp[i + 1][j - 1]):
                dp[i][j] = True
                if ln > length:
                    start, length = i, ln
    return s[start:start + length]
```
**Time O(n²) / Space O(n²)**

```python
def min_palindrome_cuts(s):                   # LC 132 — Palindrome Partitioning II
    n = len(s)
    is_pal = [[False] * n for _ in range(n)]
    cuts = [0] * n
    for j in range(n):
        best = j                              # worst case: cut before every char
        for i in range(j + 1):
            if s[i] == s[j] and (j - i < 2 or is_pal[i + 1][j - 1]):
                is_pal[i][j] = True
                best = 0 if i == 0 else min(best, cuts[i - 1] + 1)
        cuts[j] = best
    return cuts[-1] if n else 0
```
**Time O(n²) / Space O(n²)**
(LC 131, Palindrome Partitioning I, is backtracking + this `is_pal` table as a filter.)

**Mental trigger:** two strings, or one string with "transform / match / align" →
`dp[i][j]` over prefix lengths. Always ask what the **last characters** do.

---

## 9. Pattern 5 — Interval / range DP

`dp[i][j]` = best answer for the subarray `i..j`. Filled **by increasing length**,
because `dp[i][j]` depends on strictly shorter ranges inside it.

### The skeleton

```python
def interval_dp(arr):
    n = len(arr)
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):          # 1) length OUTERMOST
        for i in range(n - length + 1):     # 2) left endpoint
            j = i + length - 1              # 3) right endpoint derived
            for k in range(i, j):           # 4) split / last-action point
                dp[i][j] = max(dp[i][j], dp[i][k] + dp[k + 1][j] + cost(i, k, j))
    return dp[0][n - 1]
```
**Time O(n³) / Space O(n²)**

### The reframing that makes Burst Balloons click

Do **not** ask "which balloon do I burst first?" — bursting merges the two sides and
destroys independence. Ask **"which balloon do I burst LAST in this range?"**. If `k`
is last, everything in `(i, k)` and `(k, j)` was already gone, so `k`'s neighbours at
that moment are exactly the sentinels `i` and `j`. The two sides become independent.

```python
def max_coins(nums):                           # LC 312
    a = [1] + nums + [1]                       # sentinel balloons
    n = len(a)
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n):                 # length of the OPEN interval (i, j)
        for i in range(n - length):
            j = i + length
            for k in range(i + 1, j):          # k = LAST balloon burst in (i, j)
                dp[i][j] = max(dp[i][j],
                               dp[i][k] + dp[k][j] + a[i] * a[k] * a[j])
    return dp[0][n - 1]
```
**Time O(n³) / Space O(n²)**

### Matrix Chain Multiplication

```python
def matrix_chain(dims):                        # dims has n+1 entries for n matrices
    n = len(dims) - 1
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = min(dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1]
                           for k in range(i, j))   # k = LAST multiplication
    return dp[0][n - 1]
```
**Time O(n³) / Space O(n²)**

### Minimum Cost to Cut a Stick (LC 1547)

Add the two ends as virtual cuts, sort, then it is matrix-chain: the *first* cut you
make in a segment splits it into two independent segments.

```python
def min_cost_cut_stick(n, cuts):
    pts = sorted([0] + cuts + [n])
    m = len(pts)
    dp = [[0] * m for _ in range(m)]
    for length in range(2, m):
        for i in range(m - length):
            j = i + length
            dp[i][j] = min(dp[i][k] + dp[k][j] for k in range(i + 1, j)) \
                       + pts[j] - pts[i]        # cost of cutting this whole segment
    return dp[0][m - 1]
```
**Time O(m³) / Space O(m²)**

### Strange Printer (LC 664)

`dp[i][j]` = prints needed for `s[i..j]`. Start with `1 + dp[i+1][j]`; whenever a
later char equals `s[i]`, that print can be *extended*, merging two subproblems.

```python
def strange_printer(s):
    s = ''.join(ch for ch, _ in __import__('itertools').groupby(s))  # squash runs
    n = len(s)
    if n == 0: return 0
    dp = [[0] * n for _ in range(n)]
    for i in range(n): dp[i][i] = 1
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = dp[i + 1][j] + 1
            for k in range(i + 1, j + 1):
                if s[k] == s[i]:                # reuse the same print run
                    dp[i][j] = min(dp[i][j], dp[i + 1][k - 1] + dp[k][j])
    return dp[0][n - 1]
```
**Time O(n³) / Space O(n²)**

### Remove Boxes (LC 546) — 3D interval DP

State must carry "how many boxes equal to `boxes[i]` are glued to the left of `i`":
`dp[i][j][k]`. That extra `k` is what makes it hard — it is the classic
"add a dimension when the range alone is not enough" lesson.

```python
from functools import lru_cache

def remove_boxes(boxes):
    n = len(boxes)

    @lru_cache(maxsize=None)
    def f(i, j, k):                    # k extra boxes equal to boxes[i] attached left
        if i > j:
            return 0
        while i + 1 <= j and boxes[i + 1] == boxes[i]:   # merge the run first
            i += 1; k += 1
        best = (k + 1) ** 2 + f(i + 1, j, 0)             # remove the run now
        for m in range(i + 2, j + 1):
            if boxes[m] == boxes[i]:                      # or save it to merge later
                best = max(best, f(i + 1, m - 1, 0) + f(m, j, k + 1))
        return best

    return f(0, n - 1, 0)
```
**Time O(n⁴) / Space O(n³)**

### Stone Game variants

```python
def stone_game_diff(piles):                    # LC 877 / 1140 style
    n = len(piles)
    dp = [[0] * n for _ in range(n)]           # dp[i][j] = (my score - opponent's)
    for i in range(n): dp[i][i] = piles[i]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = max(piles[i] - dp[i + 1][j],      # take left
                           piles[j] - dp[i][j - 1])      # take right
    return dp[0][n - 1]                        # > 0 means first player wins
```
**Time O(n²) / Space O(n²)**
The `-dp[...]` sign flip encodes "now it is the opponent's turn and they play optimally".

**Mental trigger:** the problem talks about a **range** that shrinks/merges from
either end, or the array collapses when you remove items → interval DP by length,
and reframe as "what happens LAST".

---

## 10. Pattern 6 — Subsequence DP

### LIS in O(n²)

```python
def lis_quadratic(nums):
    n = len(nums)
    dp = [1] * n                          # dp[i] = LIS ENDING at i
    for i in range(n):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp, default=0)
```
**Time O(n²) / Space O(n)**

### LIS in O(n log n) — patience sorting + bisect

`tails[k]` = smallest possible tail of an increasing subsequence of length `k+1`.
The array stays sorted, so binary search finds where the new value belongs.
**`tails` is not itself a valid LIS — only its length is meaningful.**

```python
from bisect import bisect_left, bisect_right

def lis_fast(nums):
    tails = []
    for x in nums:
        i = bisect_left(tails, x)         # bisect_right -> NON-decreasing LIS
        if i == len(tails):
            tails.append(x)               # extends the longest chain
        else:
            tails[i] = x                  # tightens an existing chain
    return len(tails)
```
**Time O(n log n) / Space O(n)**

### Number of Longest Increasing Subsequences (LC 673)

```python
def find_number_of_lis(nums):
    n = len(nums)
    length = [1] * n
    count = [1] * n
    for i in range(n):
        for j in range(i):
            if nums[j] < nums[i]:
                if length[j] + 1 > length[i]:
                    length[i] = length[j] + 1
                    count[i] = count[j]        # found a strictly longer chain: reset
                elif length[j] + 1 == length[i]:
                    count[i] += count[j]       # another way to reach the same length
    best = max(length, default=0)
    return sum(c for l, c in zip(length, count) if l == best)
```
**Time O(n²) / Space O(n)**

### Russian Doll Envelopes (LC 354)

Sort by width ascending, and **height descending within equal widths** — that
descending tie-break makes it impossible to pick two envelopes of the same width,
so a plain LIS on heights is correct.

```python
def max_envelopes(envelopes):
    envelopes.sort(key=lambda e: (e[0], -e[1]))    # the tie-break is the whole trick
    tails = []
    for _, h in envelopes:
        i = bisect_left(tails, h)
        if i == len(tails): tails.append(h)
        else: tails[i] = h
    return len(tails)
```
**Time O(n log n) / Space O(n)**

### Longest Arithmetic Subsequence (LC 1027)

```python
from collections import defaultdict

def longest_arith_seq_length(nums):
    dp = [defaultdict(lambda: 1) for _ in nums]    # dp[i][d] = length ending at i, diff d
    best = 0
    for i in range(len(nums)):
        for j in range(i):
            d = nums[i] - nums[j]
            dp[i][d] = dp[j][d] + 1                # extend j's chain with the same diff
            best = max(best, dp[i][d])
    return best
```
**Time O(n²) / Space O(n²)**

### Maximum Sum Increasing Subsequence

```python
def max_sum_increasing(nums):
    dp = list(nums)                        # dp[i] = best SUM of an increasing seq ending at i
    for i in range(len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + nums[i])
    return max(dp, default=0)
```
**Time O(n²) / Space O(n)**

### Longest String Chain (LC 1048)

```python
def longest_str_chain(words):
    words.sort(key=len)                    # a predecessor is always shorter
    best = {}
    ans = 0
    for w in words:
        cur = 1
        for i in range(len(w)):
            prev = w[:i] + w[i + 1:]       # delete exactly one char
            cur = max(cur, best.get(prev, 0) + 1)
        best[w] = cur
        ans = max(ans, cur)
    return ans
```
**Time O(n · L²) / Space O(n · L)**

**Mental trigger:** "subsequence" (not contiguous!) with an order constraint →
`dp[i]` meaning "best ending exactly at `i`", then take the max over all `i`.
Contiguous instead? That is Kadane / sliding window, not this.

---

## 11. Pattern 7 — Bitmask DP

Use when `n ≤ ~20` and the state is "which subset have I already used". Number of
states is `2^n` (times maybe a position), so `2^20 ≈ 10^6` is the practical ceiling.

### Bit operations cheat sheet

```python
mask | (1 << i)      # add element i
mask & ~(1 << i)     # remove element i
mask & (1 << i)      # test element i
bin(mask).count('1') # popcount (or int.bit_count() in 3.10+)
mask == (1 << n) - 1 # full set
```

### Enumerate all submasks of `mask` — `sub = (sub - 1) & mask`

Subtracting 1 borrows through the low zero bits; the `& mask` immediately clears any
bits that are not part of `mask`. The result is the next-smaller submask, so the loop
visits every submask exactly once, in decreasing order.

```python
sub = mask
while sub:
    process(sub)
    sub = (sub - 1) & mask
process(0)                       # the empty submask is not produced by the loop
```
**Total over all masks: O(3^n)** (each element is in `sub`, in `mask \ sub`, or out).

### TSP skeleton (LC 943-style / Held–Karp)

```python
def tsp(dist):
    n = len(dist)
    INF = float('inf')
    dp = [[INF] * n for _ in range(1 << n)]   # dp[mask][i] = min cost visiting mask, at i
    dp[1][0] = 0                              # start at city 0
    for mask in range(1 << n):
        for i in range(n):
            if dp[mask][i] == INF or not (mask >> i) & 1:
                continue
            for j in range(n):
                if not (mask >> j) & 1:       # j not visited yet
                    nm = mask | (1 << j)
                    dp[nm][j] = min(dp[nm][j], dp[mask][i] + dist[i][j])
    full = (1 << n) - 1
    return min(dp[full][i] + dist[i][0] for i in range(n))
```
**Time O(2^n · n²) / Space O(2^n · n)**

### Assignment problem (n workers ↔ n jobs)

The number of set bits *is* the job index, so no extra dimension is needed.

```python
def min_assignment(cost):
    n = len(cost)
    INF = float('inf')
    dp = [INF] * (1 << n)
    dp[0] = 0
    for mask in range(1 << n):
        if dp[mask] == INF: continue
        j = bin(mask).count('1')              # next job to assign
        if j == n: continue
        for w in range(n):
            if not (mask >> w) & 1:
                dp[mask | (1 << w)] = min(dp[mask | (1 << w)], dp[mask] + cost[w][j])
    return dp[(1 << n) - 1]
```
**Time O(2^n · n) / Space O(2^n)**

### Partition to K Equal Sum Subsets (LC 698)

```python
def can_partition_k_subsets(nums, k):
    total = sum(nums)
    if total % k: return False
    target = total // k
    nums.sort(reverse=True)
    if nums[0] > target: return False
    n = len(nums)
    dp = [False] * (1 << n)
    dp[0] = True
    used_sum = [0] * (1 << n)                 # sum of the chosen elements
    for mask in range(1 << n):
        if not dp[mask]: continue
        for i in range(n):
            if (mask >> i) & 1: continue
            if used_sum[mask] % target + nums[i] > target:
                break                          # sorted desc -> nothing later fits either
            nm = mask | (1 << i)
            if not dp[nm]:
                dp[nm] = True
                used_sum[nm] = used_sum[mask] + nums[i]
    return dp[(1 << n) - 1]
```
**Time O(2^n · n) / Space O(2^n)**
Trick: `used_sum % target` is the fill level of the *current* bucket, so one linear
scan fills bucket after bucket without tracking which bucket is which.

### Shortest Superstring (LC 943)

Precompute `overlap[i][j]`, then it is TSP where the "distance" is the number of new
characters added. Reconstruct with a parent table.

### Number of Ways to Wear Different Hats (LC 1434)

Flip the loop: iterate over **hats** (40 of them) outside and mask over **people**
(≤10) inside — otherwise the state is `2^40`.

```python
def number_ways(hats):
    MOD = 10 ** 9 + 7
    n = len(hats)
    people_of = [[] for _ in range(41)]
    for p, hs in enumerate(hats):
        for h in hs:
            people_of[h].append(p)
    dp = [0] * (1 << n)
    dp[0] = 1
    for h in range(1, 41):                    # hats OUTER: each hat used at most once
        for mask in range((1 << n) - 1, -1, -1):
            if not dp[mask]: continue
            for p in people_of[h]:
                if not (mask >> p) & 1:
                    dp[mask | (1 << p)] = (dp[mask | (1 << p)] + dp[mask]) % MOD
    return dp[(1 << n) - 1]
```
**Time O(40 · 2^n · n) / Space O(2^n)**

**Mental trigger:** `n ≤ 20`, "assign / permute / visit all", and no greedy works →
bitmask. Also: if one dimension is huge and the other tiny, **mask the tiny one**.

---

## 12. Pattern 8 — Digit DP

Counts numbers in `[0, N]` (or `[L, R]` via `f(R) - f(L-1)`) satisfying a property.
You build the number digit by digit, left to right.

### The four canonical parameters

- `pos` — index of the digit being chosen.
- `tight` — are all previous digits equal to `N`'s prefix? If yes, this digit is
  capped at `N[pos]`; if no, it can be `0..9`.
- `started` — have we placed a non-zero digit yet? Distinguishes leading zeros from
  real zeros (matters for "unique digits", "no consecutive equal", etc.).
- `state` — whatever the property needs (bitmask of used digits, last digit, sum
  modulo k, a flag).

### Generic template

```python
from functools import cache

def count_upto(N: int) -> int:
    digits = list(map(int, str(N)))
    n = len(digits)

    @cache
    def go(pos, tight, started, state):
        if pos == n:
            return 1 if started and accept(state) else 0   # define accept()
        total = 0
        hi = digits[pos] if tight else 9
        for d in range(0, hi + 1):
            n_started = started or d > 0
            if not n_started:
                total += go(pos + 1, False, False, state)   # still leading zeros
            elif valid(state, d):
                total += go(pos + 1, tight and d == hi, True, update(state, d))
        return total

    ans = go(0, True, False, INITIAL_STATE)
    go.cache_clear()
    return ans
```
**Time O(len(N) · 2 · 2 · |state| · 10) / Space = same**

### Count Numbers with Unique Digits (LC 357) — state = bitmask of used digits

```python
from functools import cache

def count_unique_digits_upto(N):
    digits = list(map(int, str(N)))
    n = len(digits)

    @cache
    def go(pos, tight, started, mask):
        if pos == n:
            return 1 if started else 0
        total = 0
        hi = digits[pos] if tight else 9
        for d in range(hi + 1):
            if started and (mask >> d) & 1:
                continue                                # digit already used
            if not started and d == 0:
                total += go(pos + 1, tight and d == hi, False, 0)
            else:
                total += go(pos + 1, tight and d == hi, True, mask | (1 << d))
        return total

    res = go(0, True, False, 0)
    go.cache_clear()
    return res + 1          # +1 for the number 0 itself, if the problem counts it
```

### Numbers At Most N Given Digit Set (LC 902)

Only certain digits are allowed; a clean closed-form counting also exists, but the
digit-DP template above solves it with `valid(state, d) = d in allowed` and no state.

### Rotated Digits (LC 788)

`state` = "have I used at least one of `{2, 5, 6, 9}`"; digits `{3, 4, 7}` are
forbidden entirely; `{0, 1, 8}` are neutral. Accept when the flag is set.

**Mental trigger:** "how many numbers between L and R such that ..." with `R` up to
`10^18` → digit DP. Never loop over the range.

---

## 13. Pattern 9 — DP on trees

State is a node; children are the subproblems. Post-order traversal *is* the
topological order — compute children before the parent.

### House Robber III (LC 337) — return a pair `(rob, skip)`

```python
def rob_tree(root):
    def dfs(node):
        if not node:
            return (0, 0)                        # (rob this node, skip this node)
        l_rob, l_skip = dfs(node.left)
        r_rob, r_skip = dfs(node.right)
        rob = node.val + l_skip + r_skip         # robbing here forbids both children
        skip = max(l_rob, l_skip) + max(r_rob, r_skip)
        return (rob, skip)
    return max(dfs(root))
```
**Time O(n) / Space O(height)**

### Tree Diameter (LC 543) as DP

`down[v]` = longest downward path from `v`. The answer combines the two best child
values **at the node where the path turns**.

```python
def diameter(root):
    best = 0
    def down(node):
        nonlocal best
        if not node: return 0
        l, r = down(node.left), down(node.right)
        best = max(best, l + r)                  # path through this node
        return 1 + max(l, r)                     # what the parent can use
    down(root)
    return best
```
**Time O(n) / Space O(height)**

### Binary Tree Cameras (LC 968) — three-state greedy DP

```python
def min_camera_cover(root):
    cameras = 0
    # 0 = needs cover, 1 = covered (no camera), 2 = has a camera
    def dfs(node):
        nonlocal cameras
        if not node: return 1                    # null counts as covered
        l, r = dfs(node.left), dfs(node.right)
        if l == 0 or r == 0:                     # a child is uncovered -> must place here
            cameras += 1
            return 2
        return 1 if (l == 2 or r == 2) else 0
    if dfs(root) == 0:
        cameras += 1                             # root itself left uncovered
    return cameras
```
**Time O(n) / Space O(height)**

### Distribute Coins in Binary Tree (LC 979)

Each edge carries `abs(balance)` coins; sum those flows.

```python
def distribute_coins(root):
    moves = 0
    def dfs(node):
        nonlocal moves
        if not node: return 0
        l, r = dfs(node.left), dfs(node.right)
        moves += abs(l) + abs(r)                 # coins that crossed the two edges
        return node.val + l + r - 1              # surplus (+) or deficit (-) here
    dfs(root)
    return moves
```
**Time O(n) / Space O(height)**

### Rerooting (in brief)

When the question is "compute an answer *for every node as root*" (e.g. LC 834,
Sum of Distances in Tree), do **two** passes:

1. **Down pass** — post-order, compute each subtree's answer with `v` as its local root.
2. **Up pass** — pre-order, derive `ans[child]` from `ans[parent]` in `O(1)` by
   removing the child's contribution and adding the rest of the tree's.

This turns `O(n²)` (running the DP from every root) into `O(n)`.

**Mental trigger:** tree + "choose/skip per node" or "aggregate over subtrees" →
post-order DP returning a small tuple. Need the answer for all roots → rerooting.

---

## 14. Pattern 10 — State-machine DP (all stock problems, unified)

Model the process as a small automaton. At each time step you are in one of a few
states; transitions have gains. This single frame solves **every** stock problem.

### The two core states

- `hold` = maximum profit while **currently holding** one share.
- `free` = maximum profit while **holding nothing**.

```
hold[i] = max(hold[i-1],  free[i-1] - price[i])   # keep holding, or buy today
free[i] = max(free[i-1],  hold[i-1] + price[i])   # stay out, or sell today
```

### LC 122 — unlimited transactions

```python
def max_profit_unlimited(prices):
    hold, free = float('-inf'), 0
    for p in prices:
        hold, free = max(hold, free - p), max(free, hold + p)
    return free
```
**Time O(n) / Space O(1)**

### LC 121 — exactly one transaction

One transaction means the buy can never be funded by earlier profit, so `free`
before buying is pinned to `0`:

```python
def max_profit_one(prices):
    hold, free = float('-inf'), 0
    for p in prices:
        hold = max(hold, 0 - p)          # NOTE: 0, not free  -> only one buy ever
        free = max(free, hold + p)
    return free
```
**Time O(n) / Space O(1)**

### LC 714 — transaction fee

```python
def max_profit_fee(prices, fee):
    hold, free = float('-inf'), 0
    for p in prices:
        hold, free = max(hold, free - p), max(free, hold + p - fee)   # pay on sell
    return free
```
**Time O(n) / Space O(1)**

### LC 309 — cooldown (one extra state)

```python
def max_profit_cooldown(prices):
    hold, cool, free = float('-inf'), float('-inf'), 0
    for p in prices:
        hold, cool, free = max(hold, free - p), hold + p, max(free, cool)
        # cool = "just sold today"; you may only buy from `free`, never from `cool`
    return max(free, cool)
```
**Time O(n) / Space O(1)**

### LC 123 / LC 188 — at most `k` transactions (the general form)

```python
def max_profit_k(k, prices):
    n = len(prices)
    if n < 2 or k == 0:
        return 0
    if k >= n // 2:                                   # effectively unlimited
        return sum(max(0, b - a) for a, b in zip(prices, prices[1:]))
    hold = [float('-inf')] * (k + 1)
    free = [0] * (k + 1)
    for p in prices:
        for t in range(1, k + 1):                     # t = transactions STARTED
            hold[t] = max(hold[t], free[t - 1] - p)   # buying opens transaction t
            free[t] = max(free[t], hold[t] + p)       # selling closes it
    return free[k]
```
**Time O(n·k) / Space O(k)** — LC 123 is just `k = 2`.

Why the inner loop over `t` can go forward safely: `hold[t]` reads `free[t-1]`, a
strictly smaller index that already holds this day's value — and using this day's
`free[t-1]` would mean buying and selling on the same day for zero profit, which is
never better. So it does not corrupt the answer.

**Mental trigger:** "a sequence of events where at any moment you are in one of a
few modes, with rules about switching" → draw the automaton, name the states, write
one line per state. Cooldown / fee / transaction caps are just extra states or an
extra index.

---

## 15. Pattern 11 — Probability, expectation, and counting DP

The transition is a weighted **sum** instead of a max/min, and values are floats or
counts modulo a prime.

### Knight Probability in Chessboard (LC 688)

```python
def knight_probability(n, k, row, col):
    moves = ((2,1),(1,2),(-1,2),(-2,1),(-2,-1),(-1,-2),(1,-2),(2,-1))
    dp = [[0.0] * n for _ in range(n)]
    dp[row][col] = 1.0
    for _ in range(k):
        nxt = [[0.0] * n for _ in range(n)]
        for r in range(n):
            for c in range(n):
                if dp[r][c]:
                    for dr, dc in moves:
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < n and 0 <= nc < n:
                            nxt[nr][nc] += dp[r][c] / 8   # off-board mass is dropped
        dp = nxt
    return sum(map(sum, dp))
```
**Time O(k·n²·8) / Space O(n²)**

### New 21 Game (LC 837) — prefix-sum optimized probability DP

```python
def new21_game(n, k, maxPts):
    if k == 0 or n >= k + maxPts - 1:
        return 1.0
    dp = [0.0] * (n + 1)
    dp[0] = 1.0
    window = 1.0                       # sum of dp[i-maxPts .. i-1] for i < k
    ans = 0.0
    for i in range(1, n + 1):
        dp[i] = window / maxPts        # each of maxPts draws is equally likely
        if i < k:
            window += dp[i]            # still drawing
        else:
            ans += dp[i]               # stopped here
        if i - maxPts >= 0 and i - maxPts < k:
            window -= dp[i - maxPts]   # slide the window
    return ans
```
**Time O(n) / Space O(n)** — the naive version is `O(n · maxPts)`.

### Number of Dice Rolls With Target Sum (LC 1155) — counting DP

```python
def num_rolls_to_target(n, k, target):
    MOD = 10 ** 9 + 7
    dp = [1] + [0] * target
    for _ in range(n):
        nxt = [0] * (target + 1)
        for t in range(1, target + 1):
            for f in range(1, min(k, t) + 1):
                nxt[t] = (nxt[t] + dp[t - f]) % MOD   # mod at EVERY step
        dp = nxt
    return dp[target]
```
**Time O(n·target·k) / Space O(target)** — with prefix sums this drops to `O(n·target)`.

### Soup Servings (LC 808)

Two lessons: scale volumes by 25 to shrink the state space, and note that for large
`n` the answer converges to `1` within `1e-6`, so cap `n` (a legitimate,
interviewer-pleasing observation).

```python
from functools import lru_cache

def soup_servings(n):
    if n >= 4800:
        return 1.0                     # provably within 1e-6 of 1
    m = (n + 24) // 25                 # work in units of 25 ml

    @lru_cache(maxsize=None)
    def f(a, b):
        if a <= 0 and b <= 0: return 0.5
        if a <= 0: return 1.0
        if b <= 0: return 0.0
        return 0.25 * (f(a-4, b) + f(a-3, b-1) + f(a-2, b-2) + f(a-1, b-3))

    return f(m, m)
```
**Time O(m²) / Space O(m²)**

**Mental trigger:** "probability / expected value / number of ways" → same DP
machinery, but `combine = sum` (weighted) instead of `max`. For counting, apply the
modulus at every addition.

---

## 16. Optimizations

### 16.1 Rolling array (2D → 1D)

If `dp[i][*]` only reads `dp[i-1][*]`, keep two rows (or one, iterating in the safe
direction — see §6.3). If it reads `dp[i-1]` and `dp[i-2]`, keep three.

```python
prev, cur = [0] * (n + 1), [0] * (n + 1)
for i in range(1, m + 1):
    for j in range(1, n + 1):
        cur[j] = f(prev[j], prev[j - 1], cur[j - 1])
    prev, cur = cur, prev          # swap, do NOT alias: cur must be overwritten fully
```

**Danger:** if you reuse `cur` without clearing it, stale values from row `i-2` leak
in. Either overwrite every cell or reset the row.

### 16.2 Monotonic-deque optimization for sliding-window DP

When `dp[i] = nums[i] + max(dp[i-k] .. dp[i-1])`, the inner max is a sliding-window
maximum → deque, dropping `O(n·k)` to `O(n)`.

```python
from collections import deque

def max_result(nums, k):                       # LC 1696 Jump Game VI
    n = len(nums)
    dp = [0] * n
    dp[0] = nums[0]
    dq = deque([0])                            # indices, dp values decreasing
    for i in range(1, n):
        while dq and dq[0] < i - k:
            dq.popleft()                       # out of the window
        dp[i] = dp[dq[0]] + nums[i]            # front = max in window
        while dq and dp[dq[-1]] <= dp[i]:
            dq.pop()                           # dominated, will never be the max
        dq.append(i)
    return dp[-1]
```
**Time O(n) / Space O(n)**

Same shape solves **Constrained Subsequence Sum** (LC 1425) with
`dp[i] = nums[i] + max(0, window max)`.

### 16.3 Prefix-sum optimized DP

When `dp[i] = Σ dp[j]` over a contiguous range of `j`, maintain a running prefix sum
instead of re-summing → `O(n·range)` becomes `O(n)`. See New 21 Game (§15) and
Dice Roll Sum.

```python
pre[i] = pre[i - 1] + dp[i - 1]
dp[i] = pre[i] - pre[max(0, i - w)]            # sum of a window in O(1)
```

### 16.4 Divide-and-conquer optimization / Knuth optimization

For `dp[i][j] = min over k of (dp[i-1][k] + cost(k, j))`:

- **D&C optimization** applies when `opt[j]` (the best `k`) is **monotonic** in `j`.
  Recurse on `(jlo, jhi, klo, khi)` → `O(n log n)` per layer instead of `O(n²)`.
- **Knuth optimization** applies to interval DP `dp[i][j] = min over k of
  (dp[i][k] + dp[k+1][j]) + cost(i,j)` when `cost` satisfies the quadrangle
  inequality; then `opt[i][j-1] ≤ opt[i][j] ≤ opt[i+1][j]`, giving `O(n²)` instead
  of `O(n³)`.

Both are rare in interviews — knowing *when* they apply and saying so out loud is
worth more than memorizing the code. Optimal BST and "Split Array Largest Sum"
style problems are the classic homes.

### 16.5 Bitset tricks

Boolean reachability DP (subset sum, word patterns) can be packed into a Python
big-int, letting one shift-and-or do the work of the whole inner loop (see §6.6).
Roughly a 32–64× constant-factor win.

---

## 17. Recognizing and explaining DP in an interview

### Recognition checklist

Say "this is DP" when you see **any** of these:

- "Maximum / minimum / longest / shortest" over choices, **and** greedy has a
  counterexample.
- "Count the number of ways to ..."
- "Is it possible to reach / partition / form ...?"
- Constraints are small in one dimension (`n ≤ 100`, `n ≤ 20`, `W ≤ 10^4`) — that
  dimension is a state.
- Brute force is exponential and you can spot repeated subproblems.

Say it is **not** DP when: the objects are contiguous and a window works; a sort
plus greedy is provably optimal; or the state space is astronomically large.

### The out-loud script (use these exact five words)

> "Let me define the **state**: `dp[i][j]` means ... .
> The **transition** is: from this state I can either ... or ..., giving `dp[i][j] = ...`.
> The **base cases** are ... .
> The **order** must be ... because `dp[i][j]` depends on ... .
> The **answer** is `dp[...]`. That is `O(states × transitions)` time and `O(states)`
> space, which I can reduce to ... because each row only reads the previous one."

Say the state in English *before* writing indices. Interviewers grade the state
definition more than the code.

### Reconstructing the actual solution (not just the value)

Store the choice that produced each cell, then walk backwards from the answer.

```python
def knapsack_with_items(weights, values, W):
    n = len(weights)
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    take = [[False] * (W + 1) for _ in range(n + 1)]   # parent-choice table
    for i in range(1, n + 1):
        wt, val = weights[i - 1], values[i - 1]
        for w in range(W + 1):
            dp[i][w] = dp[i - 1][w]
            if wt <= w and dp[i - 1][w - wt] + val > dp[i][w]:
                dp[i][w] = dp[i - 1][w - wt] + val
                take[i][w] = True                      # remember WHY this cell won
    chosen, w = [], W
    for i in range(n, 0, -1):                          # walk the choices backwards
        if take[i][w]:
            chosen.append(i - 1)
            w -= weights[i - 1]
    return dp[n][W], chosen[::-1]
```
**Time O(n·W) / Space O(n·W)** — note that reconstruction **needs the full table**,
so you cannot space-optimize and reconstruct at the same time (without Hirschberg's
divide-and-conquer trick).

---

## 18. Common pitfalls

1. **Wrong iteration order.** Filling `dp[i][j]` before its dependencies are ready
   silently yields garbage. Interval DP must loop by **length**, not by `i` then `j`.
2. **Base-case off-by-one.** `dp` of size `n` vs `n + 1`. Prefer size `n + 1` with
   `dp[0]` = empty prefix — it removes almost all boundary `if`s.
3. **Mutable default arguments as a memo.** `def f(i, memo={})` shares the dict
   across calls, poisoning the next test case. Use an explicit dict or `@cache`.
4. **Unhashable memo keys.** `@cache` requires hashable arguments — you cannot pass
   a `list` or `set`. Convert to `tuple`, a `frozenset`, or an integer bitmask.
5. **Not resetting state between test cases.** Global `dp`/memo carried across calls
   (very common with `@cache` on a nested function used in a loop). Call
   `f.cache_clear()` or rebuild.
6. **Counting duplicates.** Combinations vs permutations is entirely decided by loop
   nesting (§6.4). If your count is too high, you probably nested amount-outside.
7. **Reusing an item you meant to use once.** Forward inner loop in a 1D 0/1
   knapsack (§6.3). If the answer allows repeats you did not intend, check direction.
8. **Missing the modulus at every step.** Applying `% MOD` only at the end overflows
   in languages with fixed ints and is unbearably slow with Python big-ints. Mod
   after every addition/multiplication.
9. **Mixing modulus with `max`/`min`.** Taking a modulus of values you later compare
   destroys the ordering. Only counting DP gets a modulus; optimization DP never does.
10. **Space optimization breaking the recurrence.** If a cell needs the *old* row's
    value at the same or a larger index, one array is not enough — keep two rows or
    stash the diagonal in a scalar (see Maximal Square, §7).
11. **`@cache` on a method (`self` in the key).** It keeps the whole object alive and
    makes the cache per-instance-identity, so cache hits vanish and memory leaks.
    Cache a nested plain function instead.
12. **Recursion limit.** Python dies around depth 1000. A memoized `O(n)` chain with
    `n = 10^5` will `RecursionError` — convert to bottom-up.
13. **Float equality in probability DP.** Compare with a tolerance; do not test `==`.
14. **Initializing with `0` when you need `-inf`/`inf`.** For "maximum" DP where a
    state may be unreachable, `0` silently claims an impossible state is achievable.
15. **Aliasing rows.** `dp2 = dp1` copies the reference; use `dp1[:]` or
    `[row[:] for row in dp]`.

---

## 19. Cheat sheets

### Complexity by pattern

| Pattern | States | Transition | Time | Space (optimized) |
|---|---|---|---|---|
| Linear 1D | `O(n)` | `O(1)` | `O(n)` | `O(1)` |
| Word Break style | `O(n)` | `O(n)` | `O(n²)` | `O(n)` |
| 0/1 knapsack | `O(n·W)` | `O(1)` | `O(n·W)` | `O(W)` |
| Unbounded knapsack | `O(n·W)` | `O(1)` | `O(n·W)` | `O(W)` |
| Grid 2D | `O(m·n)` | `O(1)` | `O(m·n)` | `O(min(m,n))` |
| Two-agent grid | `O(m·n²)` | `O(9)` | `O(m·n²)` | `O(n²)` |
| String pair `(i,j)` | `O(m·n)` | `O(1)` | `O(m·n)` | `O(min(m,n))` |
| Interval `dp[i][j]` | `O(n²)` | `O(n)` | `O(n³)` | `O(n²)` |
| Remove Boxes (3D) | `O(n³)` | `O(n)` | `O(n⁴)` | `O(n³)` |
| LIS quadratic | `O(n)` | `O(n)` | `O(n²)` | `O(n)` |
| LIS patience | — | — | `O(n log n)` | `O(n)` |
| Bitmask (TSP) | `O(2^n·n)` | `O(n)` | `O(2^n·n²)` | `O(2^n·n)` |
| Submask enumeration | — | — | `O(3^n)` | `O(2^n)` |
| Digit DP | `O(len·2·2·S)` | `O(10)` | `O(len·S·10)` | same |
| Tree DP | `O(n)` | `O(1)` | `O(n)` | `O(height)` |
| Stock with k | `O(n·k)` | `O(1)` | `O(n·k)` | `O(k)` |
| Sliding-window DP + deque | `O(n)` | amortized `O(1)` | `O(n)` | `O(n)` |

### Phrasing → pattern

| The problem says ... | Reach for |
|---|---|
| "climb / steps / non-adjacent / decode" | Linear 1D DP |
| "pick a subset to reach a target / capacity" | Knapsack |
| "unlimited supply of coins/items" | Unbounded knapsack (forward loop) |
| "number of combinations" vs "number of permutations" | Loop nesting (§6.4) |
| "paths in a grid / min cost path / largest square" | Grid 2D DP |
| "two strings, transform/align/match" | String `dp[i][j]` |
| "burst / merge / remove from a range" | Interval DP by length |
| "longest increasing / chain / arithmetic subsequence" | Subsequence DP, `dp[i]` ending at `i` |
| `n ≤ 20`, "assign all / visit all" | Bitmask DP |
| "how many integers in `[L, R]` such that ..." | Digit DP |
| "tree, choose or skip each node" | Tree DP returning a tuple |
| "buy/sell, at most k times, cooldown, fee" | State-machine DP |
| "probability / expected value" | Probability DP (weighted sum) |
| "max over a window of previous dp values" | Deque-optimized DP |
| "sum of dp over a contiguous range" | Prefix-sum optimized DP |

---

## 20. Google-favourite problem list

### Basic (build the reflexes)

- LC 509 Fibonacci Number — the "hello world" of memo vs table.
- LC 70 Climbing Stairs — linear DP, `O(1)` space.
- LC 746 Min Cost Climbing Stairs — linear DP with a choice of two entry points.
- LC 198 House Robber — the canonical take/skip recurrence.
- LC 213 House Robber II — circular reduction to two linear runs.
- LC 53 Maximum Subarray — Kadane; also state it as `dp[i]` ending at `i`.
- LC 121 Best Time to Buy and Sell Stock — the simplest state machine.
- LC 62 Unique Paths — grid counting.
- LC 63 Unique Paths II — obstacles as forced zeros.
- LC 64 Minimum Path Sum — grid minimization.
- LC 118/119 Pascal's Triangle — DP table you can literally see.
- LC 338 Counting Bits — `dp[i] = dp[i >> 1] + (i & 1)`; cute bit recurrence.
- LC 1137 N-th Tribonacci Number — three-scalar rolling.
- LC 322 Coin Change — unbounded min; the greedy-fails poster child.
- LC 518 Coin Change II — combinations; loop nesting matters.

### Medium (the working set — know all of these cold)

- LC 91 Decode Ways — linear DP with a two-digit lookback and zero traps.
- LC 139 Word Break — prefix DP with a split loop.
- LC 140 Word Break II — DP for feasibility + backtracking for output.
- LC 300 Longest Increasing Subsequence — both `O(n²)` and `O(n log n)`.
- LC 673 Number of Longest Increasing Subsequence — carry counts alongside lengths.
- LC 646 Maximum Length of Pair Chain — LIS or greedy-by-end.
- LC 1048 Longest String Chain — sort by length, delete one char.
- LC 1027 Longest Arithmetic Subsequence — `dp[i][diff]` with a hashmap.
- LC 416 Partition Equal Subset Sum — 0/1 subset sum.
- LC 494 Target Sum — sign assignment reduced to subset counting.
- LC 474 Ones and Zeroes — two-dimensional knapsack capacity.
- LC 377 Combination Sum IV — permutations; loop nesting flipped.
- LC 279 Perfect Squares — unbounded knapsack over squares.
- LC 983 Minimum Cost For Tickets — linear DP with three look-backs.
- LC 1143 Longest Common Subsequence — the string-DP root problem.
- LC 72 Edit Distance — the string-DP boss; know the derivation.
- LC 583 Delete Operation for Two Strings — `m + n - 2·LCS`.
- LC 712 Minimum ASCII Delete Sum — weighted LCS.
- LC 5 Longest Palindromic Substring — expand-around-center or interval table.
- LC 647 Palindromic Substrings — same machinery, counting.
- LC 516 Longest Palindromic Subsequence — LCS of `s` and reversed `s`.
- LC 131 Palindrome Partitioning — backtracking with a DP palindrome table.
- LC 221 Maximal Square — min-of-three bottleneck recurrence.
- LC 1277 Count Square Submatrices with All Ones — same recurrence, summed.
- LC 931 Minimum Falling Path Sum — grid DP with three predecessors.
- LC 120 Triangle — bottom-up grid DP, `O(n)` space.
- LC 918 Maximum Sum Circular Subarray — Kadane max and min plus total.
- LC 152 Maximum Product Subarray — carry `(max, min)`.
- LC 1186 Maximum Subarray Sum with One Deletion — extra state dimension.
- LC 122 Best Time to Buy and Sell Stock II — unlimited transactions.
- LC 309 Best Time to Buy and Sell Stock with Cooldown — three states.
- LC 714 Best Time to Buy and Sell Stock with Transaction Fee — fee on sell.
- LC 337 House Robber III — tree DP returning `(rob, skip)`.
- LC 543 Diameter of Binary Tree — tree DP with a global combine.
- LC 688 Knight Probability in Chessboard — probability DP.
- LC 1155 Number of Dice Rolls With Target Sum — counting DP with a modulus.
- LC 813 Largest Sum of Averages — partition DP with `k` groups.
- LC 740 Delete and Earn — House Robber after bucketing by value.
- LC 1024 Video Stitching — interval DP or greedy jump.
- LC 45 Jump Game II — DP that collapses to BFS levels.
- LC 55 Jump Game — reachability DP or greedy reach.
- LC 1043 Partition Array for Maximum Sum — partition DP with a bounded window.
- LC 264 Ugly Number II — three-pointer DP.
- LC 96 Unique Binary Search Trees — Catalan via interval DP.
- LC 95 Unique Binary Search Trees II — the same recursion, building objects.
- LC 1218 Longest Arithmetic Subsequence of Given Difference — hashmap DP, `O(n)`.
- LC 1626 Best Team With No Conflicts — LIS variant with a sort key.
- LC 1035 Uncrossed Lines — LCS wearing a different costume.

### Hard (the differentiators)

- LC 10 Regular Expression Matching — `*` binds the previous char.
- LC 44 Wildcard Matching — standalone `*`.
- LC 115 Distinct Subsequences — counting with a reverse inner loop.
- LC 97 Interleaving String — 2D feasibility.
- LC 1092 Shortest Common Supersequence — LCS plus reconstruction.
- LC 132 Palindrome Partitioning II — min cuts in `O(n²)`.
- LC 312 Burst Balloons — "which do I burst LAST".
- LC 1547 Minimum Cost to Cut a Stick — matrix chain in disguise.
- LC 664 Strange Printer — interval DP with run merging.
- LC 546 Remove Boxes — 3D interval DP.
- LC 174 Dungeon Game — must iterate backwards.
- LC 741 Cherry Pickup — two agents, synchronized steps.
- LC 1463 Cherry Pickup II — two robots, `O(m·n²)`.
- LC 329 Longest Increasing Path in a Matrix — memo on a DAG.
- LC 354 Russian Doll Envelopes — sort tie-break plus LIS.
- LC 887 Super Egg Drop — DP plus binary search or the inverted formulation.
- LC 943 Find the Shortest Superstring — bitmask TSP with reconstruction.
- LC 698 Partition to K Equal Sum Subsets — bitmask plus pruning.
- LC 1434 Number of Ways to Wear Different Hats — mask the small dimension.
- LC 691 Stickers to Spell Word — bitmask over target letters.
- LC 1125 Smallest Sufficient Team — bitmask over skills.
- LC 902 Numbers At Most N Given Digit Set — digit DP.
- LC 357 Count Numbers with Unique Digits — digit DP with a mask.
- LC 788 Rotated Digits — digit DP with a "good" flag.
- LC 233 Number of Digit One — digit DP counting.
- LC 968 Binary Tree Cameras — three-state tree DP.
- LC 979 Distribute Coins in Binary Tree — flow along edges.
- LC 834 Sum of Distances in Tree — rerooting.
- LC 188 Best Time to Buy and Sell Stock IV — the general `k` formulation.
- LC 123 Best Time to Buy and Sell Stock III — `k = 2`.
- LC 837 New 21 Game — sliding-window probability DP.
- LC 808 Soup Servings — scaling plus a convergence argument.
- LC 1696 Jump Game VI — deque-optimized DP.
- LC 1425 Constrained Subsequence Sum — deque-optimized DP.
- LC 410 Split Array Largest Sum — DP or binary search on the answer.
- LC 1235 Maximum Profit in Job Scheduling — DP plus binary search on sorted ends.
- LC 1220 Count Vowels Permutation — small state machine, big `n`.
- LC 552 Student Attendance Record II — state machine with a modulus.
- LC 87 Scramble String — interval DP on two strings.
- LC 32 Longest Valid Parentheses — DP alternative to the stack solution.
- LC 85 Maximal Rectangle — DP heights plus a monotonic stack.
- LC 871 Minimum Number of Refueling Stops — DP over "stops used" or a heap.
- LC 1531 String Compression II — hard multi-dimensional DP.
- LC 1478 Allocate Mailboxes — partition DP with a median cost function.
- LC 1723 Find Minimum Time to Finish All Jobs — bitmask DP or binary search.

---

## 21. Quiz

**Q1.** What two properties must a problem have for DP to apply, and which one
distinguishes DP from divide and conquer?

<details><summary>Answer</summary>
Optimal substructure and overlapping subproblems. Divide and conquer also has
optimal substructure, but its subproblems are disjoint and each is solved once, so
memoization buys nothing. Overlap is the distinguishing property.
</details>

**Q2.** In the 1D knapsack array, why does 0/1 iterate the capacity in reverse while
unbounded iterates forward?

<details><summary>Answer</summary>
`dp[w]` reads `dp[w - wt]`, a smaller index. Reverse order means that smaller index
has not been touched in this item's pass, so it still holds the previous row (item
unused) → each item used at most once. Forward order means it was already updated in
this pass and may already include the item → unlimited reuse.
</details>

**Q3.** `coins = [1, 2]`, `target = 3`. What do the two loop nestings return, and why?

<details><summary>Answer</summary>
Coins outer / amount inner → 2 (combinations: `1+1+1`, `1+2`). Amount outer / coins
inner → 3 (permutations: `1+1+1`, `1+2`, `2+1`). With coins outside, each coin is
introduced once so multisets are counted once; with amount outside, the full coin
menu reopens at every amount, making orderings distinct.
</details>

**Q4.** Why must Dungeon Game be filled from bottom-right to top-left?

<details><summary>Answer</summary>
The quantity you need is "minimum HP required on entering this cell to survive the
rest of the path", which depends on the future, not the past. A forward DP that
maximizes health so far is not optimal, because a path with more accumulated health
may still hit an unsurvivable floor later.
</details>

**Q5.** In Burst Balloons, why is "which balloon do I burst first?" the wrong
question, and what is the right one?

<details><summary>Answer</summary>
Bursting first merges the left and right neighbours, so the two sides are no longer
independent subproblems. Asking "which balloon `k` is burst LAST in the open range
`(i, j)`?" fixes `k`'s neighbours at burst time to the sentinels `i` and `j`, making
`(i, k)` and `(k, j)` fully independent.
</details>

**Q6.** In LIS via patience sorting, is the `tails` array itself a valid increasing
subsequence of the input?

<details><summary>Answer</summary>
No. Only its length is correct. `tails[k]` is the smallest possible tail over all
increasing subsequences of length `k+1`, and those tails can come from incompatible
subsequences. To recover an actual LIS you must store predecessor indices.
</details>

**Q7.** In a digit DP, what does `started` do that `tight` does not?

<details><summary>Answer</summary>
`tight` tracks whether the prefix equals `N`'s prefix, which caps the current digit.
`started` tracks whether a non-zero digit has been placed, so leading zeros are not
mistaken for real digit choices (critical for properties like "all digits distinct"
or "no two equal adjacent digits", and for not counting `0` multiple times).
</details>

**Q8.** Unify Best Time to Buy and Sell Stock I, II, III, IV, cooldown, and fee in
one sentence.

<details><summary>Answer</summary>
All are the state machine `hold = max(hold, free - p)` / `free = max(free, hold + p)`.
I pins the pre-buy `free` to 0 (one transaction); II is the bare machine; III and IV
index both states by transactions used (`hold[t]` reads `free[t-1]`); cooldown adds a
`cool` state that `free` must pass through before buying again; fee subtracts the fee
on the sell transition.
</details>

**Q9.** You space-optimized an `O(m·n)` string DP down to one row and now need to
print the actual alignment. What went wrong and what are your options?

<details><summary>Answer</summary>
Reconstruction requires walking the parent choices backwards, which needs the full
table. Options: keep the full `O(m·n)` table, store a compact per-cell choice code,
or use Hirschberg's algorithm (divide and conquer on the midpoint) to reconstruct in
`O(m·n)` time with `O(min(m,n))` space.
</details>

**Q10.** Name three ways a memoized solution can silently produce a wrong answer
across multiple test cases.

<details><summary>Answer</summary>
(1) A mutable default argument `memo={}` shared across calls. (2) A module-level or
`@cache`-decorated function whose cache is never cleared between inputs.
(3) A cache key that omits a parameter the result actually depends on (for example
caching on `(i, j)` while the answer also depends on a `k` counter) — plus the
related bug of `@cache` on a method, where `self` inflates the key and holds memory.
</details>

---

## 22. Mini project — a real diff tool built on LCS

Goal: given two files, print a unified-style diff. This exercises the whole toolkit:
build an LCS table, then **backtrack through it** to recover the edit script.

```python
from typing import List, Tuple

def lcs_table(a: List[str], b: List[str]) -> List[List[int]]:
    """dp[i][j] = length of the LCS of a[:i] and b[:j]."""
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp


def diff(a: List[str], b: List[str]) -> List[Tuple[str, str]]:
    """Return [(op, line)] with op in {' ', '-', '+'}, walking the table backwards."""
    dp = lcs_table(a, b)
    i, j = len(a), len(b)
    out: List[Tuple[str, str]] = []
    while i > 0 and j > 0:
        if a[i - 1] == b[j - 1]:
            out.append((' ', a[i - 1])); i -= 1; j -= 1      # common line
        elif dp[i - 1][j] >= dp[i][j - 1]:
            out.append(('-', a[i - 1])); i -= 1              # deleted from a
        else:
            out.append(('+', b[j - 1])); j -= 1              # added from b
    while i > 0:
        out.append(('-', a[i - 1])); i -= 1
    while j > 0:
        out.append(('+', b[j - 1])); j -= 1
    return out[::-1]                                         # we built it backwards


def render(ops: List[Tuple[str, str]], context: int = 3) -> str:
    """Collapse long runs of unchanged lines into '...' separators."""
    keep = [False] * len(ops)
    for idx, (op, _) in enumerate(ops):
        if op != ' ':
            for k in range(max(0, idx - context), min(len(ops), idx + context + 1)):
                keep[k] = True
    lines, skipping = [], False
    for idx, (op, text) in enumerate(ops):
        if keep[idx]:
            lines.append(f"{op} {text}")
            skipping = False
        elif not skipping:
            lines.append("...")
            skipping = True
    return "\n".join(lines)


def diff_files(path_a: str, path_b: str) -> str:
    with open(path_a, encoding='utf-8') as f:
        a = f.read().splitlines()
    with open(path_b, encoding='utf-8') as f:
        b = f.read().splitlines()
    return render(diff(a, b))


if __name__ == '__main__':
    old = ["def f(x):", "    y = x + 1", "    return y", "", "print(f(1))"]
    new = ["def f(x):", "    y = x * 2", "    return y", "", "print(f(2))", "print('done')"]
    print(render(diff(old, new), context=1))
```
**Time O(m·n) / Space O(m·n)** — `m`, `n` are line counts.

### Extensions, in increasing difficulty

1. **Change detection** — pair an adjacent `-`/`+` and mark it as a modified line.
2. **Word-level diff** — run the same algorithm on the tokens of a modified line.
3. **Hirschberg's algorithm** — reconstruct in `O(min(m, n))` space by recursively
   splitting on the middle row; this is what real diff tools do for large files.
4. **Myers' diff** — the algorithm `git diff` actually uses: DP on the edit graph
   parameterized by edit distance `d`, giving `O((m + n)·d)`, which is far faster
   when the files are similar.
5. **Patch application** — emit a real unified diff header (`@@ -l,s +l,s @@`) and
   write the inverse operation that applies the patch.

**Mental trigger:** whenever a problem asks for *the solution itself* rather than
its value, you need the table plus a backward walk over stored choices. Build the
DP, then read it backwards.
