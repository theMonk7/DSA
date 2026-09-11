# Linked Lists — Complete Guide

> Google DSA prep notes. Category: Linked Lists (pointer surgery, not algorithms).
> Almost every problem here is one of three tools — a **dummy head**, **fast & slow
> pointers**, or **prev/cur/next reversal** — wired together. Learn the three, and the
> rest is bookkeeping.

## 1. Fundamentals

### The shapes

| Kind | Structure | Ends | Notes |
|---|---|---|---|
| Singly | `val`, `next` | `tail.next is None` | 95% of interview problems |
| Doubly | `val`, `prev`, `next` | both ends `None` | O(1) delete-given-node; LRU, browser history |
| Circular (singly) | `val`, `next` | `tail.next is head` | round-robin, Josephus, sorted-circular insert |
| Circular doubly | both | wraps both ways | LRU with sentinels, All O(1) buckets |

```python
class ListNode:
    """The one class every problem starts from. `next` shadows nothing important."""

    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

    def __repr__(self):                       # debugging only — never in a submission
        return f"ListNode({self.val})"


class DListNode:
    def __init__(self, val=0, prev=None, next=None):
        self.val = val
        self.prev = prev
        self.next = next
```

### Test harness — build these before you debug anything

```python
def from_list(vals):
    """[1,2,3] -> 1->2->3. Uses a dummy so the empty case needs no special code."""
    dummy = ListNode()
    tail = dummy
    for v in vals:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next


def to_list(head, limit=10_000):
    """Walk the list into a Python list. `limit` stops an accidental cycle dead."""
    out = []
    while head and len(out) < limit:
        out.append(head.val)
        head = head.next
    return out


def node_at(head, i):
    """Return the i-th node (0-based) — handy for building cycle/intersection tests."""
    for _ in range(i):
        head = head.next
    return head
```

**Time** O(n) each · **Space** O(n) for `to_list`, O(n) for `from_list`

### The real cost model

| Operation | Array | Singly linked list |
|---|---|---|
| Index / random access | **O(1)** | O(n) |
| Insert / delete at front | O(n) | **O(1)** |
| Insert / delete **given the node** | O(n) (shift) | **O(1)** (doubly) / O(1)-ish trick (singly) |
| Search by value | O(n) | O(n) |
| Append at back | O(1) amortised | O(1) *with a tail pointer*, else O(n) |
| Memory per element | 1 slot | 1 slot + 1–2 pointers (~3x in CPython) |

The critical asymmetry: **a linked list makes the *edit* O(1) but the *find* O(n)**.
So it only wins when you already hold a reference to the node — which is why every
real-world use pairs it with a hash map (LRU, LFU, All O(1)) that hands you the node
in O(1).

**When a linked list actually beats an array**
- You hold the node already (LRU eviction, intrusive OS run-queues, free lists).
- You need O(1) splice of a whole sublist between two structures.
- References into the middle must stay valid across insertions (arrays invalidate on realloc).
- You cannot afford a rehash/realloc pause (real-time systems).

**When it loses (usually)**
- **Cache locality.** An array walk is one prefetched, contiguous stream; a list walk
  is a pointer chase with a potential cache miss per node. In practice a `list`/vector
  beats a linked list even at "insert in the middle" for sizes into the thousands,
  because memmove of contiguous bytes is faster than n cache misses.
- Anything needing indexing, sorting by index, or binary search.

### Node identity vs node value

`ListNode` defines no `__eq__`, so in Python `==` on nodes *is* identity — but do not
rely on that. **Always write `is` / `is not` when you mean "the same node".**

```python
a, b = ListNode(7), ListNode(7)
print(a is b, a.val == b.val)     # False True  -> equal values, different nodes
```

Cycle detection, intersection, and k-group boundaries are all **identity** questions.
`slow.val == fast.val` will report a phantom cycle on `1 -> 1 -> 1`.

**Mental trigger:** any sentence containing "the same node", "intersects", "cycle", or
"stop when you reach X" → compare with `is`, never `==`.

---

## 2. The three universal tools

### Tool A — Dummy / sentinel head

A dummy node is a fake node placed *before* the real head so that **every real node
has a predecessor**. That single property deletes almost all edge-case code, because
"delete/insert at the head" stops being special.

**Before — no dummy (remove all nodes equal to `val`)**

```python
def remove_elements_no_dummy(head, val):
    while head and head.val == val:       # special case #1: a run of bad heads
        head = head.next
    cur = head
    while cur and cur.next:               # special case #2: cur may now be None
        if cur.next.val == val:
            cur.next = cur.next.next
        else:
            cur = cur.next
    return head                           # special case #3: head may have moved
```

**After — with a dummy**

```python
def remove_elements(head, val):
    dummy = ListNode(0, head)
    cur = dummy
    while cur.next:
        if cur.next.val == val:
            cur.next = cur.next.next      # head deletion needs no special case
        else:
            cur = cur.next
    return dummy.next                     # never `head` — head may have been deleted
```

**Time** O(n) · **Space** O(1)

Three rules that come with the dummy:
1. Build it as `dummy = ListNode(0, head)` — it already points at the list.
2. Return `dummy.next`, **never** `head`.
3. Look *forward* (`cur.next`) — you decide the fate of the node in front of you, so
   you always still hold its predecessor.

**Mental trigger:** *"the head might change or be deleted"* → dummy head. If you catch
yourself writing `if node is head:` you forgot the dummy.

### Tool B — Two pointers (fast & slow)

Two cursors moving at different speeds, or offset by a fixed gap.

```python
def two_pointer_skeleton(head):
    slow = fast = head
    while fast and fast.next:            # fast takes 2 steps -> guard 2 nodes ahead
        slow = slow.next
        fast = fast.next.next
    return slow                          # slow is now at the *second* middle
```

Two flavours:
- **Speed gap (1 vs 2):** middle, cycle detection, palindrome split.
- **Fixed gap (n apart):** "nth from the end" in a single pass.

The loop guard is the whole game:

| Guard | Stops when | `slow` ends at (even n) |
|---|---|---|
| `while fast and fast.next` | fast falls off the end | **second** middle (n/2) |
| `while fast.next and fast.next.next` | fast is at/near the last node | **first** middle (n/2 − 1) |

**Time** O(n) · **Space** O(1)

**Mental trigger:** *"middle", "cycle", "from the end", "half the list"* → fast & slow.

### Tool C — Iterative reversal (prev / cur / next)

```python
def reverse_list(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next        # 1. SAVE the next node before you destroy the link
        cur.next = prev       # 2. rewire backwards
        prev = cur            # 3. advance prev
        cur = nxt             # 4. advance cur using the SAVED pointer
    return prev               # prev is the new head; cur is None
```

**Time** O(n) · **Space** O(1)

**The pointer-order rule — "save next before you rewire."** Every linked-list bug is a
violation of it. This is what happens when you forget:

```python
def reverse_broken(head):                 # DO NOT RUN — infinite loop
    prev, cur = None, head
    while cur:
        cur.next = prev                   # link destroyed...
        prev = cur
        cur = cur.next                    # ...so cur = prev: we walk backwards forever
    return prev
```

Three-line drill to memorise (say it out loud while writing):
> *save next → point back → move prev → move cur.*

**Mental trigger:** *"reverse", "backwards", "last-in-first-out over a list"* → prev /
cur / next. If you need the *original* order afterwards too, reverse a copy or reverse
back at the end.

---

## 3. Template A — Reversal

### A1. Full reversal, iterative and recursive

```python
def reverse_recursive(head):
    if not head or not head.next:
        return head                       # base: 0 or 1 node is its own reverse
    new_head = reverse_recursive(head.next)
    head.next.next = head                 # the node behind me now points back at me
    head.next = None                      # null-terminate, or you create a 2-cycle
    return new_head                       # the deepest node, unchanged all the way up
```

**Time** O(n) · **Space** O(1) iterative, **O(n) stack** recursive

The line people drop is `head.next = None`. Without it the old tail keeps its forward
pointer and you get `... -> b -> a -> b -> ...`.

**Mental trigger:** reversal is the default; recursion only if the interviewer asks.

### A2. Reverse a sublist, positions `left..right` (LC 92)

Use head-insertion: keep `prev` fixed just before the sublist and repeatedly pull the
node *after* `cur` to the front of the sublist. `cur` never moves — it sinks to the end.

