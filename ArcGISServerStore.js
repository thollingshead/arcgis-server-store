define([
	'dojo/_base/array',
	'dojo/_base/declare',
	'dojo/_base/lang',

	'dojo/Deferred',
	'dojo/Evented',
	'dojo/promise/all',
	'dojo/store/util/QueryResults',
	'dojo/when',

	'esri/request',
	'esri/tasks/query'
], function(
	array, declare, lang,
	Deferred, Evented, all, QueryResults, when,
	esriRequest, Query
) {

	/**
	 * Waits until promise is resolved to execute callback.
	 * This function is used to delay store operations until the initial load
	 * is complete.
	 * @param  {Promise}  promise  The promise on which to wait
	 * @param  {Function} callback The function to execute
	 * @param  {Object}   context  The executing context for the callback function
	 * @return {Function}
	 */
	var _loadWrapper = function(promise, callback, context) {
		return function() {
			var args = arguments;

			// If in 'transaction mode', add transaction object to options argument
			if (context._transaction) {
				args[1] = lang.mixin({_transaction: context._transaction}, args[1]);
				args.length = Math.max(args.length, 2);
			}

			// Wait until promise has resolved
			return promise.then(function() {
				// Execute callback with proper context and arguments
				return callback.apply(context, args);
			});
		};
	};

	/**
	 * Waits until promise is resolved to execute callback (query).
	 * This function is used to delay the query opertion until the initial load
	 * is complete.
	 * @param  {Promise}  promise  The promise on which to wait
	 * @param  {Function} callback The query function to execute
	 * @param  {Object}   context  The executing context for the callback function
	 * @return {Function}
	 */
	var _loadQueryWrapper = function(promise, callback, context) {
		return function() {
			var args = arguments;

			// Create parent deferreds to return
			var dfd = new Deferred();
			dfd.total = new Deferred();

			// Wait until promise has resolved
			promise.then(function() {
				try {
					// Execute callback with proper context and arguments
					var callbackDfd = callback.apply(context, args);
					// Resolve parent deferreds when callback has resolved
					callbackDfd.then(dfd.resolve, dfd.reject);
					callbackDfd.total.then(dfd.total.resolve, dfd.total.reject);
				} catch (e) {
					// Reject parent deferred on error
					dfd.reject(e);
					dfd.total.reject(e);
				}
			});

			return QueryResults(dfd); // jshint ignore:line
		};
	};

	/**
	 * Waits until promise is resolved to execute callback (transaction).
	 * This function is used to delay the transaction operations until the initial
	 * load is complete.
	 * @param  {Promise}  promise  The promise on which to wait
	 * @param  {Function} callback The store transaction function
	 * @param  {Object}   context  The executing context for the callback function
	 * @return {Object}
	 */
	var _loadTransactionWrapper = function(promise, callback, context) {
		return function() {
			// Execute callback to create transaction on store
			callback.apply(context, arguments);

			// Return transaction methods that perform cleanup immediately, but wait
			// for promise to resolve before executing abort/commit
			return {
				commit: cleanup(function() {
					var transaction = this;
					return promise.then(function() {
						return commit.apply(transaction);
					});
				}, context, context._transaction),
				abort: cleanup(function() {
					var transaction = this;
					return promise.then(function() {
						return abort.apply(transaction);
					});
				}, context, context._transaction)
			};
		};
	};

	/**
	 * Sorts transaction operations by index
	 */
	var sortOperations = function(a, b) {
		return a.index - b.index;
	};

	/**
	 * Aborts the transaction
	 * @param  {String} message Custom abort message
	 * @return {Promise}
	 */
	var abort = function(message) {
		var dfd = new Deferred();

		if (this._aborted) {
			// Transaction has been previously aborted
			dfd.cancel('Transaction aborted.');
		} else if (this._committed) {
			// Transaction has been previously commited
			dfd.reject('Transaction committed.');
		} else {
			// Mark transcation as aborted
			this._aborted = true;

			// Cancel each operation in transaction
			var operations = [].concat(this._promises, this.puts, this.adds, this.removes);
			array.forEach(operations, function(operation) {
				if (operation) {
					operation = operation.deferred || operation;
					if (lang.isFunction(operation.cancel)) {
						operation.cancel(message || 'Transaction aborted.');
					}
				}
			});

			// Abort successful
			dfd.resolve();
		}
		return dfd.promise;
	};

	/**
	 * Commits the transaction
	 * @return {Promise}
	 */
	var commit = function() {
		var dfd = new Deferred();

		if (this._aborted) {
			// Transaction has been previously aborted
			dfd.reject('Transaction aborted.');
		} else if (this._committed) {
			// Transaction has been previously committed
			dfd.cancel('Transaction committed.');
		} else {
			// Mark transaction as committed
			this._committed = true;

			// Wait for all transaction promises
			return all(this._promises || []).then(lang.hitch(this, function() {
				// Gather features and ids for commit
				var puts = array.map(this.puts.sort(sortOperations) || [], function(put) {
					return put.feature;
				});
				var adds = array.map(this.adds.sort(sortOperations) || [], function(add) {
					return add.feature;
				});
				var removes = [];
				array.forEach(this.removes.sort(sortOperations) || [], function(remove) {
					removes = removes.concat(remove.ids);
				});

				// Make /applyEdits request with updates/adds/removes
				return esriRequest({
					url: this._store.url + '/applyEdits',
					content: {
						f: 'json',
						updates: JSON.stringify(puts),
						adds: JSON.stringify(adds),
						deletes: removes.join(',')
					},
					handleAs: 'json',
					callbackParamName: 'callback'
				}, {
					usePost: true
				}).then(lang.hitch(this, function(response) {
					var result = {};

					// Resolve/reject put deferreds with store id
					result.put = array.map(this.puts, lang.hitch(this, function(put, i) {
						var id;
						var updateResult = response.updateResults[i];
						if (updateResult.success) {
							if (this._store.idProperty === this._store._serviceInfo.objectIdField) {
								id = updateResult.objectId;
							} else {
								id = put.id;
							}
							put.deferred.resolve(id);
						} else {
							put.deferred.reject();
						}
						return id;
					}));

					// Resolve/reject add deferreds with store id or null
					result.add = array.map(this.adds, lang.hitch(this, function(add, i) {
						var id;
						var addResult = response.addResults[i];
						if (addResult.success) {
							if (this._store.idProperty === this._store._serviceInfo.objectIdField) {
								id = addResult.objectId;
							} else {
								id = typeof add.id != 'undefined' ? add.id : null;
							}
							add.deferred.resolve(id);
						} else {
							add.deferred.reject();
						}
						return id;
					}));

					// Resolve/reject remove deferreds with boolean
					result.remove = array.map(this.removes, function(remove) {
						// Filter successfuly removed ids from list
						remove.ids = array.filter(remove.ids, function(id) {
							var success = array.some(response.deleteResults, function(deleteResult) {
								return deleteResult.objectId === id && deleteResult.success;
							});
							return !success;
						});

						if (!remove.ids.length) {
							// Resolve if no unsuccessful removes
							remove.deferred.resolve(true);
							return remove.id;
						} else {
							// Reject if there were unsuccessful removes
							remove.deferred.reject();
							return undefined;
						}
					});

					return result;
				}), lang.hitch(this, function(error) {
					// Commit failed. Abort transaction
					this._committed = false;
					abort.apply(this, arguments);
				}));
			}), lang.hitch(this, function() {
				// Transaction promises failed. Abort transaction
				this._committed = false;
				abort.apply(this, arguments);
			}));
		}
		return dfd.promise;
	};

	/**
	 * Exit 'transaction mode'
	 * @param  {Function} action    The transaction abort/commit function
	 * @param  {Object} store       The ArcGISServerStore instance
	 * @param  {Object} transaction The transaction object
	 * @return {Function}
	 */
	var cleanup = function(action, store, transaction) {
		return function() {
			// Remove transaction from store
			if (store._transaction === transaction) {
				delete store._transaction;
			}

			// Execute the abort/commit
			return action.apply(transaction);
		};
	};

	return declare([Evented], {
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
				var loadPromise = esriRequest({
					url: this.url,
					content: {
						f: 'json'
					},
					handleAs: 'json',
					callbackParamName: 'callback'
				}).then(lang.hitch(this, '_initStore'));
			} else {
				var errorObject = new Error('Missing required property: \'url\'.');

				// Fire error event
				this.emit('error', errorObject);

				throw errorObject;
			}

			// Wrap functions until loaded
			var get = this.get;
			var add = this.add;
			var put = this.put;
			var remove = this.remove;
			var query = this.query;
			var transaction = this.transaction;

			loadPromise.then(lang.hitch(this, function() {
				this.get = get;
				this.add = add;
				this.put = put;
				this.remove = remove;
				this.query = query;
				this.transaction = transaction;
			}));

			this.get = _loadWrapper(loadPromise, this.get, this);
			this.add = _loadWrapper(loadPromise, this.add, this);
			this.put = _loadWrapper(loadPromise, this.put, this);
			this.remove = _loadWrapper(loadPromise, this.remove, this);
			this.query = _loadQueryWrapper(loadPromise, this.query, this);
			this.transaction = _loadTransactionWrapper(loadPromise, this.transaction, this);
		},
		/**
		 * Retrieves and object by its identity
		 * @param  {Number|String} id The identity to use to lookup the object
		 * @return {Object}
		 */
		get: function(id) {
			if (this._serviceInfo.templates ? !this.capabilities.Query : !this.capabilities.Data) {
				// Throw error if query not supported by service
				throw new Error('Get not supported.');
			} else {
				// Build query object
				var query = new Query();
				query.outFields = this.outFields;
				query.returnGeometry = this.returnGeometry;

				if (typeof id === 'string') {
					query.where = this.idProperty + ' = \'' + id + '\'';
				} else {
					query.where = this.idProperty + ' = ' + id;
				}

				// Make /query request for feature
				return esriRequest({
					url: this.url + '/query',
					content: lang.mixin(query.toJson(), {
						f: 'json'
					}),
					handleAs: 'json',
					callbackParamName: 'callback'
				}).then(lang.hitch(this, function(featureSet) {
					// Return first feature
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
			// Find id from options or object
			options = options || {};
			var id = ('id' in options) ? options.id : this.getIdentity(object);

			if (typeof id !== 'undefined' && options.overwrite !== false) {
				// Overwrite is not disabled and id is found
				var dfd = new Deferred();

				// Check for valid id or forced overwrite
				var promise = when(options.overwrite || this.get(id));

				// If in 'transaction mode', add check to transaction object
				var transaction = options._transaction || this._transaction;
				if (transaction) {
					var transactionIndex = transaction._index++;
					transaction._promises.push(promise);
				}

				promise.then(lang.hitch(this, function(existing) {
					if (existing) {
						// Valid id or forced overwrite
						if (!this.capabilities.Update) {
							// Throw error if update not supported by service
							dfd.reject(new Error('Update not supported.'));
						} else {
							// Prepare object for update request
							object = this._unflatten(lang.clone(object));
							lang.setObject('attributes.' + this.idProperty, id, object);

							if (transaction) {
								// If in 'transaction mode', add operation to transaction object
								transaction.puts.push({
									index: transactionIndex,
									id: id,
									deferred: dfd,
									feature: object
								});
							} else {
								// Make /updateFeatures request with update feature
								esriRequest({
									url: this.url + '/updateFeatures',
									content: {
										f: 'json',
										features: JSON.stringify([object])
									},
									handleAs: 'json',
									callbackParamName: 'callback'
								}, {
									usePost: true
								}).then(lang.hitch(this, function(response) {
									// Resolve deferred with store id
									if (response.updateResults && response.updateResults.length) {
										if (this.idProperty === this._serviceInfo.objectIdField) {
											dfd.resolve(response.updateResults[0].success ? response.updateResults[0].objectId : undefined);
										} else {
											dfd.resolve(response.updateResults[0].success ? id : undefined);
										}
									}
								}), dfd.reject);
							}
						}
					} else {
						// Invalid (non-existent) id
						// If in 'transaction mode', add transaction object to options
						if (transaction && !options._transaction) {
							options = lang.clone(options);
							options._transaction = transaction;
						}
						// Perform add
						when(this.add(object, options)).then(dfd.resolve, dfd.reject);
					}
				}));
				return dfd.promise;

			} else if (options.overwrite) {
				// Throw error if overwrite is true and no id is found
				throw new Error('Cannot update object with no id.');
			} else {
				// Perform add if overwrite is not true and/or no id is found
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
			if (!this.capabilities.Create) {
				// Throw error if add not supported by service
				throw new Error('Add not supported.');
			} else {
				var dfd = new Deferred();
				// Find id from options or object
				var id = ('id' in options) ? options.id : this.getIdentity(object);
				if (typeof id != 'undefined' && this.idProperty === this._serviceInfo.objectIdField) {
					console.warn('Cannot set id on new object.');
					id = undefined;
				}

				// Prepare object for add request
				var clone = this._unflatten(lang.clone(object));
				lang.setObject('attributes.' + this.idProperty, id, clone);

				var transaction = options._transaction || this._transaction;
				if (transaction) {
					// If in 'transaction mode', add operation to transaction object
					transaction.adds.push({
						index: transaction._index++,
						id: id,
						deferred: dfd,
						feature: clone
					});
				} else {
					// Make /addFeatures request with add feature
					esriRequest({
						url: this.url + '/addFeatures',
						content: {
							f: 'json',
							features: JSON.stringify([clone])
						},
						handleAs: 'json',
						callbackParamName: 'callback'
					}, {
						usePost: true
					}).then(lang.hitch(this, function(response) {
						// Resolve deferred with store id
						if (response.addResults && response.addResults.length) {
							if (this.idProperty === this._serviceInfo.objectIdField) {
								var oid = response.addResults[0].success ? response.addResults[0].objectId : undefined;
								// Update object with id
								lang.setObject((this.flatten ? '' : 'attributes.') + this.idProperty, oid, object);
								dfd.resolve(oid);
							} else {
								dfd.resolve(response.addResults[0].success ? id : undefined);
							}
						}
					}), dfd.reject);
				}

				return dfd.promise;
			}
		},
		/**
		 * Deletes an object by its identity
		 * @param  {Number|String} id The identity to use to delete the object
		 */
		remove: function(id, options) {
			options = options || {};
			if (!this.capabilities.Delete) {
				// Throw error if delete not supported by service
				throw new Error('Remove not supported.');
			} else {
				var dfd = new Deferred();

				// Create where clause to select features by id
				var where = '';
				if (typeof id === 'string') {
					where = this.idProperty + ' = \'' + id + '\'';
				} else if (typeof id !== 'undefined') {
					where = this.idProperty + ' = ' + id;
				}

				var transaction = options._transaction || this._transaction;
				if (transaction) {
					var transactionIndex = transaction._index++;
					// If in 'transaction mode', add operation to transaction object
					if (this.idProperty === this._serviceInfo.objectIdField) {
						transaction.removes.push({
							index: transactionIndex,
							id: id,
							deferred: dfd,
							ids: [id]
						});
					} else {
						// Query for service objectids of matching features
						var promise = esriRequest({
							url: this.url + '/query',
							content: {
								f: 'json',
								where: where,
								returnIdsOnly: true
							},
							handleAs: 'json',
							callbackParamaName: 'callback'
						}).then(lang.hitch(this, function(response) {
							// Add operation using service objectids to transaction object
							if (response.objectIds) {
								transaction.removes.push({
									index: transactionIndex,
									id: id,
									deferred: dfd,
									ids: response.objectIds
								});
							}
						}), dfd.reject);
						// Add query for service objectids to transaction object
						transaction._promises.push(promise);
					}
				} else {
					// Make /deleteFeatures request with where clause
					esriRequest({
						url: this.url + '/deleteFeatures',
						content: {
							f: 'json',
							where: where
						},
						handleAs: 'json',
						callbackParamName: 'callback'
					}, {
						usePost: true
					}).then(function(response) {
						// Resolve deferred with boolean
						dfd.resolve(!!(response && response.success));
					}, dfd.reject);
				}

				return dfd.promise;
			}
		},
		/**
		 * Queries the store for objects. This does not alter the store, but returns
		 * a set of data from the store.
		 * @param  {Object} query         The query to use for retrieving objects from the store
		 * @param  {Object} options        Optional arguments to apply to the result set
		 * @return {Object}                The results of the query, extended with iterative methods.
		 */
		query: function(query, options) {
			options = options || {};

			// Convert object to Query
			query = (query instanceof Query) ? query : this._objectToQuery(query);

			if (this._serviceInfo.templates ? !this.capabilities.Query : !this.capabilities.Data) {
				// Throw error if query not supported by service
				throw new Error('Query not supported.');
			} else {
				var dfd = new Deferred();

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

				// Configure pagination
				var paginate = false;
				options.start = isFinite(options.start) ? options.start : 0;
				options.count = isFinite(options.count) ? options.count : 0;
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
				if (paginate && options.start + options.count > this._serviceInfo.maxRecordCount) {
					// Must paginate manually... request all objectids
					dfd.total = esriRequest({
						url: this.url + '/query',
						content: lang.mixin(query.toJson(), {
							orderByFields: '',
							returnIdsOnly: true,
							f: 'json'
						}),
						handleAs: 'json',
						callbackParamName: 'callback'
					}).then(lang.hitch(this, function(response) {
						if (response.objectIds) {
							// Paginate using objectIds
							query.where = '';
							query.objectIds = response.objectIds.slice(options.start, options.start + options.count);

							// Make /query request with objectIds for pagination
							esriRequest({
								url: this.url + '/query',
								content: lang.mixin(query.toJson(), {
									f: 'json'
								}),
								handleAs: 'json',
								callbackParamName: 'callback'
							}).then(lang.hitch(this, function(featureSet) {
								// Resolve deferred with features
								if (this.flatten) {
									featureSet.features = array.map(featureSet.features, lang.hitch(this, function(feature) {
										return this._flatten(feature);
									}));
								}
								dfd.resolve(featureSet.features);
							}), dfd.reject);

							// Resolve deferred.total with total count
							return response.objectIds.length;
						} else {
							dfd.reject(response);
						}
					}), dfd.reject);
				} else {
					// Make /query request
					esriRequest({
						url: this.url + '/query',
						content: lang.mixin(query.toJson(), {
							f: 'json'
						}),
						handleAs: 'json',
						callbackParamName: 'callback'
					}).then(lang.hitch(this, function(featureSet) {
						// Pagination not handled by query, paginate manually
						if (paginate) {
							featureSet.features = featureSet.features.slice(options.start, options.start + options.count);
						}

						if (this.flatten) {
							featureSet.features = array.map(featureSet.features, lang.hitch(this, function(feature) {
								return this._flatten(feature);
							}));
						}

						// Resolve deferred with features
						dfd.resolve(featureSet.features);
					}), dfd.reject);

					// Make /query request for total count
					dfd.total = esriRequest({
						url: this.url + '/query',
						content: lang.mixin(query.toJson(), {
							orderByFields: undefined,
							resultOffset: undefined,
							resultRecordCount: undefined,
							returnCountOnly: true,
							f: 'json'
						}),
						handleAs: 'json',
						callbackParamName: 'callback'
					}).then(function(response) {
						return response.count;
					});
				}

				return QueryResults(dfd); // jshint ignore:line
			}
		},
		/**
		 * Starts a new transaction.
		 * @return {Object}    Store transaction
		 */
		transaction: function() {
			var transaction = {
				_index: 0,
				_store: this,
				_promises: [],
				puts: [],
				adds: [],
				removes: []
			};

			this._transaction = transaction;

			return {
				commit: cleanup(commit, this, transaction),
				abort: cleanup(abort, this, transaction)
			};
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

			// Find outFields field names
			if (this.outFields.length && this.outFields[0] !== '*') {
				fields = this.outFields;
			} else {
				fields = array.map(this._serviceInfo.fields, function(field) {
					return field.name;
				});
			}

			// Move fields to attributes object
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

			// Fire load event
			this.emit('load', this);
		},
		/**
		 * Parses an object hash to a SQL where clause
		 * @param  {Object} object Object hash
		 * @return {Object}        Query object with where clause
		 */
		_objectToQuery: function(object) {
			var escape = false;
			var clauses = [];
			for (var key in object) {
				if (object.hasOwnProperty(key)) {
					value = object[key];
					if (value instanceof RegExp && typeof value.toString === 'function') {
						var value = value.toString();

						// Replace JavaScript special characters with SQL special characters
						value = value.replace(/(\\\\)|(%|_)|(\\\*|\\\?)|(\*)|(\?)/g, function(str, backslash, special, literal, star, question) {
							escape = escape || !!special;
							return special ? '\\' + str : literal ? literal[1] : star ? '%' : question ? '_' : str;
						});

						clauses.push(key + ' LIKE \'' + value + '\'');
					} else if (typeof value === 'string') {
						value = value.replace(/(\\|%|_)/g, function(str) {
							return '\\' + str;
						});
						clauses.push(key + ' = \'' + value + '\'');
					} else {
						clauses.push(key + ' = ' + value);
					}
				}
			}

			if (!escape) {
				clauses = array.map(clauses, function(clause) {
					return clause.replace(/(\\.)/g, function(str) {
						return str[1];
					});
				});
			}

			var query = new Query();
			query.where = clauses.join(' AND ') + (escape ? ' ESCAPE \'\\\'' : '');
			return query;
		}
	});
});
