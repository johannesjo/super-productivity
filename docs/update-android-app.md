# How to release a new version of the android app

1. Go to android studio
2. Update app/build.gradle versionCode and versionName
   To trigger F-Droid:
   Add `changlogs/{version}.txt`
   git commit
   git tag
3. Go to build/generate signed bundle apk
4. (sup.jks)
5. Choose playRelease
6. Select APK
7. Select playRelease
8. Locate files after build
9. Go to google play console: https://play.google.com/console/u/0/developers/?pli=1 and login.
10. Go to Release/Produktion and hit "Neuen Release erstellen"
11. Upload apk from $project/app/play/release/release/app-play-release.apk
12. Add release notes and hit "Release überprüfen"
