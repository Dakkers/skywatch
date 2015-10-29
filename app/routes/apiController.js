'use strict';

var secrets = require('../config/secrets');
var querystring = require('querystring');
var validator = require('validator');
var async = require('async');
var request = require('request');
var graph = require('fbgraph');
var twilio = require('twilio')(secrets.twilio.sid, secrets.twilio.token);
var paypal = require('paypal-rest-sdk');
var _ = require('lodash');

/**
 * GET /api
 * List of API examples.
 */
exports.getApi = function(req, res) {
  res.render('api/index', {
    title: 'API Examples'
  });
};

/**
 * GET /api/facebook
 * Facebook API example.
 */
exports.getFacebook = function(req, res, next) {
  var token = _.find(req.user.tokens, { kind: 'facebook' });
  graph.setAccessToken(token.accessToken);
  async.parallel({
    getMe: function(done) {
      graph.get(req.user.facebook, function(err, me) {
        done(err, me);
      });
    },
    getMyFriends: function(done) {
      graph.get(req.user.facebook + '/friends', function(err, friends) {
        done(err, friends.data);
      });
    }
  },
  function(err, results) {
    if (err) {
      return next(err);
    }
    res.render('api/facebook', {
      title: 'Facebook API',
      me: results.getMe,
      friends: results.getMyFriends
    });
  });
};

/**
 * GET /api/twilio
 * Twilio API example.
 */
exports.getTwilio = function(req, res) {
  res.render('api/twilio', {
    title: 'Twilio API'
  });
};

/**
 * POST /api/twilio
 * Send a text message using Twilio.
 */
exports.postTwilio = function(req, res, next) {
  req.assert('number', 'Phone number is required.').notEmpty();
  req.assert('message', 'Message cannot be blank.').notEmpty();
  var errors = req.validationErrors();
  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/api/twilio');
  }
  var message = {
    to: req.body.number,
    from: '+13472235148',
    body: req.body.message
  };
  twilio.sendMessage(message, function(err, responseData) {
    if (err) {
      return next(err.message);
    }
    req.flash('success', { msg: 'Text sent to ' + responseData.to + '.'});
    res.redirect('/api/twilio');
  });
};


/**
 * GET /api/venmo
 * Venmo API example.
 */
exports.getVenmo = function(req, res, next) {
  var token = _.find(req.user.tokens, { kind: 'venmo' });
  var query = querystring.stringify({ access_token: token.accessToken });
  async.parallel({
    getProfile: function(done) {
      request.get({ url: 'https://api.venmo.com/v1/me?' + query, json: true }, function(err, request, body) {
        done(err, body);
      });
    },
    getRecentPayments: function(done) {
      request.get({ url: 'https://api.venmo.com/v1/payments?' + query, json: true }, function(err, request, body) {
        done(err, body);
      });
    }
  },
  function(err, results) {
    if (err) {
      return next(err);
    }
    res.render('api/venmo', {
      title: 'Venmo API',
      profile: results.getProfile.data,
      recentPayments: results.getRecentPayments.data
    });
  });
};

/**
 * POST /api/venmo
 * Send money.
 */
exports.postVenmo = function(req, res, next) {
  req.assert('user', 'Phone, Email or Venmo User ID cannot be blank').notEmpty();
  req.assert('note', 'Please enter a message to accompany the payment').notEmpty();
  req.assert('amount', 'The amount you want to pay cannot be blank').notEmpty();
  var errors = req.validationErrors();
  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/api/venmo');
  }
  var token = _.find(req.user.tokens, { kind: 'venmo' });
  var formData = {
    access_token: token.accessToken,
    note: req.body.note,
    amount: req.body.amount
  };
  if (validator.isEmail(req.body.user)) {
    formData.email = req.body.user;
  } else if (validator.isNumeric(req.body.user) && validator.isLength(req.body.user, 10, 11)) {
    formData.phone = req.body.user;
  } else {
    formData.user_id = req.body.user;
  }
  request.post('https://api.venmo.com/v1/payments', { form: formData }, function(err, request, body) {
    if (err) {
      return next(err);
    }
    if (request.statusCode !== 200) {
      req.flash('errors', { msg: JSON.parse(body).error.message });
      return res.redirect('/api/venmo');
    }
    req.flash('success', { msg: 'Venmo money transfer complete' });
    res.redirect('/api/venmo');
  });
};



/**
 * GET /api/paypal
 * PayPal SDK example.
 */
exports.getPayPal = function(req, res, next) {
  paypal.configure({
    mode: 'sandbox',
    client_id: secrets.paypal.client_id,
    client_secret: secrets.paypal.client_secret
  });

  var paymentDetails = {
    intent: 'sale',
    payer: {
      payment_method: 'paypal'
    },
    redirect_urls: {
      return_url: secrets.paypal.returnUrl,
      cancel_url: secrets.paypal.cancelUrl
    },
    transactions: [{
      description: 'Hackathon Starter',
      amount: {
        currency: 'USD',
        total: '1.99'
      }
    }]
  };

  paypal.payment.create(paymentDetails, function(err, payment) {
    if (err) {
      return next(err);
    }
    req.session.paymentId = payment.id;
    var links = payment.links;
    for (var i = 0; i < links.length; i++) {
      if (links[i].rel === 'approval_url') {
        res.render('api/paypal', {
          approvalUrl: links[i].href
        });
      }
    }
  });
};

/**
 * GET /api/paypal/success
 * PayPal SDK example.
 */
exports.getPayPalSuccess = function(req, res) {
  var paymentId = req.session.paymentId;
  var paymentDetails = { payer_id: req.query.PayerID };
  paypal.payment.execute(paymentId, paymentDetails, function(err) {
    if (err) {
      res.render('api/paypal', {
        result: true,
        success: false
      });
    } else {
      res.render('api/paypal', {
        result: true,
        success: true
      });
    }
  });
};

/**
 * GET /api/paypal/cancel
 * PayPal SDK example.
 */
exports.getPayPalCancel = function(req, res) {
  req.session.paymentId = null;
  res.render('api/paypal', {
    result: true,
    canceled: true
  });
};
