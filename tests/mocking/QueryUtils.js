define([], function() {
	var sort = function(fields) {
		fields = fields && fields.split(',') || [];
		if (fields.length) {
			var field = fields.shift();
			var parts = field.match(/(\S+)\s?(ASC|DESC)?/);
			field = parts[1];

			var next = sort(fields.join(','));
			if (parts.length > 2 && parts[2] === 'DESC') {
				return function(a, b) {
					if (a.attributes[field] > b.attributes[field]) {
						return -1;
					} else if (b.attributes[field] > a.attributes[field]) {
						return 1;
					} else {
						return next;
					}
				};
			} else {
				return function(a, b) {
					if (a.attributes[field] < b.attributes[field]) {
						return -1;
					} else if (b.attributes[field] < a.attributes[field]) {
						return 1;
					} else {
						return next;
					}
				};
			}
		} else {
			return function(a, b) {
				return 0;
			};
		}
	};

	var format = function(value) {
		value = value.trim();
		if (/^(\'|\").*(\'|\")$/.test(value)) {
			return value.substring(1, value.length - 1);
		} else {
			try {
				return parseInt(value, 10);
			} catch (e) {
				try {
					return parseFloat(value, 10);
				} catch (err) {
					return value;
				}
			}
		}
	};

	var evaluate = function(clause) {
		var parts, field, operator, value;
		if (/\S+\s+IN\s+\(.*\)/.test(clause)) {
			// Handle an IN statement
			parts = clause.match(/(\S+)\s+IN\s+\((.*)\)/);
			field = parts[1];
			value = parts[2].split(',');
			value = value.map(function(val) {
				return format(val);
			});
			return function(object) {
				if (object.hasOwnProperty('attributes') && object.attributes.hasOwnProperty(field)) {
					return value.indexOf(object.attributes[field]) !== -1;
				}
			};
		} else if (/\S+\s*[<>=]+\s*.*/.test(clause)) {
			// Handle an <>= statement
			parts = clause.match(/(\S+)\s*([<>=]+)\s*(.*)/);
			field = parts[1];
			operator = parts[2];
			value = format(parts[3]);
			switch (operator) {
				case '<':
					return function(object) {
						return (object.attributes && object.attributes.hasOwnProperty(field)) ? object.attributes[field] < value : format(field) < value;
					};
				case '<=':
					return function(object) {
						return (object.attributes && object.attributes.hasOwnProperty(field)) ? object.attributes[field] <= value : format(field) <= value;
					};
				case '=':
					return function(object) {
						return (object.attributes && object.attributes.hasOwnProperty(field)) ? object.attributes[field] == value : format(field) == value;
					};
				case '>=':
					return function(object) {
						return (object.attributes && object.attributes.hasOwnProperty(field)) ? object.attributes[field] >= value : format(field) >= value;
					};
				case '>':
					return function(object) {
						return (object.attributes && object.attributes.hasOwnProperty(field)) ? object.attributes[field] > value : format(field) > value;
					};
				default:
					return function(object) {
						return false;
					};
			}
		} else {
			throw new Error('Invalid query where clause:', clause);
		}
	};

	var parse = function(clause) {
		if (typeof clause === 'string') {
			clause = /^\((.*)\)$/.test(clause) ? clause.match(/^\((.*)\)$/)[1] : clause;
			clause = clause.split(/\s+OR\s+(?![^\(]*\))/);

			if (clause.length === 1) {
				clause = clause[0].split(/\s+AND\s+(?![^\(]*\))/);
				if (clause.length === 1) {
					return evaluate(clause[0]);
				} else {
					return function(object) {
						return parse(clause[0])(object) && parse(clause[1])(object);
					};
				}
			} else {
				return function(object) {
					return parse(clause[0])(object) || parse(clause[1])(object);
				};
			}
		} else {
			return clause;
		}
	};

	return {
		parse: parse,
		sort: sort
	};

});