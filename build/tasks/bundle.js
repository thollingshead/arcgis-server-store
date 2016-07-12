const bundles = require('../bundles.js');
const bundler = require('aurelia-bundler');
const gulp = require('gulp');

const config = {
	force: true,
	baseURL: '.',
	configPath: './config.js',
	bundles: bundles.bundles
};

gulp.task('bundle', ['build'], () => {
	return bundler.bundle(config);
});

gulp.task('unbundle', () => {
	return bundler.unbundle(config);
});
