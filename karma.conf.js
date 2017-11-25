// Karma configuration
'use strict';

module.exports = function(config) {
  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    reportSlowerThan: 500,
    transports: ['polling'],
    browserDisconnectTolerance: 2,
    browserNoActivityTimeout: 50000,

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine', 'sinon'],

    // list of files / patterns to load in the browser
    files: [
      // bower:js
      'app-src/bower_components/angular/angular.js',
      'app-src/bower_components/angular-animate/angular-animate.js',
      'app-src/bower_components/angular-aria/angular-aria.js',
      'app-src/bower_components/angular-resource/angular-resource.js',
      'app-src/bower_components/angular-ui-router/release/angular-ui-router.js',
      'app-src/bower_components/angular-messages/angular-messages.js',
      'app-src/bower_components/angular-material/angular-material.js',
      'app-src/bower_components/angular-material-icons/angular-material-icons.min.js',
      'app-src/bower_components/lodash/lodash.js',
      'app-src/bower_components/moment/moment.js',
      'app-src/bower_components/angular-moment/angular-moment.js',
      'app-src/bower_components/ng-sortable/dist/ng-sortable.js',
      'app-src/bower_components/marked/lib/marked.js',
      'app-src/bower_components/angular-marked/dist/angular-marked.js',
      'app-src/bower_components/angular-bootstrap-calendar/dist/js/angular-bootstrap-calendar-tpls.js',
      'app-src/bower_components/hamsterjs/hamster.js',
      'app-src/bower_components/clipboard/dist/clipboard.js',
      'app-src/bower_components/moment-duration-format/lib/moment-duration-format.js',
      'app-src/bower_components/angular-mocks/angular-mocks.js',
      'app-src/bower_components/Watch.JS/src/watch.js',
      // endbower

      // modules first
      'app-src/scripts/**/_*.js',
      // all the rest of the files
      'app-src/scripts/**/*.js',
      // load html as well as required for karma-ng-html2js-preprocessor
      'app-src/scripts/**/*.html',

      // exclude unit tests here
      { pattern: 'app-src/scripts/**/*.spec.js', included: false }
    ],

    // list of files to exclude
    exclude: [],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    plugins: [
      'karma-jasmine',
      'karma-sinon',
      //'karma-coverage',
      'karma-phantomjs-launcher',
      'karma-ng-html2js-preprocessor',
      'karma-babel-preprocessor'
    ],

    preprocessors: {
      //'**/app-src/scripts/**/!(*spec).js': 'coverage',
      '**/app-src/scripts/**/*.js': ['babel'],
      '**/app-src/scripts/**/*.html': 'ng-html2js'
    },

    ngHtml2JsPreprocessor: {
      moduleName: 'templates',
      stripPrefix: 'app-src/'
    },

    babelPreprocessor: {
      options: {
        presets: ['latest'],
        sourceMap: 'inline'
      }
    },

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['PhantomJS'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true
  });
};
