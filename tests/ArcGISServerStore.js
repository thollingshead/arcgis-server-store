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

	'esri/tasks/query',

	'intern!object',
	'intern/chai!assert'
], function(
	ArcGISServerStore,
	MockFeatureService, MockMapService,
	array, lang,
	aspect, Deferred, all, when,
	Query,
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
		name: 'put',
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
		'put no capability': function() {
			// Setup
			var dfd = this.async(1000);

			var mapStore = new ArcGISServerStore({
				url: mapService
			});

			var putObject = {
				ESRI_OID: 1,
				NAME: 'Put Object'
			};

			// Test
			when(mapStore.put(putObject)).then(dfd.reject.bind(dfd), dfd.callback(function(error) {
				assert.instanceOf(error, Error, 'Map service does not support Update capability. Should receive an error');
				assert.strictEqual(error.message, 'Update not supported.', 'Should receive a custom error message');
			}));
		},
		'put no overwrite': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: featureService
			});
			store.add = function(object, options) {
				var dfd = new Deferred();
				dfd.resolve({
					object: object,
					options: options
				});
				return dfd.promise;
			};

			var newObject = {
				NAME: 'New Object'
			};
			var options = {
				overwrite: false
			};

			// Test
			when(store.put(lang.clone(newObject), options)).then(dfd.callback(function(args) {
				assert.deepEqual(args.object, newObject, 'Should add object without modifying');
				assert.deepEqual(args.options, options, 'Should add object without modifying options');
			}), dfd.reject.bind(dfd));
		},
		'put overwrite without id': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: featureService
			});

			var putObject = {
				NAME: 'Put Object'
			};
			var options = {
				overwrite: true
			};

			// Test
			when(store.put(putObject, options)).then(dfd.reject.bind(dfd), dfd.callback(function(error) {
				assert.instanceOf(error, Error, 'Cannot update an object without an id.');
				assert.strictEqual(error.message, 'Cannot update object with no id.', 'Should receive custom error message');
			}));
		},
		'put overwrite non-existent': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: featureService
			});

			var putObject = {
				NAME: 'Put Object'
			};
			var options = {
				overwrite: true,
				id: 12345
			};

			// Test
			when(store.put(putObject, options)).then(dfd.reject.bind(dfd), dfd.callback(function(error) {
				assert.instanceOf(error, Error, 'Should receive an error trying to update.');
			}));
		},
		'put non-existent': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: featureService
			});
			store.add = function(object, options) {
				var dfd = new Deferred();
				dfd.resolve({
					object: object,
					options: options
				});
				return dfd.promise;
			};

			var newObject = {
				NAME: 'New Object'
			};
			var options = {
				id: 12345
			};

			// Test
			when(store.put(lang.clone(newObject), options)).then(dfd.callback(function(args) {
				assert.deepEqual(args.object, newObject, 'Should add object without modifying');
				assert.deepEqual(args.options, options, 'Should add object without modifying options');
			}), dfd.reject.bind(dfd));
		},
		'put without id': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: featureService
			});
			store.add = function(object, options) {
				var dfd = new Deferred();
				dfd.resolve({
					object: object,
					options: options
				});
				return dfd.promise;
			};

			var newObject = {
				NAME: 'New Object',
				DETAILS: 'There is no id here.'
			};
			var options = {};

			// Test
			when(store.put(lang.clone(newObject), options)).then(dfd.callback(function(args) {
				assert.deepEqual(args.object, newObject, 'Should add object without modifying');
				assert.deepEqual(args.options, options, 'Should add object without modifying options');
			}), dfd.reject.bind(dfd));
		},
		'put with id': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: featureService
			});

			var putObject = {
				NAME: 'Put Object',
				ESRI_OID: 5,
				DETAILS: 'Something new'
			};
			var options = {};

			// Test
			when(store.put(lang.clone(putObject), options)).then(function(id) {
				putObject[store.idProperty] = id;
				when(store.get(id)).then(dfd.callback(function(updated) {
					assert.isDefined(updated.CATEGORY, 'Put should only overwrite fields.');
					assert.deepEqual(updated, lang.mixin(lang.clone(updated), putObject), 'Put should update object with values.');
				}), dfd.reject.bind(dfd));
			}, dfd.reject.bind(dfd));
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

	registerSuite({
		name: 'remove',
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
		'remove no capability': function() {
			// Setup
			var dfd = this.async(1000);

			var mapStore = new ArcGISServerStore({
				url: mapService
			});

			// Test
			when(mapStore.remove(1)).then(dfd.reject.bind(dfd), dfd.callback(function(error) {
				assert.instanceOf(error, Error, 'Map service does not support Delete capability. Should receive an error');
				assert.strictEqual(error.message, 'Remove not supported.', 'Should receive a custom error message');
			}));
		},
		'remove no id': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: featureService
			});

			// Test
			when(store.remove()).then(dfd.reject.bind(dfd), dfd.callback(function(error) {
				assert.instanceOf(error, Error, 'Should receive an error trying to delete.');
			}));
		},
		'remove invalid id': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: featureService
			});

			// Test
			when(store.remove(12345)).then(dfd.callback(function(success) {
				assert.isFalse(success, 'Invalid id should not delete features.');
			}), dfd.reject.bind(dfd));
		},
		'remove with id': function() {
			// Setup
			var dfd = this.async(1000);

			var oidStore = new ArcGISServerStore({
				url: featureService
			});

			var stringStore = new ArcGISServerStore({
				url: featureService,
				idProperty: 'NAME'
			});

			var oid = 1;
			var nameId = 'Mock Test Point 2';

			// Test
			all({
				oid: when(oidStore.remove(oid)),
				string: when(stringStore.remove(nameId))
			}).then(function(results) {
				all({
					oid: when(oidStore.get(oid)),
					string: when(stringStore.get(nameId))
				}).then(dfd.callback(function(getResults) {
					assert.isTrue(results.oid, 'Existing id should remove successfully.');
					assert.isTrue(results.string, 'Existing id with custom idProperty should remove successfully.');
					assert.isUndefined(getResults.oid, 'Removed id should no longer exist in store.');
					assert.isUndefined(getResults.string, 'Removed custom id should no longer exist in store.');
				}), dfd.reject.bind(dfd));
			}, dfd.reject.bind(dfd));
		}
	});

	registerSuite({
		name: 'query',
		setup: function() {
			MockMapService.start();
			MockFeatureService.start();
		},
		teardown: function() {
			MockMapService.stop();
			MockFeatureService.stop();
		},
		'query no capability': function() {
			// Setup
			var dfd = this.async(1000);

			var mapStore = new ArcGISServerStore({
				url: mapService
			});
			mapStore.capabilities.Data = false;

			var featureStore = new ArcGISServerStore({
				url: featureService
			});
			featureStore.capabilities.Query = false;

			// Test
			when(mapStore.query()).then(dfd.reject.bind(dfd), function(mapError) {
				when(featureStore.query()).then(dfd.reject.bind(dfd), dfd.callback(function(featureError) {
					assert.instanceOf(mapError, Error, 'Custom map service does not support Data capability. Should receive an error');
					assert.strictEqual(mapError.message, 'Query not supported.', 'Should receive a custom error message');
					assert.instanceOf(featureError, Error, 'Custom feature service does not support Query capability. Should receive an error');
					assert.strictEqual(featureError.message, 'Query not supported.', 'Should receive a custom error message');
				}));
			});
		},
		'query no parameters': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: featureService
			});

			// Test
			var query = store.query();
			when(query).then(function(results) {
				when(query.total).then(dfd.callback(function(count) {
					assert.strictEqual(results.length, 150, 'Default query should return all objects.');
					assert.strictEqual(results.length, count, 'Total should return an accurate count.');
				}), dfd.reject.bind(dfd));
			}, dfd.reject.bind(dfd));
		},
		'query override defaults': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: mapService,
				flatten: false,
				idProperty: 'CATEGORY',
				returnGeometry: false,
				outFields: ['CATEGORY']
			});

			var query = new Query();
			query.where = 'ESRI_OID IN (1, 2, 3)';
			query.outFields = ['ESRI_OID'];
			query.returnGeometry = true;

			// Test
			when(store.query(query)).then(dfd.callback(function(results) {
				assert.isUndefined(results[0].geometry, 'returnGeometry should not be overidden by query object');
				assert.isDefined(results[0].attributes.ESRI_OID, 'outFields should be overidden by query object');
				assert.strictEqual(results.length, 3, 'Query where property should be used');
			}), dfd.reject.bind(dfd));
		},
		'query options sort': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: mapService
			});

			var query = new Query();
			query.where = 'ESRI_OID IN (16, 5, 9, 13, 7)';

			var options = {
				sort: [{
					attribute: 'CATEGORY',
					descending: true
				}]
			};

			// Test
			when(store.query(query, options)).then(dfd.callback(function(results) {
				var isOrdered = array.every(results, function(result, i) {
					if (i) {
						return result.CATEGORY <= results[i - 1].CATEGORY;
					}
					return true;
				});
				assert.isTrue(isOrdered, 'Query should support sort options');
			}), dfd.reject.bind(dfd));
		},
		'query supported pagination': function() {
			// Setup
			var dfd = this.async(1000);

			var supportsPagination = lang.getObject('serviceDefinition.advancedQueryCapabilities.supportsPagination', false, MockFeatureService);
			lang.setObject('serviceDefinition.advancedQueryCapabilities.supportsPagination', true, MockFeatureService);

			var store = new ArcGISServerStore({
				url: featureService,
				idProperty: 'CATEGORY'
			});

			var query = new Query();
			var options = {
				start: 10,
				count: 25
			};

			// Test
			query = store.query(query, options);
			when(query).then(function(results) {
				when(query.total).then(dfd.callback(function(count) {
					var isOrdered = array.every(results, function(result, i) {
						if (i) {
							return result.CATEGORY >= results[i - 1].CATEGORY;
						}
						return true;
					});

					assert.isTrue(isOrdered, 'Paging results should sort by idProperty');
					assert.strictEqual(results.length, options.count, 'Paging results should return specified number of objects');
					assert.strictEqual(count, 150, 'Paging results should return correct total.');
				}), dfd.reject.bind(dfd));
			}, dfd.reject.bind(dfd));

			// Teardown
			MockFeatureService.serviceDefinition.advancedQueryCapabilities.supportsPagination = supportsPagination;
		},
		'query unsupported pagination': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: mapService
			});

			var query = new Query();
			query.where = 'ESRI_OID <= 100';
			var options = {
				start: 10,
				count: 35
			};

			// Test
			query = store.query(query, options);
			when(query).then(function(results) {
				when(query.total).then(dfd.callback(function(count) {
					assert.strictEqual(results[0].ESRI_OID, options.start + 1, 'Paging results should begin at specified start position.');
					assert.strictEqual(results.length, options.count, 'Paging results should return specified number of objects');
					assert.strictEqual(count, 100, 'Paging results should return correct total.');
				}));
			}, dfd.reject.bind(dfd));
		},
		'query unsupported pagination exceeded count': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: mapService
			});

			var query = new Query();
			query.orderByFields = ['ESRI_OID'];
			var options = {
				start: 10,
				count: 10000
			};

			var warn = console.warn;
			var warnings = [];
			console.warn = function() {
				array.forEach(arguments, function(arg) {
					warnings.push(arg);
				});
			};

			// Test
			when(store.query(query, options)).then(dfd.callback(function(results) {
				assert.sameMembers(warnings, ['Cannot return more than ' + MockFeatureService.serviceDefinition.maxRecordCount + ' items.'], 'Log warning message when paging count is to large');
				assert.strictEqual(results[0].ESRI_OID, options.start + 1, 'Paging results should begin at specified start position');

				// Fail if too many
				if (results.length > Math.min(options.count, MockMapService.serviceDefinition.maxRecordCount)) {
					assert.strictEqual(results.length, Math.min(options.count, MockMapService.serviceDefinition.maxRecordCount), 'Paging results should return specified number of objects');
				}
			}), dfd.reject.bind(dfd));

			// Teardown
			console.warn = warn;
		},
		'query object expression': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: mapService
			});

			var query = {
				DETAILS: 'Mocked',
				ESRI_OID: 3
			};

			var options = {
				start: Infinity,
				count: Infinity
			};

			// Test
			when(store.query(query, options)).then(dfd.callback(function(results) {
				var match = array.every(results, function(result) {
					for (var prop in query) {
						if (query[prop] !== result[prop]) {
							return false;
						}
					}
					return true;
				});
				assert.isTrue(match, 'Results attributes should match query attributes');
			}), dfd.reject.bind(dfd));
		}
	});

	registerSuite({
		name: 'transaction',
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
		'transaction no capability': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: mapService
			});

			var putObject = {
				ESRI_OID: 1,
				NAME: 'Put Object'
			};

			var addObject = {
				NAME: 'Add Object'
			};

			var oid = 1;

			// Test
			var transaction = store.transaction();
			var put = when(store.put(putObject));
			var add = when(store.add(addObject));
			var remove = when(store.remove(oid));
			put.then(dfd.reject.bind(dfd), function(putError) {
				add.then(dfd.reject.bind(dfd), function(addError) {
					remove.then(dfd.reject.bind(dfd), dfd.callback(function(removeError) {
						assert.instanceOf(putError, Error, 'Map service does not support Update capability. Should receive an error');
						assert.strictEqual(putError.message, 'Update not supported.', 'Should receive a custom error message');

						assert.instanceOf(addError, Error, 'Map service does not support Delete capability. Should receive an error');
						assert.strictEqual(addError.message, 'Add not supported.', 'Should receive a custom error message');

						assert.instanceOf(removeError, Error, 'Map service does not support Add capability. Should receive an error');
						assert.strictEqual(removeError.message, 'Remove not supported.', 'Should receive a custom error message');
					}));
				});
			});
			transaction.commit();
		},
		'transaction abort': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: featureService
			});

			var putObject = {
				ESRI_OID: 1,
				NAME: 'Put Object'
			};

			var addObject = {
				NAME: 'Add Object'
			};

			var oid = 1;

			// Test
			var transaction = store.transaction();
			var put = when(store.put(putObject));
			var add = when(store.add(addObject));
			var remove = when(store.remove(oid));
			put.then(dfd.reject.bind(dfd), function(putError) {
				add.then(dfd.reject.bind(dfd), function(addError) {
					remove.then(dfd.reject.bind(dfd), dfd.callback(function(removeError) {
						assert.strictEqual(putError, 'Transaction aborted.', 'Should receive a custom error message');

						assert.strictEqual(addError, 'Transaction aborted.', 'Should receive a custom error message');

						assert.strictEqual(removeError, 'Transaction aborted.', 'Should receive a custom error message');
					}));
				});
			});
			transaction.abort();
		},
		'transaction commit': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: featureService,
				returnGeometry: false
			});

			var putObject = {
				NAME: 'Put Object',
				ESRI_OID: 5,
				DETAILS: 'Something new'
			};

			var nextPutObject = {
				NAME: 'Put Object 2',
				ESRI_OID: 6,
				DETAILS: 'A second object, to check ordering'
			};

			var addObject = {
				NAME: 'Add Object',
				DETAILS: 'Mocking Add',
				CATEGORY: 4321
			};

			var oid = 1;

			// Test
			var transaction = store.transaction();
			var operationDfd = all({
				put: when(store.put(lang.clone(putObject))),
				add: when(store.add(lang.clone(addObject))),
				remove: when(store.remove(oid)),
				next: when(store.put(lang.clone(nextPutObject)))
			}).then(function(results) {
				addObject.ESRI_OID = results.add;
				return all({
					put: when(store.get(results.put)),
					add: when(store.get(results.add)),
					remove: when(store.get(oid)),
					next: when(store.get(results.next))
				}).then(function(getResults) {
					return {
						results: results,
						getResults: getResults
					};
				}, dfd.reject.bind(dfd));
			}, dfd.reject.bind(dfd));
			var transactionDfd = transaction.commit();

			all([operationDfd, transactionDfd]).then(dfd.callback(function(resultsList) {
				// Ensure that the inividual operations are successful and return correct results
				var results = resultsList[0].results;
				var getResults = resultsList[0].getResults;
				var transactionResults = resultsList[1];

				var updated = getResults.put;
				assert.isDefined(updated.CATEGORY, 'Put should only overwrite fields.');
				assert.deepEqual(updated, lang.mixin(lang.clone(updated), putObject), 'Put should update object with values.');

				var added = getResults.add;
				assert.isObject(added, 'Object should be added to store');
				assert.strictEqual(results.add, store.getIdentity(added), 'Add should return new id');
				assert.deepEqual(added, addObject, 'Object should be added to store without modifying properties');

				var removed = getResults.remove;
				assert.isTrue(results.remove, 'Existing id should remove successfully.');
				assert.isUndefined(removed, 'Removed id should no longer exist in store.');

				var next = getResults.next;
				assert.isDefined(next.CATEGORY, 'Put should only overwrite fields.');
				assert.deepEqual(next, lang.mixin(lang.clone(next), nextPutObject), 'Put should update object with values.');

				// Ensure that transaction commit results are correct
				assert.isObject(transactionResults, 'Commit should return an object with results.');
				assert.isDefined(transactionResults.put, 'Commit should return puts with results');
				assert.equal(transactionResults.put[0], store.getIdentity(updated), 'Commit should return put ids');
				assert.equal(transactionResults.put[1], store.getIdentity(nextPutObject), 'Commit should return put ids in order');

				assert.isDefined(transactionResults.add, 'Commit should return adds with results');
				assert.equal(transactionResults.add[0], store.getIdentity(added), 'Commit should return add ids');

				assert.isDefined(transactionResults.remove, 'Commit should return removes with results');
				assert.equal(transactionResults.remove[0], oid, 'Commit should return remove ids');
			}), dfd.reject.bind(dfd));
		},
		'multiple transactions': function() {
			// Setup
			var dfd = this.async(1000);

			var store = new ArcGISServerStore({
				url: featureService,
				idProperty: 'NAME',
				returnGeometry: false
			});

			var putObject = {
				NAME: 'Mock Test Point 1',
				ESRI_OID: 1,
				DETAILS: 'Something new'
			};

			var addObject = {
				NAME: 'custID-1234',
				DETAILS: 'Mocking Add',
				CATEGORY: 0
			};

			var removeId = 'Mock Test Point 2';

			// Test
			var transaction = store.transaction();
			all({
				put: when(store.put(lang.clone(putObject))),
				add: when(store.add(lang.clone(addObject))),
				remove: when(store.remove(removeId))
			}).then(function(results) {
				addObject[store.idProperty] = results.add;
				all({
					put: when(store.get(results.put)),
					add: when(store.get(results.add)),
					remove: when(store.get(removeId))
				}).then(dfd.callback(function(getResults) {
					var updated = getResults.put;
					assert.isDefined(updated.CATEGORY, 'Put should only overwrite fields.');
					assert.deepEqual(updated, lang.mixin(lang.clone(updated), putObject), 'Put should update object with values.');

					var added = getResults.add;
					delete added.ESRI_OID;
					assert.isObject(added, 'Object should be added to store');
					assert.strictEqual(results.add, store.getIdentity(added), 'Add should return new id');
					assert.deepEqual(added, addObject, 'Object should be added to store without modifying properties');

					var removed = getResults.remove;
					assert.isTrue(results.remove, 'Existing id should remove successfully.');
					assert.isUndefined(removed, 'Removed id should no longer exist in store.');
				}), dfd.reject.bind(dfd));
			}, dfd.reject.bind(dfd));
			var otherTransaction = store.transaction();
			store.add(lang.clone(addObject));
			store.put({failure: true});
			otherTransaction.commit();
			transaction.commit();
		}
	});
});
