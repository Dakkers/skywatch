/**
 * IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT
 *
 * You should never commit this file to a public repository on GitHub!
 * All public code on GitHub can be searched, that means anyone can see your
 * uploaded secrets.js file.
 *
 * I did it for your convenience using "throw away" API keys and passwords so
 * that all features could work out of the box.
 *
 * Use config vars (environment variables) below for production API keys
 * and passwords. Each PaaS (e.g. Heroku, Nodejitsu, OpenShift, Azure) has a way
 * for you to set it up from the dashboard.
 *
 * Another added benefit of this approach is that you can use two different
 * sets of keys for local development and production mode without making any
 * changes to the code.

 * IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT
 */

module.exports = {

  db: process.env.MONGODB || 'mongodb://localhost:27017/test',

  sessionSecret: process.env.SESSION_SECRET || 'Your Session Secret goes here',

  email: {
    user: 'numbersjsinfo@gmail.com',
    pass: 'y6VNT8fB'
  },

  sendgrid: {
    user: process.env.SENDGRID_USER || 'hslogin',
    password: process.env.SENDGRID_PASSWORD || 'hspassword00'
  },

  facebook: {
    clientID: process.env.FACEBOOK_ID || '754220301289665',
    clientSecret: process.env.FACEBOOK_SECRET || '41860e58c256a3d7ad8267d3c1939a4a',
    callbackURL: '/auth/facebook/callback',
    passReqToCallback: true
  },

  twitter: {
    consumerKey: process.env.TWITTER_KEY || '6NNBDyJ2TavL407A3lWxPFKBI',
    consumerSecret: process.env.TWITTER_SECRET  || 'ZHaYyK3DQCqv49Z9ofsYdqiUgeoICyh6uoBgFfu7OeYC7wTQKa',
    callbackURL: '/auth/twitter/callback',
    passReqToCallback: true
  },

  google: {
    clientID: process.env.GOOGLE_ID || '828110519058.apps.googleusercontent.com',
    clientSecret: process.env.GOOGLE_SECRET || 'JdZsIaWhUFIchmC1a_IZzOHb',
    callbackURL: '/auth/google/callback',
    passReqToCallback: true
  },

  twilio: {
    sid: process.env.TWILIO_SID || 'AC6f0edc4c47becc6d0a952536fc9a6025',
    token: process.env.TWILIO_TOKEN || 'a67170ff7afa2df3f4c7d97cd240d0f3'
  },

  venmo: {
    clientId: process.env.VENMO_ID || '1688',
    clientSecret: process.env.VENMO_SECRET || 'uQXtNBa6KVphDLAEx8suEush3scX8grs',
    redirectUrl: process.env.VENMO_REDIRECT_URL || 'http://localhost:3000/auth/venmo/callback'
  },

  paypal: {
    host: 'api.sandbox.paypal.com',
    client_id: process.env.PAYPAL_ID || 'AdGE8hDyixVoHmbhASqAThfbBcrbcgiJPBwlAM7u7Kfq3YU-iPGc6BXaTppt',
    client_secret: process.env.PAYPAL_SECRET || 'EPN0WxB5PaRaumTB1ZpCuuTqLqIlF6_EWUcAbZV99Eu86YeNBVm9KVsw_Ez5',
    returnUrl: process.env.PAYPAL_RETURN_URL || 'http://localhost:3000/api/paypal/success',
    cancelUrl: process.env.PAYPAL_CANCEL_URL || 'http://localhost:3000/api/paypal/cancel'
  }
};
