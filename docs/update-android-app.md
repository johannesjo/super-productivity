# How to release a new version of the android app

1. `npm version ...`
2. `npm run dist:android:prod`
3. Go to android studio
4. Go to build/generate signed bundle apk
5. (sup.jks)
6. Choose playRelease
7. Select APK
8. Select playRelease
9. Locate files after build
10. Go to google play console: https://play.google.com/console/u/0/developers/?pli=1 and login.
11. Go to Release/Produktion and hit "Neuen Release erstellen"
12. Upload apk from $project/app/play/release/release/app-play-release.apk
13. Add release notes and hit "Release überprüfen"

# OLD way

1. Go to android studio
2. Update app/build.gradle versionCode and versionName
   (To trigger F-Droid)
   Add `fastlane/metadata/android/<locale>/changelogs/<versionCode>.txt`
3. git commit
4. git tag (To trigger F-Droid), e.g.: `git tag -a "v21.0" -m"Release 21"`
5. Go to build/generate signed bundle apk
6. (sup.jks)
7. Choose playRelease
8. Select APK
9. Select playRelease
10. Locate files after build
11. Go to google play console: https://play.google.com/console/u/0/developers/?pli=1 and login.
12. Go to Release/Produktion and hit "Neuen Release erstellen"
13. Upload apk from $project/app/play/release/release/app-play-release.apk
14. Add release notes and hit "Release überprüfen"
