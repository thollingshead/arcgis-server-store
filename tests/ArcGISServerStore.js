define([
	'intern!object',
	'intern/chai!assert',

	'../ArcGISServerStore'
], function(
	registerSuite, assert,
	ArcGISServerStore
) {
	var store;
	registerSuite({
		name: 'constructor',
		setup: function() {
			store = new ArcGISServerStore({});
		},
		idProperty: function() {
			assert.strictEqual(store.idProperty, 'OBJECTID', 'Default idProperty is OBJECTID');
		}
	});
});