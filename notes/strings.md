# Strings — Complete Guide

> Google DSA prep notes. Category: Strings (parsing, matching, algorithms).
> Companion to `sliding_window.md` (window-based substring problems), `tries.md`
> (prefix structures) and `dp.md` (edit distance / regex / subsequence DP). Everything
> else lives here: frequency, palindromes, KMP/Z/Rabin–Karp, parsing, encoding, suffix
> structures, comparators, bit tricks.

## 1. Python string facts that decide your complexity

**Immutability.** Every `s += c` allocates a new string and copies the old one, so
appending `n` chars costs `1+2+...+n = O(n^2)`.
```python
out = ""
for c in s: out += c            # BAD  — O(n^2) character copies
parts = []
for c in s: parts.append(c)
out = "".join(parts)            # GOOD — O(n), one final allocation
```
CPython has an in-place hack when the refcount is 1, so the bad version sometimes *looks*
linear. Never rely on it. **Time / Space of `join`:** O(total) / O(total).

**Slicing copies.** `s[i:j]` is **O(j-i)** — the #1 hidden `O(n^2)`:
```python
for i in range(n):
    if s[i:i+m] == p: ...       # O(m) copy every iteration -> O(n*m)
    if s.startswith(p, i): ...  # FIX: compares in place, no allocation
```

**Code points & built-ins.**
```python
ord('a')            # 97          chr(97) -> 'a'
ord(c) - ord('a')   # 0..25 index into a fixed 26-array
c.isalnum(); c.isdigit(); c.isalpha(); c.isspace(); s.lower(); s.strip()
s.startswith(p, i); s.find(p, start)      # find returns -1, index() raises
" a  b ".split()      # ['a','b']          — any whitespace run, drops empties
" a  b ".split(' ')   # ['','a','','b','']  — each single space, KEEPS empties
re.split(r'[\s,;]+', text)                # multi-delimiter; slower, expressive
f"{name}:{count}"                         # fastest formatting
```
`split()` vs `re.split()` is a real distinction: `split()` is C-fast and covers 90%; use
`re.split` only for character classes / multi-char delimiters.

**Counter.**
```python
from collections import Counter
Counter(a) == Counter(b)     # anagram test — O(n + distinct), NOT O(1)
Counter(a) & Counter(b)      # multiset min (intersection)
Counter(a) - Counter(b)      # multiset difference, negatives dropped
Counter(s).most_common(k)
```

**Convert to `list(s)`** only when you need in-place mutation / index writes (two-pointer
swaps, LC 443); otherwise stay on the string — slicing and comparison are C-speed.

**Unicode vs ASCII — clarify first.** Lowercase English → `[0]*26`. Printable ASCII →
`[0]*128`. Arbitrary Unicode → `dict`. Also `len(s)` counts **code points**, not glyphs:
`"é"` may be 1 or 2 (NFC vs NFD), emoji are many. Saying *"I'll assume lowercase ASCII;
for Unicode I'd `unicodedata.normalize('NFC', s)` and use a dict"* scores points.

**Mental trigger:** before writing any loop ask *"am I concatenating or slicing inside
it?"* If yes, you just wrote `O(n^2)`.

---

## 2. Frequency / anagram family

### Counter template vs fixed 26-array
```python
def is_anagram(s, t):                                  # LC 242 — general alphabet
    return len(s) == len(t) and Counter(s) == Counter(t)

def is_anagram_26(s, t):                               # lowercase only, no hashing
    if len(s) != len(t): return False
    cnt = [0] * 26
    for a, b in zip(s, t):
        cnt[ord(a) - 97] += 1
        cnt[ord(b) - 97] -= 1                          # one pass, net zero if anagram
    return all(v == 0 for v in cnt)
```
**Time / Space:** O(n) / O(k), and O(n) / O(1).

### Group Anagrams (LC 49) — sorted key vs count key
```python
def group_anagrams_sorted(strs):
    d = defaultdict(list)
    for w in strs: d["".join(sorted(w))].append(w)     # key = sorted characters
    return list(d.values())

def group_anagrams_count(strs):
    d = defaultdict(list)
    for w in strs:
        key = [0] * 26
        for c in w: key[ord(c) - 97] += 1
        d[tuple(key)].append(w)                        # tuple is hashable
    return list(d.values())
```
**Time / Space:** sorted key **O(n·k log k) / O(n·k)**; count key **O(n·(k+26)) / O(n·26)**
for n words of length k. Count-key wins for long words; sorted-key wins on brevity and for
a large/unknown alphabet. Say both, pick one, justify.

### Find All Anagrams (LC 438) — fixed window (see `sliding_window.md`)
```python
def find_anagrams(s, p):
    if len(p) > len(s): return []
    need, win, res = [0]*26, [0]*26, []
    for c in p: need[ord(c) - 97] += 1
    for i, c in enumerate(s):
        win[ord(c) - 97] += 1
        if i >= len(p): win[ord(s[i - len(p)]) - 97] -= 1   # slide: drop the exiting char
        if i >= len(p) - 1 and win == need: res.append(i - len(p) + 1)
    return res
```
**Time / Space:** O(n·26) = O(n) / O(1). Track a `matched` counter for true O(1) compares.

### Ransom Note / Isomorphic / Word Pattern
```python
def can_construct(note, magazine):                     # LC 383
    return not (Counter(note) - Counter(magazine))     # empty diff => buildable

def is_isomorphic(s, t):                               # LC 205
    if len(s) != len(t): return False
    f, g = {}, {}
    for a, b in zip(s, t):
        if f.setdefault(a, b) != b or g.setdefault(b, a) != a: return False
    return True

def word_pattern(pattern, s):                          # LC 290
    words = s.split()
    if len(pattern) != len(words): return False
    f, g = {}, {}
    for c, w in zip(pattern, words):
        if f.setdefault(c, w) != w or g.setdefault(w, c) != c: return False
    return True
```
**Time / Space:** O(n) / O(k) each.
**Why one map is not enough:** `char -> word` only enforces that each char maps
*consistently*, so `"abba"` / `"dog dog dog dog"` passes (`a->dog`, `b->dog` are both
consistent). A **bijection** also needs injectivity — the second map (`word -> char`)
forbids two chars sharing a word. Same argument for `"ab"` / `"aa"` in Isomorphic.

**Mental trigger:** "same shape / re-labelling / one-to-one" → **two maps**.

---

## 3. Palindromes

### Two-pointer check (LC 125)
```python
def is_palindrome(s):
    i, j = 0, len(s) - 1
    while i < j:
        while i < j and not s[i].isalnum(): i += 1
        while i < j and not s[j].isalnum(): j -= 1
        if s[i].lower() != s[j].lower(): return False
        i += 1; j -= 1
    return True
```
**Time / Space:** O(n) / O(1). (Pre-filtering into a new string costs O(n) space.)

### Expand around centre — the workhorse
Every palindrome has a centre: `n` single-char + `n-1` gap centres = `2n-1`. Expand
outward while the mirror characters match.
```python
def longest_palindrome(s):                             # LC 5
    if not s: return ""
    start = end = 0
    def expand(l, r):
        while l >= 0 and r < len(s) and s[l] == s[r]: l -= 1; r += 1
        return l + 1, r - 1                            # last valid pair
    for i in range(len(s)):
        for l, r in (expand(i, i), expand(i, i + 1)):  # odd centre, even centre
            if r - l > end - start: start, end = l, r
    return s[start:end + 1]

def count_palindromic_substrings(s):                   # LC 647
    n = len(s)
    def expand(l, r):
        cnt = 0
        while l >= 0 and r < n and s[l] == s[r]: cnt += 1; l -= 1; r += 1
        return cnt                                     # each expansion = one palindrome
    return sum(expand(i, i) + expand(i, i + 1) for i in range(n))
```
**Time / Space:** O(n^2) / O(1). This is the expected answer for LC 5 and LC 647.

### Manacher — O(n)
**Transform.** Interleave `#` so every palindrome is odd-length: `"aba"` → `"#a#b#a#"`,
`"aa"` → `"#a#a#"`. Transformed length is `2n+1`, and `p[i]` (the radius there) equals the
**length in the original string**, starting at `(i - p[i]) // 2`.

