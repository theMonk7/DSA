# Next Greater / Smaller Element — Monotonic Stack

> Google DSA prep notes. Category: Stacks / Monotonic Stack.
> Focus: the 4 "next greater/smaller to left/right" variants and their ONE generic
> template, plus the problems that reduce to them.

## 0. What these problems ask

For every element, find its **nearest** neighbor — on the **left** or the **right** —
that is **greater** or **smaller**. Four combinations:

- Next Greater to Right (NGR), Next Greater to Left (NGL)
- Next Smaller to Right (NSR), Next Smaller to Left (NSL)

Answer is the matched value (or `-1` if none). Often you actually want the
**index / distance**, so store indices on the stack, not values.

---

## 1. Intuition & mental model

Brute force re-scans for every element → `O(n^2)`. The insight that removes it:

> When a new element arrives, it **resolves and discards** every earlier element it
> "beats." For those elements the new one *is* the nearest answer, and none of them
> can ever be the answer for anything further along — the new, more-extreme element
> now stands in front of them.

The set of "elements still waiting for an answer" stays **sorted** → a **monotonic
stack**. Each element is pushed once and popped once → `O(n)`.

**Parking-garage model (NGR):** walk left→right. The stack holds people waiting for
a taller person on their right. When someone taller than the top of the stack walks
in, that waiter's answer is found — pop them. Whoever is left waiting → `-1`.

**Two knobs define every variant:**

| Knob | Choice | Effect |
|---|---|---|
| **Scan direction** | L→R / R→L | scan the side **opposite** to the one you ask about |
| **Pop comparison** | `<` / `>` | pop-while `<` → *greater*; pop-while `>` → *smaller* |

> Rule of thumb: to find the next element on the RIGHT, scan LEFT→RIGHT; on the
> LEFT, scan RIGHT→LEFT. Then `<` finds greater, `>` finds smaller.

Trace `[2, 1, 2, 4, 3]`, NGR → `[4, 2, 4, -1, -1]`:

```
i=0 push2            stack(vals)=[2]
i=1 1<2 push         [2,1]
i=2 2>1 pop→res[1]=2 [2]; 2==2 push  [2,2]
i=3 4>2 pop→res[2]=4, 4>2 pop→res[0]=4  []; push4  [4]
i=4 3<4 push         [4,3]
end: 4 and 3 unresolved → res[3]=res[4]=-1
```

---

## 2. Pseudocode (generic engine)

```
scan array in the chosen direction:
    while stack not empty AND should_pop(value[stack.top], current):
        answer[stack.pop()] = current      # current is that element's nearest match
    stack.push(current index)
leftover indices in stack → answer = -1
```

Store **indices**: you usually need both the value and the distance to the answer.

---

## 3. General / brute force — O(n^2)

```python
def next_greater_right_brute(nums):
    n = len(nums)
    res = [-1] * n
    for i in range(n):
        for j in range(i + 1, n):      # scan rightward for first bigger
            if nums[j] > nums[i]:
                res[i] = nums[j]
                break
    return res
```

- Time: `O(n^2)` (sorted input scans the whole tail each time).
- Space: `O(1)` extra.

---

## 4. Optimal — monotonic stack, all four variants — O(n) / O(n)

Identical bodies; only **direction** and **comparison** change. Store indices;
`res` holds the matched value (use `st[-1]`/`i` for positions or `st[-1]-i` for
distance instead).

```python
def next_greater_right(nums):          # scan L→R, pop while top < current
    n = len(nums); res = [-1] * n; st = []
    for i in range(n):
        while st and nums[st[-1]] < nums[i]:
            res[st.pop()] = nums[i]
        st.append(i)
    return res

def next_greater_left(nums):           # scan R→L, pop while top < current
    n = len(nums); res = [-1] * n; st = []
    for i in range(n - 1, -1, -1):
        while st and nums[st[-1]] < nums[i]:
            res[st.pop()] = nums[i]
        st.append(i)
    return res

def next_smaller_right(nums):          # scan L→R, pop while top > current
    n = len(nums); res = [-1] * n; st = []
    for i in range(n):
        while st and nums[st[-1]] > nums[i]:
            res[st.pop()] = nums[i]
        st.append(i)
    return res

def next_smaller_left(nums):           # scan R→L, pop while top > current
    n = len(nums); res = [-1] * n; st = []
    for i in range(n - 1, -1, -1):
        while st and nums[st[-1]] > nums[i]:
            res[st.pop()] = nums[i]
        st.append(i)
    return res
```

- Time: `O(n)` — each index pushed once, popped ≤ once (amortized O(1)).
- Space: `O(n)` for the stack.

**Strict vs non-strict (duplicates):** `<` = strictly greater (equal elements do NOT
resolve each other); use `<=` for greater-or-equal. This boundary is the #1 bug
source — decide it deliberately per problem.

---

## 5. The 4-way cheat sheet

| Want | Scan direction | Pop while `top ? current` |
|---|---|---|
| Next **Greater** to **Right** | left → right | `top < current` |
| Next **Greater** to **Left** | right → left | `top < current` |
| Next **Smaller** to **Right** | left → right | `top > current` |
| Next **Smaller** to **Left** | right → left | `top > current` |

Mnemonic: **direction is opposite the side you ask about; `<` finds greater, `>`
finds smaller.**

---

## 6. Where this shows up (reductions)

- **Daily Temperatures** (LC 739) — NGR, store index distance `st[-1] - i`.
- **Next Greater Element I / II** (LC 496 / 503) — II is circular: iterate `2n`
  with `i % n`.
- **Largest Rectangle in Histogram** (LC 84) — previous-smaller-left + next-smaller
  -right give each bar's spannable width.
- **Trapping Rain Water** (LC 42), **Sum of Subarray Minimums** (LC 907),
  **Stock Span** (LC 901) — all reduce to these four boundaries.

---

## 7. Mental checklist before coding

1. Which side am I asking about? → scan the **opposite** direction.
2. Greater or smaller? → pop while `<` (greater) or `>` (smaller).
3. Do duplicates count? → pick `<` vs `<=` (strict vs non-strict).
4. Do I need value, index, or distance? → store indices, read what you need.
5. Leftover stack entries → answer is `-1` (no more extreme element exists).
