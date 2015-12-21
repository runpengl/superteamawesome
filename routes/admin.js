var debug = require('debug')('superteamawesome:server'),
    JSX = require('node-jsx').install(),
    Q = require('q'),
    React = require('react'),
    ReactDOMServer = require('react-dom/server'),
    gapi = require('../gapi'),
    models = require('../models'),
    AdminComponent = require('../components/admin.react');

function getAdminState(user, activeTab) {
  var deferred = Q.defer();
  var hunt = {name: 'None'};
  var rootFolderId = 'root';
  var rootFolder;
  models.Hunt.findOne({where: {isActive: true}}).then(function(h) {
    if (h) {
      hunt = h.get({plain: true});
      if (activeTab !== 'create') {
        rootFolderId = hunt.parentFolderID;
      }
    }
    return gapi.getFolder(rootFolderId);
  }).then(function(folder) {
    rootFolder = folder;
    return gapi.listFiles(rootFolder.id);
  }).then(function(files) {
    var adminFactory = React.createFactory(AdminComponent);
    var state = {
      hunt: hunt,
      activeTab: activeTab,
      folders: files,
      userFirstName: user.firstName,
      rootFolder: rootFolder
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

function renderAdmin(req, res, page) {
  getAdminState(req.user, page).then(function(state) {
      res.render('admin', state);
    }).catch(function(error) {
      if (error.errors && error.errors[0].message === "Invalid Credentials") {
        req.session.returnPath = req.route.path;
        res.redirect("/login");
      } else {
        res.render("error", {error: error});
      }
    });
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
    renderAdmin(req, res, "create");
  },

  edit: function(req, res) {
    renderAdmin(req, res, "edit");
  },

  editRound: function(req, res) {
    debug("editing round");
    renderAdmin(req, res, "round");
  },

  editPuzzle: function(req, res) {
    renderAdmin(req, res, "puzzle");
  },

  editSettings: function(req, res) {
    renderAdmin(req, res, "settings");
  },

  add: function(req, res) {
    renderAdmin(req, res, "add");
  },

  announcement: function(req, res) {
    renderAdmin(req, res, "announcement");
  },

  switch: function(req, res) {
    renderAdmin(req, res, "switch");
  },

  createHunt: function(req, res) {
    var newHuntFolder;
    gapi.createFolder(req.body.name, req.body.parentID).then(function(folder) {
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
  },

  createRound: function(req, res) {
    var newHuntRoundFolder;
    var folderPromises = [];
    var rounds = [];
    var newRound = req.body.newRound;

    // create drive folders
    newRound.names.forEach(function(roundName) {
      folderPromises.push(gapi.createFolder(roundName.val, newRound.parentRound.folderID));
    });
    Q.all(folderPromises).then(function(folders) {
      folders.forEach(function(folder, index) {
        rounds.push({
          name: newRound.names[index].val,
          folderID: folder.id,
          huntID: req.body.huntID,
          parentID: newRound.parentRound.id
        });
      });

      // create SOLVED folders inside the new drive folders
      return Q.all(folders.map(function(folder) {
        return gapi.createFolder("SOLVED", folder.id);
      }));
    }).then(function(solvedFolders) {
      solvedFolders.forEach(function(folder, index) {
        rounds[index]["solvedFolderID"] = folder.id;
      });
      return Q.all(rounds.map(function(round) {
        return models.Round.create(round);
      }))
    }).then(function(newRounds) {
      // still need to create meta puzzle sheet
      res.send(newRounds);
    }).catch(function(error) {
      res.send({ error: error });
    });
  }
};
