const paths = require('../paths');
const browserSync = require('browser-sync');
const gulp = require('gulp');

// outputs changes to files to the console
function reportChange(event) {
	console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
}

// this task wil watch for changes
// to js, html, and css files and call the
// reportChange method. Also, by depending on the
// serve task, it will instantiate a browserSync session
gulp.task('watch', ['serve'], () => {
	gulp.watch(paths.source, ['build-system', browserSync.reload]).on('change', reportChange);
	gulp.watch(paths.html, ['build-html', browserSync.reload]).on('change', reportChange);
	gulp.watch(paths.css, ['build-css']).on('change', reportChange);
});
