'use strict';

var bcrypt = require('bcrypt-nodejs');
var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  email: { type: String, unique: true, lowercase: true },
  password: String,
  phone: { type: String, default: '' },

  events: {type: Array, default: [{'event': 'meteors'}, {'event': 'solar_eclipses'}, {'event': 'lunar_eclipses'}]},
  notifications: {type: Array, default: ['1 hour']},
  methods: {type: Array, default: ['email']}
});

userSchema.methods.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

/**
 * Helper method for validationg user's password.
 */
userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) {
      return cb(err);
    }
    cb(null, isMatch);
  });
};

module.exports = mongoose.model('User', userSchema);
