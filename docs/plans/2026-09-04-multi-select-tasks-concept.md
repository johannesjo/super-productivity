# Multi-select & bulk actions for tasks — concept

**Status:** Draft concept for discussion (2026-09-04). Not implemented.

**Closes / consolidates:** #4645 (27 👍, "Select and change multiple tasks"), #7058 (19 👍, "multi-select / batch operations + recurring tasks"), #6352 ("Deleting multiple tasks at once"). Duplicates already closed in favour of #4645: #5685 (11 👍), #9022. Related: #6486 (delete all instances of a recurring task), #8273 (move tasks to backlog from tag view), #6551 (focused vs. selected task, plugin API). Existing attempt: PR #7146 (2204 commits behind master, see §9).

---

## 1. Problem

Every task edit in Super Productivity is one task at a time. Users asking for this feature describe the same three moments:

1. **Replanning:** "I have 15 leftover tasks from yesterday and want to push them all to Friday / unschedule them / drop them into the backlog." (#4645, #7058 comments)
2. **Reorganising:** "I'm restructuring projects and tags and need to move 30 tasks to another project or retag them." (#7058, #4645 comments — two users explicitly say this stops them from adopting the app)
3. **Cleaning up:** "Delete or complete a whole batch of tasks, including all instances of a recurring task." (#6352, #6486, #7058)

One commenter measured it: four clicks to change one date, so 80 interactions for 20 tasks. The product principle _"a feature ships only if it makes users faster"_ applies squarely — this is the rare feature whose whole point is fewer interactions.

There is no selection model in the codebase today. `TaskState.selectedTaskId` is a single id meaning "the task whose detail panel is open", and keyboard shortcuts act on the one DOM‑focused task (`TaskShortcutService` → `TaskComponent` method). The bulk **data layer** already exists though: `deleteTasks`, `updateTasks`, `moveToArchive`, `planTasksForToday`, `removeTasksFromTodayTag` all take id arrays and carry `isBulk` op-log meta.

## 2. What other apps do (summary)

| App                       | Enter selection (desktop)       | Extend                        | Keyboard                                                              | Action surface                                                                          | Mobile entry                                                | After action                              |
| ------------------------- | ------------------------------- | ----------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------- |
| **Todoist**               | Ctrl/Cmd+click                  | Shift+click range             | —                                                                     | Bar at top of list: date, project, labels, priority, more (complete, duplicate, delete) | Long-press → "Select task", then "Select all"               | Desktop keeps selection, mobile clears it |
| **Things 3**              | Cmd+click                       | Shift+click                   | Existing shortcuts act on selection (⇧⌘M move, ⇧⌘T tags, ⌘K complete) | No bar — context menu + shortcuts + drag to sidebar                                     | Swipe left → select mode, drag over circles for range       | —                                         |
| **TickTick**              | Ctrl/Cmd+click, marquee         | Shift+click, Shift+↑/↓        | Shortcuts act on selection                                            | Side panel: date, priority, list, tags, complete, merge, delete                         | Long-press                                                  | —                                         |
| **Linear**                | `X` on focused issue, Cmd+click | Shift+↑/↓, Shift+click, Cmd+A | All single-key shortcuts act on selection; Cmd+K                      | Bottom bar + right-click menu; drag whole selection                                     | —                                                           | Esc clears                                |
| **Apple Reminders**       | Cmd+click                       | Shift+click, ⌘A               | —                                                                     | Context menu, drag to sidebar list                                                      | "Select Reminders" or two-finger drag; bottom toolbar; Done | —                                         |
| **Asana**                 | Ctrl/Cmd+click                  | Shift+click                   | Tab+key shortcuts act on selection                                    | Bottom toolbar with count, max 50                                                       | —                                                           | —                                         |
| **Gmail** (canonical web) | Checkbox column                 | Shift+click, "select all N"   | `X`, `* a`                                                            | Top toolbar swaps to bulk actions; Undo toast                                           | Long-press / tap avatar                                     | Clears                                    |
| **Notion DB**             | Hover checkbox                  | Shift-click, drag             | Shift+↑/↓                                                             | Top bulk-edit bar with property chips                                                   | —                                                           | —                                         |
| **MS To Do**              | Ctrl/Cmd+click                  | Shift+click                   | —                                                                     | Right-click menu only                                                                   | Long-press                                                  | —                                         |
| **Google Tasks**          | none                            | —                             | —                                                                     | —                                                                                       | —                                                           | —                                         |

Guidelines that agree across sources (WAI-ARIA APG listbox pattern, Material "Selection", Apple HIG, NN/g "Bulk actions"):

- Click selects one. **Ctrl/Cmd+click toggles**, **Shift+click ranges** from an anchor, **Esc** clears. Arrow keys move focus without changing selection; **Shift+Arrow extends**.
- Provide **select all**, a **contextual action bar** that only appears while something is selected, a visible **count**, and **feedback + undo** (or confirmation for destructive actions).
- Mobile needs an explicit **selection mode** (long-press or a "Select" menu item) with a bottom toolbar and a Done/close. Don't show checkboxes on every row all the time.
- Drag a multi-selection as a **stack with a count badge**.

The clearest lesson for us comes from Things and Linear: **existing single-task shortcuts and menus simply start applying to the whole selection.** That reuses what the app already has instead of building a second action system.

## 3. Design goals & non-goals

**Goals**

1. Standard selection mechanics that need no explanation (file-manager conventions).
2. Reuse the existing action surfaces — keyboard shortcuts and the task context menu — so there is exactly one place where "what can I do with a task" is defined.
3. Zero new settings. Selection is transient, local, never synced.
4. Works in every view that renders `<task-list>` (Today, project, tag, backlog, done list). Planner, boards and schedule views come later, on the same service.
5. Touch-friendly on Android/iOS without breaking the current long-press-to-drag and swipe gestures.
6. Correct with sync: bulk actions go through the same per-task actions and effects as single edits (ARCHITECTURE-DECISIONS #5).

**Non-goals (v1)**

- Marquee / rubber-band selection (conflicts with drag & drop and text selection; TickTick is the only to-do app with it).
- Selection that survives navigation, reload or sync.
- Bulk editing of free-text fields (title, notes).
- Multi-select inside the schedule week grid (different component; tracked as a follow-up, §8 Phase 3).
- Multiple running timers (#9029/#5832 are a different feature).

## 4. Selection model

### 4.1 Three concepts, kept apart

| Concept             | What it means                                             | Where it lives today                         | Change                                                                                                                            |
| ------------------- | --------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Focus** (cursor)  | The one task row that has DOM focus; arrow keys move it.  | `TaskFocusService`, `getDomFocusedTaskId()`  | Unchanged. Also becomes the **anchor** for range selection.                                                                       |
| **Detail task**     | The task whose detail panel is open.                      | `TaskState.selectedTaskId` (misleading name) | Unchanged in v1. Consider renaming to `detailPanelTaskId` when touched.                                                           |
| **Selection** (new) | A set of task ids the user has marked to act on together. | —                                            | New `TaskSelectionService` (signals, `providedIn: 'root'`), holding `Set<string>` + `anchorId`. Not in NgRx state, not persisted. |

The selection is **only ever built from tasks currently rendered** in the active view. It is cleared on work-context change, on route change, on `Esc`, and whenever a bulk action makes the selected tasks leave the view (moved away, deleted, marked done into the done section).

### 4.2 Desktop / keyboard interaction (WAI-ARIA APG listbox mapping)

| Input                                                                                       | Result                                                                                                                                               |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Click on task                                                                               | Focus it; clears any multi-selection (standard "select this one only"). Current single-click behaviours (title edit, detail panel toggle) unchanged. |
| **Ctrl/Cmd + click**                                                                        | Toggle task in selection; focus it; it becomes the anchor. Never starts title edit or opens a panel.                                                 |
| **Shift + click**                                                                           | Select the range between the anchor and the clicked task, in visual order. Replaces the selection (Ctrl+Shift+click adds the range).                 |
| `↑` / `↓`, `J` / `K`                                                                        | Move focus only; selection unchanged (APG).                                                                                                          |
| **Shift + ↑ / ↓** (and Shift+J/K)                                                           | Extend/shrink the selection from the anchor by one visible task. Currently unclaimed: `task-shortcut.service.ts` explicitly ignores Shift+Arrow.     |
| **`X`** (new configurable shortcut `taskToggleSelect`)                                      | Toggle the focused task in the selection without a mouse (Linear/Gmail convention). `X` is currently unused.                                         |
| **Ctrl/Cmd + A** (only while a task row is focused)                                         | Select all visible tasks in the same list as the focused task.                                                                                       |
| **Esc**                                                                                     | Clear selection (takes precedence over other Esc handlers while the selection is non-empty).                                                         |
| Click on empty space                                                                        | Clear selection.                                                                                                                                     |
| Any task shortcut (`D`, `Backspace`, `S`, `E`, `G`, `U`, `Shift+B`, `Shift+T`, `Ctrl+D`, …) | **If the selection is non-empty, it applies to the whole selection**; otherwise to the focused task as today.                                        |
| `Q` / right-click on a selected task                                                        | Opens the task context menu **in selection mode** (§5.2). Right-click on an unselected task keeps today's single-task behaviour.                     |

Visual order for ranges is the DOM order of `<task>` elements, which already exists via `TaskFocusService.getTaskElements()`; ranges are clamped to the list containing the anchor so a Shift+click cannot silently grab tasks across collapsed groups or the done section.

### 4.3 Touch interaction (Android, iOS, narrow web)

Long-press already starts drag, swipe-right completes, swipe-left opens the context menu. Nothing is free, so selection mode is entered explicitly, the way Reminders and Todoist/TickTick on iOS do:

| Input                                                    | Result                                                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Task context menu → **"Select…"** (new entry, top group) | Enters selection mode with that task selected.                                                        |
| View ⋮ menu (work context menu) → **"Select tasks…"**    | Enters selection mode with nothing selected.                                                          |
| In selection mode: **tap** a task                        | Toggles it. Rows show a leading check circle in this mode. Swipe/drag/title-edit are suspended.       |
| Bar **✕** / Android back / Esc                           | Leave selection mode, clear selection.                                                                |
| Later (Phase 2)                                          | Drag a finger down the check circles to range-select (Things), like the drag-over-checkboxes pattern. |

On desktop there is no explicit mode: any Ctrl+click _is_ the mode. On touch the mode is explicit because there is no modifier key.

### 4.4 Visual feedback

- Selected rows get a persistent tinted background plus a left accent stripe using the existing selection/accent tokens. This must be visually distinct from the focus ring (focused) and from the detail-panel highlight (`.isSelected` today).
- Desktop shows **no checkboxes**; the tint plus a small check icon in the leading slot of selected rows is enough (Material guidance: don't persistently show checkboxes). Touch selection mode shows a check circle on every row.
- Count is shown in the selection bar ("7 tasks selected") and announced via an `aria-live` region. Lists set `aria-multiselectable="true"`, rows `aria-selected`.
- Drag (Phase 2): the CDK drag preview of a selected task shows a stack with a count badge, per Apple HIG.

## 5. Acting on the selection

### 5.1 Selection bar

A compact, sticky bar appears at the bottom of the main content area while the selection is non-empty (above the mobile bottom nav on small screens). Bottom placement is what Asana, Linear and every mobile to-do app use, it never covers the add-task bar at the top, and it stays in a stable place while the list scrolls. It is mounted **once in the app layout**, not per view, so selection can never exist without a way to act on it (a defect in PR #7146).

```
┌──────────────────────────────────────────────────────────────────────┐
│ ✕  7 selected     [📅 Schedule] [📁 Project] [🏷 Tags] [✓ Done] [🗑]  ⋮ │
└──────────────────────────────────────────────────────────────────────┘
```

- **✕** clears selection (also Esc).
- Five primary buttons cover what the issues ask for most: **Schedule** (`S`), **Move to project** (`E`), **Tags** (`G`), **Mark done** (`D`), **Delete** (`Backspace`). Buttons show the existing shortcut in their tooltip so users learn the keyboard path.
- **⋮** opens the task context menu in selection mode (§5.2) with everything else.
- On narrow screens the bar keeps ✕, count, ⋮ and as many icons as fit.

The bar is deliberately small. It is a discovery aid and the touch entry point; the full action set lives in the context menu so there is one definition of the actions.

### 5.2 Context menu in selection mode

`TaskContextMenuInnerComponent` gains a selection mode: it receives the selected tasks instead of one task and acts on all of them. The header reads "7 tasks". Items and their bulk semantics:

| Action                           | Bulk semantics                                                                                                                                                            | Notes                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Schedule (date/time)             | Same date for all; opens the existing schedule dialog once.                                                                                                               | Time-based reminders apply per task. Phase 2 adds relative shifts ("+1 day", "+1 week") requested in #4645. |
| Set deadline / remove deadline   | Same for all.                                                                                                                                                             |                                                                                                             |
| Move to project                  | Same target; subtasks skipped (they follow their parent). Recurring tasks: dedupe by `repeatCfgId`, ask once per config "move template + N instances?" (existing dialog). | Closes the recurring-task part of #7058.                                                                    |
| Tags                             | Submenu checkboxes show tri-state: checked (all have), indeterminate (some), unchecked (none). Clicking sets the tag for all / removes from all.                          | Covers "move from tag THIS WEEK to NEXT WEEK" (#7058 comment).                                              |
| Mark done / undone               | If any selected task is undone → mark all done; else mark all undone. Parent done cascades as it does today.                                                              |                                                                                                             |
| Move to backlog / to Today       | Same rules as single.                                                                                                                                                     | #8273                                                                                                       |
| Add to Today / remove from Today | Uses existing `planTasksForToday` / `removeTasksFromTodayTag` bulk actions.                                                                                               |                                                                                                             |
| Unschedule                       |                                                                                                                                                                           | #7058 comment                                                                                               |
| Estimate                         | Same value for all.                                                                                                                                                       |                                                                                                             |
| Duplicate                        | Each duplicated after itself.                                                                                                                                             | #9022                                                                                                       |
| Delete                           | Confirmation dialog for >1 task: "Delete 7 tasks? Subtasks are deleted too."                                                                                              | See §6 on undo.                                                                                             |

Hidden in selection mode (single-task only): start tracking, focus mode, edit title, notes, add subtask, attachments, convert to main task, move to top/bottom, issue actions.

**Partial eligibility:** if an action does not apply to some selected tasks (e.g. move to project with subtasks selected), it applies to the eligible ones and a snackbar reports "Moved 5 of 7 tasks (2 subtasks follow their parent)". Actions that apply to none are disabled with a tooltip.

**Mixed parent/subtask selection:** when a parent and some of its subtasks are both selected and the action cascades from the parent (delete, move, done), the subtasks are deduped and the action runs on the parent only.

**After an action:** the selection is kept if the tasks are still visible in the view (tag/estimate/schedule edits chain nicely — Todoist desktop behaviour), and cleared if they left the view (moved, deleted, done into the collapsed section).

### 5.3 Drag & drop (Phase 2)

Dragging a task that is part of the selection drags the whole selection: the CDK preview shows a stack with a count badge, and on drop the other selected tasks are inserted directly after the dropped one, in their previous relative order. Dropping onto a project or tag in the side nav moves/tags all of them. Angular CDK has no native multi-drag, so this is implemented in `TaskListComponent.drop()` by moving the remaining ids after the primary drop.

## 6. State, sync and correctness

- **No new synced state, no schema change.** Selection is UI-only.
- **Bulk = loop of the normal per-task actions** with the Rule #6 `setTimeout(0)` flush after the loop, exactly as ARCHITECTURE-DECISIONS #5 (project completion) settled. Do **not** route mark-done through `updateTasks`: PR #7146's review found that it bypasses `doneOn`, reminder unscheduling, the done sound, Today-tag ordering, Electron taskbar and `autoAddTodayTagOnMarkAsDone`. Where a bulk action already exists _and_ its meta-reducer/effects are wired (`deleteTasks`, `moveToArchive`, `planTasksForToday`, `removeTasksFromTodayTag`), use it.
- **Op-log cost:** N ops for N tasks. Acceptable for a rare, user-initiated action; the same trade-off was accepted for project completion. Selecting hundreds of tasks is possible but the loop is sequential and flushed, so no state loss.
- **Recurring tasks:** carry the `getTaskRepeatCfgByIdAllowUndefined$` null guard from `2ddc16053c` (#8715/#8726, released v18.14.0) into any shared move helper.
- **Delete & undo:** `undo-task-delete.meta-reducer.ts` only knows the singular `deleteTask`. v1 uses a confirmation dialog for multi-delete (cheap, matches existing dialogs). Extending the undo snackbar to `deleteTasks` is a Phase 2 improvement; it needs the meta-reducer to keep the full list of deleted tasks plus their list positions.
- **Order preservation:** every bulk action iterates the selection in visual order, so "move 5 tasks to project B" appends them in the order the user saw them.
- **Remote/replayed ops** never touch the selection service: it is not an effect and does not observe actions. It only reacts to `WorkContextService` context changes and router navigation to clear itself.

## 7. Performance (task component is a hot path)

- `TaskSelectionService` exposes `selectedIds: Signal<ReadonlySet<string>>`. `TaskComponent` adds one `computed(() => selectedIds().has(this.task().id))` bound to a host class. When the set changes every rendered task recomputes an O(1) `Set.has`; no per-task subscriptions, no functions in templates.
- The touch check circle and the desktop check icon render inside `@if` blocks, so unselected rows on desktop add zero DOM.
- Range selection uses the existing DOM query for `<task>` elements once per Shift+click, not per render.
- Modifier-click detection lives in the existing click handlers (`titleBarClick` etc.), not in a capture-phase host listener that stops propagation (PR #7146 review flagged that as breaking normal clicks).

## 8. Phasing

**Phase 1 — MVP (closes #6352, the core of #4645 and #7058)**

- `TaskSelectionService` (set, anchor, toggle, range, clear, `isSelectionMode` for touch).
- Ctrl/Cmd+click, Shift+click, Shift+Arrow/J/K, `X`, Ctrl+A, Esc, click-away.
- Selected-row styling, aria attributes, live-region count.
- Selection bar mounted in the layout.
- Context menu selection mode with: schedule, deadline, move to project (incl. recurring dedupe + guard), tags (tri-state), done/undone, backlog/today, add to/remove from Today, unschedule, estimate, delete (confirm).
- Existing task shortcuts apply to the selection when non-empty.
- Touch selection mode via context menu "Select…" and work-context menu "Select tasks…".
- Unit tests for the service (range/anchor logic), the context-menu bulk semantics (mixed states, dedupe, partial eligibility) and one E2E per entry method.
- Docs: `docs/wiki/3.03-Keyboard-Shortcuts.md` (new keys), a "Edit several tasks at once" section in the how-to wiki.

**Phase 2 — polish**

- Drag whole selection with count badge; drop on side-nav project/tag.
- Undo snackbar for bulk delete.
- Duplicate in bulk.
- Relative reschedule in the bulk schedule dialog ("+1 day", "+1 week", "next Monday") — the "shift a chain of tasks" request.
- Touch: drag over check circles to range-select.
- Plugin API: expose `selectedTaskIds` read-only and fire the existing `SetSelectedTask`-style hook (#6551 asks for the focused task; the selection can ride along).

**Phase 3 — other views (separate issue)**

- Planner day columns and boards adopt `TaskSelectionService` (same bar, same menu).
- Schedule week grid: Ctrl+click events, drag the group to a new time, keeping relative offsets (#4645 comments). Needs its own design because events are positioned by time, not list order.

## 9. Relationship to PR #7146

Keep, after rebasing onto master:

- `TaskSelectionService` with signals, Ctrl/Cmd+click, Shift+click range, Esc.
- The extracted recurring-task move helper (`TaskBatchOperationService`), with the `getTaskRepeatCfgByIdAllowUndefined$` guard from master.
- Enabling drag of recurring tasks onto side-nav projects.
- i18n keys (fix the `COUNT` vs `COUNT_ONE/OTHER` mismatch; ngx-translate has no plural resolver here).

Change:

- Mount the bar in the layout, not only in work view.
- Replace the capture-phase click interception with modifier checks in the existing click handlers.
- Mark done via per-task `updateTask` (or `TaskService.setDone`), not `updateTasks`.
- Sequential loop with the Rule #6 flush instead of `Promise.all` on moves.
- Drop the always-visible desktop checkboxes; keep the check circles for touch selection mode.
- Route the "more" actions through the context menu in selection mode instead of a second project-picker dialog and a growing toolbar.
- Add keyboard selection (`Shift+Arrow`, `X`, `Ctrl+A`) and make existing task shortcuts apply to the selection.

## 10. Open questions for the maintainer

1. **Bar placement:** bottom (proposed) vs. transforming the add-task bar area at the top (Gmail/Todoist web style). Bottom avoids fighting the add-task bar and matches mobile; top is closer to the eye when the list is short.
2. **Plain click clears the selection** (file-manager standard, proposed) vs. keeping it until Esc (Todoist desktop keeps selection only _after actions_, not on click). Clearing on click is the more predictable default.
3. **Default binding for `X`:** ship it bound or leave it unbound like several other task shortcuts? Proposed: bound, because Ctrl+click alone is not discoverable on keyboard-first setups.
4. **Delete confirmation vs. undo snackbar** in v1. Proposed: confirm now, undo later.
5. Should the **detail panel** react to multi-selection (e.g. close while >1 selected)? Proposed: close it when the selection reaches 2, reopen nothing automatically.

## Sources

- Issues: #4645, #7058, #6352, #5685, #9022, #6486, #8273, #6551; PR #7146 and its reviews.
- Codebase: `task-shortcut.service.ts`, `task-focus.service.ts`, `task.model.ts` (`TaskState`), `root-store/meta/task-shared.actions.ts`, `undo-task-delete.meta-reducer.ts`, `task-list.component.*`, `task-context-menu-inner.component.*`, ARCHITECTURE-DECISIONS #5.
- Todoist help "Add or manage multiple tasks"; Cultured Code "Moving items", "Using gestures", "Using tags"; TickTick "Desktop interaction tips", "Batch edit tasks"; Linear docs "Select issues", changelog "Issue selection", "Improved drag & drop"; Apple support "Organize reminders", HIG lists/tables and drag & drop; Asana "Bulk select and edit tasks"; Notion "Tables"; Gmail help "Select messages"; Material Design "Selection" (M1–M3); WAI-ARIA APG Listbox pattern; NN/g "Bulk actions: 3 design guidelines".
