var models = require("./models"),
    google = require('googleapis'),
    config = require('./config');

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
    models.User.findOrCreate(
      {
        where: {googleID: profile.id},
        defaults: {
          googleID: profile.id,
          lastName: profile.name.familyName,
          firstName: profile.name.givenName,
          picture: photo,
          accessToken: accessToken,
          refreshToken: refreshToken
        }
      }
    ).spread(function(user, created) {
      user.set('picture', photo);
      user.set('lastName', profile.name.familyName);
      user.set('firstName', profile.name.givenName);
      user.set('accessToken', accessToken);
      user.set('refreshToken', refreshToken);
      user.save().then(function() {
        return done(false, user.get({plain: true}));
      });
    });
  },

  googleScope: [
    'email',
    'https://www.googleapis.com/auth/plus.login',
    'https://www.googleapis.com/auth/drive'
  ].join(' '),

  serializeUser: function(user, done) {
    return done(null, user.googleID);
  },

  deserializeUser: function(id, done) {
    models.User.findOne({ where: { googleID: id } }).then(function(user) {
      var u = user.get({plain: true});
      oauth2Client.setCredentials({
        access_token: u.accessToken,
        refresh_token: u.refreshToken
      });
      return done(null, u);
    })
  }
};
