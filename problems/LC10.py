class Solution:
    def isMatch(self, s: str, p: str) -> bool:

        S = len(s)
        P = len(p)

        def __recur(idx1, idx2, prev):
            if idx1 == S and idx2 == P:
                return True
            elif idx1 == S or idx2 == P:
                return False

            if s[idx1] == p[idx2] or p[idx2] == ".":
                return __recur(idx1 + 1, idx2 + 1, s[idx1])
            elif p[idx2] == "*":
                if prev == s[idx1]:
                    return __recur(idx1 + 1, idx2 + 1, s[idx1])
                else:
                    return __recur(idx1, idx2 + 1, s[idx1])
            else:
                return False

        return __recur(0, 0, None)

