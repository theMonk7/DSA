# LC 394 Decode String — "3[a2[c]]" -> "accaccacc"
# Pattern: nested structure -> one stack of PARENT state, build current in place.

def decode_string(s):
    stack = []                         # (parent_chunks, repeat_count)
    chunks = []                        # chars/strings of CURRENT depth
    num = 0                            # digits seen since last non-digit
    for c in s:
        if c.isdigit():
            num = num * 10 + (ord(c) - ord('0'))   # multi-digit: "12[a]"
        elif c == '[':
            stack.append((chunks, num))            # park parent, dive
            chunks, num = [], 0
        elif c == ']':
            done = "".join(chunks)                 # finish this depth
            chunks, k = stack.pop()                # restore parent
            chunks.append(done * k)
        else:
            chunks.append(c)
    return "".join(chunks)


# Recursive twin — same invariant, call stack replaces explicit stack.
def decode_string_rec(s):
    i = 0

    def parse():                       # reads until ']' or end, moves i
        nonlocal i
        out, num = [], 0
        while i < len(s):
            c = s[i]
            if c.isdigit():
                num = num * 10 + int(c)
                i += 1
            elif c == '[':
                i += 1                 # eat '['
                inner = parse()
                i += 1                 # eat ']'
                out.append(inner * num)
                num = 0
            elif c == ']':
                break                  # caller eats it
            else:
                out.append(c)
                i += 1
        return "".join(out)

    return parse()


tests = ["3[a]2[bc]", "3[a2[c]]", "2[abc]3[cd]ef", "abc3[cd]xyz", "10[a]", "", "2[]"]
for t in tests:
    print(repr(t), "->", repr(decode_string(t)), repr(decode_string_rec(t)))
