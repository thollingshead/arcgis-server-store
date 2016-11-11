function register(mods) {
	const names = mods.map((location) => {
		let start;
		['unpkg.com', 'esri', 'dojo', 'dgrid'].some((prefix) => {
			start = location.lastIndexOf(prefix);
			return start + 1;
		});

		return location.substring(start).replace('unpkg.com/', '');
	});

	require(mods, (...modules) => {
		modules.forEach((module, i) => {
			System.register(names[i], [], (_export) => {
				return {
					setters: [],
					execute: () => {
						_export('default', module);
					}
				};
			});
		});
	});
}

register([
	'//unpkg.com/arcgis-server-store',

	'dgrid/OnDemandGrid',
	'dgrid/Keyboard',
	'dgrid/extensions/ColumnHider',
	'dgrid/extensions/ColumnReorder',
	'dgrid/extensions/ColumnResizer',

	'dojo/_base/declare',
	'dojo/date/locale',
	'dojo/number'
]);
