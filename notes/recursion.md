# Recursion, Backtracking & Divide-and-Conquer — Complete Guide

> Google DSA prep notes. Recursion is the parent technique behind `trees.md` and `graphs.md`
> (recursion on a fixed structure) and `dp.md` (recursion + memoisation). Read this first:
> it teaches the *contract* that makes all three work.

## 1. How to think recursively — the leap of faith

The hardest thing about recursion is that people try to **trace** it. Don't. Tracing a depth-8
call tree is impossible and is not how working engineers write recursive code. Use the
**inductive contract** (the *leap of faith*):

> Assume the function already works for every input **strictly smaller** than the one I was
> given. Given that gift, I only write two things: **(a)** the smallest case I can answer
> directly, and **(b)** one level of combination.

That is strong induction: base case = induction base, recursive case = induction step,
"strictly smaller" = the well-founded ordering that guarantees termination.

### Write the contract in English BEFORE writing code
One sentence, present tense, describing what the function **returns** — never how it computes it.

| Problem | Contract sentence |
|---|---|
| Max depth of tree | `depth(node)` returns the height of the subtree rooted at `node`. |
| Reverse linked list | `rev(head)` returns the head of the fully reversed list starting at `head`. |
| Subsets | `bt(i)` appends to `res` every subset using only indices `≥ i`, prefixed by `path`. |
| Merge sort | `ms(a)` returns a new sorted list with the same multiset as `a`. |
| N-Queens | `bt(r)` records every completed board, given rows `0..r-1` are already safe. |
| Word search | `bt(r,c,k)` returns True iff `word[k:]` can be spelled starting at `(r,c)`. |

Now the code writes itself:
```python
def max_depth(node):
    # contract: returns the height of the subtree rooted at node
    if node is None:                  # (a) smallest case, answered directly
        return 0
    l = max_depth(node.left)          # LEAP OF FAITH: assume this is already correct
    r = max_depth(node.right)
    return 1 + max(l, r)              # (b) one level of combination
```
**Three questions before coding any recursion:** (1) what is the smallest input and its answer?
(2) what is "one step smaller"? (3) given the sub-answers, how do I build mine? If (2) has no
answer you don't have a recursion, you have an infinite loop.

**Mental trigger:** if you can't state the contract in one sentence, you don't yet understand
the problem — no amount of code will fix that. Write the sentence first.

---

## 2. Anatomy of a recursive function

```python
def f(n):
    if n <= 1:            # 1. BASE CASE      terminates the descent
        return 1
    return n * f(n - 1)   # 2. RECURSIVE CASE with 3. PROGRESS (n-1 < n)
```
**Progress is not optional.**
```python
def broken(n):
    if n == 0: return 0
    return broken(n)            # no progress -> RecursionError
def also_broken(n):
    if n == 0: return 0
    return also_broken(n - 2)   # progress, but odd n skips past 0 -> RecursionError
```
The second bug is the subtle one: progress must *reach* the base, not merely move. Make bases
absorbing (`if n <= 0`), not exact (`if n == 0`).

**Call stack & space.** Each live call holds a frame (args, locals, return address). So
**time = calls × work per call**, **space = `O(max depth)` × frame size**. A frame holding a
slice (`a[:mid]`) costs `O(n)`, so `O(log n)` depth with slices is `O(n)` space overall; passing
`(lo, hi)` indices keeps frames `O(1)`.

**Python's limit.**
```python
import sys
sys.getrecursionlimit()       # 1000 by default
sys.setrecursionlimit(10**6)  # raises the COUNTER, not the C stack
```
Python has no tail-call optimisation and every Python frame also burns a C-stack frame, so
raising the limit too far **segfaults** instead of raising a catchable `RecursionError`.
Verified: depth 3000 raises `RecursionError` at the default limit. Convert to iteration when
depth can be `Θ(n)` with `n ≥ 10^4` (linked lists, path graphs, degenerate BSTs).

**Mental trigger:** "depth bounded by `log n` or tree height" → recursion is fine.
"Depth is `n`" → plan an explicit stack.

---

## 3. Recursion-tree analysis & the Master Theorem

Complexity = **(nodes in the call tree) × (work per node)**, summed level by level.
```
T(n) = 2T(n/2) + n            merge sort
level 0:              n              = n
level 1:        n/2 + n/2            = n
level 2:    n/4+n/4+n/4+n/4          = n
...  log n levels, each costing n  ->  O(n log n)
```
For `T(n) = a·T(n/b) + f(n)` with `a ≥ 1, b > 1`, let `c = log_b(a)` (so `n^c` = total leaf work):

| Case | Condition | Result | Reading |
|---|---|---|---|
| 1 | `f(n) = O(n^{c-ε})` | `Θ(n^c)` | leaves dominate |
| 2 | `f(n) = Θ(n^c log^k n)` | `Θ(n^c log^{k+1} n)` | every level costs the same |
| 3 | `f(n) = Ω(n^{c+ε})` and `a·f(n/b) ≤ k·f(n)`, `k<1` | `Θ(f(n))` | the root dominates |

| Recurrence | `a, b` | `c` | Case | Answer |
|---|---|---|---|---|
| Merge sort `2T(n/2)+n` | 2, 2 | 1 | 2 (`k=0`) | `Θ(n log n)` |
| Binary search `T(n/2)+1` | 1, 2 | 0 | 2 (`k=0`) | `Θ(log n)` |
| Strassen `7T(n/2)+n²` | 7, 2 | `log₂7≈2.807` | 1 | `Θ(n^2.807)` |
| Naive matmul `8T(n/2)+n²` | 8, 2 | 3 | 1 | `Θ(n³)` |
| Karatsuba `3T(n/2)+n` | 3, 2 | `log₂3≈1.585` | 1 | `Θ(n^1.585)` |
| `2T(n/2)+n²` | 2, 2 | 1 | 3 | `Θ(n²)` |

It does **not** apply to unequal splits (`T(n/3)+T(2n/3)+n` → draw the tree, `Θ(n log n)`) or
non-polynomially-separated `f`.

**Branching-factor formula (backtracking).** Branching factor `b`, depth `d`:
`nodes ≈ b^d`, **time** `O(b^d · work/node)`, **space** `O(d)` for the path plus the output.
Subsets `b=2, d=n` → `2^n` states, `O(n·2^n)` with copying. Permutations: branching shrinks
`n, n-1, …` → `n!` leaves. N-Queens `b=n, d=n` → `O(n!)` after column pruning, not `n^n`.

**Mental trigger:** "generate all …" → the output is exponential, so an exponential bound is
*expected*. Optimise the constant with pruning (§11), not the complexity class.

---

## 4. Converting recursion → iteration

**4a. Tail-call elimination by hand.** A call is *tail recursive* when nothing is pending after
it returns — then the frame is useless, so it's a loop.
```python
def gcd(a, b):                      # tail recursive
    return a if b == 0 else gcd(b, a % b)
def gcd_iter(a, b):                 # same thing, O(1) space
    while b: a, b = b, a % b
    return a
def fact(n, acc=1):                 # non-tail `n * fact(n-1)` made tail via an ACCUMULATOR
    return acc if n <= 1 else fact(n - 1, acc * n)
```
**4b. Explicit stack simulation.** When it isn't tail recursive, simulate the machine: push
`(state, program_counter)` and resume.
```python
def dfs_recursive(graph, src, seen=None):
    if seen is None: seen = set()          # NOT seen=set() in the signature (pitfall 5)
    seen.add(src); order = [src]
    for nb in graph[src]:
        if nb not in seen: order += dfs_recursive(graph, nb, seen)
    return order
def dfs_iterative(graph, src):
    seen, order, stack = {src}, [src], [(src, 0)]
    while stack:
        node, i = stack.pop()
        if i < len(graph[node]):
            stack.append((node, i + 1))    # resume point = the "program counter"
            nb = graph[node][i]
            if nb not in seen:
                seen.add(nb); order.append(nb); stack.append((nb, 0))
    return order
# graph {0:[1,2], 1:[3], 2:[3], 3:[]} -> both return [0, 1, 3, 2]
```
**Time / Space:** `O(V+E)` / `O(V)` for both; the iterative one has no depth limit. Storing the
child index `i` is what preserves *exact* recursive order — the common "push all neighbours"
shortcut reverses it.

**4c. When memoisation turns recursion into DP.** If the tree revisits the same *argument tuple*
you have overlapping subproblems:
```python
from functools import lru_cache
@lru_cache(None)                    # without this: O(2^n); with it: O(n)
def fib(n): return n if n < 2 else fib(n-1) + fib(n-2)
```
Recursion + memo = **top-down DP** (`dp.md`). Rule of thumb: *backtracking enumerates distinct
outputs* (the answer depends on the path, so memoising is usually impossible); *DP counts or
optimises over states*. If the return value depends only on the arguments, memoise it.

---

## 5. The universal backtracking template

