var auth = require('../auth'),
    gapi = require('../api/google'),
    debug = require('debug')('superteamawesome:server');

module.exports = {
  index: function(req, res) {
    res.render('home', {user: req.user});
  },

  loggedIn: function(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        req.session.returnPath = req.route.path;
        res.redirect('/login');
    }
  },

  login: function(req, res) {
    var random = Math.floor(Math.random() * 8);
    res.render('login', {random: random, layout: 'login_layout.handlebars'});
  },
  logout: function(req, res) {
    req.logout();
    req.session.save(function() {
      res.redirect('/');
    });
  },
  loginCallback: function(req, res) {
    req.session.save(function() {
      // Successful authentication, redirect home.
      if (req.session.returnPath)
        res.redirect(req.session.returnPath);
      else
        res.redirect('/');
    });
  },

  listFolders: function(req, res) {
    gapi.listFiles(req.body.fileId).then(function(folders) {
      res.send(folders);
    });
  }
}
