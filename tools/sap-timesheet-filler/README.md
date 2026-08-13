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

## Weekly use

1. Open your SAP timesheet on the **current week** (the script matches columns
   by this week's day names and dates — English and German are supported).
2. A small **"SAP timesheet filler"** panel appears in the bottom-right corner.
   If the timesheet is embedded in a frame, a panel appears inside that frame —
   use that one.
3. Click **Fill 8h**. The panel reports what it filled, e.g.
   `✓ Mon 10.08. = 8 (label)`.
4. Check the values on screen, then press **Save** in SAP as usual.

## If the wrong fields (or none) are filled

Every SAP install renders its timesheet differently, so automatic detection can
miss. Fix it once with teach mode:

1. Click **Teach fields** in the panel.
2. Click the hours input for each day the panel asks for (Mon, Tue, Wed, Thu).
   `Esc` cancels.
3. The fields are remembered for this site (stored in your browser's
   localStorage). From then on, **Fill** uses them directly.

**Forget taught** clears the stored fields and returns to auto-detection.

Teach mode is also the answer for multi-row timesheets (several
projects/positions per week): auto-detection targets the topmost row, so teach
it the row you actually book on.

## Adjusting the schedule

Edit the config block at the top of the script:

```js
const HOURS = '8'; // use '8,00' if your SAP expects a decimal comma
const FILL_DAYS = ['mon', 'tue', 'wed', 'thu'];
```

## Without a browser extension

If you can't install extensions (locked-down corporate browser), you can paste
the script body (everything from `(function () {` to the end) into the DevTools
console (`F12` → Console) while the timesheet page is open. If the timesheet is
inside a frame, first select that frame in the console's context dropdown. The
panel appears and works the same way; you just have to paste again next week.

## How field detection works

For each configured day of the current week the script tries, in order:

1. **Taught fields** — what you clicked in teach mode (matched by id, name,
   aria-label, placeholder and position).
2. **Labels** — the input's own `aria-label` / placeholder / `<label>` /
   table or ARIA-grid column header, matched against day names (`Monday`,
   `Montag`, `Mo`, …) and this week's dates in common formats (`10.08.`,
   `08/10`, `2026-08-10`, …).
3. **Position** — a short text on the page naming the day (e.g. a column
   header rendered as a plain `<div>`, common in SAP UI5 grids), paired with
   the nearest input below it in the same column.

Values are set with the native value setter plus `input`/`change` events, so
UI5/React-style forms register the change like real typing.