**Speed-up.** Keep the palindrome reaching furthest right: centre `c`, right end `r`. If
`i < r`, the mirror `i' = 2c - i` gives a free lower bound. If the mirror's palindrome fits
strictly inside, `p[i] = p[i']` exactly; if it runs past `r`, we can only trust `r - i`
because characters beyond `r` were never compared. `min(...)` is safe in both cases, so we
only ever expand *past* what we already knew — and every successful expansion pushes `r`
right, which never moves left. Total expansion work: O(n).
```python
def manacher(s):
    t = '#' + '#'.join(s) + '#'                        # length 2n+1, all centres odd
    n = len(t); p = [0] * n; c = r = 0
    for i in range(n):
        if i < r: p[i] = min(r - i, p[2*c - i])        # mirror bound, clipped at r
        while (i - p[i] - 1 >= 0 and i + p[i] + 1 < n
               and t[i - p[i] - 1] == t[i + p[i] + 1]): p[i] += 1
        if i + p[i] > r: c, r = i, i + p[i]
    return p

def longest_palindrome_manacher(s):
    if not s: return ""
    p = manacher(s); b = max(range(len(p)), key=lambda i: p[i])
    return s[(b - p[b]) // 2:][:p[b]]                  # map back to original coordinates

def count_palindromes_manacher(s):
    return sum((v + 1) // 2 for v in manacher(s))      # radius v -> (v+1)//2 palindromes
```
**Time / Space:** O(n) / O(n). *Verified vs brute force on every `{a,b}` string ≤ 14 and
random `{a,b,c}` strings ≤ 20.* Offer expand-around-centre first; write Manacher if asked.

