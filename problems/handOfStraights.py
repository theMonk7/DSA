import heapq
from collections import deque, Counter


class Solution:
    def isNStraightHand(self, hand: list[int], k: int) -> bool:
        hq = [(k, v) for k, v in Counter(hand).items()]
        heapq.heapify(hq)
        temp = []
        n = len(hand)
        if n % k != 0:
            return False

        while hq:
            prev = -1
            for i in range(k):
                kk, vv = heapq.heappop(hq)
                print(kk, vv)
                if prev != -1 and prev + 1 != kk:
                    return False
                prev = kk

                if vv - 1 > 0:
                    temp.append((kk, vv - 1))
            print(temp)
            for el in temp:
                heapq.heappush(hq, (el[0], el[1]))
            print(hq)
        return True





print(Solution().isNStraightHand([1,2,3,6,2,3,4,7,8], 3))