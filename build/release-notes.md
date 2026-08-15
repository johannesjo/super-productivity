For all current downloads, package links, and platform-specific notes: [check the wiki](https://github.com/super-productivity/super-productivity/wiki/2.01-Downloads-and-Install).

### Features

- **i18n:** translate "From previous days" for all locales
- **i18n:** rename planned-past "Overdue" list to "From previous days" (#9594)
- **community-plugins:** add JSON to Tasks plugin (#9479)

### Fixes

- **sync:** resolve remote RoundTimeSpentForDay multi-entity conflicts (#9601) (#9607)
- **add-task-bar:** stop autosize placeholder measure resetting caret (#9603)
- **config:** commit image-input fields on blur to stop per-keystroke ops (#9596)
- **work-context:** reset the active context when its project is deleted (#9602)
- **task:** unique icons for move-to-bottom and move-to-backlog (#9555)
- **search:** reveal tasks hidden inside collapsed containers (#8780) (#9595)
- **sync:** apply LWW conflict winners for array entities (#9526) (#9592)
- **search:** reveal tasks hidden by a collapsed parent or group (#8780) (#9590)
- **android:** stop logging task titles and shared content to logcat (#9587)
- **worklog:** disambiguate duplicate Titles column in export (#9586)
- **android:** stop false WebView block screens on healthy devices (#9585)
- **monitoring:** bound active-users by the active-user set
- **config:** commit time fields on blur so typing keeps both hour digits (#9582)
- **tasks:** make Shift+T schedule for today without moving the task (#9578)
- **supersync-chart:** mount tmp into the migrate-db init container (#9522)
- **ui:** stop iOS zooming the page when focusing sub-16px inputs (#9579)
- **ios:** request local network permission for LAN sync servers (#9542)
- **sync:** guard snapshot/compaction anchors against concurrent-tab appends (#9438) (#9576)
- **tasks:** show 'Set deadline' instead of 'Deadline' on an empty deadline row (#9498)
- **tasks:** switch the Duration row icon between add and edit (#9497)
- **op-log:** skip compaction while boot hydration replay is in progress (#9084) (#9568)
- **server:** reap orphaned probe watchdogs in the app container
- **sync-server:** split batch conflict lookups off the two-index OR (#9503) (#9516)
- **task:** keep selected task box within the list container #9540 (#9547)
- correct Japanese Eisenhower board labels #9532 (#9533)
- **sync:** resolve bulk archive conflicts via scoped replacement (#9537) (#9561)
- **header:** re-land the header overflow rework, rebuilt around a pure fit (#9517)

### Other Changes

- 🚨 Cannot connect to CalDAV Todo issue provider (#9530)
- chore(deps)(deps): bump actions/stale from 10.4.0 to 11.0.0 (#9535)
