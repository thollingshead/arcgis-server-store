define([
	'intern'
], function(
	intern
) {
	return {
		reporters: ['console', 'html'],

		loader: {
			async: true,
			packages: [{
				name: 'dgrid',
				location: 'tests/libs/dgrid'
			}, {
				name: 'dijit',
				location: 'tests/libs/dijit'
			}, {
				name: 'dojo',
				location: 'tests/libs/dojo'
			}, {
				name: 'dojox',
				location: 'tests/libs/dojox'
			}, {
				name: 'esri',
				location: 'tests/libs/esri'
			}, {
				name: 'put-selector',
				location: 'tests/libs/put-selector'
			}, {
				name: 'xstyle',
				location: 'tests/libs/xstyle'
			}],
			map: {
				'*': {
					'esri/request': 'tests/mocking/request'
				}
			}
		},

		suites: ['tests/ArcGISServerStore'],

		// A regular expression matching URLs to files that should not be included in code coverage analysis
		excludeInstrumentation: /(?:^|\\)(node_modules|tests)/
	};
});