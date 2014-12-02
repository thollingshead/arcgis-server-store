define([
	'./MockData',

	'dojo/_base/declare',
	'dojo/_base/lang',

	'dojo/Deferred',
	'dojo/request/registry',
	'dojo/when'
], function(
	MockData,
	declare, lang,
	Deferred, registry, when
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
				ownershipBasedAccessCOntrolForFeatures: null,
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
			// Root Info
			var info = registry.register(/Mock\/FeatureServer\/[0-9]+$/, lang.hitch(this, 'info'));
			this.handles.push(info);

			// Data Item
			var data = registry.register(/Mock\/FeatureServer\/[0-9]+\/[0-9]+$/, lang.hitch(this, 'data'));
			this.handles.push(data);
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
			var dfd = new Deferred();

			if (this.serviceDefinition.capabilities.indexOf('Query') !== -1) {
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
					dfd.reject({
						error: {
							code: 404,
							message: 'Unable to complete operation.',
							details: ['Feature not found.']
						}
					});
				}
			} else {
				dfd.reject({
					error: {
						code: 400,
						message: 'Requested operation is not supported by this service.',
						details: []
					}
				});
			}

			return when(dfd.promise);
		}
	});

	return new FeatureService();
});