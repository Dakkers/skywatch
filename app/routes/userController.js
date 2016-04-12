'use strict';

var _ = require('lodash');
var async = require('async');
var crypto = require('crypto');
var EmailTemplate = require('email-templates').EmailTemplate;
var jwt = require('jsonwebtoken');
var nodemailer = require('nodemailer');
var path = require('path');
var Promise = require('bluebird');
var sendgrid  = Promise.promisifyAll(require('sendgrid')(process.env.SKYWATCH_SENDGRID_API_KEY));
var secrets = require('../config/secrets');
var UserModel = require('../models/User');

var verifyTemplate = new EmailTemplate(path.join(__dirname, '..', 'util', 'emailtemplates', 'verify'));

var eventLabels = {
  meteors: 'Meteor Showers',
  solar_eclipses: 'Solar Eclipses',
  lunar_eclipses: 'Lunar Eclipses'
};

var timeLabels  = {
  '1h': '1 hour',
  '3h': '3 hours',
  '6h': '6 hours',
  '12h': '12 hours',
  '24h': '24 hours'
};

function sendVerificationEmail (user) {

    var token = encodeURIComponent(jwt.sign(
        {'email': user.email, 'userId': user.userid},
        process.env.SKYWATCH_VERIFICATION_JWT_SECRET,
        {'expiresIn': '1d'}
    ));

    return verifyTemplate
        .render({
            verificationUrl: 'http://localhost:5000/verify/' + token,
        })
        .then(function (result) {

            return sendgrid.sendAsync({
                to: user.email,
                from: 'notifications@skywatch.com',
                subject: 'Verify Your Account',
                html: result.html,
                text: result.text
            });
        });
}

