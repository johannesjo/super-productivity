# Desktop calendar: month and multi-day views

## Intent

Add a focused calendar workspace to Super Productivity that is comparable in
capability to TickTick's desktop calendar for the two workflows requested for
this project:

- a dense, interactive month grid; and
- a configurable multi-day time grid covering 1 through 14 consecutive days.

The workspace must also be usable from a separate, always-on-top Electron
calendar window. It must be possible to create, complete, and reschedule tasks
there without opening the main application window.

This is feature and interaction parity only. It must not copy TickTick branding,
copy, icons, artwork, or proprietary assets.

## Scope

### Included

1. **Month view**
   - Seven calendar columns, ordered by the existing first-day-of-week setting,
     and five or six visible rows for the selected month.
   - Previous/next month navigation and a return-to-today action.
   - Muted adjacent-month dates and an accessible current-day marker.
   - Compact task rows with project/list colour, completion checkbox, title,
     optional scheduled time, and a deterministic `+N more` affordance.
   - Keyboard- and pointer-accessible creation from an empty date cell.

2. **Multi-day view**
   - A persisted selection from one to fourteen consecutive days.
   - Previous/next range navigation and a return-to-today action.
   - An all-day lane plus an hourly timeline for scheduled tasks.
   - Creation in an empty all-day or timed slot, task completion, and drag
     rescheduling within the visible range.

3. **Desktop calendar window**
   - A Windows/macOS/Linux Electron companion window that can be opened from
     Schedule and remains directly interactive while the main window is hidden.
   - User-resizable and movable bounds, restored only when still visible on a
     connected display.
   - Always-on-top is an explicit per-window option; it is enabled by default.
   - It renders its own restricted, static Electron page, modelled after the
     existing task widget. The primary Angular renderer remains the sole owner
     of NgRx state and writes.
   - The widget receives a serialised calendar projection over a narrowly
     scoped IPC channel. It sends typed create/complete/reschedule commands
     back to the primary renderer, which validates and applies existing task
     actions. This avoids a second Angular store and competing op-log writers.

4. **Visual quality and accessibility**
   - The supplied month-view reference is the layout baseline: a full-bleed
     seven-column grid, a shallow centred weekday strip, hairline separators,
     dates anchored at each cell's top-left, and task rows stacked directly
     below the date rather than card-like event blocks.
   - Task rows are compact horizontal strips: checkbox/state glyph on the
     left, clipped title in the centre, optional time aligned right, and a
     muted colour fill. Adjacent-month content is faded per cell; today is a
     small circular date marker, not a full-cell highlight.
   - The calendar uses the existing CSS variables, spacing scale, typography,
     focus-ring token, and light/dark themes. It recreates these layout and
     density rules with Super Productivity's own colours and icons rather
     than copying TickTick assets or identity.
   - The main Schedule view and the companion window use the same layout rules
     and task presentation semantics.
   - All interactive calendar cells and task rows have names, keyboard paths,
     visible focus indicators, and no colour-only state communication.

### Explicitly excluded

- Year, agenda, and multi-week views.
- External-calendar API additions, two-way provider sync changes, new recurring
  semantics, habits, holidays, lunar calendars, and course schedules.
- New persisted task fields, schema bumps, or op-log payload changes.
- Copying TickTick visual assets or product identity.

## Architecture

### Shared calendar projection

The schedule feature will expose pure helpers that transform existing
`ScheduleEvent` values into a view-model for a month cell or a timed range.
They own date-range generation, adjacent-month classification, stable event
ordering, and overflow calculation. Component templates consume this
view-model and must not repeatedly filter all events during change detection.

Month and multi-day components remain standalone Angular components under
`src/app/features/schedule/`. They reuse Schedule's existing selected-view
persistence and task mutation services. The existing day and week views remain
unchanged.

### Interaction boundary

Empty-cell creation resolves to the cell's logical date; a timed slot also sets
its start time. Dragging uses existing task scheduling operations rather than
writing fields directly. Completion dispatches the existing task-completion
operation. Therefore every user operation remains one established task intent
and preserves current offline and sync behaviour.

### Electron companion

The companion follows the existing `electron/task-widget/` pattern:

1. Electron creates a hardened, frameless `BrowserWindow` using context
   isolation, disabled Node integration, and `assertSecureWebPreferences`.
2. The primary Angular renderer responds to a request for the active calendar
   projection and pushes updates when relevant local task actions occur.
3. The companion's preload exposes only typed render/update and user-command
   IPC calls. The main process routes commands to the primary renderer; it does
   not mutate task data.
4. The primary renderer validates the command and invokes existing task APIs.
   It then sends the refreshed projection to the companion.

This deliberately keeps task persistence, sync, and conflict handling in one
renderer. Bounds and desktop-only presentation preferences are saved in the
existing local simple store, never synced with user task data.

## Delivery sequence

1. **Calendar projection and month grid.** Add pure, test-first projection
   helpers; implement the responsive month layout and in-app interaction.
2. **Multi-day grid.** Add range selection, all-day/timed layout, navigation,
   and rescheduling interactions.
3. **Desktop companion.** Add hardened Electron window, IPC contracts, local
   bounds/preferences, and the matching interactive renderer.
4. **Polish and documentation.** Test light/dark layouts, keyboard operation,
   narrow widths, desktop state restoration, and document the desktop-only
   capability in the wiki.

Each delivery is a separate PR. The implementation starts with the first PR;
the design intentionally does not promise a single oversized PR.

## Verification

- Unit tests prove date grids, week-start behaviour, adjacent-month state,
  ordering, overflow, and 1/14-day boundaries.
- Component tests prove task rendering and accessible empty-cell controls.
- Electron tests cover secure web preferences, bounds restoration, IPC
  forwarding, and no-op behaviour without a primary renderer.
- A focused Playwright journey covers creation, completion, and rescheduling in
  the main Schedule page. The desktop companion journey covers opening the
  window, receiving a projection, and routing an interaction to the primary
  window.
- Every changed TypeScript and SCSS file runs through `npm run checkFile`;
  affected unit tests, Electron tests, lint, and a production build provide
  final evidence.

## Success criteria

On a supported desktop build, a user can open Schedule in either month or
multi-day mode, immediately identify days and task timing, create and complete
tasks from the calendar, and move a task to another visible day or time. The
same capability is available in the separate calendar window without creating
a second task store or changing the persisted task schema.
