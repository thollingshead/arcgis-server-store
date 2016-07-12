const paths = require('../paths');
const del = require('del');
const gulp = require('gulp');
const vinylPaths = require('vinyl-paths');

// deletes all files in the output path
gulp.task('clean', ['unbundle'], () => {
	return gulp.src([paths.output])
		.pipe(vinylPaths(del));
});
