'use strict';

var gulp = require('gulp');
var merge = require('merge2');
var ts = require('gulp-typescript');
var buildRuntime = require('./gulp-plugins/build-runtime');

var lib = 'lib';
var dist = '.';

var rtProject = ts.createProject('tsconfig.json', { sortOutput: true });
var libProject = ts.createProject(
    'tsconfig.json',
    {
	sortOutput: true,
	declaration: true,
    }
);

gulp.task('runtime', function() {
    var tsRT = gulp.src('runtime/*.ts')
	.pipe(ts(rtProject))
	.js
	.pipe(gulp.dest('build-rt'));

    return merge(tsRT, gulp.src('runtime/*.css'))
	.pipe(buildRuntime('runtime.ts'))
	.pipe(gulp.dest('src'));
});

gulp.task('lib', function() {
    var tsLib = gulp.src('src/*.ts')
	.pipe(ts(libProject));

    return merge(tsLib.js, tsLib.dts)
	.pipe(gulp.dest(lib));
});
