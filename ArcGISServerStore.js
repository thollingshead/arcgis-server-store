define([
	'dojo/_base/array',
	'dojo/_base/declare',
	'dojo/_base/lang',

	'dojo/Deferred',
	'dojo/store/util/QueryResults',
	'dojo/when',

	'esri/request',
	'esri/tasks/query'
], function(
	array, declare, lang,
	Deferred, QueryResults, when,
	esriRequest, Query
) {

	var _loadDfd;
	var _loadWrapper = function(callback, context) {
		return function() {
			var args = arguments;
			return _loadDfd.then(function() {
				return callback.apply(context, args);
			});
		};
	};

	var _loadQueryWrapper = function(callback, context) {
		return function() {
			var dfd = new Deferred();
			dfd.total = new Deferred();

			var args = arguments;
			_loadDfd.then(function() {
				try {
					var callbackDfd = callback.apply(context, args);
					callbackDfd.then(dfd.resolve, dfd.reject);
					callbackDfd.total.then(dfd.total.resolve, dfd.total.reject);
				} catch (e) {
					dfd.reject(e);
					dfd.total.reject(e);
				}
			});

			return QueryResults(dfd); // jshint ignore:line
		};
	};

	return declare(null, {
		/**
		 * Identity property. Values should be unique
		 * @type {String}
		 */
		idProperty: 'OBJECTID',

		/**
		 * Flatten attributes to top-level object
		 * @type {Boolean}
		 */
		flatten: true,
		/**
		 * Include geometry in data
		 * @type {Boolean}
		 */
		returnGeometry: true,

		constructor: function(options) {
			// Initialize outFields
			this.outFields = ['*'];

			// Mixin Options
			declare.safeMixin(this, options);

			// Initialize Capabilities
			this.capabilities = {
				Data: false,
				Query: false,
				Create: false,
				Delete: false,
				Update: false,
				Editing: false
			};

			// Get Service Info
			if (this.url) {
				_loadDfd = esriRequest({
					url: this.url,
					content: {
						f: 'json'
					},
					handleAs: 'json'
				}).then(lang.hitch(this, '_initStore'), function(error) {
					throw new Error('Invalid url. Cannot create store.');
				});
			} else {
				throw new Error('Missing required property: \'url\'.');
			}

			// Wrap functions until loaded
			var get = this.get;
			var add = this.add;
			var put = this.put;
			var remove = this.remove;
			var query = this.query;

			_loadDfd.then(lang.hitch(this, function() {
				this.get = get;
				this.add = add;
				this.put = put;
				this.remove = remove;
				this.query = query;
			}));

			this.get = _loadWrapper(this.get, this);
			this.add = _loadWrapper(this.add, this);
			this.put = _loadWrapper(this.put, this);
			this.remove = _loadWrapper(this.remove, this);
			this.query = _loadQueryWrapper(this.query, this);
		},
		/**
		 * Retrieves and object by its identity
		 * @param  {Number} id The identity to use to lookup the object
		 * @return {Object}
		 */
		get: function(id) {
			if (this._serviceInfo.templates ? !this.capabilities.Query : !this.capabilities.Data) {
				throw new Error('Get not supported.');
			} else {
				var query = new Query();
				query.outFields = this.outFields;
				query.returnGeometry = this.returnGeometry;

				if (typeof id === 'string') {
					query.where = this.idProperty + ' = \'' + id + '\'';
				} else {
					query.where = this.idProperty + ' = ' + id;
				}

				return esriRequest({
					url: this.url + '/query',
					content: lang.mixin(query.toJson(), {
						f: 'json'
					}),
					handleAs: 'json'
				}).then(lang.hitch(this, function(featureSet) {
					if (featureSet.features && featureSet.features.length) {
						return this.flatten ? this._flatten(featureSet.features[0]) : featureSet.features[0];
					} else {
						return undefined;
					}
				}));
			}
		},
		/**
		 * Return an object's identity
		 * @param  {Object} object The object to get the identity from
		 * @return {Number|String}
		 */
		getIdentity: function(object) {
			return this.flatten ? object[this.idProperty] : lang.getObject('attributes.' + this.idProperty, false, object);
		},
		/**
		 * Stores an object
		 * @param  {Object} object     The object to store.
		 * @param  {Object} options    Additional options for storing objects
		 * @return {Number}
		 */
		put: function(object, options) {
			options = options || {};
			var id = ('id' in options) ? options.id : this.getIdentity(object);
			if (typeof id !== 'undefined' && options.overwrite !== false) {
				var dfd = new Deferred();
				when(options.overwrite || this.get(id)).then(lang.hitch(this, function(existing) {
					if (existing) {
						if (this.capabilities.Update) {
							object = this._unflatten(object);
							lang.setObject('attributes.' + this.idProperty, id, object);
							esriRequest({
								url: this.url + '/updateFeatures',
								content: {
									f: 'json',
									features: JSON.stringify([object])
								},
								handleAs: 'json'
							}, {
								usePost: true
							}).then(function(response) {
								if (response.updateResults && response.updateResults.length) {
									dfd.resolve(response.updateResults[0].success ? response.updateResults[0].objectId : undefined);
								}
							}, dfd.reject);
						} else {
							dfd.reject(new Error('Update not supported.'));
						}
					} else {
						when(this.add(object, options)).then(dfd.resolve, dfd.reject);
					}
				}));
				return dfd.promise;
			} else if (options.overwrite) {
				throw new Error('Cannot update object with no id.');
			} else {
				return this.add(object, options);
			}
		},
		/**
		 * Creates an object, throws an error if the object already exists
		 * @param {Object} object     The object to store.
		 * @param {Object} options    Additional options for creating objects
		 * @return {Number}
		 */
		add: function(object, options) {
			options = options || {};
			if (this.capabilities.Create) {
				var id = ('id' in options) ? options.id : this.getIdentity(object);
				object = this._unflatten(object);
				object.attributes[this.idProperty] = id;

				if (typeof id != 'undefined' && this.idProperty === this._serviceInfo.objectIdField) {
					console.warn('Cannot set id on new object.');
				}

				return esriRequest({
					url: this.url + '/addFeatures',
					content: {
						f: 'json',
						features: JSON.stringify([object])
					},
					handleAs: 'json'
				}, {
					usePost: true
				}).then(lang.hitch(this, function(response) {
					if (response.addResults && response.addResults.length) {
						if (this.idProperty === this._serviceInfo.objectIdField) {
							return response.addResults[0].success ? response.addResults[0].objectId : undefined;
						} else {
							return response.addResults[0].success ? id : undefined;
						}
					}
				}));
			} else {
				throw new Error('Add not supported.');
			}
		},
		/**
		 * Deletes an object by its identity
		 * @param  {Number} id The identity to use to delete the object
		 */
		remove: function(id) {
			if (this.capabilities.Delete) {
				var where = '';
				if (typeof id === 'string') {
					where = this.idProperty + ' = \'' + id + '\'';
				} else if (typeof id !== 'undefined') {
					where = this.idProperty + ' = ' + id;
				}

				return esriRequest({
					url: this.url + '/deleteFeatures',
					content: {
						f: 'json',
						where: where
					},
					handleAs: 'json'
				}, {
					usePost: true
				}).then(function(response) {
					return !!(response && response.success);
				});
			} else {
				throw new Error('Remove not supported.');
			}
		},
		/**
		 * Queries the store for objects. This does not alter the store, but returns
		 * a set of data from the store.
		 * @param  {String|Object|Function} query   The query to use for retrieving objects from the store
		 * @param  {Object} options                 Optional arguments to apply to the result set
		 * @return {Object}                         The results of the query, extended with iterative methods.
		 */
		query: function(query, options) {
			query = lang.mixin(new Query(), query);
			options = options || {};

			if (this._serviceInfo.templates ? !this.capabilities.Query : !this.capabilities.Data) {
				throw new Error('Query not supported.');
			} else {
				// Default Query Parameters
				query.where = query.where || '1=1';
				query.outFields = query.outFields || this.outFields;
				query.returnGeometry = this.returnGeometry;

				// Include Options
				if (options.sort) {
					query.orderByFields = array.map(options.sort, function(sortInfo) {
						return sortInfo.descending ? sortInfo.attribute + ' DESC' : sortInfo.attribute;
					});
				}

				var paginate = false;
				options.start = options.start || 0;
				options.count = options.count || 0;
				if (options.start > 0 || options.count > 0) {
					if (options.count > this._serviceInfo.maxRecordCount) {
						console.warn('Cannot return more than ' + this._serviceInfo.maxRecordCount + ' items.');
					}

					if (lang.getObject('_serviceInfo.advancedQueryCapabilities.supportsPagination', false, this)) {
						query.start = options.start;
						query.num = options.count;

						if (!query.orderByFields || query.orderByFields.length < 1) {
							query.orderByFields = [this.idProperty];
						}
					} else {
						paginate = true;
					}
				}

				// Peform Query
				var dfd = new Deferred();
				if (paginate && options.start + options.count > this._serviceInfo.maxRecordCount) {
					dfd.total = esriRequest({
						url: this.url + '/query',
						content: lang.mixin(query.toJson(), {
							returnIdsOnly: true,
							f: 'json'
						}),
						handleAs: 'json'
					}).then(lang.hitch(this, function(response) {
						if (response.objectIds) {
							query.where = '';
							query.objectIds = response.objectIds.slice(options.start, options.start + options.count);
							esriRequest({
								url: this.url + '/query',
								content: lang.mixin(query.toJson(), {
									f: 'json'
								}),
								handleAs: 'json'
							}).then(lang.hitch(this, function(featureSet) {
								if (this.flatten) {
									featureSet.features = array.map(featureSet.features, lang.hitch(this, function(feature) {
										return this._flatten(feature);
									}));
								}
								dfd.resolve(featureSet.features);
							}), dfd.reject);

							return response.objectIds.length;
						} else {
							dfd.reject(response);
						}
					}), dfd.reject);
				} else {
					esriRequest({
						url: this.url + '/query',
						content: lang.mixin(query.toJson(), {
							f: 'json'
						}),
						handleAs: 'json'
					}).then(lang.hitch(this, function(featureSet) {
						if (paginate) {
							featureSet.features = featureSet.features.slice(options.start, options.start + options.count);
						}

						if (this.flatten) {
							featureSet.features = array.map(featureSet.features, lang.hitch(this, function(feature) {
								return this._flatten(feature);
							}));
						}

						dfd.resolve(featureSet.features);
					}), dfd.reject);

					dfd.total = esriRequest({
						url: this.url + '/query',
						content: lang.mixin(query.toJson(), {
							returnCountOnly: true,
							f: 'json'
						}),
						handleAs: 'json'
					}).then(function(response) {
						return response.count;
					});
				}

				return QueryResults(dfd); // jshint ignore:line
			}
		},
		/**
		 * Starts a new transaction.
		 * @return {Object}
		 */
		transaction: function() {

		},
		/**
		 * Retrieves the children of an object
		 * @param  {Object} parent  The object of which to find children.
		 * @param  {Object} options Additional options to apply to the retrieval of the children.
		 * @return {Object}         A result set of the children of the parent object.
		 */
		getChildren: function(parent, options) {

		},
		/**
		 * Returns any metadata about the object. This may include attribution,
		 * cache directives, history, or version information.
		 * @param  {Object} object The object for which to return metadata.
		 * @return {Object}
		 */
		getMetadata: function(object) {

		},
		/**
		 * Flatten attributes to top-level object
		 * @param  {Object} object Object to flatten
		 * @return {Object}        Flattened object
		 */
		_flatten: function(object) {
			if (object.attributes) {
				object = lang.mixin(object, object.attributes);
				delete object.attributes;
			}

			return object;
		},
		/**
		 * Unflatten attributes to ArcGIS Server structure
		 * @param  {Object} object Object to unflatten
		 * @return {Object}        Unflattened object
		 */
		_unflatten: function(object) {
			var field, fields;

			if (this.outFields.length && this.outFields[0] !== '*') {
				fields = this.outFields;
			} else {
				fields = array.map(this._serviceInfo.fields, function(field) {
					return field.name;
				});
			}

			for (field in object) {
				if (object.hasOwnProperty(field) && array.indexOf(fields, field) !== -1) {
					lang.setObject('attributes.' + field, object[field], object);
					delete object[field];
				}
			}

			return object;
		},
		/**
		 * Initializes store with ArcGIS service information
		 * @param  {Object} serviceInfo service information
		 */
		_initStore: function(serviceInfo) {
			// Validate idProperty
			var validIdProperty = false;
			if (this.idProperty) {
				validIdProperty = array.some(serviceInfo.fields, lang.hitch(this, function(field) {
					return field.name === this.idProperty;
				}));
			}
			if (!validIdProperty) {
				if (serviceInfo.objectIdField) {
					this.idProperty = serviceInfo.objectIdField;
				} else {
					array.some(serviceInfo.fields, lang.hitch(this, function(field) {
						if (field.type === 'esriFieldTypeOID') {
							this.idProperty = field.name;
						}
					}));
				}
			}

			// Validate outFields
			if (this.outFields.length && this.outFields[0] !== '*') {
				this.outFields = array.filter(this.outFields, function(fieldName) {
					return array.some(serviceInfo.fields, function(field) {
						return field.name === fieldName;
					});
				});

				// Add idProperty
				if (array.indexOf(this.outFields, this.idProperty) === -1) {
					this.outFields.push(this.idProperty);
				}
			} else {
				this.outFields = ['*'];
			}

			// Capabilities
			if (serviceInfo.capabilities) {
				var capabilities = serviceInfo.capabilities.split(',');
				array.forEach(capabilities, lang.hitch(this, function(capability) {
					this.capabilities[capability] = true;
				}));
			}

			// Save service info
			this._serviceInfo = serviceInfo;

			// Set loaded
			this._loaded = true;
		}
	});
});