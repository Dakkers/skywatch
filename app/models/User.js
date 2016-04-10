'use strict';

var mongoose = require('mongoose');
var Promise = require('bluebird');
var bcrypt = require('bcrypt-nodejs');

module.exports = function (db) {

    function getById (id) {

        return db.oneOrNone('SELECT * FROM users WHERE UserID = $1', id);
    }

    function getByEmail (email) {

        return db.oneOrNone('SELECT * FROM users WHERE Email = $1', email);
    }

    function comparePassword (candidatePassword, actualPassword) {

        return new Promise(function (resolve, reject) {

            bcrypt.compare(candidatePassword, actualPassword, function (err, result) {

                if (err) {
                    reject(err)
                } else {
                    resolve(result);
                }
            });
        });
    }

    function create (email, password) {

        var password = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);

        return db.one('INSERT INTO users (Email, Password) VALUES ($1, $2) RETURNING UserID, Email', [email, password]);
    }

    function confirmAccount (email) {

        return db.none('UPDATE users SET IsConfirmed = TRUE WHERE Email = $1', email);
    }

    return {
        getByEmail: getByEmail,
        getById: getById,
        confirmAccount: confirmAccount,
        comparePassword: comparePassword,
        create: create
    };
};
