import {inject} from 'aurelia-dependency-injection';
import {bindable} from 'aurelia-templating';
import {BindingSignaler} from 'aurelia-templating-resources';
import 'bootstrap-switch';

@inject(BindingSignaler)
export class FieldSelector {
	@bindable fields = [];
	@bindable outFields = [];

	constructor(signaler) {
		this._signaler = signaler;
	}

	attached() {
		// Bootstrap-Switch workaround (call switchChange when dragging from indeterminate)
		const fireSwitchChange = () => {
			if (this.outFields.length && this.outFields.length < this.fields.length) {
				$(this._toggle).trigger('switchChange.bootstrapSwitch', this._toggle.checked);
			}
		};
		$(this._toggle).on({
			'change.bootstrapSwitch': fireSwitchChange
		});

		// Create toggle switch
		$(this._toggle).bootstrapSwitch({
			onSwitchChange: (evt, state) => {
				if (state) {
					this.fieldsChanged();
				} else {
					while (this.outFields.length) {
						this.outFields.pop();
					}
				}
				this._signaler.signal('out-fields');
			}
		});
	}

	fieldsChanged() {
		if (!this.fields) {
			return;
		}

		// Refresh outFields (all selected)
		this.outFields.length = 0;
		this.fields.map((field) => {
			this.outFields.push(field.name);
		});

		// Update toggle switch state
		$(this._toggle).bootstrapSwitch('state', true);
	}

	click(evt) {
		// Discover input checkbox
		let input;
		if (evt.target.control && evt.target.control.type === 'checkbox') {
			input = evt.target.control;
		} else if (evt.target.lastElementChild && evt.target.lastElementChild.type === 'checkbox') {
			input = evt.target.lastElementChild;
		}

		if (input) {
			// Simulate checkbox click
			input.dispatchEvent(new MouseEvent('click', {
				view: window,
				bubbles: false,
				cancelable: true
			}));

			// Update button state
			this._signaler.signal('out-fields');

			// Update toggle switch state
			if (this.outFields.length === this.fields.length) {
				$(this._toggle).bootstrapSwitch('state', true);
			} else if (this.outFields.length) {
				$(this._toggle).bootstrapSwitch('indeterminate', true);
			} else {
				$(this._toggle).bootstrapSwitch('state', false);
			}
		}
	}
}
