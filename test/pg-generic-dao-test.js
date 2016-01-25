var assert          = require('assert');
var PgGenericDao    = require('../index').PgGenericDao;

describe('infrastructure', function() {
    describe('pg-generic-dao', function () {
        this.timeout(15000);
        
        var connStr = 'postgres://postgres:123qwe@localhost:5432/tests';
        var tableName = 'test_table_1';
        var columns = [ 'id', 'veryLongName', 'shortname' ];
        var dao = new PgGenericDao(connStr, tableName, columns);
        
        var eraseAllQuery = 'DELETE FROM "' + tableName + '"';
                
        
        it('connectionString', function () {
            assert.equal(dao.connectionString(), connStr);
        });
        
        it('table', function () {
            assert.equal(dao.table(), tableName);
        });
        
        it('exec, save and find', function (done) {
            PgGenericDao.rawExec(connStr, eraseAllQuery, [])
                .then(function () {
                    dao.save({
                        veryLongName: 'abc',
                        shortname: 'def'
                    })
                    .then(function (entity) {
                        assert.ok(!!entity.id);
                        
                        dao.find(entity.id)
                            .then(function (found) {
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
        });
        
        it('exec, save, update and find', function (done) {
            PgGenericDao.rawExec(connStr, eraseAllQuery, [])
                .then(function () {
                    dao.save({
                        veryLongName: 'abc',
                        shortname: 'def'
                    })
                    .then(function (entity) {
                        assert.ok(!!entity.id);
                        
                        entity.veryLongName = 'new very long name';
                        entity.shortname = 'new shortname';
                        
                        dao.update(entity)
                            .then(function () {
                                dao.find(entity.id)
                                    .then(function (found) {
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
        
        it('exec, save, delete and find', function (done) {
            PgGenericDao.rawExec(connStr, eraseAllQuery, [])
                .then(function () {
                    dao.save({
                        veryLongName: 'abc',
                        shortname: 'def'
                    })
                    .then(function (entity) {
                        assert.ok(!!entity.id);
                        
                        dao.delete(entity.id)
                            .then(function () {
                                dao.find(entity.id)
                                    .then(function (found) {
                                        assert.strictEqual(found, null);
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
        
        it('exec, save and all', function (done) {
            PgGenericDao
                .rawExec(connStr, eraseAllQuery, [])
                .then(function () {
                    dao.save({
                        veryLongName: 'abc',
                        shortname: 'def'
                    })
                    .then(function (entity) {
                        assert.ok(!!entity.id);
                        
                        dao.all()
                            .then(function (entities) {
                                assert.equal(entities.length, 1);
                                assert.deepEqual(
                                    entities[0],
                                    {
                                        id: entity.id,
                                        veryLongName: 'abc',
                                        shortname: 'def'
                                    }
                                );
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
        
        it('exec, save, all filtered', function (done) {
            PgGenericDao
                .rawExec(connStr, eraseAllQuery, [])
                .then(function () {
                    Promise.all([
                        dao.save({ veryLongName: 'abc', shortname: 'def' }),
                        dao.save({ veryLongName: 'abc', shortname: 'efg' }),
                        dao.save({ veryLongName: 'bcd', shortname: 'efg' })
                    ])
                    .then(function () {
                        dao.all([
                            '$and',
                            [ 'veryLongName', '=', 'abc' ],
                            [ 'shortname', '=', 'efg' ]
                        ])
                        .then(function (data) {
                            assert.equal(data.length, 1);
                            assert.equal(data[0].veryLongName, 'abc');
                            assert.equal(data[0].shortname, 'efg');
                            
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
        
        it('exec, save, all sorted', function (done) {
            PgGenericDao
                .rawExec(connStr, eraseAllQuery, [])
                .then(function () {
                    Promise.all([
                        dao.save({ veryLongName: 'abc', shortname: 'def' }),
                        dao.save({ veryLongName: 'abc', shortname: 'efg' }),
                        dao.save({ veryLongName: 'bcd', shortname: 'efg' })
                    ])
                    .then(function () {
                        dao.all(
                            null,
                            [
                                { field: 'veryLongName', direction: 'ASC' },
                                { field: 'shortname', direction: 'DESC' }
                            ]
                        )
                        .then(function (data) {
                            assert.equal(data.length, 3);
                            assert.equal(data[0].veryLongName, 'abc');
                            assert.equal(data[0].shortname, 'efg');
                            
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
        
        it('exec, save, all paged', function (done) {
            PgGenericDao
                .rawExec(connStr, eraseAllQuery, [])
                .then(function () {
                    Promise.all([
                        dao.save({ veryLongName: 'abc', shortname: 'def' }),
                        dao.save({ veryLongName: 'abc', shortname: 'efg' }),
                        dao.save({ veryLongName: 'bcd', shortname: 'efg' })
                    ])
                    .then(function () {
                        dao.all(
                            null,
                            [
                                { field: 'veryLongName', direction: 'ASC' },
                                { field: 'shortname', direction: 'DESC' }
                            ],
                            { size: 1, index: 1 }
                        )
                        .then(function (data) {
                            assert.equal(data.length, 1);
                            assert.equal(data[0].veryLongName, 'abc');
                            assert.equal(data[0].shortname, 'efg');
                            
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
        
        it('exec, save, all fully extended', function (done) {
            PgGenericDao
                .rawExec(connStr, eraseAllQuery, [])
                .then(function () {
                    Promise.all([
                        dao.save({ veryLongName: 'abc', shortname: 'def' }),
                        dao.save({ veryLongName: 'abc', shortname: 'efg' }),
                        dao.save({ veryLongName: 'bcd', shortname: 'efg' })
                    ])
                    .then(function () {
                        dao.all(
                            [
                                '$and',
                                [ 'veryLongName', '=', 'abc' ],
                                [ 'shortname', '=', 'efg' ]
                            ],
                            [
                                { field: 'veryLongName', direction: 'ASC' },
                                { field: 'shortname', direction: 'DESC' }
                            ],
                            { size: 1, index: 1 }
                        )
                        .then(function (data) {
                            assert.equal(data.length, 1);
                            assert.equal(data[0].veryLongName, 'abc');
                            assert.equal(data[0].shortname, 'efg');
                            
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