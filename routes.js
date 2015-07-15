var JSX = require('node-jsx').install(),
    React = require('react'),
    auth = require('./auth'),
    models = require('./models'),
    AdminComponent = require('./components/admin.react');

module.exports = {
  index: function(req, res) {
    res.render('home', {user: req.user});
  },
  login: function(req, res) {
    var random = Math.floor(Math.random() * 8);
    res.render('login', {random: random, layout: 'login_layout.handlebars'});
  },
  logout: function(req, res) {
    req.logout();
    res.redirect('/');
  },
  admin: function(req, res) {
    var hunt = {name: 'None'};
    models.Hunt.findOne({where: {isActive: true}}).then(function(h) {
      if (h) {
        hunt = h.get({plain: true});
      }
      return auth.listFiles('root');
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

  listFolders: function(req, res) {
    auth.listFiles(req.body.fileId).then(function(folders) {
      res.send(folders);
    })
  }
}