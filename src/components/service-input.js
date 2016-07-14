import {bindable, inject} from 'aurelia-framework';
import {HttpClient} from 'aurelia-fetch-client';

const STATE = {
	NONE: {
		class: '',
		icon: '',
		aria: ''
	},
	LOADING: {
		class: 'has-feedback',
		icon: 'fa-circle-o-notch fa-spin',
		area: '(loading...)'
	},
	ERROR: {
		class: 'has-error has-feedback',
		icon: 'fa-close',
		area: '(error)'
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
		this.http = http;
		this.state = STATE.NONE;
	}

	urlChanged(url) {
		this.state = STATE.NONE;
	}

	blur() {
		if (this.url.length > 0) {
			this.fetchInfo();
		} else {
			this.state = STATE.NONE;
		}
	}

	fetchInfo() {
		this.state = STATE.LOADING;

		this.http.fetch(`${this.url}?f=json`)
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