```python
def reverse_between(head, left, right):
    if not head or left == right:
        return head
    dummy = ListNode(0, head)
    prev = dummy
    for _ in range(left - 1):
        prev = prev.next                  # node immediately BEFORE the sublist
    cur = prev.next                       # first node of the sublist -> becomes its tail
    for _ in range(right - left):
        nxt = cur.next                    # node to promote
        cur.next = nxt.next               # unlink it
        nxt.next = prev.next              # splice it at the sublist front
        prev.next = nxt
    return dummy.next
```

**Time** O(n) · **Space** O(1)

`left == 1` is exactly why the dummy exists here: `prev` becomes the dummy and nothing
special happens.

### A3. Reverse nodes in k-group (LC 25) — the Google favourite

The trick is **count first, then reverse**: walk `k` nodes to prove a full group
exists; if it doesn't, stop and leave the remainder untouched.

```python
def reverse_k_group(head, k):
    dummy = ListNode(0, head)
    group_prev = dummy                    # node just before the group being reversed
    while True:
        kth = group_prev                  # 1) COUNT: find the k-th node of this group
        for _ in range(k):
            kth = kth.next
            if not kth:
                return dummy.next         # fewer than k left -> leave as-is, done
        group_next = kth.next             # first node AFTER the group

        prev, cur = group_next, group_prev.next   # 2) REVERSE, seeding prev with the
        while cur is not group_next:              #    node after the group so the new
            nxt = cur.next                        #    tail links to it automatically
            cur.next = prev
            prev = cur
            cur = nxt

        new_group_prev = group_prev.next  # 3) RELINK: old head is the new group tail
        group_prev.next = kth             #    kth is the new group head
        group_prev = new_group_prev
```

**Time** O(n) — each node is visited by the counter once and the reverser once ·
**Space** O(1)

Why seed `prev = group_next` instead of `None`? Because the group's last node must
point at the rest of the list, and doing it inside the loop saves a separate fix-up.

Follow-up they always ask: *"what if the leftover partial group should also be
reversed?"* — change the count loop to `if not kth: reverse whatever remains; return`.

### A4. Reverse alternating k-groups

Reverse the 1st group, skip the 2nd, reverse the 3rd, …

```python
def reverse_alternate_k(head, k):
    dummy = ListNode(0, head)
    group_prev = dummy
    do_reverse = True
    while group_prev.next:
        kth = group_prev
        for _ in range(k):
            kth = kth.next
            if not kth:
                break                     # partial group at the end
        if do_reverse and kth:
            group_next = kth.next
            prev, cur = group_next, group_prev.next
            while cur is not group_next:
                nxt = cur.next
                cur.next = prev
                prev = cur
                cur = nxt
            new_group_prev = group_prev.next
            group_prev.next = kth
            group_prev = new_group_prev
        else:
            for _ in range(k):            # walk past this group untouched
                if not group_prev.next:
                    break
                group_prev = group_prev.next
        do_reverse = not do_reverse
    return dummy.next
```

**Time** O(n) · **Space** O(1)

### A5. Swap nodes in pairs (LC 24)

k-group with `k = 2`, but worth memorising the flat version.

```python
def swap_pairs(head):
    dummy = ListNode(0, head)
    prev = dummy
    while prev.next and prev.next.next:
        first, second = prev.next, prev.next.next
        first.next = second.next          # first jumps over second
        second.next = first               # second now leads
        prev.next = second                # graft the swapped pair back on
        prev = first                      # first is the pair's new tail
    return dummy.next
```

**Time** O(n) · **Space** O(1)

**Mental trigger (whole template):** *"reverse / rotate the order of nodes"* → three
pointers + a dummy; if it's chunked, **count the chunk before touching it**.

---

## 4. Template B — Fast & slow pointers

### B1. Find the middle — and pick the right convention

```python
def middle_second(head):
    """n=6 (1..6) -> 4. LC 876 wants THIS one ('return the second middle')."""
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow


def middle_first(head):
    """n=6 (1..6) -> 3, i.e. the END of the first half. Needed to SPLIT a list."""
    if not head:
        return None
    slow = fast = head
    while fast.next and fast.next.next:
        slow = slow.next
        fast = fast.next.next
    return slow
```

**Time** O(n) · **Space** O(1)

Which one do you need?

| Problem | Convention | Why |
|---|---|---|
| Middle of the Linked List (876) | second middle | the statement says so |
| Palindrome, Reorder List | **first middle** | you need `slow.next` to cut, and the first half may be the longer one |
| Sort List (merge sort split) | first middle | both halves must be non-empty or you recurse forever |
| Delete middle node (2095) | second middle, keep `prev` | you must unlink it |

The split idiom for merge sort avoids the extra guard by pre-advancing `fast`:

```python
def split_halves(head):
    """Returns (first_head, second_head) with the first half strictly non-empty."""
    slow, fast = head, head.next          # fast starts one ahead -> slow lands on the
    while fast and fast.next:             # end of the FIRST half even for n == 2
        slow = slow.next
        fast = fast.next.next
    second = slow.next
    slow.next = None                      # cut
    return head, second
```

**Mental trigger:** *"middle"* → ask **which** middle, then pick the guard. Getting this
wrong is the single most common off-by-one in this topic.

### B2. Detect a cycle (Floyd's tortoise & hare, LC 141)

```python
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:                  # IDENTITY, not value
            return True
    return False
```

**Time** O(n) · **Space** O(1)

Why they must meet: once `slow` enters the cycle, the gap (measured forward around the
cycle) shrinks by exactly 1 per step because fast gains one position per step. A
non-negative integer strictly decreasing hits 0 within `C` steps. So they meet in
O(n) total and slow never completes a full lap.

### B3. Find the cycle START (LC 142) — with the proof

Notation, once the hare and tortoise have met:

```
head ---- x ----> S ---- y ----> M
                  ^              |
                  |------ z <----|      cycle length C = y + z
```
- `x` = steps from head to the cycle start `S`
- `y` = steps from `S` to the meeting point `M` (going forward)
- `z` = steps from `M` back around to `S`

Slow has walked `x + y` (proved above: it does less than one lap).
Fast has walked `x + y + kC` for some integer `k ≥ 1`.
Fast walked exactly twice as far:

$$2(x + y) = x + y + kC \;\Longrightarrow\; x + y = kC \;\Longrightarrow\; x = kC - y$$

Since `C = y + z`, substitute: `x = k(y + z) − y = (k−1)C + z`.

So **`x ≡ z` modulo the cycle length**, and with `k = 1` simply `x = z`. Therefore: put
one pointer at `head` and leave the other at `M`, advance both one step at a time — the
first walks `x`, the second walks `z` (+ whole laps), and they collide exactly at `S`.

```python
def detect_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:                  # phase 1: meet somewhere inside the cycle
            p = head                      # phase 2: x == z, so walk both at speed 1
            while p is not slow:
                p = p.next
                slow = slow.next
            return p                      # the cycle entrance
    return None
```

**Time** O(n) · **Space** O(1)

The hash-set version (`seen = set(); ... if node in seen`) is O(n) space and is a fine
*first* answer — say it, then produce Floyd's.

### B4. Cycle length

```python
def cycle_length(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            n, cur = 1, slow.next         # walk the loop once back to the meeting point
            while cur is not slow:
                cur = cur.next
                n += 1
            return n
    return 0
```

**Time** O(n) · **Space** O(1)

### B5. Happy Number (LC 202) — a cycle problem in disguise

Any function `f: S -> S` on a finite set defines an implicit linked list
(`node = value`, `next = f(value)`). Floyd works with zero memory.

```python
def is_happy(n):
    def nxt(x):
        return sum(int(d) ** 2 for d in str(x))

    slow, fast = n, nxt(n)
    while fast != 1 and slow != fast:
        slow = nxt(slow)
        fast = nxt(nxt(fast))
    return fast == 1
```

**Time** O(log n) per step, O(1) amortised steps (values collapse below 243) ·
**Space** O(1)

**Mental trigger:** *"repeat this deterministic transformation — does it terminate?"* →
it's a linked list with `next = f(x)` → Floyd. Same idea powers Find the Duplicate
Number (LC 287) where `next = nums[i]`.

### B6. Palindrome Linked List in O(1) space (LC 234)

Find the first middle → reverse the second half → compare → **restore**.

