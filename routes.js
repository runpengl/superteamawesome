var JSX = require('node-jsx').install(),
    React = require('react'),
    auth = require('./auth'),
    gapi = require('./gapi'),
    admin = require('./admin'),
    models = require('./models'),
    AdminComponent = require('./components/admin.react');

module.exports = {
  index: function(req, res) {
    res.render('home', {user: req.user});
  },

  loggedIn: function(req, res, next) {
    if (req.user) {
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
    // Successful authentication, redirect home.
    if (req.session.returnPath)
      res.redirect(req.session.returnPath);
    else
      res.redirect('/');
  },
  admin: function(req, res) {
    var hunt = {name: 'None'};
    models.Hunt.findOne({where: {isActive: true}}).then(function(h) {
      if (h) {
        hunt = h.get({plain: true});
      }
      return gapi.listFiles('root');
    }).then(function(files) {
      var adminFactory = React.createFactory(AdminComponent);
      var state = {
        hunt: hunt,
        activeTab: hunt.id ? "edit" : "create",
        folders: files,
        userFirstName: req.user.firstName,
        rootFolder: {'title': req.user.firstName + "'s Drive", 'id': 'root'}
      }
      var markup = React.renderToString(
        adminFactory(state)
      );

      res.render('admin', {
        user: req.user,
        markup: markup,
        state: JSON.stringify(state)
      });
    });
  },

  createHunt: function(req, res) {
    admin.createHunt(req.body.name, req.body.active).then(function(hunt) {
      res.send(hunt);
    });
  },
  listFolders: function(req, res) {
    gapi.listFiles(req.body.fileId).then(function(folders) {
      res.send(folders);
    });
  }
}