# Interval Problems — Complete Guide

> Google DSA prep notes. Category: Arrays / Intervals (no DP).

## 1. What is an "interval"?

An interval is a pair `[start, end]` representing a continuous range on a number
line — a meeting from 9:00 to 10:00, a booked room from day 3 to day 7, a covered
road segment. Almost every interval problem asks one of four questions:

1. Do two intervals overlap? (and how do I merge them)
2. How many intervals are active at the same time? (max concurrency)
3. What's the minimum number of things I need to cover / remove / schedule?
4. Where does a new interval fit among existing ones?

~90% of interval problems reduce to one of two templates: *sort-then-sweep* or
*two separate sorted event lists*.

---

## 2. The most important idea: overlap condition

Two intervals `A = [a1, a2]` and `B = [b1, b2]` overlap iff:

    a1 <= b2  AND  b1 <= a2

Plain English: each one starts before the other ends.

No overlap when one is entirely left of the other: `a2 < b1` or `b2 < a1`.

Whether "touching" endpoints (`[1,2]` and `[2,3]`) count as overlapping depends on
the problem — clarify, then use `<` vs `<=` consistently.

---

## 3. Universal first step: SORT

- Sort by START  → processing left to right, merging/chaining (merge, insert, max concurrency).
- Sort by END    → greedy "keep max / remove min" choices (non-overlapping, scheduling).

Rule of thumb:
- "Merge / count overlaps" → sort by start.
- "Greedy pick max non-overlapping" → sort by end.

---

## 3a. What do "sort by start" and "sort by end" really mean?

The choice is not random. Sorting gives you a guarantee about what has already been
"resolved" and what still remains. The question is: which endpoint tells you that
past intervals are no longer relevant?

### Sort by START = sweep the timeline left to right

If you sort intervals by their left edge, then after you process interval `I`, every
remaining interval starts at or after `I.start`.

That means: once you move past a point in time, the left side is frozen. Nothing in
future can start before the current position and unexpectedly affect the past.

This is exactly what you want when you are:
- merging overlapping ranges,
- counting how many ranges overlap at the same time,
- finding gaps between active intervals,
- inserting a new interval into a sorted list.

Visual idea:

    sort by start

    time:  0   1   2   3   4   5   6   7   8
         [0,2]        [3,5]        [6,8]
            ●──────●        ●──────●        ●──────●

    After you process [0,2], the next interval starts at 3 or later.
    So the region before 2 is fully settled. Nothing can "reach backward".

This is why merge works in one pass:

    sorted by start
    [1,4], [2,5], [6,8], [9,10]

    keep current block = [1,4]
    [2,5] starts before 4 → overlap → expand to [1,5]
    [6,8] starts after 5 → new block
    [9,10] starts after 8 → new block

The invariant is: once a block is closed, all future starts are to the right, so it
will never need to be revisited.

### Sort by END = choose the interval that frees itself earliest

If you sort by the right edge, then when you process interval `I`, it is the one
that ends earliest among all intervals that are still pending.

This matters when you are making a greedy choice:
- keep the most non-overlapping intervals,
- remove the fewest intervals,
- cover the line with the fewest points/arrows.

The key greedy idea is:

    among all valid choices, pick the one that ends earliest,
    because it leaves the most room for the rest.

Visual idea:

    intervals:
    A = [1,10]
    B = [2,3]
    C = [4,5]
    D = [6,7]

    If you greedily take A first (because it starts earliest), you lose everything.
    If you take the earliest ending first, you keep B, C, D.

    sort by end:
    B[2,3], C[4,5], D[6,7], A[1,10]

    keep B → prev_end = 3
    C starts at 4 >= 3 → keep C → prev_end = 5
    D starts at 6 >= 5 → keep D → prev_end = 7
    A starts at 1 < 7 → skip it

This is why sort-by-end is the correct order for the greedy family:

- maximum non-overlapping intervals,
- minimum removals,
- minimum arrows to burst balloons,
- activity selection style problems.

The invariant is: the current interval ends before all remaining intervals, so it is
always the safest choice to lock in first.

### The easiest mental test

Ask one question:

    Am I describing the timeline, or am I choosing a subset of it?

- If I am describing the timeline (merge, count, gaps, rooms, insert) → sort by START.
- If I am choosing a subset (keep max, remove minimum, cover with minimum) → sort by END.

### A compact visual summary

    SORT BY START                                      SORT BY END
    ---------------------------------------------------------
    Think: "as time moves forward"                     Think: "which one frees itself first?"
    Useful for: merge, overlap count, gaps, rooms     Useful for: max keep, min remove, greedy cover
    Guarantee: future starts are to the right         Guarantee: current end is earliest among remaining

    [1,4] [2,5] [6,8] [9,10]                         [2,3] [4,5] [6,7] [1,10]
    sorted by start                                  sorted by end

    Now you can sweep once and merge/count            Now you can greedily keep the earliest enders

### The villain interval that proves the difference

A long interval like [1,10] is the classic trap:

    [1,10]
      [2,3]   [5,6]   [8,9]

