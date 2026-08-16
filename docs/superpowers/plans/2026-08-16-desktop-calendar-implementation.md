# Desktop calendar implementation plan

> **For implementation:** execute the numbered tasks in order, using a
> red-green-refactor loop. The first pull request is intentionally scoped to
> the screenshot-accurate in-app month view; the separately documented
> multi-day and Electron companion deliveries follow it.

## Goal

Replace Schedule's current sparse month presentation with a dense desktop
calendar grid that follows the user-provided visual reference while retaining
existing task selection, menu, and theme behaviour.

## Architecture

`ScheduleMonthComponent` already owns the 7-column month grid. Keep its
existing `ScheduleService` query boundary and enhance its DOM semantics with
month-specific classes. `ScheduleEventComponent` continues to own task
selection and contextual actions, but receives a month-specific host class so
only month events adopt the compact strip layout. No task fields, store shape,
or calendar-provider contracts change.

## Implementation tasks

### 1. Add a failing semantic-rendering test for the month grid

**Files:**
- Modify `src/app/features/schedule/schedule-month/schedule-month.component.spec.ts`

1. Add a fixture case containing a current-month date, an adjacent-month date,
   and a task event.
2. Assert that each day cell exposes its logical date, receives the schedule
   class, and that task rows receive the month presentation hook.
3. Run the focused spec and confirm the new expectation fails before markup is
   changed.

### 2. Add semantic month layout hooks

**Files:**
- Modify `src/app/features/schedule/schedule-month/schedule-month.component.html`
- Modify `src/app/features/schedule/schedule-month/schedule-month.component.ts`

1. Give each cell a stable calendar-cell class and an accessible date label.
2. Tag its event container and `schedule-event` host with a month-presentation
   class without changing event selection or context-menu behavior.
3. Keep the existing event ordering and overflow rules intact.
4. Re-run the focused spec; it must pass.

### 3. Implement the reference-aligned month grid styling

**Files:**
- Modify `src/app/features/schedule/schedule-month/schedule-month.component.scss`

1. Make the grid full-bleed within the schedule viewport, use one-pixel
   separators without doubled borders, and add a shallow weekday header.
2. Anchor numbers in the top-left, fade only adjacent-month cells, and use a
   compact circular marker for today.
3. Remove card-like cell chrome and tune visible event count/overflow for the
   six-row desktop layout while preserving responsive fallbacks.
4. Run `npm run checkFile` for the changed SCSS file.

### 4. Give existing schedule events a compact month-only presentation

**Files:**
- Modify `src/app/features/schedule/schedule-event/schedule-event.component.ts`
- Modify `src/app/features/schedule/schedule-event/schedule-event.component.html`
- Modify `src/app/features/schedule/schedule-event/schedule-event.component.scss`
- Modify `src/app/features/schedule/schedule-event/schedule-event.component.spec.ts`

1. First add a failing test proving `isMonthView` produces the month host
   class without affecting normal day/week event classes.
2. Add the host class and a month-only optional time element using the existing
   formatted clock value; do not introduce a second time formatter.
3. Style the month host as a 22px horizontal strip: low-radius colour fill,
   left status glyph, title ellipsis, and right-aligned time. Preserve current
   interactions and hide only redundant schedule icons in month mode.
4. Re-run the focused event and month specs; then run `npm run checkFile` for
   all changed TypeScript/SCSS files.

### 5. Verify the visible desktop layout and document the result

**Files:**
- Modify `docs/wiki/` only if the repository's Schedule documentation has a
  matching user-facing page.

1. Run the targeted unit specs and `npm run lint` or the repository-equivalent
   check specified by `package.json`.
2. Start the app at desktop viewport size, switch Schedule to month view, and
   inspect a populated calendar for the reference characteristics: 7 columns,
   restrained grid lines, faded neighboring-month cells, current-day marker,
   and compact task strips.
3. If a user-facing Schedule page is found, add a concise description of the
   refreshed month view and its existing task-selection behavior.
4. Review `git diff`, create a focused commit, push the feature branch, and
   open a PR against the upstream project. State plainly that multi-day and
   desktop companion-window interaction remain the next planned deliveries.

## Verification commands

```powershell
npm test -- --include src/app/features/schedule/schedule-month/schedule-month.component.spec.ts
npm test -- --include src/app/features/schedule/schedule-event/schedule-event.component.spec.ts
npm run checkFile src/app/features/schedule/schedule-month/schedule-month.component.ts
npm run checkFile src/app/features/schedule/schedule-month/schedule-month.component.scss
npm run checkFile src/app/features/schedule/schedule-event/schedule-event.component.ts
npm run checkFile src/app/features/schedule/schedule-event/schedule-event.component.scss
npm run lint
```

## Self-review

- This plan avoids new dependencies and persisted state.
- It keeps all existing task writes inside `ScheduleEventComponent`.
- It explicitly limits the immediate PR to the month-view slice, avoiding a
  misleading claim that a desktop companion or 14-day view already exists.
- Tests precede production changes and the visible reference is checked at a
  desktop viewport.
