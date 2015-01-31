var secrets = require('./config/secrets');
var mongoose = require('mongoose'),
  moment   = require('moment'),
  twiliocli = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN),
  nodemailer = require('nodemailer'),
  CronJob = require('cron').CronJob;

var Event = require('./models/Event'),
  User = require('./models/User');
mongoose.connect(secrets.db);
mongoose.connection.on('error', function() {
  console.error('MongoDB Connection Error. Please make sure that MongoDB is running.');
});

var eventMapper = {
  'meteors': 'meteor shower',
  'lunar_eclipse': 'lunar eclipse',
  'solar_eclipse': 'solar eclipse'
};

var transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: secrets.email.user,
    pass: secrets.email.pass
  }
});

var times = ['24 hours', '12 hours', '6 hours', '3 hours', '1 hour', '3 minutes', '2 minutes', '1 minute'];


Event.find().exec(function(err, events) {
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

      // create a cronjob for each time for each event.
      var job = new CronJob({
        cronTime: notificationTime + ' *',
        onTick: function() {
          var mailOptions = {
            from: 'Do Not Reply <donotreply@skywatch.me>', // sender address
            to: [],
            subject: 'notifications', // Subject line
            text: 'There\'s a ' + eventMapper[ev.category] + ' happening in ' + time + ' that you should definitely check out!',
          };

          // find all users that are subscribed to this category
          User.find()
            .elemMatch('events', {'event': ev.category})
            .exec(function(err, users) {
              users.forEach(function(user) {
                // if the user isn't interested in this particular time, skip 'em
                if (user.notifications.indexOf(time) !== -1) {
                  if (user.methods.indexOf('email') !== -1) {
                    // email.addTo(user.email);
                    mailOptions.to.push(user.email);
                  }

                  if (user.methods.indexOf('sms') !== -1) {
                    twiliocli.sendMessage({
                      to: user.phone,
                      from: '+12268940949',
                      body: 'There\'s a ' + eventMapper[ev.category] + ' happening in ' + time + ' that you should definitely check out!'
                    }, function(err, data) {
                      if (err) {
                        console.log('ERROR');
                        console.log(err);
                      }
                      else {
                        console.log('SENT');
                        console.log(data);
                      }
                    });
                  }
                }
              });
              transporter.sendMail(mailOptions, function(error, info){
                if (error)
                  console.log(error);
                else
                  console.log('Message sent: ' + info.response);
              });
            });
        },
        start: true
      });
    });
  });
});