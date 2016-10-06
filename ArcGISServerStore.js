define([
	'dojo/_base/array',
	'dojo/_base/declare',
	'dojo/_base/lang',

	'dojo/Deferred',
	'dojo/promise/all',
	'dojo/store/util/QueryResults',
	'dojo/when',

	'esri/request',
	'esri/tasks/query'
], function(
	array, declare, lang,
	Deferred, all, QueryResults, when,
	esriRequest, Query
) {

	var _loadWrapper = function(deferred, callback, context) {
		return function() {
			var args = arguments;
			if (context._transaction) {
				args[1] = lang.mixin({_transaction: context._transaction}, args[1]);
				args.length = Math.max(args.length, 2);
			}
			return deferred.then(function() {
				return callback.apply(context, args);
			});
		};
	};

	var _loadQueryWrapper = function(deferred, callback, context) {
		return function() {
			var dfd = new Deferred();
			dfd.total = new Deferred();

			var args = arguments;
			deferred.then(function() {
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

	var _loadTransactionWrapper = function(deferred, callback, context) {
		return function() {
			callback.apply(context, arguments);

			return {
				commit: cleanup(function() {
					var transaction = this;
					return deferred.then(function() {
						return commit.apply(transaction);
					});
				}, context, context._transaction),
				abort: cleanup(function() {
					var transaction = this;
					return deferred.then(function() {
						return abort.apply(transaction);
					});
				}, context, context._transaction)
			};
		};
	};

	var abort = function(message) {
		var dfd = new Deferred();
		if (this._aborted) {
			dfd.cancel('Transaction aborted.');
		} else if (this._committed) {
			dfd.reject('Transaction committed.');
		} else {
			this._aborted = true;
			var transactions = [].concat(this._promises, this.puts, this.adds, this.removes);
			array.forEach(transactions, function(transaction) {
				if (transaction) {
					transaction = transaction.deferred || transaction;
					if (lang.isFunction(transaction.cancel)) {
						transaction.cancel(message || 'Transaction aborted.');
					}
				}
			});
			dfd.resolve();
		}
		return dfd.promise;
	};

	var commit = function() {
		var dfd = new Deferred();
		if (this._aborted) {
			dfd.reject('Transaction aborted.');
		} else if (this._committed) {
			dfd.cancel('Transaction committed.');
		} else {
			this._committed = true;
			return all(this._promises || []).then(lang.hitch(this, function() {
				var puts = array.map(this.puts || [], function(put) {
					return put.feature;
				});
				var adds = array.map(this.adds || [], function(add) {
					return add.feature;
				});
				var removes = [];
				array.forEach(this.removes || [], function(remove) {
					removes = removes.concat(remove.ids);
				});

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
					array.forEach(this.puts, lang.hitch(this, function(put, i) {
						var updateResult = response.updateResults[i];
						if (updateResult.success) {
							if (this._store.idProperty === this._store._serviceInfo.objectIdField) {
								put.deferred.resolve(updateResult.objectId);
							} else {
								put.deferred.resolve(put.id);
							}
						} else {
							put.deferred.reject();
						}
					}));

					array.forEach(this.adds, lang.hitch(this, function(add, i) {
						var addResult = response.addResults[i];
						if (addResult.success) {
							if (this._store.idProperty === this._store._serviceInfo.objectIdField) {
								add.deferred.resolve(addResult.objectId);
							} else {
								add.deferred.resolve(typeof add.id != 'undefined' ? add.id : null);
							}
						} else {
							add.deferred.reject();
						}
					}));

					array.forEach(this.removes, function(remove) {
						remove.ids = array.filter(remove.ids, function(id) {
							var success = array.some(response.deleteResults, function(deleteResult) {
								return deleteResult.objectId === id && deleteResult.success;
							});
							return !success;
						});

						if (!remove.ids.length) {
							remove.deferred.resolve(true);
						} else {
							remove.deferred.reject();
						}
					});
				}), lang.hitch(this, function(error) {
					this._committed = false;
					abort.apply(this, arguments);
				}));
			}), lang.hitch(this, function() {
				this._committed = false;
				abort.apply(this, arguments);
			}));
		}
		return dfd.promise;
	};

	var cleanup = function(action, store, transaction) {
		return function() {
			if (store._transaction === transaction) {
				delete store._transaction;
			}
			return action.apply(transaction);
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
				var loadDfd = esriRequest({
					url: this.url,
					content: {
						f: 'json'
					},
					handleAs: 'json',
					callbackParamName: 'callback'
				}).then(lang.hitch(this, '_initStore'));
			} else {
				throw new Error('Missing required property: \'url\'.');
			}

			// Wrap functions until loaded
			var get = this.get;
			var add = this.add;
			var put = this.put;
			var remove = this.remove;
			var query = this.query;
			var transaction = this.transaction;

			loadDfd.then(lang.hitch(this, function() {
				this.get = get;
				this.add = add;
				this.put = put;
				this.remove = remove;
				this.query = query;
				this.transaction = transaction;
			}));

			this.get = _loadWrapper(loadDfd, this.get, this);
			this.add = _loadWrapper(loadDfd, this.add, this);
			this.put = _loadWrapper(loadDfd, this.put, this);
			this.remove = _loadWrapper(loadDfd, this.remove, this);
			this.query = _loadQueryWrapper(loadDfd, this.query, this);
			this.transaction = _loadTransactionWrapper(loadDfd, this.transaction, this);
		},
		/**
		 * Retrieves and object by its identity
		 * @param  {Number|String} id The identity to use to lookup the object
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
					handleAs: 'json',
					callbackParamName: 'callback'
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
				var promise = when(options.overwrite || this.get(id));
				var transaction = options._transaction || this._transaction;
				if (transaction) {
					transaction._promises.push(promise);
				}
				promise.then(lang.hitch(this, function(existing) {
					if (existing) {
						if (this.capabilities.Update) {
							object = this._unflatten(lang.clone(object));
							lang.setObject('attributes.' + this.idProperty, id, object);
							if (transaction) {
								transaction.puts.push({
									deferred: dfd,
									feature: object,
									id: id
								});
							} else {
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
									if (response.updateResults && response.updateResults.length) {
										if (this.idProperty === this._serviceInfo.objectIdField) {
											dfd.resolve(response.updateResults[0].success ? response.updateResults[0].objectId : undefined);
										} else {
											dfd.resolve(response.updateResults[0].success ? id : undefined);
										}
									}
								}), dfd.reject);
							}
						} else {
							dfd.reject(new Error('Update not supported.'));
						}
					} else {
						if (transaction && !options._transaction) {
							options = lang.clone(options);
							options._transaction = transaction;
						}
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
				var dfd = new Deferred();
				var id = ('id' in options) ? options.id : this.getIdentity(object);
				var clone = this._unflatten(lang.clone(object));
				lang.setObject('attributes.' + this.idProperty, id, clone);

				if (typeof id != 'undefined' && this.idProperty === this._serviceInfo.objectIdField) {
					console.warn('Cannot set id on new object.');
					id = undefined;
				}

				var transaction = options._transaction || this._transaction;
				if (transaction) {
					transaction.adds.push({
						deferred: dfd,
						feature: clone,
						id: id
					});
				} else {
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
						if (response.addResults && response.addResults.length) {
							if (this.idProperty === this._serviceInfo.objectIdField) {
								var oid = response.addResults[0].success ? response.addResults[0].objectId : undefined;
								lang.setObject((this.flatten ? '' : 'attributes.') + this.idProperty, oid, object);
								dfd.resolve(oid);
							} else {
								dfd.resolve(response.addResults[0].success ? id : undefined);
							}
						}
					}), dfd.reject);
				}

				return dfd.promise;
			} else {
				throw new Error('Add not supported.');
			}
		},
		/**
		 * Deletes an object by its identity
		 * @param  {Number|String} id The identity to use to delete the object
		 */
		remove: function(id, options) {
			options = options || {};
			if (this.capabilities.Delete) {
				var where = '';
				if (typeof id === 'string') {
					where = this.idProperty + ' = \'' + id + '\'';
				} else if (typeof id !== 'undefined') {
					where = this.idProperty + ' = ' + id;
				}

				var dfd = new Deferred();
				var transaction = options._transaction || this._transaction;
				if (transaction) {
					if (this.idProperty === this._serviceInfo.objectIdField) {
						transaction.removes.push({
							deferred: dfd,
							ids: [id]
						});
					} else {
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
							if (response.objectIds) {
								transaction.removes.push({
									deferred: dfd,
									ids: response.objectIds
								});
							}
						}), dfd.reject);
						transaction._promises.push(promise);
					}
				} else {
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
						dfd.resolve(!!(response && response.success));
					}, dfd.reject);
				}

				return dfd.promise;
			} else {
				throw new Error('Remove not supported.');
			}
		},
		/**
		 * Queries the store for objects. This does not alter the store, but returns
		 * a set of data from the store.
		 * @param  {String|Object} query   The query to use for retrieving objects from the store
		 * @param  {Object} options        Optional arguments to apply to the result set
		 * @return {Object}                The results of the query, extended with iterative methods.
		 */
		query: function(query, options) {
			query = (query instanceof Query) ? query : this._objectToQuery(query);
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
				var dfd = new Deferred();
				if (paginate && options.start + options.count > this._serviceInfo.maxRecordCount) {
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
							query.where = '';
							query.objectIds = response.objectIds.slice(options.start, options.start + options.count);
							esriRequest({
								url: this.url + '/query',
								content: lang.mixin(query.toJson(), {
									f: 'json'
								}),
								handleAs: 'json',
								callbackParamName: 'callback'
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
						handleAs: 'json',
						callbackParamName: 'callback'
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