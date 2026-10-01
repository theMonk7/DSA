# Pattern Ledger

A static study tracker built from `notes/*.md` plus the Striver A2Z DSA sheet.
Every topic has two tabs: **Concepts** (your notes, rendered) and **Problems**
(grouped by pattern, with LeetCode links).

## Hosting on GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → Branch `main`, folder `/docs`.

The site is then at `https://<user>.github.io/<repo>/`.

Nothing to build on the server — `docs/` holds the finished page, its data file,
and a `.nojekyll` marker that stops GitHub rewriting the paths.

## Running it locally

`index.html` fetches `data/curriculum.json`, which the browser blocks over
`file://`. Serve the folder instead:

```sh
cd docs && python3 -m http.server
```

Then open http://localhost:8000.

## Where progress is stored

The page picks a backend at load time:

| Backend | When | Scope |
|---|---|---|
| GitHub gist | self-hosted, token connected | your GitHub account, every browser |
| `localStorage` | self-hosted, not connected | one browser on one machine |
| artifact database | opened as a claude.ai artifact | that artifact |

Unconnected it uses `localStorage` under the key `pattern-ledger-v1`; clearing
site data wipes it. **Export backup** on the dashboard writes a JSON file and **Import
backup** reads one back, which works on any backend.

## Syncing across browsers (optional)

Without this the site saves to one browser. Connecting takes about a minute and
puts your progress in a **secret gist in your own GitHub account**, so any
browser you connect sees the same data.

No extra service, nothing to sign up for, nothing that expires or pauses, and
the data sits in an account you already control.

**1. Create a token.** In the app, sidebar → **Sync with GitHub** → the
*Create one on GitHub* link. It opens the token page with the only permission
needed already selected: **gist**. Pick an expiry you are comfortable with,
generate, copy.

(Direct link: <https://github.com/settings/tokens/new?scopes=gist&description=Pattern%20Ledger>)

**2. Paste it into the dialog.** The app checks the token, finds its gist or
creates one, and switches to it. Repeat on any other browser with the same token.

### What the token can do

It is scoped to **gists only** — it cannot read or write any repository, cannot
act on your account, cannot see private code. Revoke it whenever you like at
<https://github.com/settings/tokens>, and the worst case is that this app stops
syncing.

It is stored in this browser's `localStorage` and sent to `api.github.com` and
nowhere else. That does mean any script running on this origin could read it,
which is why the gist scope matters: that is the whole blast radius.

**Never commit the token.** It belongs in the browser, not in the repo.

### Multiple people, one site

Each person connects their own token, so each gets their own gist in their own
GitHub account. There is no shared backend and no server holding anyone's data:
the app only ever talks to `api.github.com` as whoever's token is in that
browser. One deployment of this site serves any number of people, and none of
them can see another's progress through it.

The remembered gist id is stored per GitHub account
(`pattern-ledger-gist-id:<login>`), so two people sharing one browser keep
separate ledgers and each gets their own gist back on reconnect.

The app also checks that a remembered gist is actually owned by the account whose
token is connected before using it. That check matters because a secret gist is
readable by anyone holding its id — without it, a second person on a shared
browser could have read the first person's gist.

### About "secret" gists

A secret gist is unlisted, not encrypted — anyone who has its URL can read it.
Nobody is given the URL, but treat the contents as "not posted publicly" rather
than "private". For study ticks and your own notes that is usually fine; do not
paste anything sensitive into a problem note.

### Where the data lives

One file, `pattern-ledger.json`, in one gist:

```json
{ "app": "pattern-ledger", "version": 2, "updatedAt": "...",
  "state":  { "<itemId>": { "done": true, "note": "..." } },
  "custom": { "topics": [...], "groups": [...], "items": [...] } }
```

A fully completed ledger with notes is about 60 KB, so it stays well inside the
limit where GitHub serves gist content inline. Writes are debounced ~1.2 s, so a
burst of ticking is one revision, not twenty.

### What happens to progress you already have

Connecting for the first time with work already in the browser:

- gist empty → your local progress is uploaded to it
- gist already has progress → the dashboard asks first. **Merge** combines ticks
  and copies a note up only where the gist has none for that item. **Keep account
  only** leaves the gist as it is; the local copy stays in this browser.

**Disconnect** drops back to the local copy and never deletes the gist.

## Adding your own modules and problems

Buttons on the dashboard: **+ New module**, **+ Add problem**. Inside a topic the
Problems tab has its own **+ Add problem**, and a module you created can be
renamed or deleted there.

Adding a problem asks for a name, which module and section it belongs in (any
module, generated or your own — or type a new section name), and optionally a
LeetCode number, a link, and a level. Give it a number with no link and it links
to a LeetCode search for that number, the same rule the generated problems use.

Your entries carry a **mine** tag and have an **Edit** button; generated ones do
not. Deleting asks once, in place.

### Why this is stored in the database, not in curriculum.json

`tools/build_site.py` overwrites `docs/data/curriculum.json` from scratch on
every run. Anything added by hand in that file disappears the next time you
rebuild after editing your notes.

So added content lives in the same database as your progress, and is folded into
the generated curriculum when the page loads. Rebuild as often as you like — your
modules and problems are untouched, because the generated data is never written
to. If you later add a problem to your notes that duplicates one you entered by
hand, you will see both; delete yours.

The backup file (**Export backup**) contains your added modules and problems as
well as your progress; **Import backup** merges them in, skipping anything whose
id is already present.

## Rebuilding after you edit your notes

```sh
python3 tools/build_site.py
```

That reparses every `notes/*.md` and rewrites `docs/data/curriculum.json`.
The page itself (`docs/index.html`) only changes when you edit it directly.

## How the notes are parsed

- Each `##` heading becomes one **concept section**, carrying its whole markdown
  body — every `###` subsection, code block and table under it. Nothing is dropped.
- A **problem** is picked up two ways: a `###` heading tagged `(LC 42)`, or a
  `def some_function(...):  # LC 42` line in a code block. Problems are grouped
  under the `##` section they appear in, so the grouping follows your own pattern
  headings.
- Topics with no LC-tagged headings (Monotonic Stack, Intervals) have concepts
  but no problems — their Problems tab says so rather than showing an empty list.

## Problem links

Each problem gets one link, chosen in this order:

| Tag | When | Goes to |
|---|---|---|
| **LeetCode** | the A2Z sheet has a LeetCode URL for it, or your notes title matches one that does | the problem on LeetCode |
| **takeUforward** | no LeetCode URL, but it is a practice entry | `takeuforward.org/plus/dsa/problems/<slug>` |
| **TUF article** | a theory entry with a free article | `takeuforward.org/blogs/...` |
| **Find on LC** | none of the above, but your notes give an LC number | a LeetCode search for that number |

Current split across 825 problems: 304 LeetCode, 160 takeUforward, 21 TUF articles,
310 LeetCode search, 30 with no link.

The pattern-printing problems (Pattern 1 through 22) have no LeetCode equivalent,
so they link to takeUforward. Slugs come from the sheet's own data rather than
being guessed from titles, and a sample was checked to return 200.

The 30 with no link are sheet entries that are neither a problem nor an article
("Learn C++", "STL", section placeholders).