module.exports = function(app, db) {

    var User = UserModel(db);

    // GET login page
    app.get('/login', function (req, res) {

        if (req.user) {
            return res.redirect('/account');
        }

        return res
            .clearCookie('errorMessage')
            .clearCookie('successMessage')
            .render('account/login', {
                title: 'Login',
                errorMessage: req.cookies.errorMessage,
                successMessage: req.cookies.successMessage
            });
    });

    // POST login (login attempt)
    app.post('/login', function (req, res, next) {

        req.assert('email', 'Email is not valid').isEmail();
        req.assert('password', 'Password cannot be blank').notEmpty();

        var errors = req.validationErrors();

        if (errors) {
            return res
                .cookie('errorMessage', _.map(errors, 'msg').join('. ') + '.')
                .redirect('/login');
        }

        var email = req.body.email;

        // TODO -- alternative to using vars outside of Promise scope? .bind() doesn't work.
        var user;

        User.getByEmail(email)
            .then(function (result) {

                if (!result) {
                    throw new Error('Email ' + email + ' not found');
                }

                user = result;

                if (!user.isconfirmed) {
                    throw new Error('You have not yet verified your account. Please click the "Resend Verification Email" link below.');
                }

                return User.comparePassword(req.body.password, user.password);
            })
            .then(function (isMatch) {

                if (isMatch) {
                    var token = jwt.sign(
                        {'email': user.email, 'userId': user.userid},
                        process.env.SKYWATCH_SESSION_SECRET,
                        {'expiresIn': '1d'}
                    );

                    return res
                        .cookie('authorization', 'Bearer ' + token)
                        .render('account/profile', {
                            events: [],
                            eventLabels: [],
                            timeLabels: [],
                            notifs: [],
                            methods: [],
                            user: user
                        });
                }

                throw new Error('Invalid password.');
            })
            .catch(function (err) {

                console.log(err);
                return res
                    .cookie('errorMessage', err.toString())
                    .redirect('/login');
            });
    });

    // GET logout (attempt logging out)
    app.get('/logout', function (req, res) {

        res.clearCookie('authorization').redirect('/');
    });

    // GET signup page
    app.get('/signup', function (req, res) {

        if (req.user) {
            return res.redirect('/');
        }
        return res
            .clearCookie('errorMessage')
            .clearCookie('successMessage')
            .render('account/signup', {
                title: 'Create Account',
                errorMessage: req.cookies.errorMessage,
                successMessage: req.cookies.successMessage
            });
    });

    // POST signup (signup attempt)
    app.post('/signup', function (req, res, next) {

        // uses express-validator middleware
        req.assert('email', 'Email is not valid').isEmail();
        req.assert('password', 'Password must be at least 4 characters long').len(4);
        req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

        var errors = req.validationErrors();

        // if email or password isn't legit...
        if (errors) {
            return res
                .cookie('errorMessage', _.map(errors, 'msg').join('. ') + '.')
                .redirect('/signup');
        }

        var email = req.body.email;
        var password = req.body.password;

        return User.getByEmail(email)
            .then(function (result) {

                if (_.has(result, 'userid')) {
                    throw new Error('You have already signed up. Please check your email to verify your account.');
                }

                return User.create(email, password);
            })
            .then(function (user) {

                return sendVerificationEmail(user);
            })
            .then(function (result) {

                return res
                    .cookie('successMessage', 'An email has been sent to you. Please check it to verify your account.')
                    .redirect('/login');
            })
            .catch(function (err) {

                return res
                    .cookie('errorMessage', err.toString())
                    .redirect('/signup');
            });
    });

    // GET account page
    app.get('/account', function (req, res) {

        if (!_.has(req, ['user', 'userId'])) {
            return res
                .cookie('errorMessage', 'You must be logged in to view that page.')
                .redirect('/login');
        }

        User.getById(req.user.userId)
            .then(function (user) {

                return res.render('account/profile', {
                    user: req.user,
                    events: [],
                    eventLabels: [],
                    timeLabels: [],
                    notifs: [],
                    methods: []
                });
            })
            .catch(function (err) {

                console.log(err);
                res.send(err);
            });
    });

    // GET account verification sender (for resending email to verify account)
    app.get('/verify', function (req, res) {

        return res.render('account/verify');
    });

    app.post('/verify', function (req, res) {

        req.assert('email', 'Email is not valid').isEmail();

        var errors = req.validationErrors();

        if (errors) {
            return res
                .cookie('errorMessage', _.map(errors, 'msg').join('. ') + '.')
                .redirect('/login');
        }

        var email = req.body.email;

        User.getByEmail(email)
            .then(function (result) {

                if (!result) {
                    throw new Error('Email ' + email + ' not found');
                }

                if (result.isconfirmed) {
                    throw new Error('You have already verified your account.');
                }

                return sendVerificationEmail(result);
            })
            .then(function (result) {

                return res
                    .cookie('successMessage', 'An email has been sent to you. Please check it to verify your account.')
                    .redirect('/login');
            })
            .catch(function (err) {

                console.log(err);
                return res
                    .cookie('errorMessage', err.toString())
                    .redirect('/login');
            });
    });

    // GET account verification (accessed from Email)
    app.get('/verify/:token', function (req, res) {

        jwt.verify(decodeURIComponent(req.params.token), process.env.SKYWATCH_VERIFICATION_JWT_SECRET, function (err, decoded) {

            if (err) {
                return res
                    .cookie('errorMessage', 'There was an error verifying your account.')
                    .redirect('/login');
            }

            User.confirmAccount(decoded.email)
                .then(function () {

                    return res
                        .cookie('successMessage', 'Your account has been verified!')
                        .redirect('/login');
                })
                .catch(function (err) {

                    console.log(err);
                    return res
                        .cookie('errorMessage', err.toString())
                        .redirect('/login');
                });
        });
    });

  /**
   * POST /account/profile
   * Update profile information.
   */
  app.post('/account/profile', function(req, res, next) {
    User.findById(req.user.id, function(err, user) {
      if (err) {
        return next(err);
      }
      user.email = req.body.email || '';
      user.phone = req.body.phone || '';

      user.save(function(err) {
        if (err) {
          return next(err);
        }
        // req.flash('success', { msg: 'Profile information updated.' });
        res.redirect('/account');
      });
    });
  });

  /**
   * POST /account/notifications
   * Update event notifications and timing notifications.
   */
  app.post('/account/notifications', function(req, res, next) {
    User.findById(req.user.id, function(err, user) {
      if (err) {
        return next(err);
      }
      var events = [],
        times = [];

      for (var ev in req.body.events) {
        events.push({'event': ev});
      }
      for (var time in req.body.times) {
        times.push({'time': time});
      }

      user.events = events;
      user.notifications = times;

      user.save(function(err) {
        if (err) {
          return next(err);
        }
        // req.flash('success', {msg: 'Notification settings updated.'});
        res.redirect('/account');
      });
    });

  });

  /**
   * POST /account/password
   * Update current password.
   */
  app.post('/account/password', function(req, res, next) {
    // User.findById(req.user.id, function(err,user) {
    //   if (err) return next(err);
    //   req.assert('oldPassword', 'Incorrect (old) password.').equals(user.password);
    // });
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

    var errors = req.validationErrors();

    if (errors) {
      // req.flash('errors', errors);
      return res.redirect('/account');
    }

    User.findById(req.user.id, function(err, user) {
      if (err) {
        return next(err);
      }

      user.password = req.body.password;

      user.save(function(err) {
        if (err) {
          return next(err);
        }
        // req.flash('success', { msg: 'Password has been changed.' });
        res.redirect('/account');
      });
    });
  });

  /**
   * POST /account/delete
   * Delete user account.
   */
  app.post('/account/delete', function(req, res, next) {
    User.remove({ _id: req.user.id }, function(err) {
      if (err) {
        return next(err);
      }
      req.logout();
      // req.flash('info', { msg: 'Your account has been deleted.' });
      res.redirect('/');
    });
  });

  /**
   * GET /account/unlink/:provider
   * Unlink OAuth provider.
   */
  app.get('/account/unlink/:provider', function(req, res, next) {
    var provider = req.params.provider;
    User.findById(req.user.id, function(err, user) {
      if (err) {
        return next(err);
      }

      user[provider] = undefined;
      user.tokens = _.reject(user.tokens, function(token) { return token.kind === provider; });

      user.save(function(err) {
        if (err) {
          return next(err);
        }
        // req.flash('info', { msg: provider + ' account has been unlinked.' });
        res.redirect('/account');
      });
    });
  });

  /**
   * GET /reset/:token
   * Reset Password page.
   */
  app.get('/reset/:token', function(req, res) {
    if (req.isAuthenticated()) {
      return res.redirect('/');
    }
    User
      .findOne({ resetPasswordToken: req.params.token })
      .where('resetPasswordExpires').gt(Date.now())
      .exec(function(err, user) {
        if (!user) {
          // req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
          return res.redirect('/forgot');
        }
        res.render('account/reset', {
          title: 'Password Reset'
        });
      });
  });

  /**
   * POST /reset/:token
   * Process the reset password request.
   */
  app.post('/reset/:token', function(req, res, next) {
    req.assert('password', 'Password must be at least 4 characters long.').len(4);
    req.assert('confirm', 'Passwords must match.').equals(req.body.password);

    var errors = req.validationErrors();

    if (errors) {
      // req.flash('errors', errors);
      return res.redirect('back');
    }

    async.waterfall([
      function(done) {
        User
          .findOne({ resetPasswordToken: req.params.token })
          .where('resetPasswordExpires').gt(Date.now())
          .exec(function(err, user) {
            if (!user) {
              // req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
              return res.redirect('back');
            }

            user.password = req.body.password;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              if (err) {
                return next(err);
              }
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          });
      },
      function(user, done) {
        var transporter = nodemailer.createTransport({
          service: 'SendGrid',
          auth: {
            user: secrets.sendgrid.user,
            pass: secrets.sendgrid.password
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'hackathon@starter.com',
          subject: 'Your Hackathon Starter password has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
        };
        transporter.sendMail(mailOptions, function(err) {
          // req.flash('success', { msg: 'Success! Your password has been changed.' });
          done(err);
        });
      }
    ], function(err) {
      if (err) {
        return next(err);
      }
      res.redirect('/');
    });
  });

  /**
   * GET /forgot
   * Forgot Password page.
   */
    app.get('/forgot', function (req, res) {

        if (req.user) {
            return res.redirect('/');
        }
        res.render('account/forgot', {
            title: 'Forgot Password'
        });
    });

  /**
   * POST /forgot
   * Create a random token, then the send user an email with a reset link.
   */
  app.post('/forgot', function(req, res, next) {
    req.assert('email', 'Please enter a valid email address.').isEmail();

    var errors = req.validationErrors();

    if (errors) {
      // req.flash('errors', errors);
      return res.redirect('/forgot');
    }

    async.waterfall([
      function(done) {
        crypto.randomBytes(16, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ email: req.body.email.toLowerCase() }, function(err, user) {
          if (!user) {
            // req.flash('errors', { msg: 'No account with that email address exists.' });
            return res.redirect('/forgot');
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var transporter = nodemailer.createTransport({
          service: 'SendGrid',
          auth: {
            user: secrets.sendgrid.user,
            pass: secrets.sendgrid.password
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'hackathon@starter.com',
          subject: 'Reset your password on Hackathon Starter',
          text: 'You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };
        transporter.sendMail(mailOptions, function(err) {
          // req.flash('info', { msg: 'An e-mail has been sent to ' + user.email + ' with further instructions.' });
          done(err, 'done');
        });
      }
    ], function(err) {
      if (err) {
        return next(err);
      }
      res.redirect('/forgot');
    });
  });

}; // end of module.exports
