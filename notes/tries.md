# Tries — Complete Guide

> Google DSA prep notes. Category: Tries (prefix trees), bit tries, Aho-Corasick.
> Companion to `strings.md` (KMP / Z / suffix arrays / rolling hash) and `graphs.md`
> (a trie *is* a rooted DAG-free tree, and DFS/backtracking over it is §5's core skill).
> Segmentation problems here cross-reference `dp.md`.

## 1. What a trie is and why it exists

A **trie** (from re*trie*val, pronounced "try") is a tree in which **the path from the
root to a node spells a string**. Nodes hold no key — the *edges* do. A boolean
`is_end` flag marks nodes where a stored word finishes.

```
insert: "car", "cat", "cattle", "do"
                (root)
                /     \
              c        d
              |        |
              a        o*        * = is_end
             / \
            r*  t*
                 |
                 t
                 |
                 l
                 |
                 e*
```

Two words that share a prefix **share the physical path** for it. That single fact is
the whole value proposition.

### Trie vs hash set — the comparison to say out loud

| Operation | Hash set | Trie |
|---|---|---|
| `insert` / `search` exact word | O(L) (hash the L chars) | O(L) |
| `startsWith("goo")` | **O(n·L)** — scan everything | **O(L)** |
| all words with prefix `p` | O(n·L) | O(L + output) |
| iterate in **sorted order** | O(n log n) sort | O(total chars), free |
| memory for `["aaaa...a" × 1000 variants]` | 1000 full copies | shared prefix, one copy |
| worst case | hash collisions | none — deterministic |
| "does *some* prefix of my text hit the dictionary?" | O(L) lookups × L | **one O(L) walk** |

So: exact membership alone → **use a set**. The trie earns its keep the moment the
question involves a *prefix*, an *ordering*, or *many overlapping lookups sharing a
prefix* (the grid-DFS case in §5, where one walk answers for the whole dictionary).

**Mental trigger:** reach for a trie when you see
- the word **"prefix"** anywhere (common prefix, prefix score, prefix count),
- **autocomplete / search suggestions / T9 / spell-check**,
- **"given a dictionary of words, search a board / grid / stream / long text"**,
- **"longest / shortest word buildable from other words"**, segmentation,
- **"maximum XOR"** — a number is a string over the alphabet `{0,1}` (§6).

---

## 2. Three implementation styles

### Style A — `TrieNode` class with a dict of children (default choice)

```python
class TrieNode:
    __slots__ = ("children", "is_end", "word_count", "prefix_count")
    def __init__(self):
        self.children = {}      # char -> TrieNode
        self.is_end = False
        self.word_count = 0     # how many times this exact word was inserted
        self.prefix_count = 0   # how many words pass through this node
```
Readable, unbounded alphabet (unicode, words-as-symbols), memory ∝ *distinct edges*.
**Use this** unless you have a measured reason not to.

### Style B — array of 26 children (fastest constant factor)

```python
class ArrayNode:
    __slots__ = ("child", "is_end")
    def __init__(self):
        self.child = [None] * 26            # index = ord(c) - ord('a')
        self.is_end = False
```
Child lookup is an array index, no hashing — noticeably faster in C++/Java. Cost: every
node pays 26 slots even if it has one child, so a sparse trie of long unique strings
blows up (26 pointers × 8 bytes = 208 B/node). **Use when** the alphabet is small and
fixed *and* the trie is dense (Word Search II in C++, competitive programming).

### Style C — nested plain dict + `'#'` end marker (fastest to *write*)

```python
def build(words):
    root = {}
    for w in words:
        node = root
        for c in w:
            node = node.setdefault(c, {})   # creates the child if missing
        node['#'] = True                    # sentinel key = end of word
    return root
```
No classes, ~5 lines, and `'#' in node` / `c in node` read naturally. **Use this in a
45-minute interview** unless you need per-node counters — then Style A. The sentinel can
carry a payload instead of `True` (`node['$'] = word`, `node['#'] = index`), which §5
and §7 exploit heavily.

*Recommendation:* Style C for speed of writing → Style A when the problem needs counts,
deletion, or per-node metadata → Style B only for tight-loop performance in a compiled
language.

---

## 3. Template A — Core trie

```python
class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        node.prefix_count += 1
        for c in word:
            if c not in node.children:
                node.children[c] = TrieNode()
            node = node.children[c]
            node.prefix_count += 1
        node.is_end = True
        node.word_count += 1

    def _find(self, s: str):
        """Node reached by walking s, or None."""
        node = self.root
        for c in s:
            node = node.children.get(c)
            if node is None:
                return None
        return node

    def search(self, word: str) -> bool:
        node = self._find(word)
        return node is not None and node.is_end      # is_end, NOT "node exists"

    def starts_with(self, prefix: str) -> bool:
        return self._find(prefix) is not None

    def count_words_equal_to(self, word: str) -> int:
        node = self._find(word)
        return node.word_count if node else 0

    def count_words_starting_with(self, prefix: str) -> int:
        node = self._find(prefix)
        return node.prefix_count if node else 0
```
**Time / Space:** every op O(L) where L = len(word); insert allocates ≤ L nodes.
Total space O(total characters) nodes, each with an O(alphabet) map in the worst case →
O(total_chars × Σ) bytes for the array style, O(distinct_edges) for the dict style.

### Delete — the part people get wrong

You may only remove a node when **(a)** it has no children and **(b)** it is not the end
of another word. Deleting `"batman"` must not destroy `"bat"`; deleting `"bat"` when
`"batman"` exists must only clear a flag.

```python
    def delete(self, word: str) -> bool:
        """Remove one occurrence. Returns False if the word wasn't stored."""
        def helper(node, i):
            # returns (did_delete, may_prune_this_node)
            if i == len(word):
                if node.word_count == 0:
                    return False, False               # word absent -> touch nothing
                node.word_count -= 1
                node.is_end = node.word_count > 0
                return True, (not node.children and not node.is_end)
            c = word[i]
            child = node.children.get(c)
            if child is None:
                return False, False
            deleted, prune_child = helper(child, i + 1)
            if not deleted:
                return False, False                   # bail out, no counters touched
            child.prefix_count -= 1
            if prune_child:
                del node.children[c]                  # safe: leaf, not a word end
            return True, (not node.children and not node.is_end)

        deleted, _ = helper(self.root, 0)
        if deleted:
            self.root.prefix_count -= 1
        return deleted
```
The recursion does the "check first, mutate on the way back up" dance for free: the
deepest frame decides whether the word exists, and pruning happens during unwinding, so
a failed delete leaves the trie untouched.

**Time / Space:** O(L) time, O(L) recursion stack.

```python
t = Trie()
for w in ["bat", "batman"]: t.insert(w)
t.delete("batman")
assert t.search("bat") and not t.search("batman")
assert t._find("batm") is None            # the dead tail was pruned
```

### Iterate all words in sorted order

```python
    def words(self):
        out, buf = [], []
        def dfs(node):
            if node.is_end:
                out.append("".join(buf))
            for c in sorted(node.children):        # sorted keys => lexicographic order
                buf.append(c)
                dfs(node.children[c])
                buf.pop()                          # backtrack: undo the char
        dfs(self.root)
        return out

    def words_with_prefix(self, prefix, limit=None):
        node = self._find(prefix)
        if node is None:
            return []
        out, buf = [], list(prefix)
        def dfs(n):
            if limit is not None and len(out) >= limit:
                return
            if n.is_end:
                out.append("".join(buf))
            for c in sorted(n.children):
                if limit is not None and len(out) >= limit:
                    return
                buf.append(c); dfs(n.children[c]); buf.pop()
        dfs(node)
        return out
```
**Time / Space:** O(nodes_visited × log Σ) for the sorting, O(output). With a
26-array you get sorted order for free by iterating indices 0..25 — one reason Style B
is nice for "print the dictionary".

**Mental trigger:** "return words in lexicographic order" / "smallest word such that…"
→ DFS a trie visiting children in sorted order; the *first* hit is the answer.

---

## 4. Template B — Wildcard and fuzzy search

### Design Add and Search Words (LC 211) — `.` matches any character

Exact characters walk down one edge; a `.` branches into **all** children. That is a
DFS with the string index as depth.

```python
class WordDictionary:
    def __init__(self):
        self.root = TrieNode()

    def addWord(self, word):
        node = self.root
        for c in word:
            node = node.children.setdefault(c, TrieNode())
        node.is_end = True

    def search(self, word):
        def dfs(node, i):
            if i == len(word):
                return node.is_end
            c = word[i]
            if c == '.':                                   # try every branch
                return any(dfs(nxt, i + 1) for nxt in node.children.values())
            nxt = node.children.get(c)
            return nxt is not None and dfs(nxt, i + 1)
        return dfs(self.root, 0)
```
**Time / Space:** O(L) with no dots; worst case (all dots) O(Σ^L) bounded by the number
of trie nodes → O(N) where N = total stored characters. Space O(L) stack.
Note `"b..."` correctly fails against `"bad"`: length must match exactly.

### Implement Magic Dictionary (LC 676) — exactly one substitution

Carry a `used` flag through the DFS. Same length required, so no insert/delete branches.

```python
class MagicDictionary:
    def __init__(self):
        self.root = TrieNode()

    def buildDict(self, words):
        for w in words:
            node = self.root
            for c in w:
                node = node.children.setdefault(c, TrieNode())
            node.is_end = True

    def search(self, word):
        def dfs(node, i, used):
            if i == len(word):
                return used and node.is_end        # 'used' => exactly one change
            for ch, nxt in node.children.items():
                if ch == word[i]:
                    if dfs(nxt, i + 1, used):
                        return True
                elif not used and dfs(nxt, i + 1, True):   # spend the single edit
                    return True
            return False
        return dfs(self.root, 0, False)
```
**Time / Space:** O(L·Σ) amortised — the mismatch branch can only be taken once, so the
search fans out at most L times by Σ. Space O(L).

For *edit distance ≤ k* (insert/delete allowed), add two more branches: skip a trie edge
(insertion) or skip a word char (deletion), each decrementing the budget. That is the
classic "fuzzy dictionary search"; the trie prunes entire subtrees the moment the budget
is exhausted.

**Why a trie beats scanning the dictionary:** scanning is O(n·L) *per query* and cannot
prune. The trie shares the comparison work across all words with a common prefix — after
matching `"appl"` you have simultaneously matched it against every word starting with
`"appl"`, and every word not starting with it has already been eliminated for free.

**Mental trigger:** "wildcard / one typo / fuzzy match against a dictionary,
many queries" → trie + DFS with a budget parameter.

---

## 5. Template C — Trie + DFS/backtracking on a grid (the Google question)

### Word Search II (LC 212)

Naive: run Word Search I once per word → O(W · R·C·4^L). The trie inverts the loop:
**walk the board once and the dictionary simultaneously.** At each cell you are at one
trie node; a neighbour is only worth visiting if its letter is a child of that node.

```python
def find_words(board, words):
    root = {}
    for w in words:                       # Style C trie; payload = the word itself
        node = root
        for c in w:
            node = node.setdefault(c, {})
        node['$'] = w                     # OPTIMISATION 1: store the word at the leaf

    rows, cols = len(board), len(board[0])
    res = []

    def dfs(r, c, parent):
        ch = board[r][c]
        node = parent[ch]
        word = node.pop('$', None)        # pop => each word reported at most once
        if word is not None:
            res.append(word)

        board[r][c] = '#'                 # mark visited in place (no extra set)
        for nr, nc in ((r+1, c), (r-1, c), (r, c+1), (r, c-1)):
            if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] in node:
                dfs(nr, nc, node)         # the `in node` test IS the pruning
        board[r][c] = ch                  # restore for other start cells

        if not node:                      # OPTIMISATION 2: node is now a dead leaf
            parent.pop(ch)                # delete it so nobody ever walks here again

    for r in range(rows):
        for c in range(cols):
            if board[r][c] in root:
                dfs(r, c, root)
    return res
```

**Optimisation 1 — store the word at the terminal node.** The alternative is carrying a
growing `path` string (or list) down the recursion and `"".join`-ing it on every hit.
Storing `node['$'] = w` costs one pointer and turns word reconstruction into O(1); it
also removes a per-frame string concatenation that is O(L) each and quietly makes the
whole DFS O(L) times slower. Popping it also de-duplicates results with no `set`.

**Optimisation 2 — prune exhausted branches.** After a subtree's last word has been
found and popped, that node's dict is empty; it is a *dead* path that can still be
re-entered from every other start cell, re-exploring the board for words that no longer
exist. Deleting it from its parent shrinks the trie monotonically as the search
progresses. On the adversarial LeetCode test (a board of all `'a'` plus a dictionary of
`"aaaa…a"` variants) this is the difference between TLE and ~100 ms. It is *the* thing
the interviewer is watching for.

**Time / Space:** O(R·C·4^{L_max}) worst case, where L_max is the longest word — but the
trie caps the branching by the dictionary: the DFS can never go deeper or wider than the
trie allows, so in practice it is O(R·C·4·3^{L-1}) with a tiny constant after pruning.
Space O(total_chars) for the trie + O(L) recursion.

**Mental trigger:** "given a **board/grid/matrix** and a **list of words**" — always a
trie. Same shape for: Word Search II, boggle solvers, crossword fill, "count words that
can be typed on this keypad path".

---

## 6. Template D — Bit trie / XOR trie

A 32-bit integer is a string of 32 characters over the alphabet `{0, 1}`, written
**most-significant bit first**. Insert numbers into that binary trie and XOR queries
become greedy walks, because XOR compares bit-by-bit independently and **the high bit
dominates every lower bit combined** (`2^k > 2^k − 1`).

### Reusable `BitTrie`

```python
class BitNode:
    __slots__ = ("child", "count")
    def __init__(self):
        self.child = [None, None]
        self.count = 0                 # numbers passing through (enables deletion)

class BitTrie:
    def __init__(self, bits=32):
        self.B = bits
        self.root = BitNode()

    def insert(self, x, delta=1):
        node = self.root
        node.count += delta
        for i in range(self.B - 1, -1, -1):        # HIGH bit first
            b = (x >> i) & 1
            if node.child[b] is None:
                node.child[b] = BitNode()
            node = node.child[b]
            node.count += delta

    def remove(self, x):
        self.insert(x, -1)

    def max_xor(self, x):
        """Largest x ^ y over stored y."""
        if self.root.count == 0:
            return -1
        node, res = self.root, 0
        for i in range(self.B - 1, -1, -1):
            b = (x >> i) & 1
            want = node.child[1 - b]               # opposite bit => 1 in the XOR
            if want is not None and want.count > 0:
                res |= 1 << i
                node = want
            else:
                node = node.child[b]               # forced to agree; that bit is 0
        return res

    def min_xor(self, x):
        node, res = self.root, 0
        for i in range(self.B - 1, -1, -1):
            b = (x >> i) & 1
            same = node.child[b]                   # same bit => 0 in the XOR
            if same is not None and same.count > 0:
                node = same
            else:
                res |= 1 << i
                node = node.child[1 - b]
        return res

    def count_less_than(self, x, limit):
        """How many stored y satisfy (x ^ y) < limit."""
        node, res = self.root, 0
        for i in range(self.B - 1, -1, -1):
            if node is None:
                break
            b, lb = (x >> i) & 1, (limit >> i) & 1
            if lb == 1:
                same = node.child[b]               # xor bit 0 < limit bit 1 -> all count
                if same is not None:
                    res += same.count
                node = node.child[1 - b]           # keep xor bit = 1, stay tied
            else:
                node = node.child[b]               # must match limit's 0 to stay tied
        return res
```

### Maximum XOR of Two Numbers in an Array (LC 421)

**Intuition.** To maximise `x ^ y` you want a 1 in the highest bit possible. Standing at
bit `i` with `x`'s bit = `b`, the branch you *want* is `1-b`. If any stored number lives
there, take it — no lower bits can ever compensate for losing this one. If not, you are
forced into `b` and this bit contributes 0. Pure greedy, one pass, no backtracking.

```python
def find_maximum_xor(nums):
    trie = BitTrie(32)
    trie.insert(nums[0])
    best = 0
    for x in nums[1:]:
        best = max(best, trie.max_xor(x))   # pair x with the best earlier number
        trie.insert(x)                      # insert after querying -> no self-pairing
    return best

assert find_maximum_xor([3, 10, 5, 25, 2, 8]) == 28     # 5 ^ 25
```
**Time / Space:** O(n · 32) time, O(n · 32) nodes. (The alternative prefix-hashset trick
is also O(32n) but the trie generalises to every variant below.)

### Maximum XOR With an Element From Array (LC 1707) — offline queries

Query `[x, m]` asks for `max(x ^ nums[j])` with `nums[j] ≤ m`. Sort `nums` ascending and
sort the **queries by `m`**, then sweep: before answering a query, insert every number
now ≤ `m`. Each number is inserted once overall.

```python
def maximize_xor(nums, queries):
    nums.sort()
    order = sorted(range(len(queries)), key=lambda i: queries[i][1])
    ans, trie, j = [-1] * len(queries), BitTrie(32), 0
    for qi in order:
        x, m = queries[qi]
        while j < len(nums) and nums[j] <= m:      # monotone pointer, never rewinds
            trie.insert(nums[j]); j += 1
        ans[qi] = trie.max_xor(x)                  # -1 if the trie is still empty
    return ans

assert maximize_xor([0,1,2,3,4], [[3,1],[1,3],[5,6]]) == [3, 3, 7]
```
**Time / Space:** O((n + q) log + (n + q)·32). **Mental trigger:** a constraint of the
form "only elements ≤ m" + an order-independent query → **offline, sort both sides**.

### Count Pairs With XOR in a Range (LC 1803)

Count pairs with `low ≤ x^y ≤ high` = `f(high+1) − f(low)` where `f(t)` counts pairs with
`x^y < t`. `count_less_than` gives `f` for a single `x`; insert as you sweep so each pair
is counted once.

```python
def count_pairs(nums, low, high):
    trie, res = BitTrie(16), 0                     # values ≤ 2·10^4 -> 15 bits is enough
    for x in nums:
        res += trie.count_less_than(x, high + 1) - trie.count_less_than(x, low)
        trie.insert(x)
    return res

assert count_pairs([1, 4, 2, 7], 2, 6) == 6
```
**Time / Space:** O(n·B), O(n·B). The `count` field is what makes this possible — it lets
you accept a whole subtree in O(1) instead of enumerating it.

### Minimum XOR pair

Mirror image: always follow the **same** bit. Note the O(n log n) alternative — sort the
array and check adjacent pairs only, because the minimum XOR pair is always adjacent in
sorted order (they share the longest binary prefix). Say both; the trie version
generalises to "min XOR with a set that changes over time".

```python
def minimum_xor_pair(nums):
    trie = BitTrie(32); trie.insert(nums[0]); best = float('inf')
    for x in nums[1:]:
        best = min(best, trie.min_xor(x)); trie.insert(x)
    return best
```
**Mental trigger:** the word **XOR** together with "maximum / minimum / count pairs"
→ binary trie, walk high bit → low bit, greedy on the opposite (or same) branch.

---

## 7. Template E — Prefix aggregation & autocomplete

### Design Search Autocomplete System (LC 642)

Two designs, and the tradeoff is the actual interview content:

| | Hot-list per node | Heap at query time |
|---|---|---|
| store | every node keeps `{sentence: freq}` for all sentences below it | node keeps only children |
| query | sort/`nsmallest` the small local map → O(m log 3) | DFS the whole subtree, heap of size k → O(S log k) |
| insert | O(L) nodes × 1 dict write = O(L) | O(L) |
| memory | **O(total_chars × distinct sentences below)** — can be O(n·L) worst case | O(total_chars) |
| when | queries ≫ inserts, k small, latency matters (real autocomplete) | memory-bound, huge corpus |

Production systems use the hot-list, but **bounded**: keep only the top ~50 per node and
rebuild offline (see §15). Interview answer: hot-list, then mention the memory cap.

```python
class ANode:
    __slots__ = ("children", "hot")
    def __init__(self):
        self.children = {}
        self.hot = {}                       # sentence -> freq, for sentences below

class AutocompleteSystem:
    def __init__(self, sentences, times):
        self.root, self.counts = ANode(), collections.Counter()
        for s, t in zip(sentences, times):
            self.counts[s] = t
            self._insert(s)
        self.cur, self.buf = self.root, []

    def _insert(self, s):
        node = self.root
        for c in s:
            node = node.children.setdefault(c, ANode())
            node.hot[s] = self.counts[s]    # refresh freq on every node of the path

    def input(self, c):
        if c == '#':                        # end of sentence: commit it
            sentence = "".join(self.buf)
            self.counts[sentence] += 1
            self._insert(sentence)
            self.buf, self.cur = [], self.root
            return []
        self.buf.append(c)
        if self.cur is not None:
            self.cur = self.cur.children.get(c)     # None = dead prefix, stays dead
        if self.cur is None:
            return []
        top = sorted(self.cur.hot.items(), key=lambda kv: (-kv[1], kv[0]))[:3]
        return [s for s, _ in top]          # freq desc, then ASCII asc
```
**Time / Space:** `input` O(m log m) on the local hot-list (O(1) amortised in practice),
O(L) per commit. Keeping `self.cur` incremental means you never re-walk the prefix.
Once `cur` is `None` every further character is also `None` — a real dead-prefix shortcut.

### Search Suggestions System (LC 1268) — top 3 lexicographically

Insert words **in sorted order** and append to each node's list only while it has < 3
entries. Sorted insertion order means the first three arrivals *are* the smallest three.

```python
class SNode:
    __slots__ = ("children", "top")
    def __init__(self):
        self.children, self.top = {}, []

def suggested_products(products, searchWord):
    root = SNode()
    for w in sorted(products):
        node = root
        for c in w:
            node = node.children.setdefault(c, SNode())
            if len(node.top) < 3:
                node.top.append(w)
    res, node = [], root
    for c in searchWord:
        node = node.children.get(c) if node else None
        res.append(node.top if node else [])
    return res
```
**Time / Space:** O(Σ|w| ) build + O(|searchWord|) query. (Two-pointer on the sorted list
also works and is O(1) extra space — mention it.)

### Replace Words (LC 648) — stop at the first root

```python
def replace_words(dictionary, sentence):
    root = {}
    for w in dictionary:
        node = root
        for c in w:
            node = node.setdefault(c, {})
        node['$'] = w
    out = []
    for word in sentence.split():
        node, repl = root, word
        for c in word:
            if c not in node:
                break
            node = node[c]
            if '$' in node:            # shortest root wins -> stop immediately
                repl = node['$']; break
        out.append(repl)
    return " ".join(out)
```
**Time / Space:** O(total chars). **Mental trigger:** "replace each word by its shortest
dictionary prefix" → walk and stop at the *first* `is_end`.

### Longest Word in Dictionary (LC 720)

Only descend through nodes that are themselves words — that enforces "every prefix is
also in the dictionary" structurally, no extra checking.

```python
def longest_word(words):
    root = {}
    for w in words:
        node = root
        for c in w:
            node = node.setdefault(c, {})
        node['$'] = w
    best, stack = "", [root]
    while stack:
        node = stack.pop()
        for c in sorted(node):
            if c == '$':
                continue
            child = node[c]
            if '$' in child:                       # buildable one char at a time
                w = child['$']
                if len(w) > len(best) or (len(w) == len(best) and w < best):
                    best = w
                stack.append(child)                # only recurse through real words
    return best
```

### Implement Trie II (LC 1804) — prefix counts

Already in §3: `word_count` on the terminal node, `prefix_count` on every node of the
path, both decremented by `delete`. `countWordsEqualTo` / `countWordsStartingWith` are
one `_find` each. Same idea powers **Map Sum Pairs (LC 677)** (store a delta-sum per node
so an overwrite of an existing key propagates `new − old`) and **Sum of Prefix Scores
(LC 2416)**:

```python
def sum_prefix_scores(words):
    root = {}
    for w in words:                          # count how many words use each prefix
        node = root
        for c in w:
            node = node.setdefault(c, {'#': 0})
            node['#'] += 1
    out = []
    for w in words:                          # sum the counters along the path
        node, total = root, 0
        for c in w:
            node = node[c]; total += node['#']
        out.append(total)
    return out

assert sum_prefix_scores(["abc","ab","bc","b"]) == [5, 4, 3, 2]
```

### Stream of Characters (LC 1032) — the reversal insight

Query: "does **some suffix of the stream so far** equal a dictionary word?" A forward
trie answers prefix questions, so you would have to try starting from every past
position — O(stream²). **Reverse the words when inserting.** Then walking the stream
*backwards* from the newest character is a normal root-down trie walk, and you stop after
`max_len` steps.

```python
class StreamChecker:
    def __init__(self, words):
        self.root, self.max_len = {}, 0
        for w in words:
            node = self.root
            for c in reversed(w):                 # INSERT REVERSED
                node = node.setdefault(c, {})
            node['$'] = True
            self.max_len = max(self.max_len, len(w))
        self.stream = deque()

    def query(self, letter):
        self.stream.appendleft(letter)            # newest character at index 0
        if len(self.stream) > self.max_len:
            self.stream.pop()                     # nothing longer can ever match
        node = self.root
        for c in self.stream:                     # walk backwards through time
            if c not in node:
                return False
            node = node[c]
            if '$' in node:
                return True
        return False
```
**Time / Space:** O(max_len) per query, O(total chars) trie. (Aho-Corasick in §10 does
this in **O(1) amortised** per character — the "I know the better answer" upgrade.)

**Mental trigger:** the question is about **suffixes** → reverse the strings and it
becomes a prefix question. This one trick also unlocks Palindrome Pairs (§8) and
Prefix-and-Suffix Search (LC 745, which stores every `suffix + '{' + word` key).

---

## 8. Template F — Word-break / segmentation with a trie

Cross-reference `dp.md`: these are DP over positions where the **transition set** is
supplied by a trie walk instead of a `set` lookup per substring. The win: from position
`i`, one walk enumerates *all* dictionary words starting at `i` in O(longest word) total,
instead of slicing `s[i:k]` (O(k−i) each) and hashing it for every `k`.

### Word Break I / II (LC 139 / 140)

```python
def word_break_ii(s, wordDict):
    root = {}
    for w in wordDict:
        node = root
        for c in w:
            node = node.setdefault(c, {})
        node['$'] = True
    memo = {}
    def dfs(i):
        if i == len(s):
            return [""]
        if i in memo:
            return memo[i]
        out, node = [], root
        for k in range(i, len(s)):
            if s[k] not in node:
                break                 # no dictionary word continues -> stop early
            node = node[s[k]]
            if '$' in node:
                for rest in dfs(k + 1):
                    out.append(s[i:k+1] + (" " + rest if rest else ""))
        memo[i] = out
        return out
    return dfs(0)

assert sorted(word_break_ii("catsanddog", ["cat","cats","and","sand","dog"])) == \
       ["cat sand dog", "cats and dog"]
```
**Time / Space:** O(n² + output) with memoisation; the `break` prunes hard on real inputs.
**Extra Characters in a String (LC 2707)** is the same skeleton with `dp[i] =
min(dp[i+1] + 1, min over dictionary matches of dp[k+1])`.

### Concatenated Words (LC 472)

Sort by length and insert as you go: a concatenated word is built only from **strictly
shorter** words, so when you test `w` the trie contains exactly the candidates.

```python
def concatenated_words(words):
    root, res = {}, []
    def add(w):
        node = root
        for c in w:
            node = node.setdefault(c, {})
        node['$'] = True
    def formable(w, i, pieces):
        if i == len(w):
            return pieces >= 2                 # must be ≥ 2 pieces
        node = root
        for k in range(i, len(w)):
            if w[k] not in node:
                return False
            node = node[w[k]]
            if '$' in node and formable(w, k + 1, pieces + 1):
                return True
        return False
    for w in sorted(words, key=len):
        if not w:
            continue
        if formable(w, 0, 0):
            res.append(w)
        add(w)                                 # insert AFTER testing
    return res
```
**Time / Space:** O(n log n + Σ L²).

### Palindrome Pairs (LC 336) — the hard one

Find all `(i, j)` with `words[i] + words[j]` a palindrome. Brute force is O(n²·L).

**Setup.** Build a trie of the **reversed** words. Store on each node:
- `index` — the word whose reverse *ends* exactly here,
- `palin_below` — every word `i` for which the *remaining* part of `reversed(words[i])`
  below this node is itself a palindrome.

**Why.** Walk `words[j]` (not reversed) down the trie. Two cases produce a palindrome:

1. **Short right word.** At depth `k` you find a node with `index = i`. That means
   `reversed(words[i]) == words[j][:k]`, i.e. `words[i] == reverse(words[j][:k])`. Then
   `words[j] + words[i] = A + B + reverse(A)` with `A = words[j][:k]`, `B = words[j][k:]`
   — a palindrome **iff the leftover `B` is a palindrome**.
2. **Long right word.** You consume all of `words[j]` and land on a node. Everything in
   that node's `palin_below` is a word `i` with `reversed(words[i]) = words[j] + rest`
   and `rest` a palindrome, so `words[i] = rest + reverse(words[j])` and
   `words[j] + words[i] = words[j] + rest + reverse(words[j])` — a palindrome.

Empty-string and exact-reverse cases fall out automatically because the empty remainder
counts as a palindrome.

```python
class PNode:
    __slots__ = ("children", "index", "palin_below")
    def __init__(self):
        self.children, self.index, self.palin_below = {}, -1, []

def is_pal(s): return s == s[::-1]

def palindrome_pairs(words):
    root = PNode()
    for i, w in enumerate(words):
        rw, node = w[::-1], root
        for k, c in enumerate(rw):
            if is_pal(rw[k:]):                    # rest below this node is a palindrome
                node.palin_below.append(i)
            node = node.children.setdefault(c, PNode())
        node.palin_below.append(i)                # empty remainder counts
        node.index = i

    res = []
    for j, w in enumerate(words):
        node = root
        for k, c in enumerate(w):
            if node.index >= 0 and node.index != j and is_pal(w[k:]):
                res.append([j, node.index])       # case 1: short right word
            node = node.children.get(c)
            if node is None:
                break
        else:                                     # consumed all of words[j]
            for i in node.palin_below:            # case 2: long right word
                if i != j:
                    res.append([j, i])
    return res

assert sorted(palindrome_pairs(["abcd","dcba","lls","s","sssll"])) == \
       [[0,1],[1,0],[2,4],[3,2]]
```
**Time / Space:** O(Σ L²) — the `is_pal` checks dominate (each is O(L) and there are L of
them per word; Manacher precomputation removes the factor if pushed). Space O(Σ L).

### Word Squares (LC 425) — a Google classic

A word square reads the same across and down: row `k` must start with the prefix formed
by the `k`-th character of every row placed so far. So build a **prefix → words** index
(a trie, or its flattened equivalent) and backtrack row by row.

```python
def word_squares(words):
    n = len(words[0])
    prefix = collections.defaultdict(list)
    for w in words:                                   # flattened trie: every prefix
        for k in range(n + 1):
            prefix[w[:k]].append(w)
    res, square = [], []
    def backtrack():
        if len(square) == n:
            res.append(square[:]); return
        k = len(square)
        want = "".join(row[k] for row in square)      # column k so far = required prefix
        for cand in prefix[want]:                     # only viable rows, no scanning
            square.append(cand)
            backtrack()
            square.pop()
    for w in words:
        square.append(w); backtrack(); square.pop()
    return res

assert sorted(map(tuple, word_squares(["area","lead","wall","lady","ball"]))) == \
       [("ball","area","lead","lady"), ("wall","area","lead","lady")]
```
**Time / Space:** O(n · 26^L) worst case, but the prefix index prunes so aggressively that
it runs instantly on real inputs. Space O(Σ L · L). The `prefix` dict *is* a trie with the
per-node word list materialised — say that, then offer the real trie (`node.words`) if the
interviewer wants O(1) memory per prefix key.

**Mental trigger:** "build a structure where every partial choice constrains the next by a
**prefix**" → trie + backtracking.

---

## 9. Compressed tries, radix trees & suffix tries

**The problem.** A trie of `"internationalization"` alone burns 20 nodes in a single
chain, each with a one-entry dict. Long keys with few branch points waste memory and
pointer-chase like crazy.

**Patricia trie / radix tree.** Collapse every chain of single-child nodes into **one edge
labelled with a whole substring**. `["romane", "romanus", "romulus"]` becomes
`root -"rom"-> {"an" -> {"e", "us"}, "ulus"}` — 5 nodes instead of 15. Search compares a
substring per edge instead of a char per node.

- **Compression matters when** keys are long, the alphabet is large, and branching is
  sparse: IP routing tables, filesystem paths, `etcd`/`git` object stores, in-memory
  key-value indexes. Node count drops to O(number of keys) instead of O(total chars).
- **Cost:** splitting an edge on insert is fiddly (find the mismatch offset, split into
  two nodes). In an interview, *describe* it; only code it if asked.

**Suffix trie / suffix tree.** Insert **all n suffixes** of a single string. Then "is `p`
a substring of `s`?" becomes a prefix query — O(|p|). Naively O(n²) nodes; Ukkonen's
algorithm builds the *compressed* version (suffix tree) in O(n). In interviews prefer the
**suffix array + LCP** (see `strings.md`): same power, O(n log n) with 20 lines, no
pointer soup. Reach for a suffix automaton/tree only when explicitly asked.

**Longest Common Prefix (LC 14) via trie.** Insert all strings, then walk down while
exactly one child exists and no word ends there.

```python
def longest_common_prefix(strs):
    root = {}
    for w in strs:
        node = root
        for c in w:
            node = node.setdefault(c, {})
        node['$'] = True
    out, node = [], root
    while len(node) == 1 and '$' not in node:   # single child AND no word ends here
        c = next(iter(node)); out.append(c); node = node[c]
    return "".join(out)
```
**Time / Space:** O(Σ L) — worse than the trivial vertical scan for a one-shot query, but
the right answer when you need the LCP of *many different subsets* repeatedly.
**Short Encoding of Words (LC 820)** is the suffix version: insert all words reversed,
and the answer is the sum of `depth + 1` over leaf nodes.

---

## 10. Tries in system design

- **IP routing — longest-prefix match.** Route tables store prefixes like `10.1.0.0/16`.
  Insert each prefix as a bit string into a binary trie; forwarding walks the destination
  address bit by bit and remembers the **deepest node carrying a route**. That is exactly
  `max_xor`'s walk with a different bookkeeping rule. Real hardware uses multi-bit stride
  tries / LC-tries (a compressed radix trie) to cut the number of memory accesses.
- **T9 predictive text.** Trie keyed by digits (`2 → a|b|c`); each node holds the words
  reachable, ranked by frequency — literally §7's hot-list with a 8-symbol alphabet.
- **Spell-check / did-you-mean.** Trie + bounded edit-distance DFS (§4). The killer
  optimisation is sharing one Levenshtein DP row down the trie: each node extends the
  parent's row by one character, so a whole subtree is pruned as soon as the row's minimum
  exceeds the budget.
- **Search autocomplete at scale.** Trie shard per prefix range, hot-lists precomputed
  offline, served from memory; personalisation re-ranks the top-50.
- **Relation to DFA / Aho-Corasick.** A trie is already a DFA for the "which prefix have I
  matched" question, but it lacks transitions for mismatches. Adding **failure links** —
  "on a mismatch, jump to the longest proper suffix of what I've matched that is still a
  trie prefix" — completes it into a full automaton. That is **KMP generalised from one
  pattern to many**: KMP's failure function is Aho-Corasick on a one-branch trie.

### Aho-Corasick — multi-pattern search in O(text + matches)

```python
class AhoCorasick:
    def __init__(self, patterns):
        self.goto = [{}]          # goto[node][char] -> node
        self.fail = [0]           # longest proper matched suffix that is a trie prefix
        self.out  = [[]]          # patterns ending here, incl. those via fail links
        for p in patterns:                                   # 1. build the trie
            node = 0
            for c in p:
                if c not in self.goto[node]:
                    self.goto.append({}); self.fail.append(0); self.out.append([])
                    self.goto[node][c] = len(self.goto) - 1
                node = self.goto[node][c]
            self.out[node].append(p)

        q = deque()                                          # 2. BFS the failure links
        for nxt in self.goto[0].values():
            self.fail[nxt] = 0                               # depth 1 fails to the root
            q.append(nxt)
        while q:
            u = q.popleft()
            for c, v in self.goto[u].items():
                f = self.fail[u]
                while f and c not in self.goto[f]:           # walk up until c fits
                    f = self.fail[f]
                self.fail[v] = self.goto[f].get(c, 0)
                self.out[v] = self.out[v] + self.out[self.fail[v]]   # inherit outputs
                q.append(v)

    def search(self, text):
        node, res = 0, []
        for i, c in enumerate(text):
            while node and c not in self.goto[node]:         # amortised O(1) overall
                node = self.fail[node]
            node = self.goto[node].get(c, 0)
            for p in self.out[node]:
                res.append((i - len(p) + 1, p))              # (start index, pattern)
        return res

ac = AhoCorasick(["he", "she", "his", "hers"])
assert sorted(ac.search("ushers")) == [(1, 'she'), (2, 'he'), (2, 'hers')]
```
BFS order guarantees `fail[u]` is finished before any child of `u` is processed, which is
why the outputs can simply be inherited. **Time / Space:** O(Σ|patterns|) build,
O(|text| + #matches) search, O(Σ|patterns| × Σ) space (or × avg outputs if you copy output
lists as above — link to them instead if memory matters).

**Mental trigger:** "find **all occurrences of many patterns** in one text/stream"
(content filters, DNA motifs, log scanners, LC 1032) → Aho-Corasick.

---

## 11. Common pitfalls

1. **Forgetting `is_end`.** `search("appl")` returns True on a trie holding `"apple"` if
   you only check "did I reach a node". Prefix existence ≠ word existence. The #1 bug.
2. **Shared mutable default.** `def __init__(self, children={})` makes *every* node share
   one dict — the whole trie collapses into a single node. Always build the dict inside
   `__init__`.
3. **26-arrays for sparse or wide alphabets.** 26 pointers per node for 10 long unique
   words wastes ~95% of the memory; and it silently breaks on uppercase, digits, spaces
   or unicode (`ord(c) - 97` goes negative and indexes from the *end* of the list).
4. **Not pruning in Word Search II.** Without `if not node: parent.pop(ch)` the
   adversarial all-`'a'` board TLEs. Also: not popping `'$'`, so a word is reported once
   per path that spells it.
5. **Deleting nodes another word still needs.** Prune only when the node has no children
   **and** is not itself a word end; and never mutate before you've confirmed the word is
   actually present.
6. **Recursion depth.** A DFS over a trie is as deep as the longest word (or, for grid
   DFS, the longest path). Python's default limit is 1000 — for long keys convert to an
   explicit stack (as in `longest_word` above) rather than raising the limit.
7. **Case sensitivity / non-ASCII / the sentinel colliding with data.** Normalise input
   (`w.lower()`) and pick a sentinel that cannot be a real character. `'#'`/`'$'`/`'{'`
   are only safe because the constraints say lowercase letters — say so out loud.
8. **Using a trie where a set would do.** If the only operation is exact membership, a
   `set` is shorter, faster and O(1) with a better constant. Justify the trie by naming
   the prefix/ordering/sharing property you need.
9. **Rebuilding strings during DFS.** `path + c` at every frame is O(L) per node; use a
   list buffer with append/pop, or store the word at the terminal node.
10. **Off-by-one in the bit trie.** Iterate `range(B-1, -1, -1)` (high bit first) — a
    low-bit-first walk destroys the greedy argument. And size `B` to the constraints:
    `10^9` needs 30 bits, not 16.

---

## 12. Complexity & decision cheat sheets

### Complexity

| Operation | Time | Space / note |
|---|---|---|
| insert / search / startsWith | O(L) | ≤ L new nodes |
| delete (with pruning) | O(L) | O(L) stack |
| count words with prefix | O(L) | needs `prefix_count` |
| all words with prefix | O(L + output) | + O(log Σ) per node if sorted |
| iterate in sorted order | O(total chars) | free ordering |
| wildcard `.` search | O(L) → O(nodes) all-dots | |
| edit-distance ≤ k search | O(nodes visited) | pruned by the budget |
| build trie of n words | O(Σ L) | O(Σ L) nodes, ×Σ for arrays |
| Word Search II | O(R·C·4^{L_max}), pruned in practice | O(Σ L) |
| bit trie insert / max_xor | O(B) = O(32) | O(n·B) nodes |
| Aho-Corasick build / search | O(Σ P) / O(T + matches) | O(Σ P × Σ) |

### Phrasing → structure

| The question says… | Use |
|---|---|
| "does this exact word exist" only | **hash set** (not a trie) |
| "starts with", "prefix", "prefix count/score" | core trie (§3) |
| "autocomplete", "top k suggestions", "search suggestions" | trie + hot-list per node (§7) |
| "`.` matches any character", "one typo", "fuzzy" | trie + DFS with a budget (§4) |
| "board / grid + list of words" | trie + backtracking + **pruning** (§5) |
| "maximum / minimum XOR", "count XOR pairs in range" | bit trie (§6) |
| "suffix of the stream", "ends with" | **reversed** trie (§7) or Aho-Corasick (§10) |
| "split the string into dictionary words" | trie + DP (§8, `dp.md`) |
| "all occurrences of many patterns in a text" | Aho-Corasick (§10) |
| "longest common prefix of a set" | trie walk, or just vertical scan for one query |
| "substring of a single string, many queries" | suffix array / suffix automaton (`strings.md`) |
| keys are long with few branch points | radix / Patricia tree (§9) |

---

## 13. Google-favourite problem list

**Basic — learn the shape**
1. **Implement Trie (LC 208)** — insert/search/startsWith. Know it cold, cold.
2. **Implement Trie II (LC 1804)** — adds `countWordsEqualTo`, `countWordsStartingWith`, `erase`. The counter + delete drill.
3. **Map Sum Pairs (LC 677)** — store deltas per node so key overwrites propagate `new − old`.
4. **Longest Common Prefix (LC 14)** — trie walk while single-child; compare against the trivial scan.
5. **Replace Words (LC 648)** — stop at the shortest matching root.
6. **Longest Word in Dictionary (LC 720)** — descend only through nodes that are words; ties → lexicographically smallest.
7. **Index Pairs of a String (LC 1065)** — start a trie walk at every index, emit `[i, j]` on each `is_end`.
8. **Camelcase Matching (LC 1023)** — subsequence match + "no stray uppercase"; two-pointer beats a trie unless there are many patterns.

**Core — expect one of these**
9. **Design Add and Search Words (LC 211)** — `.` wildcard DFS. The classic follow-up to LC 208.
10. **Word Search II (LC 212)** — *the* Google trie question. Word-at-leaf + dead-branch pruning (§5).
11. **Search Suggestions System (LC 1268)** — top-3 lexicographic per prefix; sorted insertion trick.
12. **Design Search Autocomplete System (LC 642)** — hot-list vs query-time heap; discuss the memory cap.
13. **Implement Magic Dictionary (LC 676)** — exactly one substitution; DFS with a `used` flag.
14. **Stream of Characters (LC 1032)** — reversed trie; mention Aho-Corasick as the O(1)-amortised upgrade.
15. **Maximum XOR of Two Numbers in an Array (LC 421)** — greedy high-bit walk on a bit trie.
16. **Prefix and Suffix Search (LC 745)** — index every `suffix + '{' + word`; last writer wins = largest index.
17. **Short Encoding of Words (LC 820)** — reversed trie, answer = Σ(leaf depth + 1).
18. **Design File System (LC 1166)** — paths are keys; a trie of path components, or just a hash map (say which and why).
19. **Sum of Prefix Scores of Strings (LC 2416)** — `prefix_count` on every node, then sum along each word's path.
20. **Extra Characters in a String (LC 2707)** — DP over positions, transitions from a trie walk.

**Hard — the differentiators**
21. **Concatenated Words (LC 472)** — sort by length, insert as you go, DFS the split.
22. **Word Break II (LC 140)** — memoised DFS with trie transitions; watch exponential output.
23. **Word Squares (LC 425)** — prefix index + backtracking; a Google favourite.
24. **Palindrome Pairs (LC 336)** — reversed trie + palindrome-suffix marks (§8). Hardest common trie problem.
25. **Maximum XOR With an Element From Array (LC 1707)** — offline: sort nums *and* queries, sweep.
26. **Count Pairs With XOR in a Range (LC 1803)** — `count_less_than` with subtree counts; `f(high+1) − f(low)`.
27. **Minimum XOR pair** — trie mirror of LC 421; also solvable by sort + adjacent pairs.
28. **Number of Matching Subsequences (LC 792)** — bucket words by their next needed char and advance them as you scan `s` (a "trie of waiting pointers"); beats a plain trie here.
29. **Delete Duplicate Folders in System (LC 1948)** — build a folder trie, serialise each subtree, hash-count the serialisations, delete duplicates. Trie + Merkle hashing.
30. **Multi-pattern search / content filter** — Aho-Corasick (§10). Rare but decisive when it appears.

---

## 14. Quiz

**1.** A trie holds `["apple"]`. Why does `search("app")` return `False` while
`startsWith("app")` returns `True`, and what single field makes the difference?

<details><summary>Answer</summary>

Walking `"app"` succeeds — the nodes exist because they are on the path to `"apple"`.
`search` additionally requires `node.is_end`, which is only set on the `'e'` node.
Without the flag a trie can only answer prefix questions, never membership. This is the
single most common trie bug.
</details>

**2.** In Word Search II, what exactly goes wrong if you skip `if not node: parent.pop(ch)`?

<details><summary>Answer</summary>

Correctness is unaffected, performance dies. Once a subtree's last word has been found
and popped, the branch stores no words but is still reachable from every remaining start
cell, so the DFS keeps exploring the board along dead paths. On the adversarial input
(a board of all `'a'` and a dictionary of long `"aaa…"` variants) this turns a fast
solution into TLE. Deleting the exhausted node shrinks the search space monotonically.
</details>

**3.** Why does the greedy "take the opposite bit if it exists" walk actually maximise
`x ^ y`, rather than needing search or backtracking?

<details><summary>Answer</summary>

Because bit weights are positional and `2^k > 2^{k-1} + … + 2^0`. Securing a 1 at bit `k`
outweighs every possible gain from all lower bits combined, so the locally greedy choice
is globally optimal. There is never a reason to give up a high bit, hence no backtracking.
The same argument fails if you walk low bit first — which is why the loop must be
`range(B-1, -1, -1)`.
</details>

**4.** You must support "does any dictionary word end at the current position of an
infinite character stream?". Why reverse the words instead of using a forward trie?

<details><summary>Answer</summary>

The query is about a **suffix** of the stream. A forward trie only answers prefix
questions, so you would need to start a walk from every past position — O(stream) walks.
Inserting words reversed converts "suffix of the stream" into "prefix of the reversed
recent history", so a single walk backwards from the newest character answers it, capped
at `max_word_length` steps. (Aho-Corasick does it in O(1) amortised by precomputing the
failure links instead.)
</details>

**5.** When is a hash set strictly better than a trie, and when is the trie's memory
advantage real rather than theoretical?

<details><summary>Answer</summary>

If the only operation is exact membership, the set wins: O(1) expected vs O(L), less
code, far less memory (a trie node with a dict costs ~100+ bytes to store one character).
The trie's memory advantage appears only with heavy prefix sharing — e.g. a million URLs
under the same domain, or dictionary words in one language. With few, long, dissimilar
keys the trie uses *more* memory than storing the strings, which is exactly the case
where a radix tree pays off.
</details>

**6.** Deleting `"bat"` from a trie containing `"bat"` and `"batman"`: what must happen,
and what must not?

<details><summary>Answer</summary>

Only clear `is_end` (and decrement `word_count`) on the `'t'` node. No node may be
removed, because the `'t'` node still has a child (`'m'`) leading to `"batman"`. Pruning
is allowed only bottom-up while the node has **no children and is not itself a word end**.
Conversely, deleting `"batman"` must prune `m,a,n` but stop at `'t'` because it is a word
end. And a delete of an absent word must not decrement any counter — check first, mutate
during unwinding.
</details>

**7.** In LC 642, why is a hot-list on every node not automatically the right design, and
what breaks at scale?

<details><summary>Answer</summary>

Memory. Every node stores every sentence beneath it, so a sentence of length L appears in
L maps → O(n·L) entries overall, and a shared short prefix (e.g. `"a"`) holds the entire
corpus. Query-time DFS + a size-k heap uses O(total chars) memory but pays O(S log k) per
keystroke, where S is the subtree size. Production answer: hot-list **bounded to the top
~50 per node**, recomputed offline, so memory is O(50 × nodes) and queries stay O(1)-ish.
</details>

**8.** How is Aho-Corasick's failure link related to KMP's failure function, and why must
the links be built in BFS order?

<details><summary>Answer</summary>

KMP's `lps[i]` is "longest proper prefix of the pattern that is also a suffix of
`pattern[:i]`". Aho-Corasick's `fail[v]` is the same statement generalised over a *set* of
patterns: the longest proper suffix of the string spelled by `v` that is also some
pattern's prefix (i.e. a trie node). A trie with one branch reduces exactly to KMP.
BFS order is required because `fail[v]` is computed by following `fail[parent(v)]`
upward — those nodes are strictly shallower, so BFS guarantees they are already finalised,
which also lets `out[v]` simply inherit `out[fail[v]]`.
</details>

---

## 15. Mini project — CLI autocomplete engine with frequency ranking

Builds a frequency-ranked autocomplete over your shell history: bounded hot-list per node
(§7), learns from every accepted completion.

```python
import collections, heapq

class ANode:
    __slots__ = ("children", "hot")
    def __init__(self):
        self.children = {}
        self.hot = {}                    # phrase -> freq, bounded

class Autocomplete:
    def __init__(self, k=5, cap=50):
        self.root, self.freq = ANode(), collections.Counter()
        self.k, self.cap = k, cap

    def add(self, phrase, weight=1):
        self.freq[phrase] += weight
        node = self.root
        for c in phrase:
            node = node.children.setdefault(c, ANode())
            node.hot[phrase] = self.freq[phrase]
            if len(node.hot) > self.cap:                 # keep the hot-list bounded
                del node.hot[min(node.hot, key=lambda s: (node.hot[s], s))]

    def suggest(self, prefix):
        node = self.root
        for c in prefix:
            node = node.children.get(c)
            if node is None:
                return []                                # dead prefix
        return [s for s, _ in heapq.nsmallest(
            self.k, node.hot.items(), key=lambda kv: (-kv[1], kv[0]))]

    def accept(self, phrase):                            # user picked it -> learn
        self.add(phrase)

eng = Autocomplete(k=3)
for p, w in [("git status", 40), ("git stash", 12), ("git push", 30),
             ("grep -r", 5), ("git stash pop", 20)]:
    eng.add(p, w)
assert eng.suggest("git s") == ["git status", "git stash pop", "git stash"]
assert eng.suggest("g")     == ["git status", "git push", "git stash pop"]
assert eng.suggest("zzz")   == []
eng.accept("git stash"); [eng.accept("git stash") for _ in range(100)]
assert eng.suggest("git s")[0] == "git stash"            # re-ranked by usage
```

**Extensions, in the order an interviewer would ask for them:**
1. Bootstrap from `~/.zsh_history`; persist the trie with `pickle` or a serialised radix
   tree so startup is O(file), not O(re-insert).
2. **Fuzzy mode** — §4's budget DFS so `"gti s"` still finds `"git status"`.
3. **Recency decay** — store `(freq, last_used)` and rank by `freq · 0.5^{age_days}`; the
   hot-list eviction key changes but nothing else does.
4. **Memory audit** — count nodes and total hot-list entries; swap in a radix tree (§9)
   and measure the drop for long, rarely-branching commands.
5. **Multi-word** — index every word boundary as an additional insertion point so
   `"status"` also suggests `"git status"` (this is what shells' `Ctrl-R` approximates).
