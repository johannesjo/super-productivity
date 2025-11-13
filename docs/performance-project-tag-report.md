# Performance Investigation — Project/Tag Navigation

## Code Paths

1. **Sidebar selection**: `NavItemComponent` renders router links to `project/:id/tasks` or `tag/:id/tasks` and shows task counts (`src/app/core-ui/magic-side-nav/nav-item/nav-item.component.html:12`, `.ts:115-139`).
2. **Routing targets**: `app.routes.ts:65-186` resolves the task views to `ProjectTaskPageComponent` or `TagTaskPageComponent`, which simply embed `<work-view>` and bind to `WorkContextService`.
3. **Work context services**: `WorkContextService` responds to `NavigationEnd`, dispatches `setActiveWorkContext`, and recomputes `todaysTasks$`, `backlogTasks$`, `undoneTasks$`, `doneTasks$`, estimates, etc. (`src/app/features/work-context/work-context.service.ts:254-406`).
4. **Focus overlay**: `FocusModeOverlayComponent.closeOverlay()` dispatches `hideFocusOverlay` (`src/app/features/focus-mode/focus-mode-overlay/focus-mode-overlay.component.ts:120-152`); `app.component.html` conditionally renders either the overlay or the entire app shell, so closing it remounts `magic-side-nav`, `router-outlet`, and `WorkViewComponent`.

## Suspected Bottlenecks

| Area                                                                                                                | Why it hurts with many tasks                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.component.html:26-69`                                                                                          | Mounting `<focus-mode-overlay>` replaces the entire app, so closing the overlay rebuilds every major component and task list.                                                                                  |
| `_getTasksByIds$` + `selectTasksWithSubTasksByIds` (`work-context.service.ts:266-406`, `task.selectors.ts:254-409`) | Every navigation hydrates full `TaskWithSubTasks` structures for all IDs, then multiple downstream filters/reduces rerun (undone/done/backlog/estimates).                                                      |
| `doneTasks$` Today case (`work-context.service.ts:401-405`)                                                         | Falls back to `selectAllTasksWithSubTasks`, so every task in the workspace is hydrated whenever Today is active.                                                                                               |
| Sidebar badges (`nav-item.component.ts:115-129`)                                                                    | For each nav item we filter its `taskIds` and call `includes` on the global done list → O(number of contexts × tasks per context).                                                                             |
| Rendering (`work-view.component.html:84-210`, `task-list.component.html:17-45`)                                     | Every task renders a full `<task>` component with drag/drop, no virtual scrolling or deferred rendering, so large contexts must finish instantiating hundreds or thousands of elements before the UI responds. |

## Recommended Changes

1. **Keep the app mounted during focus mode**: Render `<focus-mode-overlay>` as an absolutely positioned overlay and hide the underneath app with CSS instead of the `@else` branch in `app.component.html`. Prevents teardown/rebuild when closing the overlay.
2. **Memoize task hydration per context**: Replace `_getTasksByIds$`/`selectTasksWithSubTasksByIds` with selectors that cache `TaskWithSubTasks` per ID and only recompute when the entity or ID list changes. Reuse the same memoized data for `undoneTasks$`, `doneTasks$`, and estimations.
3. **Precompute lightweight counts**: Store undone/done counts per project/tag in the work-context state so sidebar badges can read a single number instead of scanning `taskIds`.
4. **Avoid workspace-wide scans for Today done tasks**: Track done IDs per context (including Today) so `doneTasks$` never falls back to `selectAllTasksWithSubTasks`.
5. **Virtualize or chunk task rendering**: Introduce `cdk-virtual-scroll-viewport` for long lists or defer backlog/done rendering until after first paint. Even a skeleton state would keep interactions under 1 s on low-powered devices.

## Profiling Guidance

- **Route instrumentation**: `WorkContextService` already marks `work-view-route`; use Chrome DevTools Performance panel while switching between large projects/tags to see JS frame duration for those measures.
- **Hydration timing**: Wrap `_getTasksByIds$` or `selectTasksWithSubTasksByIds` in `console.time('hydrateTasks')` to quantify how long hydration takes per navigation.
- **Overlay teardown**: Capture Angular DevTools profiles when closing the focus overlay to confirm the entire app tree is recreated.
- **Sidebar cost**: Temporarily log timing inside `nrOfOpenTasks` (nav-item) with many contexts to reveal O(n²) behavior.
- **Rendering**: Use Chrome DevTools Rendering (FPS) and Angular DevTools to compare before/after adding virtualization or deferred rendering; ensure first paint stays within 400–1000 ms.
