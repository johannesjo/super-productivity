# How to release a new version of the android app

1. Go to android studio
2. Update app/build.gradle versionCode and versionName and commit
3. Go to build/generate signed bundle apk
4. (sup.jks)
5. Choose playRelease
6. Locate files after build
7. Go to google play console: https://play.google.com/console/u/0/developers/?pli=1 and login.
8. Go to Release/Produktion and hit "Neuen Release erstellen"
9. Upload apk from $project/app/build/play/release/app-play-release.apk
10. Add release notes and hit "Release überprüfen"
