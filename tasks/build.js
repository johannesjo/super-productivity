const config = require('./config');
const gulp = require('gulp');

/**
 * Build-Task Files
 *
 * NOTE: Depends on sme of the dev-tasks as well
 */


const del = require('del');
const gulpif = require('gulp-if');
const minifyHtml = require('gulp-minify-html');
const cleanCSS = require('gulp-clean-css');
const useref = require('gulp-useref');
const sourcemaps = require('gulp-sourcemaps');
const saveLicense = require('uglify-save-license');
const uglify = require('gulp-uglify');
const imagemin = require('gulp-imagemin');
const runSequence = require('run-sequence')
  .use(gulp);
const wiredep = require('wiredep').stream;

const merge = require('merge-stream');
const lazypipe = require('lazypipe');
const babel = require('gulp-babel');
const templateCache = require('gulp-angular-templatecache');
const ngAnnotate = require('gulp-ng-annotate');

// main task
gulp.task('build', function(callback) {
  runSequence(
    'wiredep',
    'lint',
    //'beautify',
    'injectAll',
    'buildStyles',

    'cleanDist',
    'wiredepBuild',
    'createTemplateCacheFiles',
    'injectAll',
    'testSingle',
    'lint',
    //  'sass',
    'minFiles',
    'copy',

    // cleanup after
    'cleanTemplateCacheFile',
    'injectAll',

    callback);
});

gulp.task('wiredepBuild', function() {
  return gulp.src([config.karmaConf, config.mainFile], { base: './' })
    .pipe(wiredep({
      exclude: config.excludedBowerComponents,
      devDependencies: false
    }))
    .pipe(gulp.dest('./'));
});

gulp.task('createTemplateCacheFiles', function() {
  return gulp.src(config.htmlF)
    .pipe(templateCache({
      filename: config.templateCacheFileName,
      templateHeader: `'use strict'; angular.module('<%= module %>'<%= standalone %>).run(['$templateCache', ($templateCache) => {`,
      templateBody: `$templateCache.put('<%= url %>','<%= contents %>');`,
      module: 'superProductivity',
      root: 'scripts'
    }))
    .pipe(gulp.dest(config.scripts));
});

gulp.task('cleanDist', function() {
  return del.sync(config.dist);
});

gulp.task('copy', function() {
  //const html = gulp.src(config.htmlF, { base: config.base })
  //  .pipe(minifyHtml({
  //    conditionals: true,
  //    loose: true,
  //    empty: true,
  //    quotes: true
  //  }))
  //  .pipe(gulp.dest(config.dist));

  const fonts = gulp.src(config.fontsF, { base: config.base })
    .pipe(gulp.dest(config.dist));

  const sounds = gulp.src(config.soundsF, { base: config.base })
    .pipe(gulp.dest(config.dist));

  // TODO this ain't perfect
  const images = gulp.src(config.imagesF, { base: config.base })
    .pipe(imagemin({
      progressive: true,
      svgoPlugins: [{ removeViewBox: false }]
    }))
    .pipe(gulp.dest(config.dist));

  return merge(fonts, images, sounds);
});

gulp.task('minFiles', function() {
  return gulp.src(config.mainFile)
    .pipe(useref({}))
    .pipe(useref({}, lazypipe()
      .pipe(sourcemaps.init, { loadMaps: true })))
    .pipe(gulpif(/scripts\.js/, babel()))
    .pipe(gulpif(/\.js$/, ngAnnotate({ single_quotes: true })))
    //.pipe(gulpif(/\.js$/, uglify({
    .pipe(gulpif(/scripts\.js/, uglify({
      output: {
        comments: saveLicense
      }
    })))
    .pipe(gulpif(/\.css$/, cleanCSS()))
    .pipe(sourcemaps.write('maps'))
    .pipe(gulp.dest(config.dist));
});