```python
def backtrack(state, choices):
    if is_solution(state):
        record(state)                    # append a COPY
        return
    for choice in choices:
        if not valid(choice, state):
            continue                     # prune
        make(choice, state)              # CHOOSE
        backtrack(state, next_choices)   # EXPLORE
        undo(choice, state)              # UN-CHOOSE  <-- the essential step
```
**Choose / explore / un-choose.** The three lines around the recursive call *are* the technique.
`make` and `undo` must be exact inverses so that when the call returns, `state` is byte-for-byte
what it was. That invariant — *backtrack leaves the world as it found it* — is what lets sibling
branches share one mutable object instead of allocating a copy at each of the `b^d` nodes.

**Why undo:** `path` is one list shared by the whole call tree. Without `path.pop()`, branch 2
starts from branch 1's leftovers and every later answer is garbage.

**Two ways to record results:**
```python
path.append(x); bt(i + 1); path.pop()   # (1) shared mutable path, O(1) per edge
res.append(path[:])                     #     COPY. res.append(path) is THE classic bug.
bt(i + 1, path + [x])                   # (2) immutable state, no undo, O(n) per edge
res.append(path)                        #     safe: nothing can mutate it later
```
Form (1) is faster; you *must* copy at the record step. Form (2) reads better for strings
(`expr + '+' + s`), where concatenation is unavoidable anyway.

**The classic bug:** `res.append(path)` stores a *reference*; every entry in `res` is the same
object, and after `bt` unwinds `path` is empty — so `res` prints as `[[], [], [], …]`.
Fix with `path[:]`, `list(path)` or `path.copy()`.

**Mental trigger:** "find **all** / enumerate every / how many ways with n ≤ ~20" → backtracking.
"Find **the best**" with overlapping states → DP.

---

## 6. Pattern 1 — Subsets & combinations

Signature move: a `start` index so each element is considered **once, in order**. That is what
makes results *combinations* (order-insensitive) rather than permutations.
```python
def subsets(nums):                                 # LC 78
    res, path = [], []
    def bt(start):
        res.append(path[:])                        # EVERY node is a valid subset
        for i in range(start, len(nums)):
            path.append(nums[i])
            bt(i + 1)                              # i+1: never reuse, never look back
            path.pop()
    bt(0); return res
# [1,2,3] -> [[],[1],[1,2],[1,2,3],[1,3],[2],[2,3],[3]]
```
**Time / Space:** `O(n·2^n)` / `O(n)` stack.
```python
def subsets_dup(nums):                             # LC 90
    nums.sort()                                    # equal values must be adjacent
    res, path = [], []
    def bt(start):
        res.append(path[:])
        for i in range(start, len(nums)):
            if i > start and nums[i] == nums[i - 1]:
                continue                           # skip a duplicate SIBLING
            path.append(nums[i]); bt(i + 1); path.pop()
    bt(0); return res
# [1,2,2] -> [[],[1],[1,2],[1,2,2],[2],[2,2]]
```
**Why `i > start`, not `i > 0`?** `i` walks *siblings* at this level and `start` is the first
sibling. `i == start` is the first appearance of this value at this level — we must take it.
`i > start` with `nums[i] == nums[i-1]` means an identical sibling was already explored at this
exact position and generated a superset of what we'd generate now. `i > 0` would instead block
the *parent→child* case (`[2]` then `[2,2]`), losing real answers. **Two duplicates may share a
path; never a level.**
```python
def combine(n, k):                                 # LC 77
    res, path = [], []
    def bt(start):
        if len(path) == k: res.append(path[:]); return
        need = k - len(path)
        for i in range(start, n - need + 2):       # prune: not enough numbers left
            path.append(i); bt(i + 1); path.pop()
    bt(1); return res
# combine(4,2) -> [[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]
```
**Time / Space:** `O(k·C(n,k))` / `O(k)`.
```python
def combination_sum(cands, target):                # LC 39: reuse allowed
    cands.sort(); res, path = [], []
    def bt(start, remain):
        if remain == 0: res.append(path[:]); return
        for i in range(start, len(cands)):
            if cands[i] > remain: break            # sorted -> the whole tail is hopeless
            path.append(cands[i])
            bt(i, remain - cands[i])               # i, not i+1: may reuse this candidate
            path.pop()
    bt(0, target); return res
# [2,3,6,7], 7 -> [[2,2,3],[7]]
def combination_sum2(cands, target):               # LC 40: each index once, dupes in input
    cands.sort(); res, path = [], []
    def bt(start, remain):
        if remain == 0: res.append(path[:]); return
        for i in range(start, len(cands)):
            if i > start and cands[i] == cands[i - 1]: continue
            if cands[i] > remain: break
            path.append(cands[i]); bt(i + 1, remain - cands[i]); path.pop()
    bt(0, target); return res
# [10,1,2,7,6,1,5], 8 -> [[1,1,6],[1,2,5],[1,7],[2,6]]
def combination_sum3(k, n):                        # LC 216: exactly k digits from 1..9
    res, path = [], []
    def bt(start, remain):
        if len(path) == k:
            if remain == 0: res.append(path[:])
            return
        for d in range(start, 10):
            if d > remain: break
            path.append(d); bt(d + 1, remain - d); path.pop()
    bt(1, n); return res
# k=3,n=9 -> [[1,2,6],[1,3,5],[2,3,4]]
```
**Combination Sum IV (LC 377) is a trap** — it *counts* and **order matters** (`[1,2] ≠ [2,1]`),
so it is unbounded-knapsack DP, not backtracking:
```python
def combination_sum4(nums, target):
    dp = [0] * (target + 1); dp[0] = 1
    for t in range(1, target + 1):                 # target OUTER = order matters
        for x in nums:
            if x <= t: dp[t] += dp[t - x]
    return dp[target]
# [1,2,3], 4 -> 7
```
Swap the loops (items outer) and you count *combinations* — the classic coin-change
distinction. Cross-ref `dp.md`.
```python
def letter_case_permutation(s):                    # LC 784
    res, path, n = [], [], len(s)
    def bt(i):
        if i == n: res.append("".join(path)); return
        c = s[i]
        for ch in ((c.lower(), c.upper()) if c.isalpha() else (c,)):
            path.append(ch); bt(i + 1); path.pop()
    bt(0); return res
# "a1b2" -> a1b2, a1B2, A1b2, A1B2
def binary_strings(n):                             # all 2^n binary strings
    res, path = [], []
    def bt():
        if len(path) == n: res.append("".join(path)); return
        for c in "01":
            path.append(c); bt(); path.pop()
    bt(); return res                               # 2 -> ['00','01','10','11']
```
**Bitmask alternative (no recursion).** For `n ≤ ~20` this is often 3× faster and impossible to
get wrong:
```python
def subsets_bitmask(nums):
    n = len(nums)
    return [[nums[i] for i in range(n) if mask >> i & 1] for mask in range(1 << n)]
```
Bonus: iterate all submasks of `m` with `sub = (sub - 1) & m`; popcount via `bin(m).count('1')`.

**Mental trigger:** "choose some / choose k / sum to target, order irrelevant" → `start` index,
recurse with `i` (reuse) or `i+1` (move on).

---

## 7. Pattern 2 — Permutations

