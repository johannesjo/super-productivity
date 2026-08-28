For all current downloads, package links, and platform-specific notes: [check the wiki](https://github.com/super-productivity/super-productivity/wiki/2.01-Downloads-and-Install).

### New

- Added full worklog export (#4393, #9612).
- Added a connected SuperSync device list with the option to sign out other devices.
- Added `Cmd+W` to hide the window on macOS (#9727).
- Recurring-task previews now show their project and tags (#9667).
- Exposed focus mode state through the API (#9544).
- Added the Joplin Notes Sync community plugin (#9562) and moved the Dashboard plugin listing to its maintained fork (#9090).

### Fixed

- Preserved cleared fields during sync and improved handling of deferred repairs, SuperSync errors, unreadable sync files, deferred uploads, and device sign-out.
- Fixed encrypted reminder sync on Android (#9668).
- Fixed duplicate Android notification behavior and improved notification permission handling (#9648, #9685).
- Fixed recurring subtasks receiving inconsistent IDs across clients (#9728).
- Fixed monthly recurring-task anchors (#9512, #9673).
- Preserved tags when converting tasks to or from subtasks (#9672).
- Preserved section ordering during sync (#9574, #9619) and Later Today subtask ordering (#9614, #9618).
- Fixed task text entered after multi-word project names (#9679).
- Fixed month-grid layout, invalid work-time markers, and initial scrolling to the current time (#9071, #9417, #9545, #9623, #9671).
- Fixed narrow task rows overflowing the left edge (#9772) and short-syntax menus running off-screen (#9764).
- Hardened worklog CSV export against spreadsheet formulas and corrected zero-duration and current-week handling.
- Improved SuperSync cleanup safety, stale-device handling, and server reliability.
- Fixed Linux desktop identification (#9678).
- Updated the Dutch translation (#9712).
