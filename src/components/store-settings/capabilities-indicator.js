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

		const map = this.capabilities.includes('Map');
		const data = this.capabilities.includes('Data');
		const query = this.capabilities.includes('Query');

		this.supported.set('Get', query && (!map || data));
		this.supported.set('Put', this.capabilities.includes('Update'));
		this.supported.set('Add', this.capabilities.includes('Create'));
		this.supported.set('Remove', this.capabilities.includes('Delete'));
		this.supported.set('Query', query && (!map || data));
	}
}
