import {bindable} from 'aurelia-templating';

export class CapabilitiesIndicator {
	@bindable capabilities = [];

	constructor() {
		this.supported = new Map([
			['Get', false],
			['Put', false],
			['Add', false],
			['Remove', false],
			['Query', false]
		]);
	}

	capabilitiesChanged() {
		this.capabilities = this.capabilities || [];

		const map = this.capabilities.indexOf('Map') > -1;
		const data = this.capabilities.indexOf('Data') > -1;
		const query = this.capabilities.indexOf('Query') > -1;

		this.supported.set('Get', query && (!map || data));
		this.supported.set('Put', this.capabilities.indexOf('Update') > -1);
		this.supported.set('Add', this.capabilities.indexOf('Create') > -1);
		this.supported.set('Remove', this.capabilities.indexOf('Delete') > -1);
		this.supported.set('Query', query && (!map || data));
	}
}