```python
def is_palindrome(head):
    if not head or not head.next:
        return True
    slow = fast = head
    while fast.next and fast.next.next:   # slow = LAST node of the first half
        slow = slow.next
        fast = fast.next.next

    second = reverse_list(slow.next)      # reverse the (shorter-or-equal) tail half
    slow.next = None

    ok, p, q = True, head, second
    while q:                              # the second half is never the longer one
        if p.val != q.val:
            ok = False
            break
        p, q = p.next, q.next

    slow.next = reverse_list(second)      # restore the input — do this unprompted
    return ok
```

**Time** O(n) · **Space** O(1)

Interviewers score the restore step. Mutating an input and handing it back mangled is a
real-world bug; say *"I'll put it back the way I found it"* out loud.

### B7. Reorder List (LC 143): `L0 -> Ln -> L1 -> Ln-1 -> ...`

Same three moves: split at the first middle, reverse the tail, weave.

```python
def reorder_list(head):
    if not head or not head.next:
        return head
    slow = fast = head
    while fast.next and fast.next.next:
        slow = slow.next
        fast = fast.next.next

    second = reverse_list(slow.next)
    slow.next = None                      # cut, else the weave builds a cycle

    first = head
    while second:
        f_next, s_next = first.next, second.next   # save BOTH before rewiring
        first.next = second
        second.next = f_next
        first, second = f_next, s_next
    return head
```

**Time** O(n) · **Space** O(1)

### B8. Remove the nth node from the end, one pass (LC 19)

Fixed-gap two pointers + a dummy so that deleting the head is not special.

```python
def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n):                    # open a gap of exactly n
        fast = fast.next
    while fast.next:                      # slide until fast is the last node
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next            # slow is the predecessor of the target
    return dummy.next
```

**Time** O(n) · **Space** O(1)

Starting **both** at `dummy` (not `head`) is what makes `slow` land on the
*predecessor* rather than the target. Removing the head (`n == len`) then just works.

**Mental trigger (whole template):** *"kth from the end", "middle", "cycle", "half"* →
two pointers, and decide up front whether the gap is **speed-based** or **count-based**.

---

## 5. Template C — Merging & sorting

### C1. Merge two sorted lists (LC 21)

```python
def merge_two(a, b):
    dummy = tail = ListNode()
    while a and b:
        if a.val <= b.val:                # <= keeps the merge STABLE
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b                    # attach whatever remains, in one line
    return dummy.next
```

**Time** O(n + m) · **Space** O(1) — nodes are relinked, not copied

`tail.next = a or b` is the idiom to memorise; it also handles both being `None`.

### C2. Merge k sorted lists (LC 23) — two accepted answers

**Heap version** — keep one candidate per list.

```python
import heapq


def merge_k_heap(lists):
    heap = [(node.val, i, node) for i, node in enumerate(lists) if node]
    heapq.heapify(heap)                   # the `i` is the tie-break: ListNode has no <
    dummy = tail = ListNode()
    while heap:
        _, i, node = heapq.heappop(heap)
        tail.next = node
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    tail.next = None                      # the last node may still point into its old list
    return dummy.next
```

**Time** O(N log k) · **Space** O(k)

**Divide-and-conquer version** — pair up and merge, halving the list count per round.

```python
def merge_k_dc(lists):
    if not lists:
        return None
    while len(lists) > 1:
        merged = []
        for i in range(0, len(lists), 2):
            a = lists[i]
            b = lists[i + 1] if i + 1 < len(lists) else None
            merged.append(merge_two(a, b))
        lists = merged                    # k -> k/2 -> k/4 ... : log k rounds, O(N) each
    return lists[0]
```

**Time** O(N log k) · **Space** O(1) extra (ignoring the `merged` list of heads)

| | Heap | Divide & conquer |
|---|---|---|
| Time | O(N log k) | O(N log k) |
| Extra space | O(k) | O(1) pointers (O(k) for the array of heads) |
| Works on a **stream** of lists | yes | no (needs all k up front) |
| Constant factor | higher (heap ops) | lower (linear merges) |
| Naive alternative | merge one-by-one = **O(Nk)** — say why you rejected it | |

**Mental trigger:** *"k sorted things"* → heap if they arrive online, divide & conquer
if you have them all.

### C3. Merge sort a linked list (LC 148)

Merge sort is *the* linked-list sort: it needs no random access, it is stable, and the
merge step is O(1) space because you relink instead of copying.

```python
def sort_list(head):
    if not head or not head.next:
        return head                       # 0 or 1 node: already sorted
    slow, fast = head, head.next          # fast pre-advanced -> guarantees a real split
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    mid = slow.next
    slow.next = None                      # cut into two independent lists
    return merge_two(sort_list(head), sort_list(mid))
```

**Time** O(n log n) · **Space** O(log n) recursion stack

If `fast` started at `head`, a 2-node list would split into `[2 nodes] + []` and recurse
forever. That one-token difference is the bug interviewers watch for.

**Bottom-up (true O(1) space)** — the follow-up when they say "constant space":

```python
def split_off(head, k):
    """Cut the first k nodes off `head`; return the head of the remainder."""
    while k > 1 and head:
        head = head.next
        k -= 1
    if not head:
        return None
    rest = head.next
    head.next = None
    return rest


def sort_list_bottom_up(head):
    n, node = 0, head
    while node:
        n += 1
        node = node.next
    dummy = ListNode(0, head)
    size = 1
    while size < n:                       # merge runs of 1, then 2, then 4, ...
        prev, cur = dummy, dummy.next
        while cur:
            left = cur
            right = split_off(left, size)
            cur = split_off(right, size)  # remainder of the list for the next pair
            prev.next = merge_two(left, right)
            while prev.next:              # walk to the tail of what we just merged
                prev = prev.next
        size *= 2
    return dummy.next
```

**Time** O(n log n) · **Space** O(1)

### C4. Insertion Sort List (LC 147)

```python
def insertion_sort_list(head):
    dummy = ListNode()
    cur = head
    while cur:
        nxt = cur.next                    # save: cur is about to be relinked
        p = dummy
        while p.next and p.next.val < cur.val:
            p = p.next                    # find the insertion predecessor
        cur.next = p.next
        p.next = cur
        cur = nxt
    return dummy.next
```

**Time** O(n²) worst, O(n) on nearly-sorted input · **Space** O(1)

An easy optimisation to mention: remember the last insertion point and only restart
from `dummy` when the new value is smaller than it.

### C5. Why quicksort is bad on a linked list

- **No random access** → no O(1) median-of-three pivot; you get last/first-element
  pivots, so sorted input degrades to O(n²). Merge sort has no bad input.
- **Partitioning** is fine (build two lists), but the recursion depth is O(n) worst case.
- The usual quicksort win — cache-friendly in-place swaps — evaporates when every
  element is a pointer chase.
- Merge sort's usual loss — the O(n) auxiliary array — evaporates too, because linked
  merging is O(1) space.

So on arrays quicksort wins, on linked lists merge sort wins. Say this sentence and
you have answered the follow-up before it is asked.

**Mental trigger:** *"sort a linked list in O(n log n)"* → merge sort, split at the
first middle. *"…and O(1) space"* → bottom-up merge sort.

---

## 6. Template D — Structural surgery

The shared recipe: **one or two dummy heads, build new chains by relinking, then
null-terminate every tail you produced.** Forgetting the last step is how you create a
cycle and hang the judge.

### D1. Partition List (LC 86) — keep relative order

```python
def partition(head, x):
    less_d = less = ListNode()
    ge_d = ge = ListNode()
    while head:
        if head.val < x:
            less.next = head
            less = head
        else:
            ge.next = head
            ge = head
        head = head.next
    ge.next = None                        # MANDATORY: the old tail may point backwards
    less.next = ge_d.next                 # stitch the two chains
    return less_d.next
```

**Time** O(n) · **Space** O(1)

### D2. Remove Duplicates from a Sorted List I (LC 83) — keep one copy

```python
def delete_duplicates(head):
    cur = head
    while cur and cur.next:
        if cur.next.val == cur.val:
            cur.next = cur.next.next      # drop the duplicate, stay put
        else:
            cur = cur.next
    return head                           # head itself is never deleted -> no dummy
```

**Time** O(n) · **Space** O(1)

### D3. Remove Duplicates II (LC 82) — delete *every* copy of a repeated value

Now the head can vanish, so: dummy + skip the whole run + keep `prev` frozen.

