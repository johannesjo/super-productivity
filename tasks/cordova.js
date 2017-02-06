const config = require('./config');
const gulp = require('gulp');

/**
 * Cordova-Build-Task Files
 *
 * NOTE: Depends on some of the build-tasks as well
 * inspired by:
 * @url https://github.com/kamrik/CordovaGulpTemplate
 */

const plugins = ['org.apache.cordova.file'];

const path = require('path');
const shell = require('gulp-shell');
const runSequence = require('run-sequence')
  .use(gulp);
const symlink = require('gulp-symlink');
const argv = require('yargs').argv;

const watch = require('gulp-watch');
const livereload = require('gulp-livereload');
const http = require('http');
const ecstatic = require('ecstatic');
const gutil = require('gulp-util');
const sass = require('gulp-sass');

function platformArg() {
  return (argv.platform || config.defaultPlatform);
}

gulp.task('cordovaDev', function (cb) {
  //gulp.start('test');

  runSequence(
    'cleanDist',
    'symlinkApp',
    'ngConfig',
    'injectAll',
    'buildStyles',
    'browserSync',
    'cordovaServer',
    'cordovaEmulate',
    ['watchForCordova', 'watch'],
    cb
  );
});

gulp.task('cordovaRun', function (cb) {
  runSequence(
    'cleanDist',
    'symlinkApp',
    'ngConfig',
    'injectAll',
    'buildStyles',
    'browserSync',
    'cordovaServer',
    'cordovaRunOnDevice',
    ['watchForCordova', 'watch'],
    cb
  );
});

gulp.task('watchForCordova', function () {
  livereload.listen();
  const projectFiles = config.base + '/**/*.*';
  return gulp.src(projectFiles)
    .pipe(watch(projectFiles))
    .pipe(gulp.dest('./platforms/' + platformArg() + '/www/'))
    .pipe(livereload());
});

gulp.task('cordovaServer', function () {
  const port = 8000;
  const url = "http://localhost:" + port + "/";
  http.createServer(ecstatic({
    root: "platforms",
    cache: 0
  }))
    .listen(port);

  gutil.log(gutil.colors.blue("HTTP server listening on " + port));
});

gulp.task('cordovaEmulate', shell.task([
  config.cordovaPath + ' emulate ' + platformArg() + ' -l -s -c'
]));

gulp.task('cordovaRunOnDevice', shell.task([
  config.cordovaPath + ' run ' + platformArg() + ' -l -s -c'
]));

gulp.task('symlinkApp', function () {
  return gulp.src(config.base)
    .pipe(symlink(config.dist));
});

gulp.task('buildCordova', shell.task([
  config.cordovaPath + ' build ' + platformArg() + ''
]));

