const gulp = require('gulp');
const runSequence = require('run-sequence');

// calls the listed sequence of tasks in order
gulp.task('prepare-release', function(callback) {
	return runSequence(
		'build',
		'lint',
		callback
	);
});
