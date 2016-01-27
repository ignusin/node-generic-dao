var assert          = require('assert');
var interceptors    = require('../index').interceptors;
var PgGenericDao    = require('../index').PgGenericDao;


describe('infrastructure', function() {
    describe('interceptors', function () {
        describe('instance', function () {
            this.timeout(15000);
            
            var InstanceClass = function () {
            };
            
            var connStr = 'postgres://postgres:123qwe@localhost:5432/tests';
            var tableName = 'test_table_1';
            var columns = [ 'id', 'veryLongName', 'shortname' ];
            var dao = new PgGenericDao({
                connectTo: connStr,
                table: tableName,
                fields: columns,
                interceptors: {
                    fetch: [
                        interceptors.instance(function () { return new InstanceClass(); })
                    ]
                }
            });
            
            var eraseAllQuery = 'DELETE FROM "' + tableName + '"';
            
            it('exec, save and find', function (done) {
                PgGenericDao.rawExec({
                    connectTo: connStr,
                    query: eraseAllQuery,
                    params: []
                })
                .then(function () {
                    var instance = new InstanceClass();
                    instance.veryLongName = 'abc';
                    instance.shortname = 'def';
                    
                    dao.save(instance)
                        .then(function (entity) {
                            assert.ok(!!entity.id);
                            assert.strictEqual(entity.constructor, InstanceClass);
                            
                            dao.find(entity.id)
                                .then(function (found) {
                                    assert.strictEqual(found.constructor, InstanceClass);
                                    done();
                                })
                                .catch(function (err) {
                                    done(err);
                                });
                        })
                        .catch(function (err) {
                            done(err);
                        });
                })
                .catch(function (err) {
                    done(err);
                });
            });
            
            it('exec, save, update and find', function (done) {
                PgGenericDao.rawExec({
                    connectTo: connStr,
                    query: eraseAllQuery,
                    params: []
                })
                .then(function () {
                    var instance = new InstanceClass();
                    instance.veryLongName = 'abc';
                    instance.shortname = 'def';
                    
                    dao.save(instance)
                        .then(function (entity) {
                            assert.ok(!!entity.id);
                            assert.strictEqual(entity.constructor, InstanceClass);
                            
                            entity.veryLongName = 'new very long name';
                            entity.shortname = 'new shortname';
                            
                            dao.update(entity)
                                .then(function (entity) {
                                    assert.strictEqual(entity.constructor, InstanceClass);
                                    
                                    dao.find(entity.id)
                                        .then(function (found) {
                                            assert.strictEqual(found.constructor, InstanceClass);
                                            assert.deepEqual(found, entity);
                                            done();
                                        })
                                        .catch(function (err) {
                                            done(err);
                                        });
                                })
                                .catch(function (err) {
                                    done(err);
                                });                        
                        })
                        .catch(function (err) {
                            done(err);
                        });
                })
                .catch(function (err) {
                    done(err);
                });
            });            
            
            it('exec, save, all filtered', function (done) {
                PgGenericDao
                    .rawExec({
                        connectTo: connStr,
                        query: eraseAllQuery,
                        params: []
                    })
                    .then(function () {
                        var instance1 = new InstanceClass();
                        instance1.veryLongName = 'abc';
                        instance1.shortname = 'def';
                        
                        var instance2 = new InstanceClass();
                        instance2.veryLongName = 'abc';
                        instance2.shortname = 'efg';
                        
                        var instance3 = new InstanceClass();
                        instance3.veryLongName = 'bcd';
                        instance3.shortname = 'efg';                        
                        
                        Promise.all([
                            dao.save(instance1),
                            dao.save(instance2),
                            dao.save(instance3)
                        ])
                        .then(function () {
                            dao.all()
                            .then(function (data) {
                                assert.equal(data.length, 3);
                                assert.strictEqual(data[0].constructor, InstanceClass);
                                assert.strictEqual(data[1].constructor, InstanceClass);
                                assert.strictEqual(data[2].constructor, InstanceClass);
                                
                                done();
                            })
                            .catch(function (err) {
                                done(err);
                            });
                        })
                        .catch(function (err) {
                            done(err);
                        });
                    })
                    .catch(function (err) {
                        done(err);
                    });            
            });            
        });
    });
});