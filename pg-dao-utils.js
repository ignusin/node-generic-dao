var mapper              = require('./mapper');


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


module.exports = {
    getUpdateFields: getUpdateFields,
    createInsertFieldList: createInsertFieldList,
    createInsertParamList: createInsertParamList,
    createUpdateFieldAndParamList: createUpdateFieldAndParamList,
    createSelectFieldList: createSelectFieldList,
    createParams: createParams
};
