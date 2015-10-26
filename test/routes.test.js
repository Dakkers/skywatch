var assert = require('assert');
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

  /**
   * Tests signing up a user by sending a post request with user info, checking to see if
   * it was added to the temporary collection, and then moving it to the permanent
   * collection by accessing its unique URL.
   */
  describe('signing up a user', function() {

    var userEmail = 'd.h.stlaurent@gmail.com',
      nev, URL;

    before(function(done) {
      nev = app.get('nev');
      nev.options.tempUserModel.findOne({
        email: userEmail
      }, function(err, user) {
        if (user) {
          user.remove(done);
        } else {
          done(err);
        }
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
              password: '1234',
              confirmPassword: '1234',
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
  });
});
