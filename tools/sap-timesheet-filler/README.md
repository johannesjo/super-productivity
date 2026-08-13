# SAP Timesheet Filler

Fills the **current week** of the SAP Fiori _Time Entry_ timesheet with
**8 hours on Monday–Thursday** in one click, including each row's Assignment
and start/end time. It runs in your own browser, in your own logged-in session.

**It never saves or submits.** It fills fields; you review and press SAP's own
_Save_.

## Scope

This targets the Fiori _Time Entry_ app: the timesheet that lists **one group
row per calendar day** (_"Monday, August 10, 2026"_) with Assignment,
Attendance Type, Entered, Start Time and End Time as columns.

On any other page the panel says so and does nothing. That is deliberate — a
tool that guesses at unknown fields is worse than one that declines.

## Use it

**As a bookmarklet** (no extension needed): create a bookmark, name it e.g.
`SAP 8h`, and paste the whole content of
[`sap-timesheet-filler.bookmarklet.txt`](./sap-timesheet-filler.bookmarklet.txt)
(one long `javascript:…` line) as its URL. Open the timesheet on the current
week and click it.

**As a userscript**: paste
[`sap-timesheet-filler.user.js`](./sap-timesheet-filler.user.js) into
Tampermonkey and change the `@match` line to your SAP host. The advantage over
the bookmarklet is that it also reaches cross-origin frames.

Either way a small panel appears. Click **Fill 8h Mon–Thu**, check what it
reports, then press Save in SAP.

## What it does per day

For each of Mon–Thu of the current week it takes that day's first entry row and
fills what is still empty:

| Field           | Value                                                     |
| --------------- | --------------------------------------------------------- |
| Assignment      | the dropdown's **first entry** (or the panel box, if set) |
| Attendance Type | copied from a day already booked this week                |
| Start / End     | `09:00` / `17:00`                                         |
| Entered         | `8`                                                       |

The Assignment is _selected_ from the dropdown, not typed, so SAP stores the
underlying key — that is what the _"WBS must not be empty"_ error is about. If
the list loads only once opened, the first day opens it; the rest reuse the
same code so the week stays consistent.

**A day that already has hours is never touched** (`• Mon 10.08. already 8,00 —
untouched`), so clicking Fill twice is harmless.

## Reading the result

- `✓ Tue 11.08.: AÜ-…, type 0800, 09:00, 17:00, 8 h` — filled.
- `• Mon 10.08. already 8,00 — untouched` — skipped, nothing changed.
- `✗ … — REJECTED: hours` — the field did not accept the value.
- `⚠ Tue 11.08. went back to empty` — it accepted the value and then reverted
  it a moment later, which means SAP refused it. Checked ~1s after filling, so
  a fill that looks fine really is.
- `No Time Entry table on this page.` — wrong page, or the timesheet is in a
  frame the bookmarklet can't see; use the userscript.

## The 30-minute break message

`Attention ! Keep the 30 minutes break !` appears because 09:00–17:00 is an
8-hour span holding 8 booked hours, leaving no room for a break (ArbZG §4
requires 30 minutes beyond 6 hours). It is a warning to acknowledge, not a
rejection — the entry saves.

The break is not working time and is not booked, so the fix is the span, not
the hours: being present until **17:30** is 8 hours of work plus the break.

## Settings

Top of the userscript:

```js
const HOURS = '8';
const FILL_DAYS = ['mon', 'tue', 'wed', 'thu'];
const START_TIME = '09:00';
const END_TIME = '17:00'; // '17:30' silences the break warning
```

After changing these, rebuild the bookmarklet with `node build-bookmarklet.js`
(uses `npx terser`, fetched on first run) and re-paste the bookmark URL.

The Assignment is not set here — it comes from the dropdown, or from the panel
box, which is stored per site.