No `start` index: every unused element is a candidate at every level. That is the structural
difference from §6.
```python
def permute(nums):                                 # LC 46
    n, res, path, used = len(nums), [], [], [False] * len(nums)
    def bt():
        if len(path) == n: res.append(path[:]); return
        for i in range(n):
            if used[i]: continue
            used[i] = True; path.append(nums[i])
            bt()
            path.pop(); used[i] = False            # undo BOTH mutations
    bt(); return res
```
**Time / Space:** `O(n·n!)` / `O(n)`. The swap-in-place variant avoids `used` but yields
non-lexicographic order and breaks the duplicate skip — prefer `used`.
```python
def permute_unique(nums):                          # LC 47, approach A: sort + used
    nums.sort()
    n, res, path, used = len(nums), [], [], [False] * len(nums)
    def bt():
        if len(path) == n: res.append(path[:]); return
        for i in range(n):
            if used[i]: continue
            if i > 0 and nums[i] == nums[i - 1] and not used[i - 1]:
                continue                           # place a dupe only right after its twin
            used[i] = True; path.append(nums[i]); bt(); path.pop(); used[i] = False
    bt(); return res
# [1,1,2] -> [[1,1,2],[1,2,1],[2,1,1]]
```
`not used[i-1]` forces equal values to be consumed **left to right**, so each multiset ordering
appears exactly once. (`used[i-1]` true means the twin is already on the path — deeper, legal.)
```python
def permute_unique_counter(nums):                  # approach B: cleaner, no sort
    from collections import Counter
    cnt, n, res, path = Counter(nums), len(nums), [], []
    def bt():
        if len(path) == n: res.append(path[:]); return
        for x in cnt:                              # branch over DISTINCT VALUES
            if cnt[x] == 0: continue
            cnt[x] -= 1; path.append(x)
            bt()
            path.pop(); cnt[x] += 1
    bt(); return res
```
Branching over distinct values makes duplicates structurally impossible — no sort, no index
gymnastics. Prefer this in an interview; it generalises to Squareful Arrays (LC 996).
```python
def next_permutation(nums):                        # LC 31, iterative O(n) / O(1)
    i = len(nums) - 2
    while i >= 0 and nums[i] >= nums[i + 1]: i -= 1  # pivot = first dip from the right
    if i >= 0:
        j = len(nums) - 1
        while nums[j] <= nums[i]: j -= 1             # smallest value greater than pivot
        nums[i], nums[j] = nums[j], nums[i]
    nums[i + 1:] = reversed(nums[i + 1:])            # suffix was descending -> now minimal
    return nums
# [1,2,3]->[1,3,2]   [3,2,1]->[1,2,3]   [1,1,5]->[1,5,1]
```
This is a greedy argument (smallest possible increase at the rightmost position) — see
`greedy.md`. Applying it repeatedly enumerates all permutations lexicographically in `O(1)`
extra space, beating recursion when memory matters.
```python
def letter_combinations(digits):                   # LC 17
    if not digits: return []                       # "" -> [], NOT [""]
    pad = {'2':'abc','3':'def','4':'ghi','5':'jkl','6':'mno','7':'pqrs','8':'tuv','9':'wxyz'}
    res, path = [], []
    def bt(i):
        if i == len(digits): res.append("".join(path)); return
        for c in pad[digits[i]]:
            path.append(c); bt(i + 1); path.pop()
    bt(0); return res
# "23" -> ad ae af bd be bf cd ce cf
```
**Time / Space:** `O(4^n·n)` / `O(n)`.

**Mental trigger:** "arrange / order matters / all orderings" → `used` array or `Counter`, loop
over **all** candidates, no `start`.

---

## 8. Pattern 3 — Partitioning a sequence

Contract: `bt(start)` **enumerates every way to cut `s[start:]` into valid pieces.** The loop
chooses where the *next cut* goes.
```python
def partition_palindrome(s):                       # LC 131
    n = len(s); res, path = [], []
    pal = [[False] * n for _ in range(n)]          # precompute once, O(n^2)
    for i in range(n - 1, -1, -1):
        for j in range(i, n):
            pal[i][j] = s[i] == s[j] and (j - i < 2 or pal[i + 1][j - 1])
    def bt(start):
        if start == n: res.append(path[:]); return
        for end in range(start, n):
            if pal[start][end]:                    # prune non-palindromic cuts
                path.append(s[start:end + 1]); bt(end + 1); path.pop()
    bt(0); return res
# "aab" -> [["a","a","b"],["aa","b"]]
```
**Time / Space:** `O(n·2^n)` / `O(n²)` table. Checking palindromes on the fly adds a factor of
`n` at *every* node — the difference between AC and TLE at `n = 16`.
```python
def restore_ip(s):                                 # LC 93
    n = len(s); res, path = [], []
    def bt(start):
        if len(path) == 4:
            if start == n: res.append(".".join(path))
            return                                 # 4 parts but leftover chars -> dead branch
        for L in range(1, 4):                      # each octet is 1..3 digits
            if start + L > n: break
            seg = s[start:start + L]
            if (seg[0] == '0' and L > 1) or int(seg) > 255: continue
            path.append(seg); bt(start + L); path.pop()
    bt(0); return res
# "25525511135" -> ["255.255.11.135","255.255.111.35"] ;  "0000" -> ["0.0.0.0"]
```
**Time / Space:** `O(3^4) = O(1)` / `O(1)` — depth is fixed at 4.
```python
def split_fib(s):                                  # LC 842
    n = len(s); path = []
    def bt(start):
        if start == n: return len(path) >= 3       # need at least 3 terms
        for L in range(1, n - start + 1):
            seg = s[start:start + L]
            if len(seg) > 1 and seg[0] == '0': break               # no leading zeros
            v = int(seg)
            if v > 2**31 - 1: break                                # 32-bit bound
            if len(path) >= 2 and v > path[-1] + path[-2]: break   # monotone -> prune tail
            if len(path) < 2 or v == path[-1] + path[-2]:
                path.append(v)
                if bt(start + L): return True      # first valid split wins
                path.pop()
        return False
    return path if bt(0) else []
# "123456579" -> [123,456,579] ;  "112358130" -> []
```
Once the first two terms are fixed the rest is determined → `O(n²)` starting pairs × `O(n)`.
```python
def can_partition_k(nums, k):                      # LC 698 — pruning IS the problem
    total = sum(nums)
    if total % k: return False                     # 1. arithmetic feasibility
    target = total // k
    nums.sort(reverse=True)                        # 2. place BIG items first (fail fast)
    if nums[0] > target: return False              # 3. one item cannot fit
    buckets = [0] * k
    def bt(i):
        if i == len(nums): return True
        for j in range(k):
            if j > 0 and buckets[j] == buckets[j - 1]:
                continue                           # 4. symmetry: identical bucket states
            if buckets[j] + nums[i] <= target:
                buckets[j] += nums[i]
                if bt(i + 1): return True
                buckets[j] -= nums[i]
            if buckets[j] == 0: break              # 5. all empty buckets are interchangeable
        return False
    return bt(0)
# [4,3,2,3,5,2,1], 4 -> True ;  [1,2,3,4], 3 -> False
```
Measured node counts: `[3,3,3,3,4,4,4,4,5,5,5,5], k=6` → **61,767 without prunes, 13 with**.
`[2,2,2,2,3,4,5], k=4` (infeasible) → **1,245 → 12**. Same algorithm; only the prunes differ.
**Matchsticks to Square (LC 473)** is literally `can_partition_k(sticks, 4)` plus `len ≥ 4`.
```python
def is_additive(num):                              # LC 306
    n = len(num)
    def ok(t): return len(t) == 1 or t[0] != '0'
    def check(i, a, b):
        if i == n: return True
        c = str(a + b)
        return num.startswith(c, i) and check(i + len(c), b, a + b)
    for i in range(1, n):                          # brute-force only the first two terms
        for j in range(i + 1, n):
            s1, s2 = num[:i], num[i:j]
            if ok(s1) and ok(s2) and check(j, int(s1), int(s2)): return True
    return False
# "112358" -> True ; "199100199" -> True ; "1023" -> False
```
**Time / Space:** `O(n³)` / `O(n)`.

**Mental trigger:** "split the string / cut into pieces such that each piece is valid" →
`bt(start)` plus an inner loop over the piece length or end index.

---

## 9. Pattern 4 — Grid & board backtracking

