<a name="1.10.21"></a>
## [1.10.21](https://github.com/johannesjo/super-productivity/compare/v1.10.20...v1.10.21) (2018-05-02)


### Features

* **durationInputSlider:** allow sliding to zero ([7d61597](https://github.com/johannesjo/super-productivity/commit/7d61597))
* **durationInputSlider:** disable spellcheck for input ([1d032a5](https://github.com/johannesjo/super-productivity/commit/1d032a5))
* **durationInputSlider:** don't trigger when clicking on label or input ([275322f](https://github.com/johannesjo/super-productivity/commit/275322f))
* **durationInputSlider:** fix circle being slightly off ([f9f92f3](https://github.com/johannesjo/super-productivity/commit/f9f92f3))
* **durationInputSlider:** fix comma seconds for moment duration ([100eb90](https://github.com/johannesjo/super-productivity/commit/100eb90))
* **durationInputSlider:** fix styling on time estimate ([4d9e6b7](https://github.com/johannesjo/super-productivity/commit/4d9e6b7))
* **durationInputSlider:** improve styling ([b6c9bb6](https://github.com/johannesjo/super-productivity/commit/b6c9bb6))
* **durationInputSlider:** improve styling ([de8d507](https://github.com/johannesjo/super-productivity/commit/de8d507))
* **durationInputSlider:** improve styling ([d9b2baf](https://github.com/johannesjo/super-productivity/commit/d9b2baf))
* **durationInputSlider:** make label more readable ([a57b75d](https://github.com/johannesjo/super-productivity/commit/a57b75d))



<a name="1.10.20"></a>
## [1.10.20](https://github.com/johannesjo/super-productivity/compare/v1.10.19...v1.10.20) (2018-05-01)


### Bug Fixes

* appcache manifest killing external apis ([df4bfa7](https://github.com/johannesjo/super-productivity/commit/df4bfa7))



<a name="1.10.19"></a>
## [1.10.19](https://github.com/johannesjo/super-productivity/compare/v1.10.18...v1.10.19) (2018-05-01)


### Bug Fixes

* **durationInputSlider:** slide not moving on grab ([b7c45d0](https://github.com/johannesjo/super-productivity/commit/b7c45d0))


### Features

* **durationInputSlider:** also allow click to set the handle ([dab2830](https://github.com/johannesjo/super-productivity/commit/dab2830))
* **durationInputSlider:** improve styling ([90af925](https://github.com/johannesjo/super-productivity/commit/90af925))



<a name="1.10.18"></a>
## [1.10.18](https://github.com/johannesjo/super-productivity/compare/v1.10.17...v1.10.18) (2018-05-01)


### Features

* **durationInputSlider:** add basic user input ([d5a3535](https://github.com/johannesjo/super-productivity/commit/d5a3535))
* **durationInputSlider:** add to time estimate dialog ([1a5d475](https://github.com/johannesjo/super-productivity/commit/1a5d475))
* **durationInputSlider:** beautify ([343c9cb](https://github.com/johannesjo/super-productivity/commit/343c9cb))
* **durationInputSlider:** connect input to model and allow for multiple rounds ([965909f](https://github.com/johannesjo/super-productivity/commit/965909f))
* **durationInputSlider:** fix click on input or label behavior ([f9e326c](https://github.com/johannesjo/super-productivity/commit/f9e326c))
* **durationInputSlider:** fix on change behavior ([d5a03a9](https://github.com/johannesjo/super-productivity/commit/d5a03a9))
* **durationInputSlider:** improve styling and add to add task dialog ([f80f85a](https://github.com/johannesjo/super-productivity/commit/f80f85a))
* **durationInputSlider:** make it work for touch devices ([e77cad0](https://github.com/johannesjo/super-productivity/commit/e77cad0))
* **durationInputSlider:** minor improvements ([c037195](https://github.com/johannesjo/super-productivity/commit/c037195))
* **durationInputSlider:** update on model changes ([73aa0fe](https://github.com/johannesjo/super-productivity/commit/73aa0fe))



<a name="1.10.17"></a>
## [1.10.17](https://github.com/johannesjo/super-productivity/compare/v1.10.16...v1.10.17) (2018-05-01)


### Bug Fixes

* page transition ([aa98cb9](https://github.com/johannesjo/super-productivity/commit/aa98cb9))


### Features

* add minimal transition for main task lists ([b300cb2](https://github.com/johannesjo/super-productivity/commit/b300cb2))
* make offline access work ([67cd09a](https://github.com/johannesjo/super-productivity/commit/67cd09a))
* set git update poll interval duration much higher to prevent reaching githubs limit so quickly ([c3888f2](https://github.com/johannesjo/super-productivity/commit/c3888f2))



<a name="1.10.16"></a>
## [1.10.16](https://github.com/johannesjo/super-productivity/compare/v1.10.15...v1.10.16) (2018-04-29)


### Bug Fixes

* allowing closing of inline markdown via escape key ([414a9e3](https://github.com/johannesjo/super-productivity/commit/414a9e3))
* focusing last or next task not working for closed sub tasks ([a2b0625](https://github.com/johannesjo/super-productivity/commit/a2b0625))
* it not being possible to start sub tasks via keyboard shortcut ([3b134ea](https://github.com/johannesjo/super-productivity/commit/3b134ea))
* missing aria labels ([e2177fb](https://github.com/johannesjo/super-productivity/commit/e2177fb))
* remove missing function call ([a1f61d0](https://github.com/johannesjo/super-productivity/commit/a1f61d0))


### Features

* **performance:** improve edit on click by generally setting the contenteditable attribute manually ([5f1c95c](https://github.com/johannesjo/super-productivity/commit/5f1c95c))
* add untoggling task notes via escape key ([cf2125a](https://github.com/johannesjo/super-productivity/commit/cf2125a))
* improve on task keyboard shortcuts and trigger stop propagation and prevent default for all ([a7c6202](https://github.com/johannesjo/super-productivity/commit/a7c6202))
* improve performance by replacing watchers with intervals ([d66fdd2](https://github.com/johannesjo/super-productivity/commit/d66fdd2))
* improve sub tasks slide down up ([c7ccc6e](https://github.com/johannesjo/super-productivity/commit/c7ccc6e))
* make keyboard focusing much smoother ([574f77b](https://github.com/johannesjo/super-productivity/commit/574f77b))
* make slide up down work for ng-hide ([aadffcb](https://github.com/johannesjo/super-productivity/commit/aadffcb))
* use outline instead of box shadow for focus styles, as the performance is much better ([0df98c7](https://github.com/johannesjo/super-productivity/commit/0df98c7))
* use parent el for keyboard shortcut ([5777e8d](https://github.com/johannesjo/super-productivity/commit/5777e8d))
* when using toggle play mark done tasks as undone ([15407fa](https://github.com/johannesjo/super-productivity/commit/15407fa))



<a name="1.10.15"></a>
## [1.10.15](https://github.com/johannesjo/super-productivity/compare/v1.10.14...v1.10.15) (2018-04-25)


### Bug Fixes

* add missing aria attribute ([ad5d226](https://github.com/johannesjo/super-productivity/commit/ad5d226))
* dropping links on task title edit area not working ([292385e](https://github.com/johannesjo/super-productivity/commit/292385e))
* make toasts look a little better ([901c397](https://github.com/johannesjo/super-productivity/commit/901c397))
* toasts once more ([3e61911](https://github.com/johannesjo/super-productivity/commit/3e61911))
* unit test ([6f45276](https://github.com/johannesjo/super-productivity/commit/6f45276))
* use eval async for global link list ([cb575c9](https://github.com/johannesjo/super-productivity/commit/cb575c9))
* use eval async where possible to prevent digest errors ([fe6b4e6](https://github.com/johannesjo/super-productivity/commit/fe6b4e6))
* **globalLinks:** error when copying empty clipboard ([d041844](https://github.com/johannesjo/super-productivity/commit/d041844))
* **taskList:** rotate icon instead of button ([6c3851e](https://github.com/johannesjo/super-productivity/commit/6c3851e))


### Features

* add backface-visibility: hidden to prevent flicker ([4eb6430](https://github.com/johannesjo/super-productivity/commit/4eb6430))
* add general performance optimizations for angularjs ([ba8407d](https://github.com/johannesjo/super-productivity/commit/ba8407d))
* add global error handler to notify the user ([98bdd47](https://github.com/johannesjo/super-productivity/commit/98bdd47))
* add lock edit mode feature to task notes ([03cae43](https://github.com/johannesjo/super-productivity/commit/03cae43))
* add minimal hover transition for icon buttons ([551d217](https://github.com/johannesjo/super-productivity/commit/551d217))
* add minimal timeout to simple toast to make it run more smoothly ([3501b16](https://github.com/johannesjo/super-productivity/commit/3501b16))
* allow global add task and add sub task to have the same shortcut ([f30a562](https://github.com/johannesjo/super-productivity/commit/f30a562))
* improve project switcher button ([5f28f00](https://github.com/johannesjo/super-productivity/commit/5f28f00))
* improve task started animation ([0efea2a](https://github.com/johannesjo/super-productivity/commit/0efea2a))
* make changing projects much smoother ([1560acb](https://github.com/johannesjo/super-productivity/commit/1560acb))
* make header a little smaller for mobile ([8b0ded2](https://github.com/johannesjo/super-productivity/commit/8b0ded2))
* show x icon when help section is open ([05518a7](https://github.com/johannesjo/super-productivity/commit/05518a7))



<a name="1.10.14"></a>
## [1.10.14](https://github.com/johannesjo/super-productivity/compare/v1.10.13...v1.10.14) (2018-04-14)


### Bug Fixes

* add missing aria attribute ([a3d2b5f](https://github.com/johannesjo/super-productivity/commit/a3d2b5f))
* backup button not giving full back up for all projects ([f23da6a](https://github.com/johannesjo/super-productivity/commit/f23da6a))
* collapsible button appearing everywhere ([4b2c801](https://github.com/johannesjo/super-productivity/commit/4b2c801))
* custom toast not working ([df55b22](https://github.com/johannesjo/super-productivity/commit/df55b22))
* edit on click for project settings ([3270ae1](https://github.com/johannesjo/super-productivity/commit/3270ae1))
* google api toast appearance ([03d619f](https://github.com/johannesjo/super-productivity/commit/03d619f))
* multiple scope events not being called correctly [#76](https://github.com/johannesjo/super-productivity/issues/76) ([1c07338](https://github.com/johannesjo/super-productivity/commit/1c07338))
* prevent collapsible from overflowing ([b563e84](https://github.com/johannesjo/super-productivity/commit/b563e84))


### Features

* improve backup settings section [#76](https://github.com/johannesjo/super-productivity/issues/76) ([66c54eb](https://github.com/johannesjo/super-productivity/commit/66c54eb))
* **enlargeImage:** also add zoom out ani ([34c11b4](https://github.com/johannesjo/super-productivity/commit/34c11b4))
* add button to add local attachments to task list ([47e5e8b](https://github.com/johannesjo/super-productivity/commit/47e5e8b))
* add counter to collapsible and for local attachments ([08339ad](https://github.com/johannesjo/super-productivity/commit/08339ad))
* add manifest for better mobile experience ([4d8c7f8](https://github.com/johannesjo/super-productivity/commit/4d8c7f8))
* add on the fly data syncing without reloads [#76](https://github.com/johannesjo/super-productivity/issues/76) ([d2b4828](https://github.com/johannesjo/super-productivity/commit/d2b4828))
* add option to completely enable/disable Google Drive Sync [#76](https://github.com/johannesjo/super-productivity/issues/76) ([dce0140](https://github.com/johannesjo/super-productivity/commit/dce0140))
* allow home tilde to be used in local backup and sync paths [#76](https://github.com/johannesjo/super-productivity/issues/76) ([96ab646](https://github.com/johannesjo/super-productivity/commit/96ab646))
* improve edit on click out transition ([42297d3](https://github.com/johannesjo/super-productivity/commit/42297d3))
* improve image zoom animation once more ([1a7640f](https://github.com/johannesjo/super-productivity/commit/1a7640f))
* make app storage more efficient ([a2ef65f](https://github.com/johannesjo/super-productivity/commit/a2ef65f))
* only disable md-input-container transitions for collapsible content ([bd41f1f](https://github.com/johannesjo/super-productivity/commit/bd41f1f))
* prevent animations and transitions inside when collapsible is animating ([0df2337](https://github.com/johannesjo/super-productivity/commit/0df2337))
* reintroduce dialog transitions ([1519851](https://github.com/johannesjo/super-productivity/commit/1519851))



<a name="1.10.13"></a>
## [1.10.13](https://github.com/johannesjo/super-productivity/compare/v1.10.12...v1.10.13) (2018-04-13)


### Bug Fixes

* blurry fonts on scale ([a1eba3a](https://github.com/johannesjo/super-productivity/commit/a1eba3a))
* broken focus mode ([447b16b](https://github.com/johannesjo/super-productivity/commit/447b16b))
* collapsible icon not turning ([8d7604b](https://github.com/johannesjo/super-productivity/commit/8d7604b))
* edit on click transition messing up hover states ([a3519b9](https://github.com/johannesjo/super-productivity/commit/a3519b9))
* image preview not working any more due to translateZ ([0c43378](https://github.com/johannesjo/super-productivity/commit/0c43378))
* limit mark-done-btn animation to active button state ([2c3be8b](https://github.com/johannesjo/super-productivity/commit/2c3be8b))
* quick fix for syncing issue [#76](https://github.com/johannesjo/super-productivity/issues/76) ([b69cc4d](https://github.com/johannesjo/super-productivity/commit/b69cc4d))
* toast styling not being good in some circumstances ([d263483](https://github.com/johannesjo/super-productivity/commit/d263483))


### Features

* add hack for android issue with the keyboard opening over inputs ([40ee1a9](https://github.com/johannesjo/super-productivity/commit/40ee1a9))
* give task controls just a little bit more space on mobile ([759eaae](https://github.com/johannesjo/super-productivity/commit/759eaae))
* remove tooltips in favor of just a simple title attribute (unfortunately tooltips are messing up in several scenarios) ([232f062](https://github.com/johannesjo/super-productivity/commit/232f062))
* run current task animation only after expand animation ([43bfc13](https://github.com/johannesjo/super-productivity/commit/43bfc13))
* **enlargeImage:** make it appear as original image is being enlarged ([b71a0fd](https://github.com/johannesjo/super-productivity/commit/b71a0fd))



<a name="1.10.12"></a>
## [1.10.12](https://github.com/johannesjo/super-productivity/compare/v1.10.11...v1.10.12) (2018-04-08)


### Bug Fixes

* change detection parameter for callback for edit on click ([3d0cfc8](https://github.com/johannesjo/super-productivity/commit/3d0cfc8))
* rare global link list error ([4f9acec](https://github.com/johannesjo/super-productivity/commit/4f9acec))
* undo delete task toast weird layout for long task names ([e7cc5cd](https://github.com/johannesjo/super-productivity/commit/e7cc5cd))


### Features

* add simple animation to mark as done button ([5051bfd](https://github.com/johannesjo/super-productivity/commit/5051bfd))
* handle hide controls case for edit on click focus transition ([f8aa235](https://github.com/johannesjo/super-productivity/commit/f8aa235))
* limit short syntax to a lesser degree ([e1cc08f](https://github.com/johannesjo/super-productivity/commit/e1cc08f))
* make simple toast handle multi line content better ([6e857c3](https://github.com/johannesjo/super-productivity/commit/6e857c3))
* smooth out edit on click transition ([d271cc3](https://github.com/johannesjo/super-productivity/commit/d271cc3))



<a name="1.10.11"></a>
## [1.10.11](https://github.com/johannesjo/super-productivity/compare/v1.10.10...v1.10.11) (2018-04-08)


### Bug Fixes

* toggling edit on click via enter key not working ([90a49d2](https://github.com/johannesjo/super-productivity/commit/90a49d2))
* unknown provider error caused by missing inject ([9c0cee2](https://github.com/johannesjo/super-productivity/commit/9c0cee2))


### Features

* add better styling to overflowing text elements (for very looong words) ([2a49d4a](https://github.com/johannesjo/super-productivity/commit/2a49d4a))
* adjust task title styles ([815d989](https://github.com/johannesjo/super-productivity/commit/815d989))
* allow directly editing other task titles and inputs on click ([cf0a689](https://github.com/johannesjo/super-productivity/commit/cf0a689))
* caret color of contenteditable ([1e8aba4](https://github.com/johannesjo/super-productivity/commit/1e8aba4))
* improve edit on click styles ([0573003](https://github.com/johannesjo/super-productivity/commit/0573003))
* improve edit on click styles again ([e0592da](https://github.com/johannesjo/super-productivity/commit/e0592da))
* improve sub task visibility further by adjusting progress bars ([16589ec](https://github.com/johannesjo/super-productivity/commit/16589ec))
* improve task deletion toast ([9103e5c](https://github.com/johannesjo/super-productivity/commit/9103e5c))
* make copy & paste work for edit on click ([46e28f5](https://github.com/johannesjo/super-productivity/commit/46e28f5))
* make tasks borders more distinguishable ([0ac309a](https://github.com/johannesjo/super-productivity/commit/0ac309a))
* prevent global link list from triggering on contenteditable ([d796855](https://github.com/johannesjo/super-productivity/commit/d796855))
* use contenteditable for edit-on-click ([d87d075](https://github.com/johannesjo/super-productivity/commit/d87d075))



<a name="1.10.10"></a>
## [1.10.10](https://github.com/johannesjo/super-productivity/compare/v1.10.9...v1.10.10) (2018-04-07)


### Bug Fixes

* quick access menu blocking ui underneath ([1fb826d](https://github.com/johannesjo/super-productivity/commit/1fb826d))
* several issues with the new task wrapper ([41456f0](https://github.com/johannesjo/super-productivity/commit/41456f0))


### Features

* improve crawl in crawl out ([2e1c398](https://github.com/johannesjo/super-productivity/commit/2e1c398))
* improve outlines ([5540461](https://github.com/johannesjo/super-productivity/commit/5540461))
* improve progress bar styling ([5fb50a5](https://github.com/johannesjo/super-productivity/commit/5fb50a5))
* make nested lists look better ([7799a43](https://github.com/johannesjo/super-productivity/commit/7799a43))
* speed up task enter/leave animations by using js ([54b3340](https://github.com/johannesjo/super-productivity/commit/54b3340))
* use css animation again as cleanup styles is not playing nicely with the sortable lists ([389dc6f](https://github.com/johannesjo/super-productivity/commit/389dc6f))



<a name="1.10.9"></a>
## [1.10.9](https://github.com/johannesjo/super-productivity/compare/v1.10.8...v1.10.9) (2018-04-06)


### Bug Fixes

* expand collapse icons not shown for daily planner ([3561c8e](https://github.com/johannesjo/super-productivity/commit/3561c8e))
* help icon displaced ([c16ede6](https://github.com/johannesjo/super-productivity/commit/c16ede6))
* hide sub task notes when clicking collapse all button ([b5204c3](https://github.com/johannesjo/super-productivity/commit/b5204c3))
* lint ([d557032](https://github.com/johannesjo/super-productivity/commit/d557032))
* update icon position ([2dbd64b](https://github.com/johannesjo/super-productivity/commit/2dbd64b))


### Features

* add a little bit of animation to the current task ([9e05a04](https://github.com/johannesjo/super-productivity/commit/9e05a04))
* add animation to time tracking history ([0a13b4b](https://github.com/johannesjo/super-productivity/commit/0a13b4b))
* don't transition task background color as it is bad for keyboard navigation experience ([a2d225c](https://github.com/johannesjo/super-productivity/commit/a2d225c))
* improve animation for daily planner input ([52e2d70](https://github.com/johannesjo/super-productivity/commit/52e2d70))
* improve daily planner animations ([9d3ca22](https://github.com/johannesjo/super-productivity/commit/9d3ca22))
* improve help icon animation ([902b6d8](https://github.com/johannesjo/super-productivity/commit/902b6d8))
* improve page transitions ([7acb415](https://github.com/johannesjo/super-productivity/commit/7acb415))
* improve page transitions once more ([ff473d6](https://github.com/johannesjo/super-productivity/commit/ff473d6))
* improve pulse on daily planner ([b1c3e29](https://github.com/johannesjo/super-productivity/commit/b1c3e29))
* improve slide down up animation ([8a27f57](https://github.com/johannesjo/super-productivity/commit/8a27f57))
* make page transitions more subtle ([93759a4](https://github.com/johannesjo/super-productivity/commit/93759a4))
* make progress bars less dominant for dark theme ([ac6c796](https://github.com/johannesjo/super-productivity/commit/ac6c796))
* make task list a little bit more compact ([dcd2a04](https://github.com/johannesjo/super-productivity/commit/dcd2a04))
* minor tweaks for task list ([9bda05e](https://github.com/johannesjo/super-productivity/commit/9bda05e))
* put loading bar just on the edge of the task ([85c02bf](https://github.com/johannesjo/super-productivity/commit/85c02bf))
* remove old progress bar ([eb80f75](https://github.com/johannesjo/super-productivity/commit/eb80f75))
* replace md-progress with custom solution and make it a little bit more recognizable ([c2ecc99](https://github.com/johannesjo/super-productivity/commit/c2ecc99))
* shorten dialog titles ([43a6f1f](https://github.com/johannesjo/super-productivity/commit/43a6f1f))
* slightly improve all animations related to entering or leaving a page ([6572fd9](https://github.com/johannesjo/super-productivity/commit/6572fd9))
* slightly improve delete btn ([b19531c](https://github.com/johannesjo/super-productivity/commit/b19531c))
* slightly improve show notes btn ([b019f0a](https://github.com/johannesjo/super-productivity/commit/b019f0a))
* slightly speed up expand collapse ([b46a9c1](https://github.com/johannesjo/super-productivity/commit/b46a9c1))
* slightly speed up expand collapse ([c2d08b1](https://github.com/johannesjo/super-productivity/commit/c2d08b1))
* update page transitions ([c39c433](https://github.com/johannesjo/super-productivity/commit/c39c433))
* very politely animate current task on work view ([bfc6ffd](https://github.com/johannesjo/super-productivity/commit/bfc6ffd))



<a name="1.10.8"></a>
## [1.10.8](https://github.com/johannesjo/super-productivity/compare/v1.10.7...v1.10.8) (2018-04-02)


### Features

* objectively improve success animation even more ([9340a1a](https://github.com/johannesjo/super-productivity/commit/9340a1a))



<a name="1.10.7"></a>
## [1.10.7](https://github.com/johannesjo/super-productivity/compare/v1.10.6...v1.10.7) (2018-04-02)



<a name="1.10.6"></a>
## [1.10.6](https://github.com/johannesjo/super-productivity/compare/v1.10.5...v1.10.6) (2018-04-02)


### Features

* beautify daily success animation ([daa91bb](https://github.com/johannesjo/super-productivity/commit/daa91bb))



<a name="1.10.5"></a>
## [1.10.5](https://github.com/johannesjo/super-productivity/compare/v1.10.4...v1.10.5) (2018-04-02)


### Bug Fixes

* description text for short syntax [#71](https://github.com/johannesjo/super-productivity/issues/71) ([d6e682d](https://github.com/johannesjo/super-productivity/commit/d6e682d))
* time sheet export wrong total time [#72](https://github.com/johannesjo/super-productivity/issues/72) ([3704db1](https://github.com/johannesjo/super-productivity/commit/3704db1))


### Features

* add js based animation for slide up down ([7a217de](https://github.com/johannesjo/super-productivity/commit/7a217de))
* improve task list styling ([7a8a7bd](https://github.com/johannesjo/super-productivity/commit/7a8a7bd))



<a name="1.10.4"></a>
## [1.10.4](https://github.com/johannesjo/super-productivity/compare/v1.10.3...v1.10.4) (2018-03-29)


### Bug Fixes

* tasks getting replaced when switching projects in work view [#69](https://github.com/johannesjo/super-productivity/issues/69) ([adcc034](https://github.com/johannesjo/super-productivity/commit/adcc034))


### Features

* improve project creation dialog ([9fda280](https://github.com/johannesjo/super-productivity/commit/9fda280))
* make sync notification optional [#67](https://github.com/johannesjo/super-productivity/issues/67) ([f4b7887](https://github.com/johannesjo/super-productivity/commit/f4b7887))
* optionally notify when time estimate was exceeded [#69](https://github.com/johannesjo/super-productivity/issues/69) ([0f84ef8](https://github.com/johannesjo/super-productivity/commit/0f84ef8))



<a name="1.10.3"></a>
## [1.10.3](https://github.com/johannesjo/super-productivity/compare/v1.10.2...v1.10.3) (2018-03-26)


### Bug Fixes

* edit on click producing block elements ([3a87061](https://github.com/johannesjo/super-productivity/commit/3a87061))
* project renaming not working [#65](https://github.com/johannesjo/super-productivity/issues/65) ([24de1e3](https://github.com/johannesjo/super-productivity/commit/24de1e3))



<a name="1.10.2"></a>
## [1.10.2](https://github.com/johannesjo/super-productivity/compare/v1.10.1...v1.10.2) (2018-03-26)


### Bug Fixes

* add missing ngInject statements [#65](https://github.com/johannesjo/super-productivity/issues/65) ([57daea4](https://github.com/johannesjo/super-productivity/commit/57daea4))
* set the right default value for 'isBlockFinishDayUntilTimeTimeTracked' [#66](https://github.com/johannesjo/super-productivity/issues/66) ([d5857e5](https://github.com/johannesjo/super-productivity/commit/d5857e5))


### Features

* add optional reset break timer but track when tracking on idle dialog ([359ddb2](https://github.com/johannesjo/super-productivity/commit/359ddb2))
* show optional 'Are you sure you want to leave?' confirm dialog when quitting web version ([db34ac0](https://github.com/johannesjo/super-productivity/commit/db34ac0))



<a name="1.10.1"></a>
## [1.10.1](https://github.com/johannesjo/super-productivity/compare/v1.10.0...v1.10.1) (2018-03-24)


### Bug Fixes

* google api not working any more ([9812b1b](https://github.com/johannesjo/super-productivity/commit/9812b1b))


### Features

* make focus view work without pomodoro ([2cc8607](https://github.com/johannesjo/super-productivity/commit/2cc8607))



<a name="1.10.0"></a>
# [1.10.0](https://github.com/johannesjo/super-productivity/compare/v1.9.4...v1.10.0) (2018-03-23)


### Bug Fixes

* dark theme being unset after toggling theme settings ([06da8b9](https://github.com/johannesjo/super-productivity/commit/06da8b9))
* jira issue urls being wrong sometimes ([67fb8bf](https://github.com/johannesjo/super-productivity/commit/67fb8bf))
* jira requests being made event though the configuration is invalid ([31b0bc1](https://github.com/johannesjo/super-productivity/commit/31b0bc1))
* keyboard shortcuts from firing when editing text ([9a9ae61](https://github.com/johannesjo/super-productivity/commit/9a9ae61))
* only check for tasks updates if jira is enabled ([e8e9c73](https://github.com/johannesjo/super-productivity/commit/e8e9c73))
* original link icon wrongly aligned ([13cc557](https://github.com/johannesjo/super-productivity/commit/13cc557))


### Features

* add a way to configure transition handling initially ([6548fb4](https://github.com/johannesjo/super-productivity/commit/6548fb4))
* add animation utility classes and use them ([1bceb9c](https://github.com/johannesjo/super-productivity/commit/1bceb9c))
* add dark theme for new task list styles ([902fd7e](https://github.com/johannesjo/super-productivity/commit/902fd7e))
* add idle time tracking for extension ([49f4bde](https://github.com/johannesjo/super-productivity/commit/49f4bde))
* add login toast if authentication fails ([6534f7d](https://github.com/johannesjo/super-productivity/commit/6534f7d))
* add mark as done button again ([dffe15d](https://github.com/johannesjo/super-productivity/commit/dffe15d))
* add neat progress bar when syncing to google drive ([219b762](https://github.com/johannesjo/super-productivity/commit/219b762))
* add notification for successful login ([c20d9a8](https://github.com/johannesjo/super-productivity/commit/c20d9a8))
* add notification to extension interface ([190f41e](https://github.com/johannesjo/super-productivity/commit/190f41e))
* add possibility to hide task list controls ([c55b65b](https://github.com/johannesjo/super-productivity/commit/c55b65b))
* add user select none to several ui items ([7b6ea97](https://github.com/johannesjo/super-productivity/commit/7b6ea97))
* beautification ([def56f2](https://github.com/johannesjo/super-productivity/commit/def56f2))
* beautification ([1b21001](https://github.com/johannesjo/super-productivity/commit/1b21001))
* beautify settings and fix clickable area for extendable ([627a433](https://github.com/johannesjo/super-productivity/commit/627a433))
* don't hide collapse/expand button as it is an important indicator ([6696c0b](https://github.com/johannesjo/super-productivity/commit/6696c0b))
* give pomodoro settings their own panel ([f4b0899](https://github.com/johannesjo/super-productivity/commit/f4b0899))
* improve google api handling ([b0e1a8d](https://github.com/johannesjo/super-productivity/commit/b0e1a8d))
* improve google auth behaviour ([394f59a](https://github.com/johannesjo/super-productivity/commit/394f59a))
* improve pomodoro messages ([04a9325](https://github.com/johannesjo/super-productivity/commit/04a9325))
* make all settings expandables ([a0b2c90](https://github.com/johannesjo/super-productivity/commit/a0b2c90))
* make app much more responsive by using template cache ([0374f5a](https://github.com/johannesjo/super-productivity/commit/0374f5a))
* make issue transitioning optional ([c49601d](https://github.com/johannesjo/super-productivity/commit/c49601d))
* make settings a bit more compact ([0c1c608](https://github.com/johannesjo/super-productivity/commit/0c1c608))
* only show extension notification once ([c417f1d](https://github.com/johannesjo/super-productivity/commit/c417f1d))
* optionally block finish day until time sheet is exported ([e479b29](https://github.com/johannesjo/super-productivity/commit/e479b29))
* organize jira options better ([93d194e](https://github.com/johannesjo/super-productivity/commit/93d194e))
* restyle task list ([4fcf15e](https://github.com/johannesjo/super-productivity/commit/4fcf15e))
* save to ls directly after sync to google drive to minify the risk of conflicting data ([a032137](https://github.com/johannesjo/super-productivity/commit/a032137))
* select text for edit on click ([e707f8c](https://github.com/johannesjo/super-productivity/commit/e707f8c))
* show optional time worked without break ([d43150d](https://github.com/johannesjo/super-productivity/commit/d43150d))
* simply remove timer button for parent tasks if they have sub tasks ([c8103c2](https://github.com/johannesjo/super-productivity/commit/c8103c2))
* smoth out help icon animation ([277ef51](https://github.com/johannesjo/super-productivity/commit/277ef51))
* smoth out some more ([77dad29](https://github.com/johannesjo/super-productivity/commit/77dad29))
* smothen up animations once more ([9c00f56](https://github.com/johannesjo/super-productivity/commit/9c00f56))
* stop pomodoro timer if button is disabled ([d557819](https://github.com/johannesjo/super-productivity/commit/d557819))
* styling adjustments for settings ([d843008](https://github.com/johannesjo/super-productivity/commit/d843008))
* update chrome extension link ([3fa0d8e](https://github.com/johannesjo/super-productivity/commit/3fa0d8e))
* update pomodoro focus jira icon ([e35adae](https://github.com/johannesjo/super-productivity/commit/e35adae))



<a name="1.9.4"></a>
## [1.9.4](https://github.com/johannesjo/super-productivity/compare/v1.9.3...v1.9.4) (2018-03-18)


### Bug Fixes

* add strike-through again for done tasks ([a6bd449](https://github.com/johannesjo/super-productivity/commit/a6bd449))
* only select next task if current task was marked as done ([a543829](https://github.com/johannesjo/super-productivity/commit/a543829))
* **chromeExtension:** jira set status modal ([e7c75ac](https://github.com/johannesjo/super-productivity/commit/e7c75ac))
* only show download extension button for web version ([6444a40](https://github.com/johannesjo/super-productivity/commit/6444a40))
* only show download extension button for web version and if the extension is not installed already ([9b3359c](https://github.com/johannesjo/super-productivity/commit/9b3359c))
* scrolling on mobile with ng-sortable ([9aac5bb](https://github.com/johannesjo/super-productivity/commit/9aac5bb))


### Features

* add nice little animation to the task title edit form ([565250f](https://github.com/johannesjo/super-productivity/commit/565250f))
* add notification when syncing ([26f4d40](https://github.com/johannesjo/super-productivity/commit/26f4d40))
* add transition to inline-markdown ([fba83fa](https://github.com/johannesjo/super-productivity/commit/fba83fa))
* improve slide animation ([caca38a](https://github.com/johannesjo/super-productivity/commit/caca38a))
* make daily summary much more lucid ([df1437c](https://github.com/johannesjo/super-productivity/commit/df1437c))
* make dialogs bigger on mobile ([a6f609f](https://github.com/johannesjo/super-productivity/commit/a6f609f))
* only show import error, when an error occured ([1a6aab3](https://github.com/johannesjo/super-productivity/commit/1a6aab3))
* **chromeExtension:** wait for extension to be ready before sending jira events ([54e1877](https://github.com/johannesjo/super-productivity/commit/54e1877))
* slightly improve task enter leave animations ([46c79eb](https://github.com/johannesjo/super-productivity/commit/46c79eb))
* sync to google drive before closing app ([3e4d4e9](https://github.com/johannesjo/super-productivity/commit/3e4d4e9))
* **chromeExtension:** add basic jira interface ([1cf304d](https://github.com/johannesjo/super-productivity/commit/1cf304d))
* **chromeExtension:** add IS_EXTENSION checks for task jira actions ([64eef30](https://github.com/johannesjo/super-productivity/commit/64eef30))
* sync before finishing day ([4b6b37a](https://github.com/johannesjo/super-productivity/commit/4b6b37a))
* **chromeExtension:** basic communication interface for jira ready ([348ecb1](https://github.com/johannesjo/super-productivity/commit/348ecb1))
* **chromeExtension:** basic initialization of extension interface ([de3164e](https://github.com/johannesjo/super-productivity/commit/de3164e))
* **chromeExtension:** improve help section ([18118ba](https://github.com/johannesjo/super-productivity/commit/18118ba))
* **chromeExtension:** remove APP_READY and timeouts ([5d3651f](https://github.com/johannesjo/super-productivity/commit/5d3651f))
* **chromeExtension:** update jira settings to reflect on the extension being available ([de93daa](https://github.com/johannesjo/super-productivity/commit/de93daa))
* **gDriveSync:** also set expires at for electron flow ([076525d](https://github.com/johannesjo/super-productivity/commit/076525d))
* **taskList:** move time and time button together ([6a5ba34](https://github.com/johannesjo/super-productivity/commit/6a5ba34))



<a name="1.9.3"></a>
## [1.9.3](https://github.com/johannesjo/super-productivity/compare/v1.9.2...v1.9.3) (2018-03-13)


### Bug Fixes

* add more verbose logout ([1187bce](https://github.com/johannesjo/super-productivity/commit/1187bce))
* desktop styling for task list ([2aed60a](https://github.com/johannesjo/super-productivity/commit/2aed60a))
* missing space in error message ([51a1349](https://github.com/johannesjo/super-productivity/commit/51a1349))
* save sync file name button on mobile ([3cf205f](https://github.com/johannesjo/super-productivity/commit/3cf205f))


### Features

* add more accurate warning ([e845879](https://github.com/johannesjo/super-productivity/commit/e845879))
* **mobile:** improve task list styles ([21db12e](https://github.com/johannesjo/super-productivity/commit/21db12e))
* improve google login flow and really log out if the users does so ([712ffea](https://github.com/johannesjo/super-productivity/commit/712ffea))
* insert new tasks after current task ([566ebc7](https://github.com/johannesjo/super-productivity/commit/566ebc7))



<a name="1.9.2"></a>
## [1.9.2](https://github.com/johannesjo/super-productivity/compare/v1.9.1...v1.9.2) (2018-03-12)


### Bug Fixes

* endless error messages if xprintidle is not installed [#60](https://github.com/johannesjo/super-productivity/issues/60) ([58a631a](https://github.com/johannesjo/super-productivity/commit/58a631a))
* google login not working sometimes ([a5ff1f7](https://github.com/johannesjo/super-productivity/commit/a5ff1f7))
* save button not appearing for timesheet export ([f6d6b0e](https://github.com/johannesjo/super-productivity/commit/f6d6b0e))



<a name="1.9.1"></a>
## [1.9.1](https://github.com/johannesjo/super-productivity/compare/v1.9.0...v1.9.1) (2018-03-11)


### Features

* **gDriveSync:** better error case handling ([eeefbff](https://github.com/johannesjo/super-productivity/commit/eeefbff))
* **gDriveSync:** improve sync file selection ([52722c7](https://github.com/johannesjo/super-productivity/commit/52722c7))
* **gDriveSync:** wait for login before syncing ([8aa264f](https://github.com/johannesjo/super-productivity/commit/8aa264f))



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
