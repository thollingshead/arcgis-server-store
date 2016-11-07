import config from '../config';
import {Redirect} from 'aurelia-router';
import {bindable} from 'aurelia-templating';

export class StoreDemo {
	@bindable type = '';
	@bindable mode = '';

	constructor() {
		this._types = [{
			name: 'dgrid',
			route: 'dgrid',
			module: 'dgrid'
		}];

		this._modes = [{
			name: 'Preview',
			icon: 'fa-flask',
			route: 'preview'
		}];
	}

	activate(params, routeConfig, navigationInstruction) {
		if (navigationInstruction.config.settings) {
			this.settings = navigationInstruction.config.settings.settings;
			this.service = navigationInstruction.config.settings.service;
		}

		if (navigationInstruction.params.childRoute) {
			[this.type, this.mode] = navigationInstruction.params.childRoute.split('/');
		}
	}

	modeChanged() {
		this.router.navigate(`${this.type}/${this.mode}`);
	}

	typeChanged() {
		this.router.navigate(`${this.type}/${this.mode}`);
	}

	configureRouter(configuration, router) {
		this.router = router;

		const routes = [];
		this._types.forEach((type) => {
			this._modes.forEach((mode) => {
				routes.push({route: `${type.route}/${mode.route}`, moduleId: `components/store-demo/${type.module}`, title: `${type.name}`});
			});
		});
		configuration.map(routes);

		configuration.mapUnknownRoutes({redirect: `${this._types[0].route}/${this._modes[0].route}`});
	}

	click(evt) {
		// Discover input radio button
		let input;
		if (evt.target.control && evt.target.control.type === 'radio') {
			input = evt.target.control;
		} else if (evt.target.lastElementChild && evt.target.lastElementChild.type === 'radio') {
			input = evt.target.lastElementChild;
		} else if (evt.target.previousElementSibling && evt.target.previousElementSibling.type === 'radio') {
			input = evt.target.previousElementSibling;
		}

		if (input) {
			// Simulate radio button click
			input.dispatchEvent(new MouseEvent('click', {
				view: window,
				bubbles: false,
				cancelable: false
			}));
		}
	}
}
