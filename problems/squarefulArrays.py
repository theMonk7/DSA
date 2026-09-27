"""
LC 996 — Number of Squareful Arrays

An array is squareful if EVERY adjacent pair sums to a perfect square.
Count the permutations of `nums` that are squareful. Two permutations are
different only if some index holds a different VALUE (so duplicate values
must not be counted twice).

n <= 12  ->  exponential is intended.

Mental model
------------
This is Permutations II (LC 47) with one extra guard: a candidate may be
placed only if `path[-1] + candidate` is a perfect square. So the search is
a walk in a graph whose nodes are the values and whose edges are
"sum is a perfect square" — a Hamiltonian-path count on a 12-node graph.

The adjacency constraint is a FEASIBILITY PRUNE at every node (recursion.md
§11.1), not a filter at the leaf: reject at depth 2 instead of depth n.
"""

import math
from collections import Counter
from functools import lru_cache
from itertools import permutations


def is_square(x: int) -> bool:
    r = math.isqrt(x)
    return r * r == x


# ---------------------------------------------------------------------------
# 1. Brute force — generate every permutation, validate at the leaf.
#    Correct, and useful as an oracle. O(n! * n) time.
# ---------------------------------------------------------------------------
class BruteForce:
    def numSquarefulPerms(self, nums: list[int]) -> int:
        seen = set()
        for p in permutations(nums):
            if all(is_square(p[i] + p[i + 1]) for i in range(len(p) - 1)):
                seen.add(p)  # dedupe by VALUE tuple, not by index
        return len(seen)


# ---------------------------------------------------------------------------
# 2. Optimal for the constraints — backtracking over DISTINCT VALUES.
#    Branching over Counter keys makes duplicate siblings structurally
#    impossible, so no sort + `not used[i-1]` index gymnastics is needed.
# ---------------------------------------------------------------------------
class Solution:
    def numSquarefulPerms(self, nums: list[int]) -> int:
        n = len(nums)
        cnt = Counter(nums)

        # Precompute which distinct values may follow which: the constraint is
        # checked O(1) per node instead of an isqrt call per node.
        nxt = {x: [y for y in cnt if is_square(x + y)] for x in cnt}

        res = 0

        def bt(prev, depth):
            nonlocal res
            if depth == n:
                res += 1
                return
            for x in nxt[prev]:
                if cnt[x] == 0:
                    continue
                cnt[x] -= 1              # CHOOSE
                bt(x, depth + 1)         # EXPLORE
                cnt[x] += 1              # UN-CHOOSE

        for x in list(cnt):              # each distinct value starts a chain once
            cnt[x] -= 1
            bt(x, 1)
            cnt[x] += 1
        return res


# ---------------------------------------------------------------------------
# 3. Bitmask DP — O(2^n * n^2), beats n! when n is at the 12 limit.
#    dp(mask, i) = number of ways to lay out exactly the set `mask`, ending at
#    index i. Dedup uses the Permutations II rule on a SORTED array: an index
#    equal to its left twin may be placed only if the twin is already in mask.
# ---------------------------------------------------------------------------
class BitmaskDP:
    def numSquarefulPerms(self, nums: list[int]) -> int:
        nums = sorted(nums)
        n = len(nums)
        full = (1 << n) - 1
        ok = [[is_square(nums[i] + nums[j]) for j in range(n)] for i in range(n)]

        @lru_cache(None)
        def dp(mask, i):
            if mask == full:
                return 1
            total = 0
            for j in range(n):
                if mask >> j & 1 or not ok[i][j]:
                    continue
                # left-to-right rule: use a duplicate only after its twin
                if j > 0 and nums[j] == nums[j - 1] and not (mask >> (j - 1) & 1):
                    continue
                total += dp(mask | 1 << j, j)
            return total

        res = 0
        for i in range(n):
            if i > 0 and nums[i] == nums[i - 1]:
                continue                 # same rule for the starting element
            res += dp(1 << i, i)
        dp.cache_clear()
        return res


# ---------------------------------------------------------------------------
# Complexity
#   BruteForce : time O(n! * n)                      space O(n! * n)
#   Solution   : time O(n!) worst case but the square constraint prunes the
#                tree to a tiny fraction of it     space O(n) stack + O(d) map
#   BitmaskDP  : time O(2^n * n^2)                   space O(2^n * n)
# For n = 12 the bitmask DP is ~590k states; the backtracker is usually faster
# in practice because most branches die at depth 2.
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import random

    cases = [
        ([1, 17, 8], 2),        # [1,8,17] and [17,8,1]
        ([2, 2, 2], 1),         # 2+2=4; all three are identical -> ONE permutation
        ([1, 8, 17, 8], 6),
        ([2, 2, 2, 2], 1),
        ([5, 11, 5], 1),
        ([1, 2, 3], 0),         # no adjacent pair sums to a square
    ]
    for nums, expected in cases:
        got = Solution().numSquarefulPerms(nums)
        assert got == expected, (nums, got, expected)
        assert BitmaskDP().numSquarefulPerms(nums) == expected, nums
        assert BruteForce().numSquarefulPerms(nums) == expected, nums
    print("fixed cases OK")

    # cross-check all three against each other on random inputs
    for _ in range(300):
        nums = [random.choice([1, 2, 3, 5, 8, 11, 17]) for _ in range(random.randint(1, 7))]
        a = Solution().numSquarefulPerms(nums)
        b = BitmaskDP().numSquarefulPerms(nums)
        c = BruteForce().numSquarefulPerms(nums)
        assert a == b == c, (nums, a, b, c)
    print("randomised cross-check OK")
