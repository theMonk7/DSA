class Solution:

    def nestedListSum(self, arr, depth):


        s = 0
        for el in arr:
            if isinstance(el, int):
                s += el * depth
            else:
                s += self.nestedListSum(el, depth  + 1)
        return s

print(Solution().nestedListSum([1,[4,[6]]], 1))
print(Solution().nestedListSum([1,[2,2],[[3],2],1], 1))