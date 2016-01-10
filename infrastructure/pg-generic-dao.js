var pg                  = require('pg');
var Promise             = require('promise');
var _                   = require('underscore');

var mapper              = require('./mapper');
var pgQueryExtender     = require('./pg-query-extender');


var getUpdateFields = function (map) {
    var result = map.filter(function (it) {
        if (it.indexOf('__') >= 0) {
            return false;
        }
        
        if (it === 'id') {
            return false;
        }
        
        return true;
    });
    
    return result;
};

var createInsertFieldList = function (fields) {
    var fieldList = '';
    fields.forEach(function (it) {
        if (fieldList) {
            fieldList += ', ';
        }
        
        fieldList += '"';
        fieldList += mapper.camelCaseToUnderscore(it);
        fieldList += '"';
    });
    
    return fieldList;
};

var createInsertParamList = function (fields) {
    var paramList = '';
    fields.forEach(function (it, index) {
        if (paramList) {
            paramList += ', ';
        } 
        
        paramList += '$' + (index + 1).toString();
    });
    
    return paramList;
};

var createUpdateFieldAndParamList = function (fields) {
    var result = '';
    fields.forEach(function (it, index) {
        if (result) {
            result += ', ';
        }
        
        result += '"' + mapper.camelCaseToUnderscore(it) + '" = $' + (index + 1).toString();
    });
    
    return result;
};

var createSelectFieldList = function (fields) {
    var result = '';
    fields.forEach(function (it) {
        if (result) {
            result += ', ';
        }
        
        result += '"' + mapper.camelCaseToUnderscore(it) + '"';
    });
    
    return result;
};

var createParams = function (fields, entity) {
    var params = fields.map(function (it) {
        var value = null;
        if (it in entity) {
            value = entity[it];
        }
        
        return value;
    });
    
    return params;
};

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

PgGenericDao.prototype.save = function (entity) {
    var self = this;
    
    return new Promise(function (resolve, reject) {
        var updateFields = getUpdateFields(self._map);        
        var fieldList = createInsertFieldList(updateFields);
        var paramList = createInsertParamList(updateFields); 
        var params = createParams(updateFields, entity);
        
        var query = 'INSERT INTO "' + self._table + '" (' + fieldList + ') VALUES (' + paramList + ') RETURNING "id"';
        
        pg.connect(self._connStr, function (err, client, done) {
            if (err) {
                reject(err);
                return;
            }
            
            client.query(query, params, function (err, result) {              
                if (err) {
                    reject(err);
                    return;
                }
                
                var id = result.rows[0].id;
                entity.id = id;
                
                done();
                resolve(entity);
            });
        });
    });
};

PgGenericDao.prototype.update = function (entity) {
    var self = this;
    
    return new Promise(function (resolve, reject) {
        var updateFields = getUpdateFields(self._map);
        var fieldAndParamList = createUpdateFieldAndParamList(updateFields);
        
        var params = createParams(updateFields, entity);
        params.push(entity.id);
        
        var query = 'UPDATE "' + self._table + '" SET ' + fieldAndParamList
            + ' WHERE "id" = $' + (updateFields.length + 1).toString();
            
        pg.connect(self._connStr, function (err, client, done) {
            if (err) {
                reject(err);
                return;
            }
            
            client.query(query, params, function (err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                done();
                resolve();
            });
        });
    });
};

PgGenericDao.prototype.delete = function (id) {
    var self = this;
    
    return new Promise(function (resolve, reject) {
        var query = 'DELETE FROM "' + self._table + '" WHERE "id" = $1';
        var params = [ id ];
        
        pg.connect(self._connStr, function (err, client, done) {
            if (err) {
                reject(err);
                return;
            }
            
            client.query(query, params, function (err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                done();
                resolve();
            });
        });
    });
};

PgGenericDao.prototype.find = function (id) {
    var self = this;
    
    return new Promise(function (resolve, reject) {
        var fieldList = createSelectFieldList(self._map);
        var query = 'SELECT ' + fieldList + ' FROM "' + self._table + '" WHERE "id" = $1';
        var params = [ id ];
        
        pg.connect(self._connStr, function (err, client, done) {
            if (err) {
                reject(err);
                return;
            }
            
            client.query(query, params, function (err, result) {
                if (err) {
                    reject(err);
                    return;
                }
                
                done();
                
                if (!result.rows.length) {
                    resolve(null);
                }
                
                var transformed = mapper.transformKeys(
                    result.rows[0],
                    mapper.underscoreToCamelCase
                );
                resolve(transformed);
            });
        });
    });
};

PgGenericDao.prototype.all = function (filter, sorting, paging) {
    var fieldList = createSelectFieldList(this._map);
    var query = 'SELECT ' + fieldList + ' FROM "' + this._table + '"';
    
    var extendedQuery = pgQueryExtender
        .extend(query, filter, sorting, paging);
    
    return PgGenericDao.query(
        this._connStr,
        extendedQuery.query,
        extendedQuery.params
    );
};

PgGenericDao.query = function (connStr, query, params) {
    return new Promise(function (resolve, reject) {
        pg.connect(connStr, function (err, client, done) {
            if (err) {
                reject(err);
                return;
            }
            
            client.query(query, params, function (err, result) {
                if (err) {
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

PgGenericDao.exec = function (connStr, query, params) {
    return new Promise(function (resolve, reject) {
        pg.connect(connStr, function (err, client, done) {
            if (err) {
                reject(err);
                return;
            }
            
            client.query(query, params, function (err, result) {
                if (err) {
                    reject(err);
                    return;
                }
                
                done();
                resolve();
            });
        });
    });
};


module.exports = PgGenericDao;
