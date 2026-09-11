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

## 12. Mini project — "Meeting Scheduler" CLI

Build a scheduler exercising all three templates:
1. add_meeting(start, end)
2. merged_busy_times()          # Template A
3. rooms_needed()               # Template B
4. max_non_overlapping()        # Template C
5. free_slots(day_start, day_end)  # gaps
