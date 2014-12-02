define([
	'dojo/_base/lang',
	'dojo/request/registry',

	'esri/urlUtils'
], function(
	lang, registry,
	urlUtils
) {
	return function(req, options) {
		var parsed = urlUtils.urlToObject(req.url);
		return registry(parsed.path, lang.mixin(parsed.query, req.content));
	};
});