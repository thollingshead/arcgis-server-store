import 'bootstrap';

export function configure(aurelia) {
	aurelia.use
		.standardConfiguration();

	aurelia.start().then(() => aurelia.setRoot());
}
