define([
	'../ArcGISServerStore',

	'./mocking/MockMapService',

	'dojo/store/util/SimpleQueryEngine',

	'intern!object',
	'intern/chai!assert'
], function(
	ArcGISServerStore,
	MockMapService,
	SimpleQueryEngine,
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
		},
		'mixin properties': function() {
			// Setup
			var mixinStore = new ArcGISServerStore({
				url: url,
				idProperty: 'setIdProperty',
				queryEngine: SimpleQueryEngine
			});

			// Test
			assert.strictEqual(mixinStore.idProperty, 'setIdProperty', 'Default idProperty should be overidden');
			assert.strictEqual(mixinStore.queryEngine, SimpleQueryEngine, 'Default queryEngine should be overriden');
			assert.strictEqual(mixinStore.url, url, 'Url should be initialized from options');
		},
		'no url': function() {
			var error;
			try {
				error = new ArcGISServerStore({});
			} catch (e) {
				error = e;
			}
			assert.strictEqual(error.message, 'Missing required property: \'url\'', 'Not specifying url in options should throw an error');
		},
		'initialize capabilities': function() {
			// Setup
			var store = new ArcGISServerStore({
				url: url
			});

			// Test
			assert.isDefined(store.capabilities, 'Capabilities should be initialized');
			assert.isFalse(store.capabilities.Query, 'Query capabilty should be initialized');
			assert.isFalse(store.capabilities.Create, 'Create capabilty should be initialized');
			assert.isFalse(store.capabilities.Delete, 'Delete capabilty should be initialized');
			assert.isFalse(store.capabilities.Update, 'Update capabilty should be initialized');
			assert.isFalse(store.capabilities.Editing, 'Editing capabilty should be initialized');
		}
	});
});