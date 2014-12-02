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
	var MapService = declare(null, {
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
				geometryType: 'esriGeometryPoint',
				copyrightText: '',
				parentLayer: null,
				subLayers: [],
				minScale: 0,
				maxScale: 0,
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
				defaultVisibility: true,
				extent: {
					xmin: -180,
					ymin: -75,
					xmax: 180,
					ymax: 80,
					spatialReference: {
						wkid: 4326,
						latestWkid: 4326
					}
				},
				hasAttachments: false,
				htmlPopupType: 'esriServerHTMLPopupTypeNone',
				displayField: 'NAME',
				typeIdField: null,
				fields: [{
					name: 'ESRI_OID',
					type: 'esriFieldTypeOID',
					alias: 'ESRI OID',
					domain: null
				}, {
					name: 'NAME',
					type: 'esriFieldTypeString',
					alias: 'Name',
					length: 255,
					domain: null
				}, {
					name: 'CATEGORY',
					type: 'esriFieldTypeSmallInteger',
					alias: 'Category',
					domain: null
				}, {
					name: 'DETAILS',
					type: 'esriFieldTypeString',
					alias: 'Details',
					length: 255,
					domain: null
				}, {
					name: 'shape',
					type: 'esriFieldTypeGeometry',
					alias: 'Shape',
					domain: null
				}],
				relationships: [],
				canModifyLayer: false,
				canScaleSymbols: false,
				hasLabels: false,
				capabilities: 'Map,Query,Data',
				maxRecordCount: 1000,
				supportsStatistics: true,
				supportsAdvancedQueries: true,
				supportedQueryFormats: 'JSON, AMF',
				ownershipBasedAccessCOntrolForFeatures: {
					allowOthersToQuery: true
				},
				useStandardizedQueries: true
			};
		},
		_register: function() {
			// Root Info
			var info = registry.register(/Mock\/MapServer\/[0-9]+$/, lang.hitch(this, 'info'));
			this.handles.push(info);

			// Data Item
			var data = registry.register(/Mock\/MapServer\/[0-9]+\/[0-9]+$/, lang.hitch(this, 'data'));
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

			if (this.serviceDefinition.capabilities.indexOf('Data') !== -1) {
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
							code: 400,
							message: 'Invalid or missing input parameters.',
							details: []
						}
					});
				}
			} else {
				dfd.reject({
					error: {
						code: 400,
						message: 'Requested operation is not supported by this service.',
						details: ['The requested capability is not supported']
					}
				});
			}

			return when(dfd.promise);
		}
	});

	return new MapService();
});