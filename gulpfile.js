'use strict';

// general vars
var jsmain = './jig.js';
var jsfiles = [jsmain, 'lib/**/*.js'];
var jstests = './test/**/*.js';
var jsbundle = './jig-bundle.js';
var lintfiles = [].concat(jsfiles, jstests);

var gulp = require('gulp');
var jshint = require('gulp-jshint');
var watchify = require('watchify');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
// var buffer = require('vinyl-buffer');
var gutil = require('gulp-util');
// var sourcemaps = require('gulp-sourcemaps');
// var assign = require('lodash.assign');
var browserSync = require('browser-sync').create();
var mocha = require('gulp-mocha');

// START JS BUILD

// inspired by
// http://blog.avisi.nl/2014/04/25/how-to-keep-a-fast-build-with-browserify-and-reactjs/
// alternative links:
// https://scotch.io/tutorials/automate-your-tasks-easily-with-gulp-js (tutorial)
// http://www.smashingmagazine.com/2014/06/11/building-with-gulp/ (tutorial)
// https://medium.com/@sogko/gulp-browserify-the-gulp-y-way-bb359b3f9623
// http://io.pellucid.com/blog/tips-and-tricks-for-faster-front-end-builds
// https://github.com/gulpjs/gulp/blob/master/docs/recipes/fast-browserify-builds-with-watchify.md

function scripts(watch) {
  var bundler, rebundle;
  bundler = browserify(jsmain, {
    // basedir: '/',
    debug: true,
    cache: {}, // required for watchify
    packageCache: {}, // required for watchify
    fullPaths: watch // required to be true only for watchify
  });
  if(watch) {
    bundler = watchify(bundler);
  }

  rebundle = function() {
    return bundler.bundle()
      // .pipe(gutil.log('Re-bundling.'))
      .on('error', gutil.log.bind(gutil, 'Browserify Error'))
      .pipe(source(jsbundle))
      .pipe(gulp.dest('.'))
      .pipe(browserSync.reload({stream: true, once: true}))
  };

  bundler.on('update', function() {
    gutil.log.call(gutil, 'Re-bundling with watchify');
    rebundle();
    gulp.start('mocha');
  });
  return rebundle();
}

gulp.task('scripts', function() {
  return scripts(false);
});

gulp.task('watchScripts', function() {
  return scripts(true);
});

// END JS BUILD

// browsersync - static server
gulp.task('browser-sync', function() {
    browserSync.init({
        server: {
            baseDir: "./",
        }
    });
});

// end browsersync


// linter
gulp.task('lint', function() {
  return gulp.src(lintfiles)
    .pipe(jshint({browserify: true}))
    .pipe(jshint.reporter('default'));
});


gulp.task('watch', function() {
  gulp.watch(lintfiles, ['lint']);
  gulp.start(['watchScripts']);
});

// tests
gulp.task('mocha', function() {
  gutil.log('Running tests. For verbose output, just type "mocha"');
  return gulp.src(jstests, {read: false})
    // gulp-mocha needs filepaths so you can't have any plugins before it 
    .pipe(mocha({reporter: 'nyan'}));
});

// defaults
gulp.task('default', ['browser-sync', 'lint', 'watchScripts']);
