var mongoose = require('mongoose'),
    moment = require('moment');
var secrets = require('./config/secrets');
var Event = require('./models/Event'),
    User = require('./models/User');
mongoose.connect(secrets.db);
mongoose.connection.on('error', function() {
  console.error('MongoDB Connection Error. Please make sure that MongoDB is running.');
});

var times = ['24 hours', '12 hours', '6 hours', '3 hours', '1 hour', '3 minutes', '2 minutes', '1 minute'];

var CronJob = require('cron').CronJob;

Event.find()
    .exec(function(err, events) {
        events.forEach(function(ev) {

            // really fucking hacky code because MomentJS and Cron use different 'syntax' for months;
            // Cron is 0-based (January = 0) while Moment is 1-based.
            var startTime = ev.startTime.split('-').reverse();
            var startTimeMoment = startTime.slice();
            startTimeMoment[4] = (parseInt(startTimeMoment[4]) + 1).toString();
            startTimeMoment = startTimeMoment.join(' ');
            startTime = startTime.join(' ');

            times.forEach(function(time) {
                // why
                time = time.split(' ');
                var duration = parseInt(time[0]),
                    type     = time[1];
                time = time.join(' ');
                // subtract each time interval from the start time of our event
                var notificationTime = moment(startTimeMoment, 'ss mm HH DD MM').subtract(duration, type).format('ss mm HH DD MM').split(' ');
                notificationTime[4] = (parseInt(notificationTime[4], 10) - 1).toString();
                notificationTime = notificationTime.join(' ');

                var job = new CronJob({
                    cronTime: notificationTime + ' *',
                    onTick: function() {
                        User.find()
                            .elemMatch('events', {'event': ev.category})
                            .exec(function(err, users) {
                                console.log('ticked');
                                users.forEach(function(user) {
                                    if (user.notifications.indexOf(time) !== -1)
                                        console.log('email should be sent');
                                });
                            });
                    },
                    start: true
                });
            });
        });
    });
