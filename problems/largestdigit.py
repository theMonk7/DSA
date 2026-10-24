class Solution:
    def largestDigit(self, n):

        lar = 0

        while n > 0:
            rem = n % 10
            lar = max(lar, rem)
            n //= 10
        return lar

print(Solution().largestDigit(25))