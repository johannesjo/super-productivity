# Noura design context

## Direction

Use the supplied TickTick screenshots as the interaction and density reference. The result should feel native, calm, and workmanlike: a system sans stack, compact 44 px task rows, dark neutral surfaces, thin separators, a single cool-blue action color, and minimal state-conveying motion. Noura must use original naming, copy, illustrations, and visual identity.

## Desktop shell

- 56 px global rail for Tasks, Planner, Boards, Focus, Search, and Insights; sync/activity/settings at the bottom.
- 280 px navigation sidebar, resizable from 240–360 px.
- Main list is the flexible workspace with a 520 px minimum.
- 420 px inspector, resizable from 360–560 px.
- Below 1280 px the inspector becomes a right sheet; below 960 px the sidebar becomes an overlay; below 640 px the app is single-pane with bottom navigation.
- Desktop window chrome remains restrained and provides a Tauri drag region where appropriate.

## Navigation and views

- Sidebar: Today, Upcoming, Inbox, projects, smart lists, tags, completed/history, archives/trash.
- Task view: compact title bar, inline add field, grouped sections, overdue/postpone controls, keyed task rows, inline editing, drag/reorder, and visible subtask progress.
- Inspector: completion, schedule/reminder/repeat, priority, Markdown notes, checklist, estimate/time, project/tags, attachments, and issue-provider metadata.
- Focus: Pomodoro/flowtime/stopwatch tabs, large quiet timer, task selector, primary start action, summary cards, and focus record.
- Search: centered command dialog spanning tasks, projects, tags, filters, settings, and actions.
- Settings: large responsive overlay with persistent section navigation and dense horizontal fields.

## Visual tokens

- Typography: `-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif`.
- Type scale: 12 px metadata, 13 px secondary, 14 px controls/body, 20 px view titles, 28 px timer/supporting headings.
- Radius: 8 px controls, 10 px selected rows/cards, 14 px dialogs/sheets.
- Spacing: 4 px base grid; dense controls use 8–12 px gaps; panel padding 24–28 px.
- Motion: 150–220 ms for sheet/dialog/reorder state changes; respect reduced motion; no decorative entrance choreography.
- Semantic shadcn tokens are the source of color truth. Dark mode is the default reference, with full light/system support.
- Selected states use the accent surface; destructive/overdue states use the destructive semantic token; inactive icons stay muted.

## Components

Use shadcn-svelte preset `b1VozgbA`. Compose Button, Checkbox, InputGroup, Field, Select, Switch, ToggleGroup, Tabs, Card, Badge, Avatar, Separator, Resizable, ScrollArea, Collapsible, DropdownMenu, ContextMenu, Tooltip, Popover, Dialog, Sheet, Drawer, AlertDialog, Command, Empty, Skeleton, Progress, and Sonner before creating custom equivalents. Icon imports must follow `components.json`.

Every interaction needs default, hover, focus-visible, active, disabled, loading, and error states where applicable. Dialogs/sheets/drawers require accessible titles. Lists and navigation must be operable by keyboard, retain focus across updates, and meet WCAG AA contrast.
