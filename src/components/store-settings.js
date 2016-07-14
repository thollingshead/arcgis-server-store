import {bindable} from 'aurelia-framework';

export class StoreSettings {
	@bindable settings = {
		url: '',
		flatten: true,
		idProperty: 'OBJECTID',
		outFields: ['*'],
		returnGeometry: false
	};
}