### Valid Palindrome II (LC 680) — one deletion
```python
def valid_palindrome(s):
    def ok(i, j):
        while i < j:
            if s[i] != s[j]: return False
            i += 1; j -= 1
        return True
    i, j = 0, len(s) - 1
    while i < j:
        if s[i] != s[j]: return ok(i + 1, j) or ok(i, j - 1)   # delete left OR right
        i += 1; j -= 1
    return True
```
**Time / Space:** O(n) / O(1). Only two choices at the first mismatch — this does **not**
generalise to k deletions (that's DP, `dp.md`).

### Palindrome Partitioning I (LC 131) & II (LC 132)
```python
def pal_table(s):                                      # is_pal[i][j] in O(n^2)
    n = len(s); t = [[False] * n for _ in range(n)]
    for i in range(n - 1, -1, -1):
        for j in range(i, n):
            t[i][j] = s[i] == s[j] and (j - i < 2 or t[i + 1][j - 1])
    return t

def partition(s):                                      # LC 131 — backtracking
    n, is_pal, res, cur = len(s), pal_table(s), [], []
    def bt(i):
        if i == n: res.append(cur[:]); return
        for j in range(i, n):
            if is_pal[i][j]:
                cur.append(s[i:j + 1]); bt(j + 1); cur.pop()
    bt(0); return res

def min_cut(s):                                        # LC 132 — DP over prefixes
    n, is_pal = len(s), pal_table(s)
    dp = [0] * (n + 1)                                 # dp[j] = min cuts for s[:j]
    for j in range(1, n + 1):
        dp[j] = min(dp[i] + (0 if i == 0 else 1) for i in range(j) if is_pal[i][j - 1])
    return dp[n]
```
**Time / Space:** I is O(n·2^n) / O(n^2); II is O(n^2) / O(n^2). DP framing in `dp.md`.

### Shortest Palindrome (LC 214) — the KMP trick
Prepending the fewest characters means finding the **longest palindromic prefix**. Build
`s + '#' + reverse(s)`: the LPS at the last index is the longest prefix of `s` that is also
a suffix of `reverse(s)` — exactly the longest palindromic prefix. The `'#'` sentinel (a
character outside the alphabet) stops matches spilling across the join.
```python
def shortest_palindrome(s):
    if not s: return ""
    k = build_lps(s + '#' + s[::-1])[-1]               # build_lps: section 4
    return s[k:][::-1] + s
```
**Time / Space:** O(n) / O(n). *Verified vs brute force.*

**Mental trigger:** palindrome + *substring* → expand around centre → Manacher.
Palindrome + *prefix/suffix* → KMP failure function.

---

## 4. Pattern matching

### Naive
```python
def naive_search(s, p):
    return [i for i in range(len(s) - len(p) + 1) if s.startswith(p, i)]
```
**Time / Space:** O(n·m) / O(1). Worst case `s="aaaa…a"`, `p="aa…ab"`.

### KMP — the failure function (LPS)
`lps[i]` = **length of the longest proper prefix of `p[0..i]` that is also a suffix of
`p[0..i]`** ("proper" = not the whole thing). For `p = "ababcabab"`,
`lps = [0,0,1,2,0,1,2,3,4]`: at index 8 the prefix `"abab"` is also the suffix.

Why it helps: after matching `k` characters and mismatching, the next viable alignment must
start where a prefix of `p` already matches the text we just consumed — the longest such is
`lps[k-1]`. Set `k = lps[k-1]` and retry; the **text pointer never moves backwards**.
Building it is self-matching: extending a border of length `k` needs `p[i] == p[k]`;
otherwise the next candidate is `lps[k-1]` (a border of a border is a border).
```python
def build_lps(p):
    lps = [0] * len(p); k = 0                          # k = current border length
    for i in range(1, len(p)):
        while k > 0 and p[i] != p[k]: k = lps[k - 1]   # fall back to next-longest border
        if p[i] == p[k]: k += 1
        lps[i] = k
    return lps

def kmp_search(s, p):
    if not p: return list(range(len(s) + 1))
    lps = build_lps(p); res = []; k = 0
    for i, c in enumerate(s):
        while k > 0 and c != p[k]: k = lps[k - 1]
        if c == p[k]: k += 1
        if k == len(p):
            res.append(i - k + 1); k = lps[k - 1]      # allow overlapping matches
    return res
```
**Why the fallback loop is amortised O(n):** `k` grows by **at most 1** per outer iteration
(the single `k += 1`); each inner iteration strictly *decreases* `k`, and `k >= 0` always.
So total decrements ≤ total increments ≤ n — the inner loop runs ≤ n times across the whole
scan. Same argument for `build_lps`.
**Time / Space:** build O(m) / O(m); search O(n+m) / O(m). *Verified vs brute force.*

### Rabin–Karp — rolling hash
```python
def rabin_karp(s, p, base=911_382_323, mod=972_663_749):
    n, m = len(s), len(p)
    if m == 0 or m > n: return []
    high = pow(base, m - 1, mod)                       # weight of the leading char
    hp = hs = 0
    for i in range(m):
        hp = (hp * base + ord(p[i])) % mod
        hs = (hs * base + ord(s[i])) % mod
    res = []
    for i in range(n - m + 1):
        if hs == hp and s.startswith(p, i): res.append(i)   # ALWAYS verify a hash hit
        if i + m < n: hs = ((hs - ord(s[i]) * high) * base + ord(s[i + m])) % mod
    return res
```
**Time / Space:** O(n+m) expected, O(n·m) adversarial worst case / O(1). *Verified.*

**Base/mod choice.** `mod` = a large prime (`10**9+7`, `972663749`, or `(1<<61)-1`, a
Mersenne prime). `base` > alphabet size and ideally **randomised at runtime**
(`random.randrange(256, mod)`) — anti-hash tests exist for fixed bases, and Google
interviewers do ask "what if the input is adversarial?".
**Collisions.** Either (a) verify the real substring on a hit (always correct, cheap when
matches are rare), or (b) **double hashing** — two independent (base, mod) pairs, dropping
the collision probability from ~`1/mod` to ~`1/mod²`.
```python
def double_hash(s, b1=131, m1=1_000_000_007, b2=137, m2=998_244_353):
    h1 = h2 = 0
    for c in s:
        h1 = (h1 * b1 + ord(c)) % m1
        h2 = (h2 * b2 + ord(c)) % m2
    return (h1, h2)
```

### Prefix-hash class — any substring hash in O(1)
```python
MOD, BASE = (1 << 61) - 1, 1_000_003

class RollingHash:
    def __init__(self, s):
        self.h = [0] * (len(s) + 1); self.p = [1] * (len(s) + 1)
        for i, c in enumerate(s):
            self.h[i + 1] = (self.h[i] * BASE + ord(c)) % MOD
            self.p[i + 1] = (self.p[i] * BASE) % MOD
    def sub(self, i, j):                               # hash of s[i:j]
        return (self.h[j] - self.h[i] * self.p[j - i]) % MOD
```
**Time / Space:** build O(n) / O(n); each query O(1).

### Z-algorithm
`z[i]` = length of the longest substring starting at `i` that is also a **prefix** of `s`.
Maintain the rightmost "z-box" `[l, r)` — a segment known to equal a prefix — and reuse
`z[i-l]` inside it, exactly like Manacher.
```python
def z_function(s):
    n = len(s); z = [0] * n
    if n: z[0] = n
    l = r = 0
    for i in range(1, n):
        if i < r: z[i] = min(r - i, z[i - l])          # copy from the mirror, clip at r
        while i + z[i] < n and s[z[i]] == s[i + z[i]]: z[i] += 1
        if i + z[i] > r: l, r = i, i + z[i]
    return z

def z_search(s, p):
    comb = p + '\x00' + s                              # sentinel outside the alphabet
    z, m = z_function(comb), len(p)
    return [i - m - 1 for i in range(m + 1, len(comb)) if z[i] >= m]
```
**Time / Space:** O(n) / O(n). *Verified vs the O(n^2) definition.* Uses: pattern search,
border lengths, "longest prefix that is also a substring of…", periodicity (`n - z[i] == i`
and `i | n` → period `i`). Often easier to write correctly under pressure than KMP.

### The pragmatic answer
`s.find(p)` / `p in s` uses tuned Crochemore–Perrin + Horspool in C — linear in practice.
Always say *"in production I'd use `str.find`; here's the algorithm behind it."*

### Classic applications
**Implement strStr (28)** — `kmp_search(hay, needle)[0]` if any else `-1`.

**Repeated Substring Pattern (459)** — two one-liners:
```python
def repeated_substring_lps(s):
    n, k = len(s), build_lps(s)[-1]
    return k > 0 and n % (n - k) == 0                  # n-k is the smallest period
def repeated_substring_trick(s):
    return s in (s + s)[1:-1]                          # reappears in a shifted copy
```
Smallest period = `n - lps[n-1]`; `s` is a repetition iff that period divides `n`. For the
trick: `s+s` contains `s` at index 0 and at index `n`; stripping one char from each end
kills both, so any *other* occurrence means `s` equals a non-trivial rotation of itself —
i.e. `s` is periodic. **Time / Space:** O(n) / O(n) both. *Verified equivalent on all
`{a,b}` strings ≤ 14.*

**Longest Happy Prefix (1392)** — `s[:build_lps(s)[-1]]`. The definition *is* the answer.

**Longest Duplicate Substring (1044)** — binary search on the length + Rabin–Karp. The
predicate is monotone: a duplicate of length `L` implies one of length `L-1`.
```python
def longest_dup_substring(s):
    n, mod = len(s), (1 << 61) - 1
    base = random.randrange(256, mod)                  # randomised: defeats anti-hash tests
    nums = [ord(c) for c in s]
    def search(L):                                     # start of a duplicate of len L, else -1
        if L == 0: return 0
        h = 0
        for i in range(L): h = (h * base + nums[i]) % mod
        seen, high = {h: [0]}, pow(base, L, mod)       # hash -> starts (collision buckets)
        for i in range(1, n - L + 1):
            h = (h * base - nums[i - 1] * high + nums[i + L - 1]) % mod
            if h in seen:
                for j in seen[h]:
                    if s[j:j + L] == s[i:i + L]: return i   # verify, don't trust the hash
                seen[h].append(i)
            else: seen[h] = [i]
        return -1
    lo, hi, start, ln = 0, n - 1, -1, 0
    while lo <= hi:
        mid = (lo + hi) // 2; pos = search(mid)
        if pos != -1: start, ln, lo = pos, mid, mid + 1
        else: hi = mid - 1
    return s[start:start + ln] if start != -1 else ""
```
**Time / Space:** O(n log n) expected / O(n). *Verified vs brute force.*

**Mental trigger:** "find/count occurrences" → KMP or Z. "compare many substrings for
equality" → rolling hash. "longest X over substrings" → binary search on length + hash.

---

## 5. Parsing / tokenising

### Valid Number (LC 65) — explicit state machine
```python
def is_number(s):
    T = [{'sign': 1, 'digit': 2, 'dot': 4},   # 0 start
         {'digit': 2, 'dot': 4},              # 1 after sign
         {'digit': 2, 'dot': 3, 'exp': 6},    # 2 integer digits       (accept)
         {'digit': 5, 'exp': 6},              # 3 dot after digits     (accept)
         {'digit': 5},                        # 4 dot, no digits yet
         {'digit': 5, 'exp': 6},              # 5 fraction digits      (accept)
         {'sign': 7, 'digit': 8},             # 6 after e/E
         {'digit': 8},                        # 7 exponent sign
         {'digit': 8}]                        # 8 exponent digits      (accept)
    accepting, state = {2, 3, 5, 8}, 0
    for c in s:
        if   c.isdigit(): kind = 'digit'
        elif c in '+-':   kind = 'sign'
        elif c == '.':    kind = 'dot'
        elif c in 'eE':   kind = 'exp'
        else: return False
        if kind not in T[state]: return False
        state = T[state][kind]
    return state in accepting
```
**Time / Space:** O(n) / O(1). *Verified against
`re.fullmatch(r'[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?', s)` on 200k random strings.* The
table makes `"."`, `"4."`, `"-.9"`, `"e3"`, `"4e+"` fall out for free.

### Basic Calculator I / II / III
I and II are in `stacks.md` (stack + pending operator). III adds parentheses:
```python
def calculate(s):                                      # LC 772 — + - * / ( )
    def helper(it):
        st, num, op = [], 0, '+'
        for c in it:
            if c.isdigit(): num = num * 10 + int(c)
            elif c == '(': num = helper(it)            # recurse; iterator consumed in place
            if c in '+-*/)' or c == '#':
                if   op == '+': st.append(num)
                elif op == '-': st.append(-num)
                elif op == '*': st.append(st.pop() * num)
                else:           st.append(int(st.pop() / num))   # truncate toward zero
                num, op = 0, c
                if c == ')': break
        return sum(st)
    return helper(iter(s.replace(' ', '') + '#'))      # '#' flushes the last number
```
**Time / Space:** O(n) / O(depth). *Verified.* **Decode String (394)**: two stacks — see
`stacks.md` Pattern 4, **O(output) / O(depth)**.

### Simplify Path (71) / License Key (482) / Compare Version (165)
```python
def simplify_path(path):
    st = []
    for part in path.split('/'):
        if part in ('', '.'): continue                 # "//" gives '' ; "." is a no-op
        if part == '..':
            if st: st.pop()                            # only exactly ".."; "..." is a real dir
        else: st.append(part)
    return '/' + '/'.join(st)

def license_key_formatting(s, k):
    t = s.replace('-', '').upper()
    head = len(t) % k                                  # first group may be shorter
    parts = ([t[:head]] if head else []) + [t[i:i+k] for i in range(head, len(t), k)]
    return '-'.join(parts)

def compare_version(v1, v2):
    a, b = v1.split('.'), v2.split('.')
    for i in range(max(len(a), len(b))):
        x = int(a[i]) if i < len(a) else 0             # missing revisions are 0
        y = int(b[i]) if i < len(b) else 0             # int() kills leading zeros
        if x != y: return 1 if x > y else -1
    return 0
```
**Time / Space:** O(n) / O(n) each. *Verified.*

### String to Integer / atoi (LC 8)
```python
def my_atoi(s):
    i, n = 0, len(s)
    while i < n and s[i] == ' ': i += 1                # 1. leading spaces only
    sign = 1
    if i < n and s[i] in '+-':                         # 2. at most ONE sign
        sign = -1 if s[i] == '-' else 1; i += 1
    num = 0
    while i < n and s[i].isdigit():                    # 3. stop at first non-digit
        num = num * 10 + int(s[i]); i += 1
    return max(-2**31, min(sign * num, 2**31 - 1))     # 4. clamp, don't wrap
```
**Edge-case checklist:** empty / all spaces → 0; `"+-12"` → 0; `"  -042"` → -42;
`"words and 987"` → 0; `"3.14"` → 3; `"-91283472332"` → `-2**31`. Python bigints never
overflow so you clamp at the end; in C++/Java you must detect overflow *before* multiplying
(`num > (INT_MAX - d) // 10`). Say this out loud.
**Time / Space:** O(n) / O(1). *Verified on all LC edge cases.*

### Text Justification (LC 68) — a Google favourite
```python
def full_justify(words, maxWidth):
    res, line, length = [], [], 0        # line = words on current line; length = chars only
    for w in words:
        if length + len(line) + len(w) > maxWidth:     # +len(line) = one mandatory space each
            gaps = len(line) - 1
            if gaps == 0:                              # single word: left-justify, pad right
                res.append(line[0] + ' ' * (maxWidth - length))
            else:
                q, r = divmod(maxWidth - length, gaps) # q each; first r gaps get one extra
                res.append(''.join(line[i] + ' ' * (q + (i < r)) for i in range(gaps))
                           + line[-1])
            line, length = [], 0
        line.append(w); length += len(w)
    res.append(' '.join(line).ljust(maxWidth))         # last line: left-justified
    return res
```
**Time / Space:** O(total chars) / O(maxWidth) per line. *Verified on all three LC
examples.* Three traps: the `+ len(line)` space accounting; extra spaces go to the **left**
gaps (`i < r`); single-word lines and the last line are left-justified.

### Word Wrap (min raggedness) — the DP cousin
```python
def word_wrap(words, width):
    n, INF = len(words), float('inf')
    cost = [[INF] * (n + 1) for _ in range(n + 1)]
    for i in range(n):
        length = -1
        for j in range(i, n):
            length += len(words[j]) + 1
            if length > width: break
            cost[i][j + 1] = 0 if j == n - 1 else (width - length) ** 3   # last line free
    dp = [INF] * (n + 1); dp[0] = 0
    for j in range(1, n + 1):
        for i in range(j):
            if cost[i][j] < INF: dp[j] = min(dp[j], dp[i] + cost[i][j])
    return dp[n]
```
**Time / Space:** O(n^2) / O(n^2). Greedy (LC 68) ≠ optimal raggedness — that's the point.

### Reorder Log Files (LC 937) — sort-key design
```python
def reorder_log_files(logs):
    def key(log):
        ident, rest = log.split(" ", 1)                # split ONCE: identifier vs content
        return (0, rest, ident) if rest[0].isalpha() else (1,)
    return sorted(logs, key=key)                       # stable -> digit logs keep order
```
**Time / Space:** O(n·L log n) / O(n·L). *Verified.*

### Manual carry arithmetic
```python
def add_strings(a, b):                                 # LC 415
    i, j, carry, out = len(a) - 1, len(b) - 1, 0, []
    while i >= 0 or j >= 0 or carry:                   # `or carry` emits the final "1"
        t = carry + (int(a[i]) if i >= 0 else 0) + (int(b[j]) if j >= 0 else 0)
        out.append(str(t % 10)); carry = t // 10; i -= 1; j -= 1
    return ''.join(reversed(out))

def add_binary(a, b):                                  # LC 67 — same shape, base 2
    i, j, carry, out = len(a) - 1, len(b) - 1, 0, []
    while i >= 0 or j >= 0 or carry:
        t = carry + (int(a[i]) if i >= 0 else 0) + (int(b[j]) if j >= 0 else 0)
        out.append(str(t & 1)); carry = t >> 1; i -= 1; j -= 1
    return ''.join(reversed(out))

def multiply(a, b):                                    # LC 43 — schoolbook
    if a == "0" or b == "0": return "0"
    n, m = len(a), len(b)
    res = [0] * (n + m)                                # a[i]*b[j] lands in res[i+j], res[i+j+1]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            res[i + j + 1] += int(a[i]) * int(b[j])
    for k in range(n + m - 1, 0, -1):                  # one normalisation pass
        res[k - 1] += res[k] // 10; res[k] %= 10
    return ''.join(map(str, res)).lstrip('0') or "0"
```
**Time / Space:** add O(n+m) / O(n+m); multiply O(n·m) / O(n+m). *All verified.*

**Mental trigger:** "parse this grammar" → state machine or recursive descent. "nested
brackets" → stack. "column/width formatting" → greedy + careful padding.

---

## 6. Encode / decode & serialization

### Encode and Decode Strings (LC 271) — length prefix
```python
def encode(strs):
    return ''.join(f"{len(s)}#{s}" for s in strs)

def decode(s):
    res, i = [], 0
    while i < len(s):
        j = s.index('#', i)                            # first '#' after i ends the LENGTH
        n = int(s[i:j])
        res.append(s[j + 1:j + 1 + n])                 # then take exactly n chars, blindly
        i = j + 1 + n
    return res
```
**Time / Space:** O(total) / O(total). *Round-trip verified on `["3#x","#","12#"]`.*
**Why delimiters fail:** with `"|".join(strs)` any payload containing `|` breaks decoding —
`["a|b"]` and `["a","b"]` encode identically. Escaping works but is fiddly. Length
prefixing is **self-describing**: the count tells you how many bytes to consume, so the
payload may contain anything, including `#` and digits. Exactly how netstrings, Redis RESP
and HTTP `Content-Length` work — say that.

### Encode and Decode TinyURL (LC 535)
```python
class Codec:
    ALPHABET = string.ascii_letters + string.digits
    def __init__(self): self.l2s, self.s2l = {}, {}
    def encode(self, longUrl):
        if longUrl in self.l2s: return self.l2s[longUrl]        # idempotent
        while True:
            code = ''.join(random.choices(self.ALPHABET, k=6))  # 62^6 ~ 5.7e10 codes
            if code not in self.s2l: break                      # retry on collision
        self.l2s[longUrl] = code; self.s2l[code] = longUrl
        return "http://tinyurl.com/" + code
    def decode(self, shortUrl):
        return self.s2l[shortUrl.rsplit('/', 1)[-1]]
```
**Time / Space:** O(1) expected per op / O(n). Discussion: counter + base-62 (compact but
enumerable, leaks volume), random codes (unguessable, needs retry), hash of the URL
(deterministic, needs collision handling).

### String Compression in place (443), RLE, Count and Say (38)
```python
def compress(chars):                                   # LC 443 — O(1) extra space
    write = read = 0
    while read < len(chars):
        ch, run = chars[read], 0
        while read < len(chars) and chars[read] == ch: read += 1; run += 1
        chars[write] = ch; write += 1
        if run > 1:                                    # runs of 1 write NO digit
            for d in str(run):                         # multi-digit: 12 -> '1','2'
                chars[write] = d; write += 1
    return write                                       # write <= read always, so safe

def rle_encode(s):
    out, i = [], 0
    while i < len(s):
        j = i
        while j < len(s) and s[j] == s[i]: j += 1
        out.append(f"{j - i}{s[i]}"); i = j
    return ''.join(out)

def rle_decode(e):
    out, num = [], 0
    for c in e:
        if c.isdigit(): num = num * 10 + int(c)
        else: out.append(c * num); num = 0
    return ''.join(out)

def count_and_say(n):                                  # LC 38 = RLE of the previous term
    s = "1"
    for _ in range(n - 1): s = rle_encode(s)
    return s
```
**Time / Space:** compress O(n) / O(1); RLE O(n) / O(n); count-and-say O(n·L) / O(L) with L
growing ~1.3^n (Conway's constant). *All verified.* Caveat: RLE can *expand* input
(`"abc"` → `"1a1b1c"`) — real formats add an escape byte.

---

## 7. Subsequence & DP on strings

Edit Distance, LCS, Regex/Wildcard Matching, Interleaving String and Distinct Subsequences
all live in `dp.md`. Here: the greedy / precompute cases.

```python
def is_subsequence(s, t):                              # LC 392
    it = iter(t)
    return all(c in it for c in s)                     # `in` consumes the iterator forward
```
**Time / Space:** O(len(t)) / O(1).

**Follow-up — 10^9 queries against the same `t`.** Precompute each character's sorted
position list, then binary-search the next occurrence at or after the cursor.
```python
class SubseqChecker:
    def __init__(self, t):
        self.pos = defaultdict(list)
        for i, c in enumerate(t): self.pos[c].append(i)     # already increasing
    def check(self, s):
        cur = 0                                             # smallest usable index in t
        for c in s:
            lst = self.pos.get(c)
            if not lst: return False
            k = bisect.bisect_left(lst, cur)                # first occurrence >= cur
            if k == len(lst): return False
            cur = lst[k] + 1
        return True
```
**Time / Space:** build O(|t|) / O(|t|); query O(|s| log |t|). *Verified.* Alternative: a
`nxt[i][c]` table (`|t|×26`) gives O(|s|) per query with O(26·|t|) memory — the classic
time/space trade-off answer.

### Longest Common Prefix (LC 14) — four approaches
```python
def lcp_horizontal(strs):                              # shrink a running prefix
    p = strs[0]
    for s in strs[1:]:
        while not s.startswith(p): p = p[:-1]
        if not p: return ""
    return p

def lcp_vertical(strs):                                # column by column — best early exit
    for i in range(len(strs[0])):
        c = strs[0][i]
        for s in strs[1:]:
            if i == len(s) or s[i] != c: return strs[0][:i]
    return strs[0]

def lcp_minmax(strs):                                  # only the lexicographic extremes matter
    lo, hi = min(strs), max(strs)
    for i, c in enumerate(lo):
        if i == len(hi) or hi[i] != c: return lo[:i]
    return lo

def lcp_binary(strs):                                  # binary search on prefix length
    ok = lambda L: all(s.startswith(strs[0][:L]) for s in strs)
    lo, hi = 0, min(map(len, strs))
    while lo < hi:
        mid = (lo + hi + 1) // 2
        lo, hi = (mid, hi) if ok(mid) else (lo, mid - 1)
    return strs[0][:lo]
```
**Time / Space:** horizontal / vertical / min-max **O(S) / O(1)** (S = total chars); binary
**O(S log m) / O(1)**; a Trie is O(S) to build but only pays off for repeated queries
(`tries.md`). *All four verified to agree.*

### GCD of Strings (LC 1071) — Euclid on concatenations
A string `t` **divides** `s` if `s` is `t` repeated `k ≥ 1` times (`s = t * k`). The GCD
is the *longest* `x` that divides both inputs. This is the string analogue of
`gcd(a, b)`: lengths play the role of integers, and a block of text plays the role of a
prime-power factor.

**Theorem.** `str1` and `str2` have a common divisor string iff they **commute**:
`str1 + str2 == str2 + str1`. If they do, the longest such block is the prefix of length
`gcd(len(str1), len(str2))`. If they don't, the answer is `""`.

Why commute ⇒ same primitive root: if both are `x*k` and `x*m`, either concatenation is
just more copies of `x`, so they commute. Conversely, `s+t == t+s` is a classical
characterisation that `s` and `t` are powers of the same string (Fine–Wilf / Lyndon–
Schützenberger). Once that common root exists, any common divisor length must divide both
`n` and `m`, so the *longest* possible length is `gcd(n, m)` — and that prefix works.

**General solution — try every candidate length of the shorter string.**
```python
def gcd_of_strings_brute(str1, str2):
    if len(str1) > len(str2):
        str1, str2 = str2, str1                        # str1 is the shorter
    for L in range(len(str1), 0, -1):
        if len(str1) % L or len(str2) % L: continue    # length must divide both
        x = str1[:L]
        if x * (len(str1) // L) == str1 and x * (len(str2) // L) == str2:
            return x
    return ""
```
**Time / Space:** O(min(n, m) · (n + m)) / O(n + m) because of the concatenations. Fine as
a first write; too slow to be the intended answer.

**Optimal — one commutativity check, then Euclid on the lengths.**
```python
from math import gcd

def gcd_of_strings(str1, str2):                        # LC 1071
    if str1 + str2 != str2 + str1:                     # no common tile at all
        return ""
    return str1[:gcd(len(str1), len(str2))]            # longest tile length
```
The Euclidean *process* is also valid and makes the integer analogy obvious:
`gcd(s, t) = gcd(t, s[len(t):])` when `s` starts with `t` (the remainder is the leftover
suffix), else `""`. Swap so the longer string is on the left, just like integer Euclid.
An **empty remainder** means `t` tiles `s` exactly, so return `t` — the same
`gcd(a, 0) = a` step. That is not an empty **input**: LC 1071 guarantees
`1 <= len(str1), len(str2)`.
```python
def gcd_of_strings_euclid(s, t):                       # non-empty inputs (LC 1071)
    if len(s) < len(t):
        s, t = t, s
    if not t:
        return s                                       # empty remainder → exact divide
    if not s.startswith(t):
        return ""
    return gcd_of_strings_euclid(t, s[len(t):])        # gcd(t, s - t)
```
In practice write the `math.gcd` one-liner; mention Euclid if they ask "why gcd of
lengths?".

**Worked examples.**
- `"ABCABC"`, `"ABC"` → commute, `gcd(6, 3) = 3` → `"ABC"`.
- `"ABABAB"`, `"ABAB"` → commute, `gcd(6, 4) = 2` → `"AB"` (not `"ABAB"`: 4 doesn't divide 6).
- `"LEET"`, `"CODE"` → `"LEETCODE" != "CODELEET"` → `""`.
- `"AAAA"`, `"AA"` → `"AA"`. The primitive root is `"A"`, but GCD asks for the *longest*
  divisor, so length `gcd(4, 2) = 2`.

**Related easy problems that share the same periodicity lemma** (also §4):
- Repeated Substring Pattern (459) — `s` is `x*k` for `k ≥ 2` iff `s in (s+s)[1:-1]`,
  equivalently `n % (n - lps[-1]) == 0` and `lps[-1] > 0`.
- Find the Index of the First Occurrence (28) is *search*; 1071 / 459 are *structure*.

**Time / Space:** O(n + m) / O(n + m) for the concatenations (or O(min) extra if you
compare with two pointers instead of allocating `s+t`). *Verified vs brute force on all
non-empty `{A,B}` pairs with n, m ≤ 6.*

**Mental trigger:** "largest block that tiles both strings" / "common divisor of strings"
→ check `s+t == t+s`, then `s[:gcd(n, m)]`. Do **not** sort, do **not** LCP — LCP of
`"ABAB"` and `"AB"` is `"AB"`, which happens to be right, but LCP of `"ABCABC"` and
`"ABCAB"` is `"ABCAB"`, which does **not** divide either.

### Longest Word in Dictionary through Deleting (LC 524)
```python
def find_longest_word(s, dictionary):
    best = ""
    for w in dictionary:
        if (len(w) > len(best) or (len(w) == len(best) and w < best)) \
                and is_subsequence(w, s):              # cheap checks first
            best = w
    return best
```
**Time / Space:** O(n·|s|) / O(1). Tie-break: lexicographically smallest.

**Mental trigger:** "is A a subsequence of B" → two pointers; "many such queries" →
next-occurrence table; "edit / transform / interleave" → `dp.md`.

---

## 8. Suffix structures

### Suffix array — O(n log^2 n) prefix doubling
Round `k` knows ranks by `2^k` characters; the pair `(rank[i], rank[i+2^k])` orders by
`2^(k+1)` characters.
```python
def suffix_array(s):
    n = len(s); sa = list(range(n))
    rank = [ord(c) for c in s]                         # round 0: rank by first char
    tmp = [0] * n; k = 1
    while True:
        key = lambda i: (rank[i], rank[i + k] if i + k < n else -1)  # -1 = shorter, sorts first
        sa.sort(key=key)
        tmp[sa[0]] = 0
        for i in range(1, n):
            tmp[sa[i]] = tmp[sa[i-1]] + (key(sa[i-1]) < key(sa[i]))  # ties share a rank
        rank[:] = tmp
        if rank[sa[-1]] == n - 1: break                # all ranks distinct -> sorted
        k <<= 1
    return sa
```
**Time / Space:** O(n log^2 n) / O(n) — radix sort per round gives O(n log n), SA-IS gives
O(n). *Verified against `sorted(range(n), key=lambda i: s[i:])`.*

### LCP array via Kasai — O(n)
`lcp[i]` = LCP of `suffix(sa[i-1])` and `suffix(sa[i])`. Kasai walks the string in
*original* order: if suffix `i` shares `h` characters with its neighbour, suffix `i+1`
shares at least `h-1`, so `h` drops by at most 1 per step → O(n) total.
```python
def kasai(s, sa):
    n = len(s); rank = [0] * n
    for i, p in enumerate(sa): rank[p] = i
    lcp = [0] * n; h = 0
    for i in range(n):
        if rank[i] > 0:
            j = sa[rank[i] - 1]
            while i + h < n and j + h < n and s[i + h] == s[j + h]: h += 1
            lcp[rank[i]] = h
            if h: h -= 1                               # amortisation: lose at most 1 per step
        else: h = 0
    return lcp
```
**Time / Space:** O(n) / O(n). *Verified.*

### Applications
```python
def longest_repeated_substring(s):                     # the max LCP entry IS the answer
    if not s: return ""
    sa = suffix_array(s); lcp = kasai(s, sa)
    b = max(range(len(s)), key=lambda i: lcp[i])
    return s[sa[b]:sa[b] + lcp[b]]

def longest_common_substring(a, b):                    # two distinct sentinels
    s = a + '\x01' + b + '\x02'
    sa, na = suffix_array(s), len(a)
    lcp = kasai(s, sa); best = ""
    for i in range(1, len(s)):
        p, q = sa[i - 1], sa[i]
        if (p < na) != (q < na) and lcp[i] > len(best):   # adjacent, from DIFFERENT strings
            best = s[q:q + lcp[i]]
    return best
```
**Time / Space:** O(n log^2 n) / O(n). *Both verified vs brute force* (LRS allows
overlapping occurrences). The DP version of longest common substring is O(n·m) time and
space — better for small inputs, worse for huge ones.

**Suffix automaton / suffix tree — mention only.** The automaton is the minimal DFA
accepting all suffixes: O(n) states, O(n) construction, answers "count distinct
substrings", "occurrence count" and "longest common substring" in linear time; Ukkonen's
suffix tree is equivalent. Nobody expects these in 45 minutes — name-drop them as the
asymptotically best tool and offer suffix array + LCP (or hashing) as the implementable one.

**Trie instead?** Suffix array = one long text, offline, *substring* queries. Trie = a **set
of words**, *prefix* queries, autocomplete, grid word search, XOR tricks (`tries.md`).
Input `List[str]` + "prefix" → Trie. One string + "substring" → suffix array / hashing / KMP.

**Mental trigger:** "longest repeated / distinct substrings of ONE string" → suffix array +
LCP, or rolling hash + binary search (easier to write).

---

## 9. Sorting & comparators on strings

```python
def largest_number(nums):                              # LC 179
    strs = list(map(str, nums))
    strs.sort(key=functools.cmp_to_key(                # a before b iff a+b > b+a
        lambda a, b: (a + b < b + a) - (a + b > b + a)))
    return "0" if strs[0] == "0" else ''.join(strs)    # all zeros -> "0", not "000"

def custom_sort_string(order, s):                      # LC 791
    rank = {c: i for i, c in enumerate(order)}
    return ''.join(sorted(s, key=lambda c: rank.get(c, len(order))))   # unknown chars last

def is_alien_sorted(words, order):                     # LC 953
    rank = {c: i for i, c in enumerate(order)}
    key = lambda w: [rank[c] for c in w]               # list compare == lexicographic
    return all(key(words[i]) <= key(words[i + 1]) for i in range(len(words) - 1))

def frequency_sort(s):                                 # LC 451
    return ''.join(c * n for c, n in Counter(s).most_common())
```
**Time / Space:** largest number O(n log n · L) / O(n·L); custom sort O(n log n) / O(n)
(counting sort → O(n+26)); alien sorted O(total) / O(total); frequency sort O(n + k log k) /
O(n) (bucket sort → O(n)). *All verified.*

The `a+b > b+a` relation is a valid total order (transitive — worth stating). Python 3 has
no `cmp=`; `functools.cmp_to_key` is the bridge — know its name. Mapping to a list of ranks
gets the prefix rule right for free: `["apple","app"]` is **not** sorted. The harder sibling
**Alien Dictionary (269)** *derives* the order — topological sort on the first differing
character of adjacent words, returning `""` when a word precedes its own prefix.

**Mental trigger:** "order defined by the problem, not by ASCII" → build a `rank` dict or a
`cmp_to_key` comparator; never hand-roll a sort.

---

## 10. Bit tricks on strings

```python
def max_product(words):                                # LC 318 — 26-bit letter SET
    masks = [functools.reduce(lambda m, c: m | 1 << (ord(c) - 97), w, 0) for w in words]
    return max((len(words[i]) * len(words[j])
                for i in range(len(words)) for j in range(i + 1, len(words))
                if masks[i] & masks[j] == 0), default=0)   # disjoint letters in O(1)

def wonderful_substrings(word):                        # LC 1915 — prefix parity mask
    cnt = [0] * 1024; cnt[0] = 1                       # 'a'..'j' -> 2^10 parity states
    mask = res = 0
    for c in word:
        mask ^= 1 << (ord(c) - 97)
        res += cnt[mask]                               # all letters even
        for i in range(10): res += cnt[mask ^ (1 << i)]   # exactly one letter odd
        cnt[mask] += 1
    return res

def find_the_difference(s, t):                         # LC 389
    x = 0
    for c in s + t: x ^= ord(c)                        # pairs cancel; the extra survives
    return chr(x)
```
**Time / Space:** LC 318 O(total + n^2) / O(n); LC 1915 O(10n) / O(1024); LC 389 O(n) /
O(1). *All verified.* A substring has ≤1 odd-count letter iff the XOR of its two prefix
parity masks has ≤1 set bit — the same skeleton as "subarrays with XOR = k" in
`subarrays.md`.

**Mental trigger:** "letters present/absent" or "parity of counts" → 26-bit mask; "exactly
one extra/missing" → XOR.

---

## 11. Common pitfalls

1. **`s += c` in a loop** → O(n^2). Build a list, `"".join` once.
2. **Slicing inside a loop** — `s[i:i+m]` copies m chars every iteration. Use
   `s.startswith(p, i)`, index comparison, or a rolling hash.
3. **Assuming ASCII / `[0]*26`** on Unicode input; also `len(s)` counts code points, not
   glyphs. Ask, then fall back to a dict.
4. **Off-by-one on `range(len(s) - len(p) + 1)`** — the `+1` is the last valid start. Drop
   it and you miss a match at the very end.
5. **`is` vs `==`** — `"ab" is "ab"` may be `True` via interning and `False` for
   runtime-built strings. Compare with `==`, always.
6. **Mutating a string** — `s[0] = 'x'` raises `TypeError`; convert to a list.
7. **Forgetting case-insensitivity / normalisation** — palindrome and anagram problems
   usually mean `.lower()`, sometimes plus stripping non-alphanumerics.
8. **Whitespace / empty-string edges** — `"".split()` is `[]` but `"".split(' ')` is `['']`;
   `s[0]` crashes on `""`. Test `""`, `" "` and a single char on every problem.
9. **`int()` overflow rules in atoi** — Python won't overflow, so you must *explicitly*
   clamp to `[-2^31, 2^31-1]`; in C++/Java check *before* multiplying.
10. **Trusting a Rabin–Karp hash** — verify the substring on a hit or use double hashing;
    randomise the base against adversarial input.
11. **`Counter(window) == Counter(pattern)` in a loop** — equality is O(distinct keys), so
    an "O(n)" window is really O(n·k). Maintain a `matched` counter for true O(1).
12. **Overlapping vs non-overlapping** — `s.count(sub)` counts **non-overlapping**
    (`"aaa".count("aa") == 1`); KMP with `k = lps[k-1]` counts overlapping ones.

---

## 12. Cheat sheets

| Operation / algorithm | Time | Space |
|---|---|---|
| `s[i]`, `len(s)`, `ord`, `chr` | O(1) | O(1) |
| `s[i:j]` slice | O(j-i) | O(j-i) |
| `a + b`, one `s += c` | O(n+m) | O(n+m) |
| `"".join(parts)` | O(total) | O(total) |
| `p in s`, `s.find(p)` | ~O(n+m) practical | O(1) |
| `sorted(s)` | O(n log n) | O(n) |
| `Counter(s)` / `Counter == Counter` | O(n) / O(k) | O(k) |
| Naive search | O(n·m) | O(1) |
| KMP build + search | O(n+m) | O(m) |
| Z-algorithm | O(n) | O(n) |
| Rabin–Karp | O(n+m) expected | O(1) |
| Longest duplicate substring (BS + RK) | O(n log n) | O(n) |
| Expand-around-centre | O(n²) | O(1) |
| Manacher | O(n) | O(n) |
| Palindrome partition table | O(n²) | O(n²) |
| Suffix array (doubling) | O(n log²n) | O(n) |
| Kasai LCP | O(n) | O(n) |
| Trie build / lookup | O(total) / O(len) | O(total·Σ) |
| Edit distance / LCS DP | O(n·m) | O(min(n,m)) rolled |
| GCD of strings (Euclid) | O(n+m) | O(n+m) |

| The interviewer says… | Reach for |
|---|---|
| "anagram", "permutation of", "rearrange to" | Counter / 26-array |
| "substring of length k", "at most k distinct" | sliding window (`sliding_window.md`) |
| "longest substring without repeating" | window + last-seen map |
| "smallest window containing" | window + need/have counts |
| "palindrome" + substring | expand around centre → Manacher |
| "palindrome" + prefix/suffix | KMP failure function |
| "find/count all occurrences of a pattern" | KMP or Z (`str.find` in practice) |
| "compare many substrings", "duplicate substring" | rolling hash (+ binary search) |
| "longest X such that P(X)" over lengths | binary search on the answer |
| "prefix", "autocomplete", "dictionary of words" | Trie (`tries.md`) |
| "longest repeated / distinct substrings" | suffix array + LCP |
| "valid", "balanced", "nested", "evaluate" | stack (`stacks.md`) |
| "parse", "tokenise", "is this a valid number" | state machine / recursive descent |
| "edit / transform / interleave / match `*`" | DP (`dp.md`) |
| "custom order", "alien alphabet" | rank dict / `cmp_to_key` / topological sort |
| "letters present", "parity of counts" | 26-bit mask |
| "common divisor string", "tile / repeat the same block" | `s+t==t+s` then `s[:gcd(n,m)]` |
| "serialize / round-trip" | length-prefix protocol |
| "in place", "O(1) extra space" | list of chars + two pointers / write index |

---

## 13. Google-favourite problem list

**Basic — should be automatic**
1. Valid Anagram (242) — Counter or 26-array.
2. Valid Palindrome (125) — two pointers + `isalnum` filtering.
3. Reverse String (344) — in-place two pointers on a list.
4. Longest Common Prefix (14) — vertical scan; know all four approaches.
5. Implement strStr (28) — `find` in practice, KMP if asked.
6. Ransom Note (383) — Counter subtraction.
7. First Unique Character (387) — count, then rescan in order.
8. Add Strings (415) / Add Binary (67) — manual carry; `or carry` in the loop.
9. Isomorphic Strings (205) — two maps (bijection).
10. Word Pattern (290) — two maps; one accepts `"abba"`/`"dog dog dog dog"`.
11. Detect Capital (520) — three legal shapes.
12. License Key Formatting (482) — the first group is the remainder.
13. Reorder Log Files (937) — tuple sort key; stability matters.
14. Compare Version Numbers (165) — pad missing revisions with 0.
15. Bulls and Cows (299) — bulls by position, cows via `Counter & Counter`.
16. Zigzag Conversion (6) — row buckets with a bouncing direction.
17. String Compression (443) — in-place write pointer; multi-digit runs.
18. Count and Say (38) — run-length encode the previous term.
18a. Greatest Common Divisor of Strings (1071) — commute test + prefix of length `gcd`.

**Core — the everyday Google set**
19. Group Anagrams (49) — sorted key vs count-tuple key; compare complexities.
20. Longest Substring Without Repeating Characters (3) — window + last-seen index.
21. Find All Anagrams in a String (438) — fixed window over counts.
22. Longest Palindromic Substring (5) — expand around centre; Manacher as follow-up.
23. Palindromic Substrings (647) — same expansion, count instead of max.
24. Valid Palindrome II (680) — one deletion, two branches at the first mismatch.
25. Longest Repeating Character Replacement (424) — window + max-count.
26. Group Shifted Strings (249) — key = tuple of `(ord(c) - ord(s[0])) % 26`.
27. Custom Sort String (791) / Verifying an Alien Dictionary (953) — rank dict.
28. Sort Characters By Frequency (451) — `most_common` or bucket sort.
29. Largest Number (179) — `cmp_to_key` with `a+b` vs `b+a`.
30. Encode and Decode Strings (271) — length prefix; explain why delimiters fail.
31. Encode and Decode TinyURL (535) — random base-62 code + two maps.
32. Simplify Path (71) — stack over `split('/')`; `"..."` is a real directory name.
33. Decode String (394) — two stacks (`stacks.md`).
34. Basic Calculator I / II (224 / 227) — stack + pending operator.
35. String to Integer / atoi (8) — recite the edge-case checklist.
36. Multiply Strings (43) — schoolbook into an `n+m` digit array.
37. Is Subsequence (392) — two pointers; follow-up = next-occurrence table.
38. Longest Word in Dictionary through Deleting (524) — subsequence + tie-break.
39. Valid Word Abbreviation (408) — two pointers; reject a leading `'0'`.
40. Generalized Abbreviation (320) — backtracking, keep/abbreviate per char.
41. Unique Word Abbreviation (288) — map abbr → set of words; unique iff ≤1.
42. Read N Characters Given Read4 I / II (157 / 158) — II needs a persistent leftover
    buffer between calls; that's the entire point of the problem.
43. Repeated Substring Pattern (459) — `lps[-1]` period test or `(s+s)[1:-1]`.
44. Repeated String Match (686) — `ceil(m/n)` copies, then try one more.
45. Strobogrammatic Number I / II / III (246 / 247 / 248) — pair map; II builds outward-in
    and must skip a leading `'0'` at the top level; III counts within a range.
46. Word Break (139) — DP over prefixes; the classic string-DP entry point.

**Hard — Google's favourites**
47. Minimum Window Substring (76) — window + need/have counters. Top-5 asked.
48. Substring with Concatenation of All Words (30) — window over word-sized blocks, one
    pass per offset in `[0, wordLen)`.
49. Text Justification (68) — greedy pack + left-biased space distribution.
50. Word Break II (140) — backtracking + memo; return all sentences.
51. Word Ladder (127) — BFS over wildcard buckets, not over the whole dictionary.
52. Alien Dictionary (269) — topological sort on first differing chars; detect the invalid
    "longer word before its own prefix" case.
53. Shortest Palindrome (214) — KMP on `s + '#' + reversed(s)`.
54. Longest Duplicate Substring (1044) — binary search + Rabin–Karp, randomised base.
55. Palindrome Pairs (336) — Trie of reversed words + palindromic-remainder check.
56. Regular Expression Matching (10) / Wildcard Matching (44) — DP (`dp.md`).
57. Edit Distance (72) — the canonical 2-D string DP.
58. Interleaving String (97) — 2-D DP over two prefixes.
59. Distinct Subsequences (115) — count DP; the "don't take" branch always carries.
60. Integer to English Words (273) — chunk into groups of three; the hardest *easy* problem
    (zero, teens, spacing).
61. Basic Calculator III (772) — recursion for `()` plus precedence for `*` `/`.
62. Expression Add Operators (282) — backtracking; carry `prev` to undo `*` precedence and
    forbid leading-zero numbers.
63. Remove Invalid Parentheses (301) — BFS by removal count, or count-then-DFS.
64. Number of Wonderful Substrings (1915) — prefix parity bitmask.
65. Maximum Product of Word Lengths (318) — 26-bit letter masks.

---

## 14. Quiz

**Q1.** Why is `out += c` inside a loop dangerous even though it "works"?
<details><summary>Answer</summary>
Strings are immutable, so each `+=` allocates a new string and copies the old contents —
`1+2+…+n = O(n²)` character copies. CPython has an in-place optimisation when the target's
refcount is 1, which hides the problem on small inputs and vanishes the moment another
reference exists. Use a list plus `"".join(...)`: O(n).
</details>

**Q2.** `pattern="abba"`, `s="dog dog dog dog"`. What does a single `char -> word` map
return, and why is that wrong?
<details><summary>Answer</summary>
`True` — `a -> dog` and `b -> dog` are each internally consistent. The problem wants a
**bijection**, so you also need injectivity: a second `word -> char` map rejects `dog` being
claimed by both `a` and `b`. Same reason Isomorphic Strings needs two maps (`"ab"` vs
`"aa"`).
</details>

**Q3.** In Manacher, why `p[i] = min(r - i, p[2*c - i])` instead of just `p[2*c - i]`?
<details><summary>Answer</summary>
The mirror's palindrome is only guaranteed to be reflected *inside* the current palindrome.
If the mirror's radius would push past the boundary `r`, the characters beyond `r` have
never been compared, so we can only trust `r - i` and must verify the rest by explicit
expansion. Clipping preserves the invariant "everything counted has been verified", and the
extra expansions only ever push `r` right — which is what makes the total O(n).
</details>

**Q4.** For `p = "aabaaac"`, what is the LPS array and what does `lps[5]` mean?
<details><summary>Answer</summary>
`[0, 1, 0, 1, 2, 2, 0]`. `lps[5] = 2` means `p[0..5] = "aabaaa"` has a longest proper prefix
that is also a suffix of length 2, namely `"aa"`. After matching 6 characters and
mismatching, we retry with `k = 2` instead of restarting at 0 — and the text pointer never
moves backwards.
</details>

**Q5.** Why is KMP's inner `while k > 0: k = lps[k-1]` loop not O(n·m)?
<details><summary>Answer</summary>
Amortisation on `k`. Each outer iteration increases `k` by at most 1, and each inner
iteration strictly decreases it while keeping `k >= 0`. Total decrements ≤ total increments
≤ n, so all inner iterations across the entire scan sum to ≤ n. Overall O(n+m).
</details>

**Q6.** Rabin–Karp reports a match at index `i`. Are you done?
<details><summary>Answer</summary>
No — equal hashes do not imply equal strings. Either verify with `s.startswith(p, i)` (O(m)
only on hits, cheap when matches are rare) or use double hashing with two independent
(base, mod) pairs. Also use a large prime modulus and a **randomly chosen** base, since
fixed bases can be defeated by adversarial input.
</details>

**Q7.** Why does a length prefix (`"5#hello"`) beat a delimiter like `"|"` for Encode/Decode
Strings?
<details><summary>Answer</summary>
A delimiter is ambiguous the moment the payload contains it — `["a|b"]` and `["a","b"]`
encode identically. Length prefixing is self-describing: read digits up to the first `#`,
then consume exactly that many characters *blindly*, so the payload may contain any
character including `#` and digits. It's how netstrings, Redis RESP and HTTP
`Content-Length` work.
</details>

**Q8.** You slide a window and compare `Counter(window) == Counter(pattern)` each step.
What's the real complexity, and how do you fix it?
<details><summary>Answer</summary>
`Counter.__eq__` compares all distinct keys, so it's O(k) per step → O(n·k) overall (for
lowercase, comparing two 26-lists is O(26), "constant", but a large alphabet hurts). Fix:
maintain a `matched` integer counting how many characters currently hit their exact required
count, updating it only when a count crosses the target as you add or remove one character.
The check becomes `matched == len(need)` — a true O(1).
</details>

**Q9.** `gcdOfStrings("ABABAB", "ABAB")`. Why is the answer `"AB"` and not `"ABAB"`? What
single check tells you `"LEET"` and `"CODE"` have no common divisor?
<details><summary>Answer</summary>
A divisor's length must divide *both* lengths. `gcd(6, 4) = 2`, so the longest legal tile
is length 2: `"AB"`. `"ABAB"` has length 4, which does not divide 6. `"LEET"` and `"CODE"`
fail the commutativity test: `"LEETCODE" != "CODELEET"`, so the answer is `""` with no
further work. LCP would have returned `"LEET"`/`""` incorrectly depending on order — LCP
is the wrong primitive.
</details>

---

## 15. Mini project — a log search tool (KMP + rolling hash)

Parse structured log lines (§5), answer literal-substring queries with KMP (§4), and find
near-duplicate messages with k-gram rolling-hash fingerprints (§4).

```python
import re
from collections import defaultdict

LOG_RE = re.compile(r'^(?P<ts>\S+)\s+(?P<level>[A-Z]+)\s+(?P<svc>[\w.-]+):\s*(?P<msg>.*)$')

class LogIndex:
    MOD, BASE = (1 << 61) - 1, 1_000_003

    def __init__(self):
        self.lines = []                       # list[dict]
        self.by_level = defaultdict(list)     # level -> row ids

    # --- 1. parsing (section 5) ---
    def add(self, raw):
        m = LOG_RE.match(raw.rstrip('\n'))
        if not m: return False                # malformed lines are skipped, not fatal
        row = m.groupdict(); row['raw'] = raw
        self.lines.append(row)
        self.by_level[row['level']].append(len(self.lines) - 1)
        return True

    # --- 2. literal search with KMP (section 4) ---
    @staticmethod
    def _lps(p):
        lps = [0] * len(p); k = 0
        for i in range(1, len(p)):
            while k > 0 and p[i] != p[k]: k = lps[k - 1]
            if p[i] == p[k]: k += 1
            lps[i] = k
        return lps

    @classmethod
    def _find_all(cls, text, pat):
        if not pat: return []
        lps, out, k = cls._lps(pat), [], 0
        for i, c in enumerate(text):
            while k > 0 and c != pat[k]: k = lps[k - 1]
            if c == pat[k]: k += 1
            if k == len(pat): out.append(i - k + 1); k = lps[k - 1]
        return out

    def search(self, pattern, level=None):
        """-> [(row_id, [offsets in msg])]; one LPS build reused across all lines."""
        ids = self.by_level[level] if level else range(len(self.lines))
        return [(i, hits) for i in ids
                if (hits := self._find_all(self.lines[i]['msg'], pattern))]

    # --- 3. near-duplicate detection with a rolling hash (section 4) ---
    def fingerprints(self, row_id, k=16):
        """Hashes of every length-k window, in O(len) via prefix hashes."""
        s = self.lines[row_id]['msg']
        if len(s) < k: return set()
        h, p = [0] * (len(s) + 1), [1] * (len(s) + 1)
        for i, c in enumerate(s):
            h[i + 1] = (h[i] * self.BASE + ord(c)) % self.MOD
            p[i + 1] = (p[i] * self.BASE) % self.MOD
        return {(h[i + k] - h[i] * p[k]) % self.MOD for i in range(len(s) - k + 1)}

    def similar(self, row_id, k=16, threshold=0.5):
        """Jaccard similarity over k-gram fingerprints — a mini MinHash."""
        base = self.fingerprints(row_id, k)
        if not base: return []
        out = []
        for j in range(len(self.lines)):
            if j == row_id: continue
            other = self.fingerprints(j, k)
            if not other: continue
            score = len(base & other) / len(base | other)
            if score >= threshold: out.append((j, round(score, 3)))
        return sorted(out, key=lambda t: -t[1])


if __name__ == "__main__":
    idx = LogIndex()
    for line in [
        "2026-08-31T10:00:01Z INFO  auth.service: user alice logged in from 10.0.0.1",
        "2026-08-31T10:00:04Z ERROR auth.service: user bob login failed: bad password",
        "2026-08-31T10:00:09Z ERROR auth.service: user carol login failed: bad password",
        "2026-08-31T10:01:00Z INFO  cart.service: checkout started for order 42",
        "!! not a log line !!",
    ]:
        idx.add(line)
    print(idx.search("login failed", level="ERROR"))   # [(1, [9]), (2, [11])]
    print(idx.similar(1, k=12, threshold=0.4))         # [(2, 0.471)] -> near duplicate
```
**Time / Space:** `add` O(len) / O(len); `search` O(m + total text) / O(m); `fingerprints`
O(len) / O(len); `similar` O(n·len) / O(len).

**Extensions (each maps to a section above):**
- Swap KMP for the Z-algorithm and assert identical offsets (§4).
- Add `search_prefix` backed by a Trie over service names (`tries.md`).
- Add `top_k_templates` with `Counter.most_common` after normalising digits to `#` (§2) —
  that's real-world log templating.
- Pretty-print results with Text Justification (§5).
- Replace the O(n²) `similar` scan with an inverted index from fingerprint → row ids.
