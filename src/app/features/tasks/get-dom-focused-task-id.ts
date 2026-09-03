/**
 * The id of the <task> the user actually has focused, read from the DOM (#8851).
 *
 * `TaskFocusService.focusedTaskId` is tracked via focusin/focusout and can drift
 * from reality in both directions, so the DOM is authoritative for anything that
 * acts on "the focused task":
 *
 *  1. Focus-tracking recovery: a `focusout` can clear the tracked id without a
 *     following `focusin` rebinding it (e.g. focus staying on the task host
 *     after an inline-edit blur, where `.focus()` is a no-op and no new focusin
 *     fires), which would silently drop the shortcut.
 *  2. Stale-focus guard: navigating to a view with no live <task> (e.g. the
 *     Planner overdue list) leaves the tracked id pointing at a <task> that no
 *     longer holds focus. Acting on it would mutate the wrong task.
 */
export const getDomFocusedTaskId = (): string | null =>
  (document.activeElement?.closest('task') as HTMLElement | null)?.getAttribute(
    'data-task-id',
  ) ?? null;
