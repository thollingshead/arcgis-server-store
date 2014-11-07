define([
	'../ArcGISServerStore',

	'./mocking/MockMapService',

	'intern!object',
	'intern/chai!assert'
], function(
	ArcGISServerStore,
	MockMapService,
	registerSuite, assert
) {
	var url = 'http://localhost/arcgis/rest/services/Mock/MapServer/0';
	registerSuite({
		name: 'constructor',
		setup: function() {
			MockMapService.start();
		},
		teardown: function() {
			MockMapService.stop();
		},
		beforeEach: function() {
			MockMapService.reset();
		},
		idProperty: function() {
			// Setup
			var store = new ArcGISServerStore({
				url: url
			});

			assert.strictEqual(store.idProperty, 'OBJECTID', 'Default idProperty is OBJECTID');
		}
	});
});