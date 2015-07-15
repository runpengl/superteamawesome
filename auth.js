var models = require("./models");
var google = require('googleapis');
var config = require('./config');
var _ = require('lodash');
var Q = require('q');
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
          picture: photo
        }
      }
    ).spread(function(user, created) {
      user.set('picture', photo);
      user.set('lastName', profile.name.familyName);
      user.set('firstName', profile.name.givenName);
      user.save();
      return done(false, user.get({plain: true}));
    });
  },

  googleScope: [
    'email',
    'https://www.googleapis.com/auth/plus.login',
    'https://www.googleapis.com/auth/drive'
  ].join(' '),

  loginCallback: function(req, res) {
    // Successful authentication, redirect home.
    if (req.session.returnPath)
      res.redirect(req.session.returnPath);
    else
      res.redirect('/');
  },

  loggedIn: function(req, res, next) {
    if (req.user) {
        next();
    } else {
        req.session.returnPath = req.route.path;
        res.redirect('/login');
    }
  },

  serializeUser: function(user, done) {
    done(null, user.googleID);
  },

  deserializeUser: function(id, done) {
    models.User.findOne({ where: { googleID: id } }).then(function(user) {
      done(null, user.get({plain: true}));
    })
  },

  // Google Drive functions
  listFiles: function(folderID) {
    var defer = Q.defer();
    var service = google.drive({version: 'v2', auth: oauth2Client});
    service.files.list({
      q: '"' + folderID + '" in parents and mimeType = "application/vnd.google-apps.folder"'
    }, function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        defer.reject(null);
      } else {
        defer.resolve(response.items);
      }
    });
    return defer.promise;
  }
}