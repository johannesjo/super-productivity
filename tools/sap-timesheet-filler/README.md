# Timesheet Filler

Fills a day-per-row timesheet — the SAP Fiori _Time Entry_ shape, where each
calendar day is a group row and the fields are columns. It runs in your own
browser, in your own logged-in session.

**Nothing about the timesheet is hard-coded.** The script reads the table's own
column headers and gives you one box per column: whatever you type is what it
fills. New column, renamed column, different app — no code change.

**It fills the week that is on screen.** Navigate to any week, click Fill.

**It never saves or submits.** You review the result and press Save yourself.

## Use it

**As a bookmarklet** (no extension needed): create a bookmark, name it e.g.
`Fill`, and paste the whole content of
[`sap-timesheet-filler.bookmarklet.txt`](./sap-timesheet-filler.bookmarklet.txt)
(one long `javascript:…` line) as its URL. Open the timesheet and click it.

**As a userscript**: paste
[`sap-timesheet-filler.user.js`](./sap-timesheet-filler.user.js) into
Tampermonkey and change the `@match` line to your SAP host. The advantage over
the bookmarklet is that it also reaches cross-origin frames.

## The panel

- **Days** — tick which days of the week on screen to fill.
- **One box per column** — the columns come from the table itself. The first
  time a column is seen it gets a sensible guess (Assignment `*`, Entered `8`,
  Start `09:00`, End `17:00`, Attendance Type `0800`); after that it is just a
  setting you edit. Everything is stored per site.
- **Fill** — does the work. **Rescan** — re-reads the columns, for when the app
  finished rendering after the panel opened, or the columns changed.

Values:

| You type  | What happens                                        |
| --------- | --------------------------------------------------- |
| _(empty)_ | the column is left alone                            |
| `*`       | the **first entry** of that column's dropdown       |
| a value   | typed in — or selected, if the column is a dropdown |

`*` is what makes the Assignment work: a dropdown stores a key, not text, so
the entry has to be genuinely selected — that is what the _"WBS must not be
empty"_ error is about. If the list only loads once opened, the first day opens
it and the rest reuse the same entry, keeping the week consistent. If the
column has no reachable dropdown, `*` falls back to the value that column
already holds on another day.

**A day that already has a value in one of your filled columns is skipped**
(`• Mon 17. already has … — untouched`), so clicking Fill twice is harmless. An
hours field showing `0,00` counts as empty, not as booked.

## Reading the result

- `✓ Tue 18.: AÜ-…, 0800, 8, 09:00, 17:00` — filled.
- `• Mon 17. already has … — untouched` — skipped, nothing changed.
- `✗ … — REJECTED: Assignment` — that column refused the value.
- `⚠ Tue 18. went back to empty — rejected.` — it took the values and reverted
  a moment later. Checked ~1s after filling, so a fill that looks fine really
  is.
- `No rows for the ticked days in the week on screen.`
- `No table with fillable fields on this page.` — wrong page, or the timesheet
  is in a frame the bookmarklet can't see; use the userscript.

## The 30-minute break message

`Attention ! Keep the 30 minutes break !` appears because 09:00–17:00 is an
8-hour span holding 8 booked hours, leaving no room for a break (ArbZG §4
requires 30 minutes beyond 6 hours). It is a warning to acknowledge, not a
rejection — the entry saves.

The break is not working time and is not booked, so the fix is the span rather
than the hours: set the End column to `17:30` and the message stops.

## How it finds things

- **The table** — the one on the page holding the most fillable inputs.
- **The days** — a row that names a weekday and has no inputs of its own is a
  heading; the input rows under it belong to that day. No comparison against
  today's date, which is why any week works.
- **The columns** — each cell's own column header (via `data-sap-ui-column`, or
  its position in the header row).

## Rebuilding the bookmarklet

Only needed if you change the script itself — the panel settings live in the
browser, not in the bookmarklet.

```sh
node build-bookmarklet.js   # uses npx terser, fetched on first run
```

Then re-paste the bookmark URL.
