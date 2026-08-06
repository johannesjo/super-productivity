For all current downloads, package links, and platform-specific notes: [check the wiki](https://github.com/super-productivity/super-productivity/wiki/2.01-Downloads-and-Install).

### Highlights

- Added search to global settings and a `?` keyboard shortcut cheat sheet.
- Added crash-safe local drafts for project notes (#8982).
- Added interval recurrence phrases such as `@every 2 weeks` and `@every 2 fridays` (#9328).
- Added URL actions for creating and completing tasks (#9121).
- Completed translations across all locales (#9360).

### Security and sync

- Enforced encrypted-only SuperSync uploads when E2EE is required (#9457).
- Blocked plaintext downloads when encrypted sync is expected (GHSA-vrc7-775g-ggqc, #8903).
- Added recovery guidance and diagnostics for encrypted-operation integrity failures (#9331, #9439, #9444).
- Prevented bulk Plan for Today conflicts from blocking sync and preserved Planner placement during Today conflicts (#9442, #9454).
- Improved conflict replay, older-client compatibility, blocked-action messages, and first-sync overwrite confirmation (#9326, #9334, #9373, #9412).
- Required an access token for every local REST API request (#9155).
- Sanitized plugin dialog HTML and SVG icons (#9440, #9445).

### Improvements and fixes

- Improved Schedule recurrence projections, continued segments, calendar layouts, localized headings, and recurring-item opening (#9258, #9314, #9372, #9375, #9377, #9406, #9455).
- Fixed DST-related recurrence behavior, weekday scheduling, typed times, and Planner date loading (#9174, #9370, #9401).
- Improved Focus Mode session tracking, break-rule editing, break-timer resets, and idle handling (#9092, #9351, #9361, #9407).
- Added safer automatic and local backups, and correctly escaped worklog CSV fields (#9313, #9327, #9337).
- Synced CalDAV completion state and limited recurrence expansion to prevent UI hangs (#9097, #9279).
- Fixed mobile safe-area overlays, Android back-button behavior, task-widget opacity on Windows/Linux, and the macOS icon set (#9176, #9335, #9369, #9394).
- Fixed color picker rendering, tag placeholder visibility, keyboard shortcuts after cancelling input, and early access to the add-task button (#9312, #9367, #9420, #9458).
- Updated localization behavior, including date fallbacks, Chinese shortcuts, Turkish translations, and accessibility labels (#9130, #9298, #9301, #9309).
- Added support for SiYuan deep links in Electron (#9359).
- Made self-hosted SuperSync legal pages and configuration operator-owned (#9390).
