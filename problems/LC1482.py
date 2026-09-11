from typing import List
class Solution:
    def minDays(self, bloomDay: List[int], m: int, k: int) -> int:

        # ------------ Helper methods -------------
        def __canMakeKBouquets(arr, m, k, d):
            numOfBouq = 0
            kCons = 0
            for el in arr:
                if el <= d:
                    kCons += 1
                else:
                    kCons = 0

                if kCons == k:
                    numOfBouq += 1
                    kCons = 0
            return numOfBouq >= m

        # -----------------------------------------

        n = len(bloomDay)
        flowersRequired = m * k
        if flowersRequired > n:
            return -1

        lo = min(bloomDay)
        hi = max(bloomDay)

        while lo < hi:
            mid = (lo + hi) // 2
            if __canMakeKBouquets(bloomDay, m, k, mid):
                hi = mid
            else:
                lo = mid + 1
        return lo

# print(Solution().minDays(bloomDay=[1,10,3,10,2], m=3, k=1))

