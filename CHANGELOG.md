<a name="1.9.0"></a>
# [1.9.0](https://github.com/johannesjo/super-productivity/compare/v1.8.3...v1.9.0) (2018-03-11)


### Bug Fixes

* adding empty global links ([b17a85c](https://github.com/johannesjo/super-productivity/commit/b17a85c))
* auto remove dupes ([59e5a26](https://github.com/johannesjo/super-productivity/commit/59e5a26))
* idle time not being tracked when option is disabled [#56](https://github.com/johannesjo/super-productivity/issues/56) ([a36f011](https://github.com/johannesjo/super-productivity/commit/a36f011))
* import not working correctly ([fed37a9](https://github.com/johannesjo/super-productivity/commit/fed37a9))
* **gDriveSync:** initial check not working as intended ([9ae946c](https://github.com/johannesjo/super-productivity/commit/9ae946c))
* project creation wrong check for existing ([7fcefb8](https://github.com/johannesjo/super-productivity/commit/7fcefb8))
* settings state name ([4d75537](https://github.com/johannesjo/super-productivity/commit/4d75537))
* **gDriveSync:** initial creation of backup file ([e75e3d4](https://github.com/johannesjo/super-productivity/commit/e75e3d4))
* **gDriveSync:** message ([51af762](https://github.com/johannesjo/super-productivity/commit/51af762))
* **pomodoroFocus:** fix possible error ([8ee5343](https://github.com/johannesjo/super-productivity/commit/8ee5343))
* **thumbnails:** fix removing local links ([bc3102e](https://github.com/johannesjo/super-productivity/commit/bc3102e))
* **timeSheetExport:** allow for custom date formats ([fe03021](https://github.com/johannesjo/super-productivity/commit/fe03021))
* **timeSheetExport:** use us/en date per default for export ([2ae102f](https://github.com/johannesjo/super-productivity/commit/2ae102f))


### Features

* add button to reset all keyboard shortcuts ([c3538cd](https://github.com/johannesjo/super-productivity/commit/c3538cd))
* add notification when shutting down additional instances of super productivity ([69cb232](https://github.com/johannesjo/super-productivity/commit/69cb232))
* add original stacktrace to error handling ([c893fe9](https://github.com/johannesjo/super-productivity/commit/c893fe9))
* **gDriveSync:** add auto login ([c3885ac](https://github.com/johannesjo/super-productivity/commit/c3885ac))
* improve error handling by sending the errors to the frontend and show them there as well ([300caf0](https://github.com/johannesjo/super-productivity/commit/300caf0))
* **focusMode:** add keyboard shortcut for focus mode ([b97767d](https://github.com/johannesjo/super-productivity/commit/b97767d))
* **focusMode:** add to pomodoro button ([150fed1](https://github.com/johannesjo/super-productivity/commit/150fed1))
* **focusMode:** add ui for component ([da97c4c](https://github.com/johannesjo/super-productivity/commit/da97c4c))
* **focusMode:** better edge case handling ([669fcf0](https://github.com/johannesjo/super-productivity/commit/669fcf0))
* **focusMode:** clean up and fine tuning ([272dc50](https://github.com/johannesjo/super-productivity/commit/272dc50))
* **focusMode:** implement as state ([d6f9c71](https://github.com/johannesjo/super-productivity/commit/d6f9c71))
* **focusMode:** link button functionality ([1d8013d](https://github.com/johannesjo/super-productivity/commit/1d8013d))
* **focusMode:** make drop and drag work for focus mode ([7ee2fc2](https://github.com/johannesjo/super-productivity/commit/7ee2fc2))
* **gDriveSync:** add a way to specify the file name used ([7c693fc](https://github.com/johannesjo/super-productivity/commit/7c693fc))
* **gDriveSync:** add basic sync ([f6ebeb8](https://github.com/johannesjo/super-productivity/commit/f6ebeb8))
* **gDriveSync:** add better dialog for save confirm ([7701927](https://github.com/johannesjo/super-productivity/commit/7701927))
* **gDriveSync:** add error handling for google api ([04130cc](https://github.com/johannesjo/super-productivity/commit/04130cc))
* **gDriveSync:** add import of data ([2d5c5dc](https://github.com/johannesjo/super-productivity/commit/2d5c5dc))
* **gDriveSync:** add promise button spinner ([29d5f17](https://github.com/johannesjo/super-productivity/commit/29d5f17))
* **gDriveSync:** add promise buttons also to time sheet export ([af9e5af](https://github.com/johannesjo/super-productivity/commit/af9e5af))
* **gDriveSync:** add settings and improve structure ([67d03d7](https://github.com/johannesjo/super-productivity/commit/67d03d7))
* **gDriveSync:** basic saving ([528020c](https://github.com/johannesjo/super-productivity/commit/528020c))
* **gDriveSync:** fix error handling ([19da8f2](https://github.com/johannesjo/super-productivity/commit/19da8f2))
* **gDriveSync:** further improve logging ([96f8043](https://github.com/johannesjo/super-productivity/commit/96f8043))
* **gDriveSync:** handle loading conditions correctly ([bbb94bf](https://github.com/johannesjo/super-productivity/commit/bbb94bf))
* **gDriveSync:** improve concurrent api call prevention ([0a3ad93](https://github.com/johannesjo/super-productivity/commit/0a3ad93))
* **gDriveSync:** improve logging ([245b7c6](https://github.com/johannesjo/super-productivity/commit/245b7c6))
* **gDriveSync:** improve ui ([dacbe58](https://github.com/johannesjo/super-productivity/commit/dacbe58))
* **gDriveSync:** make syncing work nicely ([30070c7](https://github.com/johannesjo/super-productivity/commit/30070c7))
* **gDriveSync:** prevent multiple dialogs ([f3fa7e6](https://github.com/johannesjo/super-productivity/commit/f3fa7e6))
* **gDriveSync:** prompt before loading data ([d3dee47](https://github.com/johannesjo/super-productivity/commit/d3dee47))
* **gDriveSync:** prompt before saving if there is a remote update ([8b3e99a](https://github.com/johannesjo/super-productivity/commit/8b3e99a))
* **gDriveSync:** save data before closing the page ([ae7a14a](https://github.com/johannesjo/super-productivity/commit/ae7a14a))
* **mobile:** beautify settings for mobile ([4570ae9](https://github.com/johannesjo/super-productivity/commit/4570ae9))
* **mobile:** don't display keyboard settings ([d9e2df0](https://github.com/johannesjo/super-productivity/commit/d9e2df0))
* **mobile:** further improve ui ([3cb776d](https://github.com/johannesjo/super-productivity/commit/3cb776d))
* **mobile:** improve ui for mobile ([954bbe5](https://github.com/johannesjo/super-productivity/commit/954bbe5))
* **mobile:** make md switch more mobile friendly ([ae547df](https://github.com/johannesjo/super-productivity/commit/ae547df))
* **mobile:** make more space for navigation items ([fe67b53](https://github.com/johannesjo/super-productivity/commit/fe67b53))
* **pomodoroFocus:** add basic outline of component ([8943f1b](https://github.com/johannesjo/super-productivity/commit/8943f1b))
* **pomodoroFocus:** also show parent task name in focus mode ([bf05be1](https://github.com/johannesjo/super-productivity/commit/bf05be1))
* **pomodoroFocus:** re-arrange ui ([bca4813](https://github.com/johannesjo/super-productivity/commit/bca4813))
* **thumbnails:** add enlarging of thumbnails ([7d3b057](https://github.com/johannesjo/super-productivity/commit/7d3b057))
* **thumbnails:** add new global link type ([bbdeb5c](https://github.com/johannesjo/super-productivity/commit/bbdeb5c))
* let notes take up less space if empty ([9354791](https://github.com/johannesjo/super-productivity/commit/9354791))
* make notes more recognizable by changing their color ([e989785](https://github.com/johannesjo/super-productivity/commit/e989785))
* remember logged in state for time sheet export ([8b40cd7](https://github.com/johannesjo/super-productivity/commit/8b40cd7))
* **thumbnails:** add thumbnails ([05fb01f](https://github.com/johannesjo/super-productivity/commit/05fb01f))
* **thumbnails:** prevent dragging of fullscreen image ([8b7376f](https://github.com/johannesjo/super-productivity/commit/8b7376f))
* require at least the current version of the gnome shell extension ([aca6792](https://github.com/johannesjo/super-productivity/commit/aca6792))
* show images being dropped on markdown area as images rather than opening a dialog for attachments ([e88cc50](https://github.com/johannesjo/super-productivity/commit/e88cc50))



<a name="1.8.3"></a>
## [1.8.3](https://github.com/johannesjo/super-productivity/compare/v1.8.2...v1.8.3) (2018-02-28)


### Bug Fixes

* wrong and missing dependencies ([43dcb05](https://github.com/johannesjo/super-productivity/commit/43dcb05))



<a name="1.8.2"></a>
## [1.8.2](https://github.com/johannesjo/super-productivity/compare/v1.8.1...v1.8.2) (2018-02-28)


### Bug Fixes

* bug when huge amount of time was wrongly tracked when application is idle for a long time (e.g. when being on lock screen over several hours) ([55ee266](https://github.com/johannesjo/super-productivity/commit/55ee266))
* import data not working ([8959fde](https://github.com/johannesjo/super-productivity/commit/8959fde))


### Features

* improve pomodoro messaging ([99b1db9](https://github.com/johannesjo/super-productivity/commit/99b1db9))



<a name="1.8.1"></a>
## [1.8.1](https://github.com/johannesjo/super-productivity/compare/v1.8.0...v1.8.1) (2018-02-26)


### Bug Fixes

* **dailySummary:** always show time sheet export modal button ([31a25b1](https://github.com/johannesjo/super-productivity/commit/31a25b1))


### Features

* **pomodoro:** focus window on and after break or show notification for web ([2f08642](https://github.com/johannesjo/super-productivity/commit/2f08642))



<a name="1.8.0"></a>
# [1.8.0](https://github.com/johannesjo/super-productivity/compare/v1.7.9...v1.8.0) (2018-02-25)


### Bug Fixes

* don't use done tasks for total estimate remaining calculation ([39d4e61](https://github.com/johannesjo/super-productivity/commit/39d4e61))


### Features

* **sheetExport:** prepare value replacement ([eba5a52](https://github.com/johannesjo/super-productivity/commit/eba5a52))
* improve pomodoro button states visibility ([4fe85d1](https://github.com/johannesjo/super-productivity/commit/4fe85d1))
* **sheetExport:** add advanced formatting options ([4e0b0fb](https://github.com/johannesjo/super-productivity/commit/4e0b0fb))
* **sheetExport:** add all formatters ([f3d3282](https://github.com/johannesjo/super-productivity/commit/f3d3282))
* **sheetExport:** add complete help ([599eba7](https://github.com/johannesjo/super-productivity/commit/599eba7))
* **sheetExport:** add google api login ([8bba9f1](https://github.com/johannesjo/super-productivity/commit/8bba9f1))
* **sheetExport:** add loading spinner ([d3faaea](https://github.com/johannesjo/super-productivity/commit/d3faaea))
* **sheetExport:** add saving rows ([30cd123](https://github.com/johannesjo/super-productivity/commit/30cd123))
* **sheetExport:** cleanup ([5b73c2c](https://github.com/johannesjo/super-productivity/commit/5b73c2c))
* **sheetExport:** fix lint ([0f8d116](https://github.com/johannesjo/super-productivity/commit/0f8d116))
* **sheetExport:** further outline time sheet export ([fecee98](https://github.com/johannesjo/super-productivity/commit/fecee98))
* **sheetExport:** keep the user logged in if possible ([a77bfbd](https://github.com/johannesjo/super-productivity/commit/a77bfbd))
* **sheetExport:** make it all work with electron ([db1ae33](https://github.com/johannesjo/super-productivity/commit/db1ae33))
* prepare time sheet export ([f875367](https://github.com/johannesjo/super-productivity/commit/f875367))
* **sheetExport:** outline ui ([13db775](https://github.com/johannesjo/super-productivity/commit/13db775))
* **sheetExport:** persist and implement options ([2cc463d](https://github.com/johannesjo/super-productivity/commit/2cc463d))
* **sheetExport:** prepare google spreadsheet export ([40e4050](https://github.com/johannesjo/super-productivity/commit/40e4050))
* **sheetExport:** refactor google api ([e6839fe](https://github.com/johannesjo/super-productivity/commit/e6839fe))
* **sheetExport:** remove for electron version ([e5daf8b](https://github.com/johannesjo/super-productivity/commit/e5daf8b))
* prevent multiple instances from being opened ([a4be335](https://github.com/johannesjo/super-productivity/commit/a4be335))



<a name="1.7.9"></a>
## [1.7.9](https://github.com/johannesjo/super-productivity/compare/v1.7.8...v1.7.9) (2018-02-21)


### Features

* add option to require the user to manually confirm starting the next session ([14a88f2](https://github.com/johannesjo/super-productivity/commit/14a88f2))



<a name="1.7.8"></a>
## [1.7.8](https://github.com/johannesjo/super-productivity/compare/v1.7.7...v1.7.8) (2018-02-19)



<a name="1.7.7"></a>
## [1.7.7](https://github.com/johannesjo/super-productivity/compare/v1.7.6...v1.7.7) (2018-02-19)



<a name="1.7.6"></a>
## [1.7.6](https://github.com/johannesjo/super-productivity/compare/v1.7.5...v1.7.6) (2018-02-19)


### Bug Fixes

* missing binding for close button on task selection dialog [#53](https://github.com/johannesjo/super-productivity/issues/53) ([b3cc7f8](https://github.com/johannesjo/super-productivity/commit/b3cc7f8))
* pulling from wrong repository by getting git settings each time [#55](https://github.com/johannesjo/super-productivity/issues/55) ([0c6227a](https://github.com/johannesjo/super-productivity/commit/0c6227a))


### Features

* add version string to update notification ([546f3e4](https://github.com/johannesjo/super-productivity/commit/546f3e4))



<a name="1.7.5"></a>
## [1.7.5](https://github.com/johannesjo/super-productivity/compare/v1.7.4...v1.7.5) (2018-01-30)


### Bug Fixes

* **pomodoro:** better handling for when pomodoro was disabled in the options again [#51](https://github.com/johannesjo/super-productivity/issues/51) ([49d7682](https://github.com/johannesjo/super-productivity/commit/49d7682))



<a name="1.7.4"></a>
## [1.7.4](https://github.com/johannesjo/super-productivity/compare/v1.7.3...v1.7.4) (2018-01-26)


### Bug Fixes

* **timeTracking:** weird behavior when no active task is selected ([a420ad2](https://github.com/johannesjo/super-productivity/commit/a420ad2))


### Features

* always set default value for new config options in deep nested objects ([462ab2e](https://github.com/johannesjo/super-productivity/commit/462ab2e))
* make checking if current ticket is assigned to current user optional [#47](https://github.com/johannesjo/super-productivity/issues/47) ([8be885a](https://github.com/johannesjo/super-productivity/commit/8be885a))
* **pomodoro:** add interface to gnome shell indicator ([15e05c7](https://github.com/johannesjo/super-productivity/commit/15e05c7))
* update electron and electron builder to latest version to fix security issue ([ce9f70c](https://github.com/johannesjo/super-productivity/commit/ce9f70c))



<a name="1.7.3"></a>
## [1.7.3](https://github.com/johannesjo/super-productivity/compare/v1.7.2...v1.7.3) (2018-01-09)


### Bug Fixes

* take a break not working as intended ([bbf188f](https://github.com/johannesjo/super-productivity/commit/bbf188f))
* **pomodoro:** case when there is no task available and the error when the last task was deleted ([914149d](https://github.com/johannesjo/super-productivity/commit/914149d))


### Features

* **idleTimeTracking:** cleanup ([3cbeaa4](https://github.com/johannesjo/super-productivity/commit/3cbeaa4))
* **idleTimeTracking:** make it optional and configurable ([333617c](https://github.com/johannesjo/super-productivity/commit/333617c))
* **idleTimeTracking:** rework idleTimeTracking ([92868d0](https://github.com/johannesjo/super-productivity/commit/92868d0))
* add notification when there is a new version of super productivity available ([38f6196](https://github.com/johannesjo/super-productivity/commit/38f6196))
* **pomodoro:** add skip break button ([5bd2935](https://github.com/johannesjo/super-productivity/commit/5bd2935))



<a name="1.7.2"></a>
## [1.7.2](https://github.com/johannesjo/super-productivity/compare/v1.7.1...v1.7.2) (2018-01-06)


### Features

* **pomodoro:** set going to work view initially to disabled [#46](https://github.com/johannesjo/super-productivity/issues/46) ([e47c603](https://github.com/johannesjo/super-productivity/commit/e47c603))



<a name="1.7.1"></a>
## [1.7.1](https://github.com/johannesjo/super-productivity/compare/v1.7.0...v1.7.1) (2018-01-05)



<a name="1.7.0"></a>
# [1.7.0](https://github.com/johannesjo/super-productivity/compare/v1.6.17...v1.7.0) (2018-01-05)


### Features

* **pomodoro:** add dialog for breaks and show distraction list on break [#32](https://github.com/johannesjo/super-productivity/issues/32) [#22](https://github.com/johannesjo/super-productivity/issues/22) ([d7f6a68](https://github.com/johannesjo/super-productivity/commit/d7f6a68))
* show version string in app help ([f748a23](https://github.com/johannesjo/super-productivity/commit/f748a23))
* **pomodoro:** add and improve notifications [#32](https://github.com/johannesjo/super-productivity/issues/32) ([67e301a](https://github.com/johannesjo/super-productivity/commit/67e301a))
* **pomodoro:** add better integration with time tracking [#32](https://github.com/johannesjo/super-productivity/issues/32) ([ae33268](https://github.com/johannesjo/super-productivity/commit/ae33268))
* **pomodoro:** add play/pause on button click [#32](https://github.com/johannesjo/super-productivity/issues/32) ([77b1ed0](https://github.com/johannesjo/super-productivity/commit/77b1ed0))
* **pomodoro:** add reselection of last task after restart [#32](https://github.com/johannesjo/super-productivity/issues/32) ([47f30d6](https://github.com/johannesjo/super-productivity/commit/47f30d6))
* **pomodoro:** add settings [#32](https://github.com/johannesjo/super-productivity/issues/32) ([47a20d1](https://github.com/johannesjo/super-productivity/commit/47a20d1))
* **pomodoro:** add ui [#32](https://github.com/johannesjo/super-productivity/issues/32) ([791c422](https://github.com/johannesjo/super-productivity/commit/791c422))
* **pomodoro:** fix initialization for older configurations [#32](https://github.com/johannesjo/super-productivity/issues/32) ([f780eff](https://github.com/johannesjo/super-productivity/commit/f780eff))
* **pomodoro:** fix task selection [#32](https://github.com/johannesjo/super-productivity/issues/32) ([521a2fa](https://github.com/johannesjo/super-productivity/commit/521a2fa))
* **pomodoro:** focus window on break [#32](https://github.com/johannesjo/super-productivity/issues/32) ([db06d1e](https://github.com/johannesjo/super-productivity/commit/db06d1e))
* **pomodoro:** go to work view when starting session [#32](https://github.com/johannesjo/super-productivity/issues/32) ([76cfd2b](https://github.com/johannesjo/super-productivity/commit/76cfd2b))
* **pomodoro:** improve activating and deactivating current task [#32](https://github.com/johannesjo/super-productivity/issues/32) ([c7bfa49](https://github.com/johannesjo/super-productivity/commit/c7bfa49))
* **pomodoro:** improve messages [#32](https://github.com/johannesjo/super-productivity/issues/32) ([d267d70](https://github.com/johannesjo/super-productivity/commit/d267d70))
* **pomodoro:** improve time tracking integration with task play/pause button ([78d009f](https://github.com/johannesjo/super-productivity/commit/78d009f))
* **pomodoro:** improve ui [#32](https://github.com/johannesjo/super-productivity/issues/32) ([cd370d8](https://github.com/johannesjo/super-productivity/commit/cd370d8))
* **pomodoro:** improve ui [#32](https://github.com/johannesjo/super-productivity/issues/32) ([4c9b927](https://github.com/johannesjo/super-productivity/commit/4c9b927))
* **pomodoro:** improve ui [#32](https://github.com/johannesjo/super-productivity/issues/32) ([34d8767](https://github.com/johannesjo/super-productivity/commit/34d8767))
* **pomodoro:** make cycles work [#32](https://github.com/johannesjo/super-productivity/issues/32) ([769dd4c](https://github.com/johannesjo/super-productivity/commit/769dd4c))
* **pomodoro:** make pause and stop work properly [#32](https://github.com/johannesjo/super-productivity/issues/32) ([1e30a91](https://github.com/johannesjo/super-productivity/commit/1e30a91))
* **pomodoro:** make restarting tasks work when quitting on break [#32](https://github.com/johannesjo/super-productivity/issues/32) ([4cd2c17](https://github.com/johannesjo/super-productivity/commit/4cd2c17))
* **pomodoro:** make timer optional [#32](https://github.com/johannesjo/super-productivity/issues/32) ([d099e2b](https://github.com/johannesjo/super-productivity/commit/d099e2b))
* **pomodoro:** outline basic interface [#32](https://github.com/johannesjo/super-productivity/issues/32) ([8a3704f](https://github.com/johannesjo/super-productivity/commit/8a3704f))
* **pomodoro:** play optional sound on session done [#32](https://github.com/johannesjo/super-productivity/issues/32) ([ee1e686](https://github.com/johannesjo/super-productivity/commit/ee1e686))
* **pomodoro:** prepare idle handling [#32](https://github.com/johannesjo/super-productivity/issues/32) ([c52b1f5](https://github.com/johannesjo/super-productivity/commit/c52b1f5))
* **pomodoro:** prevent multiple actions from being triggered at the same time [#32](https://github.com/johannesjo/super-productivity/issues/32) ([21a870c](https://github.com/johannesjo/super-productivity/commit/21a870c))
* **pomodoro:** prevent timer resetting itself on play [#32](https://github.com/johannesjo/super-productivity/issues/32) ([92147d0](https://github.com/johannesjo/super-productivity/commit/92147d0))
* **pomodoro:** show current session cycle on break [#32](https://github.com/johannesjo/super-productivity/issues/32) ([e64ea90](https://github.com/johannesjo/super-productivity/commit/e64ea90))
* **pomodoro:** show or focus window on break [#32](https://github.com/johannesjo/super-productivity/issues/32) ([31aefe0](https://github.com/johannesjo/super-productivity/commit/31aefe0))
* **pomodoro:** unset current task on startup [#32](https://github.com/johannesjo/super-productivity/issues/32) ([fc632f4](https://github.com/johannesjo/super-productivity/commit/fc632f4))
* **pomodoro:** unset lastCurrentTask on pomodoro stop [#32](https://github.com/johannesjo/super-productivity/issues/32) ([cf950a4](https://github.com/johannesjo/super-productivity/commit/cf950a4))



<a name="1.6.17"></a>
## [1.6.17](https://github.com/johannesjo/super-productivity/compare/v1.6.16...v1.6.17) (2017-12-16)



<a name="1.6.16"></a>
## [1.6.16](https://github.com/johannesjo/super-productivity/compare/v1.6.15...v1.6.16) (2017-12-16)



<a name="1.6.15"></a>
## [1.6.15](https://github.com/johannesjo/super-productivity/compare/v1.6.14...v1.6.15) (2017-12-15)



<a name="1.6.14"></a>
## [1.6.14](https://github.com/johannesjo/super-productivity/compare/v1.6.13...v1.6.14) (2017-12-15)



<a name="1.6.13"></a>
## [1.6.13](https://github.com/johannesjo/super-productivity/compare/v1.6.12...v1.6.13) (2017-12-15)



<a name="1.6.12"></a>
## [1.6.12](https://github.com/johannesjo/super-productivity/compare/v1.6.11...v1.6.12) (2017-12-10)



<a name="1.6.11"></a>
## [1.6.11](https://github.com/johannesjo/super-productivity/compare/v1.6.10...v1.6.11) (2017-12-10)


### Features

* add automatic updates ([b25cfb7](https://github.com/johannesjo/super-productivity/commit/b25cfb7))



<a name="1.6.10"></a>
## [1.6.10](https://github.com/johannesjo/super-productivity/compare/v1.6.9...v1.6.10) (2017-12-10)


### Bug Fixes

* clearing backlog not working properly ([ae4bdf3](https://github.com/johannesjo/super-productivity/commit/ae4bdf3))
* git requests being made without enough permissions ([41c8197](https://github.com/johannesjo/super-productivity/commit/41c8197))
* theme issue on config page ([cd69e78](https://github.com/johannesjo/super-productivity/commit/cd69e78))
* theme selection for new project dialog ([dfd57f7](https://github.com/johannesjo/super-productivity/commit/dfd57f7))


### Features

* make some settings global and work for all projects ([692fb5e](https://github.com/johannesjo/super-productivity/commit/692fb5e))



<a name="1.6.9"></a>
## [1.6.9](https://github.com/johannesjo/super-productivity/compare/v1.6.8...v1.6.9) (2017-12-08)


### Bug Fixes

* partially fix 'creating a new project clones the old one' ([f19144f](https://github.com/johannesjo/super-productivity/commit/f19144f))


### Features

* remove minimize to tray [#44](https://github.com/johannesjo/super-productivity/issues/44) ([be70fd8](https://github.com/johannesjo/super-productivity/commit/be70fd8))



<a name="1.6.8"></a>
## [1.6.8](https://github.com/johannesjo/super-productivity/compare/v1.6.7...v1.6.8) (2017-11-30)


### Bug Fixes

* enforce quit on system which might not do it automatically on main window closing [#29](https://github.com/johannesjo/super-productivity/issues/29) ([e3928b4](https://github.com/johannesjo/super-productivity/commit/e3928b4))



<a name="1.6.7"></a>
## [1.6.7](https://github.com/johannesjo/super-productivity/compare/v1.6.6...v1.6.7) (2017-11-30)


### Bug Fixes

* time tracking not working on windows [#40](https://github.com/johannesjo/super-productivity/issues/40) ([19fd9f4](https://github.com/johannesjo/super-productivity/commit/19fd9f4))
* work around electron's makeSingleInstance limitations ([9ffc785](https://github.com/johannesjo/super-productivity/commit/9ffc785))
* work around electron's makeSingleInstance limitations [#29](https://github.com/johannesjo/super-productivity/issues/29) ([d67510b](https://github.com/johannesjo/super-productivity/commit/d67510b))



<a name="1.6.6"></a>
## [1.6.6](https://github.com/johannesjo/super-productivity/compare/v1.6.5...v1.6.6) (2017-11-30)



<a name="1.6.5"></a>
## [1.6.5](https://github.com/johannesjo/super-productivity/compare/v1.6.4...v1.6.5) (2017-11-30)


### Bug Fixes

* unable to create or delete projects [#37](https://github.com/johannesjo/super-productivity/issues/37) ([3aeecca](https://github.com/johannesjo/super-productivity/commit/3aeecca))



<a name="1.6.4"></a>
## [1.6.4](https://github.com/johannesjo/super-productivity/compare/v1.6.3...v1.6.4) (2017-11-29)



<a name="1.6.3"></a>
## [1.6.3](https://github.com/johannesjo/super-productivity/compare/v1.6.2...v1.6.3) (2017-11-29)



<a name="1.6.2"></a>
## [1.6.2](https://github.com/johannesjo/super-productivity/compare/v1.6.1...v1.6.2) (2017-11-29)



<a name="1.6.1"></a>
## [1.6.1](https://github.com/johannesjo/super-productivity/compare/v1.6.0...v1.6.1) (2017-11-29)


### Bug Fixes

* windows error when idle time tracker is run [#35](https://github.com/johannesjo/super-productivity/issues/35) ([7210ef0](https://github.com/johannesjo/super-productivity/commit/7210ef0))


### Features

* add rudimentary syncing ([82d5077](https://github.com/johannesjo/super-productivity/commit/82d5077))
* add rudimentary syncing [#23](https://github.com/johannesjo/super-productivity/issues/23) ([99559ed](https://github.com/johannesjo/super-productivity/commit/99559ed))



<a name="1.5.2"></a>
## [1.5.2](https://github.com/johannesjo/super-productivity/compare/v1.5.1...v1.5.2) (2017-11-24)


### Bug Fixes

* **appStorage:** messing up with backlog data and import of settings ([ebed0c9](https://github.com/johannesjo/super-productivity/commit/ebed0c9))



<a name="1.5.1"></a>
## [1.5.1](https://github.com/johannesjo/super-productivity/compare/v1.5.0...v1.5.1) (2017-11-24)


### Bug Fixes

* **dailyPlanner:** fix task suggestions ([f97afaa](https://github.com/johannesjo/super-productivity/commit/f97afaa))


### Features

* add option to start app with open dev tools ([2b00986](https://github.com/johannesjo/super-productivity/commit/2b00986))
* improve performance by only loading done backlog on demand ([05eb12b](https://github.com/johannesjo/super-productivity/commit/05eb12b))
* **dailyPlanner:** add refresh remote tasks button to backlog [#31](https://github.com/johannesjo/super-productivity/issues/31) ([662e665](https://github.com/johannesjo/super-productivity/commit/662e665))
* **editGlobalLink:** auto add http to url if not given [#21](https://github.com/johannesjo/super-productivity/issues/21) ([782273e](https://github.com/johannesjo/super-productivity/commit/782273e))



<a name="1.5.0"></a>
# [1.5.0](https://github.com/johannesjo/super-productivity/compare/v1.4.2...v1.5.0) (2017-11-23)


### Features

* **settings:** make auto starting next task on done configurable [#28](https://github.com/johannesjo/super-productivity/issues/28) ([1c92dfe](https://github.com/johannesjo/super-productivity/commit/1c92dfe))
* add automatic backups [#23](https://github.com/johannesjo/super-productivity/issues/23) ([039d477](https://github.com/johannesjo/super-productivity/commit/039d477))



<a name="1.4.2"></a>
## [1.4.2](https://github.com/johannesjo/super-productivity/compare/v1.4.1...v1.4.2) (2017-11-21)


### Bug Fixes

* tomorrows note not showing up [#20](https://github.com/johannesjo/super-productivity/issues/20) ([5e19230](https://github.com/johannesjo/super-productivity/commit/5e19230))



<a name="1.4.1"></a>
## [1.4.1](https://github.com/johannesjo/super-productivity/compare/v1.4.0...v1.4.1) (2017-11-21)


### Bug Fixes

* **taskList:** parent task not startable after all sub tasks are deleted [#17](https://github.com/johannesjo/super-productivity/issues/17) ([095f574](https://github.com/johannesjo/super-productivity/commit/095f574))


### Features

* add github issue template ([b9d7896](https://github.com/johannesjo/super-productivity/commit/b9d7896))
* **gnomeShellExt:** don't try to connect any more, if there was an error ([743ba7a](https://github.com/johannesjo/super-productivity/commit/743ba7a))
* improve error handling for main window ([7e4153b](https://github.com/johannesjo/super-productivity/commit/7e4153b))



<a name="1.4.0"></a>
# [1.4.0](https://github.com/johannesjo/super-productivity/compare/v1.3.6...v1.4.0) (2017-11-21)


### Bug Fixes

* **jira:** wrong property access ([428d378](https://github.com/johannesjo/super-productivity/commit/428d378))
* **projects:** changing a project not working ([dac5a53](https://github.com/johannesjo/super-productivity/commit/dac5a53))
* **tasks:** wrong property access ([a6dbb08](https://github.com/johannesjo/super-productivity/commit/a6dbb08))
* unable to reopen the application when there is no indicator [#18](https://github.com/johannesjo/super-productivity/issues/18) ([4c9207e](https://github.com/johannesjo/super-productivity/commit/4c9207e))


### Features

* **animations:** improve animations ([875feb4](https://github.com/johannesjo/super-productivity/commit/875feb4))
* **betterStorage:** add ls functionality for custom wrapper ([8647d17](https://github.com/johannesjo/super-productivity/commit/8647d17))
* **betterStorage:** replace ngStorage with a custom empty wrapper ([7bfc0f6](https://github.com/johannesjo/super-productivity/commit/7bfc0f6))
* **dialogs:** improve task selection ([2ee20d7](https://github.com/johannesjo/super-productivity/commit/2ee20d7))
* **dialogs:** improve task selection for was idle and edit global link ([b0f36e4](https://github.com/johannesjo/super-productivity/commit/b0f36e4))
* **taskList:** cleanup ([07eff8d](https://github.com/johannesjo/super-productivity/commit/07eff8d))
* **taskList:** limit drag and drop to handle ([15870be](https://github.com/johannesjo/super-productivity/commit/15870be))
* add on demand load for projects ([05943e5](https://github.com/johannesjo/super-productivity/commit/05943e5))
* **taskList:** select currently edited task after editing title ([c8d9c87](https://github.com/johannesjo/super-productivity/commit/c8d9c87))



<a name="1.3.6"></a>
## [1.3.6](https://github.com/johannesjo/super-productivity/compare/v1.3.5...v1.3.6) (2017-11-10)



<a name="1.3.5"></a>
## [1.3.5](https://github.com/johannesjo/super-productivity/compare/v1.3.4...v1.3.5) (2017-11-09)



<a name="1.3.4"></a>
## [1.3.4](https://github.com/johannesjo/super-productivity/compare/v1.3.3...v1.3.4) (2017-11-08)


### Features

* **keyboardShortcuts:** add support for assigning meta key shortcuts [#15](https://github.com/johannesjo/super-productivity/issues/15) ([615181a](https://github.com/johannesjo/super-productivity/commit/615181a))
* also allow non registered ssl certificates for jira endpoint [#14](https://github.com/johannesjo/super-productivity/issues/14) ([75e7e00](https://github.com/johannesjo/super-productivity/commit/75e7e00))



<a name="1.3.3"></a>
## [1.3.3](https://github.com/johannesjo/super-productivity/compare/v1.3.2...v1.3.3) (2017-11-04)


### Bug Fixes

* **tasks:** update view model after moving tasks via keyboard ([8dd246c](https://github.com/johannesjo/super-productivity/commit/8dd246c))
* dev tools keyboard shortcut ([4486540](https://github.com/johannesjo/super-productivity/commit/4486540))
* total time spent not showing on done backlog ([23b3b58](https://github.com/johannesjo/super-productivity/commit/23b3b58))


### Features

* **keyboardShortcuts:** change defaults ([d0b35a3](https://github.com/johannesjo/super-productivity/commit/d0b35a3))
* add snap package ([1fb926d](https://github.com/johannesjo/super-productivity/commit/1fb926d))
* **taskList:** make tasks a little easier to distinguish by adding a stronger background color and borders ([0206c2f](https://github.com/johannesjo/super-productivity/commit/0206c2f))
* **workView:** focus first task when entering page ([e7a018d](https://github.com/johannesjo/super-productivity/commit/e7a018d))



<a name="1.3.2"></a>
## [1.3.2](https://github.com/johannesjo/super-productivity/compare/v1.3.1...v1.3.2) (2017-10-29)


### Bug Fixes

* **keyboardShortcuts:** use keydown instead of keypress ([8b38435](https://github.com/johannesjo/super-productivity/commit/8b38435))
* **taskList:** fix focus task when there is no current task ([b32c635](https://github.com/johannesjo/super-productivity/commit/b32c635))


### Features

* **backup:** prepare automatic backups ([41fb164](https://github.com/johannesjo/super-productivity/commit/41fb164))
* **globalLinks:** add reveal and remove animation and refactor animations to mixin ([c37a992](https://github.com/johannesjo/super-productivity/commit/c37a992))
* **globalLinks:** improve edit dialog ([1ac4404](https://github.com/johannesjo/super-productivity/commit/1ac4404))
* **taskList:** refocus last task after notes were edited ([16773ce](https://github.com/johannesjo/super-productivity/commit/16773ce))
* **taskList:** toggle textarea on keyboard show ([4ce1a1a](https://github.com/johannesjo/super-productivity/commit/4ce1a1a))



<a name="1.3.1"></a>
## [1.3.1](https://github.com/johannesjo/super-productivity/compare/v1.3.0...v1.3.1) (2017-10-29)


### Features

* **globalLinks:** add default icon for commands ([97d224b](https://github.com/johannesjo/super-productivity/commit/97d224b))
* **globalLinks:** add missing tabindex to dialog ([d01276a](https://github.com/johannesjo/super-productivity/commit/d01276a))
* **welcomeDialog:** add info for help to welcome dialog ([c6d172c](https://github.com/johannesjo/super-productivity/commit/c6d172c))



<a name="1.3.0"></a>
# [1.3.0](https://github.com/johannesjo/super-productivity/compare/v1.2.1...v1.3.0) (2017-10-29)


### Bug Fixes

* deprecated and aria warnings ([61f16e1](https://github.com/johannesjo/super-productivity/commit/61f16e1))


### Features

* **globalLinkList:** remove classes for dragover again as there are not working nicely ([7a68dfc](https://github.com/johannesjo/super-productivity/commit/7a68dfc))
* improve task list help ([89ca1be](https://github.com/johannesjo/super-productivity/commit/89ca1be))
* **doneBacklog:** add restoring tasks to todays list ([08b1554](https://github.com/johannesjo/super-productivity/commit/08b1554))
* **globalLinkList:** add command type for global links ([9c00cbf](https://github.com/johannesjo/super-productivity/commit/9c00cbf))
* **globalLinkList:** add styles for dragover ([8a6b902](https://github.com/johannesjo/super-productivity/commit/8a6b902))
* **globalLinkList:** improve animation for edit and delete buttons ([f0f2307](https://github.com/johannesjo/super-productivity/commit/f0f2307))
* **globalLinkList:** improve edit global link dialog to allow adding to tasks from there ([2a8bc1a](https://github.com/johannesjo/super-productivity/commit/2a8bc1a))
* **globalLinkList:** improve edit global link dialog type selection ([45a85a1](https://github.com/johannesjo/super-productivity/commit/45a85a1))
* **globalLinkList:** open dialog on copy text ([be31102](https://github.com/johannesjo/super-productivity/commit/be31102))
* **globalLinkList:** polish ui ([51f012a](https://github.com/johannesjo/super-productivity/commit/51f012a))
* **globalLinkList:** rework link handling to be more consistent ([2905592](https://github.com/johannesjo/super-productivity/commit/2905592))
* **help:** add doc for global links ([866ee7c](https://github.com/johannesjo/super-productivity/commit/866ee7c))
* **keyboardControls:** add shortcuts for routes/states ([83d5c66](https://github.com/johannesjo/super-productivity/commit/83d5c66))



<a name="1.2.1"></a>
## [1.2.1](https://github.com/johannesjo/super-productivity/compare/v1.2.0...v1.2.1) (2017-10-28)


### Bug Fixes

* **globalLinks:** always selecting LINK type ([1b7a1c9](https://github.com/johannesjo/super-productivity/commit/1b7a1c9))
* **globalLinks:** improve custom icon selection ([a75f9db](https://github.com/johannesjo/super-productivity/commit/a75f9db))
* **globalLinks:** polish ui ([57154a5](https://github.com/johannesjo/super-productivity/commit/57154a5))
* **localLinksForTasks:** add functionality to drop links on tasks ([a5c0b0e](https://github.com/johannesjo/super-productivity/commit/a5c0b0e))
* **localLinksForTasks:** add notification for dropping links ([1e054a2](https://github.com/johannesjo/super-productivity/commit/1e054a2))


### Features

* **globalLinks:** allow to select custom icons ([c1d5044](https://github.com/johannesjo/super-productivity/commit/c1d5044))
* **globalLinks:** improve custom icon selection by filtering out unmatched results ([7813356](https://github.com/johannesjo/super-productivity/commit/7813356))
* **globalLinks:** polish ui ([16033f6](https://github.com/johannesjo/super-productivity/commit/16033f6))



<a name="1.2.0"></a>
# [1.2.0](https://github.com/johannesjo/super-productivity/compare/v1.1.0...v1.2.0) (2017-10-28)


### Bug Fixes

* overflowing tasks for sub task list and don't hide icons any more ([2bf311f](https://github.com/johannesjo/super-productivity/commit/2bf311f))


### Features

* improve task selection via keyboard ([31aae53](https://github.com/johannesjo/super-productivity/commit/31aae53))
* remove dialog animation ([ef41321](https://github.com/johannesjo/super-productivity/commit/ef41321))
* **globalLinks:** add dialog to edit and add new globalLinks ([e7d5dd8](https://github.com/johannesjo/super-productivity/commit/e7d5dd8))
* **globalLinks:** add dropping of links ([9802aee](https://github.com/johannesjo/super-productivity/commit/9802aee))
* **globalLinks:** connect to ls and add basic drag and drop for files ([2c33e61](https://github.com/johannesjo/super-productivity/commit/2c33e61))
* **globalLinks:** polish ui ([db715fb](https://github.com/johannesjo/super-productivity/commit/db715fb))
* **globalLinks:** polish ui ([28a4013](https://github.com/johannesjo/super-productivity/commit/28a4013))
* **globalLinks:** refactor globalLink.name to globalLink.title ([0158a47](https://github.com/johannesjo/super-productivity/commit/0158a47))
* **globalLinks:** remove dropping of text for now ([bde1578](https://github.com/johannesjo/super-productivity/commit/bde1578))



<a name="1.1.0"></a>
# [1.1.0](https://github.com/johannesjo/super-productivity/compare/v1.0.0...v1.1.0) (2017-10-28)


### Bug Fixes

* theme selection not working ([49f3f78](https://github.com/johannesjo/super-productivity/commit/49f3f78))


### Features

* add collapse all notes button for work view ([5aa4524](https://github.com/johannesjo/super-productivity/commit/5aa4524))
* add collapse/expand sub tasks keyboard shortcut ([7713ace](https://github.com/johannesjo/super-productivity/commit/7713ace))
* add dark theme for expand/collapse button ([809aa6d](https://github.com/johannesjo/super-productivity/commit/809aa6d))
* add keyboard shortcut for starting/stopping task ([0890ffe](https://github.com/johannesjo/super-productivity/commit/0890ffe))
* always feature current task after starting it ([fbc6167](https://github.com/johannesjo/super-productivity/commit/fbc6167))
* copy over time tracking data from parent task if the first sub task is created ([50bcd28](https://github.com/johannesjo/super-productivity/commit/50bcd28))
* disallow collapsing when a sub task is the current task ([f696114](https://github.com/johannesjo/super-productivity/commit/f696114))
* expand and collapse sub tasks ([3c5b960](https://github.com/johannesjo/super-productivity/commit/3c5b960))
* improve keyboard task selection ([e2737ad](https://github.com/johannesjo/super-productivity/commit/e2737ad))
* make collapse notes button to collapse sub tasks and motes button ([74ae53f](https://github.com/johannesjo/super-productivity/commit/74ae53f))
* speed up animations ([c8f7d47](https://github.com/johannesjo/super-productivity/commit/c8f7d47))



<a name="1.0.0"></a>
# [1.0.0](https://github.com/johannesjo/super-productivity/compare/v0.9.0...v1.0.0) (2017-02-04)



<a name="0.9.0"></a>
# 0.9.0 (2017-01-16)