```python
def delete_duplicates_all(head):
    dummy = ListNode(0, head)
    prev, cur = dummy, head
    while cur:
        if cur.next and cur.next.val == cur.val:
            dup = cur.val
            while cur and cur.val == dup:   # skip the ENTIRE run of duplicates
                cur = cur.next
            prev.next = cur                 # prev does NOT advance
        else:
            prev = cur
            cur = cur.next
    return dummy.next
```

**Time** O(n) · **Space** O(1)

The invariant: `prev` is always the last node **known to be kept**. Only advance it in
the `else` branch.

### D4. Odd Even Linked List (LC 328) — by position, not value

```python
def odd_even_list(head):
    if not head or not head.next:
        return head
    odd, even = head, head.next
    even_head = even                      # remember where to graft the even chain
    while even and even.next:
        odd.next = even.next
        odd = odd.next
        even.next = odd.next
        even = even.next
    odd.next = even_head
    return head
```

**Time** O(n) · **Space** O(1)

### D5. Rotate List (LC 61)

Close the ring, walk to the new tail, reopen. `k` can exceed `n`, so take it mod `n`.

```python
def rotate_right(head, k):
    if not head or not head.next or k == 0:
        return head
    n, tail = 1, head
    while tail.next:
        tail = tail.next
        n += 1
    k %= n
    if k == 0:
        return head
    tail.next = head                      # make it circular
    new_tail = head
    for _ in range(n - k - 1):            # the new tail is the (n-k)-th node
        new_tail = new_tail.next
    new_head = new_tail.next
    new_tail.next = None                  # reopen the ring — never forget this
    return new_head
```

**Time** O(n) · **Space** O(1)

### D6. Split Linked List in Parts (LC 725)

Sizes differ by at most 1, and the **bigger parts come first**.

```python
def split_list_to_parts(head, k):
    n, node = 0, head
    while node:
        n += 1
        node = node.next
    size, extra = divmod(n, k)            # `extra` parts get one node more
    parts, cur = [], head
    for i in range(k):
        parts.append(cur)                 # may legitimately be None when n < k
        prev = None
        for _ in range(size + (1 if i < extra else 0)):
            prev, cur = cur, cur.next
        if prev:
            prev.next = None              # cut this part loose
    return parts
```

**Time** O(n + k) · **Space** O(k) for the output

### D7. Delete a node given only that node (LC 237)

You cannot reach the predecessor, so **impersonate the successor**.

```python
def delete_node(node):
    node.val = node.next.val              # copy the successor's payload into me...
    node.next = node.next.next            # ...then unlink the successor instead
```

**Time** O(1) · **Space** O(1)

Why it fails for the tail: there is no successor to copy from, and you cannot make your
own predecessor point to `None`. The problem statement therefore guarantees the node is
not the last one. It also breaks if any external code holds a reference to the
successor node — the object it points at is now garbage. Say both caveats.

### D8. Flatten a Multilevel Doubly Linked List (LC 430)

DFS with an explicit stack: when you descend into a child, push the node you owe a
return to.

```python
class MultiNode:
    def __init__(self, val=0, prev=None, next=None, child=None):
        self.val = val
        self.prev = prev
        self.next = next
        self.child = child


def flatten_multilevel(head):
    if not head:
        return head
    stack, cur = [], head
    while cur:
        if cur.child:
            if cur.next:
                stack.append(cur.next)    # owe a return to this branch
            cur.next = cur.child
            cur.child.prev = cur
            cur.child = None              # the child pointer must end up None
        elif not cur.next and stack:
            resume = stack.pop()
            cur.next = resume
            resume.prev = cur
        cur = cur.next
    return head
```

**Time** O(n) · **Space** O(depth)

### D9. Add Two Numbers I (LC 2) — digits stored **reversed**

```python
def add_two_numbers(l1, l2):
    dummy = tail = ListNode()
    carry = 0
    while l1 or l2 or carry:              # the carry keeps the loop alive one extra turn
        total = carry + (l1.val if l1 else 0) + (l2.val if l2 else 0)
        carry, digit = divmod(total, 10)
        tail.next = ListNode(digit)
        tail = tail.next
        l1 = l1.next if l1 else None
        l2 = l2.next if l2 else None
    return dummy.next
```

**Time** O(max(n, m)) · **Space** O(max(n, m)) for the output

### D10. Add Two Numbers II (LC 445) — digits **forward**, no reversing allowed

Addition runs least-significant-first, so use stacks to read backwards, and build the
result by **pushing at the front** (which re-forwards it for free).

```python
def add_two_numbers_ii(l1, l2):
    s1, s2 = [], []
    while l1:
        s1.append(l1.val)
        l1 = l1.next
    while l2:
        s2.append(l2.val)
        l2 = l2.next
    head, carry = None, 0
    while s1 or s2 or carry:
        total = carry + (s1.pop() if s1 else 0) + (s2.pop() if s2 else 0)
        carry, digit = divmod(total, 10)
        head = ListNode(digit, head)      # push-front: no reversal pass needed
    return head
```

**Time** O(n + m) · **Space** O(n + m)

### D11. Insert into a Sorted Circular Linked List (LC 708)

Three landing spots, one of which is the wrap point (max → min).

```python
def insert_circular(head, val):
    node = ListNode(val)
    if not head:
        node.next = node                  # a 1-node ring points at itself
        return node
    cur = head
    while True:
        if cur.val <= cur.next.val:
            if cur.val <= val <= cur.next.val:
                break                     # normal ascending segment
        else:                             # cur is the maximum, cur.next the minimum
            if val >= cur.val or val <= cur.next.val:
                break                     # new max or new min
        cur = cur.next
        if cur is head:
            break                         # all values equal -> insert anywhere
    node.next = cur.next
    cur.next = node
    return head
```

**Time** O(n) · **Space** O(1)

**Mental trigger (whole template):** *"rearrange / split / stitch nodes"* → one dummy
per output chain, relink (never copy values unless asked), and **null-terminate every
tail** before returning.

---

## 7. Template E — Lists with extra pointers

### E1. Copy List with Random Pointer (LC 138)

```python
class RNode:
    def __init__(self, val=0, next=None, random=None):
        self.val = val
        self.next = next
        self.random = random
```

The difficulty: `random` may point *forward* to a node you have not cloned yet. Two
ways to solve the forward-reference problem.

**Solution 1 — hash map (old → new), O(n) space**

```python
def copy_random_list_map(head):
    if not head:
        return None
    clone = {}
    cur = head
    while cur:                            # pass 1: make every node, wire nothing
        clone[cur] = RNode(cur.val)
        cur = cur.next
    cur = head
    while cur:                            # pass 2: now every target exists
        clone[cur].next = clone.get(cur.next)      # .get(None) -> None, free edge case
        clone[cur].random = clone.get(cur.random)
        cur = cur.next
    return clone[head]
```

**Time** O(n) · **Space** O(n)

(One-pass variant: a `defaultdict`-style "create on demand" map. Same complexity, more
code — the two-pass version is easier to say out loud.)

**Solution 2 — interleaving / weaving, O(1) extra space**

The map exists only to answer *"given an original node, where is its copy?"* Weaving
answers that structurally: **put each copy immediately after its original**, so
`copy_of(u) == u.next`. Now `u.random.next` *is* the copy that `u`'s copy should
point at.

```
before:  A  ->  B  ->  C
after:   A -> A' -> B -> B' -> C -> C'          copy_of(X) == X.next
```

```python
def copy_random_list_weave(head):
    if not head:
        return None

    cur = head                            # 1) weave: A -> A' -> B -> B' -> ...
    while cur:
        cur.next = RNode(cur.val, cur.next)
        cur = cur.next.next

    cur = head                            # 2) random: copy.random = orig.random.next
    while cur:
        if cur.random:
            cur.next.random = cur.random.next
        cur = cur.next.next               # (skip over the copy we just wired)

    cur, new_head = head, head.next       # 3) unweave, restoring the ORIGINAL exactly
    while cur:
        copy = cur.next
        cur.next = copy.next
        copy.next = copy.next.next if copy.next else None
        cur = cur.next
    return new_head
```

**Time** O(n) — three linear passes · **Space** O(1) beyond the output

Step 3 is where candidates lose points: you must restore the input list *and*
null-terminate the copy's tail. Do the two lists in the same loop, as above.

**Mental trigger:** *"clone a structure whose pointers reference itself"* → you need an
old→new map; if they ask for O(1) space, **store the mapping in the structure itself**.

### E2. Intersection of Two Linked Lists (LC 160)

