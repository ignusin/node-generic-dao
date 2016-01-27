'use strict';

const _ = require('underscore');

let fromFlatObject = function (flat) {
    if (!_.isObject(flat)) {
        throw 'Argument is not an object.';
    }
   
    let result = {};
    let key;
    
    let curNested,
        tokens,
        i;
    
    for (key in flat) {
        if (!flat.hasOwnProperty(key)) {
            continue;
        }
        
        tokens = key.split('__');
        curNested = result;
        
        for (i = 0; i < tokens.length - 1; ++i) {
            if (!(tokens[i] in curNested)) {
                curNested[tokens[i]] = {};
            }
            
            curNested = curNested[tokens[i]];
        }
        
        curNested[tokens[tokens.length - 1]] = flat[key];
    }
    
    return result;
};

let toFlatFieldName = function (nestedFieldName) {
    if (!_.isString(nestedFieldName)) {
        throw 'Argument is not a string.';
    }
    
    let tokens = nestedFieldName.split('.');
    let result = tokens
        .map(function (it) { return camelCaseToUnderscore(it); })
        .join('__');
    
    return result;
};

let transformKeys = function (obj, transformer) {
    let result = {};
    
    let key, transKey;
    for (key in obj) {
        if (!obj.hasOwnProperty(key)) {
            continue;
        }
        
        transKey = transformer(key);
        
        if (_.isObject(obj[key]) && !_.isDate(obj[key])) {
            result[transKey] = transformKeys(obj[key], transformer);
        }
        else {
            result[transKey] = obj[key];
        }
    }
    
    return result;
};

let camelCaseToUnderscore = function (camelCase) {
    if (!_.isString(camelCase)) {
        throw 'Argument is not a string.';
    }
    
    let result = '';
    let i;
    
    for (i = 0; i < camelCase.length; ++i) {
        if (i > 0 && camelCase[i] === camelCase[i].toUpperCase()
            && camelCase[i - 1] === camelCase[i - 1].toLowerCase()) {
                
            result += '_';
            result += camelCase[i].toLowerCase();
        }
        else if (camelCase[i] === camelCase[i].toUpperCase()) {
            result += camelCase[i].toLowerCase();
        }
        else {
            result += camelCase[i];
        }
    }
    
    return result;
};

let underscoreToCamelCase = function (underscore) {
    if (!_.isString(underscore)) {
        throw 'Argument is not a string.';
    }
    
    let result = '';
    let i;
    let upper = false;
    
    for (i = 0; i < underscore.length; ++i) {
        if (underscore[i] === '_') {
            if (i > 0) {
                upper = true;
            }
            
            continue;
        }
        
        result += upper ? underscore[i].toUpperCase() : underscore[i].toLowerCase();
        
        upper = false;
    }
    
    return result;
};

module.exports = {
    fromFlatObject: fromFlatObject,
    camelCaseToUnderscore: camelCaseToUnderscore,
    underscoreToCamelCase: underscoreToCamelCase,
    transformKeys: transformKeys,
    toFlatFieldName: toFlatFieldName
};
