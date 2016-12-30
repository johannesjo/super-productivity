module.exports = (function() {
    'use strict';

    // config vars
    var base = './app';
    var scripts = base + '/scripts';
    var sass = base + '/styles';

    var data = {
        browserSyncPort: 3000,
        cordovaPath: 'cordova',
        defaultPlatform: 'ios',
        excludedBowerComponents: ['es5-shim', 'json3'],
        base: base,
        mainFile: base + '/index.html',
        mainSassFile: sass + '/main.scss',
        routesFiles: base + '/scripts/_routes.js',
        e2eBaseUrl: 'http://localhost:3000/',
        styles: base + '/styles/',
        stylesF: [
            base + '/styles/**/_*.{scss,sass,less}',
            scripts + '/**/*.{scss,sass,less}'
        ],
        stylesAllF: [
            base + '/styles/**/*.{scss,sass,less}',
            scripts + '/**/*.{scss,sass,less}'
        ],
        scripts: base + '/scripts/',
        scriptsF: [
            // modules first
            base + '/scripts/**/_*.js',
            base + '/scripts/**/*.js',
            '!' + base + '/scripts/**/*.spec.js'
        ],
        scriptsAllF: base + '/scripts/**/*.js',
        scriptTestsF: base + '/scripts/**/*.spec.js',
        html: base + '/scripts/',
        htmlF: [
            base + '/scripts/**/*.html'
        ],
        images: base + '/images/',
        imagesF: base + '/images/**/*.*',
        fonts: base + '/fonts/',
        fontsF: base + '/fonts/**/*.*',
        tmp: './.tmp',
        dist: 'www',
        wwwDestination: '',
        karmaConf: './karma.conf.js',
        karmaConfE2E: './karma-e2e.conf.js'
    };

    data.allHtmlF = data.htmlF.slice()
    data.allHtmlF.push(data.mainFile);

    return data;
})();
