class Solution:
    def findUnion(self, a, b):
        # code here

        resultant_array = []
        len_a = len(a)
        len_b = len(b)

        pt_a = 0
        pt_b = 0

        while pt_a < len_a and pt_b < len_b:
            last_el = resultant_array[-1] if len(resultant_array) > 0 else None
            if a[pt_a] <= b[pt_b]:
                if a[pt_a] != last_el:
                    resultant_array.append(a[pt_a])
                pt_a += 1
            else:
                if b[pt_b] != last_el:
                    resultant_array.append(b[pt_b])
                pt_b += 1

        if pt_a < len_a:
            for i in range(pt_a, len_a):
                last_el = resultant_array[-1] if len(resultant_array) > 0 else None
                if a[i] != last_el:
                    resultant_array.append(a[i])
        if pt_b < len_b:
            for i in range(pt_b, len_b):
                last_el = resultant_array[-1] if len(resultant_array) > 0 else None
                if b[i] != last_el:
                    resultant_array.append(b[i])
        return resultant_array



print(Solution().findUnion([1,2,3,4,5],[1,2,3]))