// wallaby.conf.js
// for frontend

var angularTemplatePreprocessor = require('wallaby-ng-html2js-preprocessor');
module.exports = function() {
  return {
    files: [
      // bower:js
      'app/bower_components/angular/angular.js',
      'app/bower_components/angular-animate/angular-animate.js',
      'app/bower_components/angular-aria/angular-aria.js',
      'app/bower_components/angular-bootstrap/ui-bootstrap-tpls.js',
      'app/bower_components/angular-resource/angular-resource.js',
      'app/bower_components/respimage/respimage.min.js',
      'app/bower_components/angular-touch/angular-touch.js',
      'app/bower_components/lodash/lodash.js',
      'app/bower_components/fastclick/lib/fastclick.js',
      'app/bower_components/hammerjs/hammer.js',
      'app/bower_components/angular-inview/angular-inview.js',
      'app/bower_components/angular-gestures/dist/gestures.js',
      'app/bower_components/angular-messages/angular-messages.js',
      'app/bower_components/ng-fab-form/dist/ng-fab-form.js',
      'app/bower_components/Stickyfill/dist/stickyfill.js',
      'app/bower_components/waypoints/lib/noframework.waypoints.js',
      'app/bower_components/angular-mocks/angular-mocks.js',
      // endbower

      'app/scripts/**/*.html',
      // modules first
      'app/scripts/**/_*.js',
      'app/scripts/**/*.js',
      '!app/scripts/styleguide-only.js',
      {pattern: 'app/scripts/**/*spec.js', ignore: true}

    ],
    tests: [
      'app/scripts/**/*spec.js'
    ],
    preprocessors: {
      'app/scripts/**/*.html': function(file) {
        return angularTemplatePreprocessor.transform(file, {
          // strip this from the file path
          stripPrefix: 'app/',

          // setting this option will create only a single module that contains templates
          // from all the files, so you can load them all with module('foo')
          moduleName: 'templates'
        })
      }
    }
  }
};
