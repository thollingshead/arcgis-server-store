import {bindable} from 'aurelia-templating';

export class StoreSettings {
	@bindable settings = {
		url: '',
		flatten: true,
		idProperty: '',
		outFields: [],
		returnGeometry: false
	};
}
