define([
	'../ArcGISServerStore',

	'./mocking/MockFeatureService',
	'./mocking/MockMapService',

	'intern!object',
	'intern/chai!assert'
], function(
	ArcGISServerStore,
	MockFeatureService, MockMapService,
	registerSuite, assert
) {
	var mapService = 'http://localhost/arcgis/rest/services/Mock/MapServer/0';
	var featureService = 'http://localhost/arcgis/rest/services/Mock/FeatureServer/0';
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
		'default properties': function() {
			// Setup
			var store = new ArcGISServerStore({
				url: ' '
			});

			// Test
			assert.strictEqual(store.idProperty, 'OBJECTID', 'Default idProperty is OBJECTID');
			assert.isUndefined(store._loaded, 'Should not be loaded until initialized');
			assert.isTrue(store.flatten, 'Flatten attributes by default');
			assert.isTrue(store.returnGeometry, 'Return geometry by default');
			assert.isArray(store.outFields, 'outFields should be an array by default');
			assert.sameMembers(store.outFields, ['*'], 'outFields should default to all fields');
		},
		'mixin properties': function() {
			// Setup
			var mixinStore = new ArcGISServerStore({
				url: 'Test Url',
				idProperty: 'setIdProperty',
				flatten: false,
				returnGeometry: false,
				outFields: ['NAME']
			});

			// Test
			assert.strictEqual(mixinStore.idProperty, 'setIdProperty', 'Default idProperty should be overidden');
			assert.isFalse(mixinStore.flatten, 'Default flatten should be overidden');
			assert.strictEqual(mixinStore.url, 'Test Url', 'Url should be initialized from options');
			assert.isFalse(mixinStore.returnGeometry, 'Default returnGeometry should be overidden');
			assert.sameMembers(mixinStore.outFields, ['NAME'], 'Default outFields should be overidden');
		},
		'no url': function() {
			assert.throws(ArcGISServerStore, 'Missing required property: \'url\'', 'Not specifying url in options should throw an error');
		},
		'initialize capabilities': function() {
			// Setup
			var store = new ArcGISServerStore({
				url: ' '
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

	registerSuite({
		name: '_initStore',
		setup: function() {
			MockMapService.start();
			MockFeatureService.start();
		},
		teardown: function() {
			MockMapService.stop();
			MockFeatureService.stop();
		},
		beforeEach: function() {
			MockMapService.reset();
			MockFeatureService.reset();
		},
		'idProperty validated': function() {
			// Setup
			var dfd = this.async(1000);

			var validStore = new ArcGISServerStore({
				url: mapService,
				idProperty: 'NAME'
			});

			var invalidStore = new ArcGISServerStore({
				url: mapService,
				idProperty: 'INVALID'
			});

			// Test
			setTimeout(function() {
				dfd.callback(function() {
					assert.strictEqual(validStore.idProperty, 'NAME', 'Use passed idProperty if valid');
					assert.strictEqual(invalidStore.idProperty, 'ESRI_OID', 'Use service OID field if idProperty is invalid');
				})();
			}, 0);
		},
		'outFields validated': function() {
			// Setup
			var dfd = this.async(1000);

			var validStore = new ArcGISServerStore({
				url: mapService,
				outFields: ['ESRI_OID', 'NAME']
			});

			var missingStore = new ArcGISServerStore({
				url: mapService,
				outFields: ['NAME']
			});

			var invalidStore = new ArcGISServerStore({
				url: mapService,
				outFields: ['ESRI_OID', 'INVALID']
			});

			var badStore = new ArcGISServerStore({
				url: mapService,
				outFields: ''
			});

			// Test
			setTimeout(function() {
				dfd.callback(function() {
					assert.sameMembers(validStore.outFields, ['ESRI_OID', 'NAME'], 'Use passed outFields if valid');
					assert.sameMembers(missingStore.outFields, ['NAME', 'ESRI_OID'], 'Add idProperty field if not included in outFields');
					assert.sameMembers(invalidStore.outFields, ['ESRI_OID'], 'Remove invalid fields passed in outFields');
					assert.sameMembers(badStore.outFields, ['*'], 'Use all fields if bad outFields are passed');
				})();
			}, 0);
		},
		'discover service capabilities': function() {
			// Setup
			var dfd = this.async(1000);

			var mapStore = new ArcGISServerStore({
				url: mapService
			});

			var featureStore = new ArcGISServerStore({
				url: featureService
			});

			// Test
			setTimeout(function() {
				dfd.callback(function() {
					assert.isTrue(mapStore.capabilities.Query, 'Query capabilty should be overidden by service');
					assert.isFalse(mapStore.capabilities.Create, 'Create capabilty should not be overidden by service');
					assert.isFalse(mapStore.capabilities.Delete, 'Delete capabilty should not be overidden by service');
					assert.isFalse(mapStore.capabilities.Update, 'Update capabilty should not be overidden by service');
					assert.isFalse(mapStore.capabilities.Editing, 'Editing capabilty should not be overidden by service');

					assert.isTrue(featureStore.capabilities.Query, 'Query capabilty should be overidden by service');
					assert.isTrue(featureStore.capabilities.Create, 'Create capabilty should be overidden by service');
					assert.isTrue(featureStore.capabilities.Delete, 'Delete capabilty should be overidden by service');
					assert.isTrue(featureStore.capabilities.Update, 'Update capabilty should be overidden by service');
					assert.isTrue(featureStore.capabilities.Editing, 'Editing capabilty should be overidden by service');
				})();
			}, 0);
		},
		'set loaded': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: mapService
			});

			setTimeout(function() {
				dfd.callback(function() {
					assert.isTrue(store._loaded, 'Set loaded property after initialization');
				})();
			}, 0);
		}
	});
});