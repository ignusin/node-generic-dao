'use strict';

const mapper              = require('./mapper');


let getUpdateFields = function (map) {
    let result = map.filter(function (it) {
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

let createInsertFieldList = function (fields) {
    let fieldList = '';
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

let createInsertParamList = function (fields) {
    let paramList = '';
    fields.forEach(function (it, index) {
        if (paramList) {
            paramList += ', ';
        } 
        
        paramList += '$' + (index + 1).toString();
    });
    
    return paramList;
};

let createUpdateFieldAndParamList = function (fields) {
    let result = '';
    fields.forEach(function (it, index) {
        if (result) {
            result += ', ';
        }
        
        result += '"' + mapper.camelCaseToUnderscore(it) + '" = $' + (index + 1).toString();
    });
    
    return result;
};

let createSelectFieldList = function (fields) {
    let result = '';
    fields.forEach(function (it) {
        if (result) {
            result += ', ';
        }
        
        result += '"' + mapper.camelCaseToUnderscore(it) + '"';
    });
    
    return result;
};

let createParams = function (fields, entity) {
    let params = fields.map(function (it) {
        let value = null;
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
