# Simple Postgres DAO for Node
## Philosophy

Existing ORMs for Node provide too much functionality thus becoming too heavyweight.

Package **pg-generic-dao** provides extremelly simple and lightweight layer over PostgreSQL database for Node.

### Features not included compared to other ORMs
1. No change tracker
2. No identity map

### Features included
1. Simple mapper that maps underscore named fields to Node plain objects with camel-case named properties;
2. CRUD operations;
3. Filtering, sorting and paging support.

## Mapping strategies
1. Case of database field names is ignored.
2. Underscores are removed, next letter after underscore is converted to uppercase letter. For example: `field` -> `field`, `complex_field` -> `complexField`
3. Double underscore will be converted to nested Node object. For example: `very__complex_field` -> `{ "very": { "complexField": ... } }`

## "id" field
1. Every database table must contain "id" field. Currently only auto-incremented surrogate keys are supported.

## CRUD examples


## Binding to existing Node classes
```javascriptvar connStr = 'postgres://postgres:123qwe@localhost:5432/tests';
var tableName = 'test_table_1';

// Fields: id, very_long_name, shortname
var columns = [ 'id', 'veryLongName', 'shortname' ];

var dao = new PgGenericDao({
	connectTo: connStr,
    table: tableName,
    fields: columns
});


// Inserting new row
dao.save({
	veryLongName: 'abc',
	shortname: 'def'
})
.then(function (entity) {
})
.catch(function (err) {
});

// Updating existing row
dao.update({
	veryLongName: 'abc',
	shortname: 'def'
})
.then(function (entity) {
})
.catch(function (err) {
});

// Deleting existing row
dao.delete({ id: 1 })
.then(function (entity) {
})
.catch(function (err) {
});

// Find single row
dao.find(entity.id)
.then(function (foundEntity) {
})
.catch(function (err) {
});

// Find all rows
dao.all()
.then(function (result) {
})
.catch(function (err) {
});

```