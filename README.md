# super-productivity-android

Android App for Super Productivity (https://super-productivity.com/).

I am not an Android developer, so help would be very welcome!!

## Building locally

For building this app locally you have two options for loading the web view:
1. Pointing to "https://app.super-productivity.com", Which is what the app currently does in production mode, Then you only can edit and see the changes you make on android app part.
2. Running [super productivity](https://github.com/johannesjo/super-productivity) app locally and point the web view to load that address, So you can see the changes you have made. To make the local web app accessible from inside the Android Studio emulator, run the web app using `ng serve --disable-host-check --host 0.0.0.0 --port 4200 --live-reload --watch` (note the `--host 0.0.0.0`, this is necessary otherwise the web app won't be reachable). Then, inside the Android app's code, simply point to `http://10.0.2.2:4200` (the URL should also work in the emulator's Chrome browser).

You can edit the url that the web view loads in "App.java" file [here](https://github.com/johannesjo/super-productivity-android/blob/master/app/src/main/java/com/superproductivity/superproductivity/App.java#L33-L36).