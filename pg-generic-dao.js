'use strict';

var pg                  = require('pg');
var Promise             = require('promise');
var _                   = require('underscore');

var mapper              = require('./mapper');
var pgDaoUtils          = require('./pg-dao-utils');
var pgQueryExtender     = require('./pg-query-extender');


var PgGenericDao = function (options) {
    if (_.isEmpty(options) || !_.isObject(options)) {
        throw new Error('Options argument is missing or is not an object');
    }
    
    if (_.isEmpty(options.connectTo) || !_.isString(options.connectTo)) {
        throw new Error('ConnectTo option is missing or is not a string.');
    }
    
    if (_.isEmpty(options.table) || !_.isString(options.table)) {
        throw new Error('Table argument is missing or is not a string.');
    }
    
    if (_.isEmpty(options.fields) || !_.isArray(options.fields)) {
        throw new Error('Fields argument is missing or is not an array.');
    }
    
    this._connStr = options.connectTo;
    this._table = options.table;
    this._fields = options.fields;
    this._instanceFactory = options.instanceFactory || null;
};

PgGenericDao.prototype.connectionString = function () {
    return this._connStr;
};

PgGenericDao.prototype.table = function () {
    return this._table;
};

PgGenericDao.prototype.fields = function () {
    return this._fields;
};

PgGenericDao.prototype.save = function (entity) {
    var toInsert = {};
    this.fields().forEach(function (field) {
        toInsert[field] = entity[field];
    });
    
    var promise = PgGenericDao.insert({
        connectTo: this.connectionString(),
        table: this.table(),
        value: toInsert,
        idField: 'id'
    });
    
    return promise;
};

PgGenericDao.prototype.update = function (entity) {
    var toUpdate = {};
    this.fields().forEach(function (field) {
        toUpdate[field] = entity[field];
    });
    
    var promise = PgGenericDao.update({
        connectTo: this.connectionString(),
        table: this.table(),
        value: toUpdate,
        filter: [ 'id', '=', entity.id ]
    });
    
    return promise;
};

PgGenericDao.prototype.delete = function (id) {
    var promise = PgGenericDao.delete({
        connectTo: this.connectionString(),
        table: this.table(),
        filter: [ 'id', '=', id ]
    });
    
    return promise;
};

PgGenericDao.prototype.find = function (id) {
    var self = this;
    
    return new Promise(function (resolve, reject) {
        PgGenericDao.queryByFields({
            connectTo: self.connectionString(),
            table: self.table(),
            fields: self.fields(),
            filter: [ 'id', '=', id ]
        })
        .then(function (result) {
            if (result.length) {
                resolve(result[0]);
            }
            else {
                resolve(null);
            }
        })
        .catch(function (err) {
            reject(err);
        });        
    });
};

PgGenericDao.prototype.all = function (options) {
    options = options || {}; 
    
    return PgGenericDao.queryByFields({
        connectTo: this.connectionString(),
        table: this.table(),
        fields: this.fields(),
        filter: options.filter,
        sorting: options.sorting,
        paging: options.paging
    });
};

PgGenericDao.rawTransformedQuery = function (options) {
    if (_.isEmpty(options) || !_.isObject(options)) {
        throw new Error('Options argument is missing or is not an object');
    }
    
    return new Promise(function (resolve, reject) {
        pg.connect(options.connectTo, function (err, client, done) {
            if (err) {
                done();
                reject(err);
                return;
            }
            
            client.query(options.query, options.params, function (err, result) {
                if (err) {
                    done();
                    reject(err);
                    return;
                }
                
                done();
                
                var mappedResult = result.rows.map(
                    function (it) {
                        var nestedObj = mapper.fromFlatObject(it);
                        return mapper.transformKeys(nestedObj, mapper.underscoreToCamelCase);
                    });
                
                resolve(mappedResult);
            });
        });
    });
};

PgGenericDao.rawExec = function (options) {
    if (_.isEmpty(options) || !_.isObject(options)) {
        throw new Error('Options argument is missing or is not an object');
    }
    
    return new Promise(function (resolve, reject) {
        pg.connect(options.connectTo, function (err, client, done) {
            if (err) {
                done();
                reject(err);
                return;
            }
            
            client.query(options.query, options.params, function (err, result) {
                if (err) {
                    done();
                    reject(err);
                    return;
                }
                
                done();
                resolve(result);
            });
        });
    });
};

