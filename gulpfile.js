'use strict';

var gulp = require('gulp');
var merge = require('merge2');
var ts = require('gulp-typescript');
var buildRuntime = require('./gulp-plugins/build-runtime');

var lib = 'lib';
var dist = '.';

var rtProject = ts.createProject('tsconfig.json', { sortOutput: true });

gulp.task('runtime', function() {
    var tsRT = gulp.src('runtime/*.ts')
	.pipe(ts(rtProject))
	.js
	.pipe(gulp.dest('build-rt'));
    return merge(tsRT, gulp.src('runtime/*.css'))
	.pipe(buildRuntime('runtime.ts'))
	.pipe(gulp.dest('src'));
});

