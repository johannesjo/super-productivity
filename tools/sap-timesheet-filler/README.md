# SAP Timesheet Filler

A small userscript that fills the **current week** of an SAP timesheet with
**8 hours on Monday–Thursday** in one click. It runs in your own browser, in
your own logged-in SAP session.

**It never saves or submits anything.** It only types values into the day
fields — you review the result and press SAP's own _Save_ button yourself.

## Install (once)

1. Install a userscript manager in your browser, e.g.
   [Tampermonkey](https://www.tampermonkey.net/) or Violentmonkey.
2. Create a new userscript and paste the whole content of
   [`sap-timesheet-filler.user.js`](./sap-timesheet-filler.user.js) into it.
3. **Edit the `@match` line** at the top so it points at your SAP host.
   Open your timesheet in SAP, copy the domain from the address bar, and use:

   ```
   // @match https://<your-sap-domain>/*
   ```

   (If your timesheet loads content from a second domain inside a frame, add a
   second `@match` line for that domain too.)

4. Save the script.

## Two timesheet layouts

SAP timesheets come in two fundamentally different shapes, and the script picks
the right engine automatically:

**Fiori "Time Entry" (day per row).** Each calendar day is a group row
(_"Monday, August 10, 2026"_) with the entry rows underneath, and the columns
are fields: Assignment, Attendance Type, Entered (hours), Start/End Time. This
is detected first; if the page has such a table, everything below about
columns, teach mode and the WBS box being required does not apply.

**Classic (day per column).** One row per project with Mon–Sun as columns. Days
are matched by column header, and teach mode exists for the layouts where
automatic detection can't work.

## The Assignment / WBS

SAP rejects a row without a project code — _"Input to the WBS invalid. WBS must
not be empty."_ — so the hours alone are never enough.

**In the Fiori layout** the code lives in the row's **Assignment** dropdown, and
by default the script **selects the first entry** in it — reported as
`assignment AÜ-… (1st entry)`. Nothing to type. Once one day has resolved, the
remaining days reuse that same code, so the whole week stays consistent and
only the first day waits for a list that loads lazily.

To book a different assignment, type its code into the panel's **Assignment /
WBS** box; the script then selects that entry instead, and the value is stored
per site for future weeks. If no dropdown is reachable at all it falls back to
the code from a day already booked this week.

The entry is _selected_, not typed, so SAP stores the underlying key rather
than display text. Where that isn't possible the panel says `(typed)` — if SAP
then still reports an empty WBS, pick the value from the dropdown once by hand.

**In the classic layout** the box is required, and two safety rules apply:

- If the row **already** carries a different project code, it is left
  untouched and reported (`• WBS already set to … — left unchanged`) rather
  than overwritten.
- The WBS field is only filled when found via a real label/column header or
  taught explicitly — unlike the hours fields it is never guessed by position,
  because a project code in the wrong field is worse than an empty one. If the
  panel reports `✗ WBS — field not found`, use **Teach fields**.

## Days that are already booked are never touched

In the Fiori layout a day that already has hours is reported
(`• Mon 10.08. already booked 8,00 — left as is`) and skipped entirely — no
overwriting of submitted entries, so running Fill twice is harmless.

## Weekly use

1. Open your SAP timesheet on the **current week** (the script matches columns
   by this week's day names and dates — English and German are supported).
2. A small **"SAP timesheet filler"** panel appears in the bottom-right corner.
   If the timesheet is embedded in a frame, a panel appears inside that frame —
   use that one.
3. Click **Fill 8h**. The panel reports what it filled per day — in the Fiori
   layout `✓ Tue 11.08.: assignment AÜ-… (1st entry), type 0800, 09:00–17:00,
   8 h`, in the classic layout `✓ Tue 11.08. = 8 (label)`. Nothing is ever
   changed silently: skipped days and overwritten values are both spelled out.
4. Check the values on screen, then press **Save** in SAP as usual.

## If the wrong fields (or none) are filled

Every SAP install renders its timesheet differently, so automatic detection can
miss. Fix it once with teach mode:

1. Click **Teach fields** in the panel.
2. Click the input the panel asks for: the hours field for each day (Mon, Tue,
   Wed, Thu), then your row's WBS / PSP element field. **Skip field** leaves
   one out (e.g. if your timesheet has no WBS column), `Esc` cancels.
3. The fields are remembered for this site (stored in your browser's
   localStorage). From then on, **Fill** uses them directly.

**Forget taught** clears the stored fields and returns to auto-detection.

Teach mode is also the answer for multi-row timesheets (several
projects/positions per week): auto-detection targets the topmost row, so teach
it the row you actually book on.

## SAP messages when you save

**"Input to the WBS invalid. WBS must not be empty."** — the row carries no
project code. In the Fiori layout that is the row's **Assignment**; the script
copies it from a day you already booked, or from the panel box when no booked
day exists. See [The Assignment / WBS](#the-assignment--wbs).

**"Attention ! Keep the 30 minutes break !"** — the day's **start/end span
leaves no room for a break**. German working-time law (ArbZG §4) requires a
30-minute break once a working day exceeds 6 hours, so 8 booked hours between
09:00 and 17:00 describes 8 hours of work with nothing in between, and SAP says
so.

**The script fills 09:00–17:00, so expect this message.** It is a warning to
acknowledge (press Enter / continue), not a rejection — the entry saves. The
break is not working time and is not booked, so if you would rather not see it,
the fix is the span rather than the hours: 8 hours of work plus a 30-minute
break means being present until **17:30**. Change the constant at the top of
the script:

```js
const START_TIME = '09:00';
const END_TIME = '17:00'; // '17:30' = 8h work + 30min break, no warning
```

## Adjusting the schedule

Edit the config block at the top of the script:

```js
const HOURS = '8'; // use '8,00' if your SAP expects a decimal comma
const FILL_DAYS = ['mon', 'tue', 'wed', 'thu'];
const START_TIME = '09:00'; // Fiori layout only
const END_TIME = '17:00';
```

The assignment is **not** configured here — the first dropdown entry is used,
or whatever you type into the panel box, which stores it per site so the
bookmarklet does not have to be rebuilt when your project changes.

## Running it as a bookmarklet (no extension needed)

The script also ships as a bookmarklet —
[`sap-timesheet-filler.bookmarklet.txt`](./sap-timesheet-filler.bookmarklet.txt):

1. Create a new bookmark in your browser (right-click the bookmarks bar →
   _Add page…_).
2. Name it e.g. `SAP 8h`, and paste the **entire** content of the `.txt` file
   (one long `javascript:…` line) as the URL.
3. Open your timesheet, click the bookmark — the same panel appears (no
   `@match` setup needed, it simply runs on whatever page you click it on).

The bookmarklet walks all **same-origin** frames, so iframe-embedded
timesheets work too. Its limits versus the userscript: it cannot reach
**cross-origin** frames (timesheet served from a different domain than the
portal around it), and rare sites block `javascript:` URLs via their content
security policy — in both cases use the Tampermonkey route.

After changing `HOURS`/`FILL_DAYS` in the userscript, regenerate with
`node build-bookmarklet.js` (uses `npx terser`, fetched on first run) and
re-paste the bookmark URL.

As a last resort you can also paste the script body (everything from
`(function () {` to the end) into the DevTools console (`F12` → Console) while
the timesheet page is open — select the timesheet's frame in the console
context dropdown if it sits in one.

## How field detection works

**Fiori layout:** the table is recognised by its day group rows. Each group
title is matched to a day of the current week by weekday name _and_ day of
month (so a two-week table stays unambiguous), and within that day's first
entry row the fields are found by role and column header — the hours field is
the row's `spinbutton`, the Assignment its `combobox`, and Attendance Type /
Start Time / End Time come from their column headers. The Assignment is set
through the UI5 control so the dropdown entry is genuinely selected; if its
list is still empty, the dropdown is opened once to load it.

**Classic layout:** for each configured day of the current week — and for the
WBS field — the script tries, in order:

1. **Taught fields** — what you clicked in teach mode (matched by id, name,
   aria-label, placeholder and position).
2. **Labels** — the input's own `aria-label` / placeholder / `<label>` /
   table or ARIA-grid column header, matched against day names (`Monday`,
   `Montag`, `Mo`, …), this week's dates in common formats (`10.08.`,
   `08/10`, `2026-08-10`, …), and for the project field `WBS` / `PSP`
   (so `WBS Element`, `Receiver WBS element` and `PSP-Element` all match).
3. **Position** — a short text on the page naming the day (e.g. a column
   header rendered as a plain `<div>`, common in SAP UI5 grids), paired with
   the nearest input below it in the same column. **Hours fields only** — the
   WBS field is never matched this way.

A text naming two targets at once is treated as ambiguous and ignored, and each
input is claimed by at most one target, so a single field can't be filled twice.

Values are set with the native value setter plus `input`/`change` events, so
UI5/React-style forms register the change like real typing.
