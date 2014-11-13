define([
	'./MockData',

	'dojo/request/registry',
	'dojo/when'
], function(
	MockData,
	registry, when
) {
	var data;
	var mocking = false;
	var handles = [];

	var start = function() {
		if (mocking) {
			return;
		}

		mocking = true;
		data = new MockData({
			type: 'FeatureServer'
		});

		var info = registry.register(/FeatureServer\/[0-9]*$/, function(url, query) {
			return when(data.serviceDefinition);
		});
		handles.push(info);
	};

	var stop = function() {
		if (!mocking) {
			return;
		}

		mocking = false;
		data = null;

		var handle;
		while ((handle = handles.pop())) {
			handle.remove();
		}
	};

	var reset = function() {
		data = new MockData({
			type: 'FeatureServer'
		});
	};

	return {
		reset: reset,
		start: start,
		stop: stop
	};
});