**N-Queens (LC 51/52) — the O(1) diagonal trick.** Cell `(r,c)` lies on the ↘ diagonal
identified by `r - c` (constant along it) and the ↙ anti-diagonal identified by `r + c`.
Three hash sets give `O(1)` conflict checks instead of scanning the board.
```
r-c:  0 -1 -2        r+c:  0  1  2
      1  0 -1              1  2  3
      2  1  0              2  3  4
```
```python
def solve_n_queens(n):
    res, board = [], []
    cols, diag, anti = set(), set(), set()
    def bt(r):                                     # one queen per row, so r == depth
        if r == n: res.append(board[:]); return
        for c in range(n):
            if c in cols or (r - c) in diag or (r + c) in anti: continue
            cols.add(c); diag.add(r - c); anti.add(r + c)
            board.append('.' * c + 'Q' + '.' * (n - c - 1))
            bt(r + 1)
            board.pop()
            cols.remove(c); diag.remove(r - c); anti.remove(r + c)
    bt(0); return res
# n=4 -> 2 solutions, first is ['.Q..','...Q','Q...','..Q.']
```
**Time / Space:** `O(n!)` / `O(n)`. Verified counts for `n = 1..8`: `1,0,0,2,10,4,40,92`.
For LC 52 (count only) swap the sets for three **bitmasks** — same logic, ~3× faster:
```python
def total_n_queens(n):
    count = 0
    def bt(r, cols, diag, anti):
        nonlocal count
        if r == n: count += 1; return
        for c in range(n):
            if cols >> c & 1 or diag >> (r - c + n) & 1 or anti >> (r + c) & 1: continue
            bt(r + 1, cols | 1 << c, diag | 1 << (r - c + n), anti | 1 << (r + c))
    bt(0, 0, 0, 0); return count                   # the +n offset keeps r-c non-negative
```
**Sudoku Solver (LC 37) — the box index.** Cell `(r,c)` is in box **`(r//3)*3 + c//3`**: `r//3`
picks the band (0–2), `c//3` the stack (0–2), and `band*3 + stack` flattens to `0..8`.
```python
def solve_sudoku(board):
    rows  = [set() for _ in range(9)]
    cols  = [set() for _ in range(9)]
    boxes = [set() for _ in range(9)]
    empties = []
    for r in range(9):
        for c in range(9):
            v = board[r][c]
            if v == '.': empties.append((r, c))
            else: rows[r].add(v); cols[c].add(v); boxes[(r // 3) * 3 + c // 3].add(v)
    def bt(k):
        if k == len(empties): return True
        r, c = empties[k]; b = (r // 3) * 3 + c // 3
        for d in "123456789":
            if d in rows[r] or d in cols[c] or d in boxes[b]: continue
            rows[r].add(d); cols[c].add(d); boxes[b].add(d); board[r][c] = d
            if bt(k + 1): return True              # propagate success -> stop the search
            rows[r].discard(d); cols[c].discard(d); boxes[b].discard(d); board[r][c] = '.'
        return False
    bt(0); return board
```
**Time / Space:** `O(9^m)` worst case (`m` blanks) / `O(m)`. Returning `True` up the stack is
what stops at the first solution; a bare `bt(k+1)` would keep searching (pitfall 10).
```python
def exist(board, word):                            # LC 79 — mark in place, restore on exit
    R, C = len(board), len(board[0])
    def bt(r, c, k):
        if k == len(word): return True
        if r < 0 or r >= R or c < 0 or c >= C or board[r][c] != word[k]: return False
        board[r][c] = '#'                          # CHOOSE: O(1) state, O(1) undo
        found = any(bt(r + dr, c + dc, k + 1) for dr, dc in ((1,0), (-1,0), (0,1), (0,-1)))
        board[r][c] = word[k]                      # UN-CHOOSE: restore!
        return found
    return any(bt(r, c, 0) for r in range(R) for c in range(C))
```
**Time / Space:** `O(R·C·3^L)` / `O(L)`. For **Word Search II (LC 212)** put the words in a Trie
and walk the board once, instead of re-scanning per word.
```python
def rat_in_maze(m):                                # classic: collect ALL paths
    n = len(m); res, path = [], []
    if not m or not m[0][0]: return res
    seen = [[False] * n for _ in range(n)]
    def bt(r, c):
        if r == n - 1 and c == n - 1: res.append("".join(path)); return
        seen[r][c] = True
        for ch, dr, dc in (('D',1,0), ('L',0,-1), ('R',0,1), ('U',-1,0)):  # sorted order
            nr, nc = r + dr, c + dc
            if 0 <= nr < n and 0 <= nc < n and not seen[nr][nc] and m[nr][nc]:
                path.append(ch); bt(nr, nc); path.pop()
        seen[r][c] = False                         # undo so other paths may reuse this cell
    bt(0, 0); return res
# [[1,0,0,0],[1,1,0,1],[1,1,0,0],[0,1,1,1]] -> ['DDRDRR','DRDDRR']
```
Listing the directions as `D, L, R, U` yields lexicographically ordered answers for free.
```python
def unique_paths_iii(grid):                        # LC 980 — cover every empty cell exactly once
    R, C = len(grid), len(grid[0])
    empty = sum(row.count(0) for row in grid) + 1  # +1 for the start cell itself
    sr = sc = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == 1: sr, sc = r, c
    res = 0
    def bt(r, c, remain):
        nonlocal res
        if r < 0 or r >= R or c < 0 or c >= C or grid[r][c] == -1: return
        if grid[r][c] == 2:
            res += (remain == 0); return           # end reached: valid only if all cells used
        grid[r][c] = -1                            # choose
        for dr, dc in ((1,0), (-1,0), (0,1), (0,-1)):
            bt(r + dr, c + dc, remain - 1)
        grid[r][c] = 0                             # un-choose
    bt(sr, sc, empty); return res
# [[1,0,0,0],[0,0,0,0],[0,0,2,-1]] -> 2
```
**Number of Islands (LC 200) is the same machinery *without* the undo** — the crispest
illustration of what `undo` is for: **undo when the mark means "on my current path"; don't undo
when it means "globally processed".** Flood Fill, Surrounded Regions (130) and Pacific Atlantic
(417) are all no-undo DFS — see `graphs.md`.

**Mental trigger:** grid + "all paths / place pieces / fill cells" → backtracking with in-place
marking. Grid + "count regions / reachability" → plain DFS/BFS, no undo.

---

## 10. Pattern 5 — Expression building & construction

**Expression Add Operators (LC 282) — a Google hard; know it cold.** Insert `+ - *` between
digits so the expression equals `target`. The hard part is `*` precedence: when you append `*4`
you must **undo the last operand's contribution** and re-add it multiplied. Carry `prev` = the
signed value of the last operand.
```python
def add_operators(num, target):
    n, res = len(num), []
    def bt(i, expr, value, prev):
        if i == n:
            if value == target: res.append(expr)
            return
        for j in range(i, n):
            s = num[i:j + 1]
            if len(s) > 1 and s[0] == '0': break   # "05" is invalid, and so is any extension
            cur = int(s)
            if i == 0:
                bt(j + 1, s, cur, cur)             # first operand carries no operator
            else:
                bt(j + 1, expr + '+' + s, value + cur,  cur)
                bt(j + 1, expr + '-' + s, value - cur, -cur)
                bt(j + 1, expr + '*' + s,
                   value - prev + prev * cur,      # undo prev, re-add prev*cur
                   prev * cur)
    bt(0, "", 0, 0); return res
# "123",6 -> ["1*2*3","1+2+3"] ; "232",8 -> ["2*3+2","2+3*2"]
# "105",5 -> ["1*0+5","10-5"]  ; "3456237490",9191 -> []
```
Trace `2+3*2`: after `2+3`, `value=5, prev=3`; then `*2` gives `5 - 3 + 3*2 = 8`, `prev=6`.
Storing `prev` **signed** (`-cur` after a minus) is what makes `1-2*3 = -5` come out right.
**Time / Space:** `O(4^n·n)` / `O(n)` — four choices per gap (`+`, `-`, `*`, or extend the number).
```python
from functools import lru_cache
def diff_ways(expr):                               # LC 241 — split at EVERY operator
    @lru_cache(None)
    def go(e):
        if e.isdigit(): return (int(e),)           # tuple: hashable, so lru_cache can store it
        out = []
        for i, ch in enumerate(e):
            if ch in "+-*":                        # ch is the LAST operator evaluated
                for a in go(e[:i]):
                    for b in go(e[i + 1:]):
                        out.append(a + b if ch == '+' else a - b if ch == '-' else a * b)
        return tuple(out)
    return list(go(expr))
# "2-1-1" -> [0,2] ; "2*3-4*5" -> [-34,-14,-10,-10,10]
```
**Time / Space:** `O(Catalan(n)) ≈ O(4^n/n^1.5)` without memo; memoising substrings makes
repeated sub-expressions free.

**Remove Invalid Parentheses (LC 301).** BFS version — the minimum number of removals is found
level by level, so stop at the first level containing any valid string:
```python
def remove_invalid_bfs(s):
    def valid(t):
        bal = 0
        for c in t:
            if c == '(': bal += 1
            elif c == ')':
                bal -= 1
                if bal < 0: return False
        return bal == 0
    level = {s}
    while level:
        good = [t for t in level if valid(t)]
        if good: return sorted(good)               # minimal removals by construction
        level = {t[:i] + t[i+1:] for t in level for i in range(len(t)) if t[i] in "()"}
    return [""]
```
DFS version — precompute exactly how many `(` and `)` must go, then spend that quota:
```python
def remove_invalid_dfs(s):
    l = r = 0
    for c in s:                                    # l = surplus '(' , r = surplus ')'
        if c == '(': l += 1
        elif c == ')':
            if l: l -= 1
            else: r += 1
    res = set()
    def bt(i, path, open_cnt, rem_l, rem_r):
        if i == len(s):
            if open_cnt == 0 and rem_l == 0 and rem_r == 0: res.add(path)
            return
        c = s[i]
        if c == '(':
            if rem_l: bt(i + 1, path, open_cnt, rem_l - 1, rem_r)      # delete
            bt(i + 1, path + c, open_cnt + 1, rem_l, rem_r)            # keep
        elif c == ')':
            if rem_r: bt(i + 1, path, open_cnt, rem_l, rem_r - 1)
            if open_cnt: bt(i + 1, path + c, open_cnt - 1, rem_l, rem_r)
        else:
            bt(i + 1, path + c, open_cnt, rem_l, rem_r)
    bt(0, "", 0, l, r); return sorted(res)
# both agree: "()())()" -> ["(())()","()()()"] ;  ")(" -> [""]
```
Write the DFS in an interview: it prunes by *quota* instead of exploring every deletion.
```python
def judge_point24(cards):                          # LC 679
    EPS = 1e-6
    def go(nums):
        if len(nums) == 1: return abs(nums[0] - 24) < EPS      # FLOAT compare, not ==
        for i in range(len(nums)):
            for j in range(len(nums)):
                if i == j: continue                # ordered pairs cover both a-b and b-a
                rest = [nums[k] for k in range(len(nums)) if k != i and k != j]
                cands = [nums[i] + nums[j], nums[i] - nums[j], nums[i] * nums[j]]
                if abs(nums[j]) > EPS: cands.append(nums[i] / nums[j])
                for v in cands:
                    if go(rest + [v]): return True # collapse two numbers into one
        return False
    return go([float(c) for c in cards])
# [4,1,8,7] -> True ; [1,2,1,2] -> False
```
Key insight: don't build expression trees — repeatedly **replace two numbers by their result**.
```python
def generate_parenthesis(n):                       # LC 22
    res, path = [], []
    def bt(open_c, close_c):
        if len(path) == 2 * n: res.append("".join(path)); return
        if open_c < n:                             # may always open while budget remains
            path.append('('); bt(open_c + 1, close_c); path.pop()
        if close_c < open_c:                       # may close only if something is open
            path.append(')'); bt(open_c, close_c + 1); path.pop()
    bt(0, 0); return res
# 3 -> ['((()))','(()())','(())()','()(())','()()()']
```
**Why no filtering is needed:** a string is balanced **iff** every prefix has `#( ≥ #)` and the
totals are equal. `close_c < open_c` enforces the prefix property at every step; `open_c < n`
caps the opens, and reaching length `2n` forces `close_c = open_c = n`. Conversely every valid
string satisfies both guards at each position, so it is reachable. Leaves ↔ valid strings
bijectively: **zero wasted nodes.** **Time / Space:** `O(4^n/√n)` (Catalan) / `O(n)`.

