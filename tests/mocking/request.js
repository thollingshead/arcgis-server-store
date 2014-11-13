define([
	'dojo/request/registry',

	'esri/urlUtils'
], function(
	registry,
	urlUtils
) {
	return function(req, options) {
		var parsed = urlUtils.urlToObject(req.url);
		return registry(parsed.path, parsed.query);
	};
});