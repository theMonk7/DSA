# Pattern Ledger

A static study tracker built from `notes/*.md`, the interview sets in
`practice/*.md`, and the Striver A2Z DSA sheet.
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

## Offline

The site works with no network once you have opened it online at least once
after deploying.

- **The app itself** is cached by a service worker (`docs/sw.js`): the page,
  `curriculum.json`, the markdown and highlighting libraries, and the fonts. The
  page and data are fetched network-first with a 4-second fallback to the cache,
  so updates still arrive when you are online; libraries and fonts are
  cache-first. `api.github.com` is never cached.
- **Your progress, not connected to GitHub:** it already lives in this browser's
  storage, so nothing changes.
- **Your progress, connected to a gist:** every save writes a copy on this device
  first. Offline, the app opens from that copy, keeps accepting ticks, notes and
  tags, and the sidebar reads *Offline · changes waiting to sync*. When the
  connection returns it fetches the gist, merges **item by item — whichever side
  was edited most recently wins** — and pushes the result. Edits made on another
  device in the meantime are kept, not overwritten. If you close the tab while
  offline, the leftover edits are merged on your next online visit.

Two limits worth knowing:

- Deleting one of your own modules or problems while offline, when it still exists
  in the gist, brings it back on sync — merging custom content is a union.
- Safari can clear a site's storage after about a week without a visit. On iPhone
  or iPad, use **Share → Add to Home Screen**; installed web apps keep their data.
  The page ships a manifest, so Chrome and Edge also offer **Install**.

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

## Analytics

The chart icon in the top bar opens an analytics view (also at `#analytics`).

It shows solved-today, day streak, week and 30-day totals, a 30-day average pace
and a projected days-to-finish; a year-long activity heatmap; a 30-day column
chart; cumulative completion over time; concept/problem and Basic/Core/Pro
splits; per-module completion; and counts for your revision queue, favourites,
notes, tags and saved links.

All of it is derived from your own ticks and lives in the same record, so it
syncs to your gist with everything else. Nothing is sent anywhere.

**Dates start from now.** Ticking an item records the calendar day, which is what
the time charts are built from. Items you ticked before this existed have no date
— they still count in totals, and the view says how many are in that bucket
rather than inventing days for them. Unticking an item removes it from its day
but keeps a `firstDoneAt` record.

A **Show: All · Concepts · Problems** switch at the top scopes the whole page —
tiles, heatmap, charts, coverage and module list. It is a three-way switch rather
than two checkboxes because "neither" is not a meaningful view and "both" is
just All.

**Time to finish** lists all three scopes side by side: items left, 7-day and
30-day pace, days remaining and a finish date. Type a number in *Plan / day* to
ask "if I do 4 problems a day, when am I done?" — your plan overrides the measured
pace for that scope; clear it to go back to projecting from history. With no
recent activity it shows a dash rather than inventing a date. Scope and plan are
remembered per browser.

Every chart responds to hover: heat cells, day columns, stacked segments and
module bars each show their own value, and the cumulative line has a crosshair
that snaps to the nearest day — you aim at a date, not at a 2px line. Day columns
use a full-height hit area so a one-item day is still easy to hit. The same
readout appears on keyboard focus, and the tooltip is built with `textContent`,
never by concatenating markup.

Chart colours are a separate validated set, not the UI accent: the accent fails
the chroma floor at mark size. The three chart hues pass lightness-band, chroma,
colour-blind separation and contrast checks against every theme surface in both
light and dark.

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

## Editing a problem or section

Every problem row has one **Edit** button. It opens a single dialog:

- **Link**: paste a LeetCode, GeeksforGeeks, takeUforward or any other URL. Use
  this when the built-in link is premium, wrong or missing. It links straight to
  a LeetCode or GeeksforGeeks search, and has **Remove my link** to go back to
  the built-in one.
- **Section**: pick a module and section, or type a new section name. Its tick,
  notes, tags, favourite and link go with it.
- **Details** (only for problems you added): name, level, LeetCode number, and
  **Delete**.

Each part saves only if you changed it, and nothing is saved if any part is
invalid.

Every section header has a ✎ button: rename the section, or move it (with all
its problems) to another module.

- Generated problems and sections are rebuilt from your notes on every push, so
  a move or rename is stored as an override in your custom content (`moves` /
  `secMoves`) and synced like everything else in it. A rebuild does not undo it.
- Moved problems carry a dashed **moved** tag, and edited sections an **edited**
  tag. The dialog shows where they started, with **put it back**.
- Put back rewrites the override to the original place and name rather than
  deleting it, so merging with an older synced copy cannot bring the old change
  back.
- If a move points at a section that no longer exists (you renamed it in the
  notes), the problem stays in its original place.
- Concept sections come from the headings in your notes; to move one, move the
  heading in the `.md` file.

## Layouts

The ◉ menu has two tabs: **Colours** (palette and light/dark/auto) and
**Layout**. A layout changes structure, shape, type and motion; the palette
changes colour. Any palette works with any layout. The content is the same in
every layout.

