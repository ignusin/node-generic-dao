var assert = require('assert');
var mapper = require('../infrastructure/mapper');

describe('infrastructure', function() {
    describe('mapper', function () {
        
        it('fromFlatObject', function () {
            var result = mapper.fromFlatObject({
                "id":   1,
                "text": '2',
                "nested1__nested1_property": 'nested1_property',
                "nested1__nested2__nested2_property": 'nested2_property'
            });
            
            assert.deepEqual(
                result,
                {
                    "id": 1,
                    "text": '2',
                    "nested1": {
                        "nested1_property": 'nested1_property',
                        "nested2": {
                            "nested2_property": 'nested2_property'
                        }
                    }
                }
            );
        });
        
        it('toFlatField - simple', function () {
            var result = mapper.toFlatFieldName('simple');
            assert.equal(result, 'simple');
        });
        
        it('toFlatField - nested & camel', function () {
            var result = mapper.toFlatFieldName('complexCamel.nestedCamel');
            assert.equal(result, 'complex_camel__nested_camel');
        });
        
        it('transformKeys', function () {
            var result = mapper.transformKeys(
                {
                    "id": 1,
                    "text": '2',
                    "nested1": {
                        "nested1_property": 'nested1_property',
                        "nested2": {
                            "nested2_property": 'nested2_property'
                        }
                    }
                },
                mapper.underscoreToCamelCase
            );
            
            assert.deepEqual(
                result,
                {
                    "id": 1,
                    "text": '2',
                    "nested1": {
                        "nested1Property": 'nested1_property',
                        "nested2": {
                            "nested2Property": 'nested2_property'
                        }
                    }
                });
        });
        
        it('camelCaseToUnderscore - all lower', function () {
            var result = mapper.camelCaseToUnderscore('abcdef');
            assert.equal(result, 'abcdef');
        });
        
        it('camelCaseToUnderscore - all upper', function () {
            var result = mapper.camelCaseToUnderscore('ABCDEF');
            assert.equal(result, 'abcdef');
        });
        
        it('camelCaseToUnderscore - normal', function () {
            var result = mapper.camelCaseToUnderscore('abCdEf');
            assert.equal(result, 'ab_cd_ef');
        });
        
        it('camelCaseToUnderscore - multiple lower', function () {
            var result = mapper.camelCaseToUnderscore('abCdeFgh');
            assert.equal(result, 'ab_cde_fgh');
        });
        
        it('camelCaseToUnderscore - multiple upper', function () {
            var result = mapper.camelCaseToUnderscore('abCDeFgh');
            assert.equal(result, 'ab_cde_fgh');
        });
        
        it ('underscoreToCamelCase - single word', function () {
            var result = mapper.underscoreToCamelCase('abcdef');
            assert.equal(result, 'abcdef');
        });
        
        it ('underscoreToCamelCase - normal', function () {
            var result = mapper.underscoreToCamelCase('abc_def');
            assert.equal(result, 'abcDef');
        });
        
        it ('underscoreToCamelCase - double underscore', function () {
            var result = mapper.underscoreToCamelCase('abc__def');
            assert.equal(result, 'abcDef');
        });
        
        it ('underscoreToCamelCase - underscore first char', function () {
            var result = mapper.underscoreToCamelCase('_abc_def');
            assert.equal(result, 'abcDef');
        });
        
        it ('underscoreToCamelCase - upper', function () {
            var result = mapper.underscoreToCamelCase('abc_DEF');
            assert.equal(result, 'abcDef');
        });
    });
});