```python
def get_intersection_node(a, b):
    if not a or not b:
        return None
    pa, pb = a, b
    while pa is not pb:
        pa = pa.next if pa else b         # at the end, jump to the OTHER list's head
        pb = pb.next if pb else a
    return pa                             # the node, or None if they never intersect
```

**Time** O(n + m) · **Space** O(1)

**Why it terminates.** Let the exclusive prefixes be `p` and `q`, and the shared
suffix `c`. `pa` walks `p + c` then switches and walks `q`; `pb` walks `q + c` then
walks `p`. After `p + q + c` steps **both** have travelled the same distance and both
stand at the intersection node.

If there is no intersection (`c = 0`), both reach `None` after exactly `p + q` steps —
`pa is pb` becomes `None is None`, the loop exits, and you return `None`. Crucially,
the switch happens **at most once per pointer**, so there is no infinite loop.

Note the switch is `pa = b` when `pa` **is `None`**, not when `pa.next` is `None` —
that extra `None` step is what equalises the odd/even length difference.

### E3. Flatten a Binary Tree to a Linked List (LC 114)

Preorder, in place, using the right pointer as `next`. The Morris-flavoured version is
O(1) space: graft the right subtree under the left subtree's rightmost node.

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def flatten_tree(root):
    cur = root
    while cur:
        if cur.left:
            rightmost = cur.left
            while rightmost.right:        # last node of the left subtree in preorder
                rightmost = rightmost.right
            rightmost.right = cur.right   # the right subtree comes after it
            cur.right = cur.left
            cur.left = None
        cur = cur.right
    return root
```

**Time** O(n) · **Space** O(1)

### E4. BST → sorted circular doubly linked list (LC 426)

In-order traversal, relinking `left` as `prev` and `right` as `next`. See `bst.md` for
why in-order on a BST yields sorted order.

```python
def tree_to_doubly_list(root):
    if not root:
        return None
    first = last = None
    stack, cur = [], root
    while stack or cur:
        while cur:                        # go as far left as possible
            stack.append(cur)
            cur = cur.left
        cur = stack.pop()                 # visit
        if last:
            last.right = cur              # safe: last.right was already traversed
            cur.left = last
        else:
            first = cur
        last = cur
        cur = cur.right
    first.left = last                     # close the circle
    last.right = first
    return first
```

**Time** O(n) · **Space** O(h)

The recursive version is shorter but needs a `nonlocal last`; the iterative one makes
the "already traversed, safe to overwrite" argument obvious.

---

## 8. Design problems built on linked lists

Every one of these is the same idea: **a hash map gives O(1) *find*, a linked list
gives O(1) *reorder*.** Neither alone is enough.

### 8.1 LRU Cache (LC 146) — the canonical Google/Meta design question

Doubly linked list with **two sentinels** (so `_remove`/`_add_front` never test for
`None`) + a dict `key -> node`. Each node stores its **key** as well as its value,
because eviction discovers a node and must delete its dict entry.

```python
class DNode:
    __slots__ = ("key", "val", "prev", "next")

    def __init__(self, key=0, val=0):
        self.key, self.val = key, val
        self.prev = self.next = None


class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.map = {}                     # key -> DNode
        self.head = DNode()               # sentinel: head.next is the MOST recent
        self.tail = DNode()               # sentinel: tail.prev is the LEAST recent
        self.head.next = self.tail
        self.tail.prev = self.head

    # --- the helper pair: every operation is expressed with these two ---
    def _remove(self, node):
        node.prev.next = node.next        # sentinels guarantee both exist
        node.next.prev = node.prev

    def _add_front(self, node):
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        node = self.map.get(key)
        if not node:
            return -1
        self._remove(node)
        self._add_front(node)             # touching = move to front
        return node.val

    def put(self, key: int, value: int) -> None:
        if self.cap <= 0:
            return                        # guard: capacity 0 would evict a sentinel
        node = self.map.get(key)
        if node:
            node.val = value
            self._remove(node)
            self._add_front(node)
            return
        if len(self.map) == self.cap:
            lru = self.tail.prev          # evict from the BACK
            self._remove(lru)
            del self.map[lru.key]         # <- this is why the node stores its key
        node = DNode(key, value)
        self.map[key] = node
        self._add_front(node)
```

**Time** O(1) `get` and `put` · **Space** O(capacity)

The pragmatic production version (say it *after* showing you can do it by hand):

```python
from collections import OrderedDict


class LRUCacheOrderedDict:
    def __init__(self, capacity):
        self.cap = capacity
        self.od = OrderedDict()

    def get(self, key):
        if key not in self.od:
            return -1
        self.od.move_to_end(key)          # O(1): it IS a dict + doubly linked list
        return self.od[key]

    def put(self, key, value):
        if key in self.od:
            self.od.move_to_end(key)
        self.od[key] = value
        if len(self.od) > self.cap:
            self.od.popitem(last=False)   # pop the least recently used
```

`OrderedDict` is literally a dict plus a doubly linked list of entries — you are not
cheating conceptually, only typing less. Ask which one they want.

### 8.2 LFU Cache (LC 460) — a Google hard

Evict the **least frequently used**; break ties by **least recently used**. Structure:
`freq -> ordered collection of keys at that frequency`, plus a `min_freq` counter. Each
bucket is itself LRU-ordered, and `min_freq` only ever moves in ways that keep the
amortised cost O(1).

```python
from collections import defaultdict, OrderedDict


class LFUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.vals = {}                        # key -> value
        self.freq = {}                        # key -> use count
        self.buckets = defaultdict(OrderedDict)   # count -> keys, oldest first
        self.min_freq = 0

    def _touch(self, key):
        f = self.freq[key]
        del self.buckets[f][key]
        if not self.buckets[f]:
            del self.buckets[f]
            if self.min_freq == f:            # the only way min_freq can increase
                self.min_freq = f + 1
        self.freq[key] = f + 1
        self.buckets[f + 1][key] = None       # re-inserting puts it at the MRU end

    def get(self, key: int) -> int:
        if key not in self.vals:
            return -1
        self._touch(key)
        return self.vals[key]

    def put(self, key: int, value: int) -> None:
        if self.cap <= 0:
            return
        if key in self.vals:
            self.vals[key] = value
            self._touch(key)
            return
        if len(self.vals) == self.cap:
            evict, _ = self.buckets[self.min_freq].popitem(last=False)   # LFU, then LRU
            if not self.buckets[self.min_freq]:
                del self.buckets[self.min_freq]
            del self.vals[evict]
            del self.freq[evict]
        self.vals[key] = value
        self.freq[key] = 1
        self.buckets[1][key] = None
        self.min_freq = 1                     # a brand-new key always resets it
```

**Time** O(1) amortised for both ops · **Space** O(capacity)

Why `min_freq` is correct: it can only *increase* inside `_touch` (and only when the
bucket it names empties) and is *reset to 1* on every insertion. It never needs a
search. If you build it with hand-rolled doubly linked lists instead of `OrderedDict`,
the bucket list itself becomes a DLL of DLLs — mention it, but don't write it unless
asked.

### 8.3 Design Linked List (LC 707)

Tests exactly one thing: do you keep a sentinel and a size?

```python
class MyLinkedList:
    def __init__(self):
        self.head = ListNode()            # sentinel: index i's predecessor is reachable
        self.size = 0

    def _pred(self, index):
        """Node immediately before position `index`."""
        p = self.head
        for _ in range(index):
            p = p.next
        return p

    def get(self, index: int) -> int:
        if index < 0 or index >= self.size:
            return -1
        return self._pred(index).next.val

    def addAtIndex(self, index: int, val: int) -> None:
        if index > self.size:
            return
        index = max(index, 0)
        p = self._pred(index)
        p.next = ListNode(val, p.next)
        self.size += 1

    def addAtHead(self, val: int) -> None:
        self.addAtIndex(0, val)

    def addAtTail(self, val: int) -> None:
        self.addAtIndex(self.size, val)

    def deleteAtIndex(self, index: int) -> None:
        if index < 0 or index >= self.size:
            return
        p = self._pred(index)
        p.next = p.next.next
        self.size -= 1
```

**Time** O(index) per op · **Space** O(n)

### 8.4 Design Browser History (LC 1472)

A doubly linked list is the natural model: `visit` **truncates the forward history**,
which is a single pointer assignment rather than an array `del`.

```python
class HNode:
    __slots__ = ("url", "prev", "next")

    def __init__(self, url, prev=None, next=None):
        self.url, self.prev, self.next = url, prev, next


