var _           = require('underscore');
var mapper      = require('./mapper');

var createOrderByClause = function (sorting) {
    var orderClause = '';
    
    if (_.isArray(sorting)) {
        var complexOrder = sorting
            .map(function (it) {
                return 'r."' + mapper.toFlatFieldName(it.field) + '" '
                    + (it.direction === 'ASC' ? 'ASC' : 'DESC')
            })
            .join(', ');
        
        orderClause = 'ORDER BY ' + complexOrder;
    }
    else if (_.isObject(sorting)) {
        orderClause = 'ORDER BY r."' + mapper.toFlatFieldName(sorting.field) + '" '
            + (sorting.direction === 'ASC' ? 'ASC' : 'DESC');
    }
    else {
        throw 'Invalid type of sorting argument.';
    }

    return orderClause;    
};

var createFilterByClause = function (filter, alias, paramIndex) {
    if (!_.isArray(filter)) {
        throw 'Invalid filter argument.';
    }
    
    var query;
    var params = [];
    var recursive = false;
    var i;
    var recResult;
    
    paramIndex = paramIndex || 1;
    
    if (filter.length > 0) {
        if ('$and' === filter[0]) {
            recursive = true;
            query = '';
            for (i = 1; i < filter.length; ++i) {
                if (query) {
                    query += ' AND ';
                }
                
                recResult = createFilterByClause(filter[i], alias, params.length + 1);
                query += '(' + recResult.query + ')';
                recResult.params.forEach(function (it) { params.push(it); });
            }
        }
        else if ('$or' === filter[0]) {
            recursive = true;
            query = '';
            for (i = 1; i < filter.length; ++i) {
                if (query) {
                    query += ' OR ';
                }
                
                recResult = createFilterByClause(filter[i], alias, params.length + 1);
                query += '(' + recResult.query + ')';
                recResult.params.forEach(function (it) { params.push(it); });
            }
        }
        else if ('$not' === filter[0]) {
            recursive = true;
            recResult = createFilterByClause(filter[i], alias, params.length + 1);
            
            query = 'NOT (' + recResult.query + ')';
            recResult.params.forEach(function (it) { params.push(it); });
        }
    }
    
    var aliasPrefix = alias ? alias + '.' : '';
    
    if (!recursive) {
        if (filter.length === 3) {
            query = aliasPrefix + '"' + mapper.toFlatFieldName(filter[0]) + '" ' + filter[1] + ' ' + '$' + paramIndex.toString();
            params.push(filter[2]);
        }
        else if (filter.length === 2 && filter[0] === '$isnull') {
            query = aliasPrefix + '"' + mapper.toFlatFieldName(filter[1]) + '" IS NULL';
        }
        else if (filter.length === 2 && filter[0] === '$notnull') {
            query = aliasPrefix + '"' + mapper.toFlatFieldName(filter[1]) + '" IS NOT NULL';
        }
        else {
            throw 'Invalid filter ' + JSON.stringify(filter);
        }
    }
    
    var result = {
        query: query,
        params: params
    };
    
    return result;
};

var orderBy = function (query, sorting) {
    var orderClause = createOrderByClause(sorting);
    var result = 'SELECT * FROM (' + query + ') r ' + orderClause;
    
    return result;
};

var pageBy = function (query, sorting, paging) {
    if (!_.isObject(paging)) {
        throw 'Invalid type of paging argument.';
    }
    
    var orderClause = createOrderByClause(sorting);
    var result = 'SELECT r.* FROM (' + query + ') r ' + orderClause
        + ' LIMIT ' + paging.size
        + ' OFFSET ' + (paging.size * (paging.index - 1)).toString();
        
    return result;
};

var filterBy = function (query, filter) {
    var filterClause = createFilterByClause(filter, 'r');
    var filteredQuery = 'SELECT * FROM (' + query + ') r WHERE ' + filterClause.query;
    
    var result = {
        query: filteredQuery,
        params: filterClause.params
    };
    
    return result;
};

var extend = function (query, filter, sorting, paging) {
    var result = {
        query: query,
        params: []
    };
    
    if (_.isObject(filter)) {
        result = filterBy(result.query, filter);
    }
    
    if (_.isObject(paging) && _.isObject(sorting)) {
        result.query = pageBy(result.query, sorting, paging);
    }
    else if (_.isObject(sorting)) {
        result.query = orderBy(result.query, sorting);
    }
    
    return result;
};

module.exports = {
    extend: extend,
    filterBy: filterBy,
    orderBy: orderBy,
    pageBy: pageBy,
    createFilterByClause: createFilterByClause
};
