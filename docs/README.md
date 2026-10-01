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

In `localStorage`, under the key `pattern-ledger-v1` — so it lives in one browser
on one machine, and clearing site data wipes it. **Export backup** on the
dashboard writes a JSON file; **Import backup** reads one back. Use those to move
progress between machines.

(The same page also runs as a claude.ai artifact, where it stores progress in the
artifact database instead. It picks the backend at load time; you don't configure
anything.)

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

## LeetCode links

A problem links straight to LeetCode when its title matches one in the A2Z sheet
(304 do). Otherwise the link is a LeetCode search for its problem number, which
always resolves even when the title in your notes is abbreviated. The tag text
tells you which: **LeetCode ↗** is direct, **Find on LC ↗** is a search.