class BrowserHistory:
    def __init__(self, homepage: str):
        self.cur = HNode(homepage)

    def visit(self, url: str) -> None:
        self.cur.next = HNode(url, prev=self.cur)   # everything forward is unreachable
        self.cur = self.cur.next

    def back(self, steps: int) -> str:
        while steps and self.cur.prev:
            self.cur = self.cur.prev
            steps -= 1
        return self.cur.url

    def forward(self, steps: int) -> str:
        while steps and self.cur.next:
            self.cur = self.cur.next
            steps -= 1
        return self.cur.url
```

**Time** O(steps) · **Space** O(visits)

The array-with-a-pointer version is O(1) for back/forward and is arguably better here —
say so. The DLL wins when entries are huge or shared.

### 8.5 Design Skiplist (LC 1206) — brief

A skiplist is a *stack of linked lists*: level 0 has everything, each higher level keeps
a random ~50% sample, so a search descends like a binary search. Expected O(log n) for
search/insert/delete with no rebalancing code — this is why Redis sorted sets use one.

```python
import random


class SkipNode:
    __slots__ = ("val", "next")

    def __init__(self, val, level):
        self.val = val
        self.next = [None] * level        # one forward pointer per level


class Skiplist:
    P = 0.5
    MAX_LEVEL = 16

    def __init__(self):
        self.head = SkipNode(-1, self.MAX_LEVEL)

    def _predecessors(self, target):
        """Rightmost node with val < target, at every level."""
        update = [self.head] * self.MAX_LEVEL
        cur = self.head
        for lvl in range(self.MAX_LEVEL - 1, -1, -1):
            while cur.next[lvl] and cur.next[lvl].val < target:
                cur = cur.next[lvl]       # skip far at high levels, refine going down
            update[lvl] = cur
        return update

    def search(self, target: int) -> bool:
        node = self._predecessors(target)[0].next[0]
        return node is not None and node.val == target

    def add(self, num: int) -> None:
        update = self._predecessors(num)
        lvl = 1
        while random.random() < self.P and lvl < self.MAX_LEVEL:
            lvl += 1                      # coin flips decide the tower height
        node = SkipNode(num, lvl)
        for i in range(lvl):
            node.next[i] = update[i].next[i]
            update[i].next[i] = node

    def erase(self, num: int) -> bool:
        update = self._predecessors(num)
        target = update[0].next[0]
        if not target or target.val != num:
            return False
        for i in range(len(target.next)):
            if update[i].next[i] is target:
                update[i].next[i] = target.next[i]
        return True
```

**Time** O(log n) expected · **Space** O(n) expected

### 8.6 All O(1) Data Structure (LC 432)

`inc`, `dec`, `getMaxKey`, `getMinKey`, all O(1). The trick: a **doubly linked list of
count-buckets kept in sorted order**. `inc` moves a key to the adjacent bucket, which is
O(1) because counts change by exactly 1 — so the neighbour is either already the right
bucket or must be created next to the current one.

```python
class Bucket:
    __slots__ = ("count", "keys", "prev", "next")

    def __init__(self, count=0):
        self.count = count
        self.keys = set()
        self.prev = self.next = None


