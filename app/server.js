'use strict';

var express = require('express');
var cookieParser = require('cookie-parser');
var compress = require('compression');
var session = require('express-session');
var bodyParser = require('body-parser');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var methodOverride = require('method-override');
var ejwt = require('express-jwt');

var flash = require('express-flash');
var path = require('path');
var expressValidator = require('express-validator');
var connectAssets = require('connect-assets');
var bluebird = require('bluebird');
var pgp = require('pg-promise')({
    promiseLib: bluebird
});

var User = require('./models/User');

// secret stuff!
var secrets = require('./config/secrets');
var db = pgp(secrets.db);

// configuration of sorts
var app = express();

app.set('port', process.env.PORT || 5000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(compress());
app.use(connectAssets({
    paths: [path.join(__dirname, '../public/css'), path.join(__dirname, '../public/js')]
}));
// app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(methodOverride());
app.use(cookieParser());
app.use(function (req, res, next) {

    if (/api/i.test(req.path)) {
        req.session.returnTo = req.path;
    }
    next();
});

app.use(express.static(path.join(__dirname, '../public'), { maxAge: 31557600000 }));

app.use(ejwt({
    secret: process.env.SKYWATCH_SESSION_SECRET,
    credentialsRequired: false,
    getToken: function fromHeaderOrQuerystring (req) {

        if (req.cookies.authorization && req.cookies.authorization.split(' ')[0] === 'Bearer') {
            return req.cookies.authorization.split(' ')[1];
        }
        return null;
  }
}));

// error handler
app.use(errorHandler());
require('./routes/routes')(app, db);

app.listen(app.get('port'), function () {

    console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});

module.exports = app;
