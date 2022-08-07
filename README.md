# super-productivity-android

Android App for Super Productivity (https://super-productivity.com/).

I am not an Android developer, so help would be very welcome!!

## Building locally

For building this app locally you have two options for loading the web view:
1. Pointing to "https://app.super-productivity.com", Which is what the app currently does in production mode, Then you only can edit and see the changes you make on android app part.
2. Running [super productivity](https://github.com/johannesjo/super-productivity) app locally and point the web view to load that address, So you can see the changes you have made.

You can edit the url that the web view loads in "App.java" file [here](https://github.com/johannesjo/super-productivity-android/blob/master/app/src/main/java/com/superproductivity/superproductivity/App.java#L33-L36).