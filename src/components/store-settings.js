import config from '../config';
import {Redirect} from 'aurelia-router';
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

	canActivate() {
		// Don't show as router-view if sidebar is not hidden
		return window.innerWidth < config.SCREEN_SMALL_BREAKPOINT_PX || new Redirect('');
	}

	activate(params, routeConfig, navigationInstruction) {
		if (navigationInstruction.config.settings) {
			this.settings = navigationInstruction.config.settings.settings;
			this.service = navigationInstruction.config.settings.service;
		}
	}

	serviceChanged() {
		if (this.service.objectIdField) {
			const validIdProperty = this.service.fields.some((field) => field.name === this.settings.idProperty);
			if (!validIdProperty) {
				this.settings.idProperty = this.service.objectIdField;
			}
		}
	}
}
