def kDistinctChars(k, str):
    # Write your code here
    # Return an integer value
    left = 0
    hm = {}
    res = 0
    for right,val in enumerate(str):
        hm[val] = hm.get(val,0) + 1

        while len(hm) > k:
            hm[str[left]] -= 1
            if hm[str[left]] == 0:
                del hm[str[left]]
            left += 1
        res = max(res, right-left+1)
    return res

print(kDistinctChars(2, "abbbbbbc"))