---

## 11. Pruning — the difference between TLE and AC

Backtracking is brute force; **pruning is the algorithm.** Six levers, roughly by payoff.

**11.1 Feasibility pruning — kill dead branches early.** Check the constraint the instant you
can, not at the leaf. Naive N-Queens generates all `n^n` placements and validates at the leaf;
pruned rejects a conflicting column immediately. Measured (identical answers `4 / 40 / 92`):

| n | naive nodes | pruned nodes | ratio |
|---|---|---|---|
| 6 | 55,987 | 153 | 366× |
| 7 | 960,800 | 552 | 1,740× |
| 8 | 19,173,961 | **2,057** | 9,321× |

**11.2 Symmetry breaking — don't explore isomorphic branches.** Two empty buckets are
interchangeable, so `if buckets[j] == 0: break` explores only the first empty one; likewise
`if buckets[j] == buckets[j-1]: continue`. The duplicate-sibling skips of §6/§7 are symmetry
breaking on equal values.

**11.3 Sort to prune early.** **Descending** when packing (partition-to-k, matchsticks): big
items have the fewest legal placements, so failures surface at depth 1 instead of depth `n` —
the *fail-fast* / most-constrained-variable (MRV) principle. **Ascending** when accumulating
toward a target: it lets `if cands[i] > remain: break` cut the whole tail (`break`, not
`continue` — that is the entire point of sorting). Measured on partition-to-k:

| Input | k | naive | pruned |
|---|---|---|---|
| `[3,3,3,3,4,4,4,4,5,5,5,5]` | 6 | 61,767 | **13** |
| `[1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4]` | 5 | 1,858 | **17** |
| `[2,2,2,2,3,4,5]` (infeasible) | 4 | 1,245 | **12** |

**11.4 Memoise the state.** If two different *paths* reach the same *state*, cache it. In
partition-to-k the state is (bitmask of used items, current bucket fill) → `O(2^n·n)` DP. Valid
only when the answer depends on the state alone. Cross-ref `dp.md`.

**11.5 Bounding (branch & bound).** Keep the best answer so far and abandon any branch whose
**optimistic** bound cannot beat it ("remaining items sum to 10, I need 12" → prune). Needs an
*admissible* (never-pessimistic) bound. Used in TSP, knapsack, LC 1723, LC 1240.

**11.6 Constraint propagation.** After a choice, deduce forced consequences before recursing. In
Sudoku: fill any cell with one candidate (naked single) and any digit that fits one cell in a
unit (hidden single). With MRV this solves "world's hardest" grids in milliseconds.

**Mental trigger:** a TLE-ing backtracking solution rarely needs a *different algorithm* — it
needs, in order, an earlier feasibility check, a sort, and a symmetry break.

---

## 12. Divide and conquer

Split into **independent** subproblems, solve recursively, **merge**. Unlike backtracking there
is no shared mutable state, so there is nothing to undo.
```python
def merge_sort(a):                                 # T(n) = 2T(n/2) + n = O(n log n)
    if len(a) <= 1: return a
    mid = len(a) // 2
    left, right = merge_sort(a[:mid]), merge_sort(a[mid:])
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]: out.append(left[i]); i += 1     # <= keeps it STABLE
        else:                   out.append(right[j]); j += 1
    out.extend(left[i:]); out.extend(right[j:])
    return out
```
**Time / Space:** `O(n log n)` always / `O(n)`. Stable; the workhorse for linked lists
(`linked_list.md`) and external sorting.
```python
import random
def lomuto(a, lo, hi):                 # pivot ends at its FINAL index
    k = random.randint(lo, hi)
    a[k], a[hi] = a[hi], a[k]          # RANDOM pivot: kills the sorted-input O(n^2) case
    pivot, i = a[hi], lo
    for j in range(lo, hi):
        if a[j] < pivot:
            a[i], a[j] = a[j], a[i]; i += 1
    a[i], a[hi] = a[hi], a[i]
    return i
def hoare(a, lo, hi):                  # returns a SPLIT point, not a final position
    pivot = a[(lo + hi) // 2]
    i, j = lo - 1, hi + 1
    while True:
        i += 1
        while a[i] < pivot: i += 1
        j -= 1
        while a[j] > pivot: j -= 1
        if i >= j: return j
        a[i], a[j] = a[j], a[i]
def quicksort(a, lo=0, hi=None):
    if hi is None: hi = len(a) - 1
    if lo < hi:
        p = lomuto(a, lo, hi)
        quicksort(a, lo, p - 1); quicksort(a, p + 1, hi)        # exclude the settled pivot
    return a
```
| | Lomuto | Hoare |
|---|---|---|
| Return value | pivot's **final** index | a **split** point |
| Recurse on | `[lo, p-1]`, `[p+1, hi]` | `[lo, p]`, `[p+1, hi]` |
| Swaps | ~3× more | fewer |
| All-equal input | `O(n²)` | `O(n log n)` |
| Bug risk | low | infinite loop if you use `p±1`, or `a[lo]` as pivot |

**Time / Space:** `O(n log n)` expected, `O(n²)` worst / `O(log n)` stack. Not stable. Always
randomise (or median-of-three) — LC 912 has adversarial sorted tests that punish a fixed pivot.
```python
def find_kth_largest(nums, k):                     # LC 215 — quickselect, O(n) expected
    a, target = nums[:], len(nums) - k             # k-th largest = index n-k when sorted
    lo, hi = 0, len(a) - 1
    while True:
        p = lomuto(a, lo, hi)
        if p == target: return a[p]
        if p < target: lo = p + 1
        else:          hi = p - 1
```
Recursing into **one** side gives `T(n) = T(n/2) + n = O(n)` (geometric, not `n log n`). Beats
the heap's `O(n log k)` in expectation; the heap wins on streams (`heaps.md`).
```python
def count_inversions(a):
    def sort_count(arr):
        if len(arr) <= 1: return arr, 0
        mid = len(arr) // 2
        left, x = sort_count(arr[:mid]); right, y = sort_count(arr[mid:])
        out, i, j, inv = [], 0, 0, x + y
        while i < len(left) and j < len(right):
            if left[i] <= right[j]: out.append(left[i]); i += 1
            else:
                inv += len(left) - i     # left[i..] ALL beat right[j] -> that many inversions
                out.append(right[j]); j += 1
        out.extend(left[i:]); out.extend(right[j:])
        return out, inv
    return sort_count(a)[1]
# [2,4,1,3,5] -> 3
```
**Count of Smaller Numbers After Self (LC 315)** is the same merge, but you sort an *index*
array and credit `j - mid` to `res[idx[i]]` whenever you take a left element (that many
right-half elements were already emitted, i.e. smaller). `[5,2,6,1] -> [2,1,1,0]`; verified
against brute force on 50 random arrays. **Time / Space:** `O(n log n)` / `O(n)`.
```python
import math
def closest_pair(points):                          # O(n log n)
    def dist(p, q): return math.hypot(p[0] - q[0], p[1] - q[1])
    def rec(px):                                   # px sorted by x
        n = len(px)
        if n <= 3:
            return min((dist(px[i], px[j]) for i in range(n) for j in range(i+1, n)),
                       default=float('inf'))
        mid = n // 2; midx = px[mid][0]
        d = min(rec(px[:mid]), rec(px[mid:]))      # best strictly within each half
        strip = sorted((p for p in px if abs(p[0] - midx) < d), key=lambda p: p[1])
        for i in range(len(strip)):                # cross-boundary check
            for j in range(i + 1, min(i + 8, len(strip))):
                if strip[j][1] - strip[i][1] >= d: break
                d = min(d, dist(strip[i], strip[j]))
        return d
    return rec(sorted(points))
```
**The magic:** inside the vertical strip of width `2d`, any point has at most **7** others within
distance `d` (at most 8 points fit in a `d × 2d` box while staying pairwise `≥ d` apart), so the
inner loop is `O(1)`. Re-sorting the strip gives `O(n log² n)`; merge-sorting by `y` alongside
gives `O(n log n)`. Verified against brute force on 30 random point sets.
```python
def majority_dc(nums):                             # LC 169
    def rec(lo, hi):
        if lo == hi: return nums[lo]
        mid = (lo + hi) // 2
        l, r = rec(lo, mid), rec(mid + 1, hi)
        if l == r: return l
        lc = sum(1 for i in range(lo, hi+1) if nums[i] == l)   # tie-break by counting
        rc = sum(1 for i in range(lo, hi+1) if nums[i] == r)
        return l if lc > rc else r
    return rec(0, len(nums) - 1)
def max_subarray_dc(nums):                         # LC 53
    def rec(lo, hi):
        if lo == hi: return nums[lo]
        mid = (lo + hi) // 2
        best_l = -float('inf'); s = 0
        for i in range(mid, lo - 1, -1): s += nums[i]; best_l = max(best_l, s)
        best_r = -float('inf'); s = 0
        for i in range(mid + 1, hi + 1): s += nums[i]; best_r = max(best_r, s)
        return max(rec(lo, mid), rec(mid + 1, hi), best_l + best_r)   # left / right / crossing
    return rec(0, len(nums) - 1)
# [-2,1,-3,4,-1,2,1,-5,4] -> 6 ; [-3,-1,-2] -> -1
```
Majority is `O(n log n)` vs Boyer–Moore's `O(n)/O(1)`, but interviewers want the *correctness
argument*: a global majority must be a majority of at least one half. Max-subarray is
`O(n log n)` vs Kadane's `O(n)`, but the *crossing* idea generalises to segment trees
(`arrays.md`).

