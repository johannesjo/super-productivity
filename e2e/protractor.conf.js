// @ts-check
// Protractor configuration file, see link for more information
// https://github.com/angular/protractor/blob/master/lib/config.ts

const {SpecReporter} = require('jasmine-spec-reporter');

const args = [
  '--headless',
  '--disable-gpu',
  '--window-size=800,600',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-browser-side-navigation',
  // `--binary=${process.env.CHROME_BIN}`
]

/**
 * @type { import('protractor').Config }
 */
exports.config = {
  allScriptsTimeout: 60000,
  specs: [
    './src/**/*.e2e-spec.ts'
  ],
  capabilities: {
    browserName: 'chrome',
    chromeOptions: {
      args: args,
      w3c: false,
      prefs: {
        "profile.default_content_setting_values.geolocation": 1,
        "profile.default_content_setting_values.notifications": 2,
      },
    },
    'goog:chromeOptions': {
      args: args,
      w3c: false,
      prefs: {
        "profile.default_content_setting_values.geolocation": 1,
        "profile.default_content_setting_values.notifications": 2,
      }
    }
  },
  directConnect: true,
  baseUrl: 'http://localhost:4200/',
  framework: 'jasmine',
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 30000,
    print: function () {
    }
  },
  onPrepare() {
    require('ts-node').register({
      project: require('path').join(__dirname, './tsconfig.e2e.json')
    });
    jasmine.getEnv().addReporter(new SpecReporter({spec: {displayStacktrace: true}}));
  }
};