PgGenericDao.insert = function (options) {
    if (_.isEmpty(options) || !_.isObject(options)) {
        throw new Error('Options argument is missing or is not an object');
    }
    
    var map = [];
    var key;
    for (key in options.value) {
        if (!options.value.hasOwnProperty(key)) {
            continue;
        }
        
        map.push(key);
    }
    
    var updateFields = pgDaoUtils.getUpdateFields(map);        
    var fieldList = pgDaoUtils.createInsertFieldList(updateFields);
    var paramList = pgDaoUtils.createInsertParamList(updateFields); 
    var params = pgDaoUtils.createParams(updateFields, options.value);
    
    var query = 'INSERT INTO "' + options.table + '" (' + fieldList + ') VALUES (' + paramList + ')';
    
    if (options.idField) {
        query += ' RETURNING "' + options.idField + '"';
    }
    
    return new Promise(function (resolve, reject) {
        PgGenericDao.rawExec({
            connectTo: options.connectTo,
            query: query,
            params: params
        })
        .then(function (result) {
            if (options.idField) {
                var id = result.rows[0][options.idField];
                options.value[options.idField] = id;
            }
            
            resolve(options.value);
        })
        .catch(function (err) {
            reject(err);
        });
    });
};

PgGenericDao.update = function (options) {
    if (_.isEmpty(options) || !_.isObject(options)) {
        throw new Error('Options argument is missing or is not an object');
    }
    
    var map = [];
    var key;
    for (key in options.value) {
        if (!options.value.hasOwnProperty(key)) {
            continue;
        }
        map.push(key);
    }
    
    var updateFields = pgDaoUtils.getUpdateFields(map);    
    var fieldAndParamList = pgDaoUtils.createUpdateFieldAndParamList(updateFields);
    var params = pgDaoUtils.createParams(updateFields, options.value);
    
    var filter;
    if (options.filter) {
        filter = pgQueryExtender.createFilterByClause(options.filter, '', params.length + 1);
        filter.params.forEach(function (it) { params.push(it); });    
    }
    else {
        filter = {
            query: '',
            params: []
        };
    }
            
    var query = 'UPDATE "' + options.table + '" SET ' + fieldAndParamList;
    if (filter.query) {
        query += ' WHERE ' + filter.query;
    }
    
    var promise = PgGenericDao.rawExec({
        connectTo: options.connectTo,
        query: query,
        params: params
    });
    
    return promise;
};

PgGenericDao.delete = function (options) {
    if (_.isEmpty(options) || !_.isObject(options)) {
        throw new Error('Options argument is missing or is not an object');
    }
    
    var query = 'DELETE FROM "' + options.table + '"';
    
    var filterQuery;
    if (options.filter) {
        filterQuery = pgQueryExtender.createFilterByClause(options.filter);
    }
    else {
        filterQuery = {
            query: '',
            params: []
        };
    }
    
    var params = [];
    
    if (filterQuery.query) {
        query += ' WHERE ' + filterQuery.query;
        
        filterQuery.params.forEach(function (it) {
            params.push(it);
        });
    }
    
    var promise = PgGenericDao.rawExec({
        connectTo: options.connectTo,
        query: query,
        params: params
    });
    return promise;
};

PgGenericDao.queryByFields = function (options) {
    if (_.isEmpty(options) || !_.isObject(options)) {
        throw new Error('Options argument is missing or is not an object');
    }
    
    var fieldList = pgDaoUtils.createSelectFieldList(options.fields);
    var query = 'SELECT ' + fieldList + ' FROM "' + options.table + '"';
    
    var extendedQuery = pgQueryExtender
        .extend(query, options.filter, options.sorting, options.paging);
    
    return PgGenericDao.rawTransformedQuery({
        connectTo: options.connectTo,
        query: extendedQuery.query,
        params: extendedQuery.params
    });
};


module.exports = PgGenericDao;
