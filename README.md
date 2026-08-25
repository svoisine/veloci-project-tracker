# 🦖 Veloci Project Tracker (VPT)

A local, personal project dashboard over Google Sheets. Your sheet stays the
source of truth; VPT is a fast, opinionated window onto it that tells you **what
you can actually work on right now**.

It runs entirely on your machine. No hosting, no login, no accounts, no
database — one small Node/Express process plus a React UI.

```
Google Sheet  ──read/write──▶  local Express backend  ──▶  React dashboard
   (truth)                     holds the service-account key    in your browser
```

The backend exists for exactly one reason: a browser tab cannot safely hold a
Google service-account key. The key stays on disk, the browser only ever asks
for `/api/…`.

---

## Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Google setup](#google-setup)
- [Sheet layout](#sheet-layout)
- [How "ready now" is decided](#how-ready-now-is-decided)
- [Notes activity feed](#notes-activity-feed)
- [Running it](#running-it)
- [Configuration](#configuration)
- [Where VPT stores things](#where-vpt-stores-things)
- [Multiple projects and multiple Google accounts](#multiple-projects-and-multiple-google-accounts)
- [The launcher (Windows)](#the-launcher-windows)
- [API](#api)
- [Repo layout](#repo-layout)
- [Sharing and collaboration](#sharing-and-collaboration)
- [Credential safety](#credential-safety)
- [Design decisions and non-goals](#design-decisions-and-non-goals)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)
- [Status](#status)

---

## What it does

| | |
|---|---|
| **Dashboard** | Progress ring, next-milestone countdown, current week, in-progress list, "ready now" split by lane (deep / gap), pull-ahead, blocked, open known issues. |
| **Editing** | Change a step's status, notes or blockers straight from the dashboard — written back to the sheet. A stale-write guard re-reads the cell first and refuses rather than clobber someone else's change. |
| **Notes feed** | Read every note left on the tracker in one panel, grouped by the status of the step it sits on, with whatever is new or changed since you last marked them seen pulled to the top. Read-only. |
| **Offline** | Every successful pull is cached. Lose the network and the dashboard still renders, badged `⚠ cached`, with editing disabled. |
| **Multi-project** | A hub listing every project you've added; each project is one config file and one sheet. Add and remove projects from the UI. |
| **Schedule editor** | Set milestones and generate a week schedule (`W0…Wn`) in a few clicks — no hand-editing JSON. |
| **Guided setup** | A first-run guide inside the app walks you through Google access, with a downloadable sheet template so your first connect works. |
| **Launcher** | `launch-vpt.bat` starts the app and opens the browser; wire it to Windows login if you want it up automatically. |

Badges next to the project name:

- **● live** — data came from the sheet just now
- **⚠ cached** — sheet unreachable, showing the last good pull (with its timestamp)
- **✗ no data** — no sheet id, no key, or no cache yet; the panel explains which

---

## Tech stack

Small on purpose. No framework beyond React, no state library, no CSS framework,
no ORM, no database, no test runner, no bundled analytics.

| Layer | Choice | Notes |
|---|---|---|
| Runtime | **Node.js 24** (ESM throughout) | `"type": "module"`; verified on Node 24 / npm 11 |
| Backend | **Express 5** | ~15 routes, no middleware beyond `express.json` |
| Google access | **googleapis** (`sheets` v4) | service-account auth, scope `spreadsheets` (read/write) |
| Frontend | **React 19** | function components + hooks only |
| Build / dev server | **Vite 8** with `@vitejs/plugin-react` | HMR in dev, static `dist/` in serve mode |
| Dev orchestration | **concurrently** | runs backend + Vite together |
| Styling | **Inline style objects + a token file** | `src/tokens.js` holds two complete themes; no CSS-in-JS library, no Tailwind |
| Routing | **None** | two states (hub / one project) held in `useState`; a router would be dead weight |
| Persistence | **JSON files on disk** | one config per project; one cache and one notes snapshot per project |
| Tests | **None committed yet** | see [Known limitations](#known-limitations) |

Total runtime dependencies: **four** (`express`, `googleapis`, `react`,
`react-dom`).

**Architecture in one paragraph.** `server/paths.js` decides every filesystem
location and both ports, once. `server/sheets/` and `server/google/` are the only
modules that talk to Google — they authenticate, read both ranges in a single
`batchGet`, write single cells, and manage the on-disk cache. `server/brief/` is
pure: given raw sheet rows and a project config it computes the dashboard payload
with no I/O. `server/notes/` computes the notes feed the same way and writes only
a local snapshot file. `server/config/` is the project registry and holds no
Sheets client, so it structurally cannot reach Google. `server/index.js` is the
process and `server/app.js` wires `server/routes/` into a routing table whose
every endpoint returns `200` with a JSON envelope. The frontend renders that
payload and posts single-cell edits back.

---

## Requirements

- **Node.js LTS** — built and verified on Node 24 / npm 11
- A **Google Cloud service account** with a JSON key (the app guides you through it)
- A **Google Sheet** laid out as in [Sheet layout](#sheet-layout) — a template is provided
- Windows only for the `.bat` launcher; everything else is cross-platform

---

## Quick start

```sh
git clone <this repo>
cd VPT
npm install
npm start
```

Then open **http://localhost:5177**.

On first run VPT creates `~/.vpt/` and — because there's no key in it yet —
shows a friendly setup panel instead of an error. Click **Set up Google access**
and follow the five steps; there's an **Open this folder** link that opens
`~/.vpt/` for you so you can drop the key straight in.

Nothing is gated: the app runs, the hub renders, and you can add projects before
a key exists. It just can't read sheets until one does.

---

## Google setup

The full walkthrough lives **inside the app** (Add Project → *"First time? Set up
Google access"*, with a **Show detailed step-by-step** toggle). It's kept there
rather than here because it can show the exact resolved path for *your* machine
and open the folder for you. The short version:

1. In the [Google Cloud Console](https://console.cloud.google.com/), create a
   project and enable the
   [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com).
2. Create a [service account](https://cloud.google.com/iam/docs/service-accounts-create)
   and [add a JSON key](https://cloud.google.com/iam/docs/keys-create-delete).
3. Save it as `~/.vpt/service_account.json` (`%USERPROFILE%\.vpt\service_account.json`
   on Windows), or point `VPT_SERVICE_ACCOUNT` at it.
4. Open the JSON, copy `client_email`, and
   [share your sheet](https://support.google.com/docs/answer/2494822) with that
   address — **Editor** to save edits from VPT, **Viewer** for read-only.
5. Paste the sheet ID (or the whole URL) into Add Project.

> **One key covers every project.** A service account is an *identity*, not a
> per-sheet password — the same key can read and write any number of sheets. You
> do steps 1–3 once, ever. Each new project after that is just: share the sheet
> with the same email, paste its ID.

**Step 4 is the one people miss.** Google won't suggest the service-account
address in the share picker and won't email anyone. If VPT says *"this sheet is
not shared with the service account"*, that's this step.

VPT creates the `~/.vpt/` **directory** for you. It never creates, generates, or
fabricates the key — that's Google-issued and only you can supply it.

---

## Sheet layout

Two tabs, header row first. Ranges default to `Tracker!A1:K1000` and
`KN!A1:G1000`, both overridable per project under *Sheet ranges* when you create it.

Templates with the exact headers are in [`templates/`](templates) and are
downloadable from the Add-Project screen. Import one into Google Sheets
(**File → Import**) and name the tab `Tracker`.

**`Tracker`** — one row per step:

```
id, phase, week, lane, title, prereq, blocked_by, status, guide_ref, done_when, notes
```

| Column | Meaning |
|---|---|
| `id` | Unique step id. Rows with no `id` are ignored, so blank spacer rows are safe. |
| `week` | `W0`, `W1`, … matching the schedule you generate |
| `lane` | `deep` (focused work) · `gap`, `test`, `biz`, `design` (short work) · `milestone`, `mobile` (informational — never listed as ready) |
| `prereq` | Step ids separated by `;` or `,`, or `none`. Unknown ids are ignored rather than treated as blocking. |
| `blocked_by` | KN ids, or `none` |
| `status` | `todo` \| `in_progress` \| `blocked` \| `done` \| `skipped` (empty = `todo`; `done` and `skipped` both count as complete) |
| `phase`, `guide_ref`, `done_when`, `notes` | Free text; `notes` is editable from the dashboard |

**`KN`** — known issues (optional):

```
id, severity, status, title, blocks, opened, notes
```

A KN counts as open unless its status is `resolved`, `closed` or `done`.

Columns are located **by header name**, never by position, so you can reorder
columns in the sheet without breaking writes.

---

## How "ready now" is decided

Worth knowing, since it's the whole point of the tool:

- A step is **ready** when it isn't `done`/`skipped`/`blocked` **and** every
  prereq that exists in the sheet is `done` or `skipped`.
- Ready steps scheduled for the current week **or earlier** show as *Ready Now*,
  split into **Deep** and **Gap** lanes.
- Later ones appear under **Pull Ahead**, but only when this week is nearly clear
  (≤ 2 ready items left), capped at 5.
- **Blocked** lists explicitly-blocked steps first, then steps with unmet
  prereqs (capped at 6) with a *"waiting on …"* reason.
- **Current week** is the latest `weekStarts` entry whose date is on or before
  today.

All of this is pure computation in `server/brief/` — no I/O, no network.

---

## Notes activity feed

A note typed into the `notes` column is the one thing on a shared tracker that
nothing surfaces later — the dashboard marks the row with a small glyph and you
have to already know to look. The **Notes** button in the project header opens a
slide-in panel that collects them.

- **Grouped by the status of the step the note sits on** (done, in progress,
  blocked, skipped, todo), with **New & changed** / **All notes** toggles, a
  search box, and a per-status chip you can switch on and off.
- **New and changed notes sort to the top**, and the header button carries a
  badge counting them (a plain number is the total when nothing is unseen).
- **✓ Mark all seen** acknowledges everything currently on screen. It is the
  *only* thing that resets what counts as new.

**How "new" is worked out.** The sheet exposes no change history VPT can read —
a pull returns the current notes and nothing about when they got there. So "new"
isn't discovered, it's *remembered*: `~/.vpt/vpt_notes_snapshot_<project>.json`
holds two slots — `previous` (the last state you acknowledged) and `current`
(what was last on screen) — and the feed diffs the sheet against `previous`.

What that means in practice:

- It is **new since this machine last marked all seen** — not since you last
  opened the project, and not since the last restart. Closing VPT overnight
  doesn't silently mark your unread notes as read.
- It is **per machine**. Two people on the same sheet each keep their own
  snapshot; marking seen on one machine doesn't affect the other.
- There is **no authorship**. VPT has no user identity, and a local diff can't
  tell you *who* typed a note — inventing a name would be a lie.
- The first view has no snapshot, so everything reads as new. That's correct:
  you haven't looked at any of it on this machine yet.
- A note **deleted** since your last snapshot drops out of the feed rather than
  being surfaced as a removal.

**It is read-only.** Nothing in the panel writes to the sheet: `POST
/api/notes/seen` moves the local snapshot file and holds no Sheets client. No
column is added and no schema changes — editing a note is still the per-step
editor's job, on the dashboard behind the panel. It also works offline: the diff
is against a local file, so a `⚠ cached` pull still answers "what changed since
I last looked" correctly.

**At most 300 cards are rendered** after filtering. A 20,000-row tracker can
produce 10,000 feed items, and putting them all in the DOM locked the tab up.
When the cap bites, the panel says *"Showing the first 300 of N matching
notes"* and you narrow with the filters or the search box. The cap is on
**rendering only** — the counts, the header badge and the diff always run over
the full set.

---

## Running it

Two modes, on purpose.

### Daily use — `npm start`

```sh
npm start
```

Builds the UI, then runs **one process on one port** serving both the API and the
built app: **http://localhost:5177**

No dev server, no file watchers, smaller footprint. `npm run build` and
`npm run serve` are the two halves if you want them separately (a rebuilt `dist/`
is picked up on the next page load; `index.html` is served `no-cache`).

### Development — `npm run dev`

```sh
npm run dev
```

Starts Vite on **http://localhost:5173** with hot reload plus the backend on
5177; Vite proxies `/api/*` to the backend, so the browser only talks to 5173.

`dev:server` runs under `node --watch-path=./server`, so editing anything in
`server/` restarts the backend automatically. The daily-use `serve` path
deliberately does *not* hot-restart.

| | dev | start |
|---|---|---|
| URL | http://localhost:5173 | http://localhost:5177 |
| Processes | Vite + backend | backend only |
| UI source | Vite dev server (HMR) | built `dist/` |
| Backend restarts on edit | yes | no |

---

## Configuration

### Environment variables

All optional. Nothing needs configuring for the default setup.

| Variable | Default | Does |
|---|---|---|
| `VPT_HOME` | `~/.vpt` | Base folder for the key and all caches |
| `VPT_SERVICE_ACCOUNT` | `$VPT_HOME/service_account.json` | Full path to the key, anywhere on disk |
| `VPT_PORT` | `5177` | Backend port (falls back to `PORT`, then 5177) |
| `VPT_UI_PORT` | `5173` | Vite dev-server port; dev mode only |

Ports are defined **once**, in `server/paths.js`. `vite.config.js` and both
`.bat` files read from that precedence, and **nothing in `src/` references a host
or port at all** — every frontend call is a relative `/api/…` path, which Vite
proxies in dev and which is same-origin under `npm start`. Changing ports needs
no code edit.

### Project config — `projects/<id>.json`

Written by the UI; safe to hand-edit (a restart picks it up).

```json
{
  "id": "example-project",
  "name": "Example Project",
  "spreadsheetId": "PASTE_YOUR_GOOGLE_SHEET_ID_HERE",
  "trackerRange": "Tracker!A1:K1000",
  "knRange": "KN!A1:G1000",
  "keyFile": "",
  "weekStarts": { "W1": "2026-01-05" },
  "milestones": [{ "date": "2026-03-01", "label": "Launch" }]
}
```

| Field | Notes |
|---|---|
| `id` | Becomes the filename. Letters, numbers, `-`, `_` only (max 64) — this also blocks path traversal |
| `name` | Shown on the hub (max 80 chars) |
| `spreadsheetId` | The part of the sheet URL between `/d/` and `/edit`. Paste the whole URL and VPT extracts it |
| `trackerRange` / `knRange` | Leave `knRange` empty if the sheet has no KN tab |
| `keyFile` | **Optional.** A different service-account key for this project — see below. Empty means "use the default" |
| `weekStarts` | `W<n>` → `YYYY-MM-DD`, max 104 entries |
| `milestones` | `{date, label}`, max 50 |

Files are written atomically (temp file + rename), and validation runs *before*
the write, so a rejected edit leaves the existing config untouched. A UTF-8 BOM
is tolerated, since Windows editors like to add one.

---

## Where VPT stores things

Everything outside the repo lives in one folder:

```
~/.vpt/
  service_account.json                your Google key — you supply this
  vpt_cache_<project>.json            last good pull, one per project
  vpt_notes_snapshot_<project>.json   what the notes feed diffs against, one per project
```

- Created on startup if missing (the **directory** only).
- Caches are written on every successful live fetch and read when a fetch fails.
- The notes snapshot is rewritten whenever the feed loads with data; its
  "last acknowledged" slot moves only when you press **Mark all seen**.
- Removing a project deletes its config, its cache **and** its notes snapshot —
  "remove" means gone from this machine. Your Google Sheet is never touched.
- If you upgraded from an older VPT that used a different folder, startup prints
  a one-line notice telling you where the leftovers are. VPT reports them and
  never moves or deletes anything outside its own folder.

---

## Multiple projects and multiple Google accounts

**One service account covers every project.** Add as many projects as you like,
pointing at as many different sheets as you like, all through the same key — you
just share each sheet with the same `client_email`. It doesn't matter which
Google account *owns* a sheet; the service account is a guest on its share list.

The one situation that genuinely needs a second key is a sheet inside a **Google
Workspace whose admin blocks sharing outside the organisation** — your service
account counts as external there and can't be added at all. In that case, create
a second service account *inside* that organisation, save its key alongside the
first, and point one project at it:

```json
{
  "id": "work-tracker",
  "spreadsheetId": "…",
  "keyFile": "work_key.json"
}
```

A bare filename is looked for in `~/.vpt/`; an absolute path is used as given.
Leave the field out and the project uses the default key — which is what every
other project should do. Restart VPT after adding it.

There's no UI field for this on purpose: it's a rare escape hatch, and putting it
in Add Project would make every new user read a question that doesn't apply to
them.

**Read-only alternative:** make a sheet you own that mirrors the locked one with
`=IMPORTRANGE(…)` and point VPT at yours — one key, no config. Note that
IMPORTRANGE **cannot be written through**, so status and notes edits won't reach
the original. Use it for dashboards you only read.

---

## The launcher (Windows)

### `launch-vpt.bat`

Double-click it, and it:

1. `cd`s to its own folder, so the repo can live anywhere (OneDrive included)
2. checks `/api/health` — **if VPT is already running it just opens the browser**
   instead of starting a second server
3. otherwise runs `npm start` in a **minimized** window titled *VPT server*
4. polls health until the server actually answers (up to ~3 minutes; the first
   build is the slow part)
5. opens your default browser

**Trade-off:** the server runs in a minimized console window, not a hidden one. A
`.bat` can't spawn a truly hidden process without a VBScript/PowerShell helper,
and a stray invisible `node` you can't find is worse than a taskbar window you
can close. Closing that window stops the server.

### Start it at login (Task Scheduler)

1. Press <kbd>Win</kbd>, type **Task Scheduler**, open it.
2. **Action → Create Task…** (not "Basic Task").
3. **General:** name it `VPT`. Leave "Run only when user is logged on" selected.
   Do **not** tick "Run with highest privileges" — it isn't needed.
4. **Triggers → New…** → *At log on*, your user → OK. Optionally tick
   **Delay task for: 30 seconds**.
5. **Actions → New…** → *Start a program*
   - *Program/script:* the full path to `launch-vpt.bat` in your clone
   - *Start in:* the repo folder
6. **Conditions:** untick *Start the task only if the computer is on AC power* if
   you're on a laptop.
7. OK, then right-click the task → **Run** to test without rebooting.

To remove: Task Scheduler Library → right-click `VPT` → **Disable** or **Delete**.

**Simpler alternative:** <kbd>Win</kbd>+<kbd>R</kbd> → `shell:startup` → drop a
shortcut to `launch-vpt.bat` in the folder that opens.

### Stopping — `stop-vpt.bat`

Finds whatever is *listening on VPT's port* and ends it — deliberately by port,
so it can't take down unrelated Node processes — then closes any leftover
*VPT server* window. Safe to run when nothing's running.

PowerShell equivalent:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 5177 |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

**macOS / Linux:** there's no shell equivalent of these scripts yet. `npm start`
works fine; you just don't get the double-click launcher.

---

## API

All local, all `200` with an `{ ok, … }` JSON envelope — **the UI is never handed
a 500**. Failures carry a machine-readable `reason` so the frontend can branch on
it instead of parsing message text.

| Route | Does |
|---|---|
| `GET /api/health` | Liveness for the launcher; never touches Google |
| `GET /api/setup` | Resolved key path, whether it exists, which override supplied it |
| `POST /api/setup/reveal` | Opens `~/.vpt/` in the OS file manager. Takes no parameters — the path is computed server-side |
| `GET /api/brief?project=<id>` | The computed dashboard payload |
| `POST /api/step` | Write one cell (`status`, `notes`, `blocked_by`) with the stale guard |
| `GET /api/notes?project=<id>` | The notes feed: every note that exists, flagged `new` / `changed` / `unchanged` against this machine’s snapshot |
| `POST /api/notes/seen?project=<id>` | Mark all seen — promotes the local snapshot. Local file only; cannot reach Google |
| `GET /api/projects` | List projects (config files + cached progress; no Google calls) |
| `POST /api/projects` | Create `projects/<id>.json` |
| `GET /api/projects/:id` | One project's full config |
| `PATCH /api/projects/:id` | Edit name / sheet id / milestones / weeks / keyFile |
| `DELETE /api/projects/:id` | Forget a project — removes its config **and** its cache |
| `POST /api/projects/:id/schedule` | Generate and save `weekStarts` |
| `GET /api/template/tracker.csv` · `kn.csv` | Download the sheet templates |

**Guarantees worth knowing:**

- `GET /api/brief` cannot hang and cannot 500. Every failure degrades to
  `source: 'cache'` or `source: 'none'` with a `failureKind` and an actionable
  `hint`.
- Writes are limited to a closed whitelist of three columns. `status` must be one
  of the five known values; `notes` caps at 2000 chars, `blocked_by` at 200.
  Request bodies cap at 64 KB.
- Writes require **live** data — VPT will not locate a row from a stale cache.
- Network calls time out at 6 s; building the Google client gets 20 s and is
  warmed at startup so the first request doesn't pay it.
- `DELETE`, the schedule/milestone routes and `POST /api/notes/seen` are
  **local-file only** and cannot reach Google. Removing a project never touches
  your sheet, and marking notes seen never writes to it.
- `GET /api/notes` reads through the same live → cache → none ladder as
  `/api/brief`, so the feed still works offline.

---

## Repo layout

```
VPT/
  launch-vpt.bat / stop-vpt.bat   start (and stop) the app for daily use
  vite.config.js                  dev server + /api proxy; ports come from server/paths.js
  index.html                      shell; paints the theme before first paint
  projects/<id>.json              one file per project (only the example is tracked)
  templates/                      CSVs the Add-Project screen offers for download
  docs/system-design.html         the architecture write-up
  shared/contract.js              validation rules both tiers import, so they can't drift
  server/
    index.js                      the process: listen, survive stray errors, say what happened
    app.js                        the routing table (/api routes → 404 + error handler → built UI)
    paths.js                      ~/.vpt, key path, cache + snapshot paths, ports — every location, once
    mode.js                       dev vs serve
    routes/                       one file per endpoint group: brief, steps, notes, projects, setup, health
    http/                         JSON envelopes, the /api 404 + error handler, serving dist/
    sheets/                       Sheet reads/writes and the on-disk cache (a1.js does the A1-range math)
    google/                       auth client + failure classification — the only import of googleapis
    brief/                        the compute: progress, current week, ready/blocked/pull-ahead (pure)
    notes/                        the notes feed diff (pure) + the local snapshot file
    config/                       project registry: create / read / patch / delete config files
    startup/                      the boot banner
  src/
    main.jsx, Root.jsx            entry; hub ↔ project view (no router)
    ErrorBoundary.jsx             backstops render-time failures with a Reload action
    Hub.jsx, hub/                 project list, empty state, hub header
    App.jsx, dashboard/           the dashboard and its brief-loading hook
    api.js                        every /api path and the fetch wrapper
    setup.js                      asks /api/setup where the key should go
    theme.jsx, tokens.js          warm light/dark theme, time-scheduled with manual override
    styles.js                     shared inline-style helpers
    notes/                        the slide-in notes panel, its grouping and its feed hook
    components/                   dashboard pieces: ProgressRing, MilestoneBar, LaneColumn, StepRow,
                                  BlockedList, KnList, ProjectCard, StatusChip, Header,
                                  NewProjectForm, SetupGuide, KeyMissingPanel, TemplateDownloads,
                                  FolderPath, ScheduleEditor (+ schedule/, setup/, stepRow/)
    ui/                           shared primitives: Field, Notice, SaveCancel, SectionCard,
                                  Skeleton, Toast
```

---

## Sharing and collaboration

**VPT stays local per person. The *sheet* is the shared thing.** There is no
shared server, no accounts, no login — and adding one is explicitly not part of
this tool's design.

That's enough to collaborate, because the sheet is the source of truth. For a
second person to see and edit the same project:

1. **Get the code.** Clone the repo on their machine, then `npm install`.
2. **Their own service-account key.** Either they create their own, or you hand
   them one you created. It goes at `~/.vpt/service_account.json` on *their*
   machine. *(Never email a key around casually — it's a credential. Prefer one
   service account per person so access can be revoked individually.)*
3. **Share the sheet with that service account's `client_email`** — Editor for
   edit rights, Viewer for read-only.
4. **Add the project in their hub** using the same spreadsheet URL/id. Project
   id, name, weeks and milestones are local config, so they'll set (or copy)
   their own `projects/<id>.json`; only the `spreadsheetId` has to match.

**Concurrent edits.** Before writing a cell, VPT re-reads it and compares against
what your page last saw. If it changed, the write is refused with a *"changed in
the sheet since this page loaded"* message and your view refreshes to the sheet's
truth — you're never silently overwritten. Be honest about the limit: the window
between that re-read and the write is small but **not zero**, so two people
saving the *same cell* in the same instant can still race. The realistic case (a
change made minutes ago on another machine) is fully covered. Full optimistic
concurrency was deliberately out of scope.

For notes specifically, a rejected save keeps your typed text so you can review
the other version and hit save again to deliberately overwrite. Nothing you typed
is lost.

**The notes feed is per machine, and anonymous.** Each person's "new since you
last looked" comes from their own local snapshot, so marking notes seen on one
machine has no effect on anyone else's. VPT has no user identity, so the feed
tells you a note is new — never who wrote it.

---

## Credential safety

- **Never commit `service_account.json`.** It's a live credential for your
  sheets. It lives in `~/.vpt/`, outside the repo, and `.gitignore` also blocks
  `service_account*.json`, `*credentials*.json`, `*client_secret*.json`, `*.pem`,
  `.vpt/`, `vpt_cache_*.json` and friends so a stray copy can't be committed
  either. `.gitignore` deliberately does *not* blanket-ignore `*.json` —
  `package.json` and the example config are real source files.
- **Your project configs stay private.** `projects/*.json` holds real spreadsheet
  ids and schedules, so only `projects/example-project.json` is tracked. Your own
  configs keep working; git just doesn't see them.
- **The key never reaches the browser.** That's the entire reason there's a
  backend: it's read by the Node process from disk and used server-side.
- **The server is local and unauthenticated**, which is fine for a machine-local
  tool — but it does mean anything running on your machine can call the API.
  Don't port-forward it or expose it to a network.
- **Rotate a leaked key** in the Google Cloud console (delete the key, create a
  new one, drop it in `~/.vpt/`). Revoking a person's access is just removing
  their service account from the sheet's Share list.

---

## Design decisions and non-goals

Things that look like omissions but are choices:

- **No auth, no accounts, no login.** VPT is a single-user local tool. The
  service-account key is not a user credential — it's a file you supply once.
- **No database.** One JSON file per project, plus a disposable cache and notes
  snapshot per project. A restart is the only cache-invalidation protocol needed.
- **No router.** The app has exactly two states. `useState` covers it.
- **No CSS framework.** Two token sets in `src/tokens.js` and inline style
  objects. The theme is warm in both modes — no pure black or white anywhere —
  and switches on a schedule with a manual override.
- **Never 500.** Every route returns a JSON envelope so the UI always has
  something to render and something to say.
- **Google is reachable from exactly two modules.** `sheets/` and `google/` —
  everything else, `config/` and `notes/` included, holds no Sheets client and is
  structurally incapable of touching your data.
- **No committed tests yet.** Behaviour has been verified by hand and with
  throwaway harnesses that were not kept. The natural first permanent targets are
  the pure functions: `brief/` (ready/blocked/pull-ahead), `notes/feed.js` (the
  diff), `config/validate.js`, and `parseRange`/`resolveCell` in `sheets/a1.js`.

---

## Known limitations

Honest about what it isn't:

- **Single-user by design.** The security model rests on the server being local
  and unauthenticated. It is not built to be exposed to a network.
- **Not responsive below ~1100px.** The layout has minimum column widths and no
  media queries; narrow viewports scroll horizontally. Responsiveness is
  deferred, not done.
- **Windows-first launcher.** `npm start` is cross-platform; the double-click
  launcher and start-at-login are Windows only.
- **No committed automated test suite yet.** Hardening was done with throwaway
  harnesses rather than tests kept in the repo.
- **A very large sheet slows the dashboard.** Some core lists — in progress, the
  ready lanes, open KNs — are uncapped, so a tracker in the tens of thousands of
  rows (20k, say) renders sluggishly. Only pull-ahead, implicit blockers and the
  notes feed are capped today. Extending the same treatment to the remaining
  lists is a known backlog item; it is not a notes-feed problem.
- **The stale-write window** described under
  [Sharing and collaboration](#sharing-and-collaboration) is narrow but not zero.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Setup panel instead of data | No service-account key yet. The panel shows the exact resolved path and can open the folder for you. |
| `✗ no data`, "still needs a sheet ID" | The project is still on the placeholder id. Paste the real one into the project, or recreate it with the sheet URL. |
| "This sheet is not shared with the service account" | The share step (setup step 4). Add the key's `client_email` to the sheet — Editor to save edits. |
| `✗ no data`, key present, sheet id set | Either the share step above, or the tab names don't match `trackerRange` / `knRange`. |
| `⚠ cached` | Network or Google unreachable; you're seeing the last good pull. Clears on the next successful refresh. |
| Edits fail with "can't save while offline" | Writes require live data — VPT won't locate a row from a stale cache. |
| "changed in the sheet since this page loaded" | The stale-write guard did its job. Your view refreshed; for notes, your text is kept so you can save again. |
| Nothing at localhost:5177 | Server isn't running: `npm start`, or `launch-vpt.bat`. |
| "port already in use" | Something is already on 5177 (probably VPT). Run `stop-vpt.bat`, or set `VPT_PORT`. |
| No current week / no countdown | No schedule yet — open **⚙ Schedule** and generate one. |
| `projects/<id>.json is not valid JSON` | A real syntax error — a trailing comma or a smart quote. (A UTF-8 BOM is tolerated.) |
| "Open this folder" does nothing | No file manager available (headless/locked-down machine). Use **Copy path** instead. |
| Backend changes ignored in dev | Shouldn't happen (`node --watch-path=./server`); check the `dev:server` pane for a restart line. |

---

## Status

Feature-complete through Milestone 4: read-only dashboard (M1), editing with the
stale-write guard (M2), warm theme plus the multi-project hub (M3), and
serve mode, the launcher and the schedule editor (M4). A subsequent pass moved
storage to `~/.vpt/`, made the frontend port-independent, and added the in-app
setup guide, sheet templates, and per-project key support. Since then the server
and frontend were split into the per-concern modules shown in
[Repo layout](#repo-layout), and the read-only
[notes activity feed](#notes-activity-feed) was added and hardened.