| View | Layout | What changes |
|---|---|---|
| 1 | Classic | The default: sidebar and cards |
| 2 | Modern | Floating rounded sidebar and pill top bar, soft shadows, cards lift on hover, content rises in |
| 3 | Sleek | Flat and dense, hairline dividers, underline tabs, sidebar on the right |
| 4 | Funky | Thick ink outlines, hard offset shadows, tilted cards that bounce in, ticks wobble |
| 5 | Poppy | Drifting colour blobs, pill buttons, round ticks that pop, animated candy-stripe progress bars |
| 6 | Traditional | A ruled ledger page on a desk, serif type, folder tabs, no animation |
| 7 | Artistic | Huge italic headlines with a wipe-in, numbered index, magazine-style card grid, drop caps |
| 8 | Retro | Beveled desktop windows, gradient title bars, block progress bars, blinking cursor |

Entry animations run when you change page or layout, not when a tick
re-renders the page, and only the tick you click animates. With **Reduce
motion** turned on in your OS, all animation is off.

## Themes

The ◉ menu has eleven palettes, each with a light and a dark set: Slate, Indigo,
Forest, Plum, Modern, Ocean, Retro, Pop, Synthwave, Terminal and Ink. Some also
change shape and type: Retro uses square corners, a monospaced display face and
hard offset shadows; Pop and Modern use rounded corners and Space Grotesk;
Terminal sets everything in IBM Plex Mono.

Mode is **Light**, **Dark** or **Auto** (follow the system, and switch when it
does). ◐ in the top bar flips between light and dark.

Every text colour pair in the new palettes passes WCAG AA (4.5:1) on the
surface it sits on. The chart hues stay at 3:1 or better on all of them.

On a mouse or trackpad, a row's favourite and repeat icons (and a section's ✎)
stay hidden until you hover over or focus it; anything switched on stays
visible.
Touch screens always show them.

## Tags

Every problem automatically carries its module name as a tag (teal chip). It
cannot be removed — it is what makes "module" and your own tags filter the same
way.

Problems tagged in a practice sheet also carry **company** chips (Google,
Microsoft, Amazon, Netflix, Salesforce, Spotify, Sprinklr). They are always in the
tag bar and filter like any other tag (click *Google* for Google-tagged problems;
several chips narrow further, e.g. *Google* + *Sprinklr*). They cannot be removed
per problem — edit the sheet. Each row's Basic / Core / Pro label is its level.

- **Add**: open a problem's Notes panel, type in the tag box, press Enter.
- **Filter**: click any chip. Several tags at once narrow the list (all must
  match). **Clear** resets them.
- **Remove from one problem**: the × on its chip in the Notes panel.
- **Remove from everywhere**: the × on the chip in the tag bar. It asks once,
  then strips the tag from every problem that has it. Notes, ticks, favourites
  and repeat marks are untouched.

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

## Interview sets (`practice/*.md`)

Each module has a `practice/<module>.md` with extra problems beyond your notes and
the A2Z sheet, grouped by pattern, each row carrying a level and company tags:

```markdown
## Rooms, calendars & sweeps

| LC | Problem | Level | Companies |
|---:|---|---|---|
| 2402 | [Meeting Rooms III](https://leetcode.com/problems/meeting-rooms-iii/) | pro | Google, Amazon |
```

- They show in the Problems tab as sections marked **Interview set**, after your
  notes' sections and before A2Z.
- A row for a problem the module already has does not repeat it: it adds its
  company tags (and level) to the existing row. Those rows sit under *Already
  listed — company tags* at the end of each file.
- The build checks every row: the LC number must exist and the title must match
  LeetCode's, or it prints a `WARN` line. Level must be `basic`, `core` or `pro`.
- Item ids come from the module and LC number (`<module>-sheet-<n>`), so moving a
  row to another section keeps its tick. If you later write the same problem up
  in your notes, the notes entry wins and the sheet row only adds tags — the
  sheet item's tick does not carry over.
- Company tags are **indicative**: problems commonly reported for those
  companies' interviews, not LeetCode's premium company data.

## Rebuilding after you edit your notes

**You normally do nothing.** `.github/workflows/build-curriculum.yml` reruns the
build on every push that touches `notes/**.md`, `tools/build_site.py` or the
cached A2Z payload, and commits the regenerated `docs/data/curriculum.json` back
to `main`. GitHub Pages then redeploys, so a new section is live a minute or two
after you push the note.

The workflow needs **Settings → Actions → General → Workflow permissions →
Read and write permissions**, otherwise the commit-back step fails with a 403.
You can also trigger it by hand from the Actions tab (*Run workflow*).

Before committing it checks the parse did not collapse (at least 5 topics, 50
concept sections and 200 problems). A broken parser fails the run instead of
publishing an empty dashboard.

To run it locally:

```sh
python3 tools/build_site.py    # rewrites docs/data/curriculum.json
node tools/test_ui.js          # headless check that the page still renders
```

