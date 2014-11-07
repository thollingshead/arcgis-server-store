define([
	'dojo/_base/array',
	'dojo/_base/declare',
	'dojo/_base/lang',

	'esri/request'
], function(
	array, declare, lang,
	esriRequest
) {

	return declare(null, {
		idProperty: 'OBJECTID',
		queryEngine: null,

		loaded: false,
		returnGeometry: true,

		constructor: function(options) {
			// Initialize outFields
			this.outFields = ['*'];

			// Mixin Options
			declare.safeMixin(this, options);

			// Initialize Capabilities
			this.capabilities = {
				Query: false,
				Create: false,
				Delete: false,
				Update: false,
				Editing: false
			};

			// Get Service Info
			if (this.url) {
				esriRequest({
					url: this.url,
					content: {
						f: 'json'
					},
					handleAs: 'json'
				}).then(lang.hitch(this, '_initStore'), function(error) {
					throw new Error('Invalid url. Cannot create store.');
				});
			} else {
				throw new Error('Missing required property: \'url\'');
			}
		},
		/**
		 * Retrieves and object by its identity
		 * @param  {Number} id The identity to use to lookup the object
		 * @return {Object}
		 */
		get: function(id) {

		},
		/**
		 * Return an object's identity
		 * @param  {Object} object The object to get the identity from
		 * @return {Number}
		 */
		getIdentity: function(object) {

		},
		/**
		 * Stores an object
		 * @param  {Object} object     The object to store.
		 * @param  {Object} options    Additional options for storing objects
		 * @return {Number}
		 */
		put: function(object, options) {

		},
		/**
		 * Creates an object, throws an error if the object already exists
		 * @param {Object} object     The object to store.
		 * @param {Object} options    Additional options for creating objects
		 * @return {Number}
		 */
		add: function(object, options) {

		},
		/**
		 * Deletes an object by its identity
		 * @param  {Number} id The identity to use to delete the object
		 */
		remove: function(id) {

		},
		/**
		 * Queries the store for objects. This does not alter the store, but returns
		 * a set of data from the store.
		 * @param  {String|Object|Function} query   The query to use for retrieving objects from the store
		 * @param  {Object} options                 Optional arguments to apply to the result set
		 * @return {Object}                         The results of the query, extended with iterative methods.
		 */
		query: function(query, options) {

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

			// Set loaded
			this.loaded = true;
		}
	});
});