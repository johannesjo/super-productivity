## [8.0.1](https://github.com/johannesjo/super-productivity/compare/v8.0.0...v8.0.1) (2024-03-04)

### Bug Fixes

- calendar disable not working ([34ba6ae](https://github.com/johannesjo/super-productivity/commit/34ba6aec956cc1d61ef677eca31bc7a03129a9db))
- issue when trying to move sub-task to archive [#3059](https://github.com/johannesjo/super-productivity/issues/3059) ([ba2cc3c](https://github.com/johannesjo/super-productivity/commit/ba2cc3c81a806150d3b7922941d56b230846f6f9))
- issue when trying to remove last tag [#3060](https://github.com/johannesjo/super-productivity/issues/3060) ([b40397a](https://github.com/johannesjo/super-productivity/commit/b40397a7b5135e31c2fe65e5345e9d4852fdbdce))

### Features

- add productivity tip ([03b0080](https://github.com/johannesjo/super-productivity/commit/03b0080a41f1d0aa967ebac79ae9b0304306a873))
- close app if user selects NOT to fix data [#3052](https://github.com/johannesjo/super-productivity/issues/3052) ([67a5758](https://github.com/johannesjo/super-productivity/commit/67a57580661dffbe34e22b2b41aa04e05e0cad6f))
- **i18n:** update Croatian translation [#3044](https://github.com/johannesjo/super-productivity/issues/3044) ([398ef21](https://github.com/johannesjo/super-productivity/commit/398ef217764cf3e350f547449d4901c869557555))
- improve error handling for failed pkce challenge [#3039](https://github.com/johannesjo/super-productivity/issues/3039) ([7ccf5b3](https://github.com/johannesjo/super-productivity/commit/7ccf5b3c7d99f7ed53485899f7244b70e9222ee6))
- improve new tag handling [#3035](https://github.com/johannesjo/super-productivity/issues/3035) ([1bbe671](https://github.com/johannesjo/super-productivity/commit/1bbe6712c276239eebaf1c3ccedc007a4205cff4))
- improve windows store icon [#2549](https://github.com/johannesjo/super-productivity/issues/2549) ([3c94c81](https://github.com/johannesjo/super-productivity/commit/3c94c810fbc955fcc4aeade534d26004f4abec2c))
- **sync:** retry upload once without confirm and only then ask [#3058](https://github.com/johannesjo/super-productivity/issues/3058) ([9d30b32](https://github.com/johannesjo/super-productivity/commit/9d30b3211ba12c98382c7d8bfe6f1472c9aba49d))
- **sync:** show snack if already in sync ([1394e43](https://github.com/johannesjo/super-productivity/commit/1394e437253d0623ba6d45bf7a5a8124915bbabb))
- use different icon for mac and linux [#3033](https://github.com/johannesjo/super-productivity/issues/3033) ([53f57dc](https://github.com/johannesjo/super-productivity/commit/53f57dcf0360d2049561046d2498e5230665ee65))

# [8.0.0](https://github.com/johannesjo/super-productivity/compare/v8.0.0-rc.0...v8.0.0) (2024-02-09)

### Bug Fixes

- privacy export not masking all the properties [#3005](https://github.com/johannesjo/super-productivity/issues/3005) ([632b0cb](https://github.com/johannesjo/super-productivity/commit/632b0cbf557f7c524c9244bd0f7da50dddfa5f6f))
- redmine initial dialog btn ([fc7ef3f](https://github.com/johannesjo/super-productivity/commit/fc7ef3f9bf18b96d1c60867215c6bc2424f8658c))
- **reminderCountdown:** not reacting right away to skipped reminders ([b8ef950](https://github.com/johannesjo/super-productivity/commit/b8ef9509b7d5bc8b2839d3099750a095ac611eb3))
- task data not ready for calendar issue tasks [#3004](https://github.com/johannesjo/super-productivity/issues/3004) ([d7124ca](https://github.com/johannesjo/super-productivity/commit/d7124cabb4dcad6f1904769a7e021060ee24a293))
- **tour:** weird modal container pushing content bug ([60a3423](https://github.com/johannesjo/super-productivity/commit/60a34233b0dd9e32cd23eb40140384efe1fb252c))
- wrong short syntax style ([17cdbfe](https://github.com/johannesjo/super-productivity/commit/17cdbfebe11de055e415944cd91a8255f6bcb495))

### Features

- improve repeat section styling ([0cbdb1c](https://github.com/johannesjo/super-productivity/commit/0cbdb1c789c64a22836417c6a6195e2a1b0695c9))
- **shortSyntax:** ask before creating new tags ([d362783](https://github.com/johannesjo/super-productivity/commit/d36278331ebcaceb9d78e11ce78a47f096c4dc90))

# [8.0.0-rc.0](https://github.com/johannesjo/super-productivity/compare/v7.17.2...v8.0.0-rc.0) (2024-01-31)

### Bug Fixes

- avoid too many calendar requests when tracking ([110607d](https://github.com/johannesjo/super-productivity/commit/110607d9f7bbdaaafbd5bf576c7441b05ad9ffe2))
- **calendarIntegration:** migration not working ([452c480](https://github.com/johannesjo/super-productivity/commit/452c480da1ef992d82dc28fd44946a697cfcfa50))
- **calendarIntegration:** skipped events not working ([a6a8ec3](https://github.com/johannesjo/super-productivity/commit/a6a8ec3901ea8c2967728337bde573955ea630b6))
- **calendarIntegration:** wrong component name ([b562471](https://github.com/johannesjo/super-productivity/commit/b562471c2dd306ca465db18782d71441b33a67d1))
- checklist not working anymore inside markdown [#2988](https://github.com/johannesjo/super-productivity/issues/2988) ([bbfa937](https://github.com/johannesjo/super-productivity/commit/bbfa937666fc562ea3bd58d6e5abef13263632d5))
- **countdownReminder:** make edge cases work when tracking ([869f721](https://github.com/johannesjo/super-productivity/commit/869f72145c5e643aeb1a7f6c5102b0d64ac574ed))
- debounce for config form not always working ([64ba20a](https://github.com/johannesjo/super-productivity/commit/64ba20a227fe87bde8a11ba80fc857bb5be1063a))
- default project error [#2950](https://github.com/johannesjo/super-productivity/issues/2950) ([567a55c](https://github.com/johannesjo/super-productivity/commit/567a55c27ac27412373e60551b9599cc73cc619d))
- dismiss banners if no stuff to show ([22324d7](https://github.com/johannesjo/super-productivity/commit/22324d7b91833e965fd8537934761ea2365b4f17))
- domina mode leading to issues [#2992](https://github.com/johannesjo/super-productivity/issues/2992) ([865dab0](https://github.com/johannesjo/super-productivity/commit/865dab07aa9dd30109c06b37cf43749d4379d8f8))
- don't show countdown when task is deleted and react to changes ([dc9c4ab](https://github.com/johannesjo/super-productivity/commit/dc9c4ab57c68e6b27ad8bea37ef44f5f191ba1c4))
- don't show domina mode on snap and for firefox [#2977](https://github.com/johannesjo/super-productivity/issues/2977) ([2e30b8b](https://github.com/johannesjo/super-productivity/commit/2e30b8bc74f43f3d0ed0074fbbbb0bd86de957c4))
- error when there is no task archive yet ([0e8ffc3](https://github.com/johannesjo/super-productivity/commit/0e8ffc37710e253342d426b48d8824d65dff8f0c))
- error when there is no task archive yet 2 ([16da66b](https://github.com/johannesjo/super-productivity/commit/16da66b90d345e53b0adebce44ada8ddf42d9ea1))
- focus not being restored for repeat task dialog ([af794b3](https://github.com/johannesjo/super-productivity/commit/af794b350ffde0f33c4d5ca006b21a746a25b3e6))
- lint ([daa8459](https://github.com/johannesjo/super-productivity/commit/daa84596e742778693c8f21279fc50274b1975f9))
- motivational image cfg not being shown [#2971](https://github.com/johannesjo/super-productivity/issues/2971) ([9c3a566](https://github.com/johannesjo/super-productivity/commit/9c3a56680829bb9e4d4a085a60a8918068f2a9cc))
- planning mode issues ([15b8f52](https://github.com/johannesjo/super-productivity/commit/15b8f522996949b2d617d2eb74285bcdddfaaf13))
- remove leftover wrong code ([13c1338](https://github.com/johannesjo/super-productivity/commit/13c1338a104e634918f65cfb83d173cb5d68c647))
- save and go home marking tasks as done before confirmation in dialog ([90cff79](https://github.com/johannesjo/super-productivity/commit/90cff790b708894a8264d425e13cca3ac4cc3523))
- show simple counter title on hover [#2660](https://github.com/johannesjo/super-productivity/issues/2660) ([d661fad](https://github.com/johannesjo/super-productivity/commit/d661fad32bd550e512728a4a142a4f110571d798))
- styling for procrastination helper ([33b2b90](https://github.com/johannesjo/super-productivity/commit/33b2b9000b094f319283bef045e119e88d12bfac))
- styling issue ([eb2cfbf](https://github.com/johannesjo/super-productivity/commit/eb2cfbff932a8e9f031d5007a2739c7b58aa6e97))
- task focus behavior edge case ([d066976](https://github.com/johannesjo/super-productivity/commit/d066976217b36b98cd0b1e1cd59f20dca4f5d399))
- today string not always being translated ([301cbde](https://github.com/johannesjo/super-productivity/commit/301cbded0c5885b1b9cdc93d98d3377e7d9ebfc6))
- tooltip not visible ([0eeb2fa](https://github.com/johannesjo/super-productivity/commit/0eeb2fa88f0058b6a3f3b8d9de5915c65f8e5359))
- typo ([33eeb22](https://github.com/johannesjo/super-productivity/commit/33eeb22374f5e2207f1ad63cf427e97b50baddea))

### Features

- add hash fn ([a9dd944](https://github.com/johannesjo/super-productivity/commit/a9dd944c00ec9ff2c735fc791ef31f0f4db7fe68))
- add info on how to add tags ([1833593](https://github.com/johannesjo/super-productivity/commit/183359380aec1f44e7d14200fffdb2c554a2deeb))
- add outlook info for ical cfg ([9adc538](https://github.com/johannesjo/super-productivity/commit/9adc5380e7f5d6af7c253b830877dcd86129453b))
- add quick way to access timeline settings ([1d7e394](https://github.com/johannesjo/super-productivity/commit/1d7e39484c5d04352d04f3bde4f51cadb8d688c7))
- add subtle play animation ([df59101](https://github.com/johannesjo/super-productivity/commit/df5910189cf01c9425cbd650c9caee78a243412c))
- add warning in browser for ical cfg ([a245950](https://github.com/johannesjo/super-productivity/commit/a2459501b48c1bcade0dfb537005bba9d7969a10))
- also close additional info panel on ESCAPE ([cb53906](https://github.com/johannesjo/super-productivity/commit/cb53906019ec22a3c864e949d6f5a2638958cedf))
- also show time worked today for archived tasks [#2939](https://github.com/johannesjo/super-productivity/issues/2939) ([3c63874](https://github.com/johannesjo/super-productivity/commit/3c6387431eb3d44ccc056e15637914b4414350f0))
- **calendarIntegration:** add add as task for timeline itself ([b7d1914](https://github.com/johannesjo/super-productivity/commit/b7d1914970cb1246a1af24192c8fcd250d8ff68f))
- **calendarIntegration:** add calendar tasks as issue tasks ([1798295](https://github.com/johannesjo/super-productivity/commit/1798295395eb42ff670481aa483b82bacc8896a6))
- **calendarIntegration:** add checking in interval ([df81df4](https://github.com/johannesjo/super-productivity/commit/df81df499e8963bdb94a6cff011c621cd61ec842))
- **calendarIntegration:** add config form ([97b92a6](https://github.com/johannesjo/super-productivity/commit/97b92a6a68a7d3e955b46cbc01e3d98420089415))
- **calendarIntegration:** add isueProviderId for calendar tasks and make adding from timeline work correctly ([4cbb523](https://github.com/johannesjo/super-productivity/commit/4cbb52347246191afd4c89ba5cdc05116d2a4bf4))
- **calendarIntegration:** add migration for calendars from timeline to new integration ([6a24f0f](https://github.com/johannesjo/super-productivity/commit/6a24f0fed54d599f88398b0d076617976d85abeb))
- **calendarIntegration:** add service to use for caching later ([e43d875](https://github.com/johannesjo/super-productivity/commit/e43d875b7d784004e9e87d317d4e3817d1ceeb82))
- **calendarIntegration:** add smart threshold for events ([d79f586](https://github.com/johannesjo/super-productivity/commit/d79f58601b98dcb635477413853ea9e284bc35bf))
- **calendarIntegration:** add translations ([0841d83](https://github.com/johannesjo/super-productivity/commit/0841d83a8e23d7510b595c7acf645a7456e11be2))
- **calendarIntegration:** adjust msg for past ([8822222](https://github.com/johannesjo/super-productivity/commit/8822222cf11a454f0ac52dc24407e3fd1dc8fdd5))
- **calendarIntegration:** filter added calendar events from timeline ([23587ff](https://github.com/johannesjo/super-productivity/commit/23587ffe53928e7a4d892daea7a7108b8382e697))
- **calendarIntegration:** hide icon for now ([c093aeb](https://github.com/johannesjo/super-productivity/commit/c093aeb1fea97d327f8d5b63e3da835ef01527d8))
- **calendarIntegration:** make banner behave smarter for multiple entries ([1da0d07](https://github.com/johannesjo/super-productivity/commit/1da0d07fd9e736204f2551b0bebad956caf48e85))
- **calendarIntegration:** make banner react smartly to already added tasks ([cce9424](https://github.com/johannesjo/super-productivity/commit/cce9424525cdd648e33e7f993cfd1faa79b58181))
- **calendarIntegration:** make most basic displaying of events work ([f3019ca](https://github.com/johannesjo/super-productivity/commit/f3019caa0a5c609f4dd7322ee835ce8bdf89c556))
- **calendarIntegration:** make navigate to task accessible from anywhere ([78da133](https://github.com/johannesjo/super-productivity/commit/78da1331e5ed13611396e2026e3e2722da62c452))
- **calendarIntegration:** persist skipped events for a day ([f585be9](https://github.com/johannesjo/super-productivity/commit/f585be99fe906b721edc3cd206250e8273613d69))
- **calendarIntegration:** polish ([cc2a6e1](https://github.com/johannesjo/super-productivity/commit/cc2a6e174911ec4f0f505337cafdb0caeaac7f99))
- **calendarIntegration:** show notes button in a normal fashion ([d74cb00](https://github.com/johannesjo/super-productivity/commit/d74cb008d3d85877bfca0c1f7355167269bd32f4))
- **calendarIntegration:** update description text ([0f9aafe](https://github.com/johannesjo/super-productivity/commit/0f9aafeaa77165eb3eb1eed07443fe6384288e26))
- disable spellcheck for duration input ([82908ce](https://github.com/johannesjo/super-productivity/commit/82908ce2484e8d37f7e6682aa5bb4af53ab137b4))
- disable spellcheck for task title ([3f3ebd1](https://github.com/johannesjo/super-productivity/commit/3f3ebd1f8b73d1b493c6ec59b31336342429b354))
- **electron:** avoid weird shortcuts being able to crash the app ([1e05cf2](https://github.com/johannesjo/super-productivity/commit/1e05cf2c61795c5c379492fd28a2268f1007e8d8))
- **focusMode:** make x close procrastination mode instead of focus mode ([ec6cce8](https://github.com/johannesjo/super-productivity/commit/ec6cce8747209fc167b8e998cb22c8b4740be190))
- make goToWorkView shortcut configurable and also focus first task if possible ([b09b074](https://github.com/johannesjo/super-productivity/commit/b09b0740aedfaa123038e850875a7b0cf9260b53))
- **reminderCountdown:** fine tune ([a7c9a29](https://github.com/johannesjo/super-productivity/commit/a7c9a29da7975f24ef7532af69b116573d03e5a5))
- **reminderCountdown:** fine tune 2 ([3145a40](https://github.com/johannesjo/super-productivity/commit/3145a40cad1a6ba1493c7016442fc65172dbba7c))
- **reminderCountdown:** make countdown progress work ([08e72d3](https://github.com/johannesjo/super-productivity/commit/08e72d39de98d64edb2f2e8f017ea7d124a81971))
- **reminderCountdown:** make math work better ([a370ca2](https://github.com/johannesjo/super-productivity/commit/a370ca24a1fc0897771916d62381d7a11235ae37))
- **reminderCountdown:** outline feature ([6c1e697](https://github.com/johannesjo/super-productivity/commit/6c1e6978fb870ba38093501d02f2945f19ff2fb2))
- set default values for form checkbox ([ed29f23](https://github.com/johannesjo/super-productivity/commit/ed29f2315cbb508ea5ff44d642e5e8284de47a03))
- show icon for icon selector component ([6d09a35](https://github.com/johannesjo/super-productivity/commit/6d09a351f25755a44001d26304652ec4c655d686))
- **tagsForSubTasks:** avoid problematic error case ([b7a3fe7](https://github.com/johannesjo/super-productivity/commit/b7a3fe7898c7ee4c50bbe81ae847c09dbc3ceac3))
- **tagsForSubTasks:** display add and remove my day btns work better ([351d50e](https://github.com/johannesjo/super-productivity/commit/351d50eac25afa1c95823af542b06812b87285e0))
- **tagsForSubTasks:** display add and remove my day btns work better 2 ([d273894](https://github.com/johannesjo/super-productivity/commit/d273894a625382dd55f936d72b6643ba5435cc72))
- **tagsForSubTasks:** improve handling and auto add and remove tags for parent or sub task if necessary ([7863975](https://github.com/johannesjo/super-productivity/commit/78639751ba9e0f182b92e161030b070e2ca2bef3))
- **tagsForSubTasks:** make drag & drop work ([fea088f](https://github.com/johannesjo/super-productivity/commit/fea088f4b004f698c22e5d1db469b714497a9e01))
- **tagsForSubTasks:** make most basic stuff work ([29a47ab](https://github.com/johannesjo/super-productivity/commit/29a47abd18541df7483d99dc49874b0e3eb3e1c3))
- **tagsForSubTasks:** make up & down work in timeline ([0eb87f0](https://github.com/johannesjo/super-productivity/commit/0eb87f0ed1626fd13f4e521ef2c44bf6e799740a))
- **tagsForSubTasks:** navigate to parent task context if necessary ([9c9d7bd](https://github.com/johannesjo/super-productivity/commit/9c9d7bd461b1d5151fb0c916ea972699bc957e98))
- **tour:** add advanced tutorial choice ([0424aea](https://github.com/johannesjo/super-productivity/commit/0424aea692858e22760e40b3107c09d2a6d84882))
- **tour:** add basic steps ([74d1c40](https://github.com/johannesjo/super-productivity/commit/74d1c409644ce682daabeaca076ef31b0bfcdc97))
- **tour:** add basic steps2 ([721aa86](https://github.com/johannesjo/super-productivity/commit/721aa86271c2aa7cb79b9631377f29874d857670))
- **tour:** add basic steps3 ([9578a58](https://github.com/johannesjo/super-productivity/commit/9578a58661642b46c637d64aa190b9741dcbbec3))
- **tour:** add for advanced keyboard stuff ([f592d1d](https://github.com/johannesjo/super-productivity/commit/f592d1daf3b50a964923a989d5d55f9505216775))
- **tour:** add for advanced keyboard stuff 2 ([b6d227e](https://github.com/johannesjo/super-productivity/commit/b6d227efd5d8ad51fa3939119617168e11c1589e))
- **tour:** add mechanism to show tours again ([e1534fa](https://github.com/johannesjo/super-productivity/commit/e1534fa24c32fbd28b7ab5222f5a13ed6aa2c4cf))
- **tour:** add more menu entries for help ([2bdda43](https://github.com/johannesjo/super-productivity/commit/2bdda43d21633871ff15efcf633a53eda388b525))
- **tour:** add simple intro for projects ([77fdc51](https://github.com/johannesjo/super-productivity/commit/77fdc514bff211a3e0a97f7934988b029972b9ef))
- **tour:** add tour for calendar and productivity helpers ([b125f8d](https://github.com/johannesjo/super-productivity/commit/b125f8d025591b62e0a1ecb5e9c285be3d7b2369))
- **tour:** add tour for sync ([bea725d](https://github.com/johannesjo/super-productivity/commit/bea725d3581cb6805d6db7a1bbe9ac3eba182304))
- **tour:** add translations ([6f729f8](https://github.com/johannesjo/super-productivity/commit/6f729f85a5fec97297722f79ef00a581dab695f4))
- **tour:** also add swipe tutorial ([95ac2e4](https://github.com/johannesjo/super-productivity/commit/95ac2e484e3bbaec00a7ac1bbadbc67afc5d8837))
- **tour:** better hover menu experience ([51da1b9](https://github.com/johannesjo/super-productivity/commit/51da1b997109cd2bb92a294a68422c1aaa65a85c))
- **tour:** disable default focus behavior ([9434408](https://github.com/johannesjo/super-productivity/commit/9434408bfe21e1a8594bfbc3f62bc924aef50491))
- **tour:** fine tune ([57ab150](https://github.com/johannesjo/super-productivity/commit/57ab150e6ad5b51eee72e08994dd5c1857027147))
- **tour:** further polish <3 ([daeb42e](https://github.com/johannesjo/super-productivity/commit/daeb42e75d4383075649b5c29cfb1c6a638ccdf0))
- **tour:** further polish <3 2 ([05d0cbd](https://github.com/johannesjo/super-productivity/commit/05d0cbd77b50cef36d06d3876e36ff53f1d247de))
- **tour:** further polish <3 3 ([4f01c04](https://github.com/johannesjo/super-productivity/commit/4f01c04f1012139bf351c89c925c6fd4e58456f2))
- **tour:** further polish <3 4 ([2d01322](https://github.com/johannesjo/super-productivity/commit/2d01322484d5cb46d3914799cce8894d52e2cc30))
- **tour:** improve basic steps ([8a83786](https://github.com/johannesjo/super-productivity/commit/8a83786f7f9091aec6d81223c7376946dba88142))
- **tour:** improve basic steps 2 ([5d71b5a](https://github.com/johannesjo/super-productivity/commit/5d71b5acf1abb875bd1d801021e537d345a7fc9e))
- **tour:** improve basic steps 3 ([8958e14](https://github.com/johannesjo/super-productivity/commit/8958e146fba2e5705bbb4540c31a0ca10e456208))
- **tour:** improve button styling ([abf9dce](https://github.com/johannesjo/super-productivity/commit/abf9dcefbd4d78b33fcea8e76fb813ba3c788c6c))
- **tour:** improve styling ([d43dd25](https://github.com/johannesjo/super-productivity/commit/d43dd250380fb397a4964b7048a41791d2550b10))
- **tour:** improve styling ([7721960](https://github.com/johannesjo/super-productivity/commit/77219602ba5d29654bf2e3876dde52ce36137cb1))
- **tour:** make a little more robust for edge cases ([0c9c670](https://github.com/johannesjo/super-productivity/commit/0c9c6708659837f39ceaff97f41eb2fc4f879e0d))
- **tour:** make waitForEl more robust ([3e410bb](https://github.com/johannesjo/super-productivity/commit/3e410bb98923d760d3a8525ad78e530b701c1c27))
- **tour:** polish ([9cf2ec2](https://github.com/johannesjo/super-productivity/commit/9cf2ec2225716aea4a045a905dc0d7bab2ec1191))
- **tour:** polish ([e292563](https://github.com/johannesjo/super-productivity/commit/e29256389f530aa68fa656f5ab0af15a6478f8ab))
- **tour:** polish ([69f0f6c](https://github.com/johannesjo/super-productivity/commit/69f0f6cd0d4e922eebd4c33165fa95284ba605ba))
- **tour:** polish ([48587b5](https://github.com/johannesjo/super-productivity/commit/48587b59423bbe2a48824eb0c6d1e5234e7a2039))
- **tour:** polish ([a8fd093](https://github.com/johannesjo/super-productivity/commit/a8fd093e0b4f5983388c760cb870df2511fdb77a))
- **tour:** polish ([c87fae3](https://github.com/johannesjo/super-productivity/commit/c87fae301d5961a143fb959aad4b02bd427705c6))
- **tour:** polish ([c777cd9](https://github.com/johannesjo/super-productivity/commit/c777cd9a43cfa4124413dadfee2005421a7c313e))
- **tour:** polish ([23583e9](https://github.com/johannesjo/super-productivity/commit/23583e94372747c1ee258315a276fd90795789af))
- **tour:** polish ([386a283](https://github.com/johannesjo/super-productivity/commit/386a283fde2f46481f9415a9fe392e480e897077))
- **tour:** polish ([fcaf2a2](https://github.com/johannesjo/super-productivity/commit/fcaf2a2ebe3ab583af6e94f98592676420e3c1ba))
- **tour:** polish styles ([2f4f3fc](https://github.com/johannesjo/super-productivity/commit/2f4f3fcea3ca40b1fafe4d75263599c87b156468))
- **tour:** polish wh ([c9dee14](https://github.com/johannesjo/super-productivity/commit/c9dee148aec93172c3ab80b50c4b60215f35f074))
- **tour:** use custom shepherd service ([c3e006f](https://github.com/johannesjo/super-productivity/commit/c3e006fb96e41b37b55ae00ea975f40efab23b82))
- unify markdown styles ([df220e5](https://github.com/johannesjo/super-productivity/commit/df220e519ff5bfdbe2247f1bdb931793287294ef))
- update pulse ani ([c74c989](https://github.com/johannesjo/super-productivity/commit/c74c9898181e61fec41c0421145f73c79b3b59fc))

## [7.17.2](https://github.com/johannesjo/super-productivity/compare/v7.17.1...v7.17.2) (2023-12-30)

### Bug Fixes

- default project issue [#2950](https://github.com/johannesjo/super-productivity/issues/2950) ([500189b](https://github.com/johannesjo/super-productivity/commit/500189b971f1f42bb101e82fa33c7512f7d58d46))
- problematic ipcEvent$ case [#2949](https://github.com/johannesjo/super-productivity/issues/2949) ([127a597](https://github.com/johannesjo/super-productivity/commit/127a5976be02971a6e110185b76ec84f62217786))

## [7.17.1](https://github.com/johannesjo/super-productivity/compare/v7.16.0...v7.17.1) (2023-12-29)

### Bug Fixes

- backup path [#2910](https://github.com/johannesjo/super-productivity/issues/2910) ([5242ed2](https://github.com/johannesjo/super-productivity/commit/5242ed2c59ca11f768fbc30cab716edf7a286c3c))
- debounce issue in a better way ([5d300e1](https://github.com/johannesjo/super-productivity/commit/5d300e1e47eb7f8b225211add453198aae43e582))
- **electronSecurity:** problem with ipcEvent unsubscription ([e6388a2](https://github.com/johannesjo/super-productivity/commit/e6388a26bcbc62b396e220d37927943be60b1cf3))
- **gitlab:** dialog submission for values below 1m ([ac011ca](https://github.com/johannesjo/super-productivity/commit/ac011cabd75eb0da98b664c799680113315c676a))
- help btn styling ([422d775](https://github.com/johannesjo/super-productivity/commit/422d7757f0f609375dab6c0d1b88f93059bc7e1b))
- input debounce delay causing problems ([5ebd1d7](https://github.com/johannesjo/super-productivity/commit/5ebd1d7bf3b361d37d9f2e5cbc0c2d349abd12f0))
- prevent double execution of short syntax [#2940](https://github.com/johannesjo/super-productivity/issues/2940) ([59b560f](https://github.com/johannesjo/super-productivity/commit/59b560f727efecca34d204e9663f4f3314e9082c))
- shortcuts not working [#2887](https://github.com/johannesjo/super-productivity/issues/2887) ([7200fcb](https://github.com/johannesjo/super-productivity/commit/7200fcbd7046e0e079f1beb31e23b9169776bab3))
- **shortSyntax:** don't parse bla#bla as tag ([6bd0d9b](https://github.com/johannesjo/super-productivity/commit/6bd0d9b8e586d75aded765eb74b17a2927b3f5c5))
- typing issue ([f2fa950](https://github.com/johannesjo/super-productivity/commit/f2fa9504f9413be64a9f5f4613629d3f8a9f00c3))
- wrong backup path being used [#2910](https://github.com/johannesjo/super-productivity/issues/2910) ([dec2eb7](https://github.com/johannesjo/super-productivity/commit/dec2eb702c4a303b2299126616a5a0c56f38ebe7))

### Features

- allow for usage of system dark mode ([c6d76c6](https://github.com/johannesjo/super-productivity/commit/c6d76c6a170f71b0315deb90205342c4cbd216b6))
- cleaner startup for electron [#2942](https://github.com/johannesjo/super-productivity/issues/2942) [#1678](https://github.com/johannesjo/super-productivity/issues/1678) ([f4c8aa9](https://github.com/johannesjo/super-productivity/commit/f4c8aa988ff979fee9d7dd369af1166070da9c44))
- **electronSecurity:** add security layer for exec commands ([87ad3d5](https://github.com/johannesjo/super-productivity/commit/87ad3d59b58644be7e52ef0d0fb13f2c91783591))
- **electronSecurity:** enable security for marked stuff again ([038fed6](https://github.com/johannesjo/super-productivity/commit/038fed6795012b7679000ffd97c013e00575d1c7))
- **electronSecurity:** make app relaunch work ([f9d74f5](https://github.com/johannesjo/super-productivity/commit/f9d74f5762c77b1e422efb7928d591df37723c3d))
- **electronSecurity:** make app.getPath work ([849c232](https://github.com/johannesjo/super-productivity/commit/849c232d42439d30201548ec76189d82e8d20b7e))
- **electronSecurity:** make apple theme switch work again ([eaeb833](https://github.com/johannesjo/super-productivity/commit/eaeb833e96f0827fe9c37ad5aae269167ef2b2bc))
- **electronSecurity:** make dev tools and reload work again ([145de2f](https://github.com/johannesjo/super-productivity/commit/145de2fba6025dde3d03cc82d2a56307f43c2075))
- **electronSecurity:** make electron log work ([4fb040f](https://github.com/johannesjo/super-productivity/commit/4fb040f6191c260651209d55d623c1a4acb345e6))
- **electronSecurity:** make electron log work again ([e2b9f82](https://github.com/johannesjo/super-productivity/commit/e2b9f8241191208a5209402726cfc7c7198917b6))
- **electronSecurity:** make idle stuff work again ([1768d30](https://github.com/johannesjo/super-productivity/commit/1768d30d578723f64fa70eb6c11a236aafe7ac45))
- **electronSecurity:** make invoke stuff work on electron side ([8002e20](https://github.com/johannesjo/super-productivity/commit/8002e20bea9029567dec26912f859e4f5b93e572))
- **electronSecurity:** make mac os dark moode stuff work ([a32281e](https://github.com/johannesjo/super-productivity/commit/a32281e07ff6ec454651cf977fe37ea61bf90876))
- **electronSecurity:** make node integration disabled work for now ([e21df2a](https://github.com/johannesjo/super-productivity/commit/e21df2a87b16b2dbaf3c34eb20edf1511f1b1490))
- **electronSecurity:** make on method more secure ([c3cba4d](https://github.com/johannesjo/super-productivity/commit/c3cba4d9b3a7dfbf5f366bb83e2805b687bd4f4f))
- **electronSecurity:** make open path and open external work ([f946607](https://github.com/johannesjo/super-productivity/commit/f94660719433f70be54b570a47d2ea046c535fad))
- **electronSecurity:** replace electron service completely ([4a3d333](https://github.com/johannesjo/super-productivity/commit/4a3d333030ba7b6a445cd7d682d1a2f0fb3e327c))
- **electronSecurity:** replace electron service remote ([4fc7fd2](https://github.com/johannesjo/super-productivity/commit/4fc7fd2bdec68aacb005e41e5b3f31f64cc95e19))
- **electronSecurity:** replace IPC event stuff ([4b5ad80](https://github.com/johannesjo/super-productivity/commit/4b5ad80d26676cf140db1e5fcf9ce249f04cf410))
- **electronSecurity:** replace other electron stuff ([49839bf](https://github.com/johannesjo/super-productivity/commit/49839bf6605ae381ab09758d4a4e753fe0d35e1b))
- **electronSecurity:** replace shell stuff ([4005c74](https://github.com/johannesjo/super-productivity/commit/4005c74aee0134fe6001e6f1e5cf5ae0ec7742cd))
- **electronSecurity:** throw error for ipcEvents$ cleanup since not possible ([a1c0d7d](https://github.com/johannesjo/super-productivity/commit/a1c0d7d2205b8d2c03688b53c6217d9a68c92c34))
- **electronSecurity:** update electron ([7fe4d63](https://github.com/johannesjo/super-productivity/commit/7fe4d63ea470f7a151ca82d0fb2ecd4fbf0b1793))
- **electronSecurity:** wrap all invoke handlers ([058f85b](https://github.com/johannesjo/super-productivity/commit/058f85bae5af84f6c681b625233b5dc21a68c3c8))
- **electronSecurity:** wrap all send handlers ([c6abc8f](https://github.com/johannesjo/super-productivity/commit/c6abc8f96566e8508f5ccd4bac54f44d786efd10))
- **electronSecurity:** wrap exec before close stuff ([0760e8e](https://github.com/johannesjo/super-productivity/commit/0760e8eb95c1208931cfd00b03cf26ec981738e5))
- **fileSync:** auto update path with file name if none is given ([2bf04b4](https://github.com/johannesjo/super-productivity/commit/2bf04b4e56b777b9307efebf0ac93d3d359eb047))
- **gitlab:** add special info when submitting data from past days ([2e77ef9](https://github.com/johannesjo/super-productivity/commit/2e77ef923cc801cf2ad5a0967ab5da144e364289))
- **gitlab:** save and use info about already tracked data for issue provider tracking ([b34886d](https://github.com/johannesjo/super-productivity/commit/b34886de6d7ca77c70814dce4a0a7c722e7ccf49))
- **i18n:** add czech language ([2bdf8ca](https://github.com/johannesjo/super-productivity/commit/2bdf8cac7e9ec422583a697dfbb3a42fa9492cd6))
- improve task ui for close btn ([35d8eff](https://github.com/johannesjo/super-productivity/commit/35d8effb0cb88a74c6aea99a22ec65d38379c2b8))
- **issue:** add links with info on how to get token etc ([0803173](https://github.com/johannesjo/super-productivity/commit/0803173e34446e77a91e60eb35f9f2ec658985b8))
- make all config changes live ([341d658](https://github.com/johannesjo/super-productivity/commit/341d658d3b251b712282865cafba1e0ab810b250))
- make forms more consistent ([d3b6ce5](https://github.com/johannesjo/super-productivity/commit/d3b6ce5db683f288eaa12d591c72d79448b4f196))
- never show install pwa snack again if ignore is selected ([9529165](https://github.com/johannesjo/super-productivity/commit/952916535e797e85b7ccafd29113c6bb15eef803))
- rename default project to inbox ([630b202](https://github.com/johannesjo/super-productivity/commit/630b2023aed00c693e4b9eb4693b71de7be2a9de))
- **shortSyntax:** don't parse taskTitle+pro as project ([187ac08](https://github.com/johannesjo/super-productivity/commit/187ac08517eddcc8507d87ec03b51100a368e1a1))
- use toggle instead of checkboxes ([4cf8d8d](https://github.com/johannesjo/super-productivity/commit/4cf8d8d370d5eba7ae3bfcf0fb426fb05b26c889))

# [7.17.0](https://github.com/johannesjo/super-productivity/compare/v7.16.0...v7.17.0) (2023-12-27)

### Bug Fixes

- backup path [#2910](https://github.com/johannesjo/super-productivity/issues/2910) ([5242ed2](https://github.com/johannesjo/super-productivity/commit/5242ed2c59ca11f768fbc30cab716edf7a286c3c))
- debounce issue in a better way ([5d300e1](https://github.com/johannesjo/super-productivity/commit/5d300e1e47eb7f8b225211add453198aae43e582))
- **electronSecurity:** problem with ipcEvent unsubscription ([e6388a2](https://github.com/johannesjo/super-productivity/commit/e6388a26bcbc62b396e220d37927943be60b1cf3))
- **gitlab:** dialog submission for values below 1m ([ac011ca](https://github.com/johannesjo/super-productivity/commit/ac011cabd75eb0da98b664c799680113315c676a))
- help btn styling ([422d775](https://github.com/johannesjo/super-productivity/commit/422d7757f0f609375dab6c0d1b88f93059bc7e1b))
- input debounce delay causing problems ([5ebd1d7](https://github.com/johannesjo/super-productivity/commit/5ebd1d7bf3b361d37d9f2e5cbc0c2d349abd12f0))
- shortcuts not working [#2887](https://github.com/johannesjo/super-productivity/issues/2887) ([7200fcb](https://github.com/johannesjo/super-productivity/commit/7200fcbd7046e0e079f1beb31e23b9169776bab3))
- **shortSyntax:** don't parse bla#bla as tag ([6bd0d9b](https://github.com/johannesjo/super-productivity/commit/6bd0d9b8e586d75aded765eb74b17a2927b3f5c5))
- typing issue ([f2fa950](https://github.com/johannesjo/super-productivity/commit/f2fa9504f9413be64a9f5f4613629d3f8a9f00c3))

### Features

- allow for usage of system dark mode ([c6d76c6](https://github.com/johannesjo/super-productivity/commit/c6d76c6a170f71b0315deb90205342c4cbd216b6))
- **electronSecurity:** add security layer for exec commands ([87ad3d5](https://github.com/johannesjo/super-productivity/commit/87ad3d59b58644be7e52ef0d0fb13f2c91783591))
- **electronSecurity:** enable security for marked stuff again ([038fed6](https://github.com/johannesjo/super-productivity/commit/038fed6795012b7679000ffd97c013e00575d1c7))
- **electronSecurity:** make app relaunch work ([f9d74f5](https://github.com/johannesjo/super-productivity/commit/f9d74f5762c77b1e422efb7928d591df37723c3d))
- **electronSecurity:** make app.getPath work ([849c232](https://github.com/johannesjo/super-productivity/commit/849c232d42439d30201548ec76189d82e8d20b7e))
- **electronSecurity:** make apple theme switch work again ([eaeb833](https://github.com/johannesjo/super-productivity/commit/eaeb833e96f0827fe9c37ad5aae269167ef2b2bc))
- **electronSecurity:** make dev tools and reload work again ([145de2f](https://github.com/johannesjo/super-productivity/commit/145de2fba6025dde3d03cc82d2a56307f43c2075))
- **electronSecurity:** make electron log work ([4fb040f](https://github.com/johannesjo/super-productivity/commit/4fb040f6191c260651209d55d623c1a4acb345e6))
- **electronSecurity:** make electron log work again ([e2b9f82](https://github.com/johannesjo/super-productivity/commit/e2b9f8241191208a5209402726cfc7c7198917b6))
- **electronSecurity:** make idle stuff work again ([1768d30](https://github.com/johannesjo/super-productivity/commit/1768d30d578723f64fa70eb6c11a236aafe7ac45))
- **electronSecurity:** make invoke stuff work on electron side ([8002e20](https://github.com/johannesjo/super-productivity/commit/8002e20bea9029567dec26912f859e4f5b93e572))
- **electronSecurity:** make mac os dark moode stuff work ([a32281e](https://github.com/johannesjo/super-productivity/commit/a32281e07ff6ec454651cf977fe37ea61bf90876))
- **electronSecurity:** make node integration disabled work for now ([e21df2a](https://github.com/johannesjo/super-productivity/commit/e21df2a87b16b2dbaf3c34eb20edf1511f1b1490))
- **electronSecurity:** make on method more secure ([c3cba4d](https://github.com/johannesjo/super-productivity/commit/c3cba4d9b3a7dfbf5f366bb83e2805b687bd4f4f))
- **electronSecurity:** make open path and open external work ([f946607](https://github.com/johannesjo/super-productivity/commit/f94660719433f70be54b570a47d2ea046c535fad))
- **electronSecurity:** replace electron service completely ([4a3d333](https://github.com/johannesjo/super-productivity/commit/4a3d333030ba7b6a445cd7d682d1a2f0fb3e327c))
- **electronSecurity:** replace electron service remote ([4fc7fd2](https://github.com/johannesjo/super-productivity/commit/4fc7fd2bdec68aacb005e41e5b3f31f64cc95e19))
- **electronSecurity:** replace IPC event stuff ([4b5ad80](https://github.com/johannesjo/super-productivity/commit/4b5ad80d26676cf140db1e5fcf9ce249f04cf410))
- **electronSecurity:** replace other electron stuff ([49839bf](https://github.com/johannesjo/super-productivity/commit/49839bf6605ae381ab09758d4a4e753fe0d35e1b))
- **electronSecurity:** replace shell stuff ([4005c74](https://github.com/johannesjo/super-productivity/commit/4005c74aee0134fe6001e6f1e5cf5ae0ec7742cd))
- **electronSecurity:** throw error for ipcEvents$ cleanup since not possible ([a1c0d7d](https://github.com/johannesjo/super-productivity/commit/a1c0d7d2205b8d2c03688b53c6217d9a68c92c34))
- **electronSecurity:** update electron ([7fe4d63](https://github.com/johannesjo/super-productivity/commit/7fe4d63ea470f7a151ca82d0fb2ecd4fbf0b1793))
- **electronSecurity:** wrap all invoke handlers ([058f85b](https://github.com/johannesjo/super-productivity/commit/058f85bae5af84f6c681b625233b5dc21a68c3c8))
- **electronSecurity:** wrap all send handlers ([c6abc8f](https://github.com/johannesjo/super-productivity/commit/c6abc8f96566e8508f5ccd4bac54f44d786efd10))
- **electronSecurity:** wrap exec before close stuff ([0760e8e](https://github.com/johannesjo/super-productivity/commit/0760e8eb95c1208931cfd00b03cf26ec981738e5))
- **fileSync:** auto update path with file name if none is given ([2bf04b4](https://github.com/johannesjo/super-productivity/commit/2bf04b4e56b777b9307efebf0ac93d3d359eb047))
- **gitlab:** add special info when submitting data from past days ([2e77ef9](https://github.com/johannesjo/super-productivity/commit/2e77ef923cc801cf2ad5a0967ab5da144e364289))
- **gitlab:** save and use info about already tracked data for issue provider tracking ([b34886d](https://github.com/johannesjo/super-productivity/commit/b34886de6d7ca77c70814dce4a0a7c722e7ccf49))
- **i18n:** add czech language ([2bdf8ca](https://github.com/johannesjo/super-productivity/commit/2bdf8cac7e9ec422583a697dfbb3a42fa9492cd6))
- improve task ui for close btn ([35d8eff](https://github.com/johannesjo/super-productivity/commit/35d8effb0cb88a74c6aea99a22ec65d38379c2b8))
- **issue:** add links with info on how to get token etc ([0803173](https://github.com/johannesjo/super-productivity/commit/0803173e34446e77a91e60eb35f9f2ec658985b8))
- make all config changes live ([341d658](https://github.com/johannesjo/super-productivity/commit/341d658d3b251b712282865cafba1e0ab810b250))
- make forms more consistent ([d3b6ce5](https://github.com/johannesjo/super-productivity/commit/d3b6ce5db683f288eaa12d591c72d79448b4f196))
- never show install pwa snack again if ignore is selected ([9529165](https://github.com/johannesjo/super-productivity/commit/952916535e797e85b7ccafd29113c6bb15eef803))
- rename default project to inbox ([630b202](https://github.com/johannesjo/super-productivity/commit/630b2023aed00c693e4b9eb4693b71de7be2a9de))
- **shortSyntax:** don't parse taskTitle+pro as project ([187ac08](https://github.com/johannesjo/super-productivity/commit/187ac08517eddcc8507d87ec03b51100a368e1a1))
- use toggle instead of checkboxes ([4cf8d8d](https://github.com/johannesjo/super-productivity/commit/4cf8d8d370d5eba7ae3bfcf0fb426fb05b26c889))

# [7.16.0](https://github.com/johannesjo/super-productivity/compare/v7.15.1...v7.16.0) (2023-12-06)

### Bug Fixes

- **gitlab:** dialog error [#2776](https://github.com/johannesjo/super-productivity/issues/2776) ([b762a4e](https://github.com/johannesjo/super-productivity/commit/b762a4e986b7e1af32d35e5cbae450e3f6576aa7))
- **gitlab:** wrong error msg [#2776](https://github.com/johannesjo/super-productivity/issues/2776) ([48b9bc6](https://github.com/johannesjo/super-productivity/commit/48b9bc6998bc5ce7bc4e4f184618c2d4ff8d4218))

### Features

- **gitlab:** add loading spinner for submit worklog dialog [#2776](https://github.com/johannesjo/super-productivity/issues/2776) ([9dd0eb6](https://github.com/johannesjo/super-productivity/commit/9dd0eb6559cbe69510f5b96a37238944c595fe19))
- **gitlab:** add mechanism to trigger dialog before finish day [#2776](https://github.com/johannesjo/super-productivity/issues/2776) ([9f908db](https://github.com/johannesjo/super-productivity/commit/9f908db687246ae45381be0725f4eaa124950701))
- **gitlab:** add setting for timelogs [#2776](https://github.com/johannesjo/super-productivity/issues/2776) ([752f9cb](https://github.com/johannesjo/super-productivity/commit/752f9cb2e9bcdc2826d1e9705c55fa749414d19e))
- **gitlab:** add translations [#2776](https://github.com/johannesjo/super-productivity/issues/2776) ([f3fed22](https://github.com/johannesjo/super-productivity/commit/f3fed22e48a45fe94fe98f294c394464b33ed148))
- **gitlab:** also show already tracked data [#2776](https://github.com/johannesjo/super-productivity/issues/2776) ([fb848e6](https://github.com/johannesjo/super-productivity/commit/fb848e62337c1c00d41d88d2cb71322ea3138531))
- **gitlab:** make total estimate work [#2776](https://github.com/johannesjo/super-productivity/issues/2776) ([7a4189c](https://github.com/johannesjo/super-productivity/commit/7a4189cc04073fa0684d2096b9c62e4979325a25))
- **gitlab:** make worklog submit dialog internals work [#2776](https://github.com/johannesjo/super-productivity/issues/2776) ([923c233](https://github.com/johannesjo/super-productivity/commit/923c233f5b0f3150fc5ee25ed640563e9a2088b0))
- **gitlab:** outline api call [#2776](https://github.com/johannesjo/super-productivity/issues/2776) ([a3d83f3](https://github.com/johannesjo/super-productivity/commit/a3d83f3acfb8310a74b61dacfec065ebba742476))
- **gitlab:** outline before finish day handler [#2776](https://github.com/johannesjo/super-productivity/issues/2776) ([0f9ceb8](https://github.com/johannesjo/super-productivity/commit/0f9ceb89282b37905ed05e8b3a8e1cb7bc632b2d))
- **gitlab:** outline dialog ui for worklog submit [#2776](https://github.com/johannesjo/super-productivity/issues/2776) ([3158712](https://github.com/johannesjo/super-productivity/commit/3158712eef33119a55d0de01079debd7d256ae7c))
- **gitlab:** outline new add worklog feature [#2776](https://github.com/johannesjo/super-productivity/issues/2776) ([4b7ab37](https://github.com/johannesjo/super-productivity/commit/4b7ab37d77b9802c5b544f9124ea41c2121060a7))
- **gitlab:** polish UI [#2776](https://github.com/johannesjo/super-productivity/issues/2776) ([108891a](https://github.com/johannesjo/super-productivity/commit/108891a7018da3d041278239836637074b5edc36))
- **gitlab:** submit data to gitlab [#2776](https://github.com/johannesjo/super-productivity/issues/2776) ([f5e3607](https://github.com/johannesjo/super-productivity/commit/f5e3607816e3eb4133c0a6cb64c19265c0edf892))

## [7.15.1](https://github.com/johannesjo/super-productivity/compare/v7.15.0...v7.15.1) (2023-12-05)

### Bug Fixes

- arm64 mac build not working [#2503](https://github.com/johannesjo/super-productivity/issues/2503) ([d1bcba2](https://github.com/johannesjo/super-productivity/commit/d1bcba29df7dba3b59cfec8cee835a7c9d99b68c))
- bug introduced by PR ([7e57304](https://github.com/johannesjo/super-productivity/commit/7e5730405c6a7de9631d4eee3bcbfb53ed77bda3))
- error when navigating to non-existing tag or project [#2860](https://github.com/johannesjo/super-productivity/issues/2860) ([069d0d0](https://github.com/johannesjo/super-productivity/commit/069d0d0490a6e67cf1583cc4d8286c7d87e156c0))
- windows backup path [#2869](https://github.com/johannesjo/super-productivity/issues/2869) ([72be16e](https://github.com/johannesjo/super-productivity/commit/72be16ed35d37ee8827f08749277fed76c423253))
- windows backup path [#2869](https://github.com/johannesjo/super-productivity/issues/2869) ([fb659dd](https://github.com/johannesjo/super-productivity/commit/fb659ddf26f96d229b41027068c47c00ed70e824))

### Features

- add help to menu ([0bd8490](https://github.com/johannesjo/super-productivity/commit/0bd84909dae3c209137ef7bb4f65e6cf83551cff))
- **dailySummary:** show time spent by tag ([43ce680](https://github.com/johannesjo/super-productivity/commit/43ce68040d529bc89a9bfbd6fb408f90272632db))

# [7.15.0](https://github.com/johannesjo/super-productivity/compare/v7.14.3...v7.15.0) (2023-11-17)

### Bug Fixes

- checkmark not being displayed ([88a5663](https://github.com/johannesjo/super-productivity/commit/88a566312b97b5bde1365031e326342baa274453))
- focus after marking last subtask done ([#2795](https://github.com/johannesjo/super-productivity/issues/2795)) ([af6e5e3](https://github.com/johannesjo/super-productivity/commit/af6e5e3a0cfb6e2cf5d18b37036b60ef05f3c593))
- **focusMode:** lint ([4490232](https://github.com/johannesjo/super-productivity/commit/4490232252f53d26ecb7b8fd705ec0999576d6fe))
- **focusMode:** several issues ([9af442b](https://github.com/johannesjo/super-productivity/commit/9af442b04a97dd97fafccb1a73266906aef9d92e))
- metrics bug when switching projects directly [#2790](https://github.com/johannesjo/super-productivity/issues/2790) ([3bfec3d](https://github.com/johannesjo/super-productivity/commit/3bfec3de0011ab9487fc480ad4c5da2b50c3f691))
- ordering of weekly entries in quick history [#2817](https://github.com/johannesjo/super-productivity/issues/2817) ([8c23b06](https://github.com/johannesjo/super-productivity/commit/8c23b06496c345efffc4e769acb500ce163850de))
- scrollbars caused by overflow overlay deprecation ([87b5ff2](https://github.com/johannesjo/super-productivity/commit/87b5ff2ffed54ab06b85b03adaf95075a484ce9e))
- wrong translation key ([c165c75](https://github.com/johannesjo/super-productivity/commit/c165c75289ef686ab05c826feff7f9adad86ce66))

### Features

- [#2809](https://github.com/johannesjo/super-productivity/issues/2809) set the jira sub-task and related issue ([21ea9fb](https://github.com/johannesjo/super-productivity/commit/21ea9fb75242087b3673c666f22cf859d0ae2c8d))
- add additional productivity tipps ([48f98ec](https://github.com/johannesjo/super-productivity/commit/48f98ecca13315bb75c5a70b4cda50b43d998f40))
- add new productivity tip ([240147b](https://github.com/johannesjo/super-productivity/commit/240147b52e8f312b99fb938e776ed2c505269bb7))
- add shortcuts to move task to the top/bottom of the task list [#2723](https://github.com/johannesjo/super-productivity/issues/2723) ([ade5bed](https://github.com/johannesjo/super-productivity/commit/ade5bedc85a0edaac5c870ff27e510d168768b86))
- add tooltips for add task bar buttons ([2b305fc](https://github.com/johannesjo/super-productivity/commit/2b305fcb487bc6a356fef850eb9604d093e37dc7))
- adjust scrollbar styling ([2ee316e](https://github.com/johannesjo/super-productivity/commit/2ee316e1604948d1ec5a30ae5a495ce2f8d4f593))
- display productivity message a tad longer ([48ad007](https://github.com/johannesjo/super-productivity/commit/48ad0071e3f581ee25740d7f018965b159eb5e49))
- **electron:** add error handler for render process gone and unexpected ([7e9f070](https://github.com/johannesjo/super-productivity/commit/7e9f0700e4efa3fc511f22254796726e7acd0ddd))
- **focusMode:** add animation ([ee75577](https://github.com/johannesjo/super-productivity/commit/ee755775e1e9fbaea176de28ded30529c8f1bd8f))
- **focusMode:** add autostart focus mode ([01bf38f](https://github.com/johannesjo/super-productivity/commit/01bf38fa6b4fe1044e9bd9432dc891b8aedc5400))
- **focusMode:** add drop attachment ([5fbbbe2](https://github.com/johannesjo/super-productivity/commit/5fbbbe2ed82c292196ae4af628093132980379a0))
- **focusMode:** add info to disable pomodoro timer to use focus mode ([ffa56e1](https://github.com/johannesjo/super-productivity/commit/ffa56e14b9a6c4a8c7d2e0df39a5f30778aeb9b2))
- **focusMode:** add issue link ([67f809e](https://github.com/johannesjo/super-productivity/commit/67f809ee647512be64d7ef941fa1e3f3ed4adda7))
- **focusMode:** add keyboard shortcut ([3214328](https://github.com/johannesjo/super-productivity/commit/321432814c2f2b25b238f4242d3b46c38331cee3))
- **focusMode:** add preparation screen ([596d702](https://github.com/johannesjo/super-productivity/commit/596d702d0e13a2eb12da18c73af4cce99b9cb28b))
- **focusMode:** add steps UI ([a3df662](https://github.com/johannesjo/super-productivity/commit/a3df662689b7f20ff1eda4249d3b0fb28495d565))
- **focusMode:** add store stuff ([43802df](https://github.com/johannesjo/super-productivity/commit/43802df50927b10b5510e592ad5d16df4765d970))
- **focusMode:** add translations ([0467e80](https://github.com/johannesjo/super-productivity/commit/0467e803aaf5c57532a556654ef81ebb093d97ab))
- **focusMode:** add ui for selecting a different task ([34576b1](https://github.com/johannesjo/super-productivity/commit/34576b138b4270524cc15973adae94ebf8705809))
- **focusMode:** also mark task as done ([4af86be](https://github.com/johannesjo/super-productivity/commit/4af86be9c08af4bd7a4b3be5e334dc2d461842e7))
- **focusMode:** also show simple counters ([2467e79](https://github.com/johannesjo/super-productivity/commit/2467e79cf37ce7782b432d95e349a6d499947e5e))
- **focusMode:** autofill remaining session time ([1fa7a53](https://github.com/johannesjo/super-productivity/commit/1fa7a535a2e70b0b99a9992a15b40ea625d014ae))
- **focusMode:** don't close on escape if session is running ([f9a1aff](https://github.com/johannesjo/super-productivity/commit/f9a1aff75f91efa4ef3144c490f7f143a8b05207))
- **focusMode:** fix issue button styling ([845d8ef](https://github.com/johannesjo/super-productivity/commit/845d8ef126ff1ce79a2ce1d25d536d3aae2283bd))
- **focusMode:** get window attention for session done ([333d112](https://github.com/johannesjo/super-productivity/commit/333d112846f00e66676305cf49a1ce0ac76a3523))
- **focusMode:** handle idle current task deselection ([88c74f6](https://github.com/johannesjo/super-productivity/commit/88c74f66b5da1171a692aab45570fbeb3c5f92aa))
- **focusMode:** implement basic logic ([a67a698](https://github.com/johannesjo/super-productivity/commit/a67a6988fc92281e880dc7c127663755665abb44))
- **focusMode:** improve animation ([d4aac34](https://github.com/johannesjo/super-productivity/commit/d4aac34e0526cf02af26a7f6c14f072839f5bd4d))
- **focusMode:** improve note panel styling ([8a8e9a1](https://github.com/johannesjo/super-productivity/commit/8a8e9a15b13d271d59548e7ffa7f814d079d44b8))
- **focusMode:** improve progress circle ([19fb4d5](https://github.com/johannesjo/super-productivity/commit/19fb4d55ccb544f3b52284ce4a6353ee61a2ebfc))
- **focusMode:** improve session done without task done experience ([889b501](https://github.com/johannesjo/super-productivity/commit/889b50176a6d3801b545aba6f093bafb5fe602fb))
- **focusMode:** improve styling ([df9fc4b](https://github.com/johannesjo/super-productivity/commit/df9fc4b3d01c43e782c3f7e413bd5f80c26612cf))
- **focusMode:** improve ui ([2cb2472](https://github.com/johannesjo/super-productivity/commit/2cb24726ccc975d00257e40dc642b3baacbbb5b4))
- **focusMode:** improve ui ([e60b714](https://github.com/johannesjo/super-productivity/commit/e60b7148a45d29728080686020abee8cfc4e08b3))
- **focusMode:** improve ui ([df551c2](https://github.com/johannesjo/super-productivity/commit/df551c2fce1be9ccb8c4007d585c5280fb40309f))
- **focusMode:** improve ui ([95b8919](https://github.com/johannesjo/super-productivity/commit/95b89199773de334edd2dc47c8093baccd06b561))
- **focusMode:** improve ui 2 ([fed6db1](https://github.com/johannesjo/super-productivity/commit/fed6db12fb654817f0008b457942b99baf9674c1))
- **focusMode:** integrate banner ([921c299](https://github.com/johannesjo/super-productivity/commit/921c2993efbb0f4fdfed0dd80fc7703e77e29137))
- **focusMode:** make basic done screen work ([eec484e](https://github.com/johannesjo/super-productivity/commit/eec484e3d99252bf02e0449c14f085c988057efe))
- **focusMode:** make buttons work and add translations ([10c6ebf](https://github.com/johannesjo/super-productivity/commit/10c6ebfe16d02480fe2b13c1252e343b8b462ead))
- **focusMode:** make electron progress work ([c86653d](https://github.com/johannesjo/super-productivity/commit/c86653d46fda100119d42b059272ca888398b06d))
- **focusMode:** make escape key close work ([2edd7e0](https://github.com/johannesjo/super-productivity/commit/2edd7e0e971213f3830eac1cf60cdd2183a5c1f4))
- **focusMode:** make notes work ([6a16f71](https://github.com/johannesjo/super-productivity/commit/6a16f71c0b80b8603af79a348175519ecfa71088))
- **focusMode:** make page changes work for store variant ([6ee23b2](https://github.com/johannesjo/super-productivity/commit/6ee23b2d5e6f7b920016657818ecf24bcf873bf6))
- **focusMode:** make session done sound louder ([85046b7](https://github.com/johannesjo/super-productivity/commit/85046b7e8e305e25a0a4612228d7b036a1ceae68))
- **focusMode:** make session done work ([af0fc19](https://github.com/johannesjo/super-productivity/commit/af0fc196509fa4fbaff0685e0b803210c6237429))
- **focusMode:** make task creation work ([695f179](https://github.com/johannesjo/super-productivity/commit/695f179395db42d89fc9c52b303929755f836b53))
- **focusMode:** make task title editable ([1941807](https://github.com/johannesjo/super-productivity/commit/1941807bf19599eba4917c64ff354f9a5b88ef90))
- **focusMode:** make task tracking stop and session being done ([f6f8b17](https://github.com/johannesjo/super-productivity/commit/f6f8b17d2892b3c53365d59985b7a378e7425199))
- **focusMode:** make time selection work ([9e3a930](https://github.com/johannesjo/super-productivity/commit/9e3a930839bcdb4182dae25a3495915d3460d6a3))
- **focusMode:** make timer stuff work ([2a97f04](https://github.com/johannesjo/super-productivity/commit/2a97f04af80625219f19c7977feff9066d3acd5f))
- **focusMode:** migrate global config ([933c4a9](https://github.com/johannesjo/super-productivity/commit/933c4a9a35aeee62ad9d9a6ae555b53497d68d0d))
- **focusMode:** move procrastination stuff into focus mode ([ad29728](https://github.com/johannesjo/super-productivity/commit/ad297287898dae32806c49e6ddf67d234396efa5))
- **focusMode:** move to its own config ([fa9d171](https://github.com/johannesjo/super-productivity/commit/fa9d171ba4e15f92eb20999c94c957251ed7f912))
- **focusMode:** outline very simple focus mode ([cc35988](https://github.com/johannesjo/super-productivity/commit/cc3598814b379d436a3290e4f2b81a2e841b4341))
- **focusMode:** play sound on session done ([1a6d89a](https://github.com/johannesjo/super-productivity/commit/1a6d89aa0c6d9610a82c9aa9669358c854ac57c8))
- **focusMode:** polish ([ef993b0](https://github.com/johannesjo/super-productivity/commit/ef993b0ed73f4310908883ccf31db0a60c613285))
- **focusMode:** polish ([3efdec0](https://github.com/johannesjo/super-productivity/commit/3efdec03d3eedee9905919b6dd279085aa359d69))
- **focusMode:** prevent all navigation when overlay is open ([1510796](https://github.com/johannesjo/super-productivity/commit/151079614308383f1a092abc9d00b3785c5a5548))
- **focusMode:** set icon progress for electron app ([703e1fd](https://github.com/johannesjo/super-productivity/commit/703e1fd5a2daf24835cf99821d0f0b28c787bfe4))
- improve markdown note styling ([e98f00d](https://github.com/johannesjo/super-productivity/commit/e98f00d13c0a19c698632a3652638b5212a7b298))
- make github token required ([5c17823](https://github.com/johannesjo/super-productivity/commit/5c178238092929660f6b5f0f130ba9aad0ba6d97))
- minor style improvement ([0263889](https://github.com/johannesjo/super-productivity/commit/0263889213163205f9928c310766e677bd7c6183))
- more graceful error handling when invalid config is provided [#2849](https://github.com/johannesjo/super-productivity/issues/2849) [#2838](https://github.com/johannesjo/super-productivity/issues/2838) [#2582](https://github.com/johannesjo/super-productivity/issues/2582) [#2519](https://github.com/johannesjo/super-productivity/issues/2519) [#2242](https://github.com/johannesjo/super-productivity/issues/2242) [#2387](https://github.com/johannesjo/super-productivity/issues/2387) ([1c98b58](https://github.com/johannesjo/super-productivity/commit/1c98b58a2c2e62aee32b67d794aee4e7e25257ef))
- show install as PWA banner only after 2 minutes ([198320c](https://github.com/johannesjo/super-productivity/commit/198320ca13fb09d7fe901d46c199ff630e58fd21))
- show productivity tip a little longer in the beginning [#2764](https://github.com/johannesjo/super-productivity/issues/2764) ([a5c47af](https://github.com/johannesjo/super-productivity/commit/a5c47af704f0a5ac8c72859de9bc823ebcb4f38b))

## [7.14.3](https://github.com/johannesjo/super-productivity/compare/v7.14.2...v7.14.3) (2023-09-01)

### Bug Fixes

- IndexSizeError on copying multiline text [#2738](https://github.com/johannesjo/super-productivity/issues/2738) ([08a84cd](https://github.com/johannesjo/super-productivity/commit/08a84cd6b46f8092f9f3f1126d8b8ba6608eddd7))

### Features

- **evaluation:** put improvements after obstructions ([76f7535](https://github.com/johannesjo/super-productivity/commit/76f75353bfb8da6ceea95297bc717df575baa4d5))
- move new gitlab feature down in form ([1f45c47](https://github.com/johannesjo/super-productivity/commit/1f45c471df3030ed98924da205ba8f0d8e2443f3))
- **pomodoro:** do not stop time tracking before manual confirmation ([cd64701](https://github.com/johannesjo/super-productivity/commit/cd647019c17a754fef69310569ee53c7551d0c4a))

## [7.14.2](https://github.com/johannesjo/super-productivity/compare/v7.14.1...v7.14.2) (2023-08-21)

## [7.14.1](https://github.com/johannesjo/super-productivity/compare/v7.14.0...v7.14.1) (2023-08-21)

# [7.14.0](https://github.com/johannesjo/super-productivity/compare/v7.13.1...v7.14.0) (2023-07-28)

### Bug Fixes

- buttons not being centered ([96920a9](https://github.com/johannesjo/super-productivity/commit/96920a97596ce9367229994be081409d14617f19))
- **dominaMode:** default value being wrong ([95b88ea](https://github.com/johannesjo/super-productivity/commit/95b88ead78d969a8c7cdbc11996e7d571b082092))
- **dropbox:** avoid updating last active when updating token from refresh token to avoid initial sync conflict ([21971bd](https://github.com/johannesjo/super-productivity/commit/21971bddaa6549bd4f031ba634490f26d8885cc4))
- empty notes should never be displayed in preview mode ([79b891f](https://github.com/johannesjo/super-productivity/commit/79b891f84745a94a136168796efbdc87579c259d))
- github error behaviour when repository is not configured correctly [#2582](https://github.com/johannesjo/super-productivity/issues/2582) ([4ef1cf6](https://github.com/johannesjo/super-productivity/commit/4ef1cf6fe3ef67758ca1e473c0c211dc3d130c64))
- **github:** load all button cut off text ([71d87ba](https://github.com/johannesjo/super-productivity/commit/71d87ba6872e27fb807ff283e25ed9663ae14783))
- **i18n:** some fixes for russian translate ([899ac12](https://github.com/johannesjo/super-productivity/commit/899ac12ab687baf71d5558411590f6ec30b4d0bb))
- linux category [#2635](https://github.com/johannesjo/super-productivity/issues/2635) ([a74b801](https://github.com/johannesjo/super-productivity/commit/a74b801a0f0970c8fbee38d667436f7e15ffd6df))
- not all weekdays being visible [#2581](https://github.com/johannesjo/super-productivity/issues/2581) ([1c4c28c](https://github.com/johannesjo/super-productivity/commit/1c4c28c61d8ed0ab8aea8ce4227df5fa35dc924a))
- **pomodoro:** missleading wording ([edb5df6](https://github.com/johannesjo/super-productivity/commit/edb5df67ff8326b507e7e71c3330c71050e20ad9))
- remove custom date parsers since not working and unit tests are failing ([12a385e](https://github.com/johannesjo/super-productivity/commit/12a385e27bec9fbb095c570a9b076b25f90b7355))
- remove sidebar transition to avoid problem [#2533](https://github.com/johannesjo/super-productivity/issues/2533) ([c9db586](https://github.com/johannesjo/super-productivity/commit/c9db58610f4818d7468ddd546031a89691cec67f))
- repeat label shown when repeat for today was created yesterday ([040aa86](https://github.com/johannesjo/super-productivity/commit/040aa86695efd5b7929a90b3281fcb3a032f3171))
- **takeABreak:** don't show fullscreen when counter is reset ([0d06c83](https://github.com/johannesjo/super-productivity/commit/0d06c83f26bbeed93f74ef101d84f018f07c5bf4))
- task move up/down shortcut not always working as expected ([13c03b1](https://github.com/johannesjo/super-productivity/commit/13c03b1ddf6a1e00f78d401f009d6544b466dd15))

### Features

- add configurable break reminder sound ([bdab131](https://github.com/johannesjo/super-productivity/commit/bdab131141b9c4b76a20f52f826cfd2dc0b119a2))
- auto add today tag also when marking tasks as done ([a2d8811](https://github.com/johannesjo/super-productivity/commit/a2d8811c3349b9b0de4caef8be3c3fdda7f2fd7c))
- **disableBacklog:** add simple setting ([98dd7c9](https://github.com/johannesjo/super-productivity/commit/98dd7c99665d46d750a94390db1c927e43da348b))
- **disableBacklog:** copy over all backlog tasks to today list if disable is set ([d6708d8](https://github.com/johannesjo/super-productivity/commit/d6708d8d18e6cc34af5da4b07c78f4af205a9ed2))
- **disableBacklog:** prevent adding new tasks to backlog ([2e77783](https://github.com/johannesjo/super-productivity/commit/2e777837637a5b86b62db441712217fd7a1b1899))
- do not mark repeatable tasks as done when creating new instances ([cbc0ff4](https://github.com/johannesjo/super-productivity/commit/cbc0ff4c35cdbd0ef487da83e10f64580d07594b))
- **dominaMode:** add migration ([2695fff](https://github.com/johannesjo/super-productivity/commit/2695fffb1efe4f2066b0462a099a4a60b9a04ba7))
- **dominaMode:** add translations ([89d57a9](https://github.com/johannesjo/super-productivity/commit/89d57a9c545a3acea8e21bdcd0fc26ad21adc295))
- **dominaMode:** don't show for snap release ([e7ed4e6](https://github.com/johannesjo/super-productivity/commit/e7ed4e694df23b46765916323b783525c852313b))
- **dominaMode:** make feature configurable ([8e9151a](https://github.com/johannesjo/super-productivity/commit/8e9151a812cc17a7cdf23a6fb91c570b996684e2))
- **dominaMode:** outline feature and make basics work ([d93c15d](https://github.com/johannesjo/super-productivity/commit/d93c15dc95add42c8cf88a8117271263ecd521cd))
- **i18n:** add missing translations for new input ([2981371](https://github.com/johannesjo/super-productivity/commit/2981371adb82f458cdda3485dc67f6cb7f488313))
- only show move to backlog button when a tasks project has backlog enabled ([1e2ea3b](https://github.com/johannesjo/super-productivity/commit/1e2ea3b99610e15808d6b8d79d121aca4e8a8d95))
- **procrastination:** add info about procrastination triggers ([9efed16](https://github.com/johannesjo/super-productivity/commit/9efed167a9d2b89be4f2389d1b58fec39a68732e))
- remove backlog count from menu for projects without one ([6c9c1fe](https://github.com/johannesjo/super-productivity/commit/6c9c1fea0f2f1278baa75ed7dbfb4d9c3ef4c6ce))
- reverse project backlog setting from disabled to enabled ([a51f850](https://github.com/johannesjo/super-productivity/commit/a51f85009557b5895c0c080a2e4db388e7cbe3e8))
- set default syncfile path for webdav [#2334](https://github.com/johannesjo/super-productivity/issues/2334) ([db603d5](https://github.com/johannesjo/super-productivity/commit/db603d5d95212c6af35f9c0780c4f21f25d4199f))
- show badge with created for past instances of repeatable task ([08ec744](https://github.com/johannesjo/super-productivity/commit/08ec744e6e8cc6bbdb150750c2158a2f0e2dcf29))
- simplify done sound setting to single select ([43ccc36](https://github.com/johannesjo/super-productivity/commit/43ccc364b0b34037db76f1a56292369c15abd4cb))
- **takeABreak:** delay full screen blocker to give time after using long idle to task ([d2f39d2](https://github.com/johannesjo/super-productivity/commit/d2f39d26e25e48f17164b77a4a3d21f25f896e70))
- update procrstination info ([a619d7b](https://github.com/johannesjo/super-productivity/commit/a619d7bb035c8a6f5905534a4bc85f252faf6892))
- update working to reflect that not every project has a backlog anymore ([257ac11](https://github.com/johannesjo/super-productivity/commit/257ac116bc4421b70963fcd95321ee46900df056))

## [7.13.2](https://github.com/johannesjo/super-productivity/compare/v7.13.1...v7.13.2) (2023-04-14)

### Bug Fixes

- buttons not being centered ([96920a9](https://github.com/johannesjo/super-productivity/commit/96920a97596ce9367229994be081409d14617f19))
- **dropbox:** avoid updating last active when updating token from refresh token to avoid initial sync conflict ([21971bd](https://github.com/johannesjo/super-productivity/commit/21971bddaa6549bd4f031ba634490f26d8885cc4))
- **github:** load all button cut off text ([71d87ba](https://github.com/johannesjo/super-productivity/commit/71d87ba6872e27fb807ff283e25ed9663ae14783))
- **i18n:** some fixes for russian translate ([899ac12](https://github.com/johannesjo/super-productivity/commit/899ac12ab687baf71d5558411590f6ec30b4d0bb))
- remove custom date parsers since not working and unit tests are failing ([12a385e](https://github.com/johannesjo/super-productivity/commit/12a385e27bec9fbb095c570a9b076b25f90b7355))
- remove sidebar transition to avoid problem [#2533](https://github.com/johannesjo/super-productivity/issues/2533) ([c9db586](https://github.com/johannesjo/super-productivity/commit/c9db58610f4818d7468ddd546031a89691cec67f))

### Features

- **procrastination:** add info about procrastination triggers ([9efed16](https://github.com/johannesjo/super-productivity/commit/9efed167a9d2b89be4f2389d1b58fec39a68732e))
- **takeABreak:** delay full screen blocker to give time after using long idle to task ([d2f39d2](https://github.com/johannesjo/super-productivity/commit/d2f39d26e25e48f17164b77a4a3d21f25f896e70))

## [7.13.1](https://github.com/johannesjo/super-productivity/compare/v7.13.0...v7.13.1) (2023-03-06)

# [7.13.0](https://github.com/johannesjo/super-productivity/compare/v7.12.2...v7.13.0) (2023-03-06)

### Bug Fixes

- rounding for archive tasks throws error [#2463](https://github.com/johannesjo/super-productivity/issues/2463) ([f9568f4](https://github.com/johannesjo/super-productivity/commit/f9568f4d90df3c7af1810d44fcb9bb2bfe0c106d))
- turkish language not working [#2468](https://github.com/johannesjo/super-productivity/issues/2468) ([eadf771](https://github.com/johannesjo/super-productivity/commit/eadf77195a10c4c2096ab3c8449667b7e7f4efc8))

### Features

- add custom date parser using Chrono ([65c33b8](https://github.com/johannesjo/super-productivity/commit/65c33b8b5a2497db27693d482b36ee50cc59f80a))
- add custom date parser using Chrono ([1a7d99b](https://github.com/johannesjo/super-productivity/commit/1a7d99b83e283f541c5beec862d6e5b468bc10b3))
- add function for parsing date from short syntax ([49ad6ca](https://github.com/johannesjo/super-productivity/commit/49ad6cad7258c3cd9aeb659c25236e769ad238a5))
- add function for parsing date from short syntax ([92ea60c](https://github.com/johannesjo/super-productivity/commit/92ea60cba676c6fadb230ad9d1b1079d44bd032c))
- add helpers for comparing dates ([fab768b](https://github.com/johannesjo/super-productivity/commit/fab768b0994222d30b4edae1f59d79f1ae883881))
- add helpers for comparing dates ([1417f1d](https://github.com/johannesjo/super-productivity/commit/1417f1ddf4d8fda48073b565e08540ed33f53cfd))
- add test for short syntax with time only ([32849ce](https://github.com/johannesjo/super-productivity/commit/32849ce187e64761c616e51092a4b0de3f8890fe))
- add test for short syntax with time only ([d3aebb5](https://github.com/johannesjo/super-productivity/commit/d3aebb5c0f18a4d8fb8d1aee9627e462f020ba13))
- change pattern matching for planned date syntax ([f473586](https://github.com/johannesjo/super-productivity/commit/f473586dd4092072f4fe55a3ce64a958db26fff1))
- change pattern matching for planned date syntax ([923575c](https://github.com/johannesjo/super-productivity/commit/923575c90f7b957959d92c7fb9de455578fbb230))
- display parsed scheduled date in user-friendly format ([c06e412](https://github.com/johannesjo/super-productivity/commit/c06e41271cf43385c596836ffb9d33373c95735d))
- display parsed scheduled date in user-friendly format ([410dbbe](https://github.com/johannesjo/super-productivity/commit/410dbbe9da675d35174fed0e7983aa81740e7cae))
- handle move to backlog for reminder different for scheduling for today and other days ([d0c62ff](https://github.com/johannesjo/super-productivity/commit/d0c62ff50a7d0c13503ace93fd6fbf81d28788bd))
- impliment [@media](https://github.com/media) for navbar ([f18012a](https://github.com/johannesjo/super-productivity/commit/f18012a1423fb99b3169b1426de740061cba95e6))
- improve repeat update instances wording for dialog ([50b757b](https://github.com/johannesjo/super-productivity/commit/50b757b1667757b48ab43c6dae8962ab04ec1d48))
- improve repeat update instances wording for dialog ([b2c95d7](https://github.com/johannesjo/super-productivity/commit/b2c95d7c711b75413f329ec16b1958a53cfae1ae))
- install chrono for date parsing ([1083a5c](https://github.com/johannesjo/super-productivity/commit/1083a5c3893859c682188622d06aaeda4054fcc2))
- install chrono for date parsing ([11e71e6](https://github.com/johannesjo/super-productivity/commit/11e71e6e0753a07e069e7d5e927f5ca47bfc2757))
- only parse date when preceded by @ ([0f92e30](https://github.com/johannesjo/super-productivity/commit/0f92e30793b9bbadd4ae711e0aad4c9483894c71))
- only parse date when preceded by @ ([48b48fc](https://github.com/johannesjo/super-productivity/commit/48b48fc5570a0d709b77c20507ccd1592a89ace8))
- parse scheduled date from new task input ([e98c0ab](https://github.com/johannesjo/super-productivity/commit/e98c0ab5b9c815b78b2472f3305393d026c89870))
- parse scheduled date from new task input ([dafec1e](https://github.com/johannesjo/super-productivity/commit/dafec1ebda9f1e542d30244144a5f017a05fdca5))
- set reminder for new task with short syntax for schedule ([2880719](https://github.com/johannesjo/super-productivity/commit/2880719212dc5dd8bc724a1e93a9453b94e24414))
- set reminder for new task with short syntax for schedule ([2a85932](https://github.com/johannesjo/super-productivity/commit/2a859321750481db9e407d3b803f2cb42202f84f))

## [7.12.2](https://github.com/johannesjo/super-productivity/compare/v7.12.1...v7.12.2) (2023-02-10)

### Bug Fixes

- **i18n:** update the portuguese translation ([890656c](https://github.com/johannesjo/super-productivity/commit/890656c3d136e54e967efc5aeaafd60fa64d8a4c))
- lint ([9a3de1e](https://github.com/johannesjo/super-productivity/commit/9a3de1e4adc3a36101427e37745fb496935431bb))
- lint ([2286607](https://github.com/johannesjo/super-productivity/commit/22866075e872fe241bb7bd85f93c9398f0e7beff))
- **note:** add missing save for action ([b47f73e](https://github.com/johannesjo/super-productivity/commit/b47f73e5222f7e6fb63dc4f610a1118376544aee))
- **note:** save for note list updates ([d2ccfc3](https://github.com/johannesjo/super-productivity/commit/d2ccfc3f8874623d98ea8b861f0fbb862ba4f2b3))
- short syntax edge case ([ec65fda](https://github.com/johannesjo/super-productivity/commit/ec65fda5217d9c849fec2e7230baf0ddf0efd92e))
- sync form throwing error for non android context ([9e1e9f9](https://github.com/johannesjo/super-productivity/commit/9e1e9f9da9270fca39a5af5d8b59a59d7edc40d0))
- time worked not including non-listed task on today view ([4a1d632](https://github.com/johannesjo/super-productivity/commit/4a1d6321a23f862e4db6c3b4254b90a65efbbf45))
- **timeline:** possible undefined case [#2429](https://github.com/johannesjo/super-productivity/issues/2429) ([227a93d](https://github.com/johannesjo/super-productivity/commit/227a93da99acc69c6ce4647181bdc0902e1b3a40))
- working today not calculated correctly for sub tasks ([15430e7](https://github.com/johannesjo/super-productivity/commit/15430e73ef1abc7ed32eed69f9c0b5f924fa6a90))

### Features

- add default syncFilePath for local file sync [#2334](https://github.com/johannesjo/super-productivity/issues/2334) ([c636647](https://github.com/johannesjo/super-productivity/commit/c63664737a71b4e55b1113c6697749ca6921b7cc))
- **github:** only show last comment and collapse description if there are many comments ([4c60644](https://github.com/johannesjo/super-productivity/commit/4c60644cb81df86b557e7e05db1da0705e597aed))
- **note:** allow assigning different projects to notes ([ce589a9](https://github.com/johannesjo/super-productivity/commit/ce589a9c85f51fd331ca3527de62b9c729ab2549))
- remove google drive sync :( ([e68f23e](https://github.com/johannesjo/super-productivity/commit/e68f23e6c6e46bcf6f52280178d4bf1cda4d4785))
- show allowedFolderPath to user [#2001](https://github.com/johannesjo/super-productivity/issues/2001) ([1814dc7](https://github.com/johannesjo/super-productivity/commit/1814dc7d7a95646597111e620ab4a2c583b9f166))
- upgrade electron [#2355](https://github.com/johannesjo/super-productivity/issues/2355) ([c54b26f](https://github.com/johannesjo/super-productivity/commit/c54b26fe89a7789ef905662889bff522d4b1b2b7))

## [7.12.1](https://github.com/johannesjo/super-productivity/compare/v7.12.0...v7.12.1) (2023-01-11)

### Bug Fixes

- add missing translation for gitea ([1158a4b](https://github.com/johannesjo/super-productivity/commit/1158a4b6f7ac6b01cff16581758cda155de7cb3d))
- button styling inside dialogs being weird ([270d3d4](https://github.com/johannesjo/super-productivity/commit/270d3d4223db99d0356f0ceeee631d8be9945b31))
- **fullScreenBlocker:** error when window is manually closed ([fb62dd1](https://github.com/johannesjo/super-productivity/commit/fb62dd1d23458f137edb389750e32b69fa997e9f))
- **fullScreenBlocker:** overlay not copied for build ([ff5413c](https://github.com/johannesjo/super-productivity/commit/ff5413c16c43750ecef235d1ae2f8391243cb285))
- gitlab integration ([76bb650](https://github.com/johannesjo/super-productivity/commit/76bb65094cb94f15e3e87f3b8bf940d483f3ac4e))
- **i18n:** update chinese translation ([615c8ad](https://github.com/johannesjo/super-productivity/commit/615c8ad1d949bff69ed4b47a95a51968775d2594))
- **i18n:** update chinese translation ([91181cc](https://github.com/johannesjo/super-productivity/commit/91181cc49f918780d3274288b637cf8ccd658510))
- **i18n:** update spanish translations ([0030532](https://github.com/johannesjo/super-productivity/commit/0030532e089084ffece30a88fe8752d1c73e9b20))
- improve jira form button alignment with [#2301](https://github.com/johannesjo/super-productivity/issues/2301) ([036b344](https://github.com/johannesjo/super-productivity/commit/036b344e4fddbb1016a435f265417a8ca6544f33))
- **jira setup:** jira form button styling enhancement [#2301](https://github.com/johannesjo/super-productivity/issues/2301) ([5d3f18a](https://github.com/johannesjo/super-productivity/commit/5d3f18a03e18c88e275b7f7d32ef55ba097f0f28))
- make debugging electron work again ([b385a35](https://github.com/johannesjo/super-productivity/commit/b385a35ac73d81aaa1e79dc8ad8c6088b2c09130))
- map gitlab issue id ([d6aabfe](https://github.com/johannesjo/super-productivity/commit/d6aabfe37ec5a8d766776b0362c2cb3beef973e4))
- **markdown renderer:** quotes & lists display issue ([8a98c30](https://github.com/johannesjo/super-productivity/commit/8a98c3083452da12f76fb994abbfdbb19d9f56f9))
- possible range error [#463](https://github.com/johannesjo/super-productivity/issues/463) ([5eb01d7](https://github.com/johannesjo/super-productivity/commit/5eb01d7b41ac69777ed768db1db3d839e5805a39))
- potential weird race condition [#2371](https://github.com/johannesjo/super-productivity/issues/2371) ([44c0189](https://github.com/johannesjo/super-productivity/commit/44c01891c04907de397e801c03c768ed3ad25be1))
- type ([0dce0a9](https://github.com/johannesjo/super-productivity/commit/0dce0a9e4a25cd24ff288ce503bcc7962c144a29))
- Update Polish GitLab translations ([d5bc2da](https://github.com/johannesjo/super-productivity/commit/d5bc2da5a313c8bfa82f7e924bde55501db1d902))
- Update Polish translations ([4f45e8e](https://github.com/johannesjo/super-productivity/commit/4f45e8e895628b82442b5bdc0879a82855be06a2))

### Features

- add link to explain ical for google calendar ([361a951](https://github.com/johannesjo/super-productivity/commit/361a9510fe7291c53979eac4ed43280bbc214149))
- **docs:** add shortcut for adding task to bottom ([285eba6](https://github.com/johannesjo/super-productivity/commit/285eba6bdb0a81116eb1b9b1e2efc0a4554b2eba))
- **fullScreenBlocker:** add config ([9f6add0](https://github.com/johannesjo/super-productivity/commit/9f6add0d50df1f6bacf90a74c246853b47798652))
- **fullScreenBlocker:** adjust default duration ([2ce18d4](https://github.com/johannesjo/super-productivity/commit/2ce18d4fd59fb814383bbf398f323634391fcc19))
- **fullScreenBlocker:** improve window and animation ([c4ccae6](https://github.com/johannesjo/super-productivity/commit/c4ccae6921b4de8fba531c9c6d5cc1a5c815e2f6))
- **fullScreenBlocker:** make basic blocker work ([4b92a3f](https://github.com/johannesjo/super-productivity/commit/4b92a3f9ee931635023cf2e7c1d65504924871b4))
- **fullScreenBlocker:** make seconds work for duration ([3d07ede](https://github.com/johannesjo/super-productivity/commit/3d07ede77e00ba5e568787b8e5f14590279d5b03))
- **fullScreenBlocker:** update model version to set default values ([7b91db7](https://github.com/johannesjo/super-productivity/commit/7b91db768892ea2c1737cc964f67e6271f576869))
- **google:** add warning for google drive sync [#2306](https://github.com/johannesjo/super-productivity/issues/2306) ([81db419](https://github.com/johannesjo/super-productivity/commit/81db4197eb25ab5193e38a47a637133fb0a96109))
- **i18n:** add indonesian as language ([5db6969](https://github.com/johannesjo/super-productivity/commit/5db696982d3cc0ae08ceaf525676518334e77120))
- improve repeat update instances wording for dialog ([f652ad9](https://github.com/johannesjo/super-productivity/commit/f652ad9f2b6bc6211faaccd3e08b4459f1ba44c5))
- **jira:** always use original image if available rather than thumb ([e717a9b](https://github.com/johannesjo/super-productivity/commit/e717a9b0f0640b3fd01e12c9d286d81b863ed2c3))
- make repeat formly type more flexible ([71668e2](https://github.com/johannesjo/super-productivity/commit/71668e282809637a1883053a680d51ea61b10368))
- **takeABreak:** add translations ([49e9236](https://github.com/johannesjo/super-productivity/commit/49e9236c7b7cf1ccd32da40784d8ba70de2b852d))
- **takeABreak:** downgrade formly and make it work ([f9a6188](https://github.com/johannesjo/super-productivity/commit/f9a6188bd33e3157e2b593840121532f1c94e878))
- **takeABreak:** prepare multiple images and rotation ([fb7eec5](https://github.com/johannesjo/super-productivity/commit/fb7eec5cc5b2e9022ba5b5d7ca5a7e3262c376d0))
- **takeABreak:** prevent closing of overlay ([d6b2f28](https://github.com/johannesjo/super-productivity/commit/d6b2f28da75b86afda33ced9b61d84301726b030))
- **takeABreak:** prevent quick closing via keyboard shortcut ([43020ff](https://github.com/johannesjo/super-productivity/commit/43020ffd9b804a025b22faffd8243fcd246671f0))
- update ngx formly ([0130933](https://github.com/johannesjo/super-productivity/commit/0130933bc06846caf6ddcdcc6d3ff4e9fde05c81))

# [7.12.0](https://github.com/johannesjo/super-productivity/compare/v7.11.6...v7.12.0) (2022-09-02)

### Reverts

- Revert "Delete package-lock.json" ([b5101fb](https://github.com/johannesjo/super-productivity/commit/b5101fb7519ab9a8a051a9a6c7472a414baeb417))

## [7.11.6](https://github.com/johannesjo/super-productivity/compare/v7.11.5...v7.11.6) (2022-08-26)

### Bug Fixes

- add missing tranlation on Jira integration; Fix portuguese translation ([e1d1080](https://github.com/johannesjo/super-productivity/commit/e1d10803a4e3f287dcab5e6661e93d2db39726a3))
- add missing tranlation on Jira integration; Fix portuguese translation ([d88800a](https://github.com/johannesjo/super-productivity/commit/d88800a61d3e0eadb131b51db180e99a9644a103))
- change gitlab icon to a transparent one ([4b9bc81](https://github.com/johannesjo/super-productivity/commit/4b9bc81f043019c45de734fa547b60d704c439d2))
- change spin direction ([a09162d](https://github.com/johannesjo/super-productivity/commit/a09162db457226c1cff2088f2b442d2a3c58e46c))
- height for task schedule buttons ([eed8542](https://github.com/johannesjo/super-productivity/commit/eed8542e9941c507cfb5588359b7578bd3b6aeb0))
- Hide archived projects from Add To Project context menu [#2077](https://github.com/johannesjo/super-productivity/issues/2077) ([974f962](https://github.com/johannesjo/super-productivity/commit/974f962c28ff0a3c14aa38616d7406883c610e05))
- icon position for attachment buttons ([ba2e57f](https://github.com/johannesjo/super-productivity/commit/ba2e57f9f42f41194d37ce9d33f6d995be3a1831))
- lint ([0467df8](https://github.com/johannesjo/super-productivity/commit/0467df86f7eaa9657cf864455ccc4775159cf7c1))
- move notes sidebar to left when rtl ([aa4abd2](https://github.com/johannesjo/super-productivity/commit/aa4abd2a4036509933dad1e745974cf3dc9351e5))
- problem with empty project configuration with number [#2066](https://github.com/johannesjo/super-productivity/issues/2066) ([fe7e37a](https://github.com/johannesjo/super-productivity/commit/fe7e37a1776d4be2dcc028491f74c59bc7883dcf))
- remove tray icon tooltip [#2032](https://github.com/johannesjo/super-productivity/issues/2032) ([db1ade9](https://github.com/johannesjo/super-productivity/commit/db1ade9023a44cd55c6d4ed78effc034cc76b14d))
- wrong android interface check ([98f521d](https://github.com/johannesjo/super-productivity/commit/98f521dcef3c2fb29f1ed252838cdf68034c9979))

### Features

- add styling for task completed date ([1f3ed44](https://github.com/johannesjo/super-productivity/commit/1f3ed44d4dd480037cb45d34eef62cc77cf9ec9f))
- add task's completed date to Additional Info panel ([5aec41f](https://github.com/johannesjo/super-productivity/commit/5aec41fd2298dfc00c32793002de9c630cd48202))
- disable backgroundThrottling [#2028](https://github.com/johannesjo/super-productivity/issues/2028) ([4425fb3](https://github.com/johannesjo/super-productivity/commit/4425fb3f1d4d6897cfcb443c3bcdad6be0aa273f))
- manually start next pomodoro break [#333](https://github.com/johannesjo/super-productivity/issues/333) ([da92c88](https://github.com/johannesjo/super-productivity/commit/da92c88e43e9347bc39f3ee4c52d5ed0139eccb4))
- manually start next pomodoro break [#333](https://github.com/johannesjo/super-productivity/issues/333) (Review changes) ([40c5f77](https://github.com/johannesjo/super-productivity/commit/40c5f772fad42278f7b3491ee3cb609fc9996b9d))
- only add done date if it exists ([6dd4f77](https://github.com/johannesjo/super-productivity/commit/6dd4f77d3e61ccff22443973b5f8e3283cd3335a))
- respect first day of week in reports ([4bb3c53](https://github.com/johannesjo/super-productivity/commit/4bb3c53c537de63e95290d52b6b6ae4c110f5e64))
- shorten task autocompletion for smaller screens [#2031](https://github.com/johannesjo/super-productivity/issues/2031) ([5177a3b](https://github.com/johannesjo/super-productivity/commit/5177a3bf66642310002bd17086489c549a95cf84))
- use new fullscreen note edit dialog everywhere ([83c373a](https://github.com/johannesjo/super-productivity/commit/83c373aa64f7963ed4deb9af459fdf2ea82ee08e))

### Reverts

- Revert "build(deps): bump electron-log from 4.4.1 to 4.4.8" ([5694117](https://github.com/johannesjo/super-productivity/commit/5694117f094653c7e1595b89db02eaa05ebd504a))

## [7.11.5](https://github.com/johannesjo/super-productivity/compare/v7.11.4...v7.11.5) (2022-04-22)

## [7.11.4](https://github.com/johannesjo/super-productivity/compare/v7.11.3...v7.11.4) (2022-04-22)

## [7.11.3](https://github.com/johannesjo/super-productivity/compare/v7.11.2...v7.11.3) (2022-04-22)

### Bug Fixes

- add minHeight and minWidth for window to fix mac store issue ([e3fbd03](https://github.com/johannesjo/super-productivity/commit/e3fbd035cb0bfbebc52e2ebd3166326077cf3ff1))
- adjust margin to center sub-task toggle [#1975](https://github.com/johannesjo/super-productivity/issues/1975) ([fede2bb](https://github.com/johannesjo/super-productivity/commit/fede2bbbbe6dafd2634d3ffb06d9c512b5ff84a3))
- change btns to flex to center on android[#1975](https://github.com/johannesjo/super-productivity/issues/1975) ([a6fc825](https://github.com/johannesjo/super-productivity/commit/a6fc825e4a6661369e46d6adde51860c4f3abdfe))

### Features

- add min width for time tracking reminder dialog ([d44367a](https://github.com/johannesjo/super-productivity/commit/d44367a9992eeed87129fd70ec6342c42506c232))
- add scope to openproject integration with the number [#1989](https://github.com/johannesjo/super-productivity/issues/1989) ([1469206](https://github.com/johannesjo/super-productivity/commit/1469206c042ada1c491e522e88082c4d4b9f3e86))
- improve error handling for file imex [#2019](https://github.com/johannesjo/super-productivity/issues/2019) ([8a6a338](https://github.com/johannesjo/super-productivity/commit/8a6a3387f455415118c4dd1b4d96861b86166744))
- improve performance ([12dc9af](https://github.com/johannesjo/super-productivity/commit/12dc9af880180f5acca2eb58f3644f16dd5d40b3))
- **perf:** close sub ([86f8597](https://github.com/johannesjo/super-productivity/commit/86f859773b0d793a96b2e99677f81fdf13580f00))
- **perf:** minor optimization for tag-list component ([6a7dc6b](https://github.com/johannesjo/super-productivity/commit/6a7dc6b2058b509f083a16d05ac84dc243b7040f))
- **perf:** minor optimization for task component ([be38653](https://github.com/johannesjo/super-productivity/commit/be3865301c8c63c51d194af73be342719b4b6993))
- **perf:** minor simplification ([6ce4c72](https://github.com/johannesjo/super-productivity/commit/6ce4c72caaec2e4dd931d1b1fc6a1c8eed2bde45))
- **perf:** simplify distinctUntilChanged ([0d8ad71](https://github.com/johannesjo/super-productivity/commit/0d8ad7123928af5f3007d13d2b0203504d9ccfaa))
- **perf:** simplify distinctUntilChanged check ([01befbb](https://github.com/johannesjo/super-productivity/commit/01befbb07dc8cb49f70368c31cf48ed6015beb89))
- **perf:** use less data ([d7edddc](https://github.com/johannesjo/super-productivity/commit/d7edddc1739c0b8bf8339b48d3b59e48eb78dbc2))

## [7.11.2](https://github.com/johannesjo/super-productivity/compare/v7.11.1...v7.11.2) (2022-03-30)

### Bug Fixes

- migrate legacy placeholder to mat-label [#1985](https://github.com/johannesjo/super-productivity/issues/1985) ([6c72090](https://github.com/johannesjo/super-productivity/commit/6c7209029bdfef19c9c271a7a9b9c62dd6d3ac8e))

## [7.11.1](https://github.com/johannesjo/super-productivity/compare/v7.11.0...v7.11.1) (2022-03-30)

# [7.11.0](https://github.com/johannesjo/super-productivity/compare/v7.10.1...v7.11.0) (2022-03-30)

### Bug Fixes

- better ipc not working anymore ([d1c86bc](https://github.com/johannesjo/super-productivity/commit/d1c86bc63964809c18203770224e503f8d56781b))
- cannot focus el error for additional info panel [#1963](https://github.com/johannesjo/super-productivity/issues/1963) ([adb9602](https://github.com/johannesjo/super-productivity/commit/adb960240be022ef2a2beaa180aeddb72c4b87f8))
- do cross model migrations first, as they're never executed otherwise [#1884](https://github.com/johannesjo/super-productivity/issues/1884) ([9343d30](https://github.com/johannesjo/super-productivity/commit/9343d30fc1ce48c1cfcd59573889714ebca93672))
- **electron:** error for opening dev tools ([1f9fd92](https://github.com/johannesjo/super-productivity/commit/1f9fd92c39dce1e2d5688b1cc9da408b1defc3e3))
- **idle:** task data not always being ready in time ([af1e41a](https://github.com/johannesjo/super-productivity/commit/af1e41ada3e630c290eacb32b9246708bc88fbda))
- invalid remind option being selected when remind option would lead to a reminder in the past [#1938](https://github.com/johannesjo/super-productivity/issues/1938) ([e19525e](https://github.com/johannesjo/super-productivity/commit/e19525e4c8340c1e0143d75a53e804200ca09cfe))
- lint ([d3d9c78](https://github.com/johannesjo/super-productivity/commit/d3d9c78292dd4c4338fefcbfae68dc4af78b26ac))
- lint errors ([1a34e90](https://github.com/johannesjo/super-productivity/commit/1a34e9049ca46d98589a8acf9697020fa4f4729a))
- missing type ([7c562b3](https://github.com/johannesjo/super-productivity/commit/7c562b327b2bc30481f8fca163766f98efb0b428))
- **note:** also update preview view for note when data is changed ([0f46298](https://github.com/johannesjo/super-productivity/commit/0f4629821ee4f6e935a0896a11f1bd5624160752))
- **note:** empty note height ([3b7b4b1](https://github.com/johannesjo/super-productivity/commit/3b7b4b1370b954277c27d7cc7e25eb621d09d39b))
- **note:** markdown preview not being scrollable ([512415a](https://github.com/johannesjo/super-productivity/commit/512415ad0b9f583eadeff36564eff5db791dbd05))
- possible multiple reminders for the same task [#1938](https://github.com/johannesjo/super-productivity/issues/1938) ([bbde3f9](https://github.com/johannesjo/super-productivity/commit/bbde3f9a282e0f2919946c2f69bcd876d33e32e0))
- **quickHistory:** wrong week order for first of year ([c9bd8f6](https://github.com/johannesjo/super-productivity/commit/c9bd8f6e037c029f380159d31744b6e7ecf1f4db))
- **reminder:** only remove task from list if time was actually edited [#1938](https://github.com/johannesjo/super-productivity/issues/1938) ([24a74b0](https://github.com/johannesjo/super-productivity/commit/24a74b08d9c17e6df5b0aff718d11e8e5e8b4930))
- replace slovenian with slovak ([18b8939](https://github.com/johannesjo/super-productivity/commit/18b8939c241701dfc43a15d237abe2dcb7927111))
- simple counters not appearing sometimes ([49de5cc](https://github.com/johannesjo/super-productivity/commit/49de5cce7e14ee9a931d854af65d60088de72d53))
- simple counters not updating on day change ([c0253db](https://github.com/johannesjo/super-productivity/commit/c0253dbc6bf2600de9304098f59eac3d59b3ee7a))
- **simpleCounter:** buttons not updating on day change ([53c771a](https://github.com/johannesjo/super-productivity/commit/53c771a74e9897832b65eaeb3fed818b2219c4d0))
- **simpleCounter:** not switching to next days value at 0:00 ([dab5d7e](https://github.com/johannesjo/super-productivity/commit/dab5d7e834cc6fb3f6910b051f641b70e885c309))
- **sync:** dropbox not working anymore ([6b4dab0](https://github.com/johannesjo/super-productivity/commit/6b4dab0fb130874ea66b9890937b5e68febf3573))
- **task:** error when trying to move issue task ([6c3358b](https://github.com/johannesjo/super-productivity/commit/6c3358b6e1d097e7fe65f2551af63c9cd3fb6532))
- update model version to fix remaining broken invalid clock string configs [#1907](https://github.com/johannesjo/super-productivity/issues/1907) ([b63c65c](https://github.com/johannesjo/super-productivity/commit/b63c65ca11a12df5ebcda09d9474cb66afe03c8a))
- wrong query-string import ([c5ff5fb](https://github.com/johannesjo/super-productivity/commit/c5ff5fb6f4e34f15ef2e5e01df6075e51109bc17))

### Features

- add info graph for procrastination ([b28de4d](https://github.com/johannesjo/super-productivity/commit/b28de4dd09e3aadbc5711106650c9fd565a99c61))
- add my own quote about complex problems :) ([fc89976](https://github.com/johannesjo/super-productivity/commit/fc899761fd06bd0414593c322e7dc9555a28eb20))
- add random project colors ([a157d6a](https://github.com/johannesjo/super-productivity/commit/a157d6a6e77a3e0332c0bc1821b3d5c572d47c44))
- **android:** throw error in case interface couldn't be established ([7608b83](https://github.com/johannesjo/super-productivity/commit/7608b8337e18f9f6796bcd2081244bf287092670))
- **dropbox:** add get refresh token stuff ([524f5b3](https://github.com/johannesjo/super-productivity/commit/524f5b3655a4f4ea961090b42aebcce1c79d4dfd))
- **dropbox:** make auto refreshing token work ([4eef921](https://github.com/johannesjo/super-productivity/commit/4eef92186b8557340953039f786b62c66e284ec1))
- **i18n:** add slovenian as language ([e96d5cc](https://github.com/johannesjo/super-productivity/commit/e96d5cc23ad264bef6181ee138658365df9e2f22))
- improve note view mode handling for mobile ([3163950](https://github.com/johannesjo/super-productivity/commit/3163950630728018f38c427523139dd0d2375962))
- improve wording [#1938](https://github.com/johannesjo/super-productivity/issues/1938) ([f02958f](https://github.com/johannesjo/super-productivity/commit/f02958fcd4de5179de45d184ca1be503ea1e074f))
- **notes:** add tooltips for view mode [#1908](https://github.com/johannesjo/super-productivity/issues/1908) ([1a512ac](https://github.com/johannesjo/super-productivity/commit/1a512acfef9641a7da69a2c2b92bd8a0d2dc398b))
- **notes:** adjust note preview [#1908](https://github.com/johannesjo/super-productivity/issues/1908) ([18b1916](https://github.com/johannesjo/super-productivity/commit/18b19165a696e63664af4f2913f8d243640aba32))
- **notes:** allow editing image notes [#1908](https://github.com/johannesjo/super-productivity/issues/1908) ([76402ab](https://github.com/johannesjo/super-productivity/commit/76402ab110afd11379dc603a2a24efe2accd3426))
- **notes:** always open full screen edit [#1908](https://github.com/johannesjo/super-productivity/issues/1908) ([f0cea41](https://github.com/johannesjo/super-productivity/commit/f0cea41323a158a0f3eb5294b15f728fb0200d67))
- **notes:** make basic split view work [#1908](https://github.com/johannesjo/super-productivity/issues/1908) ([e19f9be](https://github.com/johannesjo/super-productivity/commit/e19f9bede980a5153cc5667b884466eedb4592ec))
- **notes:** remember last view mode for fullscreen edit [#1908](https://github.com/johannesjo/super-productivity/issues/1908) ([8b921db](https://github.com/johannesjo/super-productivity/commit/8b921dba474264d754d4ab8275bef206cd220dde))
- **notes:** use toggle button for switching view mode [#1908](https://github.com/johannesjo/super-productivity/issues/1908) ([6668e62](https://github.com/johannesjo/super-productivity/commit/6668e622ea6ba2d1a34fd1f0dad5cc734f8b7f00))
- **note:** test "sms preview" approach for long notes [#1908](https://github.com/johannesjo/super-productivity/issues/1908) ([46782f3](https://github.com/johannesjo/super-productivity/commit/46782f3ede5b94b40c32e59468a46628237153e0))
- prevent focus of side panel when not open ([5cf746d](https://github.com/johannesjo/super-productivity/commit/5cf746dcd7def5a9b7be472369454b5aef58c13c))
- reduce throttle time for take a break notification ([1685ebc](https://github.com/johannesjo/super-productivity/commit/1685ebc142e8bc77d822251611e8ad2c38d6a320))
- **reminder:** handle error case more gracefully [#1914](https://github.com/johannesjo/super-productivity/issues/1914) ([2f5ac1f](https://github.com/johannesjo/super-productivity/commit/2f5ac1f5b24686e767000be0deda8bc579a67b58))
- **schedule:** save last move to backlog value separately for edit and create ([8436227](https://github.com/johannesjo/super-productivity/commit/8436227bb2926c039381b0b927acd3fc2ee93d4f))
- show note bottom controls always on mobile ([523f92a](https://github.com/johannesjo/super-productivity/commit/523f92a31620b2e4e76f31e0706eb0d68d7633da))
- **sync:** add migration ([a41d2be](https://github.com/johannesjo/super-productivity/commit/a41d2be0c2cb352fef5900ff969ee58c84e79df2))
- **sync:** allow to enable/disable compression ([a94499f](https://github.com/johannesjo/super-productivity/commit/a94499f3ddb1a10a1b5ad5b755076ee27459d6af))
- **sync:** enable compression for all sync providers ([eace95a](https://github.com/johannesjo/super-productivity/commit/eace95ae28bf548b2b91702d4c5397ebb29a2dc8))
- **takeABreak:** improve notification ([a1be54c](https://github.com/johannesjo/super-productivity/commit/a1be54c1c9fa4ef012593b2ead3c06e5744505e4))
- **task:** add keyboard shortcut for move to backlog ([54c7433](https://github.com/johannesjo/super-productivity/commit/54c74338184e8424e6d419b2db69140265231783))
- **task:** update text for deleting repeated task instance [#1890](https://github.com/johannesjo/super-productivity/issues/1890) ([ec0469b](https://github.com/johannesjo/super-productivity/commit/ec0469b1c7e20976c2e78f615d1990993f141ec3))
- update elctron half way ([4ac214f](https://github.com/johannesjo/super-productivity/commit/4ac214ffc1683c84ace08c6486bbbfcfa2d7d51d))

## [7.10.1](https://github.com/johannesjo/super-productivity/compare/v7.10.0...v7.10.1) (2022-01-28)

### Bug Fixes

- missing locale for hr [#1872](https://github.com/johannesjo/super-productivity/issues/1872) ([dc7d068](https://github.com/johannesjo/super-productivity/commit/dc7d068c454756efac097ddc95f10c23f2b65859))
- **repeatTask:** quick settings not being saved as intended ([61b6bbe](https://github.com/johannesjo/super-productivity/commit/61b6bbe5b96d8887b8fa40c5bf8af4243136a30c))
- **taskRepeat:** validation not working for clock string [#1866](https://github.com/johannesjo/super-productivity/issues/1866) [#1867](https://github.com/johannesjo/super-productivity/issues/1867) [#1875](https://github.com/johannesjo/super-productivity/issues/1875) ([03e0820](https://github.com/johannesjo/super-productivity/commit/03e08208c8632d54716ab172af31439664a3dc2a))
- **taskRepeat:** wrong weekday displayed ([16cae68](https://github.com/johannesjo/super-productivity/commit/16cae6803cdb35d2d348b419a29c55888be30a9a))

### Features

- **jira:** add additional error logging [#1870](https://github.com/johannesjo/super-productivity/issues/1870) ([75241e4](https://github.com/johannesjo/super-productivity/commit/75241e49e8c45b8d79df4afe19478fe8588715ff))
- **repeatTask:** also show custom config when editing monthly ([d69e9d3](https://github.com/johannesjo/super-productivity/commit/d69e9d37bf082bcfb2525d3955665983edf8810f))
- **repeatTask:** show repeat on weekday and yearly on as custom when editing on another day ([fba8e10](https://github.com/johannesjo/super-productivity/commit/fba8e100b6c7b4fcbd8211da1afbebe9ae0219cc))
- **repeatTask:** unify labels for custom and quick settings ([84d4739](https://github.com/johannesjo/super-productivity/commit/84d473980cdab0401995dd53527d54c093b3082e))
- replace shortid by nanoid for better performance and stability ([5c925bf](https://github.com/johannesjo/super-productivity/commit/5c925bf5aed40e6753f3d73fd175b7d176191178))

# [7.10.0](https://github.com/johannesjo/super-productivity/compare/v7.9.2...v7.10.0) (2022-01-21)

### Bug Fixes

- "Error: Invalid project data" on task creation via shortsyntax when app is closed right after [#1849](https://github.com/johannesjo/super-productivity/issues/1849) ([3095fb4](https://github.com/johannesjo/super-productivity/commit/3095fb4f4aca03c8100687ff49bfe857e986b35e))
- allow to drag tasks into empty backlog [#1799](https://github.com/johannesjo/super-productivity/issues/1799) ([bc5a015](https://github.com/johannesjo/super-productivity/commit/bc5a015e96ae0d9454cc8d9041bc060fe7f1b046))
- also hide dialogs when data import is in progress ([30fdbfb](https://github.com/johannesjo/super-productivity/commit/30fdbfb90e824a3cdc94616f57159f6e45182c6f))
- code formatting and update t.const ([49d7675](https://github.com/johannesjo/super-productivity/commit/49d76758d66b83799e2e0f6ea263a03b3f44dadd))
- **dropbox:** sync not always working initially [#1800](https://github.com/johannesjo/super-productivity/issues/1800) ([4355a1f](https://github.com/johannesjo/super-productivity/commit/4355a1f65141ec55ae5924a0f5b5e2287a75e15e))
- empty sequence error ([eb9d3af](https://github.com/johannesjo/super-productivity/commit/eb9d3afd39ece799fe09622668c8fa8e9ccc6680))
- Hide github key in settings [#1605](https://github.com/johannesjo/super-productivity/issues/1605) ([6a3d1c5](https://github.com/johannesjo/super-productivity/commit/6a3d1c52e38f19f503877c3fd4a1d9717ba8554e))
- **i18n:** title today translate [#1813](https://github.com/johannesjo/super-productivity/issues/1813) ([4cd1992](https://github.com/johannesjo/super-productivity/commit/4cd1992cd0632ebee1b3d1001096d64d0e5d48ad))
- issue with hybrid devices such as microsoft surface [#704](https://github.com/johannesjo/super-productivity/issues/704) [#1765](https://github.com/johannesjo/super-productivity/issues/1765) [#1829](https://github.com/johannesjo/super-productivity/issues/1829) ([c099a4e](https://github.com/johannesjo/super-productivity/commit/c099a4ee9bfd72b65f88e4c827bae264b151c27c))
- make textarea input multiline [#1853](https://github.com/johannesjo/super-productivity/issues/1853) ([c837a77](https://github.com/johannesjo/super-productivity/commit/c837a77ffb9dcf7436207c32d41a2a7a900a5159))
- projects with missing jira config throwing errors [#1802](https://github.com/johannesjo/super-productivity/issues/1802) ([2bd4fa3](https://github.com/johannesjo/super-productivity/commit/2bd4fa3c70e2ad764a46ed4bb0f278265ece9362))
- **repeatTask:** error when just clicking on save ([b7b785d](https://github.com/johannesjo/super-productivity/commit/b7b785df566526e099c2f5efadc30a8cf0209816))
- **task:** focus after dropping an attachment ([d61970d](https://github.com/johannesjo/super-productivity/commit/d61970d487c924a594ab1157f3fdce1b3169e04c))
- **taskRepeat:** don't show update all confirm dialog when there are NO instances ([ffbbe82](https://github.com/johannesjo/super-productivity/commit/ffbbe82d893e9dc0a5f6789b6044209f7f08b12a))
- **timeline:** add workaround for missing dtend [#1814](https://github.com/johannesjo/super-productivity/issues/1814) ([ae7193b](https://github.com/johannesjo/super-productivity/commit/ae7193b7d58ee7611207d07be3b9d0fefc792852))
- **timeline:** also display repeat task projections when there are no tasks at all [#1839](https://github.com/johannesjo/super-productivity/issues/1839) ([9c33e46](https://github.com/johannesjo/super-productivity/commit/9c33e466b6258295e60693e4996a79f0d023f698))
- try to fix hybrid device issue [#1829](https://github.com/johannesjo/super-productivity/issues/1829) ([b8ce336](https://github.com/johannesjo/super-productivity/commit/b8ce336ec1281f6dfd9589831bc1599d9fc73906))
- **welcome:** dialog appearing multiple times ([7ef5984](https://github.com/johannesjo/super-productivity/commit/7ef5984a806140588a1834d6829572fd575ab9de))
- **welcome:** tabindex ([9853690](https://github.com/johannesjo/super-productivity/commit/985369018af79a357da18876a2ccd374ee50c656))

### Features

- add info about markdown [#1794](https://github.com/johannesjo/super-productivity/issues/1794) ([0a2241d](https://github.com/johannesjo/super-productivity/commit/0a2241dfee6afc2b44108ff7c810d5a45bde2290))
- add option that allows to disable most animations [#1620](https://github.com/johannesjo/super-productivity/issues/1620) ([60e1313](https://github.com/johannesjo/super-productivity/commit/60e131319aa6df9e54b1adc8cfd8c06f2c827a1c))
- add project tag to select task ([c22b100](https://github.com/johannesjo/super-productivity/commit/c22b10027727bbeab4a990d9dc919554a1a51328))
- **advancedRepeat:** add model and form ([2a9d8a2](https://github.com/johannesjo/super-productivity/commit/2a9d8a2f0498d71a1a17e8b43830a211fe6aab68))
- **advancedRepeat:** add translations and move out of collapsible for now ([edb060d](https://github.com/johannesjo/super-productivity/commit/edb060d1e6b447479dbb134cf078647939e72380))
- **advancedRepeat:** add ui ([66ff330](https://github.com/johannesjo/super-productivity/commit/66ff330bd74f930d8df2b1bbfb6c4ceee017bf75))
- **advancedRepeat:** make task repeat creation with notes work ([e68c641](https://github.com/johannesjo/super-productivity/commit/e68c641a28168cb834d142681e6f0927e7f90f94))
- **advancedRepeat:** make updating all instances work for notes ([ba17d04](https://github.com/johannesjo/super-productivity/commit/ba17d042e1af5e80b452abd0264f813d6c856b1b))
- also update reminder if task repeat cfg is updated ([b026bad](https://github.com/johannesjo/super-productivity/commit/b026bad569dd7a1f7001cad00295446c460aa60f))
- ask to move all repeatable instances to new project ([0b119a9](https://github.com/johannesjo/super-productivity/commit/0b119a949af5283f64816e3ad4c5c6b118bc8a5c))
- ask to update all previous instances if task repeat settings change ([61cfad0](https://github.com/johannesjo/super-productivity/commit/61cfad0c52ef975bf2c95a147e7b9592ea8ead67))
- cleanup reminders after deleting multiple tasks ([1bf2e90](https://github.com/johannesjo/super-productivity/commit/1bf2e90f8356174ece9ba897d7ec6426801908b8))
- disable notes button for routes where it can't be shown ([f69eacc](https://github.com/johannesjo/super-productivity/commit/f69eacc76aba4a57e73e5ead7981bd96a8699ef4))
- **i18n:** add croatian as language ([884c259](https://github.com/johannesjo/super-productivity/commit/884c25941188766e7e4cd478bc8ffd80b09123dc))
- make today translatable [#1813](https://github.com/johannesjo/super-productivity/issues/1813) ([0afb801](https://github.com/johannesjo/super-productivity/commit/0afb801d3e9b7c7f0795b92424077b2541ef271d))
- open update all instances dialog only if there are relevant changes ([4e4a291](https://github.com/johannesjo/super-productivity/commit/4e4a2910d411b7b64d1d7ff65f095a88e9b24b96))
- prevent moving repeatble tasks to other project via short syntax ([099629f](https://github.com/johannesjo/super-productivity/commit/099629f9a22904166eebefbbca4f0900ab381c1f))
- remove browser warning for firefox as it seems to run much better now ([87022e6](https://github.com/johannesjo/super-productivity/commit/87022e699a671ad6ce25535036a4e332e9a70ab1))
- **repeatTask:** add smarter migration ([edb4de7](https://github.com/johannesjo/super-productivity/commit/edb4de76a3ae7378cc3a693434627baacac2f223))
- **repeatTask:** add translations ([e7895eb](https://github.com/johannesjo/super-productivity/commit/e7895eb3a6849e9295baa94d516bcea0cdd4777f))
- **repeatTask:** allow editing config from scheduled page ([276a7e7](https://github.com/johannesjo/super-productivity/commit/276a7e76edc3e4d138e61107443b5487aedc972b))
- **repeatTask:** allow editing title from scheduled page ([af04d87](https://github.com/johannesjo/super-productivity/commit/af04d87d0b9992689c862a110864aa3e4591e31f))
- **repeatTask:** polish ui for scheduled page ([e805b01](https://github.com/johannesjo/super-productivity/commit/e805b01ea250c8b5cadb005a4e8d935cb36282da))
- **repeatTask:** prepare ui to show on scheduled page ([141414b](https://github.com/johannesjo/super-productivity/commit/141414b7e0cfa7deaf8486489dff473037120a26))
- **repeatTasks:** add additional info panel text for every X [#948](https://github.com/johannesjo/super-productivity/issues/948) ([0f69094](https://github.com/johannesjo/super-productivity/commit/0f690949a1ed1e7fc8edd60fec0ecddd6e96e0e3))
- **repeatTasks:** add dynamic labels for quick settings [#948](https://github.com/johannesjo/super-productivity/issues/948) ([49da9c2](https://github.com/johannesjo/super-productivity/commit/49da9c24fb07f99473f6d30252da4c84494d1f8b))
- **repeatTasks:** add migration script [#948](https://github.com/johannesjo/super-productivity/issues/948) ([d6c52a5](https://github.com/johannesjo/super-productivity/commit/d6c52a5d299647d25be49e54ca3bc7307402d4d5))
- **repeatTasks:** add quick settings [#948](https://github.com/johannesjo/super-productivity/issues/948) ([39c6584](https://github.com/johannesjo/super-productivity/commit/39c6584d3d374fc1132bd4e5c83180b1db6f7b6b))
- **repeatTasks:** additional info panel text work for custom settings [#948](https://github.com/johannesjo/super-productivity/issues/948) ([b3af25e](https://github.com/johannesjo/super-productivity/commit/b3af25e921ad3c2ed82b17601314f5bc41e72a02))
- **repeatTasks:** additional info panel text work for quick settings [#948](https://github.com/johannesjo/super-productivity/issues/948) ([10d156a](https://github.com/johannesjo/super-productivity/commit/10d156a5b826b77c83d3dcac558e642b85618ce8))
- **repeatTasks:** implement better order [#948](https://github.com/johannesjo/super-productivity/issues/948) ([e24be5c](https://github.com/johannesjo/super-productivity/commit/e24be5c58bdcd67e4a3d8651b6f3b32956b16dbc))
- **repeatTasks:** implement most basic dialog [#948](https://github.com/johannesjo/super-productivity/issues/948) ([28fed2e](https://github.com/johannesjo/super-productivity/commit/28fed2ed6fade30358e1140ed9d66f0a1c2076b3))
- **repeatTasks:** improve every x ui [#948](https://github.com/johannesjo/super-productivity/issues/948) ([f276ff0](https://github.com/johannesjo/super-productivity/commit/f276ff08ec39876efa99e0d10a389b39f1de07df))
- **repeatTasks:** make DAILY work for selector [#948](https://github.com/johannesjo/super-productivity/issues/948) ([ebcefea](https://github.com/johannesjo/super-productivity/commit/ebcefeaf07fc1f759189944c8b44c2d4070e99dc))
- **repeatTasks:** make DAILY work for timeline [#948](https://github.com/johannesjo/super-productivity/issues/948) ([4d4c646](https://github.com/johannesjo/super-productivity/commit/4d4c6463eefca056d5978f8486a62e0bee939962))
- **repeatTasks:** make every x weeks work [#948](https://github.com/johannesjo/super-productivity/issues/948) ([53d2161](https://github.com/johannesjo/super-productivity/commit/53d21617c3814188ed278f0c8a798b28d14076c9))
- **repeatTasks:** make MONTHLY work for selector [#948](https://github.com/johannesjo/super-productivity/issues/948) ([04ddb28](https://github.com/johannesjo/super-productivity/commit/04ddb28520ee41f2397c70581d0c93f42458dd73))
- **repeatTasks:** make quick settings work again with nested fields [#948](https://github.com/johannesjo/super-productivity/issues/948) ([054be49](https://github.com/johannesjo/super-productivity/commit/054be498959ae7c10f8f8e0fa3eb41e6f418804d))
- **repeatTasks:** make repeat every X days work [#948](https://github.com/johannesjo/super-productivity/issues/948) ([79e5a5c](https://github.com/johannesjo/super-productivity/commit/79e5a5cfe98a0cc77518449b5d6643f53fc43260))
- **repeatTasks:** make repeat every X edge cases work [#948](https://github.com/johannesjo/super-productivity/issues/948) ([7e0b495](https://github.com/johannesjo/super-productivity/commit/7e0b4955b73b2f428fe87003a881443ebfc716c5))
- **repeatTasks:** make YEARLY work for selector [#948](https://github.com/johannesjo/super-productivity/issues/948) ([b95d427](https://github.com/johannesjo/super-productivity/commit/b95d4275bf0ef6f001091045b34922573b58055f))
- **repeatTasks:** outline new model [#948](https://github.com/johannesjo/super-productivity/issues/948) ([8493272](https://github.com/johannesjo/super-productivity/commit/84932727c03300b6a7fd6d1cd983189bdbb40d70))
- **repeatTasks:** polish ui [#948](https://github.com/johannesjo/super-productivity/issues/948) ([d078ea0](https://github.com/johannesjo/super-productivity/commit/d078ea0600e4066a42ad689b8476f94656847855))
- **repeatTasks:** polish ui 2 [#948](https://github.com/johannesjo/super-productivity/issues/948) ([6d00425](https://github.com/johannesjo/super-productivity/commit/6d00425ca5ff1ddc36d8ab997cb6b99bfb25b401))
- show active context items first for when selcting tasks ([41a9d14](https://github.com/johannesjo/super-productivity/commit/41a9d1461fe2269a5c01af03c707e841052f7d78))
- **timeline:** make task repeat projections editable ([06c4870](https://github.com/johannesjo/super-productivity/commit/06c48701821c38b63f5f7c4dafa6c36fc4e55fd9))
- **welcome:** add dialog to greet new users ([27a4807](https://github.com/johannesjo/super-productivity/commit/27a480751adac2296f35245220ed5bf376ede690))
- **welcome:** add info for mobile users ([2092f21](https://github.com/johannesjo/super-productivity/commit/2092f2123f8e45dd00b7160b57ff21015471e203))
- **welcome:** add translations ([132f810](https://github.com/johannesjo/super-productivity/commit/132f810ea88a0592e34234cc6b7f771ea5aa8323))

## [7.9.2](https://github.com/johannesjo/super-productivity/compare/v7.9.1...v7.9.2) (2022-01-02)

### Bug Fixes

- avoid weird error case [#1779](https://github.com/johannesjo/super-productivity/issues/1779) ([a19b7f2](https://github.com/johannesjo/super-productivity/commit/a19b7f28db0a7914be5999da229fc4bfbe6f6612))
- broken cdav library ([6e04879](https://github.com/johannesjo/super-productivity/commit/6e04879dfa4553f274185e06fc01aadda896077e))
- drag handle for tags ([ea79f71](https://github.com/johannesjo/super-productivity/commit/ea79f71cff6ccf23fa7fcccfc72fce2013db20df))
- revert note fetch update ([a258731](https://github.com/johannesjo/super-productivity/commit/a25873124fc431a44da80cb35b0b741ff3544542))

## [7.9.1](https://github.com/johannesjo/super-productivity/compare/v7.9.0...v7.9.1) (2021-12-28)

### Bug Fixes

- **e2e:** problem ([ab5f8e3](https://github.com/johannesjo/super-productivity/commit/ab5f8e3589ab7d4347691707edbf63b81cac1d20))

### Features

- **idle:** add removing item to split dialog ([0a0aaa4](https://github.com/johannesjo/super-productivity/commit/0a0aaa41738bd74ada5e0085af2dafe9f9295209))

# [7.9.0](https://github.com/johannesjo/super-productivity/compare/v7.8.1...v7.9.0) (2021-12-28)

### Bug Fixes

- data repair not working [#1767](https://github.com/johannesjo/super-productivity/issues/1767) ([b662440](https://github.com/johannesjo/super-productivity/commit/b662440276bc343ee7fa048e2f7f2c87a138322c))
- date formatting dialog sync conflict ([75c0e4c](https://github.com/johannesjo/super-productivity/commit/75c0e4c3690901e3ed45b7c788127a94e44a9aba))
- error logging [#1767](https://github.com/johannesjo/super-productivity/issues/1767) ([ddbadfc](https://github.com/johannesjo/super-productivity/commit/ddbadfc2aae22779b25260ef6c53d7f476eda7c5))
- fonts not being cached by service worker ([6a22577](https://github.com/johannesjo/super-productivity/commit/6a22577f04ac70ff13a19c306b46a0523fac3cae))
- gracefully handle contend editable error for touch ([6277f90](https://github.com/johannesjo/super-productivity/commit/6277f904ca5ee4a61e5c0b716734c78c355af281))
- icons not working as they should ([cde7f00](https://github.com/johannesjo/super-productivity/commit/cde7f00c46d8c8fc8841517d8268fabbdca9297f))
- lint ([6aaf7d3](https://github.com/johannesjo/super-productivity/commit/6aaf7d31e03efa3ceb3a3390a48daac1018961ac))
- possible data inconsistencies when using the short syntax ([49c80b2](https://github.com/johannesjo/super-productivity/commit/49c80b2be4ea58b052fe74277ea0681aef9bb84d))
- wrong translation key ([6df9d3b](https://github.com/johannesjo/super-productivity/commit/6df9d3b9f5e32c0f207bce96565f87e08877b9dd))

### Features

- add database adapter for android ([99539d4](https://github.com/johannesjo/super-productivity/commit/99539d4ea0f5f0688efe24c73d0eed8f2fe1fd64))
- add external images to service worker caching [#876](https://github.com/johannesjo/super-productivity/issues/876) ([0a5b4aa](https://github.com/johannesjo/super-productivity/commit/0a5b4aab61b374087ec53f2c3715f0e7340b97b0))
- add initial focus to select task component ([e7931a3](https://github.com/johannesjo/super-productivity/commit/e7931a3af7376ec762f8bc8c6483fcd420ff3b4c))
- add max cap to attempts to get valid data ([cf7d7fc](https://github.com/johannesjo/super-productivity/commit/cf7d7fc9f6d3beb28596004f7dd8dad65660314a))
- add new icon names and icon name extraction script ([c259328](https://github.com/johannesjo/super-productivity/commit/c259328ea253fdfa35e722f5ffd1b2755ba9d3cc))
- add search bar icon to better distinguish from add task bar ([e3b74cd](https://github.com/johannesjo/super-productivity/commit/e3b74cdbeb4d2f4ebdc377379dcc765de01aebd2))
- add tooltip for save and go home ([b841ada](https://github.com/johannesjo/super-productivity/commit/b841ada87ddcace4e9c5cec4163ce3580f118cb6))
- allow for old and new api side by side ([fe0780a](https://github.com/johannesjo/super-productivity/commit/fe0780a87a653d434fffbf544fcb2e2288a05598))
- **android:** add add task button ([601dfd1](https://github.com/johannesjo/super-productivity/commit/601dfd12765376a9312faea50dec581d03988157))
- **android:** add basic message for sync ([8901155](https://github.com/johannesjo/super-productivity/commit/890115576a8ae67797554ea114bbe283b593a5cf))
- **android:** add notification for sync conflict ([0e2e197](https://github.com/johannesjo/super-productivity/commit/0e2e197ee697d79bc8f2cab140eaba7c7f30c61c))
- **android:** add tracked time to notification ([10e258c](https://github.com/johannesjo/super-productivity/commit/10e258c31ff79c4a51f0dc789c14fef82e16add1))
- **android:** add translations ([95aa2b8](https://github.com/johannesjo/super-productivity/commit/95aa2b8ee04e433ee7f2997787f746ced56da973))
- **android:** adjust default notification ([4da7116](https://github.com/johannesjo/super-productivity/commit/4da71167ee24ccefbdf0a34556194644a1b6c143))
- **android:** also sync in background ([d2ddfdb](https://github.com/johannesjo/super-productivity/commit/d2ddfdbeae92ff94016f77cc93275eec161e2f96))
- **android:** improve notifications ([73d7bd2](https://github.com/johannesjo/super-productivity/commit/73d7bd2070e060340cc5701e2b6a52301dcd87b6))
- **android:** improve sync trigger ([673df51](https://github.com/johannesjo/super-productivity/commit/673df51c1f59bfac09a2931898403f494437b131))
- **android:** make add task bar focus opening keyboard work more reliably ([6996b5a](https://github.com/johannesjo/super-productivity/commit/6996b5abd4c84fde37c80830ddc8040b15cab079))
- **android:** make new notification actions work ([6d7d028](https://github.com/johannesjo/super-productivity/commit/6d7d028ca5e2e7a52db6d7172b319556ae751de8))
- **android:** prepare notify interface ([6560f16](https://github.com/johannesjo/super-productivity/commit/6560f16ea4e49fa16b5619940fb182f09d7e4767))
- **android:** update notification interface ([67175bc](https://github.com/johannesjo/super-productivity/commit/67175bcb4f404d2ed08695f29588fe00dc373c46))
- **androidWidget:** send less data to widget ([8540f75](https://github.com/johannesjo/super-productivity/commit/8540f75739ba943026d35bee115c37b7a2408f63))
- cleanup ([70c7988](https://github.com/johannesjo/super-productivity/commit/70c79885e52e3575b102b27c17224c33ca8e1468))
- deactivate android db adapter for now ([509fa90](https://github.com/johannesjo/super-productivity/commit/509fa90d52165ea41b3ca855d12e8ba9516913be))
- **idle:** add more functionality for split view [#1660](https://github.com/johannesjo/super-productivity/issues/1660) ([0b38a4a](https://github.com/johannesjo/super-productivity/commit/0b38a4abff555279d810fc2c9a1b82abc6f100d2))
- **idle:** add split as seperate dialog ([8c1e009](https://github.com/johannesjo/super-productivity/commit/8c1e0091ca9ad65bf7970a2234171195d7db54c5))
- **idle:** add translations [#1660](https://github.com/johannesjo/super-productivity/issues/1660) ([30af9c6](https://github.com/johannesjo/super-productivity/commit/30af9c6a5c9b8be92c0fb0d46cd832eb2c39b056))
- **idle:** allow for tracking multiple split items [#1660](https://github.com/johannesjo/super-productivity/issues/1660) ([e7678ef](https://github.com/johannesjo/super-productivity/commit/e7678ef8f6c60d78f99294f533dc9fbbd3ff85ba))
- **idle:** outline new ui for splitting idle time [#1660](https://github.com/johannesjo/super-productivity/issues/1660) ([8411373](https://github.com/johannesjo/super-productivity/commit/84113736ab305360f28acb065a4919f1cd422417))
- implement database adapter ([690e5cb](https://github.com/johannesjo/super-productivity/commit/690e5cbb2e31afb02e0c7c14a12aeff7b3917391))
- implement database adapter 3 ([5f53b99](https://github.com/johannesjo/super-productivity/commit/5f53b99e1e4a0a4bd9e8fd33cec944159d68802e))
- improve behaviour for desktop touch screens [#1765](https://github.com/johannesjo/super-productivity/issues/1765) ([79836c0](https://github.com/johannesjo/super-productivity/commit/79836c0295cba1ac86ffc77bbb3c57d26921eddc))
- improve finish day buttons ([bf75726](https://github.com/johannesjo/super-productivity/commit/bf75726713104f55211a5c7b8a6d5bf5e636f936))
- improve new data interface ([b693fe9](https://github.com/johannesjo/super-productivity/commit/b693fe99498ac498b0c721a17d45af186197cc77))
- improve task side panel icon [#1685](https://github.com/johannesjo/super-productivity/issues/1685) ([8e28cfd](https://github.com/johannesjo/super-productivity/commit/8e28cfd894339e1723252edc2bc4241b77eb4575))
- make interface work better ([ffb93c0](https://github.com/johannesjo/super-productivity/commit/ffb93c0e4a9c35602e3c14c988eb38c7b04ac01f))
- make reading android version work ([fb44ca0](https://github.com/johannesjo/super-productivity/commit/fb44ca0bc3d722a6f53f0b3e7a686300cb0343cd))
- make showing task title work ([3c1f790](https://github.com/johannesjo/super-productivity/commit/3c1f79079d3330dbb01cd0e60f33e659501f9283))
- move add task bar buttons to the right [#1685](https://github.com/johannesjo/super-productivity/issues/1685) ([9386d9a](https://github.com/johannesjo/super-productivity/commit/9386d9abb6bbfc73cd0a116f4bda1c7ebc62d1da))
- only show simple counter buttons when one is enabled ([de51ade](https://github.com/johannesjo/super-productivity/commit/de51ade3fc86c69e734bcfe8b6b5ab0a86295c9d))
- **sync:** add user interaction fallback for idle ([63ec76d](https://github.com/johannesjo/super-productivity/commit/63ec76d8fb03819f36b808d870bc990fc15f0c11))
- **sync:** improve sync handling for desktop ([affaf16](https://github.com/johannesjo/super-productivity/commit/affaf16ee009931fd3ab4eb1cc9c04e4969e3238))
- **sync:** trigger right away on android onPause and onResume ([19da009](https://github.com/johannesjo/super-productivity/commit/19da0093c7f0d5660e535ccc8e0c8e4a5bc5e789))
- **task:** don't show drag handle when task is being tracked to ([0f81fbc](https://github.com/johannesjo/super-productivity/commit/0f81fbc477c662b2aeb26fc3002188ad644d58f6))
- update icon font ([ed59691](https://github.com/johannesjo/super-productivity/commit/ed59691b5d0aaf06384abc0345e44ff0d4116c2e))
- update is touch only check ([5065c38](https://github.com/johannesjo/super-productivity/commit/5065c382339ce5fbadcb83dc657295db875a39a7))

## [7.8.1](https://github.com/johannesjo/super-productivity/compare/v7.8.0...v7.8.1) (2021-12-09)

### Bug Fixes

- filter out weird empty response for idle dialog [#1684](https://github.com/johannesjo/super-productivity/issues/1684) ([01d766f](https://github.com/johannesjo/super-productivity/commit/01d766fe7d3eb9d074df3c7525690f5233e96f8f))
- **idle:** conflicting timer ([77e023f](https://github.com/johannesjo/super-productivity/commit/77e023f414cc1eb88e3a8ac2da736121e4002eb2))
- **idle:** dialog not triggering ([3954f58](https://github.com/johannesjo/super-productivity/commit/3954f58b778538eaa1a9cc5f64f7798c5edf0518))
- **idle:** maybe fix destructure issue [#1684](https://github.com/johannesjo/super-productivity/issues/1684) ([f9b15be](https://github.com/johannesjo/super-productivity/commit/f9b15bef529bbffafd773fbef04351e4396e9ec8))
- local only database fields being ignored [#1673](https://github.com/johannesjo/super-productivity/issues/1673) ([9b3cc4e](https://github.com/johannesjo/super-productivity/commit/9b3cc4e0bd6670e1c9deca643f33c438826c2aa3))
- migrations not being executed for all models on import [#1673](https://github.com/johannesjo/super-productivity/issues/1673) ([6d16d61](https://github.com/johannesjo/super-productivity/commit/6d16d6115ab1dad8d78f3e62398b358301c292fd))

### Features

- add description to each duration input ([ccb16d6](https://github.com/johannesjo/super-productivity/commit/ccb16d63459e1bcfb0efb8723ac0e0d44a0f2546))
- add privacy export [#1682](https://github.com/johannesjo/super-productivity/issues/1682) ([b0ef2e5](https://github.com/johannesjo/super-productivity/commit/b0ef2e54027eef4cf93211785bbd496cbc555f4f))
- add privacy export to error dialog [#1682](https://github.com/johannesjo/super-productivity/issues/1682) ([391ead2](https://github.com/johannesjo/super-productivity/commit/391ead215ed85e48cc0137c082ea9a475811d220))
- adjust time input size ([8f52ea8](https://github.com/johannesjo/super-productivity/commit/8f52ea8f5d55f96c573749f50788b4e9995ccb91))
- check for service worker updates before syncing data ([4cc61ac](https://github.com/johannesjo/super-productivity/commit/4cc61ac8b071e8e58b466014fab5f000a0237c09))
- hide note panel when navigating to daily summary ([895a6c4](https://github.com/johannesjo/super-productivity/commit/895a6c4466aa6d0abb17aab2af71706e31f48d1f))
- **idle:** make sure that there only ever is one dialog instance ([15fd37a](https://github.com/johannesjo/super-productivity/commit/15fd37a540c53dd9351451ffd7062ce5979ab9b5))
- **idle:** only enable listening to apis when enabled in settings ([61d1b98](https://github.com/johannesjo/super-productivity/commit/61d1b98774c31e1371fcb73d965bb3fefdc5fc08))
- **idle:** remove time from active simple counter timers on idle dialog ([52d6ec7](https://github.com/johannesjo/super-productivity/commit/52d6ec740c76f686bde5ae09130bff70c2706f1f))
- improve update before import message ([f1adc44](https://github.com/johannesjo/super-productivity/commit/f1adc44afebe5e871f0991fb41541c8fac716147))
- improve update before import message 2 ([441c300](https://github.com/johannesjo/super-productivity/commit/441c300c49c11b3281c682ffe1e2c6c0cdcf034b))
- internationalize date for task schedule button ([581343c](https://github.com/johannesjo/super-productivity/commit/581343c6864e162855516021f42ce75dd4885ba5))
- **jira:** add translations ([0fba718](https://github.com/johannesjo/super-productivity/commit/0fba718a8037f126027b71ab8ced71525901c1d4))
- **jira:** display related issues ([a61b435](https://github.com/johannesjo/super-productivity/commit/a61b435a72096b01770d356426617f3519ec5834))
- **jira:** display sub tasks ([6ec161a](https://github.com/johannesjo/super-productivity/commit/6ec161a58f014d215d163cd35ce1101298737ad7))
- **task:** also allow for already scheduled tasks to be moved to backlog on option ([afecfa9](https://github.com/johannesjo/super-productivity/commit/afecfa9a43f657f7a3a16ec0ea860a55401fd30c))
- **task:** also allow for already scheduled tasks to be moved to backlog on option 2 ([f78219e](https://github.com/johannesjo/super-productivity/commit/f78219ea0aed4e22bafd37cf051a644ca7f34771))
- **task:** make add and remove to today shortcuts remove and today tag ([3de0d93](https://github.com/johannesjo/super-productivity/commit/3de0d93779299e7d35492b3bf18bc7f6e4b5b98d))

# [7.8.0](https://github.com/johannesjo/super-productivity/compare/v7.7.0...v7.8.0) (2021-11-19)

### Bug Fixes

- info about repeating task order ([7b7ea0e](https://github.com/johannesjo/super-productivity/commit/7b7ea0e72eeda6fef5f98b79b6ae4c24b58bb25f))
- initial node panel state ([ab41231](https://github.com/johannesjo/super-productivity/commit/ab41231236b50dc613a11c05eae0902a6fb109ee))
- legacy migration ([d529664](https://github.com/johannesjo/super-productivity/commit/d5296647329f63e4ab3b9e3ee478b19b1acbf874))
- lint ([4b24dbc](https://github.com/johannesjo/super-productivity/commit/4b24dbc24c255f30f978261f38672d8323610985))
- lint ([5f34445](https://github.com/johannesjo/super-productivity/commit/5f3444505efd7bd60f56f31d9ed01408382efa5c))
- **note:** model breaking ([c1c3261](https://github.com/johannesjo/super-productivity/commit/c1c3261ab45de6f3eb788a0166ae07ce3b615ca8))
- **note:** not saving model version initially ([5a67806](https://github.com/johannesjo/super-productivity/commit/5a67806f973944e7bd6f4921d6c852e96135f535))
- side panel size on timeline and daily summary when menu is open ([93e6aa7](https://github.com/johannesjo/super-productivity/commit/93e6aa7ecb17ecb10e3793c514a19e107a07580e))
- simple counter button animation ([7665497](https://github.com/johannesjo/super-productivity/commit/76654970eb28372b7e60f82505de2a4ef0e3b822))
- sizing issues for better drawyer container ([e9dc70a](https://github.com/johannesjo/super-productivity/commit/e9dc70a7fa174fb755c494cf7f0368038a05b388))
- typing errors ([1f289b7](https://github.com/johannesjo/super-productivity/commit/1f289b7ab6dfa6fbaaae20d00ebe349d935e7572))
- **worklog:** problem when parent hasn't timeSpentOnDay where timeSpentOnDay is 0 for sub task [#1668](https://github.com/johannesjo/super-productivity/issues/1668) ([f5f4838](https://github.com/johannesjo/super-productivity/commit/f5f4838dc27e06824760ec322caf2611a631827b))

### Features

- add migration to data import ([b2fc9e3](https://github.com/johannesjo/super-productivity/commit/b2fc9e34f5839312f607bff815a7ec6fce1706a6))
- add model versions per default to any initial store state ([350ea39](https://github.com/johannesjo/super-productivity/commit/350ea39ffe68a5b48a828b9296a6e85fcb4253b7))
- ask before migrating legacy data ([7f77a21](https://github.com/johannesjo/super-productivity/commit/7f77a2139d76c7b36035e7f021d47ae54012a8a0))
- avoid error when lastLocalSyncModelChange is undefined on import [#1664](https://github.com/johannesjo/super-productivity/issues/1664) ([80a0f56](https://github.com/johannesjo/super-productivity/commit/80a0f564851bceccfb5a6af17e9e0f86674cb4ab))
- display error type before data repair ([4a1e64b](https://github.com/johannesjo/super-productivity/commit/4a1e64b424ff05c2e572f0d6a4e1d5610ede6529))
- **i18n:** update all translations ([13da9aa](https://github.com/johannesjo/super-productivity/commit/13da9aae3db290f425f262660155d3da7ba601c3))
- improve data-repair for noteIds ([9d0e579](https://github.com/johannesjo/super-productivity/commit/9d0e57961db61917df12619fb34b73b8fa770d70))
- improve logging ([4f38f76](https://github.com/johannesjo/super-productivity/commit/4f38f76aaf481e570d52ac7f8494c9adcf2d9367))
- improve migration logging ([ea5a4d2](https://github.com/johannesjo/super-productivity/commit/ea5a4d275f20f8a25c618a235cb73de1cdac4aa6))
- improve note panel behaviour ([9a01672](https://github.com/johannesjo/super-productivity/commit/9a016725a6a086693725df45ed69fd4a2e3d7e26))
- make right panel work for daily summary ([9da90ca](https://github.com/johannesjo/super-productivity/commit/9da90ca55355d0ab3fcb6ed6469fa34a65df050c))
- make task additional info ani much smoother ([d41bb8d](https://github.com/johannesjo/super-productivity/commit/d41bb8dba4af1ec5f3ca4e9de3a7d18b1307b804))
- **note:** add to cross model migrations ([0f0c860](https://github.com/johannesjo/super-productivity/commit/0f0c860d14bc02ac1e4510c3a4e5f57381cb4302))
- **notes:** add new side panel ui ([7c62a18](https://github.com/johannesjo/super-productivity/commit/7c62a18409f90ffc8c2b006ab99f04facf53df37))
- **notes:** add no notes message ([2ce7ff7](https://github.com/johannesjo/super-productivity/commit/2ce7ff7f55f96c1994a7447e7c08962f736a81d8))
- **notes:** add validity check and data repair scripts ([cccd5e6](https://github.com/johannesjo/super-productivity/commit/cccd5e6eea5c1bdd3cdf0490433e61b93d661b84))
- **notes:** allow opening notes from tag views ([c99b4c0](https://github.com/johannesjo/super-productivity/commit/c99b4c09d5510c05b7389ff1e3c1fd454fc23719))
- **notes:** always focus task on right panel close ([fe7a3f0](https://github.com/johannesjo/super-productivity/commit/fe7a3f0874893e5d5c7678621ed91386c4f1b2e2))
- **notes:** improve add new note button ([1484d37](https://github.com/johannesjo/super-productivity/commit/1484d37600507af721104906b10ca61bd33b21c3))
- **notes:** improve animation ([4dec2e4](https://github.com/johannesjo/super-productivity/commit/4dec2e4f0a1af4229a365069b7095743cd157b92))
- **notes:** improve main header button styling ([070fd89](https://github.com/johannesjo/super-productivity/commit/070fd8990d64a70b0754c8f7214e3c43b0c3d114))
- **notes:** improve note styling ([a370754](https://github.com/johannesjo/super-productivity/commit/a3707545864d56851bec658b6e99a33947ab171e))
- **notes:** improve panel ani ([598288e](https://github.com/johannesjo/super-productivity/commit/598288e46a21c7337bbef7b8d329ed00e4f90a5c))
- **notes:** improve panel animation ([dd361b5](https://github.com/johannesjo/super-productivity/commit/dd361b590e32b6bf39643682216582d06b6ce250))
- **notes:** improve side panel animations ([540aaeb](https://github.com/johannesjo/super-productivity/commit/540aaeb937e40e3bd0214c9f7932f0de15600e2b))
- **notes:** improve side panel ui ([e0c0dd5](https://github.com/johannesjo/super-productivity/commit/e0c0dd52495c662db19a4ab70d788945d7a4be57))
- **notes:** improve styling ([2628bd3](https://github.com/johannesjo/super-productivity/commit/2628bd31d431a96d3ed29f1e4b9924b1ec87c02c))
- **notes:** improve ui for image notes ([77d45fb](https://github.com/johannesjo/super-productivity/commit/77d45fb5b65c9a1a017a2ac5c7fb50bfee265780))
- **notes:** make adding and removing notes from today work ([4d089b1](https://github.com/johannesjo/super-productivity/commit/4d089b1f8805b6db6be316037d6083837ed836e9))
- **notes:** make basic stuff work for new note model ([31d9a8c](https://github.com/johannesjo/super-productivity/commit/31d9a8c8f5be1df120e0f05a2c67a4602bdcf52f))
- **notes:** make close button work ([887f077](https://github.com/johannesjo/super-productivity/commit/887f07719a538ec3f6db62724f674aeb7db2b23d))
- **notes:** make note panel open work better ([50152b5](https://github.com/johannesjo/super-productivity/commit/50152b5e6e60b729aec3f25baf3a02b16386650b))
- **notes:** make panel close button work on mobile ([87d5d95](https://github.com/johannesjo/super-productivity/commit/87d5d950936988be967700903d3c91824e00abfc))
- **notes:** make store and persistence work for new note model ([d3388ea](https://github.com/johannesjo/super-productivity/commit/d3388ea93ee69efa855e29c1182d123fd06a2ed7))
- **notes:** migrate notes from project model to global model ([6a21154](https://github.com/johannesjo/super-productivity/commit/6a211549959ee2b927c88a59e24d72bfaf2c1d9c))
- **notes:** outline new ui ([a5c94eb](https://github.com/johannesjo/super-productivity/commit/a5c94eba7aa2ed459f9757c1e1c63d443d93bb57))
- **notes:** place banner above notes button ([ddb4bd5](https://github.com/johannesjo/super-productivity/commit/ddb4bd52355e5933af5bf585e3edb84b040970a5))
- **notes:** unselect selected task and re-open notes panel if show notes is triggered again ([5747ebf](https://github.com/johannesjo/super-productivity/commit/5747ebf4e0090d23bd60fd564b4a7d826bbdc16a))
- **note:** use major version shift on project to indicate incompatabilities ([64c6274](https://github.com/johannesjo/super-productivity/commit/64c627464f673b581df2d94e0135db3c2125b298))
- prefix all migration logs ([7e763f7](https://github.com/johannesjo/super-productivity/commit/7e763f7a38133935ccd0675409b4572c7f7e81e4))
- **project:** allow to hide projects from menu ([5cd36ea](https://github.com/johannesjo/super-productivity/commit/5cd36ea1de91b189354f1f5e1e1f10573c406d00))
- **project:** remove legacy fields ([b16433c](https://github.com/johannesjo/super-productivity/commit/b16433c645ca15cca6c7f1e58f76ec3a0409720d))
- remove legacy migration service ([fc874bb](https://github.com/johannesjo/super-productivity/commit/fc874bba8055447b6d118881451e52371ea29ce1))
- **sync:** display fallback error ([0d0eeef](https://github.com/johannesjo/super-productivity/commit/0d0eeef3f65acb2ede36ebb96549f24313dcbfcc))
- **task:** always show task title in additional panel when panel isOver ([3c33144](https://github.com/johannesjo/super-productivity/commit/3c3314404c7701ff0fbc23c6b7bf600ac964baab))
- update angular material css vars ([6b1d8c0](https://github.com/johannesjo/super-productivity/commit/6b1d8c02f49546464a6ef36a6bdbef1c6555e37b))

# [7.7.0](https://github.com/johannesjo/super-productivity/compare/v7.6.0...v7.7.0) (2021-11-04)

### Bug Fixes

- different code to be used when browser is not chrome ([337b7a7](https://github.com/johannesjo/super-productivity/commit/337b7a731e309197dc603ff712b4b8c866217e11)), closes [#1245](https://github.com/johannesjo/super-productivity/issues/1245)
- different code to be used when browser is not chrome ([d1b29c1](https://github.com/johannesjo/super-productivity/commit/d1b29c1c43951dde4a6cca30c4f5c23796d86c9d)), closes [#1245](https://github.com/johannesjo/super-productivity/issues/1245)
- bookmarks being only editable once ([46a8659](https://github.com/johannesjo/super-productivity/commit/46a86592445ef1ad2e2e2265a6d782e54aa83bc9))
- cleanup ([cdb49f1](https://github.com/johannesjo/super-productivity/commit/cdb49f111acd836661846fcce8f081f05f8bca2f))
- different code to be used when browser is not chrome ([d5a40c9](https://github.com/johannesjo/super-productivity/commit/d5a40c99e4d92f61678f6733c25661cf4a197b82))
- different code to be used when browser is not chrome see the issue for more information about the error ([0444841](https://github.com/johannesjo/super-productivity/commit/0444841f88c2f01c8604cb1fa50b65778e9d2f00))
- different code to be used when browser is not chrome see the issue for more information about the error ([f7638c7](https://github.com/johannesjo/super-productivity/commit/f7638c7c478e438da008711fadf01e00e790be35))
- electron build ([cab3373](https://github.com/johannesjo/super-productivity/commit/cab3373014d4598bc449d908b93bfa00fda6f485))
- electron remote module not working ([5a4e52d](https://github.com/johannesjo/super-productivity/commit/5a4e52d9e8e1cb96115623b6821c5e8c7cc26cad))
- image preview not working ([a5602d8](https://github.com/johannesjo/super-productivity/commit/a5602d829a9fb8602fdcc36f3c22fb7002a94a2c))
- invalid time format for scheduled page [#609](https://github.com/johannesjo/super-productivity/issues/609) ([66d99f3](https://github.com/johannesjo/super-productivity/commit/66d99f3484c1044956fef7dad458a44cdb2b2d59))
- **issue:** issue search being triggered, when config is deactivated ([77604cd](https://github.com/johannesjo/super-productivity/commit/77604cd39a494e4147b5cc856b75bf927f87c18e))
- **jira:** double enabled toggle ([528c9d2](https://github.com/johannesjo/super-productivity/commit/528c9d2f909c63f7c61f3ba34d40b29ef06a6ce0))
- language code ([729974b](https://github.com/johannesjo/super-productivity/commit/729974bf5efefc578de2f8075b926540b4889612))
- lint ([509895d](https://github.com/johannesjo/super-productivity/commit/509895d6381a205e8a72f222f245207daa6d2281))
- make text selection work again for tables [#1573](https://github.com/johannesjo/super-productivity/issues/1573) ([a0fd08f](https://github.com/johannesjo/super-productivity/commit/a0fd08f08fde8fbaa140bfffc2256bdb1711a047))
- make worklog table text selectable again [#1572](https://github.com/johannesjo/super-productivity/issues/1572) ([9980752](https://github.com/johannesjo/super-productivity/commit/9980752aa9d8e3ccb4ebd77cc5bfff4c9a9b8f11))
- remove unnecessary imports ([dc49182](https://github.com/johannesjo/super-productivity/commit/dc49182927b7d91d362168ab0e95ceaa6e711ee6))
- remove unnecessary imports ([6cc5e9d](https://github.com/johannesjo/super-productivity/commit/6cc5e9d7eeab86dd2490d3a169efd2878f7e9404))
- **takeABreak:** banner styling ([1c6f085](https://github.com/johannesjo/super-productivity/commit/1c6f085cc136683aaae3e624ba3f781ba8216ba0))
- **task:** improve toggle behaviour ([f6fd6dd](https://github.com/johannesjo/super-productivity/commit/f6fd6dd1afba2da3df92c528ff09972f6fb70d02))
- update code to resolve comments left on PR ([e816409](https://github.com/johannesjo/super-productivity/commit/e816409e2f4dbb5d689a407ac06bad8227b1f100))
- update code to resolve comments left on PR ([9a28ade](https://github.com/johannesjo/super-productivity/commit/9a28adeaa46ee399819bc0da7380fb086ee585d3))
- use a different method for firefox and chrome ([0ee1b2c](https://github.com/johannesjo/super-productivity/commit/0ee1b2c70bad61e4270ac96fbcade4d86d67474a))
- use a different method for firefox and chrome ([ce34434](https://github.com/johannesjo/super-productivity/commit/ce344348263fc14a685f8629397701a31adf536f))
- working today not switching on day change [#1629](https://github.com/johannesjo/super-productivity/issues/1629) ([db93098](https://github.com/johannesjo/super-productivity/commit/db93098160fcd13c2e79cfc44d3d07bd21d347f9))

### Features

- **caldav:** make password required ([ebf2de2](https://github.com/johannesjo/super-productivity/commit/ebf2de29d531c52076b19b8a613e6814c84aa4a5))
- enable github flavored markdown [#1606](https://github.com/johannesjo/super-productivity/issues/1606) ([93eddca](https://github.com/johannesjo/super-productivity/commit/93eddca065f76633079cf69dc903cb34762d4600))
- **github:** reduce request size for poll to backlog by using GraphQL ([8f2a976](https://github.com/johannesjo/super-productivity/commit/8f2a976d469d2b28f9dc2e5592d8cec7393be65c))
- **gitlab:** reorder config ([14c6a48](https://github.com/johannesjo/super-productivity/commit/14c6a48c9139cd5bac6c6864fb85b690a279a43d))
- **i18n:** add polish language ([b2e9185](https://github.com/johannesjo/super-productivity/commit/b2e9185e4c03168c1d969082cc25129b4a4e2df5))
- **i18n:** order languages alphabetically ([7c02b7e](https://github.com/johannesjo/super-productivity/commit/7c02b7e026ad3e7386e450be07ef648195c7300f))
- **icalTimeline:** add caching ([7e8ada9](https://github.com/johannesjo/super-productivity/commit/7e8ada925d673bf80cc68d0ceafe4fb6a03279c8))
- **icalTimeline:** add error snack when request fails ([fc72720](https://github.com/johannesjo/super-productivity/commit/fc72720306437a9bd58bda861d979c43e3de064d))
- **icalTimeline:** improve form ([bfe4e55](https://github.com/johannesjo/super-productivity/commit/bfe4e55fa7eaa9b75fdaeb44da873ed02432520d))
- **icalTimeline:** improve styling in timeline ([fa19854](https://github.com/johannesjo/super-productivity/commit/fa1985459114da88bae3f5ad6c1606a420247a55))
- **icalTimeline:** improve styling in timeline 2 ([8da8734](https://github.com/johannesjo/super-productivity/commit/8da8734e66957d766b508f8d1bb8e58b54d8a902))
- **icalTimeline:** make basic parsing work ([2d33e94](https://github.com/johannesjo/super-productivity/commit/2d33e943f3fcd44bfe83ec70f984495fe1595309))
- **icalTimeline:** make configuring url work ([bf72f88](https://github.com/johannesjo/super-productivity/commit/bf72f88babfedc41687d0f09e0869250b33be77c))
- **icalTimeline:** make displaying calendar events work ([82f2707](https://github.com/johannesjo/super-productivity/commit/82f2707a25d452bbde4c2ed442b49146faefafac))
- **icalTimeline:** make multiple calendars work ([df7ef2f](https://github.com/johannesjo/super-productivity/commit/df7ef2f5d88e9ec9784336e86e16a4bed3495986))
- **icalTimeline:** make reoccurring events from calendar work ([26396f7](https://github.com/johannesjo/super-productivity/commit/26396f747d1a90efa4a3d664e2aabce72e1a69f2))
- improve finish day for electron variant ([e85cfe2](https://github.com/johannesjo/super-productivity/commit/e85cfe2937b1a96e8e314352b162f64530abc1ef))
- **issue:** add isEnabled property to every issue provider ([412b657](https://github.com/johannesjo/super-productivity/commit/412b6577cf5a9e4ab7bfad0f074a39070804a6be))
- **issue:** use toggle button ([07f77d5](https://github.com/johannesjo/super-productivity/commit/07f77d5bd049dbc8d068b760108eaae50023def8))
- **jira:** also fill in started value based on default choice [#1571](https://github.com/johannesjo/super-productivity/issues/1571) ([aaf00bf](https://github.com/johannesjo/super-productivity/commit/aaf00bfd423697da8d0b98626df8ad84b97f5987))
- **jira:** improve worklog dialog [#1547](https://github.com/johannesjo/super-productivity/issues/1547) ([aa5f05e](https://github.com/johannesjo/super-productivity/commit/aa5f05ec4df7a14a593b2f3a02023de1d9afea83))
- **jira:** improve worklog dialog icon [#1547](https://github.com/johannesjo/super-productivity/issues/1547) ([120cb29](https://github.com/johannesjo/super-productivity/commit/120cb29f7927c07530a42b293f46c8c17d867eb7))
- **jira:** open worklog dialog form today and other tag lists ([a892391](https://github.com/johannesjo/super-productivity/commit/a8923914930f4e1b4fa5c60df2de1a6eb209fa8f))
- **jira:** prepare ui for better add worklog dialog [#1547](https://github.com/johannesjo/super-productivity/issues/1547) ([7cd9452](https://github.com/johannesjo/super-productivity/commit/7cd9452b3854cfbba08c0c16c224ef154c88cd92))
- make backup path clickable ([3fbcefb](https://github.com/johannesjo/super-productivity/commit/3fbcefbb9ad4fc4a0499cc00603aac668a85886c))
- make checkboxes work for markdown ([fe08aa4](https://github.com/johannesjo/super-productivity/commit/fe08aa49b90a22ba38cef914a7c17e7222cd5088))
- move dependency ([5ed1157](https://github.com/johannesjo/super-productivity/commit/5ed1157646e3d48d630dac8deb66ad0dad303a99))
- **openProject:** also fill in started value based on default time choice [#1571](https://github.com/johannesjo/super-productivity/issues/1571) ([ca28d83](https://github.com/johannesjo/super-productivity/commit/ca28d83f65f42bf359cae1ff4bb48528a845feaa))
- **openProject:** improve time tracking dialog as well [#1547](https://github.com/johannesjo/super-productivity/issues/1547) ([58977ff](https://github.com/johannesjo/super-productivity/commit/58977ff07150f2f90f238b2e2f3b6a5791af7ebc))
- **persistence:** simplify persistence and get rid of inMemoryComplete$ ([ad60e25](https://github.com/johannesjo/super-productivity/commit/ad60e25626a7fafb7cfdb8a2412420641c5cee58))
- polish attachment button ([4c4b20f](https://github.com/johannesjo/super-productivity/commit/4c4b20f541067548f0964c5c644b414ae65b9aaf))
- **pomodoro:** connect to take a break [#939](https://github.com/johannesjo/super-productivity/issues/939) ([9ad1e8d](https://github.com/johannesjo/super-productivity/commit/9ad1e8d9a72345d4c04f18836151ce11d799b58e))
- **project:** remove redundant stuff ([f8bfe79](https://github.com/johannesjo/super-productivity/commit/f8bfe791e2ac476b12457e259394105d427c3552))
- remove initial dialog ([e02a11e](https://github.com/johannesjo/super-productivity/commit/e02a11e50287d832bd594ba841aea130686824c5))
- **repeatableTasks:** add translation strings [#1578](https://github.com/johannesjo/super-productivity/issues/1578) ([92c2b02](https://github.com/johannesjo/super-productivity/commit/92c2b0235dab9ef36a3de92f3e790f9a7dca1637))
- **repeatableTasks:** make basic order property work [#1578](https://github.com/johannesjo/super-productivity/issues/1578) ([9849e9b](https://github.com/johannesjo/super-productivity/commit/9849e9b92398865a642533248e6f003813dba658))
- **repeatableTasks:** make description styling work [#1578](https://github.com/johannesjo/super-productivity/issues/1578) ([d248e62](https://github.com/johannesjo/super-productivity/commit/d248e62d5983084230aa0ebb310339f7b7e422db))
- **repeatableTasks:** make sort order work [#1578](https://github.com/johannesjo/super-productivity/issues/1578) ([29142ae](https://github.com/johannesjo/super-productivity/commit/29142aec7a820d9eafce35aebe26c62b33bf2ce4))
- **search:** beautify search bar ([e5c9d9a](https://github.com/johannesjo/super-productivity/commit/e5c9d9a33ae9de09495964b1eb167b49c237485f))
- **search:** limit search items to 100 to improve performance ([3b5ed2b](https://github.com/johannesjo/super-productivity/commit/3b5ed2bf1a32b4b439334c8999f0e60287464e8a))
- **search:** make searching archive and today at the same time work ([5a85b60](https://github.com/johannesjo/super-productivity/commit/5a85b601c4441e4ac33ac3565a26059a97a25713))
- **simpleCounter:** indicate running button ([727c63a](https://github.com/johannesjo/super-productivity/commit/727c63ac50987d49c66278d592cca6037baea4dc))
- **simpleCounter:** make buttons work for mobile ([ab4a933](https://github.com/johannesjo/super-productivity/commit/ab4a933eba9b981d3d0e2a6ae47acf4cefe820de))
- **snap:** adjust snap to not crash maybe ([c5a9bfb](https://github.com/johannesjo/super-productivity/commit/c5a9bfbf800a370e2270e93bc0f716b1686bb72e))
- **snap:** make copying work ([0fee5f5](https://github.com/johannesjo/super-productivity/commit/0fee5f54b3bbd98389855c566474ed54e2bc4003))
- **snap:** make copying work as far as possible ([82d4556](https://github.com/johannesjo/super-productivity/commit/82d4556ce84749b57a8bf9096d6e37a93e9abaa1))
- **snap:** more silent logging and respect user data dir set via flag ([fca4a5e](https://github.com/johannesjo/super-productivity/commit/fca4a5e0e33a6b790003f2320c97d76c9a487405))
- style native calendar icon ([5d92585](https://github.com/johannesjo/super-productivity/commit/5d9258565234b417d2ed24449894a1b7dcc76508))
- **timeline:** change order to workend before tasks at the same time ([d91ca7b](https://github.com/johannesjo/super-productivity/commit/d91ca7b58257c90216ccc1afe02b8318fa520337))
- **timeline:** filter out past entries for cached calendar ([4a1a18a](https://github.com/johannesjo/super-productivity/commit/4a1a18af0d144e9265027b86f58c994f33395791))
- **timeline:** filter out past entries for cached calendar 2 ([dee32ff](https://github.com/johannesjo/super-productivity/commit/dee32ffe34e7e93b30815dd6e9737825799901e7))
- update electron ([84d296c](https://github.com/johannesjo/super-productivity/commit/84d296c96d2196830e6652888b201f291a66e3ff))
- update info for snapcraft refresh awareness issue ([e97a526](https://github.com/johannesjo/super-productivity/commit/e97a52638f7b12b110a27a0de9cc702a47de3a61))

# [7.6.0](https://github.com/johannesjo/super-productivity/compare/v7.6.0-rc.1...v7.6.0) (2021-09-24)

### Bug Fixes

- invalid clock string error [#1526](https://github.com/johannesjo/super-productivity/issues/1526) ([1bf8b56](https://github.com/johannesjo/super-productivity/commit/1bf8b5649efb318519159024f84ca8db84290d6a))
- invalid clock string error for legacy data [#1526](https://github.com/johannesjo/super-productivity/issues/1526) ([440e0b2](https://github.com/johannesjo/super-productivity/commit/440e0b2b407b945b6c3c29875c24397d4edde568))
- **taskRepeat:** task repeat model not saved after after project delete cleanup [#1530](https://github.com/johannesjo/super-productivity/issues/1530) ([659bd52](https://github.com/johannesjo/super-productivity/commit/659bd52389a39ffa71aa2d9009fe087575d60842))

### Features

- **autoRepair:** fix case when project was deleted that is found in taskRepeatCfg [#1530](https://github.com/johannesjo/super-productivity/issues/1530) ([a86fda5](https://github.com/johannesjo/super-productivity/commit/a86fda56dd809a2be87131b8d078209665cae3ef))
- hide time estimate exceeded banner when other task was selected ([5342c8f](https://github.com/johannesjo/super-productivity/commit/5342c8ffa49bdf211627f5b2e3354599adb0bfa8))
- **idle:** reactivate simple counter button if it was activated before ([7f68079](https://github.com/johannesjo/super-productivity/commit/7f6807904da29957dcdce3fe99b9d64ecfc216cd))
- **sync:** always show button [#1213](https://github.com/johannesjo/super-productivity/issues/1213) ([474abd3](https://github.com/johannesjo/super-productivity/commit/474abd37f1809487648a8390f10cbc213b7b2765))

# [7.6.0-rc.1](https://github.com/johannesjo/super-productivity/compare/v7.6.0-rc.0...v7.6.0-rc.1) (2021-09-22)

### Bug Fixes

- memory leaks ([f2e3d0d](https://github.com/johannesjo/super-productivity/commit/f2e3d0d5c6f1dc17c08aa6455d24b20d87dcff35))
- **task:** deleting task unsets current task ([c639538](https://github.com/johannesjo/super-productivity/commit/c6395386d94abb50cfa1f7a7b51e787524a3507d))

### Features

- don't show global progress spinner forever if something goes wrong ([699ea33](https://github.com/johannesjo/super-productivity/commit/699ea3396bf78e8d44c853e4a6f522d71c1c0944))
- improve error handling ([9ce5c0a](https://github.com/johannesjo/super-productivity/commit/9ce5c0acb85fe5d7c0fb88e57c7356245e2d8840))

# [7.6.0-rc.0](https://github.com/johannesjo/super-productivity/compare/v7.5.2...v7.6.0-rc.0) (2021-09-20)

### Bug Fixes

- contextmenu for ios (?) [#1467](https://github.com/johannesjo/super-productivity/issues/1467) ([f8b11af](https://github.com/johannesjo/super-productivity/commit/f8b11af39bd1ec1e85cd7c915ee124ef8b2cf55c))
- empty task description not being saved [#1491](https://github.com/johannesjo/super-productivity/issues/1491) ([14c962e](https://github.com/johannesjo/super-productivity/commit/14c962e4c576ac1695dead08014fa704ddd4b6f9))
- **firefox:** scrollbars ([1d5d158](https://github.com/johannesjo/super-productivity/commit/1d5d1580bec3658b8318dae980f29b78d7a1f5fe))
- **gitHub:** changes to issue itself not recognized ([b667c9b](https://github.com/johannesjo/super-productivity/commit/b667c9b9c648b07fa8e60ebd2772a65eb84fbf80))
- **gitLab:** wrong issue url ([3c0de01](https://github.com/johannesjo/super-productivity/commit/3c0de01963dbe944f5831207f31be6d3188c9883))
- **issue:** issue title for single issue import ([ee02306](https://github.com/johannesjo/super-productivity/commit/ee0230685dda22dcec1039c33190ce2a63e1ced7))
- **jira:** better handling for markdown parse errors ([18ba8da](https://github.com/johannesjo/super-productivity/commit/18ba8dab81fda189f3bd27a6424a02579892f129))
- make app reload work properly for indexeddb termination error ([1a30c1e](https://github.com/johannesjo/super-productivity/commit/1a30c1e9be27271273c78141a96a77e976780807))
- missing box shadows ([68a9cb5](https://github.com/johannesjo/super-productivity/commit/68a9cb5f1c5d1b02b0e45867bbcbb16b8f8fbd5b))
- missing unsubscribe ([b183446](https://github.com/johannesjo/super-productivity/commit/b183446b0335185089e999ad61891eb1d0e53851))
- **openProject:** authentication header ([4dd7761](https://github.com/johannesjo/super-productivity/commit/4dd776132805f9a0ac5e21eb0f47b72e430a35e9))
- **openProject:** authentication issue ([cf7a05f](https://github.com/johannesjo/super-productivity/commit/cf7a05f3be8cfc7400af235fec8d0dd16e7b9ff8))
- **openProject:** make missing project model migration happen ([1a4d0af](https://github.com/johannesjo/super-productivity/commit/1a4d0afeced1f3e0986c5a0ffed1133bc586d37b))
- **reminder:** reminders getting lost when repeatable tasks with reminder are created initially ([fce4637](https://github.com/johannesjo/super-productivity/commit/fce46376bfa2b3fa9ac050433409fc9086e923b3))
- **simpleCounter:** stopwatch with no iconOn ([1a41beb](https://github.com/johannesjo/super-productivity/commit/1a41beb1f8eb83c25a6c9793920020fab6a669fa))
- **task:** error in additional info panel when switching between issue tasks ([d8196a0](https://github.com/johannesjo/super-productivity/commit/d8196a07eccdb2724639fb11e68179f63c12bf7f))
- **task:** make task edit work without pseudo element to fix ios and ff [#1505](https://github.com/johannesjo/super-productivity/issues/1505) ([160c95f](https://github.com/johannesjo/super-productivity/commit/160c95f9ac2c06b581ba0107bd3c078fecf37e49))
- **task:** task edit being broken ([2afcab1](https://github.com/johannesjo/super-productivity/commit/2afcab19ea4b1a0b99c459add3d48d2870be6270))
- try re-init for indexeddb termination error ([a725ff3](https://github.com/johannesjo/super-productivity/commit/a725ff36d1455286c8409782edcdfc3a0f5aa803))
- typing error ([5960ef4](https://github.com/johannesjo/super-productivity/commit/5960ef424a1d130f0259c71f1c63acde33995357))
- user select for issue table ([07e7cb1](https://github.com/johannesjo/super-productivity/commit/07e7cb132cff7d1c6e72e9459da0496d6d3a8f9a))
- **worklog:** timezone issues for worklog export dialog [#1490](https://github.com/johannesjo/super-productivity/issues/1490) ([165e070](https://github.com/johannesjo/super-productivity/commit/165e070dd60bc512f9cef9d48ddcd7952b289463))

### Features

- add jira personal access token support ([1717e6a](https://github.com/johannesjo/super-productivity/commit/1717e6a7fbae16aa38cfed0901512269231daeb6))
- add longpress for ios only [#1467](https://github.com/johannesjo/super-productivity/issues/1467) ([92a7453](https://github.com/johannesjo/super-productivity/commit/92a74532cd7164c27e23ea3e470eb6996299e165))
- add month to quick history [#1512](https://github.com/johannesjo/super-productivity/issues/1512) ([0d76af9](https://github.com/johannesjo/super-productivity/commit/0d76af956211966fc364e76e6de549e04ef3099e))
- add warning for firefox ([dd59a14](https://github.com/johannesjo/super-productivity/commit/dd59a142bfd58f11cce8df602a15d2fa862e3b6c))
- adjust task longpress to be less annoying on desktop ([329febb](https://github.com/johannesjo/super-productivity/commit/329febb3533cd5626f6ad0afc5c821d7fec449c6))
- adjust user-select none ([75ccb83](https://github.com/johannesjo/super-productivity/commit/75ccb83d2a03bdd8ed8cd6d780fedee0a760efea))
- count same actions in action logger ([7a84567](https://github.com/johannesjo/super-productivity/commit/7a8456726cbdcac874c0202631b0002c79695593))
- **db:** improve error handling for db errors [#398](https://github.com/johannesjo/super-productivity/issues/398) [#229](https://github.com/johannesjo/super-productivity/issues/229) [#1323](https://github.com/johannesjo/super-productivity/issues/1323) [#1386](https://github.com/johannesjo/super-productivity/issues/1386) [#1460](https://github.com/johannesjo/super-productivity/issues/1460) [#1472](https://github.com/johannesjo/super-productivity/issues/1472) [#1473](https://github.com/johannesjo/super-productivity/issues/1473) # 1477 ([f988977](https://github.com/johannesjo/super-productivity/commit/f98897719550d205badf9f5b826898ff7f80c5b9))
- **github:** prepare graphql api ([10dd531](https://github.com/johannesjo/super-productivity/commit/10dd53183b1761c8c704b15c0f71d85741c19055))
- **i18n:** remove unused translations ([aa803a9](https://github.com/johannesjo/super-productivity/commit/aa803a9b7e8f9268f9f38f2ded2a29332ce4d434))
- **i18n:** update all translations ([7180e23](https://github.com/johannesjo/super-productivity/commit/7180e235c233100455678dd5a89e521fb9c9dc37))
- **idle:** consider last state before idle for simple counter buttons ([8170ed5](https://github.com/johannesjo/super-productivity/commit/8170ed5759f4dd7754403fb5ba81d79b3b8c3b7b))
- **idle:** disable all simple stop watch counters as soon as idle ([8b996b4](https://github.com/johannesjo/super-productivity/commit/8b996b4e73824d8a508eb13ff84a64de8efa4e99))
- **idle:** improve dialog styling ([d230fe5](https://github.com/johannesjo/super-productivity/commit/d230fe55baa7c2d487e746c41dd9358927cba01d))
- **idle:** improve dialog styling 2 ([40a4f97](https://github.com/johannesjo/super-productivity/commit/40a4f97d9da8d0224a2217f96ea9a8a51c8dbbb1))
- **idle:** improve styling for simple counter btns ([d911862](https://github.com/johannesjo/super-productivity/commit/d9118623ad1970c0056131bb856c26879925ce90))
- **idle:** make tracking to simple counter stopwatch counters work ([2096f03](https://github.com/johannesjo/super-productivity/commit/2096f03bba857a19f1270a25a6afc5da91dc5686))
- improve styling for worklog week and quick history ([a15fe58](https://github.com/johannesjo/super-productivity/commit/a15fe580b69c3506e36b5e4c71549c029a1658f2))
- **issue:** add polling for backlog issues as common effect ([68462b0](https://github.com/johannesjo/super-productivity/commit/68462b05027631a594ec6986c6c83381c1849f9e))
- **issue:** add polling for issue changes as common effect ([e6a809e](https://github.com/johannesjo/super-productivity/commit/e6a809efb61ad76437b8a6242f6f135a810b5a0f))
- **issue:** add polling for issue changes as common effect 2 ([dd9b3ac](https://github.com/johannesjo/super-productivity/commit/dd9b3acd0897159436f7a6f4b5fc66218141c10b))
- **issue:** cleanup issue effect helper service ([d5cb302](https://github.com/johannesjo/super-productivity/commit/d5cb30281a99ec605eba3d0440133d8315098610))
- **issue:** cleanup outdated translations ([6426d3e](https://github.com/johannesjo/super-productivity/commit/6426d3e94b2f74e264f34f1faa32a5690b992c24))
- **issue:** improve issue task refreshing ([a00156f](https://github.com/johannesjo/super-productivity/commit/a00156f74f1554dc9a16802c8e5df5909acee9bd))
- **issue:** make work package instead of issues work ([a276f25](https://github.com/johannesjo/super-productivity/commit/a276f2598f8cf35da52aa8b8ecb6a78de37c04c2))
- **issue:** outline new structure ([419ae4e](https://github.com/johannesjo/super-productivity/commit/419ae4ee15347277f27ff788413c9b2563877aab))
- **metric:** increase dataset size ([4ae1ad0](https://github.com/johannesjo/super-productivity/commit/4ae1ad0b457df3accdd5fe7da7236c3bee0be868))
- **metric:** make simple counter metrics work ([5c0232b](https://github.com/johannesjo/super-productivity/commit/5c0232b33cf050217ba3dde8f48e23f59b171ee7))
- **metric:** make simple counter metrics work better ([0b45e56](https://github.com/johannesjo/super-productivity/commit/0b45e56a4fdf9563a170985b407d7ae60053bc58))
- **metric:** round stopwatch to minutes ([f78bfa0](https://github.com/johannesjo/super-productivity/commit/f78bfa0a6ecc1de69d5f2b5204dc62ce915b7943))
- **metric:** use different scale for productivity metrics ([3a09e56](https://github.com/johannesjo/super-productivity/commit/3a09e56a07fe90cd7d1e85b7e04b97c117a788b6))
- more sensible user select behaviour [#1467](https://github.com/johannesjo/super-productivity/issues/1467) ([177d311](https://github.com/johannesjo/super-productivity/commit/177d311c8c62b8a4f09bd4986f2769e4dedc770a))
- **openProject:** add config for time tracking ([f2c51d8](https://github.com/johannesjo/super-productivity/commit/f2c51d84c853b99169be52a7f1211972288d56b4))
- **openProject:** add icon to project overview ([aadf0e2](https://github.com/johannesjo/super-productivity/commit/aadf0e2bd0f45d7edf465d31b3f91b07f1cab1c4))
- **openProject:** add icon to project overview ([0945996](https://github.com/johannesjo/super-productivity/commit/0945996abeaf3e6af6ff0db3edac7a7e09e7d668))
- **openProject:** add real logo ([6bd2680](https://github.com/johannesjo/super-productivity/commit/6bd2680132da02b17858fcb423e9e89b60bc6c5e))
- **openProject:** also add estimate ([85ef459](https://github.com/johannesjo/super-productivity/commit/85ef45926d67b733bcad7862987a31c1e613ea23))
- **openProject:** better error for CORS ([9264782](https://github.com/johannesjo/super-productivity/commit/92647825b86981ec8b70c1e180bddc50f857df2a))
- **openProject:** improve success snack for time tracking ([c797713](https://github.com/johannesjo/super-productivity/commit/c797713e2db2f531cdb6242d2ddd14998959fa76))
- **openProject:** make activity selection work for time tracking ([0facfe6](https://github.com/johannesjo/super-productivity/commit/0facfe65411076f69eff2fac7fb12f9d356dc6cb))
- **openProject:** make displaying advanced issue data work ([7b53aec](https://github.com/johannesjo/super-productivity/commit/7b53aec00da37aac2b125b52259941446f80cba0))
- **openProject:** make displaying work package content in side panel work ([a812526](https://github.com/johannesjo/super-productivity/commit/a812526a975947d86ec25fc430c85930ecb7b301))
- **openProject:** make displaying work packages in search results work ([dca3402](https://github.com/johannesjo/super-productivity/commit/dca3402ab8dc958fa4a70644cdbc7747397ccfe7))
- **openProject:** make firing first request out work ([3b47cde](https://github.com/johannesjo/super-productivity/commit/3b47cdeba66d2884c33dec011d14302bf3585bce))
- **openProject:** make importing to backlog work ([15b7852](https://github.com/johannesjo/super-productivity/commit/15b7852abcdf98f015edfdfc4933e6c1ffecee73))
- **openProject:** make initial config dialog work ([dcd73eb](https://github.com/johannesjo/super-productivity/commit/dcd73eb83dc3825c89f97194847c2d6397ae8ce4))
- **openProject:** make issue links work ([ca324c1](https://github.com/johannesjo/super-productivity/commit/ca324c1c3a1e9f5fad469ca0fbe29ab9056177dc))
- **openProject:** make issue url for additional info panel work ([1cb9d5e](https://github.com/johannesjo/super-productivity/commit/1cb9d5ea25a6810b8995c796792c2e46e628baaa))
- **openProject:** make polling for updates work ([61ec249](https://github.com/johannesjo/super-productivity/commit/61ec249ee322a52454247251fa1d5993c0da17f3))
- **openProject:** make search case agnostic ([6565a29](https://github.com/johannesjo/super-productivity/commit/6565a29ed2f6168991e9425c5a1c514477136a8b))
- **openProject:** make search work much better ([998254e](https://github.com/johannesjo/super-productivity/commit/998254ed1608a0ce0f5feaeee65fcd8267a89ac6))
- **openProject:** make story points work and prepare advanced fields ([ee484f4](https://github.com/johannesjo/super-productivity/commit/ee484f4d49d5cd87375ca1e85d581e0d60f6b2f2))
- **openProject:** make time tracking work ([d63c4e6](https://github.com/johannesjo/super-productivity/commit/d63c4e675459ce28324ef8f99f2666477d3f6c6d))
- **openProject:** only show and import open issues ([14f840b](https://github.com/johannesjo/super-productivity/commit/14f840b73df5a2c824bc0cffc7278331e9bdae4a))
- **openProject:** polish ([31d0500](https://github.com/johannesjo/super-productivity/commit/31d05000b1b368e20e38f6d0750b9e6fb0b438a4))
- **openProject:** prepare time tracking dialog ([9d5a314](https://github.com/johannesjo/super-productivity/commit/9d5a3141278790c86306d1f12aa2e607e8d86b96))
- **openProject:** reduce uneeded boilerplate code ([fdc4d90](https://github.com/johannesjo/super-productivity/commit/fdc4d9087506f0065e4fd0f00250d6254d3b86bf))
- **openProject:** spell consistently ([72a4f8a](https://github.com/johannesjo/super-productivity/commit/72a4f8a111233d8650155b9fc813a6493f59ee80))
- remove ios fix for longpress because of issues with scrolling and dragging [#1467](https://github.com/johannesjo/super-productivity/issues/1467) ([f26c39d](https://github.com/johannesjo/super-productivity/commit/f26c39d7529d668da6cf556415cf6b3857793ac6))
- shorten date for quick history days ([020eea6](https://github.com/johannesjo/super-productivity/commit/020eea69f46553985957a5c18766ca224035da3e))
- update t.const ([1f5b6a3](https://github.com/johannesjo/super-productivity/commit/1f5b6a3a54661e00b8c3571d00a523dd2f1bb815))
- use issue icon for update instead of update icon ([998d254](https://github.com/johannesjo/super-productivity/commit/998d25431c0e3e7a1c8402162e3c7593ac5b541c))

### Reverts

- Revert "build: update angular core" ([10124f3](https://github.com/johannesjo/super-productivity/commit/10124f33b729ccbc409a5de9069e5c908169bc98))
- Revert "build(deps-dev): bump @angular-devkit/build-angular" ([1af8b66](https://github.com/johannesjo/super-productivity/commit/1af8b6691e8616660073fb011f0a27b247c10d96))

## [7.5.2](https://github.com/johannesjo/super-productivity/compare/v7.5.1...v7.5.2) (2021-08-27)

### Bug Fixes

- Cannot redefine property: **@ngrx/effects_create** ([45ed9b5](https://github.com/johannesjo/super-productivity/commit/45ed9b54f5d761ec9be8aa68b62ebef8dda2e747))
- devError for reminder ([3d98506](https://github.com/johannesjo/super-productivity/commit/3d98506afe24041a6892b9427807c3eb02436e8d))
- move to today list shortcut not working ([3458b20](https://github.com/johannesjo/super-productivity/commit/3458b2077b6f281f595c13f9d9d209b89fb10bbf))
- open backlog shortcut not working [#1455](https://github.com/johannesjo/super-productivity/issues/1455) ([04000ae](https://github.com/johannesjo/super-productivity/commit/04000ae5f402a6db3644c073905e3c882861a542))
- **pomodoro:** setCurrentTask not working correctly here ([d364eea](https://github.com/johannesjo/super-productivity/commit/d364eea47d8104fcef2a32ad8b5a97d25c4b773b))
- prevent "Editing sub task tags should not be possible" [#1462](https://github.com/johannesjo/super-productivity/issues/1462) ([6d2269f](https://github.com/johannesjo/super-productivity/commit/6d2269f278d14f9e48e63c42383335e8b14deee0))
- problematic project move to today from invalid context [#1461](https://github.com/johannesjo/super-productivity/issues/1461) ([1fa64e2](https://github.com/johannesjo/super-productivity/commit/1fa64e2a49f8d884a0639ec198316ddd0702e634))
- speed up backlog opening [#1455](https://github.com/johannesjo/super-productivity/issues/1455) ([cac285f](https://github.com/johannesjo/super-productivity/commit/cac285f41da5e756bd9f42f46a928aea2e6c66e1))
- task delete/restore not working anymore ([a8bd75b](https://github.com/johannesjo/super-productivity/commit/a8bd75b04637c6bee0a45e5c0f00da6367953e33))
- user-select none not working on safari [#1467](https://github.com/johannesjo/super-productivity/issues/1467) ([9fb4c7e](https://github.com/johannesjo/super-productivity/commit/9fb4c7e052d1e075101bd9b7e7361cf929a8ad3e))
- weird task case error for add task bar ([3c9e36e](https://github.com/johannesjo/super-productivity/commit/3c9e36ec84143b280eec4468925c6ff5883c4274))

### Features

- add possibility to close edit tags dialog with ctrl+enter ([41d868d](https://github.com/johannesjo/super-productivity/commit/41d868dc1c0e396900a9cde1896409cd4fb42655))
- **addTask:** add keyboard shortcut for add to top/bottom ([8c5b08d](https://github.com/johannesjo/super-productivity/commit/8c5b08d73cd352a1835edb45c59a29e363eb9b86))
- **addTask:** improve context message ([83f2f64](https://github.com/johannesjo/super-productivity/commit/83f2f64211aa0675c167bd7aadd690e3ed20320a))
- change timeline icon ([40f2564](https://github.com/johannesjo/super-productivity/commit/40f256456dbf92f276e70d7bbc88cef11ecb6a33))
- **data:** add check for missing sub task data [#1426](https://github.com/johannesjo/super-productivity/issues/1426) ([51f6a5d](https://github.com/johannesjo/super-productivity/commit/51f6a5da022214ee548aa53d64cf731689aba3f6))
- **electron:** improve file download experience [#1470](https://github.com/johannesjo/super-productivity/issues/1470) ([1615de4](https://github.com/johannesjo/super-productivity/commit/1615de4b7a792f8e53f69f64d4786d6017430674))
- improve backlog handling ([f690dfd](https://github.com/johannesjo/super-productivity/commit/f690dfd5181c001d75d71e99bd1cba5f9b6b9c73))
- improve side nav background ([deccaae](https://github.com/johannesjo/super-productivity/commit/deccaae1fff6938d7b6e2f9b02398386f64de411))
- remove storage persistence warning for android ([14b5e9e](https://github.com/johannesjo/super-productivity/commit/14b5e9e1a8b32ce6985d630392935af1c87068de))
- **timeline:** add clock instead of arrows to scheduled tasks for timeline ([d06ffe6](https://github.com/johannesjo/super-productivity/commit/d06ffe6c8a468a170fe29c2ca813f700a7f97e5e))
- update text for loading story points [#1469](https://github.com/johannesjo/super-productivity/issues/1469) ([072a468](https://github.com/johannesjo/super-productivity/commit/072a468d01c778f0ebbf6dcfa14c91d6351c1512))

## [7.5.1](https://github.com/johannesjo/super-productivity/compare/v7.5.0...v7.5.1) (2021-08-16)

### Bug Fixes

- displayWith issue [#1441](https://github.com/johannesjo/super-productivity/issues/1441) [#1445](https://github.com/johannesjo/super-productivity/issues/1445) [#1458](https://github.com/johannesjo/super-productivity/issues/1458) ([50e1ea4](https://github.com/johannesjo/super-productivity/commit/50e1ea4700674f7aba629deec516ab132c7b2f1c))
- **localBackup:** android backup not loading ([3bd0ef6](https://github.com/johannesjo/super-productivity/commit/3bd0ef67af6c3765c1b9bdc42585aad26fd2f27b))
- **localBackup:** android backup not loading 2 ([88dde3a](https://github.com/johannesjo/super-productivity/commit/88dde3aa585f7d668bb5cbb0d158980c01a939dc))

# [7.5.0](https://github.com/johannesjo/super-productivity/compare/v7.5.0-rc.0...v7.5.0) (2021-08-07)

### Bug Fixes

- **project:** unable to edit tag while tracking time [#1428](https://github.com/johannesjo/super-productivity/issues/1428) ([a73b2a9](https://github.com/johannesjo/super-productivity/commit/a73b2a92c2f2fb411d5b2667e56ccce0be9cc6ea))
- **quickHistory:** data not reloading issue ([0d58f85](https://github.com/johannesjo/super-productivity/commit/0d58f85522c7896c8296fc59111bd56e74c1c53d))
- **tag:** unable to edit tag while tracking time [#1428](https://github.com/johannesjo/super-productivity/issues/1428) ([423df64](https://github.com/johannesjo/super-productivity/commit/423df644be7bb42e31452d21066e43960ba1267e))

### Features

- [#1221](https://github.com/johannesjo/super-productivity/issues/1221) remove isAddToBottom defaults ([5a67475](https://github.com/johannesjo/super-productivity/commit/5a674751d66439510b78a0df7eeca8ac65387eb6))
- [#1221](https://github.com/johannesjo/super-productivity/issues/1221) reverse isAddToBottom in project ([9c67831](https://github.com/johannesjo/super-productivity/commit/9c678312445f6ecac710f2b8a9d006358b37975c))
- [#1221](https://github.com/johannesjo/super-productivity/issues/1221) setup for add after currentTaskId ([55a4b2e](https://github.com/johannesjo/super-productivity/commit/55a4b2e19d35fd21de5eab895e91a7be9ccfa2ca))
- [#1221](https://github.com/johannesjo/super-productivity/issues/1221) top icon instead of inline ([fbef9ca](https://github.com/johannesjo/super-productivity/commit/fbef9cab2ca6a5aa4dca6670d15f44aa0c4b9a65))
- [#1221](https://github.com/johannesjo/super-productivity/issues/1221) WIP toggle button for isAddToBottom ([5e28833](https://github.com/johannesjo/super-productivity/commit/5e28833f21920ef509c68f3ee27fa512c4304202))
- add more no sync fields ([862c159](https://github.com/johannesjo/super-productivity/commit/862c159f3973e650ce26054700f545537cbfd1cb))
- **android:** add more initial logging info ([dedb3ca](https://github.com/johannesjo/super-productivity/commit/dedb3caa756ac0e54b4311e8575dff2cbdb07083))
- closes [#1221](https://github.com/johannesjo/super-productivity/issues/1221) finishing comments ([2845eac](https://github.com/johannesjo/super-productivity/commit/2845eacbd26174fa9ed51db67544820fcf61691c))
- **localSync:** add frontend boilerplate [#690](https://github.com/johannesjo/super-productivity/issues/690) ([845c037](https://github.com/johannesjo/super-productivity/commit/845c037e460bc31147e6cc66557ab69ae5f4e444))
- **localSync:** make file sync through local files work [#690](https://github.com/johannesjo/super-productivity/issues/690) ([48644c4](https://github.com/johannesjo/super-productivity/commit/48644c498a049160c8791629e32d1b6f324721e3))
- **localSync:** make sync file path configurable [#690](https://github.com/johannesjo/super-productivity/issues/690) ([a4c8ca0](https://github.com/johannesjo/super-productivity/commit/a4c8ca058b7e92d5a02a6a8e72736591e1dedcec))
- **localSync:** prepare electron interface [#690](https://github.com/johannesjo/super-productivity/issues/690) ([9f2bcd7](https://github.com/johannesjo/super-productivity/commit/9f2bcd751cf0309968196e389ee0c4ff115b4c68))
- make icon consistent ([33bbd96](https://github.com/johannesjo/super-productivity/commit/33bbd9643d75a6099845c494237a6134d42d4648))
- make local only fields work ([2fb3957](https://github.com/johannesjo/super-productivity/commit/2fb39576b79fe7393c893b5b6eba4f561f2f2595))
- **privateLocalData:** outline how to implement [#662](https://github.com/johannesjo/super-productivity/issues/662) ([f27d914](https://github.com/johannesjo/super-productivity/commit/f27d91424916c00d09db1093b5bcf158e0e14bcb))
- **quickHistory:** add boilerplate and make most basic version work ([03ac581](https://github.com/johannesjo/super-productivity/commit/03ac581d3c41d57e6fecbdd9fb84e4ed1e6db49f))
- **quickHistory:** improve data mapping 2 ([c11db92](https://github.com/johannesjo/super-productivity/commit/c11db9238f1f8d005b67082f0208708eff758ca0))
- **quickHistory:** improve data mapping and load larger dataset ([9878b65](https://github.com/johannesjo/super-productivity/commit/9878b65264c2f50a426b45336dd3b4d70a4acbc3))
- **quickHistory:** polish ([ac7d478](https://github.com/johannesjo/super-productivity/commit/ac7d478e987bb44d4e4ddb71fd388df7a13e89e1))
- **quickHistory:** polish 2 ([8a851a7](https://github.com/johannesjo/super-productivity/commit/8a851a771e0c6a6bf1eb62ebd5f62ef1482fd71f))
- **sync:** improve sync return value ([cbd6cb4](https://github.com/johannesjo/super-productivity/commit/cbd6cb4cb3d2cdea81c80f7d6252274f335168da))

# [7.5.0-rc.0](https://github.com/johannesjo/super-productivity/compare/v7.4.1...v7.5.0-rc.0) (2021-07-21)

## [7.4.1](https://github.com/johannesjo/super-productivity/compare/v7.4.0...v7.4.1) (2021-07-21)

### Bug Fixes

- potential displayWidth error ([eb9b57c](https://github.com/johannesjo/super-productivity/commit/eb9b57c3557e364185a1ba7bf4b1c16c23fa409e))

### Features

- **backup:** account for different android app versions ([fde0eaa](https://github.com/johannesjo/super-productivity/commit/fde0eaae14664dc37b4b55238721112d87cb0311))
- **backup:** make frontend work for android backups ([9b6f867](https://github.com/johannesjo/super-productivity/commit/9b6f867967026666d1f1410a04d58c48709675d6))
- **backup:** make loading data work ([3526a1d](https://github.com/johannesjo/super-productivity/commit/3526a1ddb74e76c0aa6bb749ac8f534f99d7b966))
- **backup:** make saving data work ([1f1ec1e](https://github.com/johannesjo/super-productivity/commit/1f1ec1eef71740ae16004b582721873585a83b0b))

# [7.4.0](https://github.com/johannesjo/super-productivity/compare/v7.3.3...v7.4.0) (2021-07-20)

### Bug Fixes

- **sync:** missing code_challenge_method for google sync [#1394](https://github.com/johannesjo/super-productivity/issues/1394) ([3ef6429](https://github.com/johannesjo/super-productivity/commit/3ef6429c74e6c2a12c5959e0421795572181f0e5))
- type error ([58f3b0d](https://github.com/johannesjo/super-productivity/commit/58f3b0df0bb8fb530fa43746098b368fa82b94fa))
- type error ([d769da7](https://github.com/johannesjo/super-productivity/commit/d769da77d421a41b2f1bffb08473261db62f0426))

### Features

- **jira:** improve invalid data handling [#1393](https://github.com/johannesjo/super-productivity/issues/1393) ([6c83e62](https://github.com/johannesjo/super-productivity/commit/6c83e62d1e38b707a9670e9c03509b543929f515))
- **timeline:** move parent task when sub task is moved to top for timeline ([7a26247](https://github.com/johannesjo/super-productivity/commit/7a262472411d6655b664bea45694027fcd9fd4f4))
- auto focus edit tag dialog ([6cc3e01](https://github.com/johannesjo/super-productivity/commit/6cc3e019473ff984d0508cd29460d197bacdf6f6))
- check import data always [#1390](https://github.com/johannesjo/super-productivity/issues/1390) ([d77ed33](https://github.com/johannesjo/super-productivity/commit/d77ed33ca43568f069d159e1aea57d02dd811747))
- don't go to planning mode, if there are any tasks left ([a7d43c1](https://github.com/johannesjo/super-productivity/commit/a7d43c1ad3ed85d0320695cda7280f40482d2e88))
- don't show reminder dialog while add task bar is open ([308b201](https://github.com/johannesjo/super-productivity/commit/308b201f3d4de0d4465b1e8d26c7ba8ad7500d9d))
- make move task down work better when there are done tasks ([03c95a9](https://github.com/johannesjo/super-productivity/commit/03c95a9777ea99e3a25f1fcffac092c902afc7d3))
- make move task up work better when there are done tasks ([6b9d728](https://github.com/johannesjo/super-productivity/commit/6b9d728c42f35dfbcfeaca83470478170c91c5f2))
- make move task up/down in backlog work better when there are done tasks ([21b4df3](https://github.com/johannesjo/super-productivity/commit/21b4df3ab58996b3e13fa30c47f221492f0e59ba))
- **dailySummary:** add total estimate to daily summary plan ([12dec18](https://github.com/johannesjo/super-productivity/commit/12dec189375fd955e384bb42f5785726ef9d24d8))
- **reminder:** allow for unschedule toasts to be skipable ([2622e8f](https://github.com/johannesjo/super-productivity/commit/2622e8f5598ebc942e890ce0296d4a0a9469de7f))
- **reminder:** remove reminder if set to standard schedule time on add for tomorrow button ([4db08ba](https://github.com/johannesjo/super-productivity/commit/4db08ba613be999b2dabba6fec947b1a21832e83))
- **task:** make task move up via keyboard more reliable ([5c90e41](https://github.com/johannesjo/super-productivity/commit/5c90e412c0c2e45c011332c2704a5cec877b5f5d))
- **timeline:** add minimal fade in ani ([141258f](https://github.com/johannesjo/super-productivity/commit/141258fc3cb877c18d27c541204be4900c58f799))
- **timeline:** focus task after moving it ([78213dd](https://github.com/johannesjo/super-productivity/commit/78213dd25dfd9f5a1659db74ef204c0e9346d898))
- **timeline:** make first simple up and down buttons work ([ef14f66](https://github.com/johannesjo/super-productivity/commit/ef14f6688c7183b4937837886c5bbc490b34d34c))

## [7.3.3](https://github.com/johannesjo/super-productivity/compare/v7.3.1...v7.3.3) (2021-07-13)

### Bug Fixes

- **sync:** pre sync check for missing lastLocalSyncModelChange ([8905964](https://github.com/johannesjo/super-productivity/commit/89059641baa6a354615beeb0e094d1cb8fcd49b5))
- lint ([48da7d8](https://github.com/johannesjo/super-productivity/commit/48da7d89abce214886b89565c1b09c364728dc7d))

### Features

- **sync:** add visible error for "No lastLocalSyncModelChange" ([c75adf4](https://github.com/johannesjo/super-productivity/commit/c75adf40a488e6a0f31d840cc706ead47d33fcfc))
- **sync:** correcter model for lastLocalSyncModelChange ([a8e4a03](https://github.com/johannesjo/super-productivity/commit/a8e4a035dd57bac4d21760eee4c86ea8b1f08858))

## [7.3.2](https://github.com/johannesjo/super-productivity/compare/v7.3.1...v7.3.2) (2021-07-13)

### Bug Fixes

- lint ([48da7d8](https://github.com/johannesjo/super-productivity/commit/48da7d89abce214886b89565c1b09c364728dc7d))

## [7.3.1](https://github.com/johannesjo/super-productivity/compare/v7.3.0...v7.3.1) (2021-07-12)

### Bug Fixes

- **sync:** syncing only broken data bug ([72334d2](https://github.com/johannesjo/super-productivity/commit/72334d2064dd1d4a3848b6d01f957d898808ca23))

# [7.3.0](https://github.com/johannesjo/super-productivity/compare/v7.3.0-rc.0...v7.3.0) (2021-07-12)

### Bug Fixes

- **pomodoro:** tick sound every half second rather than every second ([067e515](https://github.com/johannesjo/super-productivity/commit/067e51539c162c74ffc07b7d89e53dad415900c5))
- **sync:** prevent repeat task creation while syncing ([9350907](https://github.com/johannesjo/super-productivity/commit/935090764f0b7e4c13ecdb30f5111872a0891adf))
- wrong text ([494d9a5](https://github.com/johannesjo/super-productivity/commit/494d9a582ba29f851bd999bf5b77d7fff7c004f4))
- **sync:** google sync file creation triggered even when syncing is disabled ([dfc666e](https://github.com/johannesjo/super-productivity/commit/dfc666e271e1b36a60b5ac4efca50d03bef37db5))

### Features

- improve persistence error handling ([cb2a8cf](https://github.com/johannesjo/super-productivity/commit/cb2a8cf4f443965f03aca823dc1c8fe4d1f30e33))
- **dailySummary:** add all planned to tomorrow buttons to plan section ([ecda0c5](https://github.com/johannesjo/super-productivity/commit/ecda0c5b2268b3a58f45c4a45df57ae3d23d49b8))
- **error:** allow to directly export user data from error dialog ([49ba469](https://github.com/johannesjo/super-productivity/commit/49ba4697c50e89ec3627ea1ad64d805c90093023))
- hide import project button for now ([de6e3a9](https://github.com/johannesjo/super-productivity/commit/de6e3a962bfc5320597978310df6d10351a10354))

# [7.3.0-rc.0](https://github.com/johannesjo/super-productivity/compare/v7.2.1...v7.3.0-rc.0) (2021-07-08)

### Bug Fixes

- lint ([4b70606](https://github.com/johannesjo/super-productivity/commit/4b70606da30135598533f9e0d36a5feaf345384d))
- type error ([212c466](https://github.com/johannesjo/super-productivity/commit/212c4667caac2ea3f8fdcb86eecbbf3a378da763))
- typing issue ([2d97e98](https://github.com/johannesjo/super-productivity/commit/2d97e98ba64ceeb2534db7dd2d2e56b79162d73c))
- **electron:** minimize to tray stopping time tracking [#887](https://github.com/johannesjo/super-productivity/issues/887) ([a93bf8e](https://github.com/johannesjo/super-productivity/commit/a93bf8ef83ad3f2fd07864eaa70118bad2d5fa66))
- **search:** can't read property 'icon' of undefined [#1325](https://github.com/johannesjo/super-productivity/issues/1325) ([0a8a80e](https://github.com/johannesjo/super-productivity/commit/0a8a80e4496f7bfed538577896256ac6e9203012))
- **sync:** seeing "trying to upload invalid data" to often ([7488c27](https://github.com/johannesjo/super-productivity/commit/7488c279424a2613f231b6193307b4de4e18cd0a))

### Features

- **sync:** add success snack for sync button ([c0e5eab](https://github.com/johannesjo/super-productivity/commit/c0e5eab18a0069aa8c2dbf749cf439d12d31c582))
- improve handling for InvalidStateError [#1323](https://github.com/johannesjo/super-productivity/issues/1323) [#398](https://github.com/johannesjo/super-productivity/issues/398) ([05fc3b7](https://github.com/johannesjo/super-productivity/commit/05fc3b7aabf2bab5e858b5a249fe7fedc746b3c5))
- improve invalid state error handling ([ac29711](https://github.com/johannesjo/super-productivity/commit/ac29711c48b52f3ed663b450492ded30411fd4b0))
- improve reminder handling ([fd69dec](https://github.com/johannesjo/super-productivity/commit/fd69dec94ec13ab9cd40fd8c6d8f96a2c4f20861))
- **caldav:** add info about whitelisting [#1192](https://github.com/johannesjo/super-productivity/issues/1192) ([850c518](https://github.com/johannesjo/super-productivity/commit/850c5183e6f0eea5fd32e77cf8722c6cf4f530af))
- **mobile:** add spinning animation for sync button ([80443b9](https://github.com/johannesjo/super-productivity/commit/80443b9de09f256f2af358414f28e53ddb46c174))
- **mobile:** add sync now button ([f0c1f17](https://github.com/johannesjo/super-productivity/commit/f0c1f17676e4157f830a54e38e03762088c3fc8f))
- **repeat:** don't mark repeatable task as done, if it is the current task ([9eae207](https://github.com/johannesjo/super-productivity/commit/9eae20744c882bf3dd982308ac874f8a1a0f8f5f))
- **schedule:** add mark as done in task reminder dialog ([3e68ce5](https://github.com/johannesjo/super-productivity/commit/3e68ce573dc68c32c51a998e7a489404d3fb289d))
- **schedule:** show sync button as soon as sync is enabled ([b0697a1](https://github.com/johannesjo/super-productivity/commit/b0697a13ab58d8eb96a0c55d5788ca4d9e07ea7e))
- **tag:** save tag order when sorting via drag and rop [#1360](https://github.com/johannesjo/super-productivity/issues/1360) ([b726fa1](https://github.com/johannesjo/super-productivity/commit/b726fa1ef6df6b3227cdebfe3b75cbe52e299b46))
- extend is touch only with android web view ([06b9142](https://github.com/johannesjo/super-productivity/commit/06b9142384af91b2b7863e76b0cb595e432b1a55))
- make new pkce work for dropbox ([4ba785f](https://github.com/johannesjo/super-productivity/commit/4ba785fe44499f455830f881c9cb1f72c6e50fb1))
- make new pkce work for dropbox and google ([a65401f](https://github.com/johannesjo/super-productivity/commit/a65401f44848e4c02fe075437d4f8153307290b5))
- pkce1 ([dfc414d](https://github.com/johannesjo/super-productivity/commit/dfc414d3a206f4db3109360428306eb9cc4f152f))
- prepare sass migration ([797ae89](https://github.com/johannesjo/super-productivity/commit/797ae894faf1c426a978b712e2c6e816121923d6))
- **timeline:** add explanation for repeat task projections ([c1be58f](https://github.com/johannesjo/super-productivity/commit/c1be58f9df8fe40aa3f4e0fe9f68297971882a1f))

## [7.2.1](https://github.com/johannesjo/super-productivity/compare/v7.2.0...v7.2.1) (2021-06-27)

### Features

- **data:** add repair script for missing reminder data ([9825abc](https://github.com/johannesjo/super-productivity/commit/9825abccd16ff7def49189895ae895b3e68a6ea4))
- **data:** check if reminder data exists ([cf0d98c](https://github.com/johannesjo/super-productivity/commit/cf0d98c5d6d3a31307e0142921e20136d54891bd))

# [7.2.0](https://github.com/johannesjo/super-productivity/compare/v7.1.0...v7.2.0) (2021-06-27)

### Bug Fixes

- **repeat:** code formatting ([c3aa707](https://github.com/johannesjo/super-productivity/commit/c3aa70769c4844e24f1b3b77ade646db52ad8c5c))
- **repeat:** don't remove reminders on repeated task creation ([2a44197](https://github.com/johannesjo/super-productivity/commit/2a44197ae0981c8c3443ad085d32d5d7f106805d))
- **repeat:** schedule date for repeating tasks scheduled in the future ([f85fe69](https://github.com/johannesjo/super-productivity/commit/f85fe69a92dcf55a0f8bc4d24a50679104dd09c3))
- **repeat:** schedule from additional info ([be862da](https://github.com/johannesjo/super-productivity/commit/be862dae9ee789870b14836c7023515f15f4f2fe))
- **schedule:** plannedAt shown wrongly ([4d05ffa](https://github.com/johannesjo/super-productivity/commit/4d05ffa0c2ce841b4a6432a7e219e948703f7f6e))

### Features

- **dropbox:** get token via dialog ([6712bfb](https://github.com/johannesjo/super-productivity/commit/6712bfbf8b30bb16fb1360215620141faa6b0737))
- **dropbox:** improve getting token via dialog ([4b802ff](https://github.com/johannesjo/super-productivity/commit/4b802ffc3a4d12cc07bcb9ac564312fb59a7ffe0))
- **repeat:** add confirm dialog when trying to schedule repeated task for another day ([68147e0](https://github.com/johannesjo/super-productivity/commit/68147e02817081f299397cacc9f014011fc554d9))
- **repeat:** add model migration ([bafb6d7](https://github.com/johannesjo/super-productivity/commit/bafb6d76f02110e48c8f8b549e1fc7baa61baf15))
- **repeat:** add start time field to form ([1a39817](https://github.com/johannesjo/super-productivity/commit/1a398175b8558afcd82636d2990d85d26cca6a5d))
- **repeat:** allow creation of repeatable tasks for tomorrow via button ([2cace33](https://github.com/johannesjo/super-productivity/commit/2cace33a06516218691a64e8f2728ff6a6e1c59e))
- **repeat:** allow for editing reminder on repeatable task ([23ab3c6](https://github.com/johannesjo/super-productivity/commit/23ab3c6b9ca0d2992777378e7d0375ec43cb6178))
- **repeat:** also make remind at configurable ([f3ffc81](https://github.com/johannesjo/super-productivity/commit/f3ffc81586e95f1be1273361c6ed2ad3f431ff93))
- **repeat:** make create for tomorrow work for repeatable tasks ([b964436](https://github.com/johannesjo/super-productivity/commit/b9644365d560cef9524139c4a03f4ce058a0272e))
- **repeat:** make creating repeating tasks with reminder work ([1258f75](https://github.com/johannesjo/super-productivity/commit/1258f75b0ff984821c208e5fb41613f3fcb47ad3))
- **schedule:** also allow for move to backlog when editing task reminder [#1283](https://github.com/johannesjo/super-productivity/issues/1283) ([ae166ad](https://github.com/johannesjo/super-productivity/commit/ae166ad101a51a1317cbb956521c0503d89ff36c))
- **task:** improve error handling for reducer ([29646cd](https://github.com/johannesjo/super-productivity/commit/29646cdcc33d855c4f35fdddeecd6d2ad7be8c25))
- **task:** remove redundant restore task button ([5660ceb](https://github.com/johannesjo/super-productivity/commit/5660ceb248fd2cdf68e7e995d737962da6a990e1))
- **timeline:** add selector for task repeat for timeline ([236213c](https://github.com/johannesjo/super-productivity/commit/236213c8247fb006fad88f25bf97c0c590f71846))
- **timeline:** improve styling for repeat task projection ([b9bc165](https://github.com/johannesjo/super-productivity/commit/b9bc16596667ecd7878584b33ac579a1470fc9fb))
- **timeline:** make projections work for repeatable tasks ([b801891](https://github.com/johannesjo/super-productivity/commit/b801891fbd91db3e682b2ad73d3c245bc59c9a95))

# [7.1.0](https://github.com/johannesjo/super-productivity/compare/v7.0.4...v7.1.0) (2021-06-19)

## [7.0.4](https://github.com/johannesjo/super-productivity/compare/v7.0.2...v7.0.4) (2021-06-18)

### Bug Fixes

- change automatic translation of the 'Remote' word ([55f8b5a](https://github.com/johannesjo/super-productivity/commit/55f8b5a0e6e9892506771576df2306e12c129566))
- **search:** add info text ([2b4b06e](https://github.com/johannesjo/super-productivity/commit/2b4b06e7d203efd95c41fcb3024d309ff9e2a0b6))
- **search:** fix \_getArchivedDate() ([b53c0f9](https://github.com/johannesjo/super-productivity/commit/b53c0f97056e5bb1cb00b4270c6172febe064e9e))
- **search:** fix mobile autocomplete list ([da67484](https://github.com/johannesjo/super-productivity/commit/da67484f31dd7003f28dfbb5a64ecbea281875df))
- **search:** fix mobile highlighting ([3634323](https://github.com/johannesjo/super-productivity/commit/3634323f2185d64e4cf9cfe0ff748bd7c2bcb950))
- **search:** fix search icon and config version ([11ae5e4](https://github.com/johannesjo/super-productivity/commit/11ae5e4502671eb04f13e9497af73b99a6b75106))
- **search:** minor changes ([91aace2](https://github.com/johannesjo/super-productivity/commit/91aace26ec1e91e60d9089c5af8481a74cb3a7b4))

### Features

- **repeat:** always add today tag per default to repeating tasks ([988f03f](https://github.com/johannesjo/super-productivity/commit/988f03fdfd4b5dea54b8c02cc0994a84ddfbc6a7))
- **repeat:** create repeatable tasks right away [#1297](https://github.com/johannesjo/super-productivity/issues/1297) ([7df2202](https://github.com/johannesjo/super-productivity/commit/7df2202df25184db671e1b143f6b2136164d9038))
- **repeat:** mark existing task instances as done rather than copying them to the archive [#1297](https://github.com/johannesjo/super-productivity/issues/1297) ([a6bfcd9](https://github.com/johannesjo/super-productivity/commit/a6bfcd9f3dd03964e30d42b38591064dce2cd3df))
- double inMemoryComplete debounceTime ([5f22df2](https://github.com/johannesjo/super-productivity/commit/5f22df2396a2dea55c01b4f5e690ff56416c718a))
- shorten error model string ([c643eb7](https://github.com/johannesjo/super-productivity/commit/c643eb763bd026a73be63e6cc3fc1bba51a65dc9))
- update migration for task archive ([cae3353](https://github.com/johannesjo/super-productivity/commit/cae3353473b2b3bfc59279b14c5fd58e033d2077))
- **search:** add search bar [#547](https://github.com/johannesjo/super-productivity/issues/547) ([36ff649](https://github.com/johannesjo/super-productivity/commit/36ff649bb589dc39becdae2b4e588175265c70dc))
- **search:** allow switching to archived tasks ([c50c7bf](https://github.com/johannesjo/super-productivity/commit/c50c7bf0d5cc9784c1bda774cdf6deff490dbee8))

## [7.0.3](https://github.com/johannesjo/super-productivity/compare/v7.0.2...v7.0.3) (2021-06-11)

## [7.0.2](https://github.com/johannesjo/super-productivity/compare/v7.0.1...v7.0.2) (2021-06-11)

### Bug Fixes

- **task:** don't show task focus border on touch devices ([9f4abf9](https://github.com/johannesjo/super-productivity/commit/9f4abf9ae0df73df35c43cb885c65ce5fb682fb7))
- crash when sub task is added via "planned-for-tomorrow" button ([bbb41c2](https://github.com/johannesjo/super-productivity/commit/bbb41c2ee1748c0c87b29d09dc66d9d280ec8d95))
- duplicate tasks when child and parent are scheduled ([2cad17a](https://github.com/johannesjo/super-productivity/commit/2cad17ad62e92a6c1961229ba4a259f77f08c108))
- initial sync error showing up when sync is disabled ([f067893](https://github.com/johannesjo/super-productivity/commit/f0678934f864435a2a2fca3b8463a852cd21ab3d))
- wrong label for remind at ([725cb35](https://github.com/johannesjo/super-productivity/commit/725cb353b3506ad15d6a5d94c8854804dfc02ff1))

### Features

- add ripple effects to task info panel ([78df119](https://github.com/johannesjo/super-productivity/commit/78df1196ec25c07ab380e28bd35bb732037de16b))
- hide more hover/focus styles for mobile ([3e34581](https://github.com/johannesjo/super-productivity/commit/3e34581c954b57aa468575b859021035b88ab183))
- migrate tslint noUnusedLocals to eslint rule as it is annoying ([d23d69f](https://github.com/johannesjo/super-productivity/commit/d23d69fd0d888689018edd38123d8b2eb4b98cd1))
- unschedule when task is marked as done ([cf1b470](https://github.com/johannesjo/super-productivity/commit/cf1b470b0b73ceddd886775a74e345366af5bbe3))
- **TaskBar:** Add indeterminate state for tasks with no time estimate ([0321055](https://github.com/johannesjo/super-productivity/commit/0321055efe4d3d947afcec522781989839e26c64))

## [7.0.1](https://github.com/johannesjo/super-productivity/compare/v7.0.0...v7.0.1) (2021-06-04)

### Bug Fixes

- indicator throwing error when task is not found ([55551ae](https://github.com/johannesjo/super-productivity/commit/55551ae5f4bf6ccf725b2f47c81b836b170422d8))
- indicator throwing error when task is not found ([bb5122a](https://github.com/johannesjo/super-productivity/commit/bb5122a1a2d25e7ff9d295dfd994e5bfb831b6ea))
- tag deletion not working anymore [#1264](https://github.com/johannesjo/super-productivity/issues/1264) ([bd13e26](https://github.com/johannesjo/super-productivity/commit/bd13e26d1ebbab6859e1860bd149032f55bb6872))

### Features

- **timeline:** improve mobile styles ([026c165](https://github.com/johannesjo/super-productivity/commit/026c165ce9d3567daa983dd235cc0e086df2c0f2))

# [7.0.0](https://github.com/johannesjo/super-productivity/compare/v7.0.0-rc16...v7.0.0) (2021-06-01)

### Bug Fixes

- **webdav:** remove no etag error and make rev generation more flexible [#1246](https://github.com/johannesjo/super-productivity/issues/1246) ([3197cc8](https://github.com/johannesjo/super-productivity/commit/3197cc826ad7e40270492a71edf7fa35fbd0fbc1))
- missing unsubscribe ([a5347da](https://github.com/johannesjo/super-productivity/commit/a5347da345beaaa64d59ad4f79f63c1bda914611))

### Features

- **log:** adjust ([0eea36b](https://github.com/johannesjo/super-productivity/commit/0eea36b715a3840775984d66e176cbd1a7d78c62))
- **perf:** get rid of unncessary subscription ([0f86513](https://github.com/johannesjo/super-productivity/commit/0f86513d34780d6239575783a81092bd1b502682))
- **task:** additional performance tweak ([84fa489](https://github.com/johannesjo/super-productivity/commit/84fa489cc5071be58b850e03db82f48cb7548e8c))
- **task:** improve mat-menu performance ([2ba1735](https://github.com/johannesjo/super-productivity/commit/2ba1735a1793f2b9880686323a974e9f1360f9e8))
- **task:** only render hover controls when hovered ([0ba5374](https://github.com/johannesjo/super-productivity/commit/0ba5374635b4a8e25e658398c61692612bcc6b5b))
- **task:** remove not needed optional chaining ([9e7dfce](https://github.com/johannesjo/super-productivity/commit/9e7dfce5901adc26fae83d00dd3fcdeeb4741986))
- improve mat-menu performance everywhere ([d6d243d](https://github.com/johannesjo/super-productivity/commit/d6d243db4edfa31eebb7f3062dc503462c3c1b41))

# [7.0.0-rc16](https://github.com/johannesjo/super-productivity/compare/v7.0.0-rc15...v7.0.0-rc16) (2021-05-25)

### Bug Fixes

- migration script not working as intended ([6bbc7bc](https://github.com/johannesjo/super-productivity/commit/6bbc7bc94770380d9ae003a075caa44ea34be375))
- missing migrations for task archive ([9512aac](https://github.com/johannesjo/super-productivity/commit/9512aac6b1f00e64b3992c411c16409f7807e73b))

### Features

- **electron:** improve logging ([afca80f](https://github.com/johannesjo/super-productivity/commit/afca80f0b7d5b1f65aafc3a4a42aa414f7803d0a))
- **idle:** Flash taskbar when idle dialog pops out ([7f18245](https://github.com/johannesjo/super-productivity/commit/7f182456ce385421299743a6d05f0bad0fbeaee7))

# [7.0.0-rc15](https://github.com/johannesjo/super-productivity/compare/v7.0.0-rc14...v7.0.0-rc15) (2021-05-23)

### Bug Fixes

- **task:** delete focus behaviour ([96e2d70](https://github.com/johannesjo/super-productivity/commit/96e2d70b1d16a46173cc534663bc97ec2deba244))
- error for special schedule task case ([904f0f9](https://github.com/johannesjo/super-productivity/commit/904f0f946d02455fefd3fb4135a3a80e2300b810))

### Features

- **dailySummary:** hide add note for evaluation sheet from today ([a29cd46](https://github.com/johannesjo/super-productivity/commit/a29cd46d17a2a5f53886fae2dfdb466d3ecfeaab))
- add new motivational message ([4a68767](https://github.com/johannesjo/super-productivity/commit/4a687677695f6ca2a5184fe606d3e3a784fefd72))
- also add planned task buttons to daily summary ([3f7e499](https://github.com/johannesjo/super-productivity/commit/3f7e499600d1bb28b9ea9335246a090b5ad2fe1d))
- improve text ([45549cd](https://github.com/johannesjo/super-productivity/commit/45549cd56f98e2acfc9f5e8352fec7c8ebf9d09b))
- **metrics:** make it work for today tag and add link ([dd0f9e4](https://github.com/johannesjo/super-productivity/commit/dd0f9e437274e8872a51ee92c17f92e75869ef14))
- improve config migrate script ([8a58030](https://github.com/johannesjo/super-productivity/commit/8a580308d35c757b8e07ff9fec05e8a41df89647))

# [7.0.0-rc14](https://github.com/johannesjo/super-productivity/compare/v7.0.0-rc13...v7.0.0-rc14) (2021-05-21)

### Bug Fixes

- **timeline:** prevent tag initial animation ([a3d83ef](https://github.com/johannesjo/super-productivity/commit/a3d83efbd30c8b28264a163e2ffc5a728eaafd85))
- hide mac only option for non mac systems [#1223](https://github.com/johannesjo/super-productivity/issues/1223) ([d7c1c22](https://github.com/johannesjo/super-productivity/commit/d7c1c223c279ff9d1484ea3ecd9ee064564934d4))

### Features

- **i18n:** update basic translations ([5dc8f96](https://github.com/johannesjo/super-productivity/commit/5dc8f96dd8c388a24ae26502fe4370c0a5f01f89))
- **tags:** disable animations for better performance ([97d8555](https://github.com/johannesjo/super-productivity/commit/97d85555eb284b4013d018fd8cde227e92c0f8fd))
- **webDav:** slightly improve ([bd04dc6](https://github.com/johannesjo/super-productivity/commit/bd04dc6c2a63fc3c93df4b058ef3b8a1a483a87f))
- add real types for webdav lib ([06e3524](https://github.com/johannesjo/super-productivity/commit/06e3524be983eeb0474397404a6833498e1cef4a))
- **logs:** disable electron log from frontend completely ([c341d88](https://github.com/johannesjo/super-productivity/commit/c341d88261db5356a542016a9b9dd15a003cfc4d))
- **logs:** only log errors via electron logger for now ([6062bc7](https://github.com/johannesjo/super-productivity/commit/6062bc7c55efcf8a08f32665ec4367795876d16f))
- prepare privacy export ([bc3d2d7](https://github.com/johannesjo/super-productivity/commit/bc3d2d784074e5506c6a0f6e59471e04f8394bb4))
- **timeline:** beautify day crossing and move week day indication ([c1abb5e](https://github.com/johannesjo/super-productivity/commit/c1abb5e5690047108fdb6cb3f53f96fcac65aea6))
- **timeline:** improve animation by increasing debounceTime ([ca768e2](https://github.com/johannesjo/super-productivity/commit/ca768e294120256c0924275aa2ffd91ce928fb15))
- **workView:** add basic add all scheduled for today button ([74d5930](https://github.com/johannesjo/super-productivity/commit/74d593061b9d39f08f473c1d5829018ba0ad1c08))
- **workView:** add planned for tomorrow button as well ([75e0a66](https://github.com/johannesjo/super-productivity/commit/75e0a6626a843ddc67520469cb9dfcebeaa5c291))
- **workView:** add translations ([9a493b7](https://github.com/johannesjo/super-productivity/commit/9a493b7c03405d39bdbe8a144b011d0876d0b86d))
- **workView:** limit add planned tasks to today work context ([52e8be3](https://github.com/johannesjo/super-productivity/commit/52e8be3cd9c317c671275e7b200bae516ae41d56))
- use tooltip for non mac systems [#1223](https://github.com/johannesjo/super-productivity/issues/1223) ([e24cb84](https://github.com/johannesjo/super-productivity/commit/e24cb84b5d4798e19e2d6b3875f5946c9c3c90f7))

# [7.0.0-rc13](https://github.com/johannesjo/super-productivity/compare/v7.0.0-rc12...v7.0.0-rc13) (2021-05-18)

### Features

- **pomodoro:** Added pause status for windows taskbar ([7fb8087](https://github.com/johannesjo/super-productivity/commit/7fb80878e8e1948704e3aee8ef2e2f43a7c792f4))

# [7.0.0-rc12](https://github.com/johannesjo/super-productivity/compare/v7.0.0-rc11...v7.0.0-rc12) (2021-05-18)

# [7.0.0-rc11](https://github.com/johannesjo/super-productivity/compare/v7.0.0-rc10...v7.0.0-rc11) (2021-05-17)

### Bug Fixes

- **caldav:** issues imported multiple times [#1021](https://github.com/johannesjo/super-productivity/issues/1021) ([550f730](https://github.com/johannesjo/super-productivity/commit/550f73052d39aca177f13fe981ae740acf9e3b2e))
- **github:** issues imported multiple times [#1021](https://github.com/johannesjo/super-productivity/issues/1021) ([fc6356e](https://github.com/johannesjo/super-productivity/commit/fc6356e988576b1428ba63d6f7f71ee8d5ba0b52))
- **repeat:** cannot save repeating task config after deleting default estimate ([73c16af](https://github.com/johannesjo/super-productivity/commit/73c16afb9a1fa7136f086c023e4ee1aef503307b))

### Features

- log to file for production ([67e2752](https://github.com/johannesjo/super-productivity/commit/67e2752303227a0a67692b18ae52328effd9cce4))
- **github:** import issues ordered ([043786a](https://github.com/johannesjo/super-productivity/commit/043786a65c550b764bcd1d9202370b2917a41113))
- improve and simplify banner animation ([b62c61b](https://github.com/johannesjo/super-productivity/commit/b62c61bba46cfc991a043d290f5e990582a030e6))

# [7.0.0-rc10](https://github.com/johannesjo/super-productivity/compare/v7.0.0-rc9...v7.0.0-rc10) (2021-05-16)

# [7.0.0-rc9](https://github.com/johannesjo/super-productivity/compare/v7.0.0-rc8...v7.0.0-rc9) (2021-05-16)

# [7.0.0-rc8](https://github.com/johannesjo/super-productivity/compare/v7.0.0-rc7...v7.0.0-rc8) (2021-05-16)

# [7.0.0-rc7](https://github.com/johannesjo/super-productivity/compare/v7.0.0-rc6...v7.0.0-rc7) (2021-05-16)

# [7.0.0-rc6](https://github.com/johannesjo/super-productivity/compare/v7.0.0-rc5...v7.0.0-rc6) (2021-05-16)

### Features

- **reminder:** properly reset plannedAt whenever it makes sense ([7cb38b0](https://github.com/johannesjo/super-productivity/commit/7cb38b04b4283754fc199a213d9fa5fe681cc360))
- **timeline:** make resorting for current work better ([e132c94](https://github.com/johannesjo/super-productivity/commit/e132c9406c6b05ca539ab080eb1eb7afea85c358))
- add more debug info ([f2bab63](https://github.com/johannesjo/super-productivity/commit/f2bab63041abb966ab299a98ce6780e46c7a2122))
- **scheduled:** bring back scheduled page for now ([97d619e](https://github.com/johannesjo/super-productivity/commit/97d619e0897850408b7fde3985554833bb1efd4f))
- **timeline:** show time only for first entry with time ([5193522](https://github.com/johannesjo/super-productivity/commit/519352261523bc1609806e08dbc875115aa2f0f7))

# [7.0.0-rc5](https://github.com/johannesjo/super-productivity/compare/v7.0.0-rc4...v7.0.0-rc5) (2021-05-16)

# [7.0.0-rc4](https://github.com/johannesjo/super-productivity/compare/v7.0.0-rc3...v7.0.0-rc4) (2021-05-15)

# [7.0.0-rc3](https://github.com/johannesjo/super-productivity/compare/v7.0.0-rc2...v7.0.0-rc3) (2021-05-15)

# [7.0.0-rc2](https://github.com/johannesjo/super-productivity/compare/v7.0.0-rc1...v7.0.0-rc2) (2021-05-15)

### Features

- **task:** make time badge position consistent ([fc0ac7f](https://github.com/johannesjo/super-productivity/commit/fc0ac7f46192304e56d3b516d53c351f4a1604a3))
- **task:** move scheduled alarm clock always to the right ([c74c7fd](https://github.com/johannesjo/super-productivity/commit/c74c7fd724b8cbb8442dedf1bf918261bdb23ccd))
- hide scheduled from the menu for now ([15e2e89](https://github.com/johannesjo/super-productivity/commit/15e2e8981b72dd8d89ff14126a699feb1b5824cc))

# [7.0.0-rc1](https://github.com/johannesjo/super-productivity/compare/v6.5.2...v7.0.0-rc1) (2021-05-15)

### Bug Fixes

- **metric:** broken migration when there are multiple entries for the same day ([76ca97c](https://github.com/johannesjo/super-productivity/commit/76ca97c77b77ec9e745236a3c7bd17e04b0bdd81))
- **metric:** broken test [#520](https://github.com/johannesjo/super-productivity/issues/520) ([b07588d](https://github.com/johannesjo/super-productivity/commit/b07588dfb5b280543e6380bcad97971ff9b3c7e0))
- **timeline:** add missing module ([290cfe0](https://github.com/johannesjo/super-productivity/commit/290cfe02748d0c16c04bd6049d904849156c3e6d))
- **timeline:** better selection of timeline tasks ([5ed4384](https://github.com/johannesjo/super-productivity/commit/5ed4384ded2da475a576aed740f3041d1e2e9456))
- **timeline:** breaking when there are far away scheduled tasks ([a753af0](https://github.com/johannesjo/super-productivity/commit/a753af03dcf2d2283481c3091059e915fa19f4cd))
- **timeline:** cannot set property of time error ([4062949](https://github.com/johannesjo/super-productivity/commit/406294987a7a8ffb0a47b2fa47ac709b7244d7f7))
- **timeline:** create blocker blocks not doing it recursively ([cef0203](https://github.com/johannesjo/super-productivity/commit/cef0203a52343491c1848cacc755cf4a0a52a2a0))
- **timeline:** new special edge case ([ee0241c](https://github.com/johannesjo/super-productivity/commit/ee0241c13eed1d093f5166b36c3a0b4f5c13f2c4))
- **timeline:** no scheduled sub tasks ([6ca71f7](https://github.com/johannesjo/super-productivity/commit/6ca71f7a126fc1721e607c1f0a97bffcf0348c82))
- **timeline:** problem with remaining time on scheduled tasks ([5c3ec88](https://github.com/johannesjo/super-productivity/commit/5c3ec88bc3cd7650c4cb7cb0c71f76ffc8fffe2a))
- **timeline:** quickfix for error when marking current as done ([821feb0](https://github.com/johannesjo/super-productivity/commit/821feb020b08da51f9b7edbe2395500b2cf1dd28))
- **timeline:** showing done tasks ([3f1cba5](https://github.com/johannesjo/super-productivity/commit/3f1cba5edbd26f26fad238994c52e5de8878efac))
- **timeline:** task info panel animating on route change ([a437ec5](https://github.com/johannesjo/super-productivity/commit/a437ec5431d2cd5c86a4b1891ab4a0315d72d132))
- **timeline:** task selection still being wrong ([0c7345b](https://github.com/johannesjo/super-productivity/commit/0c7345bbf099e3b83da5da221b3e1754e64cb0b4))
- disable failing unit tests on server for now ([9b4868a](https://github.com/johannesjo/super-productivity/commit/9b4868ae85d3b504f9b4b5e8befbf1c1504cfa09))
- get rid of scss deprecation warnings ([73959c6](https://github.com/johannesjo/super-productivity/commit/73959c6542b46cf402263a2c10530d794e660a96))
- hide do not show reminder option ([e5c5c8a](https://github.com/johannesjo/super-productivity/commit/e5c5c8aeffbe56906573e8a869416df99660f16e))
- lint ([f374982](https://github.com/johannesjo/super-productivity/commit/f37498200dae6d4b89c3ae984138f311831492df))
- wrong check for is valid app data ([2b57192](https://github.com/johannesjo/super-productivity/commit/2b57192db099bab391f24bd9e6dc0bbbf096d4d8))
- **timeline:** weird error ([57cb884](https://github.com/johannesjo/super-productivity/commit/57cb884928d152ae8d3cc3ff949996407f6ec19c))
- **timeline:** workStartEnd cleanup ([7d41c36](https://github.com/johannesjo/super-productivity/commit/7d41c36825711fca203358fcae59442a2bea8b6b))
- timeout errors ([acbba1e](https://github.com/johannesjo/super-productivity/commit/acbba1ec94805abdbf9dbfbf6b9fc64eb70735e8))
- **worklog-export:** remove unused interface TaskWithParentTitle ([bc0ee2f](https://github.com/johannesjo/super-productivity/commit/bc0ee2f5515ca9c3a4e70240c98e00adbd399045))

### Features

- **i18n:** update all missing translations ([b5209ca](https://github.com/johannesjo/super-productivity/commit/b5209caa22e80498c5f1434489d2774a7902304d))
- **schedule:** add missing translations ([d840f12](https://github.com/johannesjo/super-productivity/commit/d840f1204c9030919a933a8fd20611617e72d371))
- **schedule:** save last choice for isMoveToBacklog to LS ([742d155](https://github.com/johannesjo/super-productivity/commit/742d1552ef76e08ec0734affdc440bf27df9781f))
- **task:** improve move to backlog and show also on today's list ([3c04b65](https://github.com/johannesjo/super-productivity/commit/3c04b6520a5dd460488f5fd68b7b669e68a356d3))
- **task:** show planned time next to clock icon ([742ad38](https://github.com/johannesjo/super-productivity/commit/742ad38cb906577f0e7707a33ec0cb307f1e617e))
- **timeline:** add better id ([807e630](https://github.com/johannesjo/super-productivity/commit/807e630b00d40d588abc95061038bbbecf24ebf5))
- **timeline:** add debug info ([6c8de6d](https://github.com/johannesjo/super-productivity/commit/6c8de6db22f9fc03ae8e9194a30db076f652914a))
- **timeline:** add debugging code ([8559365](https://github.com/johannesjo/super-productivity/commit/8559365361244e2ab753fdbfae4f44a596376fca))
- **timeline:** add info about timespan ([4b4ef7b](https://github.com/johannesjo/super-productivity/commit/4b4ef7b809b12d8fc6c2250e200f283f904b6590))
- **timeline:** add keyboard shortcut ([c899a3f](https://github.com/johannesjo/super-productivity/commit/c899a3fdac2f0de76d75d0703d738e08e667b13b))
- **timeline:** add message when there are no tasks ([781614e](https://github.com/johannesjo/super-productivity/commit/781614ed6e806daa5acfbc02521df07bf747d6c8))
- **timeline:** add missing translations ([7235494](https://github.com/johannesjo/super-productivity/commit/7235494b794198632b556402b8339890e847fd46))
- **timeline:** add squishy style for middle continued tasks ([8075ac0](https://github.com/johannesjo/super-productivity/commit/8075ac0ae8aba92c823fe16933a5a62eba64527e))
- **timeline:** add validation for timeline form ([3ca54f1](https://github.com/johannesjo/super-productivity/commit/3ca54f1d8ddce8f5922bc17e9749ad2168c9e963))
- **timeline:** add week day to start end ([8069900](https://github.com/johannesjo/super-productivity/commit/8069900a69d81201ae90bdf5d23a7a7e3a558a9d))
- **timeline:** add welcome dialog for feature ([91ed84a](https://github.com/johannesjo/super-productivity/commit/91ed84a419b3c40847a213dabbe3e08766dc882c))
- **timeline:** add working config for work start end ([1dbdbb6](https://github.com/johannesjo/super-productivity/commit/1dbdbb6ed1f633e4f9c121e983edcf0c15f60ab7))
- **timeline:** also leave larger border radius for current task ([e282f85](https://github.com/johannesjo/super-productivity/commit/e282f8595ab79bf591fe1e820d3cedfe157c40fc))
- **timeline:** also show sub tasks if parent is planned ([35a2616](https://github.com/johannesjo/super-productivity/commit/35a2616c64959d62cae5461c886e6623319806cd))
- **timeline:** cleanup model ([dff304a](https://github.com/johannesjo/super-productivity/commit/dff304a2bcb2d9d6de556f681b07e308a5737827))
- **timeline:** first draft of new sorting strategy ([9a5f346](https://github.com/johannesjo/super-productivity/commit/9a5f346e052acf220b21416443e9341dedf33d5e))
- **timeline:** hide drag handle ([8eee729](https://github.com/johannesjo/super-productivity/commit/8eee729fb78140e976703c658b766a2c1bebdcf2))
- **timeline:** hide not needed start end entries ([16d696e](https://github.com/johannesjo/super-productivity/commit/16d696e1c8c3ba4f88153411fa2d6964e48b2cc7))
- **timeline:** improve continued task styling ([6915e09](https://github.com/johannesjo/super-productivity/commit/6915e095f7be9333958197c35c1b6afd0a379f38))
- **timeline:** improve continued task styling ([cc65917](https://github.com/johannesjo/super-productivity/commit/cc659176a34b6a07396c243aad85ec102ed17fff))
- **timeline:** improve dayStartEnd styling ([8a36672](https://github.com/johannesjo/super-productivity/commit/8a3667250cfb67b04b2899358fc061bc6bd8046f))
- **timeline:** improve performance ([1e067ac](https://github.com/johannesjo/super-productivity/commit/1e067ac974e838af9761534222fd7f1148172e5b))
- **timeline:** improve split task continued ([a1f36d2](https://github.com/johannesjo/super-productivity/commit/a1f36d29c61ad5ebcd27915f43b1eb5a1c6b2a62))
- **timeline:** improve splitting ([408e79e](https://github.com/johannesjo/super-productivity/commit/408e79e17b6cee0f042d5ec022e0e0a798cf32c6))
- **timeline:** make advanced splitting work ([640c928](https://github.com/johannesjo/super-productivity/commit/640c9281e0fa82c047974594cd1c0915dbc5faf8))
- **timeline:** make basic workStartEnd work ([df4ee1d](https://github.com/johannesjo/super-productivity/commit/df4ee1db457164d4f4b884de928856d767c60f1b))
- **timeline:** make cleaning up excess dayStartEnd work much better ([90b122d](https://github.com/johannesjo/super-productivity/commit/90b122d541ed4731e0f4ab305cdbffd3271411e2))
- **timeline:** make it work for scheduled first ([3a9b9a4](https://github.com/johannesjo/super-productivity/commit/3a9b9a4dc465f86221aad6a2147617245c7aa267))
- **timeline:** make new approach mostly work ([4409de8](https://github.com/johannesjo/super-productivity/commit/4409de8cfdd2a386d999320cccc1e3aa155675b2))
- **timeline:** make new approach mostly work 2 ([31a5b05](https://github.com/johannesjo/super-productivity/commit/31a5b050f0a4d2bf2c6f20ce945005186df8ff23))
- **timeline:** make new approach mostly work 3 ([52dc6b0](https://github.com/johannesjo/super-productivity/commit/52dc6b0fc27692cfe60249b0d4c8919ad84d5dcd))
- **timeline:** make new approach mostly work 4 ([4d660d9](https://github.com/johannesjo/super-productivity/commit/4d660d9b324e7b02cca2c4a1080d779453939b6d))
- **timeline:** make new day crossing work ([4d048b7](https://github.com/johannesjo/super-productivity/commit/4d048b7b961e38153676e4954b3773adfe8b9938))
- **timeline:** make split task border-radius more pronounced ([c4fa9a1](https://github.com/johannesjo/super-productivity/commit/c4fa9a163b61d1864a399c31b9370e65b4e72644))
- **timeline:** make splitting logic work ([584915a](https://github.com/johannesjo/super-productivity/commit/584915a6309ba08f08ceede03f672d0d1bb65e74))
- **timeline:** move current task outside boundaries ([df6d3ec](https://github.com/johannesjo/super-productivity/commit/df6d3ec4a2da69d480fd73c666d0720d7103e642))
- **timeline:** recursively merge blocks ([c7bd516](https://github.com/johannesjo/super-productivity/commit/c7bd516fd516da101e421e730865aa887db9c8b6))
- **timeline:** remove debug code ([997a7b3](https://github.com/johannesjo/super-productivity/commit/997a7b301ab177f9bcf22add1072d5d06c502149))
- **timeline:** show all scheduled tasks in timeline ([bce56d8](https://github.com/johannesjo/super-productivity/commit/bce56d8a526350ea80fd45601d3c34d8a5b1cae4))
- **timeline:** show time for work start & work end ([e9810c1](https://github.com/johannesjo/super-productivity/commit/e9810c182f2f5836432424839e93e74d8c28f18a))
- extend isValidData check with missing tags ([3b6ba1b](https://github.com/johannesjo/super-productivity/commit/3b6ba1b28fe5ea9a303fdf81fd208e56b0f402ba))
- **autoRepair:** add today tag to tasks without neither tagId nor projectId [#987](https://github.com/johannesjo/super-productivity/issues/987) ([214354e](https://github.com/johannesjo/super-productivity/commit/214354e189a773ff098f2979f80abc3ebd8d3bab))
- **electron:** update to 12 ([33b4267](https://github.com/johannesjo/super-productivity/commit/33b4267ddc9ca88acb253a7635120767dc58f5ef))
- **i18n:** update all translations ([2e757f6](https://github.com/johannesjo/super-productivity/commit/2e757f67debb0dbac8157575fc2b16de8ff7994c))
- **metric:** add migration script [#520](https://github.com/johannesjo/super-productivity/issues/520) ([9c5f6a7](https://github.com/johannesjo/super-productivity/commit/9c5f6a7b612aebdbd2019835770eab8cc6e626d1))
- **metric:** make basic migration work [#520](https://github.com/johannesjo/super-productivity/issues/520) ([da928df](https://github.com/johannesjo/super-productivity/commit/da928df6feebe6ae886e13a375c813cadc6ceac1))
- **metric:** make basic migration work 2 [#520](https://github.com/johannesjo/super-productivity/issues/520) ([b93dcac](https://github.com/johannesjo/super-productivity/commit/b93dcac078ab4db1bac7675b3a20168bb529c811))
- **metric:** migrate to global model [#520](https://github.com/johannesjo/super-productivity/issues/520) ([4f7c241](https://github.com/johannesjo/super-productivity/commit/4f7c2415284e43042b45c74db01556683817c010))
- **metric:** migrate to global model 2 [#520](https://github.com/johannesjo/super-productivity/issues/520) ([a133d1c](https://github.com/johannesjo/super-productivity/commit/a133d1cb282e80618a2d14bdcd9dc3bb62c23635))
- **metric:** remove unneeded migrations [#520](https://github.com/johannesjo/super-productivity/issues/520) ([7d6270b](https://github.com/johannesjo/super-productivity/commit/7d6270bdc06eb1ca95fb325f4f122ac7f0381962))
- **note:** remove reminders for notes ([251e3cc](https://github.com/johannesjo/super-productivity/commit/251e3cce1563506df1a4ee0dd645b8d7601f25e4))
- **reminder,task:** introduce plannedAt for task model to extend reminder stuff ([0f977c9](https://github.com/johannesjo/super-productivity/commit/0f977c92d515f73e7677b97cd81b9ea1b73373dd))
- **task:** keep text on lost focus when adding task ([1c6fc91](https://github.com/johannesjo/super-productivity/commit/1c6fc91100cc295dcaea2f5d5361987f47eb5bdf)), closes [#635](https://github.com/johannesjo/super-productivity/issues/635)
- **timeline:** add boilerplate ([2698c23](https://github.com/johannesjo/super-productivity/commit/2698c2394a3b904b3d277bcb7c115173f6d208dd))
- **timeline:** add dummy work end and start ([4892c72](https://github.com/johannesjo/super-productivity/commit/4892c72677e9ecd9ed8980da3c30b18b881e491f))
- **timeline:** add light theme styles ([4125e33](https://github.com/johannesjo/super-productivity/commit/4125e336d1226f8acc0b9d190b42593d7cdde51b))
- **timeline:** add menu entry ([b498501](https://github.com/johannesjo/super-productivity/commit/b498501968b9c321ccc7be6ffe905ba10f067f56))
- **timeline:** add model definition ([8657cc8](https://github.com/johannesjo/super-productivity/commit/8657cc8ebdce063b0378c78163da25b964d40eb2))
- **timeline:** add most basic version ([3b8b7f4](https://github.com/johannesjo/super-productivity/commit/3b8b7f466428897b2395c751305932560b244ce2))
- **timeline:** add now to first ([4b4d647](https://github.com/johannesjo/super-productivity/commit/4b4d6471b2a72b12fc2a0226f83df327fbbaad87))
- **timeline:** add parent task title ([c87b8df](https://github.com/johannesjo/super-productivity/commit/c87b8df60c61b89dc514b147ea4ed809b89accec))
- **timeline:** add project color to parent task title ([a939e10](https://github.com/johannesjo/super-productivity/commit/a939e10fbcd9f718070a831f9bb53c4568700a3e))
- **timeline:** add split task for workDayStartEnd ([79206b3](https://github.com/johannesjo/super-productivity/commit/79206b3840d0d6e04ffabd5c86efe57906cc8f1f))
- **timeline:** add timeline arrowhead ([9d2f6df](https://github.com/johannesjo/super-productivity/commit/9d2f6df5b752970fcf11347fdaa3c2d6010f3398))
- **timeline:** add very simple animation ([9da1d7a](https://github.com/johannesjo/super-productivity/commit/9da1d7a87303044f6a33ff6351233de4901717c6))
- **timeline:** enlarge parent title ([6f19f42](https://github.com/johannesjo/super-productivity/commit/6f19f427438c8ff3ae91eb5e17e102591c7d5f47))
- **timeline:** get rid of wobbling ([f412f66](https://github.com/johannesjo/super-productivity/commit/f412f66d41bf75d3928b3374cc398baf48618bd1))
- **timeline:** improve continued task style ([2925e0d](https://github.com/johannesjo/super-productivity/commit/2925e0d75efcb60e4f222270b568e27147e7618b))
- **timeline:** improve continued task styling ([bfcd39f](https://github.com/johannesjo/super-productivity/commit/bfcd39f81f1937f0b75f9128f163da63fb0c910c))
- **timeline:** improve continued task styling ([e393008](https://github.com/johannesjo/super-productivity/commit/e39300876b2aa640dc3d8829b54265638b8c616f))
- **timeline:** improve continued task styling more ([4d540de](https://github.com/johannesjo/super-productivity/commit/4d540ded706283dcdc785dffe18e5d7039905f7a))
- **timeline:** improve custom event styling ([754e1fa](https://github.com/johannesjo/super-productivity/commit/754e1fa462645e853d2bddab4aab358ddf4d3cc3))
- **timeline:** improve day separator ([92fbc58](https://github.com/johannesjo/super-productivity/commit/92fbc586a05abd14188aa822651342ad4bbd2cfc))
- **timeline:** improve styling ([930f8da](https://github.com/johannesjo/super-productivity/commit/930f8da84e4361428dfa19549a1fd07a7a580d63))
- **timeline:** improve styling ([bd20bf9](https://github.com/johannesjo/super-productivity/commit/bd20bf9a8d190b3417d134946f18057b59eba8c8))
- **timeline:** improve styling for workStartEnd ([ed4359b](https://github.com/johannesjo/super-productivity/commit/ed4359bad444054dee6910c9d7b7aa429a41ba91))
- **timeline:** make it work better ([e0be78d](https://github.com/johannesjo/super-productivity/commit/e0be78daa129c65d31b298f424be6a7df1571bd4))
- **timeline:** make most basic events work ([2c46b54](https://github.com/johannesjo/super-productivity/commit/2c46b549e25aee468aea317f08104e10ae8547b8))
- **timeline:** make split tasks work better for workStartEnd ([ebfc6fc](https://github.com/johannesjo/super-productivity/commit/ebfc6fc17ac8363600f2eda50d0b881950b263a2))
- **timeline:** make split tasks work for workStartEnd ([0f2b309](https://github.com/johannesjo/super-productivity/commit/0f2b3094bd1131f51dbac11480b9ee4f3e242ca1))
- **timeline:** make task additional info work ([b7677ca](https://github.com/johannesjo/super-productivity/commit/b7677ca40160cf34db75643153d502e58a53337b))
- **timeline:** prepare custom event model ([9c468a7](https://github.com/johannesjo/super-productivity/commit/9c468a72c7895c2a87b021047beaf66acc8d45e8))
- **timeline:** prepare custom events ([26bb32c](https://github.com/johannesjo/super-productivity/commit/26bb32c15fb6416a49a9a277350d5133738f369c))
- **timeline:** round time to 5m ([20ee458](https://github.com/johannesjo/super-productivity/commit/20ee458c28696067f3b8e0cf4451051f0ba9114a))
- **timeline:** show current task always first ([5df5e8b](https://github.com/johannesjo/super-productivity/commit/5df5e8b03e79efee344f28dfbffdb258013b0e53))
- **timeline:** sort entries according to time if time is equal ([7cdb91a](https://github.com/johannesjo/super-productivity/commit/7cdb91add5dc70b736c57a60c173ac3983dae79d))
- add new package for roboto ([29a5920](https://github.com/johannesjo/super-productivity/commit/29a59207cb1f010627fb3ee7bfdc49c65c4de439))
- update typescript version ([8ebe9c7](https://github.com/johannesjo/super-productivity/commit/8ebe9c7098a6dda18a2a61549b78a1f4ee70b951))

## [6.5.2](https://github.com/johannesjo/super-productivity/compare/v6.5.1...v6.5.2) (2021-03-19)

### Bug Fixes

- cannot read property id of undefined [#978](https://github.com/johannesjo/super-productivity/issues/978) ([9729c50](https://github.com/johannesjo/super-productivity/commit/9729c500d7ee4549dc5716c6bbe6d69883b3e58d))

## [6.5.1](https://github.com/johannesjo/super-productivity/compare/v6.5.0...v6.5.1) (2021-03-19)

### Bug Fixes

- **issues:** do not rely on caldav last-changed ([63ccccf](https://github.com/johannesjo/super-productivity/commit/63ccccf6a7b05e5dbd5609a89af97e3e2c96a2b3)), closes [#952](https://github.com/johannesjo/super-productivity/issues/952)
- lint ([392f35a](https://github.com/johannesjo/super-productivity/commit/392f35a33000d72c87c5bd47536d8e8ced90cff4))
- remove async code from \_createRows ([bc6653f](https://github.com/johannesjo/super-productivity/commit/bc6653fe13516bd2d9c5b3f592df5519b340774f))

### Features

- improve idb error handling ([88cd49b](https://github.com/johannesjo/super-productivity/commit/88cd49bbb8b50f0db5d899e2b79667e5333c6bc6))
- update web dav info text ([7988dfa](https://github.com/johannesjo/super-productivity/commit/7988dfa715519017bfbbcb5adeca1f9ab2fd1525))
- **worklog-export:** add project column [#616](https://github.com/johannesjo/super-productivity/issues/616) ([e85017c](https://github.com/johannesjo/super-productivity/commit/e85017c20f71462bac8a937d4135b51b14869642))
- **worklog-export:** add tag column [#616](https://github.com/johannesjo/super-productivity/issues/616) ([9a4347f](https://github.com/johannesjo/super-productivity/commit/9a4347fe8cf7855828694e8c61ca3b0d7ab5b411))

# [6.5.0](https://github.com/johannesjo/super-productivity/compare/v6.4.0...v6.5.0) (2021-03-05)

### Bug Fixes

- **issues:** Disable caldav issue search by default ([5252f8f](https://github.com/johannesjo/super-productivity/commit/5252f8ffcd65809b047f251332b5b3102b0010a5))
- missing tag error ([8a01982](https://github.com/johannesjo/super-productivity/commit/8a01982135df41baecc0dfe60078f830ac00ce39))
- **dbx:** config error not thrown ([41ce6b6](https://github.com/johannesjo/super-productivity/commit/41ce6b6d106848310b88012162e39686368535b7))
- **google:** browser login not being up to date any more ([471126b](https://github.com/johannesjo/super-productivity/commit/471126b48ea3a953718102df10cee143b86ae791))
- **issue:** error due to missing migration to new model ([a79c5d7](https://github.com/johannesjo/super-productivity/commit/a79c5d77a6c6453a4a417f3dd07864bb73d555e5))
- **issues:** Apply changes made by yarn int ([2ea18c6](https://github.com/johannesjo/super-productivity/commit/2ea18c627bda4059d8afbd9a8b7036894daa66f1))
- **issues:** apply review-suggested changes ([acb654f](https://github.com/johannesjo/super-productivity/commit/acb654f447117db9190ae3d59a851ad63c4fa76b))
- **issues:** remove unused caldav translation constants ([052f908](https://github.com/johannesjo/super-productivity/commit/052f908be8db4fcd582167616c9b85ed146c1c6f))
- **issues:** remove unused import ([f1e5857](https://github.com/johannesjo/super-productivity/commit/f1e58579f051406322e3ccd897e29b422e15338b))
- **jira:** jql for search not working [#833](https://github.com/johannesjo/super-productivity/issues/833) ([0cfb7af](https://github.com/johannesjo/super-productivity/commit/0cfb7af2e40ff43cc7e8188c62ea3eb7fb5a7cc2))
- **sync:** invalid data check [#720](https://github.com/johannesjo/super-productivity/issues/720) ([3c85b70](https://github.com/johannesjo/super-productivity/commit/3c85b70f4f246f5004a93950d45f18ec6d25d5e8))
- **sync:** make sure the latest data is synced [#720](https://github.com/johannesjo/super-productivity/issues/720) ([9287105](https://github.com/johannesjo/super-productivity/commit/9287105d0c093c02a79c168360efb03c2fc02367))
- add today tag as fallback [#843](https://github.com/johannesjo/super-productivity/issues/843) ([13b9313](https://github.com/johannesjo/super-productivity/commit/13b9313a516658325f1183ff49e3c40ce868e718))
- remove dev code ([04daa1e](https://github.com/johannesjo/super-productivity/commit/04daa1e41bae62b7f0bb02f9e526dfc6fa3770f6))

### Features

- **issues:** Add ability to filter caldav issues by category. ([af96d28](https://github.com/johannesjo/super-productivity/commit/af96d28d090ab607fe1d3f043f70cced646643ac))
- **sync:** improve error handling [#720](https://github.com/johannesjo/super-productivity/issues/720) ([de5a47d](https://github.com/johannesjo/super-productivity/commit/de5a47dab93ce35763c7eff404fc5d7fc7963952))
- **sync:** improve handling for invalid config data [#907](https://github.com/johannesjo/super-productivity/issues/907) ([3430f23](https://github.com/johannesjo/super-productivity/commit/3430f23e56ad8a75102a5e3660a1bbd2747d020b))
- don't limit idle dialog to current project, but allow all tasks ([e1219fa](https://github.com/johannesjo/super-productivity/commit/e1219fa805b89522724e771a677057cabc44a5fd))
- **eslint:** enable id-blacklist rule and fix errors ([8db6a65](https://github.com/johannesjo/super-productivity/commit/8db6a6563253d70accfb6ae6552354b2020789a7))
- **issues:** check settings before initialize caldav client ([bd64f45](https://github.com/johannesjo/super-productivity/commit/bd64f45538439a2ab99ccf75e018c7c10187c667))
- **issues:** Implement basic issue provider for caldav ([840f610](https://github.com/johannesjo/super-productivity/commit/840f6102bfd383dc21bc7f3894172a35f0e955e7))
- **issues:** provide context information in the caldav client snacks ([1ece18d](https://github.com/johannesjo/super-productivity/commit/1ece18d938ba819ae982e9304ae1cad66149f933))
- **issues:** provide english translation texts for caldav ([8dd2d87](https://github.com/johannesjo/super-productivity/commit/8dd2d8707e771a133f78a32be5b4da3ac8399630))
- **issues:** reuse caldav client instances. ([8b5eb0f](https://github.com/johannesjo/super-productivity/commit/8b5eb0f5da3e967d516382297607666b3a48f8f3))
- **issues:** synchronize task-done state to caldav. ([abca948](https://github.com/johannesjo/super-productivity/commit/abca948e29886a6815d1d8ed5bf6264b65a426af))
- **schedule:** allow adding and removing tasks from today for mobile ([c56188a](https://github.com/johannesjo/super-productivity/commit/c56188a236d6b70dee43f34b4b3bd75a8b61743c))
- make ms badge work again ([1a6e7be](https://github.com/johannesjo/super-productivity/commit/1a6e7be9d6d0a452405b63b76158ee53f9ed7a23))
- make ms badge work again 2 ([80373db](https://github.com/johannesjo/super-productivity/commit/80373dbc0f7b768e4700fdd63a0eca1d850f1b6f))
- reduce left right padding for mobile ([97c9947](https://github.com/johannesjo/super-productivity/commit/97c99475990cb81e408bd93b3b8d2f34b7b6670e))
- **worklog-export:** add description column [#795](https://github.com/johannesjo/super-productivity/issues/795) ([52c7eb3](https://github.com/johannesjo/super-productivity/commit/52c7eb3e7cde2ed59cd99ad376261f83bf52d72d))

# [6.4.0](https://github.com/johannesjo/super-productivity/compare/v6.3.3...v6.4.0) (2021-02-07)

### Bug Fixes

- cache listState for use in Angular view ([bc509a7](https://github.com/johannesjo/super-productivity/commit/bc509a7dcc8596c3d35c923e72a12e865f9dc00b))
- lint ([83ee871](https://github.com/johannesjo/super-productivity/commit/83ee871bae960ccf764397113ba019277da246a1))
- lint ([9a50f52](https://github.com/johannesjo/super-productivity/commit/9a50f522a19bcf70dde977e4e7a3d7923dc483ca))
- missing locale nb [#860](https://github.com/johannesjo/super-productivity/issues/860) ([654f688](https://github.com/johannesjo/super-productivity/commit/654f6888c651b545781ebf7b656478cbe7277b2f))
- title for main header project context menu ([4a3b6c4](https://github.com/johannesjo/super-productivity/commit/4a3b6c4e739857864b8061b55f9fa31ef873dd2e))
- wrong argument passed ([751bfae](https://github.com/johannesjo/super-productivity/commit/751bfae319711c0f17229d7e3a1b39d6af345833))
- **desktopTouch:** task edit being broken [#778](https://github.com/johannesjo/super-productivity/issues/778) ([7f66ad6](https://github.com/johannesjo/super-productivity/commit/7f66ad685cc7a56e109ecf025d94aeafa0990a99))
- privacy policy [#864](https://github.com/johannesjo/super-productivity/issues/864) ([de6414f](https://github.com/johannesjo/super-productivity/commit/de6414f28d694715c8ff923aa594c49d88a4797e))
- repeatable tasks being created before sync is ready ([7a8ef36](https://github.com/johannesjo/super-productivity/commit/7a8ef367151f3f82b816bf52fa4eae4e2a2f9cc6))
- **gitlab:** wrong base url ([574ac8b](https://github.com/johannesjo/super-productivity/commit/574ac8b3db42a4a50e0bb2b8b18e14b122c9a44b))

### Features

- **convertSubTasks:** add translation and right icon ([89ecd98](https://github.com/johannesjo/super-productivity/commit/89ecd98efed977ca0bd2e7f651409564adccbeae))
- **convertSubTasks:** make it work for projects ([c5a0d03](https://github.com/johannesjo/super-productivity/commit/c5a0d03973c7764a9f1823a110105daff7afb52b))
- **convertSubTasks:** make it work for tags ([115da06](https://github.com/johannesjo/super-productivity/commit/115da063ff17dfc6b0e93c8ba0ec65bf3228baf7))
- **convertSubTasks:** make last sub task case and time recalculation work ([6b11b00](https://github.com/johannesjo/super-productivity/commit/6b11b00f8b1e9fe200bdf2de8313e1eeaed316f1))
- **convertSubTasks:** make saving data work ([1e1dfc2](https://github.com/johannesjo/super-productivity/commit/1e1dfc2347fb2c1e56a7f540a84785252820c5a6))
- **eslint:** add eslint migration package and perform migration ([f4ef0e2](https://github.com/johannesjo/super-productivity/commit/f4ef0e2047ca5afc5b9987fc4c92932621d694dd))
- **eslint:** enable ban-types eslint rule ([8399a30](https://github.com/johannesjo/super-productivity/commit/8399a30fa8d122e4bde2c066ad189b157ecb089b))
- **eslint:** enable member-delimiter-style rule and autofix errors ([552351f](https://github.com/johannesjo/super-productivity/commit/552351fd8d6efb8d714b66ac14a9838c2b95ebca))
- **eslint:** fix naming convention lint warnings ([15141d1](https://github.com/johannesjo/super-productivity/commit/15141d1a04de4a01188263ee6d07e73301824f95))
- **eslint:** fix no-shadow rule ([0c5c13b](https://github.com/johannesjo/super-productivity/commit/0c5c13b238dec0829bc817651ed83e3a289ff588))
- **eslint:** re-enable directive-selector rule ([63a93da](https://github.com/johannesjo/super-productivity/commit/63a93da507b04b6bd84ddf1d0a8bde044f1674d7))
- **eslint:** re-enable max-length rule and fix errors ([982a71e](https://github.com/johannesjo/super-productivity/commit/982a71e3e43196c31c17d4ae11e4e971f73e517a))
- **eslint:** re-enable no-empty-interface rule and fix errors ([55e4f4e](https://github.com/johannesjo/super-productivity/commit/55e4f4e2f927c7451845731590f4afe69b4ea43c))
- **eslint:** re-enable prefer-const rule and fix subsequent errors ([4e375e9](https://github.com/johannesjo/super-productivity/commit/4e375e9c223a8750e0c6370446beb989bd7a2746))
- **eslint:** re-enabled no-unused-expressions rule and fixed errors ([018b4d8](https://github.com/johannesjo/super-productivity/commit/018b4d8e43673b630d19f6feffb7bfbd33d73218))
- **eslint:** update naming-convention rule and bump eslint version ([a14dd53](https://github.com/johannesjo/super-productivity/commit/a14dd5394dcc013412ea07a864a39810295c1e30))
- **git,gitlab:** revert changes ([be117be](https://github.com/johannesjo/super-productivity/commit/be117bef770f5be0eeaf45fca0989b17181ae945))
- **googleAuth:** add all code to get token from api [#782](https://github.com/johannesjo/super-productivity/issues/782) ([6e3cb4b](https://github.com/johannesjo/super-productivity/commit/6e3cb4bd1e2c30376361226384473cfb72a55b8a))
- **googleAuth:** display auth url in frontend [#782](https://github.com/johannesjo/super-productivity/issues/782) ([a284a35](https://github.com/johannesjo/super-productivity/commit/a284a35491ee6fc5e1350279595fe8dd4330dd84))
- **googleAuth:** improve error handling [#782](https://github.com/johannesjo/super-productivity/issues/782) ([03ff2fb](https://github.com/johannesjo/super-productivity/commit/03ff2fb0086225b9b56832e308b2751e2afc0f52))
- **googleAuth:** make code challenge work [#782](https://github.com/johannesjo/super-productivity/issues/782) ([6f0e8d4](https://github.com/johannesjo/super-productivity/commit/6f0e8d4d3b19ff5bf09d390e17f5cf3187500f3e))
- **googleAuth:** make getting token work [#782](https://github.com/johannesjo/super-productivity/issues/782) ([460a2b4](https://github.com/johannesjo/super-productivity/commit/460a2b4f9e15933db37ffd3d73405fa530ce2a40))
- **googleAuth:** make it work with new dialog [#782](https://github.com/johannesjo/super-productivity/issues/782) ([03459d6](https://github.com/johannesjo/super-productivity/commit/03459d6545db7a14e488e5ce62fdac6a21b274f6))
- **googleAuth:** make refreshing token work [#782](https://github.com/johannesjo/super-productivity/issues/782) ([b0c71ab](https://github.com/johannesjo/super-productivity/commit/b0c71abf9ce99f91c0029fb417abc97c1e80262b))
- **googleAuth:** prettify dialog [#782](https://github.com/johannesjo/super-productivity/issues/782) ([975c314](https://github.com/johannesjo/super-productivity/commit/975c3149200013ce5594a7ad35093122b5c36a7f))
- **googleAuth:** try stuff [#782](https://github.com/johannesjo/super-productivity/issues/782) ([3760c01](https://github.com/johannesjo/super-productivity/commit/3760c01b29afda331179307f7308a3a694d38a85))
- **googleAuth:** working but not neccessarily ideal [#782](https://github.com/johannesjo/super-productivity/issues/782) ([c121c9e](https://github.com/johannesjo/super-productivity/commit/c121c9ed100c12071d5077c13b6ff408bbde0860))
- **sync:** handle initial authentication failure ([49f367a](https://github.com/johannesjo/super-productivity/commit/49f367ab0aea334ed52746ecc0b33dd7ffb9668b))
- add 'edit project' to work-context-menu [#785](https://github.com/johannesjo/super-productivity/issues/785) ([9fd2fe3](https://github.com/johannesjo/super-productivity/commit/9fd2fe360a68e469ccb0570f933b7229d9c83def))
- hide import/export for android web view as it is currently not working ([a2c38fe](https://github.com/johannesjo/super-productivity/commit/a2c38fe9154d19d937f10b0d434de7cf6f08dedc))
- pass a project object instead of activeWorkContext [#785](https://github.com/johannesjo/super-productivity/issues/785) ([90338b5](https://github.com/johannesjo/super-productivity/commit/90338b5973310af11f9e257711de66dfb0f365f3))
- persist project/tag list-state through app reloads [#767](https://github.com/johannesjo/super-productivity/issues/767) ([733bbe3](https://github.com/johannesjo/super-productivity/commit/733bbe373a92a137272cccbe5d93cbd9bcd6ed0d))
- **pomodoro:** better handle isEnabled for progress bar updates ([5c8da85](https://github.com/johannesjo/super-productivity/commit/5c8da8569b6ceabfdd2b702982cd9806f47b7991))
- **pomodoro:** make pomodoro more efficient ([e36e4d8](https://github.com/johannesjo/super-productivity/commit/e36e4d8d8bb05309b0ddd76842fb5196a021b9a6))
- **pomodoro:** make pomodoro more efficient 2 ([43d6258](https://github.com/johannesjo/super-productivity/commit/43d625803436d6da56ae98fbb5cdd1e5a6bf4314))
- **pomodoro:** make timer a bit slower ([d363439](https://github.com/johannesjo/super-productivity/commit/d363439c5ef0f3c5efb22321a3fc44c6cb631cc2))
- **sync:** also handle unexpected errors for upload [#814](https://github.com/johannesjo/super-productivity/issues/814) ([3b76073](https://github.com/johannesjo/super-productivity/commit/3b76073dcac2e0cdf5ecc6e724a80027d7e444a9))
- remove material font family [#820](https://github.com/johannesjo/super-productivity/issues/820) ([7ba64e0](https://github.com/johannesjo/super-productivity/commit/7ba64e04f83fecd2f15c112eb8760562542b088e))
- **tags:** add new tasks always to top of tag list ([95feb3a](https://github.com/johannesjo/super-productivity/commit/95feb3ac49cb42236c35376bccbad1d34df3d0fc))
- **taskNotesTpl:** add configurable template for task description (aka notes) ([238ff52](https://github.com/johannesjo/super-productivity/commit/238ff52aaace5176581176a385bfe7b0b091469b))

## [6.3.3](https://github.com/johannesjo/super-productivity/compare/v6.3.2...v6.3.3) (2021-01-04)

### Bug Fixes

- add cmdline switch to force tray icons for dark mode [#741](https://github.com/johannesjo/super-productivity/issues/741) ([3e70233](https://github.com/johannesjo/super-productivity/commit/3e7023342a56a8e7cbfa85be9be6feeda23a91a1))
- broken datepicker [#736](https://github.com/johannesjo/super-productivity/issues/736) [#576](https://github.com/johannesjo/super-productivity/issues/576) ([de6dc9c](https://github.com/johannesjo/super-productivity/commit/de6dc9cd03baf607439baa15e05ec36e12e5a076))
- typing issue ([590f438](https://github.com/johannesjo/super-productivity/commit/590f438675e07091ad2b9a5221087d596f5a7ddc))

### Features

- bundle roboto ([17f4893](https://github.com/johannesjo/super-productivity/commit/17f4893e57777896bac2224f3569fd53ee6f6ab1))
- name task notes "description" ([4c7a38a](https://github.com/johannesjo/super-productivity/commit/4c7a38a742682834b827e96cdec4dc7abf0df203))
- **perf:** limit material icons to woff2 ([a9093cc](https://github.com/johannesjo/super-productivity/commit/a9093cc6ef5dd84e8e350d538010b6068a3b0993))

## [6.3.2](https://github.com/johannesjo/super-productivity/compare/v6.3.1...v6.3.2) (2020-12-28)

## [6.3.1](https://github.com/johannesjo/super-productivity/compare/v6.3.0...v6.3.1) (2020-12-28)

### Bug Fixes

- failing unit test ([690daac](https://github.com/johannesjo/super-productivity/commit/690daac07e86fabf9d44444752f75bede5d85bec))

# [6.3.0](https://github.com/johannesjo/super-productivity/compare/v6.3.0-0...v6.3.0) (2020-12-28)

### Bug Fixes

- finish day button not being focusable via tab ([4960c4a](https://github.com/johannesjo/super-productivity/commit/4960c4a80c565aed6053d750a71ba9a32d30cd7e))
- **banner:** take a break banner not being cleared when clicking reset break button ([a6026be](https://github.com/johannesjo/super-productivity/commit/a6026bec8fa64c61d61f0fe1fdd80288ee06485f))

### Features

- add focus border to primary flat buttons ([9c08760](https://github.com/johannesjo/super-productivity/commit/9c087606d0602ba01835f71491b221ae5cb5bc98))
- add tabindex to ready to work ([4f7127c](https://github.com/johannesjo/super-productivity/commit/4f7127c3164f55ba955dc6b0e7b5d8c616ec677b))
- all tabindex to 0 ([113672c](https://github.com/johannesjo/super-productivity/commit/113672c2dab051dba5b87a8cb0b658a5fcb880dd))
- also add tabindex to "ready for work" ([66a2d87](https://github.com/johannesjo/super-productivity/commit/66a2d870c286dc296b4cd4e68eb694d9d02067b7))
- also show/hide task summary table checkmark on focus ([411324a](https://github.com/johannesjo/super-productivity/commit/411324a1903e8686533a12b7920257fe7d345b7f))
- make banner reliably focusable ([426dafc](https://github.com/johannesjo/super-productivity/commit/426dafc5c37951d31fac19b575f1bbb167085a37))

# [6.3.0-0](https://github.com/johannesjo/super-productivity/compare/v6.2.0-0...v6.3.0-0) (2020-12-21)

### Bug Fixes

- skipping service worker for elecron not working ([b855c8d](https://github.com/johannesjo/super-productivity/commit/b855c8d6e4128038302750b28c8738198bc0f869))

# [6.2.0-0](https://github.com/johannesjo/super-productivity/compare/v6.1.2...v6.2.0-0) (2020-12-21)

### Bug Fixes

- drag handle for projects being overlapped by badge ([ce66957](https://github.com/johannesjo/super-productivity/commit/ce6695797edb26766214f7dbc4b6aee38ed35741))
- grab cursor everywhere ([eb4143b](https://github.com/johannesjo/super-productivity/commit/eb4143bff52ad3f889e4b56a46c1e54a15feb9ea))
- **lang:** fix some typos, add missing translation ([bc06122](https://github.com/johannesjo/super-productivity/commit/bc0612289d18f3d1c827cf496b8520d8f8050321))

### Features

- adjust config defaults to be more sensible ([02051e7](https://github.com/johannesjo/super-productivity/commit/02051e7bef576e0b2a23b94fa2b0e5e5e632be89))
- don't autostart task on ready to work ([0e0fd83](https://github.com/johannesjo/super-productivity/commit/0e0fd837d70bdd4c66ef817fc8808e6fad3eb552))
- improve persistence not allowed handling ([be13288](https://github.com/johannesjo/super-productivity/commit/be132887bfc99d399c73daa888a02d37c4a3406d))
- **sideNavKeyboard:** add keyboard shortcut ([097b101](https://github.com/johannesjo/super-productivity/commit/097b101e50c16b64a52750e0d24aba50b0c96543))
- **sideNavKeyboard:** add new keyboard shortcut migration ([bf2e33d](https://github.com/johannesjo/super-productivity/commit/bf2e33d590ebf629001887eea0492a1844cc1012))
- **sideNavKeyboard:** make left focuses parent work ([066735e](https://github.com/johannesjo/super-productivity/commit/066735ef3d71c57b3ea979b3bf2138512c5218c8))
- **sideNavKeyboard:** make left right work for tags and projects ([75efddb](https://github.com/johannesjo/super-productivity/commit/75efddbc406fb21788dadaf3055d8d9ff873de0f))
- **sideNavKeyboard:** make open and focus work ([f450c4a](https://github.com/johannesjo/super-productivity/commit/f450c4a93f02668a89278d0794f91ff6fec9ad74))
- **sideNavKeyboard:** proof of concept ([a8a1a78](https://github.com/johannesjo/super-productivity/commit/a8a1a7833a3a594154f7092a7425e7cf6d994893))
- **sideNavKeyboard:** wait longer before focusing nav item ([e59241b](https://github.com/johannesjo/super-productivity/commit/e59241b41e5099bcee7fcd74594a2cd73446f89e))
- add missing focus styles for side-nav ([10e2b16](https://github.com/johannesjo/super-productivity/commit/10e2b168551d372e74c60d6816977744f538f34a))

## [6.1.2](https://github.com/johannesjo/super-productivity/compare/v6.1.1...v6.1.2) (2020-12-03)

### Bug Fixes

- **autoRepair:** persist fixed data to database ([6973a95](https://github.com/johannesjo/super-productivity/commit/6973a9556b40b16dce07ab4232fe9bdf164af93c))
- set disableClose right away to possibly prevent closing dialog [#699](https://github.com/johannesjo/super-productivity/issues/699) ([4025891](https://github.com/johannesjo/super-productivity/commit/4025891e360c13713a849ee7cc0b8489cfebd5d6))
- sidenav icon alignment ([7f0914a](https://github.com/johannesjo/super-productivity/commit/7f0914ad84e887e92453c56477598f52cb322f3c))
- today tag missing from initialTagState [#615](https://github.com/johannesjo/super-productivity/issues/615) ([3b31522](https://github.com/johannesjo/super-productivity/commit/3b31522fb44de9eece9a82c659c48badde2cc33d))

### Features

- add shortcut to go to scheduled tasks ([00e6032](https://github.com/johannesjo/super-productivity/commit/00e60329b94bff4c5c1347725c6e9f314bbe244e))
- display number of tasks [#685](https://github.com/johannesjo/super-productivity/issues/685) ([3519878](https://github.com/johannesjo/super-productivity/commit/35198785a1cff44828dfa81f817a0cb86963cdeb))
- end planning mode if new current task is selected ([75b7d78](https://github.com/johannesjo/super-productivity/commit/75b7d78caa2e9040a0e0e43d3ca42177b44e70bb))
- improve data repair to support wrong archived sub tasks [#689](https://github.com/johannesjo/super-productivity/issues/689) ([2c09a9d](https://github.com/johannesjo/super-productivity/commit/2c09a9d1cc0289a7e6b007d4a60e6853929695e0))
- improve logging for sync errors [#688](https://github.com/johannesjo/super-productivity/issues/688) ([7d36cbd](https://github.com/johannesjo/super-productivity/commit/7d36cbdd1c31b1614ea2cade6b4709362d978a08))
- improve styling for tags [#685](https://github.com/johannesjo/super-productivity/issues/685) ([defd848](https://github.com/johannesjo/super-productivity/commit/defd848b72e7ff236bdd6d921c53ef2d322ff501))
- improve styling for task count ([a9c9fa6](https://github.com/johannesjo/super-productivity/commit/a9c9fa6972113e619fb3864052c5b161611764ed))
- **dataRepair:** remove null entities ([ebeee24](https://github.com/johannesjo/super-productivity/commit/ebeee242b0b2022e64b215b3b1d54a8207c70774))
- **task:** make context menu accessible via keyboard ([28a8ede](https://github.com/johannesjo/super-productivity/commit/28a8edee0f28a98ab6112272c70a9a437f4332b1))
- make sure offline banner is dismissed [#694](https://github.com/johannesjo/super-productivity/issues/694) ([cdb212a](https://github.com/johannesjo/super-productivity/commit/cdb212a6ec2c515f166d43195fa96cba270c6dfb))

## [6.1.1](https://github.com/johannesjo/super-productivity/compare/v6.1.0...v6.1.1) (2020-11-20)

### Bug Fixes

- scheduled page throwing error after project deletion ([aa33cd1](https://github.com/johannesjo/super-productivity/commit/aa33cd120881236c60b3a9d7c9c363df806fd633))
- update icon less often [#675](https://github.com/johannesjo/super-productivity/issues/675) ([36fcea6](https://github.com/johannesjo/super-productivity/commit/36fcea696395d37f00c9c7b8675bfecf232df654))

### Features

- add commandline-switch to allow for disabling to create the tray [#675](https://github.com/johannesjo/super-productivity/issues/675) ([eb14976](https://github.com/johannesjo/super-productivity/commit/eb149769b068f8af47ee450557b73edfc81a6775))
- always show all tasks for today tag worklog ([0d23cbe](https://github.com/johannesjo/super-productivity/commit/0d23cbe51310a916bf4f72c2d84105b35051e9e8))
- make background apply to whole page for better performance ([b437876](https://github.com/johannesjo/super-productivity/commit/b4378765abe71ab000f7a533792cd3702fd98958))
- update logging for backup files ([a52b6a5](https://github.com/johannesjo/super-productivity/commit/a52b6a54e7a0090c8408081a77b2b5208b20caf5))

# [6.1.0](https://github.com/johannesjo/super-productivity/compare/v6.1.0-6...v6.1.0) (2020-11-13)

### Bug Fixes

- height issue for older android ([bcb6389](https://github.com/johannesjo/super-productivity/commit/bcb63894772ec69276a657e949af743995acf785))
- **android:** height ([b305d9b](https://github.com/johannesjo/super-productivity/commit/b305d9be5c288a6c3164cc803b3b00a20048b156))

### Features

- **db:** add retry to all database interactions [#658](https://github.com/johannesjo/super-productivity/issues/658) [#613](https://github.com/johannesjo/super-productivity/issues/613) [#607](https://github.com/johannesjo/super-productivity/issues/607) [#604](https://github.com/johannesjo/super-productivity/issues/604) [#553](https://github.com/johannesjo/super-productivity/issues/553) [#542](https://github.com/johannesjo/super-productivity/issues/542) [#541](https://github.com/johannesjo/super-productivity/issues/541) [#478](https://github.com/johannesjo/super-productivity/issues/478) [#461](https://github.com/johannesjo/super-productivity/issues/461) [#458](https://github.com/johannesjo/super-productivity/issues/458) [#455](https://github.com/johannesjo/super-productivity/issues/455) [#454](https://github.com/johannesjo/super-productivity/issues/454) [#452](https://github.com/johannesjo/super-productivity/issues/452) [#418](https://github.com/johannesjo/super-productivity/issues/418) ([6a856d4](https://github.com/johannesjo/super-productivity/commit/6a856d4e96bc25a5e64e2f282a6ea2e6870d0e73))
- **db:** add retry to database init ([35e365c](https://github.com/johannesjo/super-productivity/commit/35e365c2b8377acc9a4e38fb3324c899b087bc32))
- **google:** improve error message ([01e4051](https://github.com/johannesjo/super-productivity/commit/01e4051f0d8643df94565ad19190955fb3dd9bd3))
- **google:** improve error message 2 ([3d24c8b](https://github.com/johannesjo/super-productivity/commit/3d24c8b35157c1154072e8239e99804cfd39aa1c))

# [6.1.0-6](https://github.com/johannesjo/super-productivity/compare/v6.1.0-5...v6.1.0-6) (2020-11-11)

### Features

- **dailySummary:** also show project total for yesterdays tasks ([05be64b](https://github.com/johannesjo/super-productivity/commit/05be64b7cefa95d7088b80d260808277080bc444))
- improve logging ([772ef5d](https://github.com/johannesjo/super-productivity/commit/772ef5ddd5d27afaca58fe7e281b4ea53448f12a))

# [6.1.0-5](https://github.com/johannesjo/super-productivity/compare/v6.1.0-4...v6.1.0-5) (2020-11-10)

### Bug Fixes

- task not found race condition error [#651](https://github.com/johannesjo/super-productivity/issues/651) ([15fb93c](https://github.com/johannesjo/super-productivity/commit/15fb93c53e0575ae2c7408b99be3c04ae078fd54))

### Features

- add better error handling [#653](https://github.com/johannesjo/super-productivity/issues/653) ([eebfd55](https://github.com/johannesjo/super-productivity/commit/eebfd55d64907754cf3d2013a7422912ca721d99))
- **autoRepair:** auto remove missing sub tasks for their parents ([7060588](https://github.com/johannesjo/super-productivity/commit/706058845f835cd6786bd259b16ddcebd29e5f6a))

# [6.1.0-4](https://github.com/johannesjo/super-productivity/compare/v6.1.0-3...v6.1.0-4) (2020-11-10)

### Bug Fixes

- error when creating task when there is no default project for existing settings [#624](https://github.com/johannesjo/super-productivity/issues/624) ([f0ebd29](https://github.com/johannesjo/super-productivity/commit/f0ebd29f9e10b2536f03dd3fd2ac50882ee2dda3))

# [6.1.0-3](https://github.com/johannesjo/super-productivity/compare/v6.1.0-2...v6.1.0-3) (2020-11-10)

### Bug Fixes

- error when creating task when there is no default project [#624](https://github.com/johannesjo/super-productivity/issues/624) ([742d581](https://github.com/johannesjo/super-productivity/commit/742d581170d3503c18189be4d5b6a7cd3d5fdc47))
- **webApp:** full height for sidebar [#657](https://github.com/johannesjo/super-productivity/issues/657) ([c489dde](https://github.com/johannesjo/super-productivity/commit/c489ddeda60b52e0a5fdeaec4bb83e6390762e00))
- remove unneccssary autofix scripts [#651](https://github.com/johannesjo/super-productivity/issues/651) ([9e95252](https://github.com/johannesjo/super-productivity/commit/9e952529dfe8156c5044c061663216a15878b3a3))

### Features

- **autoRepair:** autofix inconsistent projectId [#651](https://github.com/johannesjo/super-productivity/issues/651) ([bae18bb](https://github.com/johannesjo/super-productivity/commit/bae18bbceafbe5aca2caaa1be082b396f967af93))
- **autoRepair:** autofix missing projectId for backlogTasks [#651](https://github.com/johannesjo/super-productivity/issues/651) ([88e4575](https://github.com/johannesjo/super-productivity/commit/88e45756c73ffb56c26e82ac630226cbb0dbd880))
- **autoRepair:** autofix missing tagId for task [#651](https://github.com/johannesjo/super-productivity/issues/651) ([fdef18e](https://github.com/johannesjo/super-productivity/commit/fdef18e7541ff1cc2c166d78dc4f1e734a1dc930))
- **autoRepair:** set projectId according to their parent [#651](https://github.com/johannesjo/super-productivity/issues/651) ([280ac10](https://github.com/johannesjo/super-productivity/commit/280ac1064c68b4ac25dc5bfc8c7a67cda76760d5))
- **dailySummary:** make include yesterday work ([5fe17a7](https://github.com/johannesjo/super-productivity/commit/5fe17a7e67fc516258ea839a940cd0f884330752))
- **dataCheck:** add check for inconsistent projectId and missing data [#651](https://github.com/johannesjo/super-productivity/issues/651) ([70cb3f3](https://github.com/johannesjo/super-productivity/commit/70cb3f38fd48e6c1cb2071a0b1a27b6e450c8af1))
- **log:** add for shortSyntax ([19f9f94](https://github.com/johannesjo/super-productivity/commit/19f9f9440e57a1922fdf20277d699eb31e978d45))
- add action logging for production ([b793950](https://github.com/johannesjo/super-productivity/commit/b793950444d7e0e70d0bf69dddab9a91514e9c3c))
- improve local backup check [#637](https://github.com/johannesjo/super-productivity/issues/637) ([865c3f4](https://github.com/johannesjo/super-productivity/commit/865c3f4ccefdbfa1176786af3dd7ca32bbe0a766))

# [6.1.0-2](https://github.com/johannesjo/super-productivity/compare/v6.1.0-1...v6.1.0-2) (2020-11-08)

### Bug Fixes

- **jira:** attachment length error for older versions of jira [#652](https://github.com/johannesjo/super-productivity/issues/652) ([7671395](https://github.com/johannesjo/super-productivity/commit/767139540742bb4d394363d448af0b16ebdc17e0))
- **noteReminder:** simply remove owl calendar for now from datetime input [#654](https://github.com/johannesjo/super-productivity/issues/654) ([231c59f](https://github.com/johannesjo/super-productivity/commit/231c59f72fa3f6fcb3bfadcbfb058a27c273b8cc))

# [6.1.0-1](https://github.com/johannesjo/super-productivity/compare/v6.1.0-0...v6.1.0-1) (2020-11-07)

### Bug Fixes

- **allTasksForSummary:** calculation of timeEstimate & timeSpent ([4a85cf1](https://github.com/johannesjo/super-productivity/commit/4a85cf1aadcbb8e016755d0f116462dd46473882))

# [6.1.0-0](https://github.com/johannesjo/super-productivity/compare/v6.0.1...v6.1.0-0) (2020-11-07)

### Bug Fixes

- **tray:** remove time string from mac os menu bar [#494](https://github.com/johannesjo/super-productivity/issues/494) ([78d2770](https://github.com/johannesjo/super-productivity/commit/78d27706340383d5df91a38ded01461cd8f9f555))
- background gradient not working ([e58a657](https://github.com/johannesjo/super-productivity/commit/e58a657bcfda5df8ce0812f888d24ba361fdaf18))
- **dbx:** disable service worker caching issue provider stuff completely for now [#645](https://github.com/johannesjo/super-productivity/issues/645) ([dd9a15d](https://github.com/johannesjo/super-productivity/commit/dd9a15d8e0c001c976f90661a41f18be2dae2a6c))
- **dbx:** query string ([dc53465](https://github.com/johannesjo/super-productivity/commit/dc53465749c916a140024fd05c7f05c8880af7aa))
- **dbx:** use POST instead of GET ([479ad4c](https://github.com/johannesjo/super-productivity/commit/479ad4c491708b61b518373374539e747be03b9c))
- "GitHub" instead of "Github" ([7dbcb53](https://github.com/johannesjo/super-productivity/commit/7dbcb5394c9b5fa5dd725f5f6f898f9151b43248))
- "GitLab" instead of "Gitlab" ([8a2e683](https://github.com/johannesjo/super-productivity/commit/8a2e683195d535912e78228e3521235620eda52c))
- always make sure all data is loaded before loading context data [#600](https://github.com/johannesjo/super-productivity/issues/600) ([10f1ea5](https://github.com/johannesjo/super-productivity/commit/10f1ea5a68d2786d1190c7e8952b0b5c2d99d4dc))
- app confirm quit not working when sync is enabled [#579](https://github.com/johannesjo/super-productivity/issues/579) ([2325a98](https://github.com/johannesjo/super-productivity/commit/2325a98282825b444c9df874ab5d6966762ff232))
- code formatting ([263017f](https://github.com/johannesjo/super-productivity/commit/263017f85749999b390df8d61bbe43006accb054))
- strip trailing jira host slash ([7f18d46](https://github.com/johannesjo/super-productivity/commit/7f18d4663514a2c65da688dd1b3af64f271e8592))
- wrong background image used for mac os version when set from settings [#627](https://github.com/johannesjo/super-productivity/issues/627) ([719cb0f](https://github.com/johannesjo/super-productivity/commit/719cb0fcb8595e83a82219e9da07fad02846cfcd))

### Features

- **i18n:** provide "send feedback" button [#284](https://github.com/johannesjo/super-productivity/issues/284) ([57e10d6](https://github.com/johannesjo/super-productivity/commit/57e10d6096a28d70f3f99a73faabaccf878c2aaf))
- provide "send feedback" button [#284](https://github.com/johannesjo/super-productivity/issues/284) ([6e91afc](https://github.com/johannesjo/super-productivity/commit/6e91afc1a95e9f9b491d9cfa2a0bd8b34e1226cf))
- **allTasksForSummary:** add loading spinner ([353f155](https://github.com/johannesjo/super-productivity/commit/353f155c714ff2fa14ab6c3c3fc09249ff13c7ab))
- **allTasksForSummary:** make it work for real ([60e235b](https://github.com/johannesjo/super-productivity/commit/60e235b413875f1009408059613d07e1b35a9f81))
- **tray:** also update for pomodoro [#241](https://github.com/johannesjo/super-productivity/issues/241) ([8734114](https://github.com/johannesjo/super-productivity/commit/87341144d199ea4812dc5a8cb080980d7b95c078))
- **tray:** update icons and handle running without estimate ([952477a](https://github.com/johannesjo/super-productivity/commit/952477a75d7d5e17cc0c45b31f4027d52adf5db1))
- improve bg image handling ([f2076b0](https://github.com/johannesjo/super-productivity/commit/f2076b01bcbf81304ad5e13cec5594001cf850d8))
- **allTasksForSummary:** also calculate timeSpent and timeEstimate according to task list ([d8bba64](https://github.com/johannesjo/super-productivity/commit/d8bba64aecad93dc3f2b9c5b1097f03ba6913f5f))
- **allTasksForSummary:** make it work for repeatable tasks today as well ([97d8289](https://github.com/johannesjo/super-productivity/commit/97d8289592719222db24994b8cf4ec39af1ec53e))
- add missing icon ([12ca231](https://github.com/johannesjo/super-productivity/commit/12ca231013c81cf297170eb893741d4f221c0761))
- **allTasksForSummary:** make archive sub tasks work for tags ([45fbf11](https://github.com/johannesjo/super-productivity/commit/45fbf11961ce9b36c7b0b2dcfed2abbf0020db58))
- **allTasksForSummary:** make it work ([8cd83d7](https://github.com/johannesjo/super-productivity/commit/8cd83d7a71a62bf5ddc665a7ff3b73739934f598))
- **allTasksForSummary:** make it work for today ([ba1bce7](https://github.com/johannesjo/super-productivity/commit/ba1bce784fdd957965a6fb6a02d9d8f9df026aa8))
- **allTasksForSummary:** make updating archived tasks work ([13f7512](https://github.com/johannesjo/super-productivity/commit/13f75129147d1ff8b9634a84839905f94bc38929))
- **allTasksForSummary:** show all tasks for daily summary ([66af369](https://github.com/johannesjo/super-productivity/commit/66af369873daf11b3e81deabc64d21985e45ce97))
- **allTasksForSummary:** show sub tasks in order and only once ([28a465b](https://github.com/johannesjo/super-productivity/commit/28a465bf786edb3c854258e40f0eb027a4480d59))
- **betterTray:** add various circle images ([d20942c](https://github.com/johannesjo/super-productivity/commit/d20942c2ee28f09db30f8f98ec73cc6b4cab7928))
- **i18n:** update translations ([07c2f04](https://github.com/johannesjo/super-productivity/commit/07c2f047e91a9b014c7a93aaeaa01033720aeb61))
- **tray:** add new icon ([ed1ff92](https://github.com/johannesjo/super-productivity/commit/ed1ff92c96d8b9890cd2df59512dafa4147ce1ca))
- **tray:** update icons ([5e34c23](https://github.com/johannesjo/super-productivity/commit/5e34c239ab81ffaf9215ea04b187d70538bb57d3))
- add creation date [#617](https://github.com/johannesjo/super-productivity/issues/617) ([5864095](https://github.com/johannesjo/super-productivity/commit/586409543de21e871070b154d190e61e062c7283))
- improve get settings ([2405b38](https://github.com/johannesjo/super-productivity/commit/2405b38f6eced526b5266ce6cc91101af70a5041))
- load custom styles from userData folder [#210](https://github.com/johannesjo/super-productivity/issues/210) ([f9b3ccf](https://github.com/johannesjo/super-productivity/commit/f9b3ccf26ffff99b111c19e94d47d2fd76cf8e8c))
- **tray:** add settings for hiding current task at Mac menu bar icon ([c63e3e9](https://github.com/johannesjo/super-productivity/commit/c63e3e9d3386fa1fd80823a482b32a0890065a97))
- **tray:** add translation key for "show current task" setting ([b95d0ec](https://github.com/johannesjo/super-productivity/commit/b95d0ecc236f8d4f798998c367fc99090de7298b))
- **tray:** make most basic version work ([c9a4e82](https://github.com/johannesjo/super-productivity/commit/c9a4e8270b758e446fc44b4c87d83f64ef0167e3))
- **tray:** reset language files to commit 10f1ea5a68d2 ([592e15e](https://github.com/johannesjo/super-productivity/commit/592e15e27dc187b95e341e6c001f5f76892ccd8a))
- adjust get settings ([09e03e5](https://github.com/johannesjo/super-productivity/commit/09e03e50fce7172f049853559cbaed85bf348919))
- mute color a little more for creation date [#617](https://github.com/johannesjo/super-productivity/issues/617) ([8764338](https://github.com/johannesjo/super-productivity/commit/8764338a66a412c3d8b91bb887553814edcf6f12))
- **webDav:** improve cors message ([14c0f77](https://github.com/johannesjo/super-productivity/commit/14c0f7743cb394e9bde0842087bc46b4fa2d7fa6))
- disable initial dialog for f-droid users ([4d5a2cb](https://github.com/johannesjo/super-productivity/commit/4d5a2cbb43a92e6111277634d23e3e281c18b547))

## [6.0.1](https://github.com/johannesjo/super-productivity/compare/v6.0.0...v6.0.1) (2020-10-24)

### Bug Fixes

- broken sync migration for older data states [#605](https://github.com/johannesjo/super-productivity/issues/605) ([8064f20](https://github.com/johannesjo/super-productivity/commit/8064f2045f20212d8a74065698024b1979c26618))

### Features

- **autoRepair:** check data for missing projects ([09b7e30](https://github.com/johannesjo/super-productivity/commit/09b7e3065c095bc193830c40722d14acc3c48c5a))
- **autoRepair:** make autofix missing projectId work ([afa66ae](https://github.com/johannesjo/super-productivity/commit/afa66ae7286eaef6b7a84c208f4086be42cd1124))

# [6.0.0](https://github.com/johannesjo/super-productivity/compare/v6.0.0-rc.5...v6.0.0) (2020-10-23)

### Bug Fixes

- **sync:** error message not shown as it should ([9c4f8de](https://github.com/johannesjo/super-productivity/commit/9c4f8de66c4edcb938b83e7bdebcb8509b7fe4fc))
- delete a keyboard shortcut ([3d977da](https://github.com/johannesjo/super-productivity/commit/3d977da4031182fb1db1af992bf127b789e5e37e))
- **Gitlab:** importe opened issues only ([cf06455](https://github.com/johannesjo/super-productivity/commit/cf064556f5f32a8529db322de37cc0a9b51e3970))
- **Gitlab:** improve search feature ([010fbd8](https://github.com/johannesjo/super-productivity/commit/010fbd84adc70324ec27fe9a1b1f6162fc4e7776))
- **Gitlab:** send less requests to update issues ([e400189](https://github.com/johannesjo/super-productivity/commit/e400189d1bc5140f43ca4d22e8496741cd81b883))
- **schedule:** day selection not switching time ([c67d44d](https://github.com/johannesjo/super-productivity/commit/c67d44d9783d094ca1f9fb9609c8510797e2e2a4))
- **schedule:** default state ([dfb4490](https://github.com/johannesjo/super-productivity/commit/dfb449049672ca80f149ce2ae762b80de6033b50))

### Features

- **android:** hide google drive for fdroid ([a37fb6a](https://github.com/johannesjo/super-productivity/commit/a37fb6a67651d8f70ef57be369a6db1d58d4cdaf))
- **docs:** add info on how to remove a shortcut ([31dce4f](https://github.com/johannesjo/super-productivity/commit/31dce4fbdc980229e63a7531d5e3ff64bd4f3076))
- **Gitlab:** Bulk update issues ([f998429](https://github.com/johannesjo/super-productivity/commit/f998429f0eb0a10a209af477cac82827e7cf7475))
- **i18n:** update all missing translations ([66af683](https://github.com/johannesjo/super-productivity/commit/66af683c255b1fadd80fc71b46541ae44e65feff))
- **sync:** improve error handling [#599](https://github.com/johannesjo/super-productivity/issues/599) ([6aa0dae](https://github.com/johannesjo/super-productivity/commit/6aa0dae3f0ff1cc7025db266bf5f1c5d4a28490c))

# [6.0.0-rc.5](https://github.com/johannesjo/super-productivity/compare/v6.0.0-rc.4...v6.0.0-rc.5) (2020-10-19)

### Bug Fixes

- **sync:** lastSync being newer than local [#596](https://github.com/johannesjo/super-productivity/issues/596) ([622f9ab](https://github.com/johannesjo/super-productivity/commit/622f9ab656234663f81198ba3d9d2e6a0a0d55c6))
- background image not being displayed ([2781448](https://github.com/johannesjo/super-productivity/commit/2781448b696091258c9ba566f1f46bedf1c1855c))
- fullscreen textarea for firefox [#308](https://github.com/johannesjo/super-productivity/issues/308) ([1d0ad2e](https://github.com/johannesjo/super-productivity/commit/1d0ad2e055e9cd9a33472cdcc57120f876e87d81))
- get rid of excess scrollbar ([f1799b7](https://github.com/johannesjo/super-productivity/commit/f1799b7c8609d7b57876cb8797985e044ac282e2))

### Features

- **sync:** use idb rather than localStorage to avoid issues with deleted ls after crash [#596](https://github.com/johannesjo/super-productivity/issues/596) ([c8d4b09](https://github.com/johannesjo/super-productivity/commit/c8d4b094ed90c989230091e958e00b38cbdf56a1))
- add minimize to tray [#376](https://github.com/johannesjo/super-productivity/issues/376) ([4a495f9](https://github.com/johannesjo/super-productivity/commit/4a495f96c5fdc79e20dbb0a6a1572a3a8835f342))
- add new quote ([f5366c7](https://github.com/johannesjo/super-productivity/commit/f5366c7ea10e81f84e0acae9edbe34f4bd1230f0))
- also show new background image for migrating users ([f953468](https://github.com/johannesjo/super-productivity/commit/f953468d694852d170c46fdb731e05b37020493a))
- improve and unify waiting for initial sync ([d5a6dbc](https://github.com/johannesjo/super-productivity/commit/d5a6dbc78be1daeb06e5e3adf89b26ac94399ea9))
- move add task bar to bottom for mobile ([fffe9a6](https://github.com/johannesjo/super-productivity/commit/fffe9a66583677e86e0fe791b9f76d896713f42c))
- play done sound when selected on settings ([1171277](https://github.com/johannesjo/super-productivity/commit/1171277d4571f20e66f5c04297bf9ceb004a94fb))

# [6.0.0-rc.4](https://github.com/johannesjo/super-productivity/compare/v6.0.0-rc.3...v6.0.0-rc.4) (2020-10-17)

### Bug Fixes

- reload not working ([afca335](https://github.com/johannesjo/super-productivity/commit/afca335102250ea47909fc3b3d40884eba3b8def))
- tray icon for mac build ([aafc941](https://github.com/johannesjo/super-productivity/commit/aafc941572a00b3c45db4b2138103da85c80af18))

### Features

- improve notes markdown panel styling ([441561a](https://github.com/johannesjo/super-productivity/commit/441561ac5297cc04e25eb7a697a4b426161ecf0a))
- **reminder:** slightly improve view task reminder dialog ([156edf2](https://github.com/johannesjo/super-productivity/commit/156edf286f25465cbc71d0e6d50f671b8354d23d))

# [6.0.0-rc.3](https://github.com/johannesjo/super-productivity/compare/v5.9.15...v6.0.0-rc.3) (2020-10-16)

### Bug Fixes

- **shortSynax:** time comes first case ([f51f92f](https://github.com/johannesjo/super-productivity/commit/f51f92f12340136c4f0898d762932a8d7e7272c2))
- **shortSyntax:** "asd #asd" case ([d8d5ae7](https://github.com/johannesjo/super-productivity/commit/d8d5ae78aba2fa9f73ff122c7e59463e9175cde2))
- sub task hover controls for light theme ([25fb62d](https://github.com/johannesjo/super-productivity/commit/25fb62db6eaad23c8e724a2af0376e73bce80027))
- sub tasks not getting elevated if parent is selected ([ce240c8](https://github.com/johannesjo/super-productivity/commit/ce240c8594a0a4bfb99b87ce4ebad3124f171ca7))
- swipe block styling ([ee6092e](https://github.com/johannesjo/super-productivity/commit/ee6092e3b747853ea2bc2f5c28925f3af3440a19))
- **sync:** final sync [#159](https://github.com/johannesjo/super-productivity/issues/159) ([f4511dd](https://github.com/johannesjo/super-productivity/commit/f4511dd6316460e513ef5307458b36bb3e97eb2e))
- **sync:** getRevAndLastClientUpdate [#159](https://github.com/johannesjo/super-productivity/issues/159) ([8e7a889](https://github.com/johannesjo/super-productivity/commit/8e7a889a09f0f21b7a0fb6a4689519313ce183c9))
- **sync:** tmp fixes [#159](https://github.com/johannesjo/super-productivity/issues/159) ([f4f5a77](https://github.com/johannesjo/super-productivity/commit/f4f5a77820bdb19ddabfde03b462a3d4a8873ea7))
- **webDav:** add missing translation [#159](https://github.com/johannesjo/super-productivity/issues/159) ([6c50157](https://github.com/johannesjo/super-productivity/commit/6c501577d21fe5b6c5747f8a81f74b1e32ae1f37))
- **webDav:** lastSync not getting updated after conflict dialog upload [#159](https://github.com/johannesjo/super-productivity/issues/159) ([4ab90a7](https://github.com/johannesjo/super-productivity/commit/4ab90a70fcbedfb8d44d129fe58cc37015b82da4))
- broken close behaviour [#567](https://github.com/johannesjo/super-productivity/issues/567) ([4f5212f](https://github.com/johannesjo/super-productivity/commit/4f5212fcb2cdae325105523b5482e31730eee751))
- **webDav:** conflict dialog text [#159](https://github.com/johannesjo/super-productivity/issues/159) ([e9b46e1](https://github.com/johannesjo/super-productivity/commit/e9b46e15a286975934efe9919a0b9a4897c6a609))
- **webDav:** lint [#159](https://github.com/johannesjo/super-productivity/issues/159) ([28e57e4](https://github.com/johannesjo/super-productivity/commit/28e57e419996e735815a1ff8b28897e54350f3ab))
- **webDav:** no text for loading bar [#159](https://github.com/johannesjo/super-productivity/issues/159) ([5a8fb73](https://github.com/johannesjo/super-productivity/commit/5a8fb73015319d2e206f2e4038ebff1dd8670743))
- **webDav:** prevent negative number of requests [#159](https://github.com/johannesjo/super-productivity/issues/159) ([66b9b76](https://github.com/johannesjo/super-productivity/commit/66b9b76512122b675f56e8e798a6682311eec09c))

### Features

- **backgroundImage:** add default for dark theme ([a07287f](https://github.com/johannesjo/super-productivity/commit/a07287f0c0d12dbdf93297cdceefbcc98f9a5b2e))
- **backgroundImage:** be consistent with default dark or light ([139485f](https://github.com/johannesjo/super-productivity/commit/139485f84120dee4cf35a1a2ba2b1b625626a461))
- **backgroundImage:** show on page load as well ([0bc58c7](https://github.com/johannesjo/super-productivity/commit/0bc58c76b0e8710facdd34ac90ba0fee465eeaef))
- **backgroundImage:** split up in dark and light theme background image ([f03589e](https://github.com/johannesjo/super-productivity/commit/f03589edb2f0692c000efd27a095e1a4551c3063))
- add right margin for sub tasks ([bd5b8f2](https://github.com/johannesjo/super-productivity/commit/bd5b8f27d00aef29bffa4186ccbb68da189e5832))
- add shadows ([66a9b07](https://github.com/johannesjo/super-productivity/commit/66a9b071565f762acd7a5baeb44e0740f2ea87c5))
- adjust background color for drag & drop ([e937189](https://github.com/johannesjo/super-productivity/commit/e937189946d75c737cb9a524621b9990e7f537bd))
- adjust background gradient ([c7dd512](https://github.com/johannesjo/super-productivity/commit/c7dd512df9e39a961dfb9986015403f54b454b0e))
- adjust background gradient to be more gentle ([1c7959c](https://github.com/johannesjo/super-productivity/commit/1c7959c9b82735faad0aeb5b7522f87b3dd1eb97))
- adjust current styles for dark theme ([2f929fa](https://github.com/johannesjo/super-productivity/commit/2f929fad68de051c8a339507bd877f186cb76e61))
- adjust light theme darker color ([a7e13ac](https://github.com/johannesjo/super-productivity/commit/a7e13acae7de239a3618a874cfae7cf5827df213))
- allow custom background images ([c943ac9](https://github.com/johannesjo/super-productivity/commit/c943ac98d28e7fc91a96d4533fff4d22a6fef7f8))
- always show border radius for drag & drop ([8900b13](https://github.com/johannesjo/super-productivity/commit/8900b13e7dd01234cbb2ba1bf5ff26d95dda1cc2))
- change default background color and add little app start ani ([54c8310](https://github.com/johannesjo/super-productivity/commit/54c83109f4f75653cbc5651ced85d50f5a826dd8))
- decrease border radius a little ([f08b3a2](https://github.com/johannesjo/super-productivity/commit/f08b3a2be56777ab689704caa8ac2d64ec50cbf1))
- don't hide border for light theme when selected ([2971b7a](https://github.com/johannesjo/super-productivity/commit/2971b7aba78f97fea51fc7c141966bea19264cb3))
- don't use current border for dark theme ([4767577](https://github.com/johannesjo/super-productivity/commit/476757711ada411c18942941c750fc0021ebbbf7))
- elevate current task more ([cf3ea00](https://github.com/johannesjo/super-productivity/commit/cf3ea0012c4b449a1fbecdda1b00e5d388385ebd))
- get rid of drawer border ([6fe0ab2](https://github.com/johannesjo/super-productivity/commit/6fe0ab2a85241fc2044c8da49892f48f3163e679))
- get rid of excess isSelected class ([7a64e4a](https://github.com/johannesjo/super-productivity/commit/7a64e4ab884d35999695f3cd4ba6e9578e3e6dae))
- give all items their own depth ([cc590ac](https://github.com/johannesjo/super-productivity/commit/cc590aceadc748566db6eb1ec346ba597ced8b7d))
- improve add task bar styling ([fedd4c9](https://github.com/johannesjo/super-productivity/commit/fedd4c98ff5b36843005c5362be7cbb9b12f7a2f))
- improve additional info styling ([8cd2a5c](https://github.com/johannesjo/super-productivity/commit/8cd2a5cb70d9bdf752ec85898ebadc134912e683))
- improve current task styling ([a10422e](https://github.com/johannesjo/super-productivity/commit/a10422e2fcb23b046009d0cea41c08a068859f7a))
- improve dark theme notes style ([9f33bde](https://github.com/johannesjo/super-productivity/commit/9f33bdef2a976043deda172f4e54946a8c762acc))
- improve dark theme text legibility ([a899d90](https://github.com/johannesjo/super-productivity/commit/a899d90e014b305dc1c885fa8f7e15015d2fdcfb))
- improve light theme sub tasks ([2e5beb8](https://github.com/johannesjo/super-productivity/commit/2e5beb8ee76fa8162308444ef8acab29ae7a7d4c))
- improve styling for very large screens ([4f42c57](https://github.com/johannesjo/super-productivity/commit/4f42c575acaaa79fc9fb20e29fa6fb41a9f77e59))
- **sync:** highlight newest sync item ([1bfeab4](https://github.com/johannesjo/super-productivity/commit/1bfeab43c55af0bd672fda9c10f95852c7d6ede3))
- improve sub task in selected styling ([172a93c](https://github.com/johannesjo/super-productivity/commit/172a93cd17207938aaa1afe1febf98ba347b11e3))
- increase task border radius ([84de628](https://github.com/johannesjo/super-productivity/commit/84de628b94a15e0fde78a63db058211b7fced1ec))
- increase task selected dark theme shadow ([f20c6d7](https://github.com/johannesjo/super-productivity/commit/f20c6d72c81430d89f935ecf56e2322f77f729cf))
- light up text color for current and selected ([702b3c5](https://github.com/johannesjo/super-productivity/commit/702b3c5983dd9a2ebb03d1b0c73cee367ac5b667))
- make completed tasks a little less dark ([71e4ab6](https://github.com/johannesjo/super-productivity/commit/71e4ab6d0627d3e9c32be8beb2ba2b726703077f))
- make hover controls work for dark theme ([6dca8ed](https://github.com/johannesjo/super-productivity/commit/6dca8ed65f9b247bee89a5f85b7a4b65bf81543f))
- make light theme work ([34817ba](https://github.com/johannesjo/super-productivity/commit/34817ba0a5616eb5e180925f0f0b1e8275f5ab27))
- more style detail improvements ([75064aa](https://github.com/johannesjo/super-productivity/commit/75064aa249a07eb1685b7ec819b07bfd35b2762e))
- reduce distance between tasks ([35e7be4](https://github.com/johannesjo/super-productivity/commit/35e7be47d7571cad61b054fe4e21c5894d969b4d))
- slightly lighter variant ([b55298d](https://github.com/johannesjo/super-productivity/commit/b55298db48c38a512fc337a96e087ff414bc890d))
- style detail improvements ([2512abe](https://github.com/johannesjo/super-productivity/commit/2512abecc3f6e1d189a75fdbf3fc55bd74cd55da))
- **sync:** add boilerplate for new sync config component ([edf4224](https://github.com/johannesjo/super-productivity/commit/edf422449f2bed475734599607b071681a336210))
- **sync:** add example for sync file path [#159](https://github.com/johannesjo/super-productivity/issues/159) ([1b248ba](https://github.com/johannesjo/super-productivity/commit/1b248baccd14a4133fcf5b02a6beb418273569a8))
- **sync:** add missing translation [#159](https://github.com/johannesjo/super-productivity/issues/159) ([f42e26a](https://github.com/johannesjo/super-productivity/commit/f42e26ae0d360bb42e77788243f4ca8af21b9408))
- **sync:** google half way [#159](https://github.com/johannesjo/super-productivity/issues/159) ([eba34d3](https://github.com/johannesjo/super-productivity/commit/eba34d347a57a65c4aa14d17181836f26515f137))
- **sync:** improve error handling [#159](https://github.com/johannesjo/super-productivity/issues/159) ([d157c53](https://github.com/johannesjo/super-productivity/commit/d157c53d0e27b58948c7a0beace73b75a0b4f2c8))
- **sync:** improve error handling for google drive [#159](https://github.com/johannesjo/super-productivity/issues/159) ([7c73fc9](https://github.com/johannesjo/super-productivity/commit/7c73fc937d560c9e6c904bfa0daf7a0a4c5c27be))
- **sync:** make file name change work [#159](https://github.com/johannesjo/super-productivity/issues/159) ([be13862](https://github.com/johannesjo/super-productivity/commit/be138620cc02e617679a60f169f96fd94a168627))
- **sync:** make initial sync work for google drive [#159](https://github.com/johannesjo/super-productivity/issues/159) ([15f4e71](https://github.com/johannesjo/super-productivity/commit/15f4e71824012ee610420846404a9e84528e3108))
- **sync:** make major model version change [#159](https://github.com/johannesjo/super-productivity/issues/159) ([c602d88](https://github.com/johannesjo/super-productivity/commit/c602d888d0711b2ac42ac6ee41488fcc6ea138e8))
- **sync:** make most basic config section work [#159](https://github.com/johannesjo/super-productivity/issues/159) ([6aaa1b5](https://github.com/johannesjo/super-productivity/commit/6aaa1b551d954b8e00ef9f044fb877957d3f1e21))
- **sync:** make new structure work for dropbox [#159](https://github.com/johannesjo/super-productivity/issues/159) ([40533dd](https://github.com/johannesjo/super-productivity/commit/40533ddbb3dc03245efa42ee5965180f65ee57db))
- **sync:** make new structure work for google drive [#159](https://github.com/johannesjo/super-productivity/issues/159) ([afcd1d5](https://github.com/johannesjo/super-productivity/commit/afcd1d55a3d2d2bb3eb6fcc50f2648084c52944c))
- **sync:** make new sync form work for dropbox [#159](https://github.com/johannesjo/super-productivity/issues/159) ([c876a32](https://github.com/johannesjo/super-productivity/commit/c876a326b0cdaed88e0e75ed8b6282b4de12d4b9))
- **sync:** make rev work [#159](https://github.com/johannesjo/super-productivity/issues/159) ([403e8b0](https://github.com/johannesjo/super-productivity/commit/403e8b036ab43fbe6c2197c6bea851011532519d))
- **sync:** make sync provider work for now [#159](https://github.com/johannesjo/super-productivity/issues/159) ([540e70d](https://github.com/johannesjo/super-productivity/commit/540e70d1b68e00766eeaf2acc6ada1ec6f238069))
- **sync:** make upload and download and compression work [#159](https://github.com/johannesjo/super-productivity/issues/159) ([379be5c](https://github.com/johannesjo/super-productivity/commit/379be5c8159e57a84acd42a0a018915419098c2a))
- **sync:** make upload data work [#159](https://github.com/johannesjo/super-productivity/issues/159) ([218100b](https://github.com/johannesjo/super-productivity/commit/218100b7b20b1602694988c8e0778374c0b37733))
- **sync:** move config for google drive [#159](https://github.com/johannesjo/super-productivity/issues/159) ([765f4f9](https://github.com/johannesjo/super-productivity/commit/765f4f94d8fe2f41f56fef548c742915abc4c1e0))
- **sync:** outline new google drive sync service [#159](https://github.com/johannesjo/super-productivity/issues/159) ([becc55e](https://github.com/johannesjo/super-productivity/commit/becc55e3d99f1ea02a215accd371fed1b60b1caa))
- **sync:** outline new google drive sync service [#159](https://github.com/johannesjo/super-productivity/issues/159) ([906a842](https://github.com/johannesjo/super-productivity/commit/906a8421e52de269f8acfae612b392a6f3f61cb9))
- **sync:** prepare config component [#159](https://github.com/johannesjo/super-productivity/issues/159) ([7026388](https://github.com/johannesjo/super-productivity/commit/7026388b4cca5c8172182cc7d03df4990ff640e3))
- **sync:** simplify further for dropbox [#159](https://github.com/johannesjo/super-productivity/issues/159) ([5ac2227](https://github.com/johannesjo/super-productivity/commit/5ac22276d7f4a7f85d8b0e0d042fcd74ee174650))
- **sync:** simplify further for google drive [#159](https://github.com/johannesjo/super-productivity/issues/159) ([ce110b8](https://github.com/johannesjo/super-productivity/commit/ce110b8885b42ed6797f01783c5d6836458be91b))
- **sync:** update translations for all languages [#159](https://github.com/johannesjo/super-productivity/issues/159) ([2f10b05](https://github.com/johannesjo/super-productivity/commit/2f10b05ed6ca9f9564d0b21154242b2560238bc5))
- **task:** style adjustments ([c1d4566](https://github.com/johannesjo/super-productivity/commit/c1d456600870cd0bbd82dd71f02160309148c3c7))
- **webDav:** add boilerplate [#159](https://github.com/johannesjo/super-productivity/issues/159) ([31547e5](https://github.com/johannesjo/super-productivity/commit/31547e578172f79aa5570051316384f8ee2be695))
- **webDav:** add config for basic auth [#159](https://github.com/johannesjo/super-productivity/issues/159) ([a443134](https://github.com/johannesjo/super-productivity/commit/a443134f937d4150c1b16aedc5a406adcaa2d99b))
- **webDav:** add info about cors [#159](https://github.com/johannesjo/super-productivity/issues/159) ([d39216b](https://github.com/johannesjo/super-productivity/commit/d39216b224d3cb0669da60af08ec0bf60d170faa))
- **webDav:** add info for base url [#159](https://github.com/johannesjo/super-productivity/issues/159) ([6f65c53](https://github.com/johannesjo/super-productivity/commit/6f65c53177cd7a9aefc6fadc42f1fd8f8ccd666e))
- **webDav:** always set rev and last sync together [#159](https://github.com/johannesjo/super-productivity/issues/159) ([7b98859](https://github.com/johannesjo/super-productivity/commit/7b988597d740302e9029ddc400a037d654966278))
- **webDav:** improve getRevAndLastClientUpdate for dropbox [#159](https://github.com/johannesjo/super-productivity/issues/159) ([b47706c](https://github.com/johannesjo/super-productivity/commit/b47706c60fa1637c11b74c144a856242dcc0551a))
- **webDav:** improve getRevAndLastClientUpdate for googleDrive and WebDAV [#159](https://github.com/johannesjo/super-productivity/issues/159) ([0de826a](https://github.com/johannesjo/super-productivity/commit/0de826ace585b2e3e939236280f44df93488b540))
- **webDav:** improve initial sync handling [#159](https://github.com/johannesjo/super-productivity/issues/159) ([20d7884](https://github.com/johannesjo/super-productivity/commit/20d7884782611b8f7a8eea0cb110e04193d56f67))
- **webDav:** improve progress bar label [#159](https://github.com/johannesjo/super-productivity/issues/159) ([280c138](https://github.com/johannesjo/super-productivity/commit/280c13897dfa30a84629d99a6903fb0dce354046))
- **webDav:** make check rev work when there is no file yet [#159](https://github.com/johannesjo/super-productivity/issues/159) ([2b40a2d](https://github.com/johannesjo/super-productivity/commit/2b40a2d2eec3d4178272284b684f50218f452df9))
- **webDav:** make rev for uploadAppData work [#159](https://github.com/johannesjo/super-productivity/issues/159) ([18f3e23](https://github.com/johannesjo/super-productivity/commit/18f3e23d1362d6e4234faf3de7002bda287cac4f))
- **webDav:** make upload and download work [#159](https://github.com/johannesjo/super-productivity/issues/159) ([79f890f](https://github.com/johannesjo/super-productivity/commit/79f890f9e73cced0c86610ebf112597aa41edcfc))
- **webDav:** manually trigger global progress bar for upload [#159](https://github.com/johannesjo/super-productivity/issues/159) ([c4d7ecd](https://github.com/johannesjo/super-productivity/commit/c4d7ecdddb8c485737303a274fb6579af4f2454c))
- **webDav:** migration [#159](https://github.com/johannesjo/super-productivity/issues/159) ([f340a04](https://github.com/johannesjo/super-productivity/commit/f340a044db9a0a6acaa877d5161e47df9b91f78c))
- **webDav:** only execute effects if needed [#159](https://github.com/johannesjo/super-productivity/issues/159) ([b70863d](https://github.com/johannesjo/super-productivity/commit/b70863d6a3db5764ed0cdb305606a9a6e94218f3))
- **webDav:** update all translations [#159](https://github.com/johannesjo/super-productivity/issues/159) ([1fee72b](https://github.com/johannesjo/super-productivity/commit/1fee72be561138f4c5c546754cfc408f86b7f99b))
- change tray icon theme [#554](https://github.com/johannesjo/super-productivity/issues/554) ([6e86cbf](https://github.com/johannesjo/super-productivity/commit/6e86cbf0cd4dec1cecef58b14c1759c7fe2ee354))

# [6.0.0-rc.2](https://github.com/johannesjo/super-productivity/compare/v6.0.0-rc.1...v6.0.0-rc.2) (2020-10-16)

# [6.0.0-rc.1](https://github.com/johannesjo/super-productivity/compare/v6.0.0-rc.0...v6.0.0-rc.1) (2020-10-16)

### Features

- **backgroundImage:** add default for dark theme ([a07287f](https://github.com/johannesjo/super-productivity/commit/a07287f0c0d12dbdf93297cdceefbcc98f9a5b2e))
- **backgroundImage:** be consistent with default dark or light ([139485f](https://github.com/johannesjo/super-productivity/commit/139485f84120dee4cf35a1a2ba2b1b625626a461))
- **backgroundImage:** show on page load as well ([0bc58c7](https://github.com/johannesjo/super-productivity/commit/0bc58c76b0e8710facdd34ac90ba0fee465eeaef))
- **backgroundImage:** split up in dark and light theme background image ([f03589e](https://github.com/johannesjo/super-productivity/commit/f03589edb2f0692c000efd27a095e1a4551c3063))

# [6.0.0-rc.0](https://github.com/johannesjo/super-productivity/compare/v5.9.15...v6.0.0-rc.0) (2020-10-15)

### Bug Fixes

- **shortSynax:** time comes first case ([f51f92f](https://github.com/johannesjo/super-productivity/commit/f51f92f12340136c4f0898d762932a8d7e7272c2))
- **shortSyntax:** "asd #asd" case ([d8d5ae7](https://github.com/johannesjo/super-productivity/commit/d8d5ae78aba2fa9f73ff122c7e59463e9175cde2))
- sub task hover controls for light theme ([25fb62d](https://github.com/johannesjo/super-productivity/commit/25fb62db6eaad23c8e724a2af0376e73bce80027))
- sub tasks not getting elevated if parent is selected ([ce240c8](https://github.com/johannesjo/super-productivity/commit/ce240c8594a0a4bfb99b87ce4ebad3124f171ca7))
- swipe block styling ([ee6092e](https://github.com/johannesjo/super-productivity/commit/ee6092e3b747853ea2bc2f5c28925f3af3440a19))
- **sync:** final sync [#159](https://github.com/johannesjo/super-productivity/issues/159) ([f4511dd](https://github.com/johannesjo/super-productivity/commit/f4511dd6316460e513ef5307458b36bb3e97eb2e))
- **sync:** getRevAndLastClientUpdate [#159](https://github.com/johannesjo/super-productivity/issues/159) ([8e7a889](https://github.com/johannesjo/super-productivity/commit/8e7a889a09f0f21b7a0fb6a4689519313ce183c9))
- **sync:** tmp fixes [#159](https://github.com/johannesjo/super-productivity/issues/159) ([f4f5a77](https://github.com/johannesjo/super-productivity/commit/f4f5a77820bdb19ddabfde03b462a3d4a8873ea7))
- **webDav:** add missing translation [#159](https://github.com/johannesjo/super-productivity/issues/159) ([6c50157](https://github.com/johannesjo/super-productivity/commit/6c501577d21fe5b6c5747f8a81f74b1e32ae1f37))
- **webDav:** lastSync not getting updated after conflict dialog upload [#159](https://github.com/johannesjo/super-productivity/issues/159) ([4ab90a7](https://github.com/johannesjo/super-productivity/commit/4ab90a70fcbedfb8d44d129fe58cc37015b82da4))
- broken close behaviour [#567](https://github.com/johannesjo/super-productivity/issues/567) ([4f5212f](https://github.com/johannesjo/super-productivity/commit/4f5212fcb2cdae325105523b5482e31730eee751))
- **webDav:** conflict dialog text [#159](https://github.com/johannesjo/super-productivity/issues/159) ([e9b46e1](https://github.com/johannesjo/super-productivity/commit/e9b46e15a286975934efe9919a0b9a4897c6a609))
- **webDav:** lint [#159](https://github.com/johannesjo/super-productivity/issues/159) ([28e57e4](https://github.com/johannesjo/super-productivity/commit/28e57e419996e735815a1ff8b28897e54350f3ab))
- **webDav:** no text for loading bar [#159](https://github.com/johannesjo/super-productivity/issues/159) ([5a8fb73](https://github.com/johannesjo/super-productivity/commit/5a8fb73015319d2e206f2e4038ebff1dd8670743))
- **webDav:** prevent negative number of requests [#159](https://github.com/johannesjo/super-productivity/issues/159) ([66b9b76](https://github.com/johannesjo/super-productivity/commit/66b9b76512122b675f56e8e798a6682311eec09c))

### Features

- improve styling for very large screens ([4f42c57](https://github.com/johannesjo/super-productivity/commit/4f42c575acaaa79fc9fb20e29fa6fb41a9f77e59))
- **sync:** add boilerplate for new sync config component ([edf4224](https://github.com/johannesjo/super-productivity/commit/edf422449f2bed475734599607b071681a336210))
- **sync:** highlight newest sync item ([1bfeab4](https://github.com/johannesjo/super-productivity/commit/1bfeab43c55af0bd672fda9c10f95852c7d6ede3))
- add right margin for sub tasks ([bd5b8f2](https://github.com/johannesjo/super-productivity/commit/bd5b8f27d00aef29bffa4186ccbb68da189e5832))
- add shadows ([66a9b07](https://github.com/johannesjo/super-productivity/commit/66a9b071565f762acd7a5baeb44e0740f2ea87c5))
- adjust background color for drag & drop ([e937189](https://github.com/johannesjo/super-productivity/commit/e937189946d75c737cb9a524621b9990e7f537bd))
- adjust background gradient ([c7dd512](https://github.com/johannesjo/super-productivity/commit/c7dd512df9e39a961dfb9986015403f54b454b0e))
- adjust background gradient to be more gentle ([1c7959c](https://github.com/johannesjo/super-productivity/commit/1c7959c9b82735faad0aeb5b7522f87b3dd1eb97))
- adjust current styles for dark theme ([2f929fa](https://github.com/johannesjo/super-productivity/commit/2f929fad68de051c8a339507bd877f186cb76e61))
- adjust light theme darker color ([a7e13ac](https://github.com/johannesjo/super-productivity/commit/a7e13acae7de239a3618a874cfae7cf5827df213))
- allow custom background images ([c943ac9](https://github.com/johannesjo/super-productivity/commit/c943ac98d28e7fc91a96d4533fff4d22a6fef7f8))
- always show border radius for drag & drop ([8900b13](https://github.com/johannesjo/super-productivity/commit/8900b13e7dd01234cbb2ba1bf5ff26d95dda1cc2))
- change default background color and add little app start ani ([54c8310](https://github.com/johannesjo/super-productivity/commit/54c83109f4f75653cbc5651ced85d50f5a826dd8))
- decrease border radius a little ([f08b3a2](https://github.com/johannesjo/super-productivity/commit/f08b3a2be56777ab689704caa8ac2d64ec50cbf1))
- don't hide border for light theme when selected ([2971b7a](https://github.com/johannesjo/super-productivity/commit/2971b7aba78f97fea51fc7c141966bea19264cb3))
- don't use current border for dark theme ([4767577](https://github.com/johannesjo/super-productivity/commit/476757711ada411c18942941c750fc0021ebbbf7))
- elevate current task more ([cf3ea00](https://github.com/johannesjo/super-productivity/commit/cf3ea0012c4b449a1fbecdda1b00e5d388385ebd))
- get rid of drawer border ([6fe0ab2](https://github.com/johannesjo/super-productivity/commit/6fe0ab2a85241fc2044c8da49892f48f3163e679))
- get rid of excess isSelected class ([7a64e4a](https://github.com/johannesjo/super-productivity/commit/7a64e4ab884d35999695f3cd4ba6e9578e3e6dae))
- give all items their own depth ([cc590ac](https://github.com/johannesjo/super-productivity/commit/cc590aceadc748566db6eb1ec346ba597ced8b7d))
- improve add task bar styling ([fedd4c9](https://github.com/johannesjo/super-productivity/commit/fedd4c98ff5b36843005c5362be7cbb9b12f7a2f))
- improve additional info styling ([8cd2a5c](https://github.com/johannesjo/super-productivity/commit/8cd2a5cb70d9bdf752ec85898ebadc134912e683))
- improve current task styling ([a10422e](https://github.com/johannesjo/super-productivity/commit/a10422e2fcb23b046009d0cea41c08a068859f7a))
- improve dark theme notes style ([9f33bde](https://github.com/johannesjo/super-productivity/commit/9f33bdef2a976043deda172f4e54946a8c762acc))
- improve dark theme text legibility ([a899d90](https://github.com/johannesjo/super-productivity/commit/a899d90e014b305dc1c885fa8f7e15015d2fdcfb))
- improve light theme sub tasks ([2e5beb8](https://github.com/johannesjo/super-productivity/commit/2e5beb8ee76fa8162308444ef8acab29ae7a7d4c))
- improve sub task in selected styling ([172a93c](https://github.com/johannesjo/super-productivity/commit/172a93cd17207938aaa1afe1febf98ba347b11e3))
- increase task border radius ([84de628](https://github.com/johannesjo/super-productivity/commit/84de628b94a15e0fde78a63db058211b7fced1ec))
- increase task selected dark theme shadow ([f20c6d7](https://github.com/johannesjo/super-productivity/commit/f20c6d72c81430d89f935ecf56e2322f77f729cf))
- light up text color for current and selected ([702b3c5](https://github.com/johannesjo/super-productivity/commit/702b3c5983dd9a2ebb03d1b0c73cee367ac5b667))
- make completed tasks a little less dark ([71e4ab6](https://github.com/johannesjo/super-productivity/commit/71e4ab6d0627d3e9c32be8beb2ba2b726703077f))
- make hover controls work for dark theme ([6dca8ed](https://github.com/johannesjo/super-productivity/commit/6dca8ed65f9b247bee89a5f85b7a4b65bf81543f))
- make light theme work ([34817ba](https://github.com/johannesjo/super-productivity/commit/34817ba0a5616eb5e180925f0f0b1e8275f5ab27))
- more style detail improvements ([75064aa](https://github.com/johannesjo/super-productivity/commit/75064aa249a07eb1685b7ec819b07bfd35b2762e))
- reduce distance between tasks ([35e7be4](https://github.com/johannesjo/super-productivity/commit/35e7be47d7571cad61b054fe4e21c5894d969b4d))
- slightly lighter variant ([b55298d](https://github.com/johannesjo/super-productivity/commit/b55298db48c38a512fc337a96e087ff414bc890d))
- style detail improvements ([2512abe](https://github.com/johannesjo/super-productivity/commit/2512abecc3f6e1d189a75fdbf3fc55bd74cd55da))
- **sync:** add example for sync file path [#159](https://github.com/johannesjo/super-productivity/issues/159) ([1b248ba](https://github.com/johannesjo/super-productivity/commit/1b248baccd14a4133fcf5b02a6beb418273569a8))
- **sync:** add missing translation [#159](https://github.com/johannesjo/super-productivity/issues/159) ([f42e26a](https://github.com/johannesjo/super-productivity/commit/f42e26ae0d360bb42e77788243f4ca8af21b9408))
- **sync:** google half way [#159](https://github.com/johannesjo/super-productivity/issues/159) ([eba34d3](https://github.com/johannesjo/super-productivity/commit/eba34d347a57a65c4aa14d17181836f26515f137))
- **sync:** improve error handling [#159](https://github.com/johannesjo/super-productivity/issues/159) ([d157c53](https://github.com/johannesjo/super-productivity/commit/d157c53d0e27b58948c7a0beace73b75a0b4f2c8))
- **sync:** improve error handling for google drive [#159](https://github.com/johannesjo/super-productivity/issues/159) ([7c73fc9](https://github.com/johannesjo/super-productivity/commit/7c73fc937d560c9e6c904bfa0daf7a0a4c5c27be))
- **sync:** make file name change work [#159](https://github.com/johannesjo/super-productivity/issues/159) ([be13862](https://github.com/johannesjo/super-productivity/commit/be138620cc02e617679a60f169f96fd94a168627))
- **sync:** make initial sync work for google drive [#159](https://github.com/johannesjo/super-productivity/issues/159) ([15f4e71](https://github.com/johannesjo/super-productivity/commit/15f4e71824012ee610420846404a9e84528e3108))
- **sync:** make major model version change [#159](https://github.com/johannesjo/super-productivity/issues/159) ([c602d88](https://github.com/johannesjo/super-productivity/commit/c602d888d0711b2ac42ac6ee41488fcc6ea138e8))
- **sync:** make most basic config section work [#159](https://github.com/johannesjo/super-productivity/issues/159) ([6aaa1b5](https://github.com/johannesjo/super-productivity/commit/6aaa1b551d954b8e00ef9f044fb877957d3f1e21))
- **sync:** make new structure work for dropbox [#159](https://github.com/johannesjo/super-productivity/issues/159) ([40533dd](https://github.com/johannesjo/super-productivity/commit/40533ddbb3dc03245efa42ee5965180f65ee57db))
- **sync:** make new structure work for google drive [#159](https://github.com/johannesjo/super-productivity/issues/159) ([afcd1d5](https://github.com/johannesjo/super-productivity/commit/afcd1d55a3d2d2bb3eb6fcc50f2648084c52944c))
- **sync:** make new sync form work for dropbox [#159](https://github.com/johannesjo/super-productivity/issues/159) ([c876a32](https://github.com/johannesjo/super-productivity/commit/c876a326b0cdaed88e0e75ed8b6282b4de12d4b9))
- **sync:** make rev work [#159](https://github.com/johannesjo/super-productivity/issues/159) ([403e8b0](https://github.com/johannesjo/super-productivity/commit/403e8b036ab43fbe6c2197c6bea851011532519d))
- **sync:** make sync provider work for now [#159](https://github.com/johannesjo/super-productivity/issues/159) ([540e70d](https://github.com/johannesjo/super-productivity/commit/540e70d1b68e00766eeaf2acc6ada1ec6f238069))
- **sync:** make upload and download and compression work [#159](https://github.com/johannesjo/super-productivity/issues/159) ([379be5c](https://github.com/johannesjo/super-productivity/commit/379be5c8159e57a84acd42a0a018915419098c2a))
- **sync:** make upload data work [#159](https://github.com/johannesjo/super-productivity/issues/159) ([218100b](https://github.com/johannesjo/super-productivity/commit/218100b7b20b1602694988c8e0778374c0b37733))
- **sync:** move config for google drive [#159](https://github.com/johannesjo/super-productivity/issues/159) ([765f4f9](https://github.com/johannesjo/super-productivity/commit/765f4f94d8fe2f41f56fef548c742915abc4c1e0))
- **sync:** outline new google drive sync service [#159](https://github.com/johannesjo/super-productivity/issues/159) ([becc55e](https://github.com/johannesjo/super-productivity/commit/becc55e3d99f1ea02a215accd371fed1b60b1caa))
- **sync:** outline new google drive sync service [#159](https://github.com/johannesjo/super-productivity/issues/159) ([906a842](https://github.com/johannesjo/super-productivity/commit/906a8421e52de269f8acfae612b392a6f3f61cb9))
- **sync:** prepare config component [#159](https://github.com/johannesjo/super-productivity/issues/159) ([7026388](https://github.com/johannesjo/super-productivity/commit/7026388b4cca5c8172182cc7d03df4990ff640e3))
- **sync:** simplify further for dropbox [#159](https://github.com/johannesjo/super-productivity/issues/159) ([5ac2227](https://github.com/johannesjo/super-productivity/commit/5ac22276d7f4a7f85d8b0e0d042fcd74ee174650))
- **sync:** simplify further for google drive [#159](https://github.com/johannesjo/super-productivity/issues/159) ([ce110b8](https://github.com/johannesjo/super-productivity/commit/ce110b8885b42ed6797f01783c5d6836458be91b))
- **sync:** update translations for all languages [#159](https://github.com/johannesjo/super-productivity/issues/159) ([2f10b05](https://github.com/johannesjo/super-productivity/commit/2f10b05ed6ca9f9564d0b21154242b2560238bc5))
- **task:** style adjustments ([c1d4566](https://github.com/johannesjo/super-productivity/commit/c1d456600870cd0bbd82dd71f02160309148c3c7))
- **webDav:** add boilerplate [#159](https://github.com/johannesjo/super-productivity/issues/159) ([31547e5](https://github.com/johannesjo/super-productivity/commit/31547e578172f79aa5570051316384f8ee2be695))
- **webDav:** add config for basic auth [#159](https://github.com/johannesjo/super-productivity/issues/159) ([a443134](https://github.com/johannesjo/super-productivity/commit/a443134f937d4150c1b16aedc5a406adcaa2d99b))
- **webDav:** add info about cors [#159](https://github.com/johannesjo/super-productivity/issues/159) ([d39216b](https://github.com/johannesjo/super-productivity/commit/d39216b224d3cb0669da60af08ec0bf60d170faa))
- **webDav:** add info for base url [#159](https://github.com/johannesjo/super-productivity/issues/159) ([6f65c53](https://github.com/johannesjo/super-productivity/commit/6f65c53177cd7a9aefc6fadc42f1fd8f8ccd666e))
- **webDav:** always set rev and last sync together [#159](https://github.com/johannesjo/super-productivity/issues/159) ([7b98859](https://github.com/johannesjo/super-productivity/commit/7b988597d740302e9029ddc400a037d654966278))
- **webDav:** improve getRevAndLastClientUpdate for dropbox [#159](https://github.com/johannesjo/super-productivity/issues/159) ([b47706c](https://github.com/johannesjo/super-productivity/commit/b47706c60fa1637c11b74c144a856242dcc0551a))
- **webDav:** improve getRevAndLastClientUpdate for googleDrive and WebDAV [#159](https://github.com/johannesjo/super-productivity/issues/159) ([0de826a](https://github.com/johannesjo/super-productivity/commit/0de826ace585b2e3e939236280f44df93488b540))
- **webDav:** improve initial sync handling [#159](https://github.com/johannesjo/super-productivity/issues/159) ([20d7884](https://github.com/johannesjo/super-productivity/commit/20d7884782611b8f7a8eea0cb110e04193d56f67))
- **webDav:** improve progress bar label [#159](https://github.com/johannesjo/super-productivity/issues/159) ([280c138](https://github.com/johannesjo/super-productivity/commit/280c13897dfa30a84629d99a6903fb0dce354046))
- **webDav:** make check rev work when there is no file yet [#159](https://github.com/johannesjo/super-productivity/issues/159) ([2b40a2d](https://github.com/johannesjo/super-productivity/commit/2b40a2d2eec3d4178272284b684f50218f452df9))
- **webDav:** make rev for uploadAppData work [#159](https://github.com/johannesjo/super-productivity/issues/159) ([18f3e23](https://github.com/johannesjo/super-productivity/commit/18f3e23d1362d6e4234faf3de7002bda287cac4f))
- **webDav:** make upload and download work [#159](https://github.com/johannesjo/super-productivity/issues/159) ([79f890f](https://github.com/johannesjo/super-productivity/commit/79f890f9e73cced0c86610ebf112597aa41edcfc))
- **webDav:** manually trigger global progress bar for upload [#159](https://github.com/johannesjo/super-productivity/issues/159) ([c4d7ecd](https://github.com/johannesjo/super-productivity/commit/c4d7ecdddb8c485737303a274fb6579af4f2454c))
- **webDav:** migration [#159](https://github.com/johannesjo/super-productivity/issues/159) ([f340a04](https://github.com/johannesjo/super-productivity/commit/f340a044db9a0a6acaa877d5161e47df9b91f78c))
- **webDav:** only execute effects if needed [#159](https://github.com/johannesjo/super-productivity/issues/159) ([b70863d](https://github.com/johannesjo/super-productivity/commit/b70863d6a3db5764ed0cdb305606a9a6e94218f3))
- **webDav:** update all translations [#159](https://github.com/johannesjo/super-productivity/issues/159) ([1fee72b](https://github.com/johannesjo/super-productivity/commit/1fee72be561138f4c5c546754cfc408f86b7f99b))
- change tray icon theme [#554](https://github.com/johannesjo/super-productivity/issues/554) ([6e86cbf](https://github.com/johannesjo/super-productivity/commit/6e86cbf0cd4dec1cecef58b14c1759c7fe2ee354))

## [5.9.15](https://github.com/johannesjo/super-productivity/compare/v5.9.14...v5.9.15) (2020-10-09)

### Bug Fixes

- app not closing on windows for some people [#567](https://github.com/johannesjo/super-productivity/issues/567) ([5e340ad](https://github.com/johannesjo/super-productivity/commit/5e340aded20258533767bc87b54b4405c46ad5d1))
- make tests work again ([bc227bc](https://github.com/johannesjo/super-productivity/commit/bc227bcae42cd12d2fb250182a88d8df98028b02))
- prevent adding tags via short syntax for child tasks [#568](https://github.com/johannesjo/super-productivity/issues/568) ([94f8147](https://github.com/johannesjo/super-productivity/commit/94f814716174e97c2b28e481a8e90f778c3eb72b))
- special case [#568](https://github.com/johannesjo/super-productivity/issues/568) ([c26f62b](https://github.com/johannesjo/super-productivity/commit/c26f62b0ae72c80ca4930073094baebd1c3959e3))
- text overlap ([39508dc](https://github.com/johannesjo/super-productivity/commit/39508dc2f26f4228b4721d5fcaa255b702585088))
- throw error for inconsistent sub task data [#568](https://github.com/johannesjo/super-productivity/issues/568) ([786235b](https://github.com/johannesjo/super-productivity/commit/786235b9e5ed936adf43aac7f8d9a995fb3cb558))

### Features

- write auto repair for wrongly archived sub tasks ([81f076a](https://github.com/johannesjo/super-productivity/commit/81f076aefb543b131cfb87e3e8b7696094b14fd2))
- write auto repair for wrongly unarchived archived sub tasks [#568](https://github.com/johannesjo/super-productivity/issues/568) ([609941d](https://github.com/johannesjo/super-productivity/commit/609941ddebf83ac4a2040159d8087d75316f0716))

## [5.9.14](https://github.com/johannesjo/super-productivity/compare/v5.9.13...v5.9.14) (2020-10-08)

### Bug Fixes

- about for mas... ([cdc7687](https://github.com/johannesjo/super-productivity/commit/cdc76876bc4508e9f01e20deb63a2719f1374190))

## [5.9.13](https://github.com/johannesjo/super-productivity/compare/v5.9.12...v5.9.13) (2020-10-08)

## [5.9.12](https://github.com/johannesjo/super-productivity/compare/v5.9.11...v5.9.12) (2020-10-08)

## [5.9.11](https://github.com/johannesjo/super-productivity/compare/v5.9.10...v5.9.11) (2020-10-08)

### Bug Fixes

- not in project context [#545](https://github.com/johannesjo/super-productivity/issues/545) ([a293f2f](https://github.com/johannesjo/super-productivity/commit/a293f2f736d7a61d87cc792b669864b7c2f5c5e8))

### Features

- **autoBackupRestore:** add translations [#553](https://github.com/johannesjo/super-productivity/issues/553) ([cfeed8d](https://github.com/johannesjo/super-productivity/commit/cfeed8de1048c26e69b65ec1b7689a9f8eebb720))
- **autoBackupRestore:** implement most basic variant – circular dependency [#553](https://github.com/johannesjo/super-productivity/issues/553) ([bdd3cbc](https://github.com/johannesjo/super-productivity/commit/bdd3cbc49649a6e8d6e7dee613932d9fd4dbe688))
- **autoBackupRestore:** make it work [#553](https://github.com/johannesjo/super-productivity/issues/553) ([a54711d](https://github.com/johannesjo/super-productivity/commit/a54711d9651d19a0f15b66f0e2f6b4d97f7a3e83))
- **autoBackupRestore:** outline [#553](https://github.com/johannesjo/super-productivity/issues/553) ([7d00652](https://github.com/johannesjo/super-productivity/commit/7d00652eb9212a80b4a48c487f91623a41fdd11d))
- **i18n:** add norwegian ([a512c94](https://github.com/johannesjo/super-productivity/commit/a512c94584ddaa529d0a0a198fc8d9e7a58fc98d))
- **task:** make startable tasks work better ([ada4c97](https://github.com/johannesjo/super-productivity/commit/ada4c97db9fb7075419f43d845b4e33606dbeba2))

## [5.9.10](https://github.com/johannesjo/super-productivity/compare/v5.9.2...v5.9.10) (2020-10-04)

### Features

- set first day of the week [#528](https://github.com/johannesjo/super-productivity/issues/528) ([b83bfea](https://github.com/johannesjo/super-productivity/commit/b83bfeafc6fd1c8258da9b7a040815f578d2dbc7))
- set first day of week in DateAdapter ([6b9c5e7](https://github.com/johannesjo/super-productivity/commit/6b9c5e72692367cbb50f51e0e2a8fd94572be0d4))

## [5.9.9](https://github.com/johannesjo/super-productivity/compare/v5.9.8...v5.9.9) (2020-10-04)

## [5.9.8](https://github.com/johannesjo/super-productivity/compare/v5.9.7...v5.9.8) (2020-10-04)

## [5.9.7](https://github.com/johannesjo/super-productivity/compare/v5.9.6...v5.9.7) (2020-10-04)

## [5.9.6](https://github.com/johannesjo/super-productivity/compare/v5.9.5...v5.9.6) (2020-10-04)

## [5.9.5](https://github.com/johannesjo/super-productivity/compare/v5.9.4...v5.9.5) (2020-10-03)

## [5.9.4](https://github.com/johannesjo/super-productivity/compare/v5.9.3...v5.9.4) (2020-10-03)

## [5.9.3](https://github.com/johannesjo/super-productivity/compare/v0.0.1...v5.9.3) (2020-10-03)

## [5.9.2](https://github.com/johannesjo/super-productivity/compare/v5.9.1...v5.9.2) (2020-10-02)

## [5.9.1](https://github.com/johannesjo/super-productivity/compare/v5.9.0...v5.9.1) (2020-10-02)

### Bug Fixes

- allow to display images from file system [#549](https://github.com/johannesjo/super-productivity/issues/549) ([2c8255b](https://github.com/johannesjo/super-productivity/commit/2c8255b0814e03623048ac52cd960cf7b3710999))
- chrome extension link ([58be356](https://github.com/johannesjo/super-productivity/commit/58be3561c4b1a9695f7bc75b01baf747dc54734a))
- lint ([b1b8796](https://github.com/johannesjo/super-productivity/commit/b1b87960d7b394784d9bafa92cd84021cec64f7c))
- **jira:** wrong issue link for auto-imported issues [#551](https://github.com/johannesjo/super-productivity/issues/551) ([ca7cb4b](https://github.com/johannesjo/super-productivity/commit/ca7cb4bf5c702664ea83feba9c60265d2ad48b4d))
- **task:** only start first startable when there is none already running ([c96b846](https://github.com/johannesjo/super-productivity/commit/c96b846377807441500ea99565106190c8a6a8e3))
- lint error ([a8d371e](https://github.com/johannesjo/super-productivity/commit/a8d371ed53552c3e354d4bfa9bcc839d15f3856b))

### Features

- **startTrackingReminder:** auto hide on idle and when starting to track on a task manually ([a7e41d9](https://github.com/johannesjo/super-productivity/commit/a7e41d937655671986d080a62f8f202cedf4a138))
- **startTrackingReminder:** hide on mobile per default and make configurable ([b2b210b](https://github.com/johannesjo/super-productivity/commit/b2b210bfe54c04e92b34b47bc25d1816241d7978))
- add new productivity tips ([a53878a](https://github.com/johannesjo/super-productivity/commit/a53878ab3176e06617f4665039ec163a0a60d56c))
- improve broken data handling [#555](https://github.com/johannesjo/super-productivity/issues/555) ([c9c2e0c](https://github.com/johannesjo/super-productivity/commit/c9c2e0cad56383fd69f3414d266aec7f6c44189d))
- improve data repair handling [#552](https://github.com/johannesjo/super-productivity/issues/552) ([1012edb](https://github.com/johannesjo/super-productivity/commit/1012edbd42f8bb99217437843e8a455d7b729dfb))
- make AppDataForProjects non optional ([8b1a9cf](https://github.com/johannesjo/super-productivity/commit/8b1a9cf79c01f5e876ec2d972e23ecebdac60c0d))

# [5.9.0](https://github.com/johannesjo/super-productivity/compare/v5.8.2...v5.9.0) (2020-09-24)

### Bug Fixes

- another read-only error [#538](https://github.com/johannesjo/super-productivity/issues/538) ([8f2afcc](https://github.com/johannesjo/super-productivity/commit/8f2afcc171901d09b4af2e5281ddb044a3329743))
- disabling done sound not working [#534](https://github.com/johannesjo/super-productivity/issues/534) ([2179118](https://github.com/johannesjo/super-productivity/commit/2179118f9468962876f647199dc0d1e93bcfbd13))
- lint ([763e991](https://github.com/johannesjo/super-productivity/commit/763e99158211c977e7e1b621eb175698998a66bd))
- use encodeURIComponent instead of encodeURI [#523](https://github.com/johannesjo/super-productivity/issues/523) ([ba06b0b](https://github.com/johannesjo/super-productivity/commit/ba06b0b60057fd510de68d3622762bf9035f9a0b))

### Features

- **autoRepair:** add a little bit of logging ([70e4e20](https://github.com/johannesjo/super-productivity/commit/70e4e20943d97beb02227b1b627f2875e5be41c6))
- **autoRepair:** make \_removeDuplicatesFromArchive work ([6a111d9](https://github.com/johannesjo/super-productivity/commit/6a111d92ce31e94ac86a0a69aa899d918df6b692))
- **autoRepair:** make \_removeMissingIdsFromLists work ([192ef5a](https://github.com/johannesjo/super-productivity/commit/192ef5ad8679b012aee75bbd593cf61014d8e95d))
- **autoRepair:** make fix duplicate tasks work ([002ec09](https://github.com/johannesjo/super-productivity/commit/002ec096f2466e9c0a4651aff8a046379437bf49))
- **autoRepair:** make restore from archive work ([c706f26](https://github.com/johannesjo/super-productivity/commit/c706f26586badb6a4c1a5e6fe03ffc822a5402d1))
- **autoRepair:** make restoring orphaned tasks work ([5fe3fbe](https://github.com/johannesjo/super-productivity/commit/5fe3fbe139eb67850a51521598f252784b83573d))
- **autoRepair:** make stray backup stuff translateable ([35cd773](https://github.com/johannesjo/super-productivity/commit/35cd7736995cfc7ffcabad35887f5b2829cc0f54))
- **autoRepair:** re-enable stray backup check ([ec6c844](https://github.com/johannesjo/super-productivity/commit/ec6c8449861981bfb8ed7c8c13426b4820f2e4a5))
- **autoRepair:** trigger for data import and data init if data is broken ([a80054a](https://github.com/johannesjo/super-productivity/commit/a80054a2fc47866e7c05fe14964022715ba70778))
- add missing null checks for is valid app data ([577383b](https://github.com/johannesjo/super-productivity/commit/577383bb44c469eb43654ca31eb83fa7bd150c70))
- also check for miss-matched ids in entity states ([81ca47c](https://github.com/johannesjo/super-productivity/commit/81ca47c0d9047c399a45de7eb058890f5c638490))

## [5.8.2](https://github.com/johannesjo/super-productivity/compare/v5.8.1...v5.8.2) (2020-09-22)

### Bug Fixes

- private policy link [#531](https://github.com/johannesjo/super-productivity/issues/531) ([8ccf7b1](https://github.com/johannesjo/super-productivity/commit/8ccf7b1ea4619f08ab71e6544d950c14b5ad3c98))

## [5.8.1](https://github.com/johannesjo/super-productivity/compare/v5.8.0...v5.8.1) (2020-09-21)

# [5.8.0](https://github.com/johannesjo/super-productivity/compare/v5.7.7...v5.8.0) (2020-09-20)

### Bug Fixes

- **task:** undone done when marking a lot of tasks as done in fast succession ([59574c5](https://github.com/johannesjo/super-productivity/commit/59574c55a4ce271842d3177ace25761dff297a73))

### Features

- **startTrackingReminder:** make configurable and add translations for it [#507](https://github.com/johannesjo/super-productivity/issues/507) ([4ad922c](https://github.com/johannesjo/super-productivity/commit/4ad922c5c2b50aca18c0831bb182895b792aab87))
- make dark mode default ([b6c72f5](https://github.com/johannesjo/super-productivity/commit/b6c72f57c077bfe2f5214831d06502a02fd37539))
- **startTrackingReminder:** implement timer as real timer [#507](https://github.com/johannesjo/super-productivity/issues/507) ([71d18a6](https://github.com/johannesjo/super-productivity/commit/71d18a67c320f628e506296723c062656de9bcaf))
- **startTrackingReminder:** make dialog work and translations [#507](https://github.com/johannesjo/super-productivity/issues/507) ([2cac5c7](https://github.com/johannesjo/super-productivity/commit/2cac5c72023bfa020555839a0038957aadb2819c))
- **startTrackingReminder:** make reset timer work [#507](https://github.com/johannesjo/super-productivity/issues/507) ([7f6cb61](https://github.com/johannesjo/super-productivity/commit/7f6cb61d859b375af36d3c869d5c68f9ee818edb))
- **startTrackingReminder:** make timer work [#507](https://github.com/johannesjo/super-productivity/issues/507) ([fc37243](https://github.com/johannesjo/super-productivity/commit/fc37243e4355a861481971eafad4c856db631f29))
- **startTrackingReminder:** outline service [#507](https://github.com/johannesjo/super-productivity/issues/507) ([455c2b3](https://github.com/johannesjo/super-productivity/commit/455c2b322bab3793b7c6abbdb76f30e4394f8e99))
- **startTrackingReminder:** prepare banner [#507](https://github.com/johannesjo/super-productivity/issues/507) ([68e802e](https://github.com/johannesjo/super-productivity/commit/68e802eeb32781b1b884ee51154b652c28830f5b))
- **task:** improve current/focus border styling ([8308862](https://github.com/johannesjo/super-productivity/commit/83088629750dd8b6f884bfe2054689439b27a5a7))
- **task:** use solid border for task additional info panel as well ([934843a](https://github.com/johannesjo/super-productivity/commit/934843a58215028aece5e8ad6d17c6ee473ce52f))

## [5.7.7](https://github.com/johannesjo/super-productivity/compare/v5.7.6...v5.7.7) (2020-09-18)

### Bug Fixes

- allow deletion of multiple tasks in fast succession ([8b41fb9](https://github.com/johannesjo/super-productivity/commit/8b41fb9fe9532f54653e04596a75ed0f050952ae))
- persistence request for mobile ([113dafd](https://github.com/johannesjo/super-productivity/commit/113dafdc5b600259ba62e7fa664ca9b6c5e9d647))
- weird error for reminders ([c4c2a33](https://github.com/johannesjo/super-productivity/commit/c4c2a33289d8b68854f29e5aa3e4f86e4613ceb6))
- weird reminder error ([260a80c](https://github.com/johannesjo/super-productivity/commit/260a80c2c6239cffec10312c908b35ca843f1c48))
- **task:** case when adding task via short syntax with project id to today ([2e96c0f](https://github.com/johannesjo/super-productivity/commit/2e96c0fa52270232c3238667ab6401c15bcb613b))

### Features

- add additional debug info for undo task delete meta reducer ([01ea6d9](https://github.com/johannesjo/super-productivity/commit/01ea6d9343a897681c721039d7e9cf9f6df467be))
- add debugging actions for persistence ([dfe459e](https://github.com/johannesjo/super-productivity/commit/dfe459e65f7846a4bdc6f2125a419ad26e3f7f68))
- add error alert ([389063a](https://github.com/johannesjo/super-productivity/commit/389063aaeb4ab7562b034cb3d533d904d754457e))
- limit inMemoryComplete$ to valid only ([5021969](https://github.com/johannesjo/super-productivity/commit/502196951d7ad98a34b35c62322c5ac9fe42ec05))
- make adjustments for stage behaviour ([75042ee](https://github.com/johannesjo/super-productivity/commit/75042ee4c4a1cd76968047927e695e227e83ff7a))
- remove load from db action because it's too much clutter ([ea05fda](https://github.com/johannesjo/super-productivity/commit/ea05fda38069ab09f975a4be4146b24f49a052d7))

## [5.7.6](https://github.com/johannesjo/super-productivity/compare/v5.7.5...v5.7.6) (2020-09-17)

### Features

- improve error handling ([6892605](https://github.com/johannesjo/super-productivity/commit/68926057ec43716e467381350ba569bf7ec9294e))

## [5.7.5](https://github.com/johannesjo/super-productivity/compare/v5.7.4...v5.7.5) (2020-09-17)

### Bug Fixes

- prevent dropbox from syncing invalid ([6ddc711](https://github.com/johannesjo/super-productivity/commit/6ddc7115c60f8ad2516c6e38d0bbe4fc802a34d3))

## [5.7.4](https://github.com/johannesjo/super-productivity/compare/v5.7.3...v5.7.4) (2020-09-17)

### Bug Fixes

- stray import stuff being wrong ([b2fae30](https://github.com/johannesjo/super-productivity/commit/b2fae30bc7eafcca5b5449f11dd19d6b0440a007))

## [5.7.3](https://github.com/johannesjo/super-productivity/compare/v5.7.2...v5.7.3) (2020-09-17)

### Features

- **i18n:** add missing translations ([a229186](https://github.com/johannesjo/super-productivity/commit/a22918681274ffdd576184b3f281ae07f2e5b45b))
- improve pre-check ([ed9fc7a](https://github.com/johannesjo/super-productivity/commit/ed9fc7a8b681cca2d7acfc2ea0718427cbe06187))
- improve warning for empty data sync ([5f27d43](https://github.com/johannesjo/super-productivity/commit/5f27d4397750c3272a164f36b6d15aff904104ee))
- make dropbox sync confirms translatable ([e8c97ee](https://github.com/johannesjo/super-productivity/commit/e8c97ee32f8271db89bd0ab312d96a92514fbce1))

## [5.7.2](https://github.com/johannesjo/super-productivity/compare/v5.7.1...v5.7.2) (2020-09-17)

### Features

- add pre-check for invalid local data before saving ([955aed7](https://github.com/johannesjo/super-productivity/commit/955aed7e0c3edf1c656d0ddc2307a939f86f73e2))

## [5.7.1](https://github.com/johannesjo/super-productivity/compare/v5.7.0...v5.7.1) (2020-09-17)

### Bug Fixes

- editing sub task tags should not be possible [#522](https://github.com/johannesjo/super-productivity/issues/522) ([eb11530](https://github.com/johannesjo/super-productivity/commit/eb11530193f91232fe2e109a8ad792a2180e258d))
- model check for empty data ([4a8a784](https://github.com/johannesjo/super-productivity/commit/4a8a7841f8db6cd23541caf74bf7a955ddc1eecb))
- note reminder from tag view [#524](https://github.com/johannesjo/super-productivity/issues/524) ([f9e508f](https://github.com/johannesjo/super-productivity/commit/f9e508fb13f5d3a44d284da166af8c84893cad7e))

### Features

- add auto import backup when something went wrong with data import previously ([f281470](https://github.com/johannesjo/super-productivity/commit/f281470f193f93692a3bd37b0f59c34a2c894bb8))
- alert on indexeddb error ([09f8a22](https://github.com/johannesjo/super-productivity/commit/09f8a22ad018a9052bea3ded77a4a48d2528d07b))
- allow drag & drop attachments on task additional info ([9377b80](https://github.com/johannesjo/super-productivity/commit/9377b80742e1fe3e9fb4b02f3b4059e06174775c))
- improve persistence permission request ([0e8cb34](https://github.com/johannesjo/super-productivity/commit/0e8cb34219dbf464c30ee5d1c2c8c2cdb2f90bb7))
- **doneSound:** make pitching work for a bigger amount of tasks ([51489d2](https://github.com/johannesjo/super-productivity/commit/51489d263df6338e2f12c62a62697784a28bdf9c))
- **style:** add separators to worklog ([11127f1](https://github.com/johannesjo/super-productivity/commit/11127f10c4f4e6924a3257a9dca2a59c4d2fc656))
- **style:** use checkmark for bookmark-bar edit mode ([46d4ccb](https://github.com/johannesjo/super-productivity/commit/46d4ccb4bed5aad65135d0206b03665638cc3ff0))

# [5.7.0](https://github.com/johannesjo/super-productivity/compare/v5.6.5...v5.7.0) (2020-09-07)

### Bug Fixes

- switch to today before importing data in fileimex to avoid error for missing project ([1d82ae1](https://github.com/johannesjo/super-productivity/commit/1d82ae1114b824fcac5ffca28805e33d3f5dedcd))
- **dbx:** only allow rev checking when there is a rev ([cedfc82](https://github.com/johannesjo/super-productivity/commit/cedfc826c9a94b786b973d2defb9d932e94c2587))
- **git:** wrong project task import ([1da0c8e](https://github.com/johannesjo/super-productivity/commit/1da0c8e90e4294d9e09095b509a545cdc32ac565))

### Features

- **doneSound:** add and play sounds ([2c9ba1d](https://github.com/johannesjo/super-productivity/commit/2c9ba1d2e8720e2150492d11c55b85539ffc1ee2))
- **doneSound:** apply sound config ([b1b2e64](https://github.com/johannesjo/super-productivity/commit/b1b2e64e49403bc6641260ab4f311f7b0096fc02))
- **doneSound:** make basic pitching work ([dc7bfb5](https://github.com/johannesjo/super-productivity/commit/dc7bfb5edc7255031fbcd41171a61a962b07f384))
- **doneSound:** make it work in electron built app ([6bf8403](https://github.com/johannesjo/super-productivity/commit/6bf84039da1ffda17722ea5728686c8e12fe10f6))
- **doneSound:** make sound stuff configurable ([efb8a50](https://github.com/johannesjo/super-productivity/commit/efb8a50923311a2a6872be8d5ee84cd8f379cdb2))
- **doneSound:** make volume work ([42e30de](https://github.com/johannesjo/super-productivity/commit/42e30de4fe84601dd6f657a9d32562e98a772e87))
- **doneSound:** prepare pitching ([fe0ea56](https://github.com/johannesjo/super-productivity/commit/fe0ea56d103f55d8cc2d1b0e28ee12bd1d7fa5f8))
- **git:** add issue add debug code ([d817bde](https://github.com/johannesjo/super-productivity/commit/d817bdee20a1d1e65385e144331c744709fb098d))
- **sound:** adjust autopitch ([ad3a91e](https://github.com/johannesjo/super-productivity/commit/ad3a91e9a75edcab66b585659a149709a0d26de5))
- add new sounds ([635f1f9](https://github.com/johannesjo/super-productivity/commit/635f1f9c705302da0c81e9298dd77be70b6edbb7))
- **task:** improve focus behaviour for toggle done ([97969de](https://github.com/johannesjo/super-productivity/commit/97969de2b651d60e558aa5029b3b9f65b38b70d1))

## [5.6.5](https://github.com/johannesjo/super-productivity/compare/v5.6.4...v5.6.5) (2020-08-28)

### Features

- **reminder:** add snooze until tomorrow to list items ([f1f6af9](https://github.com/johannesjo/super-productivity/commit/f1f6af930fe1cb8cfcc242dcafabe10a97ee565d))
- add debug info for add task bar ([275ddec](https://github.com/johannesjo/super-productivity/commit/275ddec740c773b41756e89351fb006cd4a136ee))
- **google:** better handle access token [#514](https://github.com/johannesjo/super-productivity/issues/514) ([49c0d80](https://github.com/johannesjo/super-productivity/commit/49c0d80d6e9338fadf71e529c9ed5cc7a61656e2))

## [5.6.4](https://github.com/johannesjo/super-productivity/compare/v5.6.2...v5.6.4) (2020-08-26)

### Bug Fixes

- **advancedShortSyntax:** adding task twice ([26354ad](https://github.com/johannesjo/super-productivity/commit/26354ad555e351b66a2a7f754eb2a4f9ca812d87))

### Features

- **mobile:** don't expand task additional info items per default ([a561ed4](https://github.com/johannesjo/super-productivity/commit/a561ed4780f6e863a1711663b2b80336254ce049))

## [5.6.3](https://github.com/johannesjo/super-productivity/compare/v5.6.2...v5.6.3) (2020-08-26)

### Features

- **mobile:** don't expand task additional info items per default ([a561ed4](https://github.com/johannesjo/super-productivity/commit/a561ed4780f6e863a1711663b2b80336254ce049))

## [5.6.2](https://github.com/johannesjo/super-productivity/compare/v5.6.1...v5.6.2) (2020-08-22)

### Bug Fixes

- lazy interval bug (unable to delete reminder) ([1a364ac](https://github.com/johannesjo/super-productivity/commit/1a364ac5bc7efe571d54286424b5615c9f8e05cf))
- **dailySummary:** total time for project not being calculated when a value is zero ([69141b9](https://github.com/johannesjo/super-productivity/commit/69141b9c9c4a3cec6e70e01c0662e60b381ccda6))

### Features

- better indicate editable table cells for task summary table ([d14a75c](https://github.com/johannesjo/super-productivity/commit/d14a75c52ee0c27e32fedf75665bcda2f23d793c))
- improve add task bar info text behaviour ([06acd32](https://github.com/johannesjo/super-productivity/commit/06acd32b5b22f4528771b1c704fdf1dfb06805cb))

## [5.6.1](https://github.com/johannesjo/super-productivity/compare/v5.6.0...v5.6.1) (2020-08-17)

### Bug Fixes

- make lazy set intervals work with electron ([3ca1f57](https://github.com/johannesjo/super-productivity/commit/3ca1f57c63a6885b65628406d5c6aefa17a530ce))

# [5.6.0](https://github.com/johannesjo/super-productivity/compare/v5.5.7...v5.6.0) (2020-08-17)

### Bug Fixes

- example text for mobile [#487](https://github.com/johannesjo/super-productivity/issues/487) ([38b22d3](https://github.com/johannesjo/super-productivity/commit/38b22d3abab060a3f6792942e6e4c30460bbf04f))
- missing taskRepeatCfg for taskAdditionalInfo [#499](https://github.com/johannesjo/super-productivity/issues/499) ([690df86](https://github.com/johannesjo/super-productivity/commit/690df86e176743de8e5715fbce976a25579f6405))
- potential error [#487](https://github.com/johannesjo/super-productivity/issues/487) ([bff1ade](https://github.com/johannesjo/super-productivity/commit/bff1adece9342e78640cdf09563ce1150a971d88))
- replace setInterval with lazy implementation everywhere [#493](https://github.com/johannesjo/super-productivity/issues/493) ([cd8438d](https://github.com/johannesjo/super-productivity/commit/cd8438db2391d2fa70ad5e4fa9e96c2eef9815a2))
- several issues with project id parsing [#487](https://github.com/johannesjo/super-productivity/issues/487) ([3a8d35e](https://github.com/johannesjo/super-productivity/commit/3a8d35ef4b366b924b0e84e4df354056f5525823))
- tasks not being added to tag task lists [#487](https://github.com/johannesjo/super-productivity/issues/487) ([12d6190](https://github.com/johannesjo/super-productivity/commit/12d619024a7fc8b889c670c4d1aa3a73d4bafa6d))
- unlisted error when moving all tasks to backlog via shortcut ([1c26488](https://github.com/johannesjo/super-productivity/commit/1c26488eac7101283a060c2e11e5d6e268249ff5))
- weird listing bug ([67e3c44](https://github.com/johannesjo/super-productivity/commit/67e3c44f1735a0397cf27ecea8797efbf360e2d9))
- wrong update checks for side panel ([5484ec1](https://github.com/johannesjo/super-productivity/commit/5484ec1208bce73866a748af33c526633a282ff5))

### Features

- add basic ui for add task bar [#487](https://github.com/johannesjo/super-productivity/issues/487) ([f25f19e](https://github.com/johannesjo/super-productivity/commit/f25f19ee330c9355ae4554d7c7622a14b8ab7606))
- add basic ui for add task bar [#487](https://github.com/johannesjo/super-productivity/issues/487) ([634c43b](https://github.com/johannesjo/super-productivity/commit/634c43bf300e5b4621d3b45a46addcb5f583598b))
- add better indication ([bee8de8](https://github.com/johannesjo/super-productivity/commit/bee8de8d1c6e2459aac512971f7e02cf8796cfd7))
- add track by [#487](https://github.com/johannesjo/super-productivity/issues/487) ([902528e](https://github.com/johannesjo/super-productivity/commit/902528efe48ea46040eda8bcd7048bfba003c8cf))
- add translation [#487](https://github.com/johannesjo/super-productivity/issues/487) ([09a7f04](https://github.com/johannesjo/super-productivity/commit/09a7f043d05c9e8c3befa53f86be547f839a027a))
- allow moving tasks via short syntax [#487](https://github.com/johannesjo/super-productivity/issues/487) ([3e8a190](https://github.com/johannesjo/super-productivity/commit/3e8a190dbd55e4c204b544ebfdabd83086b99c52))
- also display issue nr for short syntax bar ([c9b7e2b](https://github.com/johannesjo/super-productivity/commit/c9b7e2b05b782383959bbe00a7571f69619722c9))
- comment out due for now [#487](https://github.com/johannesjo/super-productivity/issues/487) ([ef97840](https://github.com/johannesjo/super-productivity/commit/ef97840eef5491f11370b90bce64d9458aabb7bb))
- improve styling [#487](https://github.com/johannesjo/super-productivity/issues/487) ([c1210ee](https://github.com/johannesjo/super-productivity/commit/c1210eefb44e4d25bdc6a3bb2d1fa491a01647e1))
- only show example when no text otherwise show "Create new task" ([eca6af2](https://github.com/johannesjo/super-productivity/commit/eca6af27c25e5b331b65f37ab50f2e62b153ed24))
- use + key for project [#487](https://github.com/johannesjo/super-productivity/issues/487) ([6376320](https://github.com/johannesjo/super-productivity/commit/63763203e38c93117d3f8127c4ec29934221c597))
- **advancedShortSyntax:** make order more flexible [#487](https://github.com/johannesjo/super-productivity/issues/487) ([abf1b0c](https://github.com/johannesjo/super-productivity/commit/abf1b0c5d6f2e9d0b5b96e2ded38cd4a22a0fd96))
- **advancedShortSyntax:** make partial project work [#487](https://github.com/johannesjo/super-productivity/issues/487) ([bb587f5](https://github.com/johannesjo/super-productivity/commit/bb587f54b65d2111d815ef654b47f445c65da1a8))
- **advancedShortSyntax:** make project work [#487](https://github.com/johannesjo/super-productivity/issues/487) ([58aee57](https://github.com/johannesjo/super-productivity/commit/58aee579ee2e9b8f3f39ad59c34979725b6dbd76))
- **advancedShortSyntax:** prepare new interface ([4033d71](https://github.com/johannesjo/super-productivity/commit/4033d717a21417a785cb22e669d4bc83b700f87f))
- **advancedShortSyntax:** use @ instead of - for projects [#487](https://github.com/johannesjo/super-productivity/issues/487) ([02507d9](https://github.com/johannesjo/super-productivity/commit/02507d903ef20d0a64b81a5a07f271b7912118d4))

## [5.5.7](https://github.com/johannesjo/super-productivity/compare/v5.5.6...v5.5.7) (2020-08-09)

### Bug Fixes

- invalid time value [#491](https://github.com/johannesjo/super-productivity/issues/491) ([2064abd](https://github.com/johannesjo/super-productivity/commit/2064abd1cb6f32eb202f0b62033a79bc18e08523))
- trigger task migrate script [#481](https://github.com/johannesjo/super-productivity/issues/481) ([b42517d](https://github.com/johannesjo/super-productivity/commit/b42517dd361a1bbffc79769591d9e1446fe5c58a))

### Features

- improve error message handling [#485](https://github.com/johannesjo/super-productivity/issues/485) ([5c035bc](https://github.com/johannesjo/super-productivity/commit/5c035bc022e54743923982c701037bb550cd3ed9))

## [5.5.6](https://github.com/johannesjo/super-productivity/compare/v5.5.5...v5.5.6) (2020-08-08)

### Bug Fixes

- error object object [#485](https://github.com/johannesjo/super-productivity/issues/485) ([a9fc6e0](https://github.com/johannesjo/super-productivity/commit/a9fc6e0c8c0f55045c41aa3042db39781df6d275))

## [5.5.5](https://github.com/johannesjo/super-productivity/compare/v5.5.4...v5.5.5) (2020-08-07)

### Bug Fixes

- google drive sync not working anymore [#474](https://github.com/johannesjo/super-productivity/issues/474) ([5a366dd](https://github.com/johannesjo/super-productivity/commit/5a366dd22d1922775f0119a15e730c3d77151802))

## [5.5.4](https://github.com/johannesjo/super-productivity/compare/v5.5.3...v5.5.4) (2020-08-03)

### Bug Fixes

- sub task collapsing not working as it should ([7bd6ed8](https://github.com/johannesjo/super-productivity/commit/7bd6ed8f16e20737a3ce3ecdbe41f1ba6ff0aa13))
- sub task collapsing not working as it should ([c68b6a0](https://github.com/johannesjo/super-productivity/commit/c68b6a077e6e9388371ce94042cfcddcc0a1b9c8))

### Features

- **dbx:** execute right after enabling it ([bbc8969](https://github.com/johannesjo/super-productivity/commit/bbc8969e790fed3a5153ee9b8f045fb4cc1771ce))
- **dbx:** improve syncing once more ([3666571](https://github.com/johannesjo/super-productivity/commit/36665712672a96dade56dbf795922e231b47a21c))

## [5.5.3](https://github.com/johannesjo/super-productivity/compare/v5.5.2...v5.5.3) (2020-07-29)

### Bug Fixes

- allow to delete tag when tag is active context [#467](https://github.com/johannesjo/super-productivity/issues/467) ([e44fae1](https://github.com/johannesjo/super-productivity/commit/e44fae12d94eccd8811d8a3d7f00f696068dd2c0))
- invalid array length [#463](https://github.com/johannesjo/super-productivity/issues/463) ([8b33ccb](https://github.com/johannesjo/super-productivity/commit/8b33ccb4f2738cceaf461208fa9a57347f12155a))
- not in project context error for show bookmarks shortcut [#466](https://github.com/johannesjo/super-productivity/issues/466) ([c277ead](https://github.com/johannesjo/super-productivity/commit/c277eada87c48cc88c4dee302df6a0bb2fd047ec))
- **dbx:** view not updating after generating access token ([d1223b0](https://github.com/johannesjo/super-productivity/commit/d1223b0ee6fb135f671c351e901e6324d6e9bf7f))
- **mobile:** task notes not being saved when swiping away ([60c0f65](https://github.com/johannesjo/super-productivity/commit/60c0f65201f79cac7ed6b070462abaa4f5f81021))
- **task:** prevent scroll jump when deleting task on mobile ([52c9f82](https://github.com/johannesjo/super-productivity/commit/52c9f829ca58f9cd18d60bbefa7ecfdc8e380a43))
- cleanup uneeded sync model chagne udate ([75af323](https://github.com/johannesjo/super-productivity/commit/75af323b176c022ac44d48e43015bfd5e9d8ea9b))
- project data being lost on import ([4c6623e](https://github.com/johannesjo/super-productivity/commit/4c6623e84cbced3e0175741d4b9b7d131e89389d))
- test ([7c356df](https://github.com/johannesjo/super-productivity/commit/7c356df872a522339b4622e963856076f2e83b1a))
- typing ([861740c](https://github.com/johannesjo/super-productivity/commit/861740c75fc7206577de83f98951a2b3b3567537))

### Features

- cleanup excess error logging ([e5de11a](https://github.com/johannesjo/super-productivity/commit/e5de11ad8c8e1baa69d6dc07bbd725d6d43683c7))
- hide open project notes shortcut for now ([9099cb2](https://github.com/johannesjo/super-productivity/commit/9099cb267c5475dcc14875b73e4e499f2a7b99ca))
- **dbx:** beautify generate token button ([850f1eb](https://github.com/johannesjo/super-productivity/commit/850f1eb732556cd73db3aa41bd099be87e2751b7))
- **i18n:** update translations [#451](https://github.com/johannesjo/super-productivity/issues/451) ([b24857e](https://github.com/johannesjo/super-productivity/commit/b24857e66e02bdd76c252264b8a74b48dd03ecd5))
- **task:** add remove from today to task context menu for mobile touch ([a64d263](https://github.com/johannesjo/super-productivity/commit/a64d2631d4019417a52e265e8a800a28c4caa343))
- add action log to issue ([ecc647c](https://github.com/johannesjo/super-productivity/commit/ecc647ce471790c60241f95bd162cd9d6c7dc167))
- add data fix effect for unlsited tasks ([375cda8](https://github.com/johannesjo/super-productivity/commit/375cda8d2e67ef8453586b5ddbc0df0c993eed88))
- adjust sync model change var ([679c7e8](https://github.com/johannesjo/super-productivity/commit/679c7e88fe0fd3eb33bf649a9a2307b9263bf6ef))
- allow repeating tasks for tag only tasks and add cleanup [#460](https://github.com/johannesjo/super-productivity/issues/460) ([6811c5b](https://github.com/johannesjo/super-productivity/commit/6811c5b6f2b49a0bfc8a33739bac6d9a19c9cef5))
- implement last action log ([c8ce931](https://github.com/johannesjo/super-productivity/commit/c8ce9311b26907ae9b58a99841d74a1ba1d31f43))
- improve keyboard selection styles for datepicker ([c87d391](https://github.com/johannesjo/super-productivity/commit/c87d391ac4da2bbe509239774b33f6bf424a0b37))
- improve migration logging ([a45ffcd](https://github.com/johannesjo/super-productivity/commit/a45ffcd0b7ab7598bd59128abe611f15b4df96b9))
- migrate project models to new isSyncModelChange ([c016564](https://github.com/johannesjo/super-productivity/commit/c01656454c882ce258a5c753a4d6091cd665aded))
- migrate project to new isSyncModelChange ([75a8afe](https://github.com/johannesjo/super-productivity/commit/75a8afed80184aa9c2d385e55ec9db3954a692df))
- migrate simpler ones to new isSyncModelChange ([3f37f6b](https://github.com/johannesjo/super-productivity/commit/3f37f6bc604374ebc62d096c3d89eb5aa5f9596c))
- prepare isNoSyncChange ([6388571](https://github.com/johannesjo/super-productivity/commit/6388571ce889a2ea72c9b9d938600878995a1b31))
- use new sync trigger param for sync ([f3dc5a1](https://github.com/johannesjo/super-productivity/commit/f3dc5a101bb6a04bd44dd50c079b383eda9c2062))

## [5.5.2](https://github.com/johannesjo/super-productivity/compare/v5.5.1...v5.5.2) (2020-07-24)

### Bug Fixes

- also migrate old keyboard values [#453](https://github.com/johannesjo/super-productivity/issues/453) [#456](https://github.com/johannesjo/super-productivity/issues/456) [#457](https://github.com/johannesjo/super-productivity/issues/457) ([16ad187](https://github.com/johannesjo/super-productivity/commit/16ad1872c5e1cd39ab6dcc1845a0883b97c76b30))
- cannot read property 'includes' of undefined [#453](https://github.com/johannesjo/super-productivity/issues/453) [#456](https://github.com/johannesjo/super-productivity/issues/456) [#457](https://github.com/johannesjo/super-productivity/issues/457) ([0f4d2b7](https://github.com/johannesjo/super-productivity/commit/0f4d2b7550b225bfefca40245394775e7bb8fad9))
- remove test for now ([dabdae3](https://github.com/johannesjo/super-productivity/commit/dabdae302c80384a6958e396b722426049275bb2))

### Features

- improve error ([a8be825](https://github.com/johannesjo/super-productivity/commit/a8be825db02c76f7ebcf03f1540d624f6549e70f))
- **dailySummary:** add translation for missing project ([0b0e7da](https://github.com/johannesjo/super-productivity/commit/0b0e7da553fe02163e87ada3db9707db19ed888d))
- **dailySummary:** allow export based on project ([c2eabc6](https://github.com/johannesjo/super-productivity/commit/c2eabc67ef306cb50353a2c3dd4f1fe01b1c6d4b))
- **dailySummary:** also show no project tasks ([96258e1](https://github.com/johannesjo/super-productivity/commit/96258e12934650594ca0457091b4795b6c481424))
- **dailySummary:** extract summary tables to their own component ([3162ecd](https://github.com/johannesjo/super-productivity/commit/3162ecd5a2d8eb75f2239b9bb37889e854bebd0c))
- **dailySummary:** limit round time to single list ([55c1816](https://github.com/johannesjo/super-productivity/commit/55c181640fb838ca5d4c546d536b4bc2727e28f3))
- **dailySummary:** make display values work for different projects ([b668a21](https://github.com/johannesjo/super-productivity/commit/b668a218c31c08a0279df7aa46d369ff20d61368))
- **dailySummary:** order projects like in the menu ([4fde55e](https://github.com/johannesjo/super-productivity/commit/4fde55e6ab9d7f3e70aa57de1efe01b0a1dea2fe))
- **dailySummary:** outline ui ([6ca5f9f](https://github.com/johannesjo/super-productivity/commit/6ca5f9fddc2fb4693567a2c8688733231998535c))
- **dailySummary:** polish ui ([91b1b45](https://github.com/johannesjo/super-productivity/commit/91b1b450439c9d24723b8dd9b97bdfc70d0205aa))
- **i18n:** update translations ([4e1befd](https://github.com/johannesjo/super-productivity/commit/4e1befdf1d5751304fe309e3dcc90055625e2d15))
- **jira:** improve text for wonky cookie mode modal ([249346a](https://github.com/johannesjo/super-productivity/commit/249346aa9e6f1d594974fe669c3472b7124007d1))

## [5.5.1](https://github.com/johannesjo/super-productivity/compare/v5.5.0...v5.5.1) (2020-07-22)

### Bug Fixes

- over style for better drawer container ([e999b8e](https://github.com/johannesjo/super-productivity/commit/e999b8e5ac8afc683cc46d980e9d89131b534984))
- **jira:** check for empty cookie value and prompt again ([db0b4e3](https://github.com/johannesjo/super-productivity/commit/db0b4e35add597b80f14781da9bcc23d4bc31359))
- add fallback to prevent NaN for daily summary ([4a80f26](https://github.com/johannesjo/super-productivity/commit/4a80f260be6169b49d1274666047efe515043c68))
- array not being writeable ([b2ec051](https://github.com/johannesjo/super-productivity/commit/b2ec0512cb3ae7aad853ebe7f5586079f8753d07))
- **tag:** add tag returning wrong id ([a0a300a](https://github.com/johannesjo/super-productivity/commit/a0a300a6823f410f8421e16b46fc72a08139690b))
- don't listen to chrome extension for idle if in electron context ([6f3fbaf](https://github.com/johannesjo/super-productivity/commit/6f3fbaf48a8b02ce5b697e973dd7705e281fd2cb))
- don't persist selected task ([e5960d1](https://github.com/johannesjo/super-productivity/commit/e5960d17c01815535b0a62a4b74765e2ffea27f1))

### Features

- **dbx:** add mousemove after idle sync trigger ([d9b8dd2](https://github.com/johannesjo/super-productivity/commit/d9b8dd2e359f44e062ce4c8ba90abf724cafb0ab))
- **jira:** improve error logging for electron ([e88d72e](https://github.com/johannesjo/super-productivity/commit/e88d72e5584fa0440a21a645d76a9e524a25965b))
- **jira:** improve unauthorized handling ([07057d4](https://github.com/johannesjo/super-productivity/commit/07057d4ba7e14cad4df55ffb31cbd1db5ea056c0))
- **jira:** make wonky cookie mode work ([c25e29a](https://github.com/johannesjo/super-productivity/commit/c25e29a23693cd249da2e92dfdf6d4d3870cc238))
- **jira:** make wonky cookie mode work for images and attachments ([ba8ccb5](https://github.com/johannesjo/super-productivity/commit/ba8ccb56d4856a849ee454fe03407b23014feb95))

# [5.5.0](https://github.com/johannesjo/super-productivity/compare/v5.4.3...v5.5.0) (2020-07-15)

### Bug Fixes

- adding jira issues ([b2982c2](https://github.com/johannesjo/super-productivity/commit/b2982c2711cf9c250085162eb1d331dcc0b1e677))
- assigning to read only object ([2157eaa](https://github.com/johannesjo/super-productivity/commit/2157eaa3b48bc1bf202b3f0dd02f23a1fba81fa5))
- button styling for mobile ([ae46449](https://github.com/johannesjo/super-productivity/commit/ae4644944ac93767745cc218c58a49b720c2313d))
- don't ask for notification permission without user interaction ([4e28d13](https://github.com/johannesjo/super-productivity/commit/4e28d131eecd7129e9298c872b3d9e0bf561119b))
- don't throw task side panel el error for production ([d9a2ccc](https://github.com/johannesjo/super-productivity/commit/d9a2cccdef7da5556e8f379a2a41e15704c60cdd))
- easier gitlab project path ([12c7a86](https://github.com/johannesjo/super-productivity/commit/12c7a86e25f9f3d622d09b5e14611f2e295982bb))
- error on daily summary for projects ([d0ff49f](https://github.com/johannesjo/super-productivity/commit/d0ff49fc9e7b59e1bfbb3077c20a261a76958e37))
- Gitlab issue link to open in browser ([9f4c297](https://github.com/johannesjo/super-productivity/commit/9f4c2970faa565e4958857fb6fcf37d611ff821b))
- invalid error case for task delete meta reducer ([d3b1c17](https://github.com/johannesjo/super-productivity/commit/d3b1c172f9d6ffcc60a390a30febe2ea4a379ca3))
- lint ([58b62ba](https://github.com/johannesjo/super-productivity/commit/58b62bafebea876217e2b60ef8c838d5463b1e8a))
- Making token required for Gitlab integration ([c285616](https://github.com/johannesjo/super-productivity/commit/c285616ca54605d9e3fa03dda3a19006997bcb23))
- missing return ([744204b](https://github.com/johannesjo/super-productivity/commit/744204b7ce6f6b0c7c2922d4746a1d6d30847fbc))
- remove reminder not working ([ccab62f](https://github.com/johannesjo/super-productivity/commit/ccab62fe4cd669488e1177bcbd2bed0fbfe5d44b))
- **jira:** wrong "No issueId for task" and broken logic for openWorklog [#437](https://github.com/johannesjo/super-productivity/issues/437) ([238a696](https://github.com/johannesjo/super-productivity/commit/238a6960c6b87e68396265aab6f7fe373432aeaa))
- **reminder:** showing the same reminder multiple times ([3c103bd](https://github.com/johannesjo/super-productivity/commit/3c103bd4932e875578138bf372509c81b3d382d0))
- initial dialog ([552414b](https://github.com/johannesjo/super-productivity/commit/552414becb3159cf969a6a79bc121a130e9531f7))
- lint ([2465e09](https://github.com/johannesjo/super-productivity/commit/2465e099458526de49ca90d9849462e1262631fe))
- make hammerjs work again ([b262b57](https://github.com/johannesjo/super-productivity/commit/b262b5736cee2180a918c923b71df1a8f1ad11a1))
- more null errors ([642a24c](https://github.com/johannesjo/super-productivity/commit/642a24ca13acea8cc35fe39fd4cb8593c82f7012))
- query string usage ([8bfbdee](https://github.com/johannesjo/super-productivity/commit/8bfbdee7b94d00fa8a51be23bf8b4491a262213c))
- several typing issues ([1cac5cb](https://github.com/johannesjo/super-productivity/commit/1cac5cbe43953b2901a23136eadd24212b108318))
- strict mode for undo task meta reducer ([668abdc](https://github.com/johannesjo/super-productivity/commit/668abdc0660ba6cae32dfbb0079f04bd9e187355))
- task data not ready for additional info ([d3fd189](https://github.com/johannesjo/super-productivity/commit/d3fd18970fd09f378adf634e8d03664b9bdb8300))
- worker ([c169655](https://github.com/johannesjo/super-productivity/commit/c16965512bb792fc82b2b95b2c2efc58a3edf90c))
- worklog week export not working ([8703b31](https://github.com/johannesjo/super-productivity/commit/8703b31f180ef9e8de319232038b821e7867f3b4))
- **schedule:** don't show move to backlog for sub tasks ([a6f0aba](https://github.com/johannesjo/super-productivity/commit/a6f0abae59c49d063214bc7734aea3f870467a91))

### Features

- add additional error handling ([7738f29](https://github.com/johannesjo/super-productivity/commit/7738f29a71a231e698ecba12517d0a329d0ba910))
- add flag to start dev tools for produciton initially ([7418f7e](https://github.com/johannesjo/super-productivity/commit/7418f7e46cc0f9c24ad5680a88fcddba5a3a200d))
- add intentional error trigger ([63dded7](https://github.com/johannesjo/super-productivity/commit/63dded70a2731b3510b4ece19b1024b495e21b4a))
- add tags via short syntax [#372](https://github.com/johannesjo/super-productivity/issues/372) ([7296d83](https://github.com/johannesjo/super-productivity/commit/7296d83591aff77ef70368d3fd98ad8376bcc06e))
- adjust imports ([dbb60c8](https://github.com/johannesjo/super-productivity/commit/dbb60c85a4a6553da2c0e67ed2f0e77e9d1ecd61))
- adjust reminder behaviour ([546234e](https://github.com/johannesjo/super-productivity/commit/546234ec55f2ecc7a29f1bfc7f7464c19a485aae))
- allow for initial dialog to be disabled ([bcca0b3](https://github.com/johannesjo/super-productivity/commit/bcca0b30d746775b2625facb8504d296f83a12b0))
- allow for short syntax to create new tags [#372](https://github.com/johannesjo/super-productivity/issues/372) ([668c62b](https://github.com/johannesjo/super-productivity/commit/668c62ba6156b030c9fc66a844cb639f2a3f8cb4))
- allow gitlab self hosted instances ([4b9d46b](https://github.com/johannesjo/super-productivity/commit/4b9d46bd890005c956b9e0d19d482421c3847f62))
- better logging for service worker registration ([b3604b0](https://github.com/johannesjo/super-productivity/commit/b3604b0e6b8973c84ba102e445008fcc855d6d65))
- enable strict mode for electron as well ([d24b6f2](https://github.com/johannesjo/super-productivity/commit/d24b6f231d14c6e3a087411f5c68b1408fc3cebc))
- extend error handling for task reminder dialog ([1eec1e7](https://github.com/johannesjo/super-productivity/commit/1eec1e7a088bbc2d92b39b6fa049f10cc955205a))
- improve task migration ([397cf39](https://github.com/johannesjo/super-productivity/commit/397cf3990745130c784cb7b7caaba8a54f8433e7))
- increase initial dialog timeout ([6cf0419](https://github.com/johannesjo/super-productivity/commit/6cf0419e74de3ceff82ad890a2d5a6164db215b5))
- make adding tags to github task case work [#372](https://github.com/johannesjo/super-productivity/issues/372) ([101159f](https://github.com/johannesjo/super-productivity/commit/101159f76c3013c4a4f6cef43050dd8c5f3b798f))
- make adding tags via short syntax work ([9dbc2ed](https://github.com/johannesjo/super-productivity/commit/9dbc2ed2ffc64ced4bffaec8f24c8cc3972e40fb))
- make basic github task example work [#372](https://github.com/johannesjo/super-productivity/issues/372) ([a50dab6](https://github.com/johannesjo/super-productivity/commit/a50dab688620ea893ecb5a1891771c3f8a3ca122))
- make daily summary tabs full width ([cf72735](https://github.com/johannesjo/super-productivity/commit/cf72735f1ec9347a585677ca822a2d4352ea4647))
- **dbx:** add visibilitychange handler for mobile sync ([65e1b75](https://github.com/johannesjo/super-productivity/commit/65e1b758f974d8f4cab7d687ee89f1562681f94c))
- **dbx:** stop all counters before closing sync ([d81a3f6](https://github.com/johannesjo/super-productivity/commit/d81a3f639f15668dacf73ffe2ef5af1d8d2301b0))
- **electron:** add flag for custom url ([1e0506a](https://github.com/johannesjo/super-productivity/commit/1e0506a16b289ca6611d9888540791cff0d580f5))
- **reminder:** switch from a single to multiple reminders but not vice versa ([08685a0](https://github.com/johannesjo/super-productivity/commit/08685a0d6c4721071e9af1000cd851213be6b1f7))
- **schedule:** improve styling if multiline ([2760ee3](https://github.com/johannesjo/super-productivity/commit/2760ee39900ccf891b8b35aca577daff394d51b9))
- new linting [#1](https://github.com/johannesjo/super-productivity/issues/1) ([b51f661](https://github.com/johannesjo/super-productivity/commit/b51f661f35d8d3d1de238fe885c8cd0ff20d541b))
- new linting [#2](https://github.com/johannesjo/super-productivity/issues/2) ([2ac4cd2](https://github.com/johannesjo/super-productivity/commit/2ac4cd2914217d73038836cde0e8f77cfdab1f99))
- new linting [#3](https://github.com/johannesjo/super-productivity/issues/3) ([11c854b](https://github.com/johannesjo/super-productivity/commit/11c854ba336565d2a2a7e064af2e7fb172cbb709))
- new linting [#4](https://github.com/johannesjo/super-productivity/issues/4) ([e77dd72](https://github.com/johannesjo/super-productivity/commit/e77dd7298d4314c58ade8924376a589f37890408))
- new linting [#5](https://github.com/johannesjo/super-productivity/issues/5) ([6ac7662](https://github.com/johannesjo/super-productivity/commit/6ac7662efd1bf051331ae008f9cbb8c5046eba4a))
- new linting [#6](https://github.com/johannesjo/super-productivity/issues/6) ([9c702df](https://github.com/johannesjo/super-productivity/commit/9c702df29f4e4626728e326268c338fdca7776d7))
- strict null checks [#1](https://github.com/johannesjo/super-productivity/issues/1) ([dffa9d1](https://github.com/johannesjo/super-productivity/commit/dffa9d157daa9975643b1eec5d98dfda895b1dc7))
- strict null checks [#10](https://github.com/johannesjo/super-productivity/issues/10) ([217fdd0](https://github.com/johannesjo/super-productivity/commit/217fdd0583ee8d8a1726c119e461c678d150d026))
- strict null checks [#11](https://github.com/johannesjo/super-productivity/issues/11) ([d5be384](https://github.com/johannesjo/super-productivity/commit/d5be3845bcbc3ec5cc66f841200ca7ace63e7de4))
- strict null checks [#12](https://github.com/johannesjo/super-productivity/issues/12) ([62658ca](https://github.com/johannesjo/super-productivity/commit/62658ca04447f1c3148bb5305777a8078fdf6817))
- strict null checks [#13](https://github.com/johannesjo/super-productivity/issues/13) ([5d595d6](https://github.com/johannesjo/super-productivity/commit/5d595d6d79c009c424b5f234b1b9331e552947e4))
- strict null checks [#14](https://github.com/johannesjo/super-productivity/issues/14) ([b97d1e1](https://github.com/johannesjo/super-productivity/commit/b97d1e1bd3840b4103501e344ae122ff5ec671cd))
- strict null checks [#15](https://github.com/johannesjo/super-productivity/issues/15) ([a6de71e](https://github.com/johannesjo/super-productivity/commit/a6de71e13440dc8b89ab82c4d45382462d0864b7))
- strict null checks [#16](https://github.com/johannesjo/super-productivity/issues/16) ([45a5b61](https://github.com/johannesjo/super-productivity/commit/45a5b6127c4bcffd5ca1e79af0da346abf06dbfa))
- strict null checks [#17](https://github.com/johannesjo/super-productivity/issues/17) ([a02a836](https://github.com/johannesjo/super-productivity/commit/a02a8369ed073269db7472fd51a397b7a4a7d1d6))
- strict null checks [#18](https://github.com/johannesjo/super-productivity/issues/18) ([2ced77e](https://github.com/johannesjo/super-productivity/commit/2ced77ecc8fff7bd5f54fc9ed25adc42261feffb))
- strict null checks [#19](https://github.com/johannesjo/super-productivity/issues/19) ([e72374f](https://github.com/johannesjo/super-productivity/commit/e72374fbc8c1e22fc979f354a3886c8032e28061))
- strict null checks [#2](https://github.com/johannesjo/super-productivity/issues/2) ([3134a7b](https://github.com/johannesjo/super-productivity/commit/3134a7b2e7962ef3ed6ab82dfdfb5bb5be3e9693))
- strict null checks [#2](https://github.com/johannesjo/super-productivity/issues/2) ([2067ec5](https://github.com/johannesjo/super-productivity/commit/2067ec5970e46742a9378fb7e76eebdd8f94d8ce))
- strict null checks [#20](https://github.com/johannesjo/super-productivity/issues/20) ([41f081c](https://github.com/johannesjo/super-productivity/commit/41f081cd9c91dbd2ae9eca516e633c9e70c72afd))
- strict null checks [#21](https://github.com/johannesjo/super-productivity/issues/21) ([7835aa5](https://github.com/johannesjo/super-productivity/commit/7835aa567785dbdb26e10db96b71663ea4434642))
- strict null checks [#22](https://github.com/johannesjo/super-productivity/issues/22) ([f54fe41](https://github.com/johannesjo/super-productivity/commit/f54fe4157414cb8477c8eae47ed700f42b97bb92))
- strict null checks [#23](https://github.com/johannesjo/super-productivity/issues/23) ([0e5c247](https://github.com/johannesjo/super-productivity/commit/0e5c24714bd6b8bea493c8ccfc49baccfc47ec8b))
- strict null checks [#24](https://github.com/johannesjo/super-productivity/issues/24) ([7da92bd](https://github.com/johannesjo/super-productivity/commit/7da92bd2fb8580d2fa5d270ddbde99321b5ea4a4))
- strict null checks [#25](https://github.com/johannesjo/super-productivity/issues/25) ([8f30b09](https://github.com/johannesjo/super-productivity/commit/8f30b0908a9094e4d481c9fe3011f6d7ff210ed3))
- strict null checks [#26](https://github.com/johannesjo/super-productivity/issues/26) ([c06eb36](https://github.com/johannesjo/super-productivity/commit/c06eb360151d33aed071951d2c521206cca78ed3))
- strict null checks [#3](https://github.com/johannesjo/super-productivity/issues/3) ([ad2a9bb](https://github.com/johannesjo/super-productivity/commit/ad2a9bb23a19f099453a7db538263f864a283dd8))
- strict null checks [#4](https://github.com/johannesjo/super-productivity/issues/4) ([33de270](https://github.com/johannesjo/super-productivity/commit/33de2706b3121402b12133336240ae8960304245))
- strict null checks [#5](https://github.com/johannesjo/super-productivity/issues/5) ([f010cdb](https://github.com/johannesjo/super-productivity/commit/f010cdbe703402a187b6c05fc98d6be8a14de770))
- strict null checks [#6](https://github.com/johannesjo/super-productivity/issues/6) ([387b448](https://github.com/johannesjo/super-productivity/commit/387b4486913fd0f61ef83f53a711adde04b7da51))
- strict null checks [#7](https://github.com/johannesjo/super-productivity/issues/7) ([7356b31](https://github.com/johannesjo/super-productivity/commit/7356b3193fca4f050c8c04b2473b5b79e2d2a260))
- strict null checks [#8](https://github.com/johannesjo/super-productivity/issues/8) ([cf00a54](https://github.com/johannesjo/super-productivity/commit/cf00a54239f6439daa4d6ba5e6102f1c75fbba44))
- strict null checks [#9](https://github.com/johannesjo/super-productivity/issues/9) ([c6636e7](https://github.com/johannesjo/super-productivity/commit/c6636e75c5d4c651119cf82d46fcda317ec72a94))
- strict null checks 27 ([ec382f3](https://github.com/johannesjo/super-productivity/commit/ec382f3d93678879e0e29b9d91dac4e1442af01e))
- strict null checks 28 ([3979636](https://github.com/johannesjo/super-productivity/commit/397963657416f21791823615bbe00e890427bf65))
- strict null checks 29 ([3d52c50](https://github.com/johannesjo/super-productivity/commit/3d52c5039930128875e85aa9cacc2c265f026f8d))
- strict null checks 30 ([a56e4b9](https://github.com/johannesjo/super-productivity/commit/a56e4b924ef7081f0701b8769cab01ecb1f7ab91))
- strict null checks final? ([45de83a](https://github.com/johannesjo/super-productivity/commit/45de83ab83d409a0937688a075cbb310741e103b))
- strict null checks for tpl 1 ([f73b461](https://github.com/johannesjo/super-productivity/commit/f73b4619de6e1d73c4748b1750b4d2de14c6cc9d))
- strict null checks for tpl 2 ([e422ce3](https://github.com/johannesjo/super-productivity/commit/e422ce3c66a2e5ccb460e38bd0749b0272143c70))

## [5.4.3](https://github.com/johannesjo/super-productivity/compare/v5.4.2...v5.4.3) (2020-07-01)

### Bug Fixes

- lint ([a839e2e](https://github.com/johannesjo/super-productivity/commit/a839e2e820d9fdb46bbb04d75baddc44eed0788b))
- opening external links in browser not working [#422](https://github.com/johannesjo/super-productivity/issues/422) ([ab269a7](https://github.com/johannesjo/super-productivity/commit/ab269a7369b73a473070e5df9aa56ee7419f1c3b))
- show focus styles for hybrid device ([974129f](https://github.com/johannesjo/super-productivity/commit/974129ff65ea0a21773c309c32cd4cdc28ac83bc))
- touchOnly not working as expected ([823f2e1](https://github.com/johannesjo/super-productivity/commit/823f2e1fc3875d904c72b681560a2653b4aca244))

### Features

- further simplify mobile handling ([53c4786](https://github.com/johannesjo/super-productivity/commit/53c478601cde2ceda5d8d1bdfece617b6a0e01cb))
- improve full screen side panel styling for title ([30ecf4d](https://github.com/johannesjo/super-productivity/commit/30ecf4d9bb6a0f323f38019723f702218699a113))
- improve very small view for desktop ([389c6ba](https://github.com/johannesjo/super-productivity/commit/389c6ba1ccfee5320ac02792b34ea11fd5d1c8cb))
- simplify mobile handling ([bb94377](https://github.com/johannesjo/super-productivity/commit/bb94377e4a975b966f579185b5a8d8ff15d42a92))

## [5.4.2](https://github.com/johannesjo/super-productivity/compare/v5.4.1...v5.4.2) (2020-06-27)

### Bug Fixes

- **dbx:** wrong app key [#414](https://github.com/johannesjo/super-productivity/issues/414) ([13cd764](https://github.com/johannesjo/super-productivity/commit/13cd7642581b1f6b6afb0d30989f8284b263037b))
- cannot compare invalid dates error ([d768e0e](https://github.com/johannesjo/super-productivity/commit/d768e0e340c437e5c9811812cc1b2bd00bb94675))
- remove from today for dark theme ([640af86](https://github.com/johannesjo/super-productivity/commit/640af865c0c6934495a7fc4c905eceef2575d1f5))
- **reminder:** don't delay initially ([0cfcde9](https://github.com/johannesjo/super-productivity/commit/0cfcde9a42ed9093456858ba93ba42e741ed7bdc))

### Features

- add custom remove from today icon ([9112fd8](https://github.com/johannesjo/super-productivity/commit/9112fd8ae7ee8d9cad2fd8a941a2e862a155f914))
- always open side bar on mobile task tap ([bbda176](https://github.com/johannesjo/super-productivity/commit/bbda1769432a3ee23917e60faf8080abad90635d))
- improve remove from today icon ([1350a63](https://github.com/johannesjo/super-productivity/commit/1350a631a0ab1930ccdfda7094ae9353eccf0dad))
- improve work view icons ([0b02e8a](https://github.com/johannesjo/super-productivity/commit/0b02e8adc4646256a04b673b4ce4524382b9d840))
- replace repeat with dedicated icon ([a73bbee](https://github.com/johannesjo/super-productivity/commit/a73bbee70de121e5fe0b91787ffcee8b685d1efc))
- update remove from my day icon for schedule ([fef689f](https://github.com/johannesjo/super-productivity/commit/fef689f837267015d934529f971a873f02f69982))
- **reminder:** improve experience for initial ([40c3e5e](https://github.com/johannesjo/super-productivity/commit/40c3e5edc209ff1908bfaf8e6437067a35d5d35f))
- **task:** always show title and sub tasks when over for side panel ([118ec76](https://github.com/johannesjo/super-productivity/commit/118ec76ad67e7cac8cd66fb558edaccef7d77936))
- **task:** edit task repeat cfg on swipe right for repeatable tasks ([b57702f](https://github.com/johannesjo/super-productivity/commit/b57702fa5ec10f60571e698353bb1accc05b62c5))
- **task:** improve animation performance for drawer ([72b0722](https://github.com/johannesjo/super-productivity/commit/72b0722714694ed9b78e71d1f1218d2302a38d70))
- **task:** remove empty notes icon for mobile ([3e0474d](https://github.com/johannesjo/super-productivity/commit/3e0474d5789a79f2a1cac65ba3d9e36d1ff51539))

## [5.4.1](https://github.com/johannesjo/super-productivity/compare/v5.4.0...v5.4.1) (2020-06-24)

### Bug Fixes

- center time picker for android ([897e57b](https://github.com/johannesjo/super-productivity/commit/897e57be29beaede3d30265934421b755fe4ac06))
- deps ([383dbbf](https://github.com/johannesjo/super-productivity/commit/383dbbfe0889b085ee4036f37ad0a4bbb239616b))
- service worker notification not having permission [#408](https://github.com/johannesjo/super-productivity/issues/408) ([328b3a4](https://github.com/johannesjo/super-productivity/commit/328b3a4968ee98e8b8ebcf824fe03ae9a929f735))
- **task:** cleanup el ([699ba2d](https://github.com/johannesjo/super-productivity/commit/699ba2daa0180243f612867055f0e0e98a7ddb5c))
- **task:** don't hide schedule swipe for sub tasks ([ec64917](https://github.com/johannesjo/super-productivity/commit/ec649172e4fc3f0f4ad1fec69bcf6acff56e2855))

### Features

- **schedule:** improve styling for mobile ([fffc5bd](https://github.com/johannesjo/super-productivity/commit/fffc5bd6b1fe592823f442f98ab7b847cdfeca99))
- display automatic backup path ([081612c](https://github.com/johannesjo/super-productivity/commit/081612c753012d5ce041e9b63ecccca61c10481b))
- remove moment completely from electron layer ([deef291](https://github.com/johannesjo/super-productivity/commit/deef2911b9ca4b6581bcc232fc42e20a6bde3034))
- **schedule:** add more later today times ([77a5448](https://github.com/johannesjo/super-productivity/commit/77a5448c525473aa7a3a5475788a52dfdb5aff10))

# [5.4.0](https://github.com/johannesjo/super-productivity/compare/v5.3.5...v5.4.0) (2020-06-20)

### Bug Fixes

- catch service worker errors ([00a2e1a](https://github.com/johannesjo/super-productivity/commit/00a2e1a3004d6261407c4dd5e6aa26a5b0f0559d))
- missing default cfg property ([561ba51](https://github.com/johannesjo/super-productivity/commit/561ba516091eb514ecf2f9abc59335f22b51b44c))
- **schedule:** btn text ([e255e21](https://github.com/johannesjo/super-productivity/commit/e255e213b572161756dca8a042adf377c03c6d3a))
- **schedule:** double enter message styling for light theme ([53d5c04](https://github.com/johannesjo/super-productivity/commit/53d5c04ede8abec1c7925446d18d2037c0478e22))
- **schedule:** endless reminder dialogs ([b19a6ad](https://github.com/johannesjo/super-productivity/commit/b19a6ad41ca30ffafb4ed5d17babba264d46ed23))
- deprecated use of method ([000c442](https://github.com/johannesjo/super-productivity/commit/000c442a222b041d8c009ba46b2a78a4880153e1))
- deprecated use of method ([19cc456](https://github.com/johannesjo/super-productivity/commit/19cc45610d39231641741a3fc605ad43126aa3b6))
- **schedule:** cell focus bg ([9c0a890](https://github.com/johannesjo/super-productivity/commit/9c0a890006d56df32e9958db512346ea39cb928e))
- **schedule:** creating orphan tasks for today list ([2cbb7bd](https://github.com/johannesjo/super-productivity/commit/2cbb7bd8b4e41a46b159481af6efdb59ef518120))
- **schedule:** days occasionally still getting to big ([73173c0](https://github.com/johannesjo/super-productivity/commit/73173c0fb0906716b7bc8ecc8c81107db9f7f18d))
- **schedule:** prevent multiple submits ([e04c5c5](https://github.com/johannesjo/super-productivity/commit/e04c5c5abe078f839b00c0a9a20152e7fa3b3c77))
- **schedule:** styling of picker for mobile ([b402806](https://github.com/johannesjo/super-productivity/commit/b402806c21d832051c6b56f8016c02e0766fed6a))
- **schedule:** throw error if multiple reminders are created for the same task ([855982d](https://github.com/johannesjo/super-productivity/commit/855982d7dd1b8108d6dd026d6549d18a6ea1848e))
- handle case when trying to add notes outside project context [#400](https://github.com/johannesjo/super-productivity/issues/400) ([ea8c2e6](https://github.com/johannesjo/super-productivity/commit/ea8c2e6ae3ca202af87b6673750d4666406dc370))
- lint ([d7ce002](https://github.com/johannesjo/super-productivity/commit/d7ce00232efe4d2ed872b2b171c5b157d5046bec))

### Features

- **dbx:** add more advanced error handling for edge cases ([5d34f7b](https://github.com/johannesjo/super-productivity/commit/5d34f7b8d0fbb92bd2779ad74714e05bfec2c4a5))
- **i18n:** add translations ([e952e08](https://github.com/johannesjo/super-productivity/commit/e952e0886946165697ba5acfc102ca6cf9854536))
- **i18n:** for motivational image feature ([84ad0ba](https://github.com/johannesjo/super-productivity/commit/84ad0ba47d6f0716333ee697ce5a2c38a1e71a98))
- **takeABreak:** add motivational image feature ([6cee71b](https://github.com/johannesjo/super-productivity/commit/6cee71b1bda346a6cd5608c9d3c29adee1152758))
- improve banner slide out ani ([3b1ab62](https://github.com/johannesjo/super-productivity/commit/3b1ab6294aff1bda72348d5343e46c00c5454506))
- **dbx:** prepare pkce method as secure alternative ([20aa8bb](https://github.com/johannesjo/super-productivity/commit/20aa8bb65677cac3b6af34e03465a50417497d2b))
- **dbx:** switch to pkce flow ([0661159](https://github.com/johannesjo/super-productivity/commit/0661159749e02d7646e8133d1216190de5fb48c3))
- **i18m:** translations for reminder ([72753d1](https://github.com/johannesjo/super-productivity/commit/72753d102d80c0269f910643273d2bb9d73a9057))
- **reminder:** add most basic dialog for multiple ([e3c162d](https://github.com/johannesjo/super-productivity/commit/e3c162d42af2148492d8fb762f9d20fc69d57b64))
- **reminder:** add notification for multiple ([1e0a21b](https://github.com/johannesjo/super-productivity/commit/1e0a21b0342c7be742cfc7efe2df0cb21826ada5))
- **reminder:** add snooze until tomorrow ([ee40c8b](https://github.com/johannesjo/super-productivity/commit/ee40c8bafedc0c50e66fbf20172dbe134f812687))
- **reminder:** add translations ([6c0a013](https://github.com/johannesjo/super-productivity/commit/6c0a013c2ca037b6fe513078888e4b6b52e4bf7f))
- **reminder:** add translations ([1075300](https://github.com/johannesjo/super-productivity/commit/1075300474fd6ed84150d73604709564033f708c))
- **reminder:** better handle single update in list ([e4de633](https://github.com/johannesjo/super-productivity/commit/e4de6331d5344e4b70881b6ee64e38226763d7f2))
- **reminder:** handle add all cases ([6c42028](https://github.com/johannesjo/super-productivity/commit/6c420288183083f2655df15d4a5662331221862f))
- **reminder:** improve ui ([ee9d8a1](https://github.com/johannesjo/super-productivity/commit/ee9d8a1f16deb1f2b3b40d1fef23e1b1d0c87173))
- **reminder:** live update when update comes in ([ca0d5dd](https://github.com/johannesjo/super-productivity/commit/ca0d5dd2516f189826a2a3f77625c79aadb2ce9f))
- **reminder:** make note reminder work again ([ba5076a](https://github.com/johannesjo/super-productivity/commit/ba5076a2f322971283fb1daae9e480d71e669560))
- **reminder:** merge task reminder stuff into single dialog ([d61e8b2](https://github.com/johannesjo/super-productivity/commit/d61e8b2175c36dedc961cec9e3dffc5d08726d14))
- **reminder:** send multiple from worker ([88aa859](https://github.com/johannesjo/super-productivity/commit/88aa859d3141fa302992610f95db0746fa0fbe94))
- **reminder:** send notes or tasks together ([a1d14cd](https://github.com/johannesjo/super-productivity/commit/a1d14cd8c9207dcff3169a6d7528720f205c43f4))
- **schedule:** add 9:00 to later today slots ([d8b0997](https://github.com/johannesjo/super-productivity/commit/d8b0997f8c18063e8aded6e0ffe8877786df9c3f))
- **schedule:** add double enter stuff ([05b6675](https://github.com/johannesjo/super-productivity/commit/05b66756533b8894aca47c70a1e443d9fd52fd7e))
- **schedule:** add owl wrapper ([cdf18ad](https://github.com/johannesjo/super-productivity/commit/cdf18ad3308f93cb3a55046a6964962c472a139b))
- **schedule:** add remove from today checkbox for project tasks also when on a tag list ([9718f4e](https://github.com/johannesjo/super-productivity/commit/9718f4e1fa98aac5856034939d6607ec491a8e4e))
- **schedule:** add translations ([6e7d721](https://github.com/johannesjo/super-productivity/commit/6e7d7216c76799771a9d299263446390801da4d7))
- **schedule:** add unschedule button again ([9e12db6](https://github.com/johannesjo/super-productivity/commit/9e12db6351abff8c317f8de02ef94a4026cccfcb))
- **schedule:** check for missing related data before loading reminders ([f58df46](https://github.com/johannesjo/super-productivity/commit/f58df46425f072868a8b3eb96268ca86f04f2286))
- **schedule:** check if tasks still exists for reminders ([f58b668](https://github.com/johannesjo/super-productivity/commit/f58b668154df88246d0e21685b40e3bb99e74e88))
- **schedule:** connect new actions ([f41c615](https://github.com/johannesjo/super-productivity/commit/f41c615d6ad662c3afbb89def84d50429d67814c))
- **schedule:** improve dark theme styling ([d22c510](https://github.com/johannesjo/super-productivity/commit/d22c510fba76260a96bf4f0a757b1ff1dbc85a71))
- **schedule:** improve date ([d93baa0](https://github.com/johannesjo/super-productivity/commit/d93baa0e83767344f31360312676668509c5f76b))
- **schedule:** improve dialog for notes ([a208012](https://github.com/johannesjo/super-productivity/commit/a2080122e68a1c5ab5ffd8a54331523538f6e344))
- **schedule:** improve dialog for task ([b3ea526](https://github.com/johannesjo/super-productivity/commit/b3ea52692d51fcbb7554444b9b9e3d7fe55404bd))
- **schedule:** improve icons ([d47d7e1](https://github.com/johannesjo/super-productivity/commit/d47d7e1e7c29d35899d4f5b222d88849a3ba2b47))
- **schedule:** improve mobile styling ([3a44fe2](https://github.com/johannesjo/super-productivity/commit/3a44fe235573bd5dd28b16eb964b4f2280e39af3))
- **schedule:** improve mobile styling ([6e003bc](https://github.com/johannesjo/super-productivity/commit/6e003bc9457bfd26e12ff44a9933f8630d90a4b5))
- **schedule:** improve styling ([1257c09](https://github.com/johannesjo/super-productivity/commit/1257c096792128687ec050f1da304e2b1ab0de6a))
- **schedule:** improve styling and add add to today butto ([33c9866](https://github.com/johannesjo/super-productivity/commit/33c98661c3f85055555fe4dbd3b9b2114c99398f))
- **schedule:** indicate active button ([e939182](https://github.com/johannesjo/super-productivity/commit/e939182a68e2765ed0217885315b95b5a1d303dd))
- **schedule:** make add to today toggleable ([3397087](https://github.com/johannesjo/super-productivity/commit/33970878a6a19b6ae3da79a3218a5e91239fd38e))
- **schedule:** make new input work ([88c4a5d](https://github.com/johannesjo/super-productivity/commit/88c4a5d96ff22cd38d43e69c17dadec3dbff89d8))
- **schedule:** make styling for dark theme work ([e2271f0](https://github.com/johannesjo/super-productivity/commit/e2271f0ab46db1dc02bc5a4eec7c1fb4b7bf3dd9))
- **schedule:** minor improvements ([bfa3447](https://github.com/johannesjo/super-productivity/commit/bfa3447df290935be6c242d014c79b2431f539bf))
- **test:** adjustment ([2e6dfdc](https://github.com/johannesjo/super-productivity/commit/2e6dfdc317d66068d600c62e8ef43924825af4e3))
- add is touch only detection ([6efe4de](https://github.com/johannesjo/super-productivity/commit/6efe4dee8fdc4816360f61066fb744cdfb83f924))
- add more logging for database wrapper ([b342b28](https://github.com/johannesjo/super-productivity/commit/b342b2813298f1089276248e386725de2b291651))
- improve focus behaviour ([0482b3e](https://github.com/johannesjo/super-productivity/commit/0482b3e70cb57d155cb2dd3df6e6cb0a02128819))
- make add to today work for parent tasks ([d864047](https://github.com/johannesjo/super-productivity/commit/d864047492ceec0e3265f0f803de3eb939efcafc))
- make swipe left open reminder dialog for today ([6afbdb4](https://github.com/johannesjo/super-productivity/commit/6afbdb41afb1639bb6c0146b6bc71ae08aae422e))
- prevent edit of sub task tags ([b7cec34](https://github.com/johannesjo/super-productivity/commit/b7cec34b28ecec4b0bd6c8395086ef0dcd0b179a))
- update picker ([0680ca3](https://github.com/johannesjo/super-productivity/commit/0680ca33f46b1a841edfa7e5c0d5a9af6cf36f5b))
- **schedule:** make new schedule work for notes ([aecfef6](https://github.com/johannesjo/super-productivity/commit/aecfef67eca1bba60579ca8654a34202278db39f))
- **schedule:** show previously selected date ([4abf0d6](https://github.com/johannesjo/super-productivity/commit/4abf0d6bcdf5c00434ebd49257b8ff3f26e331ef))
- warn about not having enough disk space available ([f709429](https://github.com/johannesjo/super-productivity/commit/f709429f9786aee65dd586d6904320b7d11b7877))

## [5.3.5](https://github.com/johannesjo/super-productivity/compare/v5.3.4...v5.3.5) (2020-06-11)

### Bug Fixes

- avoid edge case error [#391](https://github.com/johannesjo/super-productivity/issues/391) ([29891d7](https://github.com/johannesjo/super-productivity/commit/29891d74560a0c26c0fd27ccddd12dcbbf786c1d))
- broken data after falling victim to [#391](https://github.com/johannesjo/super-productivity/issues/391) ([4105925](https://github.com/johannesjo/super-productivity/commit/4105925a830e0fd4fd6e56909bb33f04b224dcaf))
- font size for textarea on mac ([2327da8](https://github.com/johannesjo/super-productivity/commit/2327da83d0d2de86ae09493aaf4db44db87b5132))
- project sort leading to deleting project ids [#391](https://github.com/johannesjo/super-productivity/issues/391) ([fc00553](https://github.com/johannesjo/super-productivity/commit/fc005531c40c1573f0e48ee216308c3eb336ffa1))

### Features

- **i18n:** add missing translations ([f97a208](https://github.com/johannesjo/super-productivity/commit/f97a208b31a8893fba115586a5b0cf0cdd7db493))
- don't cache news.json and show to new users on second load ([af8267c](https://github.com/johannesjo/super-productivity/commit/af8267c0fb845603417222d149ba387097492656))
- improve error handling for persistence [#391](https://github.com/johannesjo/super-productivity/issues/391) ([b2a8875](https://github.com/johannesjo/super-productivity/commit/b2a8875376d9cc3ccf40fc0a231c9a28e3d2f3a4))
- improve github error reporting ([2468a0b](https://github.com/johannesjo/super-productivity/commit/2468a0b8d95ad98da53e03de932ef5f91e9e5e7f))

## [5.3.4](https://github.com/johannesjo/super-productivity/compare/v5.3.3...v5.3.4) (2020-06-10)

### Bug Fixes

- avoid "Failed to execute 'collapseToEnd'" ([4739aaa](https://github.com/johannesjo/super-productivity/commit/4739aaa58f4c5699f0ed679f77b2dcdc4a3e3ee6))
- error when focusing via tab for inline input [#390](https://github.com/johannesjo/super-productivity/issues/390) ([0c98bf1](https://github.com/johannesjo/super-productivity/commit/0c98bf15e0cf86cd592ee6cc4b11464b09970b0b))
- styling for tablet size ([7af4429](https://github.com/johannesjo/super-productivity/commit/7af44294f05a684a02b94e29d9fb25bc3f6659f4))

### Features

- improve drawer performance by not showing backdrop ([2699140](https://github.com/johannesjo/super-productivity/commit/26991402693c4a25aac85e40d20d08fffa7ff371))
- make backdrop dark for dark theme ([151ec88](https://github.com/johannesjo/super-productivity/commit/151ec887824fb09870a63d33bf02552198fdd548))
- restore focus for fullscreen markdown edit ([1035cd6](https://github.com/johannesjo/super-productivity/commit/1035cd6f65e20ba8d9374bfddf02afdf9a752f02))
- save per default for fullscreen markdown dialog ([786e016](https://github.com/johannesjo/super-productivity/commit/786e0164b1ef8922ee20c0dcdfa11872febdde94))

## [5.3.3](https://github.com/johannesjo/super-productivity/compare/v5.3.2...v5.3.3) (2020-06-10)

### Bug Fixes

- **pomodoro:** start task after break without session end [#389](https://github.com/johannesjo/super-productivity/issues/389) ([f0e19e7](https://github.com/johannesjo/super-productivity/commit/f0e19e7ea0e2939a304ac47baa3b42e1c1e85778))
- **pomodoro:** timer slowing down in background [#363](https://github.com/johannesjo/super-productivity/issues/363) ([dbe9c8b](https://github.com/johannesjo/super-productivity/commit/dbe9c8b256df938d9b39700ed1d88a5f087f8940))
- dirty fix evaluation sheet not showing up ([0a0e17a](https://github.com/johannesjo/super-productivity/commit/0a0e17a9b3fb334716aeb7adc21a92e115471370))
- project sort not saving ([6813e2c](https://github.com/johannesjo/super-productivity/commit/6813e2c91a94cd52b7a3bbffeb394a4bef5f19cc))

### Features

- **task:** improve add task bar for mobile ([4666d78](https://github.com/johannesjo/super-productivity/commit/4666d78870cd5a7636ac4d1f10481f7ab4eb9e3d))
- **task:** move cursor to end on enter press to edit task ([2054563](https://github.com/johannesjo/super-productivity/commit/205456341afe7358a15ff3b7a43013d973ea8c4f))
- improve drawer performance for mobile ([feaf4f8](https://github.com/johannesjo/super-productivity/commit/feaf4f8f085ae6bd4f0a89b782df73fcc9d56053))
- **task:** show side panel for tapping task title on mobile ([552e9ab](https://github.com/johannesjo/super-productivity/commit/552e9abde1e383e0505ed49b864a8a2455029c07))

## [5.3.2](https://github.com/johannesjo/super-productivity/compare/v5.3.1...v5.3.2) (2020-06-06)

### Bug Fixes

- **dbx:** in memory copy not being refreshed after import ([bb51375](https://github.com/johannesjo/super-productivity/commit/bb513752a1c8cd6aa998e460342374ba2c1dacf0))
- **dbx:** sync triggering twice initially ([3af2c1e](https://github.com/johannesjo/super-productivity/commit/3af2c1e1619610396aaa2fbcd766413f5ac21468))
- scheduled tasks not showing up ([c638fdf](https://github.com/johannesjo/super-productivity/commit/c638fdfb56a45e6f256d645d401a2144d77c2cd7))

### Features

- add color for widget ([4cdba67](https://github.com/johannesjo/super-productivity/commit/4cdba67f5a7e3cdb0b5b40185dedbebc3b16c3f6))
- **dbx:** improve error handling ([e30ddf9](https://github.com/johannesjo/super-productivity/commit/e30ddf901fb5c0d885d0e1eab56141b4425ba1ee))
- improve logging ([c29ccf0](https://github.com/johannesjo/super-productivity/commit/c29ccf0c79ecab31135aed068831888ad5dd1701))

## [5.3.1](https://github.com/johannesjo/super-productivity/compare/v5.3.0...v5.3.1) (2020-06-04)

### Features

- improve github open issue ([248a6ed](https://github.com/johannesjo/super-productivity/commit/248a6ed88bf3bbb538d9e680448b5c245fa1805a))
- wait a bit before displaying error to increase the chance of the source maps being send as well ([508149b](https://github.com/johannesjo/super-productivity/commit/508149be98b08c1462976a2e7db24fc63a1d569d))

# [5.3.0](https://github.com/johannesjo/super-productivity/compare/v5.2.1...v5.3.0) (2020-06-04)

### Bug Fixes

- **dbx:** auth token request re-triggering when it shouldn't ([d10c3d8](https://github.com/johannesjo/super-productivity/commit/d10c3d8117222a49636f93c94f9216cabd54c83b))
- **dbx:** buttons being labeled wrong ([cfe24d8](https://github.com/johannesjo/super-productivity/commit/cfe24d84cc66e3336fbc4b0f6f352be89c55231f))
- **dbx:** caching for dropbox ([e4961b3](https://github.com/johannesjo/super-productivity/commit/e4961b32aaf3307afddd5c50970731a4da7dd3ff))
- **dbx:** error handling ([5810653](https://github.com/johannesjo/super-productivity/commit/581065353ea2497b24e6182d5d48e2a6e3203959))
- **dbx:** error when going offline ([1c96e26](https://github.com/johannesjo/super-productivity/commit/1c96e26dd959236e3bc6b61830acc2050fcf9b7c))
- **dbx:** fix initial sync trigger trigger all the time ([ffe5681](https://github.com/johannesjo/super-productivity/commit/ffe568105e07144955b200fc805233d21265a087))
- **dbx:** icons for conflict dialog ([96b85df](https://github.com/johannesjo/super-productivity/commit/96b85df062287872b4d35602ea302dd61163d128))
- **dbx:** in memory copy not containing last sync model change ([04dc789](https://github.com/johannesjo/super-productivity/commit/04dc7893332a14d808bbebdfb98c9f36024c1780))
- **dbx:** initial sync ([2d8fdc3](https://github.com/johannesjo/super-productivity/commit/2d8fdc386ec86e7611d7e0d5792558ca15f0bfb8))
- **dbx:** overwrite remote on conflict ([40f679f](https://github.com/johannesjo/super-productivity/commit/40f679f5221da8f249ca790557b1e9f6e6fdaf69))
- **dbx:** sync before close ([f63b574](https://github.com/johannesjo/super-productivity/commit/f63b5740934f6b01d34dbe8fb05631148dc9c10e))
- **dbx:** unit test ([8ef67d3](https://github.com/johannesjo/super-productivity/commit/8ef67d3e79d86ee2096685965d5ff408b53bf188))
- **dbx:** wording of fallback alerts ([26dabe3](https://github.com/johannesjo/super-productivity/commit/26dabe3cf166e89c5b651bd22795344cdc372fc7))
- global progress bar position ([dc7c9f8](https://github.com/johannesjo/super-productivity/commit/dc7c9f890bb9737021fae2c3513b7e2b2dc5838b))
- issue after finish day from project [#380](https://github.com/johannesjo/super-productivity/issues/380) ([38f1176](https://github.com/johannesjo/super-productivity/commit/38f1176c63407ba3bd989e0efa0041b87a0fb448))
- issue data loading bug ([62bfd1d](https://github.com/johannesjo/super-productivity/commit/62bfd1d9dae646d6f1bc779beb9aa12ec80582a9))
- **dbx:** unexpected RemoteNotUpToDateDespiteSync ([09ef9d7](https://github.com/johannesjo/super-productivity/commit/09ef9d716036b90af703892647f69cf0d862e262))
- **dbx:** unwanted error swallow ([82084cd](https://github.com/johannesjo/super-productivity/commit/82084cdf7bc643d6feb2546ccfa672673b76eebd))
- snack pos ([4f25d3d](https://github.com/johannesjo/super-productivity/commit/4f25d3d1b7c2877ff0951e1a556d227136117938))

### Features

- **dbx:** add conflict dialog ([1370008](https://github.com/johannesjo/super-productivity/commit/1370008462f67b28eb37aac361775bbc3db9a730))
- **dbx:** add rev for download again ([ce0cfcd](https://github.com/johannesjo/super-productivity/commit/ce0cfcd490735419b51917991a017898c376c3ab))
- **dbx:** add translations and handle errors ([75da9d1](https://github.com/johannesjo/super-productivity/commit/75da9d1fe90726ae3789dc306b404e21511929e8))
- **dbx:** add translations for form ([887eb87](https://github.com/johannesjo/super-productivity/commit/887eb87050a7ecba92bd53748cb4d9a604860bfb))
- **dbx:** adjust fallback error handling ([9cdaa07](https://github.com/johannesjo/super-productivity/commit/9cdaa07229db65203f96726cc14386af97661ea3))
- **dbx:** adjust messages ([e561900](https://github.com/johannesjo/super-productivity/commit/e5619000d1e04d268fbb122b57127f23cfd22dd1))
- **dbx:** also execute on daily summary ([00c8cae](https://github.com/johannesjo/super-productivity/commit/00c8caeaa0e8035eff2ca95cacaf7b9641d1a528))
- **dbx:** also sync on touchstart for mobile ([9ce41bf](https://github.com/johannesjo/super-productivity/commit/9ce41bf72e7ed0e91350c979927a265e4fc5557b))
- **dbx:** also sync on touchstart for mobile ([6eaeec6](https://github.com/johannesjo/super-productivity/commit/6eaeec632233b55825a9f4284d25fc7f1b2bf54b))
- **dbx:** also use conflict dialog for RemoteNotUpToDateDespiteSync ([c6f6b4f](https://github.com/johannesjo/super-productivity/commit/c6f6b4f10eff59be2935c40b7d6277279d645b6f))
- **dbx:** don't exec initial sync trigger when just changing sync interval ([f2c571c](https://github.com/johannesjo/super-productivity/commit/f2c571cc59ce0737aad853f37a344f3176e4b222))
- **dbx:** handle another unlikely error case ([92282f0](https://github.com/johannesjo/super-productivity/commit/92282f0af10089ab6b70ffb411ee3f79f5ba6d17))
- **dbx:** handle initial file creation ([f6fa84d](https://github.com/johannesjo/super-productivity/commit/f6fa84d3a29e8640dd23b4fefd3004ca96c380d6))
- **dbx:** handle more error cases ([4a94ed2](https://github.com/johannesjo/super-productivity/commit/4a94ed2678806db7a98fb6c0d03ef97c2d2f1b58))
- **dbx:** handle wrong value for localLastSync ([f3dab98](https://github.com/johannesjo/super-productivity/commit/f3dab9876f0bf941779db41550ea34c076cdf84d))
- **dbx:** improve login flow ([f46b7dc](https://github.com/johannesjo/super-productivity/commit/f46b7dc3f09f075872ca837cc60777262252eba8))
- **dbx:** improve message ([0a6aa91](https://github.com/johannesjo/super-productivity/commit/0a6aa91b9e5226792dba8bc7bf6e47b3e4c756e1))
- **dbx:** improve sync before quit ([b67094c](https://github.com/johannesjo/super-productivity/commit/b67094c939c2da2135ba2304ef3e7f4b0c7365a1))
- **dbx:** improve sync behaviour ([685688e](https://github.com/johannesjo/super-productivity/commit/685688e823cb30d18f69308bda46ce1d19998fdf))
- **dbx:** make most basic sync before quit work ([8017c2f](https://github.com/johannesjo/super-productivity/commit/8017c2f4597eb78d891cf88c91d957cbfdfd7346))
- **dbx:** prepare unload stuff ([b85ca92](https://github.com/johannesjo/super-productivity/commit/b85ca92bfd88682d4157553647f874ee57aaa2d7))
- **i18n:** update all the translations ([362ebaf](https://github.com/johannesjo/super-productivity/commit/362ebaf6646add968d1e82541cde524fdd187a23))
- add label to global progress bar ([1a3c175](https://github.com/johannesjo/super-productivity/commit/1a3c175c32054c6522b9af7637652aa4279fa0da))
- add offline banner ([6d5df60](https://github.com/johannesjo/super-productivity/commit/6d5df60c4d21279596c0dddd32d0f876e2c8f045))
- add schedule task back to mobile context menu ([8693b9e](https://github.com/johannesjo/super-productivity/commit/8693b9ea255626952bd132d612bb4b0871a4dc3d))
- add translations for global progress bar labels ([472050e](https://github.com/johannesjo/super-productivity/commit/472050eeb992900a593a3152570f328fc11c6a27))
- make progress bar a little more subtle ([819353c](https://github.com/johannesjo/super-productivity/commit/819353c9461aaf9307821a6b938be64615fcbbe0))
- move sync stuff to its own config section ([3a5125a](https://github.com/johannesjo/super-productivity/commit/3a5125a6cb46fc9d48fa3d39e775c9dc86fe7cad))
- use in memory copy rather than indexeddb for loads ([00c3c7d](https://github.com/johannesjo/super-productivity/commit/00c3c7d002e0a40a1ec6a614b7c28e81fcbd045c))
- **dbx:** improve sync triggers ([6fcdfb7](https://github.com/johannesjo/super-productivity/commit/6fcdfb705b0f226df64d9bcd1bd684cdc12b6a76))
- **dbx:** make logging optional ([cd17dce](https://github.com/johannesjo/super-productivity/commit/cd17dceb80cfaf8c2bd7e4d4669f5dab20408e2f))
- **dbx:** minor refactor ([e5a497c](https://github.com/johannesjo/super-productivity/commit/e5a497c214c506cd299674b03bfaaf3a10e06d31))
- **dbx:** move sync indicator bar to bottom ([907855c](https://github.com/johannesjo/super-productivity/commit/907855cdc5a41f8d101f81bbdc574288df3693a7))
- **dbx:** prevent multiple dialogs ([0d75fc9](https://github.com/johannesjo/super-productivity/commit/0d75fc9d1945959eecfb4d8ccb9e86e8b09fcf54))
- **dbx:** use different file for dev and production ([d81b868](https://github.com/johannesjo/super-productivity/commit/d81b86898724a2b1844c44566a0a41892d469e4e))
- improve app loading experience ([02776b7](https://github.com/johannesjo/super-productivity/commit/02776b710cf1525c5d08e4400c2bf9b3b3ee04b4))
- **dbx:** add boilerplate ([6183d30](https://github.com/johannesjo/super-productivity/commit/6183d30bdcdad163f1cce270e9029f3faffb65a5))
- **dbx:** add etag check ([24a8266](https://github.com/johannesjo/super-productivity/commit/24a82669604c13287a927daf3f845220537d6119))
- **dbx:** add pre check to avoid additional request ([6a18b07](https://github.com/johannesjo/super-productivity/commit/6a18b07783c3d7bead9531bf4aa97d46c9872cf4))
- **dbx:** add throttle to focus after long inactivity ([a99164f](https://github.com/johannesjo/super-productivity/commit/a99164f199a21197de0e46f51974a91edc0cb4ba))
- **dbx:** allow seconds for sync interval ([1f1c6ab](https://github.com/johannesjo/super-productivity/commit/1f1c6aba2d429c0a65512d11ce2924b5c7f949fe))
- **dbx:** avoid unnecessary download request ([1a6306b](https://github.com/johannesjo/super-productivity/commit/1a6306b73376b7d7bef0b5b70df82a9744750f66))
- **dbx:** beautify loading spinner ([d03b22c](https://github.com/johannesjo/super-productivity/commit/d03b22c46a355a55853cc9b740537c8b34979d03))
- **dbx:** cleanup upload download and use revs ([66ffcd5](https://github.com/johannesjo/super-productivity/commit/66ffcd5671f18f36571604e7641480ab489dfd6f))
- **dbx:** fix spinner for axios ([0290789](https://github.com/johannesjo/super-productivity/commit/0290789c0bced8aa061df0aa4b89d927038822a0))
- **dbx:** improve logging ([c20e33e](https://github.com/johannesjo/super-productivity/commit/c20e33e3ffbd153b3bc7a2dcd6808b772926558d))
- **dbx:** introduce major version model change handling ([6f21b37](https://github.com/johannesjo/super-productivity/commit/6f21b37a44d927a642819b812e5c8d1ae61c4cee))
- **dbx:** make auth code flow work ([03910cc](https://github.com/johannesjo/super-productivity/commit/03910ccdc6b988d96ce5626eaff133228097f9fc))
- **dbx:** make basic login work ([b6cbc4f](https://github.com/johannesjo/super-productivity/commit/b6cbc4fd04e5cee34e216bfd48d64dd552d8133d))
- **dbx:** make basic syncing work ([531d152](https://github.com/johannesjo/super-productivity/commit/531d15236517078de96413b57951689e546bf65d))
- **dbx:** make fetch file work ([9f6a0d5](https://github.com/johannesjo/super-productivity/commit/9f6a0d5c013fd06b5f7ee12ddd1372d8cd8b2d90))
- **dbx:** make form work ([9b507eb](https://github.com/johannesjo/super-productivity/commit/9b507eb116bdd3e01ad63a0e698940a8b23976e4))
- **dbx:** make get meta work ([ba9c12e](https://github.com/johannesjo/super-productivity/commit/ba9c12efeb1c2e24d77dc56f4fbf5c44747df3ca))
- **dbx:** make import data work ([e563201](https://github.com/johannesjo/super-productivity/commit/e563201b85dccd1999d283c59fa2d0a797181277))
- **dbx:** make initial load work ([d4aa5a5](https://github.com/johannesjo/super-productivity/commit/d4aa5a599a4174316cad99f3bcc1af21d73d7577))
- **dbx:** make isReady work ([68efddf](https://github.com/johannesjo/super-productivity/commit/68efddf65e8b023a603623ac0aa973d8a453f01b))
- **dbx:** make most basic read & write work ([5732d39](https://github.com/johannesjo/super-productivity/commit/5732d39212d4c1f2b69f95c00c44b88a0c08bf9e))
- **dbx:** prepare sync ([634ede3](https://github.com/johannesjo/super-productivity/commit/634ede397a24f5ed409d5fce9b6920e1d6adc255))
- **dbx:** prepare upload and simplify ([cfabb57](https://github.com/johannesjo/super-productivity/commit/cfabb578dcc6f996cb80d03cf7623aced807eb91))
- **dbx:** rework all sync triggers ([3db790a](https://github.com/johannesjo/super-productivity/commit/3db790a48120f8c49f6ad0f9f0eac3aa66ec149b))
- **dbx:** use axios and extract meta ([6c952f2](https://github.com/johannesjo/super-productivity/commit/6c952f21014a4ad2da84875505d0b0df7fc13f76))
- **dbx:** use browser flow and manual insert flow ([4a740d6](https://github.com/johannesjo/super-productivity/commit/4a740d605d8ca55c8375841ff8733e1d4a493122))
- improve zoom behaviour ([4be9933](https://github.com/johannesjo/super-productivity/commit/4be993324edd79655da5740848e94540dc7433ef))
- **gdrive:** improve sync handling ([500066d](https://github.com/johannesjo/super-productivity/commit/500066defa791d88426885cd9e7b95a01c1cc8cc))
- **gdrive:** improve sync handling 2 ([b41f66d](https://github.com/johannesjo/super-productivity/commit/b41f66d91c7429001227c6ef32a118aefa39798f))
- **gdrive:** improve sync triggering ([1f4865f](https://github.com/johannesjo/super-productivity/commit/1f4865f9bf27d2f8c4f1905a0001274ed0893f62))
- add check for update util ([4df5fec](https://github.com/johannesjo/super-productivity/commit/4df5fecf352c947539b0b817c78d3e928ce7a32d))
- add global progress bar ([1e05977](https://github.com/johannesjo/super-productivity/commit/1e0597766d0b75a1a313b648066a61f7f88b6092))
- various model adjustments leftover from blockstack branch ([b7d44e7](https://github.com/johannesjo/super-productivity/commit/b7d44e78b7bdba09b68d543f0f05af4caca39575))

## [5.2.1](https://github.com/johannesjo/super-productivity/compare/v5.2.0...v5.2.1) (2020-05-26)

### Bug Fixes

- **electron:** single instance issue ([25608ba](https://github.com/johannesjo/super-productivity/commit/25608bafbc5b2e97d6c9973f3b45ec68c24a71f6))

# [5.2.0](https://github.com/johannesjo/super-productivity/compare/v5.1.4...v5.2.0) (2020-05-26)

### Bug Fixes

- **project:** not saving to db when restoring task ([25785bf](https://github.com/johannesjo/super-productivity/commit/25785bfe484209c9cc9cad80bf4c933a654f536d))
- **simpleCounter:** possible conflict when importing data ([aa84814](https://github.com/johannesjo/super-productivity/commit/aa84814aaed162e7ae37297cbaba335809cacfc5))
- add error handling for when default project id is defined but project is gone ([9f46f96](https://github.com/johannesjo/super-productivity/commit/9f46f96bc557bce5e16752059c0a51e245a80d04))
- global error appending to dialog if there is none ([db53be9](https://github.com/johannesjo/super-productivity/commit/db53be92fec993c4c81acace0ff5d5b5eae82c9e))
- left over localforage import ([c1dab5b](https://github.com/johannesjo/super-productivity/commit/c1dab5b5176f99ec4c158aaf7f9cc3a320d4af73))
- model being loaded twice from database initially ([a377643](https://github.com/johannesjo/super-productivity/commit/a377643cde449101b6c5f802cb4fc6919fbff572))
- saving data not working for new idb wrapper ([cf0930e](https://github.com/johannesjo/super-productivity/commit/cf0930ec82f4e95953e35e70c187e05dae989291))
- **jira:** cfg label ([6fbd64e](https://github.com/johannesjo/super-productivity/commit/6fbd64e3e2ef4e0a844bae4e3fda1bc75dc1da92))
- stacktrace.js leading to out of memory death on many errors [#369](https://github.com/johannesjo/super-productivity/issues/369) ([410112a](https://github.com/johannesjo/super-productivity/commit/410112a041bbd5c3e4cb856bb87d5e248590b634))

### Features

- **tag:** only save on task change if affected ([777ee84](https://github.com/johannesjo/super-productivity/commit/777ee84c2bc409c68bee8edfc072e92eea8f56b8))
- make project state more picky when to trigger save ([282ca8b](https://github.com/johannesjo/super-productivity/commit/282ca8b955a4e816f73be32080ed3422a81ba153))
- remove error snacks for database service ([30b8442](https://github.com/johannesjo/super-productivity/commit/30b84428836b7ae12b944fe1b6a7e1c94c3f79f7))
- **jira:** add error for undefined auto import jql ([365fb46](https://github.com/johannesjo/super-productivity/commit/365fb465be7bfa8c35b2728f890cdf6f63eaa956))
- **jira:** debounce snacks by a bit ([d36717a](https://github.com/johannesjo/super-productivity/commit/d36717a1731b666daa8e94cf8d42cda8d3cc2d47))
- **jira:** improve logging ([172ad27](https://github.com/johannesjo/super-productivity/commit/172ad27d16eff89836c8e547e0d244ad6e30d3c5))
- **reminder:** allowing adding task to today list instead of starting it ([55875ce](https://github.com/johannesjo/super-productivity/commit/55875ce83811f0e62fbff2a06720f67d2ab4cb66))
- **taskRepeat:** add option to add them to the bottom ([2c52d94](https://github.com/johannesjo/super-productivity/commit/2c52d9499ea624e4f86f5ba74e91dfb53f54760a))
- always throttle getStacktrace to a maximum amount [#369](https://github.com/johannesjo/super-productivity/issues/369) ([ba4d8ad](https://github.com/johannesjo/super-productivity/commit/ba4d8adab6549d350a3cd295c92557e17e9369aa))
- improve error logging ([04f4a06](https://github.com/johannesjo/super-productivity/commit/04f4a061d5b961903b0346b15002df3f8ef77851))
- replace localforage with idb [#236](https://github.com/johannesjo/super-productivity/issues/236) [#345](https://github.com/johannesjo/super-productivity/issues/345) [#367](https://github.com/johannesjo/super-productivity/issues/367) [#368](https://github.com/johannesjo/super-productivity/issues/368) ([9759af0](https://github.com/johannesjo/super-productivity/commit/9759af0570452ac0179925cc0e098d342b917d41))
- **jira:** improve initial request handling [#369](https://github.com/johannesjo/super-productivity/issues/369) ([67322b9](https://github.com/johannesjo/super-productivity/commit/67322b9278fa94ee877385570f5fb62f1e6bb343))

## [5.1.4](https://github.com/johannesjo/super-productivity/compare/v5.1.3...v5.1.4) (2020-05-12)

### Bug Fixes

- handle null case for worklog service [#364](https://github.com/johannesjo/super-productivity/issues/364) ([09f1889](https://github.com/johannesjo/super-productivity/commit/09f18890fc556eab8f501f7fa29ed734e7f5ee6b))

## [5.1.3](https://github.com/johannesjo/super-productivity/compare/v5.1.2...v5.1.3) (2020-05-11)

### Bug Fixes

- run all tests again ([70cd2a8](https://github.com/johannesjo/super-productivity/commit/70cd2a8ead1163e56e358e21caf854642acd54e0))
- **project:** fresh install with a couple of tasks asking for migrate ([8445bc0](https://github.com/johannesjo/super-productivity/commit/8445bc0a0e647301848731e22d2d511b0fa83033))
- prevent caching news.json ([511894f](https://github.com/johannesjo/super-productivity/commit/511894fb45b24d7cb153973e6cca95662b49df40))
- worklog loading ([d000282](https://github.com/johannesjo/super-productivity/commit/d000282a8abc7dead6853d4f36e41e1252bc0919))
- wrong locale for material dateAdapter ([ae2aa14](https://github.com/johannesjo/super-productivity/commit/ae2aa14198191005f917d8fbf1ff2bc9d4d5c765))
- **worklog:** sub task order ([a25fb70](https://github.com/johannesjo/super-productivity/commit/a25fb70f127aaebacf106d38d987e6eaa4ec57db))

## [5.1.2](https://github.com/johannesjo/super-productivity/compare/v5.1.1...v5.1.2) (2020-05-09)

### Bug Fixes

- sub task not showing in worklog for tags [#360](https://github.com/johannesjo/super-productivity/issues/360) ([d9d8115](https://github.com/johannesjo/super-productivity/commit/d9d8115d5916e20deba42d0657d9c862257e1de6))

## [5.1.1](https://github.com/johannesjo/super-productivity/compare/v5.1.0...v5.1.1) (2020-05-05)

### Bug Fixes

- **i18n:** snooze btn text ([f713f3d](https://github.com/johannesjo/super-productivity/commit/f713f3d9511d39d6314a7677d379c4e7fad4c2af))

### Features

- **i18n:** add pre translations for simple counter feature ([380e728](https://github.com/johannesjo/super-productivity/commit/380e7280f2b47a6fdfbef722018ee9ed9a6be027))
- **simpleCounter:** use is on for worklog week summary ([146b7f6](https://github.com/johannesjo/super-productivity/commit/146b7f6dd80dc654004c3f49a48ae92257eb4a19))
- **task:** allow deleting repeatable tasks ([bde36bd](https://github.com/johannesjo/super-productivity/commit/bde36bd213e35b20f8d73a39510cc8719268d291))
- **welcomeDialog:** add showStartingWithVersion option ([c15222d](https://github.com/johannesjo/super-productivity/commit/c15222d5249330a6e578cc16370a4011730cdc6d))
- **welcomeDialog:** add showStartingWithVersion option ([dccc6bc](https://github.com/johannesjo/super-productivity/commit/dccc6bcae9fab136b4c47fdaa4fdd123782a1321))
- **welcomeDialog:** add translation ([2824ccc](https://github.com/johannesjo/super-productivity/commit/2824ccc6281f350532e9072b3c76896c52f21ddb))
- **welcomeDialog:** improve dialog ([1ce7fee](https://github.com/johannesjo/super-productivity/commit/1ce7fee219106a3388751d3f7b57243ca8a2e11f))
- **welcomeDialog:** make most basic variant work ([d56e126](https://github.com/johannesjo/super-productivity/commit/d56e1264c35794a88e1311ad5de3595ca80a6b18))

# [5.1.0](https://github.com/johannesjo/super-productivity/compare/v5.0.15...v5.1.0) (2020-05-04)

### Bug Fixes

- locales not working for datetimepicker [#354](https://github.com/johannesjo/super-productivity/issues/354) ([d1cadf7](https://github.com/johannesjo/super-productivity/commit/d1cadf7117550a2687e9fa804d3106e5f561fd13))
- **simpleCounter:** coffee counter name ([f8cd62e](https://github.com/johannesjo/super-productivity/commit/f8cd62eb930e2335766a41bc55a6d4102ce4a72c))
- **simpleCounter:** icon for stopwatch ([f726110](https://github.com/johannesjo/super-productivity/commit/f726110a93e9a5ee96000c9f18b5b3952d977152))
- **simpleCounter:** initial import issue ([ecdea64](https://github.com/johannesjo/super-productivity/commit/ecdea6473a8b18d01dba859279d5fd0490a6de5f))
- **simpleCounter:** lint & failing unit test ([f96be6f](https://github.com/johannesjo/super-productivity/commit/f96be6f20e556a7910a38d7091e0e1c9ca9ce88a))
- **simpleCounter:** make hide expression work for iconOn ([010a13b](https://github.com/johannesjo/super-productivity/commit/010a13bf984dbe3c04a71532a98a7cc474ec273b))
- google drive sync not working as planned due to service worker caching ([67aeccd](https://github.com/johannesjo/super-productivity/commit/67aeccd58f7459ba21a33cc4167005cafe9711e8))
- service worker exclusion problem with workaround ([4f9fd08](https://github.com/johannesjo/super-productivity/commit/4f9fd08005be1df24f2418a14a1fd26bc0e65e62))
- **simpleCounter:** weird update cfg issue ([416c363](https://github.com/johannesjo/super-productivity/commit/416c363419822ed829f9ed958c1eaa779aeb5ae2))

### Features

- **simpleCounter:** add success snack when updating ([8c57b2a](https://github.com/johannesjo/super-productivity/commit/8c57b2a1aad9087f9c6152f8d45b72dd79ec54ff))
- add debug message when a model is updated ([a5d1990](https://github.com/johannesjo/super-productivity/commit/a5d1990f031154b6c6a3730d2ce12d6855c0ad6a))
- **googleDriveSync:** reset last sync val when updating sync file ([31fc93f](https://github.com/johannesjo/super-productivity/commit/31fc93fa698b00dd4ccb79c6c0cfc1ad885a7c99))
- **simpleCounter:** add boilerplate ([64848a3](https://github.com/johannesjo/super-productivity/commit/64848a354b86c0a4ac197dfbad5ee0f2bb839604))
- **simpleCounter:** add boilerplate for custom cfg ([285cc0f](https://github.com/johannesjo/super-productivity/commit/285cc0ff28db7a357f8181f34e051507865ddb25))
- **simpleCounter:** add confirm dialog for deletion ([3d64076](https://github.com/johannesjo/super-productivity/commit/3d64076b4c3b27abbbb94fa712d602f918258998))
- **simpleCounter:** add list animation for cfg ([41b496b](https://github.com/johannesjo/super-productivity/commit/41b496bb98266fc8fda15890adfb6f37359da7f0))
- **simpleCounter:** add new configuration model for simple counter ([6ffb8be](https://github.com/johannesjo/super-productivity/commit/6ffb8be97bc75fa216b6e7a186a0f98ffbc0feb3))
- **simpleCounter:** add store boilerplate & persistence for simple counter ([e9d5ea9](https://github.com/johannesjo/super-productivity/commit/e9d5ea939881f4c7dd66cca983625e1837b4c145))
- **simpleCounter:** add translations for button ([aefa5d8](https://github.com/johannesjo/super-productivity/commit/aefa5d8ac9383a02ab2420335083db2868eb534f))
- **simpleCounter:** add translations for edit dialog ([2e1c6ab](https://github.com/johannesjo/super-productivity/commit/2e1c6ab2bdb7fc73423a17fa15c7a2e713ea3a7c))
- **simpleCounter:** add translations for form ([3e218a0](https://github.com/johannesjo/super-productivity/commit/3e218a0bacd89a65724c21d8653acac4eec1086e))
- **simpleCounter:** avoid potential error ([79c9fde](https://github.com/johannesjo/super-productivity/commit/79c9fdece57f3c221fc9749873a53e3f92c5312c))
- **simpleCounter:** beautify form ([f45ad1d](https://github.com/johannesjo/super-productivity/commit/f45ad1df1ff3b94004e85168a67b940c06f76283))
- **simpleCounter:** completely remove double today count model ([ed1ca84](https://github.com/johannesjo/super-productivity/commit/ed1ca849d1aedec567a5e8719d5a82cf968bee22))
- **simpleCounter:** disable is running for all simple counters initially ([9c82e55](https://github.com/johannesjo/super-productivity/commit/9c82e55cd906455ad1b919855f6d13066df79fe0))
- **simpleCounter:** get basic form going ([87f7181](https://github.com/johannesjo/super-productivity/commit/87f71812033b4c578a76054c1f6804e4bf5f6be2))
- **simpleCounter:** introduce simple click counter ([21c791d](https://github.com/johannesjo/super-productivity/commit/21c791d88be1dbd98e08e83f39c527e698f218c8))
- **simpleCounter:** load saved initially ([51c5777](https://github.com/johannesjo/super-productivity/commit/51c577702a74f1a3d015f2c85cb2c101030abae3))
- **simpleCounter:** make basic increase counter work ([8ed7599](https://github.com/johannesjo/super-productivity/commit/8ed7599fc105ed821d1fdf0ad4761e1f1b9e56cb))
- **simpleCounter:** make displaying real data work ([25bcad3](https://github.com/johannesjo/super-productivity/commit/25bcad326c9e7795e0da66cd67d5eb51338b2101))
- **simpleCounter:** make edit value work ([de4982e](https://github.com/johannesjo/super-productivity/commit/de4982ea51672621b74675251e651be26320dd82))
- **simpleCounter:** make persistence work ([c05ef32](https://github.com/johannesjo/super-productivity/commit/c05ef3257ae106c64d31cb1b119ec9e4c5b72337))
- **simpleCounter:** make simple counter action triggers all work ([ff89da4](https://github.com/johannesjo/super-productivity/commit/ff89da4dc5463488efa3c3d8eb063c615c7d38e1))
- **simpleCounter:** open edit on right click ([184ca4b](https://github.com/johannesjo/super-productivity/commit/184ca4b321812ce7749e7693d8955753c620d61e))
- **simpleCounter:** open edit via longPress ([e0f1771](https://github.com/johannesjo/super-productivity/commit/e0f1771a797a3eec29549ac72c7cd0281b1d482d))
- **simpleCounter:** prepare action effect for simple counters ([dbb7166](https://github.com/johannesjo/super-productivity/commit/dbb7166d7fed1b73e26ee9f39dee50549751a7cb))
- **simpleCounter:** show simple counter on week view ([55f85d3](https://github.com/johannesjo/super-productivity/commit/55f85d3efccd960fcff68c97e593b4870320b3b3))
- cleanup ([a935681](https://github.com/johannesjo/super-productivity/commit/a9356812284b43eb849b402466b8f3f0e9e6212c))
- don't display remove from today button for done tasks ([b470675](https://github.com/johannesjo/super-productivity/commit/b470675ce9f85ebeb1b5afdfbe60e6c51eb90baf))
- don't persist work context to database ([0744ac4](https://github.com/johannesjo/super-productivity/commit/0744ac44046e04e7f1bba6d8c5fd3801951fdca2))
- **simpleCounter:** make most simple form work ([1f2b623](https://github.com/johannesjo/super-productivity/commit/1f2b6231d24dbbacb0e1e25f6805d74deefdde0a))
- **simpleCounter:** make saving work ([f69a26d](https://github.com/johannesjo/super-productivity/commit/f69a26d96d775c28dc83ccf8e0b931fe5f48c5ba))
- **simpleCounter:** make stopwatch work ([1b11fa6](https://github.com/johannesjo/super-productivity/commit/1b11fa63bed7e0ddd70ee41ae9f6c8cf79806303))
- **simpleCounter:** make toggle work through store ([69dc822](https://github.com/johannesjo/super-productivity/commit/69dc8224e34ecd31a7de69c878f627ea8d12f6c5))
- **simpleCounter:** outline model ([0b802ef](https://github.com/johannesjo/super-productivity/commit/0b802ef543e5908d22a101188e8b18fdd60875d6))
- **simpleCounter:** outline ui for button ([91b2967](https://github.com/johannesjo/super-productivity/commit/91b296752892d3644c944fb9115bfe67dfece61b))
- **simpleCounter:** prepare actions and service for increasing counter ([db95d6d](https://github.com/johannesjo/super-productivity/commit/db95d6dd1e1b8feb0bb507b3153b138c594462db))
- **simpleCounter:** remove from global cfg ([0110733](https://github.com/johannesjo/super-productivity/commit/0110733eca9e937aedf1ab3a02f2d320e04d8489))
- **simpleCounter:** test de colored buttons ([30ab548](https://github.com/johannesjo/super-productivity/commit/30ab548d1b75a3664e0277cd2b7a4a0050b1d016))
- add debug logs for import issue ([a6cd852](https://github.com/johannesjo/super-productivity/commit/a6cd85294bbefd7fe1c6c2c6732491dd4f212be2))

## [5.0.15](https://github.com/johannesjo/super-productivity/compare/v5.0.14...v5.0.15) (2020-04-29)

### Bug Fixes

- crashing for empty project data [#349](https://github.com/johannesjo/super-productivity/issues/349) ([72fd7d0](https://github.com/johannesjo/super-productivity/commit/72fd7d0c977ec92062393830087940819332d9aa))

### Features

- add model version everywhere it is currently used ([6b3056d](https://github.com/johannesjo/super-productivity/commit/6b3056db4e4328e5b5594cfa291b054915d9ad57))
- **jira:** provide the option to allow self signed certificates [#348](https://github.com/johannesjo/super-productivity/issues/348) ([abcc057](https://github.com/johannesjo/super-productivity/commit/abcc057de2529e770f2eb26dc068647174dc8722))

## [5.0.14](https://github.com/johannesjo/super-productivity/compare/v5.0.13...v5.0.14) (2020-04-26)

### Bug Fixes

- add missing migrate functions ([745cc56](https://github.com/johannesjo/super-productivity/commit/745cc5662a95833366b1c35414171c017a895a78))
- jira effects crashing when there is no jira cfg at all [#341](https://github.com/johannesjo/super-productivity/issues/341) ([7111ef8](https://github.com/johannesjo/super-productivity/commit/7111ef8a15c773fa0572e2ba400956e18883633e))
- lint ([0c9e791](https://github.com/johannesjo/super-productivity/commit/0c9e79165bbadedf798d3fd879d7399ba099c629))
- load main tag error ([f761183](https://github.com/johannesjo/super-productivity/commit/f761183696ddccd179b1c25884bf7622b999b68b))
- tag init ([f667ce6](https://github.com/johannesjo/super-productivity/commit/f667ce636fec1eef069f143b762c1cc5624266a5))
- task state initialization ([2a277ec](https://github.com/johannesjo/super-productivity/commit/2a277ecef7798b80f58509ccae8582a8c55cd421))
- **project:** drag & drop model not including archived projects ([82b7063](https://github.com/johannesjo/super-productivity/commit/82b7063b6816a83be2ff3900aa6d53fd85d01a25))

### Features

- add entity data consistency check on data save ([75fd7a2](https://github.com/johannesjo/super-productivity/commit/75fd7a2a735bb2dd0bb8e57d4516f8428af8c0dd))
- add error handling for invalid task data in selectors ([ecd82c1](https://github.com/johannesjo/super-productivity/commit/ecd82c1fb2f20de58bae807f59a407c5af2ea0c3))
- always show last active log if not in production ([8e3ab34](https://github.com/johannesjo/super-productivity/commit/8e3ab345d140f6235e80d246934e8a81bca53265))
- don't add time spent while importing data ([d6f735a](https://github.com/johannesjo/super-productivity/commit/d6f735a4618c16fd378c70c7fc94d0c2c227b861))
- don't import when there is no value ([6f033b5](https://github.com/johannesjo/super-productivity/commit/6f033b509054bce21a5e3caaa2e206e5f72bcc5b))
- improve task selector error ([9b45439](https://github.com/johannesjo/super-productivity/commit/9b454396306f7737a2542abdb6708f6192ae998f))
- make token loading work like before ([2ba0340](https://github.com/johannesjo/super-productivity/commit/2ba0340ad7b28ec0d4a60cc4a5ee0e5747fb5780))
- update consistency check ([6b233d1](https://github.com/johannesjo/super-productivity/commit/6b233d1ff37616282a969d99420dbdfdbcb2f94d))
- use single action for data import and data init ([1425a52](https://github.com/johannesjo/super-productivity/commit/1425a520eec2a61512ec85d7564a908ba66ecfdf))
- **tag:** switch to manual tag persistence ([4ae7d8e](https://github.com/johannesjo/super-productivity/commit/4ae7d8eca0de58fb5b674a9133b13b919a847417))

## [5.0.13](https://github.com/johannesjo/super-productivity/compare/v5.0.12...v5.0.13) (2020-04-24)

### Bug Fixes

- remove invalid last active update [#336](https://github.com/johannesjo/super-productivity/issues/336) ([384c25a](https://github.com/johannesjo/super-productivity/commit/384c25af5156e5444f80888322aed00c583426f5))

## [5.0.12](https://github.com/johannesjo/super-productivity/compare/v5.0.11...v5.0.12) (2020-04-24)

### Bug Fixes

- allow import of virgin data [#343](https://github.com/johannesjo/super-productivity/issues/343) ([17e95f5](https://github.com/johannesjo/super-productivity/commit/17e95f5950da1186baa1f10d76d01f215b710a5f))
- jira cfg not loaded yet [#341](https://github.com/johannesjo/super-productivity/issues/341) ([26785b3](https://github.com/johannesjo/super-productivity/commit/26785b328c74713621205a35a031e02c306ef07b))
- persistent storage disallowed message ([b3bbd42](https://github.com/johannesjo/super-productivity/commit/b3bbd4258628e7e566b527e2f1b5b6356c29ce83))
- prevent error dialog from getting to high ([00fc709](https://github.com/johannesjo/super-productivity/commit/00fc709b914fb23c5bf7fae22060986560a169f2))
- **task:** hide sub task panel for sub tasks on mobile ([9169a19](https://github.com/johannesjo/super-productivity/commit/9169a19f436cce2fef57ce24eee1f5363a06d4ed))
- **task:** overflowing icons for swipe blocks ([c2d6d5d](https://github.com/johannesjo/super-productivity/commit/c2d6d5d8aad6a0ace8358d9c1981870e50233d1c))

### Features

- **i18n:** update translations ([046dead](https://github.com/johannesjo/super-productivity/commit/046deada1b99efcf383e0aece03eff0a80c7ff04))
- account for edge case when default project is deleted [#325](https://github.com/johannesjo/super-productivity/issues/325) ([f755350](https://github.com/johannesjo/super-productivity/commit/f755350c7143e5fbfefaf8a5f353fa1f7012aceb))
- add config property for default project id [#325](https://github.com/johannesjo/super-productivity/issues/325) ([dac46f9](https://github.com/johannesjo/super-productivity/commit/dac46f90c88c54c1a28b7e77b1e14e39feef51a9))
- add effect for default project id [#325](https://github.com/johannesjo/super-productivity/issues/325) ([c8f5bbb](https://github.com/johannesjo/super-productivity/commit/c8f5bbbeb22ee175de8faf2a6fd28ede2b07ed68))
- add project select component [#325](https://github.com/johannesjo/super-productivity/issues/325) ([02d4f58](https://github.com/johannesjo/super-productivity/commit/02d4f587e4816276bf0d4412f2180498af2bdc53))
- add translations [#325](https://github.com/johannesjo/super-productivity/issues/325) ([1e139a0](https://github.com/johannesjo/super-productivity/commit/1e139a0b35ce790d2976c03cee6404c1bea13f5a))
- check for service worker update right after load ([6a2bdd2](https://github.com/johannesjo/super-productivity/commit/6a2bdd2e2e53c72b1dbede0e3d716928cbcf28f6))
- cleanup error title from html to prevent dialog from breaking ([de7180a](https://github.com/johannesjo/super-productivity/commit/de7180a15b74d72b9f5e4aff1814ee53f532b3d2))
- improve initial wait handling ([9029979](https://github.com/johannesjo/super-productivity/commit/90299798803b7d9c923524e039766e4adff4c691))
- make add default project id effect work [#325](https://github.com/johannesjo/super-productivity/issues/325) ([3ee46fb](https://github.com/johannesjo/super-productivity/commit/3ee46fbff26f4607b152b14197015e55b3349ff7))
- **android:** also add project or tag to android model ([e058959](https://github.com/johannesjo/super-productivity/commit/e05895944b4b546157cfd896b143798a8e8454a9))
- **android:** make notifications work ([44ca1ed](https://github.com/johannesjo/super-productivity/commit/44ca1ed420119e4228f38afda5fbfc57066d2830))
- **attachment:** add different icon for non images ([7bee38b](https://github.com/johannesjo/super-productivity/commit/7bee38b974ed6ef8ac5af54b696aec3547d37da8))
- improve service worker registration check ([7f2a104](https://github.com/johannesjo/super-productivity/commit/7f2a1041085de8d4cebb6d6abbcbdd49e60e6b45))
- increase wait for sync wait time for reminders ([445b174](https://github.com/johannesjo/super-productivity/commit/445b1742514b9a93ea76c985f7c10a1b250591a7))
- **issue:** disable polling until initial sync is done ([f18f9cf](https://github.com/johannesjo/super-productivity/commit/f18f9cfbc0ccab9db8fff41034ccfca70e79ec13))
- improve service worker notifications check ([3f3c762](https://github.com/johannesjo/super-productivity/commit/3f3c762bbdd47368adb559c4aa0cf63100f113bb))
- sort done tasks last for android widget tasks ([98abd10](https://github.com/johannesjo/super-productivity/commit/98abd1086711c7c2e7fdc178146c056e27a0b0af))

## [5.0.11](https://github.com/johannesjo/super-productivity/compare/v5.0.10...v5.0.11) (2020-04-20)

### Bug Fixes

- keyboard focus behaviour for task side panel not working as expected ([fde2b5b](https://github.com/johannesjo/super-productivity/commit/fde2b5bc7584e7cf8f8870f86e26572f1a8c3d17))
- **issue:** avoid other potential error for issue import to backlog ([ca166b3](https://github.com/johannesjo/super-productivity/commit/ca166b3a0dac34b73005bceb30964d6a220ca861))
- add attachment from context menu throwing error ([aeb01e6](https://github.com/johannesjo/super-productivity/commit/aeb01e6376291e95fcb158870d1e48ac86950d44))
- daily summary overlapping ([c203977](https://github.com/johannesjo/super-productivity/commit/c203977d84c034ad3554f2d9a91657a3c06f7c87))
- error on project delete [#338](https://github.com/johannesjo/super-productivity/issues/338) ([d95ff10](https://github.com/johannesjo/super-productivity/commit/d95ff10ee94270fdecef826033040560a436510c))
- **android:** error outside web view ([ae988f8](https://github.com/johannesjo/super-productivity/commit/ae988f8711fb07dbe2eb05e9adb5eb674bda19cd))
- project delete throwing error when task archive is not yet created [#334](https://github.com/johannesjo/super-productivity/issues/334) ([44763f0](https://github.com/johannesjo/super-productivity/commit/44763f08cd8b8bdd83a6269e18a0813fbc77593d))
- wait for initial sync before creating repeated tasks ([f0f369d](https://github.com/johannesjo/super-productivity/commit/f0f369d5090928347f5e7261927531a48fd19820))

### Features

- **issue:** avoid potential error for issue import to backlog ([57a3539](https://github.com/johannesjo/super-productivity/commit/57a353910deb5e04141e331e9ae43b088b480aa9))
- **task:** focus last created task after closing add task bar ([7c23f91](https://github.com/johannesjo/super-productivity/commit/7c23f917620724d1750d32d36dcbfc2ebeda4254))
- also add version number to error meta ([840c7dd](https://github.com/johannesjo/super-productivity/commit/840c7dd0dd53345bf30af336bfd30f57b1cad9ba))
- wait for all data being loaded before polling new issues to backlog ([cc962f3](https://github.com/johannesjo/super-productivity/commit/cc962f37a51c3a5016017f03a01bcaf0197e4229))
- **android:** add handling for google sign in ([ed807d9](https://github.com/johannesjo/super-productivity/commit/ed807d9cb6f75df359d152763ed2a3ef59774feb))
- **android:** add interface for widget ([7090139](https://github.com/johannesjo/super-productivity/commit/7090139921273f32449438ec70e7f5bb434c5255))
- **android:** add svg in white ([87882a0](https://github.com/johannesjo/super-productivity/commit/87882a07efd35a52e44809fdc21e7c1124c78f46))
- **android:** improve data loading ([ec58ea3](https://github.com/johannesjo/super-productivity/commit/ec58ea349e11319c1018dbc1dc0432bc94ff61c7))
- **github:** remove check for issue itself and check comments only ([1c40402](https://github.com/johannesjo/super-productivity/commit/1c404027d25f45613521e95b6800607f51fd61c4))
- add big add task button for mobile ([01a7aba](https://github.com/johannesjo/super-productivity/commit/01a7abad0c9185b601e5fbd61d6394e1e77be62d))
- handle task archive not being created yet ([cd03d75](https://github.com/johannesjo/super-productivity/commit/cd03d75d41d03fb3681b1100177c623114be9b32))
- improve daily summary tasks ([271952a](https://github.com/johannesjo/super-productivity/commit/271952a1e492ca8b48e2f8256ecf7d457eb8c6fe))
- improve daily summary tasks for good :) ([6333d40](https://github.com/johannesjo/super-productivity/commit/6333d4040492ec3620e3dde73a578b0e1de417da))
- improve mobile styling for daily summary ([a605498](https://github.com/johannesjo/super-productivity/commit/a605498898971e97e75346208951a4d2ec2fd419))
- only clear done tasks on finish day ([85cf90b](https://github.com/johannesjo/super-productivity/commit/85cf90be9705d0b017eb3c8fa81862281f2e7948))
- reduce battery usage ([85dc1ef](https://github.com/johannesjo/super-productivity/commit/85dc1ef04a055cb090bbdf28e5e9febb52916fdc))
- **mobileApp:** make most basic android interface work ([f0d3d4b](https://github.com/johannesjo/super-productivity/commit/f0d3d4bd4f5982755d213221c0acd1496815956a))
- only move repeatable tasks to archive when creating new ones ([32e99ca](https://github.com/johannesjo/super-productivity/commit/32e99ca0bd26e6f9111f1825af00ba533a41ab74))
- only show sub tasks done today for daily summary ([21588d2](https://github.com/johannesjo/super-productivity/commit/21588d20ecf26f2a0a5e0f7059daed273eb2aa40))
- **task:** add attachment button to attachment panel ([4e4069c](https://github.com/johannesjo/super-productivity/commit/4e4069c2d0679759a99f4246ca5f6b4bf3919644))
- **task:** add doneOn model ([5ab04c9](https://github.com/johannesjo/super-productivity/commit/5ab04c97389c66ac839f305bc1fa5faebdf25530))
- **task:** add keyboard shortcut for moving task to other project ([1a5817d](https://github.com/johannesjo/super-productivity/commit/1a5817d6cf6d29ae524506021088b06c5aa52d00))
- **task:** make swiping even more satisfying ([c44ad67](https://github.com/johannesjo/super-productivity/commit/c44ad67ce684bf50543f83aa283c3c0ad725db9c))
- **task:** make swiping more satisfying ([d2d71ff](https://github.com/johannesjo/super-productivity/commit/d2d71ff720c4f61a983d8893f332d81ebe814a65))
- **task:** refocus task after closing context menu and move to project menu ([3fce563](https://github.com/johannesjo/super-productivity/commit/3fce5632153ab01cfe785887a8abd61de84bf271))
- make add task button of a different color ([fa750d7](https://github.com/johannesjo/super-productivity/commit/fa750d76d5dde785586b571c9a50c0e70129fb88))
- make backlog button a bit lighter ([a073dc8](https://github.com/johannesjo/super-productivity/commit/a073dc8ce0d0ab140fce40aaafb9d9d52a45a391))
- **task:** hide redundant context menu entries for mobile ([b02ea3f](https://github.com/johannesjo/super-productivity/commit/b02ea3f910bca155b500b03504d9d1ab7f2d8c19))
- **task:** remove advanced task menu ([23207de](https://github.com/johannesjo/super-productivity/commit/23207de92498b493adecd966de012df94bac41ef))
- **task:** remove mark as done button for mobile ([8c90050](https://github.com/johannesjo/super-productivity/commit/8c90050d710609aa7e58564020bb45fcc8c7eea5))
- **task:** swipe right closes task additional info ([bbb9efe](https://github.com/johannesjo/super-productivity/commit/bbb9efe67346015dd321335c37f3a866a6d9e87f))

## [5.0.10](https://github.com/johannesjo/super-productivity/compare/v5.0.9...v5.0.10) (2020-04-07)

### Bug Fixes

- **task:** moving task to project stopping time tracking ([2d4bf27](https://github.com/johannesjo/super-productivity/commit/2d4bf27c461f3830d27f4a91000e46f4bee538ab))
- google drive import throwing error ([43dc6a8](https://github.com/johannesjo/super-productivity/commit/43dc6a8d4e8975d74915b0989cede25a4cf03512))
- **task:** remove from today display logic ([4a42915](https://github.com/johannesjo/super-productivity/commit/4a42915fe876c3d6a0fc76b7976fed4639d6c8b2))

### Features

- **github:** adjust own update check ([ea47e68](https://github.com/johannesjo/super-productivity/commit/ea47e68ebcfb3b5e970ae66ecf63ae930b36437e))
- **googleDriveSync:** better handle errors for google drive ([b059138](https://github.com/johannesjo/super-productivity/commit/b05913808266e16bfb55ef181fda8ee54982e6fc))
- **googleDriveSync:** better handle offline state ([413ecd8](https://github.com/johannesjo/super-productivity/commit/413ecd862813e7c53abc0ce74ce85106fa2ad7e8))
- **task:** add migration script to fix invalid project ids and tags for sub tasks ([c57621f](https://github.com/johannesjo/super-productivity/commit/c57621f8b632dffae73df3832030b2ef725b01f2))
- **task:** adjust context menu ([2d96239](https://github.com/johannesjo/super-productivity/commit/2d962398ad0a07eba9388072da94add81649b759))
- **task:** always use parent project id for sub tasks ([11eca78](https://github.com/johannesjo/super-productivity/commit/11eca78b73c1479cf99db38ac29c1966a3b4a8d4))
- allow for window to be smaller before "over" states ([0040f52](https://github.com/johannesjo/super-productivity/commit/0040f52d4856994d8ae69ba76fd817f73b027b8d))
- bring back touch slide actions ([6ee77e3](https://github.com/johannesjo/super-productivity/commit/6ee77e3c0de8936266fbe2bb41820795abba99f7))
- display child task tags for development mode ([503b815](https://github.com/johannesjo/super-productivity/commit/503b815ef9e87ea68b2fb73fb8afcacaf4a91c13))
- make top right current indicator work consistently for context ([f17d8fc](https://github.com/johannesjo/super-productivity/commit/f17d8fce6eaf59bfa9c8ec80683c69a81295151c))
- **task:** disallow last tag deletion [#325](https://github.com/johannesjo/super-productivity/issues/325) ([7842f6e](https://github.com/johannesjo/super-productivity/commit/7842f6e064188ac5578d28f6d7a8183a10cb26e3))
- **task:** only show remove from my day button if tasks belongs to a project or other tag [#325](https://github.com/johannesjo/super-productivity/issues/325) ([d5adacf](https://github.com/johannesjo/super-productivity/commit/d5adacfa8b6d3c28b7993b3dba673581f9139ef4))

## [5.0.9](https://github.com/johannesjo/super-productivity/compare/v5.0.8...v5.0.9) (2020-04-05)

### Bug Fixes

- **googleApi:** remove gapi from service worker caching ([4e775ad](https://github.com/johannesjo/super-productivity/commit/4e775adb675bf47f12598296ee27888be5067b8c))
- **reminder:** don't wait for initial sync forever ([ae3527f](https://github.com/johannesjo/super-productivity/commit/ae3527fd1bbe3c4ceadb4afab139da45275abd3f))
- **reminders:** specific error case ([fa98a46](https://github.com/johannesjo/super-productivity/commit/fa98a462e09c76f57ddcae908950eef2212252b7))
- **task:** styling for empty time on very small mobile ([946b1a6](https://github.com/johannesjo/super-productivity/commit/946b1a68b8c46c943cef0dd59ef53d668d519a0b))

### Features

- **googleApi:** improve script loading ([2a58084](https://github.com/johannesjo/super-productivity/commit/2a58084788fd7843d90a9f510f42dcb91662efa6))
- **googleDriveSync:** increase default syncing interval ([0ae2785](https://github.com/johannesjo/super-productivity/commit/0ae2785129d6b000a89208c2f5711277094d523c))
- **i18n:** add missing translations ([cccfd22](https://github.com/johannesjo/super-productivity/commit/cccfd22cf9a3f404d834a7450d8284c993e7a4d5))
- **task:** add expand button to task for mobile only ([98d40c7](https://github.com/johannesjo/super-productivity/commit/98d40c7d2f98780e793b178b2bd67c89c374657d))
- **task:** add most basic mobile side panel ([da2edd2](https://github.com/johannesjo/super-productivity/commit/da2edd23176067b56c8fa3f430a70e5226fd7486))
- **task:** add sub task button for mobile ([e543bad](https://github.com/johannesjo/super-productivity/commit/e543bad24955e2d2857c4ec2ae520e1f89cff1f8))
- **task:** beautify sub task view for mobile ([2237f85](https://github.com/johannesjo/super-productivity/commit/2237f85498c09ad64703b1f204782ec235b15c46))
- **task:** beautify task header for mobile ([354278e](https://github.com/johannesjo/super-productivity/commit/354278eaec05305185ad59b12ba0d6d92e6b21a0))
- **task:** hide empty time spent for mobile as well if not set ([da07c8f](https://github.com/johannesjo/super-productivity/commit/da07c8fad2461acb3bf43fff283eb4cae0fe62a2))
- **task:** improve mobile styling ([2ad6a15](https://github.com/johannesjo/super-productivity/commit/2ad6a1515ab980ea27d33b60e863f7e68d98b445))
- **task:** improve task title for mobile ([025435b](https://github.com/johannesjo/super-productivity/commit/025435b9b5798b2443a952a64fd269503b13abf8))
- improve styling for mobile dialogs ([78c54af](https://github.com/johannesjo/super-productivity/commit/78c54af66e90ca6b26924e2bc0f55299863d98ab))
- use dataGroup rather than assetGroup for issue provider caching ([5adaef3](https://github.com/johannesjo/super-productivity/commit/5adaef3d7284dda2f3a51f36476aa2407ce4639d))

## [5.0.8](https://github.com/johannesjo/super-productivity/compare/v5.0.7...v5.0.8) (2020-04-03)

### Bug Fixes

- **task:** duplicated sub task error ([f59b6e8](https://github.com/johannesjo/super-productivity/commit/f59b6e8bb8ce703498cb2cf57be95593805cea53))
- sticky tasks for tag list and header border too ([96428bd](https://github.com/johannesjo/super-productivity/commit/96428bde8957161becf030126efa4e6fbe0c760e))

### Features

- **github:** warn about rate limit ([174b73b](https://github.com/johannesjo/super-productivity/commit/174b73b3978e84b130bcf7a7c9c1ee77142607f1))
- **issue:** improve handling in task additional info ([063e1ca](https://github.com/johannesjo/super-productivity/commit/063e1ca476fead9bd5c56ccf7d0a59771a9ceb28))
- **task:** allow to keep tracking when changing context [#322](https://github.com/johannesjo/super-productivity/issues/322) ([63f88b3](https://github.com/johannesjo/super-productivity/commit/63f88b36614967dfb504b2a235274a8763ab381b))
- **task:** move updated icon to the right ([1e86cec](https://github.com/johannesjo/super-productivity/commit/1e86cec620af3129931302f4f0f61b9486a013a5))

## [5.0.7](https://github.com/johannesjo/super-productivity/compare/v5.0.6...v5.0.7) (2020-04-02)

### Bug Fixes

- **github:** issue link ([e12a340](https://github.com/johannesjo/super-productivity/commit/e12a340d585a07830df8fd15c6fd21fee614e237))
- add task crashing app [#321](https://github.com/johannesjo/super-productivity/issues/321) ([e89bdce](https://github.com/johannesjo/super-productivity/commit/e89bdce777e5f054041ed2da072f282048a10c30))
- zoom by keyboard crashing app [#314](https://github.com/johannesjo/super-productivity/issues/314) ([d9a5b6f](https://github.com/johannesjo/super-productivity/commit/d9a5b6f1bc83d472d5595e6b9f96cc920e45224c))

### Features

- better indicate task hover actions ([d2fdc6a](https://github.com/johannesjo/super-productivity/commit/d2fdc6a653e0e505b9c774d810400ec5c769fb52))
- **project:** auto add task to today list if today tag is added ([17b7abe](https://github.com/johannesjo/super-productivity/commit/17b7abe14379106c437f7bf933c3f78d95018832))
- **tag:** add animation for adding and removing first tag ([7935b63](https://github.com/johannesjo/super-productivity/commit/7935b63c9a6ed91ea4b6dc6bbb3a81e587b73ffe))
- **task:** remove move to backlog/today for tag contexts ([5233146](https://github.com/johannesjo/super-productivity/commit/523314662116ed65c4d7dcd9daecb065dbc6c54d))

## [5.0.6](https://github.com/johannesjo/super-productivity/compare/v5.0.5...v5.0.6) (2020-04-01)

### Bug Fixes

- cannot read property icon of undefined ([11353f2](https://github.com/johannesjo/super-productivity/commit/11353f20b293235a35f5b7b54cb98f92afd69c70))
- filter error for projects with no issues ([22596a4](https://github.com/johannesjo/super-productivity/commit/22596a42144727790b4597ba70c152896f2ca9a9))

## [5.0.5](https://github.com/johannesjo/super-productivity/compare/v5.0.4...v5.0.5) (2020-03-31)

### Bug Fixes

- **googleDriveSync:** google drive sync not working [#291](https://github.com/johannesjo/super-productivity/issues/291) ([2bdf634](https://github.com/johannesjo/super-productivity/commit/2bdf634ee7032d95b79340cefe1f5bfa7e00bc69))

## [5.0.4](https://github.com/johannesjo/super-productivity/compare/v5.0.3...v5.0.4) (2020-03-30)

### Bug Fixes

- **tag:** background color ([c938023](https://github.com/johannesjo/super-productivity/commit/c938023169c611577e629ad9bccef672244272c6))

### Features

- add different default colors for tags, projects and today tag ([604c9d8](https://github.com/johannesjo/super-productivity/commit/604c9d87f1fa24fef54c456cc0d797550b6a29a9))

## [5.0.3](https://github.com/johannesjo/super-productivity/compare/v5.0.2...v5.0.3) (2020-03-29)

### Bug Fixes

- **worklog:** task tracking affecting worklog ([67df8de](https://github.com/johannesjo/super-productivity/commit/67df8de496d51bf46b57f6047fb7b756b7dbd451))
- wait i forgot something link ([b3b4ea5](https://github.com/johannesjo/super-productivity/commit/b3b4ea5178bcd48442203f20244e51fc66b11391))

### Features

- **tag:** add missing save for tag deletion ([c56406a](https://github.com/johannesjo/super-productivity/commit/c56406a011eb4a0b12a585c7afe4f51f5953b9ee))
- **tag:** add null task check as well ([9a997b5](https://github.com/johannesjo/super-productivity/commit/9a997b562ab5ecf36642ecb116c424a364b0363d))
- **tag:** add option to auto add today tag to worked on tasks ([5587057](https://github.com/johannesjo/super-productivity/commit/558705787d7473d26b11af172b8719dc7a051eca))
- **tag:** add stronger warning for tag deletion ([0750675](https://github.com/johannesjo/super-productivity/commit/0750675f8564dcfcd041ec2efaf141c71ba9fa08))
- **tag:** add ui for tag deletion ([af0db42](https://github.com/johannesjo/super-productivity/commit/af0db42c2de0a1d98151c84d45d9edcbb908927d))
- **tag:** make tag deletion work ([c520f4b](https://github.com/johannesjo/super-productivity/commit/c520f4b80d54e7d6e8abc6176847698746d90eed))
- **tag:** navigate away if current task is deleted ([c28f239](https://github.com/johannesjo/super-productivity/commit/c28f2397ac2b5d13311b6391461d9efd1d166ca6))
- **tag:** remove orphaned parent tasks after tag deletion ([c4fc293](https://github.com/johannesjo/super-productivity/commit/c4fc293329ae4a177e1ba0f3b90e9f1c1c4939d8))
- **task:** use warn color for delete icon ([5f6263a](https://github.com/johannesjo/super-productivity/commit/5f6263a5cff050675c3efb9800c4694baab4196a))
- **taskRepeat:** make removing and adding to project work again ([05fc591](https://github.com/johannesjo/super-productivity/commit/05fc591b96e58bb22112aa0bf471e0fd06042bfa))
- **worklog:** increase loading performance ([5b4dfd5](https://github.com/johannesjo/super-productivity/commit/5b4dfd5a9e639289a09de7ba59ca90c1fb804718))
- **worklog:** make loading slightly faster ([ac10f75](https://github.com/johannesjo/super-productivity/commit/ac10f759887ac0dd0f8d5a3d9f56459a4e8cecec))

## [5.0.2](https://github.com/johannesjo/super-productivity/compare/v5.0.1...v5.0.2) (2020-03-28)

### Bug Fixes

- routing issue ([b75dc19](https://github.com/johannesjo/super-productivity/commit/b75dc191dce0e43b60570fe6c9535c0f0685e355))
- show current task in header ([9b8cdf2](https://github.com/johannesjo/super-productivity/commit/9b8cdf2f2159abb802720f473cbc2b2828ab0967))
- **project:** error with deleting project ([b04c3ce](https://github.com/johannesjo/super-productivity/commit/b04c3ce6d285aa4211ec6648055d9298b202e656))
- **tag:** my day not being handled correctly for task ([0540c8f](https://github.com/johannesjo/super-productivity/commit/0540c8fcba37e6dbe895f7c109c9abf543ad96e0))

### Features

- show current task title always in header ([3945b87](https://github.com/johannesjo/super-productivity/commit/3945b871b35ea5093e3b2f4c6f95f256ae78d039))
- **task:** move handle to the center left of tags and title ([0b148cf](https://github.com/johannesjo/super-productivity/commit/0b148cfdbe989a360ff48a78bef1772e05f8e2cd))
- improve context to context transition ([7f5ed82](https://github.com/johannesjo/super-productivity/commit/7f5ed82cea4baedde6e88dadb5e321c33f33784e))
- improve page to page transition ([1374d1b](https://github.com/johannesjo/super-productivity/commit/1374d1b58b04654cd8bdcfd71d0bbac0f981c765))
- **i18n:** add all missing translations ([8493ba4](https://github.com/johannesjo/super-productivity/commit/8493ba475805ce97de955b9e3dcc11499d998596))
- **migrate:** add \_mergeEntitiesWithIdReplacement as separate fn ([c9fc76a](https://github.com/johannesjo/super-productivity/commit/c9fc76a86626ae5a7344357023fe8dd449a221da))
- **migrate:** add double id replacing for messed up states ([66e9b8d](https://github.com/johannesjo/super-productivity/commit/66e9b8dc90574851524e78d5bd04d20bd0d8b3d0))
- **project:** add delete cleanup confirm to cleanup tasks with wrong project id ([407bf59](https://github.com/johannesjo/super-productivity/commit/407bf59949f7c197a42d29d03fe68aa3a379454c))
- **project:** add missing save action for moveUp/Down auto ([f479f46](https://github.com/johannesjo/super-productivity/commit/f479f46d378802cce3a5b1f948c8d3ddd850af59))
- **project:** add more cleanup stuff ([6e5c199](https://github.com/johannesjo/super-productivity/commit/6e5c199dfe02aacc945938a04816c817615a209c))
- **project:** remove outdated model ([8a24bff](https://github.com/johannesjo/super-productivity/commit/8a24bffee6c7731493da727a0aaddbb873e652d4))
- **tag:** always make takes unique ([a5177e5](https://github.com/johannesjo/super-productivity/commit/a5177e5901b015982e48fe7bc9b1bf4042467453))
- **tag:** improve styling of tags ([06f8481](https://github.com/johannesjo/super-productivity/commit/06f8481ede0d3f613d99471e60f0c1d1e59d3944))
- **tag:** improve styling of tags dark theme ([50d5e6d](https://github.com/johannesjo/super-productivity/commit/50d5e6d68d045f56aa7c7701d29d05fa51b997c6))
- add migration fixup for project id for tasks and archiveTasks ([d67a33d](https://github.com/johannesjo/super-productivity/commit/d67a33dcf8779bae99815ab858ac39c79ac778b1))
- make default route work again ([f42ba52](https://github.com/johannesjo/super-productivity/commit/f42ba52a0b833498ab3991b155cf0de966a192ca))
- **task:** rename my day to today ([fdcdbc4](https://github.com/johannesjo/super-productivity/commit/fdcdbc43c082a8bc20c6c60abe32b4e2e816cc61))
- **task:** update project id on sub task move ([e0ef0f6](https://github.com/johannesjo/super-productivity/commit/e0ef0f60b07453de0fac12ce91e77c93643c344e))
- add more logging for migration ([5c613f8](https://github.com/johannesjo/super-productivity/commit/5c613f87e6ac347bfc77f80e10e0047697f19eca))
- **taskRepeat:** add project id when migrating ([dc81981](https://github.com/johannesjo/super-productivity/commit/dc81981693142462e2a1ff05f49072f2f8cbe69f))
- **taskRepeat:** add projectId to model ([894a0bd](https://github.com/johannesjo/super-productivity/commit/894a0bd78474108ab64dad0748193839845e08a4))
- **taskRepeat:** cleanup on project deletion ([02aa22c](https://github.com/johannesjo/super-productivity/commit/02aa22c4a156b28dab8d13bf92964b93fbce77a2))

## [5.0.1](https://github.com/johannesjo/super-productivity/compare/v5.0.0...v5.0.1) (2020-03-27)

### Bug Fixes

- **sharedTaskList:** redirect not activating work context ([b9522dd](https://github.com/johannesjo/super-productivity/commit/b9522ddc1e36706c91d641107ab3b13e46312a3d))
- **sharedTaskList:** remove invalid keyboard shortcuts ([23322c1](https://github.com/johannesjo/super-productivity/commit/23322c1773e1bb41840e97ae9b58c844aaf967dd))

### Features

- **project:** make delete all archive tasks work for project delete ([4e0aa09](https://github.com/johannesjo/super-productivity/commit/4e0aa095a64331bd732499864576608e10f67fd7))
- **project:** make delete all non archive data work for project delete ([69848be](https://github.com/johannesjo/super-productivity/commit/69848be087a082c69b751d21954f2017d8833bd5))
- **sharedTaskList:** minor stuff ([71a78b7](https://github.com/johannesjo/super-productivity/commit/71a78b7c8c2b1bf6dce0e8b225de6e0245681005))
- prepare project delete cleanup ([e749b91](https://github.com/johannesjo/super-productivity/commit/e749b91d6a8370f6449c19bc57fb04b6eafbf3ba))
- **sharedTaskList:** improve performance ([8b3721e](https://github.com/johannesjo/super-productivity/commit/8b3721ed8a46d9ca2586f9b26d0366820c53c753))
- **sharedTaskList:** make move to project work from tag page ([9c80b7b](https://github.com/johannesjo/super-productivity/commit/9c80b7b9ced14857564e8582babcdef0e210519f))
- **sharedTaskList:** prevent invalid tags and projects from being triggered ([42ea124](https://github.com/johannesjo/super-productivity/commit/42ea124bbc4e753ac9f731aaa20fdaba1074f744))

# [5.0.0](https://github.com/johannesjo/super-productivity/compare/v4.1.1...v5.0.0) (2020-03-26)

### Bug Fixes

- **sharedTaskList:** add dirty fix for starting task after project change ([a7eb58b](https://github.com/johannesjo/super-productivity/commit/a7eb58b27c14168bbcafb691109138868847a169))
- **sharedTaskList:** auto set next task ([08d1df0](https://github.com/johannesjo/super-productivity/commit/08d1df0843379c9b053f746d14d7759d31cd3910))
- **sharedTaskList:** auto set task ([5131882](https://github.com/johannesjo/super-productivity/commit/5131882e00290170f884fc36f8f04bfa5d503196))
- **sharedTaskList:** auto set task from planning mode ([2e46d72](https://github.com/johannesjo/super-productivity/commit/2e46d72bd4880e11cd899f82154c5fd1bd3ae6ca))
- **sharedTaskList:** cannot read property 'breakTime' of undefined ([a6d3466](https://github.com/johannesjo/super-productivity/commit/a6d34660694bd99eebde612341e407f44fed4b79))
- **sharedTaskList:** error for daily summary ([693af7f](https://github.com/johannesjo/super-productivity/commit/693af7f2ee683afe369d65ee8710940248d9acc5))
- **sharedTaskList:** failing build ([34f43db](https://github.com/johannesjo/super-productivity/commit/34f43db0954b39ab1ebb5de2ad7f2efa760554c5))
- **sharedTaskList:** finish day not working ([09a9141](https://github.com/johannesjo/super-productivity/commit/09a9141223544222219bb215858d6b483e8aa9f5))
- **sharedTaskList:** header for empty app ([b74bf10](https://github.com/johannesjo/super-productivity/commit/b74bf10a3bfc7cee0f5b95caaccd0fa088bf9977))
- **sharedTaskList:** header link being wrong sometimes ([b466a24](https://github.com/johannesjo/super-productivity/commit/b466a241e9815985260bb56d3f309f3a65aa4c69))
- **sharedTaskList:** incorrect config loaded on project change ([1bd8706](https://github.com/johannesjo/super-productivity/commit/1bd870689386a202920669e9fe3ffd75d3ba5159))
- **sharedTaskList:** initial data load ([442ab23](https://github.com/johannesjo/super-productivity/commit/442ab23e4d4d0dce47241826139cb32e01793ca6))
- **sharedTaskList:** jira effect error ([116d328](https://github.com/johannesjo/super-productivity/commit/116d32874072fa9d19883b2a330b99954685322c))
- **sharedTaskList:** make adding task work for tags ([96c6639](https://github.com/johannesjo/super-productivity/commit/96c66395646f5583e535dcf6fb835c0ea76f6956))
- **sharedTaskList:** make displaying archive work ([6480ba0](https://github.com/johannesjo/super-productivity/commit/6480ba0853edaea80854e56c005d89ea7c026c36))
- **sharedTaskList:** make move to archive work for projects and tags ([76f585e](https://github.com/johannesjo/super-productivity/commit/76f585ec9c9d6a307c46663315d46efbf8ba0fb7))
- **sharedTaskList:** make saving to archive work ([07ed9b1](https://github.com/johannesjo/super-productivity/commit/07ed9b123e457a8142cc28d3d1f7bdd100390260))
- **sharedTaskList:** minor error for jira ([cccea8d](https://github.com/johannesjo/super-productivity/commit/cccea8d6f41276f80a4422035ec52315c325f1f2))
- **sharedTaskList:** missing play button ([b0add6e](https://github.com/johannesjo/super-productivity/commit/b0add6e47645837f429a7da76ff1914b45682886))
- **sharedTaskList:** model error ([66a594d](https://github.com/johannesjo/super-productivity/commit/66a594d596d61d9e41fc3baeb46b778251bd6cbe))
- **sharedTaskList:** move several models to work context service ([a1e94c1](https://github.com/johannesjo/super-productivity/commit/a1e94c15d23ee769a602ef7e5fe4f4f1d20db939))
- **sharedTaskList:** move several models to work context service 2 ([54a5c2f](https://github.com/johannesjo/super-productivity/commit/54a5c2ffd497f029492094055df047ce156e14cf))
- **sharedTaskList:** move several models to work context service 3 ([0ca5090](https://github.com/johannesjo/super-productivity/commit/0ca509088c5a4079b25bef6b6c1365a7b5275d5f))
- **sharedTaskList:** move several models to work context service 4 ([7e97dd7](https://github.com/johannesjo/super-productivity/commit/7e97dd74ecb35b01fcc1f85ca3c46c5f721dd338))
- **sharedTaskList:** move several models to work context service 5 ([e81a2a9](https://github.com/johannesjo/super-productivity/commit/e81a2a965241332b43f7f177991cde8324e116aa))
- **sharedTaskList:** move several models to work context service 6 ([420b395](https://github.com/johannesjo/super-productivity/commit/420b395417d20d841809af9437d06dcc210c3309))
- **sharedTaskList:** move several models to work context service 7 ([c2eead7](https://github.com/johannesjo/super-productivity/commit/c2eead70d2ed517190f6b541259d9e59af729eab))
- **sharedTaskList:** moving tasks from and to backlog via drag & drop not working ([3a8c2b4](https://github.com/johannesjo/super-productivity/commit/3a8c2b4ddfd24d012cc19db8896313eb678670c2))
- **sharedTaskList:** moving tasks from backlog to done or undone ([3250bab](https://github.com/johannesjo/super-productivity/commit/3250bab25b698a237e49c93b9221513c084bfdaa))
- **sharedTaskList:** no task case ([9312451](https://github.com/johannesjo/super-productivity/commit/93124512a1de3681b14029c6f03ca2ab33ca8d54))
- **sharedTaskList:** prepare splitting up move ([3061e6a](https://github.com/johannesjo/super-productivity/commit/3061e6a6ba9551679dde3e2456e02c40395827c1))
- **sharedTaskList:** project not saving on move to archive ([e24b637](https://github.com/johannesjo/super-productivity/commit/e24b637e07fcd9449e32b326c4bc06a5f0cc083a))
- **sharedTaskList:** remove failing specs ([49d3243](https://github.com/johannesjo/super-productivity/commit/49d3243d80141bdda27382298422bb6983877566))
- **sharedTaskList:** tag updates not being saved ([27cf136](https://github.com/johannesjo/super-productivity/commit/27cf1364d3dd0e3b219ff661c83eefc0215b1e06))
- lint ([f03e406](https://github.com/johannesjo/super-productivity/commit/f03e406c0ed33890513024abe156b6c52c6acf73))
- **sharedTaskList:** project tag not always being displayed ([fad22db](https://github.com/johannesjo/super-productivity/commit/fad22dbf1e86dbae7daa95cb219f661d6cbd899f))
- **sharedTaskList:** reminder related errors ([62267f8](https://github.com/johannesjo/super-productivity/commit/62267f812b9195b4847f800be8b18d2ab831f41b))
- **sharedTaskList:** routing to work view ([f37417f](https://github.com/johannesjo/super-productivity/commit/f37417f4387ccc58f1bea6f6016cb639f3d301b0))
- **sharedTaskList:** task delete for projects ([87ec468](https://github.com/johannesjo/super-productivity/commit/87ec468015dcf3f6d7c46d3bdb915685bca4c1a8))
- **sharedTaskList:** task repeat save ([6c4c76e](https://github.com/johannesjo/super-productivity/commit/6c4c76e9e8ab35d5d05c308a5ed64c019a7a3473))
- **sharedTaskList:** weird ivy error ([af398a8](https://github.com/johannesjo/super-productivity/commit/af398a871847d4b0ff94a70c630a25ff0f0091cb))
- **sharedTaskList:** worklog export dialog ([5d1cc7f](https://github.com/johannesjo/super-productivity/commit/5d1cc7f1d0d122cb96e9067d09e6129f76ad302e))
- **sharedTaskListGit:** is search enabled check ([f740a8a](https://github.com/johannesjo/super-productivity/commit/f740a8a01c8b99f6d8fc6e128a28f063edb0223e))
- **sharedTaskListGit:** issue with auto importing new github issues ([9b8221e](https://github.com/johannesjo/super-productivity/commit/9b8221ee1956c6758f7048689308a6649f895d7a))
- **sharedTaskListGit:** switch context data issue for routing ([330490c](https://github.com/johannesjo/super-productivity/commit/330490c5f33d6bae1e2ec71751adcabc99295246))
- **sharedTaskListGithub:** backlog polling firing after project change ([f58a6f3](https://github.com/johannesjo/super-productivity/commit/f58a6f39a905f3d7112ccd96147410d7d5bc91aa))
- **sharedTaskListGitlab:** issue with identical issue ids ([573ce36](https://github.com/johannesjo/super-productivity/commit/573ce36561b1cc2c8f42dec35c2063843e90424d))
- **sharedTaskListJira:** backlog polling firing after project change ([7d740e3](https://github.com/johannesjo/super-productivity/commit/7d740e3f11e7a22086ec30471f702109fe305e06))
- **sharedTaskListJira:** error for response handler ([8f71650](https://github.com/johannesjo/super-productivity/commit/8f71650d10cc415975557ca395594e6d0080fb36))

### Features

- **sharedTaskList:** activate all saving for migration ([408ae5e](https://github.com/johannesjo/super-productivity/commit/408ae5e5509a0e0861bd922e90ad1600de7317ba))
- **sharedTaskList:** add basic migration service ([3a865eb](https://github.com/johannesjo/super-productivity/commit/3a865eb6901415438eddd1e3adc0f6cca1516574))
- **sharedTaskList:** add basic tag cfg ([0add0c2](https://github.com/johannesjo/super-productivity/commit/0add0c286f184da95f40982a39cbfb1acaefd891))
- **sharedTaskList:** add context menu to my day ([60591cd](https://github.com/johannesjo/super-productivity/commit/60591cd3eb7f01dfbaa55d699f0f624064506cc8))
- **sharedTaskList:** add list migration ([a594524](https://github.com/johannesjo/super-productivity/commit/a59452448e19960cc0176fc6dcef418cebdf976d))
- **sharedTaskList:** add missing tag ids field to task repeat cfg ([05eddf6](https://github.com/johannesjo/super-productivity/commit/05eddf63f667b50e8973b1a2dc0f8befb7e6ae1c))
- **sharedTaskList:** add new routing for daily summary ([ecb54f9](https://github.com/johannesjo/super-productivity/commit/ecb54f947d32ca043fefdeff638940ca11ed5591))
- **sharedTaskList:** add separate tag component ([42d74b9](https://github.com/johannesjo/super-productivity/commit/42d74b979364849b0a7f11cf126da3a8374a329f))
- **sharedTaskList:** add simple ui solution for notes ([d2decca](https://github.com/johannesjo/super-productivity/commit/d2deccaee26757def5348b6978746872a9edd655))
- **sharedTaskList:** add snack for updating tag settings ([8f5b084](https://github.com/johannesjo/super-productivity/commit/8f5b08471630ebe877b9ace9d8ba1e4f1ce9d95b))
- **sharedTaskList:** add unit tests for move in list ([faccd50](https://github.com/johannesjo/super-productivity/commit/faccd50c6080ff9afc5f96e0d2d11f6571831515))
- **sharedTaskList:** adjust routing ([9271a2d](https://github.com/johannesjo/super-productivity/commit/9271a2d09df51cba7cd5d790e84d9e896503c898))
- **sharedTaskList:** allow for tags to be added to task repeat cfg ([1d187bc](https://github.com/johannesjo/super-productivity/commit/1d187bc28853ae3d760516909be84223e32df9bc))
- **sharedTaskList:** allow moving a task to a project when they don't have a one ([44c1b5d](https://github.com/johannesjo/super-productivity/commit/44c1b5dea2bbd6a6658f6e4842d30a3baf8bcf2c))
- **sharedTaskList:** also clean database for migration ([136f590](https://github.com/johannesjo/super-productivity/commit/136f59093ee0dc92845a73b321a3a9d719d13792))
- **sharedTaskList:** also migrate task repeat cfg into single state ([cef32ef](https://github.com/johannesjo/super-productivity/commit/cef32ef387410c29fdc90ee94b9010958a31cf5f))
- **sharedTaskList:** also migrate task repeat cfg into single state ([8fc5a2e](https://github.com/johannesjo/super-productivity/commit/8fc5a2e6db1902ea6269673a3cd1c8d68f0cb44f))
- **sharedTaskList:** always hide improvement banner for tags ([d0b8b2a](https://github.com/johannesjo/super-productivity/commit/d0b8b2a7d4db04bf381724aabbec51738ca2f52a))
- **sharedTaskList:** always show project tag for scheduled page ([36a0d4c](https://github.com/johannesjo/super-productivity/commit/36a0d4c720afac3b9a478bc46c45fc23e9ed9890))
- **sharedTaskList:** auto migration work ([3d52bb4](https://github.com/johannesjo/super-productivity/commit/3d52bb43890c1960bad80c29da348fbe3a99134d))
- **sharedTaskList:** close nack on work context change ([3e5b4b8](https://github.com/johannesjo/super-productivity/commit/3e5b4b8277e3f6c318a43d208ca20ca152880342))
- **sharedTaskList:** close side panel on work context change ([6890271](https://github.com/johannesjo/super-productivity/commit/68902714b1b4418a3671d8d7b18df81290305b2a))
- **sharedTaskList:** disable all non working project stuff for now ([41166e7](https://github.com/johannesjo/super-productivity/commit/41166e765bff4982cf46de02e3b3e04fa90f013c))
- **sharedTaskList:** don't show sidenav always ([f05a21e](https://github.com/johannesjo/super-productivity/commit/f05a21e4611858f0403b81e40fae20181110b2bc))
- **sharedTaskList:** don't update last active when changing context ([f63dfb6](https://github.com/johannesjo/super-productivity/commit/f63dfb627caee2f3f396f7aadf14ad77aceeae7b))
- **sharedTaskList:** fix sanity checks ([db23c4d](https://github.com/johannesjo/super-productivity/commit/db23c4dfa96510b2ee65bfaeffc7d69ede63950b))
- **sharedTaskList:** hide bookmarks for tags ([73613bc](https://github.com/johannesjo/super-productivity/commit/73613bc80ad450b2dcabb88faac1f11f64aa3681))
- **sharedTaskList:** hide metrics for tag ([66ff46f](https://github.com/johannesjo/super-productivity/commit/66ff46f11f71e220b559d81ad8613b15337cae7e))
- **sharedTaskList:** implement migration trigger ([07f1213](https://github.com/johannesjo/super-productivity/commit/07f121323eb028ab0080a25bbe23612855aa6cdb))
- **sharedTaskList:** improve note ([6f6c2c9](https://github.com/johannesjo/super-productivity/commit/6f6c2c9cca5b9c778df47f3dc0aff01cbacb109d))
- **sharedTaskList:** improve tag icon styling inside suggestion list ([73a62f0](https://github.com/johannesjo/super-productivity/commit/73a62f0e50e52c2c26ad8bb396ce32e1d04ad9da))
- **sharedTaskList:** make add reminder work from tag task list ([ac0701f](https://github.com/johannesjo/super-productivity/commit/ac0701f4eb4b4c71927a753eaf4339eba7d428c5))
- **sharedTaskList:** make add task bar work for tags ([70e7f22](https://github.com/johannesjo/super-productivity/commit/70e7f225ddafc7cbbafe066baa8726cd01316b05))
- **sharedTaskList:** make add to break time work for tags ([8505d25](https://github.com/johannesjo/super-productivity/commit/8505d2545126206ce0b306c654d146bc145e0e9e))
- **sharedTaskList:** make check for task with issue work again ([49b87bd](https://github.com/johannesjo/super-productivity/commit/49b87bdb40c3a67f9472aa9084841bb467d6126d))
- **sharedTaskList:** make data init and routing less messy ([93708c9](https://github.com/johannesjo/super-productivity/commit/93708c94018c996e531014daf69dd8fdc2167998))
- **sharedTaskList:** make delete/undo works for task with sub tasks for project ([cb6973d](https://github.com/johannesjo/super-productivity/commit/cb6973d820cf9425e9fefc5fe78ccb700ef92f1e))
- **sharedTaskList:** make dismiss work for task reminder from other context ([3f8f22e](https://github.com/johannesjo/super-productivity/commit/3f8f22ef7109dc0d5049ec58647446f7ce2e7701))
- **sharedTaskList:** make metrics work again ([2d26461](https://github.com/johannesjo/super-productivity/commit/2d26461326b239d7f5b790dc62f61d490f2fada6))
- **sharedTaskList:** make migration work fine ([881afaa](https://github.com/johannesjo/super-productivity/commit/881afaa243e7dacc3a04c3263cd99d0751393fd4))
- **sharedTaskList:** make most basic import from file work ([c49e6bd](https://github.com/johannesjo/super-productivity/commit/c49e6bda47dbdd37ec96e016f11afdd4b894c305))
- **sharedTaskList:** make most basic tag cfg work ([cc228d3](https://github.com/johannesjo/super-productivity/commit/cc228d3e9102df13c82aa9e2ce3b1144cd264883))
- **sharedTaskList:** make moving tasks between projects work again ([943001a](https://github.com/johannesjo/super-productivity/commit/943001a00344f5911daf57949d8054f13d29f93a))
- **sharedTaskList:** make notes and bookmarks work again ([fc56ee7](https://github.com/johannesjo/super-productivity/commit/fc56ee7d4ba21a66ece3bc288a92c743911e75f1))
- **sharedTaskList:** make reminder dialog work from tag list ([94f1838](https://github.com/johannesjo/super-productivity/commit/94f18383553cc5bfd4438e956dc104b1812eef26))
- **sharedTaskList:** make reminders for projects work again ([883eb35](https://github.com/johannesjo/super-productivity/commit/883eb351c2094457204472339f71e64c1d1b73a5))
- **sharedTaskList:** make restore task work for projects ([105f28d](https://github.com/johannesjo/super-productivity/commit/105f28dde3d96043d8bf5a4d425bfe3637adb044))
- **sharedTaskList:** make restore task work for tags ([42b5b19](https://github.com/johannesjo/super-productivity/commit/42b5b195836646af185c4db77d6a600ca522a5cf))
- **sharedTaskList:** make round time spent work ([cc186aa](https://github.com/johannesjo/super-productivity/commit/cc186aaf20b61813f7add1547c5405a8a9c9badd))
- **sharedTaskList:** make showing reminder project work ([86d1474](https://github.com/johannesjo/super-productivity/commit/86d147426eb1bb731ce4e95821e196afaa9acd75))
- **sharedTaskList:** make showing reminders work again ([e2f7ff3](https://github.com/johannesjo/super-productivity/commit/e2f7ff3ca6f4571f62ae47c24352d034548c09aa))
- **sharedTaskList:** make started/end auto updates work for tags ([eb938ff](https://github.com/johannesjo/super-productivity/commit/eb938ff2d787485b940c4a68bb8dc3ae60bd0f69))
- **sharedTaskList:** make tag color work ([5ad6786](https://github.com/johannesjo/super-productivity/commit/5ad6786e02caef3e57fc63ae38cbe318b4903c28))
- **sharedTaskList:** make tag icon editable ([aeee0a5](https://github.com/johannesjo/super-productivity/commit/aeee0a533e6c304686768436f2b1c9965deb5dac))
- **sharedTaskList:** make task attachments work on task model ([235983c](https://github.com/johannesjo/super-productivity/commit/235983c32692506486ff811069b109ec2e548911))
- **sharedTaskList:** make task list on daily summary work for tags ([c5e8afd](https://github.com/johannesjo/super-productivity/commit/c5e8afdde90f5a725069c8d1846e4ff6e36e3864))
- **sharedTaskList:** make task list to project migration work ([736e67e](https://github.com/johannesjo/super-productivity/commit/736e67e7a49565309c175ec0b5fdacd3118aa666))
- **sharedTaskList:** make task repeat a global model ([ff705b4](https://github.com/johannesjo/super-productivity/commit/ff705b4f3b4a2142d3b762d610b89539b0d7174d))
- **sharedTaskList:** make update advanced workContext cfg work ([cc88af0](https://github.com/johannesjo/super-productivity/commit/cc88af0d72cb52a52cbe472af5c32648e9e4e3a5))
- **sharedTaskList:** make update for workStart for tags work ([17e6f6f](https://github.com/johannesjo/super-productivity/commit/17e6f6f6f3717c4077c51fff674f8d833ec20baf))
- **sharedTaskList:** make updating archived tasks work ([c1f20b4](https://github.com/johannesjo/super-productivity/commit/c1f20b4de6d9bbeb8a448ec2cf93ef5b5f54c24d))
- **sharedTaskList:** make work start / end effects for project work ([4dd8273](https://github.com/johannesjo/super-productivity/commit/4dd827388d105b222d3eac01cefcd992bc5ea635))
- **sharedTaskList:** make work start / end work on daily summary for projects ([da36fe8](https://github.com/johannesjo/super-productivity/commit/da36fe804db82c7e52a512c4c757de4c5e31f34f))
- **sharedTaskList:** make worklog settings updating export work again ([1d1a15a](https://github.com/johannesjo/super-productivity/commit/1d1a15ae9f33f04a87d3578c5db724e112041706))
- **sharedTaskList:** make worklogTasks$ an observable ([d880624](https://github.com/johannesjo/super-productivity/commit/d880624ceab4ab110002ee1cbbe7351c96033da9))
- **sharedTaskList:** migrate task archive to a single state ([c09a2f9](https://github.com/johannesjo/super-productivity/commit/c09a2f99ce55ae7ebfb06e334f2ace704eb68cda))
- **sharedTaskList:** migrate task attachments to tasks ([f8d9875](https://github.com/johannesjo/super-productivity/commit/f8d987548beb9a0465d52a77e951e1d3ec30937d))
- **sharedTaskList:** move isContextChanging ([1288d10](https://github.com/johannesjo/super-productivity/commit/1288d10dc90334238abfd8380d8f1298129d162a))
- **sharedTaskList:** move model initialization to new service ([e5be1e5](https://github.com/johannesjo/super-productivity/commit/e5be1e560dfa0fc1f6634f347cdaa4e5317c7cbe))
- **sharedTaskList:** move onProjectRelatedDataLoaded ([3d045fe](https://github.com/johannesjo/super-productivity/commit/3d045fe302c33355e50e58e438ed8d733133bedc))
- **sharedTaskList:** move theme config to shared ([e1ba021](https://github.com/johannesjo/super-productivity/commit/e1ba0217c1aab08de1a7ef154bfcfe6c62762423))
- **sharedTaskList:** move update actions for workEnd/workStart to work context ([870384c](https://github.com/johannesjo/super-productivity/commit/870384cd4b48ee48e981f62f1d8ca5d888b8c1ab))
- **sharedTaskList:** prepare displaying tag for auto suggest list ([fbd9976](https://github.com/johannesjo/super-productivity/commit/fbd9976c6c5576d2ea2a98ca7e994680fba8b6ae))
- **sharedTaskList:** prepare migration test ([54677f4](https://github.com/johannesjo/super-productivity/commit/54677f4d08412ef156c24df7f89a49a1c4fe7ef8))
- **sharedTaskList:** prepare new migration approach ([f85fd62](https://github.com/johannesjo/super-productivity/commit/f85fd62d5d44cd2f933857463c3e4e580a09901f))
- **sharedTaskList:** prepare poll issues to backlog for jira with new approach ([7bbe983](https://github.com/johannesjo/super-productivity/commit/7bbe983259711fea63420761883f488daacad8f0))
- **sharedTaskList:** prepare tag settings page ([a03f859](https://github.com/johannesjo/super-productivity/commit/a03f859a0b4ff3eeaf7dd97b3b58e03d65843c63))
- **sharedTaskList:** prepare task attachment change ([7ae7f7f](https://github.com/johannesjo/super-productivity/commit/7ae7f7f8bb34d14e06a32ebb123c4e0cd9a996ef))
- **sharedTaskList:** prepare updating model version ([4e4c8a7](https://github.com/johannesjo/super-productivity/commit/4e4c8a7756e6342cf43e6ccfaacec23775007fa5))
- **sharedTaskList:** remove forgot to finish day notification banner for now ([c5b0877](https://github.com/johannesjo/super-productivity/commit/c5b087788b70ce8351df74ea3c00336b3859cca1))
- **sharedTaskList:** show tag icon correctly in task suggestion list ([037d44b](https://github.com/johannesjo/super-productivity/commit/037d44b5ad6fb0db7f4cb3c8b567b6b88a64a62e))
- **sharedTaskList:** show tags in add task bar ([482da8e](https://github.com/johannesjo/super-productivity/commit/482da8eb6ebb95ac143b17dc3d02978c6979eb64))
- **sharedTaskList:** show tags in reminder list ([31120ea](https://github.com/johannesjo/super-productivity/commit/31120ea914034fe86ee4121f5b2cfc4a22ed4ff9))
- **sharedTaskList:** simplify worklog ([bc1f4b8](https://github.com/johannesjo/super-productivity/commit/bc1f4b893a0b828be800d5f6e41c49ae3dad7d01))
- **sharedTaskList:** trigger task repeat recreation check on set context rather than set project ([f1590e1](https://github.com/johannesjo/super-productivity/commit/f1590e1773ed1d77818bf1e6110d7d465f500569))
- **sharedTaskList:** update add task mechanism to account for tag multiple tags etc ([bde5a0d](https://github.com/johannesjo/super-productivity/commit/bde5a0d8026d327b13f915722df8ae50d3e9ec09))
- **sharedTaskList:** update model ([0cf5685](https://github.com/johannesjo/super-productivity/commit/0cf5685c50d1fae0963190f037189919407b19f6))
- **sharedTaskList:** update service usage for task attachments ([c61a9c7](https://github.com/johannesjo/super-productivity/commit/c61a9c76e035ec50296a6a09ae2b7ce5394f1138))
- **sharedTaskList:** update several task methods ([b171787](https://github.com/johannesjo/super-productivity/commit/b1717872e08ab85aca7794cbcfb29dd4e8f22b23))
- **sharedTaskList:** update t ([7bc2771](https://github.com/johannesjo/super-productivity/commit/7bc277198972b36957e27d58f3d9de2344aab07a))
- **sharedTaskList:** update title ([f77bb52](https://github.com/johannesjo/super-productivity/commit/f77bb5209a4395ae52979ab47fa09543d31b071b))
- **sharedTaskListGit:** make auto importing new github issues work ([698554d](https://github.com/johannesjo/super-productivity/commit/698554df3bf51c141902b86eb53ad6a29dce35d2))
- **sharedTaskListGit:** make displaying issue content work ([bd5a003](https://github.com/johannesjo/super-productivity/commit/bd5a003e59fd769a54085f278aa5448154a41a4f))
- **sharedTaskListGit:** make issue link work again ([f1355d9](https://github.com/johannesjo/super-productivity/commit/f1355d93be44cebb7b9761761df27ed5c786052c))
- **sharedTaskListGit:** make polling work ([2a6f44e](https://github.com/johannesjo/super-productivity/commit/2a6f44ee1401da039dbc4af8b3bfbdbc0903c229))
- **sharedTaskListGitlab:** add issue points if available ([c65855a](https://github.com/johannesjo/super-productivity/commit/c65855aff3fe09ebfe29bd4077f78496bd3a4568))
- **sharedTaskListGitlab:** adjust initial poll delays ([b59a8b7](https://github.com/johannesjo/super-productivity/commit/b59a8b7ea177f64d0682a03f59ddc09b7401ed40))
- **sharedTaskListGitlab:** conform to new interface ([80a77e4](https://github.com/johannesjo/super-productivity/commit/80a77e4e7011c3a2ed7df8757992e744e2b32465))
- **sharedTaskListGitlab:** make auto import for gitlab work ([a74a05f](https://github.com/johannesjo/super-productivity/commit/a74a05f3009113ed830d15ba85422dd447778489))
- **sharedTaskListGitlab:** make update polling work for gitlab ([191367f](https://github.com/johannesjo/super-productivity/commit/191367f5fb3cdcd65eb2f3f31adcec97773ddaa8))
- **sharedTaskListJira:** make add worklog work again ([6d64afb](https://github.com/johannesjo/super-productivity/commit/6d64afb24d603accf8229566fc62daa79395587c))
- **sharedTaskListJira:** make attachment handling work ([ee79615](https://github.com/johannesjo/super-productivity/commit/ee79615e428466a8d6ca19f938640e9bb24836ce))
- **sharedTaskListJira:** make issue link work from issue content ([bd9e6cb](https://github.com/johannesjo/super-productivity/commit/bd9e6cbcdf3c30ea0e681a8d249e31b07d98986f))
- make project related models saving safer ([489258f](https://github.com/johannesjo/super-productivity/commit/489258f2bbf5559ee0637b768ee20a9bc23e7618))
- **sharedTaskList:** add boilerplate for intelligent lists ([0cbd272](https://github.com/johannesjo/super-productivity/commit/0cbd272bbcd9d5cfd1198afccd81551bfb4cff57))
- **sharedTaskList:** add boilerplate for tag settings page ([52ed5e8](https://github.com/johannesjo/super-productivity/commit/52ed5e896b0175122457591c20639cd87179aec0))
- **sharedTaskList:** add collabsable menus for tags and projects ([62d07ba](https://github.com/johannesjo/super-productivity/commit/62d07bad3631a0799fb2ef2cf136afcd375e3e0e))
- **sharedTaskList:** add context stuff ([d25c388](https://github.com/johannesjo/super-productivity/commit/d25c388dda55451fa657ad2e4e92e941a3382f66))
- **sharedTaskList:** add dedicated update tags action ([d7ca915](https://github.com/johannesjo/super-productivity/commit/d7ca9158076c4a81965ebad84ac4e2b272c53efa))
- **sharedTaskList:** add edit tags button and tags only for parent tasks ([6abc54c](https://github.com/johannesjo/super-productivity/commit/6abc54c8c65a2971a9b424bf5fd13e149a5966a1))
- **sharedTaskList:** add expandable menu for projects ([a1fa885](https://github.com/johannesjo/super-productivity/commit/a1fa8854f7d88c6b7818b2754c241a07b732f9b0))
- **sharedTaskList:** add link back to list ([26bf274](https://github.com/johannesjo/super-productivity/commit/26bf27450307f286c1dfc327c69510c915e5a8de))
- **sharedTaskList:** add missing migrations to task archive state ([6fd2f1c](https://github.com/johannesjo/super-productivity/commit/6fd2f1c7b5d60c86f8f9f6a054e844c0934392d0))
- **sharedTaskList:** add move task to projects ([b6b1a34](https://github.com/johannesjo/super-productivity/commit/b6b1a34afb19116f6ed02a7cbd4fd5c02ae9ccdc))
- **sharedTaskList:** add my day tag ([79f8fea](https://github.com/johannesjo/super-productivity/commit/79f8feae48346c729bf47f6d080e487ac443388d))
- **sharedTaskList:** add state boilerplate for intelligent lists ([48bddf1](https://github.com/johannesjo/super-productivity/commit/48bddf1a8034ff84aa73c0b8ecd7c2b2331a1e75))
- **sharedTaskList:** add tmp fixes ([3f0697e](https://github.com/johannesjo/super-productivity/commit/3f0697e22e96ae885bc9720559e6f81cf8bd3539))
- **sharedTaskList:** add track by for tag list ([a5c82b6](https://github.com/johannesjo/super-productivity/commit/a5c82b6f2c010c78a032546a2cee539435a605b3))
- **sharedTaskList:** adjust boilerplate ([01a31b9](https://github.com/johannesjo/super-productivity/commit/01a31b96ba6ce9f4f1351de020613c35f9b49fd4))
- **sharedTaskList:** adjust boilerplate 2 ([faf24d8](https://github.com/johannesjo/super-productivity/commit/faf24d8943920672645607b13981a66fbe8bdd29))
- **sharedTaskList:** adjust menu behaviour ([062014c](https://github.com/johannesjo/super-productivity/commit/062014c54e67de092bc8f3e967f7430eeab79520))
- **sharedTaskList:** also sync list ids on delete ([27b8b19](https://github.com/johannesjo/super-productivity/commit/27b8b1918b6137dffd4a12d7996fad0adccd6009))
- **sharedTaskList:** clean task from project list on deletion ([02945ca](https://github.com/johannesjo/super-productivity/commit/02945ca42e93ed3d2bfd8306227f5908886e991b))
- **sharedTaskList:** create basic common interface ([957c8a2](https://github.com/johannesjo/super-productivity/commit/957c8a2d0826be69f6b0ef8608c7d0a9cf45a789))
- **sharedTaskList:** fix circular dep ([ab4e064](https://github.com/johannesjo/super-productivity/commit/ab4e064ccc9fc55ab2a6e2b6b87ead224f17c767))
- **sharedTaskList:** fix circular dep ([84d8095](https://github.com/johannesjo/super-productivity/commit/84d8095e23a7b6f6a747753497f200cb5f879f8a))
- **sharedTaskList:** hide current tag from list ([8acb84d](https://github.com/johannesjo/super-productivity/commit/8acb84d00c0228febf6b654451d2e182eeafcc7d))
- **sharedTaskList:** improve last active handling for projects ([feea6bf](https://github.com/johannesjo/super-productivity/commit/feea6bfbf06e2b591b2bf8780ecd1b3e1224ea49))
- **sharedTaskList:** improve movement for tags ([fa42b2d](https://github.com/johannesjo/super-productivity/commit/fa42b2d8db0ea56638b5921625289a4b7d0f3bbc))
- **sharedTaskList:** improve naming and fix effects ([f0f987f](https://github.com/johannesjo/super-productivity/commit/f0f987fe88195d6b7f0ccfc92cdbe97d13f1fbf6))
- **sharedTaskList:** improve performance ([f1f65d1](https://github.com/johannesjo/super-productivity/commit/f1f65d16de62da4479894fa0a34a4919039aeb05))
- **sharedTaskList:** improve saving for projects ([784bada](https://github.com/johannesjo/super-productivity/commit/784badaa96bcedf281287667052a140c3727abbe))
- **sharedTaskList:** improve tag deletion ([0938b78](https://github.com/johannesjo/super-productivity/commit/0938b7862cf4ceee15efdf8d1c1e66781d467116))
- **sharedTaskList:** improve tag styling and reduce component ([7eef4a4](https://github.com/johannesjo/super-productivity/commit/7eef4a492d353120e0ce83378d66fa3259477a61))
- **sharedTaskList:** integrate manage projects into projects ([e8cc3ec](https://github.com/johannesjo/super-productivity/commit/e8cc3ecd39057d6a84b7cc77c53445bf28f8c75c))
- **sharedTaskList:** live update dialog for tags ([cfdf66f](https://github.com/johannesjo/super-productivity/commit/cfdf66f17362cffc94261032b8d11695bad54676))
- **sharedTaskList:** make active tag style work ([5ea9830](https://github.com/johannesjo/super-productivity/commit/5ea983096e29f00609854f51dc986b4ba33025fc))
- **sharedTaskList:** make adding tasks work for projects again ([8dc245a](https://github.com/johannesjo/super-productivity/commit/8dc245a2d65d0c03ebe950e37aa7aa3996fae38c))
- **sharedTaskList:** make auto move between backlog and today work ([f1e41bc](https://github.com/johannesjo/super-productivity/commit/f1e41bce3f96478222218812ac0627d99f75e7e8))
- **sharedTaskList:** make backlog work again ([ab71b18](https://github.com/johannesjo/super-productivity/commit/ab71b183cb6f5a2529fafda395e828645ef81b2f))
- **sharedTaskList:** make local attachments work as global model ([31c1dd6](https://github.com/johannesjo/super-productivity/commit/31c1dd6e894a25634a939d4f0bf3a4f4c6c9622f))
- **sharedTaskList:** make most basic shared task model work ([f49a159](https://github.com/johannesjo/super-productivity/commit/f49a159203e1f692f588d06f5f5b5e80cbb53a55))
- **sharedTaskList:** make most simple list for tags work ([8d7f558](https://github.com/johannesjo/super-productivity/commit/8d7f5580bfccfbc317ee4e2c0c7948383a5e2fe8))
- **sharedTaskList:** make most simple tag edit dialog work ([16bd93f](https://github.com/johannesjo/super-productivity/commit/16bd93f2d6524fc9b5ba7b91c79248a8aea68407))
- **sharedTaskList:** make movement between done & undone work ([9a9c94e](https://github.com/johannesjo/super-productivity/commit/9a9c94efd1c8b4392b1cfa6613a6af13aa7c238f))
- **sharedTaskList:** make movement for sub tasks work again ([60f98ee](https://github.com/johannesjo/super-productivity/commit/60f98ee4d767ea0eca10f0a08bb2938c813554fe))
- **sharedTaskList:** make movement work for projects ([5e1874c](https://github.com/johannesjo/super-productivity/commit/5e1874c447cdb4d9fb3dffc5b70b356e656206b8))
- **sharedTaskList:** make movement work for tags ([08eeb3e](https://github.com/johannesjo/super-productivity/commit/08eeb3eff43a35950ad5c9f701c94a3b5a9f2189))
- **sharedTaskList:** make moving from backlog to today work ([6bd1283](https://github.com/johannesjo/super-productivity/commit/6bd128371aa0c281e83ab4a3d2836f1534e4c6a8))
- **sharedTaskList:** make moving from today to backlog work ([4778f67](https://github.com/johannesjo/super-productivity/commit/4778f67a07ca3636a18e8caedba86cb2b0db4619))
- **sharedTaskList:** make moving from today to backlog work as it should ([ed3b7f3](https://github.com/johannesjo/super-productivity/commit/ed3b7f31ad49e371770b9282ba04bc267cfba62a))
- **sharedTaskList:** make moving inside backlog work ([efb7a19](https://github.com/johannesjo/super-productivity/commit/efb7a1996d605f70b06034b2bbe31fa7f6853ead))
- **sharedTaskList:** make moving sub tasks up and down work ([6f8615b](https://github.com/johannesjo/super-productivity/commit/6f8615b160f7c77d86c87f7a0e024c1d800a6994))
- **sharedTaskList:** make moving tasks for projects backlog up and down work ([48c6eaf](https://github.com/johannesjo/super-productivity/commit/48c6eaf39c5a285a5e3736272f189d5af1e2fad2))
- **sharedTaskList:** make moving tasks for projects today up and down work ([2cefe2b](https://github.com/johannesjo/super-productivity/commit/2cefe2b6e77162555d12b015b34da05b603dbc75))
- **sharedTaskList:** make moving tasks for tags up and down work ([1372095](https://github.com/johannesjo/super-productivity/commit/1372095c899604286ec8586a74c88408142cb508))
- **sharedTaskList:** make my day scrollable ([1ce8da7](https://github.com/johannesjo/super-productivity/commit/1ce8da7eb0a55d1dc68674c2611aa116903062be))
- **sharedTaskList:** make new route alias work ([c7fdc4a](https://github.com/johannesjo/super-productivity/commit/c7fdc4a10a42868c08b0907e3766a0891be93228))
- **sharedTaskList:** make project overview work correctly ([ed02683](https://github.com/johannesjo/super-productivity/commit/ed0268381f52f2dfb8acc7732291a0486e7627eb))
- **sharedTaskList:** make tags a global model ([7e30867](https://github.com/johannesjo/super-productivity/commit/7e30867e8114e9158975d4eaaaab3e09e957abfd))
- **sharedTaskList:** make tags work ([eeb67d9](https://github.com/johannesjo/super-productivity/commit/eeb67d90cc2106a4043b6149e53d5bd090fb09e3))
- **sharedTaskList:** make tags work ([fe71353](https://github.com/johannesjo/super-productivity/commit/fe71353d7eed35e064f2f9aeeba3ab40bc17c161))
- **sharedTaskList:** make task archive a global model ([7a86413](https://github.com/johannesjo/super-productivity/commit/7a86413455056bbf5b76bc0b112925b1b18ab9b5))
- **sharedTaskList:** make task reminder removal on task delete work again ([6869188](https://github.com/johannesjo/super-productivity/commit/6869188d483f9b21d583571dad28a78ebd29a020))
- **sharedTaskList:** make themes work with work context ([1617d09](https://github.com/johannesjo/super-productivity/commit/1617d09e9fbb26d86d856b362ef2426f596ac1b7))
- **sharedTaskList:** make undo work for projects ([8e939c3](https://github.com/johannesjo/super-productivity/commit/8e939c3a5e23a356763f564ab2dd10509d0c985a))
- **sharedTaskList:** make undo work for sub tasks ([c6841ca](https://github.com/johannesjo/super-productivity/commit/c6841ca840a341dccbd57af3850e5d8c8f0c07ed))
- **sharedTaskList:** make undo work for tags ([7bc99ab](https://github.com/johannesjo/super-productivity/commit/7bc99abeb3bf3ed8826f961b958b3b5cd9325245))
- **sharedTaskList:** modernize tags ([c614e8f](https://github.com/johannesjo/super-productivity/commit/c614e8fd5a2701dd8425f81dc75342a5066a9abb))
- **sharedTaskList:** move dismiss banners to work context ([d9f179b](https://github.com/johannesjo/super-productivity/commit/d9f179b76d8ce20ebb9c97b855f9e3d92d5971d0))
- **sharedTaskList:** only show tags when there are some ([6f304bc](https://github.com/johannesjo/super-productivity/commit/6f304bcfb89bc545d935be63b5c6e77bf8a8685e))
- **sharedTaskList:** outline undo task delete state ([6561ee3](https://github.com/johannesjo/super-productivity/commit/6561ee337b04ae89f2c51be0768797eed205ffa7))
- **sharedTaskList:** outline undo task delete state 2 ([bd977f7](https://github.com/johannesjo/super-productivity/commit/bd977f7fbac1e0f82f34f2a154547b14cdaff623))
- **sharedTaskList:** prepare add to my day and remove from my day actions ([37fc817](https://github.com/johannesjo/super-productivity/commit/37fc817b2e911eb08280addb272742a1faa9e796))
- **sharedTaskList:** prepare meta reducer ([78655bf](https://github.com/johannesjo/super-productivity/commit/78655bf6ad9daeb5e6f04280789554e0787aa779))
- **sharedTaskList:** prepare move to today/backlog auto ([4b49775](https://github.com/johannesjo/super-productivity/commit/4b497750dfc625679a33b4aa4afcb2fa79bc3247))
- **sharedTaskList:** prepare reminder migration ([0be0cf0](https://github.com/johannesjo/super-productivity/commit/0be0cf09845e151e144a0f889e9af0f0fb70cb8f))
- **sharedTaskList:** prepare undo for tasks and tags ([eda1301](https://github.com/johannesjo/super-productivity/commit/eda1301afe52f3b3492b60a7612c91c3508a6cb1))
- **sharedTaskList:** reduce height of nav items ([78f99a1](https://github.com/johannesjo/super-productivity/commit/78f99a1778b32ca699dd8ea7d6d881a6a39a8dbd))
- **sharedTaskList:** refactor page names ([1393256](https://github.com/johannesjo/super-productivity/commit/1393256b9aa71523dae9427cdd97dcd36186a33a))
- **sharedTaskList:** refactor page names again ([66c9bc6](https://github.com/johannesjo/super-productivity/commit/66c9bc63af244522b848ecffaa47744d043ba988))
- **sharedTaskList:** refactor theme variables ([5ccb331](https://github.com/johannesjo/super-productivity/commit/5ccb3310e0ada2438a2aeae6412ad6d05275d104))
- **sharedTaskList:** remove all stateBefore stuff ([a42f359](https://github.com/johannesjo/super-productivity/commit/a42f3599655124ce8d911ff28226f2a0d28fec7b))
- **sharedTaskList:** remove meta reducer ([92b8e32](https://github.com/johannesjo/super-productivity/commit/92b8e327346c6ac4e8a4d7613be15540f1275a17))
- **sharedTaskList:** rename tag name to tag title ([2e53359](https://github.com/johannesjo/super-productivity/commit/2e53359329ec7a2d84aca6e43d2e57ba013a238d))
- **sharedTaskList:** rename to work context ([3d43dc5](https://github.com/johannesjo/super-productivity/commit/3d43dc5bd64f640903a8e1e9461d82f639a8e414))
- **sharedTaskList:** save project when saving stuff ([63bd4d4](https://github.com/johannesjo/super-productivity/commit/63bd4d44b34e0360667c87b4bcbf625e96862d22))
- **sharedTaskList:** show project name for my day ([62c6a93](https://github.com/johannesjo/super-productivity/commit/62c6a937bcab8d0d77fe066b1c9f3f697fbff75d))
- **sharedTaskList:** show title based on work context ([80c39ff](https://github.com/johannesjo/super-productivity/commit/80c39ffd63d0adf042366df97a62dd6a2ea8d8a0))
- **sharedTaskList:** sightly improve tag styling ([d5bd3c3](https://github.com/johannesjo/super-productivity/commit/d5bd3c3152d28bbb0ce126017ab6b05e82b56b25))
- **sharedTaskList:** sightly improve tag styling 2 ([aa90e1a](https://github.com/johannesjo/super-productivity/commit/aa90e1add4d16660d50b39c6d2ef2bf1bc56aa59))
- **sharedTaskList:** simplify movement for sub tasks ([3f3eb89](https://github.com/johannesjo/super-productivity/commit/3f3eb896dc0acfb163d5446e3eb87318b10d48aa))
- **sharedTaskList:** simplify update tags ([4b61274](https://github.com/johannesjo/super-productivity/commit/4b612749ecaae2cf861bebd083c1ec193257fd61))
- **sharedTaskList:** sub menu for projects and tasks and active context ([489793d](https://github.com/johannesjo/super-productivity/commit/489793d1fcfa6d57a5c6d1e64aaa8d9a13f4b6ea))
- **sharedTaskList:** switch project and tag for settings too ([babaaee](https://github.com/johannesjo/super-productivity/commit/babaaee851029f7dd5f627df1cc5875e1e18e737))
- **sharedTaskList:** sync task ids to tag model ([7c8c6e2](https://github.com/johannesjo/super-productivity/commit/7c8c6e2585008ea6040f3e3366cb985b8c5155cb))
- **sharedTaskList:** temporary sync project id with activeContextId ([d919cd1](https://github.com/johannesjo/super-productivity/commit/d919cd184993fc26c40297b081ba92f8c392b542))
- **sharedTaskList:** unset current task on work context change ([9902260](https://github.com/johannesjo/super-productivity/commit/9902260b87750f478b9b36baa6c54616ea3e0bbb))
- **sharedTaskList:** update root state ([1ed7053](https://github.com/johannesjo/super-productivity/commit/1ed70538393c610cef3fe211307b730858419765))
- **sharedTaskList:** update task delete meta state ([2c1c9f0](https://github.com/johannesjo/super-productivity/commit/2c1c9f0bc0a6c04e198d50cb20652f595b66936a))
- **sharedTaskList:** wait for all global models to be loaded initially ([3ab0313](https://github.com/johannesjo/super-productivity/commit/3ab0313ad0d569b2fa95649ba9acfc467e685d33))
- **sharedTaskListJira:** make blocking mechanism work again ([c82c8ad](https://github.com/johannesjo/super-productivity/commit/c82c8ad317b9b8854ab9ea24407edf8fb3e834ed))
- **sharedTaskListJira:** make importing issues to backlog work again ([25b19a8](https://github.com/johannesjo/super-productivity/commit/25b19a8116c8b83260e483203ec60032c1fe9739))
- **sharedTaskListJira:** make jira done task transition handling work again ([441e422](https://github.com/johannesjo/super-productivity/commit/441e422894b46e9285ebe0dec2e64162694619b1))
- **sharedTaskListJira:** make jira start task transition handling work again ([cfdae3f](https://github.com/johannesjo/super-productivity/commit/cfdae3f363463a48d5eaf6af917e939760433bb6))
- **sharedTaskListJira:** make polling jira issues for changes work again ([19c60cc](https://github.com/johannesjo/super-productivity/commit/19c60ccb395e8c768ba4e45d9d798e24ed6893cd))
- **sharedTaskListJira:** make reassignment check work again ([1b16ee6](https://github.com/johannesjo/super-productivity/commit/1b16ee6f7c424b3b48d16d4d6c43abf98b98ed48))
- **tags:** Add service for the retrieval of (global) user input ([32afd03](https://github.com/johannesjo/super-productivity/commit/32afd03550b1fac68ddb613598fd0643a00d1d99))
- **tags:** Add support for tag color ([5f1a581](https://github.com/johannesjo/super-productivity/commit/5f1a5812ec72280c07f39f95287953fb2c366ae2))
- **tags:** Add tags feature to tasks ([13f6f7b](https://github.com/johannesjo/super-productivity/commit/13f6f7b8b573b63460b72293512fca265cc0fb7d))
- **tags:** Don't delete tags from subtasks when task is deleted (inheritance should be handled implicitly) ([0870699](https://github.com/johannesjo/super-productivity/commit/0870699810709ee7bf0e2161700324b35f680695))
- **tags:** Fix styling of input fields ([b350667](https://github.com/johannesjo/super-productivity/commit/b3506676385794602deb0e5e8f8cb37f8c154d66))
- **tags:** Implement editing of existing tags ([285f11f](https://github.com/johannesjo/super-productivity/commit/285f11fc73db82a9d3240110e4613856dea15d30))
- **tags:** Implement tag removal/deletion ([3ea85c9](https://github.com/johannesjo/super-productivity/commit/3ea85c9e2e2e371cb75adb22d7ee9f2e7b7c9a8d))
- **tags:** Improve styling of add-tag button ([a959750](https://github.com/johannesjo/super-productivity/commit/a959750fe9b15adf29d51becd1d9b306029be85d))
- **tags:** Improve styling of tags ([d1adc95](https://github.com/johannesjo/super-productivity/commit/d1adc95fc47c70717385a33e79627970623870b0))
- **tags:** Prevent creation of duplicate tags ([abe6379](https://github.com/johannesjo/super-productivity/commit/abe63795ed53e039f806a37e45d574054c0fc80d))
- **tags:** Remove redundant user-input service ([0abaf64](https://github.com/johannesjo/super-productivity/commit/0abaf647e60cec91c23bca66a92546d1abff7396))

## [4.1.1](https://github.com/johannesjo/super-productivity/compare/v4.1.0...v4.1.1) (2020-03-23)

### Bug Fixes

- remove failing tests ([b7fcbd3](https://github.com/johannesjo/super-productivity/commit/b7fcbd31e22d9c2b12935f6c1e6622db371b748f))

# [4.1.0](https://github.com/johannesjo/super-productivity/compare/v4.0.3...v4.1.0) (2020-03-23)

### Bug Fixes

- make gitlab work for new instances ([1adc22c](https://github.com/johannesjo/super-productivity/commit/1adc22c5e1a6704629053f6b5fd0023f37eae719))

### Features

- Add Basic Gitlab Integration ([dedcf26](https://github.com/johannesjo/super-productivity/commit/dedcf268b9ced74ded25a37cdcf53adc00506e63))

## [4.0.3](https://github.com/johannesjo/super-productivity/compare/v4.0.2...v4.0.3) (2020-03-23)

### Bug Fixes

- lint ([293de6a](https://github.com/johannesjo/super-productivity/commit/293de6a44a6a0b0bff0bd01b7634ddb20bab9173))

## [4.0.2](https://github.com/johannesjo/super-productivity/compare/v4.0.1...v4.0.2) (2020-03-22)

### Bug Fixes

- error when changing project [#302](https://github.com/johannesjo/super-productivity/issues/302) ([9b28f0f](https://github.com/johannesjo/super-productivity/commit/9b28f0fa9e40eb7f4a07cc2863a631f04c811e29))

## [4.0.1](https://github.com/johannesjo/super-productivity/compare/v4.0.0...v4.0.1) (2020-03-19)

### Bug Fixes

- app quit from menu not doing anything [#296](https://github.com/johannesjo/super-productivity/issues/296) ([af113d6](https://github.com/johannesjo/super-productivity/commit/af113d664581adcd922939aef110aef46853fe4d))

# [4.0.0](https://github.com/johannesjo/super-productivity/compare/v3.2.4...v4.0.0) (2020-03-05)

### Bug Fixes

- **jira:** get story points also when importing to backlog ([57c2b02](https://github.com/johannesjo/super-productivity/commit/57c2b02f8b44c6df6d5e45211c2d0092c216479a))
- potential error ([7f4d442](https://github.com/johannesjo/super-productivity/commit/7f4d442a7d8b40b58ba82caf2adf10044df8b2fa))
- **github:** update state being wrong sometimes ([986ca4c](https://github.com/johannesjo/super-productivity/commit/986ca4c42d548e64fdccbd3c8d0de16bc49be297))
- **githubNew:** issue link url ([1e39a9a](https://github.com/johannesjo/super-productivity/commit/1e39a9a6edf01de9a7645dfffe6ecb11de41653a))
- **jira:** update state being wrong sometimes ([945af86](https://github.com/johannesjo/super-productivity/commit/945af86f72cb2a7138f7e7af7c7bd57269bbe3c1))
- lint ([95f45fb](https://github.com/johannesjo/super-productivity/commit/95f45fb8200e8e91ead3cad7dc84ded913ca0348))
- sourcemaps? ([30f1c8e](https://github.com/johannesjo/super-productivity/commit/30f1c8ef7a4d82c9de958395b2b100ade294b906))
- task is done styling ([9eb5c09](https://github.com/johannesjo/super-productivity/commit/9eb5c09414b1d23e9f3f35fa7c95bcf41022931c))
- **jiraNew:** adding new issues to the backlog ([fa72437](https://github.com/johannesjo/super-productivity/commit/fa72437af613578b8990c980af0bbef9c61ab6db))
- **jraNew:** description not showing up ([6ef3b92](https://github.com/johannesjo/super-productivity/commit/6ef3b92457b8857bf6cbd3decf531f0a9f476151))
- **jraNew:** requests never completing ([b256ea6](https://github.com/johannesjo/super-productivity/commit/b256ea69d77724f74fa49c02f129f46030f99d07))
- **jraNew:** search ([49f4ee8](https://github.com/johannesjo/super-productivity/commit/49f4ee862d071e0530bcae158c062c98cfa0ac54))
- **jraNew:** weird jira panel behaviour when an error is thrown ([1bc7a0c](https://github.com/johannesjo/super-productivity/commit/1bc7a0cad74ddb191d6d81ab60a5a7c89360261f))

### Features

- **i18n:** update translations ([dcabfd7](https://github.com/johannesjo/super-productivity/commit/dcabfd7e6b90d8e33eeea35bd0ce94e394512936))
- **issue:** cleanup old issue data from database ([07ea08e](https://github.com/johannesjo/super-productivity/commit/07ea08e8b3cda584d3e9c33ec76995c7a044d067))
- **task:** make auto starting tracking next task optional ([64ee9b1](https://github.com/johannesjo/super-productivity/commit/64ee9b13f62c0fa2061bf115908dd32dca0c5d34))
- add extra border to light theme attachments ([65b6874](https://github.com/johannesjo/super-productivity/commit/65b6874bf3046f5b90c9bd85d92ada07ffd09cea))
- protect against unwanted task keyboard shortcut triggering ([5fa7fe6](https://github.com/johannesjo/super-productivity/commit/5fa7fe60f9a063a1edf2637c0b501060ba29f352))
- **git:** just use service worker caching ([5c146d9](https://github.com/johannesjo/super-productivity/commit/5c146d909de232bbdbbb788a5fb85c809f624822))
- **github:** handle rate limit error ([80081af](https://github.com/johannesjo/super-productivity/commit/80081af9787a4cfad4557d9c50be68a4539cbeec))
- **github:** make importing issues work ([cb26f61](https://github.com/johannesjo/super-productivity/commit/cb26f6167ade1adb566d2078e5c1b808958694eb))
- **githubNew:** make all basic stuff work ([147994c](https://github.com/johannesjo/super-productivity/commit/147994c3a0280cb12346ddf8a64f1c883a3476e7))
- **githubNew:** make auto refreshing issues work ([be7cac8](https://github.com/johannesjo/super-productivity/commit/be7cac8921633a91d4d030f2dbcbb92733d94bec))
- **githubNew:** make issue refreshing work ([b546833](https://github.com/johannesjo/super-productivity/commit/b5468336c4597537956aa76b612bec8a4475ae18))
- **githubNew:** use real search loading the complete issues for the repo ([0863232](https://github.com/johannesjo/super-productivity/commit/08632320f2884c0a734cf1075775038a04d39118))
- **jiraNew:** add basic loading spinner ([dbe4eea](https://github.com/johannesjo/super-productivity/commit/dbe4eea9dd1f4850666c5376213e4dc7945c92d5))
- **jiraNew:** add fallback for invalid jira api responses ([eff9d22](https://github.com/johannesjo/super-productivity/commit/eff9d22bd6975335a017645f7887e0dce1d851a2))
- **jiraNew:** add new cool request id and fix several issues ([6f5cd40](https://github.com/johannesjo/super-productivity/commit/6f5cd4050da6eaabf3d429647425a4340b0e8eee))
- **jiraNew:** add story points etc on adding a task ([8d07960](https://github.com/johannesjo/super-productivity/commit/8d079600015ece7bf7bb999ef38a4f8d6705fce7))
- **jiraNew:** add story points on update ([7947193](https://github.com/johannesjo/super-productivity/commit/7947193f53614b55c6816ad20e19a2abb651eecc))
- **jiraNew:** adjust all methods to new request format ([53566e5](https://github.com/johannesjo/super-productivity/commit/53566e5a3e0bb2a1237376365407b3a85e233d2f))
- **jiraNew:** beautify loading spinner ([7ab9e93](https://github.com/johannesjo/super-productivity/commit/7ab9e93bedeb3dcc948426a05527c4aa45219c21))
- **jiraNew:** deactivate service worker for electron again ([c4258f9](https://github.com/johannesjo/super-productivity/commit/c4258f9aed26cff65f535efbd8d398348dcbc60b))
- **jiraNew:** get issue link dynamically ([45e1736](https://github.com/johannesjo/super-productivity/commit/45e17367f35c38dfe6debafe2dc2fe43a14cb215))
- **jiraNew:** improve issue refreshment ([fa323f9](https://github.com/johannesjo/super-productivity/commit/fa323f9fcc0ce85842e3bb8c1cba7c14884f225b))
- **jiraNew:** improve refresh ([9c2ed04](https://github.com/johannesjo/super-productivity/commit/9c2ed049b755b017276a14a62daabf7a9d0677a2))
- **jiraNew:** issue content work again ([8a0af89](https://github.com/johannesjo/super-productivity/commit/8a0af8950614d336872401918566c184c18e27e7))
- **jiraNew:** make attachments work ([1834b1f](https://github.com/johannesjo/super-productivity/commit/1834b1f2aa282e90d28fc4dcda7dc8a4e92fffe0))
- **jiraNew:** make btoa work in browser and refactor ([efca56d](https://github.com/johannesjo/super-productivity/commit/efca56d33c8434d6f7af76aa26e970b5771a8f94))
- **jiraNew:** make done transitioning work ([7416f32](https://github.com/johannesjo/super-productivity/commit/7416f329daaca0619625c2002394d5d9dbd94219))
- **jiraNew:** make error text work ([fe84ba2](https://github.com/johannesjo/super-productivity/commit/fe84ba2fbdbfc34199a02d8f328105c088ed12e6))
- **jiraNew:** make it work with node fetch ([1d4263e](https://github.com/johannesjo/super-productivity/commit/1d4263e26730504c3395e0f5e3c9d52b3207edbc))
- **jiraNew:** make manual refresh work ([f128157](https://github.com/johannesjo/super-productivity/commit/f128157631b6e7999c10bfe0f61da51cb9014215))
- **jiraNew:** make most basic issue content work again ([71ea5e6](https://github.com/johannesjo/super-productivity/commit/71ea5e65f3d398b3f3efe577c044a87e90294aec))
- **jiraNew:** make most basic request ([b8accc7](https://github.com/johannesjo/super-productivity/commit/b8accc74861d02c13738c64bacb3ad86d320e7d5))
- **jiraNew:** make most basic request authentication work ([bbb6f1b](https://github.com/johannesjo/super-productivity/commit/bbb6f1bed40ce266bc5d81352da09f4209fec905))
- **jiraNew:** make transition for starting task work ([8c4e622](https://github.com/johannesjo/super-productivity/commit/8c4e62288cc470c87d19d3f27761b26def1f49e4))
- **jiraNew:** make user assignment work ([12f65e9](https://github.com/johannesjo/super-productivity/commit/12f65e9b06ac81891ebd03063914da57a715d5cf))
- **jiraNew:** make was updated work ([d311363](https://github.com/johannesjo/super-productivity/commit/d3113634813bb42de806a6c22d980882aafbb576))
- **jiraNew:** make worklog dialog work again ([45955ae](https://github.com/johannesjo/super-productivity/commit/45955ae5f84300b12bc18a3305367bd6a025f1c4))
- **jiraNew:** remove userAssigneeName ([3eddf38](https://github.com/johannesjo/super-productivity/commit/3eddf38e99b66e4432110a2859709c037c8861c6))
- **jiraNew:** show attachment indicator for jira attachments ([4ab5003](https://github.com/johannesjo/super-productivity/commit/4ab5003195c9696ada5110134de07c99c2debaaf))
- **jraNew:** add changelog again ([9532acf](https://github.com/johannesjo/super-productivity/commit/9532acf3f021933b4664475d1c83c83955a9a08f))
- **jraNew:** add some offline handling ([ca68b01](https://github.com/johannesjo/super-productivity/commit/ca68b018ea1032baf33dd193e1ec4d15c3d19b30))
- **jraNew:** also use issue key in name ([526c632](https://github.com/johannesjo/super-productivity/commit/526c632e5942f1c2fba4420d37300ebbec57a7ce))
- **jraNew:** improve changelog styling ([2e6f3f2](https://github.com/johannesjo/super-productivity/commit/2e6f3f20e515bc21c8f90d2ab6bd768161940ed3))
- **jraNew:** make cache work with ls ([ede2bb8](https://github.com/johannesjo/super-productivity/commit/ede2bb851ff517f41ea29b9759de0b7f3c440926))
- **jraNew:** make most basic offline cache work ([26c83f9](https://github.com/johannesjo/super-productivity/commit/26c83f9451778433eafe85b1b9c5e5f7140aa0af))
- **jraNew:** only fire request after extension is ready if applicable ([740274d](https://github.com/johannesjo/super-productivity/commit/740274d0f4dbddd8cddcbdec31bcc352fdf1f02b))
- **jraNew:** remove description focus ([c98effc](https://github.com/johannesjo/super-productivity/commit/c98effc8d5fc8f4c095f86ea454f0e7afc07b0dd))
- **jraNew:** replace spinner with progress bar ([07d8498](https://github.com/johannesjo/super-productivity/commit/07d84981ae451c10088d8236da5aac1ac79ed95c))
- **jraNew:** share isOnline$ ([7277a35](https://github.com/johannesjo/super-productivity/commit/7277a3582a4463fd90d7054460cbd3a2b0db469a))
- **task:** improve drag handle styling ([2d9dd4c](https://github.com/johannesjo/super-productivity/commit/2d9dd4c02ec6bdedaca9c2d4e64fd296ab273d16))
- **task:** update migration scripts ([3b06f5b](https://github.com/johannesjo/super-productivity/commit/3b06f5b21ca8a1054bf0cb28096b08a3035e86d5))
- always activate service worker and add caching for all external urls ([62e8911](https://github.com/johannesjo/super-productivity/commit/62e8911d78cac880fb2c14d2c2764acd2df8af7c))

## [3.2.4](https://github.com/johannesjo/super-productivity/compare/v3.2.3...v3.2.4) (2020-02-17)

### Bug Fixes

- add tmp fix for broken material checkbox ([470a1bd](https://github.com/johannesjo/super-productivity/commit/470a1bd9ad057e87b5180fd6b043faf41c3f10e2))
- background color after angular material css update ([66ac679](https://github.com/johannesjo/super-productivity/commit/66ac679057593547ed07eff5a8129f86272275c5))

## [3.2.3](https://github.com/johannesjo/super-productivity/compare/v3.2.2...v3.2.3) (2020-02-15)

## [3.2.2](https://github.com/johannesjo/super-productivity/compare/v3.2.1...v3.2.2) (2020-02-15)

### Bug Fixes

- work around node version issue by using custom docker file ([488e17f](https://github.com/johannesjo/super-productivity/commit/488e17f33b48275aafdbdad65d1c763f294106cc))

### Features

- change error modal title ([3beb97e](https://github.com/johannesjo/super-productivity/commit/3beb97ef142d17a85405e4370f418bd3045f38b3))

## [3.2.1](https://github.com/johannesjo/super-productivity/compare/v3.2.0...v3.2.1) (2020-02-13)

### Bug Fixes

- project task overwrite bug [#290](https://github.com/johannesjo/super-productivity/issues/290) ([5d8ded6](https://github.com/johannesjo/super-productivity/commit/5d8ded6054b28482b414123ce6f057afbeb8a5cb))
- task view not being scrollable [#289](https://github.com/johannesjo/super-productivity/issues/289) ([92120c1](https://github.com/johannesjo/super-productivity/commit/92120c108348bd2cc697b6a1fbfaf09649dcc475))

### Features

- **i18n:** make farsi work ([299e6e1](https://github.com/johannesjo/super-productivity/commit/299e6e1aca2c29e5f53a408a8f8fae40a70e014a))
- improve button styling for long text ([7bed5f9](https://github.com/johannesjo/super-productivity/commit/7bed5f9d5a7ec9505e9251ebc12a045f42a2e9d2))

# [3.2.0](https://github.com/johannesjo/super-productivity/compare/v3.1.5...v3.2.0) (2020-02-07)

### Bug Fixes

- app breaking migration bugs ([8ece7ba](https://github.com/johannesjo/super-productivity/commit/8ece7bac9b406574495e6dcaf501fc3091b3ad14))
- tmp fix for style not being applied ([efe76d5](https://github.com/johannesjo/super-productivity/commit/efe76d59494f018f648fc7d587d3119e84d0aaf3))

## [3.1.5](https://github.com/johannesjo/super-productivity/compare/v3.1.4...v3.1.5) (2020-01-31)

### Bug Fixes

- missing border ([5b993fa](https://github.com/johannesjo/super-productivity/commit/5b993fa4b5d7e571617f9ea7e981c19d12f3b383))
- **pomodoro:** dialog close btn behaviour [#283](https://github.com/johannesjo/super-productivity/issues/283) ([f498b9a](https://github.com/johannesjo/super-productivity/commit/f498b9ab48400de6fe3699be1b8a92a0306cf36c))

### Features

- improve selected task styling ([9107214](https://github.com/johannesjo/super-productivity/commit/9107214c8d31b694206b38ee08ebb3d99690aa5f))
- **i18n:** update translation ([d3b5069](https://github.com/johannesjo/super-productivity/commit/d3b50698bfab88738dbf5adbd527e0bca623d925))
- **i18n:** update translations ([11f7ae1](https://github.com/johannesjo/super-productivity/commit/11f7ae138c0a744c4c01f611f74abbe6e7b32f68))
- **pomodoro:** improve header icon [#283](https://github.com/johannesjo/super-productivity/issues/283) ([bccdc21](https://github.com/johannesjo/super-productivity/commit/bccdc21c28b9803add09384fbd5249a431b38db1))
- **theme:** add label for disable background gradient [#267](https://github.com/johannesjo/super-productivity/issues/267) ([2b6ed77](https://github.com/johannesjo/super-productivity/commit/2b6ed77ffaf42a0543c89eec1b58cb503c568b16))
- **theme:** allow disabling background gradient [#267](https://github.com/johannesjo/super-productivity/issues/267) ([e41b662](https://github.com/johannesjo/super-productivity/commit/e41b662b9df3dfd3648a406b2b28cb33edf8ec67))
- add link to private policy ([56baf91](https://github.com/johannesjo/super-productivity/commit/56baf9171ed1e1639240b33e524c9359683bfab6))
- move evaluation settings to productivity helper settings ([a39de4f](https://github.com/johannesjo/super-productivity/commit/a39de4f95043a37259411c1aeb10f9a16a3e166f))
- move productivity helper settings to their own section ([0c22301](https://github.com/johannesjo/super-productivity/commit/0c2230164917e72d406194042fcb1c1d082102ad))

## [3.1.4](https://github.com/johannesjo/super-productivity/compare/v3.1.3...v3.1.4) (2020-01-20)

## [3.1.3](https://github.com/johannesjo/super-productivity/compare/v3.1.2...v3.1.3) (2020-01-16)

### Bug Fixes

- calculate total timeSpent on day for a task in migration ([821e531](https://github.com/johannesjo/super-productivity/commit/821e531e1022cd01d33410591c24d9ee3eb66d81))
- fix date migration error ([b19c9aa](https://github.com/johannesjo/super-productivity/commit/b19c9aae41c0459b3e7599e67337cc2a2e1265cf))

### Features

- Add access token for github to access private repos ([0460cd0](https://github.com/johannesjo/super-productivity/commit/0460cd002f748a2a85f4389ca425a3d75dd7c9cf))

## [3.1.2](https://github.com/johannesjo/super-productivity/compare/v3.1.1...v3.1.2) (2020-01-10)

### Bug Fixes

- add migration script to convert to western arabic numbers for model [#276](https://github.com/johannesjo/super-productivity/issues/276) ([ac620a5](https://github.com/johannesjo/super-productivity/commit/ac620a576558f3f3115ad1977b8de5c464520e28))
- add migration script to convert to western arabic numbers for project model [#276](https://github.com/johannesjo/super-productivity/issues/276) ([74ca6f4](https://github.com/johannesjo/super-productivity/commit/74ca6f43c46540cdef7db6c0b7e60474a5d74c28))
- catch if getstrace fails for some reason ([47bdebf](https://github.com/johannesjo/super-productivity/commit/47bdebf8e5596dee4b3b2ca9049f629947019475))
- only rethrow unhandled errors ([01a3a51](https://github.com/johannesjo/super-productivity/commit/01a3a514a3a2dde016769c02d5ba1f96e01dc661))
- stacktrace silently breaking stuff ([67e0411](https://github.com/johannesjo/super-productivity/commit/67e041149619b059a81170ebfdd85217e575d197))
- use western arabic numbers for model [#276](https://github.com/johannesjo/super-productivity/issues/276) ([a036470](https://github.com/johannesjo/super-productivity/commit/a03647081132516e8d0d6a24dda9212f95afc66d))

## [3.1.1](https://github.com/johannesjo/super-productivity/compare/v3.1.0...v3.1.1) (2020-01-08)

### Bug Fixes

- cannot read property 'send' of undefined [#273](https://github.com/johannesjo/super-productivity/issues/273) ([d1b9efc](https://github.com/johannesjo/super-productivity/commit/d1b9efc7c22ea19911148dd33e9e86fd5fe36257))

# [3.1.0](https://github.com/johannesjo/super-productivity/compare/v3.0.7...v3.1.0) (2020-01-08)

### Bug Fixes

- build code order issues after reformatting ([1df6651](https://github.com/johannesjo/super-productivity/commit/1df66512f29e12c902e5404a8e06c947b5b821da))
- fix title field label in create project not being translated ([cdf1c02](https://github.com/johannesjo/super-productivity/commit/cdf1c0208b36901b9fba7e01830bc499b5cbc218))
- text mistakes [#271](https://github.com/johannesjo/super-productivity/issues/271) ([2a3cd10](https://github.com/johannesjo/super-productivity/commit/2a3cd10f0dd22c26882159f92e3481663e275698))
- text mistakes [#271](https://github.com/johannesjo/super-productivity/issues/271) ([d1083fe](https://github.com/johannesjo/super-productivity/commit/d1083fe3eb10341363550e4379bc556bb6952993))
- text mistakes [#271](https://github.com/johannesjo/super-productivity/issues/271) ([c56d9cb](https://github.com/johannesjo/super-productivity/commit/c56d9cb86b95a5ed0563461ed827ed91ee6ca216))
- up/down not working inside textarea ([d790be9](https://github.com/johannesjo/super-productivity/commit/d790be9d335092210b393243420017a238b28da8))

### Features

- add rtl support ([9e5771c](https://github.com/johannesjo/super-productivity/commit/9e5771c1db36a3eeb0fe7094acf3eb366a7f1eda))
- allow language service to support rtl ([008a6b2](https://github.com/johannesjo/super-productivity/commit/008a6b20f2e13056143844143f685eb1d89d13ca))
- fix add note dialog rtl design ([604e130](https://github.com/johannesjo/super-productivity/commit/604e130fc31ab0b1def342b6617e02c40250f0fa))
- fix add note remainder rtl style ([b0f9749](https://github.com/johannesjo/super-productivity/commit/b0f97498ca672a3cce74b3ae8457b8c6b9fd502e))
- fix add task reminder dialog rtl ([ca525e7](https://github.com/johannesjo/super-productivity/commit/ca525e7fa306f4fb65646bae00c81755219987b9))
- fix bookmark dialog rtl design ([85b1f7a](https://github.com/johannesjo/super-productivity/commit/85b1f7a1da662ae69edf321da0eff2f5964bb5f1))
- fix config page rtl style ([b740adc](https://github.com/johannesjo/super-productivity/commit/b740adc026bb0f2e97614d6829e745778b83f8c7))
- fix create project rtl design ([72a4aec](https://github.com/johannesjo/super-productivity/commit/72a4aec4bd81381a0addef3d5260c9d82bc382fb))
- fix edit attachment rtl ([4cd2667](https://github.com/johannesjo/super-productivity/commit/4cd26675e6c8f5992444b884e3e5d6e581bc58cf))
- fix help section button for rtl design ([7f8c4ad](https://github.com/johannesjo/super-productivity/commit/7f8c4ad51fa4238f65155f056834a4dea3fb66d8))
- fix metric basic stats table rtl style ([8c8dbc4](https://github.com/johannesjo/super-productivity/commit/8c8dbc438443bc0841bd50bd899a1bc8557fd581))
- fix note rtl design ([fb5e159](https://github.com/johannesjo/super-productivity/commit/fb5e15965e1eb703a0f78f029b00a62ce086350e))
- fix rdit tast repeat rtl style ([a1e1368](https://github.com/johannesjo/super-productivity/commit/a1e136865d5d1c6741fe1491c7c6350c00216615))
- fix rtl design for config form ([dddab66](https://github.com/johannesjo/super-productivity/commit/dddab6689150b7c6e069dd6c946069374138d46f))
- fix rtl for dialog full screen ([00720ba](https://github.com/johannesjo/super-productivity/commit/00720baee682a3b40ca96c8fcb15214fb4cef14c))
- fix task summary tabl rtl design ([ada888b](https://github.com/johannesjo/super-productivity/commit/ada888ba03dbb3ea84d5fc1f1d9847783bce62b0))
- fix time estimate dialog rtl design ([5131217](https://github.com/johannesjo/super-productivity/commit/513121722f382f1efa083a2e588ea4ca1a1577da))
- fix work log rtl design ([e6c3a13](https://github.com/johannesjo/super-productivity/commit/e6c3a134056c8db9d6896c01cf17367afe9526a8))
- fixed task rtl design ([cf6c7e2](https://github.com/johannesjo/super-productivity/commit/cf6c7e2cd3d5616da9833c1eed41034f5327f2a9))
- improve focus behaviour for notes in sidebar ([31aa8cf](https://github.com/johannesjo/super-productivity/commit/31aa8cff91c926df7d5467202cee5de74ef372e9))
- initial fix for add task bar rtl style ([ec54fcf](https://github.com/johannesjo/super-productivity/commit/ec54fcf6c6360ef7bf0a35997d63cfbcafff8add))
- refactoring banner rtl style for better solution ([b2ef2dc](https://github.com/johannesjo/super-productivity/commit/b2ef2dc2629deae8c01347838f00caced55eb277))
- refactoring main header rtl style ([c3193a5](https://github.com/johannesjo/super-productivity/commit/c3193a5d871b2617aeaad3a1213bf3eb97bcd6b9))

## [3.0.7](https://github.com/johannesjo/super-productivity/compare/v3.0.6...v3.0.7) (2019-12-29)

## [3.0.6](https://github.com/johannesjo/super-productivity/compare/v3.0.5...v3.0.6) (2019-12-29)

### Bug Fixes

- resize observer throwing error when not available [#269](https://github.com/johannesjo/super-productivity/issues/269) ([633fe5f](https://github.com/johannesjo/super-productivity/commit/633fe5f48fdb202d98de7fc48e4155df199555c0))

### Features

- improve attachments ([d44c654](https://github.com/johannesjo/super-productivity/commit/d44c654ef3a59e7be98eb852214b260b8ab6cf74))
- improve enlarge image styling and general unify backdrop styling ([1768406](https://github.com/johannesjo/super-productivity/commit/17684066e20decf40857d10326f731411f99433a))

## [3.0.5](https://github.com/johannesjo/super-productivity/compare/v3.0.4...v3.0.5) (2019-12-18)

### Bug Fixes

- pages not being scrollable ([b8cbe28](https://github.com/johannesjo/super-productivity/commit/b8cbe2820cca4a1ca2d45ca724a0979bc86c846e))

## [3.0.4](https://github.com/johannesjo/super-productivity/compare/v3.0.3...v3.0.4) (2019-12-17)

### Bug Fixes

- pomodoro play controls not being visible [#264](https://github.com/johannesjo/super-productivity/issues/264) ([e8fe8ef](https://github.com/johannesjo/super-productivity/commit/e8fe8efbdd4b96f18b3fe27a61bda5efeaf067fc))
- **electron:** main nav bar being added for non mac builds ([45753a8](https://github.com/johannesjo/super-productivity/commit/45753a83319b05331d95baa86c50c5c7ac7c1f90))

### Features

- improve backlog styling ([3da2431](https://github.com/johannesjo/super-productivity/commit/3da243124ba55369c97e93ea93a022f09130a928))
- **attachments:** improve attachment buttons styling ([66c7140](https://github.com/johannesjo/super-productivity/commit/66c7140c7b32d1220a1a632eae279fff996c14b3))
- **attachments:** remove no attachments msg as it is not needed any more ([f19d453](https://github.com/johannesjo/super-productivity/commit/f19d453fdb7cac805a9dde98b28afc5316cf7d0d))
- **attachments:** restyle attachment buttons ([6eb0f32](https://github.com/johannesjo/super-productivity/commit/6eb0f32f1b174fe5cb671386dfe2814d02370f51))
- improve container border style ([e9767d2](https://github.com/johannesjo/super-productivity/commit/e9767d270f437b770068b250927c144331c1933c))

## [3.0.3](https://github.com/johannesjo/super-productivity/compare/v3.0.2...v3.0.3) (2019-12-15)

## [3.0.2](https://github.com/johannesjo/super-productivity/compare/v3.0.1...v3.0.2) (2019-12-15)

### Bug Fixes

- excess scrollbars ([4060f55](https://github.com/johannesjo/super-productivity/commit/4060f55f2a55ac5c051bb6698c879ccaf9729971))
- scrollbar styles for edge and firefox ([46fd1cf](https://github.com/johannesjo/super-productivity/commit/46fd1cfea28d0efb9ccccd238c9eda6a332a7b57))

### Features

- **attachments:** beautify edit btn styling ([58c9e83](https://github.com/johannesjo/super-productivity/commit/58c9e83fa8c18ac9ade7f55274d52cfa24a0c4e9))
- **attachments:** beautify styling ([1b9dd09](https://github.com/johannesjo/super-productivity/commit/1b9dd0994553fc4bb6e018804c6b5f3b42fcab3a))
- **attachments:** improve headings ([54f2ed6](https://github.com/johannesjo/super-productivity/commit/54f2ed6aff81b409397c366e2ab2e53b4c7a68db))
- **tasks:** improve selected task focus behaviour ([2003b6e](https://github.com/johannesjo/super-productivity/commit/2003b6ec6919d16960da9b21245febbbf8deb71c))
- **tasks:** improve selected task styling ([cc90df0](https://github.com/johannesjo/super-productivity/commit/cc90df0174425479e6546611a53641bd63aea9f3))
- **taskSideBar:** improve task notes styling ([2d7b470](https://github.com/johannesjo/super-productivity/commit/2d7b4703ab3acc8d365bbad8dafb446453185d30))
- make backlog look a little better ([bcbb666](https://github.com/johannesjo/super-productivity/commit/bcbb666a38bbe701b5fb9c68e63113165abf9829))
- sort issue comments by creation date ([ae92092](https://github.com/johannesjo/super-productivity/commit/ae9209207a96f2efb0aade6ee3a1f6411d107e29))

## [3.0.1](https://github.com/johannesjo/super-productivity/compare/v3.0.0...v3.0.1) (2019-12-13)

### Bug Fixes

- **taskSidebar:** project change animation ([9b1eca1](https://github.com/johannesjo/super-productivity/commit/9b1eca1af35a04d4a5a075cf7bc48ae6d9d20c62))
- settings collapsable header for electron ([e71f774](https://github.com/johannesjo/super-productivity/commit/e71f774cd27b0b401ea3eb68d0ac5b2d01b355ae))
- **taskSidebar:** add import for daily summary ([a5b2162](https://github.com/johannesjo/super-productivity/commit/a5b2162d2f6f79bd76f64733fe2a02dd7be2bf55))
- **taskSidebar:** daily planner plan view ([eba8e0a](https://github.com/johannesjo/super-productivity/commit/eba8e0a387ec8fd792af98b07a2fab48060fd397))
- **taskSidebar:** remove failing spec ([7057680](https://github.com/johannesjo/super-productivity/commit/7057680b067882ea536fcb526021cbe5383ca13d))

### Features

- **tasks:** add a quick way to open original issue in browser ([33f7d04](https://github.com/johannesjo/super-productivity/commit/33f7d042ec715ec4aae2e403a020645010a52383))
- **taskSidebar:** add close ani for over ([c6e3f55](https://github.com/johannesjo/super-productivity/commit/c6e3f55db99c649dd1be2eb67ce0b7260565b5f8))
- **taskSidebar:** move small container class handling to better drawer container component ([5d930ea](https://github.com/johannesjo/super-productivity/commit/5d930eac0588b016add366b3b3a7f1daf75eb9be))
- **taskSidebar:** move task additional stuff to new wrapper component ([04689c3](https://github.com/johannesjo/super-productivity/commit/04689c326ddf8050b304958fb380ce15c19964f5))
- **taskSidebar:** unset task when navigating to daily summary ([712b055](https://github.com/johannesjo/super-productivity/commit/712b055dfd5b316595cf8ebc1b55eadd085dd587))
- rearrange entries for daily summary ([74ff91f](https://github.com/johannesjo/super-productivity/commit/74ff91f7b1146745cc2c92f88d26220491041aa0))

# [3.0.0](https://github.com/johannesjo/super-productivity/compare/v2.13.15...v3.0.0) (2019-12-12)

### Bug Fixes

- **taskSidebar:** container resize handling not working always ([0b3b3d0](https://github.com/johannesjo/super-productivity/commit/0b3b3d056a40057eee56660dc5ce2ca1e39939ea))
- **taskSidebar:** current shadow being wrong ([8461a91](https://github.com/johannesjo/super-productivity/commit/8461a910620db25b1d6dce817e8c3ef778eb435a))
- **taskSidebar:** error on project change ([614d4cc](https://github.com/johannesjo/super-productivity/commit/614d4cc508de65b233c85154b24857bc6d9a7db6))
- **taskSidebar:** focus behaviour ([4a72b75](https://github.com/johannesjo/super-productivity/commit/4a72b752e51d7f59b59ba58a31851ae66234ca57))
- **taskSidebar:** focus color for selected task ([dd44fe5](https://github.com/johannesjo/super-productivity/commit/dd44fe545912dc445e0d953ab3c175d4a7faefe0))
- **taskSidebar:** is current styling for selected task ([9cfab8c](https://github.com/johannesjo/super-productivity/commit/9cfab8c5ba70c1e99854043c1822f11a3075d47b))
- **taskSidebar:** jumping task type icon ([cb9a974](https://github.com/johannesjo/super-productivity/commit/cb9a974e1223a1bfb89139ca96d1188119278ab9))
- **taskSidebar:** only enlarge font size of selected parent not children ([4ef3ced](https://github.com/johannesjo/super-productivity/commit/4ef3cedeba9c3b9355a640e5959fccdd4c647cc7))
- **taskSidebar:** overlap of panel ([b1445d4](https://github.com/johannesjo/super-productivity/commit/b1445d4f320cb6b57d6832d3b15e06c557c3aed2))
- **taskSidebar:** remove failing spec ([3b19d92](https://github.com/johannesjo/super-productivity/commit/3b19d92b68829003956553271eba4dcb63c311fc))
- **taskSidebar:** reorder ([55532bf](https://github.com/johannesjo/super-productivity/commit/55532bff158ab3d849b76a357e48fb58aee62cff))
- **taskSidebar:** selected task children hover controls background color ([efe1c90](https://github.com/johannesjo/super-productivity/commit/efe1c90b781fd5375c1cce4c844a0759c3ff2df4))
- **taskSidebar:** task notes not being editable ([d2c677c](https://github.com/johannesjo/super-productivity/commit/d2c677c4a24daac9bb2e30ed3569ada4a123c372))
- **taskSidebar:** task selected hover controls color ([2b3fc77](https://github.com/johannesjo/super-productivity/commit/2b3fc77417beeb91ceba32724e9172ee161ecb13))
- array not being copied properly ([5001caf](https://github.com/johannesjo/super-productivity/commit/5001caf47c884fd020af3695558048fb014a8a0e))
- deleting repeat cfg crashing app when there is no task archive yet ([a7850b4](https://github.com/johannesjo/super-productivity/commit/a7850b400e0f2990e4eec7bcfd4ad5ee1e738d05))
- error handling for electron errors [#262](https://github.com/johannesjo/super-productivity/issues/262) ([a12b04c](https://github.com/johannesjo/super-productivity/commit/a12b04cbe882085661a30235eb64395d80f40f3f))
- side panel bg being wrong ([f0d3c8e](https://github.com/johannesjo/super-productivity/commit/f0d3c8e834f4825b421ccfba9efc91a568d6fc23))
- snack not throwing a proper error if message is undefined [#262](https://github.com/johannesjo/super-productivity/issues/262) ([acf4d4b](https://github.com/johannesjo/super-productivity/commit/acf4d4b18899d2a6645c42a001711dac5eed1017))

### Features

- **taskSidebar:** add add attachment buttons when there are none yet ([99daefb](https://github.com/johannesjo/super-productivity/commit/99daefb3484430b798c0e98105260229656d4773))
- **taskSidebar:** add additional elements ([3b15ff5](https://github.com/johannesjo/super-productivity/commit/3b15ff5be45e10c1d891643e8e9caac91fb3c381))
- **taskSidebar:** add close button ([6216069](https://github.com/johannesjo/super-productivity/commit/62160696782fef82a4ce7e4c19802b45938037df))
- **taskSidebar:** add close icon if panel is open ([a843c50](https://github.com/johannesjo/super-productivity/commit/a843c50a0b3457c8cf04bec9c1e2d590eaf68b8d))
- **taskSidebar:** add custom drawer component ([bd28bf1](https://github.com/johannesjo/super-productivity/commit/bd28bf15c244950a101329beba3bfbf644c5a8d9))
- **taskSidebar:** add english translations ([eec1949](https://github.com/johannesjo/super-productivity/commit/eec1949206c4136f6961ddc89669d5ed6c7e3f58))
- **taskSidebar:** add input for estimate time ([27600ef](https://github.com/johannesjo/super-productivity/commit/27600efff9fd3d09d58b02643f8b186e84723b9f))
- **taskSidebar:** add input for reminder ([8857fa3](https://github.com/johannesjo/super-productivity/commit/8857fa3bb7d388fbc22b6bdda4ab480a17b3d575))
- **taskSidebar:** add input for task repeat cfg ([6d2012e](https://github.com/johannesjo/super-productivity/commit/6d2012ec55442af52f6fc9db2143ecbadc299344))
- **taskSidebar:** add issue icon to parent task link ([7452222](https://github.com/johannesjo/super-productivity/commit/74522224cea68877da5cc304b55be06637d7056d))
- **taskSidebar:** add keyboard controls ([78a8b93](https://github.com/johannesjo/super-productivity/commit/78a8b931d3146b4db864254cb76e0a3637bb1eb9))
- **taskSidebar:** add keyboard controls to additional items ([08b7f47](https://github.com/johannesjo/super-productivity/commit/08b7f4769c4bd13d115accde4ba59922734b7833))
- **taskSidebar:** add link to issue ([d89763b](https://github.com/johannesjo/super-productivity/commit/d89763b93d5d47fdc21a21e9613c69186a0441a2))
- **taskSidebar:** add link to parent task ([9d7a66a](https://github.com/johannesjo/super-productivity/commit/9d7a66a3b173190ea1d29ce67537ee331a49b18a))
- **taskSidebar:** add missing translations ([097cb7f](https://github.com/johannesjo/super-productivity/commit/097cb7fef24d2395f77d8f5c1b183fdb846ad193))
- **taskSidebar:** add other translations ([345d489](https://github.com/johannesjo/super-productivity/commit/345d4895b2a908c4e6903f651513e637dd78afed))
- **taskSidebar:** add position sticky to current task ([9cec07d](https://github.com/johannesjo/super-productivity/commit/9cec07d52c655fc037add6bfca14d7029e4cd999))
- **taskSidebar:** add scroll to buttons for notes and sidenav ([ec4048f](https://github.com/johannesjo/super-productivity/commit/ec4048fd62166bcfe1286c2741c075cedaa07567))
- **taskSidebar:** add scroll top for notes ([122f006](https://github.com/johannesjo/super-productivity/commit/122f0066bb9221af92d74f53c090c1c045d024bb))
- **taskSidebar:** add smart resizing ([9378393](https://github.com/johannesjo/super-productivity/commit/9378393b091b491739c25ed52e0610d67f5bc068))
- **taskSidebar:** add task title edit ([b00d368](https://github.com/johannesjo/super-productivity/commit/b00d36886a4e7c1e530691ea456dcb33afd47821))
- **taskSidebar:** add transition between selected tasks ([fe4c942](https://github.com/johannesjo/super-productivity/commit/fe4c942c0da64313b8d6b9a0c776040ffdef9d10))
- **taskSidebar:** add up down navigation ([4a3fcb7](https://github.com/johannesjo/super-productivity/commit/4a3fcb74afb36a3a02653a232eef0c2c95e9998b))
- **taskSidebar:** adjust display logic ([bcd1ff8](https://github.com/johannesjo/super-productivity/commit/bcd1ff8bd6cf9b8c9c2635f65b270054eb97da93))
- **taskSidebar:** adjust improvement banner styling ([1f9262a](https://github.com/johannesjo/super-productivity/commit/1f9262a2be1dd2669983c83a99af03c4174c7e27))
- **taskSidebar:** adjust show panel logic ([5ebba63](https://github.com/johannesjo/super-productivity/commit/5ebba6369fccf21e4718c06e9d85e8267b60616f))
- **taskSidebar:** adjust styling of selected task ([42575f3](https://github.com/johannesjo/super-productivity/commit/42575f3c211e20fad04fddead08aae491c3a274a))
- **taskSidebar:** also allow for selecting sub tasks ([8790844](https://github.com/johannesjo/super-productivity/commit/879084498f4a5fbcb794295444ddf03f4908be47))
- **taskSidebar:** also elevate current task for dark theme ([c883680](https://github.com/johannesjo/super-productivity/commit/c88368013071a6a11e82dbed267597f6fa9ec16e))
- **taskSidebar:** always break issue description to the next line ([2ccee4f](https://github.com/johannesjo/super-productivity/commit/2ccee4f34be62b673d0ce956a18c3f68cd3eb699))
- **taskSidebar:** auto select current task when oepened ([d54103d](https://github.com/johannesjo/super-productivity/commit/d54103d26b1cd3fa0a133c28a4cf8f9dae2105bd))
- **taskSidebar:** change responsive style for task time ([c583b86](https://github.com/johannesjo/super-productivity/commit/c583b869b0db5aecdda7c21492623043d9e450db))
- **taskSidebar:** collapse time earlier ([00a79cf](https://github.com/johannesjo/super-productivity/commit/00a79cfab34d3f39d26ecec85274c5c492b05f06))
- **taskSidebar:** edit via right arrow ([37b3e5a](https://github.com/johannesjo/super-productivity/commit/37b3e5a916d188f391a14ae3393de24f635aeeb0))
- **taskSidebar:** estimate time to menu ([6885242](https://github.com/johannesjo/super-productivity/commit/6885242782bc6b81bcbccf813087bcd7ea9bd9dd))
- **taskSidebar:** focus selected task on panel close ([dfd54b6](https://github.com/johannesjo/super-productivity/commit/dfd54b649350a76539290cfb2accf562934bd3e8))
- **taskSidebar:** further improve status icon styling ([77b4193](https://github.com/johannesjo/super-productivity/commit/77b41939b6a26b92a443157368c9287bd57bda78))
- **taskSidebar:** highlight selected task ([8ceecad](https://github.com/johannesjo/super-productivity/commit/8ceecad9d44b2b7be0c91f9ed8efa1dfe0d11985))
- **taskSidebar:** improve ([afbe02c](https://github.com/johannesjo/super-productivity/commit/afbe02c482a6b56808316430243ab84b1dbcc711))
- **taskSidebar:** improve animation ([a4405bd](https://github.com/johannesjo/super-productivity/commit/a4405bda3bf180e8717b714946e0a7d9a42d4c84))
- **taskSidebar:** improve drawer styles ([b321f7d](https://github.com/johannesjo/super-productivity/commit/b321f7df269908cdaa154a5f17b6699759d349a1))
- **taskSidebar:** improve focus styles ([45ea57f](https://github.com/johannesjo/super-productivity/commit/45ea57ff5e6861aaabe62a990b9c1b0b262428ff))
- **taskSidebar:** improve highlighting ([e2199ac](https://github.com/johannesjo/super-productivity/commit/e2199ac49f5a3a032e7aecf68193b555663c3058))
- **taskSidebar:** improve issue table styling ([7b951c4](https://github.com/johannesjo/super-productivity/commit/7b951c4c81326e8ad4def902d2839c9da3c696e8))
- **taskSidebar:** improve issue table styling ([95b01ad](https://github.com/johannesjo/super-productivity/commit/95b01ad4a68a45d1b9bdf57655548dc77c54f925))
- **taskSidebar:** improve keyboard controls ([9f22771](https://github.com/johannesjo/super-productivity/commit/9f22771cacbc8d0fc5edc2f763cd34fda942a250))
- **taskSidebar:** improve panel out animation ([c36f6e0](https://github.com/johannesjo/super-productivity/commit/c36f6e07dc8d69bbbe39dd44c05d5941f62ebfeb))
- **taskSidebar:** improve selected task styling ([cf1e536](https://github.com/johannesjo/super-productivity/commit/cf1e536928a67b6408a23871411aea1a9a7e649b))
- **taskSidebar:** improve selected task styling ([fd89d54](https://github.com/johannesjo/super-productivity/commit/fd89d54b71d7a7467a840ccae997ebb67dece13f))
- **taskSidebar:** improve sizes of side bar and main container ([8f193f8](https://github.com/johannesjo/super-productivity/commit/8f193f8a297da7edea11d0b21e59193f1d8ffa56))
- **taskSidebar:** improve status icon styling ([388fc97](https://github.com/johannesjo/super-productivity/commit/388fc97b4ac77dd0e991e66b002047a620fbdd8d))
- **taskSidebar:** improve styling ([66ada14](https://github.com/johannesjo/super-productivity/commit/66ada1482309555a4f1dd98a1fc086bc7211abdc))
- **taskSidebar:** improve styling ([8a718d3](https://github.com/johannesjo/super-productivity/commit/8a718d311810e06f67f30f2f9d1dd72c538de249))
- **taskSidebar:** improve styling ([7f15669](https://github.com/johannesjo/super-productivity/commit/7f15669f6eaf88e027bfc9937332b82aa1774206))
- **taskSidebar:** improve styling ([e52e8dc](https://github.com/johannesjo/super-productivity/commit/e52e8dc3c170226023ad15cf01da2f8a535d1b04))
- **taskSidebar:** improve styling ([ece45e5](https://github.com/johannesjo/super-productivity/commit/ece45e5d175467450c9883ea52b72d3f9c7c656a))
- **taskSidebar:** improve styling ([af5cb1a](https://github.com/johannesjo/super-productivity/commit/af5cb1a593bc948b211635d34c9717ebc24698a8))
- **taskSidebar:** improve styling for dark theme ([799d41f](https://github.com/johannesjo/super-productivity/commit/799d41f254fa872ce3f6f19ad3adb780dc14dea5))
- **taskSidebar:** improve task title styling ([ee805f3](https://github.com/johannesjo/super-productivity/commit/ee805f34337ae1beb274683a95052151a2b47fce))
- **taskSidebar:** make background expand over whole body ([08909c5](https://github.com/johannesjo/super-productivity/commit/08909c5620877925da073c0f359bec2c8c0cd38e))
- **taskSidebar:** make bigger ([947c513](https://github.com/johannesjo/super-productivity/commit/947c513e0a22988c1b73f11aa90e589fc9cb4614))
- **taskSidebar:** make panel notes styling work ([9fcc6d8](https://github.com/johannesjo/super-productivity/commit/9fcc6d8934aea340e3b70ddbbe4e890c1fe5460b))
- **taskSidebar:** make selected task title bold ([8378f15](https://github.com/johannesjo/super-productivity/commit/8378f15aaf0783f7593f400271ebef9c3d97e134))
- **taskSidebar:** make sub tasks collapsable ([ec9335f](https://github.com/johannesjo/super-productivity/commit/ec9335f95b09922b5c20bb1422611f8268ba330d))
- **taskSidebar:** move close button always to the very right ([df13cbe](https://github.com/johannesjo/super-productivity/commit/df13cbe067dec67bcf4f0cb26b73cbdfbe159b9b))
- **taskSidebar:** move current task above focused ([f0a07a9](https://github.com/johannesjo/super-productivity/commit/f0a07a933ad0a880ec47368a7bedac1d32a53508))
- **taskSidebar:** move jira/git icon out of the way ([6ac6924](https://github.com/johannesjo/super-productivity/commit/6ac6924115b0efec3ea1f2fa23f5773f0c811ae0))
- **taskSidebar:** move notes to the menu ([a002a87](https://github.com/johannesjo/super-productivity/commit/a002a871af5c9e6e8702625b8ff7f6ad17bfee62))
- **taskSidebar:** move progress bar ([10bdcac](https://github.com/johannesjo/super-productivity/commit/10bdcaca03fa2a4d8be005d8bce8620b4239dc41))
- **taskSidebar:** move sidebar inside work view ([653ba05](https://github.com/johannesjo/super-productivity/commit/653ba05988b602518c94f54122b9a1eef93d391c))
- **taskSidebar:** move special sizing stuff to work-view ([28aa395](https://github.com/johannesjo/super-productivity/commit/28aa395f36aec373254a4101863a6b6187590b87))
- **taskSidebar:** move time out of the way for very small container ([3513161](https://github.com/johannesjo/super-productivity/commit/35131617229905801e7b3b7e45ff7374151f9f8b))
- **taskSidebar:** only allow parent task selecting again ([2dee5cf](https://github.com/johannesjo/super-productivity/commit/2dee5cfb6aaa546e02c1baf2f914ec7a7e9676f5))
- **taskSidebar:** only enlarge container of selected parent not children ([01c712c](https://github.com/johannesjo/super-productivity/commit/01c712ce5bc78f0c25e972647ce7961bd076ab87))
- **taskSidebar:** open and close via button ([56a4837](https://github.com/johannesjo/super-productivity/commit/56a48370fa8dd9e52974008fc6956b08b09a3814))
- **taskSidebar:** outline component ([9a2ee0d](https://github.com/johannesjo/super-productivity/commit/9a2ee0dfa6e01e33fab8fb2320e779de79ac4004))
- **taskSidebar:** prepare migration script for later ([459292b](https://github.com/johannesjo/super-productivity/commit/459292b705ae3ba7d897f393b6e86e39b3669a89))
- **taskSidebar:** remove header and add toggle click ([2b7c5e0](https://github.com/johannesjo/super-productivity/commit/2b7c5e0841080d5eb38ceb414c9a61b6d4150559))
- **taskSidebar:** remove more button in favor of right click ([d4af0e0](https://github.com/johannesjo/super-productivity/commit/d4af0e03106e4069c893850ca68ee23bb0e91ed7))
- **taskSidebar:** reorder content ([717cbae](https://github.com/johannesjo/super-productivity/commit/717cbae9bf08aca23fcb1bbc4c1aecce7fbf5101))
- **taskSidebar:** restyle container ([a72ce93](https://github.com/johannesjo/super-productivity/commit/a72ce931f43c4833093c8811390ae12d6b670796))
- **taskSidebar:** scroll to attachments on attachment icon click ([621ecfa](https://github.com/johannesjo/super-productivity/commit/621ecfaa5305ba7c77115dd5de995c31f2c2ad3c))
- **taskSidebar:** slightly improve selected styling for light theme ([686a176](https://github.com/johannesjo/super-productivity/commit/686a1763a8738964455197aa144110c833412501))
- **taskSidebar:** switch to smaller container a little earlier ([a015866](https://github.com/johannesjo/super-productivity/commit/a01586608c5d9f849b86617848ca19d56aff303a))
- **taskSidebar:** trigger small mode earlier ([2238267](https://github.com/johannesjo/super-productivity/commit/2238267512e19a0f60e6a46c81c8d94df0363818))
- **taskSidebar:** unify dark theme colors everywhere ([9827260](https://github.com/johannesjo/super-productivity/commit/98272603f4144cfe27c082c7f54234d0aaacdfe8))
- **taskSidebar:** unify hover color ([d990697](https://github.com/johannesjo/super-productivity/commit/d990697d4da82001320fd1dc39bb3d86fdad3cad))
- improve note styling ([4d2db86](https://github.com/johannesjo/super-productivity/commit/4d2db86a7fbc553699a8ce3d9c4c64e8f7c7a326))
- make scrollbars smaller ([c6138eb](https://github.com/johannesjo/super-productivity/commit/c6138eb86657477638f3b89530ce242e5f704c12))

## [2.13.15](https://github.com/johannesjo/super-productivity/compare/v2.13.14...v2.13.15) (2019-12-05)

### Bug Fixes

- error handling possibly crashing app ([7225832](https://github.com/johannesjo/super-productivity/commit/72258323997b2d2f47314b4fade1f052c2635797))

## [2.13.14](https://github.com/johannesjo/super-productivity/compare/v2.13.13...v2.13.14) (2019-12-03)

### Bug Fixes

- markdown not always breaking words as expected ([f4fc838](https://github.com/johannesjo/super-productivity/commit/f4fc8381c43487099f86aa32c1d359f4addc8ae1))
- **jira:** markdown error when trying to parse null issue description [#261](https://github.com/johannesjo/super-productivity/issues/261) ([f4cf908](https://github.com/johannesjo/super-productivity/commit/f4cf90884cd80384e58934a304d710dfb25040ab))
- dynamic header shadow sometimes not working as intended ([7a053f6](https://github.com/johannesjo/super-productivity/commit/7a053f676b0ac3d0e35ce9322e75dd81a2870342))

## [2.13.13](https://github.com/johannesjo/super-productivity/compare/v2.13.12...v2.13.13) (2019-12-02)

### Bug Fixes

- **google:** login not working for some users [#258](https://github.com/johannesjo/super-productivity/issues/258) ([8348ec1](https://github.com/johannesjo/super-productivity/commit/8348ec12c928ee87aaf5602f730af504862fd8ef))

### Features

- also add meta info for errors, so users don't have to think about it ([2ec52b5](https://github.com/johannesjo/super-productivity/commit/2ec52b5e60f2cdaa814368ec4d5f80f8751b6a2c))
- improve error handling via stacktrace js ([92d4cab](https://github.com/johannesjo/super-productivity/commit/92d4cab12730f1814971ad84eab92dfe49b2fede))

## [2.13.12](https://github.com/johannesjo/super-productivity/compare/v2.13.11...v2.13.12) (2019-11-29)

## [2.13.11](https://github.com/johannesjo/super-productivity/compare/v2.13.10...v2.13.11) (2019-11-29)

### Bug Fixes

- stupid mistake ([7cb5360](https://github.com/johannesjo/super-productivity/commit/7cb5360ff831f0457581f6938a5eee09236fcdc1))

## [2.13.10](https://github.com/johannesjo/super-productivity/compare/v2.13.9...v2.13.10) (2019-11-29)

### Bug Fixes

- **jira:** restoring jira task with sub tasks corrupting task data [#260](https://github.com/johannesjo/super-productivity/issues/260) ([264dc06](https://github.com/johannesjo/super-productivity/commit/264dc06e3a8bdcbc914770fec668c2d13c8ee22f))
- dark theme styling for dialog fullscreen markdown ([ef7bcd5](https://github.com/johannesjo/super-productivity/commit/ef7bcd58cc5a38e38b6b379badf27715609f3323))
- lockscreen not working for plasma desktops [#259](https://github.com/johannesjo/super-productivity/issues/259) ([fe89390](https://github.com/johannesjo/super-productivity/commit/fe89390d257fd1ea352092bde4401a378e9a07a8))
- **worklog:** add col button style when all cols where deleted ([cd91202](https://github.com/johannesjo/super-productivity/commit/cd912022b86e4b8c38bc57f2044f45e85a49b7c3))
- **worklog:** unable to add columns while tracking time ([31c5e03](https://github.com/johannesjo/super-productivity/commit/31c5e03baaf21b3f087e20a51adb0f2a3b3fcff6))
- inline markdown textarea resize ([adf3121](https://github.com/johannesjo/super-productivity/commit/adf3121dc0ec85c27f412b24ce637133c8d276e7))
- remove redundant scrollbar ([9183b97](https://github.com/johannesjo/super-productivity/commit/9183b97f884c401a60184b373cefc827fa51eb0a))

### Features

- make header border only appear when scrolled ([e74c551](https://github.com/johannesjo/super-productivity/commit/e74c5510f51fe3dafb0a064c8a9f235795668a1b))
- make header shadow bigger for dark theme ([9c196af](https://github.com/johannesjo/super-productivity/commit/9c196afa314f8f86d03eda5759d24656c334e17f))
- re add new header elevation ([b31a488](https://github.com/johannesjo/super-productivity/commit/b31a4887753ddc4e977b09a07556fb88e8e7a2f5))
- revert shadow thingy for now ([72ff89c](https://github.com/johannesjo/super-productivity/commit/72ff89cc5668b6e1e89a1da4ec040558c71a4ee9))
- **bookmark:** use single button for add and edit ([5a80377](https://github.com/johannesjo/super-productivity/commit/5a80377afb94167c804732da117b2a826cdaa216))
- **i18n:** add translations ([d43db11](https://github.com/johannesjo/super-productivity/commit/d43db11a47e6aed9ec1965cf54c558ceb59ec5e4))
- **jira:** improve jira markup parsing ([c36c286](https://github.com/johannesjo/super-productivity/commit/c36c286b3e3abf342a7da0c5b1c5d161438b24a1))
- **note:** improve snoozing ([706007d](https://github.com/johannesjo/super-productivity/commit/706007defbe75414c1cd4911d8b90f12eab6b0d0))
- **worklog:** add menu to directly add new col with type ([0723539](https://github.com/johannesjo/super-productivity/commit/0723539b15a055f7c917c3e0c4d8a4f8eedef53f))
- **worklog:** make close the primary action ([b966dd4](https://github.com/johannesjo/super-productivity/commit/b966dd4cc3ddc5203678ebceafc2bc45d3df176a))
- add full screen edit for notes ([ad660bd](https://github.com/johannesjo/super-productivity/commit/ad660bdf2ad9cd15510afa7cf45924590c2b022e))
- add full screen edit for task notes ([7db4227](https://github.com/johannesjo/super-productivity/commit/7db42279d265b5e87ca01fa2ff04ff09355a7c14))
- add shadow to header ([a2460b7](https://github.com/johannesjo/super-productivity/commit/a2460b784ba7addc9377fd0906b69773caf51cc4))

## [2.13.9](https://github.com/johannesjo/super-productivity/compare/v2.13.8...v2.13.9) (2019-11-07)

### Bug Fixes

- mac os mas build not working with electron dl ([e0bb802](https://github.com/johannesjo/super-productivity/commit/e0bb802f974a52fef5efcf7dc8f941eabfb40a0d))

### Features

- **i18n:** add missing translations ([b847d0e](https://github.com/johannesjo/super-productivity/commit/b847d0e8af0891eeef13b3a8b82da3b18a3f5e55))

## [2.13.8](https://github.com/johannesjo/super-productivity/compare/v2.13.7...v2.13.8) (2019-11-01)

### Bug Fixes

- **jira:** crashing if api doesn't respond with avatar url [#252](https://github.com/johannesjo/super-productivity/issues/252) ([ff96f9d](https://github.com/johannesjo/super-productivity/commit/ff96f9d3a8484276be01e7caeac80fa2d94d6b82))
- **jira:** not handling ports correctly [#253](https://github.com/johannesjo/super-productivity/issues/253) ([393682e](https://github.com/johannesjo/super-productivity/commit/393682ef21778140738ec4d69bb58bc36b9f011f))
- **jira:** sometimes crashing app for wrong config [#253](https://github.com/johannesjo/super-productivity/issues/253) ([d23d98f](https://github.com/johannesjo/super-productivity/commit/d23d98f611a0db67df9037ed781e1022899a7602))

### Features

- allow turning off markdown ([d452d22](https://github.com/johannesjo/super-productivity/commit/d452d226ff6a65a9ca5db9bd2ac17226052292e1))

## [2.13.7](https://github.com/johannesjo/super-productivity/compare/v2.13.6...v2.13.7) (2019-10-26)

### Bug Fixes

- by reducing entitlements ([f7408ae](https://github.com/johannesjo/super-productivity/commit/f7408aece1055568f6244a4e0d23f3d791513dd5))

## [2.13.6](https://github.com/johannesjo/super-productivity/compare/v2.13.5...v2.13.6) (2019-10-26)

### Features

- **i18n:** add italian and portuguese ([68dbb8c](https://github.com/johannesjo/super-productivity/commit/68dbb8cf2025ad50be3f1f7185861393c0d4289a))
- Fixies and Portuguese Brazilian translations ([5c5faf0](https://github.com/johannesjo/super-productivity/commit/5c5faf0cc28f1dc062bcdc787273fce18f305be6))

## [2.13.5](https://github.com/johannesjo/super-productivity/compare/v2.13.4...v2.13.5) (2019-10-20)

## [2.13.4](https://github.com/johannesjo/super-productivity/compare/v2.13.3...v2.13.4) (2019-10-20)

### Bug Fixes

- correct confirm load text [#226](https://github.com/johannesjo/super-productivity/issues/226) ([e8ba652](https://github.com/johannesjo/super-productivity/commit/e8ba652d1a803d4fe3cb0770df2f630786a653b0))

### Features

- disable project delete and archive buttons rather than just hiding them ([9cc5d48](https://github.com/johannesjo/super-productivity/commit/9cc5d48b1b8f09cf15ced34f2e17cf727d96fdd3))
- **i18n:** add missing translations ([999e32e](https://github.com/johannesjo/super-productivity/commit/999e32e09372af86305c9f02c04568078e534a52))

## [2.13.3](https://github.com/johannesjo/super-productivity/compare/v2.13.2...v2.13.3) (2019-10-14)

### Bug Fixes

- app icons ([648136d](https://github.com/johannesjo/super-productivity/commit/648136d790620c0801e75f61ccf8d0f8768cc818))
- error for reminders when there is no initial config ([2abcd8a](https://github.com/johannesjo/super-productivity/commit/2abcd8a5923531abb41b0c93decc5a299f0ebcf9))
- mobile styling for improvement banner ([d8e6960](https://github.com/johannesjo/super-productivity/commit/d8e6960533f9ce44a1e078665d69c8a307fe05e8))
- worklog export error ([359212e](https://github.com/johannesjo/super-productivity/commit/359212e2472d741ef6b23905f02aa66b6f580a87))

### Features

- allow to add task from backlog via add task bar ([0b7a3c9](https://github.com/johannesjo/super-productivity/commit/0b7a3c99c66bf7a66c207552bfad5fd33a4b3da5))
- also hide mark as done button for daily summary planner ([261fe88](https://github.com/johannesjo/super-productivity/commit/261fe88880a48e254fea5f4de849d68277fade63))
- enable double enter mode only on daily planner ([68d972a](https://github.com/johannesjo/super-productivity/commit/68d972ae7396a97a8e253939dd986421c271ea39))
- improve add task bar label ([52e1623](https://github.com/johannesjo/super-productivity/commit/52e1623a838c07a68e5f5c37dab66bc36e9e33c2))
- limit task context menu to first line ([e9b4850](https://github.com/johannesjo/super-productivity/commit/e9b4850d0232561dd099f9498ddb8c1608b46055))
- show git deleted issue msg longer ([a287eba](https://github.com/johannesjo/super-productivity/commit/a287ebafdfc76366ee116e50df37e94a5231612e))
- **i18n:** shorten button text ([bfb53fe](https://github.com/johannesjo/super-productivity/commit/bfb53feb6cbac5c9967acd566f8a240d29b15b46))
- restyle add task bar ([4d9552e](https://github.com/johannesjo/super-productivity/commit/4d9552e99ea92e8e0a53a86e85a6c5c3b2dff59b))

## [2.13.2](https://github.com/johannesjo/super-productivity/compare/v2.13.1...v2.13.2) (2019-10-11)

## [2.13.1](https://github.com/johannesjo/super-productivity/compare/v2.13.0...v2.13.1) (2019-10-11)

### Bug Fixes

- crash on changing project [#238](https://github.com/johannesjo/super-productivity/issues/238) ([6871fec](https://github.com/johannesjo/super-productivity/commit/6871fec))
- **scheduled:** styling for long task titles ([888f6f3](https://github.com/johannesjo/super-productivity/commit/888f6f3))
- case when initial import fails and reminders are never loaded ([d880b98](https://github.com/johannesjo/super-productivity/commit/d880b98))
- cleanout error ([163be6a](https://github.com/johannesjo/super-productivity/commit/163be6a))
- google drive initial import if update is encoded ([37c8880](https://github.com/johannesjo/super-productivity/commit/37c8880))
- last active loaded value being wrong for timestamp ([db292e9](https://github.com/johannesjo/super-productivity/commit/db292e9))
- local storage error ([9c719b6](https://github.com/johannesjo/super-productivity/commit/9c719b6))
- make notifications non silent ([a24d5d7](https://github.com/johannesjo/super-productivity/commit/a24d5d7))
- typing error ([9adecd6](https://github.com/johannesjo/super-productivity/commit/9adecd6))
- typing issue ([057e131](https://github.com/johannesjo/super-productivity/commit/057e131))
- typing issue ([a179cd3](https://github.com/johannesjo/super-productivity/commit/a179cd3))
- wrong syntax ([b9ecfd5](https://github.com/johannesjo/super-productivity/commit/b9ecfd5))

### Features

- add check for when local model version is smaller than the one imported ([a98bd81](https://github.com/johannesjo/super-productivity/commit/a98bd81))
- add new productivity tip ([79dfa15](https://github.com/johannesjo/super-productivity/commit/79dfa15))
- add planning mode at the end of the day ([70fefbc](https://github.com/johannesjo/super-productivity/commit/70fefbc))
- adjust web app icons ([cc0b74f](https://github.com/johannesjo/super-productivity/commit/cc0b74f))
- hide play button for daily summary plan ([42209d7](https://github.com/johannesjo/super-productivity/commit/42209d7))
- hide time estimates/spent when there is no data ([cff29fb](https://github.com/johannesjo/super-productivity/commit/cff29fb))
- improve snoozing experience for tasks ([7e66643](https://github.com/johannesjo/super-productivity/commit/7e66643))
- reduce add task reminder interface to what is needed ([7eb215a](https://github.com/johannesjo/super-productivity/commit/7eb215a))
- **i18n:** make button text shorter ([0e17873](https://github.com/johannesjo/super-productivity/commit/0e17873))
- remove outdated models for simpleTaskSummary and googleTimeSheetExport ([404ff8a](https://github.com/johannesjo/super-productivity/commit/404ff8a))

# [2.13.0](https://github.com/johannesjo/super-productivity/compare/v2.12.11...v2.13.0) (2019-10-08)

### Bug Fixes

- edge case when reminder is never loaded ([9fd14c1](https://github.com/johannesjo/super-productivity/commit/9fd14c1))
- worklog options extend error ([f0e9ef3](https://github.com/johannesjo/super-productivity/commit/f0e9ef3))
- worklog table styling ([f32e1d5](https://github.com/johannesjo/super-productivity/commit/f32e1d5))

### Features

- make project title editable on project settings ([a578dde](https://github.com/johannesjo/super-productivity/commit/a578dde))
- remove google sheet export completely ([dbd9a79](https://github.com/johannesjo/super-productivity/commit/dbd9a79))
- remove migrate service completely ([9cf7957](https://github.com/johannesjo/super-productivity/commit/9cf7957))
- replace simple task export with worklog export ([2adb9e6](https://github.com/johannesjo/super-productivity/commit/2adb9e6))
- **i18n:** add all missing translations ([5ca5147](https://github.com/johannesjo/super-productivity/commit/5ca5147))
- **worklog:** add tooltips ([ca873f9](https://github.com/johannesjo/super-productivity/commit/ca873f9))
- **worklog:** display only single day if there is only one ([d465a16](https://github.com/johannesjo/super-productivity/commit/d465a16))
- **worklog:** improve options and light theme styling ([17b8293](https://github.com/johannesjo/super-productivity/commit/17b8293))
- **worklog:** improve styling for control columns ([23bbfa7](https://github.com/johannesjo/super-productivity/commit/23bbfa7))

## [2.12.11](https://github.com/johannesjo/super-productivity/compare/v2.12.10...v2.12.11) (2019-10-08)

## [2.12.10](https://github.com/johannesjo/super-productivity/compare/v2.12.9...v2.12.10) (2019-10-08)

## [2.12.9](https://github.com/johannesjo/super-productivity/compare/v2.12.8...v2.12.9) (2019-10-08)

## [2.12.8](https://github.com/johannesjo/super-productivity/compare/v2.12.7...v2.12.8) (2019-10-07)

## [2.12.7](https://github.com/johannesjo/super-productivity/compare/v2.12.6...v2.12.7) (2019-10-07)

## [2.12.6](https://github.com/johannesjo/super-productivity/compare/v2.12.5...v2.12.6) (2019-10-07)

### Bug Fixes

- check for invalid zoom factors ([47b83ca](https://github.com/johannesjo/super-productivity/commit/47b83ca))
- downloads not working for electron ([67777ad](https://github.com/johannesjo/super-productivity/commit/67777ad))
- global persistence disallowed error message ([9da97d7](https://github.com/johannesjo/super-productivity/commit/9da97d7))
- improvement banner items showing up ([9c3c718](https://github.com/johannesjo/super-productivity/commit/9c3c718))
- linting issues ([6c3e84e](https://github.com/johannesjo/super-productivity/commit/6c3e84e))

### Features

- add some tooltips for a better first experience ([727c5de](https://github.com/johannesjo/super-productivity/commit/727c5de))
- always show repeated improvements for banner ([047b489](https://github.com/johannesjo/super-productivity/commit/047b489))
- handle failed refresh token login for electron google auth ([7749f68](https://github.com/johannesjo/super-productivity/commit/7749f68))
- immediately update google drive sync enabled ([cefb957](https://github.com/johannesjo/super-productivity/commit/cefb957))
- immediately update jira enabled ([26d4e2b](https://github.com/johannesjo/super-productivity/commit/26d4e2b))
- wait for initial sync before showing any reminders ([8e98304](https://github.com/johannesjo/super-productivity/commit/8e98304))
- **scheduled:** add exact date as tooltip ([93101b7](https://github.com/johannesjo/super-productivity/commit/93101b7))
- make improvements repeatable ([8f448d3](https://github.com/johannesjo/super-productivity/commit/8f448d3))
- update work week when task summary table changes values ([790dfba](https://github.com/johannesjo/super-productivity/commit/790dfba))

## [2.12.5](https://github.com/johannesjo/super-productivity/compare/v2.12.4...v2.12.5) (2019-10-02)

### Bug Fixes

- improvement reappearing after project change ([3f5dc22](https://github.com/johannesjo/super-productivity/commit/3f5dc22))
- metrics not updating ([635ab9a](https://github.com/johannesjo/super-productivity/commit/635ab9a))
- note styles with new last reminder time ([e54af92](https://github.com/johannesjo/super-productivity/commit/e54af92))
- redrawing problem on every key stroke ([e07ae77](https://github.com/johannesjo/super-productivity/commit/e07ae77))
- remove scrollbar if not needed ([1a08b3a](https://github.com/johannesjo/super-productivity/commit/1a08b3a))
- **bookmarks:** for light theme ([c6cc8fd](https://github.com/johannesjo/super-productivity/commit/c6cc8fd))
- scrollbar appearing unwantedly ([92d6a10](https://github.com/johannesjo/super-productivity/commit/92d6a10))

### Features

- add checking of improvements ([e50e9c5](https://github.com/johannesjo/super-productivity/commit/e50e9c5))
- add little animation to banner ([ebfc4ac](https://github.com/johannesjo/super-productivity/commit/ebfc4ac))
- add some space to ready to work button [#219](https://github.com/johannesjo/super-productivity/issues/219) ([744a559](https://github.com/johannesjo/super-productivity/commit/744a559))
- add tooltips for improvement banner ([f17e882](https://github.com/johannesjo/super-productivity/commit/f17e882))
- auto add checked improvements to list ([1cd1498](https://github.com/johannesjo/super-productivity/commit/1cd1498))
- improve banner out ani ([0994bd8](https://github.com/johannesjo/super-productivity/commit/0994bd8))
- improve improvement banner hover animation ([1735cf7](https://github.com/johannesjo/super-productivity/commit/1735cf7))
- improve improvements suggestion position ([4ced2a5](https://github.com/johannesjo/super-productivity/commit/4ced2a5))
- improve ui for evaluation sheet ([bc25f37](https://github.com/johannesjo/super-productivity/commit/bc25f37))
- improve ui for improvement banner ([9057c4f](https://github.com/johannesjo/super-productivity/commit/9057c4f))
- make progress bar a little smaller again ([4f7c2c6](https://github.com/johannesjo/super-productivity/commit/4f7c2c6))
- prepare improvement repeat ui ([2363ef5](https://github.com/johannesjo/super-productivity/commit/2363ef5))
- restyle improvement banner ([5e1203f](https://github.com/johannesjo/super-productivity/commit/5e1203f))
- **bookmarks:** make transition quicker ([de350c1](https://github.com/johannesjo/super-productivity/commit/de350c1))
- **i18n:** add missing translation string ([8a42a54](https://github.com/johannesjo/super-productivity/commit/8a42a54))
- **i18n:** add missing translations ([35ad7eb](https://github.com/johannesjo/super-productivity/commit/35ad7eb))

## [2.12.4](https://github.com/johannesjo/super-productivity/compare/v2.12.3...v2.12.4) (2019-09-30)

### Bug Fixes

- avoid weird task animation state ([f0231da](https://github.com/johannesjo/super-productivity/commit/f0231da))
- cannot read property user of undefined ([eb8f4fb](https://github.com/johannesjo/super-productivity/commit/eb8f4fb))
- date sorting messing up end day notification [#216](https://github.com/johannesjo/super-productivity/issues/216) ([40e86af](https://github.com/johannesjo/super-productivity/commit/40e86af))
- extra mac padding shown for web and others ([1e133e3](https://github.com/johannesjo/super-productivity/commit/1e133e3))
- make global show/hide work for windows ([a6668e6](https://github.com/johannesjo/super-productivity/commit/a6668e6))
- make mac os dark mode work initially ([3ae3e5b](https://github.com/johannesjo/super-productivity/commit/3ae3e5b))
- missing OnDestroy for project settings ([d555bf7](https://github.com/johannesjo/super-productivity/commit/d555bf7))
- nav closing for other state as over ([9734f55](https://github.com/johannesjo/super-productivity/commit/9734f55))
- only open dev tools on unhandled errors ([d6184c7](https://github.com/johannesjo/super-productivity/commit/d6184c7))
- project list being gone on project change sometimes ([e1d47b4](https://github.com/johannesjo/super-productivity/commit/e1d47b4))
- reload inside electron and open dev tools when there is an error ([857b27f](https://github.com/johannesjo/super-productivity/commit/857b27f))
- side nav requiring two clicks to open if closed via backdrop ([d3de075](https://github.com/johannesjo/super-productivity/commit/d3de075))
- task title edit text sometimes not being visible ([8edc839](https://github.com/johannesjo/super-productivity/commit/8edc839))
- task title not showing for add task snack ([7b7090d](https://github.com/johannesjo/super-productivity/commit/7b7090d))

### Features

- add last val for datetime input ([2cd47ba](https://github.com/johannesjo/super-productivity/commit/2cd47ba))
- add notification when task is created and not being on task list ([105f222](https://github.com/johannesjo/super-productivity/commit/105f222))
- add right click task context menu ([d85785f](https://github.com/johannesjo/super-productivity/commit/d85785f))
- add tooltip instead of title for scheduled play ([027429c](https://github.com/johannesjo/super-productivity/commit/027429c))
- hide dark mode switch for mac ([0a5a627](https://github.com/johannesjo/super-productivity/commit/0a5a627))
- hide side nav when opening route or changing project ([e65bc2e](https://github.com/johannesjo/super-productivity/commit/e65bc2e))
- improve note handle styling ([91ad4a4](https://github.com/johannesjo/super-productivity/commit/91ad4a4))
- improve project change transition ([9ebf07d](https://github.com/johannesjo/super-productivity/commit/9ebf07d))
- improve project change transition ([16f5eeb](https://github.com/johannesjo/super-productivity/commit/16f5eeb))
- improve project transition further ([6bcb176](https://github.com/johannesjo/super-productivity/commit/6bcb176))
- link task list and project settings from main menu bar at the top ([d65fbf6](https://github.com/johannesjo/super-productivity/commit/d65fbf6))
- make frameless window work for mac ([f95397d](https://github.com/johannesjo/super-productivity/commit/f95397d))
- make hover controls work for non touch very small sizes ([71f6b6a](https://github.com/johannesjo/super-productivity/commit/71f6b6a))
- make progress bar more visible ([c7214b2](https://github.com/johannesjo/super-productivity/commit/c7214b2))
- make project transition slightly smoother ([f27ebd7](https://github.com/johannesjo/super-productivity/commit/f27ebd7))
- only update project id if different then before ([f77091e](https://github.com/johannesjo/super-productivity/commit/f77091e))
- remove animation for backlog tasks ([58f613e](https://github.com/johannesjo/super-productivity/commit/58f613e))
- show current task title in header when not on work view ([ae423d1](https://github.com/johannesjo/super-productivity/commit/ae423d1))
- **scheduled:** add loading spinner when reminders are not yet loaded ([7f2d75f](https://github.com/johannesjo/super-productivity/commit/7f2d75f))
- **scheduled:** improve styling ([4c03dff](https://github.com/johannesjo/super-productivity/commit/4c03dff))
- warn about non persistent storage [#217](https://github.com/johannesjo/super-productivity/issues/217) ([1199d35](https://github.com/johannesjo/super-productivity/commit/1199d35))

## [2.12.3](https://github.com/johannesjo/super-productivity/compare/v2.12.2...v2.12.3) (2019-09-23)

### Bug Fixes

- side nav styling for dark theme ([4559dfe](https://github.com/johannesjo/super-productivity/commit/4559dfe))

## [2.12.2](https://github.com/johannesjo/super-productivity/compare/v2.12.1...v2.12.2) (2019-09-23)

### Features

- add migration for task archive ([424f5c6](https://github.com/johannesjo/super-productivity/commit/424f5c6))
- add no data message to worklog week ([22924be](https://github.com/johannesjo/super-productivity/commit/22924be))
- add projectId to task model ([e99dad8](https://github.com/johannesjo/super-productivity/commit/e99dad8))
- improve side nav styles ([a38930b](https://github.com/johannesjo/super-productivity/commit/a38930b))
- move migrations to persistence service and make them smarter ([cc15a71](https://github.com/johannesjo/super-productivity/commit/cc15a71))
- re-color i forgot something ([1383ed7](https://github.com/johannesjo/super-productivity/commit/1383ed7))
- **reDesign:** make evaluation sheet a little smaller per default ([e648345](https://github.com/johannesjo/super-productivity/commit/e648345))
- **scheduled:** add tooltip with exact time and date ([e509c13](https://github.com/johannesjo/super-productivity/commit/e509c13))
- **scheduled:** beautify ([36b46d2](https://github.com/johannesjo/super-productivity/commit/36b46d2))
- **scheduled:** beautify 2 ([ef6b212](https://github.com/johannesjo/super-productivity/commit/ef6b212))
- **scheduled:** make task title editable ([ccd4c1b](https://github.com/johannesjo/super-productivity/commit/ccd4c1b))

## [2.12.1](https://github.com/johannesjo/super-productivity/compare/v2.12.0...v2.12.1) (2019-09-22)

### Bug Fixes

- **scheduled:** starting task from other project ([31d58de](https://github.com/johannesjo/super-productivity/commit/31d58de))

### Features

- improve side nav dragging experience ([ffff324](https://github.com/johannesjo/super-productivity/commit/ffff324))

# [2.12.0](https://github.com/johannesjo/super-productivity/compare/v2.11.1...v2.12.0) (2019-09-22)

### Bug Fixes

- **github:** potential regex error when searching issues ([03df5f8](https://github.com/johannesjo/super-productivity/commit/03df5f8))
- **redesign:** make nav work again ([5c3d88a](https://github.com/johannesjo/super-productivity/commit/5c3d88a))
- **reDesign:** material table style ([b723a05](https://github.com/johannesjo/super-productivity/commit/b723a05))
- **reDesign:** remove invalid manifest link ([dcad1d7](https://github.com/johannesjo/super-productivity/commit/dcad1d7))
- **reDesign:** side bar button styles not being loaded for some projects ([f76b64d](https://github.com/johannesjo/super-productivity/commit/f76b64d))
- make switching backlog/work list mode appear immediately ([c65939c](https://github.com/johannesjo/super-productivity/commit/c65939c))
- make zoom level saving work [#102](https://github.com/johannesjo/super-productivity/issues/102) ([38e2527](https://github.com/johannesjo/super-productivity/commit/38e2527))
- mobile styles for new design ([d784f30](https://github.com/johannesjo/super-productivity/commit/d784f30))

### Features

- add desktop notification for break reminder again ([50037dc](https://github.com/johannesjo/super-productivity/commit/50037dc))
- add stacktrace to global error modal ([3bb4563](https://github.com/johannesjo/super-productivity/commit/3bb4563))
- adjust default color once more ([17c9e20](https://github.com/johannesjo/super-productivity/commit/17c9e20))
- allow updating task title in task summary table ([11a06ce](https://github.com/johannesjo/super-productivity/commit/11a06ce))
- change default theme color ([2c80a3c](https://github.com/johannesjo/super-productivity/commit/2c80a3c))
- disable special window style for mac ([1ae8024](https://github.com/johannesjo/super-productivity/commit/1ae8024))
- improve settings styling ([bb2b3d6](https://github.com/johannesjo/super-productivity/commit/bb2b3d6))
- include backlog tasks in task summary table ([c248a57](https://github.com/johannesjo/super-productivity/commit/c248a57))
- **redesign:** hide menu bar ([25bf04a](https://github.com/johannesjo/super-productivity/commit/25bf04a))
- make mainbar even smaller ([e961905](https://github.com/johannesjo/super-productivity/commit/e961905))
- **i18n:** add missing translations ([e8b4d1b](https://github.com/johannesjo/super-productivity/commit/e8b4d1b))
- **redesign:** add logic for showing and hiding ([2cf8bad](https://github.com/johannesjo/super-productivity/commit/2cf8bad))
- **redesign:** add scheduled route ([751f518](https://github.com/johannesjo/super-productivity/commit/751f518))
- **redesign:** improve dark theme scrollbars ([548ad49](https://github.com/johannesjo/super-productivity/commit/548ad49))
- **redesign:** improve light theme ([eaea390](https://github.com/johannesjo/super-productivity/commit/eaea390))
- **redesign:** improve project selection ([8d2aaba](https://github.com/johannesjo/super-productivity/commit/8d2aaba))
- **redesign:** improve reveal of bookmarks and banner ([91a7f25](https://github.com/johannesjo/super-productivity/commit/91a7f25))
- **redesign:** make background always slightly darker ([ef2ebb2](https://github.com/johannesjo/super-productivity/commit/ef2ebb2))
- **redesign:** make backlog work again ([0afc37c](https://github.com/johannesjo/super-productivity/commit/0afc37c))
- **redesign:** make banner flat ([f19053f](https://github.com/johannesjo/super-productivity/commit/f19053f))
- **redesign:** make dark mode a global model ([c96e8a1](https://github.com/johannesjo/super-productivity/commit/c96e8a1))
- **redesign:** make dark theme background a little darker ([1111282](https://github.com/johannesjo/super-productivity/commit/1111282))
- **redesign:** make everything darker ([c035658](https://github.com/johannesjo/super-productivity/commit/c035658))
- **redesign:** make notes slightly better readable for light theme ([fde9f29](https://github.com/johannesjo/super-productivity/commit/fde9f29))
- **reDesign:** add dark mode toggle ([1408f2b](https://github.com/johannesjo/super-productivity/commit/1408f2b))
- **reDesign:** add fireworks ([d4e0a30](https://github.com/johannesjo/super-productivity/commit/d4e0a30))
- **reDesign:** add new translation strings ([2fe81de](https://github.com/johannesjo/super-productivity/commit/2fe81de))
- **reDesign:** add project setting buttons ([6557940](https://github.com/johannesjo/super-productivity/commit/6557940))
- **reDesign:** add project settings as different page ([f1a676e](https://github.com/johannesjo/super-productivity/commit/f1a676e))
- **reDesign:** adjust mobile styling ([f8fe8ac](https://github.com/johannesjo/super-productivity/commit/f8fe8ac))
- **reDesign:** adjust side nav styles ([e6ac51e](https://github.com/johannesjo/super-productivity/commit/e6ac51e))
- **reDesign:** adjust work view header styles ([de068f5](https://github.com/johannesjo/super-productivity/commit/de068f5))
- **reDesign:** connect menu button ([e827794](https://github.com/johannesjo/super-productivity/commit/e827794))
- **reDesign:** disable dark mode per default ([dab57e4](https://github.com/johannesjo/super-productivity/commit/dab57e4))
- **reDesign:** first draft for new layout ([a717785](https://github.com/johannesjo/super-productivity/commit/a717785))
- **reDesign:** fix worklog table styles ([cc43aab](https://github.com/johannesjo/super-productivity/commit/cc43aab))
- **reDesign:** flattify boxes ([335237d](https://github.com/johannesjo/super-productivity/commit/335237d))
- **reDesign:** flattify buttons ([60c3151](https://github.com/johannesjo/super-productivity/commit/60c3151))
- **reDesign:** improve ([2933fc2](https://github.com/johannesjo/super-productivity/commit/2933fc2))
- **reDesign:** improve banner and bookmark bar ([ad5830a](https://github.com/johannesjo/super-productivity/commit/ad5830a))
- **reDesign:** improve margin top ([c6200e6](https://github.com/johannesjo/super-productivity/commit/c6200e6))
- **reDesign:** improve metrics styling ([b5c8fb7](https://github.com/johannesjo/super-productivity/commit/b5c8fb7))
- **reDesign:** improve note focus transition ([719cafa](https://github.com/johannesjo/super-productivity/commit/719cafa))
- **reDesign:** make add task bar also round ([66311a9](https://github.com/johannesjo/super-productivity/commit/66311a9))
- **reDesign:** make layout work ([3090af9](https://github.com/johannesjo/super-productivity/commit/3090af9))
- **reDesign:** make sidebar projects sortable ([07a126c](https://github.com/johannesjo/super-productivity/commit/07a126c))
- **reDesign:** minor adjustments ([f848ebf](https://github.com/johannesjo/super-productivity/commit/f848ebf))
- **reDesign:** pimp background for light theme again ([2371bbd](https://github.com/johannesjo/super-productivity/commit/2371bbd))
- **reDesign:** prettify fireworks ([3095ca4](https://github.com/johannesjo/super-productivity/commit/3095ca4))
- **reDesign:** remove drawer shadow ([afc349f](https://github.com/johannesjo/super-productivity/commit/afc349f))
- save web app install deny only to session storage ([3998ea7](https://github.com/johannesjo/super-productivity/commit/3998ea7))
- slightly improve scheduled page styling ([de9013d](https://github.com/johannesjo/super-productivity/commit/de9013d))
- update all icons (apart from appx) ([5d6aaa0](https://github.com/johannesjo/super-productivity/commit/5d6aaa0))
- **reDesign:** remove isHideNav setting ([1ea698a](https://github.com/johannesjo/super-productivity/commit/1ea698a))
- **scheduled:** go to task list on start ([d037772](https://github.com/johannesjo/super-productivity/commit/d037772))
- **scheduled:** pimp a little ([3be394b](https://github.com/johannesjo/super-productivity/commit/3be394b))

## [2.11.1](https://github.com/johannesjo/super-productivity/compare/v2.11.0...v2.11.1) (2019-09-13)

### Bug Fixes

- **worklog:** select crashing app ([8499297](https://github.com/johannesjo/super-productivity/commit/8499297))
- **worklog:** styling for longer table headings ([9cbac27](https://github.com/johannesjo/super-productivity/commit/9cbac27))

### Features

- **worklog:** improve modal title ([f5d58cc](https://github.com/johannesjo/super-productivity/commit/f5d58cc))
- **worklog:** improve worklog export table ([c88ae8b](https://github.com/johannesjo/super-productivity/commit/c88ae8b))

# [2.11.0](https://github.com/johannesjo/super-productivity/compare/v2.10.12...v2.11.0) (2019-09-13)

### Bug Fixes

- enable jira for new project when all settings are provided ([d8e4fa7](https://github.com/johannesjo/super-productivity/commit/d8e4fa7))
- only start task for ready to work when there is not already one ([228a75b](https://github.com/johannesjo/super-productivity/commit/228a75b))
- **i18n:** translation mess ([ec461d4](https://github.com/johannesjo/super-productivity/commit/ec461d4))

### Features

- **googleSync:** make dialogs unclosable ([f6416f8](https://github.com/johannesjo/super-productivity/commit/f6416f8))
- **i18n:** add missing translations ([629ffdc](https://github.com/johannesjo/super-productivity/commit/629ffdc))
- **reDesign:** add play status icon to current task ([8a7fed5](https://github.com/johannesjo/super-productivity/commit/8a7fed5))
- **reDesign:** adjust header and status bar styling ([3ba6bb2](https://github.com/johannesjo/super-productivity/commit/3ba6bb2))
- **reDesign:** adjust main header ([0e524bf](https://github.com/johannesjo/super-productivity/commit/0e524bf))
- **reDesign:** adjust play indicator position ([e8a3f74](https://github.com/johannesjo/super-productivity/commit/e8a3f74))
- **reDesign:** adjust task list styles ([4321da0](https://github.com/johannesjo/super-productivity/commit/4321da0))
- **reDesign:** adjust work view ([20e3a71](https://github.com/johannesjo/super-productivity/commit/20e3a71))
- **reDesign:** further adjust task list styles ([9a20c86](https://github.com/johannesjo/super-productivity/commit/9a20c86))
- **reDesign:** improve additional task info and inline edit ([6605c8d](https://github.com/johannesjo/super-productivity/commit/6605c8d))
- **reDesign:** improve current task transition ([1897da8](https://github.com/johannesjo/super-productivity/commit/1897da8))
- **reDesign:** improve play hover ([73ad0b7](https://github.com/johannesjo/super-productivity/commit/73ad0b7))
- **reDesign:** improve sub task list expand button ([3e77996](https://github.com/johannesjo/super-productivity/commit/3e77996))
- **reDesign:** improve task focus styling ([ecf437c](https://github.com/johannesjo/super-productivity/commit/ecf437c))
- **reDesign:** make bars smaller again ([8b14e85](https://github.com/johannesjo/super-productivity/commit/8b14e85))
- **reDesign:** remove reduced theme ([e9802b5](https://github.com/johannesjo/super-productivity/commit/e9802b5))

## [2.10.12](https://github.com/johannesjo/super-productivity/compare/v2.10.11...v2.10.12) (2019-08-28)

### Bug Fixes

- **i18n:** remove string leftover ([0ae06a1](https://github.com/johannesjo/super-productivity/commit/0ae06a1))
- **i18n:** untranslated string ([3bf2292](https://github.com/johannesjo/super-productivity/commit/3bf2292))

### Features

- add option to hide evaluation sheet on daily summary ([fa7908d](https://github.com/johannesjo/super-productivity/commit/fa7908d))
- also show planning mode when there are only repeatable tasks ([ff18991](https://github.com/johannesjo/super-productivity/commit/ff18991))
- make bookmark bar bg slightly darker ([0805315](https://github.com/johannesjo/super-productivity/commit/0805315))

## [2.10.11](https://github.com/johannesjo/super-productivity/compare/v2.10.10...v2.10.11) (2019-08-25)

### Bug Fixes

- focus color for task not showing for build ([b5c0353](https://github.com/johannesjo/super-productivity/commit/b5c0353))
- hammer conf not being injectable ([bd13c57](https://github.com/johannesjo/super-productivity/commit/bd13c57))
- potential crash when changing project on config page ([ff69d3b](https://github.com/johannesjo/super-productivity/commit/ff69d3b))
- problematic usage of ::ng-deep ([92ecac2](https://github.com/johannesjo/super-productivity/commit/92ecac2))
- styling for input duration slider ([a2c43ca](https://github.com/johannesjo/super-productivity/commit/a2c43ca))

### Features

- add box shadow when dragging stuff ([c5d3e15](https://github.com/johannesjo/super-productivity/commit/c5d3e15))
- adjust note panel style ([9af7d3c](https://github.com/johannesjo/super-productivity/commit/9af7d3c))
- adjust styles for bookmark bar ([3082691](https://github.com/johannesjo/super-productivity/commit/3082691))
- adjust styles for workview header ([2a6541e](https://github.com/johannesjo/super-productivity/commit/2a6541e))
- adjust styling for backlog tabs ([1693563](https://github.com/johannesjo/super-productivity/commit/1693563))
- adjust styling for worklog tables ([1bb338d](https://github.com/johannesjo/super-productivity/commit/1bb338d))
- improve attachment edit buttons ([e75b07f](https://github.com/johannesjo/super-productivity/commit/e75b07f))
- improve attachment list styling ([61fe6a5](https://github.com/johannesjo/super-productivity/commit/61fe6a5))
- improve main header layout ([07eb030](https://github.com/johannesjo/super-productivity/commit/07eb030))
- slightly adjust card color ([1675271](https://github.com/johannesjo/super-productivity/commit/1675271))
- use default form input font size again ([cad2b85](https://github.com/johannesjo/super-productivity/commit/cad2b85))

## [2.10.10](https://github.com/johannesjo/super-productivity/compare/v2.10.9...v2.10.10) (2019-08-23)

### Bug Fixes

- **bookmark:** bar colors ([5ebbc3a](https://github.com/johannesjo/super-productivity/commit/5ebbc3a))
- **colors:** most color issues ([1357ff1](https://github.com/johannesjo/super-productivity/commit/1357ff1))
- **colors:** reintroduce help icon color ([54c46ac](https://github.com/johannesjo/super-productivity/commit/54c46ac))
- **i18n:** wrong translations ([3aa3bae](https://github.com/johannesjo/super-productivity/commit/3aa3bae))
- issue link being accent color ([344859d](https://github.com/johannesjo/super-productivity/commit/344859d))
- jira throwing error when assignment to current user is checked [#208](https://github.com/johannesjo/super-productivity/issues/208) ([22e72b2](https://github.com/johannesjo/super-productivity/commit/22e72b2))
- linting errors ([86ab1ea](https://github.com/johannesjo/super-productivity/commit/86ab1ea))
- update angular material css and make it work again ([3fc8be9](https://github.com/johannesjo/super-productivity/commit/3fc8be9))
- **jira:** cfg error on project change when on settings page ([555948e](https://github.com/johannesjo/super-productivity/commit/555948e))
- **project:** migration not working as expected ([12a31a0](https://github.com/johannesjo/super-productivity/commit/12a31a0))
- **task:** accent color for .ico-btn ([1919608](https://github.com/johannesjo/super-productivity/commit/1919608))
- **task:** current task colors for bright primary color ([3622a23](https://github.com/johannesjo/super-productivity/commit/3622a23))

### Features

- **color:** make most basic project creation work again ([a51baba](https://github.com/johannesjo/super-productivity/commit/a51baba))
- **color:** make project overview color work for new model ([fbb29e7](https://github.com/johannesjo/super-productivity/commit/fbb29e7))
- **colors:** add hue selects ([a29fa5b](https://github.com/johannesjo/super-productivity/commit/a29fa5b))
- **colors:** improve inline edit elevation everywhere ([c9a83e7](https://github.com/johannesjo/super-productivity/commit/c9a83e7))
- **colors:** improve project creation dialog ([b1d9b21](https://github.com/johannesjo/super-productivity/commit/b1d9b21))
- **colors:** improve theme text colors ([528f3bf](https://github.com/johannesjo/super-productivity/commit/528f3bf))
- **colors:** make basic css variable theming work ([e7e4819](https://github.com/johannesjo/super-productivity/commit/e7e4819))
- add new ts lint config and fix error ([c941564](https://github.com/johannesjo/super-productivity/commit/c941564))
- **colors:** make basic custom color selection work ([b543fa5](https://github.com/johannesjo/super-productivity/commit/b543fa5))
- **colors:** make buttons and project colors work ([6ad983c](https://github.com/johannesjo/super-productivity/commit/6ad983c))
- **colors:** make theme utility classes work ([552d977](https://github.com/johannesjo/super-productivity/commit/552d977))
- **tasks:** improve task title edit ([3e13185](https://github.com/johannesjo/super-productivity/commit/3e13185))
- improve elevation for for task title edit ([8c2166a](https://github.com/johannesjo/super-productivity/commit/8c2166a))
- improve elevation system for light theme ([bdb1ed0](https://github.com/johannesjo/super-productivity/commit/bdb1ed0))
- make additional task info look better for dark theme ([ed3a71f](https://github.com/johannesjo/super-productivity/commit/ed3a71f))
- prepare new theme model ([70cb742](https://github.com/johannesjo/super-productivity/commit/70cb742))

## [2.10.9](https://github.com/johannesjo/super-productivity/compare/v2.10.8...v2.10.9) (2019-08-19)

### Bug Fixes

- jira settings not being loaded initially sometimes [#209](https://github.com/johannesjo/super-productivity/issues/209) ([311b555](https://github.com/johannesjo/super-productivity/commit/311b555))
- potential jira stepper error ([b3f9e91](https://github.com/johannesjo/super-productivity/commit/b3f9e91))
- project creation dialog sometimes failing ([79c2af7](https://github.com/johannesjo/super-productivity/commit/79c2af7))

## [2.10.8](https://github.com/johannesjo/super-productivity/compare/v2.10.7...v2.10.8) (2019-08-16)

### Bug Fixes

- task repeat dialog throwing error [#206](https://github.com/johannesjo/super-productivity/issues/206) ([b7c9eb4](https://github.com/johannesjo/super-productivity/commit/b7c9eb4))

## [2.10.7](https://github.com/johannesjo/super-productivity/compare/v2.10.6...v2.10.7) (2019-08-13)

### Bug Fixes

- msToString not showing minutes and seconds ([a257a2f](https://github.com/johannesjo/super-productivity/commit/a257a2f))

## [2.10.6](https://github.com/johannesjo/super-productivity/compare/v2.10.5...v2.10.6) (2019-08-12)

### Bug Fixes

- quick fix to lower case error ([4a7cdcb](https://github.com/johannesjo/super-productivity/commit/4a7cdcb))

## [2.10.5](https://github.com/johannesjo/super-productivity/compare/v2.10.4...v2.10.5) (2019-08-12)

### Bug Fixes

- build ([abeb9ba](https://github.com/johannesjo/super-productivity/commit/abeb9ba))
- linting warnings ([c958350](https://github.com/johannesjo/super-productivity/commit/c958350))
- typing errors ([a8363bc](https://github.com/johannesjo/super-productivity/commit/a8363bc))

## [2.10.4](https://github.com/johannesjo/super-productivity/compare/v2.10.3...v2.10.4) (2019-08-08)

### Bug Fixes

- msToString for very large values ([a99daa0](https://github.com/johannesjo/super-productivity/commit/a99daa0))
- **jira:** quick fix for jira changelog error [#202](https://github.com/johannesjo/super-productivity/issues/202) ([01f6315](https://github.com/johannesjo/super-productivity/commit/01f6315))
- **task:** clean sub tasks from archive model ([7e6b24c](https://github.com/johannesjo/super-productivity/commit/7e6b24c))

### Features

- **github:** add better issue cleaning ([50a0d5d](https://github.com/johannesjo/super-productivity/commit/50a0d5d))

## [2.10.3](https://github.com/johannesjo/super-productivity/compare/v2.10.2...v2.10.3) (2019-07-25)

### Bug Fixes

- close snacks on project change ([a6c2266](https://github.com/johannesjo/super-productivity/commit/a6c2266))
- remove strictActionSerializability for now ([82e813d](https://github.com/johannesjo/super-productivity/commit/82e813d))
- several issue with new checks for development ([bdc4450](https://github.com/johannesjo/super-productivity/commit/bdc4450))
- **worklog:** date export not always being right ([9a22814](https://github.com/johannesjo/super-productivity/commit/9a22814))

### Features

- **i18n:** add missing translations ([16ab134](https://github.com/johannesjo/super-productivity/commit/16ab134))

## [2.10.2](https://github.com/johannesjo/super-productivity/compare/v2.10.1...v2.10.2) (2019-07-24)

### Bug Fixes

- circular dependency ([2163e32](https://github.com/johannesjo/super-productivity/commit/2163e32))
- **github:** issue length not being displayed for snack ([e05ba3d](https://github.com/johannesjo/super-productivity/commit/e05ba3d))
- **github:** wrong key breaking build ([f8d8629](https://github.com/johannesjo/super-productivity/commit/f8d8629))
- **github:** wrong key breaking build ([2070ae2](https://github.com/johannesjo/super-productivity/commit/2070ae2))
- **googleDrive:** wrong message for importing ([f1e267c](https://github.com/johannesjo/super-productivity/commit/f1e267c))
- **i18n:** another german translation ([6033302](https://github.com/johannesjo/super-productivity/commit/6033302))
- **i18n:** another german translation ([c3f4ffd](https://github.com/johannesjo/super-productivity/commit/c3f4ffd))
- **i18n:** another german translation ([5040217](https://github.com/johannesjo/super-productivity/commit/5040217))
- **i18n:** german translations ([12695dc](https://github.com/johannesjo/super-productivity/commit/12695dc))
- **i18n:** german translations ([b69dbc2](https://github.com/johannesjo/super-productivity/commit/b69dbc2))
- **i18n:** message for dropping attachment to task ([e5e516a](https://github.com/johannesjo/super-productivity/commit/e5e516a))
- **i18n:** more german translations ([5359220](https://github.com/johannesjo/super-productivity/commit/5359220))
- **i18n:** more translation stuff ([3bb2f47](https://github.com/johannesjo/super-productivity/commit/3bb2f47))
- **i18n:** more translation stuff ([683464b](https://github.com/johannesjo/super-productivity/commit/683464b))
- **i18n:** styling for add more task buttons ([f81be4c](https://github.com/johannesjo/super-productivity/commit/f81be4c))
- **i18n:** weird german translations ([0770de2](https://github.com/johannesjo/super-productivity/commit/0770de2))
- **snack:** remove endless duration ([02078e1](https://github.com/johannesjo/super-productivity/commit/02078e1))
- **task:** drag and drop ordering when sub tasks are collapsed [#201](https://github.com/johannesjo/super-productivity/issues/201) ([9ec0d51](https://github.com/johannesjo/super-productivity/commit/9ec0d51))
- **task:** short syntax not always being done after edit ([6834c63](https://github.com/johannesjo/super-productivity/commit/6834c63))
- **task:** update time estimate correctly for short syntax ([114de15](https://github.com/johannesjo/super-productivity/commit/114de15))
- remove double text ([0fbe54a](https://github.com/johannesjo/super-productivity/commit/0fbe54a))
- **task:** remove string ([ad51569](https://github.com/johannesjo/super-productivity/commit/ad51569))
- **tasks:** remove toggle for desktop ([318b43c](https://github.com/johannesjo/super-productivity/commit/318b43c))

### Features

- also display tasks with no tracked time in worklog ([9fcad55](https://github.com/johannesjo/super-productivity/commit/9fcad55))
- **github:** add option to filter out own changes ([aa2d65f](https://github.com/johannesjo/super-productivity/commit/aa2d65f))
- add global shortcuts for add note and add task ([7891ec5](https://github.com/johannesjo/super-productivity/commit/7891ec5))
- beautify polling snacks ([9034846](https://github.com/johannesjo/super-productivity/commit/9034846))
- **i18n:** add missing translations ([2671866](https://github.com/johannesjo/super-productivity/commit/2671866))
- **i18n:** add translations for validation messages [#33](https://github.com/johannesjo/super-productivity/issues/33) ([8ba56c2](https://github.com/johannesjo/super-productivity/commit/8ba56c2))
- **takeABreak:** add config for lock screen ([d751533](https://github.com/johannesjo/super-productivity/commit/d751533))
- **takeABreak:** cancel lock screen timer on snooze and 'I already did' ([d556ee2](https://github.com/johannesjo/super-productivity/commit/d556ee2))
- **takeABreak:** make lock screen feature work ([642a236](https://github.com/johannesjo/super-productivity/commit/642a236))
- add model entity helpers for persistence service [#197](https://github.com/johannesjo/super-productivity/issues/197) ([9798d5b](https://github.com/johannesjo/super-productivity/commit/9798d5b))
- improve model entity helpers for persistence service [#197](https://github.com/johannesjo/super-productivity/issues/197) ([24fa5f6](https://github.com/johannesjo/super-productivity/commit/24fa5f6))

## [2.10.1](https://github.com/johannesjo/super-productivity/compare/v2.10.0...v2.10.1) (2019-07-18)

### Bug Fixes

- electron app broken ([86925ef](https://github.com/johannesjo/super-productivity/commit/86925ef))
- **i18n:** make all links open externally [#33](https://github.com/johannesjo/super-productivity/issues/33) ([860b860](https://github.com/johannesjo/super-productivity/commit/860b860))
- config section styling ([287afd3](https://github.com/johannesjo/super-productivity/commit/287afd3))
- long text for material checkboxes ([7c911e3](https://github.com/johannesjo/super-productivity/commit/7c911e3))

# [2.10.0](https://github.com/johannesjo/super-productivity/compare/v2.9.3...v2.10.0) (2019-07-18)

### Bug Fixes

- **google:** sync import asking initially always ([ec845e0](https://github.com/johannesjo/super-productivity/commit/ec845e0))
- **i18n:** broken refactoring [#33](https://github.com/johannesjo/super-productivity/issues/33) ([bbf6701](https://github.com/johannesjo/super-productivity/commit/bbf6701))
- **i18n:** language selection not working [#33](https://github.com/johannesjo/super-productivity/issues/33) ([03cf3d4](https://github.com/johannesjo/super-productivity/commit/03cf3d4))
- **i18n:** string generation not working correctly [#33](https://github.com/johannesjo/super-productivity/issues/33) ([bb38b3b](https://github.com/johannesjo/super-productivity/commit/bb38b3b))

### Features

- **i18n:** add translations for jira issue service and effects [#33](https://github.com/johannesjo/super-productivity/issues/33) ([efc7f36](https://github.com/johannesjo/super-productivity/commit/efc7f36))
- add time estimate exceeded as banner ([2233319](https://github.com/johannesjo/super-productivity/commit/2233319))
- **i18n:** add add mechanism to translate static html for formly [#33](https://github.com/johannesjo/super-productivity/issues/33) ([65462dd](https://github.com/johannesjo/super-productivity/commit/65462dd))
- **i18n:** add better solution for formly translations [#33](https://github.com/johannesjo/super-productivity/issues/33) ([820aa16](https://github.com/johannesjo/super-productivity/commit/820aa16))
- **i18n:** add config form to select language [#33](https://github.com/johannesjo/super-productivity/issues/33) ([2c59102](https://github.com/johannesjo/super-productivity/commit/2c59102))
- **i18n:** add first translations [#33](https://github.com/johannesjo/super-productivity/issues/33) ([15faaa1](https://github.com/johannesjo/super-productivity/commit/15faaa1))
- **i18n:** add formly components directly to source [#33](https://github.com/johannesjo/super-productivity/issues/33) ([2c08b50](https://github.com/johannesjo/super-productivity/commit/2c08b50))
- **i18n:** add korean [#33](https://github.com/johannesjo/super-productivity/issues/33) ([ae55e7b](https://github.com/johannesjo/super-productivity/commit/ae55e7b))
- **i18n:** add missing snacks [#33](https://github.com/johannesjo/super-productivity/issues/33) ([2a586cc](https://github.com/johannesjo/super-productivity/commit/2a586cc))
- **i18n:** add missing translation for week [#33](https://github.com/johannesjo/super-productivity/issues/33) ([9dfd1dc](https://github.com/johannesjo/super-productivity/commit/9dfd1dc))
- **i18n:** add missing translation pipes for formly [#33](https://github.com/johannesjo/super-productivity/issues/33) ([b49fa13](https://github.com/johannesjo/super-productivity/commit/b49fa13))
- **i18n:** add missing translations [#33](https://github.com/johannesjo/super-productivity/issues/33) ([9553566](https://github.com/johannesjo/super-productivity/commit/9553566))
- **i18n:** add missing translations [#33](https://github.com/johannesjo/super-productivity/issues/33) ([677c05d](https://github.com/johannesjo/super-productivity/commit/677c05d))
- **i18n:** add missing translations for work view [#33](https://github.com/johannesjo/super-productivity/issues/33) ([d85ef73](https://github.com/johannesjo/super-productivity/commit/d85ef73))
- **i18n:** add more missing git translations [#33](https://github.com/johannesjo/super-productivity/issues/33) ([ca0aad1](https://github.com/johannesjo/super-productivity/commit/ca0aad1))
- **i18n:** add most basic working translations [#33](https://github.com/johannesjo/super-productivity/issues/33) ([c1ae847](https://github.com/johannesjo/super-productivity/commit/c1ae847))
- **i18n:** add spanish [#33](https://github.com/johannesjo/super-productivity/issues/33) ([d150aba](https://github.com/johannesjo/super-productivity/commit/d150aba))
- **i18n:** add translate to formly components [#33](https://github.com/johannesjo/super-productivity/issues/33) ([8d2e909](https://github.com/johannesjo/super-productivity/commit/8d2e909))
- **i18n:** add translation evaluation sheet [#33](https://github.com/johannesjo/super-productivity/issues/33) ([da7b62c](https://github.com/johannesjo/super-productivity/commit/da7b62c))
- **i18n:** add translation for add task bar [#33](https://github.com/johannesjo/super-productivity/issues/33) ([9e86ace](https://github.com/johannesjo/super-productivity/commit/9e86ace))
- **i18n:** add translation for confirm dialogs [#33](https://github.com/johannesjo/super-productivity/issues/33) ([8721b8d](https://github.com/johannesjo/super-productivity/commit/8721b8d))
- **i18n:** add translation for dialog add note [#33](https://github.com/johannesjo/super-productivity/issues/33) ([64af9dd](https://github.com/johannesjo/super-productivity/commit/64af9dd))
- **i18n:** add translation for dialog add task reminder [#33](https://github.com/johannesjo/super-productivity/issues/33) ([2646f5f](https://github.com/johannesjo/super-productivity/commit/2646f5f))
- **i18n:** add translation for dialog time [#33](https://github.com/johannesjo/super-productivity/issues/33) ([dbfe1e1](https://github.com/johannesjo/super-productivity/commit/dbfe1e1))
- **i18n:** add translation for dialog time other day [#33](https://github.com/johannesjo/super-productivity/issues/33) ([28c182c](https://github.com/johannesjo/super-productivity/commit/28c182c))
- **i18n:** add translation for dialog view task reminder [#33](https://github.com/johannesjo/super-productivity/issues/33) ([318a4ee](https://github.com/johannesjo/super-productivity/commit/318a4ee))
- **i18n:** add translation for metric component sheet [#33](https://github.com/johannesjo/super-productivity/issues/33) ([f8dc166](https://github.com/johannesjo/super-productivity/commit/f8dc166))
- **i18n:** add translation for note components [#33](https://github.com/johannesjo/super-productivity/issues/33) ([d78c887](https://github.com/johannesjo/super-productivity/commit/d78c887))
- **i18n:** add translation for note dialog add reminder [#33](https://github.com/johannesjo/super-productivity/issues/33) ([4d64faa](https://github.com/johannesjo/super-productivity/commit/4d64faa))
- **i18n:** add translation for note dialog view reminder [#33](https://github.com/johannesjo/super-productivity/issues/33) ([f10217f](https://github.com/johannesjo/super-productivity/commit/f10217f))
- **i18n:** add translation for note snacks [#33](https://github.com/johannesjo/super-productivity/issues/33) ([fcb0a90](https://github.com/johannesjo/super-productivity/commit/fcb0a90))
- **i18n:** add translation for pomodoro [#33](https://github.com/johannesjo/super-productivity/issues/33) ([f447315](https://github.com/johannesjo/super-productivity/commit/f447315))
- **i18n:** add translation for procrastination [#33](https://github.com/johannesjo/super-productivity/issues/33) ([609eaea](https://github.com/johannesjo/super-productivity/commit/609eaea))
- **i18n:** add translation for project create dialog [#33](https://github.com/johannesjo/super-productivity/issues/33) ([1ece027](https://github.com/johannesjo/super-productivity/commit/1ece027))
- **i18n:** add translation for project form [#33](https://github.com/johannesjo/super-productivity/issues/33) ([8cb411f](https://github.com/johannesjo/super-productivity/commit/8cb411f))
- **i18n:** add translation for project service and effect [#33](https://github.com/johannesjo/super-productivity/issues/33) ([e28d651](https://github.com/johannesjo/super-productivity/commit/e28d651))
- **i18n:** add translation for reminder snack [#33](https://github.com/johannesjo/super-productivity/issues/33) ([301b4e4](https://github.com/johannesjo/super-productivity/commit/301b4e4))
- **i18n:** add translation for simple task export [#33](https://github.com/johannesjo/super-productivity/issues/33) ([a00e5a6](https://github.com/johannesjo/super-productivity/commit/a00e5a6))
- **i18n:** add translation for task additional [#33](https://github.com/johannesjo/super-productivity/issues/33) ([05abd56](https://github.com/johannesjo/super-productivity/commit/05abd56))
- **i18n:** add translation for task component [#33](https://github.com/johannesjo/super-productivity/issues/33) ([cdc3851](https://github.com/johannesjo/super-productivity/commit/cdc3851))
- **i18n:** add translation for task effects [#33](https://github.com/johannesjo/super-productivity/issues/33) ([e46f129](https://github.com/johannesjo/super-productivity/commit/e46f129))
- **i18n:** add translation for task summary table [#33](https://github.com/johannesjo/super-productivity/issues/33) ([ad9f91d](https://github.com/johannesjo/super-productivity/commit/ad9f91d))
- **i18n:** add translation for timestamps and dates [#33](https://github.com/johannesjo/super-productivity/issues/33) ([6b80062](https://github.com/johannesjo/super-productivity/commit/6b80062))
- **i18n:** add translation for worklog export [#33](https://github.com/johannesjo/super-productivity/issues/33) ([e7c0c80](https://github.com/johannesjo/super-productivity/commit/e7c0c80))
- **i18n:** add translations [#33](https://github.com/johannesjo/super-productivity/issues/33) ([7902c7c](https://github.com/johannesjo/super-productivity/commit/7902c7c))
- **i18n:** add translations for app component [#33](https://github.com/johannesjo/super-productivity/issues/33) ([a1a27c9](https://github.com/johannesjo/super-productivity/commit/a1a27c9))
- **i18n:** add translations for attachment feature [#33](https://github.com/johannesjo/super-productivity/issues/33) ([de71e26](https://github.com/johannesjo/super-productivity/commit/de71e26))
- **i18n:** add translations for backlog [#33](https://github.com/johannesjo/super-productivity/issues/33) ([cd303ef](https://github.com/johannesjo/super-productivity/commit/cd303ef))
- **i18n:** add translations for basic banner [#33](https://github.com/johannesjo/super-productivity/issues/33) ([ae576fb](https://github.com/johannesjo/super-productivity/commit/ae576fb))
- **i18n:** add translations for bookmark feature [#33](https://github.com/johannesjo/super-productivity/issues/33) ([45a7449](https://github.com/johannesjo/super-productivity/commit/45a7449))
- **i18n:** add translations for cfg component [#33](https://github.com/johannesjo/super-productivity/issues/33) ([83a2187](https://github.com/johannesjo/super-productivity/commit/83a2187))
- **i18n:** add translations for config [#33](https://github.com/johannesjo/super-productivity/issues/33) ([15b4b4f](https://github.com/johannesjo/super-productivity/commit/15b4b4f))
- **i18n:** add translations for config page and daily summary [#33](https://github.com/johannesjo/super-productivity/issues/33) ([d16c80a](https://github.com/johannesjo/super-productivity/commit/d16c80a))
- **i18n:** add translations for github [#33](https://github.com/johannesjo/super-productivity/issues/33) ([e7dd98b](https://github.com/johannesjo/super-productivity/commit/e7dd98b))
- **i18n:** add translations for github form [#33](https://github.com/johannesjo/super-productivity/issues/33) ([f1a0c56](https://github.com/johannesjo/super-productivity/commit/f1a0c56))
- **i18n:** add translations for global config forms [#33](https://github.com/johannesjo/super-productivity/issues/33) ([a4c1e39](https://github.com/johannesjo/super-productivity/commit/a4c1e39))
- **i18n:** add translations for google api service [#33](https://github.com/johannesjo/super-productivity/issues/33) ([a9b3e7f](https://github.com/johannesjo/super-productivity/commit/a9b3e7f))
- **i18n:** add translations for google components [#33](https://github.com/johannesjo/super-productivity/issues/33) ([2851964](https://github.com/johannesjo/super-productivity/commit/2851964))
- **i18n:** add translations for google snacks and dialogs [#33](https://github.com/johannesjo/super-productivity/issues/33) ([34ba758](https://github.com/johannesjo/super-productivity/commit/34ba758))
- **i18n:** add translations for imex [#33](https://github.com/johannesjo/super-productivity/issues/33) ([6916147](https://github.com/johannesjo/super-productivity/commit/6916147))
- **i18n:** add translations for jira api service [#33](https://github.com/johannesjo/super-productivity/issues/33) ([fc3206e](https://github.com/johannesjo/super-productivity/commit/fc3206e))
- **i18n:** add translations for jira dialogs [#33](https://github.com/johannesjo/super-productivity/issues/33) ([36d7557](https://github.com/johannesjo/super-productivity/commit/36d7557))
- **i18n:** add translations for jira forms [#33](https://github.com/johannesjo/super-productivity/issues/33) ([ffcb214](https://github.com/johannesjo/super-productivity/commit/ffcb214))
- **i18n:** add translations for jira issue content [#33](https://github.com/johannesjo/super-productivity/issues/33) ([2e83857](https://github.com/johannesjo/super-productivity/commit/2e83857))
- **i18n:** add translations for jira stepper and cfg components [#33](https://github.com/johannesjo/super-productivity/issues/33) ([ab7bd37](https://github.com/johannesjo/super-productivity/commit/ab7bd37))
- **i18n:** add translations for main header [#33](https://github.com/johannesjo/super-productivity/issues/33) ([fda1b6f](https://github.com/johannesjo/super-productivity/commit/fda1b6f))
- **i18n:** add translations for metric and project page [#33](https://github.com/johannesjo/super-productivity/issues/33) ([37e9ae8](https://github.com/johannesjo/super-productivity/commit/37e9ae8))
- **i18n:** add translations for misc config form [#33](https://github.com/johannesjo/super-productivity/issues/33) ([8aced05](https://github.com/johannesjo/super-productivity/commit/8aced05))
- **i18n:** add translations for task repeat [#33](https://github.com/johannesjo/super-productivity/issues/33) ([cc1b292](https://github.com/johannesjo/super-productivity/commit/cc1b292))
- **i18n:** add translations for time tracking [#33](https://github.com/johannesjo/super-productivity/issues/33) ([7165cd6](https://github.com/johannesjo/super-productivity/commit/7165cd6))
- **i18n:** add translations for worklog [#33](https://github.com/johannesjo/super-productivity/issues/33) ([1d866dd](https://github.com/johannesjo/super-productivity/commit/1d866dd))
- **i18n:** add variable extraction script [#33](https://github.com/johannesjo/super-productivity/issues/33) ([58cafa2](https://github.com/johannesjo/super-productivity/commit/58cafa2))
- **i18n:** fix formly again [#33](https://github.com/johannesjo/super-productivity/issues/33) ([f7834d0](https://github.com/johannesjo/super-productivity/commit/f7834d0))
- **i18n:** implement translation module [#33](https://github.com/johannesjo/super-productivity/issues/33) ([63b1dee](https://github.com/johannesjo/super-productivity/commit/63b1dee))
- **i18n:** make initial language selection work [#33](https://github.com/johannesjo/super-productivity/issues/33) ([46ae8fc](https://github.com/johannesjo/super-productivity/commit/46ae8fc))
- **i18n:** make language changes work for formly [#33](https://github.com/johannesjo/super-productivity/issues/33) ([fe61fcf](https://github.com/johannesjo/super-productivity/commit/fe61fcf))
- **i18n:** only auto switch for a couple of languages [#33](https://github.com/johannesjo/super-productivity/issues/33) ([160420b](https://github.com/johannesjo/super-productivity/commit/160420b))
- **i18n:** only change language on start when it exists [#33](https://github.com/johannesjo/super-productivity/issues/33) ([6f0c376](https://github.com/johannesjo/super-productivity/commit/6f0c376))
- **i18n:** split up jira help [#33](https://github.com/johannesjo/super-productivity/issues/33) ([0d81dfe](https://github.com/johannesjo/super-productivity/commit/0d81dfe))
- **i18n:** translate calendars [#33](https://github.com/johannesjo/super-productivity/issues/33) ([4754a2e](https://github.com/johannesjo/super-productivity/commit/4754a2e))
- **i18n:** update translations [#33](https://github.com/johannesjo/super-productivity/issues/33) ([8d74d19](https://github.com/johannesjo/super-productivity/commit/8d74d19))
- **i18n:** update translations [#33](https://github.com/johannesjo/super-productivity/issues/33) ([9e0dd35](https://github.com/johannesjo/super-productivity/commit/9e0dd35))
- **snack:** close on project change ([f300d17](https://github.com/johannesjo/super-productivity/commit/f300d17))
- **task:** add move to day and move to backlog buttons ([5f59c6d](https://github.com/johannesjo/super-productivity/commit/5f59c6d))

## [2.9.3](https://github.com/johannesjo/super-productivity/compare/v2.9.1...v2.9.3) (2019-07-11)

## [2.9.1](https://github.com/johannesjo/super-productivity/compare/v2.9.0...v2.9.1) (2019-07-11)

# [2.9.0](https://github.com/johannesjo/super-productivity/compare/v2.8.5...v2.9.0) (2019-07-10)

### Bug Fixes

- Issues regarding calculation of time spent per date ([e5ac323](https://github.com/johannesjo/super-productivity/commit/e5ac323))
- Use sum over task.timeSpentOnDay instead of task.timeSpent, because the latter is incorrect (intentionally?) ([1581136](https://github.com/johannesjo/super-productivity/commit/1581136))

### Features

- **task:** add menu for advanced actions ([8c6ff76](https://github.com/johannesjo/super-productivity/commit/8c6ff76))
- **task:** add move to other project [#184](https://github.com/johannesjo/super-productivity/issues/184) ([dcb546c](https://github.com/johannesjo/super-productivity/commit/dcb546c))
- **task:** add show notes button to hover controls ([ef29e9c](https://github.com/johannesjo/super-productivity/commit/ef29e9c))
- **task:** improve time estimate dialog by splitting up for other day ([cbf13ca](https://github.com/johannesjo/super-productivity/commit/cbf13ca))
- add webapp install prompt ([9b661dc](https://github.com/johannesjo/super-productivity/commit/9b661dc))
- implement configurable grouping of worklogs when exporting to csv ([4e8857d](https://github.com/johannesjo/super-productivity/commit/4e8857d))

## [2.8.5](https://github.com/johannesjo/super-productivity/compare/v2.8.4...v2.8.5) (2019-07-03)

### Bug Fixes

- possible matMenuTriggerFor error when clicking fast ([810b261](https://github.com/johannesjo/super-productivity/commit/810b261))

### Features

- add command line flag for pen drive usage [#192](https://github.com/johannesjo/super-productivity/issues/192) ([d9d51e6](https://github.com/johannesjo/super-productivity/commit/d9d51e6))
- disable error banner in favor of error modal ([386fb4b](https://github.com/johannesjo/super-productivity/commit/386fb4b))
- improve error handling ([c744857](https://github.com/johannesjo/super-productivity/commit/c744857))

## [2.8.4](https://github.com/johannesjo/super-productivity/compare/v2.8.3...v2.8.4) (2019-07-01)

### Bug Fixes

- error when addTaskBar is empty and enter is pressed ([c21f814](https://github.com/johannesjo/super-productivity/commit/c21f814))
- fix adding reminders not working when scheduled task panel is open ([f931e68](https://github.com/johannesjo/super-productivity/commit/f931e68))

### Features

- improve more buttons ([c207f00](https://github.com/johannesjo/super-productivity/commit/c207f00))

## [2.8.3](https://github.com/johannesjo/super-productivity/compare/v2.8.2...v2.8.3) (2019-06-30)

### Bug Fixes

- help section inside dialog ([830598f](https://github.com/johannesjo/super-productivity/commit/830598f))

## [2.8.2](https://github.com/johannesjo/super-productivity/compare/v2.8.1...v2.8.2) (2019-06-30)

### Bug Fixes

- remove double attachment button ([0953608](https://github.com/johannesjo/super-productivity/commit/0953608))

## [2.8.1](https://github.com/johannesjo/super-productivity/compare/v2.8.0...v2.8.1) (2019-06-30)

### Bug Fixes

- dialog edit bookmark invalid form submit ([924dd1f](https://github.com/johannesjo/super-productivity/commit/924dd1f))

### Features

- make all buttons uppercase ([54a6aee](https://github.com/johannesjo/super-productivity/commit/54a6aee))
- **ui:** add also italic font ([48ff060](https://github.com/johannesjo/super-productivity/commit/48ff060))
- **ui:** add roboto in all sizes ([8a26e8d](https://github.com/johannesjo/super-productivity/commit/8a26e8d))
- **ui:** give banners some love ([005c204](https://github.com/johannesjo/super-productivity/commit/005c204))
- **ui:** give buttons some love ([87a5123](https://github.com/johannesjo/super-productivity/commit/87a5123))
- **ui:** give dialogs some love ([1a26c87](https://github.com/johannesjo/super-productivity/commit/1a26c87))

# [2.8.0](https://github.com/johannesjo/super-productivity/compare/v2.7.8...v2.8.0) (2019-06-30)

### Bug Fixes

- **jira:** add worklog being to greedy ([c1d2d35](https://github.com/johannesjo/super-productivity/commit/c1d2d35))
- heading margins for markdown ([ed53d49](https://github.com/johannesjo/super-productivity/commit/ed53d49))
- **reminder:** not working as intended when starting task from other project ([2e08698](https://github.com/johannesjo/super-productivity/commit/2e08698))
- remove broken electron download for now ([9b5f86d](https://github.com/johannesjo/super-productivity/commit/9b5f86d))
- typing error ([638e5bd](https://github.com/johannesjo/super-productivity/commit/638e5bd))
- **repeatTasks:** upsert ([7981e63](https://github.com/johannesjo/super-productivity/commit/7981e63))
- **task:** unsetting current task when going to daily summary not working ([8309d4a](https://github.com/johannesjo/super-productivity/commit/8309d4a))

### Features

- **dailySummary:** add day completed model and execute on daily summary ([c6ecb53](https://github.com/johannesjo/super-productivity/commit/c6ecb53))
- **dailySummary:** add migration for lastCompletedDay ([626628e](https://github.com/johannesjo/super-productivity/commit/626628e))
- **dailySummary:** add option to disable reminder about forgotten finish day ([d456afe](https://github.com/johannesjo/super-productivity/commit/d456afe))
- **dailySummary:** always start on evaluation tab ([d071bd0](https://github.com/johannesjo/super-productivity/commit/d071bd0))
- **dailySummary:** dismiss finish day banner on project change ([1432389](https://github.com/johannesjo/super-productivity/commit/1432389))
- **dailySummary:** hide export task list for now when not today ([aae068d](https://github.com/johannesjo/super-productivity/commit/aae068d))
- **dailySummary:** show short message when there are no tasks ([2b1bd92](https://github.com/johannesjo/super-productivity/commit/2b1bd92))
- focus app on notification click ([7a01d17](https://github.com/johannesjo/super-productivity/commit/7a01d17))
- **dailySummary:** implement banner when user forgot to finish day ([081c8e6](https://github.com/johannesjo/super-productivity/commit/081c8e6))
- **dailySummary:** implement logic for page for other days ([eee2836](https://github.com/johannesjo/super-productivity/commit/eee2836))
- **dailySummary:** improve wording ([995c1f8](https://github.com/johannesjo/super-productivity/commit/995c1f8))
- **dailySummary:** make evaluation sheet work for other days and on project change ([aa8cbb4](https://github.com/johannesjo/super-productivity/commit/aa8cbb4))
- **dailySummary:** make google export time work for different days ([81e2115](https://github.com/johannesjo/super-productivity/commit/81e2115))
- **dailySummary:** make model work for different dates ([d3a7fe5](https://github.com/johannesjo/super-productivity/commit/d3a7fe5))
- **dailySummary:** make toggle done work from task summary table ([d74952e](https://github.com/johannesjo/super-productivity/commit/d74952e))
- **dailySummary:** prepare lastDayWorked model ([80916c0](https://github.com/johannesjo/super-productivity/commit/80916c0))
- **dailySummary:** prevent initial notification ([68885da](https://github.com/johannesjo/super-productivity/commit/68885da))
- **idle:** focus window on idle ([87026e7](https://github.com/johannesjo/super-productivity/commit/87026e7))
- **idle:** improve idle time dialog appearance ([ca7e8b5](https://github.com/johannesjo/super-productivity/commit/ca7e8b5))
- **idle:** show dialog also after lock screen on mac and windows ([b44e665](https://github.com/johannesjo/super-productivity/commit/b44e665))
- **repeatTask:** add deletion handlers ([4beb688](https://github.com/johannesjo/super-productivity/commit/4beb688))
- **repeatTask:** add indication to daily summary table ([fb39c1f](https://github.com/johannesjo/super-productivity/commit/fb39c1f))
- **repeatTask:** add repeatable tasks on project load ([141beea](https://github.com/johannesjo/super-productivity/commit/141beea))
- **repeatTask:** also rotate icon in menu ([a9c5609](https://github.com/johannesjo/super-productivity/commit/a9c5609))
- **repeatTask:** always mark archived tasks as done ([83a135a](https://github.com/johannesjo/super-productivity/commit/83a135a))
- **repeatTask:** disable edit reminder keyboard shortcut ([adeb94f](https://github.com/johannesjo/super-productivity/commit/adeb94f))
- **repeatTask:** disable task scheduling and deletion for repeatable tasks ([9fef229](https://github.com/johannesjo/super-productivity/commit/9fef229))
- **repeatTask:** don't add archive tasks again ([cf624aa](https://github.com/johannesjo/super-productivity/commit/cf624aa))
- **repeatTask:** improve adding repeatable tasks on project load ([ef9d6a1](https://github.com/johannesjo/super-productivity/commit/ef9d6a1))
- **repeatTask:** indicate in worklog ([9238af1](https://github.com/johannesjo/super-productivity/commit/9238af1))
- **repeatTask:** mark repeatable tasks as done and move to archive on finish day ([349f144](https://github.com/johannesjo/super-productivity/commit/349f144))
- **repeatTask:** remove reminders for archived tasks ([1ae0e0a](https://github.com/johannesjo/super-productivity/commit/1ae0e0a))
- **repeatTask:** remove reminders when adding repeatable config ([20ab3ee](https://github.com/johannesjo/super-productivity/commit/20ab3ee))
- **repeatTask:** use service functions in favor of selectors ([888c1a5](https://github.com/johannesjo/super-productivity/commit/888c1a5))
- **repeatTasks:** add boilerplate for modal ([e67bacb](https://github.com/johannesjo/super-productivity/commit/e67bacb))
- **repeatTasks:** add feature store and model ([5bcd372](https://github.com/johannesjo/super-productivity/commit/5bcd372))
- **repeatTasks:** add help section for repeating tasks ([f5f0f34](https://github.com/johannesjo/super-productivity/commit/f5f0f34))
- add progress to task bar icon ([19ed22c](https://github.com/johannesjo/super-productivity/commit/19ed22c))
- **repeatTasks:** add indication ([44e2fcf](https://github.com/johannesjo/super-productivity/commit/44e2fcf))
- **repeatTasks:** add ui for edit form ([63d7f1b](https://github.com/johannesjo/super-productivity/commit/63d7f1b))
- dismiss jira banner on project change ([4920dee](https://github.com/johannesjo/super-productivity/commit/4920dee))
- **repeatTasks:** don't restore focus ([df4e62b](https://github.com/johannesjo/super-productivity/commit/df4e62b))
- **repeatTasks:** make saving of repeat task config work ([a58feb3](https://github.com/johannesjo/super-productivity/commit/a58feb3))
- **scheduledTasks:** add most basic variant [#186](https://github.com/johannesjo/super-productivity/issues/186) ([954d978](https://github.com/johannesjo/super-productivity/commit/954d978))
- **scheduledTasks:** improve performance [#186](https://github.com/johannesjo/super-productivity/issues/186) ([0c6b0af](https://github.com/johannesjo/super-productivity/commit/0c6b0af))
- **scheduledTasks:** make starting tasks work [#186](https://github.com/johannesjo/super-productivity/issues/186) ([d8a238b](https://github.com/johannesjo/super-productivity/commit/d8a238b))
- **scheduledTasks:** only show from other projects when there are tasks [#186](https://github.com/johannesjo/super-productivity/issues/186) ([59e978a](https://github.com/johannesjo/super-productivity/commit/59e978a))
- **workView:** improve buttons ([7f916c4](https://github.com/johannesjo/super-productivity/commit/7f916c4))
- add info about desktop notifications [#191](https://github.com/johannesjo/super-productivity/issues/191) ([6bbbdbf](https://github.com/johannesjo/super-productivity/commit/6bbbdbf))
- add progress to task bar icon for pomodoro ([d2b153c](https://github.com/johannesjo/super-productivity/commit/d2b153c))
- improve check for related data being loaded ([2aaefd4](https://github.com/johannesjo/super-productivity/commit/2aaefd4))
- split up idle handling and break reminder into their own config blocks ([63a7630](https://github.com/johannesjo/super-productivity/commit/63a7630))

## [2.7.8](https://github.com/johannesjo/super-productivity/compare/v2.7.7...v2.7.8) (2019-06-10)

### Bug Fixes

- **jira:** cannot read property assignee of undefined ([0bee15a](https://github.com/johannesjo/super-productivity/commit/0bee15a))
- **jira:** duplicate worklog submission [#176](https://github.com/johannesjo/super-productivity/issues/176) ([a53c7c5](https://github.com/johannesjo/super-productivity/commit/a53c7c5))
- potential error for worklog ([df5e55f](https://github.com/johannesjo/super-productivity/commit/df5e55f))
- quick fix live update for global dark mode on mac os [#179](https://github.com/johannesjo/super-productivity/issues/179) ([d15b5ef](https://github.com/johannesjo/super-productivity/commit/d15b5ef))
- **jira:** issue selection for transition selection not working ([c21c4a1](https://github.com/johannesjo/super-productivity/commit/c21c4a1))

## [2.7.7](https://github.com/johannesjo/super-productivity/compare/v2.7.6...v2.7.7) (2019-06-04)

### Bug Fixes

- **metrics:** graphs continuously being redrawn if task is active ([f6d54c7](https://github.com/johannesjo/super-productivity/commit/f6d54c7))
- **procrastination:** work view throwing an error when navigating back to it ([04c7734](https://github.com/johannesjo/super-productivity/commit/04c7734))

### Features

- **procrastination:** improve styling for split it up ([b65e924](https://github.com/johannesjo/super-productivity/commit/b65e924))

## [2.7.6](https://github.com/johannesjo/super-productivity/compare/v2.7.4...v2.7.6) (2019-06-03)

### Bug Fixes

- **procrastination:** typo ([a8db6fe](https://github.com/johannesjo/super-productivity/commit/a8db6fe))
- build ([bd43079](https://github.com/johannesjo/super-productivity/commit/bd43079))

### Features

- add new productivity tip ([a8c84f2](https://github.com/johannesjo/super-productivity/commit/a8c84f2))
- **procrastination:** add first most simple text based version ([783e714](https://github.com/johannesjo/super-productivity/commit/783e714))
- **procrastination:** add inputs ([842cdbe](https://github.com/johannesjo/super-productivity/commit/842cdbe))
- **procrastination:** add to main nav for mobile ([4bbcee0](https://github.com/johannesjo/super-productivity/commit/4bbcee0))
- **procrastination:** hide for mobile ([3e5f829](https://github.com/johannesjo/super-productivity/commit/3e5f829))
- **procrastination:** improve text ([582b350](https://github.com/johannesjo/super-productivity/commit/582b350))
- **procrastination:** polish ([e36b937](https://github.com/johannesjo/super-productivity/commit/e36b937))

## [2.7.5](https://github.com/johannesjo/super-productivity/compare/v2.7.4...v2.7.5) (2019-06-03)

### Features

- add new productivity tip ([a8c84f2](https://github.com/johannesjo/super-productivity/commit/a8c84f2))
- **procrastination:** add first most simple text based version ([783e714](https://github.com/johannesjo/super-productivity/commit/783e714))
- **procrastination:** add inputs ([842cdbe](https://github.com/johannesjo/super-productivity/commit/842cdbe))
- **procrastination:** polish ([e36b937](https://github.com/johannesjo/super-productivity/commit/e36b937))

## [2.7.4](https://github.com/johannesjo/super-productivity/compare/v2.7.3...v2.7.4) (2019-06-02)

### Bug Fixes

- **jira:** change default config ([1ae4464](https://github.com/johannesjo/super-productivity/commit/1ae4464))
- **jira:** not parsing host without protocol correctly ([240a943](https://github.com/johannesjo/super-productivity/commit/240a943))
- **jira:** wrong regex ([5e2262a](https://github.com/johannesjo/super-productivity/commit/5e2262a))
- **project:** git config dialog ([d965809](https://github.com/johannesjo/super-productivity/commit/d965809))

### Features

- **jira:** ignore shutout when testing connection ([58b1a94](https://github.com/johannesjo/super-productivity/commit/58b1a94))

## [2.7.3](https://github.com/johannesjo/super-productivity/compare/v2.7.2...v2.7.3) (2019-06-01)

### Bug Fixes

- **config:** add missing detect changes ([38dd406](https://github.com/johannesjo/super-productivity/commit/38dd406))
- **electron:** make single instance work again ([4075ff7](https://github.com/johannesjo/super-productivity/commit/4075ff7))
- **project:** updating theme not working while tracking time ([7d405ee](https://github.com/johannesjo/super-productivity/commit/7d405ee))
- formly model not updating ([69021d9](https://github.com/johannesjo/super-productivity/commit/69021d9))
- formly model not updating ([e222b2b](https://github.com/johannesjo/super-productivity/commit/e222b2b))
- formly model still messing up ([0710fc1](https://github.com/johannesjo/super-productivity/commit/0710fc1))
- improvement banner throwing an error ([0be197e](https://github.com/johannesjo/super-productivity/commit/0be197e))

### Features

- **git:** add validation for repository string ([d6c5d13](https://github.com/johannesjo/super-productivity/commit/d6c5d13))
- **jira:** add validation for host [#174](https://github.com/johannesjo/super-productivity/issues/174) ([8202d25](https://github.com/johannesjo/super-productivity/commit/8202d25))
- **jira:** allow invalid certificates for jira requests ([23649b5](https://github.com/johannesjo/super-productivity/commit/23649b5))
- add better date time input ([5bbdef3](https://github.com/johannesjo/super-productivity/commit/5bbdef3))
- **takeABreak:** count "I already did" as 5 minute break ([018f611](https://github.com/johannesjo/super-productivity/commit/018f611))
- add little animation for metrics ([6935713](https://github.com/johannesjo/super-productivity/commit/6935713))
- **tasks:** add story point badge for jira tasks ([6b83546](https://github.com/johannesjo/super-productivity/commit/6b83546))
- improve config page styling ([ad599d2](https://github.com/johannesjo/super-productivity/commit/ad599d2))
- improve full page spinner ([cb9c011](https://github.com/johannesjo/super-productivity/commit/cb9c011))
- improve page transition to worklog ([cb884cf](https://github.com/johannesjo/super-productivity/commit/cb884cf))
- turn on global immutability for ngx formly ([e23cd2d](https://github.com/johannesjo/super-productivity/commit/e23cd2d))
- **ui:** improve datetime picker ([0872f99](https://github.com/johannesjo/super-productivity/commit/0872f99))

## [2.7.2](https://github.com/johannesjo/super-productivity/compare/v2.7.1...v2.7.2) (2019-05-27)

### Bug Fixes

- **metrics:** charts not all showing up ([ef88971](https://github.com/johannesjo/super-productivity/commit/ef88971))

### Features

- go to next tab on evaluation save ([5128e8c](https://github.com/johannesjo/super-productivity/commit/5128e8c))
- make header just a little smaller ([b06643a](https://github.com/johannesjo/super-productivity/commit/b06643a))

## [2.7.1](https://github.com/johannesjo/super-productivity/compare/v2.7.0...v2.7.1) (2019-05-25)

### Features

- add new file import button to file imex ([fb722f8](https://github.com/johannesjo/super-productivity/commit/fb722f8))
- make help button a little bit more subtle ([bba943f](https://github.com/johannesjo/super-productivity/commit/bba943f))
- use help section for google export time too ([c126fef](https://github.com/johannesjo/super-productivity/commit/c126fef))
- **metrics:** make theme work better for chartjs ([92a6ad3](https://github.com/johannesjo/super-productivity/commit/92a6ad3))

# [2.7.0](https://github.com/johannesjo/super-productivity/compare/v2.6.3...v2.7.0) (2019-05-25)

### Bug Fixes

- **metrics:** broken reference ([c37ba5a](https://github.com/johannesjo/super-productivity/commit/c37ba5a))
- **metrics:** don't add improvements/obstructions with the same name ([62ac09c](https://github.com/johannesjo/super-productivity/commit/62ac09c))
- **metrics:** error when navigation to evaluation sheet ([4f7599d](https://github.com/johannesjo/super-productivity/commit/4f7599d))
- **metrics:** last metric selection being wrong ([a2a6df2](https://github.com/johannesjo/super-productivity/commit/a2a6df2))
- **metrics:** not loading data when starting on route ([263ff7b](https://github.com/johannesjo/super-productivity/commit/263ff7b))
- chip list input throwing errors when suggestions are not ready ([b9ec9fc](https://github.com/johannesjo/super-productivity/commit/b9ec9fc))
- form fields being to small ([afda5e2](https://github.com/johannesjo/super-productivity/commit/afda5e2))
- global error handler ([e119055](https://github.com/johannesjo/super-productivity/commit/e119055))
- projects not being saved to the right model ([d955ce4](https://github.com/johannesjo/super-productivity/commit/d955ce4))

### Features

- **metrics:** sort chip suggestions alphabetically ([97dff1e](https://github.com/johannesjo/super-productivity/commit/97dff1e))
- display version number on settings page [#170](https://github.com/johannesjo/super-productivity/issues/170) ([30120ef](https://github.com/johannesjo/super-productivity/commit/30120ef))
- **idle:** add break number to daily summary ([495a1b2](https://github.com/johannesjo/super-productivity/commit/495a1b2))
- **idle:** add break time to daily planner ([69471b6](https://github.com/johannesjo/super-productivity/commit/69471b6))
- **idle:** improve dialog ([94a6e4e](https://github.com/johannesjo/super-productivity/commit/94a6e4e))
- **idle:** track break time too ([cd94c91](https://github.com/johannesjo/super-productivity/commit/cd94c91))
- **metric:** add break time and break nr ([cd088d8](https://github.com/johannesjo/super-productivity/commit/cd088d8))
- **metrics:** add all the boilerplate ([91c41b9](https://github.com/johannesjo/super-productivity/commit/91c41b9))
- **metrics:** add average tasks per day worked ([fa2fd9f](https://github.com/johannesjo/super-productivity/commit/fa2fd9f))
- **metrics:** add basic metrics ([6cc3cc1](https://github.com/johannesjo/super-productivity/commit/6cc3cc1))
- **metrics:** add boilerplate and outline evaluation questions ([fc2f2a8](https://github.com/johannesjo/super-productivity/commit/fc2f2a8))
- **metrics:** add boilerplate for project metrics ([9dbfd8e](https://github.com/johannesjo/super-productivity/commit/9dbfd8e))
- **metrics:** add chip list input component ([373ff78](https://github.com/johannesjo/super-productivity/commit/373ff78))
- **metrics:** add correct link to evaluation sheet ([3fea8a0](https://github.com/johannesjo/super-productivity/commit/3fea8a0))
- **metrics:** add delete multiple for obstructions and improvements ([06291e0](https://github.com/johannesjo/super-productivity/commit/06291e0))
- **metrics:** add line chart for mood and productivity over time ([b131c23](https://github.com/johannesjo/super-productivity/commit/b131c23))
- **metrics:** add note input for evaluation form ([97b028b](https://github.com/johannesjo/super-productivity/commit/97b028b))
- **metrics:** add outline for basic model ([5365c09](https://github.com/johannesjo/super-productivity/commit/5365c09))
- **metrics:** add remove for improvement bar ([bbc993e](https://github.com/johannesjo/super-productivity/commit/bbc993e))
- **metrics:** add saving improvements ([7d28262](https://github.com/johannesjo/super-productivity/commit/7d28262))
- **metrics:** add saving metrics ([55e760d](https://github.com/johannesjo/super-productivity/commit/55e760d))
- **metrics:** add saving obstructions ([3e4bc8f](https://github.com/johannesjo/super-productivity/commit/3e4bc8f))
- **metrics:** add simple charts for improvements and obstructions ([c84ff05](https://github.com/johannesjo/super-productivity/commit/c84ff05))
- **metrics:** add to mobile menu ([6d91e6e](https://github.com/johannesjo/super-productivity/commit/6d91e6e))
- **metrics:** add toast for saving metric ([53fca8c](https://github.com/johannesjo/super-productivity/commit/53fca8c))
- **metrics:** add ui for improvement bar ([76dc04f](https://github.com/johannesjo/super-productivity/commit/76dc04f))
- **metrics:** add validation to evaluation form ([6dd5e51](https://github.com/johannesjo/super-productivity/commit/6dd5e51))
- **metrics:** allow hiding improvements ([d80c696](https://github.com/johannesjo/super-productivity/commit/d80c696))
- **metrics:** change help section color to primary ([9f8d95c](https://github.com/johannesjo/super-productivity/commit/9f8d95c))
- **metrics:** display improvements from yesterday ([87dc75d](https://github.com/johannesjo/super-productivity/commit/87dc75d))
- **metrics:** dummy data generator ([46302d4](https://github.com/johannesjo/super-productivity/commit/46302d4))
- **metrics:** improve dummy metric generation ([3a79ab4](https://github.com/johannesjo/super-productivity/commit/3a79ab4))
- **metrics:** improve evaluation form ([5e13c2f](https://github.com/johannesjo/super-productivity/commit/5e13c2f))
- **metrics:** improve evaluation sheet ([4e13133](https://github.com/johannesjo/super-productivity/commit/4e13133))
- **metrics:** improve evaluation sheet ([6675978](https://github.com/johannesjo/super-productivity/commit/6675978))
- **metrics:** improve pie charts ([8ab1a74](https://github.com/johannesjo/super-productivity/commit/8ab1a74))
- **metrics:** load evaluation sheet data for today if already saved ([8cb3a11](https://github.com/johannesjo/super-productivity/commit/8cb3a11))
- **metrics:** make form completely template driven ([f0cb22c](https://github.com/johannesjo/super-productivity/commit/f0cb22c))
- **metrics:** make obstructions and improvements a global model ([c4311e6](https://github.com/johannesjo/super-productivity/commit/c4311e6))
- **metrics:** remove unused obstructions and improvements on metric save ([0fdaf8d](https://github.com/johannesjo/super-productivity/commit/0fdaf8d))
- **metrics:** show only 20 days for productivity happiness ([23fe4a3](https://github.com/johannesjo/super-productivity/commit/23fe4a3))
- **metrics:** show placeholder when there is no metrics data available ([ef76a1d](https://github.com/johannesjo/super-productivity/commit/ef76a1d))
- **project:** add export of single project ([faabf3b](https://github.com/johannesjo/super-productivity/commit/faabf3b))
- **project:** add import of exported projects ([0f03f4a](https://github.com/johannesjo/super-productivity/commit/0f03f4a))
- **project:** add missing fields to model ([29cc5c8](https://github.com/johannesjo/super-productivity/commit/29cc5c8))
- improve export data ([6ee2611](https://github.com/johannesjo/super-productivity/commit/6ee2611))
- link to changelog [#170](https://github.com/johannesjo/super-productivity/issues/170) ([d297931](https://github.com/johannesjo/super-productivity/commit/d297931))
- use mac osx dark mode for theming [#169](https://github.com/johannesjo/super-productivity/issues/169) ([8b49f37](https://github.com/johannesjo/super-productivity/commit/8b49f37))
- **project:** prepare import of project ([ad6f25a](https://github.com/johannesjo/super-productivity/commit/ad6f25a))

## [2.6.3](https://github.com/johannesjo/super-productivity/compare/v2.6.2...v2.6.3) (2019-05-10)

### Bug Fixes

- broken linux by downgrading electron [#167](https://github.com/johannesjo/super-productivity/issues/167) ([dd395d9](https://github.com/johannesjo/super-productivity/commit/dd395d9))
- **tasks:** avoid error for no project ([f8d546e](https://github.com/johannesjo/super-productivity/commit/f8d546e))
- **worklog:** styling error ([8e19fdd](https://github.com/johannesjo/super-productivity/commit/8e19fdd))
- styling for dialog time estimate ([a2d8028](https://github.com/johannesjo/super-productivity/commit/a2d8028))

## [2.6.2](https://github.com/johannesjo/super-productivity/compare/v2.6.1...v2.6.2) (2019-05-09)

### Bug Fixes

- **git:** config not updating ([aa6ce51](https://github.com/johannesjo/super-productivity/commit/aa6ce51))

### Features

- **jira:** link issue summary to issue ([2ce3f3b](https://github.com/johannesjo/super-productivity/commit/2ce3f3b))
- improve styling for issue data tables ([f18675b](https://github.com/johannesjo/super-productivity/commit/f18675b))
- **attachments:** show path if there is no title for links ([b6beed9](https://github.com/johannesjo/super-productivity/commit/b6beed9))
- **jira:** allow for saving story points custom field id ([f408e73](https://github.com/johannesjo/super-productivity/commit/f408e73))
- **jira:** display story points ([109fb76](https://github.com/johannesjo/super-productivity/commit/109fb76))
- **jira:** only display available data ([babb049](https://github.com/johannesjo/super-productivity/commit/babb049))

## [2.6.1](https://github.com/johannesjo/super-productivity/compare/v2.6.0...v2.6.1) (2019-05-03)

### Bug Fixes

- **projectArchive:** data import not set up correctly ([16010ac](https://github.com/johannesjo/super-productivity/commit/16010ac))
- **projectArchive:** typing ([f6f3a1f](https://github.com/johannesjo/super-productivity/commit/f6f3a1f))
- external links not opening for mac ([291e7e2](https://github.com/johannesjo/super-productivity/commit/291e7e2))
- typing issue ([fac656e](https://github.com/johannesjo/super-productivity/commit/fac656e))
- typing issue ([7382ae3](https://github.com/johannesjo/super-productivity/commit/7382ae3))

### Features

- **googleDriveSync:** allow for compression ([dec7e1e](https://github.com/johannesjo/super-productivity/commit/dec7e1e))
- **project:** improve overview styling ([518597e](https://github.com/johannesjo/super-productivity/commit/518597e))
- **projectArchive:** add simple compression service ([ee67ec0](https://github.com/johannesjo/super-productivity/commit/ee67ec0))
- **projectArchive:** add to sync model ([6f3b8be](https://github.com/johannesjo/super-productivity/commit/6f3b8be))
- **projectArchive:** handle compression via web worker to improve speed ([715dc18](https://github.com/johannesjo/super-productivity/commit/715dc18))
- add fallback driver for database ([58929c7](https://github.com/johannesjo/super-productivity/commit/58929c7))
- clear database when syncing ([19610be](https://github.com/johannesjo/super-productivity/commit/19610be))
- improve file imex ([2ee3dd0](https://github.com/johannesjo/super-productivity/commit/2ee3dd0))
- improve issue content styling ([7eeb28f](https://github.com/johannesjo/super-productivity/commit/7eeb28f))

# [2.6.0](https://github.com/johannesjo/super-productivity/compare/v2.5.9...v2.6.0) (2019-04-18)

### Features

- **archiveProjects:** enable unarchiving [#104](https://github.com/johannesjo/super-productivity/issues/104) ([73b98f6](https://github.com/johannesjo/super-productivity/commit/73b98f6))
- **archiveProjects:** make basic archiving possible [#104](https://github.com/johannesjo/super-productivity/issues/104) ([4f01a3b](https://github.com/johannesjo/super-productivity/commit/4f01a3b))
- **archiveProjects:** remove all reminders for archived project [#104](https://github.com/johannesjo/super-productivity/issues/104) ([6006483](https://github.com/johannesjo/super-productivity/commit/6006483))
- **project:** remove all related data on deletion ([a60612b](https://github.com/johannesjo/super-productivity/commit/a60612b))

## [2.5.9](https://github.com/johannesjo/super-productivity/compare/v2.5.8...v2.5.9) (2019-04-18)

### Bug Fixes

- issue table being broken when using pre with log text ([435babd](https://github.com/johannesjo/super-productivity/commit/435babd))

### Features

- add button to edit start/end time ([7844da1](https://github.com/johannesjo/super-productivity/commit/7844da1))
- add global keyboard shortcut to start/pause last task [#155](https://github.com/johannesjo/super-productivity/issues/155) ([2abf02e](https://github.com/johannesjo/super-productivity/commit/2abf02e))
- add round time spent button to daily summary ([f969288](https://github.com/johannesjo/super-productivity/commit/f969288))
- add start/end to daily summary ([50e2c52](https://github.com/johannesjo/super-productivity/commit/50e2c52))
- allow inline edit for worklog week ([429fc31](https://github.com/johannesjo/super-productivity/commit/429fc31))
- allow registration of multiple global shortcuts [#155](https://github.com/johannesjo/super-productivity/issues/155) ([230e0d3](https://github.com/johannesjo/super-productivity/commit/230e0d3))
- allow to edit start and end work time from daily summary ([e1e827b](https://github.com/johannesjo/super-productivity/commit/e1e827b))
- don't allow editing parent task time spent for daily summary ([0e8f159](https://github.com/johannesjo/super-productivity/commit/0e8f159))
- get rid off edit icon for inline edit ([e98038a](https://github.com/johannesjo/super-productivity/commit/e98038a))
- improve inline input ([27dd0dd](https://github.com/johannesjo/super-productivity/commit/27dd0dd))
- make code smaller inside markdown ([f6efffa](https://github.com/johannesjo/super-productivity/commit/f6efffa))
- make inline edit work as duration input ([5598592](https://github.com/johannesjo/super-productivity/commit/5598592))
- **worklog:** make editing time spent for day work ([873f6a6](https://github.com/johannesjo/super-productivity/commit/873f6a6))
- make inline edit work for start and end time ([64329e3](https://github.com/johannesjo/super-productivity/commit/64329e3))
- make inline edit work for task time spent ([29d57f3](https://github.com/johannesjo/super-productivity/commit/29d57f3))
- only show done tasks or those worked on today for daily summary today list ([9a34f0e](https://github.com/johannesjo/super-productivity/commit/9a34f0e))
- remove auto selection of text for inline input ([8fcfa5b](https://github.com/johannesjo/super-productivity/commit/8fcfa5b))
- remove modal for start/end time ([97a2af8](https://github.com/johannesjo/super-productivity/commit/97a2af8))

## [2.5.8](https://github.com/johannesjo/super-productivity/compare/v2.5.7...v2.5.8) (2019-03-22)

### Bug Fixes

- **worklog:** export for parent titles not containing tasks without sub tasks ([b67b920](https://github.com/johannesjo/super-productivity/commit/b67b920))
- idle time causing issues with snap package [#154](https://github.com/johannesjo/super-productivity/issues/154) ([bd0a514](https://github.com/johannesjo/super-productivity/commit/bd0a514))

## [2.5.7](https://github.com/johannesjo/super-productivity/compare/v2.5.6...v2.5.7) (2019-03-20)

### Features

- **jira:** improve error logging ([9c75e6e](https://github.com/johannesjo/super-productivity/commit/9c75e6e))
- **performance:** add missing track by statements ([1771369](https://github.com/johannesjo/super-productivity/commit/1771369))
- **snacks:** shorten snacks ([d7647a2](https://github.com/johannesjo/super-productivity/commit/d7647a2))
- **tasks:** improve focus styles ([e1686af](https://github.com/johannesjo/super-productivity/commit/e1686af))
- **tasks:** only auto select first value when very short search term ([5527ad6](https://github.com/johannesjo/super-productivity/commit/5527ad6))

## [2.5.6](https://github.com/johannesjo/super-productivity/compare/v2.5.5...v2.5.6) (2019-03-17)

### Bug Fixes

- **addTaskBar:** selecting by click not working ([9fcefe3](https://github.com/johannesjo/super-productivity/commit/9fcefe3))
- **jira:** add missing reject for jira requests ([4ec6509](https://github.com/johannesjo/super-productivity/commit/4ec6509))
- **jira:** extension error not showing up ([87a3397](https://github.com/johannesjo/super-productivity/commit/87a3397))
- **jira:** typing error ([8a26f47](https://github.com/johannesjo/super-productivity/commit/8a26f47))
- typing ([e6ddaf4](https://github.com/johannesjo/super-productivity/commit/e6ddaf4))

### Features

- **attachments:** add fallback when unable to load images ([57ce69d](https://github.com/johannesjo/super-productivity/commit/57ce69d))
- **jira:** improve issue search ([8d1c51d](https://github.com/johannesjo/super-productivity/commit/8d1c51d))
- **jira:** parse jira markdown for headings ([eefb1d9](https://github.com/johannesjo/super-productivity/commit/eefb1d9))
- **jira:** show error message to the user when there are insufficient settings ([ffc51b4](https://github.com/johannesjo/super-productivity/commit/ffc51b4))
- **projects:** improve project overview styling ([956c352](https://github.com/johannesjo/super-productivity/commit/956c352))
- make markdown headings a little less intense ([8919d1f](https://github.com/johannesjo/super-productivity/commit/8919d1f))
- show backdrop right away for enlarge image ([daf3344](https://github.com/johannesjo/super-productivity/commit/daf3344))
- switch icons for imex ([b034382](https://github.com/johannesjo/super-productivity/commit/b034382))

## [2.5.5](https://github.com/johannesjo/super-productivity/compare/v2.5.4...v2.5.5) (2019-03-16)

### Bug Fixes

- **electron:** default window settings being messy ([ba95be7](https://github.com/johannesjo/super-productivity/commit/ba95be7))
- **git:** only poll to backlog when there was an update ([441f906](https://github.com/johannesjo/super-productivity/commit/441f906))
- **task:** additional info styling for electron build ([55a833c](https://github.com/johannesjo/super-productivity/commit/55a833c))

### Features

- adjust icon positions ([9a0b1f7](https://github.com/johannesjo/super-productivity/commit/9a0b1f7))
- **jira:** make attachments work for electron version ([2e35882](https://github.com/johannesjo/super-productivity/commit/2e35882))
- **jira:** update issue right away from api when adding ([e692ca7](https://github.com/johannesjo/super-productivity/commit/e692ca7))
- **jira:** update task title if it was updated for jira ([cc06151](https://github.com/johannesjo/super-productivity/commit/cc06151))
- change wording ([84f79a3](https://github.com/johannesjo/super-productivity/commit/84f79a3))
- **projects:** add project color to overview ([3c9dc36](https://github.com/johannesjo/super-productivity/commit/3c9dc36))
- **projects:** add ui for sorting projects ([d3fef24](https://github.com/johannesjo/super-productivity/commit/d3fef24))
- **projects:** improve add project dialog ([ef9edd2](https://github.com/johannesjo/super-productivity/commit/ef9edd2))
- **projects:** improve styling for project overview ([9541bb2](https://github.com/johannesjo/super-productivity/commit/9541bb2))
- **projects:** make projects sortable ([0fa3de8](https://github.com/johannesjo/super-productivity/commit/0fa3de8))
- **worklog:** remove animation as it sucks ([ee965fa](https://github.com/johannesjo/super-productivity/commit/ee965fa))
- **worklog:** reverse week order for mobile ([d685607](https://github.com/johannesjo/super-productivity/commit/d685607))

## [2.5.4](https://github.com/johannesjo/super-productivity/compare/v2.5.3...v2.5.4) (2019-03-14)

### Bug Fixes

- **reminders:** breaking app ([1a75044](https://github.com/johannesjo/super-productivity/commit/1a75044))
- **reminders:** only show reminder when note data still exists otherwise remove ([4120813](https://github.com/johannesjo/super-productivity/commit/4120813))
- **reminders:** only show reminder when task data still exists otherwise remove ([f6e30ae](https://github.com/johannesjo/super-productivity/commit/f6e30ae))
- **worklog:** not exporting the right tasks and simplify ([5286a8b](https://github.com/johannesjo/super-productivity/commit/5286a8b))
- typing ([2cbe056](https://github.com/johannesjo/super-productivity/commit/2cbe056))

### Features

- **progressBar:** improve styling ([becece7](https://github.com/johannesjo/super-productivity/commit/becece7))

## [2.5.3](https://github.com/johannesjo/super-productivity/compare/v2.5.2...v2.5.3) (2019-03-12)

### Bug Fixes

- **worklog:** prevent constant re-render of worklog ([db6c2af](https://github.com/johannesjo/super-productivity/commit/db6c2af))
- **worklog:** prevent constant re-render of worklog week week ([ba3ecb2](https://github.com/johannesjo/super-productivity/commit/ba3ecb2))

### Features

- **bookmarks:** show bookmark target on hover ([985e522](https://github.com/johannesjo/super-productivity/commit/985e522))
- **takeABreak:** prevent take a break from replopping ([4344647](https://github.com/johannesjo/super-productivity/commit/4344647))
- **worklog:** add ripple for all heading table cols ([45e8556](https://github.com/johannesjo/super-productivity/commit/45e8556))
- **worklog:** add ripple for worklog week header ([40727a2](https://github.com/johannesjo/super-productivity/commit/40727a2))
- **worklog:** improve styling for worklog week ([19724ed](https://github.com/johannesjo/super-productivity/commit/19724ed))

## [2.5.2](https://github.com/johannesjo/super-productivity/compare/v2.5.1...v2.5.2) (2019-03-11)

### Bug Fixes

- global shortcut not registering [#152](https://github.com/johannesjo/super-productivity/issues/152) ([043bb44](https://github.com/johannesjo/super-productivity/commit/043bb44))

## [2.5.1](https://github.com/johannesjo/super-productivity/compare/v2.5.0...v2.5.1) (2019-03-10)

### Bug Fixes

- **googleDriveSync:** don't open multiple dialogs of the same type ([c6811e4](https://github.com/johannesjo/super-productivity/commit/c6811e4))
- **pomodoro:** break end sound not playing at break [#138](https://github.com/johannesjo/super-productivity/issues/138) ([4588fe7](https://github.com/johannesjo/super-productivity/commit/4588fe7))

# [2.5.0](https://github.com/johannesjo/super-productivity/compare/v2.4.7...v2.5.0) (2019-03-08)

### Bug Fixes

- **idle:** isIdle not being reset after dialog is closed ([51d5813](https://github.com/johannesjo/super-productivity/commit/51d5813))
- **worklog:** remove left over option ([f6e958c](https://github.com/johannesjo/super-productivity/commit/f6e958c))

### Features

- **dailySummary:** add week summary ([a88e93e](https://github.com/johannesjo/super-productivity/commit/a88e93e))
- **dailySummary:** improve styling ([0bb5a03](https://github.com/johannesjo/super-productivity/commit/0bb5a03))
- **dailySummary:** improve styling ([57a5ad2](https://github.com/johannesjo/super-productivity/commit/57a5ad2))
- **worklog:** add animation to worklog ([36d8182](https://github.com/johannesjo/super-productivity/commit/36d8182))
- **worklog:** add day start and end to worklog week ([aa4380f](https://github.com/johannesjo/super-productivity/commit/aa4380f))
- **worklog:** add export button to worklog week ([b8c2018](https://github.com/johannesjo/super-productivity/commit/b8c2018))
- **worklog:** add inline task tables again ([2532dbc](https://github.com/johannesjo/super-productivity/commit/2532dbc))
- **worklog:** add modal for task summary ([78b8369](https://github.com/johannesjo/super-productivity/commit/78b8369))
- **worklog:** add more info for worklog week days ([13f06d3](https://github.com/johannesjo/super-productivity/commit/13f06d3))
- **worklog:** allow for html separator ([9419205](https://github.com/johannesjo/super-productivity/commit/9419205))
- **worklog:** beautify ui ([960338d](https://github.com/johannesjo/super-productivity/commit/960338d))
- **worklog:** improve export worklog styling for mobile ([0fe7ca2](https://github.com/johannesjo/super-productivity/commit/0fe7ca2))
- **worklog:** improve hover and expanded styles for weeks ([73ce1d9](https://github.com/johannesjo/super-productivity/commit/73ce1d9))
- **worklog:** improve styling for worklog export ([1ffc129](https://github.com/johannesjo/super-productivity/commit/1ffc129))
- **worklog:** improve task table styles ([323ed35](https://github.com/johannesjo/super-productivity/commit/323ed35))
- **worklog:** improve worklog week table styling ([97650fe](https://github.com/johannesjo/super-productivity/commit/97650fe))
- **worklog:** make restore tasks work again ([ae787de](https://github.com/johannesjo/super-productivity/commit/ae787de))
- **worklog:** make week table a little smaller ([5b61555](https://github.com/johannesjo/super-productivity/commit/5b61555))
- **worklog:** make worklog week days collapsable ([716b60d](https://github.com/johannesjo/super-productivity/commit/716b60d))
- **worklog:** minor styling improvement ([73a2158](https://github.com/johannesjo/super-productivity/commit/73a2158))
- **worklog:** split up into weeks ([55eb690](https://github.com/johannesjo/super-productivity/commit/55eb690))

## [2.4.7](https://github.com/johannesjo/super-productivity/compare/v2.4.6...v2.4.7) (2019-03-05)

### Bug Fixes

- **notes:** add missing unsubscribe ([83cbe57](https://github.com/johannesjo/super-productivity/commit/83cbe57))
- **project:** not setting workStart correctly ([ae04f61](https://github.com/johannesjo/super-productivity/commit/ae04f61))

### Features

- **dailySummary:** add time estimated for tasks worked on today ([e18fb1b](https://github.com/johannesjo/super-productivity/commit/e18fb1b))
- **dailySummary:** improve google export time styling ([b079311](https://github.com/johannesjo/super-productivity/commit/b079311))
- **dailySummary:** improve google export time styling even more ([c772730](https://github.com/johannesjo/super-productivity/commit/c772730))
- **dailySummary:** improve task table ([facd2fb](https://github.com/johannesjo/super-productivity/commit/facd2fb))
- **reminder:** only open reminders if there are no other dialogs open ([507a713](https://github.com/johannesjo/super-productivity/commit/507a713))

## [2.4.6](https://github.com/johannesjo/super-productivity/compare/v2.4.5...v2.4.6) (2019-03-03)

### Bug Fixes

- **worklogExport:** sub and parent task titles not being shown as intended ([d5f311f](https://github.com/johannesjo/super-productivity/commit/d5f311f))
- typing error ([5e40a94](https://github.com/johannesjo/super-productivity/commit/5e40a94))

### Features

- **project:** properly save work start and end times ([2642f40](https://github.com/johannesjo/super-productivity/commit/2642f40))
- **worklogExport:** add back in persistence ([0ad2029](https://github.com/johannesjo/super-productivity/commit/0ad2029))
- **worklogExport:** add first outline of column controls ([6da77bb](https://github.com/johannesjo/super-productivity/commit/6da77bb))
- **worklogExport:** add start and end time formatting ([c654c8a](https://github.com/johannesjo/super-productivity/commit/c654c8a))
- **worklogExport:** make add and remove cols work ([f3e5ef8](https://github.com/johannesjo/super-productivity/commit/f3e5ef8))
- **worklogExport:** make csv export and clipboard work ([4e9f14a](https://github.com/johannesjo/super-productivity/commit/4e9f14a))
- **worklogExport:** make most simple variant of new worklog work ([72018f0](https://github.com/johannesjo/super-productivity/commit/72018f0))
- **worklogExport:** wrap options into collapsible ([36074e0](https://github.com/johannesjo/super-productivity/commit/36074e0))

## [2.4.5](https://github.com/johannesjo/super-productivity/compare/v2.4.4...v2.4.5) (2019-03-03)

### Bug Fixes

- **timeExport:** always use defaults for separator strings ([a0edd2e](https://github.com/johannesjo/super-productivity/commit/a0edd2e))
- **timeExport:** clipboard button not working ([2b2c1d5](https://github.com/johannesjo/super-productivity/commit/2b2c1d5))
- **timeExport:** task list export for daily summary ([ac927db](https://github.com/johannesjo/super-productivity/commit/ac927db))

### Features

- **timeExport:** always use merge into days for worklog export ([98108ad](https://github.com/johannesjo/super-productivity/commit/98108ad))

## [2.4.4](https://github.com/johannesjo/super-productivity/compare/v2.4.3...v2.4.4) (2019-03-02)

### Bug Fixes

- **notes:** add reminder dialog typing error ([a55fa34](https://github.com/johannesjo/super-productivity/commit/a55fa34))
- **reminders:** not updating any more ([4118dac](https://github.com/johannesjo/super-productivity/commit/4118dac))
- **taskExport:** wrong values being send to component ([3d8bda2](https://github.com/johannesjo/super-productivity/commit/3d8bda2))

### Features

- **projects:** sort alphabetically ([404375a](https://github.com/johannesjo/super-productivity/commit/404375a))
- **reminders:** close all reminder dialogs when data was imported ([66cbbe0](https://github.com/johannesjo/super-productivity/commit/66cbbe0))
- **reminders:** do not open up reminders when data import is in progress ([7c9a9de](https://github.com/johannesjo/super-productivity/commit/7c9a9de))
- **taskExport:** add export for weeks ([01296df](https://github.com/johannesjo/super-productivity/commit/01296df))
- **taskExport:** add get weeks in month helper ([9ce6332](https://github.com/johannesjo/super-productivity/commit/9ce6332))
- **taskExport:** add html table ([0cd7b82](https://github.com/johannesjo/super-productivity/commit/0cd7b82))
- **taskExport:** add round to option ([ee4b844](https://github.com/johannesjo/super-productivity/commit/ee4b844))
- **taskExport:** add table headers ([0f10ebe](https://github.com/johannesjo/super-productivity/commit/0f10ebe))
- **taskExport:** beautify styling just a little ([5a202bd](https://github.com/johannesjo/super-productivity/commit/5a202bd))
- **taskExport:** save as csv with a nicer file name ([119a33a](https://github.com/johannesjo/super-productivity/commit/119a33a))
- add electron-dl to save and open downloads right away ([c18fd3f](https://github.com/johannesjo/super-productivity/commit/c18fd3f))
- **taskExport:** first attempt ([8d9e21a](https://github.com/johannesjo/super-productivity/commit/8d9e21a))
- **taskExport:** improve data displayed for weeks and show only those with documented data ([5fd02ad](https://github.com/johannesjo/super-productivity/commit/5fd02ad))
- **taskExport:** improve styling ([6fd0b0e](https://github.com/johannesjo/super-productivity/commit/6fd0b0e))
- **taskExport:** improve styling ([9c22b25](https://github.com/johannesjo/super-productivity/commit/9c22b25))
- **taskExport:** improve table styling ([64c0df8](https://github.com/johannesjo/super-productivity/commit/64c0df8))
- **taskExport:** make fullscreen dialog just full width ([cd3715b](https://github.com/johannesjo/super-productivity/commit/cd3715b))
- **taskExport:** make merge into days work ([8b6a009](https://github.com/johannesjo/super-productivity/commit/8b6a009))
- **taskExport:** make task list export fullscreen ([91e2b97](https://github.com/johannesjo/super-productivity/commit/91e2b97))
- **taskExport:** refactor simple task summary to simple task export ([28645a6](https://github.com/johannesjo/super-productivity/commit/28645a6))
- **taskExport:** remove regex to remove ([9889cff](https://github.com/johannesjo/super-productivity/commit/9889cff))
- **tasks:** show sub task toggle button only on hover ([fec3558](https://github.com/johannesjo/super-productivity/commit/fec3558))

## [2.4.3](https://github.com/johannesjo/super-productivity/compare/v2.4.2...v2.4.3) (2019-02-26)

### Bug Fixes

- **google:** another attempt to fix login ([af150b7](https://github.com/johannesjo/super-productivity/commit/af150b7))
- **googleApi:** login handling and add better logging ([fc9855d](https://github.com/johannesjo/super-productivity/commit/fc9855d))
- **googleDriveSync:** config btns ([ab9a90c](https://github.com/johannesjo/super-productivity/commit/ab9a90c))
- **googleDriveSync:** remove login messages where they are not needed ([f229b66](https://github.com/johannesjo/super-productivity/commit/f229b66))
- **googleDriveSync:** several issues ([0c27d21](https://github.com/johannesjo/super-productivity/commit/0c27d21))
- **pomodoro:** don't show pomodoro notifications on mobile ([fbd8777](https://github.com/johannesjo/super-productivity/commit/fbd8777))
- **reminders:** don't show multiple notifications for the same reminder on mobile ([51fccc6](https://github.com/johannesjo/super-productivity/commit/51fccc6))
- **snacks:** styling ([4ec1b8c](https://github.com/johannesjo/super-productivity/commit/4ec1b8c))
- **tasks:** focus next task after done toggle ([ee14af6](https://github.com/johannesjo/super-productivity/commit/ee14af6))
- **tasks:** hover controls for multiline tasks ([ee47ec8](https://github.com/johannesjo/super-productivity/commit/ee47ec8))

### Features

- **snacks:** decrease display duration and only show close on hover ([2789211](https://github.com/johannesjo/super-productivity/commit/2789211))
- **takeABreak:** auto close banner on reset ([770c89b](https://github.com/johannesjo/super-productivity/commit/770c89b))
- **tasks:** remove double items for non touch devices ([64a05c1](https://github.com/johannesjo/super-productivity/commit/64a05c1))
- save daily summary tab index on project basis ([c6f1386](https://github.com/johannesjo/super-productivity/commit/c6f1386))

## [2.4.2](https://github.com/johannesjo/super-productivity/compare/v2.4.1...v2.4.2) (2019-02-24)

### Bug Fixes

- **bookmarks:** slide animation flicker ([3d6bfb8](https://github.com/johannesjo/super-productivity/commit/3d6bfb8))
- **tasks:** weird hover state for check done ([2d5fde4](https://github.com/johannesjo/super-productivity/commit/2d5fde4))

### Features

- **snack:** add close button ([c099dd5](https://github.com/johannesjo/super-productivity/commit/c099dd5))
- **snack:** improve styling ([cfd9086](https://github.com/johannesjo/super-productivity/commit/cfd9086))
- **tasks:** make sub tasks shadow less intense ([4d8761f](https://github.com/johannesjo/super-productivity/commit/4d8761f))
- **tasks:** show attachment icon for jira attachments too ([906e9a2](https://github.com/johannesjo/super-productivity/commit/906e9a2))

## [2.4.1](https://github.com/johannesjo/super-productivity/compare/v2.4.0...v2.4.1) (2019-02-24)

### Bug Fixes

- **banner:** overlapping bookmark bar ([c3fc765](https://github.com/johannesjo/super-productivity/commit/c3fc765))

### Features

- **banner:** add global error banner ([212a260](https://github.com/johannesjo/super-productivity/commit/212a260))
- **banner:** add jira unblock as banner rather than as snack ([400640e](https://github.com/johannesjo/super-productivity/commit/400640e))
- add dynamic height ani ([5a11809](https://github.com/johannesjo/super-productivity/commit/5a11809))
- **banner:** handle banner transition if there are multiple ([00e488f](https://github.com/johannesjo/super-productivity/commit/00e488f))
- **banner:** improve styling ([8b59888](https://github.com/johannesjo/super-productivity/commit/8b59888))
- **banner:** remove timeout for google login banner ([cfaf75e](https://github.com/johannesjo/super-productivity/commit/cfaf75e))
- **reminders:** improve add for task dialog ([125cb11](https://github.com/johannesjo/super-productivity/commit/125cb11))
- **tasks:** move toggle sub tasks button out of the way ([7722794](https://github.com/johannesjo/super-productivity/commit/7722794))
- add proper slide animation for bookmark bar and banner ([230a259](https://github.com/johannesjo/super-productivity/commit/230a259))

# [2.4.0](https://github.com/johannesjo/super-productivity/compare/v2.3.2...v2.4.0) (2019-02-23)

### Features

- add logging to file error log from frontend ([1f06eda](https://github.com/johannesjo/super-productivity/commit/1f06eda))
- make backlog shadow a little less intense ([c6ca87c](https://github.com/johannesjo/super-productivity/commit/c6ca87c))
- **banners:** add dark theme ui ([7537e55](https://github.com/johannesjo/super-productivity/commit/7537e55))
- **banners:** add for google login ([726bed0](https://github.com/johannesjo/super-productivity/commit/726bed0))
- **banners:** add service logic and make banner dynamic ([50ebb9a](https://github.com/johannesjo/super-productivity/commit/50ebb9a))
- **banners:** add ui and boilerplate ([cd0ccea](https://github.com/johannesjo/super-productivity/commit/cd0ccea))
- **electron:** implement error logging ([8254567](https://github.com/johannesjo/super-productivity/commit/8254567))
- **tasks:** adjust margin between sub tasks and note content ([cac010a](https://github.com/johannesjo/super-productivity/commit/cac010a))
- **tasks:** adjust task list padding ([d65d598](https://github.com/johannesjo/super-productivity/commit/d65d598))
- **tasks:** adjust task notes styling ([bd31bcb](https://github.com/johannesjo/super-productivity/commit/bd31bcb))

## [2.3.2](https://github.com/johannesjo/super-productivity/compare/v2.3.1...v2.3.2) (2019-02-22)

### Bug Fixes

- **reminder:** lower initial time limit to prevent problems at the start ([839a86f](https://github.com/johannesjo/super-productivity/commit/839a86f))

### Features

- **tasks:** complete redesign ([096f454](https://github.com/johannesjo/super-productivity/commit/096f454))
- **tasks:** improve mobile task styles ([f23547c](https://github.com/johannesjo/super-productivity/commit/f23547c))
- **tasks:** improve mobile task styles ([96fe247](https://github.com/johannesjo/super-productivity/commit/96fe247))
- **tasks:** improve styling for task shadows and adjust z-index values ([b644d02](https://github.com/johannesjo/super-productivity/commit/b644d02))
- **tasks:** improve styling for toggle sub tasks button and improve mobile ([366e03c](https://github.com/johannesjo/super-productivity/commit/366e03c))
- **tasks:** only show swipe blocks when touch device ([f6fd35d](https://github.com/johannesjo/super-productivity/commit/f6fd35d))
- **tasks:** various little improvements ([83544b5](https://github.com/johannesjo/super-productivity/commit/83544b5))
- improve margins for task list wrapper ([2924164](https://github.com/johannesjo/super-productivity/commit/2924164))

## [2.3.1](https://github.com/johannesjo/super-productivity/compare/v2.3.0...v2.3.1) (2019-02-21)

### Bug Fixes

- **google:** get rid of empty observable causing sync to go on forever ([a8a3b47](https://github.com/johannesjo/super-productivity/commit/a8a3b47))
- **googleExport:** endless loading state ([01cc756](https://github.com/johannesjo/super-productivity/commit/01cc756))
- **jira:** attachment mapping leading to error ([9d47a29](https://github.com/johannesjo/super-productivity/commit/9d47a29))
- **takeABreak:** manual reset not working for electron ([8efca90](https://github.com/johannesjo/super-productivity/commit/8efca90))
- scrollbars ([d7c7f50](https://github.com/johannesjo/super-productivity/commit/d7c7f50))
- **tasks:** task title not legible when editing current task in light theme ([c9e5fd9](https://github.com/johannesjo/super-productivity/commit/c9e5fd9))

### Features

- **google:** better debugging for login problem ([518cd29](https://github.com/johannesjo/super-productivity/commit/518cd29))
- **google:** give login snack a delay ([0f56b5c](https://github.com/johannesjo/super-productivity/commit/0f56b5c))
- **googleExport:** add little success icon after submission ([ff51bbf](https://github.com/johannesjo/super-productivity/commit/ff51bbf))
- **googleExport:** improve table styling ([87cb3b8](https://github.com/johannesjo/super-productivity/commit/87cb3b8))
- **projects:** add toast when updating settings ([7bf6193](https://github.com/johannesjo/super-productivity/commit/7bf6193))
- **tasks:** add option to mark parent as done when all sub tasks are ([c50ccb6](https://github.com/johannesjo/super-productivity/commit/c50ccb6))
- **tasks:** add tooltips for buttons ([0ebad0a](https://github.com/johannesjo/super-productivity/commit/0ebad0a))
- **tasks:** add tooltips for main header ([0628dd1](https://github.com/johannesjo/super-productivity/commit/0628dd1))
- **tasks:** also hide drag handle if not needed ([051894c](https://github.com/johannesjo/super-productivity/commit/051894c))
- **tasks:** improve additional info styling ([28ed3c2](https://github.com/johannesjo/super-productivity/commit/28ed3c2))
- **tasks:** improve quick access menu ([cb8aad2](https://github.com/johannesjo/super-productivity/commit/cb8aad2))
- **tasks:** slightly improve additional task info styling ([b0c8c03](https://github.com/johannesjo/super-productivity/commit/b0c8c03))

# [2.3.0](https://github.com/johannesjo/super-productivity/compare/v2.2.3...v2.3.0) (2019-02-18)

### Bug Fixes

- **bookmarks:** icon auto complete ([b8c0416](https://github.com/johannesjo/super-productivity/commit/b8c0416))
- **idle:** skip break not resetting break timer ([7c5e041](https://github.com/johannesjo/super-productivity/commit/7c5e041))
- **notes:** drag & drop for mobile ([60c1b67](https://github.com/johannesjo/super-productivity/commit/60c1b67))
- **task:** z index issues ([2c4ae38](https://github.com/johannesjo/super-productivity/commit/2c4ae38))
- **tasks:** pan conflict with page scrolling and dragging tasks ([2d37349](https://github.com/johannesjo/super-productivity/commit/2d37349))
- animation issue for work view plan more or finish block ([5e1ac93](https://github.com/johannesjo/super-productivity/commit/5e1ac93))
- missing default setting for projects ([0cd71d1](https://github.com/johannesjo/super-productivity/commit/0cd71d1))
- plan more mobile styling ([146e0c4](https://github.com/johannesjo/super-productivity/commit/146e0c4))
- typing error ([5898c58](https://github.com/johannesjo/super-productivity/commit/5898c58))
- **tasks:** scrolling leading to weird pan trigger sometimes ([5169bb3](https://github.com/johannesjo/super-productivity/commit/5169bb3))
- **tasks:** task title edit being under collapse sub tasks btn ([4147f7e](https://github.com/johannesjo/super-productivity/commit/4147f7e))
- **tasks:** text not being selectable by drag click because of pan handler ([6a371d9](https://github.com/johannesjo/super-productivity/commit/6a371d9))
- **tasks:** typing error ([56d8375](https://github.com/johannesjo/super-productivity/commit/56d8375))

### Features

- **bookmarks:** improve styling ([d814bef](https://github.com/johannesjo/super-productivity/commit/d814bef))
- **bookmarks:** reduce drag handle size ([90b2f75](https://github.com/johannesjo/super-productivity/commit/90b2f75))
- **git:** make delete undo work ([e1ad1a9](https://github.com/johannesjo/super-productivity/commit/e1ad1a9))
- **google:** make refresh token work ([465d1c4](https://github.com/johannesjo/super-productivity/commit/465d1c4))
- **googleDriveSync:** improve error handling ([cbd7190](https://github.com/johannesjo/super-productivity/commit/cbd7190))
- **googleDriveSync:** only update token if changed ([052841b](https://github.com/johannesjo/super-productivity/commit/052841b))
- **googleDriveSync:** show error to the user if any ([ea2dd2e](https://github.com/johannesjo/super-productivity/commit/ea2dd2e))
- provide custom hammerjs config ([1b0f555](https://github.com/johannesjo/super-productivity/commit/1b0f555))
- **googleExportTime:** make subTaskTitles and totalTime work ([da73b16](https://github.com/johannesjo/super-productivity/commit/da73b16))
- **jira:** improve transition handling config ([3e98f22](https://github.com/johannesjo/super-productivity/commit/3e98f22))
- **jira:** make delete undo work ([e5ec0b6](https://github.com/johannesjo/super-productivity/commit/e5ec0b6))
- **jira,git:** improve issue table styling ([932bcf7](https://github.com/johannesjo/super-productivity/commit/932bcf7))
- **tasks:** add most basic swipe gesture handlers ([3b0cc63](https://github.com/johannesjo/super-productivity/commit/3b0cc63))
- **tasks:** add new cool hover control ([b344ad6](https://github.com/johannesjo/super-productivity/commit/b344ad6))
- **tasks:** add reduced ui theme mode ([c5e6778](https://github.com/johannesjo/super-productivity/commit/c5e6778))
- **tasks:** adjust swipe timing ([78e96c7](https://github.com/johannesjo/super-productivity/commit/78e96c7))
- **tasks:** align toggle sub task button with first line center ([36976e2](https://github.com/johannesjo/super-productivity/commit/36976e2))
- **tasks:** connect gestures to actions ([cb1b249](https://github.com/johannesjo/super-productivity/commit/cb1b249))
- **tasks:** fine tune gestures ui ([0319f4c](https://github.com/johannesjo/super-productivity/commit/0319f4c))
- **tasks:** fine tune gestures ui once more ([7970a83](https://github.com/johannesjo/super-productivity/commit/7970a83))
- **tasks:** fine tune new cool hover control ([2d763d0](https://github.com/johannesjo/super-productivity/commit/2d763d0))
- **tasks:** get rid of play button ([3ea2e28](https://github.com/johannesjo/super-productivity/commit/3ea2e28))
- **tasks:** improve styling ([dc4c99a](https://github.com/johannesjo/super-productivity/commit/dc4c99a))
- **tasks:** improve styling ([dde46fc](https://github.com/johannesjo/super-productivity/commit/dde46fc))
- **tasks:** improve styling ([753ba90](https://github.com/johannesjo/super-productivity/commit/753ba90))
- **tasks:** improve styling for reduced additional info ([ed89f6e](https://github.com/johannesjo/super-productivity/commit/ed89f6e))
- **tasks:** improve toggle sub task btn styling ([3a52155](https://github.com/johannesjo/super-productivity/commit/3a52155))
- improve mobile styling ([382c7a9](https://github.com/johannesjo/super-productivity/commit/382c7a9))
- **tasks:** limit sub task list padding to reduced style ([1d1647b](https://github.com/johannesjo/super-productivity/commit/1d1647b))
- add the magic formula ([fab5f46](https://github.com/johannesjo/super-productivity/commit/fab5f46))
- **tasks:** make sub tasks a little bit more distinguishable as such ([80de265](https://github.com/johannesjo/super-productivity/commit/80de265))
- **tasks:** switch out pan/swipe action for done tasks ([c567396](https://github.com/johannesjo/super-productivity/commit/c567396))
- beautify daily summary ([9393e26](https://github.com/johannesjo/super-productivity/commit/9393e26))
- beautify settings ([4c675d7](https://github.com/johannesjo/super-productivity/commit/4c675d7))
- improve reset take a break button animation ([6088b8f](https://github.com/johannesjo/super-productivity/commit/6088b8f))
- make mobile notifications work ([f485ae9](https://github.com/johannesjo/super-productivity/commit/f485ae9))
- open markdown links in new tab ([5dc9c5d](https://github.com/johannesjo/super-productivity/commit/5dc9c5d))
- prepare touch device helper mixins and classes ([f0caf18](https://github.com/johannesjo/super-productivity/commit/f0caf18))

## [2.2.3](https://github.com/johannesjo/super-productivity/compare/v2.2.2...v2.2.3) (2019-02-13)

### Bug Fixes

- **bookmarks:** drag handle pos ([96987a3](https://github.com/johannesjo/super-productivity/commit/96987a3))
- **bookmarks:** icons not being centered ([2af6887](https://github.com/johannesjo/super-productivity/commit/2af6887))
- **bookmarks:** not wrapping as intended ([ce47ba6](https://github.com/johannesjo/super-productivity/commit/ce47ba6))
- **git:** crashing app when there are not enough settings ([113d64d](https://github.com/johannesjo/super-productivity/commit/113d64d))
- **idle:** interaction with break timer ([4d60ead](https://github.com/johannesjo/super-productivity/commit/4d60ead))
- **jira:** avatar image getting stretched ([26a6bb3](https://github.com/johannesjo/super-productivity/commit/26a6bb3))
- **jira:** don't execute effect handlers when jira is disabled ([dc069d3](https://github.com/johannesjo/super-productivity/commit/dc069d3))
- **jira:** issue transitions not working as expected [#147](https://github.com/johannesjo/super-productivity/issues/147) ([8929c44](https://github.com/johannesjo/super-productivity/commit/8929c44))
- **jira:** make polling work as intended [#149](https://github.com/johannesjo/super-productivity/issues/149) ([8a3b844](https://github.com/johannesjo/super-productivity/commit/8a3b844))
- **reminders:** causing error on importing data ([c3bfedd](https://github.com/johannesjo/super-productivity/commit/c3bfedd))
- **scheduleTasks:** deleting and editing not working in modal ([ab04f44](https://github.com/johannesjo/super-productivity/commit/ab04f44))
- data not being updated for custom section on project change ([5c162a0](https://github.com/johannesjo/super-productivity/commit/5c162a0))
- links opening twice [#148](https://github.com/johannesjo/super-productivity/issues/148) ([575cba2](https://github.com/johannesjo/super-productivity/commit/575cba2))
- missing word ([af4994e](https://github.com/johannesjo/super-productivity/commit/af4994e))
- typing error ([65cd6ff](https://github.com/johannesjo/super-productivity/commit/65cd6ff))

### Features

- **bookmarks:** add edit mode ([4431bc4](https://github.com/johannesjo/super-productivity/commit/4431bc4))
- **bookmarks:** add messy dragula drop ([b56a7c9](https://github.com/johannesjo/super-productivity/commit/b56a7c9))
- **bookmarks:** fine tune list ui ([5a7d14f](https://github.com/johannesjo/super-productivity/commit/5a7d14f))
- **bookmarks:** improve bookmark edit ui ([4eda2eb](https://github.com/johannesjo/super-productivity/commit/4eda2eb))
- **bookmarks:** improve edit ui ([4432374](https://github.com/johannesjo/super-productivity/commit/4432374))
- **bookmarks:** improve ui ([88f1ff4](https://github.com/johannesjo/super-productivity/commit/88f1ff4))
- **bookmarks:** make different container layout work ([eb43864](https://github.com/johannesjo/super-productivity/commit/eb43864))
- **bookmarks:** make sorting via drag and drop work [#54](https://github.com/johannesjo/super-productivity/issues/54) ([04491e3](https://github.com/johannesjo/super-productivity/commit/04491e3))
- **bookmarks:** prepare edit mode ui for drag & drop ([885d6ba](https://github.com/johannesjo/super-productivity/commit/885d6ba))
- **bookmarks:** separate into different containers ([21508bf](https://github.com/johannesjo/super-productivity/commit/21508bf))
- **bookmarks:** slightly improve styling ([6fc1928](https://github.com/johannesjo/super-productivity/commit/6fc1928))
- **git:** bind data and backlog updates to issue cache update ([c605d9f](https://github.com/johannesjo/super-productivity/commit/c605d9f))
- **git:** slightly improve closed issue handling for git ([cf6113a](https://github.com/johannesjo/super-productivity/commit/cf6113a))
- **jira:** add warning when their is no username given to check for assignee [#147](https://github.com/johannesjo/super-productivity/issues/147) ([8fa0709](https://github.com/johannesjo/super-productivity/commit/8fa0709))
- **jira:** improve polling [#149](https://github.com/johannesjo/super-productivity/issues/149) ([2e4fba1](https://github.com/johannesjo/super-productivity/commit/2e4fba1))
- **jira:** improve shut out modal styling ([a386540](https://github.com/johannesjo/super-productivity/commit/a386540))
- **jira:** make issue assignee name a required field if option to reassign issues is selected [#147](https://github.com/johannesjo/super-productivity/issues/147) ([6e643b1](https://github.com/johannesjo/super-productivity/commit/6e643b1))
- **jira,git:** reduce initial poll delay ([3377ff6](https://github.com/johannesjo/super-productivity/commit/3377ff6))
- **scheduleTasks:** add keyboard shortcut ([bad3b3d](https://github.com/johannesjo/super-productivity/commit/bad3b3d))
- **snack:** increase default duration ([4b60e9b](https://github.com/johannesjo/super-productivity/commit/4b60e9b))
- **takeABreak:** add possibility to snooze reminder ([488270e](https://github.com/johannesjo/super-productivity/commit/488270e))
- **takeABreak:** improve snack styling ([75149b9](https://github.com/johannesjo/super-productivity/commit/75149b9))
- **tasks:** improve current task selection zoom ([a79a133](https://github.com/johannesjo/super-productivity/commit/a79a133))
- **tasks:** limit zoom to x axis ([5339330](https://github.com/johannesjo/super-productivity/commit/5339330))
- **tasks:** limit zoom to x axis ([3b4963e](https://github.com/johannesjo/super-productivity/commit/3b4963e))
- **tasks:** prevent progress bar from causing height jump ([ea5eff5](https://github.com/johannesjo/super-productivity/commit/ea5eff5))
- **tasks:** reduce focus zoom ([ee0a904](https://github.com/johannesjo/super-productivity/commit/ee0a904))
- **tasks:** speed up current task selection ([2577f41](https://github.com/johannesjo/super-productivity/commit/2577f41))
- **worklog:** add more statistics ([a8f4218](https://github.com/johannesjo/super-productivity/commit/a8f4218))
- add keyboard shortcuts for zooming ([ab32d46](https://github.com/johannesjo/super-productivity/commit/ab32d46))
- add take a break reset button ([b62d53c](https://github.com/johannesjo/super-productivity/commit/b62d53c))
- add track by to attachment list to prevent constant re-render ([1314401](https://github.com/johannesjo/super-productivity/commit/1314401))
- also display days worked in worklog ([e91f0eb](https://github.com/johannesjo/super-productivity/commit/e91f0eb))
- improve error handling ([fa6f924](https://github.com/johannesjo/super-productivity/commit/fa6f924))
- improve error handling [#146](https://github.com/johannesjo/super-productivity/issues/146) ([14d6df6](https://github.com/johannesjo/super-productivity/commit/14d6df6))
- only trigger backlog wiggle ani when moving task to backlog via keyboard shortcut ([e551a2b](https://github.com/johannesjo/super-productivity/commit/e551a2b))

## [2.2.2](https://github.com/johannesjo/super-productivity/compare/v2.2.1...v2.2.2) (2019-02-10)

### Bug Fixes

- **googleApi:** google token expiry handling ([3628032](https://github.com/johannesjo/super-productivity/commit/3628032))

## [2.2.1](https://github.com/johannesjo/super-productivity/compare/v2.2.0...v2.2.1) (2019-02-10)

### Bug Fixes

- remove misguided tabindex -1 ([f5fd95c](https://github.com/johannesjo/super-productivity/commit/f5fd95c))

# [2.2.0](https://github.com/johannesjo/super-productivity/compare/v2.1.0...v2.2.0) (2019-02-10)

### Bug Fixes

- error handler not rethrowing error ([d921ae9](https://github.com/johannesjo/super-productivity/commit/d921ae9))
- reload issue for electron ([018a612](https://github.com/johannesjo/super-productivity/commit/018a612))
- **googleDriveSync:** login snack not being shown ([9c8d6d5](https://github.com/johannesjo/super-productivity/commit/9c8d6d5))

### Features

- change page title ([3ae1976](https://github.com/johannesjo/super-productivity/commit/3ae1976))
- try to prevent focus for backlog split ([306d89d](https://github.com/johannesjo/super-productivity/commit/306d89d))
- wait initially before displaying reminders ([7d02a38](https://github.com/johannesjo/super-productivity/commit/7d02a38))
- **googleDriveSync:** add error handling if initial login is aborted ([1cff87b](https://github.com/johannesjo/super-productivity/commit/1cff87b))
- **googleDriveSync:** display google login snack for a longer time ([943f42b](https://github.com/johannesjo/super-productivity/commit/943f42b))
- **notes:** add most basic image notes ([be119a7](https://github.com/johannesjo/super-productivity/commit/be119a7))
- **notes:** fine tune drop items ([aa13968](https://github.com/johannesjo/super-productivity/commit/aa13968))
- **notes:** improve note handle btn style ([a7ca114](https://github.com/johannesjo/super-productivity/commit/a7ca114))
- **notes:** improve ui for image notes ([9d05d06](https://github.com/johannesjo/super-productivity/commit/9d05d06))
- **notes:** make image recognition work ([80ab37c](https://github.com/johannesjo/super-productivity/commit/80ab37c))
- **pomodoro:** add option to play sound when break ends [#138](https://github.com/johannesjo/super-productivity/issues/138) ([6ca5db2](https://github.com/johannesjo/super-productivity/commit/6ca5db2))
- **pomodoro:** allow to hide dialog [#144](https://github.com/johannesjo/super-productivity/issues/144) ([c8e5632](https://github.com/johannesjo/super-productivity/commit/c8e5632))

# [2.1.0](https://github.com/johannesjo/super-productivity/compare/v2.0.7...v2.1.0) (2019-02-09)

### Bug Fixes

- pomodoro hover area triggering not as intended ([e8065b5](https://github.com/johannesjo/super-productivity/commit/e8065b5))
- **git:** enable settings check again ([25d6418](https://github.com/johannesjo/super-productivity/commit/25d6418))
- **googleApi:** login snack not shown on disconnect ([57b579e](https://github.com/johannesjo/super-productivity/commit/57b579e))
- **scheduleTasks:** add to backlog being shown when not possible ([30c17d0](https://github.com/johannesjo/super-productivity/commit/30c17d0))
- **scheduleTasks:** nested tab styles for backlog tabs ([c93f249](https://github.com/johannesjo/super-productivity/commit/c93f249))
- **scheduleTasks:** not correctly importing reminders ([0b20cc7](https://github.com/johannesjo/super-productivity/commit/0b20cc7))
- **scheduleTasks:** reminder model not being up to date ([9fde7ca](https://github.com/johannesjo/super-productivity/commit/9fde7ca))
- **scheduleTasks:** view task switch to other project sometimes not working ([a6e5bb6](https://github.com/johannesjo/super-productivity/commit/a6e5bb6))
- **tasks:** not displaying time spent after creating first sub task ([3667c12](https://github.com/johannesjo/super-productivity/commit/3667c12))
- **tasks:** time estimates not being calculated correctly [#139](https://github.com/johannesjo/super-productivity/issues/139) ([748471d](https://github.com/johannesjo/super-productivity/commit/748471d))
- don't shrink play btn for mobile ([4e2b486](https://github.com/johannesjo/super-productivity/commit/4e2b486))
- images being too big inside issue content ([e920d2d](https://github.com/johannesjo/super-productivity/commit/e920d2d))
- lint ([cab9a8e](https://github.com/johannesjo/super-productivity/commit/cab9a8e))
- remove debugging state ([7b4c2db](https://github.com/johannesjo/super-productivity/commit/7b4c2db))
- remove minimize to tray option from settings [#140](https://github.com/johannesjo/super-productivity/issues/140) ([52b4243](https://github.com/johannesjo/super-productivity/commit/52b4243))

### Features

- add fallback error handler ([79ae667](https://github.com/johannesjo/super-productivity/commit/79ae667))
- add no tasks message for backlog ([9e1bce4](https://github.com/johannesjo/super-productivity/commit/9e1bce4))
- add no tasks message for done tasks ([d045f73](https://github.com/johannesjo/super-productivity/commit/d045f73))
- add reload and dismiss actions for global error handler snack ([f34417c](https://github.com/johannesjo/super-productivity/commit/f34417c))
- add reminders to global sync model ([a61ba62](https://github.com/johannesjo/super-productivity/commit/a61ba62))
- display errors longer ([b15fc44](https://github.com/johannesjo/super-productivity/commit/b15fc44))
- **scheduleTasks:** add track by ([303be3f](https://github.com/johannesjo/super-productivity/commit/303be3f))
- improve add task bar ([bd2e022](https://github.com/johannesjo/super-productivity/commit/bd2e022))
- **scheduleTasks:** improve ui ([bba78c3](https://github.com/johannesjo/super-productivity/commit/bba78c3))
- improve global error handler ([da4302d](https://github.com/johannesjo/super-productivity/commit/da4302d))
- improve global snack error ([3b7c1fc](https://github.com/johannesjo/super-productivity/commit/3b7c1fc))
- improve mobile main nav ([a419209](https://github.com/johannesjo/super-productivity/commit/a419209))
- **scheduleTasks:** connect actions ([fde747a](https://github.com/johannesjo/super-productivity/commit/fde747a))
- improve mobile styling for scheduled tasks overview ([999ef35](https://github.com/johannesjo/super-productivity/commit/999ef35))
- improve no issue found message for git ([dfda6a2](https://github.com/johannesjo/super-productivity/commit/dfda6a2))
- **scheduleTasks:** add rudimentary ui for scheduled tasks ([ad727a4](https://github.com/johannesjo/super-productivity/commit/ad727a4))
- improve project overview for mobile ([c887a97](https://github.com/johannesjo/super-productivity/commit/c887a97))
- **notes:** make reminders work when another project is active ([a679f65](https://github.com/johannesjo/super-productivity/commit/a679f65))
- **scheduleTasks:** account for reminders from other projects ([2966d8a](https://github.com/johannesjo/super-productivity/commit/2966d8a))
- **scheduleTasks:** add animation for list ([025970b](https://github.com/johannesjo/super-productivity/commit/025970b))
- **scheduleTasks:** add dialog for scheduling task ([a0171fe](https://github.com/johannesjo/super-productivity/commit/a0171fe))
- **scheduleTasks:** add humanized timestamp ([76ca585](https://github.com/johannesjo/super-productivity/commit/76ca585))
- **scheduleTasks:** add little alarm icon to scheduled tasks ([68c6e20](https://github.com/johannesjo/super-productivity/commit/68c6e20))
- **scheduleTasks:** add service logic for scheduling tasks ([d19f33f](https://github.com/johannesjo/super-productivity/commit/d19f33f))
- **scheduleTasks:** adjust mobile styling ([56e996c](https://github.com/johannesjo/super-productivity/commit/56e996c))
- **scheduleTasks:** beautify ui ([213ee80](https://github.com/johannesjo/super-productivity/commit/213ee80))
- **scheduleTasks:** clean up reminders on task deletion ([2bbb9c8](https://github.com/johannesjo/super-productivity/commit/2bbb9c8))
- **scheduleTasks:** handle edge case when there is a reminder for a deleted task ([154ddac](https://github.com/johannesjo/super-productivity/commit/154ddac))
- **scheduleTasks:** improve ui for notify and edit dialog ([409082a](https://github.com/johannesjo/super-productivity/commit/409082a))
- **scheduleTasks:** improve waiting for other project data ([3665585](https://github.com/johannesjo/super-productivity/commit/3665585))
- improve project overview styling ([6001000](https://github.com/johannesjo/super-productivity/commit/6001000))
- **scheduleTasks:** make editing reminder work ([7165d50](https://github.com/johannesjo/super-productivity/commit/7165d50))
- **scheduleTasks:** make starting tasks from reminder work ([31aea97](https://github.com/johannesjo/super-productivity/commit/31aea97))
- **scheduleTasks:** prepare ui ([d7bb9e0](https://github.com/johannesjo/super-productivity/commit/d7bb9e0))
- **scheduleTasks:** sort by due time ([b4dc74f](https://github.com/johannesjo/super-productivity/commit/b4dc74f))
- **takeABreak:** add reset break timer button for idle dialog ([ba6a269](https://github.com/johannesjo/super-productivity/commit/ba6a269))
- **takeABreak:** connect idle time again ([cc5349c](https://github.com/johannesjo/super-productivity/commit/cc5349c))
- remove setting for isBlockFinishDayUntilTimeTimeTracked ([53e88b4](https://github.com/johannesjo/super-productivity/commit/53e88b4))
- show message when there are no scheduled tasks ([0ef88fa](https://github.com/johannesjo/super-productivity/commit/0ef88fa))

## [2.0.7](https://github.com/johannesjo/super-productivity/compare/v2.0.6...v2.0.7) (2019-02-03)

### Bug Fixes

- **pomodoro:** issue when break and work duration are the same ([ae38ce8](https://github.com/johannesjo/super-productivity/commit/ae38ce8))
- **pomodoro:** short break using wrong value [#136](https://github.com/johannesjo/super-productivity/issues/136) ([13505c2](https://github.com/johannesjo/super-productivity/commit/13505c2))
- time estimation dialog sometimes deleting values by accident ([a1ae38c](https://github.com/johannesjo/super-productivity/commit/a1ae38c))

### Features

- **pomodoro:** add buttons for skipping session and resetting it ([c363492](https://github.com/johannesjo/super-productivity/commit/c363492))
- **pomodoro:** add buttons for skipping session and resetting it [#135](https://github.com/johannesjo/super-productivity/issues/135) ([5fba30d](https://github.com/johannesjo/super-productivity/commit/5fba30d))
- **pomodoro:** add functionality for new pomodoro buttons [#135](https://github.com/johannesjo/super-productivity/issues/135) ([52ad063](https://github.com/johannesjo/super-productivity/commit/52ad063))
- improve styling for dialog time estimate ([5ab5d3d](https://github.com/johannesjo/super-productivity/commit/5ab5d3d))
- improve styling for dialog time estimate 2 ([bc12300](https://github.com/johannesjo/super-productivity/commit/bc12300))
- move input duration slider pointer only in 5 minute steps too ([970d5fd](https://github.com/johannesjo/super-productivity/commit/970d5fd))
- shorten header for dialog time estimate ([f1e3aea](https://github.com/johannesjo/super-productivity/commit/f1e3aea))
- use 5 minute steps for input duration slider ([d1ba189](https://github.com/johannesjo/super-productivity/commit/d1ba189))

## [2.0.6](https://github.com/johannesjo/super-productivity/compare/v2.0.5...v2.0.6) (2019-02-01)

## [2.0.5](https://github.com/johannesjo/super-productivity/compare/v2.0.4...v2.0.5) (2019-02-01)

## [2.0.4](https://github.com/johannesjo/super-productivity/compare/v2.0.3...v2.0.4) (2019-02-01)

### Bug Fixes

- **tasks:** weird undefined function issue ([a4c6a2b](https://github.com/johannesjo/super-productivity/commit/a4c6a2b))

### Features

- **git:** improve caching mechanism ([19a73f1](https://github.com/johannesjo/super-productivity/commit/19a73f1))
- **jira:** increase initial poll delay ([fa08791](https://github.com/johannesjo/super-productivity/commit/fa08791))
- add plan more or finish working box when there are no tasks left ([8dd1482](https://github.com/johannesjo/super-productivity/commit/8dd1482))
- improve planning mode ([0128e63](https://github.com/johannesjo/super-productivity/commit/0128e63))
- load app only after tasks are loaded ([ce1ef75](https://github.com/johannesjo/super-productivity/commit/ce1ef75))
- move planing mode to its own service ([fcab193](https://github.com/johannesjo/super-productivity/commit/fcab193))

## [2.0.3](https://github.com/johannesjo/super-productivity/compare/v2.0.2...v2.0.3) (2019-02-01)

### Bug Fixes

- don't init extension interface in electron context ([7d43df6](https://github.com/johannesjo/super-productivity/commit/7d43df6))
- **electron:** app asking if you want to quit again on daily summary ([365ed34](https://github.com/johannesjo/super-productivity/commit/365ed34))
- **git:** issue import showing message ([a9c3533](https://github.com/johannesjo/super-productivity/commit/a9c3533))
- **pomodoro:** don't play tick sound on settings update ([8a5072b](https://github.com/johannesjo/super-productivity/commit/8a5072b))
- **pomodoro:** improve tick sound logic ([f44e7f1](https://github.com/johannesjo/super-productivity/commit/f44e7f1))
- **pomodoro:** task start/pause not working when pomodoro is enabled [#133](https://github.com/johannesjo/super-productivity/issues/133) [#134](https://github.com/johannesjo/super-productivity/issues/134) ([594d165](https://github.com/johannesjo/super-productivity/commit/594d165))
- **pomodoro:** tick sound not working as expected when global config changes ([1380859](https://github.com/johannesjo/super-productivity/commit/1380859))
- **tasks:** attachment title not being updated right away ([6acadd4](https://github.com/johannesjo/super-productivity/commit/6acadd4))

### Features

- **git:** improve error message for git api rate limit exceeded ([3a6ef57](https://github.com/johannesjo/super-productivity/commit/3a6ef57))
- **git:** reduce api usage by caching issues to local storage ([de4851b](https://github.com/johannesjo/super-productivity/commit/de4851b))
- **git:** simplify issue importing to backlog and make it more perfomant ([01ff113](https://github.com/johannesjo/super-productivity/commit/01ff113))
- **jira:** improve import check for already imported issues ([55c160e](https://github.com/johannesjo/super-productivity/commit/55c160e))
- **jira:** simplify issue importing to backlog and make it more perfomant ([91a9dfc](https://github.com/johannesjo/super-productivity/commit/91a9dfc))

## [2.0.2](https://github.com/johannesjo/super-productivity/compare/v2.0.1...v2.0.2) (2019-01-30)

### Bug Fixes

- **git:** case when issue data could not be found and crashes app ([b1b0199](https://github.com/johannesjo/super-productivity/commit/b1b0199))
- **jira:** case when issue data could not be found and crashes app ([fee2bee](https://github.com/johannesjo/super-productivity/commit/fee2bee))
- case when issue data could not be found and crashes app ([43700dc](https://github.com/johannesjo/super-productivity/commit/43700dc))
- error when no theme is provided ([edc06eb](https://github.com/johannesjo/super-productivity/commit/edc06eb))
- linting errors ([eb17078](https://github.com/johannesjo/super-productivity/commit/eb17078))
- require theme to be set, when project is created ([f149bbe](https://github.com/johannesjo/super-productivity/commit/f149bbe))
- **jira:** cfg not being present in effect ([9804dc0](https://github.com/johannesjo/super-productivity/commit/9804dc0))
- **tasks:** focus behavior ([aef88ef](https://github.com/johannesjo/super-productivity/commit/aef88ef))

### Features

- add global error handler ([c51234e](https://github.com/johannesjo/super-productivity/commit/c51234e))
- **tasks:** focus first tab on update btn click ([b59eaf7](https://github.com/johannesjo/super-productivity/commit/b59eaf7))

## [2.0.1](https://github.com/johannesjo/super-productivity/compare/v2.0.0...v2.0.1) (2019-01-29)

### Bug Fixes

- wrong imports ([6a1e30a](https://github.com/johannesjo/super-productivity/commit/6a1e30a))

### Features

- **tasks:** detach whole focus logic from store ([a6fc59b](https://github.com/johannesjo/super-productivity/commit/a6fc59b))
- improve performance when dragging up backlog ([e02c80e](https://github.com/johannesjo/super-productivity/commit/e02c80e))

# [2.0.0](https://github.com/johannesjo/super-productivity/compare/v1.999.1000...v2.0.0) (2019-01-29)

### Bug Fixes

- **config:** settings not updating when switching project ([27a3993](https://github.com/johannesjo/super-productivity/commit/27a3993))
- typo in license ([9ad2dd0](https://github.com/johannesjo/super-productivity/commit/9ad2dd0))
- **electron:** don't send idle time all the time ([dc164a9](https://github.com/johannesjo/super-productivity/commit/dc164a9))
- **tasks:** select task ([1818290](https://github.com/johannesjo/super-productivity/commit/1818290))
- auto polling issues to backlog not working ([5a632f8](https://github.com/johannesjo/super-productivity/commit/5a632f8))
- background polling? ([7471c0c](https://github.com/johannesjo/super-productivity/commit/7471c0c))
- lint ([f085f20](https://github.com/johannesjo/super-productivity/commit/f085f20))
- migration leaving out backlog and todays task ids ([902c3ff](https://github.com/johannesjo/super-productivity/commit/902c3ff))
- start day also starting backlog tasks ([85b2b59](https://github.com/johannesjo/super-productivity/commit/85b2b59))
- windows icon ([431ffb0](https://github.com/johannesjo/super-productivity/commit/431ffb0))
- **git:** don't refresh issues if invalid config ([323a210](https://github.com/johannesjo/super-productivity/commit/323a210))
- **git:** throwing an error ([2a75ff9](https://github.com/johannesjo/super-productivity/commit/2a75ff9))
- **jira:** limit issue to link transformation to electron context ([980aed2](https://github.com/johannesjo/super-productivity/commit/980aed2))
- **jira:** switch map statement for polling ([38ef0d8](https://github.com/johannesjo/super-productivity/commit/38ef0d8))

### Features

- hide play btn for backlog tasks ([78e7626](https://github.com/johannesjo/super-productivity/commit/78e7626))
- make whole page draggable for mac os while loading ([e84ae85](https://github.com/johannesjo/super-productivity/commit/e84ae85))

## [1.999.1000](https://github.com/johannesjo/super-productivity/compare/v1.10.56...v1.999.1000) (2019-01-27)

### Bug Fixes

- 0 bug ([b8621d4](https://github.com/johannesjo/super-productivity/commit/b8621d4))
- add missing type ([6b81cfd](https://github.com/johannesjo/super-productivity/commit/6b81cfd))
- add target blank to attachment link ([e059b36](https://github.com/johannesjo/super-productivity/commit/e059b36))
- add task bar being overlapped by bookmarks ([7889721](https://github.com/johannesjo/super-productivity/commit/7889721))
- add task bar color ([ee48962](https://github.com/johannesjo/super-productivity/commit/ee48962))
- add task not working any more ([161d7c0](https://github.com/johannesjo/super-productivity/commit/161d7c0))
- adjust timeout trick for now ([6857958](https://github.com/johannesjo/super-productivity/commit/6857958))
- all kinds of linting errors ([742d536](https://github.com/johannesjo/super-productivity/commit/742d536))
- annoying issue that jira cfg was throwing an error ([6e006d5](https://github.com/johannesjo/super-productivity/commit/6e006d5))
- another error with destroyed view ([0c36982](https://github.com/johannesjo/super-productivity/commit/0c36982))
- app not quitting ([9414b60](https://github.com/johannesjo/super-productivity/commit/9414b60))
- attachment saving generating a lot of ids ([d0f1152](https://github.com/johannesjo/super-productivity/commit/d0f1152))
- backlog heading position ([25f2930](https://github.com/johannesjo/super-productivity/commit/25f2930))
- backup & sync not working when there only is the default project and no project state ([eeae84f](https://github.com/johannesjo/super-productivity/commit/eeae84f))
- breakpoint 1px gap issue ([ab06521](https://github.com/johannesjo/super-productivity/commit/ab06521))
- build ([0fa66ca](https://github.com/johannesjo/super-productivity/commit/0fa66ca))
- build ([965da14](https://github.com/johannesjo/super-productivity/commit/965da14))
- cleanup debug error ([458be1d](https://github.com/johannesjo/super-productivity/commit/458be1d))
- container not being 100% height ([ccd3d61](https://github.com/johannesjo/super-productivity/commit/ccd3d61))
- contenteditable messing up ([5051361](https://github.com/johannesjo/super-productivity/commit/5051361))
- controls hitbox blocking time edit ([66fa902](https://github.com/johannesjo/super-productivity/commit/66fa902))
- create project dialog throwing error when opened from config page ([e31ca2e](https://github.com/johannesjo/super-productivity/commit/e31ca2e))
- dirty dirty dirty fix for input duration ([c7ac3b5](https://github.com/johannesjo/super-productivity/commit/c7ac3b5))
- dirty fix for jira cfg issues ([0bd86c8](https://github.com/johannesjo/super-productivity/commit/0bd86c8))
- disable service worker for electron, as it does not work ([f6dd283](https://github.com/johannesjo/super-productivity/commit/f6dd283))
- disable uppercasing the first task title character as it messes uo editing the titles ([c9e5189](https://github.com/johannesjo/super-productivity/commit/c9e5189))
- dynamic jira cfg not working ([c3ca8b7](https://github.com/johannesjo/super-productivity/commit/c3ca8b7))
- edit attachment dialog throwing an error when link is empty ([66d878d](https://github.com/johannesjo/super-productivity/commit/66d878d))
- edit on click being confused ([f39ab3a](https://github.com/johannesjo/super-productivity/commit/f39ab3a))
- electron build for current state ([b3a2782](https://github.com/johannesjo/super-productivity/commit/b3a2782))
- enlarge image animation for thumbnail images ([1ec854b](https://github.com/johannesjo/super-productivity/commit/1ec854b))
- error with destroyed view ([e4c7c82](https://github.com/johannesjo/super-productivity/commit/e4c7c82))
- es6 only not working for electron ([1bfd795](https://github.com/johannesjo/super-productivity/commit/1bfd795))
- external links for electron not working ([14d8c0f](https://github.com/johannesjo/super-productivity/commit/14d8c0f))
- finish day button not being centered ([e59adfb](https://github.com/johannesjo/super-productivity/commit/e59adfb))
- first start issue with project state ([f0d8c6f](https://github.com/johannesjo/super-productivity/commit/f0d8c6f))
- focus behavior ([7993970](https://github.com/johannesjo/super-productivity/commit/7993970))
- for older browsers ([dbb9311](https://github.com/johannesjo/super-productivity/commit/dbb9311))
- force same height for project and main nav buttons ([c98d4c0](https://github.com/johannesjo/super-productivity/commit/c98d4c0))
- google final sync ([dd75574](https://github.com/johannesjo/super-productivity/commit/dd75574))
- google login for electron ([762efff](https://github.com/johannesjo/super-productivity/commit/762efff))
- google sync not working ([370cb4e](https://github.com/johannesjo/super-productivity/commit/370cb4e))
- google sync not working ([382e0d8](https://github.com/johannesjo/super-productivity/commit/382e0d8))
- icon ([eed6cb9](https://github.com/johannesjo/super-productivity/commit/eed6cb9))
- import ([52c9990](https://github.com/johannesjo/super-productivity/commit/52c9990))
- inline edit sometimes not updating value ([8ad7af2](https://github.com/johannesjo/super-productivity/commit/8ad7af2))
- inline markdown component rendering ([2337fb4](https://github.com/johannesjo/super-productivity/commit/2337fb4))
- input duration slider not working as we want ([7d15ff3](https://github.com/johannesjo/super-productivity/commit/7d15ff3))
- ipc send breaking web ([af8353b](https://github.com/johannesjo/super-productivity/commit/af8353b))
- issue model issues ([68524d4](https://github.com/johannesjo/super-productivity/commit/68524d4))
- jira cfg form only being editable when host etc are present ([cd27dbf](https://github.com/johannesjo/super-productivity/commit/cd27dbf))
- jira issue content text color error ([b7782f8](https://github.com/johannesjo/super-productivity/commit/b7782f8))
- jira password field not being a password field ([35b39f7](https://github.com/johannesjo/super-productivity/commit/35b39f7))
- keyboard shortcuts not working for edge case ([c5fc2f1](https://github.com/johannesjo/super-productivity/commit/c5fc2f1))
- lint ([8ff9dfb](https://github.com/johannesjo/super-productivity/commit/8ff9dfb))
- lint ([c4d2dc2](https://github.com/johannesjo/super-productivity/commit/c4d2dc2))
- lint ([23c6db7](https://github.com/johannesjo/super-productivity/commit/23c6db7))
- lint ([461067b](https://github.com/johannesjo/super-productivity/commit/461067b))
- localForage not being ready initially ([47484a5](https://github.com/johannesjo/super-productivity/commit/47484a5))
- main header navigation for mobile ([d2a9681](https://github.com/johannesjo/super-productivity/commit/d2a9681))
- make back button work again ([a3b5b17](https://github.com/johannesjo/super-productivity/commit/a3b5b17))
- manifest ([2e1634d](https://github.com/johannesjo/super-productivity/commit/2e1634d))
- markdown links for electron ([1f9f659](https://github.com/johannesjo/super-productivity/commit/1f9f659))
- mat table throwing error because of es6 compilation ([8f68326](https://github.com/johannesjo/super-productivity/commit/8f68326))
- minor issue ([d9f7405](https://github.com/johannesjo/super-productivity/commit/d9f7405))
- minor styling issue ([575ed11](https://github.com/johannesjo/super-productivity/commit/575ed11))
- mobile bookmark bar button styling ([aa244c5](https://github.com/johannesjo/super-productivity/commit/aa244c5))
- mouse wheel zoom direction for electron ([ca9409e](https://github.com/johannesjo/super-productivity/commit/ca9409e))
- next task sometimes selecting weird values ([017b83e](https://github.com/johannesjo/super-productivity/commit/017b83e))
- no state worklog ([3e83b49](https://github.com/johannesjo/super-productivity/commit/3e83b49))
- note background for dark theme ([0e05b2c](https://github.com/johannesjo/super-productivity/commit/0e05b2c))
- note state being overwritten by task state ([e429a32](https://github.com/johannesjo/super-productivity/commit/e429a32))
- note value being null sometimes ([7662938](https://github.com/johannesjo/super-productivity/commit/7662938))
- open not being present ([f519ee0](https://github.com/johannesjo/super-productivity/commit/f519ee0))
- paste not working any more ([3289145](https://github.com/johannesjo/super-productivity/commit/3289145))
- persistence ([59dab7a](https://github.com/johannesjo/super-productivity/commit/59dab7a))
- planning mode being always triggered initially ([77e2ea3](https://github.com/johannesjo/super-productivity/commit/77e2ea3))
- planning mode popping in weirdly ([8b4cd69](https://github.com/johannesjo/super-productivity/commit/8b4cd69))
- play icon for dark theme ([d2dbda8](https://github.com/johannesjo/super-productivity/commit/d2dbda8))
- possible wrong data crashing app ([b74c82a](https://github.com/johannesjo/super-productivity/commit/b74c82a))
- potential database error ([38edebf](https://github.com/johannesjo/super-productivity/commit/38edebf))
- potential error in global link list, when dropping html elements ([4b80285](https://github.com/johannesjo/super-productivity/commit/4b80285))
- potential errors when interacting with ls ([39d8287](https://github.com/johannesjo/super-productivity/commit/39d8287))
- potential worklog error if there is nothing in the archive ([abc82ad](https://github.com/johannesjo/super-productivity/commit/abc82ad))
- project change for worklog ([db84304](https://github.com/johannesjo/super-productivity/commit/db84304))
- projects saving for load state ([a3884be](https://github.com/johannesjo/super-productivity/commit/a3884be))
- projects without jira cfg throwing errors ([11459cc](https://github.com/johannesjo/super-productivity/commit/11459cc))
- reducer being executed twice ([854e43c](https://github.com/johannesjo/super-productivity/commit/854e43c))
- remove debug val from tpl ([3e1f6ae](https://github.com/johannesjo/super-productivity/commit/3e1f6ae))
- scrolling issue on mobile ([cf118b3](https://github.com/johannesjo/super-productivity/commit/cf118b3))
- selecting next task throwing an error ([0f5630e](https://github.com/johannesjo/super-productivity/commit/0f5630e))
- semicolons instead of commas ([7662454](https://github.com/johannesjo/super-productivity/commit/7662454))
- setting model from input for input duration slider ([a0e8862](https://github.com/johannesjo/super-productivity/commit/a0e8862))
- settings for dark theme ([a9363d2](https://github.com/johannesjo/super-productivity/commit/a9363d2))
- settings not being scrollable ([75e674a](https://github.com/johannesjo/super-productivity/commit/75e674a))
- several minor theming issues ([98e41c7](https://github.com/johannesjo/super-productivity/commit/98e41c7))
- shutdown not working ([ca34f75](https://github.com/johannesjo/super-productivity/commit/ca34f75))
- shutdown not working ([1255223](https://github.com/johannesjo/super-productivity/commit/1255223))
- simple task export not working ([650b858](https://github.com/johannesjo/super-productivity/commit/650b858))
- snack custom styling ([0fb3731](https://github.com/johannesjo/super-productivity/commit/0fb3731))
- snack login button ([3e1f629](https://github.com/johannesjo/super-productivity/commit/3e1f629))
- styling for project overview page ([0ce4c5b](https://github.com/johannesjo/super-productivity/commit/0ce4c5b))
- success animation ([a22c856](https://github.com/johannesjo/super-productivity/commit/a22c856))
- super productivity getting cut off for project switcher ([7824c35](https://github.com/johannesjo/super-productivity/commit/7824c35))
- take a break ([e8e51a2](https://github.com/johannesjo/super-productivity/commit/e8e51a2))
- task list switch animation leading to errors sometimes ([8ed8d10](https://github.com/johannesjo/super-productivity/commit/8ed8d10))
- task styling ([e1329ec](https://github.com/johannesjo/super-productivity/commit/e1329ec))
- task sync not triggering for moving tasks ([6fefed1](https://github.com/johannesjo/super-productivity/commit/6fefed1))
- the possibility of starting a done task via button ([d077219](https://github.com/johannesjo/super-productivity/commit/d077219))
- theme body class ([c4c1298](https://github.com/johannesjo/super-productivity/commit/c4c1298))
- time spent not updating ([bc1ee5b](https://github.com/johannesjo/super-productivity/commit/bc1ee5b))
- time worked without a break being twice as fast ([cf58078](https://github.com/johannesjo/super-productivity/commit/cf58078))
- time worked without a break popping in ([a0ad47d](https://github.com/johannesjo/super-productivity/commit/a0ad47d))
- typing ([91979d0](https://github.com/johannesjo/super-productivity/commit/91979d0))
- typing error ([15a5212](https://github.com/johannesjo/super-productivity/commit/15a5212))
- typing error ([8c0c2f8](https://github.com/johannesjo/super-productivity/commit/8c0c2f8))
- typing error ([4a29b2b](https://github.com/johannesjo/super-productivity/commit/4a29b2b))
- typing error ([5429541](https://github.com/johannesjo/super-productivity/commit/5429541))
- typing error ([2d3200f](https://github.com/johannesjo/super-productivity/commit/2d3200f))
- typing for google timesheet export ([b3f74ec](https://github.com/johannesjo/super-productivity/commit/b3f74ec))
- typing for input duration slider ([874bb17](https://github.com/johannesjo/super-productivity/commit/874bb17))
- typing for ma archive to worklog ([691ae55](https://github.com/johannesjo/super-productivity/commit/691ae55))
- typing issue ([3663e17](https://github.com/johannesjo/super-productivity/commit/3663e17))
- typing issue ([2548168](https://github.com/johannesjo/super-productivity/commit/2548168))
- typing issue ([ef49a21](https://github.com/johannesjo/super-productivity/commit/ef49a21))
- **electron:** remove dbus related stuff for now ([8497d82](https://github.com/johannesjo/super-productivity/commit/8497d82))
- typo ([00ad367](https://github.com/johannesjo/super-productivity/commit/00ad367))
- typo ([d450efb](https://github.com/johannesjo/super-productivity/commit/d450efb))
- work around ngrx formly issues :( ([1fab8ef](https://github.com/johannesjo/super-productivity/commit/1fab8ef))
- work around, that jira images can't be loaded currently for electron ([be61a8b](https://github.com/johannesjo/super-productivity/commit/be61a8b))
- **bookmarks:** fix form for bookmarks ([ab4c04d](https://github.com/johannesjo/super-productivity/commit/ab4c04d))
- **bookmarks:** persistence for bookmark toggle state ([fafb266](https://github.com/johannesjo/super-productivity/commit/fafb266))
- **electron:** don't load electron handlers for web instance ([a42011a](https://github.com/johannesjo/super-productivity/commit/a42011a))
- **electron:** linting errors ([c2bce87](https://github.com/johannesjo/super-productivity/commit/c2bce87))
- **electron:** tray dark mode icon ([cabd99c](https://github.com/johannesjo/super-productivity/commit/cabd99c))
- **electron:** type import ([4402eca](https://github.com/johannesjo/super-productivity/commit/4402eca))
- **enlargeImg:** image animation sometimes not triggering as intended ([10162b1](https://github.com/johannesjo/super-productivity/commit/10162b1))
- **enlargeImg:** zoom out animation failing when in zoomed mode and clicking on background ([b1db3e9](https://github.com/johannesjo/super-productivity/commit/b1db3e9))
- **git:** error when polling issues ([7b87f99](https://github.com/johannesjo/super-productivity/commit/7b87f99))
- **git:** search not working ([58fceb9](https://github.com/johannesjo/super-productivity/commit/58fceb9))
- **googleDriveSnyc:** opening multiple dialogs ([736acb9](https://github.com/johannesjo/super-productivity/commit/736acb9))
- **googleDriveSync:** case when there is no initial file id ([5c9f7e8](https://github.com/johannesjo/super-productivity/commit/5c9f7e8))
- **googleDriveSync:** check for remote update ([e07a77b](https://github.com/johannesjo/super-productivity/commit/e07a77b))
- **googleDriveSync:** config section ([a42d03f](https://github.com/johannesjo/super-productivity/commit/a42d03f))
- **googleDriveSync:** electron calls ([18843f0](https://github.com/johannesjo/super-productivity/commit/18843f0))
- **googleDriveSync:** error handling ([42e142a](https://github.com/johannesjo/super-productivity/commit/42e142a))
- **googleDriveSync:** expression changed after check error ([73f56c4](https://github.com/johannesjo/super-productivity/commit/73f56c4))
- **googleDriveSync:** fix async toast notification ([f860844](https://github.com/johannesjo/super-productivity/commit/f860844))
- **googleDriveSync:** google config ([0915856](https://github.com/johannesjo/super-productivity/commit/0915856))
- **googleDriveSync:** initial login not being triggered ([49faf0f](https://github.com/johannesjo/super-productivity/commit/49faf0f))
- **googleDriveSync:** login for electron not working ([52e316e](https://github.com/johannesjo/super-productivity/commit/52e316e))
- **googleDriveSync:** make change sync file work ([da094be](https://github.com/johannesjo/super-productivity/commit/da094be))
- **googleDriveSync:** make it kinda work ([8e29afa](https://github.com/johannesjo/super-productivity/commit/8e29afa))
- **googleDriveSync:** quick fix for data not found error ([6051e3b](https://github.com/johannesjo/super-productivity/commit/6051e3b))
- **googleDriveSync:** request filter ([fa7b6ce](https://github.com/johannesjo/super-productivity/commit/fa7b6ce))
- **googleDriveSync:** save not working any more ([7fe4030](https://github.com/johannesjo/super-productivity/commit/7fe4030))
- **googleTimeSheetExport:** settings not being saved ([e7fd8ff](https://github.com/johannesjo/super-productivity/commit/e7fd8ff))
- **googleTimeSheetExport:** updating default values not working ([516013f](https://github.com/johannesjo/super-productivity/commit/516013f))
- **idle:** create task not working ([0ec81d4](https://github.com/johannesjo/super-productivity/commit/0ec81d4))
- **inputDurationSlider:** hour problem ([9569011](https://github.com/johannesjo/super-productivity/commit/9569011))
- **inputDurationSlider:** not working as intended ([ee70a74](https://github.com/johannesjo/super-productivity/commit/ee70a74))
- **jira:** cfg component throwing an error ([4a9a990](https://github.com/johannesjo/super-productivity/commit/4a9a990))
- **jira:** default jira config being enabled ([a563fbe](https://github.com/johannesjo/super-productivity/commit/a563fbe))
- **jira:** don't refresh backlog if not enabled ([24e6ad6](https://github.com/johannesjo/super-productivity/commit/24e6ad6))
- **jira:** error handling ([d8fcb67](https://github.com/johannesjo/super-productivity/commit/d8fcb67))
- **jira:** extension request not working ([68e0bf0](https://github.com/johannesjo/super-productivity/commit/68e0bf0))
- **jira:** issue polling happening quite too often ([dd5f217](https://github.com/johannesjo/super-productivity/commit/dd5f217))
- **jira:** mark issues as checked throwing an error ([5109d0a](https://github.com/johannesjo/super-productivity/commit/5109d0a))
- **jira:** no way to disable ([683e847](https://github.com/johannesjo/super-productivity/commit/683e847))
- **jira:** only do initial request when enabled ([90c56b3](https://github.com/johannesjo/super-productivity/commit/90c56b3))
- **jira:** potential error for auto updates when there are no comments ([c069126](https://github.com/johannesjo/super-productivity/commit/c069126))
- **jira:** problem when jira cfg is missing ([0eef193](https://github.com/johannesjo/super-productivity/commit/0eef193))
- **jira:** query not working ([3862c46](https://github.com/johannesjo/super-productivity/commit/3862c46))
- **jira:** text color and author image styling ([4c26eb1](https://github.com/johannesjo/super-productivity/commit/4c26eb1))
- **pomodoro:** cycles not working as intended ([07c4527](https://github.com/johannesjo/super-productivity/commit/07c4527))
- **pomodoro:** pausing tracking not working as intended ([50646b3](https://github.com/johannesjo/super-productivity/commit/50646b3))
- **pomodoro:** several issues ([c3fa7df](https://github.com/johannesjo/super-productivity/commit/c3fa7df))
- **project:** creation dialog bot resetting tmp data after project creation ([d80e97c](https://github.com/johannesjo/super-productivity/commit/d80e97c))
- **projects:** project creation dialog ([8ba5405](https://github.com/johannesjo/super-productivity/commit/8ba5405))
- **task:** mobile drag and drop ([9ab424b](https://github.com/johannesjo/super-productivity/commit/9ab424b))
- **tasks:** animation issues ([2cb6b48](https://github.com/johannesjo/super-productivity/commit/2cb6b48))
- **tasks:** animation playing when opening backlog ([6898294](https://github.com/johannesjo/super-productivity/commit/6898294))
- **tasks:** attachment color ([53f29a9](https://github.com/johannesjo/super-productivity/commit/53f29a9))
- **tasks:** case when last sub task was deleted ([c77fb8e](https://github.com/johannesjo/super-productivity/commit/c77fb8e))
- **tasks:** case when sub task is added to current task ([eb01a6b](https://github.com/johannesjo/super-productivity/commit/eb01a6b))
- **tasks:** color changing on drag ([5f64d83](https://github.com/johannesjo/super-productivity/commit/5f64d83))
- **tasks:** colors for light theme ([77d12d4](https://github.com/johannesjo/super-productivity/commit/77d12d4))
- **tasks:** crucial bug where task state in db was overwritten ([9b7798f](https://github.com/johannesjo/super-productivity/commit/9b7798f))
- **tasks:** deleting backlog and todays task items ([0fb6053](https://github.com/johannesjo/super-productivity/commit/0fb6053))
- **tasks:** deleting sub tasks ([a72c1db](https://github.com/johannesjo/super-productivity/commit/a72c1db))
- **tasks:** error in template ([d00ed88](https://github.com/johannesjo/super-productivity/commit/d00ed88))
- **tasks:** estimate remaining calculation ([130a1f2](https://github.com/johannesjo/super-productivity/commit/130a1f2))
- **tasks:** focusing after task deletion not working ([fcb0e8d](https://github.com/johannesjo/super-productivity/commit/fcb0e8d))
- **tasks:** issue check not working as intended ([d027f89](https://github.com/johannesjo/super-productivity/commit/d027f89))
- **tasks:** issue text not being visible ([f1ae984](https://github.com/johannesjo/super-productivity/commit/f1ae984))
- **tasks:** jira info not being readable ([d7e88b9](https://github.com/johannesjo/super-productivity/commit/d7e88b9))
- **tasks:** minor styling issue ([7fdc6c5](https://github.com/johannesjo/super-productivity/commit/7fdc6c5))
- **tasks:** mobile styling ([bdbbf2e](https://github.com/johannesjo/super-productivity/commit/bdbbf2e))
- **tasks:** next task selection on done ([b1c9a0a](https://github.com/johannesjo/super-productivity/commit/b1c9a0a))
- **tasks:** prevent drag handle shrinking ([38fbe53](https://github.com/johannesjo/super-productivity/commit/38fbe53))
- **tasks:** remove animation for checkmark when list is animating ([7fc20d7](https://github.com/johannesjo/super-productivity/commit/7fc20d7))
- **tasks:** task isDone styling ([57874b1](https://github.com/johannesjo/super-productivity/commit/57874b1))
- worklog for async data ([1ef7014](https://github.com/johannesjo/super-productivity/commit/1ef7014))
- **tasks:** time spent sometimes linking values ([c5d866c](https://github.com/johannesjo/super-productivity/commit/c5d866c))
- **tasks:** toggle to undone ([db8b1d1](https://github.com/johannesjo/super-productivity/commit/db8b1d1))

### Features

- add 15 min to datetime input ([f18d489](https://github.com/johannesjo/super-productivity/commit/f18d489))
- add actual notification to take a break reminder ([864d61b](https://github.com/johannesjo/super-productivity/commit/864d61b))
- add add task btn to work view ([708eccb](https://github.com/johannesjo/super-productivity/commit/708eccb))
- add add-task-bar component ([47df742](https://github.com/johannesjo/super-productivity/commit/47df742))
- add and style note for tomorrow ([9ad72f2](https://github.com/johannesjo/super-productivity/commit/9ad72f2))
- add attachment via task context menu ([dbe31f5](https://github.com/johannesjo/super-productivity/commit/dbe31f5))
- add backdrop for add task bar ([5302392](https://github.com/johannesjo/super-productivity/commit/5302392))
- add badge for undone tasks rather than for notes ([c7acd56](https://github.com/johannesjo/super-productivity/commit/c7acd56))
- add basic functionality to play button ([4d2f135](https://github.com/johannesjo/super-productivity/commit/4d2f135))
- add basic jira config section ([768d519](https://github.com/johannesjo/super-productivity/commit/768d519))
- add basic project settings ([6e51051](https://github.com/johannesjo/super-productivity/commit/6e51051))
- add basic split component ([3a4ae2c](https://github.com/johannesjo/super-productivity/commit/3a4ae2c))
- add basic sync interface and add function to load complete user data ([c69428a](https://github.com/johannesjo/super-productivity/commit/c69428a))
- add better ios support ([e85d613](https://github.com/johannesjo/super-productivity/commit/e85d613))
- add body class to help with showing and hiding elements when there is/ain't jira support ([8da579c](https://github.com/johannesjo/super-productivity/commit/8da579c))
- add boilerplate for datetime-input ([cbf5ab1](https://github.com/johannesjo/super-productivity/commit/cbf5ab1))
- add complete misc settings interface ([db800cf](https://github.com/johannesjo/super-productivity/commit/db800cf))
- add confirm dialog for deleting projects ([21543b9](https://github.com/johannesjo/super-productivity/commit/21543b9))
- add copy to clipboard for simple task summary ([ee0b10b](https://github.com/johannesjo/super-productivity/commit/ee0b10b))
- add counter for split ([d8fa02a](https://github.com/johannesjo/super-productivity/commit/d8fa02a))
- add css scroll bars ([c841a85](https://github.com/johannesjo/super-productivity/commit/c841a85))
- add data to daily summary ([c0d9560](https://github.com/johannesjo/super-productivity/commit/c0d9560))
- add datetime input with buttons for simplicity ([99846d0](https://github.com/johannesjo/super-productivity/commit/99846d0))
- add debugging code for google login ([1335249](https://github.com/johannesjo/super-productivity/commit/1335249))
- add default issue provider configs to default project ([2b7d626](https://github.com/johannesjo/super-productivity/commit/2b7d626))
- add dialogs as ngrx component ([564bb0b](https://github.com/johannesjo/super-productivity/commit/564bb0b))
- add different color for backlog ([e53be44](https://github.com/johannesjo/super-productivity/commit/e53be44))
- add double enter starts working ([df0b940](https://github.com/johannesjo/super-productivity/commit/df0b940))
- add download button for simple summary ([d944968](https://github.com/johannesjo/super-productivity/commit/d944968))
- add drag and drop for task list ([9eae8a7](https://github.com/johannesjo/super-productivity/commit/9eae8a7))
- add dragging cursor to drag handle ([46450ed](https://github.com/johannesjo/super-productivity/commit/46450ed))
- add duration input for formly forms ([8181512](https://github.com/johannesjo/super-productivity/commit/8181512))
- add estimate remaining for backlog ([ed8cd97](https://github.com/johannesjo/super-productivity/commit/ed8cd97))
- add expand panel animation ([82f5e4c](https://github.com/johannesjo/super-productivity/commit/82f5e4c))
- add frameless window for mac ([75ba25b](https://github.com/johannesjo/super-productivity/commit/75ba25b))
- add hit area to speed dial items ([85d6e38](https://github.com/johannesjo/super-productivity/commit/85d6e38))
- add icons ([15eb3a7](https://github.com/johannesjo/super-productivity/commit/15eb3a7))
- add icons to jira and git setup dialogs ([23cf4de](https://github.com/johannesjo/super-productivity/commit/23cf4de))
- add inset shadow to work vie page header ([6fa1bb5](https://github.com/johannesjo/super-productivity/commit/6fa1bb5))
- add isIdle$ as observable ([2fa90e4](https://github.com/johannesjo/super-productivity/commit/2fa90e4))
- add issue icon to issue search ([603fed8](https://github.com/johannesjo/super-productivity/commit/603fed8))
- add jira attachments ([0195c07](https://github.com/johannesjo/super-productivity/commit/0195c07))
- add local forage and prepare data saving ([94e9c3b](https://github.com/johannesjo/super-productivity/commit/94e9c3b))
- add mat typography globally ([d3cc604](https://github.com/johannesjo/super-productivity/commit/d3cc604))
- add missing detect changes ([a842c47](https://github.com/johannesjo/super-productivity/commit/a842c47))
- add missing help texts ([8278458](https://github.com/johannesjo/super-productivity/commit/8278458))
- add missing misc settings ([1f9eeb7](https://github.com/johannesjo/super-productivity/commit/1f9eeb7))
- add missing on push change detection strategy ([5c1c58f](https://github.com/johannesjo/super-productivity/commit/5c1c58f))
- add missing state to root state ([228ef9a](https://github.com/johannesjo/super-productivity/commit/228ef9a))
- add model for focus id lists ([380583b](https://github.com/johannesjo/super-productivity/commit/380583b))
- add more ipc events ([1574ea7](https://github.com/johannesjo/super-productivity/commit/1574ea7))
- add more minimal task ui ([14c7131](https://github.com/johannesjo/super-productivity/commit/14c7131))
- add most basic duration input slider ([578414c](https://github.com/johannesjo/super-productivity/commit/578414c))
- add most basic split backlog ([1003dd6](https://github.com/johannesjo/super-productivity/commit/1003dd6))
- add mousewheel zoom for electron ([55a79cd](https://github.com/johannesjo/super-productivity/commit/55a79cd))
- add move cursor to handle ([00c9771](https://github.com/johannesjo/super-productivity/commit/00c9771))
- add new input also to add reminder dialog ([4e42734](https://github.com/johannesjo/super-productivity/commit/4e42734))
- add new media mixin ([709fc44](https://github.com/johannesjo/super-productivity/commit/709fc44))
- add new play icon ([27959af](https://github.com/johannesjo/super-productivity/commit/27959af))
- add nice little animation to attachments ([33e2eed](https://github.com/johannesjo/super-productivity/commit/33e2eed))
- add no archived tasks to worklog ([0500b96](https://github.com/johannesjo/super-productivity/commit/0500b96))
- add note to install extension for jira cfg ([af03eae](https://github.com/johannesjo/super-productivity/commit/af03eae))
- add option to only track idle time when there is a current task ([24ab839](https://github.com/johannesjo/super-productivity/commit/24ab839))
- add overflow scrolling for mobile ([1d6e156](https://github.com/johannesjo/super-productivity/commit/1d6e156))
- add pink theme ([0e7fd09](https://github.com/johannesjo/super-productivity/commit/0e7fd09))
- add plan your day to new work view ([c3888bd](https://github.com/johannesjo/super-productivity/commit/c3888bd))
- add pre load for enlarge image ([52b0aac](https://github.com/johannesjo/super-productivity/commit/52b0aac))
- add productivity tips on startup ([994ef3c](https://github.com/johannesjo/super-productivity/commit/994ef3c))
- add project related data action ([cffecf1](https://github.com/johannesjo/super-productivity/commit/cffecf1))
- add proper jira and git icon ([36e6c4a](https://github.com/johannesjo/super-productivity/commit/36e6c4a))
- add pulse animation when tracking time ([4fae79d](https://github.com/johannesjo/super-productivity/commit/4fae79d))
- add real progress to progress circle ([4eaaf4e](https://github.com/johannesjo/super-productivity/commit/4eaaf4e))
- add reducer for global layout stuff and remove daily planner ([44faeff](https://github.com/johannesjo/super-productivity/commit/44faeff))
- add reload data function to sync interface ([29dacd3](https://github.com/johannesjo/super-productivity/commit/29dacd3))
- add robot for tasks as well ([4cc7084](https://github.com/johannesjo/super-productivity/commit/4cc7084))
- add roboto sans ([a7565b5](https://github.com/johannesjo/super-productivity/commit/a7565b5))
- add routing animations ([1eba194](https://github.com/johannesjo/super-productivity/commit/1eba194))
- add saving and loading from ls ([c2d81f4](https://github.com/johannesjo/super-productivity/commit/c2d81f4))
- add saving to ls again ([4c38b91](https://github.com/johannesjo/super-productivity/commit/4c38b91))
- add short syntax ([cca760b](https://github.com/johannesjo/super-productivity/commit/cca760b))
- add shortcut for open add task bar ([5aee2bf](https://github.com/johannesjo/super-productivity/commit/5aee2bf))
- add shortcut for toggling backlog ([2474e92](https://github.com/johannesjo/super-productivity/commit/2474e92))
- add shortcut to toggle bookmark bar ([a626a66](https://github.com/johannesjo/super-productivity/commit/a626a66))
- add show task bar to main header quick access ([9745f1b](https://github.com/johannesjo/super-productivity/commit/9745f1b))
- add shutdown ([5b1dd13](https://github.com/johannesjo/super-productivity/commit/5b1dd13))
- add shutdown to finish day for electron ([0116f0e](https://github.com/johannesjo/super-productivity/commit/0116f0e))
- add simple file import export of app data ([b3c8b84](https://github.com/johannesjo/super-productivity/commit/b3c8b84))
- add simple summary for worklog too ([c54c445](https://github.com/johannesjo/super-productivity/commit/c54c445))
- add simple task summary ([2a1f121](https://github.com/johannesjo/super-productivity/commit/2a1f121))
- add some route links ([e6ca6b3](https://github.com/johannesjo/super-productivity/commit/e6ca6b3))
- add some useful mixins ([669ce4c](https://github.com/johannesjo/super-productivity/commit/669ce4c))
- add sophisticated select next task logic ([5d02745](https://github.com/johannesjo/super-productivity/commit/5d02745))
- add split component ([80577b5](https://github.com/johannesjo/super-productivity/commit/80577b5))
- add startedTimeToday for project model ([6445b05](https://github.com/johannesjo/super-productivity/commit/6445b05))
- add styles for dragula ([69c56d0](https://github.com/johannesjo/super-productivity/commit/69c56d0))
- add sub tasks ([48a5f75](https://github.com/johannesjo/super-productivity/commit/48a5f75))
- add subtle snack type to use it for syncing and polling ([c99329b](https://github.com/johannesjo/super-productivity/commit/c99329b))
- add super cool loading spinner ([cf81761](https://github.com/johannesjo/super-productivity/commit/cf81761))
- add tabs to daily summary and most basic google time export component ([faa9ba1](https://github.com/johannesjo/super-productivity/commit/faa9ba1))
- add take a break reminder and time worked without break counter ([9dbf0ea](https://github.com/johannesjo/super-productivity/commit/9dbf0ea))
- add task archive ([c60a4d3](https://github.com/johannesjo/super-productivity/commit/c60a4d3))
- add task selection for idle time ([1268cfa](https://github.com/johannesjo/super-productivity/commit/1268cfa))
- add theme class to body rather than to app ([598dd54](https://github.com/johannesjo/super-productivity/commit/598dd54))
- add theme colors for duration input ([4d7a8e9](https://github.com/johannesjo/super-productivity/commit/4d7a8e9))
- add time estimate to simple task summary export [#1](https://github.com/johannesjo/super-productivity/issues/1) ([adfaab9](https://github.com/johannesjo/super-productivity/commit/adfaab9))
- add trackBy to task list for performance and to fix animations ([3a2a019](https://github.com/johannesjo/super-productivity/commit/3a2a019))
- add typing to config form constants ([d87d1b3](https://github.com/johannesjo/super-productivity/commit/d87d1b3))
- add view logic part for task drag & drop ([d6211b8](https://github.com/johannesjo/super-productivity/commit/d6211b8))
- adjust app loading spinner position ([eafde19](https://github.com/johannesjo/super-productivity/commit/eafde19))
- adjust default table styling ([9d9505a](https://github.com/johannesjo/super-productivity/commit/9d9505a))
- adjust header shadow ([cafb505](https://github.com/johannesjo/super-productivity/commit/cafb505))
- adjust styling ([3c82be1](https://github.com/johannesjo/super-productivity/commit/3c82be1))
- adjust styling ([7109d31](https://github.com/johannesjo/super-productivity/commit/7109d31))
- allow for dropping inside empty lists ([b7db0b5](https://github.com/johannesjo/super-productivity/commit/b7db0b5))
- allow pause and play of last current task ([1bb1cc4](https://github.com/johannesjo/super-productivity/commit/1bb1cc4))
- also add stagger to leave list animation ([00cddef](https://github.com/johannesjo/super-productivity/commit/00cddef))
- also sync attachment state ([9a3684e](https://github.com/johannesjo/super-productivity/commit/9a3684e))
- animate markdown edit ([95a0d8e](https://github.com/johannesjo/super-productivity/commit/95a0d8e))
- auto delete task attachments for sub tasks ([441acf5](https://github.com/johannesjo/super-productivity/commit/441acf5))
- auto reload data for missing issues ([8600a7b](https://github.com/johannesjo/super-productivity/commit/8600a7b))
- beatify and improve worklog ([7b3f239](https://github.com/johannesjo/super-productivity/commit/7b3f239))
- beautify add task and work view header ([24932c6](https://github.com/johannesjo/super-productivity/commit/24932c6))
- beautify daily planner ([c651aca](https://github.com/johannesjo/super-productivity/commit/c651aca))
- beautify daily summary ([614d3aa](https://github.com/johannesjo/super-productivity/commit/614d3aa))
- beautify daily summary ([d7ab2d7](https://github.com/johannesjo/super-productivity/commit/d7ab2d7))
- beautify task summary table ([1efa03e](https://github.com/johannesjo/super-productivity/commit/1efa03e))
- beautify tasks some more ([3697f1f](https://github.com/johannesjo/super-productivity/commit/3697f1f))
- block saving while importing data ([ac2a5b2](https://github.com/johannesjo/super-productivity/commit/ac2a5b2))
- break to 2 line nav much later ([ee39fed](https://github.com/johannesjo/super-productivity/commit/ee39fed))
- bring back burger menu for smaller screens ([1207de9](https://github.com/johannesjo/super-productivity/commit/1207de9))
- cache all google fonts ([431dc0b](https://github.com/johannesjo/super-productivity/commit/431dc0b))
- change default shortcut for bookmarks ([e5afa8c](https://github.com/johannesjo/super-productivity/commit/e5afa8c))
- change default shortcuts ([9f34298](https://github.com/johannesjo/super-productivity/commit/9f34298))
- change toggle backlog default shortcut ([1451293](https://github.com/johannesjo/super-productivity/commit/1451293))
- check if issue was imported before creating a task ([906dec7](https://github.com/johannesjo/super-productivity/commit/906dec7))
- confirm before quit for electron ([cf99578](https://github.com/johannesjo/super-productivity/commit/cf99578))
- confirm before quit for web ([8b2d3ef](https://github.com/johannesjo/super-productivity/commit/8b2d3ef))
- connect settings for idle time ([0b07414](https://github.com/johannesjo/super-productivity/commit/0b07414))
- create tick in a more reactive style ([91329fc](https://github.com/johannesjo/super-productivity/commit/91329fc))
- declutter ui further by only showing timer icon on hover ([ba1b91f](https://github.com/johannesjo/super-productivity/commit/ba1b91f))
- display worklog always again ([b8dd56b](https://github.com/johannesjo/super-productivity/commit/b8dd56b))
- don't always start dev tools for production ([6044e67](https://github.com/johannesjo/super-productivity/commit/6044e67))
- don't emit invalid values from datetime input ([b1c531d](https://github.com/johannesjo/super-productivity/commit/b1c531d))
- don't save last active for note ui action ([5259044](https://github.com/johannesjo/super-productivity/commit/5259044))
- don't save last active when saving google session data ([4ba65aa](https://github.com/johannesjo/super-productivity/commit/4ba65aa))
- don't submit google drive sync cfg if invalid ([a526cd3](https://github.com/johannesjo/super-productivity/commit/a526cd3))
- don't trigger global key combos if inside an input and no special keys are used ([8997d43](https://github.com/johannesjo/super-productivity/commit/8997d43))
- don't update last active for project change ([1315961](https://github.com/johannesjo/super-productivity/commit/1315961))
- even more fine tuning for nav ([b44f600](https://github.com/johannesjo/super-productivity/commit/b44f600))
- fine tune daily summary styling ([be11bfa](https://github.com/johannesjo/super-productivity/commit/be11bfa))
- finish styling for progress circle ([39af8f6](https://github.com/johannesjo/super-productivity/commit/39af8f6))
- fix daily summary success animation ([fc4f98c](https://github.com/johannesjo/super-productivity/commit/fc4f98c))
- flatten daily summary table tasks ([3cdf0e1](https://github.com/johannesjo/super-productivity/commit/3cdf0e1))
- force final sync to google drive ([d014f3c](https://github.com/johannesjo/super-productivity/commit/d014f3c))
- get rid extra container ([6d77211](https://github.com/johannesjo/super-productivity/commit/6d77211))
- handle error when syncing on daily summary fails ([3af8bda](https://github.com/johannesjo/super-productivity/commit/3af8bda))
- hide bookmarks on new projects and first start ([fa2cd87](https://github.com/johannesjo/super-productivity/commit/fa2cd87))
- hide calendar ([72da73b](https://github.com/johannesjo/super-productivity/commit/72da73b))
- hide time estimate button for parent tasks ([3b7f4fc](https://github.com/johannesjo/super-productivity/commit/3b7f4fc))
- implement dynamic config section content ([e0bee93](https://github.com/johannesjo/super-productivity/commit/e0bee93))
- improve all animations ([6253ddc](https://github.com/johannesjo/super-productivity/commit/6253ddc))
- improve config forms ([ea97e42](https://github.com/johannesjo/super-productivity/commit/ea97e42))
- improve daily summary styling ([cf25579](https://github.com/johannesjo/super-productivity/commit/cf25579))
- improve default task model and task type to be more performant ([668e846](https://github.com/johannesjo/super-productivity/commit/668e846))
- improve enlarge image animation for jira assets ([a0203ef](https://github.com/johannesjo/super-productivity/commit/a0203ef))
- improve first app start experience ([7e49556](https://github.com/johannesjo/super-productivity/commit/7e49556))
- improve focus behavior ([c152c96](https://github.com/johannesjo/super-productivity/commit/c152c96))
- improve folder structure ([9878d0d](https://github.com/johannesjo/super-productivity/commit/9878d0d))
- improve form and add settings for idle time ([a7b76a1](https://github.com/johannesjo/super-productivity/commit/a7b76a1))
- improve frameless window for mac ([03eff3c](https://github.com/johannesjo/super-productivity/commit/03eff3c))
- improve hide sub tasks animation ([7c0bd9a](https://github.com/johannesjo/super-productivity/commit/7c0bd9a))
- improve icon nav header for small mobile ([ead2cac](https://github.com/johannesjo/super-productivity/commit/ead2cac))
- improve idle time dialog ([1057ab5](https://github.com/johannesjo/super-productivity/commit/1057ab5))
- improve jira credentials ([a203528](https://github.com/johannesjo/super-productivity/commit/a203528))
- improve main header styling ([5dcc5ca](https://github.com/johannesjo/super-productivity/commit/5dcc5ca))
- improve markdown even further ([5bb08ec](https://github.com/johannesjo/super-productivity/commit/5bb08ec))
- improve markdown further ([c4842af](https://github.com/johannesjo/super-productivity/commit/c4842af))
- improve note readability ([1061ff8](https://github.com/johannesjo/super-productivity/commit/1061ff8))
- improve performance ([843685b](https://github.com/johannesjo/super-productivity/commit/843685b))
- improve pomodoro timer styling ([2e365aa](https://github.com/johannesjo/super-productivity/commit/2e365aa))
- improve scrollbars ([8ca335b](https://github.com/johannesjo/super-productivity/commit/8ca335b))
- improve simple task summary for worklog ([a67f9bf](https://github.com/johannesjo/super-productivity/commit/a67f9bf))
- improve split ([5f0126c](https://github.com/johannesjo/super-productivity/commit/5f0126c))
- improve split drag ([6e9c9e6](https://github.com/johannesjo/super-productivity/commit/6e9c9e6))
- improve split further ([0ee9339](https://github.com/johannesjo/super-productivity/commit/0ee9339))
- improve split further and further ([4b50856](https://github.com/johannesjo/super-productivity/commit/4b50856))
- improve split handle by little animation ([df040c0](https://github.com/johannesjo/super-productivity/commit/df040c0))
- improve split styling ([14b97c2](https://github.com/johannesjo/super-productivity/commit/14b97c2))
- improve styling for plan mode ([b2055d5](https://github.com/johannesjo/super-productivity/commit/b2055d5))
- improve work view header ([ef103da](https://github.com/johannesjo/super-productivity/commit/ef103da))
- improve work view header styling ([e625cb8](https://github.com/johannesjo/super-productivity/commit/e625cb8))
- improve work-view and split styling ([650d357](https://github.com/johannesjo/super-productivity/commit/650d357))
- include complete task data for missing issue observable ([c7139a3](https://github.com/johannesjo/super-productivity/commit/c7139a3))
- increase storage quota ([11b891f](https://github.com/johannesjo/super-productivity/commit/11b891f))
- integrate export task list nicely into daily summary ([ecf92e8](https://github.com/johannesjo/super-productivity/commit/ecf92e8))
- leave scrollbar alone for mac ([c81a921](https://github.com/johannesjo/super-productivity/commit/c81a921))
- limit cfg update notification to public sections ([1f4a653](https://github.com/johannesjo/super-productivity/commit/1f4a653))
- limit min max zoom ([7928c10](https://github.com/johannesjo/super-productivity/commit/7928c10))
- link sp icon to work view ([ccb1b07](https://github.com/johannesjo/super-productivity/commit/ccb1b07))
- load project data initially ([1489ef0](https://github.com/johannesjo/super-productivity/commit/1489ef0))
- login before every google request to avoid errors ([bd6946f](https://github.com/johannesjo/super-productivity/commit/bd6946f))
- make active nav link bold ([72607d8](https://github.com/johannesjo/super-productivity/commit/72607d8))
- make async database basically work ([666204e](https://github.com/johannesjo/super-productivity/commit/666204e))
- make completed and uncompleted tasks work ([b742dfd](https://github.com/johannesjo/super-productivity/commit/b742dfd))
- make config section and config form more flexible ([a0c87d0](https://github.com/johannesjo/super-productivity/commit/a0c87d0))
- make deleting sub tasks work ([7ce44bf](https://github.com/johannesjo/super-productivity/commit/7ce44bf))
- make deleting sub tasks work ([72242e1](https://github.com/johannesjo/super-productivity/commit/72242e1))
- make flat list for attachments in jira panel ([9558f76](https://github.com/johannesjo/super-productivity/commit/9558f76))
- make google export time work for daily summary ([62d3410](https://github.com/johannesjo/super-productivity/commit/62d3410))
- make header always smaller ([1a84508](https://github.com/johannesjo/super-productivity/commit/1a84508))
- make header fixed ([c74e263](https://github.com/johannesjo/super-productivity/commit/c74e263))
- make hiding the navigation optional ([c12616d](https://github.com/johannesjo/super-productivity/commit/c12616d))
- make it work like before ([4afb0ac](https://github.com/johannesjo/super-productivity/commit/4afb0ac))
- make most simple idle time handling work ([bdcd6ea](https://github.com/johannesjo/super-productivity/commit/bdcd6ea))
- make new input duration slider work inside dialog time estimate ([fc51397](https://github.com/johannesjo/super-productivity/commit/fc51397))
- make notifications work ([a7ade53](https://github.com/johannesjo/super-productivity/commit/a7ade53))
- make saving work over projects ([c70b703](https://github.com/johannesjo/super-productivity/commit/c70b703))
- make setting the current task possible again ([56b1fa5](https://github.com/johannesjo/super-productivity/commit/56b1fa5))
- make split a little bigger ([860e05e](https://github.com/johannesjo/super-productivity/commit/860e05e))
- make split drag work on mobile ([37a42af](https://github.com/johannesjo/super-productivity/commit/37a42af))
- make split less prominent ([af62c34](https://github.com/johannesjo/super-productivity/commit/af62c34))
- make static import of v1 exports work ([4c5a413](https://github.com/johannesjo/super-productivity/commit/4c5a413))
- make tasks work as most basic entity ([7df9300](https://github.com/johannesjo/super-productivity/commit/7df9300))
- make time estimate exceeded snack stay longer ([6542e71](https://github.com/johannesjo/super-productivity/commit/6542e71))
- make undo delete task work with task attachments ([e8a6598](https://github.com/johannesjo/super-productivity/commit/e8a6598))
- make update one work ([820106a](https://github.com/johannesjo/super-productivity/commit/820106a))
- make web worker work ([c0ddeb4](https://github.com/johannesjo/super-productivity/commit/c0ddeb4))
- minor change ([dd12331](https://github.com/johannesjo/super-productivity/commit/dd12331))
- minor improvement for task keyboard navigation ([06977f9](https://github.com/johannesjo/super-productivity/commit/06977f9))
- minor styling adjustment ([c4aa2d6](https://github.com/johannesjo/super-productivity/commit/c4aa2d6))
- minor styling improvements ([30fcad3](https://github.com/johannesjo/super-productivity/commit/30fcad3))
- more fine tuning for nav ([44c4056](https://github.com/johannesjo/super-productivity/commit/44c4056))
- move mark as done up, because it is more important ([adecf2f](https://github.com/johannesjo/super-productivity/commit/adecf2f))
- move speed dial to top ([1374081](https://github.com/johannesjo/super-productivity/commit/1374081))
- move speed dial to top ([847d16a](https://github.com/johannesjo/super-productivity/commit/847d16a))
- moving current task to backlog selects next task ([d633dcd](https://github.com/johannesjo/super-productivity/commit/d633dcd))
- no focus for textarea in simple task summary ([f40b640](https://github.com/johannesjo/super-productivity/commit/f40b640))
- notify when time estimate was exceeded ([478a2c8](https://github.com/johannesjo/super-productivity/commit/478a2c8))
- omit google tokens when importing data via google drive sync ([97f5e9c](https://github.com/johannesjo/super-productivity/commit/97f5e9c))
- only add overlay scrollbars to browsers that support them ([d1c4454](https://github.com/johannesjo/super-productivity/commit/d1c4454))
- only show hover styles for non parent tasks ([80dd325](https://github.com/johannesjo/super-productivity/commit/80dd325))
- only show take a break if enabled ([20f49c6](https://github.com/johannesjo/super-productivity/commit/20f49c6))
- only show toggle show notes button when there are notes ([11dfb03](https://github.com/johannesjo/super-productivity/commit/11dfb03))
- only show toggle show notes button when there are ntoes ([9da3e6c](https://github.com/johannesjo/super-productivity/commit/9da3e6c))
- open and close backlog via click ([eaf41e3](https://github.com/johannesjo/super-productivity/commit/eaf41e3))
- outline app structure ([2b99e83](https://github.com/johannesjo/super-productivity/commit/2b99e83))
- outline app structure2 ([d4bce6b](https://github.com/johannesjo/super-productivity/commit/d4bce6b))
- package material icons with app ([4d18e2f](https://github.com/johannesjo/super-productivity/commit/4d18e2f))
- persist daily summary tab index ([e19503b](https://github.com/johannesjo/super-productivity/commit/e19503b))
- persist settings for simple summary ([2ab1888](https://github.com/johannesjo/super-productivity/commit/2ab1888))
- persist zoom level for electron ([f3eeb12](https://github.com/johannesjo/super-productivity/commit/f3eeb12))
- port edit on click ([c3cf848](https://github.com/johannesjo/super-productivity/commit/c3cf848))
- **bookmarks:** add basic edit / ad dialog ([ac56ed6](https://github.com/johannesjo/super-productivity/commit/ac56ed6))
- **bookmarks:** add basic styling for bookmark bar ([447ceee](https://github.com/johannesjo/super-productivity/commit/447ceee))
- **bookmarks:** add boilerplate files ([c938333](https://github.com/johannesjo/super-productivity/commit/c938333))
- **bookmarks:** add external link directive ([7ff05b0](https://github.com/johannesjo/super-productivity/commit/7ff05b0))
- **bookmarks:** add facade store stuff ([2e813ab](https://github.com/johannesjo/super-productivity/commit/2e813ab))
- **bookmarks:** add icon to edit dialog ([1b1e427](https://github.com/johannesjo/super-productivity/commit/1b1e427))
- **bookmarks:** add image links ([f23065b](https://github.com/johannesjo/super-productivity/commit/f23065b))
- **bookmarks:** add layout methods for bookmarks ([f716fe3](https://github.com/johannesjo/super-productivity/commit/f716fe3))
- **bookmarks:** add nice drag over ui element ([8763170](https://github.com/johannesjo/super-productivity/commit/8763170))
- **bookmarks:** add persistence to bookmarks ([7102efa](https://github.com/johannesjo/super-productivity/commit/7102efa))
- **bookmarks:** add possibility to run bookmark command ([21532c8](https://github.com/johannesjo/super-productivity/commit/21532c8))
- **bookmarks:** add show/hide for bookmark bar ([6a95116](https://github.com/johannesjo/super-productivity/commit/6a95116))
- **bookmarks:** add store stuff for layout model ([aed3b91](https://github.com/johannesjo/super-productivity/commit/aed3b91))
- **bookmarks:** adjust sub header style ([544f5c6](https://github.com/johannesjo/super-productivity/commit/544f5c6))
- **bookmarks:** also blur element ([3627968](https://github.com/johannesjo/super-productivity/commit/3627968))
- **bookmarks:** animate bar ([52d7bab](https://github.com/johannesjo/super-productivity/commit/52d7bab))
- **bookmarks:** beautify bookmark bar ([755f06f](https://github.com/johannesjo/super-productivity/commit/755f06f))
- **bookmarks:** implement drag & drop for links ([ac06b90](https://github.com/johannesjo/super-productivity/commit/ac06b90))
- **bookmarks:** make saving local task attachments work ([200f6a8](https://github.com/johannesjo/super-productivity/commit/200f6a8))
- **bookmarks:** make split component work with dynamic header height ([294efe5](https://github.com/johannesjo/super-productivity/commit/294efe5))
- **bookmarks:** prevent page reloads from drops ([0f759ce](https://github.com/johannesjo/super-productivity/commit/0f759ce))
- **config:** add basic keyboard config ([3af844a](https://github.com/johannesjo/super-productivity/commit/3af844a))
- **config:** add basic markup and components ([7161762](https://github.com/johannesjo/super-productivity/commit/7161762))
- **config:** add boilerplate ([2ee82c1](https://github.com/johannesjo/super-productivity/commit/2ee82c1))
- **config:** add collapsable component ([9720b44](https://github.com/johannesjo/super-productivity/commit/9720b44))
- **config:** add form config ([c03ca71](https://github.com/johannesjo/super-productivity/commit/c03ca71))
- **config:** add help section ([c05f14d](https://github.com/johannesjo/super-productivity/commit/c05f14d))
- **config:** add model ([adc7286](https://github.com/johannesjo/super-productivity/commit/adc7286))
- **config:** add more boilerplate ([5538b31](https://github.com/johannesjo/super-productivity/commit/5538b31))
- **config:** add ngx formly ([702828b](https://github.com/johannesjo/super-productivity/commit/702828b))
- **config:** add proper store ([d349568](https://github.com/johannesjo/super-productivity/commit/d349568))
- **config:** add update notification ([743f5cf](https://github.com/johannesjo/super-productivity/commit/743f5cf))
- **config:** always create a copy for config forms ([53df8e3](https://github.com/johannesjo/super-productivity/commit/53df8e3))
- **config:** improve help section ([4036d42](https://github.com/johannesjo/super-productivity/commit/4036d42))
- **config:** improve styling ([18a06b8](https://github.com/johannesjo/super-productivity/commit/18a06b8))
- **config:** make all keyboard shortcuts configurable ([1b0d82e](https://github.com/johannesjo/super-productivity/commit/1b0d82e))
- **config:** make basic config form work ([83a9429](https://github.com/johannesjo/super-productivity/commit/83a9429))
- **config:** make data for the config components work ([9bb5a45](https://github.com/johannesjo/super-productivity/commit/9bb5a45))
- **config:** make saving for config form work ([ba5fc07](https://github.com/johannesjo/super-productivity/commit/ba5fc07))
- **config:** make saving to ls work ([2a41bc6](https://github.com/johannesjo/super-productivity/commit/2a41bc6))
- **config:** only show update config notification for non private props ([3e37bd7](https://github.com/johannesjo/super-productivity/commit/3e37bd7))
- **electron:** add basic setup and convert all files to typescript ([6796ca0](https://github.com/johannesjo/super-productivity/commit/6796ca0))
- **electron:** add open dev tools ([0b0dec2](https://github.com/johannesjo/super-productivity/commit/0b0dec2))
- **electron:** disable reload shortcut for production build ([b2c4ab0](https://github.com/johannesjo/super-productivity/commit/b2c4ab0))
- **electron:** don't open dev tools initially ([2a78fb1](https://github.com/johannesjo/super-productivity/commit/2a78fb1))
- **electron:** make indicator work again ([9d3d544](https://github.com/johannesjo/super-productivity/commit/9d3d544))
- **electron:** make typescript for electron work ([b28f6eb](https://github.com/johannesjo/super-productivity/commit/b28f6eb))
- **electron:** show electron errors ([9557acf](https://github.com/johannesjo/super-productivity/commit/9557acf))
- **electron:** show win gracefully ([a3734ba](https://github.com/johannesjo/super-productivity/commit/a3734ba))
- **enlargeImg:** add possibility to move zoomed in detail ([44f644b](https://github.com/johannesjo/super-productivity/commit/44f644b))
- **enlargeImg:** add some fine tuning ([86808d2](https://github.com/johannesjo/super-productivity/commit/86808d2))
- **enlargeImg:** improve animation and remove hide ([65a9eba](https://github.com/johannesjo/super-productivity/commit/65a9eba))
- **enlargeImg:** make most simple form of zooming work nicely ([990eaaa](https://github.com/johannesjo/super-productivity/commit/990eaaa))
- **enlargeImg:** prepare zoom ([f647463](https://github.com/johannesjo/super-productivity/commit/f647463))
- **extensionInterface:** improve extension interface ([47ec23f](https://github.com/johannesjo/super-productivity/commit/47ec23f))
- **git:** add basic issue template ([95ddee9](https://github.com/johannesjo/super-productivity/commit/95ddee9))
- **git:** add boilerplate ([27645b8](https://github.com/johannesjo/super-productivity/commit/27645b8))
- **git:** add caching for data ([07599cf](https://github.com/johannesjo/super-productivity/commit/07599cf))
- **git:** add code to get complete issue data for repository ([3453909](https://github.com/johannesjo/super-productivity/commit/3453909))
- **git:** add config dialog ([9fb2ed6](https://github.com/johannesjo/super-productivity/commit/9fb2ed6))
- **git:** add config for github integration ([9779500](https://github.com/johannesjo/super-productivity/commit/9779500))
- **git:** add error handling ([2ebf182](https://github.com/johannesjo/super-productivity/commit/2ebf182))
- **git:** add git issues to search and make add task bar more generic ([77ff285](https://github.com/johannesjo/super-productivity/commit/77ff285))
- **git:** add issue tab header and fix comments ([2ca1bf6](https://github.com/johannesjo/super-productivity/commit/2ca1bf6))
- **git:** add messages for auto import ([5017357](https://github.com/johannesjo/super-productivity/commit/5017357))
- **git:** add model and persistence for it ([438da92](https://github.com/johannesjo/super-productivity/commit/438da92))
- **git:** add polling updates ([3e2616e](https://github.com/johannesjo/super-productivity/commit/3e2616e))
- **git:** add pre check for api ([a0da47a](https://github.com/johannesjo/super-productivity/commit/a0da47a))
- **git:** add proper url ([63822c0](https://github.com/johannesjo/super-productivity/commit/63822c0))
- **git:** add saving issue configs from settings ([51f112d](https://github.com/johannesjo/super-productivity/commit/51f112d))
- **git:** add some basic api methods ([7108919](https://github.com/johannesjo/super-productivity/commit/7108919))
- **git:** add to migrate service ([f8a050e](https://github.com/johannesjo/super-productivity/commit/f8a050e))
- **git:** also abstract loading issue states and add properly load for git ([b36ceda](https://github.com/johannesjo/super-productivity/commit/b36ceda))
- **git:** also search issue body ([17e0d44](https://github.com/johannesjo/super-productivity/commit/17e0d44))
- **git:** auto import issues to backlog ([4f9daf1](https://github.com/johannesjo/super-productivity/commit/4f9daf1))
- **git:** better check ([980cc2c](https://github.com/johannesjo/super-productivity/commit/980cc2c))
- **git:** cleanup and and restore issues based on task actions ([74c6312](https://github.com/johannesjo/super-productivity/commit/74c6312))
- **git:** get more comments ([87365ec](https://github.com/johannesjo/super-productivity/commit/87365ec))
- **git:** implement issue icon as pipe ([b7126b3](https://github.com/johannesjo/super-productivity/commit/b7126b3))
- **git:** improve config ([2073c8b](https://github.com/johannesjo/super-productivity/commit/2073c8b))
- **git:** load comments for git issues ([4f056f2](https://github.com/johannesjo/super-productivity/commit/4f056f2))
- **git:** make polling updates work ([9671fa6](https://github.com/johannesjo/super-productivity/commit/9671fa6))
- **git:** make searching work again ([8886081](https://github.com/johannesjo/super-productivity/commit/8886081))
- **git:** prepare polling issues ([eb21a8c](https://github.com/johannesjo/super-productivity/commit/eb21a8c))
- **git:** refresh issue data on project change ([f1432c6](https://github.com/johannesjo/super-productivity/commit/f1432c6))
- **git:** use fresh git issue data when importing ([58ba253](https://github.com/johannesjo/super-productivity/commit/58ba253))
- **git:** use issue number as id, as the id is not practical for the api ([34c93a2](https://github.com/johannesjo/super-productivity/commit/34c93a2))
- **google:** improve login ([afed8ee](https://github.com/johannesjo/super-productivity/commit/afed8ee))
- **googleApi:** auto refresh token for web ([59ec4bf](https://github.com/johannesjo/super-productivity/commit/59ec4bf))
- **googleApi:** don't fire request when there is no token ([c9ec8a6](https://github.com/johannesjo/super-productivity/commit/c9ec8a6))
- **googleDriveSync:** add confirm drive sync load dialog ([3871aa8](https://github.com/johannesjo/super-productivity/commit/3871aa8))
- **googleDriveSync:** add confirm save dialog ([6c82f55](https://github.com/johannesjo/super-productivity/commit/6c82f55))
- **googleDriveSync:** add first outline of service ([96cd485](https://github.com/johannesjo/super-productivity/commit/96cd485))
- **googleDriveSync:** add interface for model ([1c1b042](https://github.com/johannesjo/super-productivity/commit/1c1b042))
- **googleDriveSync:** add outline for basic async toast ([3a070e5](https://github.com/johannesjo/super-productivity/commit/3a070e5))
- **googleDriveSync:** add promise btn ([2b9d702](https://github.com/johannesjo/super-productivity/commit/2b9d702))
- **googleDriveSync:** add proper error handling when being offline ([9ae7368](https://github.com/johannesjo/super-productivity/commit/9ae7368))
- **googleDriveSync:** add simple confirms ([e27c75a](https://github.com/johannesjo/super-productivity/commit/e27c75a))
- **googleDriveSync:** better error handling ([aaebc76](https://github.com/johannesjo/super-productivity/commit/aaebc76))
- **googleDriveSync:** don't ask again if other option was choosen ([aab12cf](https://github.com/johannesjo/super-productivity/commit/aab12cf))
- **googleDriveSync:** don't exec stuff when in progress ([7555352](https://github.com/johannesjo/super-productivity/commit/7555352))
- **googleDriveSync:** don't show other snacks when async toast is there ([8600200](https://github.com/johannesjo/super-productivity/commit/8600200))
- **googleDriveSync:** don't sync if offline ([b1251c9](https://github.com/johannesjo/super-productivity/commit/b1251c9))
- **googleDriveSync:** don't update last active in some instances and improve messaging ([7243254](https://github.com/johannesjo/super-productivity/commit/7243254))
- **googleDriveSync:** don't update when there are no changes ([c2c9afc](https://github.com/johannesjo/super-productivity/commit/c2c9afc))
- **googleDriveSync:** fix google sync config form ([7fda9ed](https://github.com/johannesjo/super-productivity/commit/7fda9ed))
- **googleDriveSync:** improve dialogs ([4ab0369](https://github.com/johannesjo/super-productivity/commit/4ab0369))
- **googleDriveSync:** improve sync config ([814686a](https://github.com/johannesjo/super-productivity/commit/814686a))
- **googleDriveSync:** improve sync config 2 ([ad0916d](https://github.com/johannesjo/super-productivity/commit/ad0916d))
- **googleDriveSync:** improve syncing process and checks ([3a2693e](https://github.com/johannesjo/super-productivity/commit/3a2693e))
- **googleDriveSync:** make async toast work again ([6040ca3](https://github.com/johannesjo/super-productivity/commit/6040ca3))
- **googleDriveSync:** make config work inside config block ([3db2ad4](https://github.com/johannesjo/super-productivity/commit/3db2ad4))
- **googleDriveSync:** make it work ([b8400fe](https://github.com/johannesjo/super-productivity/commit/b8400fe))
- **googleDriveSync:** make loading backup work (apart from globalConfig) ([0906737](https://github.com/johannesjo/super-productivity/commit/0906737))
- **googleDriveSync:** make saving the backup work ([52b2cf2](https://github.com/johannesjo/super-productivity/commit/52b2cf2))
- **googleDriveSync:** only block other requests for a specified amount of time ([aeea4ec](https://github.com/johannesjo/super-productivity/commit/aeea4ec))
- **googleDriveSync:** save a local backup before importing data and fall back if something fails ([73f81d2](https://github.com/johannesjo/super-productivity/commit/73f81d2))
- **googleDriveSync:** save and get last active local ([c01c26e](https://github.com/johannesjo/super-productivity/commit/c01c26e))
- **googleDriveSync:** slightly improve ui ([ca08c24](https://github.com/johannesjo/super-productivity/commit/ca08c24))
- **googleIntegration:** add boilerplate ([94dac21](https://github.com/johannesjo/super-productivity/commit/94dac21))
- **googleIntegration:** add snacks for the process ([9cfa045](https://github.com/johannesjo/super-productivity/commit/9cfa045))
- **googleIntegration:** dirty port first version of google api service from sp1 ([04fd96a](https://github.com/johannesjo/super-productivity/commit/04fd96a))
- **googleIntegration:** make login work ([eff8177](https://github.com/johannesjo/super-productivity/commit/eff8177))
- **googleIntegration:** prepare google sync cfg ([dd28aff](https://github.com/johannesjo/super-productivity/commit/dd28aff))
- **googleTimeSheet:** add {startTime} and {taskTitles} ([5a4571a](https://github.com/johannesjo/super-productivity/commit/5a4571a))
- **history:** add boilerplate and nice header ([3044e0f](https://github.com/johannesjo/super-productivity/commit/3044e0f))
- **history:** make active tab work ([90e40ba](https://github.com/johannesjo/super-productivity/commit/90e40ba))
- **history:** make most basic worklog work ([d4c7994](https://github.com/johannesjo/super-productivity/commit/d4c7994))
- **history:** refine ([78318b6](https://github.com/johannesjo/super-productivity/commit/78318b6))
- **history:** refine2 ([8ff868d](https://github.com/johannesjo/super-productivity/commit/8ff868d))
- **inputDurationSlider:** add animation and fix mobile styling ([2806770](https://github.com/johannesjo/super-productivity/commit/2806770))
- **jira:** add a link to reply a comment ([b77b036](https://github.com/johannesjo/super-productivity/commit/b77b036))
- **jira:** add add action for task ith issue ([9eb7659](https://github.com/johannesjo/super-productivity/commit/9eb7659))
- **jira:** add all types and map data ([8699053](https://github.com/johannesjo/super-productivity/commit/8699053))
- **jira:** add basic dialog for transitioning issues ([813b28a](https://github.com/johannesjo/super-productivity/commit/813b28a))
- **jira:** add basic jira issue module ([9bd9bcb](https://github.com/johannesjo/super-productivity/commit/9bd9bcb))
- **jira:** add better search for jira ([2227e33](https://github.com/johannesjo/super-productivity/commit/2227e33))
- **jira:** add better search for jira ([45523c6](https://github.com/johannesjo/super-productivity/commit/45523c6))
- **jira:** add cfg stepper as its own modal ([58ceab8](https://github.com/johannesjo/super-productivity/commit/58ceab8))
- **jira:** add chrome extension interface ([0dade0c](https://github.com/johannesjo/super-productivity/commit/0dade0c))
- **jira:** add component based approach to show issue content and header ([57eb538](https://github.com/johannesjo/super-productivity/commit/57eb538))
- **jira:** add custom config form ([3e49c2a](https://github.com/johannesjo/super-productivity/commit/3e49c2a))
- **jira:** add description focus mode ([a4b42a6](https://github.com/johannesjo/super-productivity/commit/a4b42a6))
- **jira:** add effects for transition handling ([125a56e](https://github.com/johannesjo/super-productivity/commit/125a56e))
- **jira:** add error notifications and fix issue search ([4462445](https://github.com/johannesjo/super-productivity/commit/4462445))
- **jira:** add first final version of form ([02d190e](https://github.com/johannesjo/super-productivity/commit/02d190e))
- **jira:** add form config ([bbc493c](https://github.com/johannesjo/super-productivity/commit/bbc493c))
- **jira:** add help ([6bc7f63](https://github.com/johannesjo/super-productivity/commit/6bc7f63))
- **jira:** add helper observable checking for missing issues ([8523e5e](https://github.com/johannesjo/super-productivity/commit/8523e5e))
- **jira:** add issue selector for transition handling ([804fe64](https://github.com/johannesjo/super-productivity/commit/804fe64))
- **jira:** add jira data to task ([52b5eff](https://github.com/johannesjo/super-productivity/commit/52b5eff))
- **jira:** add jira for electron ([4fa9daf](https://github.com/johannesjo/super-productivity/commit/4fa9daf))
- **jira:** add loading spinner to add task bar ([1e86c95](https://github.com/johannesjo/super-productivity/commit/1e86c95))
- **jira:** add most basic issue info tab ([253b449](https://github.com/johannesjo/super-productivity/commit/253b449))
- **jira:** add notification when updating settings ([245cbbe](https://github.com/johannesjo/super-productivity/commit/245cbbe))
- **jira:** add persistence for jira issues ([90cf7c6](https://github.com/johannesjo/super-productivity/commit/90cf7c6))
- **jira:** add show updates and a way to hide them ([bf58512](https://github.com/johannesjo/super-productivity/commit/bf58512))
- **jira:** add snack to unblock again ([8b7c073](https://github.com/johannesjo/super-productivity/commit/8b7c073))
- **jira:** add submit worklog dialog ([78977ab](https://github.com/johannesjo/super-productivity/commit/78977ab))
- **jira:** add test credentials to stepper ([f9b66d1](https://github.com/johannesjo/super-productivity/commit/f9b66d1))
- **jira:** add transforms to requests ([57b408e](https://github.com/johannesjo/super-productivity/commit/57b408e))
- **jira:** add transition issue ([f623756](https://github.com/johannesjo/super-productivity/commit/f623756))
- **jira:** add worklog data to jira issue content ([774deaa](https://github.com/johannesjo/super-productivity/commit/774deaa))
- **jira:** adjust default settings ([5148a72](https://github.com/johannesjo/super-productivity/commit/5148a72))
- **jira:** poll issues for updates ([7623071](https://github.com/johannesjo/super-productivity/commit/7623071))
- prepare service worker stuff ([10d1973](https://github.com/johannesjo/super-productivity/commit/10d1973))
- **jira:** adjust max time out ([a1e3eb1](https://github.com/johannesjo/super-productivity/commit/a1e3eb1))
- **jira:** adjust polling back to normal ([9959a79](https://github.com/johannesjo/super-productivity/commit/9959a79))
- **jira:** allow for specifying max results ([ad44c2f](https://github.com/johannesjo/super-productivity/commit/ad44c2f))
- **jira:** auto assign userAssignee to current user when test credentials was clicked ([7a414bf](https://github.com/johannesjo/super-productivity/commit/7a414bf))
- **jira:** auto import issues ([606d756](https://github.com/johannesjo/super-productivity/commit/606d756))
- **jira:** beautify comments ([7a8e257](https://github.com/johannesjo/super-productivity/commit/7a8e257))
- **jira:** block requests after one failed ([ed55f32](https://github.com/johannesjo/super-productivity/commit/ed55f32))
- **jira:** change default query for backlog ([ab21e59](https://github.com/johannesjo/super-productivity/commit/ab21e59))
- **jira:** check for minimal settings before firing a jira request ([738fb4a](https://github.com/johannesjo/super-productivity/commit/738fb4a))
- **jira:** cleanup issue data when task is deleted ([30fdf6e](https://github.com/johannesjo/super-productivity/commit/30fdf6e))
- **jira:** convert api usage from promise to observable ([7fa3213](https://github.com/johannesjo/super-productivity/commit/7fa3213))
- **jira:** further improve update issue ([7a63ad3](https://github.com/johannesjo/super-productivity/commit/7a63ad3))
- **jira:** get complete data when auto importing issues ([1ced867](https://github.com/johannesjo/super-productivity/commit/1ced867))
- **jira:** get list with jira issues for autocomplete ([e38af8d](https://github.com/johannesjo/super-productivity/commit/e38af8d))
- **jira:** improve issue attachment styling and reduce th width ([09bcda1](https://github.com/johannesjo/super-productivity/commit/09bcda1))
- **jira:** improve login flow ([88f31f1](https://github.com/johannesjo/super-productivity/commit/88f31f1))
- **jira:** improve mobile experience for config stepper ([639cbfd](https://github.com/johannesjo/super-productivity/commit/639cbfd))
- **jira:** improve transition dialog ([9ec70eb](https://github.com/johannesjo/super-productivity/commit/9ec70eb))
- **jira:** improve transition notifications ([1ede100](https://github.com/johannesjo/super-productivity/commit/1ede100))
- **jira:** improve update issue behaviour ([a27d1de](https://github.com/johannesjo/super-productivity/commit/a27d1de))
- **jira:** list changes ([ac4a897](https://github.com/johannesjo/super-productivity/commit/ac4a897))
- **jira:** load full issue data in second request to speed up search ([d449f46](https://github.com/johannesjo/super-productivity/commit/d449f46))
- **jira:** make auto transitions work ([92d24f7](https://github.com/johannesjo/super-productivity/commit/92d24f7))
- **jira:** make issue assignment work ([a957d6a](https://github.com/johannesjo/super-productivity/commit/a957d6a))
- **jira:** make issue assignment work ([830a2c0](https://github.com/johannesjo/super-productivity/commit/830a2c0))
- **jira:** make it work with electron ([5cf4954](https://github.com/johannesjo/super-productivity/commit/5cf4954))
- **jira:** make it work with jira api and chrome extension ([4482667](https://github.com/johannesjo/super-productivity/commit/4482667))
- **jira:** make saving of jira config work ([f6c72c7](https://github.com/johannesjo/super-productivity/commit/f6c72c7))
- **jira:** make submitting worklogs work ([df6bffc](https://github.com/johannesjo/super-productivity/commit/df6bffc))
- **jira:** make transitioning work nicely by updating local issue data afterwards ([eccb2db](https://github.com/johannesjo/super-productivity/commit/eccb2db))
- **jira:** make transitions configurable ([c214d9d](https://github.com/johannesjo/super-productivity/commit/c214d9d))
- **jira:** minor refactor for effects ([ac19b7e](https://github.com/johannesjo/super-productivity/commit/ac19b7e))
- **jira:** minor styling adjustment ([6112e03](https://github.com/johannesjo/super-productivity/commit/6112e03))
- **jira:** only poll issues if setting is enabled ([a5ec40d](https://github.com/johannesjo/super-productivity/commit/a5ec40d))
- **jira:** only transition if needed ([cc59f73](https://github.com/johannesjo/super-productivity/commit/cc59f73))
- **jira:** outline config ui ([2aa3ff9](https://github.com/johannesjo/super-productivity/commit/2aa3ff9))
- **jira:** outline interfaces and constants ([7af4d4c](https://github.com/johannesjo/super-productivity/commit/7af4d4c))
- **jira:** prepare effect for opening worklog dialog ([09e4230](https://github.com/johannesjo/super-productivity/commit/09e4230))
- **jira:** prepare issue module ([21b6a03](https://github.com/johannesjo/super-productivity/commit/21b6a03))
- **jira:** reject timed out promises ([b0286bd](https://github.com/johannesjo/super-productivity/commit/b0286bd))
- **jira:** remove open state and prepare for model changes ([c9311c3](https://github.com/johannesjo/super-productivity/commit/c9311c3))
- **jira:** save issue together with task ([a350e93](https://github.com/johannesjo/super-productivity/commit/a350e93))
- **jira:** show attachments directly ([78dcde9](https://github.com/johannesjo/super-productivity/commit/78dcde9))
- **jira:** show basic attachments ([46e2c1e](https://github.com/johannesjo/super-productivity/commit/46e2c1e))
- **jira:** show notification when issue was updated ([31af432](https://github.com/johannesjo/super-productivity/commit/31af432))
- **jira:** update model ([2c9c79a](https://github.com/johannesjo/super-productivity/commit/2c9c79a))
- **jira:** use constants for several things ([91388df](https://github.com/johannesjo/super-productivity/commit/91388df))
- **jira, git:** improve polling behaviour ([9d21739](https://github.com/johannesjo/super-productivity/commit/9d21739))
- **localBackup:** add boilerplate ([1a9a46f](https://github.com/johannesjo/super-productivity/commit/1a9a46f))
- **localBackup:** add frontend side of things ([e292422](https://github.com/johannesjo/super-productivity/commit/e292422))
- **localBackup:** save simple backups from electron ([6cef8bf](https://github.com/johannesjo/super-productivity/commit/6cef8bf))
- **mainHeader:** add elevation to main toolbar ([f4164d5](https://github.com/johannesjo/super-productivity/commit/f4164d5))
- **mainHeader:** add most basic navigation ([3627538](https://github.com/johannesjo/super-productivity/commit/3627538))
- **mainHeader:** add sp icon ([15408c4](https://github.com/johannesjo/super-productivity/commit/15408c4))
- **mainHeader:** improve project switcher ([5478ed6](https://github.com/johannesjo/super-productivity/commit/5478ed6))
- **migrate:** make migration work for single project instances and improve confirm ([fb560ad](https://github.com/johannesjo/super-productivity/commit/fb560ad))
- **migrateV1:** add additional data and fix data not showing up ([e4252ad](https://github.com/johannesjo/super-productivity/commit/e4252ad))
- **migrateV1:** add basic data for issues ([36b02c6](https://github.com/johannesjo/super-productivity/commit/36b02c6))
- **migrateV1:** add basic migration models and constants ([dafc13a](https://github.com/johannesjo/super-productivity/commit/dafc13a))
- **migrateV1:** add most basic migration script ([afdc0a9](https://github.com/johannesjo/super-productivity/commit/afdc0a9))
- **migrateV1:** allow for worklog items to be reverted to todays task ([9da671e](https://github.com/johannesjo/super-productivity/commit/9da671e))
- **migrateV1:** also migrate what little old issue data we have ([06938dd](https://github.com/johannesjo/super-productivity/commit/06938dd))
- **migrateV1:** you only migrate once TM ([63a01e5](https://github.com/johannesjo/super-productivity/commit/63a01e5))
- **note:** adjust snacks ([a3074a8](https://github.com/johannesjo/super-productivity/commit/a3074a8))
- **note:** adjust style for modals ([e1dcd3f](https://github.com/johannesjo/super-productivity/commit/e1dcd3f))
- **note:** fix mobile style for add dialog ([d67e343](https://github.com/johannesjo/super-productivity/commit/d67e343))
- **notes:** add animation ([46d2925](https://github.com/johannesjo/super-productivity/commit/46d2925))
- **notes:** add back focus styles ([8628c8d](https://github.com/johannesjo/super-productivity/commit/8628c8d))
- **notes:** add badge for number of notes ([991e7c1](https://github.com/johannesjo/super-productivity/commit/991e7c1))
- **notes:** add boilerplate code ([5d77b9a](https://github.com/johannesjo/super-productivity/commit/5d77b9a))
- **notes:** add drag & drop ordering ([18910bc](https://github.com/johannesjo/super-productivity/commit/18910bc))
- **notes:** add drawer to display notes in ([7fcef48](https://github.com/johannesjo/super-productivity/commit/7fcef48))
- **notes:** add focus styles ([9ef9696](https://github.com/johannesjo/super-productivity/commit/9ef9696))
- **notes:** add keyboard shortcut ([d944fd9](https://github.com/johannesjo/super-productivity/commit/d944fd9))
- **notes:** add most basic notes ([115f0ee](https://github.com/johannesjo/super-productivity/commit/115f0ee))
- **notes:** add most simple add note dialog ([8c5e307](https://github.com/johannesjo/super-productivity/commit/8c5e307))
- **notes:** add most simple ui version ([f3ace08](https://github.com/johannesjo/super-productivity/commit/f3ace08))
- **notes:** add note state and layout state to persistence ([d1347b4](https://github.com/johannesjo/super-productivity/commit/d1347b4))
- **notes:** add persistence ([648038e](https://github.com/johannesjo/super-productivity/commit/648038e))
- **notes:** add shortcut config for new add note dialog ([7d20a0f](https://github.com/johannesjo/super-productivity/commit/7d20a0f))
- **notes:** add submit via ctrl+enter ([7b66dd0](https://github.com/johannesjo/super-productivity/commit/7b66dd0))
- **notes:** add to top rather than bottom of list ([5705575](https://github.com/johannesjo/super-productivity/commit/5705575))
- **notes:** also persist show hide ([ab5d1a8](https://github.com/johannesjo/super-productivity/commit/ab5d1a8))
- **notes:** connect backdrop click to store action ([55eda9f](https://github.com/johannesjo/super-productivity/commit/55eda9f))
- **notes:** fix focus behavior for notes ([b03f79b](https://github.com/johannesjo/super-productivity/commit/b03f79b))
- **notes:** focus added note ([aab8d7a](https://github.com/johannesjo/super-productivity/commit/aab8d7a))
- **notes:** focus button when panel is opened ([1baedee](https://github.com/johannesjo/super-productivity/commit/1baedee))
- **notes:** improve styling ([c604487](https://github.com/johannesjo/super-productivity/commit/c604487))
- **notes:** improve styling ([5b64abf](https://github.com/johannesjo/super-productivity/commit/5b64abf))
- **notes:** improve styling a bit ([d7416dc](https://github.com/johannesjo/super-productivity/commit/d7416dc))
- **notes:** improve styling further ([d52c559](https://github.com/johannesjo/super-productivity/commit/d52c559))
- **notes:** limit drag and drop to button ([c2fc305](https://github.com/johannesjo/super-productivity/commit/c2fc305))
- **notes:** make markdown parsing optional ([49f997d](https://github.com/johannesjo/super-productivity/commit/49f997d))
- **notes:** minor ui improvements ([0a44398](https://github.com/johannesjo/super-productivity/commit/0a44398))
- **notes:** prevent double submits ([8c445fb](https://github.com/johannesjo/super-productivity/commit/8c445fb))
- **notes:** remove ms for initial date value ([1935321](https://github.com/johannesjo/super-productivity/commit/1935321))
- **notes:** replace direct edit with modal ([9e7392f](https://github.com/johannesjo/super-productivity/commit/9e7392f))
- **notes:** save note to session storage ([4a49db6](https://github.com/johannesjo/super-productivity/commit/4a49db6))
- **notes:** style notes and add delete functionality ([ba8f8e2](https://github.com/johannesjo/super-productivity/commit/ba8f8e2))
- **notes:** styling adjustment ([b9f5146](https://github.com/johannesjo/super-productivity/commit/b9f5146))
- **notes:** styling adjustments ([ba06eeb](https://github.com/johannesjo/super-productivity/commit/ba06eeb))
- **notes:** update styling ([113d255](https://github.com/johannesjo/super-productivity/commit/113d255))
- **pomodoro:** add basic dialog ([d0579a2](https://github.com/johannesjo/super-productivity/commit/d0579a2))
- **pomodoro:** add config and outline pomodoro service ([4e893da](https://github.com/johannesjo/super-productivity/commit/4e893da))
- **pomodoro:** add more outline code ([f8908a7](https://github.com/johannesjo/super-productivity/commit/f8908a7))
- **pomodoro:** add notifications ([2ca0b1d](https://github.com/johannesjo/super-productivity/commit/2ca0b1d))
- **pomodoro:** add session started toast ([76a3bb0](https://github.com/johannesjo/super-productivity/commit/76a3bb0))
- **pomodoro:** add skip break ([b80ba77](https://github.com/johannesjo/super-productivity/commit/b80ba77))
- prepare app storage ([09ded37](https://github.com/johannesjo/super-productivity/commit/09ded37))
- prepare daily summary ([207b879](https://github.com/johannesjo/super-productivity/commit/207b879))
- prepare disabling drag and drop [#119](https://github.com/johannesjo/super-productivity/issues/119) ([5711044](https://github.com/johannesjo/super-productivity/commit/5711044))
- prepare drag & drop ([18998e1](https://github.com/johannesjo/super-productivity/commit/18998e1))
- prepare global keyboard shortcuts module ([27bb737](https://github.com/johannesjo/super-productivity/commit/27bb737))
- prepare issue connection ([d658885](https://github.com/johannesjo/super-productivity/commit/d658885))
- prepare mapping of jira changelog ([1039071](https://github.com/johannesjo/super-productivity/commit/1039071))
- prepare meta reducer to better handle undo redo ([97d012c](https://github.com/johannesjo/super-productivity/commit/97d012c))
- prepare svg progress around play button ([5a7c08f](https://github.com/johannesjo/super-productivity/commit/5a7c08f))
- prevent errors when there is no issue data ([39add55](https://github.com/johannesjo/super-productivity/commit/39add55))
- print out storage info at beginning ([07d2e2a](https://github.com/johannesjo/super-productivity/commit/07d2e2a))
- raise debounce time for jira requests ([9a98df6](https://github.com/johannesjo/super-productivity/commit/9a98df6))
- redo idle time polls ([690f621](https://github.com/johannesjo/super-productivity/commit/690f621))
- redo main header navigation ([1d86701](https://github.com/johannesjo/super-productivity/commit/1d86701))
- reduce bundle size by only compiling to es6 ([8c2a71e](https://github.com/johannesjo/super-productivity/commit/8c2a71e))
- reduce themes ([3dc7a86](https://github.com/johannesjo/super-productivity/commit/3dc7a86))
- reduce work view header size ([6fb4240](https://github.com/johannesjo/super-productivity/commit/6fb4240))
- refactor ipc events and add global shortcut for how hide ([50b91f0](https://github.com/johannesjo/super-productivity/commit/50b91f0))
- refine new split backlog ([0d0f657](https://github.com/johannesjo/super-productivity/commit/0d0f657))
- remove ani for split component ([bba38b5](https://github.com/johannesjo/super-productivity/commit/bba38b5))
- remove auto start task ([989f2ca](https://github.com/johannesjo/super-productivity/commit/989f2ca))
- remove background color from manifest ([cbd3f44](https://github.com/johannesjo/super-productivity/commit/cbd3f44))
- remove dialogs as ngrx module ([20edb6d](https://github.com/johannesjo/super-productivity/commit/20edb6d))
- remove focus for time estimates on mobile ([eae41e9](https://github.com/johannesjo/super-productivity/commit/eae41e9))
- remove non working keyboard hide handler ([0c8543f](https://github.com/johannesjo/super-productivity/commit/0c8543f))
- remove old cfg components and beautify config form ([5ff1e94](https://github.com/johannesjo/super-productivity/commit/5ff1e94))
- remove redundant add task button for work view header for desktop ([fd26426](https://github.com/johannesjo/super-productivity/commit/fd26426))
- remove speed dial menu ([c27b5f3](https://github.com/johannesjo/super-productivity/commit/c27b5f3))
- remove tracked idle time when idle ([7f75346](https://github.com/johannesjo/super-productivity/commit/7f75346))
- remove ui clutter ([8b2aba2](https://github.com/johannesjo/super-productivity/commit/8b2aba2))
- rename all ipc event constants and add notify module ([a055102](https://github.com/johannesjo/super-productivity/commit/a055102))
- replace days with hours ([e3b623e](https://github.com/johannesjo/super-productivity/commit/e3b623e))
- restyle nav ([7ebbbb3](https://github.com/johannesjo/super-productivity/commit/7ebbbb3))
- **speedDial:** add speed dial to access settings page ([12c25ec](https://github.com/johannesjo/super-productivity/commit/12c25ec))
- restyle task ([ab6b67c](https://github.com/johannesjo/super-productivity/commit/ab6b67c))
- save complete tasks to archive to restore them later including issue models ([7c9a4fa](https://github.com/johannesjo/super-productivity/commit/7c9a4fa))
- save tmp project to session storage ([c3757d4](https://github.com/johannesjo/super-productivity/commit/c3757d4))
- set circle value from input ([fe53492](https://github.com/johannesjo/super-productivity/commit/fe53492))
- show errors for local storage quota ([ca59622](https://github.com/johannesjo/super-productivity/commit/ca59622))
- slightly adjust styling for main header ([7deee26](https://github.com/johannesjo/super-productivity/commit/7deee26))
- **pomodoro:** add sounds ([cf5e8c8](https://github.com/johannesjo/super-productivity/commit/cf5e8c8))
- **pomodoro:** add very basic timer to header ([719398b](https://github.com/johannesjo/super-productivity/commit/719398b))
- **pomodoro:** adjust timer styling ([c7ba50f](https://github.com/johannesjo/super-productivity/commit/c7ba50f))
- **pomodoro:** hide pomodoro functionality for now ([1d94ca9](https://github.com/johannesjo/super-productivity/commit/1d94ca9))
- **pomodoro:** improve button styles a bit ([d943d50](https://github.com/johannesjo/super-productivity/commit/d943d50))
- **pomodoro:** make disabled time tracking during breaks work ([bf33327](https://github.com/johannesjo/super-productivity/commit/bf33327))
- **pomodoro:** make it work ([e1f062b](https://github.com/johannesjo/super-productivity/commit/e1f062b))
- **pomodoro:** make manual resume work for cancel ([c99af17](https://github.com/johannesjo/super-productivity/commit/c99af17))
- **pomodoro:** prepare store and actions ([49fad8b](https://github.com/johannesjo/super-productivity/commit/49fad8b))
- **pomodoro:** remove extra long break config option for now ([796c5d5](https://github.com/johannesjo/super-productivity/commit/796c5d5))
- **project:** add dialog for project creation ([9de7157](https://github.com/johannesjo/super-productivity/commit/9de7157))
- **project:** add notifications when deleting or creating projects ([28db914](https://github.com/johannesjo/super-productivity/commit/28db914))
- **project:** add project page boilerplate ([210f4b1](https://github.com/johannesjo/super-productivity/commit/210f4b1))
- **project:** add project switcher ([347c6bd](https://github.com/johannesjo/super-productivity/commit/347c6bd))
- **project:** add store stuff fore projects ([ecec2d1](https://github.com/johannesjo/super-productivity/commit/ecec2d1))
- **project:** beautify project page ([b4fa5b7](https://github.com/johannesjo/super-productivity/commit/b4fa5b7))
- **project:** improve saving dialog ([72e1a92](https://github.com/johannesjo/super-productivity/commit/72e1a92))
- **project:** make deleting of projects work ([95f8641](https://github.com/johannesjo/super-productivity/commit/95f8641))
- **project:** make editing of projects work ([72078ae](https://github.com/johannesjo/super-productivity/commit/72078ae))
- **project:** make loading and saving tasks work ([2415545](https://github.com/johannesjo/super-productivity/commit/2415545))
- **project:** make project switcher work for new projects ([dd9342b](https://github.com/johannesjo/super-productivity/commit/dd9342b))
- **project:** make saving and loading projects work ([e520761](https://github.com/johannesjo/super-productivity/commit/e520761))
- **project:** make task form work ([21713f1](https://github.com/johannesjo/super-productivity/commit/21713f1))
- **project:** persist google time sheet settings ([5c09b7e](https://github.com/johannesjo/super-productivity/commit/5c09b7e))
- **pwa:** add google fonts to cached assets ([e6687cb](https://github.com/johannesjo/super-productivity/commit/e6687cb))
- **reminder:** add better reminder icons ([3eb58be](https://github.com/johannesjo/super-productivity/commit/3eb58be))
- **reminders:** add basic service to communicate with worker ([c2e347f](https://github.com/johannesjo/super-productivity/commit/c2e347f))
- **reminders:** add boilerplate for add reminder dialog ([835be4c](https://github.com/johannesjo/super-productivity/commit/835be4c))
- **reminders:** add boilerplate for view note reminder dialog ([de682e0](https://github.com/johannesjo/super-productivity/commit/de682e0))
- **reminders:** add buttons and functionality for reminder view ([0da1840](https://github.com/johannesjo/super-productivity/commit/0da1840))
- **reminders:** add logic for showing a limited number of messages for period ([a1bf882](https://github.com/johannesjo/super-productivity/commit/a1bf882))
- **reminders:** add most basic worker logic for reminding ([c0c50f6](https://github.com/johannesjo/super-productivity/commit/c0c50f6))
- **reminders:** add most simple add reminder dialog ([56cab04](https://github.com/johannesjo/super-productivity/commit/56cab04))
- **reminders:** add persistence ([44a2b00](https://github.com/johannesjo/super-productivity/commit/44a2b00))
- **reminders:** add update method ([73297f9](https://github.com/johannesjo/super-productivity/commit/73297f9))
- **reminders:** also delete reminders when note was deleted ([b3acd93](https://github.com/johannesjo/super-productivity/commit/b3acd93))
- **reminders:** also focus electron window on reminder ([10fb83e](https://github.com/johannesjo/super-productivity/commit/10fb83e))
- **reminders:** display note inside reminder dialog ([a3e4360](https://github.com/johannesjo/super-productivity/commit/a3e4360))
- **reminders:** don't show future reminders ([6438e7f](https://github.com/johannesjo/super-productivity/commit/6438e7f))
- **reminders:** fix some quirks ([75d8703](https://github.com/johannesjo/super-productivity/commit/75d8703))
- **reminders:** improve worker logic ([4fe4375](https://github.com/johannesjo/super-productivity/commit/4fe4375))
- **reminders:** only show single dialog for note reminders ([7bef966](https://github.com/johannesjo/super-productivity/commit/7bef966))
- **reminders:** plan out model ([975980e](https://github.com/johannesjo/super-productivity/commit/975980e))
- **reminders:** refactor stuff to service ([fc90fa4](https://github.com/johannesjo/super-productivity/commit/fc90fa4))
- **reminders:** remove directly from note context menu ([069a5ed](https://github.com/johannesjo/super-productivity/commit/069a5ed))
- **reminders:** set restore focus for all dialogs ([52f761e](https://github.com/johannesjo/super-productivity/commit/52f761e))
- **reminders:** show indication when a note has a reminder ([c3a0330](https://github.com/johannesjo/super-productivity/commit/c3a0330))
- **snack:** add custom icon support ([53ee30c](https://github.com/johannesjo/super-productivity/commit/53ee30c))
- **snack:** add most basic snack ([57f4c69](https://github.com/johannesjo/super-productivity/commit/57f4c69))
- **snack:** improve on snacks ([721d142](https://github.com/johannesjo/super-productivity/commit/721d142))
- **sync:** improve error ([6751433](https://github.com/johannesjo/super-productivity/commit/6751433))
- **sync:** not including all data ([f951e69](https://github.com/johannesjo/super-productivity/commit/f951e69))
- **task:** add created field to task ([0e2e15f](https://github.com/johannesjo/super-productivity/commit/0e2e15f))
- **task:** improve mobile styling but only using a single line and moving buttons into the menu ([70a018a](https://github.com/johannesjo/super-productivity/commit/70a018a))
- **task:** properly update parentId when moving sub task ([6947f19](https://github.com/johannesjo/super-productivity/commit/6947f19))
- **task:** properly update time estimate on parent if moving sub task ([f608178](https://github.com/johannesjo/super-productivity/commit/f608178))
- **task:** remove drag handle size for mobile ([6871ce5](https://github.com/johannesjo/super-productivity/commit/6871ce5))
- **taskAttachments:** add cool image zoom ([e932e94](https://github.com/johannesjo/super-productivity/commit/e932e94))
- **taskAttachments:** add cool image zoom also for bookmarks ([17875ca](https://github.com/johannesjo/super-productivity/commit/17875ca))
- **taskAttachments:** add model and store ([1f0c996](https://github.com/johannesjo/super-productivity/commit/1f0c996))
- **taskAttachments:** improve loading attachment data ([be04065](https://github.com/johannesjo/super-productivity/commit/be04065))
- **taskAttachments:** make saving and loading attachments work ([bd396d9](https://github.com/johannesjo/super-productivity/commit/bd396d9))
- **taskAttachments:** prepare list and item loading ([69e040f](https://github.com/johannesjo/super-productivity/commit/69e040f))
- **taskAttachments:** show attachments in a cool way ([1d7ade0](https://github.com/johannesjo/super-productivity/commit/1d7ade0))
- **tasks:** add animations for adding and removing tasks ([4574d93](https://github.com/johannesjo/super-productivity/commit/4574d93))
- **tasks:** add backlog and todays tasks for moving task ([9d5de6e](https://github.com/johannesjo/super-productivity/commit/9d5de6e))
- **tasks:** add basic keyboard interface for tasks ([31d05dc](https://github.com/johannesjo/super-productivity/commit/31d05dc))
- **tasks:** add basic planning mode ([deb67e1](https://github.com/johannesjo/super-productivity/commit/deb67e1))
- **tasks:** add boilerplate for move up and down ([dc860f5](https://github.com/johannesjo/super-productivity/commit/dc860f5))
- **tasks:** add border ([d8d50df](https://github.com/johannesjo/super-productivity/commit/d8d50df))
- **tasks:** add border to notes panel ([83d888c](https://github.com/johannesjo/super-productivity/commit/83d888c))
- **tasks:** add daily planner and backlog tasks ([74becfd](https://github.com/johannesjo/super-productivity/commit/74becfd))
- **tasks:** add debug data to additional info ([dca7667](https://github.com/johannesjo/super-productivity/commit/dca7667))
- **tasks:** add dynamic templates for issue tab ([49af450](https://github.com/johannesjo/super-productivity/commit/49af450))
- **tasks:** add icon change for hide done sub tasks ([1568ba0](https://github.com/johannesjo/super-productivity/commit/1568ba0))
- **tasks:** add interactive attachment icon ([81632a5](https://github.com/johannesjo/super-productivity/commit/81632a5))
- **tasks:** add keyboard shortcut for switching between adding to backlog and to todays list for add task bar ([cd4d72a](https://github.com/johannesjo/super-productivity/commit/cd4d72a))
- **tasks:** add little animation for when a task switches a list ([f53f871](https://github.com/johannesjo/super-productivity/commit/f53f871))
- **tasks:** add model and action for focusTaskId ([2d78b12](https://github.com/johannesjo/super-productivity/commit/2d78b12))
- **tasks:** add move up and down for sub tasks ([7747964](https://github.com/johannesjo/super-productivity/commit/7747964))
- **tasks:** add new layout for additional task infos ([8bb6add](https://github.com/johannesjo/super-productivity/commit/8bb6add))
- **tasks:** add nice little done animation ([4f9d3d0](https://github.com/johannesjo/super-productivity/commit/4f9d3d0))
- **tasks:** add nicer drag handle icon ([acae326](https://github.com/johannesjo/super-productivity/commit/acae326))
- **tasks:** add no wrap to time ([e9e49a4](https://github.com/johannesjo/super-productivity/commit/e9e49a4))
- **tasks:** add progress bar and theme helpers ([0d30699](https://github.com/johannesjo/super-productivity/commit/0d30699))
- **tasks:** add several task keyboard shortcuts ([30d5ce7](https://github.com/johannesjo/super-productivity/commit/30d5ce7))
- **tasks:** add shortcut for focussing task ([bcd94d9](https://github.com/johannesjo/super-productivity/commit/bcd94d9))
- **tasks:** add shortcut for moving from and to backlog ([ada61f1](https://github.com/johannesjo/super-productivity/commit/ada61f1))
- **tasks:** add shortcut to focus last active task ([7ea6ec3](https://github.com/johannesjo/super-productivity/commit/7ea6ec3))
- **tasks:** add some debugging info ([8f5c64d](https://github.com/johannesjo/super-productivity/commit/8f5c64d))
- **tasks:** add task selection component ([340f6e3](https://github.com/johannesjo/super-productivity/commit/340f6e3))
- **tasks:** add tt uppercase to first letter of title ([e3cd901](https://github.com/johannesjo/super-productivity/commit/e3cd901))
- **tasks:** add undo deletion ([b89ef8a](https://github.com/johannesjo/super-productivity/commit/b89ef8a))
- **tasks:** add update issue button and connect for git ([6008ad0](https://github.com/johannesjo/super-productivity/commit/6008ad0))
- **tasks:** add upsert jira issue ([8d9c18c](https://github.com/johannesjo/super-productivity/commit/8d9c18c))
- **tasks:** adjust icon color ([408e0ae](https://github.com/johannesjo/super-productivity/commit/408e0ae))
- **tasks:** adjust styling for time ([24b7c6d](https://github.com/johannesjo/super-productivity/commit/24b7c6d))
- **tasks:** adjust styling for time values ([2981129](https://github.com/johannesjo/super-productivity/commit/2981129))
- **tasks:** allow for adding sub tasks via shortcut when focus is on a sub task ([8838158](https://github.com/johannesjo/super-productivity/commit/8838158))
- **tasks:** allow for time spent via short syntax ([31d8d45](https://github.com/johannesjo/super-productivity/commit/31d8d45))
- **tasks:** allow switching between adding to backlog and to todays list for add task bar ([2e03771](https://github.com/johannesjo/super-productivity/commit/2e03771))
- **tasks:** also allow adding tasks while searching ([dd196b5](https://github.com/johannesjo/super-productivity/commit/dd196b5))
- **tasks:** also handle case when there are only done tasks ([e110f4e](https://github.com/johannesjo/super-productivity/commit/e110f4e))
- **tasks:** beautify collapsible sub tasks button and add keyboard navigation for the feature ([295fcfb](https://github.com/johannesjo/super-productivity/commit/295fcfb))
- **tasks:** beautify done tasks ([157a641](https://github.com/johannesjo/super-productivity/commit/157a641))
- **tasks:** beautify for mobile just a bit ([d12798a](https://github.com/johannesjo/super-productivity/commit/d12798a))
- **tasks:** bring back left arrow parent focus ([e0b48a4](https://github.com/johannesjo/super-productivity/commit/e0b48a4))
- **tasks:** bring back tt uppercase for first letter ([0f53600](https://github.com/johannesjo/super-productivity/commit/0f53600))
- **tasks:** change keyboard navigation selected style ([f793bdc](https://github.com/johannesjo/super-productivity/commit/f793bdc))
- **tasks:** change order for add attachment dialog ([77141bb](https://github.com/johannesjo/super-productivity/commit/77141bb))
- **tasks:** change play icon ([4b9e264](https://github.com/johannesjo/super-productivity/commit/4b9e264))
- **tasks:** connect ui only model ([35bfe7f](https://github.com/johannesjo/super-productivity/commit/35bfe7f))
- **tasks:** connect update issue button for jira ([1a99f62](https://github.com/johannesjo/super-productivity/commit/1a99f62))
- **tasks:** copy over parent task time stuff when first sub task is created ([a305791](https://github.com/johannesjo/super-productivity/commit/a305791))
- **tasks:** copy over time stuff from sub task, if last sub task was deleted ([dad898e](https://github.com/johannesjo/super-productivity/commit/dad898e))
- **tasks:** deal with toggle start via effect ([76ff078](https://github.com/johannesjo/super-productivity/commit/76ff078))
- **tasks:** distinguish task additional info by using a larger border radius ([8b8a456](https://github.com/johannesjo/super-productivity/commit/8b8a456))
- **tasks:** don't filter out current task when collapsing sub tasks ([a95b81e](https://github.com/johannesjo/super-productivity/commit/a95b81e))
- **tasks:** don't update timeSpent if none given for short syntax ([5a6f2a1](https://github.com/johannesjo/super-productivity/commit/5a6f2a1))
- **tasks:** fine tune styling ([6bae7d7](https://github.com/johannesjo/super-productivity/commit/6bae7d7))
- **tasks:** fix add task bar for non jira tasks ([6d7527c](https://github.com/johannesjo/super-productivity/commit/6d7527c))
- **tasks:** fix minor is done issue for task when dragging ([3b69fd3](https://github.com/johannesjo/super-productivity/commit/3b69fd3))
- **tasks:** fix minor issue and make tasks focusable ([fe35c60](https://github.com/johannesjo/super-productivity/commit/fe35c60))
- **tasks:** focus sub task on creation ([a5fefa4](https://github.com/johannesjo/super-productivity/commit/a5fefa4))
- **tasks:** get working today quicker ([ed6a274](https://github.com/johannesjo/super-productivity/commit/ed6a274))
- **tasks:** handle next task selection completely via effects ([aca8d89](https://github.com/johannesjo/super-productivity/commit/aca8d89))
- **tasks:** improve additional notes styling ([ea8f678](https://github.com/johannesjo/super-productivity/commit/ea8f678))
- **tasks:** improve animation skip ([4c970f4](https://github.com/johannesjo/super-productivity/commit/4c970f4))
- **tasks:** improve animations ([09ec103](https://github.com/johannesjo/super-productivity/commit/09ec103))
- **tasks:** improve arrow navigation ([8e191e5](https://github.com/johannesjo/super-productivity/commit/8e191e5))
- **tasks:** improve button animations ([b63d9b3](https://github.com/johannesjo/super-productivity/commit/b63d9b3))
- **tasks:** improve daily planner view by adding tasks to the bottom of the list ([e2aa817](https://github.com/johannesjo/super-productivity/commit/e2aa817))
- **tasks:** improve done task box styling ([c7c2f96](https://github.com/johannesjo/super-productivity/commit/c7c2f96))
- **tasks:** improve drag handle ([63c3970](https://github.com/johannesjo/super-productivity/commit/63c3970))
- **tasks:** improve estimate remaining ([6ff3fb2](https://github.com/johannesjo/super-productivity/commit/6ff3fb2))
- **tasks:** improve focus behavior and add for work view ([0b6a5a7](https://github.com/johannesjo/super-productivity/commit/0b6a5a7))
- **tasks:** improve keyboard nav ([173c9b1](https://github.com/johannesjo/super-productivity/commit/173c9b1))
- **tasks:** improve start task behavior ([717590b](https://github.com/johannesjo/super-productivity/commit/717590b))
- **tasks:** improve styling for current ([6c11950](https://github.com/johannesjo/super-productivity/commit/6c11950))
- **tasks:** improve task list animation ([5cbd5f7](https://github.com/johannesjo/super-productivity/commit/5cbd5f7))
- **tasks:** improve task list structure ([116ce5d](https://github.com/johannesjo/super-productivity/commit/116ce5d))
- **tasks:** improve task notes ([7a0d971](https://github.com/johannesjo/super-productivity/commit/7a0d971))
- **tasks:** improve time estimates readability ([3a37829](https://github.com/johannesjo/super-productivity/commit/3a37829))
- **tasks:** improve ui by only showing progress bar only for current task ([99297c1](https://github.com/johannesjo/super-productivity/commit/99297c1))
- **tasks:** increase animation speed for task list ([a1e6cb9](https://github.com/johannesjo/super-productivity/commit/a1e6cb9))
- **tasks:** just switch between show and hide when there are no done sub tasks ([f25e69c](https://github.com/johannesjo/super-productivity/commit/f25e69c))
- **tasks:** less aggressive focus style ([ade9335](https://github.com/johannesjo/super-productivity/commit/ade9335))
- **tasks:** make collapsing sub tasks work ([61a0305](https://github.com/johannesjo/super-productivity/commit/61a0305))
- **tasks:** make everything a selector ([505c93b](https://github.com/johannesjo/super-productivity/commit/505c93b))
- **tasks:** make focus work properly ([060b398](https://github.com/johannesjo/super-productivity/commit/060b398))
- **tasks:** make issue work with dynamic data ([32e5a4d](https://github.com/johannesjo/super-productivity/commit/32e5a4d))
- **tasks:** make play less prominent ([7aeebc2](https://github.com/johannesjo/super-productivity/commit/7aeebc2))
- **tasks:** make progress bar visible for current ([01abc5e](https://github.com/johannesjo/super-productivity/commit/01abc5e))
- **tasks:** make sub tasks expandable ([6162e68](https://github.com/johannesjo/super-productivity/commit/6162e68))
- **tasks:** make task data more robust ([9d7ac3e](https://github.com/johannesjo/super-productivity/commit/9d7ac3e))
- **tasks:** make time values less prominent ([3c57fe7](https://github.com/johannesjo/super-productivity/commit/3c57fe7))
- **tasks:** make time values less prominent2 ([268fe6e](https://github.com/johannesjo/super-productivity/commit/268fe6e))
- **tasks:** merge AddTask and AddTaskWithIssue into one aciton ([c992bd2](https://github.com/johannesjo/super-productivity/commit/c992bd2))
- **tasks:** minor styling adjustment ([c25def5](https://github.com/johannesjo/super-productivity/commit/c25def5))
- **tasks:** minor styling adjustments ([1b57ccb](https://github.com/johannesjo/super-productivity/commit/1b57ccb))
- **tasks:** minor styling adjustments ([308bb9c](https://github.com/johannesjo/super-productivity/commit/308bb9c))
- **tasks:** move all selection logic to selectors ([16dca90](https://github.com/johannesjo/super-productivity/commit/16dca90))
- **tasks:** next task selection via effect for move to backlog ([5f4c1b6](https://github.com/johannesjo/super-productivity/commit/5f4c1b6))
- **tasks:** next task selection via effect for update task ([5798a4e](https://github.com/johannesjo/super-productivity/commit/5798a4e))
- **tasks:** persist current tab index for task ([39e0052](https://github.com/johannesjo/super-productivity/commit/39e0052))
- **tasks:** persist showNotes ([620ff15](https://github.com/johannesjo/super-productivity/commit/620ff15))
- **tasks:** prepare collapsing sub tasks ([40aeb1d](https://github.com/johannesjo/super-productivity/commit/40aeb1d))
- **tasks:** prepare ui only model ([c85ffef](https://github.com/johannesjo/super-productivity/commit/c85ffef))
- **tasks:** refactor dispatch ([c939adc](https://github.com/johannesjo/super-productivity/commit/c939adc))
- **tasks:** refocus last active task after add task bar is hidden ([3208e89](https://github.com/johannesjo/super-productivity/commit/3208e89))
- **tasks:** restyle done tasks button ([90a4c47](https://github.com/johannesjo/super-productivity/commit/90a4c47))
- **tasks:** restyle outline ([5f32636](https://github.com/johannesjo/super-productivity/commit/5f32636))
- **tasks:** save data when restoring tasks from archive ([a8895e4](https://github.com/johannesjo/super-productivity/commit/a8895e4))
- **tasks:** set focus to next task if task was marked as done ([d6ee22e](https://github.com/johannesjo/super-productivity/commit/d6ee22e))
- **tasks:** set task to undone if started ([33272f6](https://github.com/johannesjo/super-productivity/commit/33272f6))
- **tasks:** simplify focusing tasks ([dbe4770](https://github.com/johannesjo/super-productivity/commit/dbe4770))
- **tasks:** simplify keyboard left right actions ([1f20b0c](https://github.com/johannesjo/super-productivity/commit/1f20b0c))
- **tasks:** style add task bar and add it globally ([3f94d04](https://github.com/johannesjo/super-productivity/commit/3f94d04))
- **tasks:** test other syntax ([09ccd76](https://github.com/johannesjo/super-productivity/commit/09ccd76))
- **tasks:** update deletion ([3f18f1f](https://github.com/johannesjo/super-productivity/commit/3f18f1f))
- **tasks:** update parent time estimate when child is updated ([522563e](https://github.com/johannesjo/super-productivity/commit/522563e))
- **tasks:** use play_arrow again ([ef3eeba](https://github.com/johannesjo/super-productivity/commit/ef3eeba))
- **tasks:** use primary rather than accent color for current task ([89f0093](https://github.com/johannesjo/super-productivity/commit/89f0093))
- **tasks:** zoom in on current task and style inline edit ([cdeafba](https://github.com/johannesjo/super-productivity/commit/cdeafba))
- **theming:** add theme switching ([e1761e5](https://github.com/johannesjo/super-productivity/commit/e1761e5))
- **timeSheetExport:** add most simple dialog ([3f31e35](https://github.com/johannesjo/super-productivity/commit/3f31e35))
- **timeSheetExport:** better handling for google auth ([8440152](https://github.com/johannesjo/super-productivity/commit/8440152))
- **timeSheetExport:** fix template ([c7ad410](https://github.com/johannesjo/super-productivity/commit/c7ad410))
- **timeSheetExport:** get rid of most of the errors ([7c96e05](https://github.com/johannesjo/super-productivity/commit/7c96e05))
- **timeSheetExport:** half way there ([bfc79e8](https://github.com/johannesjo/super-productivity/commit/bfc79e8))
- **timeSheetExport:** make everything work ([c17a7bb](https://github.com/johannesjo/super-productivity/commit/c17a7bb))
- **timeSheetExport:** update button dialog alignment ([0ecfefe](https://github.com/johannesjo/super-productivity/commit/0ecfefe))
- **timeTracking:** add boilerplate ([8dfd452](https://github.com/johannesjo/super-productivity/commit/8dfd452))
- **timeTracking:** add estimate remaining ([004eba3](https://github.com/johannesjo/super-productivity/commit/004eba3))
- **timeTracking:** add most basic time tracking ([5a3979c](https://github.com/johannesjo/super-productivity/commit/5a3979c))
- **timeTracking:** add ms to string pipe and use it for view ([ba59ed4](https://github.com/johannesjo/super-productivity/commit/ba59ed4))
- **timeTracking:** add working today ([5c3faa6](https://github.com/johannesjo/super-productivity/commit/5c3faa6))
- **timeTracking:** fix time input ([2cc8199](https://github.com/johannesjo/super-productivity/commit/2cc8199))
- **worklog:** allow for restoring task together with sub tasks from worklog ([fc22108](https://github.com/johannesjo/super-productivity/commit/fc22108))
- **worklog:** also display parent and prepare restoring parent including sub tasks ([aff7ca4](https://github.com/johannesjo/super-productivity/commit/aff7ca4))
- **worklog:** remove restore button as long as it is not implemented ([0ef1596](https://github.com/johannesjo/super-productivity/commit/0ef1596))
- **worklog:** sort items ([ccd76b2](https://github.com/johannesjo/super-productivity/commit/ccd76b2))
- **worklog:** update sub task styling ([c4484c0](https://github.com/johannesjo/super-productivity/commit/c4484c0))
- **workView:** add header ([b81476c](https://github.com/johannesjo/super-productivity/commit/b81476c))
- **workView:** hide backlog until pulled out ([1dfb41a](https://github.com/johannesjo/super-productivity/commit/1dfb41a))
- update rxjs usage to latest version compatibility ([556cc2d](https://github.com/johannesjo/super-productivity/commit/556cc2d))
- **workView:** keep backlog tasks in memory for better performance ([cfc065c](https://github.com/johannesjo/super-productivity/commit/cfc065c))
- slightly improve page transitions ([d302ba5](https://github.com/johannesjo/super-productivity/commit/d302ba5))
- slightly improve router transition ([c5db76d](https://github.com/johannesjo/super-productivity/commit/c5db76d))
- slightly improve styling for settings ([d2dfb15](https://github.com/johannesjo/super-productivity/commit/d2dfb15))
- slightly improve ui ([4ed796d](https://github.com/johannesjo/super-productivity/commit/4ed796d))
- some fine tuning for work view ([ce76659](https://github.com/johannesjo/super-productivity/commit/ce76659))
- start first task on ready for work ([564d8e8](https://github.com/johannesjo/super-productivity/commit/564d8e8))
- sync to google if enabled before closing app ([ef31e8b](https://github.com/johannesjo/super-productivity/commit/ef31e8b))
- trigger blur when android keyboard closes ([74c3300](https://github.com/johannesjo/super-productivity/commit/74c3300))
- unset current if it is marked as done ([3d988d1](https://github.com/johannesjo/super-productivity/commit/3d988d1))
- unset current on finish day ([11f202d](https://github.com/johannesjo/super-productivity/commit/11f202d))
- unset current task when loading task state ([5d0f4d1](https://github.com/johannesjo/super-productivity/commit/5d0f4d1))
- update assets and manifest settings ([c2a75c5](https://github.com/johannesjo/super-productivity/commit/c2a75c5))
- update default shortcuts ([bb654ae](https://github.com/johannesjo/super-productivity/commit/bb654ae))
- update keyboard shortcuts texts and config ([5ddd6e9](https://github.com/johannesjo/super-productivity/commit/5ddd6e9))
- update project list ([205b6ad](https://github.com/johannesjo/super-productivity/commit/205b6ad))
- update storage report ([9cd124c](https://github.com/johannesjo/super-productivity/commit/9cd124c))
- use appropriate operators ([4dc87e4](https://github.com/johannesjo/super-productivity/commit/4dc87e4))
- use button instead of checkbox for marking tasks as done ([54655f4](https://github.com/johannesjo/super-productivity/commit/54655f4))
- use moment-mini to reduce bundle size ([038ef51](https://github.com/johannesjo/super-productivity/commit/038ef51))
- use session storage for tmp backup ([0e7103f](https://github.com/johannesjo/super-productivity/commit/0e7103f))
- use standard scrollbars for mobile ([7ac1a01](https://github.com/johannesjo/super-productivity/commit/7ac1a01))

## [0.1.19](https://github.com/johannesjo/sp2/compare/v0.1.18...v0.1.19) (2019-01-26)

### Bug Fixes

- mat table throwing error because of es6 compilation ([8f68326](https://github.com/johannesjo/sp2/commit/8f68326))

## [0.1.18](https://github.com/johannesjo/sp2/compare/v0.1.17...v0.1.18) (2019-01-26)

### Bug Fixes

- planning mode popping in weirdly ([8b4cd69](https://github.com/johannesjo/sp2/commit/8b4cd69))
- **tasks:** focusing after task deletion not working ([fcb0e8d](https://github.com/johannesjo/sp2/commit/fcb0e8d))

### Features

- add productivity tips on startup ([994ef3c](https://github.com/johannesjo/sp2/commit/994ef3c))

## [0.1.17](https://github.com/johannesjo/sp2/compare/v0.1.16...v0.1.17) (2019-01-26)

### Bug Fixes

- es6 only not working for electron ([1bfd795](https://github.com/johannesjo/sp2/commit/1bfd795))

## [0.1.16](https://github.com/johannesjo/sp2/compare/v0.1.15...v0.1.16) (2019-01-26)

### Bug Fixes

- 0 bug ([b8621d4](https://github.com/johannesjo/sp2/commit/b8621d4))
- remove debug val from tpl ([3e1f6ae](https://github.com/johannesjo/sp2/commit/3e1f6ae))

### Features

- add dragging cursor to drag handle ([46450ed](https://github.com/johannesjo/sp2/commit/46450ed))
- adjust header shadow ([cafb505](https://github.com/johannesjo/sp2/commit/cafb505))
- display worklog always again ([b8dd56b](https://github.com/johannesjo/sp2/commit/b8dd56b))
- improve split handle by little animation ([df040c0](https://github.com/johannesjo/sp2/commit/df040c0))
- improve split styling ([14b97c2](https://github.com/johannesjo/sp2/commit/14b97c2))
- improve work-view and split styling ([650d357](https://github.com/johannesjo/sp2/commit/650d357))
- reduce bundle size by only compiling to es6 ([8c2a71e](https://github.com/johannesjo/sp2/commit/8c2a71e))
- reduce themes ([3dc7a86](https://github.com/johannesjo/sp2/commit/3dc7a86))
- reduce work view header size ([6fb4240](https://github.com/johannesjo/sp2/commit/6fb4240))
- remove ani for split component ([bba38b5](https://github.com/johannesjo/sp2/commit/bba38b5))
- use moment-mini to reduce bundle size ([038ef51](https://github.com/johannesjo/sp2/commit/038ef51))

## [0.1.15](https://github.com/johannesjo/sp2/compare/v0.1.14...v0.1.15) (2019-01-26)

### Bug Fixes

- breakpoint 1px gap issue ([ab06521](https://github.com/johannesjo/sp2/commit/ab06521))
- force same height for project and main nav buttons ([c98d4c0](https://github.com/johannesjo/sp2/commit/c98d4c0))

### Features

- add frameless window for mac ([75ba25b](https://github.com/johannesjo/sp2/commit/75ba25b))
- add robot for tasks as well ([4cc7084](https://github.com/johannesjo/sp2/commit/4cc7084))
- break to 2 line nav much later ([ee39fed](https://github.com/johannesjo/sp2/commit/ee39fed))
- improve frameless window for mac ([03eff3c](https://github.com/johannesjo/sp2/commit/03eff3c))
- improve split drag ([6e9c9e6](https://github.com/johannesjo/sp2/commit/6e9c9e6))
- leave scrollbar alone for mac ([c81a921](https://github.com/johannesjo/sp2/commit/c81a921))

## [0.1.14](https://github.com/johannesjo/sp2/compare/v0.1.13...v0.1.14) (2019-01-26)

### Bug Fixes

- **googleDriveSync:** case when there is no initial file id ([5c9f7e8](https://github.com/johannesjo/sp2/commit/5c9f7e8))
- **tasks:** estimate remaining calculation ([130a1f2](https://github.com/johannesjo/sp2/commit/130a1f2))
- backup & sync not working when there only is the default project and no project state ([eeae84f](https://github.com/johannesjo/sp2/commit/eeae84f))
- disable service worker for electron, as it does not work ([f6dd283](https://github.com/johannesjo/sp2/commit/f6dd283))
- make back button work again ([a3b5b17](https://github.com/johannesjo/sp2/commit/a3b5b17))

### Features

- beautify task summary table ([1efa03e](https://github.com/johannesjo/sp2/commit/1efa03e))
- flatten daily summary table tasks ([3cdf0e1](https://github.com/johannesjo/sp2/commit/3cdf0e1))
- login before every google request to avoid errors ([bd6946f](https://github.com/johannesjo/sp2/commit/bd6946f))
- **localBackup:** add boilerplate ([1a9a46f](https://github.com/johannesjo/sp2/commit/1a9a46f))
- **localBackup:** add frontend side of things ([e292422](https://github.com/johannesjo/sp2/commit/e292422))
- **localBackup:** save simple backups from electron ([6cef8bf](https://github.com/johannesjo/sp2/commit/6cef8bf))

## [0.1.13](https://github.com/johannesjo/sp2/compare/v0.1.12...v0.1.13) (2019-01-23)

### Bug Fixes

- **electron:** linting errors ([c2bce87](https://github.com/johannesjo/sp2/commit/c2bce87))
- **electron:** type import ([4402eca](https://github.com/johannesjo/sp2/commit/4402eca))
- **googleDriveSync:** error handling ([42e142a](https://github.com/johannesjo/sp2/commit/42e142a))
- **googleDriveSync:** make change sync file work ([da094be](https://github.com/johannesjo/sp2/commit/da094be))
- **googleDriveSync:** make it kinda work ([8e29afa](https://github.com/johannesjo/sp2/commit/8e29afa))
- **googleDriveSync:** quick fix for data not found error ([6051e3b](https://github.com/johannesjo/sp2/commit/6051e3b))
- **googleDriveSync:** request filter ([fa7b6ce](https://github.com/johannesjo/sp2/commit/fa7b6ce))
- **pomodoro:** several issues ([c3fa7df](https://github.com/johannesjo/sp2/commit/c3fa7df))
- app not quitting ([9414b60](https://github.com/johannesjo/sp2/commit/9414b60))
- disable uppercasing the first task title character as it messes uo editing the titles ([c9e5189](https://github.com/johannesjo/sp2/commit/c9e5189))
- google final sync ([dd75574](https://github.com/johannesjo/sp2/commit/dd75574))
- google login for electron ([762efff](https://github.com/johannesjo/sp2/commit/762efff))
- input duration slider not working as we want ([7d15ff3](https://github.com/johannesjo/sp2/commit/7d15ff3))
- jira cfg form only being editable when host etc are present ([cd27dbf](https://github.com/johannesjo/sp2/commit/cd27dbf))
- lint ([23c6db7](https://github.com/johannesjo/sp2/commit/23c6db7))
- potential database error ([38edebf](https://github.com/johannesjo/sp2/commit/38edebf))
- success animation ([a22c856](https://github.com/johannesjo/sp2/commit/a22c856))
- typing error ([8c0c2f8](https://github.com/johannesjo/sp2/commit/8c0c2f8))

### Features

- **electron:** add basic setup and convert all files to typescript ([6796ca0](https://github.com/johannesjo/sp2/commit/6796ca0))
- **electron:** make typescript for electron work ([b28f6eb](https://github.com/johannesjo/sp2/commit/b28f6eb))
- improve jira credentials ([a203528](https://github.com/johannesjo/sp2/commit/a203528))
- **googleDriveSync:** add proper error handling when being offline ([9ae7368](https://github.com/johannesjo/sp2/commit/9ae7368))
- **googleDriveSync:** better error handling ([aaebc76](https://github.com/johannesjo/sp2/commit/aaebc76))
- **googleDriveSync:** don't show other snacks when async toast is there ([8600200](https://github.com/johannesjo/sp2/commit/8600200))
- **googleDriveSync:** don't sync if offline ([b1251c9](https://github.com/johannesjo/sp2/commit/b1251c9))
- slightly improve styling for settings ([d2dfb15](https://github.com/johannesjo/sp2/commit/d2dfb15))
- **googleDriveSync:** make async toast work again ([6040ca3](https://github.com/johannesjo/sp2/commit/6040ca3))
- **googleDriveSync:** slightly improve ui ([ca08c24](https://github.com/johannesjo/sp2/commit/ca08c24))
- **tasks:** bring back left arrow parent focus ([e0b48a4](https://github.com/johannesjo/sp2/commit/e0b48a4))
- **tasks:** bring back tt uppercase for first letter ([0f53600](https://github.com/johannesjo/sp2/commit/0f53600))
- remove background color from manifest ([cbd3f44](https://github.com/johannesjo/sp2/commit/cbd3f44))
- **tasks:** don't filter out current task when collapsing sub tasks ([a95b81e](https://github.com/johannesjo/sp2/commit/a95b81e))
- **tasks:** improve animations ([09ec103](https://github.com/johannesjo/sp2/commit/09ec103))
- add better ios support ([e85d613](https://github.com/johannesjo/sp2/commit/e85d613))
- add confirm dialog for deleting projects ([21543b9](https://github.com/johannesjo/sp2/commit/21543b9))
- add missing on push change detection strategy ([5c1c58f](https://github.com/johannesjo/sp2/commit/5c1c58f))
- improve pomodoro timer styling ([2e365aa](https://github.com/johannesjo/sp2/commit/2e365aa))
- use appropriate operators ([4dc87e4](https://github.com/johannesjo/sp2/commit/4dc87e4))

## [0.1.12](https://github.com/johannesjo/sp2/compare/v0.1.11...v0.1.12) (2019-01-13)

### Bug Fixes

- **jira:** cfg component throwing an error ([4a9a990](https://github.com/johannesjo/sp2/commit/4a9a990))
- **tasks:** crucial bug where task state in db was overwritten ([9b7798f](https://github.com/johannesjo/sp2/commit/9b7798f))
- **tasks:** time spent sometimes linking values ([c5d866c](https://github.com/johannesjo/sp2/commit/c5d866c))
- cleanup debug error ([458be1d](https://github.com/johannesjo/sp2/commit/458be1d))
- for older browsers ([dbb9311](https://github.com/johannesjo/sp2/commit/dbb9311))
- keyboard shortcuts not working for edge case ([c5fc2f1](https://github.com/johannesjo/sp2/commit/c5fc2f1))
- potential worklog error if there is nothing in the archive ([abc82ad](https://github.com/johannesjo/sp2/commit/abc82ad))
- time worked without a break popping in ([a0ad47d](https://github.com/johannesjo/sp2/commit/a0ad47d))

### Features

- remove non working keyboard hide handler ([0c8543f](https://github.com/johannesjo/sp2/commit/0c8543f))
- **pomodoro:** adjust timer styling ([c7ba50f](https://github.com/johannesjo/sp2/commit/c7ba50f))
- **tasks:** improve arrow navigation ([8e191e5](https://github.com/johannesjo/sp2/commit/8e191e5))
- add no archived tasks to worklog ([0500b96](https://github.com/johannesjo/sp2/commit/0500b96))
- **tasks:** simplify keyboard left right actions ([1f20b0c](https://github.com/johannesjo/sp2/commit/1f20b0c))
- add missing help texts ([8278458](https://github.com/johannesjo/sp2/commit/8278458))
- add tabs to daily summary and most basic google time export component ([faa9ba1](https://github.com/johannesjo/sp2/commit/faa9ba1))
- beautify daily summary ([d7ab2d7](https://github.com/johannesjo/sp2/commit/d7ab2d7))
- bring back burger menu for smaller screens ([1207de9](https://github.com/johannesjo/sp2/commit/1207de9))
- fine tune daily summary styling ([be11bfa](https://github.com/johannesjo/sp2/commit/be11bfa))
- improve performance ([843685b](https://github.com/johannesjo/sp2/commit/843685b))
- integrate export task list nicely into daily summary ([ecf92e8](https://github.com/johannesjo/sp2/commit/ecf92e8))
- make google export time work for daily summary ([62d3410](https://github.com/johannesjo/sp2/commit/62d3410))
- no focus for textarea in simple task summary ([f40b640](https://github.com/johannesjo/sp2/commit/f40b640))
- persist daily summary tab index ([e19503b](https://github.com/johannesjo/sp2/commit/e19503b))
- remove focus for time estimates on mobile ([eae41e9](https://github.com/johannesjo/sp2/commit/eae41e9))

## [0.1.11](https://github.com/johannesjo/sp2/compare/v0.1.10...v0.1.11) (2019-01-13)

### Bug Fixes

- **jira:** default jira config being enabled ([a563fbe](https://github.com/johannesjo/sp2/commit/a563fbe))
- **pomodoro:** cycles not working as intended ([07c4527](https://github.com/johannesjo/sp2/commit/07c4527))
- **pomodoro:** pausing tracking not working as intended ([50646b3](https://github.com/johannesjo/sp2/commit/50646b3))

### Features

- **pomodoro:** add skip break ([b80ba77](https://github.com/johannesjo/sp2/commit/b80ba77))
- add isIdle$ as observable ([2fa90e4](https://github.com/johannesjo/sp2/commit/2fa90e4))
- add simple file import export of app data ([b3c8b84](https://github.com/johannesjo/sp2/commit/b3c8b84))
- hide calendar ([72da73b](https://github.com/johannesjo/sp2/commit/72da73b))
- make static import of v1 exports work ([4c5a413](https://github.com/johannesjo/sp2/commit/4c5a413))
- **pomodoro:** add basic dialog ([d0579a2](https://github.com/johannesjo/sp2/commit/d0579a2))
- trigger blur when android keyboard closes ([74c3300](https://github.com/johannesjo/sp2/commit/74c3300))
- **pomodoro:** add notifications ([2ca0b1d](https://github.com/johannesjo/sp2/commit/2ca0b1d))
- **pomodoro:** add session started toast ([76a3bb0](https://github.com/johannesjo/sp2/commit/76a3bb0))
- **pomodoro:** add sounds ([cf5e8c8](https://github.com/johannesjo/sp2/commit/cf5e8c8))
- **pomodoro:** improve button styles a bit ([d943d50](https://github.com/johannesjo/sp2/commit/d943d50))
- **pomodoro:** make disabled time tracking during breaks work ([bf33327](https://github.com/johannesjo/sp2/commit/bf33327))
- **pomodoro:** make it work ([e1f062b](https://github.com/johannesjo/sp2/commit/e1f062b))
- **pomodoro:** make manual resume work for cancel ([c99af17](https://github.com/johannesjo/sp2/commit/c99af17))
- **pomodoro:** prepare store and actions ([49fad8b](https://github.com/johannesjo/sp2/commit/49fad8b))
- **pomodoro:** remove extra long break config option for now ([796c5d5](https://github.com/johannesjo/sp2/commit/796c5d5))

## [0.1.10](https://github.com/johannesjo/sp2/compare/v0.1.9...v0.1.10) (2019-01-11)

### Bug Fixes

- task list switch animation leading to errors sometimes ([8ed8d10](https://github.com/johannesjo/sp2/commit/8ed8d10))

### Features

- **electron:** disable reload shortcut for production build ([b2c4ab0](https://github.com/johannesjo/sp2/commit/b2c4ab0))
- **electron:** show win gracefully ([a3734ba](https://github.com/johannesjo/sp2/commit/a3734ba))
- **tasks:** change order for add attachment dialog ([77141bb](https://github.com/johannesjo/sp2/commit/77141bb))
- **tasks:** improve additional notes styling ([ea8f678](https://github.com/johannesjo/sp2/commit/ea8f678))
- **tasks:** improve done task box styling ([c7c2f96](https://github.com/johannesjo/sp2/commit/c7c2f96))
- add icons ([15eb3a7](https://github.com/johannesjo/sp2/commit/15eb3a7))
- cache all google fonts ([431dc0b](https://github.com/johannesjo/sp2/commit/431dc0b))
- improve hide sub tasks animation ([7c0bd9a](https://github.com/johannesjo/sp2/commit/7c0bd9a))
- only add overlay scrollbars to browsers that support them ([d1c4454](https://github.com/johannesjo/sp2/commit/d1c4454))

## [0.1.8](https://github.com/johannesjo/sp2/compare/v0.1.7...v0.1.8) (2019-01-09)

## [0.1.9](https://github.com/johannesjo/sp2/compare/v0.1.7...v0.1.9) (2019-01-10)

### Bug Fixes

- **electron:** remove dbus related stuff for now ([8497d82](https://github.com/johannesjo/sp2/commit/8497d82))
- possible wrong data crashing app ([b74c82a](https://github.com/johannesjo/sp2/commit/b74c82a))
- **tasks:** remove animation for checkmark when list is animating ([7fc20d7](https://github.com/johannesjo/sp2/commit/7fc20d7))

### Features

- **tasks:** just switch between show and hide when there are no done sub tasks ([f25e69c](https://github.com/johannesjo/sp2/commit/f25e69c))
- improve default task model and task type to be more performant ([668e846](https://github.com/johannesjo/sp2/commit/668e846))
- **tasks:** add icon change for hide done sub tasks ([1568ba0](https://github.com/johannesjo/sp2/commit/1568ba0))
- **tasks:** also handle case when there are only done tasks ([e110f4e](https://github.com/johannesjo/sp2/commit/e110f4e))
- **tasks:** improve task list animation ([5cbd5f7](https://github.com/johannesjo/sp2/commit/5cbd5f7))
- **tasks:** increase animation speed for task list ([a1e6cb9](https://github.com/johannesjo/sp2/commit/a1e6cb9))
- **tasks:** less aggressive focus style ([ade9335](https://github.com/johannesjo/sp2/commit/ade9335))
- **tasks:** make collapsing sub tasks work ([61a0305](https://github.com/johannesjo/sp2/commit/61a0305))
- **tasks:** prepare collapsing sub tasks ([40aeb1d](https://github.com/johannesjo/sp2/commit/40aeb1d))
- **tasks:** restyle done tasks button ([90a4c47](https://github.com/johannesjo/sp2/commit/90a4c47))
- **tasks:** simplify focusing tasks ([dbe4770](https://github.com/johannesjo/sp2/commit/dbe4770))

## [0.1.8](https://github.com/johannesjo/sp2/compare/v0.1.7...v0.1.8) (2019-01-10)

### Bug Fixes

- **electron:** remove dbus related stuff for now ([8497d82](https://github.com/johannesjo/sp2/commit/8497d82))
- possible wrong data crashing app ([b74c82a](https://github.com/johannesjo/sp2/commit/b74c82a))
- **tasks:** remove animation for checkmark when list is animating ([7fc20d7](https://github.com/johannesjo/sp2/commit/7fc20d7))

### Features

- **tasks:** just switch between show and hide when there are no done sub tasks ([f25e69c](https://github.com/johannesjo/sp2/commit/f25e69c))
- improve default task model and task type to be more performant ([668e846](https://github.com/johannesjo/sp2/commit/668e846))
- **tasks:** add icon change for hide done sub tasks ([1568ba0](https://github.com/johannesjo/sp2/commit/1568ba0))
- **tasks:** also handle case when there are only done tasks ([e110f4e](https://github.com/johannesjo/sp2/commit/e110f4e))
- **tasks:** improve task list animation ([5cbd5f7](https://github.com/johannesjo/sp2/commit/5cbd5f7))
- **tasks:** increase animation speed for task list ([a1e6cb9](https://github.com/johannesjo/sp2/commit/a1e6cb9))
- **tasks:** less aggressive focus style ([ade9335](https://github.com/johannesjo/sp2/commit/ade9335))
- **tasks:** make collapsing sub tasks work ([61a0305](https://github.com/johannesjo/sp2/commit/61a0305))
- **tasks:** prepare collapsing sub tasks ([40aeb1d](https://github.com/johannesjo/sp2/commit/40aeb1d))
- **tasks:** restyle done tasks button ([90a4c47](https://github.com/johannesjo/sp2/commit/90a4c47))
- **tasks:** simplify focusing tasks ([dbe4770](https://github.com/johannesjo/sp2/commit/dbe4770))

## [0.1.7](https://github.com/johannesjo/sp2/compare/v0.1.6...v0.1.7) (2019-01-09)

### Bug Fixes

- open not being present ([f519ee0](https://github.com/johannesjo/sp2/commit/f519ee0))

## [0.1.6](https://github.com/johannesjo/sp2/compare/v0.1.5...v0.1.6) (2019-01-08)

### Bug Fixes

- dirty fix for jira cfg issues ([0bd86c8](https://github.com/johannesjo/sp2/commit/0bd86c8))
- typing error ([2d3200f](https://github.com/johannesjo/sp2/commit/2d3200f))
- typing error ([5429541](https://github.com/johannesjo/sp2/commit/5429541))
- **tasks:** next task selection on done ([b1c9a0a](https://github.com/johannesjo/sp2/commit/b1c9a0a))

### Features

- add backdrop for add task bar ([5302392](https://github.com/johannesjo/sp2/commit/5302392))
- **jira:** add description focus mode ([a4b42a6](https://github.com/johannesjo/sp2/commit/a4b42a6))
- **jira:** improve issue attachment styling and reduce th width ([09bcda1](https://github.com/johannesjo/sp2/commit/09bcda1))

## [0.1.5](https://github.com/johannesjo/sp2/compare/v0.1.4...v0.1.5) (2019-01-07)

### Bug Fixes

- controls hitbox blocking time edit ([66fa902](https://github.com/johannesjo/sp2/commit/66fa902))
- **jira:** don't refresh backlog if not enabled ([24e6ad6](https://github.com/johannesjo/sp2/commit/24e6ad6))
- **jira:** no way to disable ([683e847](https://github.com/johannesjo/sp2/commit/683e847))
- **jira:** only do initial request when enabled ([90c56b3](https://github.com/johannesjo/sp2/commit/90c56b3))

### Features

- add roboto sans ([a7565b5](https://github.com/johannesjo/sp2/commit/a7565b5))
- **tasks:** add interactive attachment icon ([81632a5](https://github.com/johannesjo/sp2/commit/81632a5))
- add subtle snack type to use it for syncing and polling ([c99329b](https://github.com/johannesjo/sp2/commit/c99329b))
- declutter ui further by only showing timer icon on hover ([ba1b91f](https://github.com/johannesjo/sp2/commit/ba1b91f))
- make active nav link bold ([72607d8](https://github.com/johannesjo/sp2/commit/72607d8))
- move mark as done up, because it is more important ([adecf2f](https://github.com/johannesjo/sp2/commit/adecf2f))
- only show hover styles for non parent tasks ([80dd325](https://github.com/johannesjo/sp2/commit/80dd325))
- only show toggle show notes button when there are notes ([11dfb03](https://github.com/johannesjo/sp2/commit/11dfb03))
- only show toggle show notes button when there are ntoes ([9da3e6c](https://github.com/johannesjo/sp2/commit/9da3e6c))
- remove ui clutter ([8b2aba2](https://github.com/johannesjo/sp2/commit/8b2aba2))

## [0.1.4](https://github.com/johannesjo/sp2/compare/v0.1.3...v0.1.4) (2019-01-06)

### Bug Fixes

- **electron:** tray dark mode icon ([cabd99c](https://github.com/johannesjo/sp2/commit/cabd99c))
- ipc send breaking web ([af8353b](https://github.com/johannesjo/sp2/commit/af8353b))
- **jira:** error handling ([d8fcb67](https://github.com/johannesjo/sp2/commit/d8fcb67))
- work around ngrx formly issues :( ([1fab8ef](https://github.com/johannesjo/sp2/commit/1fab8ef))

### Features

- **electron:** make indicator work again ([9d3d544](https://github.com/johannesjo/sp2/commit/9d3d544))
- **jira:** add submit worklog dialog ([78977ab](https://github.com/johannesjo/sp2/commit/78977ab))
- **jira:** add worklog data to jira issue content ([774deaa](https://github.com/johannesjo/sp2/commit/774deaa))
- **jira:** adjust default settings ([5148a72](https://github.com/johannesjo/sp2/commit/5148a72))
- **jira:** auto assign userAssignee to current user when test credentials was clicked ([7a414bf](https://github.com/johannesjo/sp2/commit/7a414bf))
- **jira:** change default query for backlog ([ab21e59](https://github.com/johannesjo/sp2/commit/ab21e59))
- **jira:** make submitting worklogs work ([df6bffc](https://github.com/johannesjo/sp2/commit/df6bffc))
- **jira:** prepare effect for opening worklog dialog ([09e4230](https://github.com/johannesjo/sp2/commit/09e4230))
- **pomodoro:** add config and outline pomodoro service ([4e893da](https://github.com/johannesjo/sp2/commit/4e893da))
- **pomodoro:** add more outline code ([f8908a7](https://github.com/johannesjo/sp2/commit/f8908a7))
- **pomodoro:** add very basic timer to header ([719398b](https://github.com/johannesjo/sp2/commit/719398b))
- **pomodoro:** hide pomodoro functionality for now ([1d94ca9](https://github.com/johannesjo/sp2/commit/1d94ca9))

## [0.1.3](https://github.com/johannesjo/sp2/compare/v0.1.2...v0.1.3) (2019-01-06)

### Features

- **jira:** minor refactor for effects ([ac19b7e](https://github.com/johannesjo/sp2/commit/ac19b7e))
- handle error when syncing on daily summary fails ([3af8bda](https://github.com/johannesjo/sp2/commit/3af8bda))
- limit min max zoom ([7928c10](https://github.com/johannesjo/sp2/commit/7928c10))

## [0.1.2](https://github.com/johannesjo/sp2/compare/v0.1.1...v0.1.2) (2019-01-05)

### Bug Fixes

- **jira:** issue polling happening quite too often ([dd5f217](https://github.com/johannesjo/sp2/commit/dd5f217))

### Features

- **jira:** improve transition notifications ([1ede100](https://github.com/johannesjo/sp2/commit/1ede100))
- **jira:** only transition if needed ([cc59f73](https://github.com/johannesjo/sp2/commit/cc59f73))
- **jira, git:** improve polling behaviour ([9d21739](https://github.com/johannesjo/sp2/commit/9d21739))

## [0.1.1](https://github.com/johannesjo/sp2/compare/v0.1.0...v0.1.1) (2019-01-05)

# 0.1.0 (2019-01-05)

### Bug Fixes

- add missing type ([6b81cfd](https://github.com/johannesjo/sp2/commit/6b81cfd))
- add target blank to attachment link ([e059b36](https://github.com/johannesjo/sp2/commit/e059b36))
- add task bar being overlapped by bookmarks ([7889721](https://github.com/johannesjo/sp2/commit/7889721))
- add task bar color ([ee48962](https://github.com/johannesjo/sp2/commit/ee48962))
- add task not working any more ([161d7c0](https://github.com/johannesjo/sp2/commit/161d7c0))
- adjust timeout trick for now ([6857958](https://github.com/johannesjo/sp2/commit/6857958))
- all kinds of linting errors ([742d536](https://github.com/johannesjo/sp2/commit/742d536))
- annoying issue that jira cfg was throwing an error ([6e006d5](https://github.com/johannesjo/sp2/commit/6e006d5))
- another error with destroyed view ([0c36982](https://github.com/johannesjo/sp2/commit/0c36982))
- attachment saving generating a lot of ids ([d0f1152](https://github.com/johannesjo/sp2/commit/d0f1152))
- backlog heading position ([25f2930](https://github.com/johannesjo/sp2/commit/25f2930))
- build ([965da14](https://github.com/johannesjo/sp2/commit/965da14))
- build ([0fa66ca](https://github.com/johannesjo/sp2/commit/0fa66ca))
- container not being 100% height ([ccd3d61](https://github.com/johannesjo/sp2/commit/ccd3d61))
- contenteditable messing up ([5051361](https://github.com/johannesjo/sp2/commit/5051361))
- create project dialog throwing error when opened from config page ([e31ca2e](https://github.com/johannesjo/sp2/commit/e31ca2e))
- dirty dirty dirty fix for input duration ([c7ac3b5](https://github.com/johannesjo/sp2/commit/c7ac3b5))
- dynamic jira cfg not working ([c3ca8b7](https://github.com/johannesjo/sp2/commit/c3ca8b7))
- edit attachment dialog throwing an error when link is empty ([66d878d](https://github.com/johannesjo/sp2/commit/66d878d))
- edit on click being confused ([f39ab3a](https://github.com/johannesjo/sp2/commit/f39ab3a))
- electron build for current state ([b3a2782](https://github.com/johannesjo/sp2/commit/b3a2782))
- enlarge image animation for thumbnail images ([1ec854b](https://github.com/johannesjo/sp2/commit/1ec854b))
- error with destroyed view ([e4c7c82](https://github.com/johannesjo/sp2/commit/e4c7c82))
- finish day button not being centered ([e59adfb](https://github.com/johannesjo/sp2/commit/e59adfb))
- first start issue with project state ([f0d8c6f](https://github.com/johannesjo/sp2/commit/f0d8c6f))
- focus behavior ([7993970](https://github.com/johannesjo/sp2/commit/7993970))
- google sync not working ([370cb4e](https://github.com/johannesjo/sp2/commit/370cb4e))
- google sync not working ([382e0d8](https://github.com/johannesjo/sp2/commit/382e0d8))
- icon ([eed6cb9](https://github.com/johannesjo/sp2/commit/eed6cb9))
- import ([52c9990](https://github.com/johannesjo/sp2/commit/52c9990))
- inline edit sometimes not updating value ([8ad7af2](https://github.com/johannesjo/sp2/commit/8ad7af2))
- inline markdown component rendering ([2337fb4](https://github.com/johannesjo/sp2/commit/2337fb4))
- issue model issues ([68524d4](https://github.com/johannesjo/sp2/commit/68524d4))
- jira issue content text color error ([b7782f8](https://github.com/johannesjo/sp2/commit/b7782f8))
- jira password field not being a password field ([35b39f7](https://github.com/johannesjo/sp2/commit/35b39f7))
- lint ([461067b](https://github.com/johannesjo/sp2/commit/461067b))
- lint ([8ff9dfb](https://github.com/johannesjo/sp2/commit/8ff9dfb))
- lint ([c4d2dc2](https://github.com/johannesjo/sp2/commit/c4d2dc2))
- localForage not being ready initially ([47484a5](https://github.com/johannesjo/sp2/commit/47484a5))
- main header navigation for mobile ([d2a9681](https://github.com/johannesjo/sp2/commit/d2a9681))
- manifest ([2e1634d](https://github.com/johannesjo/sp2/commit/2e1634d))
- markdown links for electron ([1f9f659](https://github.com/johannesjo/sp2/commit/1f9f659))
- minor issue ([d9f7405](https://github.com/johannesjo/sp2/commit/d9f7405))
- minor styling issue ([575ed11](https://github.com/johannesjo/sp2/commit/575ed11))
- mobile bookmark bar button styling ([aa244c5](https://github.com/johannesjo/sp2/commit/aa244c5))
- mouse wheel zoom direction for electron ([ca9409e](https://github.com/johannesjo/sp2/commit/ca9409e))
- next task sometimes selecting weird values ([017b83e](https://github.com/johannesjo/sp2/commit/017b83e))
- no state worklog ([3e83b49](https://github.com/johannesjo/sp2/commit/3e83b49))
- note background for dark theme ([0e05b2c](https://github.com/johannesjo/sp2/commit/0e05b2c))
- note state being overwritten by task state ([e429a32](https://github.com/johannesjo/sp2/commit/e429a32))
- note value being null sometimes ([7662938](https://github.com/johannesjo/sp2/commit/7662938))
- paste not working any more ([3289145](https://github.com/johannesjo/sp2/commit/3289145))
- persistence ([59dab7a](https://github.com/johannesjo/sp2/commit/59dab7a))
- planning mode being always triggered initially ([77e2ea3](https://github.com/johannesjo/sp2/commit/77e2ea3))
- play icon for dark theme ([d2dbda8](https://github.com/johannesjo/sp2/commit/d2dbda8))
- potential errors when interacting with ls ([39d8287](https://github.com/johannesjo/sp2/commit/39d8287))
- project change for worklog ([db84304](https://github.com/johannesjo/sp2/commit/db84304))
- projects saving for load state ([a3884be](https://github.com/johannesjo/sp2/commit/a3884be))
- projects without jira cfg throwing errors ([11459cc](https://github.com/johannesjo/sp2/commit/11459cc))
- reducer being executed twice ([854e43c](https://github.com/johannesjo/sp2/commit/854e43c))
- **bookmarks:** fix form for bookmarks ([ab4c04d](https://github.com/johannesjo/sp2/commit/ab4c04d))
- **bookmarks:** persistence for bookmark toggle state ([fafb266](https://github.com/johannesjo/sp2/commit/fafb266))
- **electron:** don't load electron handlers for web instance ([a42011a](https://github.com/johannesjo/sp2/commit/a42011a))
- **enlargeImg:** image animation sometimes not triggering as intended ([10162b1](https://github.com/johannesjo/sp2/commit/10162b1))
- **enlargeImg:** zoom out animation failing when in zoomed mode and clicking on background ([b1db3e9](https://github.com/johannesjo/sp2/commit/b1db3e9))
- **git:** error when polling issues ([7b87f99](https://github.com/johannesjo/sp2/commit/7b87f99))
- **git:** search not working ([58fceb9](https://github.com/johannesjo/sp2/commit/58fceb9))
- **googleDriveSnyc:** opening multiple dialogs ([736acb9](https://github.com/johannesjo/sp2/commit/736acb9))
- **googleDriveSync:** check for remote update ([e07a77b](https://github.com/johannesjo/sp2/commit/e07a77b))
- **googleDriveSync:** config section ([a42d03f](https://github.com/johannesjo/sp2/commit/a42d03f))
- **googleDriveSync:** electron calls ([18843f0](https://github.com/johannesjo/sp2/commit/18843f0))
- **googleDriveSync:** expression changed after check error ([73f56c4](https://github.com/johannesjo/sp2/commit/73f56c4))
- **googleDriveSync:** fix async toast notification ([f860844](https://github.com/johannesjo/sp2/commit/f860844))
- **googleDriveSync:** google config ([0915856](https://github.com/johannesjo/sp2/commit/0915856))
- **googleDriveSync:** initial login not being triggered ([49faf0f](https://github.com/johannesjo/sp2/commit/49faf0f))
- **googleDriveSync:** login for electron not working ([52e316e](https://github.com/johannesjo/sp2/commit/52e316e))
- **googleDriveSync:** save not working any more ([7fe4030](https://github.com/johannesjo/sp2/commit/7fe4030))
- **googleTimeSheetExport:** settings not being saved ([e7fd8ff](https://github.com/johannesjo/sp2/commit/e7fd8ff))
- **googleTimeSheetExport:** updating default values not working ([516013f](https://github.com/johannesjo/sp2/commit/516013f))
- **idle:** create task not working ([0ec81d4](https://github.com/johannesjo/sp2/commit/0ec81d4))
- **inputDurationSlider:** hour problem ([9569011](https://github.com/johannesjo/sp2/commit/9569011))
- **inputDurationSlider:** not working as intended ([ee70a74](https://github.com/johannesjo/sp2/commit/ee70a74))
- **jira:** extension request not working ([68e0bf0](https://github.com/johannesjo/sp2/commit/68e0bf0))
- **jira:** mark issues as checked throwing an error ([5109d0a](https://github.com/johannesjo/sp2/commit/5109d0a))
- **jira:** potential error for auto updates when there are no comments ([c069126](https://github.com/johannesjo/sp2/commit/c069126))
- **jira:** problem when jira cfg is missing ([0eef193](https://github.com/johannesjo/sp2/commit/0eef193))
- **jira:** query not working ([3862c46](https://github.com/johannesjo/sp2/commit/3862c46))
- **jira:** text color and author image styling ([4c26eb1](https://github.com/johannesjo/sp2/commit/4c26eb1))
- **project:** creation dialog bot resetting tmp data after project creation ([d80e97c](https://github.com/johannesjo/sp2/commit/d80e97c))
- **projects:** project creation dialog ([8ba5405](https://github.com/johannesjo/sp2/commit/8ba5405))
- **task:** mobile drag and drop ([9ab424b](https://github.com/johannesjo/sp2/commit/9ab424b))
- typing issue ([2548168](https://github.com/johannesjo/sp2/commit/2548168))
- **tasks:** animation issues ([2cb6b48](https://github.com/johannesjo/sp2/commit/2cb6b48))
- scrolling issue on mobile ([cf118b3](https://github.com/johannesjo/sp2/commit/cf118b3))
- selecting next task throwing an error ([0f5630e](https://github.com/johannesjo/sp2/commit/0f5630e))
- semicolons instead of commas ([7662454](https://github.com/johannesjo/sp2/commit/7662454))
- setting model from input for input duration slider ([a0e8862](https://github.com/johannesjo/sp2/commit/a0e8862))
- **tasks:** color changing on drag ([5f64d83](https://github.com/johannesjo/sp2/commit/5f64d83))
- settings for dark theme ([a9363d2](https://github.com/johannesjo/sp2/commit/a9363d2))
- settings not being scrollable ([75e674a](https://github.com/johannesjo/sp2/commit/75e674a))
- several minor theming issues ([98e41c7](https://github.com/johannesjo/sp2/commit/98e41c7))
- shutdown not working ([1255223](https://github.com/johannesjo/sp2/commit/1255223))
- shutdown not working ([ca34f75](https://github.com/johannesjo/sp2/commit/ca34f75))
- simple task export not working ([650b858](https://github.com/johannesjo/sp2/commit/650b858))
- snack custom styling ([0fb3731](https://github.com/johannesjo/sp2/commit/0fb3731))
- snack login button ([3e1f629](https://github.com/johannesjo/sp2/commit/3e1f629))
- styling for project overview page ([0ce4c5b](https://github.com/johannesjo/sp2/commit/0ce4c5b))
- super productivity getting cut off for project switcher ([7824c35](https://github.com/johannesjo/sp2/commit/7824c35))
- take a break ([e8e51a2](https://github.com/johannesjo/sp2/commit/e8e51a2))
- task styling ([e1329ec](https://github.com/johannesjo/sp2/commit/e1329ec))
- task sync not triggering for moving tasks ([6fefed1](https://github.com/johannesjo/sp2/commit/6fefed1))
- the possibility of starting a done task via button ([d077219](https://github.com/johannesjo/sp2/commit/d077219))
- theme body class ([c4c1298](https://github.com/johannesjo/sp2/commit/c4c1298))
- time spent not updating ([bc1ee5b](https://github.com/johannesjo/sp2/commit/bc1ee5b))
- time worked without a break being twice as fast ([cf58078](https://github.com/johannesjo/sp2/commit/cf58078))
- typing ([91979d0](https://github.com/johannesjo/sp2/commit/91979d0))
- typing error ([4a29b2b](https://github.com/johannesjo/sp2/commit/4a29b2b))
- typing error ([15a5212](https://github.com/johannesjo/sp2/commit/15a5212))
- typing for google timesheet export ([b3f74ec](https://github.com/johannesjo/sp2/commit/b3f74ec))
- **tasks:** animation playing when opening backlog ([6898294](https://github.com/johannesjo/sp2/commit/6898294))
- typing for input duration slider ([874bb17](https://github.com/johannesjo/sp2/commit/874bb17))
- **tasks:** attachment color ([53f29a9](https://github.com/johannesjo/sp2/commit/53f29a9))
- **tasks:** case when last sub task was deleted ([c77fb8e](https://github.com/johannesjo/sp2/commit/c77fb8e))
- **tasks:** case when sub task is added to current task ([eb01a6b](https://github.com/johannesjo/sp2/commit/eb01a6b))
- **tasks:** colors for light theme ([77d12d4](https://github.com/johannesjo/sp2/commit/77d12d4))
- **tasks:** deleting backlog and todays task items ([0fb6053](https://github.com/johannesjo/sp2/commit/0fb6053))
- **tasks:** deleting sub tasks ([a72c1db](https://github.com/johannesjo/sp2/commit/a72c1db))
- **tasks:** error in template ([d00ed88](https://github.com/johannesjo/sp2/commit/d00ed88))
- **tasks:** issue check not working as intended ([d027f89](https://github.com/johannesjo/sp2/commit/d027f89))
- typing for ma archive to worklog ([691ae55](https://github.com/johannesjo/sp2/commit/691ae55))
- typing issue ([ef49a21](https://github.com/johannesjo/sp2/commit/ef49a21))
- typing issue ([3663e17](https://github.com/johannesjo/sp2/commit/3663e17))
- typo ([00ad367](https://github.com/johannesjo/sp2/commit/00ad367))
- worklog for async data ([1ef7014](https://github.com/johannesjo/sp2/commit/1ef7014))
- **tasks:** issue text not being visible ([f1ae984](https://github.com/johannesjo/sp2/commit/f1ae984))
- **tasks:** jira info not being readable ([d7e88b9](https://github.com/johannesjo/sp2/commit/d7e88b9))
- **tasks:** minor styling issue ([7fdc6c5](https://github.com/johannesjo/sp2/commit/7fdc6c5))
- **tasks:** mobile styling ([bdbbf2e](https://github.com/johannesjo/sp2/commit/bdbbf2e))
- **tasks:** prevent drag handle shrinking ([38fbe53](https://github.com/johannesjo/sp2/commit/38fbe53))
- **tasks:** task isDone styling ([57874b1](https://github.com/johannesjo/sp2/commit/57874b1))
- **tasks:** toggle to undone ([db8b1d1](https://github.com/johannesjo/sp2/commit/db8b1d1))

### Features

- add 15 min to datetime input ([f18d489](https://github.com/johannesjo/sp2/commit/f18d489))
- add actual notification to take a break reminder ([864d61b](https://github.com/johannesjo/sp2/commit/864d61b))
- add add task btn to work view ([708eccb](https://github.com/johannesjo/sp2/commit/708eccb))
- add add-task-bar component ([47df742](https://github.com/johannesjo/sp2/commit/47df742))
- add and style note for tomorrow ([9ad72f2](https://github.com/johannesjo/sp2/commit/9ad72f2))
- add attachment via task context menu ([dbe31f5](https://github.com/johannesjo/sp2/commit/dbe31f5))
- add badge for undone tasks rather than for notes ([c7acd56](https://github.com/johannesjo/sp2/commit/c7acd56))
- add basic functionality to play button ([4d2f135](https://github.com/johannesjo/sp2/commit/4d2f135))
- add basic jira config section ([768d519](https://github.com/johannesjo/sp2/commit/768d519))
- add basic project settings ([6e51051](https://github.com/johannesjo/sp2/commit/6e51051))
- add basic split component ([3a4ae2c](https://github.com/johannesjo/sp2/commit/3a4ae2c))
- add basic sync interface and add function to load complete user data ([c69428a](https://github.com/johannesjo/sp2/commit/c69428a))
- add body class to help with showing and hiding elements when there is/ain't jira support ([8da579c](https://github.com/johannesjo/sp2/commit/8da579c))
- add boilerplate for datetime-input ([cbf5ab1](https://github.com/johannesjo/sp2/commit/cbf5ab1))
- add complete misc settings interface ([db800cf](https://github.com/johannesjo/sp2/commit/db800cf))
- add copy to clipboard for simple task summary ([ee0b10b](https://github.com/johannesjo/sp2/commit/ee0b10b))
- add counter for split ([d8fa02a](https://github.com/johannesjo/sp2/commit/d8fa02a))
- add css scroll bars ([c841a85](https://github.com/johannesjo/sp2/commit/c841a85))
- add data to daily summary ([c0d9560](https://github.com/johannesjo/sp2/commit/c0d9560))
- add datetime input with buttons for simplicity ([99846d0](https://github.com/johannesjo/sp2/commit/99846d0))
- add debugging code for google login ([1335249](https://github.com/johannesjo/sp2/commit/1335249))
- add default issue provider configs to default project ([2b7d626](https://github.com/johannesjo/sp2/commit/2b7d626))
- add dialogs as ngrx component ([564bb0b](https://github.com/johannesjo/sp2/commit/564bb0b))
- add different color for backlog ([e53be44](https://github.com/johannesjo/sp2/commit/e53be44))
- add double enter starts working ([df0b940](https://github.com/johannesjo/sp2/commit/df0b940))
- add download button for simple summary ([d944968](https://github.com/johannesjo/sp2/commit/d944968))
- add drag and drop for task list ([9eae8a7](https://github.com/johannesjo/sp2/commit/9eae8a7))
- add duration input for formly forms ([8181512](https://github.com/johannesjo/sp2/commit/8181512))
- add estimate remaining for backlog ([ed8cd97](https://github.com/johannesjo/sp2/commit/ed8cd97))
- add expand panel animation ([82f5e4c](https://github.com/johannesjo/sp2/commit/82f5e4c))
- add hit area to speed dial items ([85d6e38](https://github.com/johannesjo/sp2/commit/85d6e38))
- add icons to jira and git setup dialogs ([23cf4de](https://github.com/johannesjo/sp2/commit/23cf4de))
- add inset shadow to work vie page header ([6fa1bb5](https://github.com/johannesjo/sp2/commit/6fa1bb5))
- add issue icon to issue search ([603fed8](https://github.com/johannesjo/sp2/commit/603fed8))
- add jira attachments ([0195c07](https://github.com/johannesjo/sp2/commit/0195c07))
- add local forage and prepare data saving ([94e9c3b](https://github.com/johannesjo/sp2/commit/94e9c3b))
- add mat typography globally ([d3cc604](https://github.com/johannesjo/sp2/commit/d3cc604))
- add missing detect changes ([a842c47](https://github.com/johannesjo/sp2/commit/a842c47))
- add missing misc settings ([1f9eeb7](https://github.com/johannesjo/sp2/commit/1f9eeb7))
- add missing state to root state ([228ef9a](https://github.com/johannesjo/sp2/commit/228ef9a))
- add model for focus id lists ([380583b](https://github.com/johannesjo/sp2/commit/380583b))
- add more ipc events ([1574ea7](https://github.com/johannesjo/sp2/commit/1574ea7))
- add more minimal task ui ([14c7131](https://github.com/johannesjo/sp2/commit/14c7131))
- add most basic duration input slider ([578414c](https://github.com/johannesjo/sp2/commit/578414c))
- add most basic split backlog ([1003dd6](https://github.com/johannesjo/sp2/commit/1003dd6))
- add mousewheel zoom for electron ([55a79cd](https://github.com/johannesjo/sp2/commit/55a79cd))
- add new input also to add reminder dialog ([4e42734](https://github.com/johannesjo/sp2/commit/4e42734))
- add new media mixin ([709fc44](https://github.com/johannesjo/sp2/commit/709fc44))
- add new play icon ([27959af](https://github.com/johannesjo/sp2/commit/27959af))
- add nice little animation to attachments ([33e2eed](https://github.com/johannesjo/sp2/commit/33e2eed))
- add note to install extension for jira cfg ([af03eae](https://github.com/johannesjo/sp2/commit/af03eae))
- add option to only track idle time when there is a current task ([24ab839](https://github.com/johannesjo/sp2/commit/24ab839))
- add overflow scrolling for mobile ([1d6e156](https://github.com/johannesjo/sp2/commit/1d6e156))
- add pink theme ([0e7fd09](https://github.com/johannesjo/sp2/commit/0e7fd09))
- add plan your day to new work view ([c3888bd](https://github.com/johannesjo/sp2/commit/c3888bd))
- add pre load for enlarge image ([52b0aac](https://github.com/johannesjo/sp2/commit/52b0aac))
- add project related data action ([cffecf1](https://github.com/johannesjo/sp2/commit/cffecf1))
- add proper jira and git icon ([36e6c4a](https://github.com/johannesjo/sp2/commit/36e6c4a))
- add pulse animation when tracking time ([4fae79d](https://github.com/johannesjo/sp2/commit/4fae79d))
- add real progress to progress circle ([4eaaf4e](https://github.com/johannesjo/sp2/commit/4eaaf4e))
- add reducer for global layout stuff and remove daily planner ([44faeff](https://github.com/johannesjo/sp2/commit/44faeff))
- add reload data function to sync interface ([29dacd3](https://github.com/johannesjo/sp2/commit/29dacd3))
- add routing animations ([1eba194](https://github.com/johannesjo/sp2/commit/1eba194))
- add saving and loading from ls ([c2d81f4](https://github.com/johannesjo/sp2/commit/c2d81f4))
- add saving to ls again ([4c38b91](https://github.com/johannesjo/sp2/commit/4c38b91))
- add short syntax ([cca760b](https://github.com/johannesjo/sp2/commit/cca760b))
- add shortcut for open add task bar ([5aee2bf](https://github.com/johannesjo/sp2/commit/5aee2bf))
- add shortcut for toggling backlog ([2474e92](https://github.com/johannesjo/sp2/commit/2474e92))
- add shortcut to toggle bookmark bar ([a626a66](https://github.com/johannesjo/sp2/commit/a626a66))
- add show task bar to main header quick access ([9745f1b](https://github.com/johannesjo/sp2/commit/9745f1b))
- add shutdown ([5b1dd13](https://github.com/johannesjo/sp2/commit/5b1dd13))
- add shutdown to finish day for electron ([0116f0e](https://github.com/johannesjo/sp2/commit/0116f0e))
- add simple summary for worklog too ([c54c445](https://github.com/johannesjo/sp2/commit/c54c445))
- add simple task summary ([2a1f121](https://github.com/johannesjo/sp2/commit/2a1f121))
- add some route links ([e6ca6b3](https://github.com/johannesjo/sp2/commit/e6ca6b3))
- add some useful mixins ([669ce4c](https://github.com/johannesjo/sp2/commit/669ce4c))
- add sophisticated select next task logic ([5d02745](https://github.com/johannesjo/sp2/commit/5d02745))
- add split component ([80577b5](https://github.com/johannesjo/sp2/commit/80577b5))
- add startedTimeToday for project model ([6445b05](https://github.com/johannesjo/sp2/commit/6445b05))
- add styles for dragula ([69c56d0](https://github.com/johannesjo/sp2/commit/69c56d0))
- add sub tasks ([48a5f75](https://github.com/johannesjo/sp2/commit/48a5f75))
- add super cool loading spinner ([cf81761](https://github.com/johannesjo/sp2/commit/cf81761))
- add take a break reminder and time worked without break counter ([9dbf0ea](https://github.com/johannesjo/sp2/commit/9dbf0ea))
- add task archive ([c60a4d3](https://github.com/johannesjo/sp2/commit/c60a4d3))
- add task selection for idle time ([1268cfa](https://github.com/johannesjo/sp2/commit/1268cfa))
- add theme class to body rather than to app ([598dd54](https://github.com/johannesjo/sp2/commit/598dd54))
- add theme colors for duration input ([4d7a8e9](https://github.com/johannesjo/sp2/commit/4d7a8e9))
- add time estimate to simple task summary export [#1](https://github.com/johannesjo/sp2/issues/1) ([adfaab9](https://github.com/johannesjo/sp2/commit/adfaab9))
- add trackBy to task list for performance and to fix animations ([3a2a019](https://github.com/johannesjo/sp2/commit/3a2a019))
- add typing to config form constants ([d87d1b3](https://github.com/johannesjo/sp2/commit/d87d1b3))
- add view logic part for task drag & drop ([d6211b8](https://github.com/johannesjo/sp2/commit/d6211b8))
- adjust app loading spinner position ([eafde19](https://github.com/johannesjo/sp2/commit/eafde19))
- adjust default table styling ([9d9505a](https://github.com/johannesjo/sp2/commit/9d9505a))
- adjust styling ([3c82be1](https://github.com/johannesjo/sp2/commit/3c82be1))
- adjust styling ([7109d31](https://github.com/johannesjo/sp2/commit/7109d31))
- allow for dropping inside empty lists ([b7db0b5](https://github.com/johannesjo/sp2/commit/b7db0b5))
- allow pause and play of last current task ([1bb1cc4](https://github.com/johannesjo/sp2/commit/1bb1cc4))
- also add stagger to leave list animation ([00cddef](https://github.com/johannesjo/sp2/commit/00cddef))
- also sync attachment state ([9a3684e](https://github.com/johannesjo/sp2/commit/9a3684e))
- animate markdown edit ([95a0d8e](https://github.com/johannesjo/sp2/commit/95a0d8e))
- auto delete task attachments for sub tasks ([441acf5](https://github.com/johannesjo/sp2/commit/441acf5))
- auto reload data for missing issues ([8600a7b](https://github.com/johannesjo/sp2/commit/8600a7b))
- beatify and improve worklog ([7b3f239](https://github.com/johannesjo/sp2/commit/7b3f239))
- beautify add task and work view header ([24932c6](https://github.com/johannesjo/sp2/commit/24932c6))
- beautify daily planner ([c651aca](https://github.com/johannesjo/sp2/commit/c651aca))
- beautify daily summary ([614d3aa](https://github.com/johannesjo/sp2/commit/614d3aa))
- beautify tasks some more ([3697f1f](https://github.com/johannesjo/sp2/commit/3697f1f))
- block saving while importing data ([ac2a5b2](https://github.com/johannesjo/sp2/commit/ac2a5b2))
- change default shortcut for bookmarks ([e5afa8c](https://github.com/johannesjo/sp2/commit/e5afa8c))
- change default shortcuts ([9f34298](https://github.com/johannesjo/sp2/commit/9f34298))
- change toggle backlog default shortcut ([1451293](https://github.com/johannesjo/sp2/commit/1451293))
- check if issue was imported before creating a task ([906dec7](https://github.com/johannesjo/sp2/commit/906dec7))
- confirm before quit for electron ([cf99578](https://github.com/johannesjo/sp2/commit/cf99578))
- confirm before quit for web ([8b2d3ef](https://github.com/johannesjo/sp2/commit/8b2d3ef))
- connect settings for idle time ([0b07414](https://github.com/johannesjo/sp2/commit/0b07414))
- create tick in a more reactive style ([91329fc](https://github.com/johannesjo/sp2/commit/91329fc))
- don't always start dev tools for production ([6044e67](https://github.com/johannesjo/sp2/commit/6044e67))
- don't emit invalid values from datetime input ([b1c531d](https://github.com/johannesjo/sp2/commit/b1c531d))
- don't save last active for note ui action ([5259044](https://github.com/johannesjo/sp2/commit/5259044))
- don't save last active when saving google session data ([4ba65aa](https://github.com/johannesjo/sp2/commit/4ba65aa))
- don't submit google drive sync cfg if invalid ([a526cd3](https://github.com/johannesjo/sp2/commit/a526cd3))
- don't trigger global key combos if inside an input and no special keys are used ([8997d43](https://github.com/johannesjo/sp2/commit/8997d43))
- don't update last active for project change ([1315961](https://github.com/johannesjo/sp2/commit/1315961))
- even more fine tuning for nav ([b44f600](https://github.com/johannesjo/sp2/commit/b44f600))
- finish styling for progress circle ([39af8f6](https://github.com/johannesjo/sp2/commit/39af8f6))
- fix daily summary success animation ([fc4f98c](https://github.com/johannesjo/sp2/commit/fc4f98c))
- force final sync to google drive ([d014f3c](https://github.com/johannesjo/sp2/commit/d014f3c))
- get rid extra container ([6d77211](https://github.com/johannesjo/sp2/commit/6d77211))
- hide bookmarks on new projects and first start ([fa2cd87](https://github.com/johannesjo/sp2/commit/fa2cd87))
- hide time estimate button for parent tasks ([3b7f4fc](https://github.com/johannesjo/sp2/commit/3b7f4fc))
- implement dynamic config section content ([e0bee93](https://github.com/johannesjo/sp2/commit/e0bee93))
- improve all animations ([6253ddc](https://github.com/johannesjo/sp2/commit/6253ddc))
- improve config forms ([ea97e42](https://github.com/johannesjo/sp2/commit/ea97e42))
- improve daily summary styling ([cf25579](https://github.com/johannesjo/sp2/commit/cf25579))
- improve first app start experience ([7e49556](https://github.com/johannesjo/sp2/commit/7e49556))
- improve focus behavior ([c152c96](https://github.com/johannesjo/sp2/commit/c152c96))
- improve folder structure ([9878d0d](https://github.com/johannesjo/sp2/commit/9878d0d))
- improve form and add settings for idle time ([a7b76a1](https://github.com/johannesjo/sp2/commit/a7b76a1))
- improve icon nav header for small mobile ([ead2cac](https://github.com/johannesjo/sp2/commit/ead2cac))
- improve idle time dialog ([1057ab5](https://github.com/johannesjo/sp2/commit/1057ab5))
- improve main header styling ([5dcc5ca](https://github.com/johannesjo/sp2/commit/5dcc5ca))
- improve markdown even further ([5bb08ec](https://github.com/johannesjo/sp2/commit/5bb08ec))
- improve markdown further ([c4842af](https://github.com/johannesjo/sp2/commit/c4842af))
- improve note readability ([1061ff8](https://github.com/johannesjo/sp2/commit/1061ff8))
- improve scrollbars ([8ca335b](https://github.com/johannesjo/sp2/commit/8ca335b))
- improve simple task summary for worklog ([a67f9bf](https://github.com/johannesjo/sp2/commit/a67f9bf))
- improve split ([5f0126c](https://github.com/johannesjo/sp2/commit/5f0126c))
- improve split further ([0ee9339](https://github.com/johannesjo/sp2/commit/0ee9339))
- improve split further and further ([4b50856](https://github.com/johannesjo/sp2/commit/4b50856))
- improve styling for plan mode ([b2055d5](https://github.com/johannesjo/sp2/commit/b2055d5))
- improve work view header ([ef103da](https://github.com/johannesjo/sp2/commit/ef103da))
- improve work view header styling ([e625cb8](https://github.com/johannesjo/sp2/commit/e625cb8))
- include complete task data for missing issue observable ([c7139a3](https://github.com/johannesjo/sp2/commit/c7139a3))
- increase storage quota ([11b891f](https://github.com/johannesjo/sp2/commit/11b891f))
- limit cfg update notification to public sections ([1f4a653](https://github.com/johannesjo/sp2/commit/1f4a653))
- link sp icon to work view ([ccb1b07](https://github.com/johannesjo/sp2/commit/ccb1b07))
- load project data initially ([1489ef0](https://github.com/johannesjo/sp2/commit/1489ef0))
- make async database basically work ([666204e](https://github.com/johannesjo/sp2/commit/666204e))
- make completed and uncompleted tasks work ([b742dfd](https://github.com/johannesjo/sp2/commit/b742dfd))
- make config section and config form more flexible ([a0c87d0](https://github.com/johannesjo/sp2/commit/a0c87d0))
- make deleting sub tasks work ([72242e1](https://github.com/johannesjo/sp2/commit/72242e1))
- make deleting sub tasks work ([7ce44bf](https://github.com/johannesjo/sp2/commit/7ce44bf))
- make flat list for attachments in jira panel ([9558f76](https://github.com/johannesjo/sp2/commit/9558f76))
- make header always smaller ([1a84508](https://github.com/johannesjo/sp2/commit/1a84508))
- make header fixed ([c74e263](https://github.com/johannesjo/sp2/commit/c74e263))
- make hiding the navigation optional ([c12616d](https://github.com/johannesjo/sp2/commit/c12616d))
- make it work like before ([4afb0ac](https://github.com/johannesjo/sp2/commit/4afb0ac))
- make most simple idle time handling work ([bdcd6ea](https://github.com/johannesjo/sp2/commit/bdcd6ea))
- make new input duration slider work inside dialog time estimate ([fc51397](https://github.com/johannesjo/sp2/commit/fc51397))
- make notifications work ([a7ade53](https://github.com/johannesjo/sp2/commit/a7ade53))
- make saving work over projects ([c70b703](https://github.com/johannesjo/sp2/commit/c70b703))
- make setting the current task possible again ([56b1fa5](https://github.com/johannesjo/sp2/commit/56b1fa5))
- make split a little bigger ([860e05e](https://github.com/johannesjo/sp2/commit/860e05e))
- make split drag work on mobile ([37a42af](https://github.com/johannesjo/sp2/commit/37a42af))
- make split less prominent ([af62c34](https://github.com/johannesjo/sp2/commit/af62c34))
- make tasks work as most basic entity ([7df9300](https://github.com/johannesjo/sp2/commit/7df9300))
- make time estimate exceeded snack stay longer ([6542e71](https://github.com/johannesjo/sp2/commit/6542e71))
- make undo delete task work with task attachments ([e8a6598](https://github.com/johannesjo/sp2/commit/e8a6598))
- make update one work ([820106a](https://github.com/johannesjo/sp2/commit/820106a))
- make web worker work ([c0ddeb4](https://github.com/johannesjo/sp2/commit/c0ddeb4))
- minor change ([dd12331](https://github.com/johannesjo/sp2/commit/dd12331))
- minor improvement for task keyboard navigation ([06977f9](https://github.com/johannesjo/sp2/commit/06977f9))
- minor styling adjustment ([c4aa2d6](https://github.com/johannesjo/sp2/commit/c4aa2d6))
- minor styling improvements ([30fcad3](https://github.com/johannesjo/sp2/commit/30fcad3))
- more fine tuning for nav ([44c4056](https://github.com/johannesjo/sp2/commit/44c4056))
- move speed dial to top ([1374081](https://github.com/johannesjo/sp2/commit/1374081))
- **notes:** add keyboard shortcut ([d944fd9](https://github.com/johannesjo/sp2/commit/d944fd9))
- move speed dial to top ([847d16a](https://github.com/johannesjo/sp2/commit/847d16a))
- moving current task to backlog selects next task ([d633dcd](https://github.com/johannesjo/sp2/commit/d633dcd))
- notify when time estimate was exceeded ([478a2c8](https://github.com/johannesjo/sp2/commit/478a2c8))
- omit google tokens when importing data via google drive sync ([97f5e9c](https://github.com/johannesjo/sp2/commit/97f5e9c))
- only show take a break if enabled ([20f49c6](https://github.com/johannesjo/sp2/commit/20f49c6))
- open and close backlog via click ([eaf41e3](https://github.com/johannesjo/sp2/commit/eaf41e3))
- outline app structure ([2b99e83](https://github.com/johannesjo/sp2/commit/2b99e83))
- outline app structure2 ([d4bce6b](https://github.com/johannesjo/sp2/commit/d4bce6b))
- package material icons with app ([4d18e2f](https://github.com/johannesjo/sp2/commit/4d18e2f))
- persist settings for simple summary ([2ab1888](https://github.com/johannesjo/sp2/commit/2ab1888))
- persist zoom level for electron ([f3eeb12](https://github.com/johannesjo/sp2/commit/f3eeb12))
- port edit on click ([c3cf848](https://github.com/johannesjo/sp2/commit/c3cf848))
- **bookmarks:** add basic edit / ad dialog ([ac56ed6](https://github.com/johannesjo/sp2/commit/ac56ed6))
- **bookmarks:** add basic styling for bookmark bar ([447ceee](https://github.com/johannesjo/sp2/commit/447ceee))
- **bookmarks:** add boilerplate files ([c938333](https://github.com/johannesjo/sp2/commit/c938333))
- **bookmarks:** add external link directive ([7ff05b0](https://github.com/johannesjo/sp2/commit/7ff05b0))
- **bookmarks:** add facade store stuff ([2e813ab](https://github.com/johannesjo/sp2/commit/2e813ab))
- **bookmarks:** add icon to edit dialog ([1b1e427](https://github.com/johannesjo/sp2/commit/1b1e427))
- **bookmarks:** add image links ([f23065b](https://github.com/johannesjo/sp2/commit/f23065b))
- **bookmarks:** add layout methods for bookmarks ([f716fe3](https://github.com/johannesjo/sp2/commit/f716fe3))
- **bookmarks:** add nice drag over ui element ([8763170](https://github.com/johannesjo/sp2/commit/8763170))
- **bookmarks:** add persistence to bookmarks ([7102efa](https://github.com/johannesjo/sp2/commit/7102efa))
- **bookmarks:** add possibility to run bookmark command ([21532c8](https://github.com/johannesjo/sp2/commit/21532c8))
- **bookmarks:** add show/hide for bookmark bar ([6a95116](https://github.com/johannesjo/sp2/commit/6a95116))
- **bookmarks:** add store stuff for layout model ([aed3b91](https://github.com/johannesjo/sp2/commit/aed3b91))
- **bookmarks:** adjust sub header style ([544f5c6](https://github.com/johannesjo/sp2/commit/544f5c6))
- **bookmarks:** also blur element ([3627968](https://github.com/johannesjo/sp2/commit/3627968))
- **bookmarks:** animate bar ([52d7bab](https://github.com/johannesjo/sp2/commit/52d7bab))
- **bookmarks:** beautify bookmark bar ([755f06f](https://github.com/johannesjo/sp2/commit/755f06f))
- **bookmarks:** implement drag & drop for links ([ac06b90](https://github.com/johannesjo/sp2/commit/ac06b90))
- **bookmarks:** make saving local task attachments work ([200f6a8](https://github.com/johannesjo/sp2/commit/200f6a8))
- **bookmarks:** make split component work with dynamic header height ([294efe5](https://github.com/johannesjo/sp2/commit/294efe5))
- **bookmarks:** prevent page reloads from drops ([0f759ce](https://github.com/johannesjo/sp2/commit/0f759ce))
- **config:** add basic keyboard config ([3af844a](https://github.com/johannesjo/sp2/commit/3af844a))
- **config:** add basic markup and components ([7161762](https://github.com/johannesjo/sp2/commit/7161762))
- **config:** add boilerplate ([2ee82c1](https://github.com/johannesjo/sp2/commit/2ee82c1))
- **config:** add collapsable component ([9720b44](https://github.com/johannesjo/sp2/commit/9720b44))
- **config:** add form config ([c03ca71](https://github.com/johannesjo/sp2/commit/c03ca71))
- **config:** add help section ([c05f14d](https://github.com/johannesjo/sp2/commit/c05f14d))
- **config:** add model ([adc7286](https://github.com/johannesjo/sp2/commit/adc7286))
- **config:** add more boilerplate ([5538b31](https://github.com/johannesjo/sp2/commit/5538b31))
- **config:** add ngx formly ([702828b](https://github.com/johannesjo/sp2/commit/702828b))
- **config:** add proper store ([d349568](https://github.com/johannesjo/sp2/commit/d349568))
- **config:** add update notification ([743f5cf](https://github.com/johannesjo/sp2/commit/743f5cf))
- **config:** always create a copy for config forms ([53df8e3](https://github.com/johannesjo/sp2/commit/53df8e3))
- **config:** improve help section ([4036d42](https://github.com/johannesjo/sp2/commit/4036d42))
- **config:** improve styling ([18a06b8](https://github.com/johannesjo/sp2/commit/18a06b8))
- **config:** make all keyboard shortcuts configurable ([1b0d82e](https://github.com/johannesjo/sp2/commit/1b0d82e))
- **config:** make basic config form work ([83a9429](https://github.com/johannesjo/sp2/commit/83a9429))
- **config:** make data for the config components work ([9bb5a45](https://github.com/johannesjo/sp2/commit/9bb5a45))
- **config:** make saving for config form work ([ba5fc07](https://github.com/johannesjo/sp2/commit/ba5fc07))
- **config:** make saving to ls work ([2a41bc6](https://github.com/johannesjo/sp2/commit/2a41bc6))
- **config:** only show update config notification for non private props ([3e37bd7](https://github.com/johannesjo/sp2/commit/3e37bd7))
- **electron:** add open dev tools ([0b0dec2](https://github.com/johannesjo/sp2/commit/0b0dec2))
- **electron:** don't open dev tools initially ([2a78fb1](https://github.com/johannesjo/sp2/commit/2a78fb1))
- **electron:** show electron errors ([9557acf](https://github.com/johannesjo/sp2/commit/9557acf))
- **enlargeImg:** add possibility to move zoomed in detail ([44f644b](https://github.com/johannesjo/sp2/commit/44f644b))
- **enlargeImg:** add some fine tuning ([86808d2](https://github.com/johannesjo/sp2/commit/86808d2))
- **enlargeImg:** improve animation and remove hide ([65a9eba](https://github.com/johannesjo/sp2/commit/65a9eba))
- **enlargeImg:** make most simple form of zooming work nicely ([990eaaa](https://github.com/johannesjo/sp2/commit/990eaaa))
- **enlargeImg:** prepare zoom ([f647463](https://github.com/johannesjo/sp2/commit/f647463))
- **extensionInterface:** improve extension interface ([47ec23f](https://github.com/johannesjo/sp2/commit/47ec23f))
- **git:** add basic issue template ([95ddee9](https://github.com/johannesjo/sp2/commit/95ddee9))
- **git:** add boilerplate ([27645b8](https://github.com/johannesjo/sp2/commit/27645b8))
- **git:** add caching for data ([07599cf](https://github.com/johannesjo/sp2/commit/07599cf))
- **git:** add code to get complete issue data for repository ([3453909](https://github.com/johannesjo/sp2/commit/3453909))
- **git:** add config dialog ([9fb2ed6](https://github.com/johannesjo/sp2/commit/9fb2ed6))
- **git:** add config for github integration ([9779500](https://github.com/johannesjo/sp2/commit/9779500))
- **git:** add error handling ([2ebf182](https://github.com/johannesjo/sp2/commit/2ebf182))
- **git:** add git issues to search and make add task bar more generic ([77ff285](https://github.com/johannesjo/sp2/commit/77ff285))
- **git:** add issue tab header and fix comments ([2ca1bf6](https://github.com/johannesjo/sp2/commit/2ca1bf6))
- **git:** add messages for auto import ([5017357](https://github.com/johannesjo/sp2/commit/5017357))
- **git:** add model and persistence for it ([438da92](https://github.com/johannesjo/sp2/commit/438da92))
- **git:** add polling updates ([3e2616e](https://github.com/johannesjo/sp2/commit/3e2616e))
- **git:** add pre check for api ([a0da47a](https://github.com/johannesjo/sp2/commit/a0da47a))
- **git:** add proper url ([63822c0](https://github.com/johannesjo/sp2/commit/63822c0))
- **git:** add saving issue configs from settings ([51f112d](https://github.com/johannesjo/sp2/commit/51f112d))
- **git:** add some basic api methods ([7108919](https://github.com/johannesjo/sp2/commit/7108919))
- **git:** add to migrate service ([f8a050e](https://github.com/johannesjo/sp2/commit/f8a050e))
- **git:** also abstract loading issue states and add properly load for git ([b36ceda](https://github.com/johannesjo/sp2/commit/b36ceda))
- **git:** also search issue body ([17e0d44](https://github.com/johannesjo/sp2/commit/17e0d44))
- **git:** auto import issues to backlog ([4f9daf1](https://github.com/johannesjo/sp2/commit/4f9daf1))
- **git:** better check ([980cc2c](https://github.com/johannesjo/sp2/commit/980cc2c))
- **git:** cleanup and and restore issues based on task actions ([74c6312](https://github.com/johannesjo/sp2/commit/74c6312))
- **git:** get more comments ([87365ec](https://github.com/johannesjo/sp2/commit/87365ec))
- **git:** implement issue icon as pipe ([b7126b3](https://github.com/johannesjo/sp2/commit/b7126b3))
- **git:** improve config ([2073c8b](https://github.com/johannesjo/sp2/commit/2073c8b))
- **git:** load comments for git issues ([4f056f2](https://github.com/johannesjo/sp2/commit/4f056f2))
- **git:** make polling updates work ([9671fa6](https://github.com/johannesjo/sp2/commit/9671fa6))
- **git:** make searching work again ([8886081](https://github.com/johannesjo/sp2/commit/8886081))
- **git:** prepare polling issues ([eb21a8c](https://github.com/johannesjo/sp2/commit/eb21a8c))
- **git:** refresh issue data on project change ([f1432c6](https://github.com/johannesjo/sp2/commit/f1432c6))
- **git:** use fresh git issue data when importing ([58ba253](https://github.com/johannesjo/sp2/commit/58ba253))
- **git:** use issue number as id, as the id is not practical for the api ([34c93a2](https://github.com/johannesjo/sp2/commit/34c93a2))
- **google:** improve login ([afed8ee](https://github.com/johannesjo/sp2/commit/afed8ee))
- **googleApi:** auto refresh token for web ([59ec4bf](https://github.com/johannesjo/sp2/commit/59ec4bf))
- **googleApi:** don't fire request when there is no token ([c9ec8a6](https://github.com/johannesjo/sp2/commit/c9ec8a6))
- **googleDriveSync:** add confirm drive sync load dialog ([3871aa8](https://github.com/johannesjo/sp2/commit/3871aa8))
- **googleDriveSync:** add confirm save dialog ([6c82f55](https://github.com/johannesjo/sp2/commit/6c82f55))
- **googleDriveSync:** add first outline of service ([96cd485](https://github.com/johannesjo/sp2/commit/96cd485))
- **googleDriveSync:** add interface for model ([1c1b042](https://github.com/johannesjo/sp2/commit/1c1b042))
- **googleDriveSync:** add outline for basic async toast ([3a070e5](https://github.com/johannesjo/sp2/commit/3a070e5))
- **googleDriveSync:** add promise btn ([2b9d702](https://github.com/johannesjo/sp2/commit/2b9d702))
- **googleDriveSync:** add simple confirms ([e27c75a](https://github.com/johannesjo/sp2/commit/e27c75a))
- **googleDriveSync:** don't ask again if other option was choosen ([aab12cf](https://github.com/johannesjo/sp2/commit/aab12cf))
- **googleDriveSync:** don't exec stuff when in progress ([7555352](https://github.com/johannesjo/sp2/commit/7555352))
- **googleDriveSync:** don't update last active in some instances and improve messaging ([7243254](https://github.com/johannesjo/sp2/commit/7243254))
- **googleDriveSync:** don't update when there are no changes ([c2c9afc](https://github.com/johannesjo/sp2/commit/c2c9afc))
- **googleDriveSync:** fix google sync config form ([7fda9ed](https://github.com/johannesjo/sp2/commit/7fda9ed))
- **googleDriveSync:** improve dialogs ([4ab0369](https://github.com/johannesjo/sp2/commit/4ab0369))
- **googleDriveSync:** improve sync config ([814686a](https://github.com/johannesjo/sp2/commit/814686a))
- **googleDriveSync:** improve sync config 2 ([ad0916d](https://github.com/johannesjo/sp2/commit/ad0916d))
- **googleDriveSync:** improve syncing process and checks ([3a2693e](https://github.com/johannesjo/sp2/commit/3a2693e))
- **googleDriveSync:** make config work inside config block ([3db2ad4](https://github.com/johannesjo/sp2/commit/3db2ad4))
- **googleDriveSync:** make it work ([b8400fe](https://github.com/johannesjo/sp2/commit/b8400fe))
- **googleDriveSync:** make loading backup work (apart from globalConfig) ([0906737](https://github.com/johannesjo/sp2/commit/0906737))
- **googleDriveSync:** make saving the backup work ([52b2cf2](https://github.com/johannesjo/sp2/commit/52b2cf2))
- **googleDriveSync:** only block other requests for a specified amount of time ([aeea4ec](https://github.com/johannesjo/sp2/commit/aeea4ec))
- **googleDriveSync:** save a local backup before importing data and fall back if something fails ([73f81d2](https://github.com/johannesjo/sp2/commit/73f81d2))
- **googleDriveSync:** save and get last active local ([c01c26e](https://github.com/johannesjo/sp2/commit/c01c26e))
- **googleIntegration:** add boilerplate ([94dac21](https://github.com/johannesjo/sp2/commit/94dac21))
- **googleIntegration:** add snacks for the process ([9cfa045](https://github.com/johannesjo/sp2/commit/9cfa045))
- **googleIntegration:** dirty port first version of google api service from sp1 ([04fd96a](https://github.com/johannesjo/sp2/commit/04fd96a))
- **googleIntegration:** make login work ([eff8177](https://github.com/johannesjo/sp2/commit/eff8177))
- **googleIntegration:** prepare google sync cfg ([dd28aff](https://github.com/johannesjo/sp2/commit/dd28aff))
- **googleTimeSheet:** add {startTime} and {taskTitles} ([5a4571a](https://github.com/johannesjo/sp2/commit/5a4571a))
- **history:** add boilerplate and nice header ([3044e0f](https://github.com/johannesjo/sp2/commit/3044e0f))
- **history:** make active tab work ([90e40ba](https://github.com/johannesjo/sp2/commit/90e40ba))
- **history:** make most basic worklog work ([d4c7994](https://github.com/johannesjo/sp2/commit/d4c7994))
- **history:** refine ([78318b6](https://github.com/johannesjo/sp2/commit/78318b6))
- **history:** refine2 ([8ff868d](https://github.com/johannesjo/sp2/commit/8ff868d))
- **inputDurationSlider:** add animation and fix mobile styling ([2806770](https://github.com/johannesjo/sp2/commit/2806770))
- **jira:** add a link to reply a comment ([b77b036](https://github.com/johannesjo/sp2/commit/b77b036))
- **jira:** add add action for task ith issue ([9eb7659](https://github.com/johannesjo/sp2/commit/9eb7659))
- **jira:** add all types and map data ([8699053](https://github.com/johannesjo/sp2/commit/8699053))
- **jira:** add basic dialog for transitioning issues ([813b28a](https://github.com/johannesjo/sp2/commit/813b28a))
- **jira:** add basic jira issue module ([9bd9bcb](https://github.com/johannesjo/sp2/commit/9bd9bcb))
- **jira:** add better search for jira ([2227e33](https://github.com/johannesjo/sp2/commit/2227e33))
- **jira:** add better search for jira ([45523c6](https://github.com/johannesjo/sp2/commit/45523c6))
- **jira:** add cfg stepper as its own modal ([58ceab8](https://github.com/johannesjo/sp2/commit/58ceab8))
- **jira:** add chrome extension interface ([0dade0c](https://github.com/johannesjo/sp2/commit/0dade0c))
- **jira:** add component based approach to show issue content and header ([57eb538](https://github.com/johannesjo/sp2/commit/57eb538))
- **jira:** add custom config form ([3e49c2a](https://github.com/johannesjo/sp2/commit/3e49c2a))
- **jira:** add effects for transition handling ([125a56e](https://github.com/johannesjo/sp2/commit/125a56e))
- **jira:** add error notifications and fix issue search ([4462445](https://github.com/johannesjo/sp2/commit/4462445))
- **jira:** add first final version of form ([02d190e](https://github.com/johannesjo/sp2/commit/02d190e))
- **jira:** add form config ([bbc493c](https://github.com/johannesjo/sp2/commit/bbc493c))
- **jira:** add help ([6bc7f63](https://github.com/johannesjo/sp2/commit/6bc7f63))
- **jira:** add helper observable checking for missing issues ([8523e5e](https://github.com/johannesjo/sp2/commit/8523e5e))
- **jira:** add issue selector for transition handling ([804fe64](https://github.com/johannesjo/sp2/commit/804fe64))
- **jira:** add jira data to task ([52b5eff](https://github.com/johannesjo/sp2/commit/52b5eff))
- **jira:** add jira for electron ([4fa9daf](https://github.com/johannesjo/sp2/commit/4fa9daf))
- **jira:** add loading spinner to add task bar ([1e86c95](https://github.com/johannesjo/sp2/commit/1e86c95))
- **jira:** add most basic issue info tab ([253b449](https://github.com/johannesjo/sp2/commit/253b449))
- **jira:** add notification when updating settings ([245cbbe](https://github.com/johannesjo/sp2/commit/245cbbe))
- **jira:** add persistence for jira issues ([90cf7c6](https://github.com/johannesjo/sp2/commit/90cf7c6))
- **jira:** add show updates and a way to hide them ([bf58512](https://github.com/johannesjo/sp2/commit/bf58512))
- **jira:** add snack to unblock again ([8b7c073](https://github.com/johannesjo/sp2/commit/8b7c073))
- **jira:** add test credentials to stepper ([f9b66d1](https://github.com/johannesjo/sp2/commit/f9b66d1))
- **jira:** add transforms to requests ([57b408e](https://github.com/johannesjo/sp2/commit/57b408e))
- **jira:** add transition issue ([f623756](https://github.com/johannesjo/sp2/commit/f623756))
- **jira:** adjust max time out ([a1e3eb1](https://github.com/johannesjo/sp2/commit/a1e3eb1))
- **jira:** adjust polling back to normal ([9959a79](https://github.com/johannesjo/sp2/commit/9959a79))
- **jira:** allow for specifying max results ([ad44c2f](https://github.com/johannesjo/sp2/commit/ad44c2f))
- **jira:** auto import issues ([606d756](https://github.com/johannesjo/sp2/commit/606d756))
- **jira:** beautify comments ([7a8e257](https://github.com/johannesjo/sp2/commit/7a8e257))
- **jira:** block requests after one failed ([ed55f32](https://github.com/johannesjo/sp2/commit/ed55f32))
- **jira:** check for minimal settings before firing a jira request ([738fb4a](https://github.com/johannesjo/sp2/commit/738fb4a))
- **jira:** cleanup issue data when task is deleted ([30fdf6e](https://github.com/johannesjo/sp2/commit/30fdf6e))
- **jira:** convert api usage from promise to observable ([7fa3213](https://github.com/johannesjo/sp2/commit/7fa3213))
- **jira:** further improve update issue ([7a63ad3](https://github.com/johannesjo/sp2/commit/7a63ad3))
- **jira:** get complete data when auto importing issues ([1ced867](https://github.com/johannesjo/sp2/commit/1ced867))
- **jira:** get list with jira issues for autocomplete ([e38af8d](https://github.com/johannesjo/sp2/commit/e38af8d))
- **jira:** improve login flow ([88f31f1](https://github.com/johannesjo/sp2/commit/88f31f1))
- **jira:** improve mobile experience for config stepper ([639cbfd](https://github.com/johannesjo/sp2/commit/639cbfd))
- **jira:** improve transition dialog ([9ec70eb](https://github.com/johannesjo/sp2/commit/9ec70eb))
- **jira:** improve update issue behaviour ([a27d1de](https://github.com/johannesjo/sp2/commit/a27d1de))
- **jira:** list changes ([ac4a897](https://github.com/johannesjo/sp2/commit/ac4a897))
- **jira:** load full issue data in second request to speed up search ([d449f46](https://github.com/johannesjo/sp2/commit/d449f46))
- **jira:** make auto transitions work ([92d24f7](https://github.com/johannesjo/sp2/commit/92d24f7))
- **jira:** make issue assignment work ([830a2c0](https://github.com/johannesjo/sp2/commit/830a2c0))
- **jira:** make issue assignment work ([a957d6a](https://github.com/johannesjo/sp2/commit/a957d6a))
- **jira:** make it work with electron ([5cf4954](https://github.com/johannesjo/sp2/commit/5cf4954))
- **jira:** make it work with jira api and chrome extension ([4482667](https://github.com/johannesjo/sp2/commit/4482667))
- **jira:** make saving of jira config work ([f6c72c7](https://github.com/johannesjo/sp2/commit/f6c72c7))
- **jira:** make transitioning work nicely by updating local issue data afterwards ([eccb2db](https://github.com/johannesjo/sp2/commit/eccb2db))
- **jira:** make transitions configurable ([c214d9d](https://github.com/johannesjo/sp2/commit/c214d9d))
- **jira:** minor styling adjustment ([6112e03](https://github.com/johannesjo/sp2/commit/6112e03))
- **jira:** only poll issues if setting is enabled ([a5ec40d](https://github.com/johannesjo/sp2/commit/a5ec40d))
- **jira:** outline config ui ([2aa3ff9](https://github.com/johannesjo/sp2/commit/2aa3ff9))
- **jira:** outline interfaces and constants ([7af4d4c](https://github.com/johannesjo/sp2/commit/7af4d4c))
- **jira:** poll issues for updates ([7623071](https://github.com/johannesjo/sp2/commit/7623071))
- **jira:** prepare issue module ([21b6a03](https://github.com/johannesjo/sp2/commit/21b6a03))
- **jira:** reject timed out promises ([b0286bd](https://github.com/johannesjo/sp2/commit/b0286bd))
- **jira:** remove open state and prepare for model changes ([c9311c3](https://github.com/johannesjo/sp2/commit/c9311c3))
- **jira:** save issue together with task ([a350e93](https://github.com/johannesjo/sp2/commit/a350e93))
- **jira:** show attachments directly ([78dcde9](https://github.com/johannesjo/sp2/commit/78dcde9))
- **jira:** show basic attachments ([46e2c1e](https://github.com/johannesjo/sp2/commit/46e2c1e))
- **jira:** show notification when issue was updated ([31af432](https://github.com/johannesjo/sp2/commit/31af432))
- **jira:** update model ([2c9c79a](https://github.com/johannesjo/sp2/commit/2c9c79a))
- **jira:** use constants for several things ([91388df](https://github.com/johannesjo/sp2/commit/91388df))
- **mainHeader:** add elevation to main toolbar ([f4164d5](https://github.com/johannesjo/sp2/commit/f4164d5))
- **mainHeader:** add most basic navigation ([3627538](https://github.com/johannesjo/sp2/commit/3627538))
- **mainHeader:** add sp icon ([15408c4](https://github.com/johannesjo/sp2/commit/15408c4))
- **mainHeader:** improve project switcher ([5478ed6](https://github.com/johannesjo/sp2/commit/5478ed6))
- **migrate:** make migration work for single project instances and improve confirm ([fb560ad](https://github.com/johannesjo/sp2/commit/fb560ad))
- **migrateV1:** add additional data and fix data not showing up ([e4252ad](https://github.com/johannesjo/sp2/commit/e4252ad))
- **migrateV1:** add basic data for issues ([36b02c6](https://github.com/johannesjo/sp2/commit/36b02c6))
- **migrateV1:** add basic migration models and constants ([dafc13a](https://github.com/johannesjo/sp2/commit/dafc13a))
- **migrateV1:** add most basic migration script ([afdc0a9](https://github.com/johannesjo/sp2/commit/afdc0a9))
- **migrateV1:** allow for worklog items to be reverted to todays task ([9da671e](https://github.com/johannesjo/sp2/commit/9da671e))
- **migrateV1:** also migrate what little old issue data we have ([06938dd](https://github.com/johannesjo/sp2/commit/06938dd))
- **migrateV1:** you only migrate once TM ([63a01e5](https://github.com/johannesjo/sp2/commit/63a01e5))
- **note:** adjust snacks ([a3074a8](https://github.com/johannesjo/sp2/commit/a3074a8))
- **note:** adjust style for modals ([e1dcd3f](https://github.com/johannesjo/sp2/commit/e1dcd3f))
- **note:** fix mobile style for add dialog ([d67e343](https://github.com/johannesjo/sp2/commit/d67e343))
- **notes:** add animation ([46d2925](https://github.com/johannesjo/sp2/commit/46d2925))
- **notes:** add back focus styles ([8628c8d](https://github.com/johannesjo/sp2/commit/8628c8d))
- **notes:** add badge for number of notes ([991e7c1](https://github.com/johannesjo/sp2/commit/991e7c1))
- **notes:** add boilerplate code ([5d77b9a](https://github.com/johannesjo/sp2/commit/5d77b9a))
- **notes:** add drag & drop ordering ([18910bc](https://github.com/johannesjo/sp2/commit/18910bc))
- **notes:** add drawer to display notes in ([7fcef48](https://github.com/johannesjo/sp2/commit/7fcef48))
- **notes:** add focus styles ([9ef9696](https://github.com/johannesjo/sp2/commit/9ef9696))
- **notes:** add most basic notes ([115f0ee](https://github.com/johannesjo/sp2/commit/115f0ee))
- **notes:** add most simple add note dialog ([8c5e307](https://github.com/johannesjo/sp2/commit/8c5e307))
- **notes:** add most simple ui version ([f3ace08](https://github.com/johannesjo/sp2/commit/f3ace08))
- **notes:** add note state and layout state to persistence ([d1347b4](https://github.com/johannesjo/sp2/commit/d1347b4))
- **notes:** add persistence ([648038e](https://github.com/johannesjo/sp2/commit/648038e))
- **notes:** add shortcut config for new add note dialog ([7d20a0f](https://github.com/johannesjo/sp2/commit/7d20a0f))
- **notes:** add submit via ctrl+enter ([7b66dd0](https://github.com/johannesjo/sp2/commit/7b66dd0))
- **notes:** add to top rather than bottom of list ([5705575](https://github.com/johannesjo/sp2/commit/5705575))
- **notes:** also persist show hide ([ab5d1a8](https://github.com/johannesjo/sp2/commit/ab5d1a8))
- **notes:** connect backdrop click to store action ([55eda9f](https://github.com/johannesjo/sp2/commit/55eda9f))
- **notes:** fix focus behavior for notes ([b03f79b](https://github.com/johannesjo/sp2/commit/b03f79b))
- **notes:** focus added note ([aab8d7a](https://github.com/johannesjo/sp2/commit/aab8d7a))
- **notes:** focus button when panel is opened ([1baedee](https://github.com/johannesjo/sp2/commit/1baedee))
- **notes:** improve styling ([5b64abf](https://github.com/johannesjo/sp2/commit/5b64abf))
- **notes:** improve styling ([c604487](https://github.com/johannesjo/sp2/commit/c604487))
- **notes:** improve styling a bit ([d7416dc](https://github.com/johannesjo/sp2/commit/d7416dc))
- **notes:** improve styling further ([d52c559](https://github.com/johannesjo/sp2/commit/d52c559))
- **notes:** limit drag and drop to button ([c2fc305](https://github.com/johannesjo/sp2/commit/c2fc305))
- **notes:** make markdown parsing optional ([49f997d](https://github.com/johannesjo/sp2/commit/49f997d))
- **notes:** minor ui improvements ([0a44398](https://github.com/johannesjo/sp2/commit/0a44398))
- **notes:** prevent double submits ([8c445fb](https://github.com/johannesjo/sp2/commit/8c445fb))
- **notes:** remove ms for initial date value ([1935321](https://github.com/johannesjo/sp2/commit/1935321))
- **notes:** replace direct edit with modal ([9e7392f](https://github.com/johannesjo/sp2/commit/9e7392f))
- **notes:** save note to session storage ([4a49db6](https://github.com/johannesjo/sp2/commit/4a49db6))
- **notes:** style notes and add delete functionality ([ba8f8e2](https://github.com/johannesjo/sp2/commit/ba8f8e2))
- **notes:** styling adjustment ([b9f5146](https://github.com/johannesjo/sp2/commit/b9f5146))
- **notes:** styling adjustments ([ba06eeb](https://github.com/johannesjo/sp2/commit/ba06eeb))
- **notes:** update styling ([113d255](https://github.com/johannesjo/sp2/commit/113d255))
- **project:** add dialog for project creation ([9de7157](https://github.com/johannesjo/sp2/commit/9de7157))
- **project:** add notifications when deleting or creating projects ([28db914](https://github.com/johannesjo/sp2/commit/28db914))
- **project:** add project page boilerplate ([210f4b1](https://github.com/johannesjo/sp2/commit/210f4b1))
- **project:** add project switcher ([347c6bd](https://github.com/johannesjo/sp2/commit/347c6bd))
- **project:** add store stuff fore projects ([ecec2d1](https://github.com/johannesjo/sp2/commit/ecec2d1))
- **project:** beautify project page ([b4fa5b7](https://github.com/johannesjo/sp2/commit/b4fa5b7))
- **project:** improve saving dialog ([72e1a92](https://github.com/johannesjo/sp2/commit/72e1a92))
- **project:** make deleting of projects work ([95f8641](https://github.com/johannesjo/sp2/commit/95f8641))
- **project:** make editing of projects work ([72078ae](https://github.com/johannesjo/sp2/commit/72078ae))
- **project:** make loading and saving tasks work ([2415545](https://github.com/johannesjo/sp2/commit/2415545))
- **project:** make project switcher work for new projects ([dd9342b](https://github.com/johannesjo/sp2/commit/dd9342b))
- **project:** make saving and loading projects work ([e520761](https://github.com/johannesjo/sp2/commit/e520761))
- **project:** make task form work ([21713f1](https://github.com/johannesjo/sp2/commit/21713f1))
- **project:** persist google time sheet settings ([5c09b7e](https://github.com/johannesjo/sp2/commit/5c09b7e))
- **pwa:** add google fonts to cached assets ([e6687cb](https://github.com/johannesjo/sp2/commit/e6687cb))
- **reminder:** add better reminder icons ([3eb58be](https://github.com/johannesjo/sp2/commit/3eb58be))
- **reminders:** add basic service to communicate with worker ([c2e347f](https://github.com/johannesjo/sp2/commit/c2e347f))
- **reminders:** add boilerplate for add reminder dialog ([835be4c](https://github.com/johannesjo/sp2/commit/835be4c))
- **reminders:** add boilerplate for view note reminder dialog ([de682e0](https://github.com/johannesjo/sp2/commit/de682e0))
- **reminders:** add buttons and functionality for reminder view ([0da1840](https://github.com/johannesjo/sp2/commit/0da1840))
- **reminders:** add logic for showing a limited number of messages for period ([a1bf882](https://github.com/johannesjo/sp2/commit/a1bf882))
- **reminders:** add most basic worker logic for reminding ([c0c50f6](https://github.com/johannesjo/sp2/commit/c0c50f6))
- **reminders:** add most simple add reminder dialog ([56cab04](https://github.com/johannesjo/sp2/commit/56cab04))
- **reminders:** add persistence ([44a2b00](https://github.com/johannesjo/sp2/commit/44a2b00))
- **reminders:** add update method ([73297f9](https://github.com/johannesjo/sp2/commit/73297f9))
- **reminders:** also delete reminders when note was deleted ([b3acd93](https://github.com/johannesjo/sp2/commit/b3acd93))
- **reminders:** also focus electron window on reminder ([10fb83e](https://github.com/johannesjo/sp2/commit/10fb83e))
- **reminders:** display note inside reminder dialog ([a3e4360](https://github.com/johannesjo/sp2/commit/a3e4360))
- **reminders:** don't show future reminders ([6438e7f](https://github.com/johannesjo/sp2/commit/6438e7f))
- **reminders:** fix some quirks ([75d8703](https://github.com/johannesjo/sp2/commit/75d8703))
- **reminders:** improve worker logic ([4fe4375](https://github.com/johannesjo/sp2/commit/4fe4375))
- **reminders:** only show single dialog for note reminders ([7bef966](https://github.com/johannesjo/sp2/commit/7bef966))
- **reminders:** plan out model ([975980e](https://github.com/johannesjo/sp2/commit/975980e))
- **reminders:** refactor stuff to service ([fc90fa4](https://github.com/johannesjo/sp2/commit/fc90fa4))
- **reminders:** remove directly from note context menu ([069a5ed](https://github.com/johannesjo/sp2/commit/069a5ed))
- **reminders:** set restore focus for all dialogs ([52f761e](https://github.com/johannesjo/sp2/commit/52f761e))
- **reminders:** show indication when a note has a reminder ([c3a0330](https://github.com/johannesjo/sp2/commit/c3a0330))
- **snack:** add custom icon support ([53ee30c](https://github.com/johannesjo/sp2/commit/53ee30c))
- **snack:** add most basic snack ([57f4c69](https://github.com/johannesjo/sp2/commit/57f4c69))
- **snack:** improve on snacks ([721d142](https://github.com/johannesjo/sp2/commit/721d142))
- **speedDial:** add speed dial to access settings page ([12c25ec](https://github.com/johannesjo/sp2/commit/12c25ec))
- **sync:** improve error ([6751433](https://github.com/johannesjo/sp2/commit/6751433))
- **sync:** not including all data ([f951e69](https://github.com/johannesjo/sp2/commit/f951e69))
- **task:** add created field to task ([0e2e15f](https://github.com/johannesjo/sp2/commit/0e2e15f))
- **task:** improve mobile styling but only using a single line and moving buttons into the menu ([70a018a](https://github.com/johannesjo/sp2/commit/70a018a))
- **task:** properly update parentId when moving sub task ([6947f19](https://github.com/johannesjo/sp2/commit/6947f19))
- **task:** properly update time estimate on parent if moving sub task ([f608178](https://github.com/johannesjo/sp2/commit/f608178))
- **task:** remove drag handle size for mobile ([6871ce5](https://github.com/johannesjo/sp2/commit/6871ce5))
- **taskAttachments:** add cool image zoom ([e932e94](https://github.com/johannesjo/sp2/commit/e932e94))
- **taskAttachments:** add cool image zoom also for bookmarks ([17875ca](https://github.com/johannesjo/sp2/commit/17875ca))
- **taskAttachments:** add model and store ([1f0c996](https://github.com/johannesjo/sp2/commit/1f0c996))
- **taskAttachments:** improve loading attachment data ([be04065](https://github.com/johannesjo/sp2/commit/be04065))
- **taskAttachments:** make saving and loading attachments work ([bd396d9](https://github.com/johannesjo/sp2/commit/bd396d9))
- **taskAttachments:** prepare list and item loading ([69e040f](https://github.com/johannesjo/sp2/commit/69e040f))
- **taskAttachments:** show attachments in a cool way ([1d7ade0](https://github.com/johannesjo/sp2/commit/1d7ade0))
- **tasks:** add animations for adding and removing tasks ([4574d93](https://github.com/johannesjo/sp2/commit/4574d93))
- **tasks:** add backlog and todays tasks for moving task ([9d5de6e](https://github.com/johannesjo/sp2/commit/9d5de6e))
- **tasks:** add basic keyboard interface for tasks ([31d05dc](https://github.com/johannesjo/sp2/commit/31d05dc))
- **tasks:** add basic planning mode ([deb67e1](https://github.com/johannesjo/sp2/commit/deb67e1))
- **tasks:** add boilerplate for move up and down ([dc860f5](https://github.com/johannesjo/sp2/commit/dc860f5))
- **tasks:** add border ([d8d50df](https://github.com/johannesjo/sp2/commit/d8d50df))
- **tasks:** add border to notes panel ([83d888c](https://github.com/johannesjo/sp2/commit/83d888c))
- **tasks:** add daily planner and backlog tasks ([74becfd](https://github.com/johannesjo/sp2/commit/74becfd))
- **tasks:** add debug data to additional info ([dca7667](https://github.com/johannesjo/sp2/commit/dca7667))
- **tasks:** add dynamic templates for issue tab ([49af450](https://github.com/johannesjo/sp2/commit/49af450))
- **tasks:** add keyboard shortcut for switching between adding to backlog and to todays list for add task bar ([cd4d72a](https://github.com/johannesjo/sp2/commit/cd4d72a))
- **tasks:** add little animation for when a task switches a list ([f53f871](https://github.com/johannesjo/sp2/commit/f53f871))
- **tasks:** add model and action for focusTaskId ([2d78b12](https://github.com/johannesjo/sp2/commit/2d78b12))
- **tasks:** add move up and down for sub tasks ([7747964](https://github.com/johannesjo/sp2/commit/7747964))
- **tasks:** add new layout for additional task infos ([8bb6add](https://github.com/johannesjo/sp2/commit/8bb6add))
- **tasks:** add nice little done animation ([4f9d3d0](https://github.com/johannesjo/sp2/commit/4f9d3d0))
- **tasks:** add nicer drag handle icon ([acae326](https://github.com/johannesjo/sp2/commit/acae326))
- **tasks:** add no wrap to time ([e9e49a4](https://github.com/johannesjo/sp2/commit/e9e49a4))
- **tasks:** add progress bar and theme helpers ([0d30699](https://github.com/johannesjo/sp2/commit/0d30699))
- **tasks:** add several task keyboard shortcuts ([30d5ce7](https://github.com/johannesjo/sp2/commit/30d5ce7))
- **tasks:** add shortcut for focussing task ([bcd94d9](https://github.com/johannesjo/sp2/commit/bcd94d9))
- **tasks:** add shortcut for moving from and to backlog ([ada61f1](https://github.com/johannesjo/sp2/commit/ada61f1))
- **tasks:** add shortcut to focus last active task ([7ea6ec3](https://github.com/johannesjo/sp2/commit/7ea6ec3))
- **tasks:** add some debugging info ([8f5c64d](https://github.com/johannesjo/sp2/commit/8f5c64d))
- **tasks:** add task selection component ([340f6e3](https://github.com/johannesjo/sp2/commit/340f6e3))
- **tasks:** add tt uppercase to first letter of title ([e3cd901](https://github.com/johannesjo/sp2/commit/e3cd901))
- **tasks:** add undo deletion ([b89ef8a](https://github.com/johannesjo/sp2/commit/b89ef8a))
- **tasks:** add update issue button and connect for git ([6008ad0](https://github.com/johannesjo/sp2/commit/6008ad0))
- **tasks:** add upsert jira issue ([8d9c18c](https://github.com/johannesjo/sp2/commit/8d9c18c))
- **tasks:** adjust icon color ([408e0ae](https://github.com/johannesjo/sp2/commit/408e0ae))
- **tasks:** adjust styling for time ([24b7c6d](https://github.com/johannesjo/sp2/commit/24b7c6d))
- **tasks:** adjust styling for time values ([2981129](https://github.com/johannesjo/sp2/commit/2981129))
- **tasks:** allow for adding sub tasks via shortcut when focus is on a sub task ([8838158](https://github.com/johannesjo/sp2/commit/8838158))
- **tasks:** allow for time spent via short syntax ([31d8d45](https://github.com/johannesjo/sp2/commit/31d8d45))
- **tasks:** allow switching between adding to backlog and to todays list for add task bar ([2e03771](https://github.com/johannesjo/sp2/commit/2e03771))
- **tasks:** also allow adding tasks while searching ([dd196b5](https://github.com/johannesjo/sp2/commit/dd196b5))
- **tasks:** beautify collapsible sub tasks button and add keyboard navigation for the feature ([295fcfb](https://github.com/johannesjo/sp2/commit/295fcfb))
- **tasks:** beautify done tasks ([157a641](https://github.com/johannesjo/sp2/commit/157a641))
- **tasks:** beautify for mobile just a bit ([d12798a](https://github.com/johannesjo/sp2/commit/d12798a))
- **tasks:** change keyboard navigation selected style ([f793bdc](https://github.com/johannesjo/sp2/commit/f793bdc))
- **tasks:** change play icon ([4b9e264](https://github.com/johannesjo/sp2/commit/4b9e264))
- **tasks:** connect ui only model ([35bfe7f](https://github.com/johannesjo/sp2/commit/35bfe7f))
- **tasks:** connect update issue button for jira ([1a99f62](https://github.com/johannesjo/sp2/commit/1a99f62))
- **tasks:** copy over parent task time stuff when first sub task is created ([a305791](https://github.com/johannesjo/sp2/commit/a305791))
- **tasks:** copy over time stuff from sub task, if last sub task was deleted ([dad898e](https://github.com/johannesjo/sp2/commit/dad898e))
- **tasks:** deal with toggle start via effect ([76ff078](https://github.com/johannesjo/sp2/commit/76ff078))
- **tasks:** distinguish task additional info by using a larger border radius ([8b8a456](https://github.com/johannesjo/sp2/commit/8b8a456))
- **tasks:** don't update timeSpent if none given for short syntax ([5a6f2a1](https://github.com/johannesjo/sp2/commit/5a6f2a1))
- **tasks:** fine tune styling ([6bae7d7](https://github.com/johannesjo/sp2/commit/6bae7d7))
- **tasks:** fix add task bar for non jira tasks ([6d7527c](https://github.com/johannesjo/sp2/commit/6d7527c))
- **tasks:** fix minor is done issue for task when dragging ([3b69fd3](https://github.com/johannesjo/sp2/commit/3b69fd3))
- **tasks:** fix minor issue and make tasks focusable ([fe35c60](https://github.com/johannesjo/sp2/commit/fe35c60))
- **tasks:** focus sub task on creation ([a5fefa4](https://github.com/johannesjo/sp2/commit/a5fefa4))
- **tasks:** get working today quicker ([ed6a274](https://github.com/johannesjo/sp2/commit/ed6a274))
- **tasks:** handle next task selection completely via effects ([aca8d89](https://github.com/johannesjo/sp2/commit/aca8d89))
- **tasks:** improve animation skip ([4c970f4](https://github.com/johannesjo/sp2/commit/4c970f4))
- **tasks:** improve button animations ([b63d9b3](https://github.com/johannesjo/sp2/commit/b63d9b3))
- **tasks:** improve daily planner view by adding tasks to the bottom of the list ([e2aa817](https://github.com/johannesjo/sp2/commit/e2aa817))
- **tasks:** improve drag handle ([63c3970](https://github.com/johannesjo/sp2/commit/63c3970))
- **tasks:** improve estimate remaining ([6ff3fb2](https://github.com/johannesjo/sp2/commit/6ff3fb2))
- **tasks:** improve focus behavior and add for work view ([0b6a5a7](https://github.com/johannesjo/sp2/commit/0b6a5a7))
- **tasks:** improve keyboard nav ([173c9b1](https://github.com/johannesjo/sp2/commit/173c9b1))
- **tasks:** improve start task behavior ([717590b](https://github.com/johannesjo/sp2/commit/717590b))
- **tasks:** improve styling for current ([6c11950](https://github.com/johannesjo/sp2/commit/6c11950))
- **tasks:** improve task list structure ([116ce5d](https://github.com/johannesjo/sp2/commit/116ce5d))
- **tasks:** improve task notes ([7a0d971](https://github.com/johannesjo/sp2/commit/7a0d971))
- **tasks:** improve time estimates readability ([3a37829](https://github.com/johannesjo/sp2/commit/3a37829))
- **tasks:** improve ui by only showing progress bar only for current task ([99297c1](https://github.com/johannesjo/sp2/commit/99297c1))
- **tasks:** make everything a selector ([505c93b](https://github.com/johannesjo/sp2/commit/505c93b))
- **tasks:** make focus work properly ([060b398](https://github.com/johannesjo/sp2/commit/060b398))
- **tasks:** make issue work with dynamic data ([32e5a4d](https://github.com/johannesjo/sp2/commit/32e5a4d))
- **tasks:** make play less prominent ([7aeebc2](https://github.com/johannesjo/sp2/commit/7aeebc2))
- **tasks:** make progress bar visible for current ([01abc5e](https://github.com/johannesjo/sp2/commit/01abc5e))
- **tasks:** make sub tasks expandable ([6162e68](https://github.com/johannesjo/sp2/commit/6162e68))
- **tasks:** make task data more robust ([9d7ac3e](https://github.com/johannesjo/sp2/commit/9d7ac3e))
- **tasks:** make time values less prominent ([3c57fe7](https://github.com/johannesjo/sp2/commit/3c57fe7))
- **tasks:** make time values less prominent2 ([268fe6e](https://github.com/johannesjo/sp2/commit/268fe6e))
- **tasks:** merge AddTask and AddTaskWithIssue into one aciton ([c992bd2](https://github.com/johannesjo/sp2/commit/c992bd2))
- **tasks:** minor styling adjustment ([c25def5](https://github.com/johannesjo/sp2/commit/c25def5))
- **tasks:** minor styling adjustments ([1b57ccb](https://github.com/johannesjo/sp2/commit/1b57ccb))
- **tasks:** minor styling adjustments ([308bb9c](https://github.com/johannesjo/sp2/commit/308bb9c))
- **tasks:** move all selection logic to selectors ([16dca90](https://github.com/johannesjo/sp2/commit/16dca90))
- **tasks:** next task selection via effect for move to backlog ([5f4c1b6](https://github.com/johannesjo/sp2/commit/5f4c1b6))
- **tasks:** next task selection via effect for update task ([5798a4e](https://github.com/johannesjo/sp2/commit/5798a4e))
- **tasks:** persist current tab index for task ([39e0052](https://github.com/johannesjo/sp2/commit/39e0052))
- **tasks:** persist showNotes ([620ff15](https://github.com/johannesjo/sp2/commit/620ff15))
- **tasks:** prepare ui only model ([c85ffef](https://github.com/johannesjo/sp2/commit/c85ffef))
- **tasks:** refactor dispatch ([c939adc](https://github.com/johannesjo/sp2/commit/c939adc))
- **tasks:** refocus last active task after add task bar is hidden ([3208e89](https://github.com/johannesjo/sp2/commit/3208e89))
- **tasks:** restyle outline ([5f32636](https://github.com/johannesjo/sp2/commit/5f32636))
- **tasks:** save data when restoring tasks from archive ([a8895e4](https://github.com/johannesjo/sp2/commit/a8895e4))
- **tasks:** set focus to next task if task was marked as done ([d6ee22e](https://github.com/johannesjo/sp2/commit/d6ee22e))
- **tasks:** set task to undone if started ([33272f6](https://github.com/johannesjo/sp2/commit/33272f6))
- **tasks:** style add task bar and add it globally ([3f94d04](https://github.com/johannesjo/sp2/commit/3f94d04))
- **tasks:** test other syntax ([09ccd76](https://github.com/johannesjo/sp2/commit/09ccd76))
- **tasks:** update deletion ([3f18f1f](https://github.com/johannesjo/sp2/commit/3f18f1f))
- **tasks:** update parent time estimate when child is updated ([522563e](https://github.com/johannesjo/sp2/commit/522563e))
- **tasks:** use play_arrow again ([ef3eeba](https://github.com/johannesjo/sp2/commit/ef3eeba))
- **tasks:** use primary rather than accent color for current task ([89f0093](https://github.com/johannesjo/sp2/commit/89f0093))
- **tasks:** zoom in on current task and style inline edit ([cdeafba](https://github.com/johannesjo/sp2/commit/cdeafba))
- **theming:** add theme switching ([e1761e5](https://github.com/johannesjo/sp2/commit/e1761e5))
- **timeSheetExport:** add most simple dialog ([3f31e35](https://github.com/johannesjo/sp2/commit/3f31e35))
- **timeSheetExport:** better handling for google auth ([8440152](https://github.com/johannesjo/sp2/commit/8440152))
- **timeSheetExport:** fix template ([c7ad410](https://github.com/johannesjo/sp2/commit/c7ad410))
- **timeSheetExport:** get rid of most of the errors ([7c96e05](https://github.com/johannesjo/sp2/commit/7c96e05))
- **timeSheetExport:** half way there ([bfc79e8](https://github.com/johannesjo/sp2/commit/bfc79e8))
- **timeSheetExport:** make everything work ([c17a7bb](https://github.com/johannesjo/sp2/commit/c17a7bb))
- **timeSheetExport:** update button dialog alignment ([0ecfefe](https://github.com/johannesjo/sp2/commit/0ecfefe))
- **timeTracking:** add boilerplate ([8dfd452](https://github.com/johannesjo/sp2/commit/8dfd452))
- **timeTracking:** add estimate remaining ([004eba3](https://github.com/johannesjo/sp2/commit/004eba3))
- **timeTracking:** add most basic time tracking ([5a3979c](https://github.com/johannesjo/sp2/commit/5a3979c))
- **timeTracking:** add ms to string pipe and use it for view ([ba59ed4](https://github.com/johannesjo/sp2/commit/ba59ed4))
- **timeTracking:** add working today ([5c3faa6](https://github.com/johannesjo/sp2/commit/5c3faa6))
- **timeTracking:** fix time input ([2cc8199](https://github.com/johannesjo/sp2/commit/2cc8199))
- **worklog:** allow for restoring task together with sub tasks from worklog ([fc22108](https://github.com/johannesjo/sp2/commit/fc22108))
- **worklog:** also display parent and prepare restoring parent including sub tasks ([aff7ca4](https://github.com/johannesjo/sp2/commit/aff7ca4))
- replace days with hours ([e3b623e](https://github.com/johannesjo/sp2/commit/e3b623e))
- **worklog:** remove restore button as long as it is not implemented ([0ef1596](https://github.com/johannesjo/sp2/commit/0ef1596))
- **worklog:** sort items ([ccd76b2](https://github.com/johannesjo/sp2/commit/ccd76b2))
- **worklog:** update sub task styling ([c4484c0](https://github.com/johannesjo/sp2/commit/c4484c0))
- **workView:** add header ([b81476c](https://github.com/johannesjo/sp2/commit/b81476c))
- **workView:** hide backlog until pulled out ([1dfb41a](https://github.com/johannesjo/sp2/commit/1dfb41a))
- **workView:** keep backlog tasks in memory for better performance ([cfc065c](https://github.com/johannesjo/sp2/commit/cfc065c))
- prepare app storage ([09ded37](https://github.com/johannesjo/sp2/commit/09ded37))
- prepare daily summary ([207b879](https://github.com/johannesjo/sp2/commit/207b879))
- prepare drag & drop ([18998e1](https://github.com/johannesjo/sp2/commit/18998e1))
- prepare global keyboard shortcuts module ([27bb737](https://github.com/johannesjo/sp2/commit/27bb737))
- prepare issue connection ([d658885](https://github.com/johannesjo/sp2/commit/d658885))
- prepare mapping of jira changelog ([1039071](https://github.com/johannesjo/sp2/commit/1039071))
- prepare meta reducer to better handle undo redo ([97d012c](https://github.com/johannesjo/sp2/commit/97d012c))
- prepare service worker stuff ([10d1973](https://github.com/johannesjo/sp2/commit/10d1973))
- prepare svg progress around play button ([5a7c08f](https://github.com/johannesjo/sp2/commit/5a7c08f))
- prevent errors when there is no issue data ([39add55](https://github.com/johannesjo/sp2/commit/39add55))
- print out storage info at beginning ([07d2e2a](https://github.com/johannesjo/sp2/commit/07d2e2a))
- raise debounce time for jira requests ([9a98df6](https://github.com/johannesjo/sp2/commit/9a98df6))
- redo idle time polls ([690f621](https://github.com/johannesjo/sp2/commit/690f621))
- redo main header navigation ([1d86701](https://github.com/johannesjo/sp2/commit/1d86701))
- refactor ipc events and add global shortcut for how hide ([50b91f0](https://github.com/johannesjo/sp2/commit/50b91f0))
- refine new split backlog ([0d0f657](https://github.com/johannesjo/sp2/commit/0d0f657))
- remove auto start task ([989f2ca](https://github.com/johannesjo/sp2/commit/989f2ca))
- remove dialogs as ngrx module ([20edb6d](https://github.com/johannesjo/sp2/commit/20edb6d))
- remove old cfg components and beautify config form ([5ff1e94](https://github.com/johannesjo/sp2/commit/5ff1e94))
- remove redundant add task button for work view header for desktop ([fd26426](https://github.com/johannesjo/sp2/commit/fd26426))
- remove speed dial menu ([c27b5f3](https://github.com/johannesjo/sp2/commit/c27b5f3))
- remove tracked idle time when idle ([7f75346](https://github.com/johannesjo/sp2/commit/7f75346))
- rename all ipc event constants and add notify module ([a055102](https://github.com/johannesjo/sp2/commit/a055102))
- restyle nav ([7ebbbb3](https://github.com/johannesjo/sp2/commit/7ebbbb3))
- restyle task ([ab6b67c](https://github.com/johannesjo/sp2/commit/ab6b67c))
- save complete tasks to archive to restore them later including issue models ([7c9a4fa](https://github.com/johannesjo/sp2/commit/7c9a4fa))
- save tmp project to session storage ([c3757d4](https://github.com/johannesjo/sp2/commit/c3757d4))
- set circle value from input ([fe53492](https://github.com/johannesjo/sp2/commit/fe53492))
- show errors for local storage quota ([ca59622](https://github.com/johannesjo/sp2/commit/ca59622))
- slightly adjust styling for main header ([7deee26](https://github.com/johannesjo/sp2/commit/7deee26))
- slightly improve page transitions ([d302ba5](https://github.com/johannesjo/sp2/commit/d302ba5))
- slightly improve router transition ([c5db76d](https://github.com/johannesjo/sp2/commit/c5db76d))
- slightly improve ui ([4ed796d](https://github.com/johannesjo/sp2/commit/4ed796d))
- some fine tuning for work view ([ce76659](https://github.com/johannesjo/sp2/commit/ce76659))
- start first task on ready for work ([564d8e8](https://github.com/johannesjo/sp2/commit/564d8e8))
- sync to google if enabled before closing app ([ef31e8b](https://github.com/johannesjo/sp2/commit/ef31e8b))
- unset current if it is marked as done ([3d988d1](https://github.com/johannesjo/sp2/commit/3d988d1))
- unset current on finish day ([11f202d](https://github.com/johannesjo/sp2/commit/11f202d))
- unset current task when loading task state ([5d0f4d1](https://github.com/johannesjo/sp2/commit/5d0f4d1))
- update assets and manifest settings ([c2a75c5](https://github.com/johannesjo/sp2/commit/c2a75c5))
- update default shortcuts ([bb654ae](https://github.com/johannesjo/sp2/commit/bb654ae))
- update keyboard shortcuts texts and config ([5ddd6e9](https://github.com/johannesjo/sp2/commit/5ddd6e9))
- update project list ([205b6ad](https://github.com/johannesjo/sp2/commit/205b6ad))
- update rxjs usage to latest version compatibility ([556cc2d](https://github.com/johannesjo/sp2/commit/556cc2d))
- update storage report ([9cd124c](https://github.com/johannesjo/sp2/commit/9cd124c))
- use button instead of checkbox for marking tasks as done ([54655f4](https://github.com/johannesjo/sp2/commit/54655f4))
- use session storage for tmp backup ([0e7103f](https://github.com/johannesjo/sp2/commit/0e7103f))
- use standard scrollbars for mobile ([7ac1a01](https://github.com/johannesjo/sp2/commit/7ac1a01))
