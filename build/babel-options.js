const path = require('path');

exports.base = function() {
	return {
		filename: '',
		filenameRelative: '',
		sourceMap: true,
		sourceRoot: '',
		moduleRoot: path.resolve('src').replace(/\\/g, '/'),
		moduleIds: false,
		comments: false,
		compact: false,
		code: true,
		presets: ['es2015-loose', 'stage-1'],
		plugins: [
			'syntax-flow',
			'transform-decorators-legacy',
			'transform-flow-strip-types'
		]
	};
};

exports.commonjs = function() {
	const options = exports.base();
	options.plugins.push('transform-es2015-modules-commonjs');
	return options;
};

exports.amd = function() {
	const options = exports.base();
	options.plugins.push('transform-es2015-modules-amd');
	return options;
};

exports.system = function() {
	const options = exports.base();
	options.plugins.push('transform-es2015-modules-systemjs');
	return options;
};

exports.es2015 = function() {
	const options = exports.base();
	options.presets = ['stage-1'];
	return options;
};
