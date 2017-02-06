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
const uglify = require('gulp-uglify');
const imagemin = require('gulp-imagemin');
const runSequence = require('run-sequence')
  .use(gulp);
const wiredep = require('wiredep').stream;

const merge = require('merge-stream');
const lazypipe = require('lazypipe');
const babel = require('gulp-babel');

// main task
gulp.task('build', function (callback) {
  runSequence(
    'wiredep',
    'lint',
    //'beautify',
    'injectAll',
    'buildStyles',

    'cleanDist',
    'wiredepBuild',
    //  'injectAll',
    //  'testSingle',
    'lint',
    //  'sass',
    'minFiles',
    'copy',

    // reset config
    //'ngConfig',
    callback);
});

gulp.task('wiredepBuild', function () {
  return gulp.src([config.karmaConf, config.mainFile], { base: './' })
    .pipe(wiredep({
      exclude: config.excludedBowerComponents,
      devDependencies: false
    }))
    .pipe(gulp.dest('./'));
});

gulp.task('cleanDist', function () {
  return del.sync(config.dist);
});

gulp.task('copy', function () {
  const html = gulp.src(config.htmlF, { base: config.base })
    .pipe(minifyHtml({
      conditionals: true,
      loose: true,
      empty: true,
      quotes: true
    }))
    .pipe(gulp.dest(config.dist));

  const fonts = gulp.src(config.fontsF, { base: config.base })
    .pipe(gulp.dest(config.dist));

  // TODO this ain't perfect
  const images = gulp.src(config.imagesF, { base: config.base })
    .pipe(imagemin({
      progressive: true,
      svgoPlugins: [{ removeViewBox: false }]
    }))
    .pipe(gulp.dest(config.dist));

  return merge(html, fonts, images);
});

gulp.task('minFiles', function () {
  return gulp.src(config.mainFile)
  //.pipe(useref({}))
    .pipe(useref({}, lazypipe()
      .pipe(sourcemaps.init, { loadMaps: true })))
    .pipe(gulpif(/scripts\.js/, babel()))
    .pipe(gulpif(/\.js$/, uglify({ preserveComments: 'license' })))
    .pipe(gulpif(/\.css$/, cleanCSS()))
    .pipe(sourcemaps.write('maps'))
    .pipe(gulp.dest(config.dist));
});
