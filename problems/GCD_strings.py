def gcd_of_strings_euclid(s, t):       # LC: both non-empty
    if len(s) < len(t):
        s, t = t, s
    if not t:
        return s                       # empty remainder = exact divide
    if not s.startswith(t):
        return ""
    return gcd_of_strings_euclid(t, s[len(t):])



print(gcd_of_strings_euclid("ABCDABCD", "AB"))
print(gcd_of_strings_euclid("ABABABAB", "ABA"))
print(gcd_of_strings_euclid("ABABABAB", "ABAB"))
print(gcd_of_strings_euclid("ABABABAB", "AB"))
print(gcd_of_strings_euclid("ABDCEF", "ABCDEFG"))