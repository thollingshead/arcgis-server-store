const paths = require('../paths');
const gulp = require('gulp');
const eslint = require('gulp-eslint');

// runs eslint on all .js files
gulp.task('lint', () => {
	return gulp.src(paths.source)
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failOnError());
});
