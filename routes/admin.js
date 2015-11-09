var JSX = require('node-jsx').install(),
    Q = require('q'),
    React = require('react'),
    ReactDOMServer = require('react-dom/server'),
    gapi = require('../gapi'),
    models = require('../models'),
    AdminComponent = require('../components/admin.react');

function getAdminState(user, activeTab) {
  var deferred = Q.defer();
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
      activeTab: activeTab,
      folders: files,
      userFirstName: user.firstName,
      rootFolder: {'title': user.firstName + "'s Drive", 'id': 'root'}
    }
    var markup = ReactDOMServer.renderToString(
      adminFactory(state)
    );

    deferred.resolve({
      user: user,
      markup: markup,
      state: JSON.stringify(state)
    });
  }).catch(function(error) {
    deferred.reject(error);
  });
  return deferred.promise;
}

module.exports = {
  index: function(req, res) {
    models.Hunt.findOne({where: {isActive: true}}).then(function(hunt) {
      if (hunt) {
        res.redirect("/admin/edit");
      } else {
        res.redirect("/admin/create");
      }
    });
  },

  create: function(req, res) {
    getAdminState(req.user, "create").then(function(state) {
      res.render('admin', state);
    }).catch(function(error) {
      if (error.errors && error.errors[0].message === "Invalid Credentials") {
        req.session.returnPath = req.route.path;
        res.redirect("/login");
      } else {
        res.render("error", {error: error});
      }
    });
  },

  edit: function(req, res) {
    getAdminState(req.user, "edit").then(function(state) {
      res.render('admin', state);
    }).catch(function(error) {
      if (error.errors && error.errors[0].message === "Invalid Credentials") {
        req.session.returnPath = req.route.path;
        res.redirect("/login");
      } else {
        res.render("error", {error: error});
      }
    });
  },

  add: function(req, res) {
    getAdminState(req.user, "add").then(function(state) {
      res.render('admin', state);
    }).catch(function(error) {
      if (error.errors && error.errors[0].message === "Invalid Credentials") {
        req.session.returnPath = req.route.path;
        res.redirect("/login");
      } else {
        res.render("error", {error: error});
      }
    });
  },

  announcement: function(req, res) {
    getAdminState(req.user, "announcement").then(function(state) {
      res.render('admin', state);
    }).catch(function(error) {
      if (error.errors && error.errors[0].message === "Invalid Credentials") {
        req.session.returnPath = req.route.path;
        res.redirect("/login");
      } else {
        res.render("error", {error: error});
      }
    });
  },

  switch: function(req, res) {
    getAdminState(req.user, "switch").then(function(state) {
      res.render('admin', state);
    }).catch(function(error) {
      if (error.errors && error.errors[0].message === "Invalid Credentials") {
        req.session.returnPath = req.route.path;
        res.redirect("/login");
      } else {
        res.render("error", {error: error});
      }
    });
  },

  createHunt: function(req, res) {
    var newHuntFolder;
    gapi.createHunt(req.body.name, req.body.parentID).then(function(folder) {
      newHuntFolder = folder;
      var deferred = Q.defer();
      if (req.body.active) {
        return models.Hunt.update({
          isActive: false
        },
        {
          where: {
            isActive: true
          },
          fields: ["isActive"]
        });
      } else {
        deferred.resolve(true);
        return tempDeferred.promise;
      }
    }).then(function() {
      return models.Hunt.create({
        name: req.body.name,
        folderID: newHuntFolder.id,
        createdBy: req.user.id,
        isActive: req.body.active,
        parentFolderID: req.body.parentID
      });
    }).then(function(hunt) {
      res.send(hunt);
    }).catch(function(error) {
      res.send({ error: error });
    });
  }

};
