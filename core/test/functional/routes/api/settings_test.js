/*global describe, it, before, after */
var supertest     = require('supertest'),
    express       = require('express'),
    should        = require('should'),
    _             = require('lodash'),
    testUtils     = require('../../../utils'),

    ghost         = require('../../../../../core'),

    httpServer,
    request,
    agent;


describe('Settings API', function () {
    var user = testUtils.DataGenerator.forModel.users[0],
        accesstoken = '';

    before(function (done) {
        var app = express();
            app.set('disableLoginLimiter', true);

        ghost({app: app}).then(function (_httpServer) {
            httpServer = _httpServer;
            request = supertest.agent(app);

            testUtils.clearData()
                .then(function () {
                    return testUtils.initData();
                })
                .then(function () {
                    return testUtils.insertDefaultFixtures();
                })
                .then(function () {
                    request.post('/ghost/api/v0.1/authentication/token/')
                        .send({ grant_type: "password", username: user.email, password: user.password, client_id: "ghost-admin"})
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }
                            var jsonResponse = res.body;
                            testUtils.API.checkResponse(jsonResponse, 'accesstoken');
                            accesstoken = jsonResponse.access_token;
                            return done();
                        });
                }).catch(done);
        }).catch(function (e) {
            console.log('Ghost Error: ', e);
            console.log(e.stack);
        });
    });

    after(function () {
        httpServer.close();
    });

    // TODO: currently includes values of type=core
    it('can retrieve all settings', function (done) {
        request.get(testUtils.API.getApiQuery('settings/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                jsonResponse.should.exist;

                testUtils.API.checkResponse(jsonResponse, 'settings');
                done();
            });
    });

    it('can retrieve a setting', function (done) {
        request.get(testUtils.API.getApiQuery('settings/title/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;

                jsonResponse.should.exist;
                jsonResponse.settings.should.exist;

                testUtils.API.checkResponseValue(jsonResponse.settings[0], ['id','uuid','key','value','type','created_at','created_by','updated_at','updated_by']);
                jsonResponse.settings[0].key.should.eql('title');
                testUtils.API.isISO8601(jsonResponse.settings[0].created_at).should.be.true;
                done();
            });
    });

    it('can\'t retrieve non existent setting', function (done) {
        request.get(testUtils.API.getApiQuery('settings/testsetting/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect(404)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                jsonResponse.should.exist;
                jsonResponse.errors.should.exist;
                testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'type']);
                done();
            });
    });

    it('can edit settings', function (done) {
        request.get(testUtils.API.getApiQuery('settings/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body,
                    changedValue = 'Ghost changed',
                    settingToChange = {
                        settings: [
                            { key: 'title', value: changedValue }
                        ]
                    };

                jsonResponse.should.exist;
                jsonResponse.settings.should.exist;

                request.put(testUtils.API.getApiQuery('settings/'))
                    .set('Authorization', 'Bearer ' + accesstoken)
                    .send(settingToChange)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var putBody = res.body;
                        res.headers['x-cache-invalidate'].should.eql('/*');
                        putBody.should.exist;
                        putBody.settings[0].value.should.eql(changedValue);
                        testUtils.API.checkResponse(putBody, 'settings');
                        done();
                    });
            });
    });

    it('can\'t edit settings with invalid accesstoken', function (done) {
        request.get(testUtils.API.getApiQuery('settings/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body,
                    changedValue = 'Ghost changed';
                jsonResponse.should.exist;
                jsonResponse.title = changedValue;

                request.put(testUtils.API.getApiQuery('settings/'))
                    .set('Authorization', 'Bearer ' + 'invalidtoken')
                    .send(jsonResponse)
                    .expect(401)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });
            });
    });


    it('can\'t edit non existent setting', function (done) {
        request.get(testUtils.API.getApiQuery('settings/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body,
                    newValue = 'new value';
                jsonResponse.should.exist;
                should.exist(jsonResponse.settings);
                jsonResponse.settings = [{ key: 'testvalue', value: newValue }];

                request.put(testUtils.API.getApiQuery('settings/'))
                    .set('Authorization', 'Bearer ' + accesstoken)
                    .send(jsonResponse)
                    .expect('Content-Type', /json/)
                    .expect(404)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        jsonResponse = res.body;
                        should.not.exist(res.headers['x-cache-invalidate']);
                        jsonResponse.errors.should.exist;
                        testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'type']);
                        done();
                    });
            });
    });


});