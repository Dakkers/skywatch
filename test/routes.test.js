var assert = require('assert');
var async = require('async');
var cheerio = require('cheerio');
var request = require('supertest');
var app = require('./../app/server');
var User = require('./../app/models/User');

describe('sending GET requests', function() {
  it('should get index', function(done) {
    request(app)
      .get('/')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(200, done);
  });

  it('should get events', function(done) {
    request(app)
      .get('/events')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(200, done);
  });

  it('should get login page', function(done) {
    request(app)
      .get('/login')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(200, done);
  });

  it('should get signup page', function(done) {
    request(app)
      .get('/signup')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(200, done);
  });
});

describe('sending POST requests', function() {

  var userEmail = 'd.h.stlaurent@gmail.com',
    userPass = '1234';

  /**
   * Tests signing up a user by sending a post request with user info, checking to see if
   * it was added to the temporary collection, and then moving it to the permanent
   * collection by accessing its unique URL.
   */
  describe('signing up a user', function() {

    var nev, URL;

    var removeTempUser = function(callback) {
      nev.options.tempUserModel.findOne({email: userEmail}, function(err, user) {
        if (err) {
          return callback(err);
        }

        if (user) {
          user.remove(callback(null));
        } else {
          callback(null);
        }
      });
    };

    var removePermUser = function(callback) {
      User.findOne({email: userEmail}, function(err, user) {
        if (err) {
          return callback(err);
        }

        if (user) {
          user.remove(callback(null));
        } else {
          callback(null);
        }
      });
    }

    before('removing temporary user and permanent user from respective collections', function(done) {
      nev = app.get('nev');
      async.series([removeTempUser, removePermUser], function(err) {
        if (err) {
          return done(err);
        }
        done();
      });
    });

    it('should signup a user (into the temporary collection)', function(done) {
      request(app)
        .get('/signup')
        .end(function(err, res) {
          var $ = cheerio.load(res.text);
          var token = $('input[name=_csrf]').val();
          request(app)
            .post('/signup')
            .set('cookie', res.headers['set-cookie'])
            .send({
              email: userEmail,
              password: userPass,
              confirmPassword: userPass,
              _csrf: token
            })
            .end(function(err, res) {
              setTimeout(function() {
                nev.options.tempUserModel.findOne({
                  email: userEmail
                }, function(err, user) {
                  URL = user[nev.options.URLFieldName];
                  done();
                });
              }, 2000);
            });
        });
    });

    it('should move a user from the temporary collection to the permanent one', function(done) {
      // setTimeout(function() {
        request(app)
          .get('/email-verification/' + URL)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            User.findOne({
              email: userEmail
            }, function(err, user) {
              if (err) {
                return done(err);
              }
              done();
            });
          });
      // }, 2500);
    });

    after('removing temporary user and permanent user from respective collections', function(done) {
      async.series([removeTempUser, removePermUser], function(err) {
        if (err) {
          return done(err);
        }
        done();
      });
    });
  });

  describe('logging in a user', function() {
    before('adding permanent user to collection', function(done) {
      User.findOne({email: userEmail}, function(err, user) {
        if (err) {
          return done(err);
        }

        if (user) {
          user.password = userPass;
          user.save(done);
        } else {
          var newUser = new User({email: userEmail, password: userPass});
          newUser.save(done);
        }
      });
    });

    it('should log the user in', function(done) {
      request(app)
        .get('/login')
        .end(function(err, res) {
          var $ = cheerio.load(res.text);
          var token = $('input[name=_csrf]').val();
          request(app)
            .post('/login')
            .set('cookie', res.headers['set-cookie'])
            .send({
              email: userEmail,
              password: userPass,
              confirmPassword: userPass,
              _csrf: token
            })
            .expect(302, done);
        });
    });

    after('removing permanent user from collection', function(done) {
      User.findOne({email: userEmail}, function(err, user) {
        if (err) {
          return done(err);
        }
        user.remove(done);
      });
    });
  });
});
