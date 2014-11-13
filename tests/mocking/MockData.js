define([
	'dojo/_base/declare',
	'dojo/_base/lang',

	'dojo/store/Memory'
], function(
	declare, lang,
	Memory
) {

	var words = ['Whale', 'Orange', 'Stick', 'Party', 'Confucious', 'Server', '1930', 'Sizzling', 'Dino', 'Elbow', 'Montgomery', 'Burrito', 'Corvette', 'Pondering', 'Blueberry', 'Static', 'Playful', 'Wandering', 'Stashouse', 'Pickles', 'Beard', 'Every', 'Shotgun', 'Drugstore', 'Willow', 'Folding', 'Abusive', 'World', 'Fantastic', 'Saint', 'German', 'Retail', 'Torso', 'Color', 'Head', 'Thunder'];

	var categories = ['Places', 'Book Titles', 'Events', 'Shopping Centers'];

	var data = [{
		geometry: {
			x: -99.85871,
			y: 41.3707
		},
		attributes: {
			ESRI_OID: 1,
			NAME: 'Mock Test Point 1',
			CATEGORY: 'Mocked',
			DETAILS: 'Point 1 - Default Point'
		}
	}, {
		geometry: {
			x: -96.2538,
			y: 42.1111
		},
		attributes: {
			ESRI_OID: 2,
			NAME: 'Mock Test Point 2',
			CATEGORY: 'Mocked',
			DETAILS: 'Point 2 - Default Point'
		}
	}, {
		geometry: {
			x: -110.3357,
			y: 36.154231
		},
		attributes: {
			ESRI_OID: 3,
			NAME: 'Mock Test Point 3',
			CATEGORY: 'Mocked',
			DETAILS: 'Point 3 - Default Point'
		}
	}];

	var serviceDefinitions = {
		MapServer: {
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
				ymax: 90,
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
				type: 'esriFieldTypeInteger',
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
		},
		FeatureServer: {
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
		}
	};

	return declare([Memory], {
		idProperty: 'storeID',
		data: lang.clone(data),
		constructor: function(options) {
			options = options || {};
			if (options.type === 'FeatureServer') {
				this.serviceDefinition = serviceDefinitions.FeatureServer;
			} else {
				this.serviceDefinition = serviceDefinitions.MapServer;
			}

			// Populate Data
			var xRange = this.serviceDefinition.extent.xmax - this.serviceDefinition.extent.xmin;
			var yRange = this.serviceDefinition.extent.ymax - this.serviceDefinition.extent.ymin;
			options.count = options.count || 300;
			while (this.data.length < options.count) {
				var datum = {
					geometry: {
						x: Math.random() * xRange + this.serviceDefinition.extent.xmin,
						y: Math.random() * yRange + this.serviceDefinition.extent.ymin
					},
					attributes: {
						ESRI_OID: options.count + 3,
						NAME: '',
						CATEGORY: categories[Math.floor(Math.random() * categories.length)],
						DETAILS: ''
					}
				};

				var i;
				for (i = 0; i < 3; i++) {
					datum.attributes.NAME += words[Math.floor(Math.random() * words.length)] + ' ';
				}

				for (i = 0; i < 10; i++) {
					datum.attributes.DETAILS += words[Math.floor(Math.random() * words.length)] + ' ';
				}

				this.data.push(datum);
			}
		}
	});
});