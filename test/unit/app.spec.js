import {App} from '../../src/app';

describe('the App module', () => {
	let sut;

	beforeEach(() => {
		sut = new App();
	});

	it('has a message property', () => {
		expect(sut.message).toBeDefined();
	});

	it('has a hello world message', () => {
		expect(sut.message).toEqual('Hello World!');
	});
});