The page itself (`docs/index.html`) only changes when you edit it directly.

### What gets picked up automatically

| You add | Result |
|---|---|
| a `##` section in an existing file | new concept section in that module |
| a `###` subsection | new entry nested under its `##` section |
| a `####` or deeper | new entry nested under its parent heading |
| a `###` heading tagged `(LC 42)` | new problem in that module |
| a `def f(...):  # LC 42` line | new problem in that module |
| `LC 42` anywhere else in a section (a list item, a table, prose, a code comment) | new problem in that section, titled from LeetCode, with the text after a list item's dash as its hint |
| a row in `practice/<name>.md` | new problem in that module's interview set (see below) |
| a whole new `notes/<name>.md` | a new module, titled from the filename |

`segment_trees.md` becomes **Segment Trees** with no code change. Add it to
`TITLE_MAP` and `ORDER` in `tools/build_site.py` only if you want a different
display name or a specific position; unlisted modules sort to the end.

Item ids come from heading text, not position, so inserting a section never
renumbers anything — a rebuild adds ids and removes none, and your ticks, notes
and tags stay attached. Verified by diffing ids across a rebuild: 0 disappeared.
The one thing that does break the link is **renaming a heading**, which reads as
"old item gone, new item added".

The dashboard shows *data built N hours ago*. If that lags behind your last
notes commit, the workflow did not run — check the Actions tab.

## How the notes are parsed

- `#` is the file title and is ignored. Each `##` is a **top-level section** of
  that module. Everything deeper — `###`, `####`, `#####`, `######` — becomes a
  node nested by its own level, to any depth.
- A heading **with** children is a container: no tick, but a counter and bar
  showing how many of its leaves you have read. A heading **with no** children is
  a leaf: that is what you tick, and where its notes live. A `##` with nothing
  under it is itself a leaf.
- Indentation follows depth, so the page mirrors the shape of the markdown. Add a
  `####` under an existing `###` and it renders in the right place; add a whole
  new `##` and it becomes a new section. No code change either way.
- A **problem** is picked up three ways: a `###` heading tagged `(LC 42)`, a
  `def some_function(...):  # LC 42` line in a code block, or any other `LC 42`
  reference in the section — `13. **Majority Element** (LC 169) — Boyer–Moore`
  becomes *Majority Element*, hint *Boyer–Moore*. Problems are grouped under the
  `##` section they appear in, so the grouping follows your own pattern headings.
- A problem is listed once per module: a reference to a problem that already has
  its own `###` write-up, or that the A2Z sheet lists in the same module, is not
  added again. Only numbers that exist on LeetCode count (`tools/lc_index.json`).
- Every problem with an LC number gets a **level** from LeetCode's difficulty —
  Easy → Basic, Medium → Core, Hard → Pro — unless a practice sheet sets one.

## Problem links

Each problem gets one link, chosen in this order:

| Tag | When | Goes to |
|---|---|---|
| **LeetCode** | it has an LC number, or the A2Z sheet has a LeetCode URL for it | the problem on LeetCode |
| **takeUforward** | no LeetCode URL, but it is a practice entry | `takeuforward.org/plus/dsa/problems/<slug>` |
| **TUF article** | a theory entry with a free article | `takeuforward.org/blogs/...` |
| **Find on LC** | an LC number that is not in `tools/lc_index.json` yet | a LeetCode search for that number |

Current split across 1504 problems: 1293 LeetCode, 160 takeUforward, 21 TUF
articles, 0 LeetCode search, 30 with no link.

LC numbers are resolved through `tools/lc_index.json`, LeetCode's own list of
number → title, URL slug, difficulty and premium flag. The build reads it offline.
Problems LeetCode added after the last refresh fall back to a search link until
you run `python3 tools/fetch_lc_index.py` and commit the file. A **Premium** tag
marks problems that need a LeetCode subscription.

The pattern-printing problems (Pattern 1 through 22) have no LeetCode equivalent,
so they link to takeUforward. Slugs come from the sheet's own data rather than
being guessed from titles, and a sample was checked to return 200.

The 30 with no link are sheet entries that are neither a problem nor an article
("Learn C++", "STL", section placeholders).

### Saving your own link

Every problem can be re-pointed. A built-in link shows a small **✎** beside it;
a problem with no usable link shows **+ add link** instead. Click it and
you get a box to paste a URL, plus buttons that open a LeetCode and a
GeeksforGeeks search for that problem in a new tab — find it, copy the address,
paste it back.

The site is detected from the URL, so the chip then reads **LeetCode**,
**GeeksforGeeks**, **takeUforward** or **Open**. A link you save always wins over
the generated one, and **Remove link** falls back to whatever the build produced.

This matters because a built-in link is not always usable: the LeetCode problem
may be premium, the matched URL may be the wrong problem, or a takeUforward page
may not be where you want to practise. Re-point it once at GeeksforGeeks or
anywhere else and you never search for that problem again.

Saved links live with your progress, so they sync to your gist and follow your
account to any browser. Fixing a link once fixes it everywhere.
