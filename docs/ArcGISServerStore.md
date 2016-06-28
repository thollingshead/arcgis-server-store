# ArcGISServerStore

An implementation of the 
[dojo/store API](http://dojotoolkit.org/reference-guide/1.10/dojo/store.html) 
for ArcGIS Server REST services. This 
store performs all operations asynchronously, returning a promise for the 
result of the operation. Operations are dependent upon capabilities of 
the ArcGIS Server REST services, and may throw an error if the capabilities 
required for the operation are not available.

### Property Summary

| Property         | Description                                                                                                                                                                 |
|------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `idProperty`     | If the store has a single primary key, this indicates the property to use as the identity property. The values of this property should be unique. Defaults to `"OBJECTID"`. |
| `flatten`        | If `true`, include attributes as top-level properties of store data. Defaults to `true`.                                                                                    |
| `outFields`      | Attribute fields to include in store output. Defaults to `['*']`.                                                                                                           |
| `returnGeometry` | If `true`, include geometry in store output. Defaults to `true`.                                                                                                            |

### Method Summary

| Method                      | Description                                                                                                                                                                                                                     |
|-----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `get(id)`                   | This retrieves an object by its identity. This returns a promise for the object. If no object was found, the resolved value should be `undefined`.                                                                              |
| `getIdentity(object)`       | This returns an object's identity (This should always execute synchronously).                                                                                                                                                   |
| `put(object, [directives])` | This stores an object. It can be used to update or create an object. This returns a promise that may resolve to the object's object ID.                                                                                         |
| `add(object, [directives])` | This creates an object. This should return a promise that may resolve to the object's object ID.                                                                                                                                |
| `remove(id)`                | This deletes an object, using the identity to indicate which object to delete. This returns a promise that resolves to a boolean value indicating whether the object was successfully removed.                                  |
| `query(query, [options])`   | This queries the store for objects. The query can be an object specifying attribute values, or an `esri\tasks\query` object. This returns a promise that resolves to the results of the query, extended with iterative methods. |
| `transaction()`             | This creates a new transaction on the store. This returns a transaction object with `commit` and `abort` methods.                                                                                                               |