import {bindable} from 'aurelia-templating';

export class StoreSettings {
	@bindable service = {};
	@bindable settings = {
		url: '',
		flatten: true,
		idProperty: '',
		outFields: [],
		returnGeometry: false
	};

	serviceChanged() {
		if (this.service.objectIdField) {
			const validIdProperty = this.service.fields.some((field) => field.name === this.settings.idProperty);
			if (!validIdProperty) {
				this.settings.idProperty = this.service.objectIdField;
			}
		}
	}
}