If you sort by start, [1,10] appears early and looks like the obvious first pick,
which is what greedy would wrongly choose.

If you sort by end, [2,3], [5,6], [8,9], [1,10] appear in the right order:

    first take [2,3], then [5,6], then [8,9]
    reject [1,10] because it overlaps too much

This is exactly why greedy interval problems sort by end.

### The real rule to remember

- Start-order gives a safe way to **build the timeline**.
- End-order gives a safe way to **select greedily**.

Both are valid because they create an invariant that lets us process intervals only
once without revisiting the past.

---

## 3b. The biggest trap: whole-interval conflict vs one-day event scheduling

This is the most common confusion in interval problems.

### Case 1: Attending an interval blocks the whole range

Classic interval problems assume that if an interval is `[start, end]`, then once you
attend it, the full span is occupied. Two intervals conflict if they share any time.

Examples:
- Meeting Rooms
- Non-overlapping Intervals
- Remove Covered Intervals
- Minimum removals / maximum keeps under overlap

This is the exact problem family where sort-by-end greedy works:

    if I keep interval A, I lose its whole time stretch
    so I want the earliest ending interval first

This is why an interval problem like:

    [1,10], [2,3], [4,5], [6,7]

can be solved by sorting by end and keeping the earliest enders. The whole interval
is a unit of conflict.

### Case 2: Attending an interval only consumes one day inside the range

This is a different model. Here, an event `[start, end]` does not block the entire
range; it only requires one chosen day in that range. You can pick any day
`d` where `start <= d <= end`, and you can only attend one event per day.

This is the problem family behind:
- LC 1353 — Maximum Number of Events That Can Be Attended
- job scheduling with per-day capacity
- interval-selection with a time grid

Important difference:

    [1,10], [1,10], [1,10], [1,10]

In the classic whole-range model, this is 1 because all four overlap heavily.
In the one-day-per-event model, you can attend 4 events on days 1, 2, 3, 4.

That means the whole-range greedy does not apply.

### Why the classic greedy fails for one-day events

If you do the classic logic:

    sort by end and keep if start >= prev_end

then the interval `[1,10]` would block everything else, which is false because the
event only needs one day. Here, the event is not a "whole bar" — it is a "single
slot inside a window".

The correct mental model is:

    I am not choosing intervals.
    I am choosing days.

Each day has capacity 1. Among all events that have started and not expired, choose
the one with the earliest end day and attend it today.

This is a min-heap / earliest-deadline-first idea.

### The exact distinction in one sentence

- Whole interval conflict → “I occupy the whole range” → sort by END, greedy keep
- One-day event scheduling → “I choose one day in the range” → sort by START, day-scan + min-heap of ends

### Visual intuition

Classic whole-range occupancy:

    [1,10]
       [2,3]  [4,5]  [6,7]

This is one big conflict region. If you keep [2,3], [4,5], [6,7], you are still
inside the same overlap cluster, but you are choosing a best subset.

One-day event occupancy:

    [1,10]    [1,10]    [1,10]

    day 1: attend one of them
    day 2: attend another
    day 3: attend another

The "event range" is just a window of possible days, not a permanent claim on the
entire segment.

### Decision rule for interviews

Ask this question first:

    Does attending an interval consume the entire interval, or just one day inside it?

- Entire interval → classic interval greedy, sort by end
- One day inside it → day-by-day scheduling, sort by start + heap of end times

This distinction is what separates LC 435-style problems from LC 1353-style
problems.

---

## 4. Template A — Sort by start, sweep & merge

    sort intervals by start
    result = [ intervals[0] ]
    for interval in intervals[1:]:
        last = result[-1]
        if interval.start <= last.end:        # overlap → merge
            last.end = max(last.end, interval.end)
        else:                                  # gap → new segment
            result.append(interval)
    return result

Invariant: after sorting by start, any overlapping interval must start within the
current merged block. Anything starting later than last.end can never overlap what
we've passed.

---

## 5. Template B — Two sorted event lists (max concurrency / sweep line)

For "max number of intervals overlapping at once" (meeting rooms, platforms, load):

    starts = sorted(all start times)
    ends   = sorted(all end times)
    i = j = active = max_active = 0
    while i < n:
        if starts[i] < ends[j]:   # a meeting begins before the next ends
            active += 1
            max_active = max(max_active, active)
            i += 1
        else:                     # something frees up
            active -= 1
            j += 1
    return max_active

Equivalent clean variant: min-heap of end times.

---

## 6. Template C — Greedy by end (scheduling / removal)

For "max non-overlapping intervals" or "min removals to make non-overlapping":

    sort intervals by end
    count = 0
    prev_end = -infinity
    for interval in intervals:
        if interval.start >= prev_end:   # doesn't overlap last kept
            count += 1
            prev_end = interval.end
    return count   # kept; removals = n - count

Correctness (exchange argument): the interval ending earliest is always safe to
include first; it leaves the most room for the rest. Provably optimal.

---

## 7. Google-favorite problems (basic → advanced)

