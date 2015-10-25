var gapi = require('./gapi'),
    models = require('./models'),
    Q = require('q');


module.exports = {
  createHunt: function(user, name, active, parentID) {
    var deferred = Q.defer();
    var newHuntFolder;
    gapi.createHunt(name, parentID).then(function(folder) {
      newHuntFolder = folder;
      var tempDeferred = Q.defer();
      if (active) {
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
        tempDeferred.resolve(true);
        return tempDeferred.promise;
      }
    }).then(function() {
      return models.Hunt.create({
        name: name,
        folderID: newHuntFolder.id,
        createdBy: user,
        isActive: active
      });
    }).then(function(hunt) {
      deferred.resolve(hunt);
    }).catch(function(error) {
      deferred.reject({ error: error });
    });
    return deferred.promise;
  }

};
