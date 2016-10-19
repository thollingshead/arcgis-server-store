import {inject} from 'aurelia-dependency-injection';
import {HttpClient} from 'aurelia-fetch-client';
import {bindable} from 'aurelia-templating';

const STATE = {
	NONE: {
		class: '',
		icon: '',
		aria: ''
	},
	LOADING: {
		class: 'has-feedback',
		icon: 'fa-circle-o-notch fa-spin',
		aria: '(loading...)'
	},
	ERROR: {
		class: 'has-error has-feedback',
		icon: 'fa-close',
		aria: '(error)'
	},
	WARNING: {
		class: 'has-warning has-feedback',
		icon: 'fa-warning',
		aria: '(warning)'
	},
	SUCCESS: {
		class: 'has-success has-feedback',
		icon: 'fa-check',
		aria: '(success)'
	}
};

@inject(HttpClient)
export class ServiceInput {
	@bindable url = '';
	@bindable service = {};

	constructor(http) {
		this._http = http;
		this.state = STATE.NONE;
	}

	urlChanged(url) {
		this.state = STATE.NONE;
	}

	blur() {
		if (this.url.length > 0) {
			if (this.url !== this._fetchedUrl) {
				this.fetchInfo();
				this._fetchedUrl = this.url;
			}
		} else {
			this.state = STATE.NONE;
		}
	}

	fetchInfo() {
		this.state = STATE.LOADING;

		this._http.fetch(`${this.url}?f=json`)
			.then(response => response.json())
			.then(info => {
				if (!info.fields || !info.capabilities) {
					throw new Error('Invalid layer info');
				}
				this.state = STATE.SUCCESS;
				this.service = info;
			})
			.catch((error) => {
				this.state = STATE.ERROR;
				this.service = {};
			});
	}
}
