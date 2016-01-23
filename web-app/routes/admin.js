var debug = require('debug')('superteamawesome:server'),
    JSX = require('node-jsx').install(),
    Q = require('q'),
    React = require('react'),
    ReactDOMServer = require('react-dom/server'),
    gapi = require('../api/google'),
    AdminComponent = require('../components/admin.react'),
    firebaseRef = require('../api/firebase');

function getActiveHunt() {
  var huntDeferred = Q.defer();
  firebaseRef.child("hunts").once("value", function(huntsSnapshot) {
    if (huntsSnapshot.exists()) {
      firebaseRef.child("hunts").orderByChild("isActive").equalTo(true).on("child_added", function(snapshot) {
        if (snapshot.exists()) {
          huntDeferred.resolve(snapshot.val());
        } else {
          huntDeferred.resolve(null);
        }
      });
    } else {
      huntDeferred.resolve(null);
    }
  });
  return huntDeferred.promise;
}

function getAdminState(user, activeTab) {
  var deferred = Q.defer();
  var hunt = {name: 'None'};
  var rootFolderId = 'root';
  var rootFolder;

  getActiveHunt().then(function(h) {
    if (h) {
      hunt = h;
      if (activeTab !== 'create') {
        rootFolderId = hunt.parentFolderId;
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
    firebaseRef.child("hunts").once("value", function(huntsSnapshot) {
      if (huntsSnapshot.exists()) {
        huntsSnapshot.orderByChild("isActive").equalTo(true).on("child_added", function(huntSnapshot) {
          if (huntSnapshot.exists()) {
            res.redirect("/admin/edit");
          } else {
            res.redirect("/admin/create");
          }
        });
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
    function getFolder() {
      var deferFolder = Q.defer();
      if (req.body.createNewFolder === "false" || req.body.createNewFolder === undefined) {
        deferFolder.resolve({id: req.body.folderId});
        return deferFolder.promise;
      } else {
        return gapi.createFolder(req.body.name, req.body.parentId);
      }
    }

    getFolder().then(function(folder) {
      newHuntFolder = folder;
      var deferred = Q.defer();
      if (req.body.active) {
        getActiveHunt().then(function(hunt) {
          if (hunt) {
            firebaseRef.child("hunt/" + hunt.id).update({
              isActive: false
            }, function(error) {
              if (error) {
                deferred.reject("Error updating active hunt: " + error);
              } else {
                deferred.resolve(true);
              }
            });
          } else {
            deferred.resolve(true);
          }
        });
      } else {
        deferred.resolve(true);
      }
      return deferred.promise;
    }).then(function() {
      var deferred = Q.defer();
      if (req.body.templateSheet == null || req.body.templateSheet.length === 0) {
        deferred.resolve({});
        return deferred.promise;
      } else {
        return gapi.copySheet(req.body.templateSheet, newHuntFolder.id, "Puzzle Template");
      }
    }).then(function(sheet) {
      var deferred = Q.defer();
      var id = req.body.name.replace(" ", "").toLowerCase();
      var hunt = {
        name: req.body.name,
        folderId: newHuntFolder.id,
        createdBy: req.user.googleId,
        isActive: req.body.active === "true" || req.body.active === true
      };

      if (sheet.id != null) {
        hunt.templateSheet = sheet.id;
      }

      // TODO(styu): remove when validation is done
      if (req.body.parentId !=  null) {
        hunt.parentFolderId = req.body.parentId;
      }

      firebaseRef.child("hunts/" + id).set(hunt, function(error) {
        if (error) {
          debug(error);
          deferred.reject("Error saving new hunt: " + error);
        } else {
          deferred.resolve(hunt);
        }
      });
      return deferred.promise;
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
      folderPromises.push(gapi.createFolder(roundName.val, newRound.parentRound.folderId));
    });
    Q.all(folderPromises).then(function(folders) {
      folders.forEach(function(folder, index) {
        rounds.push({
          name: newRound.names[index].val,
          folderId: folder.id,
          parentId: newRound.parentRound.folderId
        });
      });

      // create SOLVED folders inside the new drive folders
      return Q.all(folders.map(function(folder) {
        return gapi.createFolder("SOLVED", folder.id);
      }));
    }).then(function(solvedFolders) {
      solvedFolders.forEach(function(folder, index) {
        rounds[index]["solvedFolderId"] = folder.id;
        var roundRef = firebaseRef.child("hunts/" + req.body.huntId + "/rounds").push(rounds[index]);
        if (req.body.puzzleTemplate != null) {
          gapi.copySheet(req.body.puzzleTemplate, rounds[index].folderId, rounds[index].name + " Meta").then(function(sheet) {
            roundRef.child("puzzles").push({
              name: rounds[index].name + " Meta",
              link: "", // TODO: add link
              googleSheet: sheet.id,
              solved: false,
              puzzlers: [],
              slack: "", // TODO: add slack
              categories: [],
              state: "unsolved"
            });
          });
        } else {
          gapi.createSheet(rounds[index].name + " Meta", rounds[index].folderId).then(function(sheet) {
            roundRef.child("puzzles").push({
              name: rounds[index].name + " Meta",
              link: "", // TODO: add link
              googleSheet: sheet.id,
              solved: false,
              puzzlers: [],
              slack: "", // TODO: add slack
              categories: [],
              state: "unsolved"
            });
          })
        }
      });


      res.send(rounds);
    }).catch(function(error) {
      res.send({ error: error });
    });
  }
};
