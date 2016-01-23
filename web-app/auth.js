var google = require('googleapis'),
    config = require('./config'),
    firebaseRef = require('./api/firebase'),
    debug = require('debug')('superteamawesome:server');

var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, "http://localhost:8080/auth/google/callback");
google.options({ auth: oauth2Client });

module.exports = {
  // Login Functions
  googleLogin: function(accessToken, refreshToken, profile, done) {
    var photo = '';
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (profile.photos.length > 0) {
      photo = profile.photos[0].value;
    }

    var userData = {
      googleId: profile.id,
      email: profile.emails[0].value,
      lastName: profile.name.familyName,
      firstName: profile.name.givenName,
      picture: photo,
      accessToken: accessToken,
      refreshToken: refreshToken
    };

    firebaseRef.child('users/' + profile.id).set(userData, function(error) {
      if (error) {
        console.error("Error creating user:", error);
      } else {
        debug("Success!");
        return done(false, userData);
      }
    });
  },

  googleScope: [
    'email',
    'https://www.googleapis.com/auth/plus.login',
    'https://www.googleapis.com/auth/drive'
  ].join(' '),

  serializeUser: function(user, done) {
    return done(null, user.googleId);
  },

  deserializeUser: function(id, done) {
    firebaseRef.child('users/' + id).once("value", function(userData) {
      if (userData.val() != null) {
        oauth2Client.setCredentials({
          access_token: userData.val().accessToken,
          refresh_token: userData.val().refreshToken
        });
        return done(null, userData.val());
      }
    });
  }
};
