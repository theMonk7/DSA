# Stacks — Patterns & Problems

> Google DSA prep notes. Category: Stacks (general toolkit).
> Companion to `monotonic_stack.md` (which covers the next-greater/smaller
> specialization in depth). This note covers the *other* five stack patterns.

## 1. What a stack is

LIFO container. Three `O(1)` ops: `push`, `pop`, `peek`.
In Python: `list.append` = push, `list.pop()` = pop, `lst[-1]` = peek.
(Use `collections.deque` to avoid an accidental `pop(0)`.)

**Mental trigger:** a stack is the structure for *"the most recent unmatched /
unresolved thing."* Nesting, pairing, or "undo the last action" → reach for a stack,
because the item you need next is always the most recent one you haven't dealt with.

---

## 2. The six core patterns

### Pattern 1 — Matching / balancing pairs
Push openers, pop on a matching closer. Mismatch or leftovers → invalid.

```python
def is_valid(s: str) -> bool:
    pairs = {')': '(', ']': '[', '}': '{'}
    st = []
    for c in s:
        if c in pairs:                       # a closer
            if not st or st.pop() != pairs[c]:
                return False
        else:                                # an opener
            st.append(c)
    return not st                            # leftover openers = invalid
```
Use-cases: valid parentheses, balanced tags, min add to make valid.
Key idea: stack holds *unmatched openers*; a closer needs only the most recent one.

### Pattern 2 — Undo / process-against-the-top (collapse & simplify)
Compare each incoming element to the top; the top can cancel, merge, or block it.

```python
def remove_adjacent_dupes(s: str) -> str:
    st = []
    for c in s:
        if st and st[-1] == c:     # cancels the top
            st.pop()
        else:
            st.append(c)
    return "".join(st)
```
Use-cases: Remove Adjacent Duplicates (1047), Backspace Compare (844, `#` pops),
Make String Great, Asteroid Collision (735).

```python
def asteroid_collision(asteroids):
    st = []
    for a in asteroids:
        alive = True
        while alive and a < 0 and st and st[-1] > 0:   # right-mover meets left-mover
            if st[-1] < -a:        # top explodes, keep fighting
                st.pop()
                continue
            elif st[-1] == -a:     # both explode
                st.pop()
            alive = False          # incoming dies (or tied)
        if alive:
            st.append(a)
    return st
```

### Pattern 3 — Expression evaluation (RPN / postfix)
Push operands; on an operator pop the last two, compute, push result.

```python
def eval_rpn(tokens):
    st = []; ops = {'+', '-', '*', '/'}
    for t in tokens:
        if t in ops:
            b = st.pop(); a = st.pop()
            if   t == '+': st.append(a + b)
            elif t == '-': st.append(a - b)
            elif t == '*': st.append(a * b)
            else:          st.append(int(a / b))   # truncate toward zero
        else:
            st.append(int(t))
    return st[0]
```
Use-cases: Eval RPN (150), Basic Calculator I/II/III (224/227/772), shunting-yard.
Order matters for `-` and `/`: `a` (first operand) is popped **second**.

### Pattern 4 — Nested structures / decode
Stack saves the "outer context" when descending into a nesting, restores on exit.

```python
def decode_string(s: str) -> str:            # "3[a2[c]]" -> "accaccacc"
    num_st, str_st = [], []
    cur, k = "", 0
    for c in s:
        if c.isdigit():
            k = k * 10 + int(c)
        elif c == '[':
            num_st.append(k); str_st.append(cur)
            cur, k = "", 0
        elif c == ']':
            cur = str_st.pop() + cur * num_st.pop()
        else:
            cur += c
    return cur
```
Use-cases: Decode String (394), Number of Atoms (726), Flatten Nested List (341).

### Pattern 5 — Simulating recursion / iterative DFS
Any recursion is a stack; make it explicit to control depth / avoid overflow.

```python
def inorder(root):
    res, st, cur = [], [], root
    while cur or st:
        while cur:                 # go as left as possible
            st.append(cur)
            cur = cur.left
        cur = st.pop()             # backtrack to deepest unvisited
        res.append(cur.val)
        cur = cur.right
    return res
```
Use-cases: iterative traversals (94/144/145), graph DFS, backtracking.

### Pattern 6 — Monotonic stack
Keep the stack sorted; pop elements the newcomer beats. Full treatment in
`monotonic_stack.md` (four variants, cheat sheet, histogram/rain-water/spans).

```python
def daily_temperatures(temps):
    res = [0] * len(temps); st = []      # indices, decreasing temperature
    for i, t in enumerate(temps):
        while st and temps[st[-1]] < t:
            j = st.pop(); res[j] = i - j # distance to warmer day
        st.append(i)
    return res
```

---

## 3. Pattern-recognition table

| Signal | Pattern | Example |
|---|---|---|
| brackets, tags, "balanced/valid" | 1 Matching | Valid Parentheses |
| adjacent items cancel/merge, backspace, collisions | 2 Undo/collapse | Asteroid Collision |
| postfix/infix, evaluate, calculator | 3 Expression | Eval RPN |
| `k[ ... ]`, nested repeats/containers | 4 Nested/decode | Decode String |
| tree/graph traversal without recursion | 5 Iterative DFS | Inorder |
| next greater/smaller, warmer, spans, histogram | 6 Monotonic | Daily Temperatures |

---

## 4. Complexity & pitfalls
- Time: usually `O(n)` — each element pushed once, popped ≤ once (amortized `O(1)`),
  even with an inner `while`.
- Space: `O(n)` worst case.
- Pitfalls:
  1. Popping an empty stack — guard `if st and ...`.
  2. RPN operand order: `a = pop()` is the *second* operand; matters for `-` `/`.
  3. Leftover entries — decide their meaning (invalid? `-1`? part of answer?).
  4. `list.pop(0)` is `O(n)` — never pop from the front; use `deque` for a queue.
  5. Monotonic strict vs non-strict (`<` vs `<=`) with duplicates — #1 bug.

---

## 5. Mini-project: Basic Calculator II (precedence via a stack)

```python
def calculate(s: str) -> int:
    st = []; num = 0; op = '+'            # op precedes the current number
    for i, c in enumerate(s):
        if c.isdigit():
            num = num * 10 + int(c)
        if (not c.isdigit() and c != ' ') or i == len(s) - 1:
            if   op == '+': st.append(num)
            elif op == '-': st.append(-num)
            elif op == '*': st.append(st.pop() * num)
            else:           st.append(int(st.pop() / num))   # truncate toward 0
            op = c; num = 0
    return sum(st)

# "3+2*2"->7, " 3/2 "->1, "3+5 / 2"->5
```
`+`/`-` defer their number; `*`/`/` combine with the top immediately (precedence).
Extend with Pattern 4 (push context on `(`, pop on `)`) → Basic Calculator III.

---

## 6. Problem ladder
- Warm-up: LC 20, 1047, 844
- Collapse: LC 735, 1209
- Expression: LC 150, 227, 224
- Nested: LC 394, 341
- Iterative DFS: LC 94 / 144 / 145
- Monotonic (see monotonic_stack.md): LC 739, 496, 503, 84, 42, 901, 907

---

## 7. Quiz recap
1. Counter can't distinguish bracket *types* (`"([)]"`); stack tracks innermost opener.
2. `["4","13","5","/","+"]` -> `4 + 13/5 = 6`; order matters (`a` popped second).
3. Only positive-on-stack + negative-incoming can collide (moving toward each other).
4. `"2[ab3[c]]"` -> `"abcccabccc"`.
5. Pop while `top <= current` -> next **strictly greater**; `<` -> greater-or-equal.
