'use strict';

var mongoose = require('mongoose');
var nev = require('email-verification')(mongoose);
var User = require('./../models/User');
var secrets = require('./../config/secrets');
// var apiController = require('./apiController');


module.exports = function(app, passport, db) {

  var passportConf = require('./../config/passport')(passport, db);

  app.get('/', function(req, res) {
    res.render('home');
  });

  app.get('/events', function(req, res) {
    res.render('events');
  });

  require('./userController')(app, nev, db);

  // move user from temporary collection to persistent collection
  app.get('/email-verification/:URL', function(req, res, next) {


  });

  /**
   * API examples routes.
   */
  /*
  app.get('/api', apiController.getApi);
  app.get('/api/twilio', apiController.getTwilio);
  app.post('/api/twilio', apiController.postTwilio);
  app.get('/api/facebook', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getFacebook);
  app.get('/api/venmo', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getVenmo);
  app.post('/api/venmo', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.postVenmo);
  app.get('/api/paypal', apiController.getPayPal);
  app.get('/api/paypal/success', apiController.getPayPalSuccess);
  app.get('/api/paypal/cancel', apiController.getPayPalCancel);
  // oauth for signin
  app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'user_location'] }));
  app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), function(req, res) {
    res.redirect(req.session.returnTo || '/');
  });

  // oauth for APIs
  app.get('/auth/venmo', passport.authorize('venmo', { scope: 'make_payments access_profile access_balance access_email access_phone' }));
  app.get('/auth/venmo/callback', passport.authorize('venmo', { failureRedirect: '/api' }), function(req, res) {
    res.redirect('/api/venmo');
  });
  */

};