Basic
1. Merge Intervals (LC 56) — Template A. Foundational.
2. Insert Interval (LC 57) — sorted input; insert + re-merge (before/overlap/after).
3. Meeting Rooms (LC 252) — can attend all? any overlap after sort by start.

Core (very frequent at Google)
4. Meeting Rooms II (LC 253) — Template B. Min rooms = max concurrency.
5. Non-overlapping Intervals (LC 435) — Template C. Min removals.
6. Interval List Intersections (LC 986) — two sorted lists, two-pointer.

Advanced
7. Employee Free Time (LC 759) — merge all, find gaps.
8. Min Arrows to Burst Balloons (LC 452) — Template C in disguise.
9. My Calendar I / II / III (LC 729 / 731 / 732) — booking; III = streaming max concurrency.
10. Car Pooling (LC 1094) — difference array / sweep.

---

## 8. Worked examples

### Merge Intervals (Template A)

```python
from typing import List

class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        intervals.sort(key=lambda x: x[0])
        merged = [intervals[0]]
        for start, end in intervals[1:]:
            if start <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], end)
            else:
                merged.append([start, end])
        return merged
```

Time O(n log n), space O(n). Watch nested intervals: use `max` for the end.

### Meeting Rooms II (Template B, heap)

```python
import heapq
from typing import List

class Solution:
    def minMeetingRooms(self, intervals: List[List[int]]) -> int:
        if not intervals:
            return 0
        intervals.sort(key=lambda x: x[0])
        min_heap = []                     # end times of active meetings
        for start, end in intervals:
            if min_heap and min_heap[0] <= start:
                heapq.heappop(min_heap)   # reuse earliest-freeing room
            heapq.heappush(min_heap, end)
        return len(min_heap)
```

Time O(n log n), space O(n).

---

## 9. Common pitfalls

- Wrong sort key (merge → start; greedy schedule → end).
- Off-by-one on touching endpoints (`<` vs `<=`) — clarify first.
- Mutating input when it should be preserved.
- Forgetting nested intervals — always `end = max(last_end, cur_end)`.
- Empty input / single interval before indexing.
- Integer overflow / large coords (matters outside Python; diff arrays).

---

## 10. Decision cheat-sheet

    "merge / combine overlapping"          → sort by start, sweep (A)
    "can attend all / any overlap?"        → sort by start, check neighbor
    "min rooms / platforms / max load"     → Template B (two lists or heap)
    "max non-overlapping / min removals"   → sort by end, greedy (C)
    "min arrows / min taps to cover"       → sort by end, greedy (C)
    "intersection of two sorted lists"     → two pointers (LC 986)
    "free time / gaps"                     → merge all, then scan gaps
    "streaming bookings / k-th overlap"    → sweep line with sorted map / diff array

---

## 11. Quiz

1. `[[1,4],[2,5],[7,9]]` after Merge Intervals? → `[[1,5],[7,9]]`.
2. Meeting Rooms II: why compare against smallest end? → heap top is the room most
   likely free; correct reuse candidate.
3. Non-overlapping Intervals: why sort by end? → keeping earliest-ending leaves max
   room; greedy optimal.
4. `[1,3]` and `[3,5]` overlap? → depends on `<` vs `<=`; clarification question.
5. Min arrows to burst balloons uses which template? → Template C (greedy by end).

---

## 12. Must-know LeetCode interval problems

### Highest priority (Google / interviews / classic pattern)
1. LC 56 — Merge Intervals
2. LC 57 — Insert Interval
3. LC 252 — Meeting Rooms
4. LC 253 — Meeting Rooms II
5. LC 435 — Non-overlapping Intervals
6. LC 986 — Interval List Intersections
7. LC 452 — Minimum Number of Arrows to Burst Balloons
8. LC 759 — Employee Free Time
9. LC 1094 — Car Pooling
10. LC 730 / 731 / 732 — My Calendar I / II / III

### Very important follow-ups
11. LC 1288 — Remove Covered Intervals
12. LC 1272 — Remove Interval
13. LC 616 — Add Bold Tag in String
14. LC 1235 — Maximum Profit in Job Scheduling
15. LC 1911 — Maximum Alternating Subsequence Sum
16. LC 2008 — Maximum Earnings From Taxi

### Common practice / pattern drills
17. LC 228 — Summary Ranges
18. LC 352 — Data Stream as Disjoint Intervals
19. LC 715 — Range Module
20. LC 850 — Rectangle Area II (advanced interval-like sweep)
21. LC 56 + 57 + 986 + 759 + 452 — the core set to master in order

### Quick pattern mapping
- Merge / overlap / insert → Template A
- Max concurrency / rooms / load → Template B
- Keep max / remove min / cover with minimum → Template C

---

## 13. Mini project — "Meeting Scheduler" CLI

Build a scheduler exercising all three templates:
1. add_meeting(start, end)
2. merged_busy_times()          # Template A
3. rooms_needed()               # Template B
4. max_non_overlapping()        # Template C
5. free_slots(day_start, day_end)  # gaps
