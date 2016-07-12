const browserSync = require('browser-sync');
const gulp = require('gulp');

// this task utilizes the browsersync plugin
// to create a dev server instance
// at http://localhost:9000
gulp.task('serve', ['build'], (done) => {
	browserSync({
		online: false,
		open: false,
		port: 9000,
		server: {
			baseDir: ['.'],
			middleware: function(req, res, next) {
				res.setHeader('Access-Control-Allow-Origin', '*');
				next();
			}
		}
	}, done);
});

// this task utilizes the browsersync plugin
// to create a dev server instance
// at http://localhost:9000
gulp.task('serve-bundle', ['bundle'], (done) => {
	browserSync({
		online: false,
		open: false,
		port: 9000,
		server: {
			baseDir: ['.'],
			middleware: function(req, res, next) {
				res.setHeader('Access-Control-Allow-Origin', '*');
				next();
			}
		}
	}, done);
});

// this task utilizes the browsersync plugin
// to create a dev server instance
// at http://localhost:9000
gulp.task('serve-export', ['export'], (done) => {
	browserSync({
		online: false,
		open: false,
		port: 9000,
		server: {
			baseDir: ['./export'],
			middleware: function(req, res, next) {
				res.setHeader('Access-Control-Allow-Origin', '*');
				next();
			}
		}
	}, done);
});
