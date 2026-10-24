For all current downloads, package links, and platform-specific notes: [check the wiki](https://github.com/super-productivity/super-productivity/wiki/2.01-Downloads-and-Install).

## 19.3.0

### Tasks and focus

- Restore deleted tasks from Recently deleted, or finish tasks as “won’t do.”
- Set priorities with `p1`/`p2`/`p3`, use nth-weekday short syntax, and enter `@` dates in your UI language and date order.
- See completed/total counts on collapsed subtasks and archived projects in the sidebar.
- Start focus mode with one click and adjust focus sound volume.
- Productivity and sustainability scores have been removed; Upcoming is now an overview in the Recurring panel.

### Scheduling and reminders

- View deadlines in Schedule, calendar colors in Planner, and plugin calendars in Schedule filters.
- Navigate days from the Schedule day panel and open Planner with a keyboard shortcut.
- Set optional repeat end dates, with clearer controls for completion-based repeats, falling behind, pausing, and rule summaries.
- Set reminders 1 day, 3 days, or 1 week ahead. Upcoming recurring alarms are now scheduled in advance.
- Fixed monthly repeats skipping short months, yearly repeats on leap days, and recurring task priority retention.

### Integrations and assistants

- Sign up for and connect Plainspace inside the app, hand tasks to others, and share tasks by moving them into shared projects.
- Plainspace now syncs titles and scheduled times both ways and pushes offline edits. Fixed pending edits during handoffs and syncing cleared times across devices.
- Optionally create and delete corresponding CalDAV tasks when adding or deleting tasks.
- Connect AI assistants through an opt-in local MCP endpoint or SuperSync’s hosted task capture, including ChatGPT OAuth. Assistant-created tasks can include schedules and repeats.
- Install and update listed community plugins, including Auto Tag Manager and SuperGile for YouGile.
- Expanded the local REST API with notes, counters, and daily task-time logging and corrections.

### Mobile and desktop

- Android widgets show the currently tracked task; launcher shortcuts open New task, Today, and Inbox.
- Long-press to access sidebar menus or choose the second bottom-navigation destination. Improved touch targets, haptic feedback, and phone-sized Schedule layouts.
- Fixed Android overlay positioning and literal shared titles, plus iOS task-title wrapping and bottom safe-area spacing.
- Added an opt-in desktop due-task badge and improved Linux window-control spacing.

### Fixes and reliability

- Fixed task duplication involving undated subtasks and repeat settings, task ordering within sections, and estimate edits lost on outside taps.
- Fixed sync conflicts involving section changes, task moves, recurring-task generation, and tracked time during task deletion.
- Fixed WebDAV retry loops and added confirmation before overwriting remote changes that cannot be decrypted.
- Preserve the last full mobile backup when data restarts nearly empty; offer recovery of previously unmigrated v12-or-older data on a blank start.
- Fixed aborted cached PWA loads, focus sessions interrupted during startup, and reopening archived projects.
- Improved task-list rendering and swipe performance, keyboard focus visibility, and text contrast.
