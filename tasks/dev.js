'use strict';
/* jshint camelcase: false */

const config = require('./config');
const gulp = require('gulp');
const fs = require('fs');

/**
 * Dev Task File
 *
 */


const sass = require('gulp-sass').sync;
const autoprefixer = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const wiredep = require('wiredep').stream;
const inj = require('gulp-inject');

const browserSync = require('browser-sync');
const reload = browserSync.reload;
const watch = require('gulp-watch');
const runSequence = require('run-sequence')
  .use(gulp);

const jshint = require('gulp-jshint');
const jscs = require('gulp-jscs');
const KarmaServer = require('karma').Server;

// const gulpNgConfig = require('gulp-ng-config');

const merge = require('merge-stream');
const plumber = require('gulp-plumber');
const sort = require('gulp-natural-sort');
const notify = require('gulp-notify');

// main task
gulp.task('default', function(cb) {
  runSequence(
    //'ngConfig',
    'wiredep',
    'lint',
    //'beautify',
    'injectAll',
    'buildStyles',
    'browserSync',
    'watch',
    function() {
      // run in parallel but afterwards
      gulp.start('test');
      cb();
    }
  );
});
gulp.task('serve', ['default']);
gulp.task('server', ['default']);

gulp.task('injectAll', function(callback) {
  runSequence(
    'wiredep',
    'injectScripts',
    'injectStyles',
    //'beautify',
    callback
  );
});

gulp.task('watch', function(cb) {
  watch(config.stylesF, function() {
    gulp.start('buildStyles')
      .on('end', cb);
  });
  watch(config.scriptsF, function() {
    gulp.start('injectScripts')
      .on('end', cb);
  });
  watch(config.scriptsAllF, function() {
    gulp.start('lint')
      .on('end', cb);
  });
  watch(config.allHtmlF, function() {
    gulp.start('html')
      .on('end', cb);
  });

  //gulp.watch('bower.json', ['wiredep']);

  // enable at your convenience
  //watch(config.scripts + '*.json', function() {
  //    gulp.start('ngConfig')
  //        .on('end', cb);
  //});
});

gulp.task('versionConst', (cb) => {
  const pjson = require('../package.json');
  const ver = pjson.version;
  const versionJsStr = `angular
  .module('superProductivity')
  .constant('VERSION', '${ver}');
  `;
  fs.writeFile(config.scripts + '/version.js', versionJsStr, cb);
});

gulp.task('buildStyles', function(cb) {
  runSequence(
    'injectStyles',
    'sass',
    cb
  );
});

gulp.task('injectStyles', function() {
  const sources = gulp.src(config.stylesF, { read: false })
    .pipe(sort());
  const target = gulp.src(config.mainSassFile);
  const outputFolder = gulp.dest(config.styles);

  return target
    .pipe(inj(sources,
      {
        starttag: '// inject:sass',
        endtag: '// endinject',
        ignorePath: [config.base.replace('./', ''), 'styles'],
        relative: true,
        addRootSlash: false,
        transform: function(filepath) {
          if (filepath) {
            return '@import \'' + filepath + '\';';
          }
        }
      }
    ))
    .pipe(outputFolder);
});

gulp.task('injectScripts', function() {
  const sources = gulp.src(config.scriptsF, { read: true })
    .pipe(sort());
  const target = gulp.src(config.mainFile);
  return target
    .pipe(inj(sources,
      {
        ignorePath: config.base.replace('./', ''),
        addRootSlash: false
      }
    ))
    .pipe(gulp.dest(config.base));
});

gulp.task('sass', function() {
  const sources = gulp.src(config.mainSassFile);
  const outputFolder = gulp.dest(config.styles);

  return sources
    .pipe(plumber({
      handleError: function(err) {
        console.log(err);
        this.emit('end');
      }
    }))
    .pipe(sourcemaps.init())
    .pipe(sass({ errLogToConsole: true }))
    .pipe(autoprefixer({
      browsers: ['> 0.1%']
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(config.tmp))
    .pipe(gulp.dest(config.styles))
    .pipe(outputFolder)
    .pipe(browserSync.stream());
});

gulp.task('browserSync', function() {
  browserSync({
    port: config.browserSyncPort,
    reloadDebounce: 100,
    server: {
      baseDir: config.base,
      livereload: true
    }
  });
});

gulp.task('html', function() {
  return gulp.src(config.allHtmlF)
    .pipe(reload({ stream: true }));
});

gulp.task('wiredep', ['wirdepKarma', 'wiredepIndex']);

gulp.task('wirdepKarma', function() {
  return gulp.src(config.karmaConf, { base: './' })
    .pipe(wiredep({
      devDependencies: true,
      exclude: config.excludedBowerComponents
    }))
    // required as weird workaround for not messing up the files
    .pipe(gulp.dest(config.tmp))
    .pipe(gulp.dest('./'));
});

gulp.task('wiredepIndex', function() {
  return gulp.src(config.mainFile, { base: './' })
    .pipe(wiredep({
      devDependencies: false,
      exclude: config.excludedBowerComponents
    }))
    // required as weird workaround for not messing up the files
    .pipe(gulp.dest(config.tmp))
    .pipe(gulp.dest('./'));
});

gulp.task('test', function(done) {
  new KarmaServer({
    configFile: __dirname + '/../karma.conf.js',
    action: 'watch',
    autoWatch: true,
    singleRun: false
  }, done).start();
});

gulp.task('testSingle', function(done) {
  new KarmaServer({
    configFile: __dirname + '/../karma.conf.js',
    action: 'run',
    autoWatch: false,
    singleRun: true
  }, done).start();
});

gulp.task('lint', function() {
  const notifyHandler = function(file) {
    if (file.jshint.success) {
      // Don't show something if success
      return false;
    }
    const errors = file.jshint.results.map(function(data) {
      if (data.error) {
        return '(' + data.error.line + ':' + data.error.character + ') ' + data.error.reason;
      }
    }).join('\n');
    return file.relative + ' (' + file.jshint.results.length + ' errors)\n' + errors;
  };

  return gulp.src([
    config.scriptsAllF,
    './karma-e2e.conf.js',
    './karma.conf.js',
    './gulpfile.js'
  ], { base: './' })
    .pipe(jshint('.jshintrc', { fail: true }))
    .pipe(notify(notifyHandler))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jscs());
});

gulp.task('beautify', function() {
  return gulp.src([
    config.scriptsAllF,
    './karma-e2e.conf.js',
    './karma.conf.js',
    './gulpfile.js'
  ], { base: './' })
    .pipe(jscs({ fix: true }))
    .pipe(gulp.dest('./'));
});

