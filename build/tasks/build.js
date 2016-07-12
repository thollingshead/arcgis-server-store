const compilerOptions = require('../babel-options');
const paths = require('../paths');
const browserSync = require('browser-sync');
const gulp = require('gulp');
const babel = require('gulp-babel');
const changed = require('gulp-changed');
const notify = require('gulp-notify');
const plumber = require('gulp-plumber');
const sourcemaps = require('gulp-sourcemaps');
const stylus = require('gulp-stylus');
const assign = Object.assign || require('object.assign');
const runSequence = require('run-sequence');

// transpiles changed es6 files to SystemJS format
// the plumber() call prevents 'pipe breaking' caused
// by errors from other gulp plugins
// https://www.npmjs.com/package/gulp-plumber
gulp.task('build-system', () => {
	return gulp.src(paths.source)
		.pipe(plumber({errorHandler: notify.onError('Error: <%= error.message %>')}))
		.pipe(changed(paths.output, {extension: '.js'}))
		.pipe(sourcemaps.init({loadMaps: true}))
		.pipe(babel(assign({}, compilerOptions.system())))
		.pipe(sourcemaps.write('.', {includeContent: false, sourceRoot: '/src'}))
		.pipe(gulp.dest(paths.output));
});

// copies changed html files to the output directory
gulp.task('build-html', () => {
	return gulp.src(paths.html)
		.pipe(changed(paths.output, {extension: '.html'}))
		.pipe(gulp.dest(paths.output));
});

// copies changed css files to the output directory
gulp.task('build-css', () => {
	return gulp.src(paths.css)
		.pipe(changed(paths.output, {extension: '.css'}))
		.pipe(stylus())
		.pipe(gulp.dest(paths.output))
		.pipe(browserSync.stream());
});

// this task calls the clean task (located
// in ./clean.js), then runs the build-system
// and build-html tasks in parallel
// https://www.npmjs.com/package/gulp-run-sequence
gulp.task('build', (callback) => {
	return runSequence(
		'clean',
		['build-system', 'build-html', 'build-css'],
		callback
	);
});
