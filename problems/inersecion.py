from typing import List
class Solution:
    def intervalIntersection(self, firstList: List[List[int]], secondList: List[List[int]]) -> List[List[int]]:

        def __overlap(i1, i2):
            return i1[0] <= i2[1] and i2[0] <= i1[1]

        def __intersect(i1, i2):
            return [max(i1[0], i2[0]), min(i1[1], i2[1])]

        i = 0
        j = 0

        m = len(firstList)
        n = len(secondList)
        res = []
        while i < m and j < n:
            if __overlap(firstList[i], secondList[j]):
                res.append(__intersect(firstList[i], secondList[j]))
            if firstList[i][1] == secondList[j][1]:
                i += 1
                j += 1
            elif firstList[i][1] < secondList[j][1]:
                i += 1
            else:
                j += 1
        return res

print(Solution().intervalIntersection([[0,2],[5,10],[13,23],[24,25]], [[1,5],[8,12],[15,24],[25,26]]))