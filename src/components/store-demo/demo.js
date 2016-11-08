import {BindingEngine} from 'aurelia-binding';
import {inject} from 'aurelia-dependency-injection';

@inject(BindingEngine)
export class Demo {
	constructor(bindingEngine) {
		this._bindingEngine = bindingEngine;
		this._subscriptions = [];

		this.settings = {};
		this.service = {};
	}

	activate(params, routeConfig, navigationInstruction) {
		if (navigationInstruction.parentInstruction.config.settings) {
			this.settings = navigationInstruction.parentInstruction.config.settings.settings;
			this.service = navigationInstruction.parentInstruction.config.settings.service;
		}
	}

	bind() {
		const settingsSubscriptions = Object.keys(this.settings).map((property) => {
			if (Array.isArray(this.settings[property])) {
				return this._bindingEngine.collectionObserver(this.settings[property]).subscribe(this._settingsChanged.bind(this, property));
			}
			return this._bindingEngine.propertyObserver(this.settings, property).subscribe(this._settingsChanged.bind(this, property));
		});
		this._subscriptions = [...this._subscriptions, ...settingsSubscriptions];
	}

	unbind() {
		while (this._subscriptions.length) {
			this._subscriptions.pop().dispose();
		}
	}

	_settingsChanged(property, newValue, oldValue) {
		// Only signal url changed when loaded successfully
		if (property === 'url') {
			this._oldUrl = this._oldUrl || oldValue;
			return;
		} else if (property === 'outFields' && this._oldUrl) {
			property = 'url';
			newValue = this.settings.url;
			oldValue = this._oldUrl;
			delete this._oldUrl;
		}

		if (this[`${property}Changed`]) {
			this[`${property}Changed`](newValue, oldValue);
		}
		this.settingsChanged(property, newValue, oldValue);
	}

	settingsChanged() {}
}