**The Skyline Problem (LC 218) — a Google favourite.** Contract: `get_skyline(bs)` **returns the
key points of the silhouette of `bs`.** Split the buildings in half, solve each, merge like
merge sort.
```python
def get_skyline(buildings):
    if not buildings: return []
    if len(buildings) == 1:
        l, r, h = buildings[0]; return [[l, h], [r, 0]]
    mid = len(buildings) // 2
    return merge_skylines(get_skyline(buildings[:mid]), get_skyline(buildings[mid:]))
def merge_skylines(a, b):
    res, h1, h2, i, j = [], 0, 0, 0, 0
    def push(x, h):
        if res and res[-1][0] == x: res[-1][1] = h                 # same x -> keep the last
        elif not res or res[-1][1] != h: res.append([x, h])        # a key point is a CHANGE
    while i < len(a) and j < len(b):
        if   a[i][0] < b[j][0]: x, h1 = a[i][0], a[i][1]; i += 1
        elif a[i][0] > b[j][0]: x, h2 = b[j][0], b[j][1]; j += 1
        else: x, h1, h2 = a[i][0], a[i][1], b[j][1]; i += 1; j += 1
        push(x, max(h1, h2))                                       # silhouette = max of both
    while i < len(a): push(a[i][0], a[i][1]); i += 1
    while j < len(b): push(b[j][0], b[j][1]); j += 1
    return res
# [[2,9,10],[3,7,15],[5,12,12],[15,20,10],[19,24,8]]
#   -> [[2,10],[3,15],[7,12],[12,0],[15,10],[20,8],[24,0]]
# [[1,2,1],[1,2,2],[1,2,3]] -> [[1,3],[2,0]]
```
`T(n) = 2T(n/2) + O(n) = O(n log n)`, space `O(n)`. Verified against a brute-force sweep on 200
random inputs. The two guards inside `push` are the whole difficulty. The alternative is a sweep
line with a max-heap (`heaps.md`); the D&C version is what "divide and conquer" questions want.
```python
def beautiful_array(n):                            # LC 932
    res = [1]
    while len(res) < n:
        res = [2 * x - 1 for x in res] + [2 * x for x in res]     # all odds, then all evens
    return [x for x in res if x <= n]              # 4 -> [1,3,2,4]
```
If `A` is beautiful so are `2A-1` and `2A`, and no `A[i] + A[j] = 2·A[k]` can straddle the
halves because odd + even is odd, never `2k`. D&C on the *structure*, not the input: `O(n log n)`.
```python
def build_tree(preorder, inorder):                 # LC 105
    pos = {v: i for i, v in enumerate(inorder)}    # O(1) root lookup
    it = iter(preorder)
    def rec(lo, hi):                               # bounds inside inorder
        if lo > hi: return None
        root = TreeNode(next(it)); m = pos[root.val]
        root.left  = rec(lo, m - 1)                # LEFT FIRST — preorder demands it
        root.right = rec(m + 1, hi)
        return root
    return rec(0, len(inorder) - 1)
```
**Time / Space:** `O(n)` / `O(n)`. For postorder + inorder (LC 106) consume `postorder` from the
**end** and build `right` before `left`. Full treatment in `trees.md`.

**Mental trigger:** "sorted halves that can be merged", "count pairs across a split",
"silhouette on a split" → divide and conquer.

---

## 13. Recursion on other structures

