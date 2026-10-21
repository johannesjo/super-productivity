For all current downloads, package links, and platform-specific notes: [check the wiki](https://github.com/super-productivity/super-productivity/wiki/2.01-Downloads-and-Install).

### New features

- Set numeric task priorities with icon presets.
- Drag selected tasks between sections and projects, and select multiple tasks in the mobile planner.
- Find projects and tags in search.
- Undo task unscheduling and preview the next recurring task and inherited subtasks.
- Added App Auto Track and TickTick CSV import plugins, plus Caffeine Tracker to the community plugin list.
- Moved Redmine and Nextcloud Deck integrations to plugins.
- Simplified first-run setup with an offer to track your first task.
- Custom styles.css changes now reload automatically.

### Mobile and reminders

- Android: receive native deadline reminders up to one week ahead; reminders are rescheduled as exact alarms when permission is granted.
- Android: fixed double-counted time, lost time after app termination or restart, background Pomodoro tracking, and missing focus notifications.
- iOS: share links and text to your inbox, and recover focus sessions after a web view restart.
- Session endings no longer steal focus; Windows reminders bring the window forward without taking focus.

### Sync and backups

- Fixed sync issues that could lose tracked time or overwrite concurrent task edits.
- Fixed conflicts involving task restores and bulk archiving, note deletions, habit edits, and list reordering.
- Improved concurrent OneDrive writes, WebDAV upload handling, and recovery from interrupted mobile sync downloads.
- Failed desktop backups are no longer recorded as successful; backups still invalid after repair are rejected.
- Kept HTTP error URLs and bodies out of exported logs.

### Fixes and polish

- Fixed calendar month navigation, unwanted jumps to the current time, and all-day events spanning multiple dates.
- Preserved subtask due dates when duplicating tasks and corrected recurring times before a custom day start.
- Saved pending note edits before switching tasks, fixed repeated checklist insertion, and kept hover controls clear of note text.
- Improved CalDAV/iCloud discovery, mobile OneDrive sign-in, and GitLab, Gitea, and Azure DevOps integrations.
- Improved dialog keyboard focus, mobile onboarding hints, and settings search.
- Updated Romanian, Brazilian Portuguese, Polish, and Vietnamese translations, plus localized planner labels and heatmap dates.
- Reduced planner processing during time tracking and removed looping Flowtime animations.

### Self-hosting

- Added ARM64 SuperSync server images, versioned release images, configurable trusted proxy ranges and daily cleanup time, and fixes for fresh deployments.
