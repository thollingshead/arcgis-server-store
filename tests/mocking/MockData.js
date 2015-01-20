define([
	'dojo/_base/array',
	'dojo/_base/declare',
	'dojo/_base/lang',

	'dojo/store/Memory',

	'esri/geometry/jsonUtils',
	'esri/geometry/Point',
	'esri/geometry/Polygon',
	'esri/geometry/Polyline'
], function(
	array, declare, lang,
	Memory,
	geometryJsonUtils, Point, Polygon, Polyline
) {

	var words = ['Whale', 'Orange', 'Stick', 'Party', 'Confucious', 'Server', '1930', 'Sizzling', 'Dino', 'Elbow', 'Montgomery', 'Burrito', 'Corvette', 'Pondering', 'Blueberry', 'Static', 'Playful', 'Wandering', 'Stashouse', 'Pickles', 'Beard', 'Every', 'Shotgun', 'Drugstore', 'Willow', 'Folding', 'Abusive', 'World', 'Fantastic', 'Saint', 'German', 'Retail', 'Torso', 'Color', 'Head', 'Thunder'];
	var _nextOid = 1;

	return declare([Memory], {
		idProperty: 'storeId',
		_nextOid: _nextOid,

		constructor: function(serviceDefinition, options) {
			options = options || {};

			this._oidField = serviceDefinition.objectIdField;
			if (!this._oidField) {
				array.some(serviceDefinition.fields, lang.hitch(this, function(field) {
					if (field.type === 'esriFieldTypeOID') {
						this._oidField = field.name;
						return true;
					}
				}));
			}

			this.data = [];
			options.count = options.count || 150;
			while (this.data.length < options.count) {
				var datum = {
					geometry: this._createRandomGeometry(serviceDefinition),
					attributes: this._createRandomAttributes(serviceDefinition)
				};

				this.add(datum);
			}
		},
		_createRandomAttributes: function(serviceDefinition) {
			var attributes = {};
			array.forEach(serviceDefinition.fields, lang.hitch(this, function(field) {
				switch (field.type) {
					case 'esriFieldTypeOID':
						attributes[field.name] = this._nextOid;
						break;
					case 'esriFieldTypeSmallInteger':
						attributes[field.name] = Math.floor(Math.random() * 65536) - 32768;
						break;
					case 'esriFieldTypeInteger':
						attributes[field.name] = Math.floor(Math.random() * 4294967296) - 2147483648;
						break;
					case 'esriFieldTypeDouble':
						attributes[field.name] = (Math.random() * 200000000) - 100000000;
						break;
					case 'esriFieldTypeDate':
						attributes[field.name] = new Date(Math.floor(Math.random() * Date.now())).getTime();
						break;
					case 'esriFieldTypeString':
						var value = '';
						for (var i = 0, len = field.length / 8; i < len; i++) {
							value += words[Math.floor(Math.random() * words.length)] + ' ';
						}
						attributes[field.name] = value.substring(0, field.length);
						break;
					case 'esriFieldTypeGeometry':
						break;
					default:
						attributes[field.name] = null;
				}
			}));

			return attributes;
		},
		_createRandomGeometry: function(serviceDefinition) {
			var geometry;
			var xRange = serviceDefinition.extent.xmax - serviceDefinition.extent.xmin;
			var yRange = serviceDefinition.extent.ymax - serviceDefinition.extent.ymin;
			var i, l, point;
			switch (serviceDefinition.geometryType) {
				case 'esriGeometryPoint':
					geometry = new Point({
						x: Math.random() * xRange + serviceDefinition.extent.xmin,
						y: Math.random() * yRange + serviceDefinition.extent.ymin,
						spatialReference: serviceDefinition.extent.spatialReference
					});
					break;
				case 'esriGeometryPolyline':
					geometry = new Polyline({
						paths: [
							[]
						],
						spatialReference: serviceDefinition.extent.spatialReference
					});
					var previous;
					if (Math.random() < 0.5) {
						previous = serviceDefinition.extent.xmin;
						for (i = 0, l = Math.ceil(Math.random() * 5) + 2; i < l; i++) {
							previous = (Math.random() / (l - i) * (serviceDefinition.extent.xmax - previous)) + previous;
							point = new Point(previous, Math.random() * yRange + serviceDefinition.extent.ymin, serviceDefinition.extent.spatialReference);
							geometry.insertPoint(0, i, point);
						}
					} else {
						previous = serviceDefinition.extent.ymin;
						for (i = 0, l = Math.ceil(Math.random() * 5) + 2; i < l; i++) {
							previous = (Math.random() / (l - i) * (serviceDefinition.extent.ymax - previous)) + previous;
							point = new Point(Math.random() * xRange + serviceDefinition.extent.xmin, previous, serviceDefinition.extent.spatialReference);
							geometry.insertPoint(0, i, point);
						}
					}
					break;
				case 'esriGeometryPolygon':
					geometry = new Polygon({
						rings: [
							[]
						],
						spatialReference: serviceDefinition.extent.spatialReference
					});

					var start = new Point({
						x: Math.random() * xRange + serviceDefinition.extent.xmin,
						y: Math.random() * yRange + serviceDefinition.extent.ymin,
						spatialReference: serviceDefinition.extent.spatialReference
					});
					geometry.insertPoint(0, 0, start);

					point = new Point(start.x, start.y, start.spatialReference);
					for (i = 1, l = (Math.random() * 3) + 3; i < l; i++) {
						point.x = Math.random() * 0.5 * (serviceDefinition.extent.xmax - point.x) + point.x;
						point.y = Math.random() * 0.85 * (serviceDefinition.extent.ymax - point.y) + point.y;
						geometry.insertPoint(0, i, point);
					}
					for (l = l + (Math.random() * 3) + 2; i < l; i++) {
						point.x = Math.random() * 0.85 * (serviceDefinition.extent.xmax - point.x) + point.x;
						point.y = point.y - (Math.random() * (point.y - start.y));
						geometry.insertPoint(0, i, point);
					}
					for (l = l + (Math.random() * 3) + 2; i < l; i++) {
						point.x = point.x - (Math.random() * 0.5 * (point.x - start.x));
						point.y = point.y - (Math.random() * 0.85 * (point.y - serviceDefinition.extent.ymin));
						geometry.insertPoint(0, i, point);
					}
					for (l = l + (Math.random() * 3) + 2; i < l; i++) {
						point.x = point.x - (Math.random() * (point.x - start.x));
						point.y = (Math.random() * (start.y - point.y)) + point.y;
						geometry.insertPoint(0, i, point);
					}
					geometry.insertPoint(0, i, start);
					break;
			}

			return geometry;
		},
		put: function(object, options) {
			var id = object[this.idProperty] = (options && 'id' in options) ? options.id : this.idProperty in object ? object[this.idProperty] : this._nextOid++;
			object.attributes[this._oidField] = object.storeId = id;
			if (object.geometry) {
				object.geometry = geometryJsonUtils.fromJson(object.geometry);
			}

			return this.inherited(arguments);
		}
	});
});