```python
def depth_sum(nested, depth=1):                    # LC 339: weight = depth
    total = 0
    for item in nested:
        total += item * depth if isinstance(item, int) else depth_sum(item, depth + 1)
    return total
# [[1,1],2,[1,1]] -> 10 ; [1,[4,[6]]] -> 27
def depth_sum_inverse(nested):                     # LC 364: weight = maxDepth - depth + 1
    def max_depth(x, d=1):
        return max((max_depth(i, d+1) for i in x if not isinstance(i, int)), default=d)
    D = max_depth(nested)
    def go(x, d):
        return sum(i * (D - d + 1) if isinstance(i, int) else go(i, d + 1) for i in x)
    return go(nested, 1)
# [[1,1],2,[1,1]] -> 8 ; [1,[4,[6]]] -> 17
```
LC 364 also has a one-pass form: keep a running `unweighted` sum and add it again at each level
(each level's numbers get counted once more per remaining level).
```python
class NestedIterator:                              # LC 341 — lazy, O(1) amortised
    def __init__(self, nested):
        self.stack = list(reversed(nested))        # reversed so pop() yields left-to-right
    def hasNext(self):
        while self.stack and not isinstance(self.stack[-1], int):
            self.stack.extend(reversed(self.stack.pop()))   # expand ONE list, lazily
        return bool(self.stack)
    def next(self):
        return self.stack.pop()
def flatten_gen(x):                                # generator version: recursion via `yield from`
    for item in x:
        if isinstance(item, int): yield item
        else: yield from flatten_gen(item)
# list(flatten_gen([1,[4,[6,[]],7]])) -> [1,4,6,7]
```
**Directory trees & JSON-like structures** — the recursion mirrors the data:
```python
import os
def dir_size(path):
    if os.path.isfile(path): return os.path.getsize(path)
    return sum(dir_size(os.path.join(path, e)) for e in os.listdir(path))
def json_paths(obj, prefix=""):                    # {"a":{"b":1}} -> {"a.b": 1}
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items(): out.update(json_paths(v, f"{prefix}.{k}" if prefix else k))
        return out
    if isinstance(obj, list):
        out = {}
        for i, v in enumerate(obj): out.update(json_paths(v, f"{prefix}[{i}]"))
        return out
    return {prefix: obj}
```
Related: LC 388 Longest Absolute File Path, LC 772 Basic Calculator III (a hand-written
recursive-descent parser is mutual recursion between `expr` / `term` / `factor`).
```python
def is_even(n): return True  if n == 0 else is_odd(n - 1)     # MUTUAL RECURSION
def is_odd(n):  return False if n == 0 else is_even(n - 1)
def tree_stats(node):
    """returns (height, node_count, subtree_sum) — MULTIPLE RETURN VALUES in one pass"""
    if node is None: return (0, 0, 0)
    hl, cl, sl = tree_stats(node.left)
    hr, cr, sr = tree_stats(node.right)
    return (1 + max(hl, hr), 1 + cl + cr, node.val + sl + sr)
```
Returning a tuple is the single most useful trick in tree problems — it collapses two `O(n)`
traversals into one. It powers Balanced Binary Tree (110), Diameter (543), House Robber III
(337), Largest BST Subtree (333) and Max Path Sum (124). See `trees.md`.

---

## 14. Common pitfalls

1. **No base case, or an unreachable one** → `RecursionError`. Make bases absorbing (`n <= 0`).
2. **No progress toward the base** — `f(n)` instead of `f(n-1)`, or `start` never advancing.
3. **Appending the mutable path** — `res.append(path)` instead of `res.append(path[:])`.
   Symptom: `res` full of identical (usually empty) lists. The #1 backtracking bug.
4. **Forgetting to undo** — missing `path.pop()` / `used[i] = False` / cell restore. Symptom:
   the first answer is right and every later one is junk. Every mutation needs an inverse.
5. **Mutable default arguments** — `def bt(path=[])` shares ONE list across *all* calls to your
   function, so the second invocation sees the first one's garbage. Use `path=None` + a guard.
6. **Shadowing the accumulator** — `res = res + [x]` inside a closure rebinds a new local (or
   raises `UnboundLocalError`). Use `res.append(x)`, or `nonlocal` when you must rebind a counter.
7. **Exponential re-computation that needed memoisation** — if the same argument tuple appears
   twice in the tree, add `@lru_cache(None)` (fib, Word Break, Regex Matching, LC 241).
8. **Python's recursion limit** — depth 3000 dies at the default 1000, and
   `setrecursionlimit(300000)` **segfaults** rather than raising. Use an explicit stack (§4b).
9. **Deep copies at every node** — `bt(i+1, path+[x])` or `deepcopy(board)` adds `O(n)` per node,
   i.e. `O(n·b^d)`. Mutate + undo; copy only at the record step.
10. **Implicitly returning `None`** — writing `bt(i+1)` instead of `if bt(i+1): return True` in a
    boolean search means success never propagates. Classic in Sudoku and Word Search.
11. **Off-by-one in `start`** — `bt(i)` reuses the element (Combination Sum I), `bt(i+1)` moves
    on (Combination Sum II); `bt(start+1)` inside the loop is *always* a bug (it ignores `i`,
    producing duplicates and missing combos).
12. **Wrong duplicate-skip condition** — `i > 0` instead of `i > start` blocks legitimate
    parent→child duplicates, and the skip only works *after sorting*.
13. **Filtering at the leaf instead of pruning at the node** — correct but `O(b^d)` when a depth-1
    check would cut 99.99% of the tree (see the 9,321× N-Queens number in §11).
14. **Float comparison in recursive arithmetic** (24 Game) — use `abs(x-24) < 1e-6` and guard
    division by `abs(denom) > eps`.
15. **Recording at the wrong place** — in Subsets *every node* is an answer; in Permutations only
    *leaves* are. Putting `res.append(path[:])` in the wrong spot silently changes the problem.

---

## 15. Cheat sheets

| Problem | Time | Space (excl. output) | Output size |
|---|---|---|---|
| Subsets (78) | `O(n·2^n)` | `O(n)` | `2^n` |
| Subsets II (90) | `≤ O(n·2^n)` | `O(n)` | ≤ `2^n` |
| Permutations (46) | `O(n·n!)` | `O(n)` | `n!` |
| Permutations II (47) | `O(n·n!)` | `O(n)` | `n!/∏cᵢ!` |
| Combinations (77) | `O(k·C(n,k))` | `O(k)` | `C(n,k)` |
| Combination Sum (39) | `O(n^{T/m})` | `O(T/m)` | — |
| Generate Parentheses (22) | `O(4^n/√n)` | `O(n)` | Catalan `Cₙ` |
| Letter Combinations (17) | `O(4^n·n)` | `O(n)` | ≤ `4^n` |
| Palindrome Partitioning (131) | `O(n·2^n)` | `O(n²)` table | ≤ `2^{n-1}` |
| N-Queens (51) | `O(n!)` | `O(n)` | ~`n!/cⁿ` |
| Sudoku (37) | `O(9^m)` | `O(m)` | 1 |
| Word Search (79) | `O(R·C·3^L)` | `O(L)` | 1 |
| Expression Add Operators (282) | `O(4^n·n)` | `O(n)` | — |
| Merge sort / Skyline / Inversions | `O(n log n)` | `O(n)` | — |
| Quickselect (215) | `O(n)` exp., `O(n²)` worst | `O(1)` | — |
| Closest pair | `O(n log n)` | `O(n)` | — |

| The prompt says… | Reach for |
|---|---|
| "return **all** subsets / combinations" | `bt(start)`, record at **every** node |
| "…with duplicates, no duplicate answers" | sort + `if i > start and a[i]==a[i-1]: continue` |
| "all **permutations** / orderings" | `used[]` or `Counter`, no `start`, record at leaves |
| "**split / partition** into valid parts" | `bt(start)` + loop over the piece end |
| "place N items on a board without conflict" | grid backtracking + conflict sets |
| "**count** the number of ways" (n large) | DP, not backtracking (`dp.md`) |
| "find **one** valid configuration" | backtracking returning `bool`; `return True` to stop |
| "**minimum** removals/edits to make valid" | BFS by level, or quota-based DFS |
| "insert operators / parentheses" | expression backtracking; carry `prev` for `*` |
| "sorted output / count pairs across a split" | divide & conquer on the merge step |
| "k-th largest, unordered" | quickselect `O(n)` exp., or a heap (`heaps.md`) |
| "n ≤ 20 and it smells exponential" | backtracking or bitmask is *intended* |

---

## 16. Google-favourite problem list

**Basic — build the reflexes**
1. LC 78 Subsets — the template; every node is an answer.
2. LC 90 Subsets II — sort + sibling skip (`i > start`).
3. LC 77 Combinations — `start` index + the "not enough left" prune.
4. LC 46 Permutations — `used[]`, no `start`.
5. LC 47 Permutations II — `not used[i-1]`, or the Counter approach.
6. LC 39 Combination Sum — reuse allowed → recurse with `i`.
7. LC 40 Combination Sum II — each index once → `i+1` + sibling skip.
8. LC 216 Combination Sum III — fixed size `k`, digits 1–9.
9. LC 377 Combination Sum IV — **DP**, not backtracking; order matters.
10. LC 17 Letter Combinations — Cartesian product; guard the empty input.
11. LC 22 Generate Parentheses — open/close counters, zero wasted nodes.
12. LC 784 Letter Case Permutation — branch 2 ways on letters only.
13. LC 70 / 509 Climbing Stairs & Fibonacci — the memoisation lesson.
14. LC 206 / 344 Reverse List & String recursively — contract practice.
15. LC 50 Pow(x, n) — fast exponentiation `T(n)=T(n/2)+1`; watch `n < 0`.
16. LC 89 Gray Code — recursive reflection, or `i ^ (i >> 1)`.

**Core — the interview meat**
17. LC 79 Word Search — mark `'#'`, restore on the way out.
18. LC 131 Palindrome Partitioning — precompute the palindrome table.
19. LC 93 Restore IP Addresses — fixed depth 4, leading-zero rule.
20. LC 51 N-Queens — `r-c` / `r+c` diagonal sets.
21. LC 52 N-Queens II — same, with bitmask counting.
22. LC 37 Sudoku Solver — box index `(r//3)*3 + c//3`; `return True` to stop.
23. LC 698 Partition to K Equal Sum Subsets — the five prunes.
24. LC 473 Matchsticks to Square — LC 698 with `k = 4`.
25. LC 526 Beautiful Arrangement — divisibility constraint; `O(n!)` with heavy pruning.
26. LC 980 Unique Paths III — must cover every empty cell exactly once.
27. LC 200 Number of Islands — DFS **without** undo; the contrast that teaches `undo`.
28. LC 130 / 417 Surrounded Regions & Pacific Atlantic — flood fill from the border.
29. LC 494 Target Sum — backtracking → memoise → subset-sum DP.
30. LC 306 Additive Number — fix two terms, verify the rest.
31. LC 842 Split Array into Fibonacci Sequence — same idea + 32-bit bound.
32. LC 241 Different Ways to Add Parentheses — split at every operator; Catalan.
33. LC 140 Word Break II — memoised backtracking returning sentences.
34. LC 212 Word Search II — Trie + board DFS; prune dead Trie branches.
35. Rat in a Maze (classic) — collect all paths; order the directions for free sorting.

**Hard — the differentiators**
36. LC 282 Expression Add Operators — the signed `prev` trick for `*`. Know it cold.
37. LC 301 Remove Invalid Parentheses — BFS by level, or quota DFS.
38. LC 679 24 Game — collapse two numbers into one; epsilon compare.
39. LC 425 Word Squares — prefix map + the incremental prefix constraint.
40. LC 247 Strobogrammatic Number II — build outward in pairs; no leading `0` at top level.
41. LC 351 Android Unlock Patterns — `skip` matrix + 4-fold symmetry (verified 389,497).
42. LC 996 Number of Squareful Arrays — Permutations II over a "sum is a perfect square" graph.
43. LC 10 Regular Expression Matching — `go(i,j)` with the `*` zero-or-more branch, memoised.
44. LC 44 Wildcard Matching — a greedy two-pointer beats the recursion.
45. LC 218 The Skyline Problem — D&C merge of two skylines (§12).
46. LC 315 Count of Smaller Numbers After Self — merge sort on indices.
47. LC 493 Reverse Pairs — same merge, counting `a[i] > 2·a[j]`.
48. LC 912 Sort an Array — merge sort or **randomised** quicksort (a fixed pivot TLEs).
49. LC 215 Kth Largest Element — quickselect, `O(n)` expected.
50. LC 169 Majority Element — D&C version, then Boyer–Moore.
51. LC 53 Maximum Subarray — D&C crossing sum, then Kadane.
52. LC 932 Beautiful Array — D&C on odds/evens.
53. LC 105 / 106 Construct Binary Tree from traversals — index map, `O(n)`.
54. Closest Pair of Points (classic) — strip of width `2d`, ≤ 7 neighbours.
55. LC 341 Flatten Nested List Iterator — lazy stack expansion.
56. LC 339 / 364 Nested List Weight Sum I & II — depth vs inverse depth.
57. LC 1240 Tiling a Rectangle with the Fewest Squares — backtracking + branch & bound.
58. LC 1723 Find Minimum Time to Finish All Jobs — bucket backtracking + bounding.

---

## 17. Quiz

**Q1.** Why does `if i > start and nums[i] == nums[i-1]: continue` deduplicate Subsets II, while
`i > 0` does not?
<details><summary>Answer</summary>
`i` ranges over *siblings* at the current level, starting at `start`. `i > start` means an
identical value was already tried **at this same position**, so its entire subtree is a
duplicate. `i > 0` would also block the case where the previous equal element is the *parent*,
killing legitimate answers like `[2,2]`. Duplicates may repeat down a path, never across a level.
Sorting is what makes equal values adjacent in the first place.
</details>

**Q2.** You wrote `res.append(path)` and got `[[], [], [], []]`. What happened, and what's the fix?
<details><summary>Answer</summary>
`path` is one mutable list shared by the whole call tree, so `res` holds four references to the
same object; after the recursion unwinds `path` is empty. Fix: append a snapshot —
`res.append(path[:])` (or `list(path)` / `path.copy()`).
</details>

**Q3.** In Expression Add Operators, evaluate `1 - 2 * 3` using the template's state.
<details><summary>Answer</summary>
Start `value=1, prev=1`. After `-2`: `value = -1`, `prev = -2` (**signed**). After `*3`:
`value = value - prev + prev*3 = -1 - (-2) + (-6) = -5`, `prev = -6`. Correct. Keeping `prev`
signed is exactly what makes subtraction-then-multiplication work.
</details>

**Q4.** `T(n) = 2T(n/2) + n²` — which Master case, and what is the answer?
<details><summary>Answer</summary>
`a=2, b=2, c = log₂2 = 1`. `f(n) = n² = Ω(n^{1+ε})` with `ε=1`, and regularity holds
(`2·(n/2)² = n²/2 ≤ ½·n²`). **Case 3** → `Θ(n²)`. The root dominates: `n² + n²/2 + n²/4 + …`
is a geometric series summing to `Θ(n²)`.
</details>

**Q5.** Why do you undo in Word Search but **not** in Number of Islands?
<details><summary>Answer</summary>
In Word Search the mark means "on my *current path*" — once this path fails another may
legitimately reuse the cell, so it must be restored. In Number of Islands the mark means
"globally visited/counted" — re-visiting would double-count. Undo iff the state is path-local.
</details>

**Q6.** Generate Parentheses uses `if close_c < open_c`. Prove nothing invalid is generated and
nothing valid is missed.
<details><summary>Answer</summary>
A string of `(`/`)` is balanced **iff** every prefix has `#( ≥ #)` and the totals are equal.
`close_c < open_c` enforces the prefix property at every step; `open_c < n` caps the opens, and
reaching length `2n` forces `close_c = open_c = n`, giving equal totals. Conversely every valid
string satisfies both guards at each of its positions, so it is reachable. Leaves correspond
bijectively to valid strings — Catalan many, zero wasted work.
</details>

**Q7.** Your partition-to-k-subsets solution TLEs. Name three prunes, in order of impact.
<details><summary>Answer</summary>
(1) `sum % k != 0` → immediate `False`, and reject if `max(nums) > target`; (2) sort
**descending** so large items fail fast; (3) symmetry breaking — `if buckets[j] == 0: break`
(empty buckets are interchangeable) and `if buckets[j] == buckets[j-1]: continue`. Measured on
`[3,3,3,3,4,4,4,4,5,5,5,5], k=6`: **61,767 nodes → 13**.
</details>

**Q8.** When should you convert a recursion to an explicit stack rather than raise
`sys.setrecursionlimit`?
<details><summary>Answer</summary>
Whenever depth can be `Θ(n)` with `n ≥ 10⁴` — linked lists, path-shaped graphs, degenerate BSTs.
Each Python frame also consumes a C-stack frame, so raising the limit past a few tens of
thousands **segfaults** instead of raising a catchable `RecursionError`. `log n`-depth recursions
(balanced trees, merge sort, binary search) are always safe.
</details>

---

## 18. Mini project — a Sudoku solver CLI

Exercises everything above: constraint sets (§9), MRV / most-constrained-variable ordering
(§11.3), choose-explore-un-choose (§5), and `return True` to stop at the first solution
(pitfall 10).
```python
#!/usr/bin/env python3
"""sudoku.py — read a 9x9 puzzle ('.' or 0 for blanks) from a file or stdin, solve it."""
import sys

def parse_board(text):
    rows = [r.strip() for r in text.strip().splitlines() if r.strip()]
    if len(rows) != 9 or any(len(r) != 9 for r in rows):
        raise ValueError("board must be 9 lines of 9 chars ('.'/'0' or 1-9)")
    return [list(r.replace('0', '.')) for r in rows]

def solve(board):
    rows  = [set() for _ in range(9)]
    cols  = [set() for _ in range(9)]
    boxes = [set() for _ in range(9)]
    blanks = []
    for r in range(9):
        for c in range(9):
            v = board[r][c]
            if v == '.':
                blanks.append((r, c))
            else:
                b = (r // 3) * 3 + c // 3
                if v in rows[r] or v in cols[c] or v in boxes[b]:
                    raise ValueError(f"contradiction at row {r+1} col {c+1}")
                rows[r].add(v); cols[c].add(v); boxes[b].add(v)

    def candidates(r, c):
        return set("123456789") - rows[r] - cols[c] - boxes[(r // 3) * 3 + c // 3]

    def bt():
        if not blanks: return True
        # MRV: solve the most constrained blank first -> fail fast (§11.3)
        k = min(range(len(blanks)), key=lambda i: len(candidates(*blanks[i])))
        blanks[k], blanks[-1] = blanks[-1], blanks[k]
        r, c = cell = blanks.pop()
        b = (r // 3) * 3 + c // 3
        for d in candidates(r, c):
            rows[r].add(d); cols[c].add(d); boxes[b].add(d); board[r][c] = d   # CHOOSE
            if bt(): return True                                               # EXPLORE
            rows[r].discard(d); cols[c].discard(d); boxes[b].discard(d)        # UN-CHOOSE
            board[r][c] = '.'
        blanks.append(cell)          # restore the blank before failing upward
        return False
    return bt()

def render(board):
    out = []
    for i, row in enumerate(board):
        if i and i % 3 == 0: out.append("------+-------+------")
        out.append(" | ".join(" ".join(row[j:j+3]) for j in (0, 3, 6)))
    return "\n".join(out)

def main():
    text = open(sys.argv[1]).read() if len(sys.argv) > 1 else sys.stdin.read()
    board = parse_board(text)
    if solve(board):
        print(render(board))
    else:
        print("no solution", file=sys.stderr); sys.exit(1)

if __name__ == "__main__":
    main()
```
Verified end-to-end: solves the standard LC 37 grid (first row `534678912`) and a hard
`8........` grid (first row `812753649`), with every row, column and box a permutation of 1–9;
an inconsistent grid exits with code 1 and a "contradiction at row … col …" message.

**Extensions, increasing in difficulty**
1. `--count` — don't stop at the first solution; drop the early `return True`, count them, and
   report whether the puzzle is *proper* (exactly one solution).
2. **Constraint propagation** (§11.6) — before each guess, repeatedly fill naked singles (a cell
   with one candidate) and hidden singles (a digit that fits exactly one cell in a unit).
   Instrument a node counter and measure the drop, the way §11 does.
3. `--generate` — solve an empty grid with shuffled candidates, then remove clues one at a time
   while `--count` still reports exactly one solution.
4. Generalise `solve` into a CSP over `(variables, domains, constraints)` and reuse it for
   N-Queens, course scheduling, or map colouring — the backtracking core never changes, only
   `candidates()` does.