class AllOne:
    def __init__(self):
        self.head = Bucket()              # sentinels: head side = low counts,
        self.tail = Bucket()              # tail side = high counts
        self.head.next = self.tail
        self.tail.prev = self.head
        self.pos = {}                     # key -> its bucket

    def _insert_after(self, node, new):
        new.prev, new.next = node, node.next
        node.next.prev = new
        node.next = new

    def _unlink(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def inc(self, key: str) -> None:
        cur = self.pos.get(key, self.head)
        nxt = cur.next
        if nxt is self.tail or nxt.count != cur.count + 1:
            nxt = Bucket(cur.count + 1)
            self._insert_after(cur, nxt)  # counts move by 1 -> the slot is adjacent
        nxt.keys.add(key)
        self.pos[key] = nxt
        if cur is not self.head:
            cur.keys.discard(key)
            if not cur.keys:
                self._unlink(cur)

    def dec(self, key: str) -> None:
        if key not in self.pos:
            return
        cur = self.pos[key]
        if cur.count == 1:
            del self.pos[key]             # count would hit 0 -> the key disappears
        else:
            prev = cur.prev
            if prev is self.head or prev.count != cur.count - 1:
                prev = Bucket(cur.count - 1)
                self._insert_after(cur.prev, prev)
            prev.keys.add(key)
            self.pos[key] = prev
        cur.keys.discard(key)
        if not cur.keys:
            self._unlink(cur)

    def getMaxKey(self) -> str:
        return next(iter(self.tail.prev.keys)) if self.tail.prev is not self.head else ""

    def getMinKey(self) -> str:
        return next(iter(self.head.next.keys)) if self.head.next is not self.tail else ""
```

**Time** O(1) all four ops · **Space** O(n)

### 8.7 Linked List Random Node (LC 382) — reservoir sampling

When the length is unknown or the list is a stream, keep the current pick with
probability `1/i` at the i-th node. Proof: node `i` survives with
`(1/i)·(i/(i+1))·((i+1)/(i+2))···((n−1)/n) = 1/n`.

```python
import random


class RandomListNode:
    def __init__(self, head):
        self.head = head

    def getRandom(self) -> int:
        result, node, i = self.head.val, self.head.next, 2
        while node:
            if random.randrange(i) == 0:  # keep the newcomer with probability 1/i
                result = node.val
            node = node.next
            i += 1
        return result
```

**Time** O(n) per call · **Space** O(1)

The alternative — materialise into a list once, then O(1) picks — is better if the list
is static and you sample often. State the trade-off; that's the actual question.

**Mental trigger (whole section):** *"O(1) get **and** O(1) reorder/evict"* → hash map
to find the node + doubly linked list to move it. Sentinels on both ends.

---

## 9. Recursion on linked lists

A linked list *is* a recursive data type (`list = node + list`), so some solutions are
beautifully short:

```python
def merge_two_recursive(a, b):
    if not a or not b:
        return a or b
    if a.val <= b.val:
        a.next = merge_two_recursive(a.next, b)
        return a
    b.next = merge_two_recursive(a, b.next)
    return b
```

**Time** O(n + m) · **Space** O(n + m) stack

When recursion is worth it:
- **Reverse**, **merge two sorted**, **add two numbers**, tree↔list conversions.
- Anything where the "combine" step is one pointer assignment.

The costs you must state before using it:
- **O(n) stack**, not O(1). On a 100 000-node list that is a hard fail — and Python's
  default `sys.setrecursionlimit` is 1000, so it does not merely get slow, it raises
  `RecursionError`. (`sort_list` is fine: its depth is O(log n).)
- Python has **no tail-call optimisation**, so even a tail-recursive traversal blows up.
- Debugging pointer bugs inside a recursion is much harder on a whiteboard.

Rule: **use recursion to explain, iteration to submit** — unless the recursion depth is
provably logarithmic.

**Mental trigger:** if the recursion depth is O(n) and n can be large, convert to a
loop; the iterative form is at most three lines longer.

---

## 10. Common pitfalls

1. **Losing `next` before rewiring.** `cur.next = prev; cur = cur.next` walks backwards
   forever. Always `nxt = cur.next` first.
2. **Not null-terminating a tail → accidental cycle.** After `partition`, `rotate`,
   `split`, `reorder`, or reversing a sublist, some node still points at its *old*
   successor. `to_list` hangs, the judge reports TLE, and the code "looks right".
3. **Off-by-one on the middle.** `while fast and fast.next` gives the *second* middle;
   `while fast.next and fast.next.next` gives the *first*. Splitting with the wrong one
   makes `sort_list` recurse forever on n = 2.
4. **No dummy, then special-casing the head.** Any `if node is head:` branch is a smell.
   Add `dummy = ListNode(0, head)` and the branch disappears.
5. **`while fast and fast.next` vs `while fast.next and fast.next.next`** — the second
   form crashes on an empty list (`None.next`). Guard `if not head: return ...` first.
6. **Comparing values instead of identity.** `slow.val == fast.val` "detects" a cycle in
   `1 -> 1`. Cycle, intersection, and group-boundary checks are `is` checks.
7. **Mutating the input when purity was expected.** `is_palindrome` reversing half the
   list and not restoring it; `reverse_k_group` destroying the caller's list. Ask, then
   restore or copy.
8. **Infinite loop from a self-referencing node.** `node.next = node` (classic in
   `swap_pairs` and `rotate`) makes every subsequent traversal hang. The `limit=` guard
   in `to_list` turns a hang into a visible wrong answer.
9. **Returning `head` instead of `dummy.next`.** If the head was deleted or moved,
   `head` is a stale pointer into the middle (or a freed node).
10. **Ignoring n = 0 and n = 1.** `head is None`, and single-node lists where
    `head.next` is `None`. Half of all linked-list crashes are one of these two.
11. **`k` larger than the list length.** `rotate_right` and Josephus-style problems need
    `k %= n`, and `n` must be computed first.
12. **Forgetting to store the key inside an LRU node.** Eviction finds a *node* and then
    cannot delete the corresponding dict entry.
13. **Advancing `prev` inside the skip branch** of "remove duplicates II" — it must stay
    frozen on the last kept node.
14. **`ListNode` in a heap without a tie-breaker.** `heapq` falls through to comparing
    nodes on equal values and raises `TypeError: '<' not supported`.

---

## 11. How to debug a linked-list problem on a whiteboard

1. **Draw the boxes.** Four or five boxes with arrows. Write the values *inside*, and
   the variable names (`prev`, `cur`, `nxt`, `dummy`) as labels *above* the boxes they
   point at. Never keep the list in your head.
2. **Name every pointer before you write code.** Say what each one means as an
   *invariant*: "`prev` is the last node I have decided to keep", "`group_prev` is the
   node just before the group I'm reversing". If you can't state the invariant, the bug
   is already in your plan.
3. **Do a 3-node dry run**, out loud, one line at a time. Erase and redraw arrows as
   the code changes them. Three nodes is the smallest size that exposes ordering bugs
   (with two, a wrong order often still "works").
4. **Check the boundaries, always in this order:**
   - `n = 0` → `head is None`. Does the first line crash?
   - `n = 1` → `head.next is None`. Do the loop guards hold?
   - `n = 2` → does the split/pair logic terminate?
   - `k > n`, `k == n`, `k == 1` for anything parameterised by `k`.
   - The **head** and the **tail** as the target node.
5. **Trace the tails.** For every chain you built, point at the last box and ask "does
   this say `None`?" This catches pitfall #2, which is invisible in code review.
6. **When it still fails:** print `to_list(head, limit=20)` after each phase, not at the
   end. Cycle bugs show up as the limit being hit; the phase that hits it is the culprit.

---

## 12. Cheat sheets

### Complexity

| Operation (singly linked) | Time | Space |
|---|---|---|
| Traverse / length / search | O(n) | O(1) |
| Insert / delete at head | O(1) | O(1) |
| Insert / delete at tail | O(n), O(1) with a tail pointer | O(1) |
| Delete given the node (singly, copy trick) | O(1) | O(1) |
| Delete given the node (doubly) | O(1) | O(1) |
| Reverse (whole or k-group) | O(n) | O(1) |
| Find middle / nth from end | O(n) | O(1) |
| Detect cycle + find start (Floyd) | O(n) | O(1) |
| Merge two sorted | O(n + m) | O(1) |
| Merge k sorted | O(N log k) | O(k) heap / O(1) D&C |
| Merge sort (top-down / bottom-up) | O(n log n) | O(log n) / O(1) |
| Insertion sort | O(n²) | O(1) |
| Copy with random pointer | O(n) | O(n) map / O(1) weave |
| LRU / LFU / All O(1) ops | O(1) | O(capacity) |

### Phrasing → technique

| The problem says… | Reach for |
|---|---|
| "the head may be removed / may change" | **dummy head**, return `dummy.next` |
| "reverse", "in groups of k", "swap pairs" | prev/cur/next + count the group first |
| "middle", "half", "second half" | fast & slow — decide *which* middle |
| "nth from the end", "one pass" | fixed-gap two pointers from the dummy |
| "cycle", "does it repeat forever" | Floyd; `x = z` for the entry point |
| "palindrome", "reorder", "L0→Ln→L1" | split at first middle + reverse + weave |
| "merge", "k sorted lists" | dummy + `tail.next = a or b`; heap or D&C |
| "sort in O(n log n)" / "…and O(1) space" | top-down / bottom-up merge sort |
| "keep relative order while regrouping" | two dummy chains, stitch, null-terminate |
| "clone a self-referential structure" | old→new map, or weave for O(1) space |
| "do these two lists meet" | two-pointer switch (`pa = pa.next if pa else b`) |
| "O(1) get and O(1) evict/reorder" | hash map + doubly linked list + sentinels |
| "unknown length, pick uniformly at random" | reservoir sampling |
| "rotate by k" | close the ring, `k %= n`, reopen |

---

## 13. Google-favourite problems (basic → hard)

**Basic — build the reflexes (do all of these before anything else)**
1. Reverse Linked List (LC 206) — prev/cur/next. The single most-asked warm-up.
2. Middle of the Linked List (LC 876) — fast & slow; note it wants the *second* middle.
3. Merge Two Sorted Lists (LC 21) — dummy + `tail.next = a or b`.
4. Remove Linked List Elements (LC 203) — the canonical "why you need a dummy".
5. Remove Duplicates from Sorted List (LC 83) — no dummy needed; know why.
6. Linked List Cycle (LC 141) — Floyd, identity comparison.
7. Delete Node in a Linked List (LC 237) — copy-the-successor trick; explain the tail case.
8. Palindrome Linked List (LC 234) — mid + reverse + compare + restore.
9. Intersection of Two Linked Lists (LC 160) — the switch trick; prove termination.
10. Design Linked List (LC 707) — sentinel + size counter.

**Core — the ones that actually get asked on-site**
11. Remove Nth Node From End of List (LC 19) — one pass, gap from the dummy.
12. Linked List Cycle II (LC 142) — `x = z`; be ready to derive it.
13. Reverse Linked List II (LC 92) — sublist reversal by head-insertion.
14. Swap Nodes in Pairs (LC 24) — k-group with k = 2.
15. Odd Even Linked List (LC 328) — by position; remember `even_head`.
16. Partition List (LC 86) — two chains; `ge.next = None` is the whole problem.
17. Remove Duplicates from Sorted List II (LC 82) — dummy + skip-run, `prev` frozen.
18. Rotate List (LC 61) — `k %= n`, close the ring, reopen.
19. Add Two Numbers (LC 2) — carry loop `while l1 or l2 or carry`.
20. Add Two Numbers II (LC 445) — stacks, build by push-front.
21. Reorder List (LC 143) — split + reverse + weave; three sub-skills in one.
22. Split Linked List in Parts (LC 725) — `divmod`, bigger parts first.
23. Insert into a Sorted Circular Linked List (LC 708) — the wrap-point case.
24. Swapping Nodes in a Linked List (LC 1721) — swap *values* with the gap technique;
    the follow-up "swap the nodes instead" is the real question.
25. Merge In Between Linked Lists (LC 1669) — walk to `a-1` and `b+1`, splice; pure
    pointer bookkeeping.
26. Convert Binary Search Tree to Sorted Doubly Linked List (LC 426) — in-order relink
    (`bst.md`).
27. Flatten Binary Tree to Linked List (LC 114) — preorder, Morris-style, O(1) space.
28. Linked List Random Node (LC 382) — reservoir sampling + the "just materialise it"
    trade-off.
29. Insertion Sort List (LC 147) — dummy + scan for the insertion point.
30. Design Browser History (LC 1472) — DLL vs array-with-a-cursor; discuss both.

**Hard — the differentiators**
31. Merge k Sorted Lists (LC 23) — heap **and** divide-and-conquer; compare them.
32. Sort List (LC 148) — merge sort; then the O(1)-space bottom-up follow-up.
33. Reverse Nodes in k-Group (LC 25) — count-then-reverse. *The* Google linked-list hard.
34. Copy List with Random Pointer (LC 138) — map version, then the O(1) weave.
35. Flatten a Multilevel Doubly Linked List (LC 430) — DFS with an explicit stack.
36. LRU Cache (LC 146) — dict + DLL + sentinels. Expect it in a design round.
37. LFU Cache (LC 460) — freq buckets + `min_freq`; the O(1)-amortised argument matters.
38. All O(1) Data Structure (LC 432) — sorted DLL of count buckets.
39. Design Skiplist (LC 1206) — randomised levels; know why Redis uses it.
40. Find the Duplicate Number (LC 287) — an *array* problem solved as a cycle; the
    clearest demonstration that you understand Floyd rather than memorised it.
41. Reverse Alternating k-Groups — the "did you actually understand LC 25" follow-up.
42. Sort a nearly-sorted (k-away) linked list — heap of size k over a list (`heaps.md`).

---

## 14. Quiz

**Q1.** Why does a dummy head remove almost every edge case, in one sentence?

<details><summary>Answer</summary>
Because it guarantees **every real node has a predecessor**, so "insert/delete at the
head" becomes the same code as "insert/delete in the middle" — and the only cost is
remembering to return `dummy.next` rather than `head`.
</details>

**Q2.** In Floyd's algorithm, why does resetting one pointer to `head` and walking both
one step at a time land exactly on the cycle entrance?

<details><summary>Answer</summary>
With `x` = head→entrance, `y` = entrance→meeting point, `z` = meeting point→entrance,
and cycle length `C = y + z`: slow walked `x + y`, fast walked `2(x + y) = x + y + kC`,
so `x + y = kC` and `x = kC − y = (k−1)C + z`. Walking `x` from the head and `z` (plus
whole laps) from the meeting point therefore arrive at the entrance simultaneously.
</details>

**Q3.** You write `slow, fast = head, head` and `while fast and fast.next` to find the
middle so you can split the list for merge sort. What breaks?

<details><summary>Answer</summary>
On a 2-node list `slow` ends at node 2, so the split is `[node1, node2]` and `[]` — the
recursion never shrinks and you get infinite recursion. Use `fast = head.next` (or the
guard `while fast.next and fast.next.next`) so `slow` stops at the **end of the first
half**.
</details>

**Q4.** In Reverse Nodes in k-Group, why seed the reversal with `prev = group_next`
instead of `prev = None`?

<details><summary>Answer</summary>
The first node of the group becomes the group's **tail** and must point at the first
node after the group. Seeding `prev` with `group_next` makes that link happen inside the
normal loop; seeding with `None` would leave the group null-terminated and require a
separate fix-up (and if you forget it, the rest of the list is silently dropped).
</details>

**Q5.** Copy List with Random Pointer: what exactly does the weaving trick replace, and
what must you not forget at the end?

<details><summary>Answer</summary>
It replaces the `old_node -> new_node` hash map: after weaving, `copy_of(u)` is simply
`u.next`, so `u.random.next` is the copy that `u.next.random` should point at. At the
end you must **unweave both lists** — restore every original `next` *and* terminate the
copy's tail — otherwise you return a correct copy attached to a corrupted input.
</details>

**Q6.** Why is the intersection two-pointer switch guaranteed to terminate when the
lists do **not** intersect?

<details><summary>Answer</summary>
Each pointer switches lists at most once, so both traverse exactly `p + q + 1`
positions, where the final position is `None` for both. The loop condition
`pa is not pb` becomes `None is not None` → false, the loop exits, and `None` is
returned. The `if pa else b` (rather than `if pa.next else b`) is what makes the two
path lengths equal.
</details>

**Q7.** Your LRU nodes store only `val`. What goes wrong?

<details><summary>Answer</summary>
Eviction starts from `tail.prev` — it finds a **node**, but the dict is keyed by `key`,
so you cannot delete the map entry without an O(n) reverse lookup. The map then grows
without bound and stale keys return dead nodes. Every LRU node must carry its own key.
</details>

**Q8.** Merge sort on an array costs O(n) extra space, but on a linked list it costs
O(1) for the merge. Why — and why is quicksort the wrong choice here?

<details><summary>Answer</summary>
Array merging must write the interleaved result somewhere, because you cannot insert
into the middle of contiguous memory; list merging just **relinks existing nodes**, so
only pointers move. Quicksort loses because a list has no O(1) random access (no
median-of-three pivot → O(n²) on sorted input, O(n) recursion depth) and its usual
advantage, cache-friendly in-place swapping, does not exist when every access is a
pointer chase.
</details>

---

## 15. Mini project — a text-editor undo/redo buffer with an LRU render cache

Two linked-list structures that mirror real editor internals:

1. **`UndoBuffer`** — a doubly linked list of commands with a cursor. `undo` walks the
   cursor left, `redo` walks it right, and a new edit **truncates the redo branch** (one
   pointer assignment) and evicts the oldest entry when the history exceeds capacity
   (one unlink at the front). Exactly the browser-history + LRU patterns combined.
2. **`RenderCache`** — an LRU cache keyed by document version, so re-rendering an
   unchanged document is free. Reuse the `LRUCache` from §8.1.

```python
class Command:
    """An edit that knows how to apply and undo itself (the Command pattern)."""

    __slots__ = ("pos", "text", "insert", "prev", "next")

    def __init__(self, pos, text, insert=True):
        self.pos, self.text, self.insert = pos, text, insert
        self.prev = self.next = None

    def apply(self, doc):
        if self.insert:
            return doc[:self.pos] + self.text + doc[self.pos:]
        return doc[:self.pos] + doc[self.pos + len(self.text):]

    def invert(self, doc):                # exactly apply() with the flag flipped
        if self.insert:
            return doc[:self.pos] + doc[self.pos + len(self.text):]
        return doc[:self.pos] + self.text + doc[self.pos:]


class UndoBuffer:
    """Bounded undo/redo history: doubly linked list + cursor + sentinels."""

    def __init__(self, capacity=100):
        self.cap = capacity
        self.head = Command(0, "")        # sentinel = "empty document" state
        self.cursor = self.head           # last APPLIED command
        self.size = 0

    def record(self, cmd):
        self.cursor.next = cmd            # truncates the redo branch implicitly
        cmd.prev = self.cursor
        self.cursor = cmd
        self.size += 1
        while self.size > self.cap:       # evict the OLDEST command
            oldest = self.head.next
            self.head.next = oldest.next
            if oldest.next:
                oldest.next.prev = self.head
            self.size -= 1

    def can_undo(self):
        return self.cursor is not self.head

    def can_redo(self):
        return self.cursor.next is not None


class TextEditor:
    def __init__(self, capacity=100):
        self.doc = ""
        self.history = UndoBuffer(capacity)
        self.version = 0
        self.render_cache = LRUCache(8)   # §8.1 — keyed by version

    def insert(self, pos, text):
        cmd = Command(pos, text, insert=True)
        self.doc = cmd.apply(self.doc)
        self.history.record(cmd)
        self.version += 1
        return self.doc

    def delete(self, pos, length):
        cmd = Command(pos, self.doc[pos:pos + length], insert=False)
        self.doc = cmd.apply(self.doc)
        self.history.record(cmd)
        self.version += 1
        return self.doc

    def undo(self):
        if not self.history.can_undo():
            return self.doc
        cmd = self.history.cursor
        self.doc = cmd.invert(self.doc)
        self.history.cursor = cmd.prev    # cursor moves left; the node stays for redo
        self.version += 1
        return self.doc

    def redo(self):
        if not self.history.can_redo():
            return self.doc
        cmd = self.history.cursor.next
        self.doc = cmd.apply(self.doc)
        self.history.cursor = cmd
        self.version += 1
        return self.doc

    def render(self):
        """Expensive formatting, memoised by document version."""
        cached = self.render_cache.get(self.version)
        if cached != -1:
            return cached
        rendered = f"[v{self.version}] " + self.doc.upper()
        self.render_cache.put(self.version, rendered)
        return rendered


if __name__ == "__main__":
    ed = TextEditor(capacity=5)
    ed.insert(0, "hello")
    ed.insert(5, " world")
    print(ed.doc)          # hello world
    print(ed.undo())       # hello
    print(ed.redo())       # hello world
    ed.delete(0, 6)
    print(ed.doc)          # world
    print(ed.undo())       # hello world
    print(ed.render())     # [v6] HELLO WORLD  (cached on the second call)
```

**Extensions to try**
- Add **coalescing**: merge consecutive single-character inserts into one command if
  they happen within 500 ms, the way real editors do. (Touch the tail command instead
  of appending — trivial with a DLL, awkward with an immutable stack.)
- Swap the bounded history for a **circular buffer of commands** and compare the code.
- Make the document itself a **gap buffer** or a **piece table** (a linked list of
  spans!) instead of a Python string, and watch `insert` go from O(n) to O(1).
- Add **branching history** (a tree, not a list) — undo, edit, then recover the
  discarded redo branch. This is what Vim's `:undolist` does.
- Persist commands to a log and rebuild the document by replaying the linked list —
  now you have event sourcing.
