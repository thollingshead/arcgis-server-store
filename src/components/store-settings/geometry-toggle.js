import {bindable} from 'aurelia-templating';
import 'bootstrap-switch';

export class GeometryToggle {
	@bindable returnGeometry = false;

	attached() {
		$(this._toggle).bootstrapSwitch({
			state: this.returnGeometry,
			onSwitchChange: (evt, state) => {
				this.returnGeometry = state;
			}
		});
	}
}
