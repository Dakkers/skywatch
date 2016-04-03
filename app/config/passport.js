'use strict';

var _ = require('lodash');
var LocalStrategy = require('passport-local').Strategy;
var OAuthStrategy = require('passport-oauth').OAuthStrategy;
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;

var secrets = require('./secrets');
var UserModel = require('../models/User');

module.exports = function (passport, db) {

    var User = UserModel(db);

    passport.serializeUser(function(user, done) {

        done(null, user.userid);
    });

    passport.deserializeUser(function(id, done) {

        User.getById(id)
            .then(function (user) {

                done(null, user);
            })
            .catch(function (err) {

                done(err, null);
            });
    });

    // sign-in using email/password
    passport.use(new LocalStrategy({ usernameField: 'email' }, function (email, password, done) {

        // TODO -- alternative to using vars outside of Promise scope? .bind() doesn't work.
        var user;

        User.getByEmail(email)
            .then(function (result) {

                if (!result) {
                    throw new Error('Email ' + email + ' not found');
                }

                user = result;

                return User.comparePassword(password, user.password);
            })
            .then(function (isMatch) {

                if (isMatch) {
                    return done(null, user);
                }

                throw new Error('Invalid password.');
            })
            .catch(function (err) {

                console.log(err);

                return done(null, false, { message: err });
            });
    }));

/**
 * OAuth Strategy Overview
 *
 * - User is already logged in.
 *   - Check if there is an existing account with a provider id.
 *     - If there is, return an error message. (Account merging not supported)
 *     - Else link new OAuth account with currently logged-in user.
 * - User is not logged in.
 *   - Check if it's a returning user.
 *     - If returning user, sign in and we are done.
 *     - Else check if there is an existing account with user's email.
 *       - If there is, return an error message.
 *       - Else create a new account.
 */

/**
 * Venmo API OAuth.
 */
/*
passport.use('venmo', new OAuth2Strategy({
    authorizationURL: 'https://api.venmo.com/v1/oauth/authorize',
    tokenURL: 'https://api.venmo.com/v1/oauth/access_token',
    clientID: secrets.venmo.clientId,
    clientSecret: secrets.venmo.clientSecret,
    callbackURL: secrets.venmo.redirectUrl,
    passReqToCallback: true
  },
  function(req, accessToken, refreshToken, profile, done) {
    User.findById(req.user._id, function(err, user) {
      user.tokens.push({ kind: 'venmo', accessToken: accessToken });
      user.save(function(err) {
        done(err, user);
      });
    });
  }
));
*/

    /**
     * Login Required middleware.
     */
    function isAuthenticated (req, res, next) {

        if (req.isAuthenticated()) {
            return next();
        }
        return res.redirect('/login');
    };

    /**
     * Authorization Required middleware.
     */
    function isAuthorized (req, res, next) {

        var provider = req.path.split('/').slice(-1)[0];

        if (_.find(req.user.tokens, { kind: provider })) {
            next();
        } else {
            res.redirect('/auth/' + provider);
        }
    };

    return {
        isAuthenticated: isAuthenticated,
        isAuthorized: isAuthorized
    };
};
