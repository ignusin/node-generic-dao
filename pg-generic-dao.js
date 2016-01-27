'use strict';

const pg                  = require('pg');
const Promise             = require('promise');
const _                   = require('underscore');

const mapper              = require('./mapper');
const pgDaoUtils          = require('./pg-dao-utils');
const pgQueryExtender     = require('./pg-query-extender');


let PgGenericDao = function (options) {
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
    
    this._fetchInterceptors = options.interceptors && options.interceptors.fetch ? options.interceptors.fetch : [];  
};

PgGenericDao.prototype.connectTo = function () {
    return this._connStr;
};

PgGenericDao.prototype.table = function () {
    return this._table;
};

PgGenericDao.prototype.fields = function () {
    return this._fields;
};

PgGenericDao.prototype.save = function (entity) {
    let self = this;
    
    let toInsert = {};
    self.fields().forEach(function (field) {
        toInsert[field] = entity[field];
    });
    
    let promise = new Promise(function (resolve, reject) {
        PgGenericDao.insert({
            connectTo: self.connectTo(),
            table: self.table(),
            value: toInsert,
            idField: 'id'
        })
        .then(function (saved) {
            entity.id = saved.id;
            resolve(entity);
        })
        .catch(reject);
    });
    
    return promise;
};

PgGenericDao.prototype.update = function (entity) {
    let self = this;
    
    let toUpdate = {};
    self.fields().forEach(function (field) {
        toUpdate[field] = entity[field];
    });
    
    let promise = new Promise(function (resolve, reject) {
        PgGenericDao.update({
            connectTo: self.connectTo(),
            table: self.table(),
            value: toUpdate,
            filter: [ 'id', '=', entity.id ]
        })
        .then(function () {
            resolve(entity);
        })
        .catch(reject);
    });
        
    return promise;
};

PgGenericDao.prototype.delete = function (entity) {
    let promise = PgGenericDao.delete({
        connectTo: this.connectTo(),
        table: this.table(),
        filter: [ 'id', '=', entity.id ]
    });
    
    return promise;
};

PgGenericDao.prototype.find = function (id) {
    let self = this;
    
    return new Promise(function (resolve, reject) {
        PgGenericDao.queryByFields({
            connectTo: self.connectTo(),
            table: self.table(),
            fields: self.fields(),
            filter: [ 'id', '=', id ]
        })
        .then(function (result) {
            let value;
            
            if (result.length) {
                value = result[0]; 
            }
            else {
                value = null;
            }
            
            self._fetchInterceptors.forEach(function (interceptor) {
                value = interceptor.call(interceptor, self, value);
            });
            
            resolve(value);
        })
        .catch(function (err) {
            reject(err);
        });        
    });
};

PgGenericDao.prototype.all = function (options) {
    let self = this;
    options = options || {}; 
    
    let promise = new Promise(function (resolve, reject) {
        PgGenericDao.queryByFields({
            connectTo: self.connectTo(),
            table: self.table(),
            fields: self.fields(),
            filter: options.filter,
            sorting: options.sorting,
            paging: options.paging
        })
        .then(function (result) {
            let i;
            for (i = 0; i < result.length; ++i) {
                self._fetchInterceptors.forEach(function (interceptor) {
                    result[i] = interceptor.call(interceptor, self, result[i]);
                });
            }
            
            resolve(result);
        })
        .catch(reject);
    });
    
    return promise;
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
                
                let mappedResult = result.rows.map(
                    function (it) {
                        let nestedObj = mapper.fromFlatObject(it);
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
    
    let map = [];
    let key;
    for (key in options.value) {
        if (!options.value.hasOwnProperty(key)) {
            continue;
        }
        
        map.push(key);
    }
    
    let updateFields = pgDaoUtils.getUpdateFields(map);        
    let fieldList = pgDaoUtils.createInsertFieldList(updateFields);
    let paramList = pgDaoUtils.createInsertParamList(updateFields); 
    let params = pgDaoUtils.createParams(updateFields, options.value);
    
    let query = 'INSERT INTO "' + options.table + '" (' + fieldList + ') VALUES (' + paramList + ')';
    
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
                let id = result.rows[0][options.idField];
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
    
    let map = [];
    let key;
    for (key in options.value) {
        if (!options.value.hasOwnProperty(key)) {
            continue;
        }
        map.push(key);
    }
    
    let updateFields = pgDaoUtils.getUpdateFields(map);    
    let fieldAndParamList = pgDaoUtils.createUpdateFieldAndParamList(updateFields);
    let params = pgDaoUtils.createParams(updateFields, options.value);
    
    let filter;
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
            
    let query = 'UPDATE "' + options.table + '" SET ' + fieldAndParamList;
    if (filter.query) {
        query += ' WHERE ' + filter.query;
    }
    
    let promise = PgGenericDao.rawExec({
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
    
    let query = 'DELETE FROM "' + options.table + '"';
    
    let filterQuery;
    if (options.filter) {
        filterQuery = pgQueryExtender.createFilterByClause(options.filter);
    }
    else {
        filterQuery = {
            query: '',
            params: []
        };
    }
    
    let params = [];
    
    if (filterQuery.query) {
        query += ' WHERE ' + filterQuery.query;
        
        filterQuery.params.forEach(function (it) {
            params.push(it);
        });
    }
    
    let promise = PgGenericDao.rawExec({
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
    
    let fieldList = pgDaoUtils.createSelectFieldList(options.fields);
    let query = 'SELECT ' + fieldList + ' FROM "' + options.table + '"';
    
    let extendedQuery = pgQueryExtender
        .extend(query, options.filter, options.sorting, options.paging);
    
    return PgGenericDao.rawTransformedQuery({
        connectTo: options.connectTo,
        query: extendedQuery.query,
        params: extendedQuery.params
    });
};


module.exports = PgGenericDao;
