# superProductvity

This project was generated with [yo angular modular generator](https://github.com/johannesjo/generator-modular-angular)
version 1.2.4.

## Build & development

Run `gulp` for development, `gulp build` for building and `gulp buildCordova` for building the hybrid-app.

## Testing

Unit tests are automatically run with the default task. End-to-End tests are run via `gulp e2e`.

## The gulp tasks
As per default the following tasks are available at your convenience:

* `gulp`: The development task. Runs all the injectors on file-change, file-creation or file-deletion. Unit-tests are run in parallel, as well as the sass-compilation. 
* `gulp injectAll`: Runs all the injectors once.
* `gulp build`: Minifies your JavaScript via ng-annotate, your css, your images and your html files and copies everything to the www-folder.  
* `gulp test`: Runs your unit tests with the keep-alive option. 
* `gulp testSingle`: Runs your unit tests once. 
* `gulp e2e`: Runs your end to end tests once. 

The mobile tasks require a little preparation described in the next section.

* `gulp cordovaDev`: Symlinks your app-folder to www and runs the emulator for easy live development. 
* `gulp cordovaRun`: Symlinks your app-folder to www and runs it on your device if connected. 

Of course there are also all the [standard cordova commands](https://cordova.apache.org/docs/en/4.0.0/guide_cli_index.md.html) available as well. If you want to build a release run:
 ```
 gulp build
 cordova build android --release
 ```

For all cordova related commands there is an optional platform parameter you can use to specify the platform for the cordova task. E.g. `gulp cordovaDev --platform=android` to run the android emulator. Alternatively you can edit the config.js to change the default platform.

All tasks can be edited freely and can be found in the /tasks folder.
 
## Setting up the hybrid build
Compiling your app to a hybrid app requires a little bit of configuration and you need to have cordova installed. Fortunately [that is quite easy](http://cordova.apache.org/docs/en/4.0.0/guide_cli_index.md.html#The%20Command-Line%20Interface).

If everything is in place, you need to add the platforms you want to build your app on. For Android you would run:
```
cordova platform add android
```
If you get the message  `Current working directory is not a Cordova-based project` you need to create the www-folder first (e.g.: `mkdir www` from your projects root directory). 

After that you should build your current state via `gulp build` then you can run `gulp run` or `gulp emulate` to check out your app on your device or in the emulator.