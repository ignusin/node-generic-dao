'use strict';

let instanceInterceptor = function (factory) {
    return function (dao, value) {
        var instance = factory();
        
        dao.fields().forEach(function (field) {
            instance[field] = value[field];
        });
        
        return instance;
    };
};


module.exports = {
    instance: instanceInterceptor
};
