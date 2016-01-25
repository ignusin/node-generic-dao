var pg                  = require('pg');
var Promise             = require('promise');
var _                   = require('underscore');

var mapper              = require('./mapper');
var pgDaoUtils          = require('./pg-dao-utils');
var pgQueryExtender     = require('./pg-query-extender');


var PgGenericDao = function (connStr, table, map) {
    if (_.isEmpty(connStr) || !_.isString(connStr)) {
        throw 'ConnStr argument is missing or is not an object.';
    }
    
    if (_.isEmpty(table) || !_.isString(table)) {
        throw 'Table argument is missing or is not a string.';
    }
    
    if (_.isEmpty(map) || !_.isArray(map)) {
        throw 'Map argument is missing or is not an array.';
    }
    
    this._connStr = connStr;
    this._table = table;
    this._map = map;
};

PgGenericDao.prototype.connectionString = function () {
    return this._connStr;
};

PgGenericDao.prototype.table = function () {
    return this._table;
};

PgGenericDao.prototype.map = function () {
    return this._map;
};

PgGenericDao.prototype.save = function (entity) {
    var toInsert = {};
    this.map().forEach(function (field) {
        toInsert[field] = entity[field];
    });
    
    var promise = PgGenericDao.insert(
        this.connectionString(),
        this.table(),
        toInsert,
        'id'
    );
    
    return promise;
};

PgGenericDao.prototype.update = function (entity) {
    var toUpdate = {};
    this.map().forEach(function (field) {
        toUpdate[field] = entity[field];
    });
    
    var promise = PgGenericDao.update(
        this.connectionString(),
        this.table(),
        toUpdate,
        [ 'id', '=', entity.id ]
    );
    
    return promise;
};

PgGenericDao.prototype.delete = function (id) {
    var promise = PgGenericDao.delete(
        this.connectionString(),
        this.table(),
        [ 'id', '=', id ]
    );
    
    return promise;
};

PgGenericDao.prototype.find = function (id) {
    var self = this;
    
    return new Promise(function (resolve, reject) {
        PgGenericDao.queryByFields(
            self.connectionString(),
            self.table(),
            self.map(),
            [ 'id', '=', id ]
        )
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

PgGenericDao.prototype.all = function (filter, sorting, paging) {
    return PgGenericDao.queryByFields(
        this.connectionString(),
        this.table(),
        this.map(),
        filter,
        sorting,
        paging
    );
};

PgGenericDao.rawTransformedQuery = function (connStr, query, params) {
    return new Promise(function (resolve, reject) {
        pg.connect(connStr, function (err, client, done) {
            if (err) {
                done();
                reject(err);
                return;
            }
            
            client.query(query, params, function (err, result) {
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

PgGenericDao.rawExec = function (connStr, query, params) {
    return new Promise(function (resolve, reject) {
        pg.connect(connStr, function (err, client, done) {
            if (err) {
                done();
                reject(err);
                return;
            }
            
            client.query(query, params, function (err, result) {
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

PgGenericDao.insert = function (connStr, table, fieldsAndValues, serialIdField) {
    var map = [];
    var key;
    for (key in fieldsAndValues) {
        if (!fieldsAndValues.hasOwnProperty(key)) {
            continue;
        }
        
        map.push(key);
    }
    
    var updateFields = pgDaoUtils.getUpdateFields(map);        
    var fieldList = pgDaoUtils.createInsertFieldList(updateFields);
    var paramList = pgDaoUtils.createInsertParamList(updateFields); 
    var params = pgDaoUtils.createParams(updateFields, fieldsAndValues);
    
    var query = 'INSERT INTO "' + table + '" (' + fieldList + ') VALUES (' + paramList + ')';
    
    if (serialIdField) {
        query += ' RETURNING "' + serialIdField + '"';
    }
    
    return new Promise(function (resolve, reject) {
        PgGenericDao.rawExec(connStr, query, params)
            .then(function (result) {
                if (serialIdField) {
                    var id = result.rows[0][serialIdField];
                    fieldsAndValues[serialIdField] = id;
                }
                
                resolve(fieldsAndValues);
            })
            .catch(function (err) {
                reject(err);
            });
    });
};

PgGenericDao.update = function (connStr, table, fieldsAndValues, searchClause) {
    var map = [];
    var key;
    for (key in fieldsAndValues) {
        if (!fieldsAndValues.hasOwnProperty(key)) {
            continue;
        }
        map.push(key);
    }
    
    var updateFields = pgDaoUtils.getUpdateFields(map);    
    var fieldAndParamList = pgDaoUtils.createUpdateFieldAndParamList(updateFields);
    var params = pgDaoUtils.createParams(updateFields, fieldsAndValues);
    
    var filter;
    if (searchClause) {
        filter = pgQueryExtender.createFilterByClause(searchClause, '', params.length + 1);
        filter.params.forEach(function (it) { params.push(it); });    
    }
    else {
        filter = {
            query: '',
            params: []
        };
    }
            
    var query = 'UPDATE "' + table + '" SET ' + fieldAndParamList;
    if (filter.query) {
        query += ' WHERE ' + filter.query;
    }
    
    var promise = PgGenericDao.rawExec(connStr, query, params);
    return promise;
};

PgGenericDao.delete = function (connStr, table, filter) {
    var query = 'DELETE FROM "' + table + '"';
    
    var filterQuery;
    if (filter) {
        filterQuery = pgQueryExtender.createFilterByClause(filter);
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
    
    var promise = PgGenericDao.rawExec(connStr, query, params);
    return promise;
};

PgGenericDao.queryByFields = function (connStr, table, fields, filter, sorting, paging) {
    var fieldList = pgDaoUtils.createSelectFieldList(fields);
    var query = 'SELECT ' + fieldList + ' FROM "' + table + '"';
    
    var extendedQuery = pgQueryExtender
        .extend(query, filter, sorting, paging);
    
    return PgGenericDao.rawTransformedQuery(
        connStr,
        extendedQuery.query,
        extendedQuery.params
    );
};


module.exports = PgGenericDao;
