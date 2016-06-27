define([
	'./MockData',
	'./QueryUtils',

	'dojo/_base/array',
	'dojo/_base/declare',
	'dojo/_base/lang',

	'dojo/Deferred',
	'dojo/request/registry',
	'dojo/when',

	'esri/geometry/jsonUtils',
	'esri/tasks/FeatureSet'
], function(
	MockData, QueryUtils,
	array, declare, lang,
	Deferred, registry, when,
	geometryJsonUtils, FeatureSet
) {
	var validateField = function(field, feature) {
		var value = lang.getObject('attributes.' + field.name, false, feature);
		if (value !== undefined) {
			switch (field.type) {
				case 'esriFieldTypeSmallInteger':
					if (isNaN(value) || value % 1 !== 0 || value < -32768 || value > 32767) {
						throw new Error('Parser');
					}
					break;
				case 'esriFieldTypeInteger':
					if (isNaN(value) || value % 1 !== 0 || value < -2147483648 || value > 2147483647) {
						throw new Error('Parser');
					}
					break;
				case 'esriFieldTypeDouble':
					if (isNaN(value) || value % 1 === 0 || value < -2.2 * Math.pow(10, 308) || value > 1.8 * Math.pow(10, 308)) {
						throw new Error('Parser');
					}
					break;
				case 'esriFieldTypeDate':
					value = Date.parse(value);
					if (isNaN(value)) {
						throw new Error('Parser');
					} else {
						value = new Date(value);
					}
					break;
				case 'esriFieldTypeString':
					if (typeof value !== 'string') {
						throw new Error('Parser');
					} else if (value.length > field.length) {
						value = value.substr(0, field.length);
					}
					break;
			}
		}
		
		return value;
	};

	var FeatureService = declare(null, {
		mocking: false,
		constructor: function() {
			this.handles = [];

			this._createService();
		},
		start: function() {
			if (this.mocking) {
				return;
			}

			this.mocking = true;
			this.reset();

			this._register();
		},
		stop: function() {
			if (!this.mocking) {
				return;
			}

			this._unregister();

			this.mocking = false;

			this.store = null;
		},
		reset: function() {
			this.store = null;
			this.store = new MockData(this.serviceDefinition);

			for (var i = 1; i < 4; i++) {
				var datum = this.store.get(i);
				datum.attributes.NAME = 'Mock Test Point ' + i;
				datum.attributes.CATEGORY = -12345;
				datum.attributes.DETAILS = 'Mocked';
				datum.geometry.x = i;
				datum.geometry.y = i;
				this.store.put(datum);
			}
		},

		_createService: function() {
			this.serviceDefinition = {
				currentVersion: 10.3,
				id: 0,
				name: 'Mock Service',
				type: 'Feature Layer',
				description: '',
				copyrightText: '',
				defaultVisibility: true,
				editFieldsInfo: null,
				ownershipBasedAccessControlForFeatures: null,
				syncCanReturnChanges: false,
				relationships: [],
				isDataVersioned: false,
				supportsRollbackOnFailureParameter: false,
				supportsStatistics: true,
				supportsAdvancedQueries: true,
				advancedQueryCapabilities: {
					supportsPagination: false,
					supportsStatistics: true,
					supportsOrderBy: true,
					supportsDistinct: true
				},
				geometryType: 'esriGeometryPoint',
				minScale: 0,
				maxScale: 0,
				extent: {
					xmin: -180,
					ymin: -75,
					xmax: 180,
					ymax: 90,
					spatialReference: {
						wkid: 4326,
						latestWkid: 4326
					}
				},
				drawingInfo: {
					renderer: {
						type: 'simple',
						symbol: {
							type: 'esriSMS',
							style: 'esriSMSCircle',
							color: [133, 0, 11, 255],
							size: 4,
							angle: 0,
							xoffset: 0,
							yoffset: 0,
							outline: {
								color: [0, 0, 0, 255],
								width: 1
							}
						}
					},
					label: '',
					description: ''
				},
				hasM: false,
				hasZ: false,
				allowGeometryUpdates: true,
				hasAttachments: false,
				htmlPopupType: 'esriServerHTMLPopupTypeNone',
				objectIdField: 'ESRI_OID',
				globalIdField: '',
				displayField: 'NAME',
				typeIdField: null,
				fields: [{
					name: 'ESRI_OID',
					type: 'esriFieldTypeOID',
					alias: 'ESRI OID',
					domain: null,
					editable: false,
					nullable: false
				}, {
					name: 'NAME',
					type: 'esriFieldTypeString',
					alias: 'Name',
					length: 255,
					domain: null,
					editable: true,
					nullable: true
				}, {
					name: 'CATEGORY',
					type: 'esriFieldTypeInteger',
					alias: 'Category',
					domain: null,
					editable: true,
					nullable: true
				}, {
					name: 'DETAILS',
					type: 'esriFieldTypeString',
					alias: 'Details',
					length: 255,
					domain: null,
					editable: true,
					nullable: true
				}, {
					name: 'shape',
					type: 'esriFieldTypeGeometry',
					alias: 'Shape',
					domain: null
				}],
				types: [],
				templates: [],
				maxRecordCount: 1000,
				supportedQueryFormats: 'JSON',
				capabilities: 'Create,Delete,Query,Update,Uploads,Editing',
				useStandardizedQueries: true
			};
		},
		_register: function() {
			// Data Item
			var data = registry.register(/Mock\/FeatureServer\/[0-9]+\/[0-9]+$/, lang.hitch(this, 'data'));
			this.handles.push(data);

			// Query (simple)
			var query = registry.register(/Mock\/FeatureServer\/[0-9]+\/query$/, lang.hitch(this, 'query'));
			this.handles.push(query);

			// Add Features
			var addFeatures = registry.register(/Mock\/FeatureServer\/[0-9]+\/addFeatures$/, lang.hitch(this, 'addFeatures'));
			this.handles.push(addFeatures);

			// Update Features
			var updateFeatures = registry.register(/Mock\/FeatureServer\/[0-9]+\/updateFeatures$/, lang.hitch(this, 'updateFeatures'));
			this.handles.push(updateFeatures);

			// Delete Features
			var deleteFeatures = registry.register(/Mock\/FeatureServer\/[0-9]+\/deleteFeatures$/, lang.hitch(this, 'deleteFeatures'));
			this.handles.push(deleteFeatures);

			// Apply Edits
			var applyEdits = registry.register(/Mock\/FeatureServer\/[0-9]+\/applyEdits$/, lang.hitch(this, 'applyEdits'));
			this.handles.push(applyEdits);

			// Root Info / Unknown Endpoints
			var info = registry.register(/Mock\/FeatureServer\/[0-9]+.*$/, lang.hitch(this, 'info'));
			this.handles.push(info);
		},
		_unregister: function() {
			var handle;
			while ((handle = this.handles.pop())) {
				handle.remove();
			}
		},

		info: function(url, query) {
			return when(this.serviceDefinition);
		},
		data: function(url, query) {
			var error, dfd = new Deferred();

			if (array.indexOf(this.serviceDefinition.capabilities.split(','), 'Query') !== -1) {
				var id = url.match(/\/([0-9]+)$/)[1];
				var feature = this.store.get(id);
				if (feature) {
					dfd.resolve({
						feature: {
							geometry: feature.geometry.toJson(),
							attributes: feature.attributes
						}
					});
				} else {
					error = new Error('Unable to complete operation.');
					error.code = 400;
					error.details = ['Feature not found.'];
					dfd.reject(error);
				}
			} else {
				error = new Error('Requested operation is not supported by this service.');
				error.code = 400;
				error.details = [];
				dfd.reject(error);
			}

			return when(dfd.promise);
		},
		query: function(url, query) {
			var error, dfd = new Deferred();
			if (array.indexOf(this.serviceDefinition.capabilities.split(','), 'Query') !== -1) {
				try {
					query.where = query.where || '1=1';
					query.objectIds = query.objectIds && array.map(query.objectIds.split(','), function(objectId) {
						return parseInt(objectId, 10);
					}) || undefined;


					var data = array.filter(this.store.query(QueryUtils.parse(query.where)), lang.hitch(this, function(feature) {
						return !query.objectIds || (1 + array.indexOf(query.objectIds, feature.attributes[this.serviceDefinition.objectIdField]));
					}));

					if (this.serviceDefinition.advancedQueryCapabilities.supportsOrderBy && query.orderByFields) {
						data.sort(QueryUtils.sort(query.orderByFields));
					}

					if (query.returnCountOnly) {
						dfd.resolve({
							count: data.length
						});
					} else if (query.returnIdsOnly) {
						var ids = array.map(data, lang.hitch(this, function(feature) {
							return feature.attributes[this.serviceDefinition.objectIdField];
						}));
						dfd.resolve({
							objectIdFieldName: this.serviceDefinition.objectIdField,
							objectIds: ids
						});
					} else {
						query.outFields = query.outFields.split(',');
						var featureSet = new FeatureSet({
							displayFieldName: this.serviceDefinition.displayField,
							geometryType: this.serviceDefinition.geometryType,
							spatialReference: this.serviceDefinition.extent.spatialReference,
							fieldAliases: {},
							exceededTransferLimit: false
						});

						featureSet.fields = array.filter(this.serviceDefinition.fields, function(field) {
							return field.type !== 'esriFieldTypeGeometry' && query.outFields[0] === '*' || query.outFields.indexOf(field.name) !== -1;
						});
						array.forEach(featureSet.fields, function(field) {
							featureSet.fieldAliases[field.name] = field.alias;
						});

						if (query.returnGeometry) {
							featureSet.features = array.map(data, function(feature) {
								var attributes = {};

								array.forEach(featureSet.fields, function(field) {
									attributes[field.name] = feature.attributes[field.name];
								});

								return {
									attributes: attributes,
									geometry: feature.geometry ? feature.geometry.toJson() : null
								};
							});
						} else {
							featureSet.features = array.map(data, function(feature) {
								var attributes = {};

								array.forEach(featureSet.fields, function(field) {
									attributes[field.name] = feature.attributes[field.name];
								});

								return {
									attributes: attributes
								};
							});
						}

						if (query.hasOwnProperty('resultOffset') || query.hasOwnProperty('resultRecordCount')) {
							if (this.serviceDefinition.advancedQueryCapabilities.supportsPagination) {
								query.resultOffset = (isNaN(query.resultOffset) || query.resultOffset < 0) ? 0 : Math.round(query.resultOffset);
								query.resultRecordCount = (isNaN(query.resultRecordCount) || query.resultRecordCount < 0) ? this.serviceDefinition.maxRecordCount : Math.round(query.resultRecordCount);
								featureSet.features = featureSet.features.slice(query.resultOffset, query.resultOffset + query.resultRecordCount);
							} else {
								throw new Error('Pagination');
							}
						}

						if (featureSet.features.length > this.serviceDefinition.maxRecordCount) {
							featureSet.features.splice(this.serviceDefinition.maxRecordCount, featureSet.features.length - this.serviceDefinition.maxRecordCount);
							featureSet.exceededTransferLimit = true;
						}

						dfd.resolve(featureSet);
					}
				} catch (e) {
					if (e.message === 'Pagination') {
						error = new Error('Pagination is not supported.');
						error.code = 400;
						error.details = [];
					} else {
						error = new Error('Unable to complete operation.');
						error.code = 400;
						error.details = ['Unable to perform query operation.'];
					}
					dfd.reject(error);
				}
			} else {
				error = new Error('Requested operation is not supported by this service.');
				error.code = 400;
				error.details = [];
				dfd.reject(error);
			}

			return when(dfd.promise);
		},
		addFeatures: function(url, query) {
			var error, dfd = new Deferred();
			if (array.indexOf(this.serviceDefinition.capabilities.split(','), 'Create') !== -1) {
				try {
					query.features = JSON.parse(query.features);

					if (query.features.length) {
						query.features = array.map(query.features, lang.hitch(this, function(feature) {
							var add = {
								attributes: {}
							};

							// Validate fields
							array.forEach(this.serviceDefinition.fields, function(field) {
								if (field.type === 'esriFieldTypeOID' || field.type === 'esriFieldTypeGeometry') {
									return;
								}
								var value = validateField(field, feature);
								if (value === undefined) {
									value = null;
								}
								add.attributes[field.name] = value;
							});

							// Validate geometry
							if (this.serviceDefinition.type === 'Feature Layer' && feature.geometry) {
								var geometry = geometryJsonUtils.fromJson(feature.geometry);

								if (geometry) {
									if (geometryJsonUtils.getJsonType(geometry) === this.serviceDefinition.geometryType) {
										add.geometry = geometry;
									} else {
										throw new Error();
									}
								}
							}

							return add;
						}));

						var addResults = array.map(query.features, lang.hitch(this, function(feature) {
							var id = this.store.add(feature);
							return {
								objectId: id,
								success: true
							};
						}));

						dfd.resolve({
							addResults: addResults
						});
					} else {
						throw new Error('Parser');
					}
				} catch (e) {
					error = new Error('Unable to complete operation.');
					error.code = e.message ? 400 : 500;
					error.details = e.message ? ['Parser error: Some parameters could not be recognized.'] : [];
					dfd.reject(error);
				}
			} else {
				error = new Error('Requested operation is not supported by this service.');
				error.code = 400;
				error.details = [];
				dfd.reject(error);
			}

			return when(dfd.promise);
		},
		updateFeatures: function(url, query) {
			var error, dfd = new Deferred();
			if (array.indexOf(this.serviceDefinition.capabilities.split(','), 'Update') !== -1) {
				try {
					query.features = JSON.parse(query.features);

					if (query.features.length) {
						var next = 1;
						query.features = array.map(query.features, lang.hitch(this, function(feature) {
							var id = lang.getObject('attributes.' + this.serviceDefinition.objectIdField, false, feature) || next++;
							var update = this.store.get(id);

							// Validate Fields
							array.forEach(this.serviceDefinition.fields, function(field) {
								if (field.type === 'esriFieldTypeOID' || field.type === 'esriFieldTypeGeometry') {
									return;
								}
								var value = validateField(field, feature);
								if (value !== undefined) {
									update.attributes[field.name] = value;
								}
							});

							// Validate Geometry
							if (this.serviceDefinition.type === 'Feature Layer' && this.serviceDefinition.allowGeometryUpdates && feature.geometry) {
								var geometry = geometryJsonUtils.fromJson(feature.geometry);

								if (geometry) {
									if (geometryJsonUtils.getJsonType(geometry) === this.serviceDefinition.geometryType) {
										update.geometry = geometry;
									} else {
										throw new Error('Parser');
									}
								}
							}

							return update;
						}));

						var updateResults = array.map(query.features, lang.hitch(this, function(feature) {
							var id = this.store.put(feature);
							return {
								objectId: id,
								success: true
							};
						}));

						dfd.resolve({
							updateResults: updateResults
						});
					} else {
						throw new Error('Parser');
					}
				} catch (e) {
					error = new Error('Unable to complete operation.');
					error.code = e.message ? 400 : 500;
					error.details = e.message ? ['Parser error: Some parameters could not be recognized.'] : ['Unable to perform updateFeatures operation.'];
					dfd.reject(error);
				}
			} else {
				error = new Error('Request operation is not supported by this service.');
				error.code = 400;
				error.details = [];
				dfd.reject(error);
			}

			return when(dfd.promise);
		},
		deleteFeatures: function(url, query) {
			var error, dfd = new Deferred();
			if (array.indexOf(this.serviceDefinition.capabilities.split(','), 'Query') !== -1) {
				try {
					if (!query.where && !query.objectIds) {
						throw new Error('Parser');
					}
					query.where = query.where || '1=1';
					query.objectIds = query.objectIds && array.map(query.objectIds.split(','), function(objectId) {
						return parseInt(objectId, 10);
					}) || undefined;

					var data = array.filter(this.store.query(QueryUtils.parse(query.where)), lang.hitch(this, function(feature) {
						return !query.objectIds || (1 + array.indexOf(query.objectIds, feature.attributes[this.serviceDefinition.objectIdField]));
					}));

					if (data.length) {
						array.forEach(data, lang.hitch(this, function(feature) {
							this.store.remove(this.store.getIdentity(feature));
						}));
						dfd.resolve({
							success: true
						});
					} else {
						dfd.resolve({});
					}
				} catch (e) {
					error = new Error('Unable to complete operation.');
					error.code = 500;
					error.details = ['Unable to perform deleteFeatures operation.'];
					dfd.reject(error);
				}
			} else {
				error = new Error('Requested operation is not supported by this service.');
				error.code = 400;
				error.details = [];
				dfd.reject(error);
			}

			return when(dfd.promise);
		},
		applyEdits: function(url, query) {
			var error, dfd = new Deferred();
			if (array.indexOf(this.serviceDefinition.capabilities.split(','), 'Editing') !== -1) {
				try {
					query.adds = JSON.parse(query.adds || '[]');
					query.updates = JSON.parse(query.updates || '[]');
					query.deletes = (query.deletes || '').split(',');

					// Add
					if (query.adds.length) {
						if (array.indexOf(this.serviceDefinition.capabilities.split(','), 'Create') !== -1) {
							query.adds = array.map(query.adds, lang.hitch(this, function(feature) {
								var add = {
									attributes: {}
								};

								// Validate fields
								try {
									array.forEach(this.serviceDefinition.fields, function(field) {
										if (field.type === 'esriFieldTypeOID' || field.type === 'esriFieldTypeGeometry') {
											return;
										}
										var value = validateField(field, feature);
										if (value === undefined) {
											value = null;
										}
										add.attributes[field.name] = value;
									});
								} catch (e) {
									return;
								}

								// Validate geometry
								if (this.serviceDefinition.type === 'Feature Layer' && feature.geometry) {
									var geometry = geometryJsonUtils.fromJson(feature.geometry);

									if (geometry && geometryJsonUtils.getJsonType(geometry) === this.serviceDefinition.geometryType) {
											add.geometry = geometry;
									} else {
										throw new Error();
									}
								}

								return add;
							}));

							query.adds = array.filter(query.adds, function(feature) {
								return feature;
							});
						} else {
							throw new Error('Add not supported.');
						}
					}

					// Update
					if (query.updates.length) {
						if (array.indexOf(this.serviceDefinition.capabilities.split(','), 'Update') !== -1) {
							query.updates = array.map(query.updates, lang.hitch(this, function(feature) {
								var objectId = lang.getObject('attributes.' + this.serviceDefinition.objectIdField, false, feature);
								var update = this.store.get(objectId);
								if (!objectId || !update) {
									throw new Error('Parser');
								}

								// Validate fields
								array.forEach(this.serviceDefinition.fields, function(field) {
									if (field.type === 'esriFieldTypeOID' || field.type === 'esriFieldTypeGeometry') {
										return;
									}
									var value = validateField(field, feature);
									if (value !== undefined) {
										update.attributes[field.name] = value;
									}
								});

								// Validate geometry
								if (this.serviceDefinition.type === 'Feature Layer' && this.serviceDefinition.allowGeometryUpdates && feature.geometry) {
									var geometry = geometryJsonUtils.fromJson(feature.geometry);

									if (geometry && geometryJsonUtils.getJsonType(geometry) === this.serviceDefinition.geometryType) {
											update.geometry = geometry;
									} else {
										throw new Error();
									}
								}

								return update;
							}));
						} else {
							throw new Error('Update not supported.');
						}
					}

					// Delete
					if (query.deletes.length) {
						if (array.indexOf(this.serviceDefinition.capabilities.split(','), 'Delete') !== -1) {
							query.deletes = array.map(query.deletes, lang.hitch(this, function(id) {
								return parseInt(id, 10);
							}));
							query.deletes = array.filter(query.deletes, lang.hitch(this, function(id) {
								return id && this.store.get(id);
							}));
						} else {
							throw new Error('Delete not supported.');
						}
					}

					if (query.adds.length + query.updates.length + query.deletes.length) {
						var addResults = array.map(query.adds, lang.hitch(this, function(feature) {
							var id = this.store.add(feature);
							return {
								objectId: id,
								success: true
							};
						}));

						var updateResults = array.map(query.updates, lang.hitch(this, function(feature) {
							var id = this.store.put(feature);
							return {
								objectId: id,
								success: true
							};
						}));

						var deleteResults = array.map(query.deletes, lang.hitch(this, function(id) {
							this.store.remove(id);
							return {
								objectId: id,
								success: true
							};
						}));

						dfd.resolve({
							addResults: addResults,
							updateResults: updateResults,
							deleteResults: deleteResults
						});
					} else {
						error = new Error('Unable to complete operation.');
						error.code = 500;
						error.details = ['No edits (\'adds\', \'updates\', or \'deletes\') were specified.'];
						dfd.reject(error);
					}
				} catch (e) {
					error = new Error('Unable to complete operation.');
					error.code = e.message ? 500 : 400;
					error.details = [];
					dfd.reject(error);
				}
			} else {
				error = new Error('Requested operation is not supported by this service.');
				error.code = 400;
				error.details = [];
				dfd.reject(error);
			}

			return when(dfd.promise);
		}
	});

	return new FeatureService();
});