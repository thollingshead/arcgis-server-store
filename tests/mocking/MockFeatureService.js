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
				currentVersion: 10.21,
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
				supportedQueryFormats: 'JSON, AMF',
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
						return !query.objectIds || array.indexOf(query.objectIds, feature.attributes[this.serviceDefinition.objectIdField]);
					}));
					if (query.returnCountOnly) {
						dfd.resolve({
							count: data.length
						});
					} else if (query.returnIdsOnly) {
						var ids = array.map(data.sort(QueryUtils.sort(query.orderByFields)), lang.hitch(this, function(feature) {
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
							featureSet.features = array.map(data.sort(QueryUtils.sort(query.orderByFields)), function(feature) {
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
							featureSet.features = array.map(data.sort(QueryUtils.sort(query.orderByFields)), function(feature) {
								var attributes = {};

								array.forEach(featureSet.fields, function(field) {
									attributes[field.name] = feature.attributes[field.name];
								});

								return {
									attributes: attributes
								};
							});
						}

						if (featureSet.features.length > this.serviceDefinition.maxRecordCount) {
							featureSet.features.splice(this.serviceDefinition.maxRecordCount, featureSet.features.length - this.serviceDefinition.maxRecordCount);
							featureSet.exceededTransferLimit = true;
						}

						dfd.resolve(featureSet);
					}
				} catch (e) {
					error = new Error('Unable to complete operation.');
					error.code = 400;
					error.details = ['Unable to perform query operation.'];
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