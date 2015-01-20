define([
	'../ArcGISServerStore',

	'./mocking/MockFeatureService',
	'./mocking/MockMapService',

	'dojo/_base/array',
	'dojo/_base/lang',

	'dojo/aspect',
	'dojo/Deferred',
	'dojo/promise/all',
	'dojo/when',

	'intern!object',
	'intern/chai!assert'
], function(
	ArcGISServerStore,
	MockFeatureService, MockMapService,
	array, lang,
	aspect, Deferred, all, when,
	registerSuite, assert
) {
	var mapService = 'http://localhost/arcgis/rest/services/Mock/MapServer/0';
	var featureService = 'http://localhost/arcgis/rest/services/Mock/FeatureServer/0';
	registerSuite({
		name: 'constructor',
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
			assert.throws(ArcGISServerStore, 'Missing required property: \'url\'.', 'Not specifying url in options should throw an error');
		},
		'initialize capabilities': function() {
			// Setup
			var store = new ArcGISServerStore({
				url: ' '
			});

			// Test
			assert.isDefined(store.capabilities, 'Capabilities should be initialized');
			assert.isFalse(store.capabilities.Data, 'Data capability should be initialized');
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
		'idProperty validated': function() {
			// Setup
			var dfd = this.async(1000);

			var validDfd = new Deferred();
			var validStore = new ArcGISServerStore({
				url: mapService,
				idProperty: 'NAME'
			});
			if (validStore._loaded) {
				validDfd.resolve();
			} else {
				aspect.after(validStore, '_initStore', function() {
					validDfd.resolve();
				});
			}

			var invalidDfd = new Deferred();
			var invalidStore = new ArcGISServerStore({
				url: mapService,
				idProperty: 'INVALID'
			});
			if (invalidStore._loaded) {
				invalidDfd.resolve();
			} else {
				aspect.after(invalidStore, '_initStore', function() {
					invalidDfd.resolve();
				});
			}

			// Test
			all([validDfd, invalidDfd]).then(dfd.callback(function() {
				assert.strictEqual(validStore.idProperty, 'NAME', 'Use passed idProperty if valid');
				assert.strictEqual(invalidStore.idProperty, 'ESRI_OID', 'Use service OID field if idProperty is invalid');
			}), dfd.reject.bind(dfd));
		},
		'outFields validated': function() {
			// Setup
			var dfd = this.async(1000);

			var validDfd = new Deferred();
			var validStore = new ArcGISServerStore({
				url: mapService,
				outFields: ['ESRI_OID', 'NAME']
			});
			if (validStore._loaded) {
				validDfd.resolve();
			} else {
				aspect.after(validStore, '_initStore', function() {
					validDfd.resolve();
				});
			}

			var missingDfd = new Deferred();
			var missingStore = new ArcGISServerStore({
				url: mapService,
				outFields: ['NAME']
			});
			if (missingStore._loaded) {
				missingDfd.resolve();
			} else {
				aspect.after(missingStore, '_initStore', function() {
					missingDfd.resolve();
				});
			}

			var invalidDfd = new Deferred();
			var invalidStore = new ArcGISServerStore({
				url: mapService,
				outFields: ['ESRI_OID', 'INVALID']
			});
			if (invalidStore._loaded) {
				invalidDfd.resolve();
			} else {
				aspect.after(invalidStore, '_initStore', function() {
					invalidDfd.resolve();
				});
			}

			var badDfd = new Deferred();
			var badStore = new ArcGISServerStore({
				url: mapService,
				outFields: ''
			});
			if (badStore._loaded) {
				badDfd.resolve();
			} else {
				aspect.after(badStore, '_initStore', function() {
					badDfd.resolve();
				});
			}

			// Test
			all([validDfd, missingDfd, invalidDfd, badDfd]).then(dfd.callback(function() {
				assert.sameMembers(validStore.outFields, ['ESRI_OID', 'NAME'], 'Use passed outFields if valid');
				assert.sameMembers(missingStore.outFields, ['NAME', 'ESRI_OID'], 'Add idProperty field if not included in outFields');
				assert.sameMembers(invalidStore.outFields, ['ESRI_OID'], 'Remove invalid fields passed in outFields');
				assert.sameMembers(badStore.outFields, ['*'], 'Use all fields if bad outFields are passed');
			}), dfd.reject.bind(dfd));
		},
		'discover service capabilities': function() {
			// Setup
			var dfd = this.async(1000);

			var mapDfd = new Deferred();
			var mapStore = new ArcGISServerStore({
				url: mapService
			});
			if (mapStore._loaded) {
				mapDfd.resolve();
			} else {
				aspect.after(mapStore, '_initStore', function() {
					mapDfd.resolve();
				});
			}

			var featureDfd = new Deferred();
			var featureStore = new ArcGISServerStore({
				url: featureService
			});
			if (featureStore._loaded) {
				featureDfd.resolve();
			} else {
				aspect.after(featureStore, '_initStore', function() {
					featureDfd.resolve();
				});
			}

			// Test
			all([mapDfd, featureDfd]).then(dfd.callback(function() {
				assert.isTrue(mapStore.capabilities.Data, 'Data capability should be overidden by service');
				assert.isTrue(mapStore.capabilities.Query, 'Query capabilty should be overidden by service');
				assert.isFalse(mapStore.capabilities.Create, 'Create capabilty should not be overidden by service');
				assert.isFalse(mapStore.capabilities.Delete, 'Delete capabilty should not be overidden by service');
				assert.isFalse(mapStore.capabilities.Update, 'Update capabilty should not be overidden by service');
				assert.isFalse(mapStore.capabilities.Editing, 'Editing capabilty should not be overidden by service');

				assert.isFalse(featureStore.capabilities.Data, 'Data capability should not be overidden by service');
				assert.isTrue(featureStore.capabilities.Query, 'Query capabilty should be overidden by service');
				assert.isTrue(featureStore.capabilities.Create, 'Create capabilty should be overidden by service');
				assert.isTrue(featureStore.capabilities.Delete, 'Delete capabilty should be overidden by service');
				assert.isTrue(featureStore.capabilities.Update, 'Update capabilty should be overidden by service');
				assert.isTrue(featureStore.capabilities.Editing, 'Editing capabilty should be overidden by service');
			}), dfd.reject.bind(dfd));
		},
		'store service info': function() {
			// Setup
			var dfd = this.async(1000);

			var storeDfd = new Deferred();
			var store = new ArcGISServerStore({
				url: mapService
			});
			if (store._loaded) {
				storeDfd.resolve();
			} else {
				aspect.after(store, '_initStore', function() {
					storeDfd.resolve();
				});
			}

			// Test
			storeDfd.then(dfd.callback(function() {
				assert.isDefined(store._serviceInfo, 'Should store service info');
			}), dfd.reject.bind(dfd));
		},
		'set loaded': function() {
			// Setup
			var dfd = this.async(1000);

			var storeDfd = new Deferred();
			var store = new ArcGISServerStore({
				url: mapService
			});
			if (store._loaded) {
				storeDfd.resolve();
			} else {
				aspect.after(store, '_initStore', function() {
					storeDfd.resolve();
				});
			}

			// Test
			storeDfd.then(dfd.callback(function() {
				assert.isTrue(store._loaded, 'Set loaded property after initialization');
			}), dfd.reject.bind(dfd));
		}
	});

	registerSuite({
		name: '_flatten',
		setup: function() {
			MockMapService.start();
		},
		teardown: function() {
			MockMapService.stop();
		},
		'flatten attributes': function() {
			// Setup
			var store = new ArcGISServerStore({
				url: mapService
			});

			var attributes = {
				ESRI_OID: 4,
				NAME: 'Test Name',
				CATEGORY: 'Test Category',
				DETAILS: 'Test Details'
			};

			var geometry = {
				x: 4,
				y: 14
			};

			var feature = {
				attributes: lang.clone(attributes),
				geometry: lang.clone(geometry)
			};

			var flattened = lang.clone(attributes);
			flattened.geometry = geometry;

			// Test
			assert.deepEqual(store._flatten(feature), flattened, 'Should flatten attributes to top-level object');
			assert.deepEqual(store._flatten(lang.clone(flattened)), flattened, 'Should not modify already flattened feature');
		}
	});

	registerSuite({
		name: '_unflatten',
		setup: function() {
			MockMapService.start();
		},
		teardown: function() {
			MockMapService.stop();
		},
		'unflatten attributes': function() {
			// Setup
			var dfd = this.async(1000);

			var someFieldsDfd = new Deferred();
			var someFieldsStore = new ArcGISServerStore({
				url: mapService,
				outFields: ['ESRI_OID', 'NAME']
			});
			if (someFieldsStore._loaded) {
				someFieldsDfd.resolve();
			} else {
				aspect.after(someFieldsStore, '_initStore', function() {
					someFieldsDfd.resolve();
				});
			}

			var storeDfd = new Deferred();
			var store = new ArcGISServerStore({
				url: mapService
			});
			if (store._loaded) {
				storeDfd.resolve();
			} else {
				aspect.after(store, '_initStore', function() {
					storeDfd.resolve();
				});
			}

			var someAttributes = {
				ESRI_OID: 4,
				NAME: 'Test Name'
			};
			var otherAttributes = {
				CATEGORY: 'Test Category',
				DETAILS: 'Test Details'
			};
			var attributes = lang.mixin(lang.clone(someAttributes), lang.clone(otherAttributes));

			var geometry = {
				x: 4,
				y: 14
			};

			var symbol = {
				radius: 5,
				type: 'esriSMS',
				color: [0, 0, 0, 0.75]
			};

			var flattened = lang.clone(attributes);
			flattened.geometry = lang.clone(geometry);
			flattened.symbol = lang.clone(symbol);

			var someFeature = lang.mixin(lang.clone(otherAttributes), {
				attributes: lang.clone(someAttributes),
				geometry: lang.clone(geometry),
				symbol: lang.clone(symbol)
			});

			var feature = {
				attributes: lang.clone(attributes),
				geometry: lang.clone(geometry),
				symbol: lang.clone(symbol)
			};

			// Test
			all([someFieldsDfd, storeDfd]).then(dfd.callback(function() {
				assert.deepEqual(store._unflatten(lang.clone(flattened)), feature, 'Should unflatten attributes to attributes property');
				assert.deepEqual(store._unflatten(lang.clone(feature)), feature, 'Should not modify already unflattened feature');
				assert.deepEqual(someFieldsStore._unflatten(flattened), someFeature, 'Should only flatten outFields');
			}), dfd.reject.bind(dfd));
		}
	});

	registerSuite({
		name: 'getIdentity',
		setup: function() {
			MockMapService.start();
		},
		teardown: function() {
			MockMapService.stop();
		},
		'identity in attributes': function() {
			// Setup
			var store = new ArcGISServerStore({
				url: mapService,
				idProperty: 'NAME',
				flatten: false
			});

			var id = 'TestingID';
			var object = {
				geometry: {
					x: 0,
					y: 0
				},
				attributes: {
					ESRI_OID: -1,
					NAME: id,
					CATEGORY: '',
					DETAILS: ''
				}
			};

			// Test
			assert.strictEqual(store.getIdentity(object), id, 'Should retrieve id property from attributes');
		},
		'identity in object': function() {
			// Setup
			var store = new ArcGISServerStore({
				url: mapService,
				idProperty: 'ESRI_OID'
			});

			var id = 4;
			var object = {
				ESRI_OID: id,
				NAME: '',
				CATEGORY: '',
				DETAILS: '',
				geometry: {
					x: 0,
					y: 0
				}
			};

			// Test
			assert.strictEqual(store.getIdentity(object), id, 'Should retrieve id property from object');
		}
	});

	registerSuite({
		name: 'get',
		setup: function() {
			MockMapService.start();
			MockFeatureService.start();
		},
		teardown: function() {
			MockMapService.stop();
			MockFeatureService.stop();
		},
		'get no capability': function() {
			// Setup
			var dfd = this.async(1000);

			var mapDfd = new Deferred();
			var mapStore = new ArcGISServerStore({
				url: mapService
			});
			mapStore.capabilities.Data = false;

			when(mapStore.get(1)).then(dfd.reject.bind(dfd), function(error) {
				mapDfd.resolve(error);
			});

			var featureDfd = new Deferred();
			var featureStore = new ArcGISServerStore({
				url: featureService
			});
			featureStore.capabilities.Query = false;

			when(featureStore.get(12)).then(dfd.reject.bind(dfd), function(error) {
				featureDfd.resolve(error);
			});

			// Test
			all({
				map: mapDfd,
				feature: featureDfd
			}).then(dfd.callback(function(errors) {
				assert.instanceOf(errors.map, Error, 'Map service does not support Data capability. Should receive an error');
				assert.strictEqual(errors.map.message, 'Get not supported.', 'Should receive a custom error message');

				assert.instanceOf(errors.feature, Error, 'Feature service does not support Query capability. Should receive an error');
				assert.strictEqual(errors.feature.message, 'Get not supported.', 'Should receive a custom error message');
			}), dfd.reject.bind(dfd));
		},
		'get existing object': function() {
			// Setup
			var dfd = this.async(1000);

			var oidStore = new ArcGISServerStore({
				url: mapService,
				returnGeometry: false,
				outFields: ['NAME', 'DETAILS'],
				flatten: false
			});

			var oidMatch = {
				attributes: {
					ESRI_OID: 1,
					NAME: 'Mock Test Point ' + 1,
					DETAILS: 'Mocked'
				}
			};

			var stringStore = new ArcGISServerStore({
				url: featureService,
				idProperty: 'NAME'
			});

			// Test
			all({
				oid: when(oidStore.get(oidMatch.attributes.ESRI_OID)),
				string: when(stringStore.get('Mock Test Point 2'))
			}).then(dfd.callback(function(results) {
				assert.deepEqual(results.oid, oidMatch, 'Return object with correct fields and geometry.');
				assert.strictEqual(stringStore.getIdentity(results.string), 'Mock Test Point 2', 'Return object with matching string id property');
				assert.isDefined(results.string.geometry, 'Return object with geometry');
			}), dfd.reject.bind(dfd));
		},
		'get nonexistent object': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: mapService
			});

			// Test
			when(store.get('Invalid')).then(dfd.callback(function(obj) {
				assert.isUndefined(obj, 'Return undefined if does not exist');
			}));
		}
	});

	registerSuite({
		name: 'add',
		setup: function() {
			MockMapService.start();
			MockFeatureService.start();
		},
		teardown: function() {
			MockMapService.stop();
			MockFeatureService.stop();
		},
		beforeEach: function() {
			MockFeatureService.reset();
		},
		'add no capability': function() {
			// Setup
			var dfd = this.async(1000);

			var mapStore = new ArcGISServerStore({
				url: mapService
			});

			var addObject = {
				NAME: 'Add Object'
			};

			// Test
			when(mapStore.add(addObject)).then(dfd.reject.bind(dfd), dfd.callback(function(error) {
				assert.instanceOf(error, Error, 'Map service does not support Create capability. Should receive an error');
				assert.strictEqual(error.message, 'Add not supported.', 'Should receive a custom error message');
			}));
		},
		'add with options id': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: featureService,
				flatten: false
			});

			var addObject = {
				attributes: {
					NAME: 'Add Object',
					DETAILS: 'Mocking Add',
					CATEGORY: 0
				},
				geometry: {
					x: 12,
					y: 21
				}
			};

			var warn = console.warn;
			var warnings = [];
			console.warn = function() {
				array.forEach(arguments, function(arg) {
					warnings.push(arg);
				});
			};

			// Test
			when(store.add(lang.clone(addObject), {
				id: 1234
			})).then(function(id) {
				addObject.attributes.ESRI_OID = id;
				when(store.get(id)).then(dfd.callback(function(added) {
					assert.sameMembers(warnings, ['Cannot set id on new object.'], 'Log warning message when id is passed');
					assert.isObject(added, 'Object should be added to store');
					delete added.geometry.spatialReference;
					assert.deepEqual(added, addObject, 'Object should be added to store without modifying properties');
				}), dfd.reject.bind(dfd));
			}, dfd.reject.bind(dfd));

			// Teardown
			console.warn = warn;
		},
		'add with service objectid field': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: featureService
			});

			var addObject = {
				ESRI_OID: 1234,
				NAME: 'Add Object',
				DETAILS: 'Mocking Add',
				CATEGORY: 1234
			};

			var warn = console.warn;
			var warnings = [];
			console.warn = function() {
				array.forEach(arguments, function(arg) {
					warnings.push(arg);
				});
			};

			// Test
			when(store.add(lang.clone(addObject))).then(function(id) {
				addObject.ESRI_OID = id;
				addObject.geometry = null;
				when(store.get(id)).then(dfd.callback(function(added) {
					assert.sameMembers(warnings, ['Cannot set id on new object.'], 'Log warning message when id is passed');
					assert.isObject(added, 'Object should be added to store');
					assert.deepEqual(added, addObject, 'Object should be added to store without modifying properties');
				}), dfd.reject.bind(dfd));
			}, dfd.reject.bind(dfd));

			// Teardown
			console.warn = warn;
		},
		'add with custom id field': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: featureService,
				idProperty: 'NAME'
			});

			var addObject = {
				NAME: 'custID-1234',
				DETAILS: 'Mocking Add',
				CATEGORY: 0,
				geometry: {
					x: 2,
					y: 2
				}
			};

			// Test
			when(store.add(lang.clone(addObject))).then(function(id) {
				addObject[store.idProperty] = id;
				when(store.get(id)).then(dfd.callback(function(added) {
					assert.isObject(added, 'Object should be added to store');
					assert.strictEqual(id, store.getIdentity(added), 'Add should return new id');
					delete added.ESRI_OID;
					delete added.geometry.spatialReference;
					assert.deepEqual(added, addObject, 'Object should be added to store without modifying properties.');
				}), dfd.reject.bind(dfd));
			}, dfd.reject.bind(dfd));
		},
		'add without id': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: featureService,
				flatten: false,
				returnGeometry: false
			});

			var addObject = {
				attributes: {
					NAME: 'Add Object',
					DETAILS: 'Mocking Add',
					CATEGORY: 4321
				}
			};

			// Test
			when(store.add(lang.clone(addObject))).then(function(id) {
				addObject.attributes.ESRI_OID = id;
				when(store.get(id)).then(dfd.callback(function(added) {
					assert.isObject(added, 'Object should be added to store');
					assert.strictEqual(id, store.getIdentity(added), 'Add should return new id');
					assert.deepEqual(added, addObject, 'Object should be added to store without modifying properties');
				}));
			}, dfd.reject.bind(dfd));
		}
	});
});