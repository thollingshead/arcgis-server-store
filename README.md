#arcgis-server-store

An implementation of the 
[dojo/store API](http://dojotoolkit.org/reference-guide/1.10/dojo/store.html) 
for ArcGIS Server REST services.


## Features

- Add, delete, update and query feature services.
- Easily integrates with store-backed components, such as dgrid and 
  FilteringSelect.


## Usage

#### Install

Download, clone, or fork from GitHub, or install using a package manager.

Bower:
```bash
bower install --save arcgis-server-store
```

NPM:
```bash
npm install --save arcgis-server-store
```

#### Setup

Configure the Dojo loader for use with the ArcGISServerStore. 

```JavaScript
var dojoConfig = {
	packages: [{
		name: 'ArcGISServerStore',
		location: 'path/to/store',
		main: 'ArcGISServerStore'
	}]
};
```

See the 
[Configuring Dojo with dojoConfig tutorial](http://dojotoolkit.org/documentation/tutorials/1.10/dojo_config/) 
for more details on configuring the AMD loader.

#### Create a Store

Create a store using an ArcGIS REST service. See the 
[properties section](./docs/ArcGISServerStore.md#property-summary) 
for more details on the available options.

```JavaScript
require([
	'ArcGISServerStore'
], function(
	ArcGISServerStore
) {
	var url = 'http://example.com/path/to/service/FeatureServer/0';

	var store = new ArcGISServerStore({
		url: url,
		idProperty: 'OBJECTID',
		flatten: true,
		outFields: ['NAME', 'CATEGORY'],
		returnGeometry: false
	});
});
```

Use a 
[Cache Store](http://dojotoolkit.org/reference-guide/1.10/dojo/store/Cache.html) 
as needed to improve performance:

```JavaScript
var memStore = new Memory();
var cachedStore = new Cache(store, memStore);
```

#### Use the store

Use it in a dijit:

```JavaScript
var filteringSelect = new FilteringSelect({
	store: store,
	searchAttr: 'NAME'
});
```

or to manage data:

```JavaScript
// Add an object
store.add({NAME: 'New', CATEGORY: 'Sample Data'});

// Retrieve an object
store.get(1);

// Update an object
store.put({OBJECTID: 1, NAME: 'Edited'});

// Query for objects
store.query({NAME: 'Edited'});

var q = new Query();
q.where = 'OBJECTID < 4';
store.query(q);

// Remove an object
store.remove(1);

// Batch updates
var trans = store.transaction();
store.add({NAME: 'New', CATEGORY: 'Sample Transaction'});
store.put({OBJECTID: 2, NAME: 'Edited', CATEGORY: 'Transaction'});
trans.commit();
```

Refer to the 
[ArcGISServerStore documentation](./docs/ArcGISServerStore.md) 
for more information.


## Reporting Issues

Find a bug or want to suggest an improvement? Please 
[submit an issue.](https://github.com/thollingshead/arcgis-server-store/issues)


## Contributing

Your contributions are welcome!

Although there is no formal styleguide, please be careful to match the existing 
style. Please include unit tests with any changed or new functionality, and use 
grunt to lint your code.

To contribute:

1. Fork the repository on GitHub
2. Commit changes to a branch in your fork
3. Merge the latest from "upstream"
4. Pull request "upstream" with your changes

### Testing

Testing is done in the browser with [Intern](http://theintern.github.io/).

#### Setting Up

1. Run `npm install` to install local dependencies.
2. Run `grunt setup` to download the ArcGIS API for JavaScript libraries.

**Note:** Commands listed in this section are all written assuming they are run 
inside the repositories root directory.

#### Running via the browser

1. Open a browser to http://hostname/path_to_repository/tests/runIntern.html
2. View the console


## License

This project is available under the 
[MIT License](./LICENSE).
