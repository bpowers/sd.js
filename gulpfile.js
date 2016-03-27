'use strict';

var gulp = require('gulp');
var merge = require('merge2');
var ts = require('gulp-typescript');
var lint = require('gulp-tslint');
var runSequence = require('run-sequence');
var rjs = require('gulp-requirejs-bp');
var mocha = require('gulp-mocha');
var browserSync = require('browser-sync');
var reload = browserSync.reload;

var buildRuntime = require('./gulp-plugins/build-runtime');

var lib = 'lib';

var rtProject = ts.createProject('tsconfig.json', { sortOutput: true });
var libProject = ts.createProject('tsconfig.json', {
    sortOutput: true,
    declaration: true,
});
var buildProject = ts.createProject('tsconfig.json', {
    sortOutput: true,
    module: 'amd',
});
var testProject = ts.createProject('tsconfig.json', { sortOutput: true });

gulp.task('runtime', function() {
    var tsRT = gulp.src('runtime/*.ts')
        .pipe(ts(rtProject))
        .js
        .pipe(gulp.dest('build-rt'));

    return merge(tsRT, gulp.src('runtime/*.css'))
        .pipe(buildRuntime('runtime.ts'))
        .pipe(gulp.dest('src'));
});

gulp.task('common-lib', ['runtime'], function() {
    var tsLib = gulp.src('src/*.ts')
        .pipe(ts(libProject));

    return merge(tsLib.js, tsLib.dts)
        .pipe(gulp.dest(lib));
});

gulp.task('build', ['runtime'], function() {
    var tsBuild = gulp.src('src/*.ts')
        .pipe(ts(buildProject));

    return merge(tsBuild.js, tsBuild.dts)
        .pipe(gulp.dest('build'));
});

gulp.task('sd.js', ['build'], function() {
    return rjs({
        baseUrl: 'build',
        include: ['sd'],
        optimize: 'none',
        name: '../bower_components/almond/almond',
        wrap: {
            startFile: 'src/build/start.frag.js',
            endFile: 'src/build/end.frag.js'
        },
        out: 'sd.js',
    }).pipe(gulp.dest('.'));
});

gulp.task('sd.min.js', ['build'], function() {
    return rjs({
        baseUrl: 'build',
        include: ['sd'],
        name: '../bower_components/almond/almond',
        wrap: {
            startFile: 'src/build/start.frag.js',
            endFile: 'src/build/end.frag.js'
        },
        out: 'sd.min.js',
    }).pipe(gulp.dest('.'));
});

gulp.task('test', ['common-lib'], function() {
    return gulp.src('test/*.ts')
        .pipe(ts(libProject)).js
	.pipe(gulp.dest('test'))
	.pipe(mocha());
});

gulp.task('default', function(cb) {
    runSequence(['common-lib', 'sd.js', 'sd.min.js'], 'test', cb);
});

gulp.task('serve', ['sd.js'], function () {
    browserSync({
        port: 5000,
        notify: false,
        logPrefix: 'browsix',
        snippetOptions: {
            rule: {
                match: '<span id="browser-sync-binding"></span>',
                fn: function (snippet) { return snippet; },
            },
        },
        server: { baseDir: ['.'] },
    });

    gulp.watch(['index.html'], reload);
    gulp.watch(['src/*.ts', '!src/runtime.ts'], ['sd.js', reload]);
});
