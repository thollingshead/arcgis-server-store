import {Demo} from './demo';

import ArcGISServerStore from 'arcgis-server-store';
import debounce from 'debounce';

import OnDemandGrid from 'dgrid/OnDemandGrid';
import Keyboard from 'dgrid/Keyboard';

import ColumnHider from 'dgrid/extensions/ColumnHider';
import ColumnReorder from 'dgrid/extensions/ColumnReorder';
import ColumnResizer from 'dgrid/extensions/ColumnResizer';

import declare from 'dojo/_base/declare';
import locale from 'dojo/date/locale';
import number from 'dojo/number';

const Grid = declare([OnDemandGrid, Keyboard, ColumnHider, ColumnReorder, ColumnResizer]);

export class Dgrid extends Demo {
	constructor(...args) {
		super(...args);

		this.settingsChanged = debounce(this.settingsChanged, 200);
	}

	attached() {
		// TODO: Style the messages
		this.grid = new Grid({
			columns: [],
			loadingMessage: '<i class="fa fa-circle-o-notch fa-spin"></i><span class="sr-only">Loading...</span>',
			noDataMessage: '<span><i class="fa fa-frown-o"></i> No data</span>'
		}, this._gridNode);
		this.grid.startup();
	}

	get columns() {
		const outFields = this.service.fields.filter((field) => {
			return this.settings.outFields.includes(field.name);
		});

		const columnDefinitions = outFields.map((field, i) => {
			// Basic properties
			const definition = {
				label: field.alias,
				field: field.name
			};
			if (field.type === 'esriFieldTypeDate') {
				definition.formatter = (value) => locale.format(new Date(value), {formatLength: 'medium'});
			} else if (['esriFieldTypeInteger', 'esriFieldTypeSmallInteger', 'esriFieldTypeFloat', 'esriFieldTypeDouble'].includes(field.type)) {
				definition.formatter = number.format;
			}

			// ColumnHider properties
			const hider = {};
			Object.assign(definition, hider);

			// ColumnReorder properties
			const reorder = {};
			Object.assign(definition, reorder);

			// ColumnResizer properties
			const resizer = {};
			Object.assign(definition, resizer);

			return definition;
		});

		return columnDefinitions;
	}

	settingsChanged() {
		this.store = new ArcGISServerStore(this.settings);
		this.grid.set('store', this.store);
	}

	outFieldsChanged() {
		this.grid.set('columns', this.columns);
	}

	urlChanged() {
		this.grid.set('columns', this.columns);
	}
}
