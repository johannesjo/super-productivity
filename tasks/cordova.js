var config = require('./config');
var gulp = require('gulp');

/**
 * Cordova-Build-Task Files
 *
 * NOTE: Depends on some of the build-tasks as well
 * inspired by:
 * @url https://github.com/kamrik/CordovaGulpTemplate
 */

var plugins = ['org.apache.cordova.file'];

var path = require('path');
var shell = require('gulp-shell');
var runSequence = require('run-sequence')
    .use(gulp);
var symlink = require('gulp-symlink');
var argv = require('yargs').argv;

var watch = require('gulp-watch');
var livereload = require('gulp-livereload');
var http = require('http');
var ecstatic = require('ecstatic');
var gutil = require('gulp-util');
var sass = require('gulp-sass');

function platformArg() {
    return (argv.platform || config.defaultPlatform);
}

gulp.task('cordovaDev', function(cb) {
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


gulp.task('cordovaRun', function(cb) {
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


gulp.task('watchForCordova', function() {
    livereload.listen();
    var projectFiles = config.base + '/**/*.*';
    return gulp.src(projectFiles)
        .pipe(watch(projectFiles))
        .pipe(gulp.dest('./platforms/' + platformArg() + '/www/'))
        .pipe(livereload());
});


gulp.task('cordovaServer', function() {
    var port = 8000;
    var url = "http://localhost:" + port + "/";
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


gulp.task('symlinkApp', function() {
    return gulp.src(config.base)
        .pipe(symlink(config.dist));
});


gulp.task('buildCordova', shell.task([
    config.cordovaPath + ' build ' + platformArg() + ''
]));

