var mongoose = require('mongoose');
var eventSchema = mongoose.Schema({
	category: String,
	startTime: String
});

module.exports = mongoose.model('Event', eventSchema);