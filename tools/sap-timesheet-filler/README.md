# SAP Timesheet Filler

Fills the SAP Fiori _Time Entry_ timesheet — hours, Assignment and start/end
time per day — in one click. It runs in your own browser, in your own
logged-in session.

**It fills the week that is on screen.** Navigate to any week, click Fill.
There is no "current week" assumption to fight with.

**It never saves or submits.** You review the result and press SAP's own
_Save_.

## Scope

The Fiori _Time Entry_ app: the timesheet that lists **one group row per
calendar day** (_"Monday, August 17, 2026"_) with Assignment, Attendance Type,
Entered, Start Time and End Time as columns.

On any other page the panel says so and does nothing. That is deliberate — a
tool that guesses at unknown fields is worse than one that declines.

## Use it

**As a bookmarklet** (no extension needed): create a bookmark, name it e.g.
`SAP fill`, and paste the whole content of
[`sap-timesheet-filler.bookmarklet.txt`](./sap-timesheet-filler.bookmarklet.txt)
(one long `javascript:…` line) as its URL. Open the timesheet on the week you
want and click it.

**As a userscript**: paste
[`sap-timesheet-filler.user.js`](./sap-timesheet-filler.user.js) into
Tampermonkey and change the `@match` line to your SAP host. The advantage over
the bookmarklet is that it also reaches cross-origin frames.

## The panel

Everything is set in the panel and stored per site — no editing code, no
rebuilding the bookmarklet when something changes:

| Setting         | Default           | Meaning                                                      |
| --------------- | ----------------- | ------------------------------------------------------------ |
| **Assignment**  | empty             | empty = the **first entry** of the row's dropdown; or a code |
| **Hours**       | `8`               | what goes in the Entered field                               |
| **Start / End** | `09:00` / `17:00` | leave one blank to skip it                                   |
| **Type**        | `0800`            | Attendance Type, only used if no booked day supplies one     |
| **Days**        | Mon–Thu           | which days of the shown week to fill                         |

Click **Fill**, check what it reports, then press Save in SAP.

## What it fills

For each selected day it takes that day's first entry row and fills only what
is still empty. The Assignment is _selected_ from the dropdown, not typed, so
SAP stores the underlying key — that is what the _"WBS must not be empty"_
error is about. If the list only loads once opened, the first day opens it; the
rest reuse the same code so the week stays consistent.

**A day that already has hours is never touched** (`• Mon 17. already 8,00 —
untouched`), so clicking Fill twice is harmless.

## Reading the result

- `✓ Tue 18.: AÜ-…, type 0800, 09:00, 17:00, 8 h` — filled.
- `• Mon 17. already 8,00 — untouched` — skipped, nothing changed.
- `✗ … — REJECTED: hours` — the field did not accept the value.
- `⚠ Tue 18. went back to empty` — it took the value and then reverted a moment
  later, meaning SAP refused it. Checked ~1s after filling, so a fill that
  looks fine really is.
- `Table found, but none of the selected days are in it.` — the week on screen
  doesn't contain your selected days.
- `No Time Entry table on this page.` — wrong page, or the timesheet is in a
  frame the bookmarklet can't see; use the userscript.

## The 30-minute break message

`Attention ! Keep the 30 minutes break !` appears because 09:00–17:00 is an
8-hour span holding 8 booked hours, leaving no room for a break (ArbZG §4
requires 30 minutes beyond 6 hours). It is a warning to acknowledge, not a
rejection — the entry saves.

The break is not working time and is not booked, so the fix is the span rather
than the hours: set **End** to `17:30` in the panel and the message stops.

## Rebuilding the bookmarklet

Only needed if you change the script itself — the panel settings are stored in
the browser, not baked into the bookmarklet.

```sh
node build-bookmarklet.js   # uses npx terser, fetched on first run
```

Then re-paste the bookmark URL.
